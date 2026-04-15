"""
In-memory NetSuite TBA credential store.
SECURITY: Credentials NEVER leave server RAM.
           NEVER write to DB, disk, logs, or env vars.
Keyed by user_id (int) from JWT sub claim.
"""
import threading
from dataclasses import dataclass
from typing import Optional
from datetime import datetime, timezone


# SECURITY: TBA credentials stored as plaintext strings in RAM only.
# This is intentional: credentials are never written to disk, DB, logs, or env vars.
# RAM plaintext is the accepted trade-off for single-tenant BYOC deployments.
# Mitigations: process isolation (Docker), no swap on EBS, container is non-root.
@dataclass
class NetSuiteCreds:
    account_id: str
    token_key: str
    token_secret: str
    consumer_key: str
    consumer_secret: str
    authenticated_at: datetime
    account_name: Optional[str] = None


_store: dict[int, NetSuiteCreds] = {}
_lock = threading.Lock()


def set_session_creds(user_id: int, creds: NetSuiteCreds) -> None:
    """Store TBA credentials for a user. Overwrites any existing entry."""
    with _lock:
        _store[user_id] = creds


def get_session_creds(user_id: int) -> Optional[NetSuiteCreds]:
    """Retrieve TBA credentials. Returns None if not authenticated."""
    with _lock:
        return _store.get(user_id)


def clear_session_creds(user_id: int) -> bool:
    """Remove TBA credentials. Returns True if entry existed."""
    with _lock:
        return _store.pop(user_id, None) is not None


def is_authenticated(user_id: int) -> bool:
    with _lock:
        return user_id in _store
