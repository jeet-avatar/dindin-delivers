---
task: 296
slug: fix-delete-api-user-me-to-require-confir
date: 2026-04-22
status: shipped-to-production
---

# Quick 296 — Fix DELETE /api/user/me confirm bypass

## What shipped

Backend now rejects `DELETE /api/user/me` without a body (`422`) or with `confirm != "DELETE"` (`400`). Frontend now sends `{"confirm":"DELETE"}` automatically. Bug originated from launch-readiness test T5.4.

## Commits (in `github.com/jeet-avatar/arthabuild`, pushed)

| SHA | Scope | File |
|-----|-------|------|
| `50d62dc` | backend | `src/backend/routers/user.py` — `DeleteAccountRequest` pydantic model + 400 gate |
| `b8deeb8` | frontend | `src/frontend/src/services/authService.ts` — adds JSON body |

## Deploy

- Backend: `scp src/backend/routers/user.py` → EC2 → `docker compose up -d --build backend` (healthy after 18s)
- Frontend: new dist `index-CIx_UWrG.js` tarred + scp'd + swapped on EC2 → `docker compose restart nginx`
- Old dist preserved at `/home/ubuntu/arthaBuild/src/frontend/dist.bak.quick296.1776894976`

## E2E proof (all passed)

| Test | Response | Verdict |
|------|----------|---------|
| DELETE no body | `422 Field required` | ✅ rejected |
| DELETE `{"confirm":"wrong"}` | `400 Confirmation phrase required.` | ✅ rejected |
| DELETE `{"confirm":""}` | `400 Confirmation phrase required.` | ✅ rejected |
| DELETE `{"confirm":"delete"}` (lowercase) | `400 Confirmation phrase required.` | ✅ rejected (case-sensitive) |
| Admin `/api/user/me` after 4 rejected deletes | intact (id=1, is_active=1) | ✅ |
| Throwaway user DELETE `{"confirm":"DELETE"}` | `200 Account deleted` + DB `is_active=0` | ✅ happy path works |

## Post-deploy state

- Bundle hash: `index-CIx_UWrG.js` (was `index-CddaSq0e.js` from quick-295)
- Bundle grep proof: `confirm.*DELETE` appears 5 times in minified JS
- Containers: all 3 healthy
- Admin account: `id=1, role=admin, is_active=1, is_verified=true`
- 2 orphan smoke-test users (launch-* and e6-*) cleaned up
- 4 real users remain (admin, peter, jm, vishesh@zyre.ai)

## Launch readiness re-check (all 9 suites green)

| Suite | Result |
|-------|--------|
| S1 Infra (TLS, containers, headers) | ✅ |
| S2 Auth API (4/4) | ✅ |
| S3 Registration + reset (5/5) | ✅ |
| S4 MFA E2E (5/5) | ✅ |
| S5 **User + DELETE-confirm gate (6/6 including 4 rejections + 1 happy)** | ✅ |
| S6 Chat + anti-hallucination trap + license | ✅ |
| S7 Admin guard + Swagger lockdown (4/4) | ✅ |
| S8 Frontend 15/15 SPA routes + 6/6 SEO + sitemap 95 | ✅ |
| S9 Sentry DSN live + rate limiter (20/30 = 429) | ✅ |

## Launch verdict: GO
