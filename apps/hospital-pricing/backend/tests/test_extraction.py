# apps/hospital-pricing/backend/tests/test_extraction.py
import os
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-at-least-32-chars-long")
os.environ.setdefault("OPENAI_API_KEY", "sk-test-placeholder")

import pytest
from decimal import Decimal
from datetime import date


def test_contract_terms_schema_validates():
    """ContractTerms Pydantic v2 schema validates correctly."""
    from agents.schemas import ContractTerms, PricingTierExtract, ContractItemExtract

    item = ContractItemExtract(
        manufacturer_item_number="ABC-123",
        ndc="12345-678-90",
        description="Saline 0.9% 500mL",
        unit_of_measure="CS",
        units_per_uom=12,
        contract_unit_price=Decimal("45.99"),
        price_basis="fixed",
        price_effective_date=date(2024, 1, 1),
        price_expiration_date=date(2024, 12, 31),
    )

    tier = PricingTierExtract(
        tier_name="Tier 1",
        commitment_threshold_pct=Decimal("0.75"),
        items=[item],
    )

    terms = ContractTerms(
        supplier_name="McKesson Medical",
        effective_date=date(2024, 1, 1),
        expiration_date=date(2024, 12, 31),
        gpo_contract_number="GCP-2024-001",
        admin_fee_pct=Decimal("0.02"),
        mfn_present=False,
        is_340b_applicable=False,
        pricing_tiers=[tier],
    )

    assert terms.supplier_name == "McKesson Medical"
    assert len(terms.pricing_tiers) == 1
    assert terms.pricing_tiers[0].items[0].contract_unit_price == Decimal("45.99")


def test_contract_terms_required_fields():
    """ContractTerms raises ValidationError if required fields are missing."""
    from agents.schemas import ContractTerms
    import pydantic

    with pytest.raises(pydantic.ValidationError):
        ContractTerms(
            supplier_name="Test",
            # missing effective_date, expiration_date, pricing_tiers
        )


def test_extract_node_returns_updated_state():
    """Extract node updates state with contract_terms dict (mocked LLM)."""
    from unittest.mock import patch, MagicMock
    from agents.state import ContractState

    mock_terms = {
        "supplier_name": "Test Supplier",
        "effective_date": "2024-01-01",
        "expiration_date": "2024-12-31",
        "gpo_contract_number": None,
        "admin_fee_pct": None,
        "mfn_present": False,
        "is_340b_applicable": False,
        "pricing_tiers": [],
    }

    with patch("agents.nodes.extract.extract_contract_terms") as mock_extract:
        mock_extract.return_value = mock_terms

        from agents.nodes.extract import extract_node
        state: ContractState = {
            "contract_id": "test-123",
            "document_text": "Sample contract text here",
            "contract_terms": None,
            "discrepancies": [],
            "status": "ingested",
            "error": None,
        }

        result = extract_node(state)
        assert result["status"] == "extracted"
        assert result["contract_terms"] is not None
