# Brand & marketing assets

Index under [`assets/visuals/`](../../assets/visuals/). Files stay in place to avoid breaking script paths.

## Brand identity

| Path | Contents |
|------|----------|
| [`assets/visuals/Logo/`](../../assets/visuals/Logo/) | SVG, PNG, PDF — logo and icon (black/white) |
| [`assets/visuals/Colors/`](../../assets/visuals/Colors/) | Brand color reference |
| [`assets/visuals/Fonts/`](../../assets/visuals/Fonts/) | Font links / licensing notes |
| [`assets/visuals/Assets/Gradients/`](../../assets/visuals/Assets/Gradients/) | Gradient backgrounds |
| [`assets/visuals/Assets/Social/`](../../assets/visuals/Assets/Social/) | Social media template images |
| [`assets/visuals/Assets/Mockups/`](../../assets/visuals/Assets/Mockups/) | Device and scene mockups |
| [`assets/visuals/Prompt Guide/`](../../assets/visuals/Prompt%20Guide/) | Image/content prompt guide (docx) |
| [`assets/visuals/Presentation/`](../../assets/visuals/Presentation/) | Visual identity PDF |

## Public web assets

| Path | Contents |
|------|----------|
| [`drone/public/`](../../drone/public/) | Static files served by Next.js |
| CloudFront `media.thedroneedge.com` | Uploaded course/article video and images |

## Marketing flight media (local, mostly gitignored)

| Path | Contents |
|------|----------|
| [`assets/media/`](../../assets/media/) | Business drone masters (`raw/`), snips/previews (`edits/`), tracked cut lists (`manifests/`) |
| [`assets/media/README.md`](../../assets/media/README.md) | Hybrid archive rules: external SSD primary, this folder working set, B2/Glacier later; never iCloud for 4K masters |

Personal/family footage does **not** live in this repo. Course lesson source for MediaConvert stays under [`assets/videos/`](../../assets/videos/). Finished site uploads go to S3/CloudFront only.

## Editorial content

| Path | Contents |
|------|----------|
| [`assets/news/`](../../assets/news/) | Article drafts (`.txt`), import JSON, hero images |
| [`assets/articles/`](../../assets/articles/) | Standalone article import JSON |
| [`assets/courses/`](../../assets/courses/) | Course JSON and question bank artifacts |
| [`article-inventory.md`](article-inventory.md) | Repo vs prod CMS status, slugs, prod IDs |

## Usage notes

- Prefer **Logo/SVG** for web; PNG for slides and email.
- News images: `scripts/brand_story11_images.py` or `assets/news/images/`.
- Course JSON and news JSON are the usual commit targets; avoid large binary churn.
