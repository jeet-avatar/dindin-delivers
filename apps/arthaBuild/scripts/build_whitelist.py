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


def extract_script_types() -> set[str]: ...
def extract_search_types() -> set[str]: ...
def extract_search_apis() -> set[str]: ...

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
