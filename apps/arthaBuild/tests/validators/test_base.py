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
