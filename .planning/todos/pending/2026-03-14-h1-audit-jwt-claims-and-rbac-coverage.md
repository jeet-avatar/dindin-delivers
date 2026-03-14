---
created: 2026-03-14T00:00:00Z
title: Audit JWT claims and RBAC coverage across all endpoints
area: security/auth
severity: MEDIUM
files:
  - apps/web/p2p-platform/backend/auth_utils.py
  - apps/web/p2p-platform/backend/main_new.py
---

## Problem

RBAC uses a mix of 4 enforcement layers (JWT claim, ID claim, DB role query, entity filter). There is no guarantee every endpoint that should be protected actually uses `require_customer`, `require_driver`, etc. The global middleware is a catch-all but it only verifies signature — not role. A customer with a valid JWT could potentially call a driver endpoint if the endpoint only checks `require_any_auth`.

## Solution

1. Script to extract all `@app.{method}` route definitions that use `require_any_auth` instead of a role-specific dependency — those need manual review
2. Generate a table: endpoint → dependency → role enforced
3. For any endpoint with wrong or missing role check, add correct `Depends(require_driver)` etc.
4. Add integration test: customer token → driver endpoint → expect 401/403

Grep commands to start:
```bash
grep -n "require_any_auth" main_new.py  # endpoints using generic auth
grep -n "require_customer\|require_driver\|require_vendor\|require_admin" main_new.py | wc -l
```
