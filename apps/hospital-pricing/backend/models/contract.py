# apps/hospital-pricing/backend/models/contract.py
import uuid, enum
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import Uuid, String, Boolean, Enum as SAEnum, DateTime, Date, ForeignKey, Numeric, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class ContractStatus(str, enum.Enum):
    draft = "draft"
    pending_review = "pending_review"
    active = "active"
    expired = "expired"
    terminated = "terminated"
    suspended = "suspended"


class PriceBasis(str, enum.Enum):
    fixed = "fixed"
    wac_minus_pct = "wac_minus_pct"
    awp_minus_pct = "awp_minus_pct"
    asp_plus_pct = "asp_plus_pct"


class MFNTrigger(str, enum.Enum):
    automatic = "automatic"
    disclosure = "disclosure"
    audit_right = "audit_right"


class WholesaleAgreement(Base):
    __tablename__ = "wholesale_agreements"
    contract_id:                Mapped[uuid.UUID]         = mapped_column(Uuid(), primary_key=True, default=uuid.uuid4)
    hospital_entity_id:         Mapped[uuid.UUID]         = mapped_column(ForeignKey("hospital_entities.entity_id"), nullable=False, index=True)
    supplier_id:                Mapped[uuid.UUID]         = mapped_column(ForeignKey("suppliers.supplier_id"), nullable=False, index=True)
    gpo_contract_number:        Mapped[Optional[str]]     = mapped_column(String(100))
    effective_date:             Mapped[date]              = mapped_column(Date, nullable=False)
    expiration_date:            Mapped[date]              = mapped_column(Date, nullable=False)
    price_escalation_cap_pct:   Mapped[Decimal]           = mapped_column(Numeric(5, 4), default=Decimal("0.03"))
    admin_fee_pct:              Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 4))
    aks_safe_harbor_documented: Mapped[bool]              = mapped_column(Boolean, default=False)
    baa_required:               Mapped[bool]              = mapped_column(Boolean, default=False)
    status:                     Mapped[ContractStatus]    = mapped_column(SAEnum(ContractStatus), default=ContractStatus.draft)
    document_s3_path:           Mapped[Optional[str]]     = mapped_column(String(500))
    created_at:                 Mapped[datetime]          = mapped_column(DateTime, default=datetime.utcnow)
    pricing_tiers:              Mapped[list["PricingTier"]] = relationship("PricingTier", back_populates="contract", cascade="all, delete-orphan")
    mfn_clause:                 Mapped[Optional["MFNClause"]] = relationship("MFNClause", back_populates="contract", uselist=False)


class PricingTier(Base):
    __tablename__ = "pricing_tiers"
    tier_id:                   Mapped[uuid.UUID] = mapped_column(Uuid(), primary_key=True, default=uuid.uuid4)
    contract_id:               Mapped[uuid.UUID] = mapped_column(ForeignKey("wholesale_agreements.contract_id"), nullable=False)
    tier_name:                 Mapped[str]       = mapped_column(String(50), nullable=False)
    commitment_threshold_pct:  Mapped[Decimal]   = mapped_column(Numeric(5, 4), nullable=False)
    contract:                  Mapped["WholesaleAgreement"] = relationship("WholesaleAgreement", back_populates="pricing_tiers")
    items:                     Mapped[list["ContractItem"]] = relationship("ContractItem", back_populates="tier", cascade="all, delete-orphan")


class ContractItem(Base):
    __tablename__ = "contract_items"
    item_id:                  Mapped[uuid.UUID]      = mapped_column(Uuid(), primary_key=True, default=uuid.uuid4)
    tier_id:                  Mapped[uuid.UUID]      = mapped_column(ForeignKey("pricing_tiers.tier_id"), nullable=False)
    manufacturer_item_number: Mapped[str]            = mapped_column(String(100), nullable=False, index=True)
    ndc:                      Mapped[Optional[str]]  = mapped_column(String(11), index=True)
    description:              Mapped[str]            = mapped_column(String(500))
    unit_of_measure:          Mapped[str]            = mapped_column(String(20), nullable=False)
    units_per_uom:            Mapped[int]            = mapped_column(Integer, default=1)
    contract_unit_price:      Mapped[Decimal]        = mapped_column(Numeric(12, 4), nullable=False)
    price_basis:              Mapped[PriceBasis]     = mapped_column(SAEnum(PriceBasis), default=PriceBasis.fixed)
    price_effective_date:     Mapped[date]           = mapped_column(Date, nullable=False)
    price_expiration_date:    Mapped[date]           = mapped_column(Date, nullable=False)
    tier:                     Mapped["PricingTier"]  = relationship("PricingTier", back_populates="items")


class MFNClause(Base):
    __tablename__ = "mfn_clauses"
    mfn_id:               Mapped[uuid.UUID]  = mapped_column(Uuid(), primary_key=True, default=uuid.uuid4)
    contract_id:          Mapped[uuid.UUID]  = mapped_column(ForeignKey("wholesale_agreements.contract_id"), unique=True, nullable=False)
    trigger_type:         Mapped[MFNTrigger] = mapped_column(SAEnum(MFNTrigger), nullable=False)
    disclosure_frequency: Mapped[str]        = mapped_column(String(20), default="quarterly")
    carve_outs:           Mapped[list]       = mapped_column(JSON, default=list)
    cure_period_days:     Mapped[int]        = mapped_column(Integer, default=30)
    true_up_retroactive:  Mapped[bool]       = mapped_column(Boolean, default=True)
    contract:             Mapped["WholesaleAgreement"] = relationship("WholesaleAgreement", back_populates="mfn_clause")


class UOMConversion(Base):
    __tablename__ = "uom_conversions"
    id:          Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    from_uom:    Mapped[str]           = mapped_column(String(20), nullable=False, index=True)
    to_uom:      Mapped[str]           = mapped_column(String(20), nullable=False)
    multiplier:  Mapped[Decimal]       = mapped_column(Numeric(10, 4), nullable=False)
    category:    Mapped[Optional[str]] = mapped_column(String(50))
