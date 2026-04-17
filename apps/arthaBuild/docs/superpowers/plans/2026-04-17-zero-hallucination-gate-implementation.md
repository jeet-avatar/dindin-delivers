# Zero-Hallucination Gate — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a V1 validator gate that guarantees zero invalid NetSuite identifiers (`record.Type.*`, `N/*` modules, `@NScriptType` + `search.Type.*`, `search.*` methods) in any generated SuiteScript, via pluggable checkers + bounded 2-attempt re-prompt + hard-block on failure.

**Architecture:** Pure-Python validator at `apps/arthaBuild/src/backend/validators/`. Whitelist is generated from the 58 `oracle-*.md` files by a build script and committed to git. Regex-first extraction (esprima deferred). Integrated into `rawapi.py:542-578`. Success measured against a 200-case stress suite (40 existing eval + 160 adversarial).

**Tech Stack:** Python 3.11, stdlib (re, difflib, dataclasses, abc), pytest.

**Spec:** `apps/arthaBuild/docs/superpowers/specs/2026-04-17-zero-hallucination-gate-design.md` (commit `fe428bf2`)

**Project Law Compatibility:**
- All inference via local Ollama — validator is pure Python + regex, no LLM calls inside the validator itself.
- All MD files separate — this plan is its own file; stress cases are JSONL per file.
- 60% context rule — chunks are sized so each fits comfortably; executor can pause between chunks.

---

## File Structure

All paths relative to repo root.

| Path | Responsibility |
|------|----------------|
| `apps/arthaBuild/src/backend/validators/__init__.py` | Package marker + public exports (`SuiteScriptLinter`, `LintResult`, `Violation`) |
| `apps/arthaBuild/src/backend/validators/linter.py` | `SuiteScriptLinter` orchestrator + non-ASCII pre-pass + `extract_first_code_block` |
| `apps/arthaBuild/src/backend/validators/whitelist.py` | Generated; module-level sets `RECORD_TYPES`, `MODULES`, `SCRIPT_TYPES`, `SEARCH_TYPES`, `SEARCH_APIS` |
| `apps/arthaBuild/src/backend/validators/ast_utils.py` | `nearest()` helper + regex helpers shared by checkers |
| `apps/arthaBuild/src/backend/validators/checkers/__init__.py` | Package marker + checker registry |
| `apps/arthaBuild/src/backend/validators/checkers/base.py` | `Checker` ABC + `Violation` / `LintResult` dataclasses |
| `apps/arthaBuild/src/backend/validators/checkers/record_type.py` | `RecordTypeChecker` |
| `apps/arthaBuild/src/backend/validators/checkers/module.py` | `ModuleChecker` |
| `apps/arthaBuild/src/backend/validators/checkers/script_type.py` | `ScriptTypeChecker` (covers both `@NScriptType` and `search.Type.*`) |
| `apps/arthaBuild/src/backend/validators/checkers/search_api.py` | `SearchApiChecker` |
| `apps/arthaBuild/src/backend/validators/reprompt.py` | `reprompt_with_violations()` + `build_refusal_message()` |
| `apps/arthaBuild/scripts/build_whitelist.py` | Parses `oracle-*.md` → emits `whitelist.py`; floor-check circuit breaker |
| `apps/arthaBuild/src/backend/rawapi.py` | MODIFY — wire validator into `generate_suitescript` intent block at 542-578 |
| `apps/arthaBuild/tests/validators/__init__.py` | Package marker |
| `apps/arthaBuild/tests/validators/test_linter.py` | `SuiteScriptLinter` orchestration, non-ASCII pre-pass, code-block extraction |
| `apps/arthaBuild/tests/validators/test_ast_utils.py` | `nearest()` behavior including cutoff, ties, empty-list contract |
| `apps/arthaBuild/tests/validators/test_record_type.py` | `RecordTypeChecker` — 8 hallucinated + 8 valid fixtures |
| `apps/arthaBuild/tests/validators/test_module.py` | `ModuleChecker` — 8+8 fixtures |
| `apps/arthaBuild/tests/validators/test_script_type.py` | `ScriptTypeChecker` — 8+8 fixtures |
| `apps/arthaBuild/tests/validators/test_search_api.py` | `SearchApiChecker` — 8+8 fixtures, including `result.search.getValue(...)` non-violation |
| `apps/arthaBuild/tests/validators/test_whitelist_drift.py` | Re-runs `build_whitelist.py` → diffs against committed whitelist + asserts floor checks |
| `apps/arthaBuild/tests/validators/test_reprompt.py` | Re-prompt template formatting + refusal message rendering |
| `apps/arthaBuild/tests/eval/stress/record_type.jsonl` | 40 adversarial record_type cases |
| `apps/arthaBuild/tests/eval/stress/module.jsonl` | 40 adversarial module cases |
| `apps/arthaBuild/tests/eval/stress/script_type.jsonl` | 40 adversarial script_type cases |
| `apps/arthaBuild/tests/eval/stress/search.jsonl` | 40 adversarial search_api + search_type cases |
| `apps/arthaBuild/tests/eval/run_stress.py` | 200-case runner (40 original eval + 160 stress); reuses `run_eval.py` infrastructure |

---

## Chunk 1: Wave 1 — Whitelist Build

Goal: produce a committed `whitelist.py` with all 5 category sets populated above their floors, and a CI drift test that guarantees it stays fresh.

### Task 1.1: Inspect the actual oracle files

**Files:**
- Read: `apps/arthaBuild/src/backend/knowledge/bootstrap/oracle-records-guide.md`
- Read: `apps/arthaBuild/src/backend/knowledge/bootstrap/oracle-module-record.md`
- Read: `apps/arthaBuild/src/backend/knowledge/bootstrap/oracle-module-search.md`
- Read: `apps/arthaBuild/src/backend/knowledge/bootstrap/oracle-script-types.md`
- List: `apps/arthaBuild/src/backend/knowledge/bootstrap/oracle-module-*.md` (28 files)

- [ ] **Step 1: Run `ls` and note which oracle files exist, for each category confirm the file actually contains the data the spec says it contains.**

Run: `ls apps/arthaBuild/src/backend/knowledge/bootstrap/oracle-*.md | wc -l` (expected: 58)

- [ ] **Step 2: For RECORD_TYPES — grep for `record.Type.` enum values**

Run: `grep -oE 'record\.Type\.[A-Z_]+' apps/arthaBuild/src/backend/knowledge/bootstrap/oracle-*.md | sort -u | head -20`

If yields <50 unique values, widen search: try `grep -oE '\| [A-Z_]{3,} \|' oracle-records-guide.md` (table-cell pattern). Record the winning pattern.

- [ ] **Step 3: For MODULES — enumerate `oracle-module-*.md` filenames and read each file's first header line**

Run: `for f in apps/arthaBuild/src/backend/knowledge/bootstrap/oracle-module-*.md; do head -1 "$f"; done`

Expected format: `# N/record — SuiteScript 2.x Module`. Capture the declared module name — this is the source of truth for slash-vs-hyphen ambiguity (e.g. does `oracle-module-format-i18n.md` declare `N/format/i18n` or `N/format-i18n`?).

- [ ] **Step 4: For SCRIPT_TYPES — find the canonical list**

Run: `head -100 apps/arthaBuild/src/backend/knowledge/bootstrap/oracle-script-types.md`

Expected: list or table of `UserEventScript`, `Scheduled`, `MapReduce`, `Suitelet`, `ClientScript`, etc. Note the extraction pattern.

- [ ] **Step 5: For SEARCH_TYPES and SEARCH_APIS — inspect `oracle-module-search.md`**

Run: `grep -nE '(search\.Type\.|search\.[a-z])' apps/arthaBuild/src/backend/knowledge/bootstrap/oracle-module-search.md | head -30`

Record patterns.

- [ ] **Step 6: Commit inspection notes**

Write findings to `apps/arthaBuild/docs/superpowers/specs/2026-04-17-zero-hallucination-gate-parser-findings.md` with one section per category documenting the winning regex/pattern.

```bash
git add apps/arthaBuild/docs/superpowers/specs/2026-04-17-zero-hallucination-gate-parser-findings.md
git commit -m "docs(arthaBuild): parser inspection notes for zero-hallucination whitelist"
```

### Task 1.1b: Author curated `oracle-record-types.md`

**Context:** Task 1.1 surfaced that `oracle-records-guide.md` is a 32-line index — no enum table. RECORD_TYPES (54 found) and SEARCH_TYPES (21 found) both fall below the 100 floor. Since `record.Type.*` and `search.Type.*` share the same string values in NetSuite's SuiteScript API, one curated list backs both extractors.

**Files:**
- Create: `apps/arthaBuild/src/backend/knowledge/bootstrap/oracle-record-types.md`

- [ ] **Step 1: Author the curated file**

The file is a plain markdown table with one column: the canonical NetSuite record type enum name (UPPER_SNAKE_CASE, the value of `record.Type.*` and the string form of `search.Type.*`).

Source: NetSuite SuiteScript 2.x Records Browser (https://system.netsuite.com/help/helpcenter/en_US/srbrowser/Browser2024_2/script/record/). At minimum include every top-level record type documented there — **target ≥200 entries** to give both floors (100) comfortable headroom.

Structure:

```markdown
# NetSuite Record Type Whitelist

> Curated list of valid `record.Type.*` / `search.Type.*` enum names.
> Source: SuiteScript 2.x Records Browser. Updated: 2026-04-17.
> This file is the source of truth for the `RECORD_TYPES` and `SEARCH_TYPES`
> categories in `validators/whitelist.py`. Do not remove entries without
> confirming the enum has been deprecated upstream.

| Enum |
|------|
| ACCOUNT |
| ACCOUNTING_BOOK |
| ACCOUNTING_CONTEXT |
| ACCOUNTING_PERIOD |
| ADV_INTER_COMPANY_JOURNAL_ENTRY |
| ALLOCATION_SCHEDULE |
| ...200+ rows...
| WORK_ORDER |
| WORK_ORDER_CLOSE |
| WORK_ORDER_COMPLETION |
| WORK_ORDER_ISSUE |
```

Required coverage (non-exhaustive — must include ALL of these AND any other standard types found in the Records Browser):
- Transactions: `SALES_ORDER`, `PURCHASE_ORDER`, `INVOICE`, `CREDIT_MEMO`, `CASH_SALE`, `CASH_REFUND`, `ITEM_FULFILLMENT`, `ITEM_RECEIPT`, `VENDOR_BILL`, `VENDOR_CREDIT`, `VENDOR_PAYMENT`, `CUSTOMER_PAYMENT`, `CUSTOMER_REFUND`, `DEPOSIT`, `JOURNAL_ENTRY`, `TRANSFER_ORDER`, `RETURN_AUTHORIZATION`, `VENDOR_RETURN_AUTHORIZATION`, `ESTIMATE`, `OPPORTUNITY`, `WORK_ORDER`, `ASSEMBLY_BUILD`, `ASSEMBLY_UNBUILD`, `INVENTORY_ADJUSTMENT`, `INVENTORY_TRANSFER`, `PAYCHECK`, `STATEMENT_CHARGE`, `EXPENSE_REPORT`, `TIME_BILL`, `BIN_TRANSFER`, `BIN_PUTAWAY_WORKSHEET`
- Entities: `CUSTOMER`, `VENDOR`, `EMPLOYEE`, `PARTNER`, `CONTACT`, `LEAD`, `PROSPECT`, `GROUP`, `SUBSIDIARY`, `DEPARTMENT`, `CLASSIFICATION`, `LOCATION`, `PROJECT`, `PROJECT_TASK`
- Items: `INVENTORY_ITEM`, `NON_INVENTORY_ITEM`, `SERVICE_ITEM`, `SERVICE_SALE_ITEM`, `SERVICE_PURCHASE_ITEM`, `SERVICE_RESALE_ITEM`, `ASSEMBLY_ITEM`, `KIT_ITEM`, `DESCRIPTION_ITEM`, `DISCOUNT_ITEM`, `MARKUP_ITEM`, `PAYMENT_ITEM`, `SUBTOTAL_ITEM`, `GIFT_CERTIFICATE_ITEM`, `DOWNLOAD_ITEM`, `OTHER_CHARGE_ITEM`, `LOT_NUMBERED_INVENTORY_ITEM`, `SERIALIZED_INVENTORY_ITEM`, `LOT_NUMBERED_ASSEMBLY_ITEM`, `SERIALIZED_ASSEMBLY_ITEM`
- Lists/Setup: `ACCOUNT`, `ACCOUNTING_PERIOD`, `ACCOUNTING_BOOK`, `CURRENCY`, `CURRENCY_RATE`, `TAX_ITEM`, `TAX_GROUP`, `TAX_TYPE`, `TAX_SCHEDULE`, `PRICING`, `PRICE_LEVEL`, `UNITS_TYPE`, `TERM`, `BILLING_SCHEDULE`, `PROMOTION_CODE`
- Custom: `CUSTOM_RECORD`, `CUSTOM_TRANSACTION`, `CUSTOM_LIST`

- [ ] **Step 2: Verify count**

```bash
cd apps/arthaBuild
grep -c "^| [A-Z]" src/backend/knowledge/bootstrap/oracle-record-types.md
```

Expected: ≥200.

- [ ] **Step 3: Commit**

```bash
git add apps/arthaBuild/src/backend/knowledge/bootstrap/oracle-record-types.md
git commit -m "feat(arthaBuild): curated record type whitelist for zero-hallucination gate"
```

### Task 1.2: Scaffold `build_whitelist.py`

**Files:**
- Create: `apps/arthaBuild/scripts/build_whitelist.py`

- [ ] **Step 1: Write the skeleton**

```python
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
```

- [ ] **Step 2: Commit the skeleton**

```bash
git add apps/arthaBuild/scripts/build_whitelist.py
git commit -m "feat(arthaBuild): scaffold build_whitelist.py"
```

### Task 1.3: Implement `extract_modules()` (simplest — filename based)

**Files:**
- Modify: `apps/arthaBuild/scripts/build_whitelist.py`

- [ ] **Step 1: Implement from the findings in Task 1.1 Step 3**

Use the declared module name from each file's `# N/... — ...` header rather than mechanical hyphen-splitting.

```python
def extract_modules() -> set[str]:
    out: set[str] = set()
    header_re = re.compile(r"^#\s+(N/[\w/]+)\b")
    for md in BOOTSTRAP_DIR.glob("oracle-module-*.md"):
        first_line = md.read_text().splitlines()[0] if md.read_text().strip() else ""
        m = header_re.match(first_line)
        if m:
            out.add(m.group(1))
    return out
```

- [ ] **Step 2: Run it manually to verify**

```bash
cd apps/arthaBuild
python -c "from scripts.build_whitelist import extract_modules; print(sorted(extract_modules()))"
```

Expected: ≥30 `N/*` entries. If fewer, the header regex needs adjustment — inspect the actual first lines.

- [ ] **Step 3: Commit**

```bash
git add apps/arthaBuild/scripts/build_whitelist.py
git commit -m "feat(arthaBuild): extract MODULES from oracle-module-*.md headers"
```

### Task 1.4: Implement `extract_record_types()` (from curated `oracle-record-types.md`)

**Files:**
- Modify: `apps/arthaBuild/scripts/build_whitelist.py`

- [ ] **Step 1: Write the extractor — parse the curated table**

The source is `oracle-record-types.md` authored in Task 1.1b (single-column markdown table of canonical enum names). Parse table rows.

```python
def extract_record_types() -> set[str]:
    out: set[str] = set()
    text = (BOOTSTRAP_DIR / "oracle-record-types.md").read_text()
    for line in text.splitlines():
        # Match table rows like "| SALES_ORDER |" — strict uppercase enum only,
        # ignoring header row "| Enum |" (Enum has lowercase letters).
        m = re.match(r"^\|\s*([A-Z][A-Z0-9_]{2,})\s*\|\s*$", line)
        if m:
            out.add(m.group(1))
    return out
```

- [ ] **Step 2: Verify count meets floor**

```bash
cd apps/arthaBuild
python -c "from scripts.build_whitelist import extract_record_types; print(len(extract_record_types()))"
```

Expected: ≥200 (matches the curated file count). Floor is 100.

- [ ] **Step 3: Commit**

```bash
git add apps/arthaBuild/scripts/build_whitelist.py
git commit -m "feat(arthaBuild): extract RECORD_TYPES from curated list"
```

### Task 1.5: Implement remaining three extractors

**Files:**
- Modify: `apps/arthaBuild/scripts/build_whitelist.py`

- [ ] **Step 1: `extract_script_types()`** — from `oracle-script-types.md`
- [ ] **Step 2: `extract_search_types()`** — **reuse the curated `oracle-record-types.md`** authored in Task 1.1b. `record.Type.*` and `search.Type.*` share the same string values in NetSuite, so `extract_search_types()` returns `extract_record_types()` verbatim (one line: `return extract_record_types()`). This satisfies the 100 floor and eliminates duplication.
- [ ] **Step 3: `extract_search_apis()`** — from `oracle-module-search.md`, table rows matching `\[search\.([a-z][A-Za-z]*)\(` in the Module Members table

- [ ] **Step 4: Verify all five counts meet floors**

```bash
python -c "
from scripts.build_whitelist import *
print('RECORD_TYPES:', len(extract_record_types()))
print('MODULES:', len(extract_modules()))
print('SCRIPT_TYPES:', len(extract_script_types()))
print('SEARCH_TYPES:', len(extract_search_types()))
print('SEARCH_APIS:', len(extract_search_apis()))
"
```

All must meet or exceed floors (100/30/10/100/10).

- [ ] **Step 5: Commit**

```bash
git add apps/arthaBuild/scripts/build_whitelist.py
git commit -m "feat(arthaBuild): extract SCRIPT_TYPES, SEARCH_TYPES, SEARCH_APIS"
```

### Task 1.6: Implement `render()` and generate `whitelist.py`

**Files:**
- Modify: `apps/arthaBuild/scripts/build_whitelist.py`
- Create: `apps/arthaBuild/src/backend/validators/__init__.py` (empty for now)
- Create: `apps/arthaBuild/src/backend/validators/whitelist.py` (generated)

- [ ] **Step 1: Implement `render()`**

```python
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
```

- [ ] **Step 2: Generate the whitelist**

```bash
cd apps/arthaBuild
python scripts/build_whitelist.py
echo "Exit: $?"
```

Expected: exit 0, file `src/backend/validators/whitelist.py` created, <20 KB.

- [ ] **Step 3: Inspect the output**

```bash
wc -l apps/arthaBuild/src/backend/validators/whitelist.py
python -c "from src.backend.validators import whitelist; print(len(whitelist.RECORD_TYPES), len(whitelist.MODULES))"
```

- [ ] **Step 4: Commit both files**

```bash
git add apps/arthaBuild/scripts/build_whitelist.py apps/arthaBuild/src/backend/validators/__init__.py apps/arthaBuild/src/backend/validators/whitelist.py
git commit -m "feat(arthaBuild): generate + commit validator whitelist from oracle docs"
```

### Task 1.7: Write the drift test

**Files:**
- Create: `apps/arthaBuild/tests/validators/__init__.py` (empty)
- Create: `apps/arthaBuild/tests/validators/test_whitelist_drift.py`

- [ ] **Step 1: Write the failing test**

```python
"""Drift test: regenerated whitelist must match the committed whitelist."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).parent.parent.parent
BUILD_SCRIPT = REPO_ROOT / "scripts" / "build_whitelist.py"
COMMITTED = REPO_ROOT / "src" / "backend" / "validators" / "whitelist.py"

FLOORS = {
    "RECORD_TYPES": 100,
    "MODULES": 30,
    "SCRIPT_TYPES": 10,
    "SEARCH_TYPES": 100,
    "SEARCH_APIS": 10,
}


def test_whitelist_not_drifted(tmp_path: Path) -> None:
    """Regenerate the whitelist into a tmp file via `--out` and diff against the committed file."""
    out = tmp_path / "whitelist.py"
    result = subprocess.run(
        [sys.executable, str(BUILD_SCRIPT), "--out", str(out)],
        capture_output=True,
        text=True,
        cwd=REPO_ROOT,
    )
    assert result.returncode == 0, (
        f"build_whitelist failed (exit {result.returncode}):\nstdout:{result.stdout}\nstderr:{result.stderr}"
    )
    regenerated = out.read_text()
    committed = COMMITTED.read_text()
    assert regenerated == committed, (
        "whitelist.py is stale. Re-run `python apps/arthaBuild/scripts/build_whitelist.py` and commit."
    )


@pytest.mark.parametrize("name,floor", FLOORS.items())
def test_committed_whitelist_meets_floor(name: str, floor: int) -> None:
    from src.backend.validators import whitelist
    s = getattr(whitelist, name)
    assert len(s) >= floor, f"{name} has {len(s)} entries, floor is {floor}"
```

- [ ] **Step 2: Run it**

```bash
cd apps/arthaBuild
pytest tests/validators/test_whitelist_drift.py -v
```

Expected: both tests PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/arthaBuild/tests/validators/__init__.py apps/arthaBuild/tests/validators/test_whitelist_drift.py
git commit -m "test(arthaBuild): whitelist drift + floor-check tests"
```

---

## Chunk 2: Wave 2 — Validator Core

Goal: build the `SuiteScriptLinter` orchestrator, shared helpers, and the `Checker` ABC. No checkers implemented yet — those are Wave 3.

### Task 2.1: Dataclasses + `Checker` ABC

**Files:**
- Create: `apps/arthaBuild/src/backend/validators/checkers/__init__.py` (empty)
- Create: `apps/arthaBuild/src/backend/validators/checkers/base.py`
- Create: `apps/arthaBuild/tests/validators/test_base.py`

- [ ] **Step 1: Write the failing test**

```python
from src.backend.validators.checkers.base import Violation, LintResult

def test_violation_dataclass():
    v = Violation(
        category="record_type",
        identifier="RECEIVING",
        line=5,
        suggestions=["ITEM_RECEIPT"],
        message="'RECEIVING' is not a valid record_type",
    )
    assert v.category == "record_type"
    assert v.line == 5


def test_lint_result_dataclass():
    r = LintResult(valid=True, violations=[], elapsed_ms=42)
    assert r.valid is True
    assert r.elapsed_ms == 42
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `pytest apps/arthaBuild/tests/validators/test_base.py -v`
Expected: `ModuleNotFoundError`

- [ ] **Step 3: Implement**

```python
"""Checker ABC + dataclasses."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Violation:
    category: str
    identifier: str
    line: int
    suggestions: list[str] = field(default_factory=list)
    message: str = ""


@dataclass
class LintResult:
    valid: bool
    violations: list[Violation] = field(default_factory=list)
    elapsed_ms: int = 0


class Checker(ABC):
    category: str

    @abstractmethod
    def extract(self, code: str) -> list[tuple[str, int]]:
        """Return (identifier, line_number) pairs found in code."""

    @abstractmethod
    def whitelist(self) -> set[str]:
        """Valid identifiers for this category."""

    def check(self, code: str) -> list[Violation]:
        from src.backend.validators.ast_utils import nearest
        wl = self.whitelist()
        out: list[Violation] = []
        for ident, line in self.extract(code):
            if ident not in wl:
                out.append(Violation(
                    category=self.category,
                    identifier=ident,
                    line=line,
                    suggestions=nearest(ident, wl, k=3),
                    message=f"{ident!r} is not a valid {self.category}",
                ))
        return out
```

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/arthaBuild/src/backend/validators/checkers/__init__.py apps/arthaBuild/src/backend/validators/checkers/base.py apps/arthaBuild/tests/validators/test_base.py
git commit -m "feat(arthaBuild): Checker ABC + Violation/LintResult dataclasses"
```

### Task 2.2: `nearest()` helper

**Files:**
- Create: `apps/arthaBuild/src/backend/validators/ast_utils.py`
- Create: `apps/arthaBuild/tests/validators/test_ast_utils.py`

- [ ] **Step 1: Write failing tests**

```python
from src.backend.validators.ast_utils import nearest

WL = {"SALES_ORDER", "INVOICE", "CUSTOMER", "VENDOR_BILL", "ITEM_RECEIPT"}

def test_nearest_returns_closest():
    assert nearest("SALE_ORDER", WL)[0] == "SALES_ORDER"

def test_nearest_empty_when_far():
    assert nearest("XXXXXXX", WL) == []

def test_nearest_respects_k():
    result = nearest("INVOCE", WL, k=2)
    assert len(result) <= 2

def test_nearest_case_sensitive():
    assert "sales_order" not in nearest("sales_order", WL)
```

- [ ] **Step 2: Run — expect FAIL (module missing)**

- [ ] **Step 3: Implement**

```python
"""Shared helpers for checkers."""
from __future__ import annotations

import difflib


def nearest(ident: str, whitelist: set[str], k: int = 3) -> list[str]:
    """Return up to k closest-matching entries from whitelist (cutoff 0.6).

    Case-sensitive. Empty list if nothing meets cutoff.
    """
    return difflib.get_close_matches(ident, whitelist, n=k, cutoff=0.6)
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/arthaBuild/src/backend/validators/ast_utils.py apps/arthaBuild/tests/validators/test_ast_utils.py
git commit -m "feat(arthaBuild): nearest() helper via difflib"
```

### Task 2.3: `SuiteScriptLinter` + non-ASCII pre-pass + code-block extraction

**Files:**
- Create: `apps/arthaBuild/src/backend/validators/linter.py`
- Create: `apps/arthaBuild/tests/validators/test_linter.py`

- [ ] **Step 1: Write failing tests**

Tests inject `checkers=[]` explicitly so this chunk does not depend on the Wave 3 checker classes (they don't exist yet). The default-constructor wiring is covered by the integration test in Task 3.5.

```python
from src.backend.validators.linter import SuiteScriptLinter, extract_first_code_block

def test_linter_empty_code_valid():
    r = SuiteScriptLinter(checkers=[]).lint("")
    assert r.valid is True


def test_linter_non_ascii_pre_pass_fails():
    # Cyrillic А (U+0410) in identifier
    code = "record.Type.SАLES_ORDER"
    r = SuiteScriptLinter(checkers=[]).lint(code)
    assert r.valid is False
    assert r.violations[0].category == "non_ascii"


def test_linter_non_ascii_line_reported():
    # Non-ASCII on line 3 — line counting sanity
    code = "var a = 1;\nvar b = 2;\nrecord.Type.SАLES_ORDER\n"
    r = SuiteScriptLinter(checkers=[]).lint(code)
    assert r.valid is False
    assert r.violations[0].category == "non_ascii"
    assert r.violations[0].line == 3


def test_extract_first_code_block_js_fence():
    text = "Here is the code:\n```js\nvar x = 1;\n```\n"
    code, lang = extract_first_code_block(text)
    assert code == "var x = 1;"
    assert lang == "js"


def test_extract_first_code_block_unlabeled_fence():
    text = "```\nvar x = 1;\n```"
    code, lang = extract_first_code_block(text)
    assert code == "var x = 1;"
    assert lang == ""


def test_extract_first_code_block_no_fence():
    assert extract_first_code_block("just prose") == (None, None)


def test_extract_first_code_block_wrong_language():
    text = "```python\nprint('hi')\n```"
    code, lang = extract_first_code_block(text)
    assert code is None
    assert lang == "wrong_language"


def test_extract_first_code_block_multiple_fences_picks_first_js():
    text = "```python\nx = 1\n```\n```js\nvar y = 2;\n```"
    code, lang = extract_first_code_block(text)
    assert code == "var y = 2;"
    assert lang == "js"
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```python
"""SuiteScriptLinter orchestrator + code-block extraction + non-ASCII pre-pass."""
from __future__ import annotations

import re
import time
from typing import Optional

from src.backend.validators.checkers.base import LintResult, Violation

FENCE_RE = re.compile(r"```(\w*)\n(.*?)```", re.DOTALL)
VALID_LANGUAGES = {"js", "javascript", ""}
NON_ASCII_RE = re.compile(r"[^\x00-\x7f]")


def extract_first_code_block(text: str) -> tuple[Optional[str], Optional[str]]:
    """Return (code, language) of the first matching fence.

    - No fence: (None, None)
    - js/javascript/unlabeled: (code, lang)
    - Wrong language: (None, "wrong_language")
    - Multiple fences: first js/javascript/unlabeled block
    """
    matches = FENCE_RE.findall(text)
    if not matches:
        return (None, None)
    # First valid-language block wins; if none, flag wrong_language
    for lang, code in matches:
        if lang.lower() in VALID_LANGUAGES:
            if not code.strip():
                return (None, None)
            return (code.strip("\n"), lang.lower())
    return (None, "wrong_language")


class SuiteScriptLinter:
    def __init__(self, checkers: list | None = None):
        if checkers is None:
            from src.backend.validators.checkers.record_type import RecordTypeChecker
            from src.backend.validators.checkers.module import ModuleChecker
            from src.backend.validators.checkers.script_type import ScriptTypeChecker
            from src.backend.validators.checkers.search_api import SearchApiChecker
            checkers = [
                RecordTypeChecker(),
                ModuleChecker(),
                ScriptTypeChecker(),
                SearchApiChecker(),
            ]
        self.checkers = checkers

    def lint(self, code: str) -> LintResult:
        t0 = time.monotonic()
        if not code:
            return LintResult(valid=True, violations=[], elapsed_ms=0)

        # Non-ASCII pre-pass
        m = NON_ASCII_RE.search(code)
        if m:
            line = code[: m.start()].count("\n") + 1
            v = Violation(
                category="non_ascii",
                identifier="<non-ASCII code point>",
                line=line,
                suggestions=[],
                message="Code contains non-ASCII characters; NetSuite identifiers must be ASCII",
            )
            return LintResult(valid=False, violations=[v],
                              elapsed_ms=int((time.monotonic() - t0) * 1000))

        violations: list[Violation] = []
        for checker in self.checkers:
            violations.extend(checker.check(code))

        return LintResult(
            valid=(len(violations) == 0),
            violations=violations,
            elapsed_ms=int((time.monotonic() - t0) * 1000),
        )
```

Note: `SuiteScriptLinter.__init__` imports checkers lazily inside the constructor so (a) `checkers=[]` tests in this chunk run without Wave 3 classes existing, and (b) default-constructor wiring can be covered by the integration test in Task 3.5.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/arthaBuild/src/backend/validators/linter.py apps/arthaBuild/tests/validators/test_linter.py
git commit -m "feat(arthaBuild): SuiteScriptLinter orchestrator + code-block extraction"
```

---

## Chunk 3: Wave 3 — Individual Checkers

Goal: four concrete checkers, each with ≥16 unit tests (8 hallucinated + 8 valid). At end of wave, default `SuiteScriptLinter()` constructor works end-to-end.

### Task 3.1: `RecordTypeChecker`

**Files:**
- Create: `apps/arthaBuild/src/backend/validators/checkers/record_type.py`
- Create: `apps/arthaBuild/tests/validators/test_record_type.py`

- [ ] **Step 1: Write failing tests — 8 hallucinated + 8 valid**

Hallucinated (sourced from eval worst-10):
- `record.Type.RECEIVING` (E-2)
- `record.Type.VENDOR_INVOICE` (E-2)
- `record.Type.CURRENCY_REVALUATION` (E-8)
- `record.Type.RECEIVING_VOUCHER` (near-miss)
- `record.Type.SALE_ORDER` (typo)
- `record.Type.BILLING_SCHEDULE_LINE` (fabricated)
- `record.Type.REVRECRULE` (fabricated)
- `record.Type.CUSTOMER_LIST` (fabricated)

Valid:
- `record.Type.SALES_ORDER`, `.INVOICE`, `.CUSTOMER`, `.VENDOR_BILL`, `.ITEM_RECEIPT`, `.ITEM_FULFILLMENT`, `.PAYMENT`, `.CREDIT_MEMO`

```python
import pytest
from src.backend.validators.checkers.record_type import RecordTypeChecker

CHECKER = RecordTypeChecker()

@pytest.mark.parametrize("bad", [
    "RECEIVING", "VENDOR_INVOICE", "CURRENCY_REVALUATION",
    "RECEIVING_VOUCHER", "SALE_ORDER", "BILLING_SCHEDULE_LINE",
    "REVRECRULE", "CUSTOMER_LIST",
])
def test_hallucinated_flagged(bad):
    code = f"var r = record.load({{type: record.Type.{bad}, id: 1}});"
    violations = CHECKER.check(code)
    assert len(violations) == 1
    assert violations[0].identifier == bad
    assert violations[0].category == "record_type"

@pytest.mark.parametrize("good", [
    "SALES_ORDER", "INVOICE", "CUSTOMER", "VENDOR_BILL",
    "ITEM_RECEIPT", "ITEM_FULFILLMENT", "PAYMENT", "CREDIT_MEMO",
])
def test_valid_passes(good):
    code = f"var r = record.load({{type: record.Type.{good}, id: 1}});"
    violations = CHECKER.check(code)
    assert violations == []
```

- [ ] **Step 2: Run — expect FAIL (ImportError)**

- [ ] **Step 3: Implement**

```python
"""record.Type.* enum checker."""
from __future__ import annotations

import re

from src.backend.validators.checkers.base import Checker
from src.backend.validators.whitelist import RECORD_TYPES

_PATTERN = re.compile(r"record\.Type\.([A-Z_]+)")


class RecordTypeChecker(Checker):
    category = "record_type"

    def extract(self, code: str) -> list[tuple[str, int]]:
        out: list[tuple[str, int]] = []
        for line_no, line in enumerate(code.splitlines(), 1):
            for m in _PATTERN.finditer(line):
                out.append((m.group(1), line_no))
        return out

    def whitelist(self) -> set[str]:
        return RECORD_TYPES
```

- [ ] **Step 4: Run — all 16 tests should PASS**

If any valid-fixture test fails, that record type is missing from the whitelist — investigate and expand `extract_record_types()` in `build_whitelist.py`, regenerate, commit.

- [ ] **Step 5: Commit**

```bash
git add apps/arthaBuild/src/backend/validators/checkers/record_type.py apps/arthaBuild/tests/validators/test_record_type.py
git commit -m "feat(arthaBuild): RecordTypeChecker with 16 fixtures"
```

### Task 3.2: `ModuleChecker`

**Files:**
- Create: `apps/arthaBuild/src/backend/validators/checkers/module.py`
- Create: `apps/arthaBuild/tests/validators/test_module.py`

- [ ] **Step 1: Write failing tests — 8 hallucinated + 8 valid**

Hallucinated:
- `N/currencyRevaluation` (E-8)
- `N/customList` (fabricated)
- `N/banking/wire` (plausible-but-nonexistent)
- `N/record/legacy` (fabricated sub-path)
- `N/search/advanced` (fabricated sub-path)
- `N/suiteletBuilder` (fabricated)
- `N/transaction` (should be `N/record`)
- `N/sqlQuery` (fabricated)

Valid:
- `N/record`, `N/search`, `N/ui/serverWidget`, `N/runtime`, `N/log`, `N/http`, `N/email`, `N/task`

```python
import pytest
from src.backend.validators.checkers.module import ModuleChecker

CHECKER = ModuleChecker()

@pytest.mark.parametrize("bad", [
    "N/currencyRevaluation", "N/customList", "N/banking/wire",
    "N/record/legacy", "N/search/advanced", "N/suiteletBuilder",
    "N/transaction", "N/sqlQuery",
])
def test_hallucinated_flagged(bad):
    code = f"define(['{bad}'], function(m) {{ return {{}}; }});"
    violations = CHECKER.check(code)
    assert len(violations) == 1
    assert violations[0].identifier == bad

@pytest.mark.parametrize("good", [
    "N/record", "N/search", "N/ui/serverWidget", "N/runtime",
    "N/log", "N/http", "N/email", "N/task",
])
def test_valid_passes(good):
    code = f"define(['{good}'], function(m) {{ return {{}}; }});"
    violations = CHECKER.check(code)
    assert violations == []

def test_require_syntax_also_extracted():
    code = "require(['N/banking/wire'], function(w) {});"
    violations = CHECKER.check(code)
    assert len(violations) == 1
```

- [ ] **Step 2: Implement**

```python
"""N/* module checker."""
from __future__ import annotations

import re

from src.backend.validators.checkers.base import Checker
from src.backend.validators.whitelist import MODULES

_PATTERNS = [
    re.compile(r"""define\(\s*\[\s*['"]([^'"]+)['"]"""),
    re.compile(r"""require\(\s*\[\s*['"]([^'"]+)['"]"""),
]


class ModuleChecker(Checker):
    category = "module"

    def extract(self, code: str) -> list[tuple[str, int]]:
        out: list[tuple[str, int]] = []
        for line_no, line in enumerate(code.splitlines(), 1):
            for pat in _PATTERNS:
                for m in pat.finditer(line):
                    out.append((m.group(1), line_no))
        return out

    def whitelist(self) -> set[str]:
        return MODULES
```

- [ ] **Step 3: Run — expect PASS (all 17 tests)**

- [ ] **Step 4: Commit**

```bash
git add apps/arthaBuild/src/backend/validators/checkers/module.py apps/arthaBuild/tests/validators/test_module.py
git commit -m "feat(arthaBuild): ModuleChecker with 17 fixtures"
```

### Task 3.3: `ScriptTypeChecker`

**Files:**
- Create: `apps/arthaBuild/src/backend/validators/checkers/script_type.py`
- Create: `apps/arthaBuild/tests/validators/test_script_type.py`

- [ ] **Step 1: Write failing tests**

Covers BOTH `@NScriptType` annotations and `search.Type.*` enums (both are category 4 in the V1 spec).

Hallucinated `@NScriptType`: `SavedSearch` (B-7), `BatchProcess`, `CustomScript`, `DataScript`
Hallucinated `search.Type`: `ORDER`, `BILL`, `ACCOUNTING`, `CUSTOMER_SEARCH`

Valid `@NScriptType`: `UserEventScript`, `Scheduled`, `MapReduce`, `Suitelet`, `ClientScript`, `Restlet`, `WorkflowAction`, `MassUpdate`
Valid `search.Type`: (pick top 8 from whitelist — likely `TRANSACTION`, `CUSTOMER`, `ITEM`, `EMPLOYEE`, `VENDOR`, `SALES_ORDER`, `INVOICE`, `CONTACT`)

```python
import pytest
from src.backend.validators.checkers.script_type import ScriptTypeChecker

CHECKER = ScriptTypeChecker()

BAD_SCRIPT_TYPES = ["SavedSearch", "BatchProcess", "CustomScript", "DataScript"]
GOOD_SCRIPT_TYPES = ["UserEventScript", "Scheduled", "MapReduce", "Suitelet",
                     "ClientScript", "Restlet", "WorkflowAction", "MassUpdate"]
BAD_SEARCH_TYPES = ["ORDER", "BILL", "ACCOUNTING", "CUSTOMER_SEARCH"]

@pytest.mark.parametrize("bad", BAD_SCRIPT_TYPES)
def test_bad_script_type(bad):
    code = f"/** @NApiVersion 2.1 * @NScriptType {bad} */"
    violations = CHECKER.check(code)
    assert len(violations) == 1

@pytest.mark.parametrize("good", GOOD_SCRIPT_TYPES)
def test_good_script_type(good):
    code = f"/** @NApiVersion 2.1 * @NScriptType {good} */"
    violations = CHECKER.check(code)
    assert violations == []

@pytest.mark.parametrize("bad", BAD_SEARCH_TYPES)
def test_bad_search_type(bad):
    code = f"var r = search.create({{type: search.Type.{bad}}});"
    violations = CHECKER.check(code)
    assert len(violations) == 1
```

- [ ] **Step 2: Implement**

```python
"""@NScriptType + search.Type.* checker (spec category 4)."""
from __future__ import annotations

import re

from src.backend.validators.checkers.base import Checker, Violation
from src.backend.validators.whitelist import SCRIPT_TYPES, SEARCH_TYPES

_SCRIPT_TYPE_RE = re.compile(r"@NScriptType\s+(\w+)")
_SEARCH_TYPE_RE = re.compile(r"search\.Type\.([A-Z_]+)")


class ScriptTypeChecker(Checker):
    category = "script_type"

    def extract(self, code: str) -> list[tuple[str, int]]:
        return []  # check() is overridden

    def whitelist(self) -> set[str]:
        return SCRIPT_TYPES | SEARCH_TYPES

    def check(self, code: str) -> list[Violation]:
        from src.backend.validators.ast_utils import nearest
        out: list[Violation] = []
        for line_no, line in enumerate(code.splitlines(), 1):
            for m in _SCRIPT_TYPE_RE.finditer(line):
                ident = m.group(1)
                if ident not in SCRIPT_TYPES:
                    out.append(Violation(
                        category="script_type",
                        identifier=ident,
                        line=line_no,
                        suggestions=nearest(ident, SCRIPT_TYPES, k=3),
                        message=f"{ident!r} is not a valid @NScriptType",
                    ))
            for m in _SEARCH_TYPE_RE.finditer(line):
                ident = m.group(1)
                if ident not in SEARCH_TYPES:
                    out.append(Violation(
                        category="search_type",
                        identifier=ident,
                        line=line_no,
                        suggestions=nearest(ident, SEARCH_TYPES, k=3),
                        message=f"{ident!r} is not a valid search.Type",
                    ))
        return out
```

- [ ] **Step 3: Run — expect PASS**

- [ ] **Step 4: Commit**

```bash
git add apps/arthaBuild/src/backend/validators/checkers/script_type.py apps/arthaBuild/tests/validators/test_script_type.py
git commit -m "feat(arthaBuild): ScriptTypeChecker covers @NScriptType + search.Type"
```

### Task 3.4: `SearchApiChecker`

**Files:**
- Create: `apps/arthaBuild/src/backend/validators/checkers/search_api.py`
- Create: `apps/arthaBuild/tests/validators/test_search_api.py`

- [ ] **Step 1: Write failing tests — include the member-expression false-positive guard**

```python
import pytest
from src.backend.validators.checkers.search_api import SearchApiChecker

CHECKER = SearchApiChecker()

@pytest.mark.parametrize("bad", [
    "columns",  # B-4 — is a key, not a method
    "lookup",   # near-miss of lookupFields
    "query",    # plausible
    "find",
    "fetch",
    "update",
    "execute",
    "select",
])
def test_bad_search_api(bad):
    code = f"var x = search.{bad}({{type: 'customer'}});"
    violations = CHECKER.check(code)
    assert len(violations) == 1
    assert violations[0].identifier == bad

@pytest.mark.parametrize("good", [
    "create", "load", "lookupFields", "duplicates",
    "global", "delete", "run", "save",
])
def test_good_search_api(good):
    code = f"var x = search.{good}({{type: 'customer'}});"
    violations = CHECKER.check(code)
    assert violations == []

def test_member_expression_not_flagged():
    """result.search.getValue(...) should not trigger — 'search' here is a property."""
    code = "var v = result.search.getValue({name: 'foo'});"
    violations = CHECKER.check(code)
    assert violations == []
```

- [ ] **Step 2: Implement with anchored regex**

```python
"""search.* method checker (anchored to avoid member-expression false positives)."""
from __future__ import annotations

import re

from src.backend.validators.checkers.base import Checker
from src.backend.validators.whitelist import SEARCH_APIS

_PATTERN = re.compile(r"(?:^|[\s=;,(])search\.([a-z][A-Za-z]*)\s*\(")


class SearchApiChecker(Checker):
    category = "search_api"

    def extract(self, code: str) -> list[tuple[str, int]]:
        out: list[tuple[str, int]] = []
        for line_no, line in enumerate(code.splitlines(), 1):
            for m in _PATTERN.finditer(line):
                out.append((m.group(1), line_no))
        return out

    def whitelist(self) -> set[str]:
        return SEARCH_APIS
```

- [ ] **Step 3: Run — all 17 tests should PASS**

If `test_good_search_api` fails for one of `create`/`load`/etc., the whitelist missed the method — expand `extract_search_apis()`.

- [ ] **Step 4: Commit**

```bash
git add apps/arthaBuild/src/backend/validators/checkers/search_api.py apps/arthaBuild/tests/validators/test_search_api.py
git commit -m "feat(arthaBuild): SearchApiChecker with member-expression guard"
```

### Task 3.5: Default-constructor integration test

**Files:**
- Modify: `apps/arthaBuild/tests/validators/test_linter.py` (add)

- [ ] **Step 1: Add end-to-end test**

```python
def test_linter_default_constructor_end_to_end():
    linter = SuiteScriptLinter()  # no args → default 4 checkers
    bad = """
    /** @NApiVersion 2.1 * @NScriptType Scheduled */
    define(['N/record'], function(record) {
        var r = record.load({type: record.Type.RECEIVING, id: 1});
        return { execute: function() {} };
    });
    """
    r = linter.lint(bad)
    assert r.valid is False
    # exactly one violation: RECEIVING
    assert len(r.violations) == 1
    assert r.violations[0].identifier == "RECEIVING"
    assert r.violations[0].category == "record_type"


def test_linter_clean_code_passes():
    linter = SuiteScriptLinter()
    good = """
    /** @NApiVersion 2.1 * @NScriptType Scheduled */
    define(['N/record'], function(record) {
        var r = record.load({type: record.Type.SALES_ORDER, id: 1});
        return { execute: function() {} };
    });
    """
    r = linter.lint(good)
    assert r.valid is True
```

- [ ] **Step 2: Run — expect PASS**

- [ ] **Step 3: Run the entire validator test suite**

```bash
cd apps/arthaBuild
pytest tests/validators/ -v
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/arthaBuild/tests/validators/test_linter.py
git commit -m "test(arthaBuild): end-to-end SuiteScriptLinter integration"
```

---

## Chunk 4: Wave 4 — Re-Prompt Loop + rawapi.py Integration

Goal: wire the validator into `generate_suitescript` with the bounded re-prompt loop, budget-aware early exit, and refusal message. Introduce constants.

### Task 4.1: `reprompt.py` — refusal, payload, metrics helper, validation loop

**Files:**
- Create: `apps/arthaBuild/src/backend/validators/reprompt.py`
- Create: `apps/arthaBuild/tests/validators/test_reprompt.py`

This file exposes four pure functions so that the `rawapi.py` integration stays ≤20 lines and the integration test can exercise the real loop.

- [ ] **Step 1: Write failing tests for pure-string behavior**

```python
from src.backend.validators.checkers.base import LintResult, Violation
from src.backend.validators.reprompt import (
    build_refusal_message,
    build_reprompt_payload,
    new_metrics,
    run_validation_loop,
)


def test_refusal_message_lists_violations():
    r = LintResult(valid=False, violations=[
        Violation(category="record_type", identifier="RECEIVING", line=3,
                  suggestions=["ITEM_RECEIPT"], message=""),
    ])
    msg = build_refusal_message(r)
    assert "RECEIVING" in msg
    assert "ITEM_RECEIPT" in msg
    assert "record type" in msg  # category_human


def test_refusal_message_omits_invalid_code():
    r = LintResult(valid=False, violations=[
        Violation(category="record_type", identifier="X", line=1,
                  suggestions=[], message=""),
    ])
    msg = build_refusal_message(r)
    # The original invalid code is NOT shown
    assert "```" not in msg


def test_reprompt_payload_includes_relevant_slice_only():
    r = LintResult(valid=False, violations=[
        Violation(category="record_type", identifier="RECEIVING", line=1,
                  suggestions=["ITEM_RECEIPT"], message=""),
    ])
    payload = build_reprompt_payload(user_input="create invoice", result=r)
    assert "RECEIVING" in payload
    # Injects record_type slice
    assert "Valid record types" in payload
    # Does NOT inject unrelated slices
    assert "Valid modules" not in payload
    assert "Valid @NScriptType values" not in payload
    assert "Valid search.Type values" not in payload
    assert "Valid search.* methods" not in payload


def test_new_metrics_has_all_keys():
    m = new_metrics()
    assert m["outcome"] == "clean"
    assert m["violations_initial"] is None
    assert m["violations_reprompt_1"] is None
    assert m["violations_reprompt_2"] is None
    assert m["validator_elapsed_ms"] == 0
    assert m["categories_hit"] == []
```

- [ ] **Step 2: Implement**

```python
"""Re-prompt template, refusal message, metrics helper, and validation loop.

The loop is extracted as a pure function so the rawapi.py integration stays
≤20 lines and the integration test can exercise the real code path.
"""
from __future__ import annotations

import time
from typing import Any, Awaitable, Callable, Union

from src.backend.validators.checkers.base import LintResult
from src.backend.validators.linter import SuiteScriptLinter, extract_first_code_block
from src.backend.validators.whitelist import (
    RECORD_TYPES, MODULES, SCRIPT_TYPES, SEARCH_TYPES, SEARCH_APIS,
)

REPROMPT_MAX_ATTEMPTS = 2
PIPELINE_BUDGET_SECONDS = 90  # nginx prod timeout (120s) minus 30s safety margin

_CATEGORY_HUMAN = {
    "record_type": "record type",
    "module": "module path",
    "script_type": "script type annotation",
    "search_type": "search type",
    "search_api": "search API method",
    "non_ascii": "ASCII identifier",
}

_CATEGORY_WHITELIST = {
    "record_type": ("Valid record types", RECORD_TYPES),
    "module": ("Valid modules", MODULES),
    "script_type": ("Valid @NScriptType values", SCRIPT_TYPES),
    "search_type": ("Valid search.Type values", SEARCH_TYPES),
    "search_api": ("Valid search.* methods", SEARCH_APIS),
}


def build_refusal_message(result: LintResult) -> str:
    lines = [
        "I couldn't verify every NetSuite identifier in the script I was about to return,",
        "so I'm holding it back rather than risk sending you something that won't run.",
        "",
        "What I flagged:",
    ]
    for v in result.violations:
        hum = _CATEGORY_HUMAN.get(v.category, v.category)
        sug = ", ".join(v.suggestions[:3]) if v.suggestions else "no close match"
        lines.append(f"  • Line {v.line}: {v.identifier} — not a valid {hum}")
        lines.append(f"    Closest known values: {sug}")
    lines.extend([
        "",
        "You can:",
        "  • Rephrase the request with more specific record names, or",
        "  • Check the NetSuite 2024.2 Records Browser for the exact identifier,",
        "    then try again.",
    ])
    return "\n".join(lines)


def build_reprompt_payload(user_input: str, result: LintResult) -> str:
    """Re-prompt message injecting only the relevant category slices."""
    categories_hit = {v.category for v in result.violations}
    lines = [
        "Your previous response contained invalid NetSuite identifiers:",
        "",
    ]
    for v in result.violations:
        hum = _CATEGORY_HUMAN.get(v.category, v.category)
        sug = ", ".join(v.suggestions[:3]) if v.suggestions else "(none)"
        lines.append(f"- Line {v.line}: {v.identifier!r} is not a valid {hum}. "
                     f"Did you mean: {sug}?")
    lines.append("")
    for cat in categories_hit:
        if cat in _CATEGORY_WHITELIST:
            label, wl = _CATEGORY_WHITELIST[cat]
            lines.append(f"{label}:")
            lines.append(", ".join(sorted(wl)))
            lines.append("")
    lines.append(f"Original request: {user_input}")
    lines.append("Regenerate the complete script using only valid identifiers.")
    return "\n".join(lines)


def new_metrics() -> dict[str, Any]:
    """Fresh metrics dict for a generate_suitescript call."""
    return {
        "validator_elapsed_ms": 0,
        "violations_initial": None,
        "violations_reprompt_1": None,
        "violations_reprompt_2": None,
        "outcome": "clean",
        "categories_hit": [],
    }


PipelineFn = Callable[[str], Union[str, Awaitable[str]]]


async def run_validation_loop(
    user_input: str,
    initial_response: str,
    pipeline: PipelineFn,
    pipeline_t0: float,
    linter: SuiteScriptLinter | None = None,
) -> tuple[str, dict[str, Any]]:
    """Run validator + bounded re-prompt loop.

    Returns `(final_response_text, metrics)`.
    - If no code block is present, returns the initial response untouched.
    - If the initial code is valid, returns it as-is (metrics.outcome='clean').
    - Re-prompts up to REPROMPT_MAX_ATTEMPTS times, breaking early if the
      wall-clock budget (PIPELINE_BUDGET_SECONDS from pipeline_t0) is exceeded.
    - On final failure, returns build_refusal_message(result) (metrics.outcome='hard_blocked').

    The `pipeline` callable may be sync or async; both are awaited safely.
    """
    import inspect
    linter = linter or SuiteScriptLinter()
    metrics = new_metrics()
    response_text = initial_response
    code, _ = extract_first_code_block(response_text)
    if code is None:
        return response_text, metrics

    result = linter.lint(code)
    metrics["validator_elapsed_ms"] = result.elapsed_ms
    metrics["violations_initial"] = len(result.violations)
    metrics["categories_hit"] = sorted({v.category for v in result.violations})

    attempts = 0
    while not result.valid and attempts < REPROMPT_MAX_ATTEMPTS:
        if time.monotonic() - pipeline_t0 > PIPELINE_BUDGET_SECONDS:
            break
        attempts += 1
        reprompt = build_reprompt_payload(user_input, result)
        raw = pipeline(reprompt)
        response_text = await raw if inspect.isawaitable(raw) else raw
        code, _ = extract_first_code_block(response_text)
        if code is None:
            break
        result = linter.lint(code)
        metrics[f"violations_reprompt_{attempts}"] = len(result.violations)

    if result.valid:
        metrics["outcome"] = "clean" if attempts == 0 else "recovered"
        return response_text, metrics

    metrics["outcome"] = "hard_blocked"
    return build_refusal_message(result), metrics
```

- [ ] **Step 3: Run — expect PASS**

- [ ] **Step 4: Commit**

```bash
git add apps/arthaBuild/src/backend/validators/reprompt.py apps/arthaBuild/tests/validators/test_reprompt.py
git commit -m "feat(arthaBuild): reprompt template + refusal message"
```

### Task 4.2: Expose package API

**Files:**
- Modify: `apps/arthaBuild/src/backend/validators/__init__.py`

- [ ] **Step 1: Add public exports**

```python
"""Zero-hallucination validator gate for arthaBuild."""
from src.backend.validators.checkers.base import LintResult, Violation
from src.backend.validators.linter import SuiteScriptLinter, extract_first_code_block
from src.backend.validators.reprompt import build_refusal_message, build_reprompt_payload

__all__ = [
    "SuiteScriptLinter",
    "LintResult",
    "Violation",
    "extract_first_code_block",
    "build_refusal_message",
    "build_reprompt_payload",
]
```

- [ ] **Step 2: Smoke-test import**

```bash
cd apps/arthaBuild
python -c "from src.backend.validators import SuiteScriptLinter, build_refusal_message; print('ok')"
```

Expected: `ok`.

- [ ] **Step 3: Commit**

```bash
git add apps/arthaBuild/src/backend/validators/__init__.py
git commit -m "feat(arthaBuild): validators package public API"
```

### Task 4.3: Wire into `rawapi.py` (≤20 lines via `run_validation_loop`)

**Files:**
- Modify: `apps/arthaBuild/src/backend/rawapi.py` (around lines 542-578)

- [ ] **Step 1: Read the current `generate_suitescript` block and identify the `run_llm_pipeline` call-site**

```bash
sed -n '540,600p' apps/arthaBuild/src/backend/rawapi.py
grep -n "run_llm_pipeline\|async def generate_suitescript\|def generate_suitescript" apps/arthaBuild/src/backend/rawapi.py
```

Confirm **both** of the following before editing:
- Whether the enclosing function is `async def` or plain `def`. `run_validation_loop` is `async` and must be `await`ed from an async context.
- Whether `run_llm_pipeline` is a coroutine (`async def`) or a sync callable. `run_validation_loop` accepts either via the `PipelineFn` protocol — pass the reference as-is; do not wrap it.

If the enclosing function is sync, pick ONE of these adapters and document the choice inline:
1. **Preferred:** convert the enclosing handler to `async def` (matches the rest of the router).
2. Fallback: wrap the call in `asyncio.run(run_validation_loop(...))`. Only use this if (1) would cascade into callers.

- [ ] **Step 2: Add imports near the top of `rawapi.py`**

```python
import time
from src.backend.validators import extract_first_code_block
from src.backend.validators.reprompt import run_validation_loop
```

Note: `REPROMPT_MAX_ATTEMPTS` and `PIPELINE_BUDGET_SECONDS` live in `reprompt.py` — do not duplicate them here.

- [ ] **Step 3: Replace the intent block (current ~542-578) with the ≤20-line integration**

```python
if intent == "generate_suitescript":
    # existing quota + prompt-build steps unchanged
    pipeline_t0 = time.monotonic()  # captured BEFORE the initial pipeline call
    raw = run_llm_pipeline(user_input)
    import inspect
    initial_response = await raw if inspect.isawaitable(raw) else raw
    response_text, validator_metrics = await run_validation_loop(
        user_input=user_input,
        initial_response=initial_response,
        pipeline=run_llm_pipeline,
        pipeline_t0=pipeline_t0,
    )
    logger.info("generate_suitescript validator metrics: %s", validator_metrics)
    # existing persist + return unchanged
```

This block is ~14 lines (under the ~20-line spec budget). The `pipeline_t0` is captured before the initial `run_llm_pipeline(user_input)` call so the 90 s wall-clock budget includes it.

- [ ] **Step 4: Verify line-count budget and single-intent-block invariant**

```bash
grep -n "if intent == \"generate_suitescript\":" apps/arthaBuild/src/backend/rawapi.py | wc -l
```

Expected: `1` (exactly one intent block; guards against accidental duplication).

- [ ] **Step 5: Run existing test suite to confirm no regression**

```bash
cd apps/arthaBuild
pytest tests/ -v -x --ignore=tests/eval --ignore=tests/validators 2>&1 | tail -30
```

Expected: no new failures vs baseline (the known 2 pre-existing failures — nginx HTTPS dev conf, alembic heads env — are acceptable).

- [ ] **Step 6: Commit**

```bash
git add apps/arthaBuild/src/backend/rawapi.py
git commit -m "feat(arthaBuild): wire zero-hallucination gate into generate_suitescript"
```

### Task 4.4: Integration test via `run_validation_loop`

**Files:**
- Create: `apps/arthaBuild/tests/validators/test_integration.py`

This test exercises the **same** `run_validation_loop` that `rawapi.py` calls, so a regression in either path is caught here.

- [ ] **Step 1: Write the integration test**

```python
"""End-to-end via run_validation_loop — the exact function rawapi.py invokes."""
import time
import pytest

from src.backend.validators.reprompt import run_validation_loop


def _wrap_as_fence(code: str) -> str:
    return f"```js\n{code}\n```"


@pytest.mark.asyncio
async def test_clean_initial_response_is_passthrough():
    pipeline_calls = {"n": 0}

    def pipeline(prompt: str) -> str:
        pipeline_calls["n"] += 1
        return _wrap_as_fence("var x = record.Type.SALES_ORDER;")

    response, metrics = await run_validation_loop(
        user_input="create SO",
        initial_response=_wrap_as_fence("var x = record.Type.SALES_ORDER;"),
        pipeline=pipeline,
        pipeline_t0=time.monotonic(),
    )
    assert metrics["outcome"] == "clean"
    assert metrics["violations_initial"] == 0
    assert pipeline_calls["n"] == 0  # no re-prompt needed
    assert "SALES_ORDER" in response


@pytest.mark.asyncio
async def test_recovery_after_one_reprompt():
    """Initial response hallucinated; re-prompt #1 returns valid code."""
    pipeline_calls = {"n": 0}

    def pipeline(prompt: str) -> str:
        pipeline_calls["n"] += 1
        return _wrap_as_fence("var x = record.Type.SALES_ORDER;")

    bad_initial = _wrap_as_fence("var x = record.Type.RECEIVING;")
    response, metrics = await run_validation_loop(
        user_input="create item receipt",
        initial_response=bad_initial,
        pipeline=pipeline,
        pipeline_t0=time.monotonic(),
    )
    assert metrics["outcome"] == "recovered"
    assert metrics["violations_initial"] >= 1
    assert metrics["violations_reprompt_1"] == 0
    assert pipeline_calls["n"] == 1
    assert "RECEIVING" not in response  # bad identifier gone
    assert "SALES_ORDER" in response


@pytest.mark.asyncio
async def test_hard_block_after_max_attempts():
    """All 3 LLM calls (initial + 2 re-prompts) return bad code → refusal message."""
    pipeline_calls = {"n": 0}

    def always_bad(prompt: str) -> str:
        pipeline_calls["n"] += 1
        return _wrap_as_fence("var x = record.Type.RECEIVING;")

    bad_initial = always_bad("initial")
    response, metrics = await run_validation_loop(
        user_input="create item receipt",
        initial_response=bad_initial,
        pipeline=always_bad,
        pipeline_t0=time.monotonic(),
    )
    assert metrics["outcome"] == "hard_blocked"
    assert metrics["violations_initial"] >= 1
    assert metrics["violations_reprompt_1"] is not None
    assert metrics["violations_reprompt_2"] is not None
    assert pipeline_calls["n"] == 3  # 1 initial (above) + 2 re-prompts
    # Refusal message, not any code
    assert "```" not in response
    assert "couldn't verify" in response.lower() or "hold" in response.lower()


@pytest.mark.asyncio
async def test_budget_exit_stops_reprompting():
    """Simulate an already-exhausted budget; loop should not re-prompt."""
    def pipeline(prompt: str) -> str:
        raise AssertionError("pipeline should not be called — budget exceeded")

    bad_initial = _wrap_as_fence("var x = record.Type.RECEIVING;")
    response, metrics = await run_validation_loop(
        user_input="x",
        initial_response=bad_initial,
        pipeline=pipeline,
        pipeline_t0=time.monotonic() - 999,  # already past budget
    )
    assert metrics["outcome"] == "hard_blocked"
    assert metrics["violations_reprompt_1"] is None  # never attempted
```

- [ ] **Step 2: Run — expect PASS**

```bash
cd apps/arthaBuild
pytest tests/validators/test_integration.py -v
```

Note: requires `pytest-asyncio`. If not already in `requirements-dev.txt`, add it in this step and commit both.

- [ ] **Step 3: Commit**

```bash
git add apps/arthaBuild/tests/validators/test_integration.py
git commit -m "test(arthaBuild): integration test for clean / recover / hard-block / budget paths"
```

---

## Chunk 5: Wave 5 — Stress Suite + 200-Case Eval

Goal: hand-author 160 adversarial cases (40 per category), run the 200-case suite with the validator enabled, confirm zero invalid identifiers slip through, and verify secondary ceilings.

**Stress-case JSONL schema** (used by every `*.jsonl` file in this chunk):

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | `STRESS-{CAT}-NNN` — unique per file (e.g. `STRESS-RT-001`, `STRESS-MOD-001`) |
| `prompt` | string | The user-facing request that is expected to tempt the LLM into hallucination |
| `adversarial_target` | string | The specific identifier that must NOT appear in the committed whitelist (this is what the verify step asserts) |
| `target_category` | string | One of `record_type` / `module` / `script_type` / `search_type` / `search_api` |
| `strategy` | string | One of `near_miss` / `plausible_nonexistent` / `typo_of_real` / `cross_module_confusion` |

The 40-case split per file is **10 per strategy**.

### Task 5.1: Author 40 `record_type` stress cases

**Files:**
- Create: `apps/arthaBuild/tests/eval/stress/record_type.jsonl`

- [ ] **Step 1: Write 10 near-miss cases**

Each case must target an identifier that is **NOT** in `RECORD_TYPES`. Spot-check each adversarial_target against the whitelist before committing. Target ideas (anything close to but not a valid value): `RECEIVING`, `RECEIVING_VOUCHER`, `VENDOR_INVOICE`, `CURRENCY_REVALUATION`, `SALES_INVOICE`, `BILL_RECEIPT`, `PAYMENT_RECEIPT`, `CUSTOMER_DEPOSIT_APPLICATION`, `ITEM_TRANSFER`, `ITEM_ADJUSTMENT`. Adapt to reach 10 unique near-miss targets.

```json
{"id":"STRESS-RT-001","prompt":"Load a Receiving Voucher using record.Type","adversarial_target":"RECEIVING_VOUCHER","target_category":"record_type","strategy":"near_miss"}
{"id":"STRESS-RT-002","prompt":"Load a Vendor Invoice using record.Type","adversarial_target":"VENDOR_INVOICE","target_category":"record_type","strategy":"near_miss"}
```

(authored count: 10 lines total)

- [ ] **Step 2: Write 10 plausible-but-nonexistent cases** — identifiers that sound like real NetSuite records but have never existed. Target ideas: `AUTOMATED_AUDIT_LOG`, `COMPLIANCE_CERT`, `PROJECT_RETAINER`, `CUSTOMER_ADVOCACY`, `SUBSCRIPTION_UPGRADE`, `INVENTORY_SNAPSHOT`, `TAX_EXEMPTION_CERT`, `REGULATORY_FILING`, `COST_CENTER`, `APPROVAL_CHAIN`. Adapt as needed.
- [ ] **Step 3: Write 10 typo-of-real cases** (e.g. `SALE_ORDER`, `CUTOMER`, `INVOCE`, `SALLESORDER`, `SALESORDR`, `CUSOMER`, `ITEMRECEPT`, `VENDOBRIL`, `TRANSFRORDER`, `PUCHASEORDER`)
- [ ] **Step 4: Write 10 cross-module confusion cases** (e.g. treating a search.Type as a record.Type). Target ideas: use search-domain names like `TRANSACTION`, `SEARCH_COLUMN`, `ACCOUNTING_PERIOD_CONFIG`, `WORKFLOW_INSTANCE`, `SAVED_SEARCH`, etc. — verify none are in RECORD_TYPES.
- [ ] **Step 5: Verify all 40 adversarial_targets are absent from `RECORD_TYPES`**

```bash
python -c "
import json
from src.backend.validators.whitelist import RECORD_TYPES
with open('apps/arthaBuild/tests/eval/stress/record_type.jsonl') as f:
    for line in f:
        c = json.loads(line)
        assert c['adversarial_target'] not in RECORD_TYPES, f\"{c['id']} target is actually valid!\"
print('all 40 targets confirmed adversarial')
"
```

- [ ] **Step 6: Commit**

```bash
git add apps/arthaBuild/tests/eval/stress/record_type.jsonl
git commit -m "test(arthaBuild): 40 record_type stress cases"
```

### Task 5.2: Author 40 `module` stress cases

**Files:**
- Create: `apps/arthaBuild/tests/eval/stress/module.jsonl`

- [ ] **Step 1: Same four-strategy distribution as Task 5.1** (10 near-miss + 10 plausible-nonexistent + 10 typo-of-real + 10 cross-module-confusion), but targeting `N/*` paths that are NOT in `MODULES`.

Near-miss examples: `N/records`, `N/searches`, `N/recordType`
Plausible-but-nonexistent: `N/banking/wire`, `N/compliance/audit`, `N/sql/query`
Typo-of-real: `N/recrd`, `N/serch`, `N/rumtime`
Cross-module confusion: `N/ui/standardForm` (real: `serverWidget`)

- [ ] **Step 2: Verify all 40 targets are absent from `MODULES`**

```bash
python -c "
import json
from src.backend.validators.whitelist import MODULES
with open('apps/arthaBuild/tests/eval/stress/module.jsonl') as f:
    for line in f:
        c = json.loads(line)
        assert c['adversarial_target'] not in MODULES, f\"{c['id']} target is actually valid!\"
print('all 40 targets confirmed adversarial')
"
```

- [ ] **Step 3: Commit**

```bash
git add apps/arthaBuild/tests/eval/stress/module.jsonl
git commit -m "test(arthaBuild): 40 module stress cases"
```

### Task 5.3: Author 40 `script_type` stress cases

**Files:**
- Create: `apps/arthaBuild/tests/eval/stress/script_type.jsonl`

- [ ] **Step 1: Mix `@NScriptType` targets (20) and `search.Type.*` targets (20)**, applying the same four-strategy split within each half (5 near-miss + 5 plausible-nonexistent + 5 typo-of-real + 5 cross-module-confusion per half).

- [ ] **Step 2: Verify all 40 targets are absent from `SCRIPT_TYPES | SEARCH_TYPES`**

```bash
python -c "
import json
from src.backend.validators.whitelist import SCRIPT_TYPES, SEARCH_TYPES
banned = SCRIPT_TYPES | SEARCH_TYPES
with open('apps/arthaBuild/tests/eval/stress/script_type.jsonl') as f:
    for line in f:
        c = json.loads(line)
        assert c['adversarial_target'] not in banned, f\"{c['id']} target is actually valid!\"
print('all 40 targets confirmed adversarial')
"
```

- [ ] **Step 3: Commit**

```bash
git add apps/arthaBuild/tests/eval/stress/script_type.jsonl
git commit -m "test(arthaBuild): 40 script_type stress cases"
```

### Task 5.4: Author 40 `search_api` stress cases

**Files:**
- Create: `apps/arthaBuild/tests/eval/stress/search.jsonl`

- [ ] **Step 1: Target `search.*` methods that are NOT in `SEARCH_APIS`**, applying the same four-strategy distribution (10 near-miss + 10 plausible-nonexistent + 10 typo-of-real + 10 cross-module-confusion).

Examples: `search.columns`, `search.query`, `search.fetch`, `search.lookup`, `search.runPaged`.

- [ ] **Step 2: Verify all 40 targets are absent from `SEARCH_APIS`**

```bash
python -c "
import json
from src.backend.validators.whitelist import SEARCH_APIS
with open('apps/arthaBuild/tests/eval/stress/search.jsonl') as f:
    for line in f:
        c = json.loads(line)
        assert c['adversarial_target'] not in SEARCH_APIS, f\"{c['id']} target is actually valid!\"
print('all 40 targets confirmed adversarial')
"
```

- [ ] **Step 3: Commit**

```bash
git add apps/arthaBuild/tests/eval/stress/search.jsonl
git commit -m "test(arthaBuild): 40 search_api stress cases"
```

### Task 5.5: Build the stress-suite runner

**Files:**
- Create: `apps/arthaBuild/tests/eval/run_stress.py`

- [ ] **Step 1: Scaffold using existing `run_eval.py` infrastructure**

```python
"""Run the 200-case stress suite with validator enabled.

Combines the 40 existing eval cases with 160 adversarial stress cases.
Emits a stress-report.md with success-criterion verdict.
"""
from __future__ import annotations

import json
from pathlib import Path

from tests.eval.run_eval import load_cases, run_case_with_retry  # reuse

STRESS_DIR = Path(__file__).parent / "stress"
EVAL_CASES_DIR = Path(__file__).parent / "cases"


def load_stress_cases() -> list[dict]:
    out = []
    for jsonl in STRESS_DIR.glob("*.jsonl"):
        for line in jsonl.read_text().splitlines():
            if line.strip():
                out.append(json.loads(line))
    return out


def main():
    eval_cases = load_cases(EVAL_CASES_DIR)  # existing 40
    stress_cases = load_stress_cases()       # new 160
    all_cases = eval_cases + stress_cases
    assert len(all_cases) == 200, f"expected 200 cases, got {len(all_cases)}"

    results = []
    for case in all_cases:
        r = run_case_with_retry(case)
        results.append(r)

    # Primary criterion: 0 invalid identifiers in any returned code
    invalid_slipped = [r for r in results
                       if r.get("outcome") == "clean"
                       and r.get("violations_initial", 0) > 0]
    assert len(invalid_slipped) == 0, (
        f"PRIMARY CRITERION FAILED: {len(invalid_slipped)} cases returned "
        "hallucinated code without triggering validator"
    )

    # Secondary ceilings
    total = len(results)
    hard_blocked = sum(1 for r in results if r.get("outcome") == "hard_blocked")
    hard_block_rate = hard_blocked / total
    assert hard_block_rate < 0.10, f"hard_block_rate {hard_block_rate:.2%} exceeds 10%"

    p50_ms = sorted(r.get("validator_elapsed_ms", 0) for r in results)[total // 2]
    assert p50_ms < 50, f"validator_p50_ms {p50_ms} exceeds 50ms"

    print(f"PASS: 0/{total} invalid, hard_block_rate={hard_block_rate:.2%}, p50={p50_ms}ms")


if __name__ == "__main__":
    main()
```

Note: actual adaptation to the real `run_eval.py` signature happens during implementation — use whatever the existing module exports.

- [ ] **Step 2: Commit**

```bash
git add apps/arthaBuild/tests/eval/run_stress.py
git commit -m "feat(arthaBuild): 200-case stress-suite runner"
```

### Task 5.6: Execute the 200-case stress run

**Files:**
- Output: `apps/arthaBuild/tests/eval/stress/runs/{timestamp}/stress-report.md`

- [ ] **Step 1: Decide backend target — EC2 or local — and confirm deployment**

The 200-case run hits the same backend `run_case_with_retry()` points to (inherited from `run_eval.py`). Confirm where that is:

```bash
grep -n "BACKEND_URL\|base_url\|artha\\.build\|localhost:8000" apps/arthaBuild/tests/eval/run_eval.py
```

- If runner targets **EC2** (`https://artha.build`): SSH, `git pull`, `docker compose up -d backend`, then `curl -s https://artha.build/api/health/detail | jq '.checks.validators // "missing"'` — must print a non-null object. This is the production-like run.
- If runner targets **localhost:8000**: `docker compose up -d backend` locally, then `curl -s http://localhost:8000/api/health/detail`. Accept only for dry-run; the committed PASS baseline must be the EC2 run.

- [ ] **Step 2: Run**

```bash
cd apps/arthaBuild
python tests/eval/run_stress.py
```

Expected runtime: ~60-90 min (200 cases × ~20-30s each). Cost: ~$4-5 for judge.

- [ ] **Step 3: Inspect the report**

```bash
cat apps/arthaBuild/tests/eval/stress/runs/*/stress-report.md
```

Expected: `PASS: 0/200 invalid, hard_block_rate=X.XX%, p50=Yms`.

- [ ] **Step 4: Commit the run artifacts**

```bash
git add -f apps/arthaBuild/tests/eval/stress/runs/*/stress-report.md
git add -f apps/arthaBuild/tests/eval/stress/runs/*/meta.json
git commit -m "feat(arthaBuild): zero-hallucination stress-run baseline — PASS 0/200"
```

### Task 5.7: Update ARCHITECTURE.md + docs

**Files:**
- Modify: `apps/arthaBuild/docs/ARCHITECTURE.md` (bump version, add validator component)
- Modify: `apps/arthaBuild/docs/architecture-diagram.html` (add validator node)
- Modify: `apps/arthaBuild/docs/test-report.html` (add validator-suite rows, mark PASS)

Per project law (`apps/arthaBuild/CLAUDE.md` rule 4): these three files MUST be updated as the final step of every phase.

- [ ] **Step 1: Update `docs/ARCHITECTURE.md`** — bump version (prior version is v2.7), add a "Zero-Hallucination Gate" component in the Validation Layer with inputs (generated SuiteScript), outputs (validated code OR refusal message), and dependencies (whitelist.py, oracle-*.md source).
- [ ] **Step 2: Update `docs/architecture-diagram.html`** — add a validator node between `run_llm_pipeline` output and the response persist step. Re-render the diagram HTML so it matches the ARCHITECTURE.md description.
- [ ] **Step 3: Update `docs/test-report.html`** — add rows for each new test file (`test_whitelist_drift.py`, `test_linter.py`, `test_record_type.py`, `test_module.py`, `test_script_type.py`, `test_search_api.py`, `test_reprompt.py`, `test_integration.py`) plus the stress-suite run, all marked PASS.
- [ ] **Step 4: Commit**

```bash
git add apps/arthaBuild/docs/ARCHITECTURE.md apps/arthaBuild/docs/architecture-diagram.html apps/arthaBuild/docs/test-report.html
git commit -m "docs(arthaBuild): architecture + test-report update for zero-hallucination gate"
```

---

## Execution Notes

- **Branch:** continue on `gsd/netsuite-eval-harness` (spec already committed there), or create `gsd/phase-23-zero-hallucination-gate` off of main if a cleaner branch is preferred.
- **Frequent commits:** every `git commit` line in this plan is a checkpoint. Don't batch across tasks.
- **Test order:** TDD — write the failing test first, prove it fails, then implement.
- **Skipping:** none of these tasks can be skipped or reordered — Wave 2 depends on Wave 1 whitelist; Wave 3 depends on Wave 2 ABC; Wave 4 depends on Wave 3 checkers; Wave 5 depends on Wave 4 integration.
- **Pre-existing test failures to ignore:** nginx HTTPS dev conf, alembic heads env. Do not investigate.
- **60% context rule:** if context pressure hits, pause between waves with a handoff at `~/.claude/handoffs/YYYY-MM-DD-arthabuild-hallucination-gate-waveN-done.md`.
- **Stress suite is gitignored under `runs/`:** force-add (`-f`) the `stress-report.md` and `meta.json` only.

## Success Gate

Phase complete when:

- [ ] `pytest apps/arthaBuild/tests/validators/ -v` — all tests PASS
- [ ] `python apps/arthaBuild/scripts/build_whitelist.py` — exit 0, whitelist.py is up-to-date
- [ ] `python apps/arthaBuild/tests/eval/run_stress.py` — PASS 0/200 invalid, hard_block_rate <10%, p50 <50ms
- [ ] ARCHITECTURE.md / architecture-diagram.html / test-report.html updated
- [ ] Branch pushed, PR opened against main
