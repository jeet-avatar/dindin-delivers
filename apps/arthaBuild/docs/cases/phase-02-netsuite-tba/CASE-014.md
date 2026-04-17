---
id: CASE-014
title: "SessionStore credentials stored as plaintext strings in RAM dict"
phase: "02"
phase_name: "NetSuite TBA Session"
category: ARCH_VIOLATION
severity: MEDIUM
status: DONE
created: 2026-04-10
updated: 2026-04-11
assignee: "Kavya"
agent: "gsd-debugger"
blocks: []
blocked_by: []
files:
  - path: src/backend/session_store.py
    lines: "13-24"
---

## Why This Case Was Created
Triggered by the ARCH_VIOLATION audit dimension. CLAUDE.md states that TBA credentials "live ONLY in `session_store.py` Python dict in RAM" — this is correct and is the right architectural decision. However, the credentials are stored as plaintext Python strings, which means any process memory dump, core dump, or memory debugging tool that has access to the Python heap can read the credentials in plaintext. The architectural rule says RAM only (correct) but does not address in-memory encryption, which is an additional hardening layer.

## What Is Wrong
`src/backend/session_store.py` lines 13–24 define the `NetSuiteCreds` dataclass with all sensitive fields as plain Python `str`:

```python
@dataclass
class NetSuiteCreds:
    account_id: str           # plaintext in RAM
    token_key: str            # plaintext in RAM  ← TBA access token
    token_secret: str         # plaintext in RAM  ← TBA token secret
    consumer_key: str         # plaintext in RAM  ← OAuth consumer key
    consumer_secret: str      # plaintext in RAM  ← OAuth consumer secret
    authenticated_at: datetime
    account_name: Optional[str] = None
```

And the store itself is a plain dict (line 24):
```python
_store: dict[int, NetSuiteCreds] = {}
```

The five string fields (`token_key`, `token_secret`, `consumer_key`, `consumer_secret`, plus `account_id`) are stored as Python `str` objects. Python strings are immutable objects managed by the interpreter's memory allocator. They are not pinned to memory — the garbage collector can move them between heap locations, potentially leaving copies in freed memory. A process memory dump (via `/proc/PID/mem`, Python's `tracemalloc`, or a Docker container checkpoint) would reveal the credentials in plaintext.

The architectural decision to keep credentials RAM-only (not disk, not DB, not env) is correct and effectively protects against the most common persistence-based attacks. The in-memory plaintext representation is a secondary risk that applies to memory forensics scenarios.

## Why It Was Done This Way (Root Cause)
Storing credentials as plain strings is the standard Python approach and is appropriate for most applications. The RAM-only storage rule was implemented correctly. In-memory encryption (e.g., using `cryptography` library's `Fernet` with an ephemeral key) was not implemented because it adds complexity and the threat model may not require it for the target deployment (single-tenant BYOC). The current implementation is a reasonable MVP security posture.

## What Is Done Right
- Thread safety: the `threading.Lock()` at line 25 correctly protects concurrent access — `set_session_creds`, `get_session_creds`, and `clear_session_creds` all use `with _lock:`.
- Keyed by `user_id` (int): credentials are isolated per user — User A cannot access User B's credentials.
- `clear_session_creds` wipes the entry from the dict on logout, removing the reference so the string objects become eligible for garbage collection.
- NEVER written to disk, DB, logs, or env vars — the CLAUDE.md invariant is fully upheld.

## How To Fix It
**Option A (minimal — document the risk):** Add a docstring to `session_store.py` documenting the plaintext-in-RAM characteristic and noting it as a known architectural trade-off:

```python
"""
In-memory NetSuite TBA credential store.
SECURITY: Credentials NEVER leave server RAM.
           NEVER write to DB, disk, logs, or env vars.
KNOWN LIMITATION: Credentials are stored as plaintext Python strings.
           In a memory forensics scenario (core dump, /proc/mem access),
           they would be readable. Mitigate with OS-level memory protection
           (SELinux, seccomp in Docker). In-memory encryption not implemented
           because it adds key management complexity for a single-tenant deployment.
Keyed by user_id (int) from JWT sub claim.
"""
```

**Option B (full fix — ephemeral key encryption):**

```python
import os
from cryptography.fernet import Fernet

# Ephemeral key — generated fresh on each process start, stored nowhere
_EPHEMERAL_KEY = Fernet.generate_key()
_fernet = Fernet(_EPHEMERAL_KEY)

@dataclass
class NetSuiteCreds:
    _token_key_enc: bytes       # encrypted bytes, not plain str
    _token_secret_enc: bytes
    _consumer_key_enc: bytes
    _consumer_secret_enc: bytes
    account_id: str             # non-secret, can remain plaintext
    authenticated_at: datetime
    account_name: Optional[str] = None

    def get_token_key(self) -> str:
        return _fernet.decrypt(self._token_key_enc).decode()
    # ... etc.
```

Option A is the recommended first step for documentation clarity. Option B requires adding `cryptography` to `requirements.txt` and restructuring `NetSuiteCreds`.

## Architecture Mapping

**Layer:** Backend Security — In-Memory Credential Store

**Flow:**

    POST /api/netsuite/authenticate
      → _validate_tba_credentials(account_id, token_key, ...)
        → set_session_creds(user_id, NetSuiteCreds(token_key="plaintext", ...))
                                               ↑
                                      THIS CASE LIVES HERE (plaintext in RAM)
          → _store[user_id] = creds (dict in process heap)

    GET /api/netsuite/status
      → get_session_creds(user_id)
        → returns NetSuiteCreds with plaintext fields accessible

**Upstream:** `routers/netsuite.py` authenticate route calls `set_session_creds`

**Downstream:** `routers/netsuite.py`, `routers/deploy.py` call `get_session_creds` to retrieve credentials for NetSuite API calls

## Verification
- [ ] Grep proof: `grep -n "str\|bytes" src/backend/session_store.py` → shows all fields as `str` (plaintext)
- [ ] Grep proof: `grep -rn "encrypt\|Fernet\|cryptography" src/backend/session_store.py` → empty (confirms no encryption)
- [ ] Documentation fix proof: `grep -n "KNOWN LIMITATION\|plaintext" src/backend/session_store.py` → shows added docstring

## Downstream Impact
**Impact if unfixed:** Security Risk (low probability, high consequence)

In a standard web server deployment, this is low risk — process memory is protected by the OS. In a containerized environment (Docker), a container escape vulnerability or a misconfigured debug tool could expose the credentials. The primary attack surface (disk storage, logging) is fully protected. The residual risk is memory forensics, which requires significant attacker capability.

## Links
- Phase SUMMARY: `.planning/phases/02-netsuite-tba/02-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: None
