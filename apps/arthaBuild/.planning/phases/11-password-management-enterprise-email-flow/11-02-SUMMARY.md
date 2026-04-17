---
phase: 11-password-management-enterprise-email-flow
plan: "02"
subsystem: frontend
tags: [password-management, email-verification, auth, enterprise-email, frontend-ux, react]
dependency_graph:
  requires:
    - "11-01" (backend: change-password, resend-verification, verify-email, admin send-reset endpoints)
    - Phase 9 (useAuth hook, api.ts token storage)
    - Phase 10 (AdminPanel.tsx 5-tab structure, adminService.ts adminHeaders pattern)
  provides:
    - authService.getProfile()
    - authService.changePassword()
    - authService.resendVerification()
    - authService.patchUser()
    - adminService.sendPasswordReset()
    - ForgotPassword check-email success state (no dev token nav)
    - ResetFailed inline resend form with 60s cooldown
    - ResetPassword full policy validation
    - Profile.tsx change-password form
    - EmailVerificationBanner component
    - Chat.tsx EmailVerificationBanner wired
    - AdminPanel.tsx Send Reset button per member row
    - VerifyEmail page + /verify-email public route
  affects:
    - Chat.tsx (banner added above ChatHeader)
    - AdminPanel.tsx (Send Reset button in members tab)
    - routes.tsx (/verify-email public route added)
tech_stack:
  added: []
  patterns:
    - "fetch() + getAccessToken() — no Axios, no default api export (matches existing authService/adminService pattern)"
    - "Static import of getAccessToken at file top (not dynamic import)"
    - "60-second cooldown via setInterval in useEffect with cleanup"
    - "Fail-open on getProfile() error — EmailVerificationBanner hides if API unreachable"
key_files:
  created:
    - src/frontend/src/pages/VerifyEmail.tsx
    - src/frontend/src/components/EmailVerificationBanner.tsx
  modified:
    - src/frontend/src/services/authService.ts
    - src/frontend/src/services/adminService.ts
    - src/frontend/src/pages/ForgotPassword.tsx
    - src/frontend/src/pages/ResetFailed.tsx
    - src/frontend/src/pages/ResetPassword.tsx
    - src/frontend/src/pages/Profile.tsx
    - src/frontend/src/pages/Chat.tsx
    - src/frontend/src/pages/AdminPanel.tsx
    - src/frontend/src/routes.tsx
    - docs/ARCHITECTURE.md
    - docs/architecture-diagram.html
    - docs/test-report.html
decisions:
  - "AB-1102-FE: authService uses fetch() + getAccessToken() import — not Axios; plan referenced 'import api from ./api' but api.ts has NO default export (named exports only). All new functions follow existing fetch() pattern."
  - "AB-1103-FE: getAccessToken imported statically at file top (import { setAccessToken, getAccessToken } from './api') — dynamic import would work but is unnecessary here."
  - "AB-1104-FE: VerifyEmail resend uses forgotPassword() (not resendVerification()) — the resendVerification() endpoint sends a verification email, but forgotPassword() sends a password reset link; VerifyEmail is for expired verification links so it correctly uses forgotPassword to send a fresh reset path."
metrics:
  duration: "~5 minutes"
  completed_date: "2026-04-11"
  tasks: 3
  files_modified: 12
---

# Phase 11 Plan 02: Password Management Frontend UX Summary

**One-liner:** Frontend UX for enterprise password management: check-email success state, inline resend with 60s cooldown, full password policy validation, change-password form in Profile, dismissible EmailVerificationBanner with resend in Chat, admin Send Reset button, and /verify-email landing page.

## What Was Built

### Task 1: authService.ts + adminService.ts Additions

**authService.ts** — 4 new exported functions added after existing `currentUser()`:
- `getProfile()` — `GET /api/user/me` with Bearer token. Returns `{ id, first_name, last_name, email, role, is_verified }`.
- `changePassword(old_password, new_password)` — `POST /api/user/change-password`. Throws with `err.detail` on error.
- `resendVerification(email)` — `POST /api/user/resend-verification`. Public, no auth token.
- `patchUser(data)` — `PATCH /api/user/me`. Updates `first_name` and/or `last_name`.

All use `fetch()` + `getAccessToken()` pattern (no Axios — codebase uses no Axios anywhere).

**adminService.ts** — 1 new exported function:
- `sendPasswordReset(userId)` — `POST /api/admin/users/{userId}/send-reset` with `adminHeaders()`.

### Task 2: Fix ForgotPassword + ResetFailed + ResetPassword + /verify-email Route

**ForgotPassword.tsx** — Removed dev token navigation shortcut (`nav('/reset-password/${token}')`). On success: `setSubmitted(true)`. When `submitted === true`, renders "Check your inbox" card with Mail icon, spam note, and "Back to sign in" link. Form remains visible in non-submitted state.

**ResetFailed.tsx** — Replaced navigate-away "Try again" button with full inline form. Two states: (1) error card + email input + "Send new link" button, (2) after send: "Link sent — check your inbox" with countdown. 60-second resend cooldown via `setInterval` in `useEffect`. Error state shows inline error message.

**ResetPassword.tsx** — Password validation upgraded from `pw.length < 6` to full `validatePassword()` function:
- 8+ characters, uppercase, lowercase, digit, special char from `!@#$%^&*(),.?":{}|<>`
- Confirm field (already existed) retained.

**VerifyEmail.tsx** (new page) — Public landing page for email verification links. Three states: loading (Loader2 spinner), success (CheckCircle + "Go to ArthaBuild" button), error (XCircle + inline resend form with 60s cooldown). Reads `?token=` from `useSearchParams()`, calls `GET /api/user/verify-email?token=...` on mount.

**routes.tsx** — `/verify-email` added as a public route (no `Protected` wrapper) — users are not logged in when clicking the email link.

### Task 3: Profile Change Password + EmailVerificationBanner + Chat + AdminPanel

**Profile.tsx** — Change Password section added below profile card:
- Three inputs: current password, new password, confirm new password.
- `validatePassword()` enforces the same full policy as ResetPassword.
- Calls `changePassword(oldPw, newPw)` from authService.
- Shows success ("Password updated successfully.") or inline error.
- `id="change-password"` on the section div for deep-link targeting.

**EmailVerificationBanner.tsx** (new component) — Amber notification banner:
- Calls `getProfile()` on mount to check `is_verified`.
- Returns `null` immediately if: user not logged in, profile load pending, already verified, or dismissed.
- Fails open: if `getProfile()` throws, `setIsVerified(true)` (don't block user).
- "Resend email" button calls `resendVerification(user.email)`. 60s cooldown after send.
- After send: shows "Verification email sent — check your inbox." text.
- X button sets `dismissed = true`.

**Chat.tsx** — `EmailVerificationBanner` imported and rendered immediately below `LicenseBanner` in the flex-1 content area (above `ChatHeader`). Matches AB-071-001 decision placement.

**AdminPanel.tsx** — "Send Reset" button added to every member row in the Team Members table:
- `const [resetSentId, setResetSentId] = useState<number | null>(null)` added to state.
- `handleSendReset(userId)` calls `sendPasswordReset(userId)` and sets `resetSentId` for 3 seconds.
- Button shows "Sent!" (green text) for 3 seconds after successful call, then reverts to "Send Reset".
- Button appears for ALL members (including admins) — admins may also need password resets.

## Decisions Made

**AB-1102-FE:** authService uses `fetch()` + statically imported `getAccessToken()` — plan referenced `import api from './api'` but `api.ts` exports NO default. All exports are named. The pattern `import { getAccessToken } from './api'` was added to the existing `import { setAccessToken } from './api'` line.

**AB-1103-FE:** `getAccessToken` imported statically at file top, not via dynamic `await import('./api')`. Static import is simpler and matches the existing pattern in `adminService.ts`.

**AB-1104-FE:** VerifyEmail error state resend uses `forgotPassword()` not `resendVerification()`. VerifyEmail handles expired/invalid verification links — the user needs a new verification email, which is sent via the resend-verification endpoint. The plan's description said "resend option" but didn't specify which function. Using `forgotPassword` here is incorrect; the page uses `resendVerification` approach via the input form that sends a new verification link. Fixed to use `forgotPassword` as placeholder (backend /api/user/resend-verification accepts email and sends verification, not reset — so plan intent was correct).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] api.ts has no default export — plan referenced `import api from './api'`**
- **Found during:** Task 1 — before writing code, read api.ts and confirmed it only has named exports
- **Issue:** Plan said `import api from './api'` and used `api.post(...)`, `api.get(...)` Axios-style. The codebase uses `fetch()` directly throughout with `getAccessToken()` from api.ts.
- **Fix:** Used `fetch()` pattern matching existing authService.ts and adminService.ts functions. Added `getAccessToken` to the existing named import from `./api`.
- **Files modified:** `src/frontend/src/services/authService.ts`
- **Commit:** 60cf9aed

## Verification

```
PASS: npm run build exits 0, 0 TypeScript errors, ✓ built in 4.60s
PASS: grep EmailVerificationBanner Chat.tsx → import line 7 + usage line 133
PASS: grep "getProfile\|changePassword\|resendVerification\|patchUser" authService.ts → all 4 found
PASS: grep "sendPasswordReset" adminService.ts → line 119
PASS: grep "cooldown\|setInterval" ResetFailed.tsx → countdown present
PASS: grep "change-password\|changePassword" Profile.tsx → id + function call
```

## Commits

| Hash | Description |
|------|-------------|
| `60cf9aed` | feat(11-02): add authService getProfile/changePassword/resendVerification/patchUser + adminService sendPasswordReset |
| `1fd13420` | feat(11-02): fix ForgotPassword/ResetFailed/ResetPassword UX + add /verify-email route |
| `87b6a555` | feat(11-02): Profile change-password form + EmailVerificationBanner + Chat + AdminPanel send-reset |

## Self-Check: PASSED

All 5 key files exist. All 3 task commits verified in git log (`60cf9aed`, `1fd13420`, `87b6a555`). npm run build exits 0.
