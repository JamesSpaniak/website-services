#!/usr/bin/env python3
"""Parse assets/fulllogs.csv (VPC flow log export) and print summary statistics."""
import csv
import sys
from collections import defaultdict
from pathlib import Path

def is_private(ip: str) -> bool:
    if not ip or ip == "-":
        return False
    parts = ip.split(".")
    if len(parts) != 4:
        return False
    try:
        a, b, c, d = (int(x) for x in parts)
        if a == 10:
            return True
        if a == 172 and 16 <= b <= 31:
            return True
        if a == 192 and b == 168:
            return True
    except ValueError:
        pass
    return False

def main():
    p = Path(__file__).resolve().parent.parent / "assets" / "fulllogs.csv"
    if not p.exists():
        print(f"File not found: {p}", file=sys.stderr)
        sys.exit(1)

    rows = []
    with open(p, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)

    # Parse message: version account eni srcaddr dstaddr srcport dstport protocol packets bytes start end action status
    flows = []
    nodata = 0
    for r in rows:
        msg = r.get("message", "")
        parts = msg.split()
        if not parts:
            continue
        if parts[-1] == "NODATA":
            nodata += 1
            continue
        if len(parts) < 14:
            continue
        try:
            flows.append({
                "eni": parts[2],
                "srcaddr": parts[3],
                "dstaddr": parts[4],
                "srcport": int(parts[5]) if parts[5] != "-" else None,
                "dstport": int(parts[6]) if parts[6] != "-" else None,
                "protocol": parts[7],
                "packets": int(parts[8]) if parts[8] != "-" else None,
                "bytes": int(parts[9]) if parts[9] != "-" else None,
                "action": parts[12],
                "status": parts[13],
            })
        except (ValueError, IndexError):
            continue

    # Stats
    enis = defaultdict(int)
    actions = defaultdict(int)
    outbound = []   # private src -> public dst (NAT egress)
    inbound = []    # public src -> private dst
    internal = []   # private <-> private
    dstports = defaultdict(int)
    src_ips = defaultdict(int)
    dst_ips_public = defaultdict(int)

    for f in flows:
        enis[f["eni"]] += 1
        actions[f["action"]] += 1
        dstports[str(f["dstport"])] += 1
        src_ips[f["srcaddr"]] += 1
        src_private = is_private(f["srcaddr"])
        dst_private = is_private(f["dstaddr"])
        if src_private and not dst_private:
            outbound.append(f)
            dst_ips_public[f["dstaddr"]] += 1
        elif not src_private and dst_private:
            inbound.append(f)
        elif src_private and dst_private:
            internal.append(f)

    timestamps = [int(r.get("timestamp", 0)) for r in rows if r.get("timestamp") and r.get("timestamp").isdigit()]
    ts_min = min(timestamps) / 1000 if timestamps else 0
    ts_max = max(timestamps) / 1000 if timestamps else 0

    print("=" * 60)
    print("FULLLOGS.CSV — VPC Flow Log Analysis")
    print("=" * 60)
    print(f"Total CSV rows:        {len(rows)}")
    print(f"NODATA records:         {nodata}")
    print(f"Parsed flow records:   {len(flows)}")
    print(f"Time range (Unix):     {ts_min:.0f} — {ts_max:.0f}")
    if ts_min:
        from datetime import datetime
        print(f"Time range (UTC):      {datetime.utcfromtimestamp(ts_min).isoformat()}Z — {datetime.utcfromtimestamp(ts_max).isoformat()}Z")
    print()
    print("ENIs (log streams):")
    for eni, count in sorted(enis.items(), key=lambda x: -x[1]):
        print(f"  {eni}: {count} flows")
    print()
    print("Actions:")
    for act, count in sorted(actions.items(), key=lambda x: -x[1]):
        print(f"  {act}: {count}")
    print()
    print("Destination ports (top):")
    for port, count in sorted(dstports.items(), key=lambda x: -x[1])[:15]:
        print(f"  {port}: {count}")
    print()
    print("Traffic direction:")
    print(f"  Outbound (private → public, NAT egress): {len(outbound)}")
    print(f"  Inbound (public → private):               {len(inbound)}")
    print(f"  Internal (private ↔ private):            {len(internal)}")
    print()
    print("Private IPs (source) — likely your workloads:")
    for ip, count in sorted(src_ips.items(), key=lambda x: -x[1]):
        if is_private(ip):
            print(f"  {ip}: {count} flows")
    print()
    print("Top 20 public destinations (outbound / NAT egress):")
    for ip, count in sorted(dst_ips_public.items(), key=lambda x: -x[1])[:20]:
        print(f"  {ip}: {count}")
    print()
    print("Top 15 public sources (inbound to your VPC):")
    inbound_src = defaultdict(int)
    for f in inbound:
        inbound_src[f["srcaddr"]] += 1
    for ip, count in sorted(inbound_src.items(), key=lambda x: -x[1])[:15]:
        print(f"  {ip}: {count}")
    print("=" * 60)

if __name__ == "__main__":
    main()
