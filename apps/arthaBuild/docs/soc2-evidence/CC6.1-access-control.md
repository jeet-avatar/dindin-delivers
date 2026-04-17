# CC6.1 — Access Control Evidence
Generated: 2026-04-13T20:13:03.964740+00:00

## Purpose
Documents the access control mechanisms implemented in ArthaBuild to restrict
access to data and system resources to authorized users only.

## RBAC Roles

| Role  | Description                          | Permissions                                      |
|-------|--------------------------------------|--------------------------------------------------|
| admin | Team administrator                   | Full admin panel, team management, audit export  |
| user  | Standard authenticated user          | Own chats, own profile, data export/erase        |

First registered user in a deployment automatically receives the `admin` role.
Subsequent users receive the `user` role.

## Authentication Endpoints

| Endpoint                     | Method | Description                        |
|------------------------------|--------|------------------------------------|
| /api/auth/login              | POST   | Username/password login → JWT      |
| /api/auth/register           | POST   | New user registration              |
| /api/auth/logout             | POST   | JWT invalidation (JTI blacklist)   |
| /api/auth/sso/config         | GET    | Read SSO/OIDC config               |
| /api/auth/sso/config         | POST   | Set SSO/OIDC config (admin only)   |
| /api/auth/sso/callback       | GET    | OIDC callback handler              |

## MFA Policy

| Control          | Value                                                   |
|------------------|---------------------------------------------------------|
| Algorithm        | TOTP (RFC 6238), SHA-1, 6-digit, 30-second window      |
| Enroll endpoint  | POST /api/mfa/enroll                                    |
| Verify endpoint  | POST /api/mfa/verify                                    |
| Status endpoint  | GET  /api/mfa/status                                    |
| Disable endpoint | POST /api/mfa/disable (requires admin or self)         |
| Storage          | Base32 secret in `mfa_secrets` table, is_active flag   |

## Session Controls

| Control               | Value                                  |
|-----------------------|----------------------------------------|
| Token type            | JWT (HS256, PyJWT)                     |
| Token expiry          | Configurable via JWT_ALGORITHM env     |
| Idle timeout          | SESSION_IDLE_MINUTES env var           |
| IP allowlist          | ALLOWED_IP_RANGES CIDR env var         |
| Credential storage    | Memory-only (never in DB or disk)      |
