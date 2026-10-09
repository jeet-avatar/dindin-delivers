"""Sign-up and sign-in treat an email address the same whatever letter case it is typed in."""
import sqlite3
from unittest.mock import patch

from fastapi.testclient import TestClient

import database
import main
import security

UA = {"User-Agent": "Mozilla/5.0 (Macintosh) Safari/605.1.15"}


def client(tmp_path):
    database.DB_PATH = str(tmp_path / "auth.db")
    database.init_db()
    security._rate_limits.clear() if hasattr(security, "_rate_limits") else None
    return TestClient(main.app)


def insert_legacy(email, password, name="Legacy"):
    """An account created before sign-ups were lowercased."""
    with database.db() as conn:
        conn.execute("INSERT INTO users (email, password_hash, name, trial_ends_at) VALUES (?, ?, ?, ?)",
                     (email, security.hash_password(password) if hasattr(security, "hash_password") else main.hash_password(password),
                      name, "2026-10-13T00:00:00+00:00"))
        conn.commit()


def test_mixed_case_signup_can_sign_in_lowercase_and_is_stored_lowercase(tmp_path):
    with patch.object(main, "rate_limit", lambda *a, **k: None), patch.object(main, "check_credential_stuffing", lambda *a, **k: None):
        api = client(tmp_path)
        made = api.post("/api/auth/register", json={"email": "Sylvia.Test@Example.com", "password": "Secret123", "name": "S"}, headers=UA)
        assert made.status_code == 200, made.text
        assert made.json()["user"]["email"] == "sylvia.test@example.com"
        for typed in ("sylvia.test@example.com", "SYLVIA.TEST@EXAMPLE.COM", " Sylvia.Test@example.com"):
            signed = api.post("/api/auth/login", json={"email": typed.strip(), "password": "Secret123"}, headers=UA)
            assert signed.status_code == 200, (typed, signed.text)
        again = api.post("/api/auth/register", json={"email": "SYLVIA.test@example.com", "password": "Secret123", "name": "S"}, headers=UA)
        assert again.status_code == 409
        wrong = api.post("/api/auth/login", json={"email": "sylvia.test@example.com", "password": "Wrong1234"}, headers=UA)
        assert wrong.status_code == 401


def test_legacy_accounts_that_differ_by_case_sign_in_with_their_own_password(tmp_path):
    with patch.object(main, "rate_limit", lambda *a, **k: None), patch.object(main, "check_credential_stuffing", lambda *a, **k: None):
        api = client(tmp_path)
        insert_legacy("Essa@Example.com", "FirstPass1", "first")
        insert_legacy("essa@example.com", "SecondPass2", "second")
        first = api.post("/api/auth/login", json={"email": "essa@example.com", "password": "FirstPass1"}, headers=UA)
        second = api.post("/api/auth/login", json={"email": "ESSA@example.com", "password": "SecondPass2"}, headers=UA)
        assert first.status_code == 200 and first.json()["user"]["name"] == "first"
        assert second.status_code == 200 and second.json()["user"]["name"] == "second"
