# apps/hospital-pricing/backend/agents/schemas.py
from decimal import Decimal
from datetime import date
from typing import Optional
from pydantic import BaseModel, Field


class ContractItemExtract(BaseModel):
    """A single line item extracted from a wholesale contract PDF."""
    manufacturer_item_number: str = Field(..., description="Supplier's item/SKU number")
    ndc: Optional[str] = Field(None, description="National Drug Code (11-digit, pharma items only)")
    description: str = Field(..., description="Item description")
    unit_of_measure: str = Field(..., description="UOM: CS, EA, BX, etc.")
    units_per_uom: int = Field(1, ge=1, description="Units contained in one UOM")
    contract_unit_price: Decimal = Field(..., gt=0, description="Contract price per UOM")
    price_basis: str = Field("fixed", description="fixed | wac_minus_pct | awp_minus_pct | asp_plus_pct")
    price_effective_date: date = Field(..., description="Price start date")
    price_expiration_date: date = Field(..., description="Price end date")


class PricingTierExtract(BaseModel):
    """A pricing tier containing multiple contract items."""
    tier_name: str = Field(..., description="Tier name (Tier 1, Gold, etc.)")
    commitment_threshold_pct: Decimal = Field(..., ge=0, le=1, description="Market share commitment 0-1")
    items: list[ContractItemExtract] = Field(default_factory=list)


class ContractTerms(BaseModel):
    """
    Structured output from GPT-4o extraction of a wholesale contract PDF.
    All fields must be directly verifiable from the document text.
    """
    supplier_name: str = Field(..., description="Supplier / distributor name")
    effective_date: date = Field(..., description="Contract start date")
    expiration_date: date = Field(..., description="Contract end date")
    gpo_contract_number: Optional[str] = Field(None, description="GPO contract number if present")
    admin_fee_pct: Optional[Decimal] = Field(
        None,
        ge=0,
        le=Decimal("0.03"),  # AKS safe harbor ceiling: 42 CFR §1001.952(j)
        description="GPO admin fee — must not exceed 3% per AKS safe harbor",
    )
    mfn_present: bool = Field(False, description="True if MFN clause is present in contract")
    is_340b_applicable: bool = Field(
        False,
        description="True if contract covers 340B-eligible items (HRSA-defined ceiling price applies)",
    )
    pricing_tiers: list[PricingTierExtract] = Field(..., description="All pricing tiers and line items")
