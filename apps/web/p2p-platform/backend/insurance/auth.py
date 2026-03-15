"""API key authentication for insurance providers."""
import hashlib
from fastapi import HTTPException, Header, Depends
from sqlalchemy.orm import Session as DBSession
from database import get_db
from insurance.models import InsuranceApiKey


def hash_api_key(raw_key: str) -> str:
    """Hash an API key using SHA256.

    Args:
        raw_key: The raw API key string to hash.

    Returns:
        The SHA256 hexadecimal hash of the API key.
    """
    return hashlib.sha256(raw_key.encode()).hexdigest()


def validate_api_key(raw_key: str, db: DBSession) -> InsuranceApiKey:
    """Validate an API key against the database.

    Checks that the hashed key exists in the database and is active.

    Args:
        raw_key: The raw API key string to validate.
        db: SQLAlchemy database session.

    Returns:
        The InsuranceApiKey object if valid.

    Raises:
        HTTPException: With 401 status code if key is invalid or inactive.
    """
    key_hash = hash_api_key(raw_key)
    api_key = db.query(InsuranceApiKey).filter(
        InsuranceApiKey.api_key_hash == key_hash,
        InsuranceApiKey.is_active == True
    ).first()
    if not api_key:
        raise HTTPException(
            status_code=401,
            detail="Invalid or inactive insurance API key"
        )
    return api_key


def require_insurance_api_key(
    x_insurance_api_key: str = Header(...),
    db: DBSession = Depends(get_db)
) -> InsuranceApiKey:
    """FastAPI dependency to validate insurance API key from headers.

    Validates the API key from the X-Insurance-API-Key header.

    Args:
        x_insurance_api_key: The API key from the X-Insurance-API-Key header.
        db: SQLAlchemy database session (injected by FastAPI).

    Returns:
        The InsuranceApiKey object if valid.

    Raises:
        HTTPException: With 401 status code if key is invalid or inactive.
    """
    return validate_api_key(x_insurance_api_key, db)
