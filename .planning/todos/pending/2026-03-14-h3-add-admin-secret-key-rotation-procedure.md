---
created: 2026-03-14T00:00:00Z
title: Add ADMIN_SECRET_KEY rotation procedure and usage audit
area: security/auth
severity: MEDIUM
files:
  - apps/web/p2p-platform/backend/main_new.py:355-357
  - apps/web/p2p-platform/backend/main_new.py:639
---

## Problem

`ADMIN_SECRET_KEY` is used as an alternative auth method for all `/api/admin/*` endpoints (`main_new.py:355–357`) and demo endpoints. It is stored in AWS Secrets Manager (`dollor/production/admin-yCDIFY`) but:
- No rotation procedure exists
- No audit log of who used it and when
- No expiry mechanism
- Any holder of this key has full admin access indefinitely

## Solution

1. **Audit log**: Add middleware logging when `ADMIN_SECRET_KEY` is used (log IP, path, timestamp to CloudWatch)
2. **Rotation procedure**: Document in `.planning/runbooks/admin-secret-key-rotation.md`
   - Update AWS Secrets Manager
   - Restart ECS tasks to pick up new secret
   - Verify admin login still works
3. **Usage review**: Grep all uses of `secret_key` query param check in main_new.py — ensure only truly necessary endpoints use it (some may be legacy/unused)
4. **Consider removing**: For most admin operations, JWT login is sufficient. `ADMIN_SECRET_KEY` should only be for emergency ops/recovery. Remove from any endpoint that doesn't need it.
