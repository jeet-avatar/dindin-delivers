# apps/hospital-pricing/backend/services/price_engine.py
"""
Price comparison engine for invoice-vs-contract verification.

Tolerance rule: max($0.01, 0.1% of contract price)
Source: Project spec — avoids false positives on high-value pharma items
        while catching penny-rounding errors on cheap supplies.
"""
from decimal import Decimal
from typing import Optional


TOLERANCE_FLOOR = Decimal("0.01")
TOLERANCE_PCT = Decimal("0.001")  # 0.1%


def _compute_tolerance(contract_price: Decimal) -> Decimal:
    """Return the larger of $0.01 or 0.1% of the contract price."""
    return max(TOLERANCE_FLOOR, contract_price * TOLERANCE_PCT)


def compare_price(
    invoiced_price: Decimal,
    contract_price: Decimal,
) -> dict:
    """
    Compare invoiced unit price against contract unit price.
    Returns dict with discrepancy_type, discrepancy_amount, within_tolerance.
    """
    diff = abs(invoiced_price - contract_price)
    tolerance = _compute_tolerance(contract_price)
    within_tolerance = diff <= tolerance

    if within_tolerance:
        return {
            "discrepancy_type": None,
            "discrepancy_amount": Decimal("0"),
            "within_tolerance": True,
            "invoiced_price": invoiced_price,
            "contract_price": contract_price,
            "tolerance": tolerance,
        }
    else:
        return {
            "discrepancy_type": "price_mismatch",
            "discrepancy_amount": invoiced_price - contract_price,
            "within_tolerance": False,
            "invoiced_price": invoiced_price,
            "contract_price": contract_price,
            "tolerance": tolerance,
        }


def compare_price_with_uom(
    invoiced_price: Decimal,
    invoiced_uom: str,
    contract_price: Decimal,
    contract_uom: str,
    units_per_uom: int = 1,
) -> dict:
    """
    Compare prices after UOM normalisation.

    If UOMs differ, normalise both to the smallest unit (EA) before comparing.
    Assumption: invoiced_price is per invoiced_uom, contract_price is per contract_uom.
    """
    if invoiced_uom.upper() == contract_uom.upper():
        return compare_price(invoiced_price, contract_price)

    # Normalise contract price to EA: contract_price_per_cs / units_per_cs = price_per_ea
    contract_price_normalised = contract_price / Decimal(units_per_uom)

    result = compare_price(invoiced_price, contract_price_normalised)

    # Tag with UOM info regardless of match outcome
    result["uom_normalised"] = True
    result["invoiced_uom"] = invoiced_uom
    result["contract_uom"] = contract_uom
    result["units_per_uom"] = units_per_uom

    return result


def classify_no_contract(supplier_item_number: str) -> dict:
    """Return a no_contract discrepancy for an item with no matching contract."""
    return {
        "discrepancy_type": "no_contract",
        "discrepancy_amount": None,
        "within_tolerance": False,
        "supplier_item_number": supplier_item_number,
    }
