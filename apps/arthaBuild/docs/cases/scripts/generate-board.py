#!/usr/bin/env python3
"""
ArthaBuild Case Board Generator
================================
Parses docs/cases/phase-*/CASE-*.md, validates them,
regenerates docs/cases/INDEX.md, and injects JSON into
docs/cases/CASE_BOARD.html.

Run from apps/arthaBuild/:
    python docs/cases/scripts/generate-board.py
    python docs/cases/scripts/generate-board.py --validate
    python docs/cases/scripts/generate-board.py --new --phase 01
"""

import argparse
import json
import re
import sys
from datetime import datetime, date
from pathlib import Path

import yaml

# ---------------------------------------------------------------------------
# Paths (all relative to the apps/arthaBuild working directory)
# ---------------------------------------------------------------------------
CASES_DIR = Path("docs/cases")
SRC_DIR = Path("src")
INDEX_MD = CASES_DIR / "INDEX.md"
BOARD_HTML = CASES_DIR / "CASE_BOARD.html"
BOARD_PLACEHOLDER = "const CASES = __CASES_JSON__;"

# Phase folder name → float sort key
PHASE_SORT_MAP: dict[str, float] = {}

# Valid phase values accepted by --new
VALID_PHASES = ["01", "02", "03", "04", "05", "06", "07", "07.1", "08", "09"]

# Required YAML frontmatter fields
REQUIRED_FIELDS = ["id", "title", "phase", "category", "severity", "status"]

# All known status values (for summary table)
ALL_STATUSES = ["OPEN", "IN_PROGRESS", "FIXED", "VERIFIED", "WONT_FIX", "PASS", "PENDING", "FAIL"]

# Valid category values
VALID_CATEGORIES = [
    "HARDCODED", "DEAD_CODE", "API_CORRECTNESS", "TEST_GAP",
    "ARCH_VIOLATION", "PHASE_CORRECTNESS", "FEATURE_TEST",
]

# Valid status values
VALID_STATUSES = ["OPEN", "IN_PROGRESS", "FIXED", "VERIFIED", "WONT_FIX", "PASS", "PENDING", "FAIL"]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def phase_sort_key(phase_str: str) -> float:
    """Convert a phase string like '07', '07.1', '09' to a float for sorting."""
    try:
        return float(phase_str)
    except ValueError:
        return float("inf")


def case_number(case_id: str) -> int:
    """Extract numeric portion of CASE-NNN for sorting."""
    m = re.search(r"(\d+)", case_id)
    return int(m.group(1)) if m else 0


def find_phase_folder(phase_val: str) -> Path | None:
    """Return the phase subfolder matching the given phase value, or None."""
    # Normalise: strip leading zeros for matching but keep 07.1 intact
    # Folder names: phase-01-foo, phase-07.1-bar
    for folder in CASES_DIR.iterdir():
        if not folder.is_dir():
            continue
        name = folder.name  # e.g. "phase-01-foundation-auth"
        parts = name.split("-", 2)
        if len(parts) < 2 or parts[0] != "phase":
            continue
        folder_phase = parts[1]  # "01", "07.1", etc.
        if folder_phase == phase_val:
            return folder
    return None


def glob_case_files() -> list[Path]:
    """Return all CASE-*.md paths sorted by phase then case number."""
    raw = list(CASES_DIR.glob("phase-*/CASE-*.md"))

    def sort_key(p: Path):
        # p.parent.name = "phase-07.1-frontend-verification"
        parts = p.parent.name.split("-", 2)
        phase_str = parts[1] if len(parts) >= 2 else "99"
        return (phase_sort_key(phase_str), case_number(p.stem))

    return sorted(raw, key=sort_key)


# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------

def parse_case_file(path: Path) -> dict:
    """Parse a CASE-*.md file and return a dict with frontmatter + sections."""
    text = path.read_text(encoding="utf-8")

    # --- Frontmatter extraction ---
    # Format: starts with "---\n", ends with next "---\n"
    if not text.startswith("---"):
        raise ValueError(f"{path}: file must start with YAML frontmatter (---)")

    # Find the closing ---
    # Skip the opening ---\n
    rest = text[3:]
    close_idx = rest.find("\n---")
    if close_idx == -1:
        raise ValueError(f"{path}: YAML frontmatter closing '---' not found")

    yaml_block = rest[:close_idx]
    body = rest[close_idx + 4:]  # skip "\n---"

    try:
        frontmatter = yaml.safe_load(yaml_block) or {}
    except yaml.YAMLError as exc:
        raise ValueError(f"{path}: YAML parse error: {exc}") from exc

    # Normalise list fields
    for list_field in ("blocks", "blocked_by", "files"):
        val = frontmatter.get(list_field)
        if val is None:
            frontmatter[list_field] = []
        elif not isinstance(val, list):
            frontmatter[list_field] = [val]

    # Normalise files entries: ensure each is {"path": ..., "lines": ...}
    normalised_files = []
    for f in frontmatter["files"]:
        if isinstance(f, dict):
            normalised_files.append({
                "path": str(f.get("path", "")),
                "lines": str(f.get("lines", "")),
            })
        else:
            normalised_files.append({"path": str(f), "lines": ""})
    frontmatter["files"] = normalised_files

    # Normalise date fields to ISO string
    for date_field in ("created", "updated"):
        val = frontmatter.get(date_field)
        if isinstance(val, date):
            frontmatter[date_field] = val.isoformat()
        elif val is None:
            frontmatter[date_field] = ""
        else:
            frontmatter[date_field] = str(val)

    # Ensure string fields are strings
    for str_field in ("id", "title", "phase", "phase_name", "category", "severity", "status", "assignee"):
        val = frontmatter.get(str_field)
        if val is None:
            frontmatter[str_field] = ""
        else:
            frontmatter[str_field] = str(val)

    # Optional fields — normalise to string if present, leave absent if not
    for opt_field in ("feature", "test_ref", "agent"):
        val = frontmatter.get(opt_field)
        if val is not None:
            frontmatter[opt_field] = str(val)

    # --- Section parsing ---
    # Split body on "\n## " to extract H2 sections
    sections: dict[str, str] = {}
    # Prepend a sentinel newline so the first "## " is caught by the split
    body_to_split = "\n" + body.lstrip("\n")
    raw_sections = re.split(r"\n## ", body_to_split)
    for chunk in raw_sections[1:]:  # first chunk is pre-first-heading content
        newline_idx = chunk.find("\n")
        if newline_idx == -1:
            heading = chunk.strip()
            content = ""
        else:
            heading = chunk[:newline_idx].strip()
            content = chunk[newline_idx + 1:].rstrip()
        sections[heading] = content

    return {
        "frontmatter": frontmatter,
        "sections": sections,
        "_path": str(path),
    }


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def validate_cases(cases: list[dict]) -> tuple[list[str], list[str]]:
    """
    Validate all parsed cases.
    Returns (errors, warnings).
    Errors are fatal; warnings are informational.
    """
    errors: list[str] = []
    warnings: list[str] = []

    seen_ids: dict[str, str] = {}
    all_ids: set[str] = {c["frontmatter"]["id"] for c in cases}

    for case in cases:
        fm = case["frontmatter"]
        path = case["_path"]
        case_id = fm.get("id", "")

        # Duplicate IDs
        if case_id:
            if case_id in seen_ids:
                errors.append(
                    f"ERROR: Duplicate case ID '{case_id}' in {path} "
                    f"(first seen in {seen_ids[case_id]})"
                )
            else:
                seen_ids[case_id] = path

        # Missing required fields
        for field in REQUIRED_FIELDS:
            if not fm.get(field):
                errors.append(
                    f"ERROR: Case {path} is missing required field '{field}'"
                )

        # Broken dependency links
        for ref in fm.get("blocks", []):
            if ref and ref not in all_ids:
                warnings.append(
                    f"WARNING: {case_id} blocks '{ref}' which does not exist"
                )
        for ref in fm.get("blocked_by", []):
            if ref and ref not in all_ids:
                warnings.append(
                    f"WARNING: {case_id} blocked_by '{ref}' which does not exist"
                )

        # Missing file paths
        for file_entry in fm.get("files", []):
            fpath = file_entry.get("path", "")
            if fpath:
                full = Path(fpath)
                if not full.exists():
                    warnings.append(
                        f"WARNING: {case_id} references '{fpath}' which does not exist under src/"
                    )

    return errors, warnings


# ---------------------------------------------------------------------------
# INDEX.md generation
# ---------------------------------------------------------------------------

def group_by_phase(cases: list[dict]) -> dict[str, list[dict]]:
    """Return OrderedDict-like sorted by phase float."""
    phase_order: list[str] = []
    phase_map: dict[str, list[dict]] = {}
    seen: set[str] = set()

    for case in cases:
        ph = case["frontmatter"]["phase"]
        if ph not in seen:
            seen.add(ph)
            phase_order.append(ph)
        phase_map.setdefault(ph, []).append(case)

    # Sort phases
    phase_order_sorted = sorted(phase_order, key=phase_sort_key)
    return {ph: phase_map[ph] for ph in phase_order_sorted}


def case_relative_path(case_path_str: str) -> str:
    """Return a relative path from docs/cases/ for use in INDEX.md links."""
    p = Path(case_path_str)
    try:
        return str(p.relative_to(CASES_DIR))
    except ValueError:
        return case_path_str


def format_list_field(lst: list) -> str:
    """Format a list for a markdown table cell."""
    if not lst:
        return "—"
    return ", ".join(str(x) for x in lst)


def phase_display_name(phase: str, cases_in_phase: list[dict]) -> str:
    """Get a display name like 'Phase 01 — Foundation & Auth Backend'."""
    # Try to get phase_name from the first case with a non-empty phase_name
    for c in cases_in_phase:
        pname = c["frontmatter"].get("phase_name", "")
        if pname:
            return f"Phase {phase} — {pname}"
    return f"Phase {phase}"


def generate_index_md(cases: list[dict]) -> str:
    """Build the full INDEX.md content string."""
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    lines: list[str] = [
        "# ArthaBuild Case Index",
        "",
        f"Generated: {now}",
        "",
    ]

    by_phase = group_by_phase(cases)

    for phase, phase_cases in by_phase.items():
        section_title = phase_display_name(phase, phase_cases)
        lines.append(f"## {section_title}")
        lines.append("")
        lines.append("| ID | Title | Severity | Category | Status | Blocks | Blocked By |")
        lines.append("|----|-------|----------|----------|--------|--------|------------|")

        for case in phase_cases:
            fm = case["frontmatter"]
            rel = case_relative_path(case["_path"])
            case_id = fm["id"]
            title = fm["title"]
            severity = fm["severity"]
            category = fm["category"]
            status = fm["status"]
            blocks = format_list_field(fm.get("blocks", []))
            blocked_by = format_list_field(fm.get("blocked_by", []))

            lines.append(
                f"| [{case_id}]({rel}) | {title} | {severity} | {category} | {status} | {blocks} | {blocked_by} |"
            )

        lines.append("")

    # Kanban status sections for FEATURE_TEST cases
    # PENDING section
    pending_cases = [c for c in cases if c["frontmatter"].get("status") == "PENDING"]
    if pending_cases:
        lines.append("## Pending (Feature Tests)")
        lines.append("")
        lines.append("| ID | Title | Severity | Category | Feature | Test Ref |")
        lines.append("|----|-------|----------|----------|---------|---------|")
        for case in pending_cases:
            fm = case["frontmatter"]
            rel = case_relative_path(case["_path"])
            lines.append(
                f"| [{fm['id']}]({rel}) | {fm['title']} | {fm['severity']} | {fm['category']} "
                f"| {fm.get('feature', '—')} | {fm.get('test_ref', '—')} |"
            )
        lines.append("")

    # PASS section
    pass_cases = [c for c in cases if c["frontmatter"].get("status") == "PASS"]
    if pass_cases:
        lines.append("## Pass (Feature Tests)")
        lines.append("")
        lines.append("| ID | Title | Severity | Category | Feature | Test Ref |")
        lines.append("|----|-------|----------|----------|---------|---------|")
        for case in pass_cases:
            fm = case["frontmatter"]
            rel = case_relative_path(case["_path"])
            lines.append(
                f"| [{fm['id']}]({rel}) | {fm['title']} | {fm['severity']} | {fm['category']} "
                f"| {fm.get('feature', '—')} | {fm.get('test_ref', '—')} |"
            )
        lines.append("")

    # Summary table
    lines.append("## Summary")
    lines.append("")
    lines.append("| Status | Count |")
    lines.append("|--------|-------|")

    status_counts: dict[str, int] = {s: 0 for s in ALL_STATUSES}
    for case in cases:
        st = case["frontmatter"].get("status", "")
        if st in status_counts:
            status_counts[st] += 1
        else:
            status_counts[st] = status_counts.get(st, 0) + 1

    for status, count in status_counts.items():
        lines.append(f"| {status} | {count} |")

    total = len(cases)
    lines.append(f"| **Total** | **{total}** |")
    lines.append("")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# CASE_BOARD.html injection
# ---------------------------------------------------------------------------

def build_case_json_array(cases: list[dict]) -> list[dict]:
    """Build the JSON-serialisable list of case objects."""
    result = []
    for case in cases:
        fm = case["frontmatter"]
        obj = {
            "id": fm.get("id", ""),
            "title": fm.get("title", ""),
            "phase": fm.get("phase", ""),
            "phase_name": fm.get("phase_name", ""),
            "category": fm.get("category", ""),
            "severity": fm.get("severity", ""),
            "status": fm.get("status", ""),
            "created": fm.get("created", ""),
            "updated": fm.get("updated", ""),
            "assignee": fm.get("assignee", ""),
            "blocks": fm.get("blocks", []),
            "blocked_by": fm.get("blocked_by", []),
            "files": fm.get("files", []),
            "sections": case.get("sections", {}),
        }
        # Optional fields — only include if present
        if fm.get("feature"):
            obj["feature"] = str(fm["feature"])
        if fm.get("test_ref"):
            obj["test_ref"] = str(fm["test_ref"])
        if fm.get("agent"):
            obj["agent"] = str(fm["agent"])
        result.append(obj)
    return result


def inject_into_html(cases: list[dict]) -> bool:
    """
    Read CASE_BOARD.html, replace the CASES placeholder with real JSON, write back.
    Returns True if successful, False if the file doesn't exist.
    """
    if not BOARD_HTML.exists():
        print(f"WARNING: {BOARD_HTML} does not exist — skipping HTML injection")
        return False

    html = BOARD_HTML.read_text(encoding="utf-8")

    if BOARD_PLACEHOLDER not in html:
        print(f"WARNING: Placeholder '{BOARD_PLACEHOLDER}' not found in {BOARD_HTML} — skipping injection")
        return False

    case_array = build_case_json_array(cases)
    json_str = json.dumps(case_array, indent=2, ensure_ascii=False)
    replacement = f"const CASES = {json_str};"

    new_html = html.replace(BOARD_PLACEHOLDER, replacement, 1)
    BOARD_HTML.write_text(new_html, encoding="utf-8")
    return True


# ---------------------------------------------------------------------------
# --new --phase N
# ---------------------------------------------------------------------------

def get_next_case_number() -> int:
    """Scan all existing CASE-*.md and return the next available number."""
    existing = list(CASES_DIR.glob("phase-*/CASE-*.md"))
    if not existing:
        return 1
    numbers = []
    for p in existing:
        m = re.match(r"CASE-(\d+)", p.stem)
        if m:
            numbers.append(int(m.group(1)))
    return max(numbers) + 1 if numbers else 1


def create_new_case(phase_val: str, case_type: str = "audit") -> None:
    """Create a blank CASE-NNN.md in the matching phase folder.

    Args:
        phase_val: Phase number string (e.g. "01", "07.1").
        case_type: "audit" (default) for standard audit finding, or "feature" for FEATURE_TEST.
    """
    # Find matching folder
    folder = find_phase_folder(phase_val)
    if folder is None:
        # List valid folders
        valid_folders = sorted(
            [d.name for d in CASES_DIR.iterdir() if d.is_dir() and d.name.startswith("phase-")],
            key=lambda n: phase_sort_key(n.split("-")[1] if len(n.split("-")) >= 2 else "99"),
        )
        print(f"ERROR: No phase folder found for phase '{phase_val}'")
        print("Valid folders:")
        for vf in valid_folders:
            print(f"  {CASES_DIR / vf}")
        sys.exit(1)

    next_num = get_next_case_number()
    case_id = f"CASE-{next_num:03d}"
    today = date.today().isoformat()

    # Derive phase_name from folder name
    parts = folder.name.split("-", 2)
    phase_name_raw = parts[2].replace("-", " ").title() if len(parts) >= 3 else ""

    if case_type == "feature":
        template = f"""---
id: {case_id}
title: "Feature test: describe what is being tested"
phase: "{phase_val}"
phase_name: "{phase_name_raw}"
category: FEATURE_TEST
severity: MEDIUM
status: PENDING
feature: "METHOD /api/path"
test_ref: "tests/test_module.py::test_function_name"
created: {today}
updated: {today}
assignee: ""
blocks: []
blocked_by: []
files: []
---

## What Is Being Tested

<!-- Describe the feature or endpoint under test -->

## Test Approach

<!-- Describe the test strategy (unit, integration, E2E) -->

## Acceptance Criteria

<!-- List the conditions that define PASS -->

## How To Run

```bash
pytest src/backend/<test_ref> -v
```

## Links

<!-- Related cases, PRs, docs, or external references -->
"""
    else:
        template = f"""---
id: {case_id}
title: "Title here"
phase: "{phase_val}"
phase_name: "{phase_name_raw}"
category: HARDCODED
severity: MEDIUM
status: OPEN
created: {today}
updated: {today}
assignee: ""
blocks: []
blocked_by: []
files: []
---

## Why This Case Was Created

<!-- Describe the context that surfaced this issue -->

## What Is Wrong

<!-- Describe the concrete problem -->

## Why It Was Done This Way (Root Cause)

<!-- Describe why this pattern was used and why it is problematic -->

## What Is Done Right

<!-- Credit any aspects of the current implementation that are correct -->

## How To Fix It

<!-- Step-by-step remediation plan -->

## Architecture Mapping

<!-- Map this case to the ArthaBuild architecture (layer, service, module) -->

## Verification

<!-- How to confirm the fix is working -->

## Downstream Impact

<!-- What breaks or degrades if this is not fixed -->

## Links

<!-- Related cases, PRs, docs, or external references -->
"""

    out_path = folder / f"{case_id}.md"
    out_path.write_text(template, encoding="utf-8")
    print(f"Created: {out_path}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def load_and_parse_all() -> tuple[list[dict], list[str], list[str]]:
    """
    Glob, parse, and validate all CASE-*.md files.
    Returns (cases, parse_errors, validation_warnings).
    parse_errors are fatal; validation_warnings are advisory.
    """
    paths = glob_case_files()
    cases: list[dict] = []
    parse_errors: list[str] = []

    for p in paths:
        try:
            case = parse_case_file(p)
            cases.append(case)
        except ValueError as exc:
            parse_errors.append(f"ERROR: {exc}")

    val_errors, warnings = validate_cases(cases)
    all_errors = parse_errors + val_errors
    return cases, all_errors, warnings


def main() -> None:
    parser = argparse.ArgumentParser(
        description="ArthaBuild case board generator"
    )
    parser.add_argument(
        "--validate",
        action="store_true",
        help="Validate only — do not write any files",
    )
    parser.add_argument(
        "--new",
        action="store_true",
        help="Create a new blank case file (requires --phase)",
    )
    parser.add_argument(
        "--phase",
        metavar="N",
        help="Phase number for --new (e.g. 01, 07, 07.1)",
    )
    parser.add_argument(
        "--type",
        metavar="TYPE",
        default="audit",
        help="Template type for --new: 'audit' (default audit finding) or 'feature' (FEATURE_TEST template)",
    )
    args = parser.parse_args()

    # --new --phase N [--type TYPE]
    if args.new:
        if not args.phase:
            print("ERROR: --new requires --phase N")
            sys.exit(1)
        case_type = args.type if args.type in ("audit", "feature") else "audit"
        if args.type not in ("audit", "feature"):
            print(f"WARNING: Unknown --type '{args.type}', defaulting to 'audit'")
        create_new_case(args.phase, case_type=case_type)
        return

    # Load + parse + validate
    cases, errors, warnings = load_and_parse_all()

    if errors:
        for e in errors:
            print(e)
        sys.exit(1)

    for w in warnings:
        print(w)

    # --validate only
    if args.validate:
        phase_count = len(set(c["frontmatter"]["phase"] for c in cases))
        print(f"Validated {len(cases)} cases across {phase_count} phases")
        if warnings:
            print(f"Warnings: {len(warnings)}")
        else:
            print("No warnings.")
        return

    # Full run: write INDEX.md + inject CASE_BOARD.html
    index_content = generate_index_md(cases)
    INDEX_MD.write_text(index_content, encoding="utf-8")

    html_written = inject_into_html(cases)

    # Summary
    phase_count = len(set(c["frontmatter"]["phase"] for c in cases))
    broken_deps = sum(1 for w in warnings if "does not exist" in w and ("blocks" in w or "blocked_by" in w))
    missing_files = sum(1 for w in warnings if "does not exist under src/" in w)

    print(f"Loaded {len(cases)} cases across {phase_count} phases")
    if warnings:
        warn_parts = []
        if broken_deps:
            warn_parts.append(f"{broken_deps} broken dep link{'s' if broken_deps != 1 else ''}")
        if missing_files:
            warn_parts.append(f"{missing_files} missing file path{'s' if missing_files != 1 else ''}")
        other = len(warnings) - broken_deps - missing_files
        if other:
            warn_parts.append(f"{other} other warning{'s' if other != 1 else ''}")
        print(f"Warnings: {', '.join(warn_parts)}")
    else:
        print("Warnings: none")

    print(f"Written: {INDEX_MD}")
    if html_written:
        print(f"Written: {BOARD_HTML}")
        print(f"Open with: open {BOARD_HTML}")
    else:
        print(f"Skipped: {BOARD_HTML} (file not found or placeholder missing)")


if __name__ == "__main__":
    main()
