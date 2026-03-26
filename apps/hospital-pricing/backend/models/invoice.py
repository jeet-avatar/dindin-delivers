# apps/hospital-pricing/backend/models/invoice.py
import uuid, enum
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import String, Enum as SAEnum, DateTime, Date, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class PaymentStatus(str, enum.Enum):
    unpaid = "unpaid"
    paid = "paid"
    disputed = "disputed"
    partial = "partial"
    voided = "voided"


class InvoiceSource(str, enum.Enum):
    pdf_scan = "pdf_scan"
    edi_810 = "edi_810"
    manual_entry = "manual_entry"
    api = "api"


class DiscrepancyType(str, enum.Enum):
    price_mismatch = "price_mismatch"
    tier_mismatch = "tier_mismatch"
    sku_mismatch = "sku_mismatch"
    expired_contract = "expired_contract"
    uom_mismatch = "uom_mismatch"
    no_contract = "no_contract"


class DiscrepancyStatus(str, enum.Enum):
    none = "none"
    flagged = "flagged"
    investigating = "investigating"
    resolved_credit = "resolved_credit"
    resolved_approved = "resolved_approved"


class Invoice(Base):
    __tablename__ = "invoices"
    invoice_id:          Mapped[uuid.UUID]           = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_number:      Mapped[str]                 = mapped_column(String(100), nullable=False, index=True)
    supplier_id:         Mapped[uuid.UUID]           = mapped_column(ForeignKey("suppliers.supplier_id"), nullable=False)
    ship_to_facility_id: Mapped[uuid.UUID]           = mapped_column(ForeignKey("facilities.facility_id"), nullable=False)
    entity_id:           Mapped[uuid.UUID]           = mapped_column(ForeignKey("hospital_entities.entity_id"), nullable=False, index=True)
    invoice_date:        Mapped[date]                = mapped_column(Date, nullable=False)
    total_amount:        Mapped[Decimal]             = mapped_column(Numeric(12, 2), nullable=False)
    contract_id:         Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("wholesale_agreements.contract_id"))
    payment_status:      Mapped[PaymentStatus]       = mapped_column(SAEnum(PaymentStatus), default=PaymentStatus.unpaid)
    source:              Mapped[InvoiceSource]       = mapped_column(SAEnum(InvoiceSource), default=InvoiceSource.pdf_scan)
    created_at:          Mapped[datetime]            = mapped_column(DateTime, default=datetime.utcnow)
    line_items:          Mapped[list["InvoiceLineItem"]] = relationship("InvoiceLineItem", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceLineItem(Base):
    __tablename__ = "invoice_line_items"
    line_id:                  Mapped[uuid.UUID]             = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_id:               Mapped[uuid.UUID]             = mapped_column(ForeignKey("invoices.invoice_id"), nullable=False, index=True)
    supplier_item_number:     Mapped[str]                   = mapped_column(String(100), nullable=False)
    ndc:                      Mapped[Optional[str]]         = mapped_column(String(11))
    invoiced_unit_price:      Mapped[Decimal]               = mapped_column(Numeric(12, 4), nullable=False)
    quantity_shipped:         Mapped[Decimal]               = mapped_column(Numeric(12, 3), nullable=False)
    unit_of_measure:          Mapped[str]                   = mapped_column(String(20), nullable=False)
    matched_contract_item_id: Mapped[Optional[uuid.UUID]]   = mapped_column(ForeignKey("contract_items.item_id"))
    expected_unit_price:      Mapped[Optional[Decimal]]     = mapped_column(Numeric(12, 4))
    discrepancy_amount:       Mapped[Optional[Decimal]]     = mapped_column(Numeric(12, 4))
    discrepancy_type:         Mapped[Optional[DiscrepancyType]] = mapped_column(SAEnum(DiscrepancyType))
    discrepancy_status:       Mapped[DiscrepancyStatus]     = mapped_column(SAEnum(DiscrepancyStatus), default=DiscrepancyStatus.none)
    invoice:                  Mapped["Invoice"]             = relationship("Invoice", back_populates="line_items")
