# Brand & marketing assets

Index of design and content assets under [`assets/`](../../assets/). Files stay in place to avoid breaking paths in scripts and the app.

## Brand identity

| Path | Contents |
|------|----------|
| [`assets/Logo/`](../../assets/Logo/) | SVG, PNG, PDF — logo and icon (black/white) |
| [`assets/Colors/`](../../assets/Colors/) | Brand color reference |
| [`assets/Fonts/`](../../assets/Fonts/) | Font links / licensing notes |
| [`assets/Assets/Gradients/`](../../assets/Assets/Gradients/) | Gradient backgrounds |
| [`assets/Assets/Social/`](../../assets/Assets/Social/) | Social media template images |
| [`assets/Assets/Mockups/`](../../assets/Assets/Mockups/) | Device and scene mockups (Cap, Drone, iPad, etc.) |
| [`assets/Prompt Guide/`](../../assets/Prompt%20Guide/) | Image/content prompt guide (docx) |

## Public web assets

| Path | Contents |
|------|----------|
| [`drone/public/`](../../drone/public/) | Static files served by Next.js (favicons, article fallbacks) |
| CloudFront `media.thedroneedge.com` | Uploaded course/article video and images (production S3) |

## Editorial & SEO content

| Path | Contents |
|------|----------|
| [`assets/news/`](../../assets/news/) | Article drafts (`.txt`), import JSON, hero images |
| [`assets/news/articles/manifest.json`](../../assets/news/articles/manifest.json) | Batch manifest for news imports |
| [`assets/competitor.txt`](../../assets/competitor.txt) | Raw competitor research (see sales doc) |

## Course & instructional content

| Path | Contents |
|------|----------|
| [`assets/articles/`](../../assets/articles/) | FAA 107 course JSON, outlines, question CSVs |
| [`assets/videos/`](../../assets/videos/) | Source video files for upload/transcode |

## Usage notes

- Prefer **Logo/SVG** for web; PNG for slides and email.
- News images: run `scripts/brand_story11_images.py` or place under `assets/news/images/`.
- Do not commit large binary churn without need; course JSON and news JSON are the usual commit targets.
