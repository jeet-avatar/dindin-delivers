from src.backend.validators.checkers.base import LintResult, Violation
from src.backend.validators.reprompt import (
    build_refusal_message,
    build_reprompt_payload,
    new_metrics,
    run_validation_loop,  # noqa: F401  (imported to prove module wiring)
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


def test_refusal_message_invariant_rejects_code_fence_leak():
    """If a violation identifier contains a code-fence marker (attacker payload
    or accidental fence leak), the build_refusal_message assertion must fire
    rather than silently echoing it to the user."""
    import pytest
    r = LintResult(valid=False, violations=[
        Violation(category="record_type", identifier="```js\nevil\n```", line=1,
                  suggestions=[], message=""),
    ])
    with pytest.raises(AssertionError):
        build_refusal_message(r)


def test_run_validation_loop_exported_at_package_level():
    """LOW-7: run_validation_loop must be importable from `validators` package."""
    from src.backend.validators import run_validation_loop as exported
    assert callable(exported)


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
