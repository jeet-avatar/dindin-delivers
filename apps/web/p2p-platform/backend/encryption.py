"""
Dollor.ai — Field-Level Encryption for PII at Rest
====================================================

Uses Fernet symmetric encryption (AES-128-CBC + HMAC-SHA256) for
encrypting sensitive database fields like bank details and API secrets.

Key management:
  - ENCRYPTION_KEY env var must be a valid Fernet key (base64-encoded 32 bytes)
  - Generate one: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
  - Store in AWS Secrets Manager, load via ECS task definition

Usage:
  # Write
  driver.bank_routing_number = encrypt_field("121042882")

  # Read
  routing = decrypt_field(driver.bank_routing_number)

  # Check-only (e.g., for bool display without decrypting full value)
  has_bank = is_encrypted(driver.bank_routing_number)
"""

import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Lazy-loaded Fernet instance
_fernet = None
_ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "")


def _get_fernet():
    """Get or create Fernet instance. Lazy-loaded so import doesn't fail without key."""
    global _fernet
    if _fernet is not None:
        return _fernet

    key = os.getenv("ENCRYPTION_KEY", _ENCRYPTION_KEY)
    if not key:
        logger.warning("ENCRYPTION_KEY not set — field encryption disabled (plaintext fallback)")
        return None

    try:
        from cryptography.fernet import Fernet
        _fernet = Fernet(key.encode() if isinstance(key, str) else key)
        return _fernet
    except Exception as e:
        logger.error(f"Failed to initialize Fernet encryption: {e}")
        return None


def encrypt_field(value: Optional[str]) -> Optional[str]:
    """
    Encrypt a string field for database storage.
    Returns base64-encoded ciphertext prefixed with 'enc:' marker.
    If encryption is unavailable, returns plaintext (graceful degradation).
    """
    if not value:
        return value

    fernet = _get_fernet()
    if fernet is None:
        return value  # Graceful fallback — store plaintext if no key

    try:
        encrypted = fernet.encrypt(value.encode("utf-8"))
        return f"enc:{encrypted.decode('utf-8')}"
    except Exception as e:
        logger.error(f"Encryption failed: {e}")
        return value  # Fallback to plaintext on error


def decrypt_field(value: Optional[str]) -> Optional[str]:
    """
    Decrypt a field from database storage.
    Detects 'enc:' prefix to distinguish encrypted from legacy plaintext.
    Returns plaintext for non-encrypted values (backward compatible).
    """
    if not value:
        return value

    # Not encrypted (legacy data) — return as-is
    if not value.startswith("enc:"):
        return value

    fernet = _get_fernet()
    if fernet is None:
        logger.warning("Cannot decrypt field — ENCRYPTION_KEY not set")
        return "[encrypted]"  # Don't expose ciphertext

    try:
        ciphertext = value[4:]  # Strip 'enc:' prefix
        decrypted = fernet.decrypt(ciphertext.encode("utf-8"))
        return decrypted.decode("utf-8")
    except Exception as e:
        logger.error(f"Decryption failed: {e}")
        return "[decryption error]"


def is_encrypted(value: Optional[str]) -> bool:
    """Check if a field value is encrypted (has 'enc:' prefix)."""
    return bool(value and value.startswith("enc:"))


def mask_value(value: Optional[str], show_last: int = 4) -> Optional[str]:
    """
    Mask a sensitive value for display (e.g., "****2882").
    Works on both encrypted and plaintext values.
    """
    if not value:
        return None

    # Decrypt first if encrypted
    plain = decrypt_field(value)
    if not plain or plain.startswith("["):
        return "****"

    if len(plain) <= show_last:
        return plain

    return "*" * (len(plain) - show_last) + plain[-show_last:]


def mask_email(email: Optional[str]) -> str:
    """
    Mask an email for logging (e.g., "j***@gmail.com").
    Safe to use in log statements instead of raw email.
    """
    if not email or "@" not in email:
        return "***"
    local, domain = email.rsplit("@", 1)
    if len(local) <= 1:
        return f"*@{domain}"
    return f"{local[0]}***@{domain}"
