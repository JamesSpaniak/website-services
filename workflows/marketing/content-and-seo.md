# Content & SEO workflow

Recurring marketing work: articles, SEO/GEO, and promotion. Strategy detail: [`docs/marketing/seo-geo-strategy.md`](../../docs/marketing/seo-geo-strategy.md). **Before drafting any content, read [`docs/marketing/content-vision.md`](../../docs/marketing/content-vision.md)** — the north star for AI-drafted and AI-cited content.

## Publish a news / article piece

1. **Draft** — Write or edit source in `assets/news/*.txt` (or advance series).
2. **Images** — Add heroes under `assets/news/images/`; use `scripts/brand_story11_images.py` if generating branded variants.
3. **JSON** — Build import payload:
   ```bash
   python3 scripts/build_news_article_json.py
   ```
   Output under `assets/news/articles/*.json`.
4. **Review** — Check title, subheading, `image_url`, content blocks, links.
5. **Publish** — Admin article editor on production or API; invalidate CloudFront if needed after frontend-only deploy.
6. **Promote** — Social (templates in [`docs/marketing/brand-assets.md`](../../docs/marketing/brand-assets.md)), communities per SEO plan § recurring promotion.

## Recurring cadence (from SEO/GEO plan)

| Frequency | Action |
|-----------|--------|
| Weekly | Monitor Search Console; note crawl errors |
| Monthly | Refresh top articles; update “last updated” where material changed |
| Monthly | Test 5–10 GEO queries in ChatGPT/Perplexity — log citations in a spreadsheet |
| Quarterly | Competitor content scan; update [`docs/sales/competitor-analysis.md`](../../docs/sales/competitor-analysis.md) if positioning shifts |

## On-site SEO checks

- Canonical URLs / sitemap: `drone/src/app/sitemap.ts`, `robots.ts`
- JSON-LD: `drone/src/app/ui/components/json-ld.tsx`
- School pages: `/schools`, `/schools/curriculum`, `/schools/funding`

## Do not

- Copy competitor copy verbatim.
- Publish unverified FAA/regulatory claims.

## Related

- [`workflows/sales/outreach.md`](../sales/outreach.md) — sales collateral links overlap with marketing pages
- [`docs/sales/features.md`](../../docs/sales/features.md) — keep messaging aligned
