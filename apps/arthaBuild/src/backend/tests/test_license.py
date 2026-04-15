"""
License system tests.
CASE-157: /api/license/status returns 200 for authenticated requests.
CASE-158: /api/license/status returns 401 without auth.
CASE-030 verify: /api/license/status requires JWT.
CASE-164: /health/detail includes license_valid field.
CASE-034: GRACE_PERIOD_HOURS read from env var.
CASE-035: CACHE_TTL_DAYS read from env var.
"""
import pytest
import os
import importlib
from unittest.mock import patch


@pytest.mark.asyncio
async def test_license_status_requires_auth(client):
    """CASE-030/158: /api/license/status returns 401 without JWT."""
    resp = await client.get("/api/license/status")
    assert resp.status_code in (401, 403), \
        f"CASE-030: License status should require auth, got {resp.status_code}"


@pytest.mark.asyncio
async def test_license_status_returns_200_for_authenticated_user(client, auth_tokens):
    """CASE-157: Authenticated request to /api/license/status returns 200."""
    headers = {"Authorization": f"Bearer {auth_tokens['access_token']}"}
    resp = await client.get("/api/license/status", headers=headers)
    assert resp.status_code == 200, \
        f"CASE-157: /api/license/status should return 200 with valid JWT, got {resp.status_code}"
    data = resp.json()
    assert "valid" in data, "License status response must include 'valid' field"
    assert "mode" in data, "License status response must include 'mode' field"


@pytest.mark.asyncio
async def test_health_detail_includes_license_valid(client, auth_tokens):
    """CASE-164: /health/detail includes license_valid boolean field."""
    headers = {"Authorization": f"Bearer {auth_tokens['access_token']}"}
    resp = await client.get("/health/detail", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "license_valid" in data, \
        f"CASE-164: /health/detail must include license_valid, got: {data}"
    assert isinstance(data["license_valid"], bool)


def test_grace_period_hours_env_var_respected():
    """CASE-034: GRACE_PERIOD_HOURS is read from environment variable."""
    import sys
    # Remove cached module so reload reads fresh env
    mod_key = next((k for k in sys.modules if "routers.license" in k or k == "routers.license"), None)
    with patch.dict(os.environ, {"GRACE_PERIOD_HOURS": "48"}):
        import routers.license as lic_module
        importlib.reload(lic_module)
        assert lic_module.GRACE_PERIOD_HOURS == 48, \
            f"CASE-034: GRACE_PERIOD_HOURS should be 48 from env, got {lic_module.GRACE_PERIOD_HOURS}"
    # Reload back to original env
    importlib.reload(lic_module)


def test_cache_ttl_days_env_var_respected():
    """CASE-035: CACHE_TTL_DAYS is read from environment variable."""
    with patch.dict(os.environ, {"CACHE_TTL_DAYS": "14"}):
        import routers.license as lic_module
        importlib.reload(lic_module)
        assert lic_module.CACHE_TTL_DAYS == 14, \
            f"CASE-035: CACHE_TTL_DAYS should be 14 from env, got {lic_module.CACHE_TTL_DAYS}"
    importlib.reload(lic_module)
