"""Linear-elastic FEA of a printed part: gmsh (tet10) + numpy/scipy assembly and solve.

Static cases (thrust on all pads, vertical and lateral crash load on one pad) and the first bending modes with
motor + prop masses lumped on the pads. Meshes from STEP (exact) or from a watertight STL (reference frames).
No external solver needed; CalculiX is not required.
"""
from __future__ import annotations

import math
import time

import numpy as np

# tet10 in gmsh node order: vertices 0-3, edges (0,1) (1,2) (0,2) (0,3) (2,3) (1,3)
_EDGES = [(0, 1), (1, 2), (0, 2), (0, 3), (2, 3), (1, 3)]
_A, _B = 0.5854101966249685, 0.1381966011250105
_GP = [(_A, _B, _B), (_B, _A, _B), (_B, _B, _A), (_B, _B, _B)]
_W = 1.0 / 24.0


def _dN(xi, eta, zeta):
    L = np.array([1 - xi - eta - zeta, xi, eta, zeta])
    dL = np.array([[-1, -1, -1], [1, 0, 0], [0, 1, 0], [0, 0, 1]], float)  # dL_i/d(xi,eta,zeta)
    dN = np.zeros((3, 10))
    for i in range(4):
        dN[:, i] = (4 * L[i] - 1) * dL[i]
    for k, (a, b) in enumerate(_EDGES):
        dN[:, 4 + k] = 4 * (L[a] * dL[b] + L[b] * dL[a])
    return dN


_DN = [_dN(*g) for g in _GP]


def _largest_shell_stl(path):
    """Write the largest connected shell of an STL to a temp binary STL; returns its path."""
    import struct
    import tempfile
    from collections import defaultdict

    from .printcheck import _stl_tris
    tris = list(_stl_tris(path))
    parent = {}

    def find(x):
        while parent.setdefault(x, x) != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    for a, b, c in tris:
        parent[find(a)] = find(b)
        parent[find(b)] = find(c)
    shells = defaultdict(list)
    for t in tris:
        shells[find(t[0])].append(t)
    big = max(shells.values(), key=len)
    out = tempfile.NamedTemporaryFile(suffix=".stl", delete=False).name
    with open(out, "wb") as f:
        f.write(b"dronecad largest shell".ljust(80, b" "))
        f.write(struct.pack("<I", len(big)))
        for a, b, c in big:
            ux, uy, uz = b[0] - a[0], b[1] - a[1], b[2] - a[2]
            vx, vy, vz = c[0] - a[0], c[1] - a[1], c[2] - a[2]
            n = (uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx)
            L = math.sqrt(sum(k * k for k in n)) or 1.0
            f.write(struct.pack("<12fH", n[0] / L, n[1] / L, n[2] / L, *a, *b, *c, 0))
    return out


def mesh(source, size_mm=2.5, is_stl=False):
    """Returns nodes (N,3) mm and tet10 connectivity (E,10) zero-based."""
    import gmsh
    gmsh.initialize()
    gmsh.option.setNumber("General.Terminal", 0)
    gmsh.option.setNumber("General.Verbosity", 1)
    tmp = None
    try:
        if is_stl:
            # multi-shell STLs (e.g. Fusion exports with touching bodies) cannot be volume-meshed as one; keep the
            # largest closed shell (the plate + arms) and remesh it through gmsh's surface reparametrisation
            tmp = _largest_shell_stl(source)
            gmsh.merge(tmp)
            gmsh.model.mesh.classifySurfaces(math.radians(40), True, True, math.radians(180))
            gmsh.model.mesh.createGeometry()
            surfs = gmsh.model.getEntities(2)
            loop = gmsh.model.geo.addSurfaceLoop([s[1] for s in surfs])
            gmsh.model.geo.addVolume([loop])
            gmsh.model.geo.synchronize()
        else:
            gmsh.model.occ.importShapes(source)
            gmsh.model.occ.synchronize()
        gmsh.option.setNumber("Mesh.MeshSizeMax", size_mm)
        gmsh.option.setNumber("Mesh.MeshSizeMin", size_mm * 0.3)
        gmsh.option.setNumber("Mesh.MeshSizeFromCurvature", 6)
        gmsh.option.setNumber("Mesh.ElementOrder", 2)
        gmsh.option.setNumber("Mesh.Optimize", 1)
        try:
            gmsh.option.setNumber("Mesh.Algorithm3D", 10)  # HXT: fast
            gmsh.model.mesh.generate(3)
        except Exception:  # noqa: BLE001 — HXT is strict about tangent contacts; Delaunay copes
            gmsh.model.mesh.clear()
            gmsh.option.setNumber("Mesh.Algorithm3D", 1)
            gmsh.model.mesh.generate(3)
        tags, coords, _ = gmsh.model.mesh.getNodes()
        idx = {int(t): i for i, t in enumerate(tags)}
        nodes = np.array(coords).reshape(-1, 3)
        etags, enodes = gmsh.model.mesh.getElementsByType(11)
        elems = np.array([idx[int(t)] for t in enodes]).reshape(-1, 10)
    finally:
        gmsh.finalize()
        if tmp:
            import os
            os.remove(tmp)
    return nodes, elems


def _assemble(nodes, elems, E, nu, rho):
    """Global stiffness (N/mm) and lumped mass (kg) matrices. Units: mm, N, MPa, kg."""
    from scipy.sparse import coo_matrix
    lam = E * nu / ((1 + nu) * (1 - 2 * nu))
    mu = E / (2 * (1 + nu))
    D = np.array([[lam + 2 * mu, lam, lam, 0, 0, 0], [lam, lam + 2 * mu, lam, 0, 0, 0], [lam, lam, lam + 2 * mu, 0, 0, 0],
                  [0, 0, 0, mu, 0, 0], [0, 0, 0, 0, mu, 0], [0, 0, 0, 0, 0, mu]])
    ndof = 3 * len(nodes)
    rows, cols, vals = [], [], []
    mass = np.zeros(len(nodes))
    chunk = 6000
    for s in range(0, len(elems), chunk):
        el = elems[s:s + chunk]
        X = nodes[el]  # (e,10,3)
        Ke = np.zeros((len(el), 30, 30))
        vol = np.zeros(len(el))
        for dN in _DN:
            J = np.einsum("in,enj->eij", dN, X)
            detJ = np.linalg.det(J)
            Jinv = np.linalg.inv(J)
            dNx = np.einsum("eij,jn->ein", Jinv, dN)  # (e,3,10)
            B = np.zeros((len(el), 6, 30))
            B[:, 0, 0::3] = dNx[:, 0]
            B[:, 1, 1::3] = dNx[:, 1]
            B[:, 2, 2::3] = dNx[:, 2]
            B[:, 3, 0::3] = dNx[:, 1]
            B[:, 3, 1::3] = dNx[:, 0]
            B[:, 4, 1::3] = dNx[:, 2]
            B[:, 4, 2::3] = dNx[:, 1]
            B[:, 5, 0::3] = dNx[:, 2]
            B[:, 5, 2::3] = dNx[:, 0]
            w = np.abs(detJ) * _W
            Ke += np.einsum("eki,kl,elj->eij", B, D, B) * w[:, None, None]
            vol += w
        dofs = (3 * el[:, :, None] + np.arange(3)).reshape(len(el), 30)
        rows.append(np.repeat(dofs, 30, axis=1).ravel())
        cols.append(np.tile(dofs, (1, 30)).ravel())
        vals.append(Ke.ravel())
        m_e = vol * rho * 1e-6  # mm³ × g/cm³ → g (×1e-3) → kg (×1e-3)
        np.add.at(mass, el.ravel(), np.repeat(m_e / 10, 10))
    K = coo_matrix((np.concatenate(vals), (np.concatenate(rows), np.concatenate(cols))), shape=(ndof, ndof)).tocsr()
    return K, mass, D


def _stress_vm(nodes, elems, u, D):
    """Max von Mises per element (MPa), evaluated at the four corner nodes (which lie on the surface where bending peaks)."""
    X = nodes[elems]
    ue = u.reshape(-1, 3)[elems].reshape(len(elems), 30)
    best = np.zeros(len(elems))
    for corner in ((0, 0, 0), (1, 0, 0), (0, 1, 0), (0, 0, 1)):
        dN = _dN(*corner)
        J = np.einsum("in,enj->eij", dN, X)
        dNx = np.einsum("eij,jn->ein", np.linalg.inv(J), dN)
        B = np.zeros((len(elems), 6, 30))
        B[:, 0, 0::3] = dNx[:, 0]
        B[:, 1, 1::3] = dNx[:, 1]
        B[:, 2, 2::3] = dNx[:, 2]
        B[:, 3, 0::3] = dNx[:, 1]
        B[:, 3, 1::3] = dNx[:, 0]
        B[:, 4, 1::3] = dNx[:, 2]
        B[:, 4, 2::3] = dNx[:, 1]
        B[:, 5, 0::3] = dNx[:, 2]
        B[:, 5, 2::3] = dNx[:, 0]
        sig = np.einsum("eij,ej->ei", B, ue) @ D.T
        sx, sy, sz, txy, tyz, txz = sig.T
        vm = np.sqrt(0.5 * ((sx - sy) ** 2 + (sy - sz) ** 2 + (sz - sx) ** 2) + 3 * (txy ** 2 + tyz ** 2 + txz ** 2))
        best = np.maximum(best, vm)
    return best


def _nodes_in_disc(nodes, x, y, r, z=None, dz=0.3):
    d = np.hypot(nodes[:, 0] - x, nodes[:, 1] - y) <= r
    if z is not None:
        d &= np.abs(nodes[:, 2] - z) <= dz
    return np.where(d)[0]


def run(source, material, fixed, pads, cases, tip_mass_kg, size_mm=4.0, is_stl=False, n_modes=3):
    """
    source   : STEP (or STL with is_stl) of one printed part
    material : dict with E_gpa, strength_mpa, density (g/cm³), poisson optional
    fixed    : [(x, y, r)] cylinders whose nodes are clamped (standoff / stack footprint)
    pads     : {name: (x, y, r, z_top)} motor pads where loads and lumped masses go
    cases    : [(label, {pad_name: (Fx, Fy, Fz) N})] — force per pad
    tip_mass_kg : lumped mass added at each pad for the modal analysis
    """
    from scipy.sparse.linalg import LinearOperator, eigsh, splu
    t0 = time.time()
    nodes, elems = mesh(source, size_mm, is_stl)
    E = material["E_gpa"] * 1e3  # MPa
    nu = material.get("poisson", 0.35)
    K, mass, D = _assemble(nodes, elems, E, nu, material["density"])
    ndof = 3 * len(nodes)
    fixed_nodes = np.unique(np.concatenate([_nodes_in_disc(nodes, x, y, r) for x, y, r in fixed])) if fixed else np.array([], int)
    if len(fixed_nodes) == 0:
        return {"error": "no nodes found in the fixed regions"}
    fixed_dofs = (3 * fixed_nodes[:, None] + np.arange(3)).ravel()
    free = np.setdiff1d(np.arange(ndof), fixed_dofs)
    Kff = K[free][:, free].tocsc()
    lu = splu(Kff, permc_spec="COLAMD")  # one factorisation, reused for every load case and the eigen shift-invert
    pad_nodes = {name: _nodes_in_disc(nodes, x, y, r, z, 0.4) for name, (x, y, r, z) in pads.items()}
    for name, idx in pad_nodes.items():
        if len(idx) == 0:  # fall back to the whole pad column
            x, y, r, z = pads[name]
            pad_nodes[name] = _nodes_in_disc(nodes, x, y, r)
    results = []
    sig_y = material["strength_mpa"]
    for label, loads in cases:
        f = np.zeros(ndof)
        for name, (fx, fy, fz) in loads.items():
            idx = pad_nodes[name]
            f[3 * idx] += fx / len(idx)
            f[3 * idx + 1] += fy / len(idx)
            f[3 * idx + 2] += fz / len(idx)
        u = np.zeros(ndof)
        u[free] = lu.solve(f[free])
        vm = _stress_vm(nodes, elems, u, D)
        disp = np.linalg.norm(u.reshape(-1, 3), axis=1)
        imax = int(np.argmax(vm))
        cen = nodes[elems[imax, :4]].mean(axis=0)
        results.append({"case": label, "max_von_mises_mpa": float(vm.max()), "safety_factor": float(sig_y / max(vm.max(), 1e-9)),
                        "max_displacement_mm": float(disp.max()), "hotspot_mm": [round(float(c), 1) for c in cen],
                        "p99_von_mises_mpa": float(np.percentile(vm, 99))})
    # modal with lumped tip masses
    m = mass.copy()
    for name, idx in pad_nodes.items():
        m[idx] += tip_mass_kg / len(idx)
    # K is in N/mm and u in mm, so F = m[kg]·ü[mm/s²]·1e-3 → mass matrix entries are kg × 1e-3
    from scipy.sparse import diags
    M = diags(np.repeat(m, 3)[free] * 1e-3)
    modes = []
    try:
        n = Kff.shape[0]
        vals, _ = eigsh(Kff, k=n_modes, M=M, sigma=0.0, which="LM", OPinv=LinearOperator((n, n), matvec=lu.solve, dtype=float))
        modes = [float(math.sqrt(max(v, 0)) / (2 * math.pi)) for v in sorted(vals)]
    except Exception as e:  # noqa: BLE001
        modes = [f"eigensolver failed: {e}"]
    return {"nodes": int(len(nodes)), "elements": int(len(elems)), "dof_free": int(len(free)), "mesh_size_mm": size_mm, "strength_mpa": sig_y,
            "fixed_nodes": int(len(fixed_nodes)), "cases": results, "modes_hz": modes, "seconds": time.time() - t0,
            "note": "Linear elastic tet10; clamped at the stack footprint; loads spread over pad top nodes; lumped masses for modes. Layer adhesion not modelled — multiply SF by the material's layer_factor for standing prints."}
