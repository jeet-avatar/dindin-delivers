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
