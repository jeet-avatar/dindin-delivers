# CC6.2 — Least Privilege Evidence
Generated: 2026-04-13T20:13:03.965202+00:00

## Purpose
Documents how ArthaBuild enforces the principle of least privilege by restricting
admin-only operations to users with the `admin` role.

## Implementation

Guard function: `require_admin()` in `src/backend/auth_utils.py`
- Calls `require_user()` to validate JWT
- Checks `user.role == "admin"` — raises HTTP 403 if not

## Admin-Only Endpoints

| Endpoint                            | Method  | Guard              |
|-------------------------------------|---------|--------------------|
| /api/admin/chats                    | GET     | require_admin()    |
| /api/admin/team                     | GET     | require_admin()    |
| /api/admin/team/invite              | POST    | require_admin()    |
| /api/admin/team/{user_id}           | DELETE  | require_admin()    |
| /api/admin/stats                    | GET     | require_admin()    |
| /api/admin/users                    | GET     | require_admin()    |
| /api/admin/users/{user_id}/role     | PATCH   | require_admin()    |
| /api/admin/users/{user_id}          | DELETE  | require_admin()    |
| /api/admin/audit                    | GET     | require_admin()    |
| /api/admin/audit/export             | GET     | require_admin()    |
| /api/admin/config                   | PUT     | require_admin()    |
| /api/admin/license                  | GET     | require_admin()    |
| /api/admin/teams                    | POST    | require_admin()    |
| /api/admin/users/{user_id}/send-reset | POST  | require_admin()    |
| /api/auth/sso/config (POST)         | POST    | require_admin()    |

## User Self-Service Endpoints (non-admin)

| Endpoint                 | Method | Description                    |
|--------------------------|--------|--------------------------------|
| /api/user/me             | GET    | Own profile only               |
| /api/user/change-password| POST   | Own password only              |
| /api/user/export-data    | POST   | Own data export (GDPR Art. 15) |
| /api/user/erase          | POST   | Own data erasure (GDPR Art. 17)|
| /api/chats               | GET    | Own chat sessions only         |
| /api/chats/<built-in function id>/messages | GET    | Own messages only              |

## Cross-Tenant Isolation

All admin endpoints check `user.team_id` before returning data. Admins can only
manage users on their own team. This prevents privilege escalation across tenants
in multi-team deployments.
