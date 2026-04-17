---
title: "Relax company email gate + add Phase 18 Cloudflare TODO"
quick: 279
date: 2026-04-13
---

# Quick Task 279: Relax Company Email Gate

## Goal
Remove the free-email block from registration and Google OAuth so any email can sign up.
Add Phase 18 to ROADMAP.md as a TODO for Cloudflare security + traffic analytics.
Deploy changes to artha.build.

## Tasks

### Task 1 — Remove free-email block from backend
**Files:**
- `src/backend/routers/user.py` — remove `is_free_email` check from `POST /api/user/register`
- `src/backend/routers/auth.py` — remove `is_free_email` gate from Google OAuth callback

**Action:**
- Delete lines 36-41 in user.py (the `if is_free_email(data.email): raise 400` block)
- Delete lines 340-345 in auth.py (the `if is_free_email(email)` redirect block in google_callback)
- Keep `is_free_email` and `get_developer_whitelist` functions in auth_utils.py (Phase 13 may use them)

**Verify:** `grep -n "is_free_email" src/backend/routers/user.py` returns no enforcement lines

### Task 2 — Update Auth.tsx hint text
**Files:**
- `src/frontend/src/pages/Auth.tsx` — update the "Google sign-in is for individual developers only" copy

**Action:**
- Change hint text from "Google sign-in is for individual developers only. Enterprise users must log in with their company email."
- To: "Sign in with your work or personal email."
- Remove `company_email_required` as a hard-block error; make it a soft warning or remove entirely

### Task 3 — Add Phase 18 to ROADMAP.md
**Files:**
- `.planning/ROADMAP.md` — append Phase 18 block after Phase 17

**Action:**
Add Phase 18: Security Hardening + Cloudflare Analytics
- Goal: Full Cloudflare integration (WAF, DDoS, traffic analytics dashboard like TechCloudPro)
- HTTPS-only enforcement, security headers, bot protection
- Cloudflare Workers for edge rate limiting
- Analytics: pageviews, unique visitors, geographic breakdown, top pages
- Status: TODO — execute after Phase 17

### Task 4 — Deploy to artha.build
**Action:**
1. `docker cp` changed backend files into running container
2. Restart backend: `docker compose restart backend`
3. Build frontend: `npm run build`
4. SCP dist to server
5. Verify: curl https://artha.build/health

## Regression Guard
- GET /health → {"status":"ok"}
- POST /api/auth/login with valid creds → 200 + access_token
- POST /api/user/register with gmail → 201 (no longer blocked)
- GET /api/chats without token → 401
