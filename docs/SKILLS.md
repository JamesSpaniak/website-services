# Project skills map

Task-oriented index for humans and agents. Each row points to the canonical doc or workflow. For Cursor Agent Skills (`.cursor/skills/`), add project skills over time that link back to these paths.

## Product & engineering

| Task | Start here | Scripts / code |
|------|------------|----------------|
| Run app locally | [`docs/tech/local-dev.md`](tech/local-dev.md) | `docker compose`, `backend/`, `drone/` |
| Deploy to AWS | [`workflows/tech/deploy.md`](../workflows/tech/deploy.md) | `./pipeline.sh --env dev` |
| Deploy from a cloud session / phone | [`workflows/tech/deploy-from-cloud.md`](../workflows/tech/deploy-from-cloud.md) | `scripts/deploy-preflight.sh`, `scripts/cloud-setup.sh` |
| Rehearse migrations on a prod clone / get prod-shaped data locally | [`workflows/tech/prod-db-clone.md`](../workflows/tech/prod-db-clone.md) | `scripts/prod-db-clone.sh dump && …/prod-db-clone.sh restore` |

| Add or change a metric / set up Grafana alerts / "are we within the free tier" | [`docs/tech/observability.md`](tech/observability.md) | `backend/src/telemetry.ts`, `backend/src/analytics/analytics.service.ts` |
| Understand API surface | [`docs/tech/backend-data.md`](tech/backend-data.md) | `backend/src/` |
| Understand frontend data flow | [`docs/tech/frontend-data.md`](tech/frontend-data.md) | `drone/src/app/lib/` |
| Purchase / Pro membership flows | [`docs/tech/purchase-flows.md`](tech/purchase-flows.md) | `backend/src/purchases/`, Stripe Dashboard |
| Pricing model (target vs current) | [`docs/sales/pricing-model.md`](sales/pricing-model.md) | Stripe Products/Prices, `packages.md` |
| Analytics, pixels, ad conversion tracking | [`docs/tech/analytics-and-attribution.md`](tech/analytics-and-attribution.md) | `drone/src/app/lib/analytics.ts`, `backend/src/analytics/`, `backend/src/audit/` |
| User-level usage metrics, utilization, revenue joins | [`docs/tech/product-analytics.md`](tech/product-analytics.md) | `backend/src/audit/`, `backend/src/progress/`, `backend/src/purchases/`, `backend/src/organizations/` |
| Build the analytics stack: orders, entitlements (bundle / Pro / org seat → same course), product events, reporting API, admin + manager dashboards | [`docs/tech/analytics-implementation-plan.md`](tech/analytics-implementation-plan.md) | `backend/src/commerce/`, `backend/src/product-events/`, `backend/src/reporting/`, `backend/src/analytics/`, `drone/src/app/admin/analytics/`, `drone/src/app/manager/` |
| **Produce a report / dashboard snapshot / PDF** from analytics data ("how are we doing", "class report for org X", "who is stalled") — which SQL to run, what each number means | [`docs/tech/analytics-queries.md`](tech/analytics-queries.md) § 10 recipe | `GET /reporting/*`, `GET /organizations/:id/{progress,engagement,utilization}`, `backend/src/migrations/1765000003000-CreateAnalyticsViews.ts` |
| Teacher / manager view of student progress, video watch tracking, class engagement | [`docs/tech/manager-progress-visibility.md`](tech/manager-progress-visibility.md) | `drone/src/app/manager/progress/`, `backend/src/organizations/`, `backend/src/progress/`, `drone/src/app/ui/components/video.tsx` |
| PWA / mobile app / App Store / Capacitor vs React Native | [`docs/tech/pwa-and-mobile-app.md`](tech/pwa-and-mobile-app.md) | `drone/src/app/manifest.ts`, `drone/src/middleware.ts`, `backend/src/auth/`, `backend/src/media/signed-url.service.ts` |
| Edit course structure / exams | [`docs/tech/course-editing-roadmap.md`](tech/course-editing-roadmap.md) | Admin UI, course JSON |
| Edit FAA 107 course / questions | [`workflows/tech/content-build.md`](../workflows/tech/content-build.md) | `assets/courses/faa-107/`, `scripts/build_faa_107_questions.py` |
| Drone-building course outline (v3.4) | [`assets/courses/drone-building/outlines/drone-building-course-outline-v3.md`](../assets/courses/drone-building/outlines/drone-building-course-outline-v3.md) | Draft from v3.4; rationale in `drone-building-course-review-v2.md`; open work in [`TODO.md`](TODO.md) § Drone-building course; no payload or catalog track |
| Drone-building kit parts, costs, SKUs, goggles, frame materials | [`assets/courses/drone-building/reference/parts-list-draft-v4.md`](../assets/courses/drone-building/reference/parts-list-draft-v4.md) | Current verified parts list; v3/v2/v1 alongside keep split-ESC desk check / market note / materials/goggles; template for new kit revisions |
| Drone-building 3-D models / fit / weight / structure / flight before buying or printing (frame variants incl. truss arms + keel, exact interference, swept wires, printable STLs + print checks, STEP for Onshape, browser viewer, CG/inertia, thrust-to-weight, flight time, FEA stress/modes, Betaflight PID + gust sim, ESC thermal) | [`assets/courses/drone-building/cad/README.md`](../assets/courses/drone-building/cad/README.md) | `scripts/build_drone_model.py` (voxel, no deps) and `scripts/.venv-cad/bin/python -m dronecad build` (framework, run from `scripts/`); edit `cad/bom.json` (hardware facts) or `cad/variants.json` (layouts), never `cad/generated/` |
| Check someone else's drone frame (STL from Fusion/Onshape) against our kit — hole patterns, wheelbase, clear height, mass, FEA | [`assets/courses/drone-building/cad/README.md`](../assets/courses/drone-building/cad/README.md) § reference | `python -m dronecad reference FRAME.stl` → `cad/generated/reference/<name>/reference-report.md` |
| Model a new drone kit (different parts list) with the same checks | [`assets/courses/drone-building/cad/README.md`](../assets/courses/drone-building/cad/README.md) § Editing rules | new dir with `bom.json` + `variants.json` in the same schema; `python -m dronecad build -k DIR`; optional `parts/<component>/part.step`, `thrust-stand.csv` |
| Drone-building classroom soldering lab: station cost, safety, Pre-soldered SKU labor, course 2 proposal | [`assets/courses/drone-building/reference/soldering-lab.md`](../assets/courses/drone-building/reference/soldering-lab.md) | Research note; course 2 is a proposal, not locked |
| Drone-building CAD / CNC / sim extensions (print vs router, DXF vs CAM, canopy, Isaac Lab vs Betaflight SITL, Unit 5/8 hooks) | [`assets/courses/drone-building/reference/cad-sim-extensions.md`](../assets/courses/drone-building/reference/cad-sim-extensions.md) | Continue from § 8; how-to stays [`cad/README.md`](../assets/courses/drone-building/cad/README.md); do not implement from SKILLS alone |
| FAA 107 course quality review (outline ↔ JSON) | [`assets/courses/faa-107/faa_107_course_quality_review.md`](../assets/courses/faa-107/faa_107_course_quality_review.md) | Compare `outlines/` + `faa_107_course.json`; apply confirmed items; leave structure decisions open until author confirm |
| Bulk course images (map/upload/merge) | [`workflows/tech/course-images.md`](../workflows/tech/course-images.md) | `scripts/course_images.py`, media S3 bucket |
| Course image sizes / hero vs unit display | [`workflows/tech/course-images.md`](../workflows/tech/course-images.md) § Display modes / Authoring | `CourseImageStrip`, preview page, catalog cards |
| Question bank build | [`docs/tech/exam-generator-and-course-linking.md`](tech/exam-generator-and-course-linking.md) | `scripts/build_faa_107_questions.py` |
| Unit refs migration | [`docs/tech/unit-refs-migration.md`](tech/unit-refs-migration.md) | — |
| Environment dev/prod split | [`docs/tech/environment-split-plan.md`](tech/environment-split-plan.md) | `terraform/env/*.tfvars` |
| Legal/privacy sync | [`docs/tech/legal-and-privacy-site-sync.md`](tech/legal-and-privacy-site-sync.md) | `drone/src/app/legal/`, `privacy/` |
| Bulk video upload | [`workflows/tech/content-build.md`](../workflows/tech/content-build.md) | `scripts/bulk-upload-videos.sh` |
| Align Google Drive with `assets/` / rclone pull of outlines, videos, brand | [`docs/tech/assets-and-drive-storage-plan.md`](tech/assets-and-drive-storage-plan.md) | `rclone` remote `gdrive:` |
| Regenerate API types | — | `scripts/generate-api-types.sh` |

## Sales

| Task | Start here | Scripts / data |
|------|------------|----------------|
| School outreach (full process) | [`workflows/sales/outreach.md`](../workflows/sales/outreach.md) | Spreadsheet/CRM |
| Write a cold email | [`workflows/sales/email-drafts.md`](../workflows/sales/email-drafts.md) | — |
| Collect district contacts | [`docs/sales/contact-collection.md`](sales/contact-collection.md) | `scripts/collect_school_contacts.py`, `scripts/import_district_research.py`, `scripts/contact_sources.yaml` |
| Generate draft emails from CSV | [`docs/sales/contact-collection.md`](sales/contact-collection.md) | `scripts/draft_contact_emails.py` |
| Pitch / procurement language | [`docs/sales/features.md`](sales/features.md) | — |
| Offer design: attraction offer, upsells, downsells, subscriptions, kits/parts, sponsors, 3-year contracts | [`docs/sales/money-model.md`](sales/money-model.md) | Decisions MM1–MM10; SKU facts in `packages.md` / `pricing-model.md` |
| Competitor comparison | [`docs/sales/competitor-analysis.md`](sales/competitor-analysis.md) | Appendix A matrix |
| Outreach data files | — | `outreach/DroneEdge School District Research.xlsx`, `school-district-research-contacts.csv`, `contact-candidates.csv`, `contact-email-drafts.csv` |

## Marketing

| Task | Start here | Scripts / assets |
|------|------------|------------------|
| Content vision (AI-drafted articles) | [`docs/marketing/content-vision.md`](marketing/content-vision.md) | — |
| SEO & GEO strategy | [`docs/marketing/seo-geo-strategy.md`](marketing/seo-geo-strategy.md) | — |
| Paid ads strategy (funnels, VSL, proof, 70/20/10) | [`docs/marketing/paid-acquisition.md`](marketing/paid-acquisition.md) | — |
| Launch / optimize a paid campaign | [`workflows/marketing/paid-ads.md`](../workflows/marketing/paid-ads.md) | Ad platform consoles |
| Ad tracking, pixels, attribution | [`docs/tech/analytics-and-attribution.md`](tech/analytics-and-attribution.md) | `drone/src/middleware.ts`, `backend/src/purchases/` |
| Content calendar & promotion | [`workflows/marketing/content-and-seo.md`](../workflows/marketing/content-and-seo.md) | — |
| Publish news article to JSON | [`workflows/marketing/content-and-seo.md`](../workflows/marketing/content-and-seo.md) | `scripts/build_news_article_json.py`, `assets/articles/` |
| Brand assets (logo, social) | [`docs/marketing/brand-assets.md`](marketing/brand-assets.md) | `assets/visuals/Logo/`, `assets/visuals/Assets/Social/` |
| Merch / t-shirts | [`docs/marketing/merch.md`](marketing/merch.md) | `assets/visuals/Assets/Merch/`, `scripts/build_merch_art.py` |
| Action Space Boston hackathon (Oct 23–25 2026) — event-day brief, Tello/Isaac/PPO, food sponsor option | [`docs/marketing/action-space-hackathon-2026.md`](marketing/action-space-hackathon-2026.md) | — |
| Article hero / story images | [`workflows/marketing/content-and-seo.md`](../workflows/marketing/content-and-seo.md) | `scripts/brand_story11_images.py`, `assets/articles/images/` |

## Adding Cursor project skills

When a workflow stabilizes, consider a skill under `.cursor/skills/<name>/SKILL.md` that:

1. Names trigger phrases (e.g. "school outreach", "deploy frontend", "rebuild unit 3").
2. Links to the workflow file above.
3. Lists forbidden actions (unsupervised email send, prod terraform apply).

Do not duplicate long prose — skills should point here and to workflows.
