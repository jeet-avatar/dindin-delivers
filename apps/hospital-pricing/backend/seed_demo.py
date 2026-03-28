"""Seed script: create tables + demo user for local development."""
import asyncio
from decimal import Decimal
from datetime import date, timedelta, datetime
from passlib.context import CryptContext
from sqlalchemy import select
from database import Base, get_engine, get_session_factory
from models.hospital import HospitalEntity, User, UserRole, Supplier, Facility
from models.contract import WholesaleAgreement, ContractStatus, MFNClause, MFNTrigger
from models.invoice import Invoice, InvoiceLineItem, DiscrepancyType, DiscrepancyStatus, InvoiceSource
from models.audit import AuditLogEntry

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def main():
    engine = get_engine()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[OK] Tables created")

    factory = get_session_factory()
    async with factory() as db:
        result = await db.execute(select(User).where(User.email == "admin@hospital-demo.com"))
        if result.scalar_one_or_none():
            print("[SKIP] Demo user already exists")
            return

        # Entity
        entity = HospitalEntity(
            name="Memorial General Hospital",
            gpo_memberships=["Vizient", "Premier"],
            is_covered_entity=True,
            ein="12-3456789",
        )
        db.add(entity)
        await db.flush()

        # Users
        users = [
            User(entity_id=entity.entity_id, email="admin@hospital-demo.com",
                 hashed_password=_pwd.hash("Admin1234!"), role=UserRole.platform_admin),
            User(entity_id=entity.entity_id, email="approver@hospital-demo.com",
                 hashed_password=_pwd.hash("Admin1234!"), role=UserRole.procurement_approver),
            User(entity_id=entity.entity_id, email="officer@hospital-demo.com",
                 hashed_password=_pwd.hash("Admin1234!"), role=UserRole.procurement_officer),
            User(entity_id=entity.entity_id, email="entityadmin@hospital-demo.com",
                 hashed_password=_pwd.hash("Admin1234!"), role=UserRole.entity_admin),
        ]
        db.add_all(users)

        # Supplier
        supplier = Supplier(
            name="McKesson Medical-Surgical",
            dea_number="RM0593416",
            contact_email="contracts@mckesson.com",
        )
        db.add(supplier)
        await db.flush()

        # Facility
        facility = Facility(
            entity_id=entity.entity_id,
            name="Main Campus Pharmacy",
            address="1200 Medical Center Dr, Suite 100",
            ship_to_code="MEM-001",
            is_340b_eligible=True,
        )
        db.add(facility)
        await db.flush()

        today = date.today()

        # Contract 1: active, expiring soon, has MFN clause
        c1 = WholesaleAgreement(
            hospital_entity_id=entity.entity_id,
            supplier_id=supplier.supplier_id,
            gpo_contract_number="VIZ-2026-001",
            status=ContractStatus.active,
            effective_date=today - timedelta(days=90),
            expiration_date=today + timedelta(days=15),
            admin_fee_pct=Decimal("0.025"),
            aks_safe_harbor_documented=True,
            baa_required=True,
        )
        db.add(c1)
        await db.flush()

        mfn = MFNClause(
            contract_id=c1.contract_id,
            trigger_type=MFNTrigger.disclosure,
            disclosure_frequency="quarterly",
            carve_outs=["specialty drugs"],
            cure_period_days=30,
            true_up_retroactive=True,
        )
        db.add(mfn)

        # Contract 2: active, AKS violation
        c2 = WholesaleAgreement(
            hospital_entity_id=entity.entity_id,
            supplier_id=supplier.supplier_id,
            gpo_contract_number="PRE-2026-042",
            status=ContractStatus.active,
            effective_date=today - timedelta(days=180),
            expiration_date=today + timedelta(days=180),
            admin_fee_pct=Decimal("0.045"),
            aks_safe_harbor_documented=False,
            baa_required=False,
        )
        db.add(c2)

        # Contract 3: pending_review
        c3 = WholesaleAgreement(
            hospital_entity_id=entity.entity_id,
            supplier_id=supplier.supplier_id,
            gpo_contract_number="VIZ-2025-099",
            status=ContractStatus.pending_review,
            effective_date=today - timedelta(days=30),
            expiration_date=today + timedelta(days=335),
            aks_safe_harbor_documented=True,
            baa_required=True,
        )
        db.add(c3)
        await db.flush()

        # Invoice with discrepancies
        inv = Invoice(
            entity_id=entity.entity_id,
            supplier_id=supplier.supplier_id,
            ship_to_facility_id=facility.facility_id,
            invoice_number="INV-2026-1847",
            invoice_date=today - timedelta(days=2),
            total_amount=Decimal("12450.75"),
            contract_id=c1.contract_id,
            source=InvoiceSource.edi_810,
        )
        db.add(inv)
        await db.flush()

        lines = [
            InvoiceLineItem(
                invoice_id=inv.invoice_id,
                supplier_item_number="ASP-500MG-100CT",
                invoiced_unit_price=Decimal("0.4600"),
                quantity_shipped=Decimal("500"),
                unit_of_measure="EA",
                expected_unit_price=Decimal("0.3400"),
                discrepancy_amount=Decimal("0.1200"),
                discrepancy_type=DiscrepancyType.price_mismatch,
                discrepancy_status=DiscrepancyStatus.flagged,
            ),
            InvoiceLineItem(
                invoice_id=inv.invoice_id,
                supplier_item_number="SAL-1L-24PK",
                invoiced_unit_price=Decimal("1.8500"),
                quantity_shipped=Decimal("200"),
                unit_of_measure="EA",
                expected_unit_price=Decimal("1.2000"),
                discrepancy_amount=Decimal("0.6500"),
                discrepancy_type=DiscrepancyType.tier_mismatch,
                discrepancy_status=DiscrepancyStatus.flagged,
            ),
            InvoiceLineItem(
                invoice_id=inv.invoice_id,
                supplier_item_number="INS-GLAR-5PK",
                invoiced_unit_price=Decimal("48.2000"),
                quantity_shipped=Decimal("50"),
                unit_of_measure="EA",
                expected_unit_price=None,
                discrepancy_amount=None,
                discrepancy_type=DiscrepancyType.sku_mismatch,
                discrepancy_status=DiscrepancyStatus.flagged,
            ),
        ]
        db.add_all(lines)

        await db.commit()
        print("[OK] Demo data seeded:")
        print(f"     Entity:    {entity.name}")
        print(f"     Login:     admin@hospital-demo.com / Admin1234!")
        print(f"     Alt users: approver@ / officer@ / entityadmin@ (same password)")
        print(f"     Contracts: 3 (1 expiring soon + MFN, 1 AKS violation, 1 pending_review)")
        print(f"     Invoice:   {inv.invoice_number} with 3 discrepancies")


if __name__ == "__main__":
    asyncio.run(main())
