"""Reset links are one-use capabilities, never general session credentials."""
import os
import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlparse

import pytest
from fastapi.testclient import TestClient
from jose import jwt

import database
import main
import security

UA = {"User-Agent": "Mozilla/5.0"}


@pytest.fixture
def account(monkeypatch):
    security._rate_store.clear()
    monkeypatch.setattr(main, "rate_limit", lambda *a, **k: None)
    monkeypatch.setattr(main, "check_credential_stuffing", lambda *a, **k: None)
    api = TestClient(main.app)
    email = f"reset-{uuid.uuid4().hex}@example.com"
    response = api.post("/api/auth/register", headers=UA, json={
        "email": email, "password": "Original123", "name": "Reset test",
    })
    assert response.status_code == 200
    return api, database.get_user_by_email(email)


def test_email_link_resets_once_and_new_password_signs_in(account, monkeypatch):
    api, user = account
    sent = []
    monkeypatch.setattr(main, "_send_reset_email", lambda email, url: sent.append((email, url)))
    response = api.post("/api/auth/forgot-password", json={"email": user["email"].upper()})
    assert response.status_code == 200
    assert len(sent) == 1 and sent[0][0] == user["email"]
    token = parse_qs(urlparse(sent[0][1]).query)["token"][0]
    body = {"token": token, "new_password": "Replacement456"}
    assert api.post("/api/auth/reset-password", json=body).status_code == 200
    assert api.post("/api/auth/reset-password", json=body).status_code == 400
    for password, status in [("Original123", 401), ("Replacement456", 200)]:
        assert api.post("/api/auth/login", headers=UA, json={
            "email": user["email"], "password": password,
        }).status_code == status


def test_reset_token_cannot_authenticate_or_create_bridge_token(account):
    api, user = account
    token = main._create_reset_token(user["id"], user["email"])
    headers = {"Authorization": f"Bearer {token}", **UA}
    assert api.get("/api/auth/me", headers=headers).status_code == 401
    assert api.post("/api/auth/bridge-token", headers=headers).status_code == 401


@pytest.mark.parametrize("changes", [
    {"exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
    {"exp": None}, {"sub": "invalid"}, {"sub": "999999999"},
    {"purpose": "login"}, {"password_state": None}, {"password_state": "wrong"},
])
def test_invalid_link_does_not_change_password(account, changes):
    api, user = account
    token = main._create_reset_token(user["id"], user["email"])
    claims = jwt.get_unverified_claims(token)
    claims.update(changes)
    if claims.get("exp") is None:
        claims.pop("exp", None)
    altered = jwt.encode(claims, os.environ["JWT_SECRET"], algorithm="HS256")
    assert api.post("/api/auth/reset-password", json={
        "token": altered, "new_password": "Replacement456",
    }).status_code == 400
    assert database.get_user_by_id(user["id"])["password_hash"] == user["password_hash"]


def test_password_change_invalidates_all_prior_links_and_stale_writes(account):
    api, user = account
    token = main._create_reset_token(user["id"], user["email"])
    assert database.reset_user_password(user["id"], user["password_hash"], main.hash_password("NewPassword9"))
    assert not database.reset_user_password(user["id"], user["password_hash"], "stale")
    assert api.post("/api/auth/reset-password", json={
        "token": token, "new_password": "Replacement456",
    }).status_code == 400


def test_unknown_email_has_same_response_without_sending(account, monkeypatch):
    api, user = account
    sent = []
    monkeypatch.setattr(main, "_send_reset_email", lambda *args: sent.append(args))
    unknown = api.post("/api/auth/forgot-password", json={"email": "absent@example.com"})
    assert not sent
    known = api.post("/api/auth/forgot-password", json={"email": user["email"]})
    assert unknown.status_code == known.status_code == 200
    assert unknown.json() == known.json()
