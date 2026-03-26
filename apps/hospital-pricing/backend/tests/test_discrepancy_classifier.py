# apps/hospital-pricing/backend/tests/test_discrepancy_classifier.py
import os
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-at-least-32-chars-long")
os.environ.setdefault("OPENAI_API_KEY", "sk-test-placeholder")

import pytest
from decimal import Decimal
from datetime import date


def test_classify_price_mismatch():
    from agents.nodes.classify import classify_line_item
    result = classify_line_item(
        invoiced_price=Decimal("50.00"),
        contract_price=Decimal("45.00"),
        invoice_date=date(2024, 6, 1),
        contract_expiration_date=date(2024, 12, 31),
        invoiced_uom="EA",
        contract_uom="EA",
        units_per_uom=1,
        has_contract=True,
        skus_match=True,
    )
    assert result["discrepancy_type"] == "price_mismatch"


def test_classify_expired_contract():
    from agents.nodes.classify import classify_line_item
    result = classify_line_item(
        invoiced_price=Decimal("45.00"),
        contract_price=Decimal("45.00"),
        invoice_date=date(2025, 3, 1),
        contract_expiration_date=date(2024, 12, 31),  # expired
        invoiced_uom="EA",
        contract_uom="EA",
        units_per_uom=1,
        has_contract=True,
        skus_match=True,
    )
    assert result["discrepancy_type"] == "expired_contract"


def test_classify_sku_mismatch():
    from agents.nodes.classify import classify_line_item
    result = classify_line_item(
        invoiced_price=Decimal("45.00"),
        contract_price=Decimal("45.00"),
        invoice_date=date(2024, 6, 1),
        contract_expiration_date=date(2024, 12, 31),
        invoiced_uom="EA",
        contract_uom="EA",
        units_per_uom=1,
        has_contract=True,
        skus_match=False,  # SKU substitution
    )
    assert result["discrepancy_type"] == "sku_mismatch"


def test_classify_uom_mismatch():
    from agents.nodes.classify import classify_line_item
    result = classify_line_item(
        invoiced_price=Decimal("45.00"),
        contract_price=Decimal("45.00"),
        invoice_date=date(2024, 6, 1),
        contract_expiration_date=date(2024, 12, 31),
        invoiced_uom="BX",
        contract_uom="CS",
        units_per_uom=0,  # 0 means no conversion available
        has_contract=True,
        skus_match=True,
    )
    assert result["discrepancy_type"] == "uom_mismatch"


def test_classify_no_contract():
    from agents.nodes.classify import classify_line_item
    result = classify_line_item(
        invoiced_price=Decimal("45.00"),
        contract_price=None,
        invoice_date=date(2024, 6, 1),
        contract_expiration_date=None,
        invoiced_uom="EA",
        contract_uom=None,
        units_per_uom=1,
        has_contract=False,
        skus_match=False,
    )
    assert result["discrepancy_type"] == "no_contract"


def test_classify_clean_line():
    from agents.nodes.classify import classify_line_item
    result = classify_line_item(
        invoiced_price=Decimal("45.00"),
        contract_price=Decimal("45.00"),
        invoice_date=date(2024, 6, 1),
        contract_expiration_date=date(2024, 12, 31),
        invoiced_uom="EA",
        contract_uom="EA",
        units_per_uom=1,
        has_contract=True,
        skus_match=True,
    )
    assert result["discrepancy_type"] is None


def test_classify_node_updates_state():
    from agents.nodes.classify import classify_node
    from agents.state import ContractState
    state: ContractState = {
        "contract_id": "test-123",
        "document_text": "...",
        "contract_terms": {},
        "discrepancies": [{"type": "price_mismatch"}],  # pre-populated discrepancies
        "status": "compared",
        "error": None,
    }
    result = classify_node(state)
    assert result["status"] == "flagged"
