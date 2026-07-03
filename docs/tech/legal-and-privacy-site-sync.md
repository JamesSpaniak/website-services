# Legal & privacy — site vs invoice

This note tracks what was added to the site, what to verify on invoices/quotes before the first client, and known risks.

## Canonical URLs (apex)

- **Canonical origin:** `https://thedroneedge.com` (no `www`).
- **Redirect:** `https://www.thedroneedge.com/*` → same path on apex with **301**, implemented in `drone/src/middleware.ts` (host `www.thedroneedge.com` only).
- **Build/runtime default:** `NEXT_PUBLIC_SITE_URL` defaults to `https://thedroneedge.com` (`layout.tsx`, `robots.ts`, `sitemap.ts`, `json-ld.tsx`, `Dockerfile`, `pipeline.sh`).

**Google Search Console:** use a **URL-prefix** or **Domain** property for `thedroneedge.com` so reports match the canonical site.

**Invoices / §10:** Use **`https://thedroneedge.com/privacy/`** in the Sales Agreement (the live site and `/legal` §10 text use this). Update any older PDFs that still say `https://www.thedroneedge.com/privacy/`.

**CloudFront:** Keep **`www.thedroneedge.com`** on the distribution **aliases** (with apex) so DNS to `www` does not 403; the app then 301s to apex.

---

## Expanded pre-launch checklist (apex + legal)

### A. Invoice, quote, and PDF templates (§10 and elsewhere)

**Why it matters:** If the contract says the Privacy Notice is at `https://www.thedroneedge.com/privacy/` but the site canonical and metadata use **apex**, you create a small mismatch: the link still *works* (301 to apex), but lawyers and auditors prefer the **exact URL** in the instrument to match what you intend as the official notice location.

**What to do:**

1. **Search-replace across all templates** (Word, Google Docs, PDF masters, e-sign packages):  
   - `https://www.thedroneedge.com/privacy` → `https://thedroneedge.com/privacy`  
   - Include variants with/without trailing slash; **pick one style** (e.g. always with trailing `/`) and use it consistently in contracts and on marketing copy.
2. **Regenerate or re-export PDFs** that embed old URLs (don’t only fix the source doc—re-issue PDFs clients might save).
3. **Any other hard-coded site links** in exhibits (e.g. “visit our website”, support portals, handbooks): prefer **apex** so they match `NEXT_PUBLIC_SITE_URL` and JSON-LD.
4. **Stripe / QuickBooks / other invoicing tools:** If line items or footers inject a “Privacy” or “Legal” URL, align to apex.
5. **Email footers** (support@, donotreply@): If they include `www`, update to apex for consistency (optional for deliverability; mainly consistency).

### B. Google Search Console (GSC) and indexing

**Domain property vs URL-prefix property**

| Property type | What it covers | Typical use |
|---------------|----------------|---------------|
| **Domain** property (`thedroneedge.com`) | All protocols and subdomains (http/https, www, app.*, etc.) | Best single pane for “everything on this domain,” including while you still have legacy `www` links. |
| **URL-prefix** (`https://thedroneedge.com/`) | Only that origin | Good if you want reports **only** for the canonical site after redirects are stable. |

**Practical steps:**

1. Add or keep a **Domain** property for `thedroneedge.com` if you want aggregate coverage; add **`https://thedroneedge.com/`** as a URL-prefix property if you care about clean reporting for the canonical origin only.
2. Submit **`https://thedroneedge.com/sitemap.xml`** in GSC (sitemap URLs are built from `SITE_URL` / `NEXT_PUBLIC_SITE_URL`).
3. Use **URL Inspection** on `https://thedroneedge.com/`, `/privacy`, `/legal` after deploy; confirm **200** and no unexpected `noindex`.
4. If you previously verified only **`www`**, keep that property for a while to monitor legacy signals, but treat **apex** as the primary URL you request indexing for.
5. **Google Business Profile / ads / social “website” field:** Set to **`https://thedroneedge.com`** so new signals reinforce apex.

### C. Where the www → apex 301 runs (origin vs edge)

**Today:** Redirect is implemented in **Next.js middleware** at the **origin** (after CloudFront forwards the request to the ALB/ECS task).

**Implications:**

- **Correctness:** Browsers and Google receive a real **301** to apex; SEO is fine.
- **Cost / scale:** Every `www` hit still reaches your app (then redirects). Traffic is usually small; if `www` ever gets heavy traffic or attacks, moving the redirect to a **CloudFront Function** (viewer request) avoids origin work for those requests.
- **Caching:** CloudFront may cache responses; ensure behaviors don’t accidentally cache **per-user** HTML in a way that serves apex HTML on a `www` URL without redirect (your ordered behaviors for `/_next/static` and `/_next/image` help). If you see odd caching, invalidate after deploy.

**Optional later upgrade:** CloudFront Function: if `Host == www.thedroneedge.com` then return 301 to `https://thedroneedge.com` + path + querystring—redirect before origin.

### D. Other technical actions (outside the legal pages)

These are easy to miss because they are not on the invoice:

| Area | Check |
|------|--------|
| **Backend `FRONTEND_URL`** | Terraform sets `https://${var.domain_name}` (apex) for email links (verify-email, reset-password, org invites). **Do not** set this to `www` unless you intentionally want magic links to land on `www` (they would then 301—usually avoid the extra hop). |
| **CORS** | `backend/src/main.ts` uses `FRONTEND_URL` / `process.env.FRONTEND_URL` for allowed origin; keep aligned with where the browser actually loads the app (**apex**). |
| **Cookies / auth** | After switching canonical, new sessions should be established on **apex**. Old bookmarks to `www` still work (301). If you ever set cookies with `Domain=.thedroneedge.com`, both hosts can share them; confirm cookie attributes match your security model. |
| **OAuth / third-party dashboards** | If you add Google/Microsoft login, set allowed origins / redirect URIs to **apex** URLs. |
| **Analytics (Umami, etc.)** | One canonical hostname reduces duplicate visitor splits; configure the tracked domain as apex if the product allows. |
| **Printed / slide decks / QR codes** | Use **apex** in QR codes and “Visit us” lines. |
| **DNS / TLS** | ACM cert should continue to include **both** apex and `www` SANs where CloudFront serves both; Route53 keeps both A/ALIAS records. |

---

## What was added to the site

| Item | Location |
|------|----------|
| **Terms of Service (Sales Agreement body)** | `https://thedroneedge.com/legal` — `drone/src/app/legal/page.tsx`, `drone/src/app/legal/terms-of-service-body.tsx` |
| **Privacy Notice** | `https://thedroneedge.com/privacy` — `drone/src/app/privacy/page.tsx` |
| **Footer links** | `drone/src/app/ui/components/footer.tsx` — Company column: Terms of Service, Privacy Notice |
| **Sitemap** | `drone/src/app/sitemap.ts` — `/legal` and `/privacy` (URLs use `SITE_URL` = apex by default) |
| **“Last updated” (Terms)** | `TERMS_LAST_UPDATED` in `drone/src/app/legal/page.tsx` |
| **“Last updated” (Privacy)** | `PRIVACY_LAST_UPDATED` in `drone/src/app/privacy/page.tsx` |

The `/legal` page includes a **controlling-document disclaimer**: the signed quote, Appendix A (term, fees, user limits), and any executed agreement override the web copy if they differ.

## Text changes vs your pasted TOS (intentional)

| Location | Change | Reason |
|----------|--------|--------|
| Acceptance paragraph | `subject to an in accordance` → `subject to and in accordance` | Typo fix (standard phrase). |
| §2(b) | `derivate` → `derivative` | Spelling (`derivative works`). |
| §2(a) | One sentence added: K-12 Terms of Use are provided as an exhibit with applicable institutional quotes. | The web does not host a separate K-12 User Terms PDF; aligns practice with the contract without inventing a URL. **If you later publish `/terms-k12` or a PDF,** update this sentence and invoices to match. |
| §10 | Privacy URL shown as `https://thedroneedge.com/privacy/` | Matches apex canonical and invoice. |

No other substantive legal edits were made on purpose.

## What you should verify / update on the invoice or TOS PDF before first send

1. **§10 Privacy URL** — Set to **`https://thedroneedge.com/privacy/`** (trailing slash optional but be consistent). Replace any legacy `www` URL in templates.
2. **Appendix A** — Not on the website (quote-specific). The disclaimer on `/legal` states Appendix A and the quote control; **no change required** unless you want Appendix A duplicated online (usually you do not).
3. **“Terms of Use for K-12 Products”** — Still an exhibit on quotes, not a public URL. If you want a public URL, add a page or hosted PDF and reference it in §2(a) on both web and invoice.
4. **Versioning** — When you change web terms or privacy text, bump **Last updated** dates and consider noting a **document version** on invoices for enterprise customers.
5. **Counsel review** — The **Privacy Notice** is a practical template aligned with §10 and common edtech patterns; it is **not** a substitute for jurisdiction-specific legal review (FERPA/COPPA/state student privacy laws, GDPR if EU users, etc.).

## Risks to be aware of

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Web TOS ≠ signed package** | Medium | Rely on signed quote + exhibits; keep disclaimer on `/legal`; avoid silent drift—if you amend the Sales Agreement, update both web and template invoice. |
| **§11 Accessibility / WCAG** | Medium–high | The agreement commits to good-faith WCAG 2.1 AA efforts where feasible. Track accessibility in product QA; consider periodic audits. |
| **§10 / school consent** | High | Schools must have authority to consent for student data; your onboarding should document role of school vs Drone Edge. |
| **K-12 Terms of Use not public** | Low–medium | Contract still references them as an exhibit; ensure the exhibit is actually delivered with institutional deals. |
| **Middleware vs edge redirect** | Low | www→apex runs at the **origin** (Next middleware). For very high traffic, a **CloudFront Function** redirect could reduce origin hits; current approach is standard for many apps. |
| **Contract URL ≠ canonical URL** | Medium | Align §10 and all public legal URLs to **apex** in templates; avoids “two official privacy URLs” even if both resolve. |
| **Transition period in Search Console** | Low | For a few weeks, GSC may still show legacy `www` URLs as “redirect” or duplicate; use **Inspect** on apex and **request indexing** for key paths; be patient. |
| **Third-party or partner links** | Low | Partners or press may still link to `www`; 301 preserves SEO equity; optionally ask for link updates to apex. |
| **API clients hard-coding `www`** | Low | Mobile apps or scripts calling `www.thedroneedge.com/api/...` get an extra redirect; prefer apex in client config. |
| **WAF / rate limits** | Low | Redirects still hit origin once per uncached path; edge redirect reduces this if you ever tune WAF aggressively. |
| **Privacy / data processing agreements** | Medium | If you sign a DPA or subprocessors list with a school, ensure listed URLs and privacy contact match the live **Privacy Notice** and support email. |

## Related infra

CloudFront **`aliases`** must include both **apex** and **www** so both hostnames reach the app; middleware then 301s `www` → apex. See `terraform/cloudfront_frontend.tf`.
