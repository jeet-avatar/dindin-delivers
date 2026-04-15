---
quick: 279
date: 2026-04-13
status: complete
commits:
  - 5dfaa886
  - b86a277f
---

# Summary: Relax Company Email Gate + Phase 18 TODO

## What Was Done

### 1. Email gate removed from registration
- `src/backend/routers/user.py`: Deleted `is_free_email()` enforcement block (lines 36-41)
- Removed `is_free_email` from import line
- Any email (Gmail, Yahoo, iCloud, Proton, personal) can now register

### 2. Email gate removed from Google OAuth
- `src/backend/routers/auth.py`: Deleted `company_email_required` redirect block (lines 340-345)
- Google OAuth now accepts any verified Google account

### 3. Auth.tsx copy updated
- Removed `company_email_required` from OAUTH_ERRORS map
- Updated hint text: "Sign in with your work or personal email."
- Removed "Google sign-in is for individual developers only" wording

### 4. Phase 18 added to ROADMAP.md
- Full Cloudflare integration plan: WAF, DDoS, Workers rate-limit, analytics, SSL Full Strict
- Mirrors TechCloudPro Cloudflare setup
- Status: TODO — execute after Phase 17

### 5. Deployed to artha.build
- Backend: docker cp → container restart → /health OK
- Frontend: npm run build (9.21s, clean) → scp → 200

## Regression Verification
- GET /health → {"status":"ok"} ✅
- POST /api/user/register with gmail → HTTP 201 ✅ (previously 400)
- artha.build landing → HTTP 200 ✅

## What Was NOT Changed
- `is_free_email()` and `get_developer_whitelist()` functions kept in auth_utils.py (Phase 13 may use them for SSO domain restrictions)
- `DEVELOPER_EMAILS` env var still works (now unused but kept for future)
- All other auth flows unchanged (login, password reset, email verification)
