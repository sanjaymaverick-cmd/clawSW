#!/usr/bin/env python3
"""
Transform scraped sanjaywoodtech.com pages into clean website content.

- Reads scraper/output_full/pages/*.json (falls back to output/pages)
- Drops spam (casino / gambling / French SEO junk), pagination, 404s
- Extracts products, categories, company pages, industries, gallery
- Writes website/data/*.json for the Next.js app to consume
"""

from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent
PAGES_DIRS = [
    ROOT / "output_full" / "pages",
    ROOT / "output" / "pages",
]
OUT_DIR = ROOT.parent / "website" / "data"

# ---------------------------------------------------------------------------
# Filtering
# ---------------------------------------------------------------------------

SPAM_RE = re.compile(
    r"""
    casino|roulette|poker|blackjack|bookmaker|paris\s*sportif|
    mr[.\s-]?punter|gates\s*of\s*olympus|gratorama|myempire|
    turbowins|lucky[.\s-]?block|slot\s*machine|jeu\s*responsable|
    maximiser\s*vos\s*gains|immersion\s*totale\s*pour\s*les\s*joueurs|
    meilleures\s*strategies|normes\s*de\s*securite|fonctionnalites\s*mobile|
    astuces\s*pour|le\s*monde\s*de\s*turbo
    """,
    re.I | re.X,
)

# French casino-style path fragments still present on some junk pages
SPAM_SLUG_RE = re.compile(
    r"(les-|quelles-|pour-|le-monde-de-|gratorama|myempire|turbowins|"
    r"lucky-block|mr-punter|gates-of-olympus|astuces-|joueurs)",
    re.I,
)

SKIP_PATH_RE = re.compile(
    r"""
    /page/\d+/?$          |  # pagination
    ^shop/?$              |  # 404 shop
    ^cart                 |
    ^checkout             |
    ^my-account           |
    ^wp-                  |
    add-to-cart
    """,
    re.I | re.X,
)

BOILERPLATE = {
    "installation & commissioning at your factory",
    "on-site operator training included",
    "12-month warranty on the machine",
    "spare parts stocked in india",
    "key features",
    "why choose us?",
    "product categories",
    "request a quote",
    "get in touch",
    "faq's",
    "faqs",
    "frequently asked questions",
    "company name",
    "actualités récentes",
    "meeting machinery standards pricing",
}

SITE_PREFIX = "https://sanjaywoodtech.com"

TOP_CATEGORIES = [
    {
        "slug": "panel-processing-machinery",
        "name": "Panel Processing Machinery",
        "path_prefix": "product-category/panel-processing-machinery",
        "description": (
            "Beam saws, edge banding, CNC drilling and nesting machines "
            "for panel and modular furniture factories."
        ),
    },
    {
        "slug": "solid-wood-machinery",
        "name": "Solid Woodworking Machinery",
        "path_prefix": "product-category/solid-wood-machinery",
        "description": (
            "Rip saws, planers, moulders, tenoners, sanders and CNC machines "
            "for solid wood furniture manufacturing."
        ),
    },
    {
        "slug": "solid-woodworking-machinery-taiwan",
        "name": "Solid Woodworking Machinery — Taiwan",
        "path_prefix": "product-category/solid-woodworking-machinery-taiwan",
        "description": (
            "Heavy-duty rip saws, planers, moulders and sanders — "
            "precision engineered for high-volume production."
        ),
    },
    {
        "slug": "veneer-line-machinery",
        "name": "Veneer Line Machinery",
        "path_prefix": "product-category/veneer",
        "description": (
            "Guillotines, splicers, glue applicators and hot press machines "
            "for decorative veneer surface processing."
        ),
    },
    {
        "slug": "new-launches",
        "name": "New Launches",
        "path_prefix": "product-category/new-launches",
        "description": "Latest machines added to the catalogue from global manufacturers.",
    },
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_pages() -> list[dict]:
    for d in PAGES_DIRS:
        if d.is_dir() and any(d.glob("*.json")):
            pages = []
            for f in sorted(d.glob("*.json")):
                try:
                    pages.append(json.loads(f.read_text(encoding="utf-8")))
                except Exception as e:
                    print(f"  skip {f.name}: {e}")
            print(f"Loaded {len(pages)} pages from {d}")
            return pages
    raise SystemExit("No scraped pages found under scraper/output_full or scraper/output")


def path_of(url: str) -> str:
    p = urlparse(url or "").path.strip("/")
    return unquote(p)


def slug_from_product_path(path: str) -> str:
    # product/beam-saw-bs-2700 → beam-saw-bs-2700
    if path.startswith("product/"):
        return path[len("product/") :].strip("/")
    return path.strip("/").replace("/", "-")


def clean_title(title: str) -> str:
    t = (title or "").strip()
    for suf in (
        " - sanjaywoodtech.com",
        " – sanjaywoodtech.com",
        " | sanjaywoodtech.com",
        " - Sanjay Woodtech",
    ):
        if t.lower().endswith(suf.lower()):
            t = t[: -len(suf)].strip()
    return t


def is_spam(page: dict, path: str) -> bool:
    title = page.get("title") or ""
    meta = page.get("meta_description") or ""
    blob_parts = [title, meta, path]
    for b in (page.get("content_blocks") or [])[:40]:
        if isinstance(b, dict) and b.get("text"):
            blob_parts.append(b["text"])
    blob = "\n".join(blob_parts)
    if SPAM_RE.search(blob) or SPAM_SLUG_RE.search(path):
        return True
    # French-only casino-ish pages without woodworking terms
    if re.search(r"\b(les|quelles|pour)\b", title, re.I) and not re.search(
        r"wood|cnc|saw|machine|planer|sander|panel|veneer", blob, re.I
    ):
        return True
    return False


def is_skip_path(path: str) -> bool:
    if not path:
        return False
    if SKIP_PATH_RE.search(path):
        return True
    if "/page/" in path:
        return True
    return False


def dedupe_keep_order(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for x in items:
        k = x.strip().lower()
        if not k or k in seen:
            continue
        seen.add(k)
        out.append(x.strip())
    return out


def is_boilerplate(text: str) -> bool:
    t = text.strip().lower()
    if t in BOILERPLATE:
        return True
    if len(t) < 3:
        return True
    # nav mega-menu dumps
    if t.count("  ") > 4 or len(t) > 400 and "panel processing" in t and "solid wood" in t:
        return True
    return False


def extract_product(page: dict, path: str) -> dict | None:
    title = clean_title(page.get("title") or "")
    if not title or title.lower() in ("page not found", "not found"):
        return None

    blocks = page.get("content_blocks") or []
    paragraphs: list[str] = []
    features: list[str] = []
    headings: list[str] = []
    in_features = False

    for b in blocks:
        if not isinstance(b, dict):
            continue
        typ = b.get("type")
        text = (b.get("text") or "").strip()
        if not text or is_boilerplate(text):
            if text.lower() == "key features":
                in_features = True
            continue

        if typ == "heading":
            headings.append(text)
            in_features = text.lower() in ("key features", "features", "features:-", "features:")
            continue

        if typ == "list_item":
            # skip mega-menu list dumps
            if len(text) > 180 or text.count(" ") > 28:
                continue
            if is_boilerplate(text):
                continue
            features.append(text)
            continue

        if typ == "paragraph":
            low = text.lower()
            if low in ("key features", "features"):
                in_features = True
                continue
            if in_features and len(text) < 160 and not text.endswith("."):
                features.append(text)
                continue
            in_features = False
            if len(text) >= 40:
                paragraphs.append(text)

    paragraphs = dedupe_keep_order(paragraphs)
    features = dedupe_keep_order(features)[:24]

    # description: meta, else first long paragraph
    meta = (page.get("meta_description") or "").strip()
    description = meta if len(meta) >= 40 else (paragraphs[0] if paragraphs else "")

    # images — prefer product media, skip logos/favicons
    images: list[dict] = []
    seen_src: set[str] = set()
    for im in page.get("images") or []:
        if not isinstance(im, dict):
            continue
        src = (im.get("src") or "").strip()
        if not src or src in seen_src:
            continue
        low = src.lower()
        if any(
            x in low
            for x in (
                "logo",
                "favicon",
                "cropped-untitled",
                "placeholder",
                "woocommerce-placeholder",
                "gravatar",
            )
        ):
            continue
        seen_src.add(src)
        images.append(
            {
                "src": src,
                "alt": (im.get("alt") or title).strip(),
            }
        )

    slug = slug_from_product_path(path)

    # infer model from title
    model = None
    m = re.search(
        r"(?:model\s+)?([A-Z]{1,6}[- ]?\d{2,}[A-Z0-9-]*)",
        title,
        re.I,
    )
    if m:
        model = m.group(1).upper().replace(" ", "-")

    return {
        "slug": slug,
        "name": title,
        "model": model,
        "description": description,
        "summary": paragraphs[0] if paragraphs else description,
        "body": paragraphs[:8],
        "features": features,
        "images": images[:12],
        "image": images[0]["src"] if images else None,
        "source_url": page.get("url") or f"{SITE_PREFIX}/{path}",
        "category_slugs": [],  # filled later
        "category_path": None,
    }


def extract_category_tree(pages: list[dict]) -> tuple[list[dict], dict[str, list[str]]]:
    """Return subcategories + product_slug → category path mapping from links."""
    product_cats: dict[str, set[str]] = defaultdict(set)
    subcats: dict[str, dict] = {}

    for page in pages:
        path = path_of(page.get("url") or "")
        if not path.startswith("product-category/"):
            continue
        if is_skip_path(path) or is_spam(page, path):
            continue

        # product membership via links
        for link in page.get("links") or []:
            if not isinstance(link, dict):
                continue
            href = link.get("href") or ""
            lp = path_of(href)
            if lp.startswith("product/"):
                pslug = slug_from_product_path(lp)
                product_cats[pslug].add(path)

        # subcategory record (skip pure pagination)
        parts = path.split("/")
        if len(parts) < 2:
            continue
        # top: product-category/<top>
        # sub: product-category/<top>/<sub>
        name = clean_title(page.get("title") or parts[-1].replace("-", " ").title())
        # strip "Product categories" noise
        if name.lower() in ("product categories",):
            name = parts[-1].replace("-", " ").title()

        parent = None
        top = parts[1] if len(parts) > 1 else None
        if len(parts) >= 3:
            parent = "/".join(parts[:2])  # product-category/panel-processing-machinery
        slug = path.replace("product-category/", "").replace("/", "--")

        subcats[path] = {
            "path": path,
            "slug": slug,
            "name": name,
            "parent_path": parent,
            "top_slug": top,
            "description": (page.get("meta_description") or "").strip(),
            "product_count": 0,
        }

    # counts
    for pslug, cats in product_cats.items():
        for c in cats:
            if c in subcats:
                subcats[c]["product_count"] += 1

    mapping = {k: sorted(v) for k, v in product_cats.items()}
    return list(subcats.values()), mapping


def extract_static_page(page: dict, path: str, key: str) -> dict:
    blocks = page.get("content_blocks") or []
    sections: list[dict] = []
    current: dict | None = None
    paragraphs: list[str] = []
    list_items: list[str] = []

    def flush():
        nonlocal current, paragraphs, list_items
        if current:
            current["paragraphs"] = dedupe_keep_order(paragraphs)
            current["items"] = dedupe_keep_order(list_items)
            if current["paragraphs"] or current["items"] or current.get("heading"):
                sections.append(current)
        current = None
        paragraphs = []
        list_items = []

    for b in blocks:
        if not isinstance(b, dict):
            continue
        typ = b.get("type")
        text = (b.get("text") or "").strip()
        if not text or is_boilerplate(text):
            continue
        # skip French "Actualités" etc.
        if SPAM_RE.search(text):
            continue
        if typ == "heading":
            flush()
            current = {"heading": text, "paragraphs": [], "items": []}
        elif typ == "paragraph":
            if current is None:
                current = {"heading": None, "paragraphs": [], "items": []}
            if len(text) >= 20:
                paragraphs.append(text)
        elif typ == "list_item":
            if current is None:
                current = {"heading": None, "paragraphs": [], "items": []}
            if len(text) < 200 and text.count(" ") < 30:
                list_items.append(text)
    flush()

    # collapse duplicates (site often doubles sections)
    uniq: list[dict] = []
    seen: set[str] = set()
    for s in sections:
        sig = f"{s.get('heading')}|{(s.get('paragraphs') or [''])[0][:80]}"
        if sig in seen:
            continue
        seen.add(sig)
        uniq.append(s)

    images = []
    for im in page.get("images") or []:
        if not isinstance(im, dict):
            continue
        src = im.get("src") or ""
        if not src or any(x in src.lower() for x in ("logo", "favicon", "cropped-untitled")):
            continue
        images.append({"src": src, "alt": im.get("alt") or ""})

    return {
        "key": key,
        "path": path,
        "title": clean_title(page.get("title") or key.replace("-", " ").title()),
        "meta_description": (page.get("meta_description") or "").strip(),
        "sections": uniq,
        "images": images[:40],
        "source_url": page.get("url"),
    }


def top_category_for_path(cat_path: str) -> str | None:
    for tc in TOP_CATEGORIES:
        if cat_path == tc["path_prefix"] or cat_path.startswith(tc["path_prefix"] + "/"):
            return tc["slug"]
        # veneer uses veneer-machinery and veneer-line-machinery
        if tc["slug"] == "veneer-line-machinery" and "veneer" in cat_path:
            return tc["slug"]
    return None


def build_company(about: dict | None, contact: dict | None, services: dict | None) -> dict:
    company = {
        "name": "Sanjay Wood Tech",
        "tagline": "Precision-engineered woodworking machinery that helps your business produce more with greater efficiency.",
        "founded": "2001",
        "hq": "Jodhpur, Rajasthan, India",
        "address": "G-588, Epip, Boranada-salawas Road, Boranada Industrial Area, Jodhpur (Raj.) 342012 India",
        "phones": [
            "+91 63775 19088",
            "+91 93140 22777",
            "+91 98292 12261",
            "+91 91665 88844",
            "+91 80942 77779",
        ],
        "emails": ["enquiry@sanjaywoodtech.com", "service@sanjaywoodtech.com"],
        "social": {
            "instagram": "https://www.instagram.com/sanjaywoodtech",
            "facebook": "https://www.facebook.com/share/1aRagNs3Rm/",
        },
        "stats": [
            {"value": "28+", "label": "Years of experience"},
            {"value": "2000+", "label": "Factories equipped"},
            {"value": "4", "label": "Cities with technical teams"},
            {"value": "Pan-India", "label": "Service coverage"},
        ],
        "mission": "",
        "story": "",
        "team": [],
        "services": [],
        "why_us": [],
        "faqs": [],
        "testimonials": [],
    }

    if about:
        for s in about.get("sections") or []:
            h = (s.get("heading") or "").lower()
            paras = s.get("paragraphs") or []
            if "mission" in h or (paras and "without middlemen" in paras[0].lower()):
                company["mission"] = paras[0] if paras else company["mission"]
            if "built on expertise" in h or "founded in jodhpur" in " ".join(paras).lower():
                company["story"] = paras[0] if paras else company["story"]
            if not company["story"] and paras and "founded in jodhpur" in paras[0].lower():
                company["story"] = paras[0]
            if "mission" in " ".join(paras).lower() and not company["mission"]:
                for p in paras:
                    if "world-class" in p.lower() or "middlemen" in p.lower():
                        company["mission"] = p

        # team: look for name/role patterns in about paragraphs
        flat = []
        for s in about.get("sections") or []:
            flat.extend(s.get("paragraphs") or [])
        # Known team from scrape
        team_pairs = [
            (
                "Sanjay Bagriya",
                "Founder & Director",
                "B.Tech. in Mechanical Engineering with 28+ years of expertise in woodworking, panel, metal and stone working machinery. Directly trading with manufacturers in China, Taiwan and Europe.",
            ),
            (
                "Rajendra Jangir",
                "Technical Head",
                "B.Sc. with diplomas in Carpentry, Finishing and CNC Working. 30+ years of experience across leading woodworking firms in India and internationally. Expert in machinery technicals, project planning and CAD-CAM software.",
            ),
        ]
        company["team"] = [
            {"name": n, "role": r, "bio": b} for n, r, b in team_pairs
        ]
        if not company["story"]:
            company["story"] = (
                "Founded in Jodhpur in 2001, Sanjay Woodtech started with a single goal — "
                "to bridge the gap between global machinery manufacturers and Indian production units. "
                "Today we operate across four cities with a dedicated technical team serving factories pan India."
            )
        if not company["mission"]:
            company["mission"] = (
                "To give every Indian factory direct access to world-class industrial machinery — "
                "without middlemen, with expert installation and lifetime after-sales support."
            )

    if services:
        seen_titles: set[str] = set()
        for s in services.get("sections") or []:
            h = s.get("heading")
            paras = s.get("paragraphs") or []
            if not h or h.lower() in ("our services", "what we offer", "why choose us?"):
                continue
            # Skip marketing sidebar repeats
            if h.lower() in (
                "expert installation",
                "operator training",
                "pan india service",
            ):
                continue
            key = h.strip().lower()
            if key in seen_titles:
                continue
            seen_titles.add(key)
            company["services"].append(
                {
                    "title": h,
                    "description": paras[0] if paras else "",
                }
            )

    # Why us + FAQs + testimonials from home-like static later
    return company


def extract_home_extras(home: dict | None) -> dict:
    why: list[dict] = []
    faqs: list[dict] = []
    testimonials: list[str] = []
    industries: list[dict] = []

    if not home:
        return {
            "why_us": why,
            "faqs": faqs,
            "testimonials": testimonials,
            "industries": industries,
        }

    sections = []
    # reuse static extractor logic
    sp = extract_static_page(home, "", "home")
    sections = sp["sections"]

    industry_names = {
        "furniture manufacturers",
        "modular kitchen",
        "modular kitchen & wardrobe units",
        "door & window",
        "door & window manufacturers",
        "plywood & panel",
        "plywood & panel board industry",
        "metal fabrication",
        "metal fabrication units",
        "stone & marble",
        "stone & marble processing",
    }

    why_titles = {
        "expert installation",
        "operator training",
        "pan india service",
        "meeting machinery standards pricing",
    }

    for s in sections:
        h = (s.get("heading") or "").strip()
        hl = h.lower()
        paras = s.get("paragraphs") or []
        if hl in why_titles or hl in ("expert installation", "operator training", "pan india service"):
            why.append({"title": h if h != "Meeting machinery standards Pricing" else "Direct Import Pricing", "description": paras[0] if paras else ""})
        if hl in industry_names:
            industries.append(
                {
                    "name": h,
                    "description": paras[0] if paras else "",
                    "slug": re.sub(r"[^a-z0-9]+", "-", hl).strip("-"),
                }
            )
        for p in paras:
            # testimonials are long quotes
            if len(p) > 120 and any(
                w in p.lower()
                for w in ("sanjay wood", "supplier", "machines", "pricing", "quality")
            ) and p[0].isupper() and "we " in p.lower()[:40] or "choosing" in p.lower() or "compared" in p.lower() or "stood out" in p.lower() or "transformed" in p.lower():
                if p not in testimonials and len(testimonials) < 8:
                    testimonials.append(p)

    # FAQ answers live as free paragraphs after the FAQ heading (questions are client-side JS on source site)
    faq_answers: list[str] = []
    capture = False
    for s in sections:
        h = (s.get("heading") or "").lower()
        if "frequently asked" in h or "faq" in h:
            capture = True
        if capture:
            for p in s.get("paragraphs") or []:
                if len(p) > 50 and not is_boilerplate(p):
                    faq_answers.append(p)
            # also scan list items
            for p in s.get("items") or []:
                if len(p) > 50:
                    faq_answers.append(p)

    # Fallback: walk raw content blocks after FAQ heading
    if len(faq_answers) < 3 and home:
        saw = False
        for b in home.get("content_blocks") or []:
            if not isinstance(b, dict):
                continue
            text = (b.get("text") or "").strip()
            if not text:
                continue
            if "frequently asked" in text.lower() or text.lower() in ("faq's", "faqs"):
                saw = True
                continue
            if saw and b.get("type") == "paragraph" and len(text) > 50:
                if "get in touch" in text.lower() or "request a quote" in text.lower():
                    break
                faq_answers.append(text)

    faq_questions = [
        "Do you install and commission machines at our factory?",
        "Are machines available from stock?",
        "Is operator training included?",
        "Can you help with factory layout planning?",
        "Which industries do you serve?",
        "Can we see a machine demonstration?",
        "What payment terms do you offer?",
        "How do you recommend the right machine?",
        "Can we get a custom quotation for a full line?",
    ]
    faq_answers = dedupe_keep_order(faq_answers)
    for i, ans in enumerate(faq_answers[:9]):
        faqs.append(
            {
                "question": faq_questions[i] if i < len(faq_questions) else f"Question {i + 1}",
                "answer": ans,
            }
        )

    # defaults if empty
    if not why:
        why = [
            {"title": "Direct Import Pricing", "description": "No middlemen. Machines sourced directly from China, Taiwan and Europe."},
            {"title": "Expert Installation", "description": "Our technical team installs and commissions every machine."},
            {"title": "Operator Training", "description": "Hands-on training included with every machine we supply."},
            {"title": "Pan India Service", "description": "Spare parts and service support available across India."},
        ]

    if not industries:
        industries = [
            {"name": "Furniture Manufacturers", "slug": "furniture-manufacturers", "description": "Complete solid wood and panel processing lines for furniture factories."},
            {"name": "Modular Kitchen & Wardrobe", "slug": "modular-kitchen", "description": "Panel processing, edge banding and CNC nesting for modular production."},
            {"name": "Door & Window", "slug": "door-window", "description": "Cutting, shaping and fabrication lines for doors and windows."},
            {"name": "Plywood & Panel", "slug": "plywood-panel", "description": "Veneer lines, hot presses and panel processing for board plants."},
            {"name": "Metal Fabrication", "slug": "metal-fabrication", "description": "Industrial cutting and shaping for metal furniture and profiles."},
            {"name": "Stone & Marble", "slug": "stone-marble", "description": "Precision cutting for granite, marble and engineered stone."},
        ]

    return {
        "why_us": why[:6],
        "faqs": faqs,
        "testimonials": dedupe_keep_order(testimonials)[:6],
        "industries": industries,
    }


def extract_industry_pages(pages: list[dict]) -> list[dict]:
    keys = {
        "furniture-manufacturers": "Furniture Manufacturers",
        "modular-kitchen": "Modular Kitchen",
        "door-window": "Door & Window",
        "plywood-panel": "Plywood & Panel",
        "metal-fabrication": "Metal Fabrication",
        "stone-marble": "Stone & Marble",
        "seasoning-chamber": "Seasoning Chamber",
        "cart-conveyor-finishing-line": "Cart Conveyor Finishing Line",
    }
    out = []
    by_path = {path_of(p.get("url") or ""): p for p in pages}
    for path, name in keys.items():
        page = by_path.get(path)
        if not page or is_spam(page, path):
            out.append(
                {
                    "slug": path,
                    "name": name,
                    "description": "",
                    "sections": [],
                    "images": [],
                }
            )
            continue
        sp = extract_static_page(page, path, path)
        desc = sp.get("meta_description") or ""
        if not desc:
            for s in sp["sections"]:
                if s.get("paragraphs"):
                    desc = s["paragraphs"][0]
                    break
        out.append(
            {
                "slug": path,
                "name": sp["title"] or name,
                "description": desc,
                "sections": sp["sections"],
                "images": sp["images"][:12],
            }
        )
    return out


def main():
    pages = load_pages()
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    filtered_spam = 0
    filtered_skip = 0
    products: list[dict] = []
    by_path: dict[str, dict] = {}

    for page in pages:
        url = page.get("url") or ""
        path = path_of(url)
        status = page.get("status") or 200
        title = clean_title(page.get("title") or "")

        if status == 404 or title.lower() in ("page not found", "not found"):
            filtered_skip += 1
            continue
        if is_spam(page, path):
            filtered_spam += 1
            continue
        if is_skip_path(path):
            filtered_skip += 1
            continue

        by_path[path or "home"] = page

        if path.startswith("product/") and not path.startswith("product-category"):
            prod = extract_product(page, path)
            if prod:
                products.append(prod)

    subcats, product_cat_map = extract_category_tree(
        [p for p in pages if not is_spam(p, path_of(p.get("url") or ""))]
    )

    # attach categories to products
    for prod in products:
        paths = product_cat_map.get(prod["slug"], [])
        prod["category_paths"] = paths
        tops = []
        for cp in paths:
            t = top_category_for_path(cp)
            if t and t not in tops:
                tops.append(t)
        # fallback: guess from slug keywords
        if not tops:
            s = prod["slug"] + " " + prod["name"].lower()
            if any(k in s for k in ("beam-saw", "panel-saw", "edge-band", "nesting", "boring", "hot-press", "cold-press", "cnc-router", "spray", "laser", "door-lock")):
                tops = ["panel-processing-machinery"]
            elif "taiwan" in s or "sip-" in s:
                tops = ["solid-woodworking-machinery-taiwan"]
            elif any(k in s for k in ("veneer", "guillotine", "splicer")):
                tops = ["veneer-line-machinery"]
            else:
                tops = ["solid-wood-machinery"]
        prod["category_slugs"] = tops
        prod["primary_category"] = tops[0] if tops else None
        # leaf category name
        if paths:
            leaf = paths[0].split("/")[-1].replace("-", " ").title()
            prod["category"] = leaf
        else:
            tc = next((c for c in TOP_CATEGORIES if c["slug"] == prod["primary_category"]), None)
            prod["category"] = tc["name"] if tc else "Machinery"

    home = by_path.get("home") or by_path.get("")

    # Tag new launches from home page product headings (section after "NEW LAUNCHES")
    new_launch_slugs: set[str] = set()
    if home:
        in_new = False
        for b in home.get("content_blocks") or []:
            if not isinstance(b, dict):
                continue
            text = clean_title(b.get("text") or "")
            if not text:
                continue
            if b.get("type") == "heading" and "new launch" in text.lower():
                in_new = True
                continue
            if in_new and b.get("type") == "heading":
                if text.lower() in ("why choose us?", "our projects", "our services"):
                    in_new = False
                    continue
                for prod in products:
                    if (
                        text.lower() == prod["name"].lower()
                        or text.lower() in prod["name"].lower()
                        or prod["name"].lower().startswith(text.lower()[:20])
                    ):
                        new_launch_slugs.add(prod["slug"])

    for prod in products:
        if prod["slug"] in new_launch_slugs:
            if "new-launches" not in prod["category_slugs"]:
                prod["category_slugs"].append("new-launches")
            prod["is_new"] = True
        else:
            prod["is_new"] = False

    # sort products by name
    products.sort(key=lambda p: p["name"].lower())

    # top categories with counts
    top_cats = []
    for tc in TOP_CATEGORIES:
        count = sum(1 for p in products if tc["slug"] in p.get("category_slugs", []))
        children = [
            {
                "slug": sc["slug"],
                "name": sc["name"],
                "path": sc["path"],
                "count": sc["product_count"],
            }
            for sc in sorted(subcats, key=lambda x: x["name"])
            if sc.get("top_slug") == tc["slug"]
            or (tc["slug"] == "veneer-line-machinery" and sc.get("top_slug") in ("veneer-machinery", "veneer-line-machinery"))
        ]
        # only direct children (one level under top)
        direct = []
        for ch in children:
            parts = ch["path"].split("/")
            if len(parts) == 3:  # product-category / top / sub
                direct.append(ch)
            elif tc["slug"] == "veneer-line-machinery" and len(parts) == 3:
                direct.append(ch)
        top_cats.append({**tc, "count": count, "subcategories": direct})

    about = extract_static_page(by_path["about-us"], "about-us", "about") if "about-us" in by_path else None
    contact = extract_static_page(by_path["contact-us"], "contact-us", "contact") if "contact-us" in by_path else None
    services = extract_static_page(by_path["our-services"], "our-services", "services") if "our-services" in by_path else None

    company = build_company(about, contact, services)
    extras = extract_home_extras(home)
    company["why_us"] = extras["why_us"]
    company["faqs"] = extras["faqs"]
    company["testimonials"] = extras["testimonials"]

    industries = extract_industry_pages(pages)
    # merge home industry blurbs
    by_ind = {i["slug"]: i for i in industries}
    for hi in extras["industries"]:
        slug = hi["slug"]
        # normalize
        for k, v in list(by_ind.items()):
            if slug in k or k in slug or hi["name"].lower() in v["name"].lower():
                if hi.get("description") and not v.get("description"):
                    v["description"] = hi["description"]
                break

    gallery_page = by_path.get("gallery")
    gallery_images = []
    if gallery_page:
        gp = extract_static_page(gallery_page, "gallery", "gallery")
        gallery_images = gp["images"]

    # also collect unique project-ish images from trade-fair
    trade = by_path.get("trade-fair")
    trade_images = []
    if trade:
        trade_images = extract_static_page(trade, "trade-fair", "trade-fair")["images"]

    site = {
        "source": SITE_PREFIX,
        "generated_from": "scraper/output_full",
        "stats": {
            "products": len(products),
            "categories": len(top_cats),
            "subcategories": len(subcats),
            "filtered_spam": filtered_spam,
            "filtered_skip": filtered_skip,
        },
        "company": company,
        "categories": top_cats,
        "subcategories": subcats,
        "products": products,
        "industries": industries,
        "gallery": gallery_images,
        "trade_fair": trade_images,
        "pages": {
            "about": about,
            "contact": contact,
            "services": services,
        },
    }

    # Write combined + split files for easier imports
    (OUT_DIR / "site.json").write_text(
        json.dumps(site, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (OUT_DIR / "products.json").write_text(
        json.dumps(products, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (OUT_DIR / "categories.json").write_text(
        json.dumps(top_cats, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (OUT_DIR / "company.json").write_text(
        json.dumps(company, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (OUT_DIR / "industries.json").write_text(
        json.dumps(industries, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (OUT_DIR / "gallery.json").write_text(
        json.dumps(
            {"gallery": gallery_images, "trade_fair": trade_images},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(
        f"Wrote website/data — products={len(products)} "
        f"categories={len(top_cats)} spam_dropped={filtered_spam} skip={filtered_skip}"
    )


if __name__ == "__main__":
    main()
