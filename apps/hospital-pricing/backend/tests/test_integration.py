# apps/hospital-pricing/backend/tests/test_integration.py
"""
Integration tests for the 4 compliance invariants:
1. AKS safe harbor enforcement (admin_fee_pct ceiling at 3%)
2. BAA activation block (contract with baa_required=True cannot activate without a BAA doc)
3. Audit immutability (resolving a discrepancy creates a NEW AuditLogEntry — behavioral test)
4. Tenant isolation (invoice for facility X is inaccessible to user authenticated for facility Y)
"""
import os
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-at-least-32-chars-long")
os.environ.setdefault("OPENAI_API_KEY", "sk-test-placeholder")

import uuid
from datetime import date, datetime
from decimal import Decimal

import pytest
from sqlalchemy import select

from auth.jwt import create_access_token
from models.hospital import HospitalEntity, Supplier, Facility
from models.contract import WholesaleAgreement, ContractStatus
from models.invoice import Invoice, InvoiceLineItem, InvoiceSource, PaymentStatus, DiscrepancyType, DiscrepancyStatus
from models.audit import AuditLogEntry


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _admin_token(entity_id: uuid.UUID) -> str:
    """Create a platform_admin JWT for the given entity."""
    return create_access_token({
        "sub": str(uuid.uuid4()),
        "entity_id": str(entity_id),
        "role": "platform_admin",
    })


def _officer_token(entity_id: uuid.UUID) -> str:
    """Create a procurement_officer JWT for the given entity."""
    return create_access_token({
        "sub": str(uuid.uuid4()),
        "entity_id": str(entity_id),
        "role": "procurement_officer",
    })


def _approver_token(entity_id: uuid.UUID) -> str:
    """Create a procurement_approver JWT for the given entity."""
    return create_access_token({
        "sub": str(uuid.uuid4()),
        "entity_id": str(entity_id),
        "role": "procurement_approver",
    })


async def _seed_entity_and_supplier(db) -> tuple[HospitalEntity, Supplier]:
    """Create a HospitalEntity and a Supplier row in the test DB."""
    entity = HospitalEntity(
        entity_id=uuid.uuid4(),
        name=f"Test Hospital {uuid.uuid4().hex[:6]}",
        gpo_memberships=[],
        is_covered_entity=False,
    )
    supplier = Supplier(
        supplier_id=uuid.uuid4(),
        name="Acme Medical Supplies",
        contact_email="sales@acme-medical.example.com",
    )
    db.add(entity)
    db.add(supplier)
    await db.commit()
    return entity, supplier


async def _seed_facility(db, entity: HospitalEntity) -> Facility:
    facility = Facility(
        facility_id=uuid.uuid4(),
        entity_id=entity.entity_id,
        name="Main Campus",
        address="123 Hospital Ave",
        ship_to_code=f"STC-{uuid.uuid4().hex[:4].upper()}",
    )
    db.add(facility)
    await db.commit()
    return facility


async def _seed_contract(
    db,
    entity: HospitalEntity,
    supplier: Supplier,
    baa_required: bool = False,
    document_s3_path: str | None = None,
) -> WholesaleAgreement:
    contract = WholesaleAgreement(
        contract_id=uuid.uuid4(),
        hospital_entity_id=entity.entity_id,
        supplier_id=supplier.supplier_id,
        effective_date=date(2024, 1, 1),
        expiration_date=date(2024, 12, 31),
        baa_required=baa_required,
        document_s3_path=document_s3_path,
        status=ContractStatus.draft,
    )
    db.add(contract)
    await db.commit()
    return contract


async def _seed_invoice_with_discrepancy(
    db,
    entity: HospitalEntity,
    supplier: Supplier,
    facility: Facility,
) -> tuple[Invoice, InvoiceLineItem]:
    """Create an Invoice + a flagged InvoiceLineItem for the given entity/facility."""
    invoice = Invoice(
        invoice_id=uuid.uuid4(),
        invoice_number=f"INV-{uuid.uuid4().hex[:8].upper()}",
        supplier_id=supplier.supplier_id,
        ship_to_facility_id=facility.facility_id,
        entity_id=entity.entity_id,
        invoice_date=date.today(),
        total_amount=Decimal("500.00"),
        source=InvoiceSource.manual_entry,
        payment_status=PaymentStatus.unpaid,
    )
    db.add(invoice)
    await db.flush()  # get invoice_id before creating line items

    line = InvoiceLineItem(
        line_id=uuid.uuid4(),
        invoice_id=invoice.invoice_id,
        supplier_item_number="SKU-001",
        invoiced_unit_price=Decimal("10.00"),
        expected_unit_price=Decimal("8.00"),
        discrepancy_amount=Decimal("2.00"),
        quantity_shipped=Decimal("50.000"),
        unit_of_measure="EA",
        discrepancy_type=DiscrepancyType.price_mismatch,
        discrepancy_status=DiscrepancyStatus.flagged,
    )
    db.add(line)
    await db.commit()
    return invoice, line


# ---------------------------------------------------------------------------
# 1. AKS compliance tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_aks_violation_returns_422(client, test_db):
    """Contract with admin_fee_pct=0.05 (>3%) must return 422 with AKS citation."""
    entity, supplier = await _seed_entity_and_supplier(test_db)
    headers = {"Authorization": f"Bearer {_admin_token(entity.entity_id)}"}

    response = await client.post(
        "/contracts/",
        json={
            "supplier_id": str(supplier.supplier_id),
            "effective_date": "2024-01-01",
            "expiration_date": "2024-12-31",
            "admin_fee_pct": 0.05,  # 5% — above the 3% AKS ceiling
        },
        headers=headers,
    )

    assert response.status_code == 422, f"Expected 422, got {response.status_code}: {response.text}"
    body_str = str(response.json())
    assert "1320a-7b" in body_str or "AKS" in body_str or "safe harbor" in body_str.lower(), (
        f"Response must cite AKS statute; got: {body_str}"
    )


@pytest.mark.asyncio
async def test_aks_valid_contract_created(client, test_db):
    """Contract with admin_fee_pct=0.025 (≤3%) must return 201."""
    entity, supplier = await _seed_entity_and_supplier(test_db)
    headers = {"Authorization": f"Bearer {_admin_token(entity.entity_id)}"}

    response = await client.post(
        "/contracts/",
        json={
            "supplier_id": str(supplier.supplier_id),
            "effective_date": "2024-01-01",
            "expiration_date": "2024-12-31",
            "admin_fee_pct": 0.025,  # 2.5% — within safe harbor
        },
        headers=headers,
    )

    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
    data = response.json()
    assert data["status"] == "draft"
    assert data["supplier_id"] == str(supplier.supplier_id)


@pytest.mark.asyncio
async def test_aks_boundary_exactly_3pct_is_allowed(client, test_db):
    """Contract with admin_fee_pct exactly at 3% (the ceiling) must be accepted."""
    entity, supplier = await _seed_entity_and_supplier(test_db)
    headers = {"Authorization": f"Bearer {_admin_token(entity.entity_id)}"}

    response = await client.post(
        "/contracts/",
        json={
            "supplier_id": str(supplier.supplier_id),
            "effective_date": "2024-01-01",
            "expiration_date": "2024-12-31",
            "admin_fee_pct": 0.03,  # exactly 3% — should pass
        },
        headers=headers,
    )

    assert response.status_code == 201, f"Expected 201 at boundary, got {response.status_code}: {response.text}"


# ---------------------------------------------------------------------------
# 2. BAA activation block tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_agreement_activation_blocked_without_baa(client, test_db):
    """WholesaleAgreement with baa_required=True and no document cannot be activated."""
    entity, supplier = await _seed_entity_and_supplier(test_db)
    contract = await _seed_contract(test_db, entity, supplier, baa_required=True, document_s3_path=None)
    headers = {"Authorization": f"Bearer {_admin_token(entity.entity_id)}"}

    response = await client.post(
        f"/contracts/{contract.contract_id}/activate",
        headers=headers,
    )

    assert response.status_code == 422, f"Expected 422, got {response.status_code}: {response.text}"
    detail = response.json().get("detail", "")
    assert "baa" in detail.lower() or "BAA" in detail, (
        f"Response must explain BAA requirement; got: {detail}"
    )


@pytest.mark.asyncio
async def test_agreement_activation_succeeds_with_baa_document(client, test_db):
    """WholesaleAgreement with baa_required=True and document on file can be activated."""
    entity, supplier = await _seed_entity_and_supplier(test_db)
    contract = await _seed_contract(
        test_db, entity, supplier,
        baa_required=True,
        document_s3_path="s3://hospital-docs/baa/signed-baa-2024.pdf",
    )
    headers = {"Authorization": f"Bearer {_admin_token(entity.entity_id)}"}

    response = await client.post(
        f"/contracts/{contract.contract_id}/activate",
        headers=headers,
    )

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    assert response.json()["status"] == "active"


@pytest.mark.asyncio
async def test_agreement_activation_no_baa_required_succeeds(client, test_db):
    """WholesaleAgreement with baa_required=False can be activated without a BAA document."""
    entity, supplier = await _seed_entity_and_supplier(test_db)
    contract = await _seed_contract(test_db, entity, supplier, baa_required=False, document_s3_path=None)
    headers = {"Authorization": f"Bearer {_admin_token(entity.entity_id)}"}

    response = await client.post(
        f"/contracts/{contract.contract_id}/activate",
        headers=headers,
    )

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    assert response.json()["status"] == "active"


@pytest.mark.asyncio
async def test_activate_contract_not_found(client, test_db):
    """Activating a non-existent contract returns 404."""
    entity, _ = await _seed_entity_and_supplier(test_db)
    headers = {"Authorization": f"Bearer {_admin_token(entity.entity_id)}"}

    response = await client.post(
        f"/contracts/{uuid.uuid4()}/activate",
        headers=headers,
    )

    assert response.status_code == 404


# ---------------------------------------------------------------------------
# 3. Audit immutability — behavioral test
#    Tests that resolving a discrepancy creates a new AuditLogEntry (DISC-03).
#    (The PostgreSQL DDL trigger preventing UPDATE/DELETE is not testable in SQLite.)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_resolve_discrepancy_creates_audit_entry(client, test_db):
    """Resolving a discrepancy creates an AuditLogEntry in the database."""
    entity, supplier = await _seed_entity_and_supplier(test_db)
    facility = await _seed_facility(test_db, entity)
    invoice, line = await _seed_invoice_with_discrepancy(test_db, entity, supplier, facility)
    headers = {"Authorization": f"Bearer {_approver_token(entity.entity_id)}"}

    # Count audit entries before
    result_before = await test_db.execute(
        select(AuditLogEntry).where(AuditLogEntry.entity_id == entity.entity_id)
    )
    count_before = len(result_before.scalars().all())

    # Resolve the discrepancy
    response = await client.post(
        f"/discrepancies/{line.line_id}/resolve",
        json={"resolution": "approve", "notes": "Verified pricing is correct"},
        headers=headers,
    )

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    body = response.json()
    assert "audit_log_id" in body, "Response must include audit_log_id"
    assert body["resolution"] == "approve"
    assert body["new_status"] == "resolved_approved"

    # Verify a new AuditLogEntry was written
    result_after = await test_db.execute(
        select(AuditLogEntry).where(AuditLogEntry.entity_id == entity.entity_id)
    )
    entries_after = result_after.scalars().all()
    assert len(entries_after) == count_before + 1, (
        f"Expected {count_before + 1} audit entries, got {len(entries_after)}"
    )

    # Verify the entry content
    new_entry = entries_after[-1]
    assert new_entry.event_type == "discrepancy.approve"
    assert new_entry.resource_type == "InvoiceLineItem"
    assert str(new_entry.resource_id) == str(line.line_id)


@pytest.mark.asyncio
async def test_resolve_discrepancy_audit_entry_has_before_and_after_status(client, test_db):
    """The AuditLogEntry payload must capture the before and after discrepancy status."""
    entity, supplier = await _seed_entity_and_supplier(test_db)
    facility = await _seed_facility(test_db, entity)
    invoice, line = await _seed_invoice_with_discrepancy(test_db, entity, supplier, facility)
    headers = {"Authorization": f"Bearer {_approver_token(entity.entity_id)}"}

    response = await client.post(
        f"/discrepancies/{line.line_id}/resolve",
        json={"resolution": "request_credit", "notes": "Credit needed"},
        headers=headers,
    )
    assert response.status_code == 200

    audit_log_id = response.json()["audit_log_id"]
    result = await test_db.execute(
        select(AuditLogEntry).where(AuditLogEntry.log_id == uuid.UUID(audit_log_id))
    )
    entry = result.scalar_one_or_none()
    assert entry is not None
    assert entry.payload["before_status"] == "flagged"
    assert entry.payload["after_status"] == "resolved_credit"
    assert entry.payload["resolution"] == "request_credit"


@pytest.mark.asyncio
async def test_resolve_discrepancy_invalid_resolution_rejected(client, test_db):
    """Invalid resolution values must return 422 — not create phantom audit entries."""
    entity, supplier = await _seed_entity_and_supplier(test_db)
    facility = await _seed_facility(test_db, entity)
    invoice, line = await _seed_invoice_with_discrepancy(test_db, entity, supplier, facility)
    headers = {"Authorization": f"Bearer {_approver_token(entity.entity_id)}"}

    response = await client.post(
        f"/discrepancies/{line.line_id}/resolve",
        json={"resolution": "delete_and_forget"},
        headers=headers,
    )
    assert response.status_code == 422

    # No audit entries created for invalid resolutions
    result = await test_db.execute(
        select(AuditLogEntry).where(AuditLogEntry.entity_id == entity.entity_id)
    )
    assert len(result.scalars().all()) == 0


# ---------------------------------------------------------------------------
# 4. Tenant isolation tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_invoice_tenant_isolation(client, test_db):
    """Invoice for facility belonging to entity A cannot be uploaded via entity B's token."""
    # Create two separate entities
    entity_a, supplier = await _seed_entity_and_supplier(test_db)
    entity_b = HospitalEntity(
        entity_id=uuid.uuid4(),
        name="Other Hospital System",
        gpo_memberships=[],
        is_covered_entity=False,
    )
    test_db.add(entity_b)
    await test_db.commit()

    # Create a facility that belongs to entity_a
    facility_a = await _seed_facility(test_db, entity_a)

    # Authenticate as entity_b and try to upload an invoice for entity_a's facility
    headers_b = {"Authorization": f"Bearer {_officer_token(entity_b.entity_id)}"}

    response = await client.post(
        f"/invoices/upload?supplier_id={supplier.supplier_id}&facility_id={facility_a.facility_id}",
        content=b"%PDF-1.4 fake invoice content",
        headers={**headers_b, "content-type": "application/pdf"},
    )

    # Must return 404 — entity_b cannot access entity_a's facility
    assert response.status_code == 404, (
        f"Expected 404 (tenant isolation), got {response.status_code}: {response.text}"
    )


@pytest.mark.asyncio
async def test_invoice_upload_succeeds_for_own_facility(client, test_db):
    """Invoice upload succeeds when the facility belongs to the authenticated entity."""
    entity, supplier = await _seed_entity_and_supplier(test_db)
    facility = await _seed_facility(test_db, entity)
    headers = {"Authorization": f"Bearer {_officer_token(entity.entity_id)}"}

    response = await client.post(
        f"/invoices/upload?supplier_id={supplier.supplier_id}&facility_id={facility.facility_id}",
        content=b"%PDF-1.4 fake invoice content",
        headers={**headers, "content-type": "application/pdf"},
    )

    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
    body = response.json()
    assert "invoice_id" in body
    assert body["status"] == "queued"


@pytest.mark.asyncio
async def test_invoice_list_tenant_isolation(client, test_db):
    """Entity B cannot see entity A's invoices via list endpoint."""
    entity_a, supplier = await _seed_entity_and_supplier(test_db)
    entity_b = HospitalEntity(
        entity_id=uuid.uuid4(),
        name="Another Hospital",
        gpo_memberships=[],
    )
    test_db.add(entity_b)
    await test_db.commit()

    facility_a = await _seed_facility(test_db, entity_a)

    # Seed an invoice for entity_a
    invoice_a = Invoice(
        invoice_id=uuid.uuid4(),
        invoice_number="INV-A-001",
        supplier_id=supplier.supplier_id,
        ship_to_facility_id=facility_a.facility_id,
        entity_id=entity_a.entity_id,
        invoice_date=date.today(),
        total_amount=Decimal("100.00"),
        source=InvoiceSource.manual_entry,
        payment_status=PaymentStatus.unpaid,
    )
    test_db.add(invoice_a)
    await test_db.commit()

    # Entity B lists invoices — must see 0 (not entity A's invoice)
    headers_b = {"Authorization": f"Bearer {_officer_token(entity_b.entity_id)}"}
    response = await client.get("/invoices/", headers=headers_b)

    assert response.status_code == 200
    assert response.json() == [], (
        f"Entity B must see 0 invoices; got: {response.json()}"
    )


@pytest.mark.asyncio
async def test_discrepancy_list_tenant_isolation(client, test_db):
    """Entity B cannot see entity A's discrepancies via list endpoint."""
    entity_a, supplier = await _seed_entity_and_supplier(test_db)
    entity_b = HospitalEntity(
        entity_id=uuid.uuid4(),
        name="Rival Hospital",
        gpo_memberships=[],
    )
    test_db.add(entity_b)
    await test_db.commit()

    facility_a = await _seed_facility(test_db, entity_a)
    _, _line = await _seed_invoice_with_discrepancy(test_db, entity_a, supplier, facility_a)

    # Entity B should see 0 discrepancies
    headers_b = {"Authorization": f"Bearer {_officer_token(entity_b.entity_id)}"}
    response = await client.get("/discrepancies/", headers=headers_b)

    assert response.status_code == 200
    assert response.json() == [], (
        f"Entity B must see 0 discrepancies; got: {response.json()}"
    )


@pytest.mark.asyncio
async def test_contract_list_tenant_isolation(client, test_db):
    """Entity B cannot see entity A's contracts via list endpoint."""
    entity_a, supplier = await _seed_entity_and_supplier(test_db)
    entity_b = HospitalEntity(
        entity_id=uuid.uuid4(),
        name="Competitor Hospital",
        gpo_memberships=[],
    )
    test_db.add(entity_b)
    await test_db.commit()

    # Seed a contract for entity_a
    await _seed_contract(test_db, entity_a, supplier)

    # Entity B lists contracts — must see 0
    headers_b = {"Authorization": f"Bearer {_admin_token(entity_b.entity_id)}"}
    response = await client.get("/contracts/", headers=headers_b)

    assert response.status_code == 200
    assert response.json() == [], (
        f"Entity B must see 0 contracts; got: {response.json()}"
    )
