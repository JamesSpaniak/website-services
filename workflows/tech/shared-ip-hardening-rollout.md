# Shared-IP + bot hardening rollout (B → C → D)

Order of the infra half of [`docs/TODO.md`](../../docs/TODO.md) "Shared-IP + bot hardening". Steps A (limits, reset fixes) and E (teacher reset code) are app code and ship with any normal deploy. This runbook makes rate limits key on the **real** client IP. Each step is one `./pipeline.sh --env dev` deploy, and **that is production**: only run it when the owner asks.

Why the order matters: the API can only trust the right-hand end of `X-Forwarded-For` once nothing can reach the load balancer except CloudFront. If D ships before B, a caller hitting the ALB directly can still choose its own rate-limit bucket.

Flags (all in `terraform/env/dev.tfvars`, defaults in `terraform/variables.tf`):

| Flag | Default | Effect |
|------|---------|--------|
| `alb_cloudfront_only_ingress` | `false` | `lb_sg` admits port 80 from the CloudFront origin-facing prefix list only; 443 closed |
| `alb_require_origin_header` | `false` | ALB listeners answer 403 unless `X-Origin-Verify` matches the secret CloudFront sends |
| `log_forwarded_chain` | `false` | API logs every request's `X-Forwarded-For` chain (full IPs, so keep it short) |
| `trusted_proxy_hops` | `""` | API rate-limits by the entry this many places from the right; empty keeps the legacy first entry |

## 0. Ship A + E (any normal deploy)

1. Rehearse the migrations on a prod clone first. `1765000016000-PasswordResetCodes` adds 3 nullable columns to `users`. See [`prod-db-clone.md`](prod-db-clone.md).
2. `./pipeline.sh --env dev` ([`deploy.md`](deploy.md)). With every flag at its default, Terraform also:
   - adds the origin header to CloudFront (in-place update);
   - creates `random_password.origin_verify` and two ALB listener rules that only forward;
   - registers an API task revision with `TRUSTED_PROXY_HOPS=""` and `LOG_FORWARDED_CHAIN=false`.

   None of that changes behaviour. `./scripts/deploy-preflight.sh --plan` reports the three new resources as "creates state does not know about"; that is expected the first time.
3. Smoke test:
   - **Forgot-password:** an email arrives with a link that works once (a second use → "invalid or expired").
   - **Teacher reset code:** on a test org, Manager → Members → key icon → code → `/reset-code` with that student's username → signed in.

## 1. Lock the ALB to CloudFront (B)

1. Wait until the distribution has finished deploying the header:
   ```bash
   aws cloudfront get-distribution --id "$(terraform -chdir=terraform output -raw frontend_cloudfront_id)" --query Distribution.Status --output text   # → Deployed
   ```
2. In `dev.tfvars` set `alb_cloudfront_only_ingress = true` and `alb_require_origin_header = true`, then deploy. The security-group swap revokes the old rules and adds the new one, so expect at most a few seconds of failed requests. Do it outside school hours (US Eastern 7 am–4 pm).
3. Verify:
   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' https://thedroneedge.com/            # 200
   curl -s -o /dev/null -w '%{http_code}\n' https://thedroneedge.com/api/health  # 200
   ALB=$(aws elbv2 describe-load-balancers --names droneedge-dev-alb --query 'LoadBalancers[0].DNSName' --output text)
   curl -s -m 10 -o /dev/null -w '%{http_code}\n' "http://$ALB/"                  # 000 (timeout) — SG blocks it
   ```
   Also send a Stripe test webhook from the Dashboard. It travels via CloudFront, so it must still return 2xx.
4. **Rollback:** set both flags back to `false` and deploy.

## 2. Confirm the hop count (C)

1. Set `log_forwarded_chain = true` and deploy.
2. Load a few pages from two networks, for example a laptop on Wi-Fi and a phone on cellular. For each one, note the public IP from <https://whatismyip.com>.
3. Read the API logs (CloudWatch → the API log group, filter `x-forwarded-for chain`). Find your IP in the chain and count the entries to its right, including the last one. That count is **N**. Expect 3: the CloudFront edge, the public ALB's view of it, and the Next.js task. Both devices must give the same N.
4. Turn the logging back off in the same edit as step 3.1 below. Logging full IPs is a privacy cost, so don't leave it on.

## 3. Rate-limit by the real IP (D)

1. Set `log_forwarded_chain = false` and `trusted_proxy_hops = "N"`, then deploy.
2. Verify spoofing no longer helps. Use an unknown username so no real account gets locked:
   ```bash
   for i in $(seq 1 125); do
     curl -s -o /dev/null -w '%{http_code}\n' -H "X-Forwarded-For: 203.0.113.$((i % 250))" \
       -H 'Content-Type: application/json' -d '{"username":"nobody-ratelimit-check","password":"x"}' \
       https://thedroneedge.com/api/auth/login
   done | sort | uniq -c        # ~120 × 401, then 429s
   ```
   Before D every request is 401, because each fake IP got a fresh bucket. Wait a minute afterwards: your own IP's login bucket is full until then.
3. Watch the first school day afterwards. API logs `429 … bucket=ip:a.b.c.x` show which network hit a limit. A school's NAT repeatedly filling the login (120/min) or register (120/10 min) bucket is the signal to revisit limits or the deferred school IP allowlist.
4. **Rollback:** `trusted_proxy_hops = ""` and deploy. That brings back the legacy first-entry behaviour.

When step 3 is verified, move the TODO row to [`docs/TODO_COMPLETED.md`](../../docs/TODO_COMPLETED.md) and drop the "not yet applied" notes in [`docs/tech/architecture.md`](../../docs/tech/architecture.md).
