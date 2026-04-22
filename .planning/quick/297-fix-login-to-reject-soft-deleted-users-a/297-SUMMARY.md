---
task: 297
date: 2026-04-22
status: shipped-to-production
severity: MEDIUM
---

# Quick 297 — Login rejects soft-deleted users

## What shipped

`POST /api/auth/login` now returns `401 "Invalid email or password"` for users with `is_active=0` — same body as wrong-password to prevent enumeration. Previously the endpoint would issue a fresh access_token to deleted users (token was near-useless against protected endpoints because `auth_utils.py:174` checks `is_active`, but the mere issuance leaked state and broke soft-delete semantics).

## Commit

`4c3cf15` in `github.com/jeet-avatar/arthabuild` on `main` — `src/backend/routers/auth.py:100-106` (+9 lines).

```python
# Reject soft-deleted users (quick-297). Same generic_error as wrong-password
# to prevent enumeration of soft-deleted accounts.
if not user.is_active:
    await write_audit_event(db, actor_email=user.email, actor_role=user.role,
                            action="auth.login_failed", result="failure", ip_address=ip,
                            target="inactive_account")
    await db.commit()
    raise generic_error
```

## Deploy

- `scp` updated auth.py to EC2
- `docker compose up -d --build backend` — rebuild triggered
- Healthy after 9×2s
- Verified code INSIDE running container: `grep "quick-297" /app/routers/auth.py` → match

## E2E proof (observed live)

| Test | Before quick-297 | After quick-297 |
|------|------------------|------------------|
| Active admin login | 200 + token | 200 + token (no regression ✅) |
| Active throwaway login | 200 + token | 200 + token ✅ |
| **Soft-deleted user re-login** | **200 + token (BUG)** | **401 `Invalid email or password` ✅** |
| Wrong password for same deleted user | 401 | 401 (identical body — no enumeration ✅) |
| Admin /api/user/me post-patch | 200 | 200 ✅ |

## Full v4 launch-readiness re-run (all 9 suites post-patch)

| # | Suite | Result |
|---|-------|--------|
| S1 | Infra (TLS + headers + containers) | ✅ |
| S2 | Auth API 7/7 (incl refresh + logout) | ✅ |
| S3 | Registration 4/4 + reset 3/3 | ✅ |
| S4 | MFA E2E 5/5 | ✅ |
| S5 | DELETE-confirm 6 attacks + admin intact | ✅ |
| **S5b** | **quick-297 soft-delete login block** | **✅ 401 identical to wrong-password** |
| S6 | Chat + anti-hallucination trap | ✅ (rejection phrase + N/autosend NOT in define) |
| S7 | Admin + /docs /redoc /openapi lockdown | ✅ 4/4 → 404/401 |
| S8 | 15/15 SPA routes + 6/6 SEO + sitemap 95 | ✅ |
| S9 | SENTRY_DSN in env + rate limiter 20/30 → 429 | ✅ |

## Housekeeping

- Admin: `id=1, role=admin, is_active=1, is_verified=1`
- 4 real users remain: admin, peter@techcloudpro.com, jm@techcloudpro.com, vishesh@zyre.ai
- Test orphans cleaned (q297-*, v2-*, e6-*, launch-*)

## Launch verdict: **UNCONDITIONAL GO**

All 3 security findings from zero-hallucination v3 report are now CLOSED.

| Finding | Fix |
|---------|-----|
| MFA frontend gap (HIGH) | ✅ quick-295 |
| DELETE confirm bypass (HIGH) | ✅ quick-296 |
| Soft-deleted users can re-login (MEDIUM) | ✅ quick-297 |

Still unverified (not a launch blocker): Sentry event **delivery** (DSN present, but no fresh event fired this session). Recommend firing a test event post-launch via admin UI if you want to close that observability loop.
