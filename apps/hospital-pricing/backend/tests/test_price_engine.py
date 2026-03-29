# apps/hospital-pricing/backend/tests/test_price_engine.py
import os
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-at-least-32-chars-long")
os.environ.setdefault("OPENAI_API_KEY", "sk-test-placeholder")

import pytest
from decimal import Decimal


def test_price_match_within_tolerance():
    """Invoice price within tolerance → no discrepancy."""
    from services.price_engine import compare_price
    result = compare_price(
        invoiced_price=Decimal("45.99"),
        contract_price=Decimal("45.95"),  # diff = 0.04, tolerance = max(0.01, 0.04595) = 0.04595
    )
    assert result["discrepancy_type"] is None
    assert result["within_tolerance"] is True


def test_price_mismatch_above_tolerance():
    """Invoice price outside tolerance → price_mismatch."""
    from services.price_engine import compare_price
    result = compare_price(
        invoiced_price=Decimal("50.00"),
        contract_price=Decimal("45.95"),  # diff = 4.05, tolerance = 0.046
    )
    assert result["discrepancy_type"] == "price_mismatch"
    assert result["discrepancy_amount"] == Decimal("4.05")


def test_penny_rounding_within_tolerance():
    """Small price (e.g. $0.50 supply item) uses $0.01 floor."""
    from services.price_engine import compare_price
    result = compare_price(
        invoiced_price=Decimal("0.51"),
        contract_price=Decimal("0.50"),  # diff = 0.01, tolerance = max(0.01, 0.0005) = 0.01
    )
    assert result["within_tolerance"] is True


def test_high_value_pharma_tolerance():
    """$500 pharma item uses 0.1% tolerance ($0.50), not $0.01 floor."""
    from services.price_engine import compare_price
    result = compare_price(
        invoiced_price=Decimal("500.25"),
        contract_price=Decimal("500.00"),  # diff = 0.25, tolerance = max(0.01, 0.50) = 0.50
    )
    assert result["within_tolerance"] is True


def test_uom_normalisation_cs_to_ea():
    """CS price normalised to EA before comparison (1 CS = 12 EA)."""
    from services.price_engine import compare_price_with_uom
    result = compare_price_with_uom(
        invoiced_price=Decimal("12.00"),   # per EA
        invoiced_uom="EA",
        contract_price=Decimal("144.00"),  # per CS
        contract_uom="CS",
        units_per_uom=12,                  # 1 CS = 12 EA
    )
    # normalised: 144.00 / 12 = 12.00 per EA → matches exactly
    assert result["discrepancy_type"] is None


def test_no_contract_match():
    """If no contract item is found, classify as no_contract."""
    from services.price_engine import classify_no_contract
    result = classify_no_contract(supplier_item_number="XYZ-999")
    assert result["discrepancy_type"] == "no_contract"
    assert result["supplier_item_number"] == "XYZ-999"
