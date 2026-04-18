import pytest
from src.backend.validators.checkers.module import ModuleChecker

CHECKER = ModuleChecker()


# NOTE: plan listed `N/transaction` as hallucinated, but it is a real
# SuiteScript 2.x module (void/copy/etc.). Swapped for a truly fake one.
@pytest.mark.parametrize("bad", [
    "N/currencyRevaluation", "N/customList", "N/banking/wire",
    "N/record/legacy", "N/search/advanced", "N/suiteletBuilder",
    "N/transactionManager", "N/sqlQuery",
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
