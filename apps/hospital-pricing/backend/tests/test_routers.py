# apps/hospital-pricing/backend/tests/test_routers.py
import os
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-at-least-32-chars-long")
os.environ.setdefault("OPENAI_API_KEY", "sk-test-placeholder")

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from decimal import Decimal
import uuid


@pytest.mark.asyncio
async def test_create_contract_aks_violation(client, platform_admin_token):
    """POST /contracts/ with admin_fee_pct=0.05 returns 422 with AKS citation."""
    headers = {"Authorization": f"Bearer {platform_admin_token}"}
    response = await client.post(
        "/contracts/",
        json={
            "supplier_id": str(uuid.uuid4()),
            "effective_date": "2024-01-01",
            "expiration_date": "2024-12-31",
            "admin_fee_pct": 0.05,  # 5% — above 3% AKS ceiling
        },
        headers=headers,
    )
    assert response.status_code == 422
    body = response.json()
    # Must cite AKS statute
    detail_str = str(body)
    assert "1320a-7b" in detail_str or "AKS" in detail_str or "safe harbor" in detail_str.lower()


@pytest.mark.asyncio
async def test_create_contract_valid(client, platform_admin_token):
    """POST /contracts/ with admin_fee_pct=0.025 returns 201."""
    headers = {"Authorization": f"Bearer {platform_admin_token}"}
    response = await client.post(
        "/contracts/",
        json={
            "supplier_id": str(uuid.uuid4()),
            "effective_date": "2024-01-01",
            "expiration_date": "2024-12-31",
            "admin_fee_pct": 0.025,  # 2.5% — within safe harbor
        },
        headers=headers,
    )
    assert response.status_code == 201


@pytest.mark.asyncio
async def test_upload_invoice_unknown_facility(client, procurement_officer_token):
    """POST /invoices/upload with unknown facility_id returns 404."""
    headers = {"Authorization": f"Bearer {procurement_officer_token}"}
    fake_supplier_id = str(uuid.uuid4())
    fake_facility_id = str(uuid.uuid4())

    response = await client.post(
        f"/invoices/upload?supplier_id={fake_supplier_id}&facility_id={fake_facility_id}",
        content=b"%PDF-1.4 fake pdf content",
        headers={**headers, "content-type": "application/pdf"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_discrepancies_requires_auth(client):
    """GET /discrepancies/ without auth returns 403 or 401."""
    response = await client.get("/discrepancies/")
    assert response.status_code in (401, 403)
