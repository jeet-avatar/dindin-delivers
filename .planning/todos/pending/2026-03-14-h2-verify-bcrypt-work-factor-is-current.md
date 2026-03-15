---
created: 2026-03-14T00:00:00Z
title: Verify bcrypt work factor is current best practice (cost factor ≥ 12)
area: security/auth
severity: LOW
files:
  - apps/web/p2p-platform/backend/main_new.py:1038
---

## Problem

`CryptContext(schemes=["bcrypt"], deprecated="auto")` at `main_new.py:1038` uses passlib's default bcrypt cost factor. Passlib's default is 12, which was considered adequate in 2014. As of 2026, OWASP recommends cost factor ≥ 12 and ideally 13–14 on modern hardware. Not verified what the actual value is.

## Solution

1. Verify current cost factor: `pwd_context.default_scheme().default_rounds` or hash a test string and inspect the `$2b$XX$` prefix
2. If < 12: update to `CryptContext(schemes=["bcrypt"], bcrypt__rounds=13, deprecated="auto")`
3. Passlib handles legacy passwords automatically via `deprecated="auto"` — rehashes on next login
4. Run benchmark: `time get_password_hash("testpassword")` — should take ~100–300ms at cost 13

No breaking changes — passlib auto-upgrades hashes transparently.

## Implemented

- **Finding**: Default was passlib's implicit 12 rounds (not explicitly set)
- **Action**: Upgraded to explicit `bcrypt__rounds=13` across 6 files:
  - `main_new.py:1038`
  - `reset_demo_accounts.py:22`
  - `reset_admin.py:11`
  - `migrate_vendor_auth.py:39`
  - `order_flow.py:4379` and `4435`
- `deprecated="auto"` means existing hashes (at rounds < 13) are transparently rehashed on next successful login — no user lockout
