"""Static linter-coverage runner for the 160 adversarial stress cases.

Path A: prove SuiteScriptLinter flags every adversarial identifier across all
four categories, without hitting a backend or LLM. For each case, synthesize
minimal JavaScript exercising `adversarial_target` in its `target_category`'s
canonical form, lint it, and require >=1 violation. A case with zero
violations is a linter-coverage gap.

Usage:
    python tests/eval/run_stress.py                # full run, human summary
    python tests/eval/run_stress.py --json         # machine-readable
    pytest tests/eval/run_stress.py -v             # pytest harness
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from src.backend.validators.linter import SuiteScriptLinter  # noqa: E402

STRESS_DIR = Path(__file__).resolve().parent / "stress"
STRESS_FILES = (
    "record_type.jsonl",
    "module.jsonl",
    "script_type.jsonl",
    "search.jsonl",
    "file_type.jsonl",
    "http_method.jsonl",
    "record_script_id.jsonl",
)
EXPECTED_TOTAL = 280
ALL_UPPER_RE = re.compile(r"^[A-Z_]+$")


@dataclass
class CaseResult:
    case_id: str
    category: str
    target: str
    synth: str
    violation_count: int
    violation_categories: list[str]

    @property
    def passed(self) -> bool:
        return self.violation_count > 0


def synth_code(target_category: str, target: str, synth_mode: str | None = None) -> str:
    """Synthesize minimal JS exercising `target` in its canonical form.

    `synth_mode` disambiguates `script_type` cases (explicit > ALL_UPPER
    heuristic fallback). For other categories it is ignored.
    """
    if target_category == "record_type":
        return f"var x = record.Type.{target};"
    if target_category == "module":
        return f"define(['{target}'], function(m) {{ return {{}}; }});"
    if target_category == "script_type":
        mode = synth_mode or ("searchtype" if ALL_UPPER_RE.match(target) else "nscripttype")
        if mode == "searchtype":
            return f"var t = search.Type.{target};"
        if mode == "nscripttype":
            return f"/**\n * @NScriptType {target}\n */"
        raise ValueError(f"unknown synth_mode for script_type: {mode!r}")
    if target_category == "search_api":
        return f"search.{target}();"
    if target_category == "file_type":
        return f"var t = file.Type.{target};"
    if target_category == "http_method":
        return f"var m = http.Method.{target};"
    if target_category == "record_script_id":
        return f"var r = record.load({{type: '{target}', id: 1}});"
    raise ValueError(f"unknown target_category: {target_category!r}")


def load_cases() -> list[dict]:
    cases: list[dict] = []
    for fname in STRESS_FILES:
        path = STRESS_DIR / fname
        with path.open() as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                cases.append(json.loads(line))
    return cases


def run() -> tuple[list[CaseResult], list[CaseResult]]:
    linter = SuiteScriptLinter()
    cases = load_cases()
    if len(cases) != EXPECTED_TOTAL:
        raise AssertionError(f"expected {EXPECTED_TOTAL} cases, loaded {len(cases)}")

    passed: list[CaseResult] = []
    failed: list[CaseResult] = []
    for case in cases:
        code = synth_code(
            case["target_category"],
            case["adversarial_target"],
            case.get("synth_mode"),
        )
        result = linter.lint(code)
        cr = CaseResult(
            case_id=case["id"],
            category=case["target_category"],
            target=case["adversarial_target"],
            synth=code,
            violation_count=len(result.violations),
            violation_categories=[v.category for v in result.violations],
        )
        (passed if cr.passed else failed).append(cr)
    return passed, failed


def summarize(passed: list[CaseResult], failed: list[CaseResult]) -> dict:
    total = len(passed) + len(failed)
    per_cat: dict[str, dict[str, int]] = {}
    for cr in passed + failed:
        bucket = per_cat.setdefault(cr.category, {"total": 0, "passed": 0})
        bucket["total"] += 1
        if cr.passed:
            bucket["passed"] += 1
    return {
        "total": total,
        "passed": len(passed),
        "failed": len(failed),
        "pass_rate": round(len(passed) / total * 100, 2) if total else 0.0,
        "per_category": per_cat,
        "gaps": [
            {"id": cr.case_id, "category": cr.category, "target": cr.target, "synth": cr.synth}
            for cr in failed
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="emit JSON summary")
    args = parser.parse_args()

    passed, failed = run()
    summary = summarize(passed, failed)

    if args.json:
        print(json.dumps(summary, indent=2))
    else:
        print(f"Stress cases: {summary['total']} total, "
              f"{summary['passed']} passed, {summary['failed']} failed "
              f"({summary['pass_rate']}%)")
        for cat, stats in sorted(summary["per_category"].items()):
            print(f"  {cat}: {stats['passed']}/{stats['total']}")
        if failed:
            print("\nLinter-coverage gaps:")
            for gap in summary["gaps"]:
                print(f"  {gap['id']} [{gap['category']}] {gap['target']}: {gap['synth']}")

    return 0 if not failed else 1


# pytest harness ----------------------------------------------------------------

def test_all_stress_cases_flagged():
    """Every adversarial target must produce >=1 violation."""
    passed, failed = run()
    assert not failed, (
        f"{len(failed)} stress case(s) not flagged: "
        + ", ".join(f"{cr.case_id}({cr.target})" for cr in failed[:10])
    )
    assert len(passed) == EXPECTED_TOTAL


def test_per_category_counts():
    """Each category has its expected share (40/40/40/40)."""
    cases = load_cases()
    counts: dict[str, int] = {}
    for c in cases:
        counts[c["target_category"]] = counts.get(c["target_category"], 0) + 1
    assert counts == {
        "record_type": 40,
        "module": 40,
        "script_type": 40,
        "search_api": 40,
        "file_type": 40,
        "http_method": 40,
        "record_script_id": 40,
    }


if __name__ == "__main__":
    sys.exit(main())
