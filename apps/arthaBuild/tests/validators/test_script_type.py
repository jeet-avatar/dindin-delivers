import pytest
from src.backend.validators.checkers.script_type import ScriptTypeChecker

CHECKER = ScriptTypeChecker()

# NOTE: plan listed `Scheduled`, `MapReduce`, `WorkflowAction`, `MassUpdate`
# as valid, but NetSuite's @NScriptType annotation requires the canonical
# "...Script" suffix for these. Short forms would be rejected by the
# SuiteScript deployment validator. Fixtures corrected to canon.
BAD_SCRIPT_TYPES = ["SavedSearch", "BatchProcess", "CustomScript", "DataScript"]
GOOD_SCRIPT_TYPES = ["UserEventScript", "ScheduledScript", "MapReduceScript", "Suitelet",
                     "ClientScript", "Restlet", "WorkflowActionScript", "MassUpdateScript"]
BAD_SEARCH_TYPES = ["ORDER", "BILL", "ACCOUNTING", "CUSTOMER_SEARCH"]
GOOD_SEARCH_TYPES = ["TRANSACTION", "CUSTOMER", "ITEM", "EMPLOYEE",
                     "VENDOR", "SALES_ORDER", "INVOICE", "CONTACT"]


@pytest.mark.parametrize("bad", BAD_SCRIPT_TYPES)
def test_bad_script_type(bad):
    code = f"/** @NApiVersion 2.1 * @NScriptType {bad} */"
    violations = CHECKER.check(code)
    assert len(violations) == 1
    assert violations[0].category == "script_type"


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
    assert violations[0].category == "search_type"


@pytest.mark.parametrize("good", GOOD_SEARCH_TYPES)
def test_good_search_type(good):
    code = f"var r = search.create({{type: search.Type.{good}}});"
    violations = CHECKER.check(code)
    assert violations == []
