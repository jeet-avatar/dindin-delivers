import pytest
from src.backend.validators.checkers.record_script_id import RecordScriptIdChecker

CHECKER = RecordScriptIdChecker()


@pytest.mark.parametrize("bad", [
    "orders", "invoices", "saleorder", "invocie", "SalesOrder",
    "billPayment", "widget", "order", "payment", "bill",
])
def test_hallucinated_literal_flagged(bad):
    code = f"var r = record.load({{type: '{bad}', id: 1}});"
    violations = CHECKER.check(code)
    assert len(violations) == 1
    assert violations[0].identifier == bad
    assert violations[0].category == "record_script_id"


@pytest.mark.parametrize("good", [
    "salesorder", "invoice", "customer", "vendorbill", "itemreceipt",
    "itemfulfillment", "customerpayment", "creditmemo",
])
def test_valid_literal_passes(good):
    code = f"var r = record.load({{type: '{good}', id: 1}});"
    violations = CHECKER.check(code)
    assert violations == []


@pytest.mark.parametrize("custom", [
    "customrecord_job_leads",
    "customlist_priority_levels",
    "customtransaction_commission",
])
def test_custom_prefix_passes(custom):
    # NetSuite allows user-defined records with these prefixes — must not flag.
    code = f"var r = record.load({{type: '{custom}', id: 1}});"
    violations = CHECKER.check(code)
    assert violations == []


def test_create_call_flagged():
    code = "record.create({type: 'fakerecord'});"
    violations = CHECKER.check(code)
    assert len(violations) == 1
    assert violations[0].identifier == "fakerecord"


def test_transform_call_flagged():
    code = "record.transform({fromType: 'salesorder', toType: 'shippinginv', fromId: 1});"
    # Only `type:` key is currently scoped (fromType/toType are future extension).
    # This test documents current behavior.
    violations = CHECKER.check(code)
    assert violations == []


def test_passes_when_no_type_field():
    code = "record.load({id: 1});"
    violations = CHECKER.check(code)
    assert violations == []


def test_enum_form_ignored():
    # record.Type.SALES_ORDER is the RecordTypeChecker's job, not this one.
    code = "var r = record.load({type: record.Type.SALES_ORDER, id: 1});"
    violations = CHECKER.check(code)
    assert violations == []
