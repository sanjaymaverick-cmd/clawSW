# Site Content Scraper

Crawls a website and exports its **content** (headings, paragraphs, lists,
images + alt text, navigation, footer, contact-form fields, brand assets) into
clean JSON and a single Markdown file — ready to hand back for a UI/UX redesign.

Target site (`sanjaywoodtech.com`) is a server-rendered WordPress/WooCommerce
site, so the default **Requests + BeautifulSoup** engine is all you need.
Use `--render` (Playwright) only if some content turns out to be JS-injected.

## Setup

```bash
cd scraper
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
```

If (and only if) you need the JavaScript-rendering engine:

```bash
playwright install chromium
```

## Run

```bash
# Standard crawl (recommended for this site):
python scrape_site.py https://sanjaywoodtech.com/

# Bigger crawl, slower/politer:
python scrape_site.py https://sanjaywoodtech.com/ --max-pages 250 --delay 1.5

# JavaScript rendering (only if content is missing):
python scrape_site.py https://sanjaywoodtech.com/ --render
```

## Output (written to `output/` or `output_full/`)

| File | What it is |
|------|------------|
| `site_content.md`   | One tidy Markdown doc — **feed this back for the redesign** |
| `site_content.json` | Everything combined, structured |
| `pages/<slug>.json` | One structured file per page |
| `crawl_report.json` | Crawl stats: visited / skipped / errors |

## Build website data (filtered)

After a crawl, generate clean JSON for the Next.js site (drops casino/spam pages,
pagination, 404s; extracts 171+ products, categories, company copy):

```bash
python build_site_data.py
# → website/data/products.json, categories.json, company.json, industries.json, gallery.json, site.json
```

## Options

| Flag | Default | Meaning |
|------|---------|---------|
| `--max-pages N` | 150 | Stop after N pages |
| `--delay S`     | 1.0 | Seconds between requests (be polite) |
| `--timeout S`   | 25  | Per-request timeout |
| `--render`      | off | Use Playwright to execute JavaScript |
| `--no-robots`   | off | Ignore `robots.txt` (default: respect it) |
| `--out DIR`     | output | Output directory |

## Notes

- Respects `robots.txt` by default and rate-limits requests.
- Stays on the same domain (accepts `www` / non-`www`).
- Skips WooCommerce action URLs (cart, checkout, add-to-cart), feeds,
  `wp-admin`, and binary assets, so you get *content* pages only.
- De-duplicates images and links; resolves all URLs to absolute.
