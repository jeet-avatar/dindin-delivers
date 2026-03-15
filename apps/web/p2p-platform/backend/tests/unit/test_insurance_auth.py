"""Tests for insurance API key authentication."""
import pytest
import hashlib
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException
from models import Base
from insurance.models import InsuranceApiKey
from insurance.auth import hash_api_key, validate_api_key


@pytest.fixture
def db_session():
    """Create an in-memory SQLite database for testing."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


class TestHashApiKey:
    """Tests for hash_api_key function."""

    def test_hash_is_deterministic(self):
        """Same input should produce same hash."""
        key = "my-key"
        hash1 = hash_api_key(key)
        hash2 = hash_api_key(key)
        assert hash1 == hash2

    def test_different_keys_different_hashes(self):
        """Different inputs should produce different hashes."""
        hash1 = hash_api_key("key-1")
        hash2 = hash_api_key("key-2")
        assert hash1 != hash2

    def test_hash_format(self):
        """Hash should be 64 characters (SHA256 hex)."""
        result = hash_api_key("test")
        assert len(result) == 64
        # Should be valid hex
        try:
            int(result, 16)
        except ValueError:
            pytest.fail("Hash is not valid hexadecimal")

    def test_hash_uses_sha256(self):
        """Hash should use SHA256."""
        key = "test-key"
        expected = hashlib.sha256(key.encode()).hexdigest()
        result = hash_api_key(key)
        assert result == expected


class TestValidateApiKey:
    """Tests for validate_api_key function."""

    def test_valid_key_returns_provider(self, db_session):
        """Valid API key should return the InsuranceApiKey object."""
        raw_key = "ins_live_abc123"
        api_key = InsuranceApiKey(
            provider_name="ABI",
            api_key_hash=hash_api_key(raw_key),
            is_active=True,
            permissions=["read:events", "write:events"]
        )
        db_session.add(api_key)
        db_session.commit()

        result = validate_api_key(raw_key, db_session)
        assert result.provider_name == "ABI"
        assert result.api_key_hash == hash_api_key(raw_key)
        assert result.is_active is True

    def test_invalid_key_raises_401(self, db_session):
        """Invalid API key should raise HTTPException with 401 status."""
        with pytest.raises(HTTPException) as exc:
            validate_api_key("wrong-key", db_session)
        assert exc.value.status_code == 401
        assert "Invalid or inactive insurance API key" in exc.value.detail

    def test_inactive_key_raises_401(self, db_session):
        """Inactive API key should raise HTTPException with 401 status."""
        raw_key = "ins_live_abc123"
        api_key = InsuranceApiKey(
            provider_name="ABI",
            api_key_hash=hash_api_key(raw_key),
            is_active=False,
            permissions=["read:events"]
        )
        db_session.add(api_key)
        db_session.commit()

        with pytest.raises(HTTPException) as exc:
            validate_api_key(raw_key, db_session)
        assert exc.value.status_code == 401
        assert "Invalid or inactive insurance API key" in exc.value.detail

    def test_multiple_keys_correct_key_validated(self, db_session):
        """When multiple keys exist, the correct one should be returned."""
        key1 = "ins_live_key1"
        key2 = "ins_live_key2"

        api_key1 = InsuranceApiKey(
            provider_name="ABI",
            api_key_hash=hash_api_key(key1),
            is_active=True,
            permissions=["read:events"]
        )
        api_key2 = InsuranceApiKey(
            provider_name="SambaSafety",
            api_key_hash=hash_api_key(key2),
            is_active=True,
            permissions=["write:events"]
        )
        db_session.add(api_key1)
        db_session.add(api_key2)
        db_session.commit()

        result = validate_api_key(key1, db_session)
        assert result.provider_name == "ABI"

        result = validate_api_key(key2, db_session)
        assert result.provider_name == "SambaSafety"

    def test_case_sensitive_key_validation(self, db_session):
        """API key validation should be case-sensitive."""
        raw_key = "InsKey123"
        api_key = InsuranceApiKey(
            provider_name="ABI",
            api_key_hash=hash_api_key(raw_key),
            is_active=True
        )
        db_session.add(api_key)
        db_session.commit()

        # Correct case should work
        result = validate_api_key(raw_key, db_session)
        assert result.provider_name == "ABI"

        # Different case should fail
        with pytest.raises(HTTPException) as exc:
            validate_api_key(raw_key.lower(), db_session)
        assert exc.value.status_code == 401

    def test_empty_key_raises_401(self, db_session):
        """Empty API key should raise HTTPException with 401 status."""
        with pytest.raises(HTTPException) as exc:
            validate_api_key("", db_session)
        assert exc.value.status_code == 401

    def test_permissions_preserved(self, db_session):
        """Permissions should be preserved and returned with the key."""
        raw_key = "ins_live_key"
        permissions = ["read:events", "write:events", "delete:events"]
        api_key = InsuranceApiKey(
            provider_name="ABI",
            api_key_hash=hash_api_key(raw_key),
            is_active=True,
            permissions=permissions
        )
        db_session.add(api_key)
        db_session.commit()

        result = validate_api_key(raw_key, db_session)
        assert result.permissions == permissions
