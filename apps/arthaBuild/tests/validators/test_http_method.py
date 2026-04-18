import pytest
from src.backend.validators.checkers.http_method import HttpMethodChecker

CHECKER = HttpMethodChecker()


@pytest.mark.parametrize("bad", [
    "PATCH", "CONNECT", "OPTIONS", "TRACE",
    # lowercase hallucinations
    "get", "post", "put", "delete", "head",
    # invented
    "FETCH", "SEND", "UPDATE", "REMOVE", "INSERT",
])
def test_hallucinated_flagged(bad):
    code = f"var m = http.Method.{bad};"
    violations = CHECKER.check(code)
    assert len(violations) == 1
    assert violations[0].identifier == bad
    assert violations[0].category == "http_method"


@pytest.mark.parametrize("good", ["GET", "POST", "PUT", "DELETE", "HEAD"])
def test_valid_passes(good):
    code = f"var m = http.Method.{good};"
    violations = CHECKER.check(code)
    assert violations == []


def test_no_false_positive_on_unrelated_method_access():
    # `record.Method.FOO` is not a valid NetSuite construct but must not be
    # flagged by this checker (scope is http.Method only).
    code = "var x = something.Method.FOO;"
    violations = CHECKER.check(code)
    assert violations == []
