"""
Health & Startup Tests
=======================
Covers: TC-DEPLOY-03, TC-STARTUP-01

Architecture layer: FastAPI App → rawapi.py → startup_validation()

These tests verify the server entry point is wired correctly and the
fail-fast guard prevents starting without critical configuration.
"""
import pytest


@pytest.mark.asyncio
async def test_health_returns_200(client):
    """
    TC-DEPLOY-03: GET /health returns 200 with status ok.

    Architecture: rawapi.py GET /health endpoint.
    This is the liveness probe used by Docker Compose and AWS ECS.
    If this fails: check rawapi.py for the @app.get('/health') route.
    Next action: grep rawapi.py for 'def health'
    """
    resp = await client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"


@pytest.mark.asyncio
async def test_health_response_shape(client, auth_tokens):
    """
    TC-DEPLOY-03b: GET /health/detail returns full diagnostics (requires auth).

    Architecture: rawapi.py GET /health/detail → Depends(require_user).
    CASE-031: /health is public (status only). /health/detail requires auth and returns
    service, ai_ready, suitecloud_ready, license_valid, license_plan.
    If this fails: /health/detail is not wired or require_user dependency is missing.
    """
    headers = {"Authorization": f"Bearer {auth_tokens['access_token']}"}
    resp = await client.get("/health/detail", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body.get("service") == "arthaBuild-api"
    assert "ai_ready" in body
    assert "suitecloud_ready" in body


@pytest.mark.asyncio
async def test_chatbot_unauthenticated_returns_401(client):
    """
    TC-AB-000: POST /api/chatbot/process without auth returns 401 (security gate).

    Architecture: rawapi.py → Depends(require_user) → HTTPBearer → 401 if no token.
    This test verifies the auth guard added in Phase 12 hardening.
    If this fails: require_user dependency is not wired to the endpoint.
    Next action: grep rawapi.py for 'Depends(require_user)' on /api/chatbot/process
    """
    resp = await client.post("/api/chatbot/process", json={"message": "What is SuiteScript?"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_chatbot_returns_200_with_ollama(client, auth_tokens):
    """
    TC-AB-001: POST /api/chatbot/process returns 200 with AI response when Ollama is running.

    Architecture: rawapi.py → Depends(require_user) → _ai_ready guard (Phase 3: Ollama health
    check passes). Phase 1/2: returned 503 when Ollama not loaded.
    Phase 3+: _ai_ready=True when Ollama running + models pulled. Returns 200 with response.
    Response shape (Phase 4 contract): {response, intent, session_id, latency_ms}
    If this fails: Ollama is not running, models not pulled, or _check_ollama_available() broken.
    Next action: curl http://localhost:11434/api/tags to verify Ollama + models are available.
    """
    headers = {"Authorization": f"Bearer {auth_tokens['access_token']}"}
    resp = await client.post(
        "/api/chatbot/process",
        json={"message": "What is SuiteScript?"},
        headers=headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    # Core response
    assert "response" in body
    assert len(body["response"]) > 0
    # Phase 4 contract: intent, session_id, latency_ms must be present
    assert "intent" in body, f"Missing 'intent' in response: {body}"
    assert body["intent"] in ("general_chat", "generate_suitescript", "fetch_netsuite_data", "manage_sdf_project"), \
        f"Unexpected intent: {body['intent']}"
    assert "session_id" in body, f"Missing 'session_id' in response: {body}"
    assert "latency_ms" in body, f"Missing 'latency_ms' in response: {body}"
    assert isinstance(body["latency_ms"], int)


@pytest.mark.asyncio
async def test_chatbot_reads_message_field(client, auth_tokens):
    """
    TC-AB-002: POST /api/chatbot/process reads "message" field (not legacy "prompt").

    Architecture: rawapi.py → Depends(require_user) → data.get("message") or data.get("prompt", "")
    Phase 4 frontend sends {"message": ..., "session_id": ...}.
    If this fails: backend was changed back to reading "prompt" only — Phase 4 frontend breaks.
    Next action: grep rawapi.py for 'data.get("message")'
    """
    headers = {"Authorization": f"Bearer {auth_tokens['access_token']}"}
    resp = await client.post(
        "/api/chatbot/process",
        json={"message": "What is a NetSuite vendor bill?"},
        headers=headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "response" in body
    # Response must be non-trivial — an empty question would return the fallback "I could not find..."
    # A real question should produce a longer, more substantive response
    assert len(body["response"]) > 10, "Response is suspiciously short — 'message' field may not be read"


@pytest.mark.asyncio
async def test_chatbot_session_id_returned(client, auth_tokens):
    """
    TC-AB-003: POST /api/chatbot/process returns the session_id from the request.

    Architecture: rawapi.py → Depends(require_user) → session_id = data.get("session_id", "default")
    Phase 4 frontend persists session_id across messages for conversation continuity.
    """
    headers = {"Authorization": f"Bearer {auth_tokens['access_token']}"}
    custom_session = "test-session-abc123"
    resp = await client.post(
        "/api/chatbot/process",
        json={"message": "Hello NetSuite", "session_id": custom_session},
        headers=headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body.get("session_id") == custom_session


@pytest.mark.asyncio
async def test_startup_fails_without_jwt_secret_key(monkeypatch):
    """
    TC-DEPLOY-06: Insecure/weak JWT_SECRET_KEY causes lifespan startup to raise RuntimeError.

    Architecture: rawapi.py lifespan checks SECRET_KEY against insecure defaults and
    enforces minimum 32-character length. auth_utils.py also raises at import time if
    JWT_SECRET_KEY is unset entirely.
    If this fails: the startup guard was removed from lifespan.
    Next action: grep rawapi.py for 'insecure default'
    """
    import rawapi
    # Patch the module-level SECRET_KEY to simulate a weak/default key.
    # Using monkeypatch to restore the original value after the test.
    monkeypatch.setattr(rawapi, "SECRET_KEY", "changeme")
    from rawapi import lifespan, app
    import contextlib
    async with contextlib.AsyncExitStack() as stack:
        with pytest.raises(RuntimeError, match="insecure default"):
            await stack.enter_async_context(lifespan(app))
