---
phase: quick-357
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/frontend/src/app/api/api.ts
  - apps/web/p2p-platform/frontend/src/app/screens/auth/VendorLogin.tsx
autonomous: true
requirements:
  - QUICK-357-01
  - QUICK-357-02
  - QUICK-357-03
  - QUICK-357-04
  - QUICK-357-05

must_haves:
  truths:
    - "Demo vendor (demo.restaurant@dollor.ai) sees DOLL... orders on /vendor/orders after login on production"
    - "getCurrentVendorId() returns Vendor table id (40) not auth User table id (125) for demo vendor"
    - "Login response top-level vendor_id + business_name are merged into stored user object in localStorage"
    - "Each modified file lands as its own atomic commit referencing the CR ticket"
    - "Staging deploy passes before production deploy is triggered"
    - "Production deploy verified via gh run watch + live login smoke test"
  artifacts:
    - path: "apps/web/p2p-platform/frontend/src/app/api/api.ts"
      provides: "getCurrentVendorId() with vendor_id-first precedence"
      contains: "user.vendor_id"
    - path: "apps/web/p2p-platform/frontend/src/app/screens/auth/VendorLogin.tsx"
      provides: "onFinish login handler merging top-level vendor_id + business_name into stored user"
      contains: "response.data.vendor_id"
  key_links:
    - from: "VendorLogin.tsx onFinish"
      to: "localStorage 'user' entry"
      via: "JSON.stringify(storedUser) with vendor_id merged"
      pattern: "vendor_id: response.data.vendor_id"
    - from: "api.ts getCurrentVendorId"
      to: "/api/vendors/{vendor_id}/orders query"
      via: "vendor_id-first precedence over user.id"
      pattern: "if \\(user.vendor_id\\)"
---

<objective>
Ship the vendor-id precedence fix already staged in the working tree to production. Two frontend files are modified — `api.ts` now prefers `user.vendor_id` over `user.id` in `getCurrentVendorId()`, and `VendorLogin.tsx` now merges the top-level `vendor_id` + `business_name` from the login response into the stored user object. Without this fix, the auth user id (125) is sent to `/api/vendors/{id}/orders` instead of the Vendor table id (40), and the demo restaurant shows "No orders" even when DOLL... orders exist.

Purpose: Restore demo vendor orders tab for insurance underwriter demo and any other vendor whose auth User id ≠ Vendor PK.
Output: Two atomic commits on main, staging deploy verified, production deploy verified.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@apps/web/p2p-platform/frontend/src/app/api/api.ts
@apps/web/p2p-platform/frontend/src/app/screens/auth/VendorLogin.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create CR ticket and commit api.ts atomically</name>
  <files>apps/web/p2p-platform/frontend/src/app/api/api.ts</files>
  <action>
    Step 1 — Create CR ticket via admin API (per CLAUDE.md ticketed-task protocol). Use either:

    ```
    curl -X POST "$API_URL/api/admin/change-requests" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "title": "quick-357: Fix vendor-id precedence on vendor login",
        "description": "Prefer user.vendor_id over user.id in getCurrentVendorId(); merge top-level vendor_id + business_name from /api/auth/vendor/login response into stored user. Fixes demo restaurant /vendor/orders showing No orders when auth User id (125) ≠ Vendor table id (40).",
        "category": "bug_fix",
        "priority": "high",
        "files_affected": ["apps/web/p2p-platform/frontend/src/app/api/api.ts", "apps/web/p2p-platform/frontend/src/app/screens/auth/VendorLogin.tsx"]
      }'
    ```

    Capture the returned CR number (e.g. CR-0042). Export as `CR_ID=CR-XXXX` for use in commit messages.

    If admin API is unavailable in this session, fall back to using `quick-357` as the prefix (CLAUDE.md allows quick tasks to commit to main but requires a traceable ID — `quick-357` IS that ID).

    Step 2 — Verify the staged diff on api.ts is exactly the vendor_id precedence fix:

    ```
    git diff apps/web/p2p-platform/frontend/src/app/api/api.ts
    ```

    Expected hunks: `getCurrentVendorId()` now checks `user.vendor_id` FIRST, then falls back to `user.id`. Comment block explains auth-user-125 → vendor-40 mapping. No other changes.

    Step 3 — Stage and commit ONLY api.ts (atomic per CLAUDE.md):

    ```
    git add apps/web/p2p-platform/frontend/src/app/api/api.ts
    git commit -m "$(cat <<'EOF'
    fix(quick-357): prefer user.vendor_id over user.id in getCurrentVendorId

    The Vendor table PK differs from the auth User table id (e.g. auth user
    125 maps to vendor 40 for demo.restaurant@dollor.ai). Without this
    precedence fix, /api/vendors/{id}/orders queries the wrong id and the
    orders tab shows "No orders" even when DOLL... orders exist.

    Companion change in VendorLogin.tsx merges top-level vendor_id from
    the login response into the stored user object so this lookup actually
    finds the right key.
    EOF
    )"
    ```

    Do NOT amend, do NOT use --no-verify. If pre-commit hook fails, fix the issue and create a NEW commit.

    Do NOT use `git add -A` or `git add .` — only api.ts in this commit.
  </action>
  <verify>
    `git log -1 --stat` shows ONLY apps/web/p2p-platform/frontend/src/app/api/api.ts modified. `git diff HEAD~1 HEAD -- apps/web/p2p-platform/frontend/src/app/api/api.ts` shows the getCurrentVendorId precedence change. `git status` shows VendorLogin.tsx still unstaged.
  </verify>
  <done>
    api.ts commit on main (local), VendorLogin.tsx still in working tree, commit message references quick-357 (or CR ID), no other files in the commit.
  </done>
</task>

<task type="auto">
  <name>Task 2: Commit VendorLogin.tsx atomically</name>
  <files>apps/web/p2p-platform/frontend/src/app/screens/auth/VendorLogin.tsx</files>
  <action>
    Verify the staged diff on VendorLogin.tsx is exactly the vendor_id merge fix:

    ```
    git diff apps/web/p2p-platform/frontend/src/app/screens/auth/VendorLogin.tsx
    ```

    Expected hunks: `onFinish()` now builds `storedUser` by spreading `response.data.user` and merging in `response.data.vendor_id` and `response.data.business_name` (top-level fields from /api/auth/vendor/login response). Comment block explains the auth-125 → vendor-40 problem. No other changes.

    Stage and commit ONLY VendorLogin.tsx:

    ```
    git add apps/web/p2p-platform/frontend/src/app/screens/auth/VendorLogin.tsx
    git commit -m "$(cat <<'EOF'
    fix(quick-357): merge top-level vendor_id + business_name into stored user on vendor login

    /api/auth/vendor/login returns vendor_id and business_name at the top
    level of the response (not nested under user). Without merging them
    into the stored user object, getCurrentVendorId() falls back to user.id
    (auth User table) instead of vendor_id (Vendor table) — breaking the
    /vendor/orders fetch for any vendor where the two ids differ.

    Pairs with api.ts change that flips the precedence to vendor_id-first.
    EOF
    )"
    ```

    Do NOT amend the previous commit. Do NOT touch any other file.
  </action>
  <verify>
    `git log -2 --stat` shows two atomic commits: api.ts then VendorLogin.tsx. `git status` shows clean working tree (no modified frontend files). `git diff HEAD~1 HEAD -- apps/web/p2p-platform/frontend/src/app/screens/auth/VendorLogin.tsx` shows the storedUser merge.
  </verify>
  <done>
    Two atomic commits exist locally, both reference quick-357, working tree clean.
  </done>
</task>

<task type="auto">
  <name>Task 3: Push to main and deploy to staging via CI/CD</name>
  <files></files>
  <action>
    Step 1 — Push both commits to remote main:

    ```
    git push origin main
    ```

    If push is rejected (someone else pushed first), run `git pull --rebase origin main` first, then push. Do NOT force-push.

    Step 2 — Trigger staging deploy workflow:

    ```
    gh workflow run deploy-staging.yml --ref main
    ```

    Step 3 — Find the run id and watch it:

    ```
    sleep 5
    RUN_ID=$(gh run list --workflow=deploy-staging.yml --limit 1 --json databaseId --jq '.[0].databaseId')
    gh run watch "$RUN_ID" --exit-status
    ```

    Wait for all jobs to pass. If any job fails, do NOT proceed to production. Stop and surface the failure.

    Per CLAUDE.md: NEVER run manual `docker build`, `aws ecs`, `docker push`, or direct ECR/ECS commands. CI/CD only.
  </action>
  <verify>
    `gh run view $RUN_ID` shows status=completed, conclusion=success. Staging frontend at https://d34u5ixl0bulv4.cloudfront.net is reachable and serving the new build (hard refresh to bust cache).
  </verify>
  <done>
    Both commits on origin/main, staging workflow run shows success, staging CloudFront is serving the updated bundle.
  </done>
</task>

<task type="auto">
  <name>Task 4: Smoke test staging then deploy to production</name>
  <files></files>
  <action>
    Step 1 — Staging smoke test. Use the staging API directly (no browser needed):

    ```
    # Login as demo restaurant on STAGING
    STAGING_API="https://d34u5ixl0bulv4.cloudfront.net"
    LOGIN_RESP=$(curl -sS -X POST "$STAGING_API/api/auth/vendor/login" \
      -H "Content-Type: application/x-www-form-urlencoded" \
      -d "username=demo.restaurant@dollor.ai&password=DemoRestaurant2025!")
    echo "$LOGIN_RESP" | jq '{access_token: (.access_token | .[0:20] + "..."), vendor_id, business_name, user_id: .user.id, user_vendor_id: .user.vendor_id}'
    ```

    Required assertions on staging response:
    - `.vendor_id` is present at top level (should be 40 for demo restaurant)
    - `.access_token` is present
    - vendor_id ≠ user.id confirms the precedence fix is meaningful

    Step 2 — Hit the orders endpoint with the resolved vendor_id:

    ```
    TOKEN=$(echo "$LOGIN_RESP" | jq -r .access_token)
    VENDOR_ID=$(echo "$LOGIN_RESP" | jq -r .vendor_id)
    curl -sS -H "Authorization: Bearer $TOKEN" \
      "$STAGING_API/api/vendors/$VENDOR_ID/orders" | jq 'length, .[0:2]'
    ```

    Required: returns an array (not 401/404/500). If staging DB has demo DOLL... orders for vendor 40, length > 0. If staging is empty of orders, length=0 is acceptable as long as the endpoint returns 200.

    Step 3 — If staging smoke passes, trigger production deploy:

    ```
    gh workflow run deploy-dollar-ai.yml
    sleep 5
    PROD_RUN_ID=$(gh run list --workflow=deploy-dollar-ai.yml --limit 1 --json databaseId --jq '.[0].databaseId')
    gh run watch "$PROD_RUN_ID" --exit-status
    ```

    Per CLAUDE.md production deploy chain: tests → Docker build → ECR push → ECS deploy, all via the workflow. NEVER manual.
  </action>
  <verify>
    Staging login returns 200 with top-level vendor_id=40 + access_token. Staging /api/vendors/40/orders returns 200 (array). Production workflow `gh run view $PROD_RUN_ID` shows all jobs green, ECS tasks HEALTHY.
  </verify>
  <done>
    Staging confirmed serving fixed bundle and returning correct vendor_id. Production deploy completed without errors. ECS tasks reported HEALTHY.
  </done>
</task>

<task type="auto">
  <name>Task 5: Production smoke test and update STATE.md</name>
  <files>.planning/STATE.md</files>
  <action>
    Step 1 — Production smoke test (mirror the staging test):

    ```
    PROD_API="https://api.dollor.ai"
    LOGIN_RESP=$(curl -sS -X POST "$PROD_API/api/auth/vendor/login" \
      -H "Content-Type: application/x-www-form-urlencoded" \
      -d "username=demo.restaurant@dollor.ai&password=DemoRestaurant2025!")
    echo "$LOGIN_RESP" | jq '{vendor_id, business_name, user_id: .user.id, user_vendor_id: .user.vendor_id}'

    TOKEN=$(echo "$LOGIN_RESP" | jq -r .access_token)
    VENDOR_ID=$(echo "$LOGIN_RESP" | jq -r .vendor_id)
    curl -sS -H "Authorization: Bearer $TOKEN" \
      "$PROD_API/api/vendors/$VENDOR_ID/orders" | jq 'length, [.[].order_number] | sort | unique | .[0:5]'
    ```

    Required: vendor_id=40 returned, /api/vendors/40/orders returns array containing recent DOLL... orders (per STATE.md, DOLL2026406 walked the full lifecycle yesterday — it should appear).

    Step 2 — Update STATE.md `Last activity` line with the quick-357 outcome. Append a single new line near the top documenting the fix, mirroring the format used for quick-356. Keep it concise (1-2 lines, file:line reference where helpful).

    Step 3 — Commit STATE.md atomically:

    ```
    git add .planning/STATE.md
    git commit -m "$(cat <<'EOF'
    docs(quick-357): update STATE.md with vendor-id precedence fix outcome
    EOF
    )"
    git push origin main
    ```

    Note: STATE.md commit does NOT trigger a redeploy — it's a doc-only file, no CI workflow listens to it.
  </action>
  <verify>
    Production /api/auth/vendor/login returns vendor_id=40 at top level. Production /api/vendors/40/orders returns 200 with DOLL... orders array (DOLL2026406 visible per yesterday's STATE.md note). STATE.md updated and pushed.
  </verify>
  <done>
    Demo vendor sees orders on production. STATE.md documents the fix. All three commits (api.ts, VendorLogin.tsx, STATE.md) on origin/main. Production ECS healthy.
  </done>
</task>

</tasks>

<verification>
- `git log --oneline -3` shows three quick-357 commits in order: api.ts, VendorLogin.tsx, STATE.md.
- Each of the two code commits touches exactly one file.
- `gh run list --workflow=deploy-staging.yml --limit 1` and `gh run list --workflow=deploy-dollar-ai.yml --limit 1` both show conclusion=success.
- Production curl: login returns top-level vendor_id=40 for demo.restaurant@dollor.ai; /api/vendors/40/orders returns 200 with order array including DOLL2026406.
- No manual `docker build` / `aws ecs` / `docker push` commands run anywhere.
</verification>

<success_criteria>
- demo.restaurant@dollor.ai can log into https://www.dollor.ai (or admin frontend), navigate to /vendor/orders, and see DOLL... orders instead of "No orders".
- getCurrentVendorId() returns 40 (vendor PK), not 125 (auth user id), after demo vendor login.
- Two atomic code commits + one STATE.md commit on main, all referencing quick-357.
- Staging + production deploys via CI/CD only.
- No regressions in admin login or other vendor logins (storedUser spread preserves all other user fields).
</success_criteria>

<output>
After completion, create `.planning/quick/357-fix-vendor-id-precedence-on-vendor-login/357-SUMMARY.md` capturing:
- The two commit SHAs (api.ts, VendorLogin.tsx) + STATE.md commit SHA
- Staging + production gh run ids
- Production smoke test output (vendor_id from login, count of orders returned)
- Any deviation from plan (e.g. CR ticket created vs quick-357 fallback used)
</output>
