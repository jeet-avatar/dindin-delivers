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

def extract_record_types() -> set[str]: ...
def extract_modules() -> set[str]: ...
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
