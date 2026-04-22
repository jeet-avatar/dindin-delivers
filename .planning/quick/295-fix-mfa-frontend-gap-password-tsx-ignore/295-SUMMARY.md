---
phase: quick-295
plan: 01
type: summary
wave: 1
requirements: [MFA-FE-01]
repo: arthaBuild (standalone, github.com/jeet-avatar/arthabuild)
commits:
  - 5aadd9a
  - c4cfd89
  - 33cfcaa
files_modified:
  - /Users/jeet/arthaBuild/src/frontend/src/services/authService.ts
  - /Users/jeet/arthaBuild/src/frontend/src/hooks/useAuth.ts
  - /Users/jeet/arthaBuild/src/frontend/src/pages/Password.tsx
  - /Users/jeet/arthaBuild/src/frontend/src/routes.tsx
  - /Users/jeet/arthaBuild/src/frontend/src/test/authService.test.ts
files_created:
  - /Users/jeet/arthaBuild/src/frontend/src/pages/MFAChallenge.tsx
duration: "~3m"
completed_at: "2026-04-22T20:21:13Z"
---

# Quick-295 — Fix MFA Frontend Gap Summary

## One-liner

Closed the MFA login footgun in the arthaBuild frontend — the backend 403 `{mfa_required: true}` response (auth.py:115-135) is now recognized by `authService.login()`, forwarded by `useAuth.login()`, handed off by `Password.tsx` to a new `/mfa-challenge` page that re-POSTs `/api/auth/login` with `otp_code`.

## What changed end-to-end (5-step trace)

1. **Default path (no MFA)** — unchanged. `/log-in/password` submit → `useAuth.login` → `authService.login` (200) → user set → `nav("/dashboard")`.

2. **MFA-enrolled path** — NEW. `/log-in/password` → `authService.login` POSTs → backend returns `HTTP 403 {detail:{mfa_required:true, message:"MFA code required"}}` → authService returns `{mfa_required:true, email}` instead of throwing → `useAuth.login` forwards → `Password.tsx` detects the signal → `nav("/mfa-challenge", {state:{email, password}})` → `MFAChallenge.tsx` renders → user types 6-digit TOTP → `useAuth.login({username, password, otp_code})` → authService POSTs with otp → backend 200 → token stored in memory → user set → `nav("/dashboard")`.

3. **Wrong password** — unchanged. `/log-in/password` → 401 string detail → throws `"Invalid email or password"` → `Password.tsx` catches, `setError`.

4. **Wrong OTP on /mfa-challenge** — NEW. Backend returns 403 with `detail.mfa_required:true, message:"Invalid MFA code"` → authService returns `{mfa_required:true, email}` → MFAChallenge detects "still mfa_required" → `setError("Invalid or expired code. Try again.")` → input is cleared → user retries (email+password kept in router state).

5. **Deep-link to /mfa-challenge** — NEW. No router state → `navigate("/log-in", {replace:true})` on render. No form ever shown.

## Per-task detail

### Task 1 — authService.login + useAuth.login recognize MFA signal

**Commit**: `5aadd9a`
**Files**:
- `/Users/jeet/arthaBuild/src/frontend/src/services/authService.ts` (modified)
- `/Users/jeet/arthaBuild/src/frontend/src/hooks/useAuth.ts` (modified)
- `/Users/jeet/arthaBuild/src/frontend/src/test/authService.test.ts` (modified — narrowing for new union type)

**Key changes**:
- `LoginResult` discriminated union export: `{mfa_required: true; email: string}` vs the token-bearing branch.
- `login(credentials)` now accepts optional `otp_code` and spreads it into the request body only when present.
- New early-return branch: when `response.status === 403 && err.detail?.mfa_required === true`, return `{mfa_required: true as const, email: credentials.username}` — NO throw.
- Fixed a separate `[object Object]` bug: when backend returns an object `detail` (e.g. MFA, but could be anything), the old code would stringify it as `"[object Object]"`. New code: `typeof err?.detail === "string" ? err.detail : err?.detail?.message`.
- `useAuth.login` adds optional `otp_code` to LoginData and forwards the MFA-required result to callers without calling `setUser`.

### Task 2 — MFAChallenge.tsx page

**Commit**: `c4cfd89`
**File**: `/Users/jeet/arthaBuild/src/frontend/src/pages/MFAChallenge.tsx` (created, 182 lines)

**Key behaviors**:
- Reads `{email, password}` from `useLocation().state`. On missing state, `navigate("/log-in", {replace:true})` on render — no form shown.
- 6-digit numeric-only OTP input (`inputMode="numeric"`, `pattern="[0-9]{6}"`, `autoComplete="one-time-code"`, `autoFocus`). Non-digit characters are stripped on change.
- Visual design matches `MFASetup.tsx` (indigo shield icon, slate panel, `bg-[#15181c]`).
- Shows "Signing in as {email}" + "Use different account" link back to `/log-in`.
- On submit: calls `useAuth().login({username: email, password, otp_code})`. Handles three outcomes:
  1. Success → sets success flag, 600ms later `navigate("/dashboard")`.
  2. `mfa_required` still true in result → `setError("Invalid or expired code. Try again.")`, clears OTP field, keeps email+password state.
  3. Thrown exception → shows `err.message` or a generic fallback.
- Zero direct token handling. Zero `localStorage` access. Only already-installed deps (react-router-dom, lucide-react).

### Task 3 — Wire Password.tsx → /mfa-challenge + register route

**Commit**: `33cfcaa`
**Files**:
- `/Users/jeet/arthaBuild/src/frontend/src/pages/Password.tsx` (modified)
- `/Users/jeet/arthaBuild/src/frontend/src/routes.tsx` (modified)

**Key changes**:
- `Password.tsx` `submit()` now captures `login()` result, checks `"mfa_required" in result && result.mfa_required`, and navigates to `/mfa-challenge` with `{email, password}` in router state.
- 401 wrong-password path is literally unchanged (`setError(err.message || "Invalid email or password")`).
- `routes.tsx` imports `MFAChallenge` and registers `<Route path="/mfa-challenge" element={<MFAChallenge />} />` as a **PUBLIC** route (NOT wrapped in `<Protected>` — user is pre-auth, has no access token yet). Placed immediately after `/log-in/password` since it is part of the login flow.
- `*` catchall `<NotFound />` remains the last route.

## Verification Proof

Per `/Users/jeet/doordash-p2p/CLAUDE.md` verification protocol:

### Grep proof — new symbols exist

```
$ grep -n "mfa_required" /Users/jeet/arthaBuild/src/frontend/src/services/authService.ts \
                         /Users/jeet/arthaBuild/src/frontend/src/hooks/useAuth.ts
src/hooks/useAuth.ts:12:type LoginReturn = User | null | { mfa_required: true; email: string };
src/hooks/useAuth.ts:35:    // MFA-required path (quick-295): backend returned 403 detail.mfa_required=true.
src/hooks/useAuth.ts:38:    if ("mfa_required" in res && res.mfa_required) {
src/services/authService.ts:35:  | { mfa_required: true; email: string }
src/services/authService.ts:37:      mfa_required?: false;
src/services/authService.ts:74:    // detail = {mfa_required: true, message: "MFA code required" | "Invalid MFA code"}
src/services/authService.ts:81:      err.detail.mfa_required === true
src/services/authService.ts:83:      return { mfa_required: true as const, email: credentials.username };

$ grep -n "typeof err?.detail" /Users/jeet/arthaBuild/src/frontend/src/services/authService.ts
88:    const detailMsg = typeof err?.detail === "string" ? err.detail : err?.detail?.message;

$ grep -cE "otp_code|mfa_required|useAuth" /Users/jeet/arthaBuild/src/frontend/src/pages/MFAChallenge.tsx
13

$ wc -l /Users/jeet/arthaBuild/src/frontend/src/pages/MFAChallenge.tsx
     182 src/pages/MFAChallenge.tsx

$ grep -E 'inputMode="numeric"|autoComplete="one-time-code"' /Users/jeet/arthaBuild/src/frontend/src/pages/MFAChallenge.tsx
                  inputMode="numeric"
                  autoComplete="one-time-code"

$ grep -n "mfa-challenge" /Users/jeet/arthaBuild/src/frontend/src/pages/Password.tsx \
                          /Users/jeet/arthaBuild/src/frontend/src/routes.tsx
src/pages/Password.tsx:23:        // Hand off to /mfa-challenge with email+password in router state
src/pages/Password.tsx:26:            nav("/mfa-challenge", { state: { email, password } });
src/routes.tsx:63:      <Route path="/mfa-challenge" element={<MFAChallenge />} />

$ grep -n "import MFAChallenge" /Users/jeet/arthaBuild/src/frontend/src/routes.tsx
31:import MFAChallenge from './pages/MFAChallenge';

$ grep -n '<Route path="/mfa-challenge"' /Users/jeet/arthaBuild/src/frontend/src/routes.tsx
63:      <Route path="/mfa-challenge" element={<MFAChallenge />} />
# (Note: NOT wrapped in <Protected> — confirmed visually; the <Protected>
#  wrapper is only on /dashboard, /chat, /mfa-setup, etc.)
```

### Build proof — `npm run build` succeeds

```
$ cd /Users/jeet/arthaBuild/src/frontend && npm run build
> chatbot-ui@0.1.0 build
> vite build

vite v5.4.20 building for production...
✓ 3916 modules transformed.
dist/index.html                        3.07 kB │ gzip:     1.17 kB
dist/assets/logo-I8o4uouB.png         62.36 kB
dist/assets/index-L3htlm9q.css        52.90 kB │ gzip:    10.66 kB
dist/assets/purify.es-BwoZCkIS.js     22.03 kB │ gzip:     8.72 kB
dist/assets/index.es-CZYLIsH5.js     150.25 kB │ gzip:    51.26 kB
dist/assets/index-Bf-NMk3T.js      4,181.68 kB │ gzip: 1,007.80 kB
✓ built in 5.28s

> chatbot-ui@0.1.0 postbuild
> tsx scripts/generate-sitemap.ts
✅ Sitemap generated: 95 URLs → dist/sitemap.xml
```

No missing imports. MFAChallenge chunk bundled into `index-Bf-NMk3T.js`. Exit code 0. Chunk-size warning is pre-existing and unrelated.

### TypeScript proof — zero errors in touched files

```
$ cd /Users/jeet/arthaBuild/src/frontend && npx tsc --noEmit 2>&1 \
  | grep -E "(authService\.ts|useAuth\.ts|MFAChallenge\.tsx|Password\.tsx|routes\.tsx)"
# (no output — zero errors in the 5 files this task touched)
```

Pre-existing errors in other files (file-saver, SidebarChatItem, ChatMessage, Landing, mockChats, api.test.ts, Chat.tsx) are out of scope per the plan's SCOPE BOUNDARY rule — they existed on `main` before this quick task and were not introduced by these 3 commits.

### File:line traces — end-to-end wiring

**Trace 1 — Password.tsx submit handler → /mfa-challenge:**
```
/Users/jeet/arthaBuild/src/frontend/src/pages/Password.tsx:21  → const result = await login({ username: email, password });
/Users/jeet/arthaBuild/src/frontend/src/pages/Password.tsx:25  → if (result && typeof result === "object" && "mfa_required" in result && result.mfa_required) {
/Users/jeet/arthaBuild/src/frontend/src/pages/Password.tsx:26  →   nav("/mfa-challenge", { state: { email, password } });
```

**Trace 2 — useAuth.login → authService.login forwarding:**
```
/Users/jeet/arthaBuild/src/frontend/src/hooks/useAuth.ts:31   → async function login(credentials: LoginData): Promise<LoginReturn> {
/Users/jeet/arthaBuild/src/frontend/src/hooks/useAuth.ts:32   →   const res = await svcLogin(credentials);
/Users/jeet/arthaBuild/src/frontend/src/hooks/useAuth.ts:38   →   if ("mfa_required" in res && res.mfa_required) {
/Users/jeet/arthaBuild/src/frontend/src/hooks/useAuth.ts:39   →     return res;            // forward; do NOT setUser
```

**Trace 3 — authService.login handles backend 403 without throwing:**
```
/Users/jeet/arthaBuild/src/frontend/src/services/authService.ts:52  → export async function login(credentials: { username, password, otp_code? })
/Users/jeet/arthaBuild/src/frontend/src/services/authService.ts:62  →   if (credentials.otp_code) body.otp_code = credentials.otp_code;
/Users/jeet/arthaBuild/src/frontend/src/services/authService.ts:77  →   if (response.status === 403 && err?.detail?.mfa_required === true) {
/Users/jeet/arthaBuild/src/frontend/src/services/authService.ts:83  →     return { mfa_required: true as const, email: credentials.username };
```

**Trace 4 — MFAChallenge.tsx submit re-POSTs /api/auth/login with otp_code:**
```
/Users/jeet/arthaBuild/src/frontend/src/pages/MFAChallenge.tsx:62  → const result = await login({ username: email, password, otp_code: otp.trim() });
/Users/jeet/arthaBuild/src/frontend/src/pages/MFAChallenge.tsx:69  → if (result && typeof result === "object" && "mfa_required" in result && result.mfa_required) {
/Users/jeet/arthaBuild/src/frontend/src/pages/MFAChallenge.tsx:70  →   setError("Invalid or expired code. Try again.");
/Users/jeet/arthaBuild/src/frontend/src/pages/MFAChallenge.tsx:76  → setTimeout(() => navigate("/dashboard"), 600);
```

**Trace 5 — routes.tsx registers public route:**
```
/Users/jeet/arthaBuild/src/frontend/src/routes.tsx:31  → import MFAChallenge from './pages/MFAChallenge';
/Users/jeet/arthaBuild/src/frontend/src/routes.tsx:63  → <Route path="/mfa-challenge" element={<MFAChallenge />} />
```

(NOT wrapped in `<Protected>` — confirmed by reading the route line; `<Protected>` appears on `/dashboard`, `/chat/:token`, `/mfa-setup`, etc. but not on `/mfa-challenge`.)

## Deviations from Plan

**1. [Rule 1 — Bug] Fixed unrelated type error in authService.test.ts**
- **Found during:** Task 1 verification (`npx tsc --noEmit` after editing authService.ts)
- **Issue:** `src/test/authService.test.ts:73-74` accesses `result.user.first_name` / `.email`. My Task 1 change made `login()` return a discriminated union (`LoginResult`), so TypeScript can no longer unconditionally narrow `.user` — the mfa_required branch has no `user`. This was caused directly by my change.
- **Fix:** Added a runtime guard `if ('mfa_required' in result && result.mfa_required) throw new Error('Expected token-bearing login result, got mfa_required');` before the `.user` access. This narrows the union to the token branch.
- **Files modified:** `/Users/jeet/arthaBuild/src/frontend/src/test/authService.test.ts`
- **Commit:** Included in `5aadd9a` (Task 1 commit)

**Note — pre-existing test bug (NOT fixed, out of scope):** Line 84 of the same test expects `login()` to throw `'Login failed'`, but the actual code throws `'Invalid email or password'`. This test was already failing on `main` before this quick task. Per the plan's SCOPE BOUNDARY rule, not my fix to make. Logged for future triage.

## Auth gates

None. No deployments, no credential prompts, no network calls against prod.

## Deferred / Open Items

- **Deploy to EC2 `artha.build`** — DEFERRED per plan constraints. Code changes only; user decides when to push + deploy.
- **Push to github.com/jeet-avatar/arthabuild** — DEFERRED per plan constraints ("Do NOT push to remote yet — user decides when to push").
- **Manual local smoke test** — DEFERRED. The plan's optional `docker-compose up` / `npm run dev` smoke test requires enrolling an MFA user via `/mfa-setup`, logging out, and logging back in to see the two-step flow. Not run because zero MFA-enrolled users exist on prod (intentionally — this quick task is the pre-requisite for any user enrolling in the first place).
- **E2E test** — not written. No MFA-enrolled user exists on prod; writing a test against a fixture would be its own plan.

## Known limitations

- Password travels through `navigate(state)` in React Router's in-memory history entry between `/log-in/password` and `/mfa-challenge`. This is NOT written to localStorage, sessionStorage, or the URL. On page refresh the state is lost → MFAChallenge redirects to `/log-in` (user re-enters credentials). This is by design per CLAUDE.md's token-in-memory rule.
- No "remember this device for 30 days" skip-MFA UX. Every login requires TOTP. Out of scope for quick-295.
- No recovery code path. If the user loses their authenticator, they currently have no self-service recovery — the page just says "Contact support". Recovery codes would be a follow-up enhancement (backend has no recovery_codes column today either).

## Self-Check: PASSED

Verified claims before returning:

```
$ [ -f /Users/jeet/arthaBuild/src/frontend/src/pages/MFAChallenge.tsx ] && echo FOUND
FOUND

$ git -C /Users/jeet/arthaBuild log --oneline -3
33cfcaa feat(quick-295): Password.tsx navigates to /mfa-challenge on mfa_required; register route
c4cfd89 feat(quick-295): add MFAChallenge.tsx page for TOTP entry during login
5aadd9a feat(quick-295): authService.login returns mfa_required signal instead of throwing on 403 MFA
```

All 3 commits exist in `/Users/jeet/arthaBuild/`. All 5 touched files verified on disk. Build green. TypeScript clean in touched files.
