"""
CASE-190: CSRF protection via JWT-in-Authorization-header design.
JWT is stored in memory (not cookies), sent via Authorization: Bearer header.
Cross-site requests cannot include custom headers -> no CSRF vector exists.
Tests verify: (1) no JWT cookie Set-Cookie header on login, (2) CORS configured.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_login_response_has_no_jwt_cookie(client: AsyncClient, registered_user):
    """Login must return JWT in response body, not in Set-Cookie header."""
    resp = await client.post("/api/auth/login", json={
        "username": registered_user["email"],
        "password": registered_user["password"],
    })
    assert resp.status_code == 200
    # JWT must not be in a cookie (prevents CSRF)
    set_cookie = resp.headers.get("set-cookie", "")
    assert "access_token" not in set_cookie, \
        "JWT must not be set as cookie -- use Authorization header to prevent CSRF"
    # JWT must be in response body
    data = resp.json()
    assert "access_token" in data, "JWT must be returned in response body"


def test_cors_config_has_no_wildcard():
    """rawapi.py CORS must not allow wildcard origin."""
    import os
    rawapi_path = os.path.join(os.path.dirname(__file__), "../../rawapi.py")
    with open(rawapi_path) as f:
        content = f.read()
    # Check that there's no allow_origins=["*"] pattern
    assert 'allow_origins=["*"]' not in content and "allow_origins=['*']" not in content, \
        "Wildcard CORS origin is not allowed in production"


def test_cors_config_uses_allowed_origins_env():
    """rawapi.py CORS must use ALLOWED_ORIGINS env var for explicit origin control."""
    import os
    rawapi_path = os.path.join(os.path.dirname(__file__), "../../rawapi.py")
    with open(rawapi_path) as f:
        content = f.read()
    assert "ALLOWED_ORIGINS" in content, \
        "CORS must use ALLOWED_ORIGINS env var for explicit origin allowlist"
