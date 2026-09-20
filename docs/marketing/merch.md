# Merch — tees, blanks, shops, artwork

Working notes for Drone Edge shirts (events now, store later). Next dated event: [Action Space Boston, Oct 23–25 2026](action-space-hackathon-2026.md). Artwork lives in [`assets/visuals/Assets/Merch/`](../../assets/visuals/Assets/Merch/). Regenerator: [`scripts/build_merch_art.py`](../../scripts/build_merch_art.py).

Source logo files (vector — send these, not article PNGs):

- Icon: [`assets/visuals/Logo/SVG/Icon/IconWhite.svg`](../../assets/visuals/Logo/SVG/Icon/IconWhite.svg)
- Wordmark: [`assets/visuals/Logo/SVG/Logo/LogoWhite.svg`](../../assets/visuals/Logo/SVG/Logo/LogoWhite.svg)

Added text uses brand fonts: **Chakra Petch SemiBold** (tagline), **Space Mono Regular** (URL). The site title used on shirts is “FAA Certification & Drone Education”; URL is `thedroneedge.com`.

---

## Plan

| Track | Goal | Blank | Decoration |
|-------|------|-------|------------|
| **Now (events, 1–4 weeks)** | 20 black tees, student-facing | **Shaka Wear SHMHSS** (7.5 oz, jet black, boxy) | Embroidered 3" left-chest icon; optional printed sleeve URL or back wordmark |
| **Samples** | One each of the other five blanks | See blank table | Same icon stitch-out if the shop will do it |
| **Store later** | Premium SKU + restock flexibility | Shaka for volume; **AS Colour 5026** if you want a clean regular fit; **LAA 1801** only if the high collar / LA story earns a ~$10–20/shirt premium | Small DTF or embroidery on chest/sleeve; neck label optional |

Do **not** buy a heat press for the event batch. A local shop can source Shaka blanks and decorate them. DIY DTF + press only pays off if you commit to on-demand restocks.

---

## Shirt concepts (upload these)

Mockups: [`assets/visuals/Assets/Merch/mockups/`](../../assets/visuals/Assets/Merch/mockups/). Print files: [`assets/visuals/Assets/Merch/print/`](../../assets/visuals/Assets/Merch/print/) — `.svg` is true-size vector (inches in the file, text outlined); `.png` is 300 DPI white on transparent.

| # | Look | Front file | Back / sleeve file | Method |
|---|------|------------|--------------------|--------|
| 1 | Minimal sleeve icon | — | `DE_icon_sleeve_2.5in` | Embroidery or print |
| **2** | **Left-chest icon + sleeve URL** (event pick) | `DE_icon_leftchest_3in` | `DE_text_url_sleeve_3.5in` | Embroider chest, print sleeve |
| 3 | Horizontal lockup left chest + sleeve icon | `DE_lockup_horizontal_leftchest_4in` | `DE_icon_sleeve_2.5in` | Print chest (letters ~0.35" — print only), embroider sleeve |
| 4 | Center stacked logo + tagline | `DE_lockup_stacked_tagline_chest_6in` | — | Screen / DTF |
| **5** | **Chest icon + back wordmark + URL** (event alt) | `DE_icon_leftchest_3in` | `DE_back_wordmark_url_12in` | Embroider front, print back |
| 6 | Horizontal logo across chest + back-neck icon | `DE_lockup_horizontal_chest_10in` | `DE_icon_backneck_1.5in` | Screen / DTF |

Extras in `print/`: stacked lockup without tagline (`DE_lockup_stacked_chest_5.5in`), 12" back lockup, sleeve icon-over-URL (`DE_icon_url_sleeve_3.3in`).

**Embroidery-safe:** icon files (`_sleeve_2.5in`, `_leftchest_3in`, `_backneck_1.5in`) and the 10"/12" lockups (letters ≥ ~0.3"). The 4" left-chest lockup and the tagline are print-only.

Shop spec for embroidery: white thread, black 2.0–2.5 oz **cutaway** backing (not tear-away). Ask for a stitch-out of the icon on the actual blank before the run.

### Where to upload

- **Local shop:** send `.svg`, state the width from the filename so nothing gets rescaled.
- **Blankstyle / online printers:** upload `.png`, set print width to the filename value.
- **DTF gang sheet:** drop `.png`s at filename width. A 22×12" sheet holds ~12 left-chest icons or ~20 sleeve icons.

---

## Blanks

| | Shaka SHMHSS | Gildan Hammer H000 | Comfort Colors 1717 | AS Colour 5026 Classic | AS Colour 5001 Staple | LAA 1801 |
|---|---|---|---|---|---|---|
| Weight | 7.5 oz | 6.0 oz | 6.1 oz | 6.5 oz | 5.3 oz | 6.5 oz |
| Look | 90s streetwear: boxy, drop shoulder, thick jet-black | Clean classic basic, jet black | Vintage/collegiate washed black | Modern minimalist, structured regular fit, jet black | Everyday retail, lighter drape | Fashion heavyweight: wide boxy, high tight collar, short sleeves, garment-dyed black |
| Hand | dense, thick, slightly dry | smooth, medium-soft | broken-in soft, slightly fuzzy | smooth, firm | smooth, softer, lighter | dry, sturdy, “not soft but comfortable” |
| Embroidery | excellent | very good | good (washed black vs white thread) | excellent | small logos only | very good |
| Single (black) | ~$6.37 | ~$6.33 | ~$7–9 | $24 ($18 @10+, $15.60 @50+) | $20 (bulk @10+) | ~$22–28 retail / ~$16 wholesale |
| 20-shirt blanks | ~$130 | ~$130 | ~$160 | ~$360 | ~$300 | ~$320–450 |

**Shaka vs 1801:** same silhouette family. Side-by-side you notice the 1801’s higher collar, shorter sleeves, slightly wider/shorter body, and washed black. Shaka is heavier, cheaper, jet black, and sizes S–7XL (1801 retail is XS–2XL). For students/events, Shaka; 1801 only as a later premium SKU.

**Buy 20:** Shaka SHMHSS black — have the shop source from S&S / alphabroder if they can (often cheaper than you buying blanks). **Buy 1 each:** Hammer, 1717, 5026, 5001, 1801 (Black garment dye, not “Vintage Black” pigment — that can transfer).

### Where to buy samples

| Blank | Site | Notes |
|-------|------|-------|
| Shaka SHMHSS | [blankstyle.com/shaka-wear-shmhss…](https://www.blankstyle.com/shaka-wear-shmhss-adult-75-oz-max-heavyweight-t-shirt) | Use the product page / retail collection for **singles** (brand page is 6-packs) |
| Gildan H000 | [blankstyle.com/gildan-h000…](https://www.blankstyle.com/gildan-h000-hammer-short-sleeve-t-shirt) | No account needed |
| Comfort Colors 1717 | Blankstyle search | Optional garment-dye comparison |
| AS Colour 5026 | [ascolour.com/classic-tee-5026](https://ascolour.com/classic-tee-5026/) | Free **retail** account, no min, free ship over $125 |
| AS Colour 5001 | [ascolour.com/staple-tee-5001](https://ascolour.com/staple-tee-5001/) | Same account |
| LAA 1801 | [losangelesapparel.net/products/the-1801-garment-dye](https://losangelesapparel.net/products/the-1801-garment-dye) | Retail samples; Blankstyle lists 1801 but **must be decorated** (cannot buy blank there) |

---

## Shops (Bergen / Passaic)

### DTF transfer printers (film only — you press, or skip for events)

All three: no minimum, same-day-ish, pickup nearby. They do **not** ship finished shirts as the core product.

| Shop | Address | What they sell | Notes |
|------|---------|----------------|-------|
| [DTFhub](https://dtfhub.com/) | 12 US-46, Lodi · (201) 458-0062 | Gang sheets from $5, by-size from $0.99, UV / glitter / glow | Strong white ink, G7 color, 1–2 day print+ship, after-hours pickup |
| [Custom Print House](https://customprinthouse.us/) | 100 Pierre Ave Unit A, Garfield · (862) 420-0880 | 22×12" gang sheet ~$7.20, UV DTF, **neck labels** $0.50–1 | Same-day pickup if ordered before 1 pm; cheapest per-transfer |
| [DTFNJ](https://dtfnj.com/) | 356 Getty Ave Bldg 5, Clifton · (929) 447-0663 | By-size 1–20", gang sheet | Same-day ship if ordered by 4 pm ET weekdays |

### Production embroidery / screen print (finished shirts — use for events)

| Shop | Phone | Why call |
|------|-------|----------|
| **Design-N-Stitch**, 107 Pink St, Hackensack | (201) 488-1314 | Screen + embroidery, in-house artist — primary quote |
| **Everything Embroidered & Custom Printing**, Paramus | (201) 916-3221 | 15+ years, large review base |
| **Semel's Embroidery**, Clifton | (973) 473-3959 | Embroidery, screen, patches |
| **The Blank Workshop**, Hackensack | (201) 989-2899 | Review cited &lt;3 day turnaround; stocks blanks |
| Threads for Heads, Clifton | (973) 928-6828 | Print + embroidery |
| Digital Technology Imprints, Clifton | (973) 772-2384 | Embroidery + screen |
| All-County Apparel, Moonachie | (973) 363-3181 | Screen, on-time reviews |
| CORE2PRINT, Fairview | (917) 809-9917 | Tees in under a week (review) |

**Not a fit for 20–50 production:** Embroidery Babes (Haworth) = workshops/gifts. Embroidery by Nona (Maywood, (201) 742-5457) = boutique / 1-day singles — useful for a **sample stitch-out**, not the event run.

### Quote email (copy/paste)

Send `IconWhite.svg` + `LogoWhite.svg` (or the merch print SVGs) and ask for **24 and 48** pieces, black tees, sizes TBD:

1. One-color white screen print, left chest ~3.5", on Gildan 64000 **and** Shaka SHMHSS (or Comfort Colors 1717)
2. White flat embroidery, icon ~2.75–3" left chest, on Shaka SHMHSS — include digitizing fee
3. Optional second location: left-sleeve icon or printed `thedroneedge.com`
4. Puff / HD ink capability; turnaround; single pre-production sample

Typical local ballpark (2026 quotes seen at shops): **$8–12/shirt** at 24 pcs screen-print on a basic blank; **~$13–16** on a heavyweight; embroidery **~$16–22** on Comfort Colors / Shaka plus **$25–75** one-time digitizing. Standard turnaround 7–10 business days; one-color jobs often 2–5 if you ask.

---

## Methods (short)

| Method | Best for | Avoid |
|--------|----------|-------|
| Screen print | One-color logo, 24+ identical shirts, puff/HD raised ink | Tiny restocks (setup) |
| Flat embroidery | Small icon on 6 oz+ knits | Thin tees (pucker); wordmark under ~0.3" letter height |
| 3D puff embroidery | Hats | Tees (foam + dense stitches pucker jersey) |
| DTF | Small logos, mixed SKUs, no minimum | Large back prints (plasticky hand) |
| DTG on black | — | Skip for this line (pretreat, fade on darks) |

Raised logo on a **tee** = puff ink or HD screen print, not puff embroidery.

---

## Sample cart (~$85 + ship)

- Shaka SHMHSS black ×2 (~$13) — keep one blank, stitch the other
- Gildan H000 black ×1
- Comfort Colors 1717 black ×1
- AS Colour 5026 black ×1
- AS Colour 5001 black ×1 (optional lighter control)
- LAA 1801 Black ×1

Wash twice before judging. Then order **20 Shaka** through the shop for the event.
