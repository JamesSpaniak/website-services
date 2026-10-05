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
3. Images: slug-prefixed files in `images/`; branded heroes via `scripts/brand_story11_images.py` / `brand_school_article_images.py`. Upload to the media bucket with `python3 scripts/course_images.py upload-files assets/articles/images/<file>.png` (dry run; add `--execute`). It prints the `https://media.thedroneedge.com/articles/<name>-<hash>.png` URL to put in `hero_image` or an inline `<img>`. Don't copy article images into `drone/public/` — only `hero-default.svg` (the code fallback) lives there, to keep the frontend build small.
4. Publish through the admin article editor or API. Inventory of what is live: [`docs/marketing/article-inventory.md`](../../docs/marketing/article-inventory.md).

Workflow: [`workflows/marketing/content-and-seo.md`](../../workflows/marketing/content-and-seo.md)

## Legacy files

`import/ai_drones.json` and `import/video_photo.json` are old batch article payloads that predate the per-article pipeline.

**Merged (Aug 23 2026):** former `assets/news/` (drafts, per-article JSON, images) and the old standalone `assets/articles/` were combined into this folder.
