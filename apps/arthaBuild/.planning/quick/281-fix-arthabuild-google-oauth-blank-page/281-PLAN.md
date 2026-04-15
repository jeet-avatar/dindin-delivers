---
phase: quick-281
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/arthaBuild/src/backend/routers/auth.py
  - apps/arthaBuild/src/frontend/src/pages/OAuthCallback.tsx
autonomous: true
requirements: [Q281]
must_haves:
  truths:
    - "Google OAuth login completes without a blank page"
    - "Users who sign in via Google are marked is_verified=True in the database"
    - "After OAuth redirect, the app navigates to /dashboard without calling /api/auth/login"
  artifacts:
    - path: "apps/arthaBuild/src/backend/routers/auth.py"
      provides: "google_callback sets is_verified and is_active on existing OAuth users"
      contains: "user.is_verified = True"
    - path: "apps/arthaBuild/src/frontend/src/pages/OAuthCallback.tsx"
      provides: "OAuthCallback that relies on setAccessToken + storage, not login()"
  key_links:
    - from: "apps/arthaBuild/src/frontend/src/pages/OAuthCallback.tsx"
      to: "apps/arthaBuild/src/backend/routers/auth.py"
      via: "Google redirect with ?token= query param"
      pattern: "setAccessToken\\(token\\)"
---

<objective>
Fix two bugs causing a blank page after Google OAuth login.

Bug 1 (backend): `google_callback` in auth.py finds existing users but never sets `is_verified=True`, leaving the account in an unverified state. Any middleware or guard checking `is_verified` then blocks API calls → blank page.

Bug 2 (frontend): `OAuthCallback.tsx` calls `useAuth().login(user)` after the token is already stored. `login()` is the email/password flow — it POSTs to `/api/auth/login` with a user object instead of credentials, which fails silently and leaves the app in a broken state.

Purpose: Google OAuth users can log in and reach the dashboard without errors.
Output: Two targeted file edits — one backend line group, one frontend removal.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/arthaBuild/.planning/STATE.md
@apps/arthaBuild/CLAUDE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Backend — mark existing OAuth users as verified</name>
  <files>apps/arthaBuild/src/backend/routers/auth.py</files>
  <action>
In `google_callback` (lines 345-384), inside the existing-user branch (starting at line 346-347 where the user is fetched by email), add the following three lines immediately BEFORE the `create_access_token` call:

    user.is_verified = True
    user.is_active = True
    await db.commit()

Do NOT touch the new-user branch (line ~361 onward) — new users already get `is_verified=True` at creation. Only the existing-user path needs this fix.

Note: `db` is an AsyncSession passed to the endpoint. The `await db.commit()` persists the flag so subsequent requests see the verified state.
  </action>
  <verify>
    grep -n "is_verified = True" apps/arthaBuild/src/backend/routers/auth.py
    # Must show at least 2 occurrences: one in the existing-user block (new), one in the new-user block (old)
  </verify>
  <done>
    `is_verified = True` appears in the existing-user branch of google_callback, and `await db.commit()` follows it before the access token is created.
  </done>
</task>

<task type="auto">
  <name>Task 2: Frontend — remove incorrect login() call from OAuthCallback</name>
  <files>apps/arthaBuild/src/frontend/src/pages/OAuthCallback.tsx</files>
  <action>
Make two targeted changes:

1. Line 10 — remove `login` from the useAuth destructure. Change:
     const { login } = useAuth()
   to either remove the line entirely (if `login` is the only destructured value) or remove just `login` from the destructure.

2. Line 43 — remove the `login(user)` call entirely. The lines before and after it (setting `setAccessToken(token)` on line 32 and `storage.set("auth_user", user)` on line 41) must remain untouched.

Do NOT change `setAccessToken(token)`, `storage.set("auth_user", user)`, or the `navigate("/dashboard")` call. Those three are the correct flow and must stay.
  </action>
  <verify>
    grep -n "login" apps/arthaBuild/src/frontend/src/pages/OAuthCallback.tsx
    # Should return zero matches (or only comments). No `login` import or call should remain.

    grep -n "setAccessToken\|storage.set\|navigate" apps/arthaBuild/src/frontend/src/pages/OAuthCallback.tsx
    # Must show all three still present.
  </verify>
  <done>
    OAuthCallback.tsx contains no reference to `login`. The `setAccessToken`, `storage.set("auth_user", ...)`, and `navigate("/dashboard")` calls are all still present.
  </done>
</task>

</tasks>

<verification>
After both tasks:
1. `grep -n "is_verified = True" apps/arthaBuild/src/backend/routers/auth.py` — 2+ hits
2. `grep -n "await db.commit" apps/arthaBuild/src/backend/routers/auth.py` — hit in existing-user block
3. `grep -n "login" apps/arthaBuild/src/frontend/src/pages/OAuthCallback.tsx` — 0 hits
4. `grep -n "setAccessToken\|storage.set\|navigate" apps/arthaBuild/src/frontend/src/pages/OAuthCallback.tsx` — 3 hits
</verification>

<success_criteria>
- Existing Google OAuth users get `is_verified=True` persisted to DB on every login
- OAuthCallback.tsx never calls the email/password `login()` function
- Token and user are stored via `setAccessToken` + `storage.set` then navigate to /dashboard — same as before, minus the broken API call
</success_criteria>

<output>
After completion, create `.planning/quick/281-fix-arthabuild-google-oauth-blank-page/281-SUMMARY.md`
</output>
