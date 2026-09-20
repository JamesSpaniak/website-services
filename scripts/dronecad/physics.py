"""Physics on the exact model: propulsion (Ct/Cp or thrust-stand fit), section-based arm beam check,
Betaflight-style attitude PID sim with a gust, ESC thermal estimate. Base models come from the voxel script."""
from __future__ import annotations

import csv
import math
from types import SimpleNamespace

from .spec import G, vox

IN_TO_MM = 25.4


def shim(build):
    return SimpleNamespace(p=build.p, bom=build.bom, motors=build.motors, arm_root=build.arm_root)


# --------------------------------------------------------------------------- propulsion

def fit_thrust_stand(path, bom):
    """thrust-stand.csv columns: rpm, thrust_g, current_a [, voltage_v]. Fits Ct (T = Ct ρ n² D⁴) and Cp
    (P_elec·η = Cp ρ n³ D⁵) by least squares through the origin; returns overrides for bom['propulsion']."""
    P = bom["propulsion"]
    D = P["prop_diameter_in"] * IN_TO_MM / 1000.0
    rho = P["air_density"]
    V_nom = P["cells"] * P["v_cell_nominal"]
    rows = []
    with open(path) as f:
        for r in csv.DictReader(f):
            try:
                rows.append({k: float(v) for k, v in r.items() if v not in (None, "")})
            except ValueError:
                continue
    if len(rows) < 3:
        return None
    num_t = den = num_p = den_p = 0.0
    for r in rows:
        n = r["rpm"] / 60.0
        T = r["thrust_g"] / 1000 * G
        num_t += T * n * n * D ** 4
        den += (n * n * D ** 4) ** 2
        V = r.get("voltage_v", V_nom)
        P_el = r["current_a"] * V * P["drive_efficiency"]
        num_p += P_el * n ** 3 * D ** 5
        den_p += (n ** 3 * D ** 5) ** 2
    ct, cp = num_t / den * (1 / rho), num_p / den_p * (1 / rho)
    n_max = max(r["rpm"] for r in rows) / 60.0
    return {"ct": ct, "cp": cp, "rpm_max_measured": n_max * 60, "points": len(rows),
            "max_thrust_g_per_motor_override": max(r["thrust_g"] for r in rows),
            "max_current_a_per_motor_override": max(r["current_a"] for r in rows)}


def propulsion(build, auw_g, thrust_stand=None):
    bom = build.bom
    if thrust_stand:
        fit = fit_thrust_stand(thrust_stand, bom)
        if fit:
            import copy
            bom = copy.deepcopy(bom)
            bom["propulsion"].update({k: v for k, v in fit.items() if k in ("ct", "cp", "max_thrust_g_per_motor_override", "max_current_a_per_motor_override")})
            s = shim(build)
            s.bom = bom
            out = vox.propulsion(s, auw_g)
            out["note"] = f"Ct/Cp fitted from thrust-stand.csv ({fit['points']} points, Ct={fit['ct']:.4f}, Cp={fit['cp']:.4f})"
            out["thrust_stand_fit"] = fit
            return out
    return vox.propulsion(shim(build), auw_g)


# --------------------------------------------------------------------------- structure

def beam_check(build, prop, mp, sections):
    """Cantilever check using the exact section properties (min I over stations) instead of w·t³/12."""
    p, bom = build.p, build.bom
    mat = bom["materials"][p["material"]]
    secs = sections["sections"]
    if not secs:
        return vox.beam_check(shim(build), prop, mp)
    worst = min(secs, key=lambda s: s["I_mm4"] / max(s["c_mm"], 0.1))
    I = worst["I_mm4"] * 1e-12
    c = worst["c_mm"] / 1000
    A = worst["area_mm2"] * 1e-6
    L = sections["arm_length_mm"] / 1000
    L_eff = L - worst["dist_from_root_mm"] / 1000  # moment arm from that station to the motor
    E, sig_y = mat["E_gpa"] * 1e9, mat["strength_mpa"] * 1e6
    auw = mp["total_g"] / 1000
    tip_mass = (bom["components"]["motor"]["mass_g"] + bom["components"]["prop"]["mass_g"]) / 1000
    arm_mass = A * L * mat["density"] * 1000 * mat["print_solidity"]
    rows = []
    for label, F in [("max thrust", prop["max_thrust_N_per_motor"]), ("crash 5 g on the arm tip", 5 * auw * G),
                     ("crash 10 g", 10 * auw * G), ("crash 20 g", 20 * auw * G)]:
        s = F * L_eff * c / I
        rows.append({"load": label, "force_N": F, "stress_MPa": s / 1e6, "SF_flat_print": sig_y / s, "SF_standing_print": sig_y * mat["layer_factor"] / s})
    I_root = secs[0]["I_mm4"] * 1e-12
    delta = prop["max_thrust_N_per_motor"] * L ** 3 / (3 * E * I_root)
    k = 3 * E * I_root / L ** 3
    f1 = 1 / (2 * math.pi) * math.sqrt(k / (tip_mass + 0.24 * arm_mass))
    return {"material": p["material"], "arm_length_mm": L * 1000, "arm_style": p["arm_style"], "sections": secs,
            "worst_station": worst, "loads": rows, "tip_deflection_mm_at_max_thrust": delta * 1000, "first_bending_mode_hz": f1,
            "prop_rev_hz_hover": prop["rpm_max_loaded"] / 60 * prop["hover_throttle_est"], "prop_rev_hz_max": prop["rpm_max_loaded"] / 60,
            "tg_c": mat["tg_c"], "note": "Euler-Bernoulli with the exact section (min I/c over stations); FEA section gives the stress map."}


# --------------------------------------------------------------------------- flight dynamics: Betaflight-style PIDs + gust

BF_DEFAULT = {  # Betaflight 4.5 default profile (roll, pitch, yaw) and scale constants
    "P": (45, 47, 45), "I": (80, 84, 80), "D": (30, 34, 0), "level_P": 50,
    "PTERM_SCALE": 0.032029, "ITERM_SCALE": 0.244381, "DTERM_SCALE": 0.000529, "MIXER_SCALE": 1000.0,
    "loop_hz": 4000, "dterm_lpf_hz": 100, "iterm_limit": 400,
}


def simulate_bf(build, mp, prop, out_csv, gust_m_s=5.0, T=6.0, dt=0.00025):
    """6-DOF rigid body with a Betaflight-default angle-mode PID: hover, 15° roll step at 1 s, lateral gust at 3.5 s.
    Motor thrust ∝ command² (rpm-linear ESC), first-order motor lag, saturation tracked."""
    m = mp["total_g"] / 1000
    I = mp["inertia_kgm2"]
    Ixx, Iyy, Izz = I["Ixx"], I["Iyy"], I["Izz"]
    cg = mp["cg_mm"]
    T_max = prop["max_thrust_N_per_motor"]
    k_q = prop["torque_per_thrust_m"]
    hover_u = math.sqrt(min(1.0, (m * G / 4) / T_max))
    mot = []
    for i in (1, 2, 3, 4):
        x, y, spin = build.motors[i]
        mot.append(((x - cg[0]) / 1000, (y - cg[1]) / 1000, 1 if spin == "CW" else -1))
    # Betaflight quad-X mixer signs (motor order 1 RR, 2 FR, 3 RL, 4 FL; x fwd, y left):
    # roll (+ = right wing down) needs more thrust on the left motors (y>0) → sign(+y); pitch (+ nose up) → more on rear (x<0)
    mix = [(1.0, 1 if r[1] > 0 else -1, 1 if r[0] < 0 else -1, r[2]) for r in mot]
    bf = BF_DEFAULT
    Kp = [bf["P"][i] * bf["PTERM_SCALE"] for i in range(3)]
    Ki = [bf["I"][i] * bf["ITERM_SCALE"] for i in range(3)]
    Kd = [bf["D"][i] * bf["DTERM_SCALE"] for i in range(3)]
    level = bf["level_P"] / 10.0  # deg/s per deg of angle error
    pos, vel = [0.0, 0.0, 1.0], [0.0, 0.0, 0.0]
    q = (1.0, 0.0, 0.0, 0.0)
    omega = [0.0, 0.0, 0.0]
    u_act = [hover_u] * 4
    tau_m = 0.02
    iterm = [0.0, 0.0, 0.0]
    gyro_prev = [0.0, 0.0, 0.0]
    d_lpf = [0.0, 0.0, 0.0]
    alpha = dt * 2 * math.pi * bf["dterm_lpf_hz"] / (1 + dt * 2 * math.pi * bf["dterm_lpf_hz"])
    rho = build.bom["propulsion"]["air_density"]
    bb_area = 0.0
    for s, k, _, _ in build.bodies:
        if k in ("battery", "frame", "electronics"):
            bb = s.bounding_box()
            bb_area = max(bb_area, (bb.max.X - bb.min.X) * (bb.max.Z - bb.min.Z) * 1e-6)
    CdA = 1.1 * max(bb_area, 0.004)  # side area of the biggest body (battery/plate), Cd ≈ 1.1
    # gust acts at the centroid of that body: use the battery centre if present
    z_aero = cg[2] / 1000
    for s, k, _, _ in build.bodies:
        if k == "battery":
            from build123d import CenterOf
            z_aero = s.center(CenterOf.MASS).Z / 1000
    lever = z_aero - cg[2] / 1000
    kp_z, kd_z = 6.0, 4.0
    log, sat_steps, energy = [], 0, 0.0
    V, I_max = prop["pack_v_nominal"], prop["max_current_a_per_motor"]
    peak_roll, gust_peak, gust_drift = 0.0, 0.0, 0.0
    settle_t = None
    gust_ref = None  # (y, vy) at gust onset → drift measured relative to the pre-gust trajectory
    steps = int(T / dt)
    loop_every = max(1, int(round(1 / (bf["loop_hz"] * dt))))
    pid_out = [0.0, 0.0, 0.0]
    for k in range(steps):
        t = k * dt
        roll, pitch, yaw = vox.q_to_euler(q)
        roll_ref = math.radians(15.0) if 1.0 <= t < 2.5 else 0.0
        wind = gust_m_s if t >= 3.5 else 0.0
        if k % loop_every == 0:
            # angle mode: angle error → rate setpoint (deg/s), then rate PID in BF units
            sp = [level * math.degrees(roll_ref - roll), level * math.degrees(0 - pitch), 0.0]
            gyro = [math.degrees(w) for w in omega]
            for a in range(3):
                err = sp[a] - gyro[a]
                iterm[a] = max(-bf["iterm_limit"], min(bf["iterm_limit"], iterm[a] + Ki[a] * err * (dt * loop_every)))
                d_raw = -(gyro[a] - gyro_prev[a]) / (dt * loop_every)
                d_lpf[a] += alpha * (d_raw - d_lpf[a])
                gyro_prev[a] = gyro[a]
                pid_out[a] = (Kp[a] * err + iterm[a] + Kd[a] * d_lpf[a]) / bf["MIXER_SCALE"]
        # altitude hold → collective command
        az = kp_z * (1.0 - pos[2]) + kd_z * (0 - vel[2]) + G
        tilt = max(math.cos(roll) * math.cos(pitch), 0.5)
        T_tot = max(0.0, min(m * az / tilt, 4 * T_max))
        u_coll = math.sqrt(T_tot / (4 * T_max))
        sat = False
        for i in range(4):
            u = u_coll + mix[i][1] * pid_out[0] + mix[i][2] * pid_out[1] + mix[i][3] * pid_out[2]
            if u < 0.02 or u > 1.0:
                sat = True
            u = max(0.02, min(1.0, u))
            u_act[i] += (u - u_act[i]) * dt / tau_m
        sat_steps += sat
        T_act = [T_max * u * u for u in u_act]
        Tsum = sum(T_act)
        thrust_world = vox.q_rotate(q, (0, 0, Tsum))
        rel = [vel[0], vel[1] - wind, vel[2]]  # wind from the right → pushes the body toward +y (left)
        speed = math.sqrt(sum(v * v for v in rel))
        drag = [-0.5 * rho * CdA * speed * v for v in rel]
        acc = [(thrust_world[i] + drag[i]) / m - (G if i == 2 else 0) for i in range(3)]
        for i in range(3):
            vel[i] += acc[i] * dt
            pos[i] += vel[i] * dt
        # body torques from motors; gust drag acting above/below the CG adds a roll torque
        drag_body = vox.q_rotate((q[0], -q[1], -q[2], -q[3]), tuple(drag))
        tx = sum(mot[i][1] * T_act[i] for i in range(4)) - lever * drag_body[1]
        ty = sum(-mot[i][0] * T_act[i] for i in range(4)) + lever * drag_body[0]
        tz = sum(mot[i][2] * k_q * T_act[i] for i in range(4))
        wx, wy, wz = omega
        omega = [wx + (tx - (Izz - Iyy) * wy * wz) / Ixx * dt, wy + (ty - (Ixx - Izz) * wz * wx) / Iyy * dt, wz + (tz - (Iyy - Ixx) * wx * wy) / Izz * dt]
        dq = vox.q_mul(q, (0, omega[0] * 0.5 * dt, omega[1] * 0.5 * dt, omega[2] * 0.5 * dt))
        q = tuple(q[i] + dq[i] for i in range(4))
        n = math.sqrt(sum(c * c for c in q))
        q = tuple(c / n for c in q)
        energy += sum(I_max * V * u ** 3 for u in u_act) * dt
        if 1.0 <= t < 2.5:
            peak_roll = max(peak_roll, math.degrees(roll))
        if 2.5 <= t < 3.5 and settle_t is None and abs(math.degrees(roll)) < 1.0:
            settle_t = t - 2.5
        if t >= 3.5:
            if gust_ref is None:
                gust_ref = (pos[1], vel[1], t)
            gust_peak = max(gust_peak, abs(math.degrees(roll)))
            gust_drift = max(gust_drift, abs(pos[1] - gust_ref[0] - gust_ref[1] * (t - gust_ref[2])))
        if k % int(0.01 / dt) == 0:
            log.append((round(t, 3), round(math.degrees(roll), 2), round(math.degrees(pitch), 2), round(math.degrees(yaw), 2),
                        round(pos[0], 3), round(pos[1], 3), round(pos[2], 3), *[round(u, 3) for u in u_act]))
    with open(out_csv, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["t", "roll_deg", "pitch_deg", "yaw_deg", "x", "y", "z", "u1", "u2", "u3", "u4"])
        w.writerows(log)
    return {"controller": "Betaflight 4.5 default PIDs (angle mode), 4 kHz loop, D-term LPF 100 Hz", "hover_command": hover_u,
            "roll_step_peak_deg": peak_roll, "roll_return_settle_s": settle_t, "gust_m_s": gust_m_s, "gust_roll_peak_deg": gust_peak,
            "gust_lateral_drift_m": gust_drift, "gust_window_s": T - 3.5, "gust_lever_mm": lever * 1000, "CdA_m2": CdA,
            "motor_saturation_pct": 100 * sat_steps / steps, "energy_wh": energy / 3600,
            "note": "Rate PID in BF units (pidSum/1000 → motor fraction); thrust ∝ command²; 20 ms motor lag; side gust from the right at 3.5 s."}


# --------------------------------------------------------------------------- thermal

def esc_thermal(build, prop, enclosed):
    """ESC dissipation at hover and at 50 % throttle vs a natural/forced convection estimate."""
    esc = build.bom["components"]["stack_esc"]
    area = 2 * esc["dims"][0] * esc["dims"][1] * 1e-6  # both faces, m²
    R_on = 0.010  # Ω per phase leg incl. traces, 45 A-class 4-in-1 (estimate)
    P_sw = 0.25   # W per channel switching + gate drive
    out = {}
    for label, I_m in (("hover", prop["hover_current_a_total"] / 4), ("50 % throttle", prop["max_current_a_per_motor"] * 0.5 ** 3)):
        P = 4 * (I_m ** 2 * R_on + P_sw)
        h = 15.0 if enclosed else 35.0  # W/m²K: lattice keel walls cut the prop wash roughly in half vs an open stack
        dT = P / (h * area)
        out[label] = {"esc_loss_w": P, "delta_t_c": dT, "ok": dT < 60}
    out["enclosed"] = enclosed
    out["note"] = "Lumped estimate: Rds(on) 10 mΩ/leg + 0.25 W switching per channel; h = 35 W/m²K in prop wash, 15 W/m²K behind lattice keel walls. ΔT < 60 °C keeps FETs under 100 °C at 40 °C ambient."
    return out
