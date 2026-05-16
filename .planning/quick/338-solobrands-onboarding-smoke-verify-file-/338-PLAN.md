---
phase: 338-solobrands-onboarding-smoke
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/turion-space-demo/backend/src/routes/onboarding.ts
  - /Users/jeet/turion-space-demo/onboarding/recommend.html
  - /Users/jeet/turion-space-demo/onboarding/migrate.html
  - /Users/jeet/turion-space-demo/onboarding/migrate-items-csv.html
  - /Users/jeet/turion-space-demo/onboarding/migrate-vendors-csv.html
  - /Users/jeet/turion-space-demo/onboarding/migrate-sample-data.html
  - /Users/jeet/turion-space-demo/onboarding/migrate-netsuite-clone.html
  - /Users/jeet/turion-space-demo/onboarding/migrate-salesforce.html
autonomous: true
requirements:
  - SB-ONB-01  # All 7 onboarding HTML pages serve 200 from CloudFront
  - SB-ONB-02  # /api/onboarding/recommend returns recommendations for an authed admin
  - SB-ONB-03  # /api/onboarding/finalize persists selection to tenant_features (enabled=true) AND /api/tenants/current reflects it
  - SB-ONB-04  # Each migrate/* endpoint returns 2xx (or documented 4xx with reason) with an admin JWT against PROD APIGW
  - SB-ONB-05  # Any 4xx/5xx that blocks a real user flow is fixed; if any fix exceeds ~30 min, convert to phase

must_haves:
  truths:
    - "User on https://solobrands.zietra.com can open every /onboarding/* page (200 OK) — migrate.html hub, migrate-items-csv, migrate-vendors-csv (?type=customers too), migrate-sample-data, migrate-netsuite-clone, migrate-salesforce, recommend.html"
    - "User can submit the recommend wizard (5 questions) and get back a recommendations array"
    - "User can click 'Finalize and continue to home' and the call returns ok:true"
    - "After finalize, /api/tenants/current returns features array reflecting EXACTLY the selected modules (no more, no less)"
    - "Each CSV-upload endpoint (/api/onboarding/migrate/{items,vendors,customers,salesforce,sample-data}) returns 2xx for a valid 1-row payload with admin JWT"
    - "If a 4xx/5xx surfaces during smoke, the failure mode is documented and fixed OR converted to a phase"
  artifacts:
    - path: "/Users/jeet/doordash-p2p/.planning/quick/338-solobrands-onboarding-smoke-verify-file-/338-SMOKE-RESULTS.md"
      provides: "End-to-end smoke matrix: HTTP status per endpoint, response body excerpts, DB before/after for tenant_features"
      contains: "Solo Brands tenant_features delta"
    - path: "/Users/jeet/turion-space-demo/scripts/smoke-onboarding.sh"
      provides: "Repeatable smoke script that hits all 7 onboarding endpoints with admin JWT (NEW file)"
      contains: "/api/onboarding/recommend"
  key_links:
    - from: "recommend.html finalizeBtn"
      to: "/api/onboarding/finalize"
      via: "window.erpApi.post"
      pattern: "erpApi\\.post\\('/api/onboarding/finalize'"
    - from: "/api/onboarding/finalize handler"
      to: "public.tenant_features (UPDATE enabled=true WHERE module_code IN selected)"
      via: "withTenantClient + RLS as zietra_app"
      pattern: "UPDATE public\\.tenant_features SET enabled = true"
    - from: "/api/tenants/current"
      to: "public.tenant_features (SELECT enabled=true)"
      via: "withTenantClient"
      pattern: "SELECT module_code FROM public\\.tenant_features"
---

<objective>
Smoke-test every onboarding endpoint against PROD APIGW (lo254mvukl.execute-api.us-east-1.amazonaws.com) using an admin JWT for the Solo Brands tenant. Identify any 4xx/5xx that blocks a real user flow (file upload wizards + module wizard at /onboarding/recommend). Fix in place IF the fix is ≤30 minutes; if larger, STOP and convert to a real phase. Confirm /api/onboarding/finalize persists the selection to public.tenant_features and that /api/tenants/current reflects the change.

Purpose: User is actively uploading CSVs on solobrands.zietra.com RIGHT NOW. Phase 65-01 imported 109 items + 4 sales orders. Phase 54.4 shipped the wizards but they have not been re-smoked since Aurora migration (54.5), RLS rollout (55), and the Solo Brands tenant being added. Need a fast confidence check + targeted fix BEFORE Phase 65-02 (data-aware wizard) builds on top.

Output:
- 338-SMOKE-RESULTS.md (smoke matrix + DB before/after)
- scripts/smoke-onboarding.sh (reusable smoke script in turion-space-demo)
- Any in-scope bug fixes shipped via build-and-push.sh / deploy-frontend.sh
- 338-SUMMARY.md describing what passed, what failed, what was fixed, what was punted to a phase
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/doordash-p2p/.planning/STATE.md
@/Users/jeet/doordash-p2p/CLAUDE.md
@/Users/jeet/.claude/handoffs/2026-05-16-zietra-solobrands-real-data-onboarding.md
@/Users/jeet/turion-space-demo/backend/src/routes/onboarding.ts
@/Users/jeet/turion-space-demo/backend/src/routes/tenants.ts
@/Users/jeet/turion-space-demo/onboarding/recommend.html
@/Users/jeet/turion-space-demo/onboarding/migrate.html
@/Users/jeet/turion-space-demo/onboarding/migrate-items-csv.html
@/Users/jeet/turion-space-demo/onboarding/migrate-vendors-csv.html
@/Users/jeet/turion-space-demo/onboarding/migrate-sample-data.html
@/Users/jeet/turion-space-demo/onboarding/migrate-netsuite-clone.html
@/Users/jeet/turion-space-demo/onboarding/migrate-salesforce.html
@/Users/jeet/turion-space-demo/lib/migration-sources.js
@/Users/jeet/turion-space-demo/lib/module-catalog.js

# Known facts (verified during planning, do not re-derive):
# - Backend route file exists: /Users/jeet/turion-space-demo/backend/src/routes/onboarding.ts
# - Endpoints mounted under /api/onboarding: rules (GET), recommend (POST), finalize (POST admin),
#   migrate/salesforce (POST admin), migrate/items (POST admin), migrate/vendors (POST admin),
#   migrate/customers (POST admin), migrate/sample-data (POST admin), state (GET), checklist (PATCH admin|manager)
# - finalize writes to public.tenant_features (NOT tenant_modules — planning ctx had wrong table name)
# - /api/tenants/current returns { features: [module_code, ...] } from tenant_features WHERE enabled=true
# - Frontend lib files: lib/migration-sources.js (7 cards), lib/module-catalog.js (13 modules)
# - Admin bypass: jeetnair.in@gmail.com — password in `aws secretsmanager get-secret-value --secret-id zietra/admin-bypass-password --region us-east-1 --query SecretString --output text | python3 -c 'import json,sys;print(json.load(sys.stdin)["password"])'`
# - Backend deploy: cd /Users/jeet/turion-space-demo && ./build-and-push.sh
# - Frontend deploy: cd /Users/jeet/turion-space-demo && ./deploy-frontend.sh (CF E37R9PT8IL44L2)
# - Aurora SQL runner Lambda: `zietra-rls-runner-55-05` — payload {user,password,sql}.
#   For SELECTs on tenant_features use user=zietra_app password=S/UipAK3Gf5+eahfD+wJpWiPDFsbw7H7
#   with SET app.tenant_id replayed per invocation (Phase 65-01 SUMMARY lesson — Lambda warm reuse drops session var).
</context>

<tasks>

<task type="auto">
  <name>Task 1: Build smoke harness + run baseline matrix against PROD</name>
  <files>
    /Users/jeet/turion-space-demo/scripts/smoke-onboarding.sh
    /Users/jeet/doordash-p2p/.planning/quick/338-solobrands-onboarding-smoke-verify-file-/338-SMOKE-RESULTS.md
  </files>
  <action>
    Goal: produce a complete smoke matrix BEFORE touching code. If everything is green, skip Task 2.

    Step 1 — Get admin JWT for Solo Brands tenant.
    Write `scripts/smoke-onboarding.sh` (in turion-space-demo) that:
    - Fetches the admin bypass password: `aws secretsmanager get-secret-value --secret-id zietra/admin-bypass-password --region us-east-1 --query SecretString --output text | python3 -c 'import json,sys;print(json.load(sys.stdin)["password"])'`
    - Calls Cognito USER_PASSWORD_AUTH for jeetnair.in@gmail.com with tenant=solobrands (mirror what erp-login.html does with `?admin=1`). Reuse the helper pattern in `/Users/jeet/turion-space-demo/cognito-auth.js` — read it first; do NOT invent flow. If `cognitoAuth.signInWithPassword` is the only entrypoint, write a tiny node one-liner inside the bash script using `aws cognito-idp admin-initiate-auth` (it returns an IdToken directly).
    - Exports `ID_TOKEN` for the rest of the script.

    Step 2 — HEAD/GET smoke for static onboarding pages (CloudFront). For each path below, curl -sS -o /dev/null -w '%{http_code} %{url_effective}\n':
      https://solobrands.zietra.com/onboarding/migrate.html
      https://solobrands.zietra.com/onboarding/recommend.html
      https://solobrands.zietra.com/onboarding/migrate-items-csv.html
      https://solobrands.zietra.com/onboarding/migrate-vendors-csv.html
      https://solobrands.zietra.com/onboarding/migrate-vendors-csv.html?type=customers
      https://solobrands.zietra.com/onboarding/migrate-sample-data.html
      https://solobrands.zietra.com/onboarding/migrate-netsuite-clone.html
      https://solobrands.zietra.com/onboarding/migrate-salesforce.html
      https://solobrands.zietra.com/lib/module-catalog.js
      https://solobrands.zietra.com/lib/migration-sources.js
      https://solobrands.zietra.com/lib/papaparse-5.4.1.min.js
      https://solobrands.zietra.com/erp-api.js
      https://solobrands.zietra.com/cognito-auth.js
      https://solobrands.zietra.com/turion-config.js
      https://solobrands.zietra.com/app-shell.js
      https://solobrands.zietra.com/app-shell.css
    Expected: 200 for every line. Record any non-200.

    Step 3 — POST smoke against PROD APIGW (https://lo254mvukl.execute-api.us-east-1.amazonaws.com) with Authorization: Bearer $ID_TOKEN AND Host header `solobrands.zietra.com` so tenantContext middleware resolves the right tenant. (Look at existing smoke scripts like `scripts/smoke-solobrands.sh` if present, mirror the pattern — do NOT invent header names.) For each endpoint, capture: HTTP code, JSON body (truncated to 500 chars), elapsed time.

      a) GET  /api/tenants/current                                                 → expect 200 with features:[…]
      b) POST /api/onboarding/recommend  body={"industry":"d2c-ecommerce","team_size":"201-1000","pain_point":"qb-too-small","tools_today":["quickbooks"],"asc606_needs":"no"}  → expect 200 with recommendations:[…]
      c) GET  /api/onboarding/state                                                → expect 200 with checklist
      d) GET  /api/onboarding/rules                                                → expect 200 (rules JSON)
      e) POST /api/onboarding/migrate/items  body={"rows":[{"sku":"SMOKE-338-1","description":"smoke","list_price":1,"cost":0.5}]}  → expect 200 with inserted/skipped
      f) POST /api/onboarding/migrate/vendors body={"rows":[{"name":"Smoke Vendor 338","email":"smoke@338.test","payment_terms":"Net 30"}]}  → expect 200
      g) POST /api/onboarding/migrate/customers body={"rows":[{"name":"Smoke Customer 338","email":"sc@338.test","billing_address":"1 Smoke St"}]}  → expect 200
      h) POST /api/onboarding/migrate/salesforce body={"rows":[{"name":"Smoke SF 338","email":"sf@338.test"}]}  → expect 200
      i) POST /api/onboarding/migrate/sample-data body={}  → may legitimately 4xx/5xx if tenant already has data; record either way and note in results

      Skip /api/onboarding/finalize here — Task 1 does NOT mutate the tenant's enabled modules; that's Task 3.

    Step 4 — Write `338-SMOKE-RESULTS.md` with a single table:
      | Endpoint | Method | HTTP | Verdict | Notes |
      and a `BEFORE` block capturing current tenant_features for Solo Brands:
      Use `zietra-rls-runner-55-05` Lambda:
      ```bash
      aws lambda invoke --function-name zietra-rls-runner-55-05 --region us-east-1 \
        --payload "$(jq -n --arg sql "SET app.tenant_id = (SELECT id::text FROM public.tenants WHERE slug='solobrands'); SELECT module_code, enabled FROM public.tenant_features WHERE tenant_id=(SELECT id FROM public.tenants WHERE slug='solobrands') ORDER BY module_code" '{user:"zietra_app",password:"S/UipAK3Gf5+eahfD+wJpWiPDFsbw7H7",sql:$sql}')" \
        --cli-binary-format raw-in-base64-out /tmp/338-before.json && cat /tmp/338-before.json
      ```
      (NOTE: Lambda warm reuse drops `app.tenant_id` — Phase 65-01 SUMMARY documents this. SET must be replayed on EVERY invocation, which the inline SQL above already does. Reference: /Users/jeet/doordash-p2p/scripts/65-solobrands-import/run-sql.sh.)

    Output a verdict line at the end: GREEN (all 2xx) | YELLOW (n endpoints 4xx but documented) | RED (5xx or blocking failure → triggers Task 2).
  </action>
  <verify>
    bash /Users/jeet/turion-space-demo/scripts/smoke-onboarding.sh 2>&1 | tee /tmp/338-smoke.log
    cat /Users/jeet/doordash-p2p/.planning/quick/338-solobrands-onboarding-smoke-verify-file-/338-SMOKE-RESULTS.md | head -60
    # Confirm: every endpoint has a row, every row has an HTTP code, BEFORE table shows ≥1 enabled module
  </verify>
  <done>
    - scripts/smoke-onboarding.sh exists, is executable, and finishes without crashing
    - 338-SMOKE-RESULTS.md has 14+ static-asset rows and 9 API rows
    - BEFORE tenant_features snapshot captured
    - Final line is GREEN | YELLOW | RED with a one-sentence rationale
  </done>
</task>

<task type="auto">
  <name>Task 2: Fix any 4xx/5xx blocking real user flow (CONDITIONAL — skip if Task 1 = GREEN)</name>
  <files>
    /Users/jeet/turion-space-demo/backend/src/routes/onboarding.ts
    /Users/jeet/turion-space-demo/onboarding/*.html
    (only the files actually broken)
  </files>
  <action>
    PRECONDITION: skip this task if Task 1 verdict is GREEN. If YELLOW, only act on rows the user would actually hit (a 4xx on /migrate/sample-data with a tenant that already has data is EXPECTED and does NOT need fixing).

    Triage rules:
    1) 401/403 on /api/onboarding/recommend or /finalize → auth header / tenant resolution bug. Check Authorization header format + Host header. Fix in smoke script first; only patch backend if header parsing is wrong.
    2) 400 with "industry and team_size are required" on /recommend → frontend payload bug or smoke script bug. Check both.
    3) 4xx with "Unknown module code in selection" on /finalize → MODULE_CATALOG codes drifted from ALL_MODULES. Diff `lib/module-catalog.js` vs `backend/src/onboarding/rule-engine.ts` ALL_MODULES.
    4) 5xx on /migrate/items|vendors|customers → look at CloudWatch logs for the Lambda (`aws logs tail /aws/lambda/turion-demo-api --since 10m --region us-east-1 --filter-pattern "migrate/"`). Common causes: schema drift (column renamed/dropped), missing tenant_features row blocking RLS write, importer module crash.
    5) 5xx on /migrate/salesforce → same Lambda log inspection; importSalesforceAccounts may have a known issue with missing optional columns — check rows shape vs `backend/src/onboarding/sf-csv-import.ts`.
    6) 404 on any /onboarding/* HTML → CloudFront cache or S3 sync gap; re-run `./deploy-frontend.sh` from /Users/jeet/turion-space-demo and invalidate `/onboarding/*` only.

    Budget rule (DEVIATION TRIGGER): if any single fix would touch >3 files OR require schema migration OR exceed ~30 min coding, STOP. Document the gap in 338-SMOKE-RESULTS.md under a new `## Punted to phase` section with: endpoint, error, suspected root cause, why it doesn't fit a quick task. Then continue to Task 3 — do NOT keep digging.

    For every fix you DO ship:
    - Backend: edit /Users/jeet/turion-space-demo/backend/src/routes/onboarding.ts (or the importer in /onboarding/) → `cd /Users/jeet/turion-space-demo && ./build-and-push.sh` → wait for Lambda CodeSha256 to change → re-run the failing curl from Task 1 → record GREEN line.
    - Frontend: edit the HTML in /Users/jeet/turion-space-demo/onboarding/ → `./deploy-frontend.sh` → invalidate CloudFront `/onboarding/*` and `/lib/*` only (not /*) → curl the static asset to confirm new bytes.
    - Commit each fix as a separate atomic commit: `fix(338-01): {one-line description}` using `git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" commit ...`

    Append fix log to 338-SMOKE-RESULTS.md under `## Fixes shipped`:
      | Endpoint | Was | Now | Commit | Verified via |
  </action>
  <verify>
    # Re-run the originally failing curl(s); they MUST now return 2xx
    bash /Users/jeet/turion-space-demo/scripts/smoke-onboarding.sh 2>&1 | tail -20
    # Confirm CloudWatch shows no new 5xx in last 5 min for fixed endpoints
    aws logs tail /aws/lambda/turion-demo-api --since 5m --region us-east-1 --filter-pattern "ERROR" | head -20
  </verify>
  <done>
    - Every endpoint the user would actually use returns 2xx (or is documented as "Punted to phase" with rationale)
    - Each fix has its own atomic commit pushed to github.com/jeet-avatar/turion-space-demo
    - 338-SMOKE-RESULTS.md has a `## Fixes shipped` section with a row per fix
    - OR: Task 1 was GREEN and this task was skipped (note skip in summary)
  </done>
</task>

<task type="auto">
  <name>Task 3: Prove /api/onboarding/finalize actually enables modules + write SUMMARY</name>
  <files>
    /Users/jeet/doordash-p2p/.planning/quick/338-solobrands-onboarding-smoke-verify-file-/338-SMOKE-RESULTS.md
    /Users/jeet/doordash-p2p/.planning/quick/338-solobrands-onboarding-smoke-verify-file-/338-SUMMARY.md
  </files>
  <action>
    Step 1 — Capture BEFORE state for Solo Brands tenant_features (from Task 1 BEFORE block — re-fetch if Task 2 made changes that could've touched the table).

    Step 2 — Build a deliberate test selection. Pick 3 modules that are likely already in Solo Brands' enabled set + 1 module that is currently DISABLED, so we can prove the endpoint both enables AND disables. Read the current set, then pick:
      - 3 from currently-enabled (so they should stay enabled): e.g. crm, sales, purchase (verify they're in MODULE_CATALOG)
      - 1 from disabled: pick any disabled module_code from BEFORE list
      - If Solo Brands has all 9 (per handoff), pick a 4th from the enabled set instead — finalize accepts 1-13 modules.

    Step 3 — Curl /api/onboarding/finalize with the chosen selection (admin JWT, Host: solobrands.zietra.com). Expect: 200 with {ok:true, redirect:'/'}.
      Record HTTP code + body in 338-SMOKE-RESULTS.md under `## Finalize round-trip`.

    Step 4 — Capture AFTER state (same Lambda runner pattern as Task 1). Diff BEFORE vs AFTER. The AFTER set MUST equal exactly the 4 modules from Step 2 (no more, no less). Document the diff in 338-SMOKE-RESULTS.md.

    Step 5 — Verify nav reflects the change. Curl `GET /api/tenants/current` with the same JWT/Host. The `features` array MUST equal the same 4 codes (sorted). Record.

    Step 6 — RESTORE the original module set so the user's tenant isn't left in test state:
      Replay /api/onboarding/finalize with the original BEFORE module list. Verify AFTER == BEFORE.

    Step 7 — Write `338-SUMMARY.md` (this is the quick-task output, not a documentation file). Sections:
      ## What was done
      ## Smoke matrix (link to 338-SMOKE-RESULTS.md)
      ## Fixes shipped (count + commits, or "none — all GREEN")
      ## Punted to phase (the deviations from Task 2 budget, if any — these become inputs to the next planning round)
      ## tenant_features round-trip proof (BEFORE → test selection → AFTER → restored — paste each block)
      ## Next steps for the user (e.g. "Phase 65-02 can proceed", or "Phase X needed for endpoint Y")

    Commit: `docs(338-01): solobrands onboarding smoke + finalize round-trip` with the two .md files via `git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar"`.
  </action>
  <verify>
    # Confirm the AFTER==test-selection assertion is in the doc
    grep -A2 "## Finalize round-trip" /Users/jeet/doordash-p2p/.planning/quick/338-solobrands-onboarding-smoke-verify-file-/338-SMOKE-RESULTS.md
    # Confirm restore was successful (final state == original state)
    grep -A4 "## Restore" /Users/jeet/doordash-p2p/.planning/quick/338-solobrands-onboarding-smoke-verify-file-/338-SMOKE-RESULTS.md
    # Confirm SUMMARY exists with all 6 sections
    grep -c "^## " /Users/jeet/doordash-p2p/.planning/quick/338-solobrands-onboarding-smoke-verify-file-/338-SUMMARY.md
    # Confirm git log shows the commit
    cd /Users/jeet/doordash-p2p && git log --oneline -3
  </verify>
  <done>
    - 338-SMOKE-RESULTS.md has a "Finalize round-trip" section with BEFORE/AFTER/RESTORE blocks
    - The diff PROVES tenant_features.enabled was mutated exactly as requested
    - /api/tenants/current returns the same set (proves nav will reflect it)
    - Solo Brands tenant is restored to its original enabled-module set (no test residue)
    - 338-SUMMARY.md exists with 6 sections including any "Punted to phase" items for the next planning round
    - Commit pushed to main
  </done>
</task>

</tasks>

<verification>
End-to-end checks (run after all tasks):

1. Smoke matrix complete:
   `wc -l /Users/jeet/doordash-p2p/.planning/quick/338-solobrands-onboarding-smoke-verify-file-/338-SMOKE-RESULTS.md` ≥ 50

2. All 7 onboarding HTML pages serve 200 from CloudFront:
   `for p in migrate.html recommend.html migrate-items-csv.html migrate-vendors-csv.html migrate-sample-data.html migrate-netsuite-clone.html migrate-salesforce.html; do curl -sI -o /dev/null -w "%{http_code} $p\n" https://solobrands.zietra.com/onboarding/$p; done` → all 200

3. /api/onboarding/finalize round-trip proven (BEFORE != test selection, AFTER == test selection, RESTORE == BEFORE).

4. Solo Brands tenant_features is back to its original state (no test residue):
   `aws lambda invoke --function-name zietra-rls-runner-55-05 ... SELECT module_code FROM tenant_features WHERE tenant_id=...solobrands AND enabled=true` matches the BEFORE list captured in Task 1.

5. No Lambda 5xx in the last 10 minutes for /api/onboarding/*:
   `aws logs tail /aws/lambda/turion-demo-api --since 10m --region us-east-1 --filter-pattern "onboarding" | grep -i error` → empty

6. All commits attributed to jm@techcloudpro.com (not jeetnair.in@gmail.com):
   `git log --format='%ae' -5 | grep -c "jm@techcloudpro.com"` ≥ 1 (or 0 if no commits were needed)
</verification>

<success_criteria>
- 338-SMOKE-RESULTS.md exists with BEFORE/AFTER tenant_features blocks, full HTTP matrix, finalize round-trip proof
- 338-SUMMARY.md exists with 6 named sections including any "Punted to phase" items for the orchestrator's next planning round
- Solo Brands tenant restored to its original module state (operator can keep uploading CSVs immediately after this task ends — no babysitting)
- scripts/smoke-onboarding.sh exists for repeatability (Phase 65-02 will reuse it)
- Either:
  - GREEN path: all endpoints 2xx, no fixes needed, summary says "onboarding wizards are healthy, proceed to Phase 65-02"
  - YELLOW/RED path: fixes shipped via build-and-push.sh / deploy-frontend.sh with atomic commits, plus any over-budget items documented under "Punted to phase" so the next /gsd:plan-phase can pick them up
</success_criteria>

<output>
After completion, create `/Users/jeet/doordash-p2p/.planning/quick/338-solobrands-onboarding-smoke-verify-file-/338-SUMMARY.md`
</output>
