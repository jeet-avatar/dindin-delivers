---
phase: quick-295
plan: 01
type: execute
wave: 1
depends_on: []
autonomous: true
requirements: [MFA-FE-01]
files_modified:
  - /Users/jeet/arthaBuild/src/frontend/src/services/authService.ts
  - /Users/jeet/arthaBuild/src/frontend/src/hooks/useAuth.ts
  - /Users/jeet/arthaBuild/src/frontend/src/pages/MFAChallenge.tsx
  - /Users/jeet/arthaBuild/src/frontend/src/pages/Password.tsx
  - /Users/jeet/arthaBuild/src/frontend/src/routes.tsx

must_haves:
  truths:
    - "A user with MFASecret.is_active=True enters correct email+password on /log-in/password and is taken to /mfa-challenge (not shown a bogus 'Invalid email or password' error)."
    - "On /mfa-challenge, entering a valid 6-digit TOTP completes login and navigates to /dashboard with a session."
    - "On /mfa-challenge, entering an invalid/expired TOTP shows an inline 'Invalid code' error and lets the user retry without losing their password."
    - "A user with NO MFA enrolled still logs in directly to /dashboard (no regression on the default path)."
    - "A user with wrong password still sees 'Invalid email or password' on /log-in/password (no behavior change for 401)."
  artifacts:
    - path: "/Users/jeet/arthaBuild/src/frontend/src/services/authService.ts"
      provides: "login() returns { mfa_required: true, email } instead of throwing when backend 403s with detail.mfa_required"
      contains: "mfa_required"
    - path: "/Users/jeet/arthaBuild/src/frontend/src/hooks/useAuth.ts"
      provides: "useAuth().login() forwards the mfa_required signal to the caller without setting user state"
      contains: "mfa_required"
    - path: "/Users/jeet/arthaBuild/src/frontend/src/pages/MFAChallenge.tsx"
      provides: "6-digit OTP entry page that resubmits /api/auth/login with otp_code, navigates /dashboard on success"
      min_lines: 80
    - path: "/Users/jeet/arthaBuild/src/frontend/src/pages/Password.tsx"
      provides: "Detects mfa_required from login() and navigates to /mfa-challenge with {email, password} in location.state"
      contains: "mfa-challenge"
    - path: "/Users/jeet/arthaBuild/src/frontend/src/routes.tsx"
      provides: "/mfa-challenge route registered (public — user is pre-auth at this point)"
      contains: "mfa-challenge"
  key_links:
    - from: "Password.tsx"
      to: "MFAChallenge.tsx"
      via: "navigate('/mfa-challenge', { state: { email, password } })"
      pattern: "navigate.*mfa-challenge"
    - from: "MFAChallenge.tsx"
      to: "/api/auth/login"
      via: "svcLogin({ username, password, otp_code })"
      pattern: "otp_code"
    - from: "authService.login"
      to: "backend 403 detail.mfa_required"
      via: "parse err.detail?.mfa_required and return early (no throw)"
      pattern: "mfa_required"
---

<objective>
Fix the MFA frontend gap in the arthaBuild standalone repo. Backend (`/Users/jeet/arthaBuild/src/backend/routers/auth.py:115-135`) already enforces MFA by returning HTTP 403 with `detail = {mfa_required: true, message: "MFA code required"}` when a user has `MFASecret.is_active=True`. The frontend login path currently swallows this into a generic "Invalid email or password" error, which would silently lock out any MFA-enrolled user.

Purpose: Close the footgun BEFORE any user enrolls in MFA via `/mfa-setup`. Currently zero prod users have `MFASecret.is_active=True`, so this is not an active bug — but it becomes one the instant anyone enrolls.

Output: A working two-step login flow — password page → MFA challenge page → dashboard — for MFA-enrolled users. Zero behavior change for non-MFA users or wrong-password failures.

Scope: Code change only in `/Users/jeet/arthaBuild/` repo. NO deploy. NO e2e tests against prod (no enrolled user to test with). Manual local test = enroll via `/mfa-setup`, log out, log back in.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/arthaBuild/CLAUDE.md
@/Users/jeet/arthaBuild/src/backend/routers/auth.py
@/Users/jeet/arthaBuild/src/frontend/src/services/authService.ts
@/Users/jeet/arthaBuild/src/frontend/src/hooks/useAuth.ts
@/Users/jeet/arthaBuild/src/frontend/src/pages/Password.tsx
@/Users/jeet/arthaBuild/src/frontend/src/pages/MFASetup.tsx
@/Users/jeet/arthaBuild/src/frontend/src/routes.tsx

### Repo split — READ CAREFULLY
- Plan docs live in dindin: `/Users/jeet/doordash-p2p/.planning/quick/295-.../295-PLAN.md`
- Code lives in the STANDALONE arthaBuild repo: `/Users/jeet/arthaBuild/` (remote: `github.com/jeet-avatar/arthabuild`)
- Every file path in every task is ABSOLUTE. `cd` into `/Users/jeet/arthaBuild` for git ops.
- `git add` MUST list explicit paths — NEVER `git add -A` (other repos are worktrees in user's home).

### Backend contract (verified Apr 22, 2026 — auth.py:115-135)
FastAPI serializes `HTTPException(status_code=403, detail={"mfa_required": True, "message": "MFA code required"})` as:
```json
HTTP 403
{ "detail": { "mfa_required": true, "message": "MFA code required" } }
```
So in the frontend, after `await response.json()`, the key is at `data.detail.mfa_required` — NOT `data.mfa_required`. Do NOT change the backend; match the existing shape.

### 401 vs 403 — do not conflate
- 401 = wrong password → keep throwing `"Invalid email or password"` (unchanged)
- 403 with `detail.mfa_required === true` → new branch, return `{mfa_required: true, email}` (no throw)
- 403 WITHOUT `detail.mfa_required` → still throw (e.g. unverified email uses 403 too; keep existing behavior)
- Any other !response.ok → throw (unchanged)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Teach authService.login + useAuth.login to recognize the MFA-required signal</name>
  <files>
    /Users/jeet/arthaBuild/src/frontend/src/services/authService.ts
    /Users/jeet/arthaBuild/src/frontend/src/hooks/useAuth.ts
  </files>
  <action>
    1. Edit `/Users/jeet/arthaBuild/src/frontend/src/services/authService.ts`:

       a. Extend the `login()` parameter type to optionally accept `otp_code`:
          ```ts
          export async function login(credentials: { username: string; password: string; otp_code?: string })
          ```
          Pass `otp_code` through in the JSON body if present (object spread is fine — backend ignores unknown keys).

       b. Define a discriminated return type so callers can narrow:
          ```ts
          export type LoginResult =
            | { mfa_required: true; email: string }
            | { mfa_required?: false; access_token: string; refresh_token: string; first_name: string; last_name: string; email: string; role: string; user: { name: string; first_name: string; last_name: string; role: "admin" | "user"; email: string } };
          ```

       c. In the `!response.ok` branch, BEFORE throwing, check for the MFA signal:
          ```ts
          if (response.status === 403 && err?.detail && typeof err.detail === "object" && err.detail.mfa_required === true) {
            return { mfa_required: true as const, email: credentials.username };
          }
          ```
          NOTE: `err.detail` is an object here (not a string), so the existing `new Error(err.detail || ...)` line would stringify as `[object Object]`. Fix that line in the same pass to handle both shapes:
          ```ts
          const detailMsg = typeof err?.detail === "string" ? err.detail : err?.detail?.message;
          throw new Error(detailMsg || "Invalid email or password");
          ```

       d. Keep the existing 200-OK path unchanged (set access token, build user, storage.set, return `{...data, user}`). Only add the new early-return branch.

       e. Do NOT touch logout/register/forgotPassword/etc.

    2. Edit `/Users/jeet/arthaBuild/src/frontend/src/hooks/useAuth.ts`:

       a. Update the local `LoginData` interface to include optional `otp_code?: string`.

       b. In the `login()` function, after `const res = await svcLogin(credentials);`, add a branch:
          ```ts
          if ("mfa_required" in res && res.mfa_required) {
            // Do NOT set user — no token issued yet. Forward signal to caller.
            return res;
          }
          ```
          Leave the existing `setUser(res.user ?? null); return res.user;` path for normal login.

       c. Update the return type of `login` to union `User | null | { mfa_required: true; email: string }` (or use `LoginResult` re-exported from authService — cleanest).

    3. Verify imports compile — `useAuth.ts` imports `login as svcLogin` from `../services/authService`. Ensure the exported `LoginResult` type is importable if you decide to type the wrapper.

    4. Do NOT deploy. Do NOT run `git add -A`.

    Commit (in /Users/jeet/arthaBuild):
    ```
    cd /Users/jeet/arthaBuild
    git add src/frontend/src/services/authService.ts src/frontend/src/hooks/useAuth.ts
    git commit -m "feat(quick-295): authService.login returns mfa_required signal instead of throwing on 403 MFA"
    ```
  </action>
  <verify>
    cd /Users/jeet/arthaBuild/src/frontend && npx tsc --noEmit 2>&1 | head -40
    # Expected: zero errors from authService.ts or useAuth.ts
    grep -n "mfa_required" src/services/authService.ts src/hooks/useAuth.ts
    # Expected: at least 2 matches in authService.ts (type + runtime check), 1+ match in useAuth.ts
    grep -n "typeof err?.detail" src/services/authService.ts
    # Expected: 1 match (the fix for [object Object] bug on wrong-password path when backend returns object detail)
  </verify>
  <done>
    - `authService.login()` returns `{mfa_required: true, email}` early (no throw) when backend responds 403 with `detail.mfa_required === true`.
    - `authService.login()` accepts optional `otp_code` and forwards it in the request body.
    - `authService.login()` still throws on 401 and on 403-without-mfa_required (unverified-email path is preserved).
    - `useAuth.login()` forwards the mfa_required signal to the caller without setting user state.
    - TypeScript compiles clean.
    - One atomic commit in arthaBuild repo using explicit paths.
  </done>
</task>

<task type="auto">
  <name>Task 2: Create MFAChallenge.tsx page with 6-digit OTP input</name>
  <files>
    /Users/jeet/arthaBuild/src/frontend/src/pages/MFAChallenge.tsx
  </files>
  <action>
    Create a new page at `/Users/jeet/arthaBuild/src/frontend/src/pages/MFAChallenge.tsx`.

    Design: Match the visual style of `MFASetup.tsx` (indigo shield icon, `bg-[#15181c]`, slate panel, 6-digit `inputMode=numeric` field with `pattern="[0-9]{6}"` and `autoComplete="one-time-code"`). BUT the flow is different — this page resubmits the LOGIN, it does not call `/api/auth/mfa/verify`.

    Required behavior:

    1. Read `{email, password}` from `useLocation().state`. If either is missing (user deep-linked here), call `useNavigate()` to redirect to `/log-in` replace.

    2. Render:
       - Shield icon header ("Two-Factor Authentication")
       - Email display (read-only, shows which account is being challenged, with "Sign in as different user" link → navigate("/log-in"))
       - 6-digit OTP input (numeric, maxLength 6, strip non-digits on change — same pattern as MFASetup.tsx line 160)
       - "Verify & Sign In" submit button (disabled when `otp.length !== 6 || loading`)
       - Inline error block (red, same styling as MFASetup) for wrong/expired code

    3. On submit:
       ```ts
       import { useAuth } from "../hooks/useAuth";
       const { login } = useAuth();
       // ...
       try {
         const result = await login({ username: email, password, otp_code: otp.trim() });
         // If backend accepts OTP, useAuth.login returns a User (not mfa_required). Navigate to dashboard.
         // If it still returns mfa_required (shouldn't happen on a valid 6-digit submit, but guard):
         if (result && typeof result === "object" && "mfa_required" in result) {
           setError("Invalid code. Try again.");
           return;
         }
         navigate("/dashboard");
       } catch (err: any) {
         // Wrong OTP → backend 403 with mfa_required still, BUT detail.message === "Invalid MFA code"
         // (after Task 1's fix, authService returns {mfa_required: true, email} — no throw)
         // So if we get here, it's an UNRELATED error (network, 500, etc.)
         setError(err?.message || "Something went wrong. Try again.");
       }
       ```

       IMPORTANT: Re-read Task 1's behavior. When backend returns 403 `{mfa_required, message: "Invalid MFA code"}` for a WRONG otp, authService returns `{mfa_required: true, email}` early (no throw). So the `if ("mfa_required" in result)` branch is the "wrong code" path — set a "Invalid or expired code" inline error and let the user retry.

    4. Token storage: MFAChallenge does NOT touch tokens directly. authService.login (Task 1) sets the access token on the 200-OK path. useAuth.login sets the user. MFAChallenge just awaits login() and navigates.

    5. No `localStorage` usage. No tokens written to disk (CLAUDE.md project law line 54).

    6. Skip/fallback UX: If user hits "Sign in as different user" → `navigate("/log-in")` (clears state, starts over).

    7. Keep the file self-contained — no new dependencies. Reuse lucide-react icons already used by MFASetup.tsx (Shield, XCircle, Loader2, CheckCircle).

    Commit (in /Users/jeet/arthaBuild):
    ```
    cd /Users/jeet/arthaBuild
    git add src/frontend/src/pages/MFAChallenge.tsx
    git commit -m "feat(quick-295): add MFAChallenge.tsx page for TOTP entry during login"
    ```
  </action>
  <verify>
    cd /Users/jeet/arthaBuild/src/frontend && npx tsc --noEmit 2>&1 | grep -E "MFAChallenge" | head -20
    # Expected: zero errors
    grep -cE "otp_code|mfa_required|useAuth" src/pages/MFAChallenge.tsx
    # Expected: >= 3 matches (file wires the three core concepts)
    wc -l src/pages/MFAChallenge.tsx
    # Expected: >= 80 lines
    grep -E 'inputMode="numeric"|autoComplete="one-time-code"' src/pages/MFAChallenge.tsx
    # Expected: both matches present (proper mobile OTP UX)
  </verify>
  <done>
    - New file `/Users/jeet/arthaBuild/src/frontend/src/pages/MFAChallenge.tsx` exists (>=80 lines).
    - Reads `{email, password}` from router state; redirects to `/log-in` if missing.
    - 6-digit OTP input with numeric-only filter, one-time-code autocomplete.
    - Calls `useAuth().login({username, password, otp_code})` on submit.
    - Navigates to `/dashboard` on success; shows inline "Invalid code" on mfa_required-still-true response; shows generic error on thrown exceptions.
    - Zero `localStorage` writes. Uses only already-installed deps (react-router-dom, lucide-react).
    - TypeScript clean. One atomic commit.
  </done>
</task>

<task type="auto">
  <name>Task 3: Wire Password.tsx → /mfa-challenge and register the route</name>
  <files>
    /Users/jeet/arthaBuild/src/frontend/src/pages/Password.tsx
    /Users/jeet/arthaBuild/src/frontend/src/routes.tsx
  </files>
  <action>
    1. Edit `/Users/jeet/arthaBuild/src/frontend/src/pages/Password.tsx`:

       Replace the body of `submit()` to detect the MFA signal. Current code (line 20-27):
       ```ts
       try {
           await login({ username: email, password });
           nav("/dashboard");
       } catch (err: any) {
           setError(err.message || "Invalid email or password");
       }
       ```

       New code:
       ```ts
       try {
           const result = await login({ username: email, password });
           if (result && typeof result === "object" && "mfa_required" in result && result.mfa_required) {
               nav("/mfa-challenge", { state: { email, password } });
               return;
           }
           nav("/dashboard");
       } catch (err: any) {
           setError(err.message || "Invalid email or password");
       }
       ```

       Do NOT change anything else in Password.tsx (styling, forgot-password link, create-account link all stay identical).

       Security note: `password` is passed through router state in memory only. It is NEVER written to storage, sessionStorage, or the URL. It lives on the history entry and is consumed + discarded by MFAChallenge. This is acceptable per CLAUDE.md token-in-memory rule extended to passwords.

    2. Edit `/Users/jeet/arthaBuild/src/frontend/src/routes.tsx`:

       a. Add import at the top (alphabetically near the other MFA import, line 30):
          ```tsx
          import MFAChallenge from './pages/MFAChallenge';
          ```

       b. Register the route as PUBLIC (user is pre-auth at this point — no access token yet). Place it right after the existing `/mfa-setup` route (around line 91) for co-location, OR in the Auth routes block near `/log-in/password` (around line 58). Preferred: near `/log-in/password` since it's part of the login flow.
          ```tsx
          <Route path="/mfa-challenge" element={<MFAChallenge />} />
          ```

       c. Do NOT wrap in `<Protected>` — the user has no access token yet when they land here. (Compare: `/mfa-setup` IS Protected because that user has already logged in and is enrolling post-login.)

       d. Keep the `/*` catchall route (`<NotFound />`) as the LAST route.

    3. No other changes. Do NOT touch Auth.tsx, SignUp.tsx, or Dashboard.tsx.

    Commit (in /Users/jeet/arthaBuild):
    ```
    cd /Users/jeet/arthaBuild
    git add src/frontend/src/pages/Password.tsx src/frontend/src/routes.tsx
    git commit -m "feat(quick-295): Password.tsx navigates to /mfa-challenge on mfa_required; register route"
    ```
  </action>
  <verify>
    cd /Users/jeet/arthaBuild/src/frontend && npx tsc --noEmit 2>&1 | head -40
    # Expected: zero errors
    grep -n "mfa-challenge" src/pages/Password.tsx src/routes.tsx
    # Expected: 1 match in Password.tsx (navigate call), 2 matches in routes.tsx (path + import uses MFAChallenge symbol)
    grep -n "import MFAChallenge" src/routes.tsx
    # Expected: 1 match
    grep -n "<Route path=\"/mfa-challenge\"" src/routes.tsx
    # Expected: 1 match, NOT wrapped in <Protected>
    npx vite build 2>&1 | tail -20
    # Expected: build succeeds (bundling MFAChallenge chunk); no missing imports
  </verify>
  <done>
    - `Password.tsx` detects `mfa_required` in the login return and navigates to `/mfa-challenge` with `{email, password}` in router state.
    - `Password.tsx` 401 path unchanged (`setError(err.message || "Invalid email or password")`).
    - `routes.tsx` imports `MFAChallenge` and registers `<Route path="/mfa-challenge" element={<MFAChallenge />} />` as a PUBLIC route (not wrapped in Protected).
    - `*` catchall `<NotFound />` remains the last route.
    - `npx vite build` completes successfully (end-to-end frontend build proof).
    - One atomic commit with explicit paths.
  </done>
</task>

</tasks>

<verification>
End-to-end trace after all 3 tasks:

1. Default path (no MFA): `/log-in/password` → submit correct pw → `useAuth.login` → `svcLogin` (200) → user set → `nav("/dashboard")`. UNCHANGED.

2. MFA-enrolled path: `/log-in/password` → submit correct pw → `useAuth.login` → `svcLogin` (403, detail.mfa_required=true) → returns `{mfa_required, email}` → `useAuth.login` forwards → Password.tsx detects, `nav("/mfa-challenge", {state: {email, password}})` → MFAChallenge renders → user types OTP → submit → `useAuth.login({username, password, otp_code})` → `svcLogin` (200 this time, valid OTP) → token stored, user set → `nav("/dashboard")`.

3. Wrong password: `/log-in/password` → submit wrong pw → svcLogin (401) → throws `"Invalid email or password"` → Password.tsx catches, setError. UNCHANGED.

4. Wrong OTP: `/mfa-challenge` → submit wrong OTP → svcLogin (403, still mfa_required) → returns `{mfa_required, email}` → MFAChallenge detects "still mfa_required" branch → `setError("Invalid or expired code. Try again.")` → user retries without losing email/password state.

5. Deep-link to /mfa-challenge without state → redirect to /log-in.

Manual local smoke test (optional, after all 3 tasks — run in /Users/jeet/arthaBuild):
```
cd /Users/jeet/arthaBuild
docker-compose up -d        # or: cd src/backend && uvicorn main:app --reload
cd src/frontend && npm run dev
# 1. Create/login a test user
# 2. Visit /mfa-setup, enroll via Google Authenticator
# 3. Log out
# 4. Log back in with email+password → should land on /mfa-challenge
# 5. Enter OTP → should land on /dashboard
# 6. Log out, log back in, enter WRONG otp → should stay on /mfa-challenge with inline error
```

DO NOT deploy. DO NOT run this smoke test against prod (zero MFA-enrolled users exist; enrolling a prod user just to test would be invasive).
</verification>

<success_criteria>
- All 3 tasks committed as atomic commits in `/Users/jeet/arthaBuild/` repo.
- `npx tsc --noEmit` in `src/frontend` passes clean.
- `npx vite build` in `src/frontend` succeeds.
- Every absolute path in this plan exists / has been modified.
- No `git add -A` ever executed. Every `git add` used explicit paths.
- No prod deploy. No staging deploy. Code change only.
- Memory log entry added at end: `/Users/jeet/.claude/projects/-Users-jeet-doordash-p2p/memory/MEMORY.md` gets a one-line pointer entry referencing this quick task (per user's project memory hygiene rule).
</success_criteria>

<output>
After completion, create `/Users/jeet/doordash-p2p/.planning/quick/295-fix-mfa-frontend-gap-password-tsx-ignore/295-SUMMARY.md` containing:
- Phase: quick-295
- Commits: 3 SHAs from arthaBuild repo
- Files touched: 5 (2 modified, 1 modified, 1 created, 1 modified)
- What changed end-to-end (the 5-step trace from verification block above)
- Open items: deploy to EC2 `artha.build` is DEFERRED — separate user decision
- Known limitations: Local smoke test is the verification floor; no e2e test exists because no MFA-enrolled user exists on prod
</output>
