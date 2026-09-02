# Articles (site `/articles` content)

All editorial content for the public articles section, by pipeline stage:

```
articles/
├── drafts/    Text drafts (.txt) — story-*, advance-*, school-* series
├── import/    Import JSON payloads (one per article + manifest.json, plus legacy batches)
└── images/    Hero + inline images (slug-prefixed) and shared photo bases
```

## Pipeline

1. Draft in `drafts/` (plain text). Naming: `<series>-<nn>-<slug>.txt`.
2. Generate/refresh import JSON via `scripts/build_news_article_json.py` → `import/`.
3. Images: slug-prefixed files in `images/`; branded heroes via `scripts/brand_story11_images.py`; site copies sync to `drone/public/images/articles/`.
4. Publish through the admin article editor or API. Inventory of what is live: [`docs/marketing/article-inventory.md`](../../docs/marketing/article-inventory.md).

Workflow: [`workflows/marketing/content-and-seo.md`](../../workflows/marketing/content-and-seo.md)

## Legacy files

`import/ai_drones.json` and `import/video_photo.json` are old batch article payloads that predate the per-article pipeline.

**Merged (Aug 23 2026):** former `assets/news/` (drafts, per-article JSON, images) and the old standalone `assets/articles/` were combined into this folder.
