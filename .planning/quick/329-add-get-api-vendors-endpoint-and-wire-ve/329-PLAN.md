---
phase: quick-329
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/turion-satellite/backend/src/routes/vendors.ts
  - /Users/jeet/turion-satellite/backend/src/app.ts
  - /Users/jeet/turion-satellite/backend/tests/vendors.test.ts
  - /Users/jeet/turion-space-demo/satellite/part.html
autonomous: true
requirements:
  - QUICK-329-01  # Backend: GET /api/vendors returns the list of vendors with id, name, code, type, country (auth-gated, hardened error)
  - QUICK-329-02  # Frontend: place-order modal renders a vendor <select>, defaults to part.preferred_vendor_id, submits chosen vendor_id
  - QUICK-329-03  # Both repos deployed; smoke-tested endpoint + modal flow before declaring done

must_haves:
  truths:
    - "Authenticated GET /api/vendors returns a JSON array of vendors with id, name, code, type, country"
    - "Unauthenticated GET /api/vendors returns 401 (auth gate intact)"
    - "Backend errors return { error: 'Failed to ...' } with no detail field (no err.message leak)"
    - "On the part-detail place-order modal for a BUY part, the user sees a <select> populated from /api/vendors"
    - "The vendor <select> defaults to part.preferred_vendor_id when present"
    - "Submitting the modal sends vendor_id = chosen <select> value (not hardcoded preferred_vendor_id)"
    - "POST /api/satellites/:satId/vendor-orders persists with the user-selected vendor_id"
    - "If part has no preferred_vendor_id, user can still place an order by picking a vendor from the dropdown"
  artifacts:
    - path: "/Users/jeet/turion-satellite/backend/src/routes/vendors.ts"
      provides: "GET /api/vendors router"
      exports: ["default router"]
    - path: "/Users/jeet/turion-satellite/backend/src/app.ts"
      provides: "Mount point for vendors router at /api/vendors"
      contains: "app.use('/api/vendors'"
    - path: "/Users/jeet/turion-satellite/backend/tests/vendors.test.ts"
      provides: "Vitest suite for the vendors endpoint (auth, shape, hardened error)"
    - path: "/Users/jeet/turion-space-demo/satellite/part.html"
      provides: "Vendor-picker <select> wired into place-order modal"
      contains: "id=\"vendorSel\""
  key_links:
    - from: "backend/src/routes/vendors.ts"
      to: "vendors table (turion_satellite schema)"
      via: "query() with search_path set by db.ts"
      pattern: "FROM vendors"
    - from: "backend/src/app.ts"
      to: "vendors router"
      via: "app.use('/api/vendors', vendors)"
      pattern: "app\\.use\\(['\"]\\/api\\/vendors"
    - from: "frontend/satellite/part.html (place-order modal)"
      to: "GET /api/vendors"
      via: "window.satelliteApi.get('/api/vendors') in openOrderModal"
      pattern: "/api/vendors"
    - from: "frontend/satellite/part.html (submit handler)"
      to: "POST /api/satellites/:satId/vendor-orders body.vendor_id"
      via: "vendor_id read from <select id='vendorSel'>"
      pattern: "vendor_id: .*vendorSel"
---

<objective>
Add a `GET /api/vendors` lookup endpoint to the turion-satellite backend and wire a vendor-picker `<select>` into the place-order modal in turion-space-demo's `satellite/part.html`. The dropdown defaults to the part's `preferred_vendor_id` (if any), allows the user to override, and the modal submits the chosen `vendor_id` to `POST /api/satellites/:satId/vendor-orders`.

Purpose: The current vendor-order modal silently uses `part.preferred_vendor_id` and refuses to place an order at all when it's null. This blocks placing real orders for any BUY part without a preferred vendor pre-set, and removes any ability to override per-order. A proper vendor picker fixes both.

Output:
- New file `/Users/jeet/turion-satellite/backend/src/routes/vendors.ts` (mirrors `lifecycle-stages.ts` shape)
- Edit to `/Users/jeet/turion-satellite/backend/src/app.ts` (mount the router)
- New file `/Users/jeet/turion-satellite/backend/tests/vendors.test.ts` (3 tests: auth, shape, hardened error)
- Edit to `/Users/jeet/turion-space-demo/satellite/part.html` (`<select id="vendorSel">` + fetch + submit wiring)
- Backend deployed via `bash /Users/jeet/turion-satellite/build-and-push.sh`
- Frontend deployed via `bash /Users/jeet/turion-space-demo/deploy-frontend.sh`
- Smoke-tested: curl endpoint with bearer + browser-curl modal HTML inspection
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@/Users/jeet/.claude/handoffs/2026-05-10-turion-satellite-frontend-v2.md
@/Users/jeet/turion-satellite/backend/src/routes/lifecycle-stages.ts
@/Users/jeet/turion-satellite/backend/src/routes/parts.ts
@/Users/jeet/turion-satellite/backend/src/routes/vendor-orders.ts
@/Users/jeet/turion-satellite/backend/src/db.ts
@/Users/jeet/turion-satellite/backend/src/app.ts
@/Users/jeet/turion-satellite/backend/tests/lifecycle-stages.test.ts
@/Users/jeet/turion-space-demo/satellite/part.html
@/Users/jeet/turion-space-demo/satellite/satellite-api.js
@/Users/jeet/doordash-p2p/.agents/skills/ticketed-task/SKILL.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Backend — add GET /api/vendors endpoint + tests + mount + deploy</name>
  <files>
    /Users/jeet/turion-satellite/backend/src/routes/vendors.ts
    /Users/jeet/turion-satellite/backend/src/app.ts
    /Users/jeet/turion-satellite/backend/tests/vendors.test.ts
  </files>
  <action>
    Working directory: `/Users/jeet/turion-satellite`. Repo head should already be on `main`. Use git author flags on every commit: `git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar"`.

    A) Create `backend/src/routes/vendors.ts` — mirror the shape of `backend/src/routes/lifecycle-stages.ts` exactly (Router + requireAuth + query + hardened catch):

    ```ts
    import { Router } from 'express';
    import { requireAuth } from '../middleware/auth';
    import { query } from '../db';

    const router = Router();

    router.get('/', requireAuth, async (_req, res) => {
      try {
        const rows = await query(`
          SELECT id, name, code, type, country, itar_compliant, created_at
          FROM vendors
          ORDER BY name ASC
        `);
        res.json(rows);
      } catch (err: any) {
        console.error('[vendors] list failed:', err);
        res.status(500).json({ error: 'Failed to list vendors' });
      }
    });

    export default router;
    ```

    Notes:
    - Schema is `turion_satellite` — `db.ts` sets search_path via libpq `options` + per-connect SET hook, so `FROM vendors` resolves correctly. Do NOT modify `db.ts`.
    - Include `itar_compliant` so the frontend can show the existing ITAR badge if it wants to. Cheap to ship now, no caller currently relies on it being absent.
    - Order by name for stable, human-friendly dropdown ordering.
    - Hardened error pattern: `console.error('[vendors] list failed:', err)` + `res.status(500).json({ error: 'Failed to list vendors' })`. Never include `err.message` / `detail`.

    B) Edit `backend/src/app.ts` to mount the router. Find the existing import block at the top of the file (where `subsystems`, `lifecycleStages`, etc. are imported) and add `import vendors from './routes/vendors';` next to them. Then in the `app.use(...)` block (currently lines 18-26 — see file), add `app.use('/api/vendors', vendors);` next to the other lookup routes (`/api/subsystems`, `/api/lifecycle-stages`). Keep the order alphabetical-ish among lookups for readability — placing it next to the other lookup-style mounts is fine.

    C) Create `backend/tests/vendors.test.ts` — mirror `backend/tests/lifecycle-stages.test.ts` exactly. Three tests:
       1. `returns ordered list of vendors` — mock `query` for SQL containing `FROM vendors` AND `ORDER BY name`. Return 3 rows including `id, name, code, type, country, itar_compliant, created_at`. Assert `res.status === 200`, length 3, that `res.body[0].name` matches the first mock vendor's name, and that one row has `code` and `country` populated.
       2. `requires auth` — no Authorization header → expect 401.
       3. `returns 500 without leaking error detail` — mock `query` to reject with `new Error('connection refused')`. Assert `res.status === 500`, `res.body.error === 'Failed to list vendors'`, `res.body.detail` is `undefined`.

       Use the same `tok()` helper, the same key generation block, and the same `vi.mock('../src/db', ...)` pattern as the lifecycle-stages test. Do NOT add new dependencies.

    D) Run the test suite locally to confirm green:
       ```bash
       cd /Users/jeet/turion-satellite/backend && npm test -- vendors.test.ts
       ```
       Then run the full suite to confirm zero regressions:
       ```bash
       cd /Users/jeet/turion-satellite/backend && npm test
       ```
       Expected: 86 prior tests + 3 new = 89 passing. If anything fails, fix before commit.

    E) Commit each file atomically (per CLAUDE.md "ALL tasks MUST create a Change Request ticket" → ticketed-task SKILL says quick tasks commit to main, atomic). From `/Users/jeet/turion-satellite`:
       ```bash
       git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" add backend/src/routes/vendors.ts
       git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" commit -m "feat(quick-329): add GET /api/vendors lookup router (id/name/code/type/country)"

       git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" add backend/src/app.ts
       git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" commit -m "feat(quick-329): mount vendors router at /api/vendors"

       git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" add backend/tests/vendors.test.ts
       git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" commit -m "test(quick-329): add vitest suite for /api/vendors (auth + shape + hardened error)"

       git push origin main
       ```

    F) Deploy backend to Lambda:
       ```bash
       cd /Users/jeet/turion-satellite && bash build-and-push.sh
       ```
       Wait for `=== Done ===`. Note the new Lambda code SHA from the output.

    G) Smoke-test the deployed endpoint:
       ```bash
       # 1. Auth gate (no bearer) should return 401
       curl -s -o /dev/null -w "%{http_code}\n" https://rjydekliee.execute-api.us-east-1.amazonaws.com/api/vendors
       # Expected: 401

       # 2. With a valid bearer (grab one from a logged-in browser tab on turionspace.zietra.com via DevTools → Application → Local Storage → `sb-lbpkbpfwdpnwlccmlfxn-auth-token` → `access_token`, OR use the same bearer that smoke-frontend.sh users use). Then:
       BEARER="<paste access_token here>"
       curl -s -H "Authorization: Bearer $BEARER" https://rjydekliee.execute-api.us-east-1.amazonaws.com/api/vendors | jq '. | length, .[0]'
       # Expected: a number > 0, and the first row has id/name/code/type/country fields.

       # 3. Confirm hardened error pattern is intact (no detail field) — there's no easy way to force a 500 on prod without breaking the DB, so just confirm the JSON shape is an array of objects (not { error: ..., detail: ... }).
       ```
       If endpoint returns anything other than 401 (no bearer) / 200 with array (with bearer), STOP and diagnose before continuing to Task 2.
  </action>
  <verify>
    - `cd /Users/jeet/turion-satellite/backend && npm test` shows 89/89 passing (or whatever total = prior + 3 new), zero failures.
    - `git log --oneline -3` from `/Users/jeet/turion-satellite` shows 3 atomic commits with `quick-329` scope and `jeet-avatar` author.
    - `git log -1 --format='%ae'` returns `jm@techcloudpro.com` (NOT `jeetnair.in@gmail.com`).
    - `curl -s -o /dev/null -w "%{http_code}" https://rjydekliee.execute-api.us-east-1.amazonaws.com/api/vendors` returns `401`.
    - `curl -H "Authorization: Bearer $BEARER" https://rjydekliee.execute-api.us-east-1.amazonaws.com/api/vendors | jq 'type'` returns `"array"`, and `jq '.[0] | keys' shows id, name, code, type, country (and optionally itar_compliant, created_at).
  </verify>
  <done>
    - `vendors.ts` router exists, registered, deployed, and live on Lambda.
    - 3 atomic commits pushed to `github.com/jeet-avatar/turion-satellite` main with correct git author.
    - All tests green; auth gate, shape, and hardened error path each verified.
    - Endpoint reachable from production CloudFront-fronted frontend.
  </done>
</task>

<task type="auto">
  <name>Task 2: Frontend — wire vendor <select> into place-order modal + deploy + smoke test</name>
  <files>
    /Users/jeet/turion-space-demo/satellite/part.html
  </files>
  <action>
    Working directory: `/Users/jeet/turion-space-demo`. Use git author flags on every commit: `git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar"`.

    Edit `satellite/part.html` to replace the existing "vendor-is-implicit" UX inside the place-order modal with an explicit dropdown driven by `GET /api/vendors`.

    A) Fetch vendors once, lazily, when the modal opens (NOT on page load — most users won't open the modal). Inside the existing `openOrderModal(makeBuy)` function (around line 557), at the very start, add an awaited fetch (only when `isVendorOrder` is true) BEFORE building the modal HTML:

    ```js
    let vendors = [];
    if (makeBuy === 'buy') {
      try {
        vendors = await window.satelliteApi.get('/api/vendors');
      } catch (e) {
        r.toast(`Failed to load vendors: ${e.message}`, 'error');
        return;
      }
    }
    ```

    Important: this requires changing `openOrderModal` to be `async`. Find the line `function openOrderModal(makeBuy) {` and change to `async function openOrderModal(makeBuy) {`. The single caller (`orderBtn.addEventListener('click', () => openOrderModal(mb))`) already wraps it in an arrow that doesn't await — that's fine, async errors will be caught inside the function via toast.

    B) In the existing modal HTML template literal (around lines 575-628), replace the vendor display block. Currently the modal shows:
    ```
    <p class="subtitle" ...>
      ${isVendorOrder
        ? `<strong>${...part.part_number}</strong> — vendor: <strong class="mono">${...preferred_vendor_name || '— no preferred vendor —'}</strong>`
        : ...}
    </p>
    ```
    and only has an instance picker. Inside the `${isVendorOrder ? \` ... \` : \` ... \`}` branch (the `isVendorOrder` true branch that contains qty + lead + PO number), ADD a vendor `<select>` BEFORE the qty/lead grid. Pre-select `part.preferred_vendor_id` if present, otherwise leave at the placeholder option:

    ```html
    <label class="section-label" style="margin-top:14px;" for="vendorSel">Vendor</label>
    <select id="vendorSel" required>
      <option value="">Select a vendor…</option>
      ${vendors.map(v => `
        <option value="${r.escapeHtml(v.id)}" ${v.id === part.preferred_vendor_id ? 'selected' : ''}>
          ${r.escapeHtml(v.name)}${v.code ? ` (${r.escapeHtml(v.code)})` : ''}${v.country ? ` · ${r.escapeHtml(v.country)}` : ''}${v.type ? ` · ${r.escapeHtml(v.type)}` : ''}
        </option>
      `).join('')}
    </select>
    ```

    Also: REMOVE the existing yellow warning block that says "⚠ No preferred vendor set on this part. Set one in part_definitions.preferred_vendor_id before ordering. (Vendor admin TBD.)" — it's obsolete now that the user can pick any vendor.

    Update the modal subtitle line to drop the now-misleading "vendor: <preferred_vendor_name>" text. Replace it with simpler text:
    ```html
    <p class="subtitle" style="margin-bottom:14px;">
      ${isVendorOrder
        ? `<strong>${r.escapeHtml(part.part_number)}</strong> — pick a vendor and enter quantity`
        : `<strong>${r.escapeHtml(part.part_number)}</strong> — internal build, request raw material`}
    </p>
    ```

    C) Update the submit handler (the `document.getElementById('submitOrder').addEventListener('click', async () => { ... })` block, around line 631) to read `vendor_id` from the new select instead of from `part.preferred_vendor_id`. Inside the `if (isVendorOrder) { ... }` branch:

    Replace:
    ```js
    if (!part.preferred_vendor_id) { errEl.textContent = 'No preferred vendor set on this part'; btn.disabled = false; btn.textContent = 'Place order'; return; }
    ```
    With:
    ```js
    const vendorId = document.getElementById('vendorSel').value;
    if (!vendorId) { errEl.textContent = 'Pick a vendor'; btn.disabled = false; btn.textContent = 'Place order'; return; }
    ```

    Then in the `await window.satelliteApi.post(...)` body, change `vendor_id: part.preferred_vendor_id,` to `vendor_id: vendorId,`.

    D) Sanity-pass: open the file in your editor and grep for any other reference to `preferred_vendor_id` inside `openOrderModal`. The only remaining reference should be in the `<option ... selected>` line that defaults the dropdown — that's correct.

    E) Commit + deploy. From `/Users/jeet/turion-space-demo`:
    ```bash
    git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" add satellite/part.html
    git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" commit -m "feat(quick-329): vendor <select> in place-order modal — defaults to preferred_vendor_id, allows override"
    git push origin main

    bash /Users/jeet/turion-space-demo/deploy-frontend.sh
    ```
    Wait for the s3 sync + CF invalidation to complete (~30s). Note the CF invalidation ID.

    F) Smoke-test the modal flow. Two probes:
       1. **HTML inspection** — `curl -s https://turionspace.zietra.com/satellite/part.html | grep -E 'vendorSel|Pick a vendor|Select a vendor'`. Expect at least one match for `vendorSel`. (The select is built dynamically inside a JS template literal, so `vendorSel` appears in the JS source.)
       2. **End-to-end via browser** (manual, but document the steps for the executor to walk through):
          - Open `https://turionspace.zietra.com/satellite/part.html?id=<a_buy_part_uuid>&sat=24587565-b15b-42ce-b590-87ecf9b6bb99` in a logged-in browser. To find a buy part: visit `https://turionspace.zietra.com/satellite/parts.html`, click any part with the `BUY` tag.
          - Click `📦 Order from vendor`.
          - Confirm: vendor `<select>` appears, lists multiple vendors, defaults to the part's preferred vendor (or "Select a vendor…" if none).
          - Pick a different vendor. Pick an instance. Enter qty=1. Click `Place order`.
          - Modal closes, toast says "Vendor order placed". Page reloads. The new row appears in "Recent orders" with the **chosen** vendor name (not the preferred one if you picked a different one).
       3. If you can't drive a real browser, instead curl the live HTML and confirm the JS source contains the new `vendorSel` and the new submit-handler `vendorId` reference:
          ```bash
          curl -s https://turionspace.zietra.com/satellite/part.html | grep -c "vendorSel"   # expect ≥ 3 (label, select id, getElementById)
          curl -s https://turionspace.zietra.com/satellite/part.html | grep -c "vendor_id: vendorId"  # expect 1
          curl -s https://turionspace.zietra.com/satellite/part.html | grep -c "preferred_vendor_id"  # expect ≤ 1 (only the default-select line)
          ```

    G) Optional but recommended: run the existing smoke script to confirm zero regressions on other pages:
    ```bash
    bash /Users/jeet/turion-space-demo/scripts/smoke-frontend.sh
    ```
    Expect `=== ALL PASS ===`. The script does not exercise `/api/vendors`, so a green run only proves we haven't broken anything else.
  </action>
  <verify>
    - `git log --oneline -1` from `/Users/jeet/turion-space-demo` shows the quick-329 commit with `jeet-avatar` author.
    - `git log -1 --format='%ae'` returns `jm@techcloudpro.com`.
    - `curl -s https://turionspace.zietra.com/satellite/part.html | grep -c "vendorSel"` is ≥ 3.
    - `curl -s https://turionspace.zietra.com/satellite/part.html | grep -c "vendor_id: vendorId"` returns `1`.
    - `curl -s https://turionspace.zietra.com/satellite/part.html | grep -c "No preferred vendor set on this part"` returns `0` (the obsolete warning is gone).
    - `bash /Users/jeet/turion-space-demo/scripts/smoke-frontend.sh` reports `=== ALL PASS ===`.
    - Manual end-to-end flow (or a documented browser-side spot-check): pick a non-preferred vendor on a BUY part → modal succeeds → recent_orders row shows the chosen vendor.
  </verify>
  <done>
    - Vendor `<select>` is live on `https://turionspace.zietra.com/satellite/part.html`, populated from `/api/vendors`, defaulting to `part.preferred_vendor_id`.
    - Submitting the modal sends the user-selected `vendor_id` to `POST /api/satellites/:satId/vendor-orders`.
    - The obsolete "No preferred vendor set" warning is gone.
    - 1 atomic commit pushed to `github.com/jeet-avatar/turion-space-demo` main with correct author.
    - Deployed via `deploy-frontend.sh`, smoke script green, end-to-end flow verified.
  </done>
</task>

</tasks>

<verification>
Run from this list, in order, after both tasks complete:

```bash
# Backend tests still green
cd /Users/jeet/turion-satellite/backend && npm test

# Backend endpoint live + auth-gated
curl -s -o /dev/null -w "%{http_code}\n" https://rjydekliee.execute-api.us-east-1.amazonaws.com/api/vendors
# expect: 401

# Frontend has new select wired
curl -s https://turionspace.zietra.com/satellite/part.html | grep -c "vendorSel"
# expect: >= 3

curl -s https://turionspace.zietra.com/satellite/part.html | grep -c "vendor_id: vendorId"
# expect: 1

# Frontend smoke is green (no regressions)
bash /Users/jeet/turion-space-demo/scripts/smoke-frontend.sh
# expect: === ALL PASS ===

# Git author proof — both repos
cd /Users/jeet/turion-satellite && git log -1 --format='%ae'
# expect: jm@techcloudpro.com
cd /Users/jeet/turion-space-demo && git log -1 --format='%ae'
# expect: jm@techcloudpro.com
```

Manual end-to-end (single browser pass on a logged-in tab):
1. Navigate to a BUY part on SAT-003.
2. Click "📦 Order from vendor".
3. Confirm the new `<select>` shows multiple vendors.
4. Pick a non-default vendor + an instance + qty=1, place the order.
5. Confirm "Recent orders" shows the row with the **chosen** vendor (not the original preferred vendor).
</verification>

<success_criteria>
- `GET /api/vendors` returns a JSON array of `{ id, name, code, type, country, itar_compliant, created_at }` objects when called with a valid bearer; returns 401 without one.
- The Lambda backend is deployed; the Vitest suite is green (89+ passing, 3 new).
- The place-order modal on `part.html` for a BUY part shows a vendor `<select>` populated from `/api/vendors`, pre-selected to `part.preferred_vendor_id` when non-null.
- Submitting the modal with a user-chosen vendor creates a `vendor_orders` row with that exact `vendor_id` (not silently overridden by `part.preferred_vendor_id`).
- 4 atomic commits across the two standalone repos (3 backend + 1 frontend), all authored by `jeet-avatar <jm@techcloudpro.com>`.
- `bash scripts/smoke-frontend.sh` returns `=== ALL PASS ===` post-deploy.
- Hardened error pattern preserved: error responses are `{ error: 'Failed to ...' }` with no `detail` field.
</success_criteria>

<output>
After both tasks complete, create `.planning/quick/329-add-get-api-vendors-endpoint-and-wire-ve/329-SUMMARY.md` containing:
- Endpoint URL (with sample 401 + 200 response shapes)
- Backend commit SHAs (3) and Lambda code SHA post-deploy
- Frontend commit SHA (1) and CF invalidation ID
- Test counts (before → after)
- Smoke-test outputs (curl counts + smoke-frontend.sh tail)
- One-line manual E2E verification result (vendor_orders row with chosen vendor_id)
- Any deviations or auto-fixes encountered (Rule 1/3 style)
</output>
