#!/usr/bin/env python3
"""
Oracle NetSuite Help Center scraper.

Fetches SuiteScript 2.x N/ module API reference pages and converts them to
clean markdown files in knowledge/bootstrap/. These files are then ingested
by ingest_bootstrap.py to rebuild the FAISS vectorstore.

Usage:
    python scripts/scrape_netsuite_docs.py                  # scrape all modules
    python scripts/scrape_netsuite_docs.py --module record  # scrape one module
    python scripts/scrape_netsuite_docs.py --dry-run        # list targets, don't fetch

Output:
    knowledge/bootstrap/oracle-module-{name}.md   — N/ module API reference
    knowledge/bootstrap/oracle-script-types.md    — script types (scheduled, MR, etc.)
    knowledge/bootstrap/oracle-suitescript-2x.md  — SuiteScript 2.x guide

After running: python scripts/ingest_bootstrap.py  to rebuild FAISS index.
"""

import argparse
import logging
import os
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

# ──────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────

BASE_URL    = "https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help"
OUTPUT_DIR  = Path(__file__).parent.parent / "knowledge" / "bootstrap"
RATE_LIMIT  = 1.2   # seconds between requests (polite crawler)
MAX_RETRIES = 3

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
log = logging.getLogger(__name__)

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "Mozilla/5.0 (compatible; ArthaBuild-Docs-Scraper/1.0; research)",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
})


# ──────────────────────────────────────────────────────────────
# Target pages — all 50 N/ modules + key SuiteScript chapters
# ──────────────────────────────────────────────────────────────

MODULES = [
    ("action",                   "section_1510761537.html"),
    ("auth",                     "section_4296360422.html"),
    ("cache",                    "section_4642573343.html"),
    ("certificate-control",      "section_1547247950.html"),
    ("compress",                 "section_158584507367.html"),
    ("config",                   "section_4261803800.html"),
    ("crypto",                   "section_4358549582.html"),
    ("crypto-certificate",       "section_1543432423.html"),
    ("crypto-random",            "section_13113107585.html"),
    ("currency",                 "section_4358551775.html"),
    ("current-record",           "section_4625600928.html"),
    ("dataset",                  "article_158946741680.html"),
    ("document-capture",         "article_8134325498.html"),
    ("email",                    "section_4358552361.html"),
    ("encode",                   "section_4369847722.html"),
    ("error",                    "section_4243798608.html"),
    ("file",                     "section_4205693274.html"),
    ("format",                   "section_4388721627.html"),
    ("format-i18n",              "section_1543861741.html"),
    ("http",                     "section_4296361104.html"),
    ("https",                    "section_4418229131.html"),
    ("https-client-certificate", "section_1543986321.html"),
    ("key-control",              "section_1557413213.html"),
    ("llm",                      "article_9123730083.html"),
    ("log",                      "section_4574548135.html"),
    ("machine-translation",      "article_3151132758.html"),
    ("pgp",                      "article_5095832176.html"),
    ("piremoval",                "section_156173791240.html"),
    ("plugin",                   "section_4558176297.html"),
    ("portlet",                  "section_4473510730.html"),
    ("query",                    "section_1510275060.html"),
    ("record",                   "section_4267255811.html"),
    ("record-context",           "section_158627324548.html"),
    ("redirect",                 "section_4424286105.html"),
    ("render",                   "section_4412042824.html"),
    ("runtime",                  "section_4296359529.html"),
    ("search",                   "section_4345764122.html"),
    ("sftp",                     "section_4617004932.html"),
    ("suite-app-info",           "article_160236086332.html"),
    ("task",                     "section_4345787858.html"),
    ("task-accounting",          "section_1554472720.html"),
    ("transaction",              "section_4413162576.html"),
    ("translation",              "section_1538666156.html"),
    ("ui-dialog",                "section_4497725142.html"),
    ("ui-message",               "section_4497735093.html"),
    ("ui-server-widget",         "section_4321345532.html"),
    ("url",                      "section_4358552918.html"),
    ("util",                     "section_4569538303.html"),
    ("workbook",                 "article_159006350818.html"),
    ("workflow",                 "section_4341725558.html"),
    ("xml",                      "section_4344917662.html"),
]

EXTRA_PAGES = [
    # (output_filename_suffix, page_id, description)
    ("script-types",     "chapter_4387172495.html", "SuiteScript 2.x Script Types"),
    ("global-objects",   "chapter_4387171685.html", "SuiteScript 2.x Global Objects"),
    ("suitescript-2x",   "article_8161516336.html",  "SuiteScript 2.x Overview"),
    ("suitescript-2-1",  "chapter_156042690639.html", "SuiteScript 2.1 Guide"),
    ("error-reference",  "section_4243798608.html",  "SuiteScript Error Reference"),
    ("api-governance",   "section_1510275060.html",  "N/query (SuiteQL) Governance"),
    ("records-guide",    "chapter_4675582755.html",  "SuiteScript 2.x Scripting Records"),
    ("entry-point",      "chapter_4525001447.html",  "Script Deployment & Entry Points"),
]


# ──────────────────────────────────────────────────────────────
# Fetch + parse
# ──────────────────────────────────────────────────────────────

def fetch_page(page_id: str) -> BeautifulSoup | None:
    url = f"{BASE_URL}/{page_id}"
    for attempt in range(MAX_RETRIES):
        try:
            resp = SESSION.get(url, timeout=20)
            if resp.status_code == 200:
                return BeautifulSoup(resp.text, "html.parser")
            if resp.status_code == 404:
                log.warning(f"  404 — skipping {page_id}")
                return None
            log.warning(f"  HTTP {resp.status_code} on {page_id} (attempt {attempt+1})")
        except requests.RequestException as e:
            log.warning(f"  Request error {page_id}: {e} (attempt {attempt+1})")
        time.sleep(2 ** attempt)
    log.error(f"  Permanently failed: {page_id}")
    return None


def extract_main_content(soup: BeautifulSoup, page_id: str) -> str:
    """
    Extract the main article content from a NetSuite docs page.
    Strips nav, breadcrumbs, footer, prev/next links.
    Returns clean text with headings and code blocks preserved.
    """
    # Try the main article body — Oracle uses several class names
    main = (
        soup.find("div", class_="topic") or
        soup.find("div", class_="body") or
        soup.find("article") or
        soup.find("main") or
        soup.find("div", id="content") or
        soup.find("div", class_="content")
    )

    if not main:
        # Fall back to body, stripping nav elements
        main = soup.find("body")
        if not main:
            return ""
        # Remove nav/header/footer
        for tag in main.find_all(["nav", "header", "footer", "script", "style"]):
            tag.decompose()
        for tag in main.find_all(class_=["nav", "navigation", "breadcrumb",
                                          "prevnext", "related-links", "footer"]):
            tag.decompose()
    else:
        # Remove inline navigation within the content area
        for tag in main.find_all(class_=["related-links", "prevnext", "breadcrumb"]):
            tag.decompose()

    return html_to_markdown(main, page_id)


def html_to_markdown(element, page_id: str) -> str:
    """Convert a BeautifulSoup element to clean markdown."""
    import html2text
    h = html2text.HTML2Text()
    h.ignore_links = False          # keep inline links for context
    h.ignore_images = True          # skip image tags
    h.body_width = 0                # no line wrapping
    h.mark_code = True              # wrap code blocks
    h.ignore_emphasis = False
    h.single_line_break = False
    h.ul_item_mark = "-"

    raw = h.handle(str(element))

    # Clean up excess blank lines
    lines = raw.splitlines()
    cleaned = []
    blank_count = 0
    for line in lines:
        if line.strip() == "":
            blank_count += 1
            if blank_count <= 2:
                cleaned.append("")
        else:
            blank_count = 0
            cleaned.append(line)

    result = "\n".join(cleaned).strip()

    # Clean up encoding artifacts (non-breaking spaces rendered as Â\xa0)
    result = result.replace("Â\xa0", " ").replace("Â ", " ").replace("\xa0", " ")
    # Collapse lines that became pure whitespace after cleanup
    result = "\n".join("" if l.strip() == "" else l for l in result.splitlines())
    # Remove excessive blank lines again after cleanup
    lines2 = result.splitlines()
    cleaned2 = []
    blank2 = 0
    for line in lines2:
        if line == "":
            blank2 += 1
            if blank2 <= 2:
                cleaned2.append("")
        else:
            blank2 = 0
            cleaned2.append(line)

    return "\n".join(cleaned2).strip()


def word_count(text: str) -> int:
    return len(text.split())


# ──────────────────────────────────────────────────────────────
# Markdown file builder
# ──────────────────────────────────────────────────────────────

def build_module_file(name: str, page_id: str) -> str | None:
    """Fetch one N/ module page and return its markdown content."""
    log.info(f"  Fetching N/{name} ({page_id})...")
    soup = fetch_page(page_id)
    if not soup:
        return None

    title = soup.find("title")
    page_title = title.get_text(strip=True) if title else f"N/{name}"
    content = extract_main_content(soup, page_id)

    if not content.strip():
        log.warning(f"  Empty content for {page_id} — skipping")
        return None

    wc = word_count(content)
    log.info(f"  N/{name}: {wc} words")

    md = f"""# N/{name} — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: {BASE_URL}/{page_id}
> Module: N/{name}
> Version: SuiteScript 2.x / 2.1

{content}
"""
    return md


def build_extra_file(suffix: str, page_id: str, description: str) -> str | None:
    """Fetch a non-module reference page and return its markdown content."""
    log.info(f"  Fetching {description} ({page_id})...")
    soup = fetch_page(page_id)
    if not soup:
        return None

    content = extract_main_content(soup, page_id)
    if not content.strip():
        log.warning(f"  Empty content for {page_id} — skipping")
        return None

    wc = word_count(content)
    log.info(f"  {description}: {wc} words")

    md = f"""# {description}

> Source: Oracle NetSuite Official Documentation
> URL: {BASE_URL}/{page_id}
> Category: SuiteScript 2.x Reference

{content}
"""
    return md


# ──────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Scrape Oracle NetSuite docs into markdown files")
    parser.add_argument("--module", help="Scrape only this module (e.g. 'record', 'search')")
    parser.add_argument("--dry-run", action="store_true", help="List targets without fetching")
    parser.add_argument("--skip-modules", action="store_true", help="Skip N/ module pages, only fetch extra pages")
    parser.add_argument("--skip-extra", action="store_true", help="Skip extra reference pages")
    parser.add_argument("--force", action="store_true", help="Re-fetch even if output file already exists")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    if args.dry_run:
        print(f"\n{'─'*60}")
        print(f"Targets ({len(MODULES)} modules + {len(EXTRA_PAGES)} extra pages):")
        print(f"Output dir: {OUTPUT_DIR}")
        print(f"{'─'*60}")
        if not args.skip_modules:
            for name, page_id in MODULES:
                out = OUTPUT_DIR / f"oracle-module-{name}.md"
                status = "EXISTS" if out.exists() else "new"
                print(f"  [{status}] oracle-module-{name}.md  ← {page_id}")
        if not args.skip_extra:
            for suffix, page_id, desc in EXTRA_PAGES:
                out = OUTPUT_DIR / f"oracle-{suffix}.md"
                status = "EXISTS" if out.exists() else "new"
                print(f"  [{status}] oracle-{suffix}.md  ← {page_id}  ({desc})")
        return

    saved = 0
    skipped = 0
    failed = 0

    # ── N/ modules ──
    if not args.skip_modules:
        targets = MODULES
        if args.module:
            targets = [(n, p) for n, p in MODULES if n == args.module.lower()]
            if not targets:
                log.error(f"Module '{args.module}' not found. Available: {[n for n,_ in MODULES]}")
                sys.exit(1)

        log.info(f"Scraping {len(targets)} N/ modules...")
        for name, page_id in targets:
            out_path = OUTPUT_DIR / f"oracle-module-{name}.md"
            if out_path.exists() and not args.force:
                log.info(f"  Skipping N/{name} (already exists — use --force to re-fetch)")
                skipped += 1
                continue

            md = build_module_file(name, page_id)
            if md:
                out_path.write_text(md, encoding="utf-8")
                saved += 1
                log.info(f"  ✓ Saved {out_path.name}")
            else:
                failed += 1

            time.sleep(RATE_LIMIT)

    # ── Extra reference pages ──
    if not args.skip_extra and not args.module:
        log.info(f"Scraping {len(EXTRA_PAGES)} extra reference pages...")
        for suffix, page_id, description in EXTRA_PAGES:
            out_path = OUTPUT_DIR / f"oracle-{suffix}.md"
            if out_path.exists() and not args.force:
                log.info(f"  Skipping {suffix} (already exists — use --force to re-fetch)")
                skipped += 1
                continue

            md = build_extra_file(suffix, page_id, description)
            if md:
                out_path.write_text(md, encoding="utf-8")
                saved += 1
                log.info(f"  ✓ Saved {out_path.name}")
            else:
                failed += 1

            time.sleep(RATE_LIMIT)

    log.info(f"\n{'─'*60}")
    log.info(f"Done. Saved: {saved}  Skipped: {skipped}  Failed: {failed}")
    log.info(f"Output: {OUTPUT_DIR}")
    if saved > 0:
        log.info("Next step: python scripts/ingest_bootstrap.py  (rebuilds FAISS index)")
    log.info(f"{'─'*60}")


if __name__ == "__main__":
    main()
