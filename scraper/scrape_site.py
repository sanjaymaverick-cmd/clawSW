#!/usr/bin/env python3
"""
Site content scraper for a UI/UX redesign hand-off.

Crawls every accessible internal HTML page of a website and extracts the
*content* (not the styling): headings, paragraphs, lists, images + alt text,
navigation menus, footer, and contact-form fields. It then writes:

  output/pages/<slug>.json   one structured JSON file per page
  output/site_content.json   everything combined into one JSON file
  output/site_content.md     one human/LLM-friendly Markdown file
  output/crawl_report.json   crawl stats (visited, skipped, errors)

Primary engine is Requests + BeautifulSoup (fast, works for server-rendered
sites like WordPress/WooCommerce). Pass --render to use Playwright instead,
for pages whose content is injected by JavaScript.

USAGE
    python scrape_site.py https://sanjaywoodtech.com/
    python scrape_site.py https://sanjaywoodtech.com/ --max-pages 200 --delay 1.0
    python scrape_site.py https://sanjaywoodtech.com/ --render      # Playwright

See README.md for setup.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from collections import deque
from dataclasses import dataclass, field, asdict
from pathlib import Path
from urllib.parse import urljoin, urlparse, urldefrag
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# --------------------------------------------------------------------------- #
# Configuration
# --------------------------------------------------------------------------- #

USER_AGENT = (
    "Mozilla/5.0 (compatible; SiteContentScraper/1.0; "
    "+redesign-audit; contact: webmaster)"
)

# URL patterns we never want to crawl (WooCommerce actions, feeds, admin,
# binary assets, tracking params, etc.). Matched against the full URL.
SKIP_URL_PATTERNS = [
    r"/wp-admin", r"/wp-login", r"/wp-json", r"/xmlrpc\.php",
    r"add-to-cart=", r"/cart/?$", r"/checkout", r"/my-account",
    r"\?add_to_wishlist", r"/feed/?$", r"/comments/feed",
    r"replytocom=", r"[?&]orderby=", r"[?&]share=", r"[?&]wc-ajax=",
    r"#respond$",
    # WooCommerce shop layout/sort permutations -> near-duplicate views:
    r"[?&]per_page=", r"[?&]shop_view=", r"[?&]per_row=",
    r"[?&]product_view=", r"[?&]product_count=", r"[?&]paged=",
]

# File extensions that are not HTML pages -> never fetch as a "page".
NON_HTML_EXT = {
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico", ".bmp",
    ".pdf", ".zip", ".rar", ".doc", ".docx", ".xls", ".xlsx", ".ppt",
    ".pptx", ".mp4", ".mov", ".avi", ".webm", ".mp3", ".wav", ".css",
    ".js", ".json", ".xml", ".woff", ".woff2", ".ttf", ".eot",
}

# Structural containers we strip before extracting the "main" text so we do
# not duplicate nav/footer content inside every page's body.
BOILERPLATE_SELECTORS = ["script", "style", "noscript", "template", "svg"]

# --- Spam / non-English filtering -----------------------------------------
# WordPress sites are frequently injected with spam pages (gambling, pharma,
# adult, foreign-language SEO spam). These terms have no legitimate reason to
# appear on a woodworking-machinery site, so their presence flags the page.
SPAM_KEYWORDS = [
    "casino", "gacor", "judi", "togel", "sbobet", "sbotop", "maxwin",
    "slot online", "slot gacor", "situs slot", "situs judi", "rtp slot",
    "rtp live", "pragmatic play", "bandar", "taruhan", "agen bola",
    "poker online", "dominoqq", "domino qq", "bola online", "live casino",
    "judi bola", "slot deposit", "slot88", "slot777", "pkv games",
    "bocoran", "gampang menang", "link alternatif", "deposit pulsa",
    "viagra", "cialis", "escort service", "xxx video",
]

# Unicode blocks whose dominance signals a non-English (injected) page.
_NON_LATIN_RANGES = [
    (0x0400, 0x04FF),  # Cyrillic
    (0x0600, 0x06FF),  # Arabic
    (0x0590, 0x05FF),  # Hebrew
    (0x0E00, 0x0E7F),  # Thai
    (0x4E00, 0x9FFF),  # CJK unified
    (0x3040, 0x30FF),  # Hiragana / Katakana
    (0xAC00, 0xD7AF),  # Hangul
    (0x0900, 0x097F),  # Devanagari
]
NON_LATIN_THRESHOLD = 0.30  # >30% of letters non-Latin -> treat as non-English


# --------------------------------------------------------------------------- #
# Data model
# --------------------------------------------------------------------------- #

@dataclass
class PageData:
    url: str
    status: int = 0
    title: str = ""
    meta_description: str = ""
    lang: str = ""
    canonical: str = ""
    # Structured content, in document order:
    content_blocks: list = field(default_factory=list)  # [{type, level?, text}]
    headings: dict = field(default_factory=dict)         # {"h1": [...], ...}
    images: list = field(default_factory=list)           # [{src, alt, title}]
    links: list = field(default_factory=list)            # [{href, text}]
    forms: list = field(default_factory=list)            # [{action, method, fields}]
    error: str = ""


@dataclass
class SiteData:
    start_url: str
    domain: str
    navigation: list = field(default_factory=list)   # [{text, href}]
    footer: list = field(default_factory=list)        # [{text, href}]
    brand_assets: list = field(default_factory=list)  # logos/brand images
    pages: list = field(default_factory=list)         # list[PageData as dict]


# --------------------------------------------------------------------------- #
# HTTP session with retries
# --------------------------------------------------------------------------- #

def build_session() -> requests.Session:
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT, "Accept-Language": "en"})
    retry = Retry(
        total=3,
        backoff_factor=0.8,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET", "HEAD"),
    )
    adapter = HTTPAdapter(max_retries=retry, pool_connections=10, pool_maxsize=10)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session


# --------------------------------------------------------------------------- #
# URL helpers
# --------------------------------------------------------------------------- #

def normalize_url(url: str) -> str:
    """Drop fragments and trailing slashes so we don't visit dupes."""
    url, _frag = urldefrag(url)
    if url.endswith("/") and urlparse(url).path != "/":
        url = url[:-1]
    return url


def same_domain(url: str, root_netloc: str) -> bool:
    netloc = urlparse(url).netloc.lower()
    root = root_netloc.lower()
    # Accept www / non-www variants of the same registrable domain.
    return netloc == root or netloc == "www." + root or "www." + netloc == root


def is_crawlable(url: str) -> bool:
    lower = url.lower()
    if any(kw in lower for kw in SPAM_KEYWORDS):
        return False
    if any(re.search(p, lower) for p in SKIP_URL_PATTERNS):
        return False
    ext = Path(urlparse(lower).path).suffix
    if ext in NON_HTML_EXT:
        return False
    if urlparse(url).scheme not in ("http", "https"):
        return False
    return True


def slugify(url: str) -> str:
    path = urlparse(url).path.strip("/")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", path).strip("-").lower()
    return slug or "home"


def _non_latin_ratio(text: str) -> float:
    """Fraction of alphabetic characters that fall in non-Latin scripts."""
    letters = non_latin = 0
    for ch in text:
        if ch.isalpha():
            letters += 1
            cp = ord(ch)
            if any(lo <= cp <= hi for lo, hi in _NON_LATIN_RANGES):
                non_latin += 1
    return (non_latin / letters) if letters else 0.0


def classify_unwanted(url: str, page: "PageData") -> str:
    """Return a reason string if the page is spam / non-English, else ''."""
    url_l, title_l = url.lower(), page.title.lower()
    for kw in SPAM_KEYWORDS:
        if kw in url_l or kw in title_l:
            return f"spam keyword in url/title: '{kw}'"

    body = " ".join(b["text"] for b in page.content_blocks).lower()
    body_hits = sorted({kw for kw in SPAM_KEYWORDS if kw in body})
    if body_hits:
        return f"spam keyword(s) in body: {body_hits[:5]}"

    sample = (page.title + " " + body)[:4000]
    ratio = _non_latin_ratio(sample)
    if ratio >= NON_LATIN_THRESHOLD:
        return f"non-English content ({ratio:.0%} non-Latin script)"

    lang = (page.lang or "").lower()
    if lang and not lang.startswith("en"):
        return f"non-English lang attribute: '{page.lang}'"
    return ""


# --------------------------------------------------------------------------- #
# Extraction
# --------------------------------------------------------------------------- #

def clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def extract_navigation(soup: BeautifulSoup, base_url: str) -> list:
    """Grab links from the primary <nav> / <header> menu."""
    nav_links, seen = [], set()
    containers = soup.select("header nav, nav[role=navigation], #site-navigation, "
                             ".main-navigation, .primary-menu, header .menu, nav")
    for container in containers:
        for a in container.find_all("a", href=True):
            text = clean_text(a.get_text())
            href = normalize_url(urljoin(base_url, a["href"]))
            if text and href not in seen:
                seen.add(href)
                nav_links.append({"text": text, "href": href})
        if nav_links:
            break  # first matching nav is usually the primary one
    return nav_links


def extract_footer(soup: BeautifulSoup, base_url: str) -> list:
    footer_links, seen = [], set()
    for footer in soup.select("footer, .site-footer, #colophon, .footer"):
        for a in footer.find_all("a", href=True):
            text = clean_text(a.get_text())
            href = normalize_url(urljoin(base_url, a["href"]))
            key = (text, href)
            if (text or href) and key not in seen:
                seen.add(key)
                footer_links.append({"text": text, "href": href})
        if footer_links:
            break
    return footer_links


def extract_brand_assets(soup: BeautifulSoup, base_url: str) -> list:
    """Logos, favicons, and images that look like brand assets."""
    assets, seen = [], set()
    # favicons / touch icons
    for link in soup.find_all("link", rel=True, href=True):
        rels = " ".join(link.get("rel", [])).lower()
        if "icon" in rels:
            src = urljoin(base_url, link["href"])
            if src not in seen:
                seen.add(src)
                assets.append({"type": "favicon", "src": src, "alt": ""})
    # images that mention "logo" / "brand" in src, alt, or class
    for img in soup.find_all("img"):
        src = img.get("src") or img.get("data-src") or ""
        alt = img.get("alt", "")
        cls = " ".join(img.get("class", []))
        blob = f"{src} {alt} {cls}".lower()
        if "logo" in blob or "brand" in blob:
            abs_src = urljoin(base_url, src)
            if abs_src and abs_src not in seen:
                seen.add(abs_src)
                assets.append({"type": "logo", "src": abs_src, "alt": clean_text(alt)})
    return assets


def pick_main_container(soup: BeautifulSoup):
    """Prefer <main> / article / #content; fall back to <body>."""
    for sel in ["main", "article", "#content", "#primary", ".site-main",
                ".entry-content", "[role=main]"]:
        node = soup.select_one(sel)
        if node:
            return node
    return soup.body or soup


def extract_content_blocks(container) -> tuple[list, dict]:
    """
    Walk the main container in document order and record headings, paragraphs,
    and list items so structural hierarchy is preserved.
    """
    blocks = []
    headings = {"h1": [], "h2": [], "h3": [], "h4": [], "h5": [], "h6": []}
    last_text = None  # collapse page-builder desktop/mobile duplicate copies

    for el in container.find_all(
        ["h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "blockquote"]
    ):
        # Skip elements living inside nav/footer to avoid boilerplate dupes.
        if el.find_parent(["nav", "footer"]):
            continue
        text = clean_text(el.get_text())
        if not text or text == last_text:
            continue
        last_text = text
        tag = el.name
        if tag.startswith("h"):
            level = int(tag[1])
            headings[tag].append(text)
            blocks.append({"type": "heading", "level": level, "text": text})
        elif tag == "li":
            blocks.append({"type": "list_item", "text": text})
        elif tag == "blockquote":
            blocks.append({"type": "quote", "text": text})
        else:
            blocks.append({"type": "paragraph", "text": text})
    return blocks, headings


def extract_images(container, base_url: str) -> list:
    images, seen = [], set()
    for img in container.find_all("img"):
        src = img.get("src") or img.get("data-src") or img.get("data-lazy-src") or ""
        if not src or src.startswith("data:"):
            continue
        abs_src = urljoin(base_url, src)
        if abs_src in seen:
            continue
        seen.add(abs_src)
        images.append({
            "src": abs_src,
            "alt": clean_text(img.get("alt", "")),
            "title": clean_text(img.get("title", "")),
        })
    return images


def extract_forms(soup: BeautifulSoup, base_url: str) -> list:
    forms = []
    for form in soup.find_all("form"):
        fields = []
        for el in form.find_all(["input", "textarea", "select", "button"]):
            ftype = el.get("type", el.name)
            if ftype in ("hidden", "submit", "button") and el.name != "textarea":
                # keep submit labels but skip hidden/nonce noise
                if ftype == "hidden":
                    continue
            label = ""
            fid = el.get("id")
            if fid:
                lab = soup.find("label", attrs={"for": fid})
                if lab:
                    label = clean_text(lab.get_text())
            fields.append({
                "tag": el.name,
                "type": ftype,
                "name": el.get("name", ""),
                "placeholder": el.get("placeholder", ""),
                "label": label,
                "required": el.has_attr("required"),
            })
        forms.append({
            "action": urljoin(base_url, form.get("action", "")),
            "method": (form.get("method") or "get").lower(),
            "fields": fields,
        })
    return forms


def extract_internal_links(soup: BeautifulSoup, base_url: str, root_netloc: str) -> list:
    links, seen = [], set()
    for a in soup.find_all("a", href=True):
        href = normalize_url(urljoin(base_url, a["href"]))
        if href in seen:
            continue
        seen.add(href)
        links.append({
            "href": href,
            "text": clean_text(a.get_text()),
            "internal": same_domain(href, root_netloc),
        })
    return links


# --------------------------------------------------------------------------- #
# Page fetch (requests) and optional render (playwright)
# --------------------------------------------------------------------------- #

def fetch_html(session: requests.Session, url: str, timeout: int) -> tuple[int, str, str]:
    """Return (status_code, final_url, html). Raises on hard network failure."""
    resp = session.get(url, timeout=timeout, allow_redirects=True)
    ctype = resp.headers.get("Content-Type", "")
    if "text/html" not in ctype and "application/xhtml" not in ctype:
        return resp.status_code, resp.url, ""  # not an HTML page
    resp.encoding = resp.apparent_encoding or resp.encoding
    return resp.status_code, resp.url, resp.text


def render_html(page, url: str, timeout: int) -> tuple[int, str, str]:
    """Playwright render. `page` is a live Playwright page object."""
    response = page.goto(url, wait_until="networkidle", timeout=timeout * 1000)
    page.wait_for_timeout(500)  # let late JS settle
    status = response.status if response else 0
    return status, page.url, page.content()


def parse_page(url: str, html: str, status: int, root_netloc: str) -> tuple[PageData, list]:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup.select(",".join(BOILERPLATE_SELECTORS)):
        tag.decompose()

    page = PageData(url=url, status=status)
    if soup.title and soup.title.string:
        page.title = clean_text(soup.title.string)
    html_tag = soup.find("html")
    if html_tag and html_tag.get("lang"):
        page.lang = html_tag["lang"]
    md = soup.find("meta", attrs={"name": "description"})
    if md and md.get("content"):
        page.meta_description = clean_text(md["content"])
    canon = soup.find("link", rel="canonical")
    if canon and canon.get("href"):
        page.canonical = canon["href"]

    container = pick_main_container(soup)
    page.content_blocks, page.headings = extract_content_blocks(container)
    page.images = extract_images(container, url)
    page.forms = extract_forms(soup, url)

    all_links = extract_internal_links(soup, url, root_netloc)
    page.links = all_links
    next_urls = [l["href"] for l in all_links if l["internal"]]
    return page, next_urls


# --------------------------------------------------------------------------- #
# Crawler
# --------------------------------------------------------------------------- #

def load_robots(session: requests.Session, start_url: str) -> RobotFileParser:
    rp = RobotFileParser()
    robots_url = urljoin(start_url, "/robots.txt")
    try:
        resp = session.get(robots_url, timeout=10)
        if resp.status_code == 200:
            rp.parse(resp.text.splitlines())
        else:
            rp.parse([])
    except requests.RequestException:
        rp.parse([])
    return rp


def crawl(args) -> tuple[SiteData, dict]:
    start_url = normalize_url(args.url)
    root_netloc = urlparse(start_url).netloc
    session = build_session()

    rp = load_robots(session, start_url) if args.respect_robots else None

    site = SiteData(start_url=start_url, domain=root_netloc)
    report = {"visited": 0, "skipped": 0, "filtered": 0, "errors": 0,
              "error_urls": [], "filtered_urls": [], "start_url": start_url}

    queue: deque[str] = deque([start_url])
    seen: set[str] = {start_url}

    # Optional Playwright context.
    pw = browser = pw_page = None
    if args.render:
        from playwright.sync_api import sync_playwright
        pw = sync_playwright().start()
        browser = pw.chromium.launch(headless=True)
        ctx = browser.new_context(user_agent=USER_AGENT)
        pw_page = ctx.new_page()

    try:
        while queue and report["visited"] < args.max_pages:
            url = queue.popleft()

            if not is_crawlable(url) or not same_domain(url, root_netloc):
                report["skipped"] += 1
                continue
            if rp is not None and not rp.can_fetch(USER_AGENT, url):
                print(f"  [robots] disallowed: {url}")
                report["skipped"] += 1
                continue

            try:
                if args.render:
                    status, final_url, html = render_html(pw_page, url, args.timeout)
                else:
                    status, final_url, html = fetch_html(session, url, args.timeout)
            except Exception as exc:  # noqa: BLE001 - want to keep crawling
                print(f"  [error] {url} -> {exc}")
                report["errors"] += 1
                report["error_urls"].append({"url": url, "error": str(exc)})
                site.pages.append(asdict(PageData(url=url, error=str(exc))))
                continue

            report["visited"] += 1
            print(f"[{report['visited']:>3}] {status} {url}")

            if not html:
                continue

            page, next_urls = parse_page(final_url, html, status, root_netloc)

            # Drop injected-spam / non-English pages: don't save them and don't
            # follow their outbound links (spam pages link to more spam).
            reason = classify_unwanted(final_url, page)
            if reason:
                print(f"      [filtered] {reason}")
                report["filtered"] += 1
                report["filtered_urls"].append({"url": final_url, "reason": reason})
                continue

            site.pages.append(asdict(page))

            # Extract site-wide nav/footer/brand once from the first good page.
            if not site.navigation or not site.footer:
                soup = BeautifulSoup(html, "html.parser")
                if not site.navigation:
                    site.navigation = extract_navigation(soup, final_url)
                if not site.footer:
                    site.footer = extract_footer(soup, final_url)
                if not site.brand_assets:
                    site.brand_assets = extract_brand_assets(soup, final_url)

            for nxt in next_urls:
                nxt = normalize_url(nxt)
                if nxt not in seen and is_crawlable(nxt) and same_domain(nxt, root_netloc):
                    seen.add(nxt)
                    queue.append(nxt)

            time.sleep(args.delay)
    finally:
        if browser:
            browser.close()
        if pw:
            pw.stop()

    return site, report


# --------------------------------------------------------------------------- #
# Output writers
# --------------------------------------------------------------------------- #

def write_json(site: SiteData, report: dict, out_dir: Path) -> None:
    pages_dir = out_dir / "pages"
    pages_dir.mkdir(parents=True, exist_ok=True)

    for page in site.pages:
        slug = slugify(page["url"])
        (pages_dir / f"{slug}.json").write_text(
            json.dumps(page, indent=2, ensure_ascii=False), encoding="utf-8"
        )

    (out_dir / "site_content.json").write_text(
        json.dumps(asdict(site), indent=2, ensure_ascii=False), encoding="utf-8"
    )
    (out_dir / "crawl_report.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8"
    )


def write_markdown(site: SiteData, out_dir: Path) -> None:
    lines: list[str] = []
    add = lines.append

    add(f"# Site Content Export — {site.domain}\n")
    add(f"Source: {site.start_url}\n")
    add(f"Pages captured: {len(site.pages)}\n")

    # Navigation
    if site.navigation:
        add("\n## Global Navigation\n")
        for item in site.navigation:
            add(f"- [{item['text']}]({item['href']})")

    # Brand assets
    if site.brand_assets:
        add("\n## Brand Assets\n")
        for asset in site.brand_assets:
            label = asset.get("alt") or asset.get("type", "asset")
            add(f"- **{asset['type']}**: {asset['src']}"
                + (f" — _{label}_" if asset.get("alt") else ""))

    # Footer
    if site.footer:
        add("\n## Footer Links\n")
        for item in site.footer:
            txt = item["text"] or item["href"]
            add(f"- [{txt}]({item['href']})")

    # Pages
    add("\n---\n\n# Pages\n")
    for page in site.pages:
        if page.get("error"):
            add(f"\n## ⚠️ {page['url']} (error)\n\n> {page['error']}\n")
            continue

        add(f"\n## {page.get('title') or page['url']}\n")
        add(f"`{page['url']}`\n")
        if page.get("meta_description"):
            add(f"\n_Meta description:_ {page['meta_description']}\n")

        # Content blocks in order.
        for block in page.get("content_blocks", []):
            btype = block["type"]
            text = block["text"]
            if btype == "heading":
                # offset by +2 so page H1 -> markdown ### (keeps file hierarchy)
                hashes = "#" * min(block["level"] + 2, 6)
                add(f"\n{hashes} {text}\n")
            elif btype == "list_item":
                add(f"- {text}")
            elif btype == "quote":
                add(f"\n> {text}\n")
            else:
                add(f"\n{text}\n")

        # Images.
        if page.get("images"):
            add("\n**Images:**\n")
            for img in page["images"]:
                alt = img["alt"] or "(no alt text)"
                add(f"- `{img['src']}` — alt: {alt}")

        # Forms.
        if page.get("forms"):
            add("\n**Forms:**\n")
            for i, form in enumerate(page["forms"], 1):
                add(f"\n_Form {i}_ — action: `{form['action'] or '(none)'}` "
                    f"method: `{form['method']}`")
                for fld in form["fields"]:
                    lbl = fld["label"] or fld["placeholder"] or fld["name"] or fld["type"]
                    req = " *(required)*" if fld["required"] else ""
                    add(f"  - {fld['tag']}/{fld['type']}: {lbl}{req}")

        add("\n---\n")

    (out_dir / "site_content.md").write_text("\n".join(lines), encoding="utf-8")


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #

def parse_args(argv=None):
    p = argparse.ArgumentParser(
        description="Crawl a website and export its content for a UI/UX redesign."
    )
    p.add_argument("url", help="Start URL, e.g. https://sanjaywoodtech.com/")
    p.add_argument("--out", default="output", help="Output directory (default: output)")
    p.add_argument("--max-pages", type=int, default=150,
                   help="Max pages to crawl (default: 150)")
    p.add_argument("--delay", type=float, default=1.0,
                   help="Seconds to wait between requests (default: 1.0, be polite)")
    p.add_argument("--timeout", type=int, default=25, help="Per-request timeout seconds")
    p.add_argument("--render", action="store_true",
                   help="Use Playwright to render JS (needs: pip install playwright "
                        "&& playwright install chromium)")
    p.add_argument("--no-robots", dest="respect_robots", action="store_false",
                   help="Ignore robots.txt (default: respect it)")
    p.set_defaults(respect_robots=True)
    return p.parse_args(argv)


def main(argv=None) -> int:
    args = parse_args(argv)
    print(f"Crawling {args.url} "
          f"(engine: {'Playwright' if args.render else 'Requests'}, "
          f"max {args.max_pages} pages)\n")

    site, report = crawl(args)

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    write_json(site, report, out_dir)
    write_markdown(site, out_dir)

    print(f"\nDone. Fetched {report['visited']}, "
          f"saved {report['visited'] - report['filtered']}, "
          f"filtered {report['filtered']} (spam/non-English), "
          f"skipped {report['skipped']}, errors {report['errors']}.")
    print(f"Output written to: {out_dir.resolve()}")
    print(f"  - {out_dir / 'site_content.md'}   (feed this back for redesign)")
    print(f"  - {out_dir / 'site_content.json'}")
    print(f"  - {out_dir / 'pages'}/            (one JSON per page)")
    return 0 if report["errors"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
