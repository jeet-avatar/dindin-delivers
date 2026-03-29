# apps/hospital-pricing/backend/tests/test_auth.py
import os
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-at-least-32-chars-long")
os.environ.setdefault("OPENAI_API_KEY", "sk-test-placeholder")

import pytest
from auth.jwt import create_access_token, verify_token
from models.hospital import UserRole


def test_create_and_verify_token():
    payload = {
        "sub": "user-123",
        "entity_id": "ent-456",
        "role": UserRole.procurement_officer.value,
    }
    token = create_access_token(payload)
    decoded = verify_token(token)
    assert decoded["sub"] == "user-123"
    assert decoded["role"] == "procurement_officer"


def test_verify_invalid_token_raises():
    with pytest.raises(Exception):
        verify_token("not.a.valid.token")


def test_verify_expired_token_raises():
    """Token with expiry in the past should raise."""
    from datetime import timedelta
    payload = {"sub": "user-expired"}
    # Create token that expires immediately (negative expiry)
    token = create_access_token(payload, expires_delta=timedelta(seconds=-1))
    with pytest.raises(Exception):
        verify_token(token)
