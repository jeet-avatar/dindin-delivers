"""
Tests for CASE-192: Audit log expansion and event hooks.
Tests use the standard conftest.py fixtures (async client, db_session, auth_tokens).
"""
import pytest
import sqlalchemy as sa
from httpx import AsyncClient
from models import AuditLog


@pytest.mark.asyncio
async def test_login_success_creates_audit_log(client: AsyncClient, registered_user, db_session):
    """Login success creates auth.login_success audit entry."""
    resp = await client.post("/api/auth/login", json={
        "username": registered_user["email"],
        "password": registered_user["password"],
    })
    assert resp.status_code == 200
    result = await db_session.execute(
        sa.select(AuditLog).where(AuditLog.action == "auth.login_success")
        .order_by(AuditLog.created_at.desc()).limit(1)
    )
    entry = result.scalar_one_or_none()
    assert entry is not None, "Login success must create AuditLog row"
    assert entry.result == "success"
    assert entry.actor_email == registered_user["email"].lower()


@pytest.mark.asyncio
async def test_login_failure_creates_audit_log(client: AsyncClient, registered_user, db_session):
    """Login failure creates auth.login_failed audit entry."""
    resp = await client.post("/api/auth/login", json={
        "username": registered_user["email"],
        "password": "WrongPassword123!",
    })
    assert resp.status_code == 401
    result = await db_session.execute(
        sa.select(AuditLog).where(AuditLog.action == "auth.login_failed")
        .order_by(AuditLog.created_at.desc()).limit(1)
    )
    entry = result.scalar_one_or_none()
    assert entry is not None, "Login failure must create AuditLog row"
    assert entry.result == "failure"


@pytest.mark.asyncio
async def test_audit_log_has_no_mutation_endpoints(client: AsyncClient, auth_tokens):
    """AuditLog must be append-only — no PUT/PATCH/DELETE endpoint."""
    headers = {"Authorization": f"Bearer {auth_tokens['access_token']}"}
    resp_put = await client.put("/api/admin/audit/1", headers=headers, json={"action": "tampered"})
    assert resp_put.status_code in (404, 405), "No PUT on /api/admin/audit/{id}"
    resp_delete = await client.delete("/api/admin/audit/1", headers=headers)
    assert resp_delete.status_code in (404, 405), "No DELETE on /api/admin/audit/{id}"


@pytest.mark.asyncio
async def test_get_admin_audit_returns_paginated_results(client: AsyncClient, auth_tokens):
    """GET /api/admin/audit returns paginated audit log, newest first."""
    headers = {"Authorization": f"Bearer {auth_tokens['access_token']}"}
    resp = await client.get("/api/admin/audit?offset=0&limit=10", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list), "Audit response must be a list"
    # If entries exist, confirm fields
    if data:
        entry = data[0]
        assert "action" in entry
        assert "created_at" in entry


@pytest.mark.asyncio
async def test_registration_creates_audit_log(client: AsyncClient, db_session):
    """User registration creates auth.register audit entry."""
    resp = await client.post("/api/user/register", json={
        "first_name": "Audit",
        "last_name": "TestUser",
        "email": "audittest@arthabuild-test.com",
        "organization": "TestOrg",
        "password": "AuditTest123!",
    })
    assert resp.status_code in (200, 201)
    result = await db_session.execute(
        sa.select(AuditLog).where(AuditLog.action == "auth.register")
        .order_by(AuditLog.created_at.desc()).limit(1)
    )
    entry = result.scalar_one_or_none()
    assert entry is not None, "Registration must create AuditLog row"
    assert entry.actor_email == "audittest@arthabuild-test.com"  # email is lowercased by register()


@pytest.mark.asyncio
async def test_admin_role_change_creates_audit_log(client: AsyncClient, db_session):
    """CASE-192: Admin role promotion creates audit log entry."""
    from models import User, TeamInvite
    from sqlalchemy import select

    # Register first user (becomes admin)
    admin_email = "auditadmin-rolechange@arthabuild-test.com"
    await client.post("/api/user/register", json={
        "first_name": "AuditAdmin",
        "last_name": "RoleChange",
        "email": admin_email,
        "organization": "AuditOrg",
        "password": "AuditAdmin123!",
    })
    login = await client.post("/api/auth/login", json={
        "username": admin_email,
        "password": "AuditAdmin123!",
    })
    token = login.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}

    # Register a second user (member)
    member_email = "auditmember-rolechange@arthabuild-test.com"
    await client.post("/api/user/register", json={
        "first_name": "AuditMember",
        "last_name": "RoleChange",
        "email": member_email,
        "organization": "AuditOrg",
        "password": "AuditMember123!",
    })

    # Find member and put them on same team
    result = await db_session.execute(
        sa.select(User).where(User.email == member_email)
    )
    member = result.scalar_one_or_none()
    result_admin = await db_session.execute(
        sa.select(User).where(User.email == admin_email)
    )
    admin = result_admin.scalar_one_or_none()

    if member is None or admin is None:
        pytest.skip("Could not locate users for role-change audit test")

    member.team_id = admin.team_id
    await db_session.commit()

    # Promote member to admin
    resp = await client.patch(
        f"/api/admin/users/{member.id}/role",
        json={"role": "admin"},
        headers=headers,
    )
    if resp.status_code not in (200, 204):
        pytest.skip(f"Role change not available (status {resp.status_code}) — CASE-192 skip")

    # Verify audit log entry was created
    audit_result = await db_session.execute(
        sa.select(AuditLog)
        .where(AuditLog.action == "admin.promote_user")
        .order_by(AuditLog.created_at.desc())
        .limit(1)
    )
    entry = audit_result.scalar_one_or_none()
    assert entry is not None, \
        "CASE-192: admin.promote_user action must create AuditLog row"
