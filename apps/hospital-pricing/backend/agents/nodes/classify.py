# apps/hospital-pricing/backend/agents/nodes/classify.py
"""
Discrepancy classifier — FLAG node in the LangGraph contract lifecycle.

Checks every invoice line against contract terms and classifies discrepancies.
Classification priority (checked in order):
  1. no_contract — no active contract found
  2. expired_contract — invoice date after contract expiration
  3. sku_mismatch — item substituted by supplier
  4. uom_mismatch — UOM differs and no conversion available
  5. price_mismatch — price outside tolerance
  6. None — clean line
"""
from decimal import Decimal
from datetime import date
from typing import Optional
from agents.state import ContractState
from services.price_engine import compare_price, compare_price_with_uom


def classify_line_item(
    invoiced_price: Decimal,
    contract_price: Optional[Decimal],
    invoice_date: date,
    contract_expiration_date: Optional[date],
    invoiced_uom: str,
    contract_uom: Optional[str],
    units_per_uom: int,
    has_contract: bool,
    skus_match: bool,
) -> dict:
    """
    Classify a single invoice line item.
    Returns dict with discrepancy_type (None = clean) and discrepancy_amount.
    """
    # 1. No contract
    if not has_contract or contract_price is None:
        return {"discrepancy_type": "no_contract", "discrepancy_amount": None}

    # 2. Expired contract
    if contract_expiration_date and invoice_date > contract_expiration_date:
        return {"discrepancy_type": "expired_contract", "discrepancy_amount": None}

    # 3. SKU substitution
    if not skus_match:
        return {"discrepancy_type": "sku_mismatch", "discrepancy_amount": None}

    # 4. UOM mismatch (no conversion available — units_per_uom=0 signals no conversion)
    if contract_uom and invoiced_uom.upper() != contract_uom.upper() and units_per_uom == 0:
        return {"discrepancy_type": "uom_mismatch", "discrepancy_amount": None}

    # 5. Price comparison (with UOM normalisation if needed)
    if contract_uom and invoiced_uom.upper() != contract_uom.upper() and units_per_uom > 0:
        comparison = compare_price_with_uom(
            invoiced_price=invoiced_price,
            invoiced_uom=invoiced_uom,
            contract_price=contract_price,
            contract_uom=contract_uom,
            units_per_uom=units_per_uom,
        )
    else:
        comparison = compare_price(invoiced_price, contract_price)

    if comparison["discrepancy_type"] == "price_mismatch":
        return {
            "discrepancy_type": "price_mismatch",
            "discrepancy_amount": comparison["discrepancy_amount"],
        }

    # 6. Clean line
    return {"discrepancy_type": None, "discrepancy_amount": Decimal("0")}


def classify_node(state: ContractState) -> ContractState:
    """
    FLAG node: Classify discrepancies already collected in state.discrepancies.
    In the full pipeline, this node would iterate all invoice line items.
    For the scaffold, it marks the state as 'flagged'.
    """
    return {**state, "status": "flagged"}
