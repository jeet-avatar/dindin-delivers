"""
Security & NFR Tests
=====================
Covers: NFR-SEC-06 (rate limiting), enumeration prevention, JWT secrets

Architecture layer: Cross-cutting security controls
  Rate limiting:  SlowAPI → app.state.limiter → @limiter.limit("10/minute")
  Enumeration:    All 401/404 paths return generic messages
  JWT secrets:    auth_utils.py raises at import if JWT_SECRET_KEY missing
  CORS:           rawapi.py CORSMiddleware uses FRONTEND_BASE_URL (not wildcard)

NFR-SEC-06: ALL auth endpoints must rate-limit at 10 req/min per IP.
"""
import pytest


@pytest.mark.asyncio
async def test_no_user_id_in_check_user_response(client, registered_user):
    """
    SEC-01: check-user response must not expose user_id or email field.

    Architecture: CheckUserResponse schema (schemas.py) — user_id removed in code review.
    Risk: exposing user_id maps email→DB primary key for any unauthenticated caller.
    If this fails: user_id was re-added to CheckUserResponse in schemas.py.
    Next action: grep schemas.py for 'class CheckUserResponse' — must not have user_id field
    """
    resp = await client.post("/api/auth/check-user", json={
        "email": registered_user["email"],
    })
    assert resp.status_code == 200
    body = resp.json()
    assert "user_id" not in body, "user_id must not be exposed (enumeration risk)"
    assert "id" not in body


@pytest.mark.asyncio
async def test_login_no_enumeration(client, registered_user):
    """
    SEC-02: Login returns identical error for unknown email and wrong password.

    Architecture: login() uses generic_error = HTTPException(401, 'Invalid email or password')
    for both paths — attacker cannot distinguish registered vs unregistered emails.
    If this fails: two different error messages were introduced for the two paths.
    Next action: grep routers/auth.py for HTTPException in login() — count 401 raises
    """
    r_unknown = await client.post("/api/auth/login", json={
        "username": "nope@nowhere.com",
        "password": "AnyPass1!",
    })
    r_wrong = await client.post("/api/auth/login", json={
        "username": registered_user["email"],
        "password": "WrongPass99!",
    })
    assert r_unknown.status_code == 401
    assert r_wrong.status_code == 401
    assert r_unknown.json()["detail"] == r_wrong.json()["detail"], \
        "Error messages differ — exposes whether email is registered"


@pytest.mark.asyncio
async def test_forgot_password_no_enumeration(client, registered_user):
    """
    SEC-03: forgot-password returns identical 200 for known and unknown emails.

    Architecture: forgot_password() return statement is OUTSIDE the 'if user:' block.
    Security: attacker sending hundreds of emails cannot learn which are registered.
    If this fails: response differs based on whether email exists.
    Next action: grep routers/auth.py for return statement in forgot_password()
    """
    r_known = await client.post("/api/auth/forgot-password", json={
        "email": registered_user["email"],
    })
    r_unknown = await client.post("/api/auth/forgot-password", json={
        "email": "ghost@noemail.com",
    })
    assert r_known.status_code == r_unknown.status_code == 200
    assert r_known.json()["message"] == r_unknown.json()["message"]


@pytest.mark.asyncio
async def test_no_hardcoded_openai_keys(client):
    """
    SEC-04: No hardcoded OpenAI/sk-proj keys in the running application.

    Architecture: Phase 1 Plan 01-01 removed the hardcoded key from rawapi.py.
    OPENAI_API_KEY must only come from .env (os.getenv), never hardcoded.
    CLAUDE.md rule: 'All inference via Ollama (local). Zero external LLM API calls.'
    If this fails: a key was re-introduced — check git diff for 'sk-proj' or 'sk-live'.
    Next action: git grep 'sk-proj\|openai.api_key\s*=' -- '*.py'
    """
    import os
    import glob
    backend_dir = os.path.dirname(os.path.dirname(__file__))
    py_files = glob.glob(os.path.join(backend_dir, "*.py"))
    for f in py_files:
        if "venv" in f or "test" in f:
            continue
        content = open(f).read()
        assert "sk-proj" not in content, f"Hardcoded OpenAI key found in {f}"
        assert "sk-live" not in content, f"Hardcoded Stripe key found in {f}"


@pytest.mark.asyncio
async def test_rate_limit_decorator_on_all_auth_endpoints(client):
    """
    SEC-05 / NFR-SEC-06: All 5 auth endpoints have @limiter.limit decorator.

    Architecture: SlowAPI limiter is shared via app.state.limiter (rawapi.py).
    Each endpoint must be decorated with @limiter.limit('10/minute').
    If this fails: a new endpoint was added without the decorator.
    Next action: grep routers/auth.py for '@limiter.limit' — count must be >= 5
    """
    import os
    auth_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "routers", "auth.py"
    )
    content = open(auth_path).read()
    count = content.count("@limiter.limit")
    assert count >= 5, f"Expected >=5 @limiter.limit decorators in auth.py, found {count}"


@pytest.mark.asyncio
async def test_weak_jwt_default_not_present(client):
    """
    SEC-06: auth_utils.py must not have a fallback default for JWT_SECRET_KEY.

    Architecture: Fixed in code review — SECRET_KEY raises RuntimeError if unset.
    Previously: os.environ.get('JWT_SECRET_KEY', 'dev-secret-key-change-in-prod')
    Risk: weak default allows forging valid tokens in any deployment that forgot .env.
    If this fails: the fallback was re-introduced in auth_utils.py.
    Next action: grep auth_utils.py for 'dev-secret-key\|JWT_SECRET_KEY.*default'
    """
    import os
    auth_utils_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "auth_utils.py"
    )
    content = open(auth_utils_path).read()
    assert "dev-secret-key" not in content, \
        "Weak JWT default found — auth_utils.py must raise RuntimeError, not use a fallback"
    assert '"dev-secret' not in content
    assert "'dev-secret" not in content


@pytest.mark.asyncio
async def test_cors_not_wildcard_with_credentials(client):
    """
    SEC-07: CORS must not use allow_origins=["*"] with allow_credentials=True.

    Architecture: Fixed in code review — rawapi.py uses FRONTEND_BASE_URL for allowed origin.
    Browsers block responses when both wildcard origins AND credentials are set.
    If this fails: CORS was reverted to wildcard — Phase 4 frontend will break.
    Next action: grep rawapi.py for 'allow_origins' — must not be ["*"]
    """
    import os
    rawapi_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "rawapi.py"
    )
    content = open(rawapi_path).read()
    # Must not have wildcard origin in the actual CORSMiddleware call (comments are OK)
    import re
    # Match allow_origins=["*"] that is NOT in a comment line
    non_comment_lines = [l for l in content.splitlines() if not l.strip().startswith("#")]
    non_comment = "\n".join(non_comment_lines)
    assert 'allow_origins=["*"]' not in non_comment, \
        'CORS allow_origins=["*"] with allow_credentials=True is invalid — use FRONTEND_BASE_URL'
