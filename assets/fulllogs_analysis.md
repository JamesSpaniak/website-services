# Full logs analysis — `assets/fulllogs.csv`

## Overview

| Metric | Value |
|--------|--------|
| **Total rows** | 200 (1 header + 199 flow records) |
| **NODATA records** | 0 (all rows are full flow records) |
| **Time window** | Single aggregation window: **2026-03-11 01:58:23 UTC** |
| **ENI** | All traffic from **one** ENI: `eni-0eacf37f4f8a7bf3e` |
| **Actions** | 100% **ACCEPT** (no REJECT) |

---

## Traffic breakdown

| Direction | Count | Description |
|-----------|-------|-------------|
| **Outbound** (private → public) | 83 | Traffic from your VPC to the internet (NAT egress; appears as your NAT public IP) |
| **Inbound** (public → private) | 24 | Traffic from the internet to your VPC (e.g. ALB/clients) |
| **Internal** (private ↔ private) | 93 | Traffic between 10.0.10.17 and 10.0.20.232 inside the VPC |

---

## Internal IPs (your workloads)

- **10.0.10.17** — 95 flows (source or destination). Likely the **ALB** or a frontend/backend interface receiving user and internal traffic.
- **10.0.20.232** — 81 flows. Likely an **ECS task** or internal service talking to 10.0.10.17 (e.g. backend → ALB or frontend → backend).

So in this window you have one “edge” IP (10.0.10.17) and one internal IP (10.0.20.232), both on ENI `eni-0eacf37f4f8a7bf3e` (often the ALB’s ENI in a typical setup).

---

## Ports

- **Destination port 443**: 165 flows — almost all traffic is **HTTPS** (TCP 443).
- A few flows use ephemeral or other ports (e.g. 0 for one ICMP-like flow with protocol 1).

---

## Outbound (NAT egress) — 83 flows

- **Source**: 10.0.10.17 (private).
- **Destination**: 83 **different** public IPs, all on **port 443**.
- Each external IP appears with **low flow count** (1 flow each in this sample); no single destination dominates.

**Interpretation:**  
This is consistent with **client-side HTTPS** from 10.0.10.17 to many different external hosts (e.g. API calls, CDNs, or browser traffic). When this goes through your NAT Gateway, the internet sees your **NAT public IP** (e.g. 52.7.240.103) as the source. For an abuse report about that NAT IP “scanning” or “suspected infection,” this log shows that **10.0.10.17** is the internal source of the outbound 443 traffic in this window. If 10.0.10.17 is the ALB, the real origin is **clients** (users) whose requests are being forwarded; the ALB would not normally initiate many outbound 443 connections to diverse IPs unless it’s proxy/egress. More likely 10.0.10.17 in this context is an **instance/task** (e.g. frontend or backend) making outbound HTTPS calls; that’s normal (Stripe, AWS APIs, etc.). The **abuse complaint** would match these flows: same NAT IP, many distinct destinations on 443 in a short window.

---

## Inbound — 24 flows

- **Source**: 24 different public IPs.
- **Destination**: 10.0.10.17, port 443.
- **Interpretation:** External clients (users, bots, scanners) connecting to your service (e.g. ALB) on HTTPS. Normal for a public-facing app.

---

## Relation to the earlier abuse complaint

- Complaint: **52.7.240.103** (your NAT) seen as **source** of connections to three IPs on **443** (e.g. 95.x.217.x.245.x.79, 45.x.154.x.199.x.97, 88.x.218.x.206.x.210).
- **fulllogs.csv** is a **single 31-second aggregation window** (start 1773194303, end 1773194334) on **2026-03-11 01:58:23 UTC**.
- In this window, **all outbound 443** from your VPC through this ENI comes from **10.0.10.17** to **83 different public IPs** on 443. So any traffic that left via the NAT in that window would appear from 52.7.240.103; the **internal source** for that NAT egress is **10.0.10.17**.
- To confirm the **exact** three connections in the abuse report, you’d need to filter this (or the full CloudWatch export) for **dstaddr** matching those three targets and **dstport 443**; the **srcaddr** in those records is the internal host (here it would be 10.0.10.17).

---

## Summary

- **fulllogs.csv** is a short, single-window snapshot of VPC flow logs for one ENI: all ACCEPT, no NODATA, mostly HTTPS (443).
- **Traffic:** Internal pair 10.0.10.17 ↔ 10.0.20.232, plus 83 outbound (10.0.10.17 → public:443) and 24 inbound (public → 10.0.10.17:443).
- **NAT egress:** The host **10.0.10.17** is the internal source for all outbound 443 in this file; that traffic would appear from your NAT public IP (52.7.240.103) to the internet.
- **No signs of scanning in this file:** Many distinct destinations with one or a few flows each is typical for normal HTTPS (APIs, CDNs, user-driven requests), not necessarily port scanning. If abuse reports continue, correlate by **destination IP and time** with flow logs and identify which task/instance is bound to 10.0.10.17 at that time.

To re-run the numeric analysis:  
`python3 scripts/analyze_fulllogs.py`
