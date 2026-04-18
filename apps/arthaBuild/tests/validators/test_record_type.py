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


# NOTE: plan listed `PAYMENT` as valid, but NetSuite has no generic
# record.Type.PAYMENT — canonical is CUSTOMER_PAYMENT / VENDOR_PAYMENT.
# Fixture corrected to match NetSuite canon.
@pytest.mark.parametrize("good", [
    "SALES_ORDER", "INVOICE", "CUSTOMER", "VENDOR_BILL",
    "ITEM_RECEIPT", "ITEM_FULFILLMENT", "CUSTOMER_PAYMENT", "CREDIT_MEMO",
])
def test_valid_passes(good):
    code = f"var r = record.load({{type: record.Type.{good}, id: 1}});"
    violations = CHECKER.check(code)
    assert violations == []
