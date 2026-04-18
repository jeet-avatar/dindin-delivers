"""Build the validator whitelist from oracle-*.md files.

Emits: apps/arthaBuild/src/backend/validators/whitelist.py
Exits non-zero if any category falls below its floor.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import argparse

BOOTSTRAP_DIR = Path(__file__).parent.parent / "src" / "backend" / "knowledge" / "bootstrap"
DEFAULT_OUT = Path(__file__).parent.parent / "src" / "backend" / "validators" / "whitelist.py"

FLOORS = {
    "RECORD_TYPES": 100,
    "MODULES": 30,
    "SCRIPT_TYPES": 10,
    "SEARCH_TYPES": 100,
    "SEARCH_APIS": 10,
}

def extract_record_types() -> set[str]:
    out: set[str] = set()
    text = (BOOTSTRAP_DIR / "oracle-record-types.md").read_text()
    for line in text.splitlines():
        # Match table rows like "| SALES_ORDER |" — strict uppercase enum only,
        # ignoring header row "| Enum |" (Enum has lowercase letters) and separator "|------|".
        m = re.match(r"^\|\s*([A-Z][A-Z0-9_]{2,})\s*\|\s*$", line)
        if m:
            out.add(m.group(1))
    return out


# Mapping from oracle hyphen-form module names to their canonical slashed
# SuiteScript import form. Per parser findings doc
# (apps/arthaBuild/docs/superpowers/specs/2026-04-17-zero-hallucination-gate-parser-findings.md),
# oracle headers use hyphens (e.g. `N/ui-server-widget`) but real `define()`
# and `require()` calls use slashes (`N/ui/serverWidget`). The whitelist must
# accept both forms so the linter doesn't false-positive on either.
_MODULE_SLASH_FORMS: dict[str, str] = {
    "N/certificate-control": "N/certificateControl",
    "N/crypto-certificate": "N/crypto/certificate",
    "N/crypto-random": "N/crypto/random",
    "N/current-record": "N/currentRecord",
    "N/document-capture": "N/documentCapture",
    "N/format-i18n": "N/format/i18n",
    "N/https-client-certificate": "N/https/clientCertificate",
    "N/key-control": "N/keyControl",
    "N/machine-translation": "N/machineTranslation",
    "N/record-context": "N/record/context",
    "N/suite-app-info": "N/suiteAppInfo",
    "N/task-accounting": "N/task/accounting",
    "N/ui-dialog": "N/ui/dialog",
    "N/ui-message": "N/ui/message",
    "N/ui-server-widget": "N/ui/serverWidget",
}


def extract_modules() -> set[str]:
    """Extract N/* module names from oracle-module-*.md header lines.

    The first line of each `oracle-module-*.md` file is the authoritative
    declaration in the form `# N/<name> — SuiteScript 2.x Module`. We parse
    that line and also emit the canonical slash form for the 15 modules
    whose import path differs from the hyphenated documentation form
    (see `_MODULE_SLASH_FORMS`). Finally, `N/xml` is added explicitly —
    it has no oracle file but is a legitimate module referenced in
    non-oracle bootstrap files.
    """
    out: set[str] = set()
    # Header regex: include [0-9] so `N/format-i18n` captures fully.
    header_re = re.compile(r"^#\s+(N/[a-z][a-z0-9/-]+)\s+—")
    for md in BOOTSTRAP_DIR.glob("oracle-module-*.md"):
        text = md.read_text()
        if not text.strip():
            continue
        first_line = text.splitlines()[0]
        m = header_re.match(first_line)
        if not m:
            continue
        hyphen_form = m.group(1)
        out.add(hyphen_form)
        # Also emit the canonical slash form where it differs.
        slash_form = _MODULE_SLASH_FORMS.get(hyphen_form)
        if slash_form:
            out.add(slash_form)
    # N/xml has no oracle file but is a valid SuiteScript module
    # (see module-xml.md in bootstrap dir; parser findings §MODULES).
    out.add("N/xml")
    return out


# Mapping from oracle-script-types.md human-readable script-type names
# (captured from `[SuiteScript 2.x <NAME> Script Type]` link text) to the
# canonical `@NScriptType` JSDoc annotation value used in SuiteScript source.
# See parser findings doc § SCRIPT_TYPES — the oracle table only lists human
# names; this map converts them to the deploy-time annotation value.
_SCRIPT_TYPE_NAME_MAP: dict[str, str] = {
    "Bundle Installation": "BundleInstallationScript",
    "Client": "ClientScript",
    "Custom Tool": "CustomToolScript",
    "Map/Reduce": "MapReduceScript",
    "Mass Update": "MassUpdateScript",
    "Portlet": "Portlet",
    "RESTlet": "RESTlet",
    "SDF Installation": "SDFInstallationScript",
    "Scheduled": "ScheduledScript",
    "Suitelet": "Suitelet",
    "User Event": "UserEventScript",
    "Workflow Action": "WorkflowActionScript",
}


def extract_script_types() -> set[str]:
    """Extract canonical `@NScriptType` values.

    Primary source: `oracle-script-types.md` — the authoritative table of
    script types documented as markdown links in the form
    `[SuiteScript 2.x <Name> Script Type](...)`. Per parser findings doc
    § SCRIPT_TYPES, the oracle file uses human-readable names, so we map
    each to its canonical `@NScriptType` JSDoc value via _SCRIPT_TYPE_NAME_MAP.

    Supplementary source: any `@NScriptType` annotations found across all
    bootstrap `*.md` files (catches variants like `customglplugin` used in
    pattern files). Trailing punctuation (e.g. a stray backtick) is stripped.
    """
    out: set[str] = set()
    text = (BOOTSTRAP_DIR / "oracle-script-types.md").read_text()
    # Link-text pattern per parser findings § SCRIPT_TYPES.
    link_re = re.compile(r"\[SuiteScript\s+2\.[x1]+\s+([\w/ ]+?)\s+Script Type\]")
    for name in link_re.findall(text):
        canonical = _SCRIPT_TYPE_NAME_MAP.get(name)
        if canonical:
            out.add(canonical)
    # Supplement: any explicit @NScriptType annotations anywhere in bootstrap.
    nscript_re = re.compile(r"@NScriptType\s+([A-Za-z][A-Za-z]+)")
    for md in BOOTSTRAP_DIR.glob("*.md"):
        for m in nscript_re.finditer(md.read_text()):
            val = m.group(1).rstrip("`")
            if val:
                out.add(val)
    return out


def extract_search_types() -> set[str]:
    """Extract `search.Type.*` enum values.

    Per parser findings § SEARCH_TYPES (Option C — recommended): `record.Type`
    and `search.Type` share most string values in NetSuite (e.g. `SALES_ORDER`
    works for both), so we start from `extract_record_types()`. However, the
    N/search module documents a handful of *parent/generic* search types that
    have no `record.Type` equivalent (you can search across the category but
    can't `record.load` one). These are added explicitly so real SuiteScript
    calls like `search.create({type: search.Type.TRANSACTION})` aren't
    false-flagged.
    """
    # Generic/parent search types with no record.Type equivalent.
    # Source: N/search Module Type enum, NetSuite SuiteScript 2.x docs.
    SEARCH_ONLY_GENERICS = {
        "TRANSACTION",    # search across all transaction subtypes
        "ITEM",           # search across all item subtypes
        "ENTITY",         # search across customer/vendor/partner/employee
        "ACTIVITY",       # search across event/task/phone call
        "COMMUNICATION",  # search across note/message
    }
    return extract_record_types() | SEARCH_ONLY_GENERICS


def extract_search_apis() -> set[str]:
    """Extract top-level `search.<method>(` API names.

    Per parser findings § SEARCH_APIS, the canonical source is the
    "N/search Module Members" table in `oracle-module-search.md`, which
    lists methods as markdown links like `[search.create(options)](...)`.
    We supplement with `module-search.md` (non-oracle) to pick up `run` and
    `runPaged`, which appear as `Search.run()` in oracle docs but are
    written as `search.run()` in real SuiteScript code examples.

    `.promise` suffixes are intentionally captured as their base name only
    (the regex stops at the opening paren of the base method).
    """
    out: set[str] = set()
    pattern = re.compile(r"\bsearch\.([a-z][A-Za-z]*)\s*\(")
    for fname in ("oracle-module-search.md", "module-search.md"):
        path = BOOTSTRAP_DIR / fname
        if not path.exists():
            continue
        for m in pattern.finditer(path.read_text()):
            out.add(m.group(1))
    return out

def render(sets: dict[str, set[str]], out_file: Path) -> None:
    lines = ['"""Auto-generated by scripts/build_whitelist.py — do not edit by hand."""',
             "from __future__ import annotations", ""]
    for name, values in sets.items():
        sorted_vals = sorted(values)
        lines.append(f"{name}: set[str] = {{")
        for v in sorted_vals:
            lines.append(f"    {v!r},")
        lines.append("}")
        lines.append("")
    out_file.parent.mkdir(parents=True, exist_ok=True)
    out_file.write_text("\n".join(lines) + "\n")


def main(out_file: Path | None = None) -> int:
    target = out_file or DEFAULT_OUT
    sets = {
        "RECORD_TYPES": extract_record_types(),
        "MODULES": extract_modules(),
        "SCRIPT_TYPES": extract_script_types(),
        "SEARCH_TYPES": extract_search_types(),
        "SEARCH_APIS": extract_search_apis(),
    }
    for name, s in sets.items():
        if len(s) < FLOORS[name]:
            print(f"FLOOR CHECK FAILED: {name} has {len(s)} entries, floor is {FLOORS[name]}", file=sys.stderr)
            return 1
    render(sets, target)
    return 0

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, default=None, help="Override output path (for drift tests)")
    args = ap.parse_args()
    sys.exit(main(out_file=args.out))
