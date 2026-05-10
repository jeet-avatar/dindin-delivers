---
phase: quick-330
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/turion-satellite/backend/src/routes/parts.ts
  - /Users/jeet/turion-satellite/backend/tests/parts.test.ts
  - /Users/jeet/turion-space-demo/satellite/part.html
autonomous: true
requirements:
  - Q330-01-recent-orders-extend-payload
  - Q330-02-recent-orders-clickable-rows
  - Q330-03-deploy-and-smoke
must_haves:
  truths:
    - "GET /api/parts/:id/process recent_orders rows include satellite_id (UUID) and part_instance_id (UUID) for both vendor_order and procurement_request kinds"
    - "On part.html, every Recent orders row is wrapped in an anchor element"
    - "BUY (vendor_order) rows link to /satellite/instance.html?id=<part_instance_id>&sat=<satellite_id> (no dedicated vendor-order detail page exists, so instance is the agreed fallback)"
    - "MAKE (procurement_request) rows link to /satellite/instance.html?id=<part_instance_id>&sat=<satellite_id>"
    - "Hovering a Recent orders row shows a subtle tint matching the build-process clickable row pattern"
    - "Existing Recent orders visual styling (table layout, columns, status tags, kind tags, vendor/material text) is unchanged"
    - "Backend test asserts new UUID fields are present in the recent_orders shape"
    - "/smoke-frontend.sh stays green post-deploy"
    - "Backend keeps the hardened error pattern (no err.message leak) on the /process handler"
  artifacts:
    - path: "/Users/jeet/turion-satellite/backend/src/routes/parts.ts"
      provides: "Updated recent_orders SELECT — both vo and pr CTEs project pi.id AS part_instance_id, vo.satellite_id / pr.satellite_id"
      contains: "part_instance_id"
    - path: "/Users/jeet/turion-satellite/backend/tests/parts.test.ts"
      provides: "Mock for /process recent_orders array now includes satellite_id + part_instance_id; assertion that fields exist"
      contains: "part_instance_id"
    - path: "/Users/jeet/turion-space-demo/satellite/part.html"
      provides: "Recent orders <tr> rows replaced with anchor-wrapped clickable rows pointing at instance.html with both UUIDs"
      contains: "instance.html?id="
  key_links:
    - from: "/Users/jeet/turion-satellite/backend/src/routes/parts.ts (recent_orders CTEs)"
      to: "PostgreSQL turion_satellite schema (vendor_orders.satellite_id + procurement_requests.satellite_id + part_instances.id)"
      via: "Adds vo.satellite_id and pr.satellite_id projections + pi.id AS part_instance_id in both CTEs of the UNION ALL"
      pattern: "vo\\.satellite_id|pr\\.satellite_id|pi\\.id AS part_instance_id"
    - from: "/Users/jeet/turion-space-demo/satellite/part.html (Recent orders pane)"
      to: "/satellite/instance.html"
      via: "anchor href constructed from o.part_instance_id + o.satellite_id read off /api/parts/:id/process recent_orders payload"
      pattern: "instance\\.html\\?id=\\$\\{encodeURIComponent\\(o\\.part_instance_id\\)\\}&sat=\\$\\{encodeURIComponent\\(o\\.satellite_id\\)\\}"
---

<objective>
Make the "Recent orders" rows on `satellite/part.html` clickable so users can drill from an order back to the part_instance it was placed for. Backend extends the `recent_orders` shape on `GET /api/parts/:id/process` with two new UUID fields (`satellite_id`, `part_instance_id`); frontend wraps each row in an anchor pointing at `instance.html?id=<part_instance_id>&sat=<satellite_id>` and adds a subtle hover tint that mirrors the build-process clickable row pattern shipped earlier this session.

Purpose: Closes the only non-clickable row in the part-detail page. Order rows currently dead-end visually even though every row has a backing instance — surfacing the link unblocks the workflow drilldown the user is testing during the live demo.

Output: Two atomic commits (one per standalone repo), backend redeployed via `build-and-push.sh`, frontend redeployed via `deploy-frontend.sh`, `smoke-frontend.sh` green, manual click-through working on the live SAT-003 part pages.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/doordash-p2p/CLAUDE.md
@/Users/jeet/.claude/handoffs/2026-05-10-turion-satellite-frontend-v2.md
@/Users/jeet/turion-satellite/backend/src/routes/parts.ts
@/Users/jeet/turion-satellite/backend/tests/parts.test.ts
@/Users/jeet/turion-space-demo/satellite/part.html
@/Users/jeet/turion-space-demo/satellite/instance.html
</context>

<tasks>

<task type="auto">
  <name>Task 1: Backend — extend recent_orders payload + test (turion-satellite repo)</name>
  <files>
    /Users/jeet/turion-satellite/backend/src/routes/parts.ts
    /Users/jeet/turion-satellite/backend/tests/parts.test.ts
  </files>
  <action>
Edit `parts.ts` `GET /:id/process` handler (recent_orders block, currently around lines 207-238). The existing UNION ALL has two CTEs (`vo` from `vendor_orders` joining `part_instances pi` + `satellites s` + `vendors v`, and `pr` from `procurement_requests` joining `part_instances pi` + `satellites s`). Both already JOIN to the satellite + the part_instance — they just don't project the UUIDs. Extend each CTE's SELECT list with two new columns:
  - `vo.satellite_id` (already a column on vendor_orders per the existing JOIN `JOIN satellites s ON s.id = vo.satellite_id`) → add `vo.satellite_id` to the `vo` CTE projection
  - `pr.satellite_id` (already on procurement_requests per the existing JOIN `JOIN satellites s ON s.id = pr.satellite_id`) → add `pr.satellite_id` to the `pr` CTE projection
  - `pi.id AS part_instance_id` in BOTH CTEs (project `pi.id` since it's already joined as `JOIN part_instances pi ON pi.id = vo.part_instance_id` / `JOIN part_instances pi ON pi.id = pr.part_instance_id`)
Column order in BOTH CTEs must be IDENTICAL for the UNION ALL to compile — append the two new columns at the END of each SELECT after the existing trailing columns. Preserve every existing column name, alias, type cast, and ordering exactly. Do NOT touch any of the other 6 SELECTs in the handler (part details, instCounts, woStats, stepStats, repWO, laborStats, materialStats, materials_required). Do NOT touch the cost_breakdown or response shape outside `recent_orders`. Do NOT widen the LIMIT 20 or change the ORDER BY.

The catch block stays as-is (`console.error('[parts] get process failed:', err)` + `res.status(500).json({ error: 'Failed to get part process' })`) — DO NOT add `detail: err.message` (hardened error pattern; tests assert `body.detail).toBeUndefined()`).

Then in `tests/parts.test.ts`, in the existing `describe('GET /api/parts/:id/process')` block, find the first test (`'returns aggregated process info for a part'`). The mocked `query` for the recent_orders CTE currently returns `[]`. Change the mock to return ONE shaped row that exercises the new fields, e.g.:
```ts
if (sql.includes("'vendor_order'") || sql.includes('FROM vendor_orders')) return [{
  kind: 'vendor_order',
  id: 'vo-1',
  created_at: '2026-05-09T12:00:00Z',
  satellite_designation: 'SAT-003',
  instance_index: 1,
  serial_number: 'SN-001',
  vendor_name: 'Acme Aero',
  qty: 2,
  status: 'open',
  lead_weeks: 12,
  po_number: 'PO-2026-0001',
  material_description: null,
  estimated_cost_usd: null,
  satellite_id: 'sat-uuid-1',
  part_instance_id: 'pi-uuid-1',
}];
```
Add three new assertions to that test:
```ts
expect(res.body.recent_orders).toHaveLength(1);
expect(res.body.recent_orders[0].satellite_id).toBe('sat-uuid-1');
expect(res.body.recent_orders[0].part_instance_id).toBe('pi-uuid-1');
```
Remove the obsolete `expect(res.body.recent_orders).toEqual([]);` assertion that contradicts the new shape. Leave the second test (`'returns null representative_wo_id when no work orders exist'`) untouched — its mock still returns `[]` and that case must still produce an empty array.

Run `cd /Users/jeet/turion-satellite/backend && npm test` — must pass 86/86 (no count change; we modified one existing test and didn't add new ones — if your editor adds a new test instead, count goes to 87, both fine, but ZERO regressions).

Commit ONLY the two changed files (no `git add -A`):
```
cd /Users/jeet/turion-satellite
git add backend/src/routes/parts.ts backend/tests/parts.test.ts
git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" commit -m "feat(parts): include satellite_id + part_instance_id in recent_orders payload

Lets the part-detail Recent orders panel render clickable rows that
deep-link back to the underlying part_instance.

quick-330"
```
Then deploy: `bash /Users/jeet/turion-satellite/build-and-push.sh` (waits ~2 min, ends with `=== Done ===`). Capture the new Lambda code SHA from the build output for the SUMMARY.
  </action>
  <verify>
1. Local: `cd /Users/jeet/turion-satellite/backend && npm test 2>&1 | tail -20` shows green, count ≥ 86, zero failures.
2. Local grep: `grep -n "satellite_id\|part_instance_id" /Users/jeet/turion-satellite/backend/src/routes/parts.ts` shows both new projections present in both CTEs (4+ matches inside the recent_orders block).
3. Hardened-error guard: `grep -n "detail:" /Users/jeet/turion-satellite/backend/src/routes/parts.ts` returns no matches in catch blocks.
4. Live curl post-deploy (use the user's Supabase access token from the live frontend session — same approach as quick-329):
   ```
   curl -s -H "Authorization: Bearer $TOKEN" \
     "https://rjydekliee.execute-api.us-east-1.amazonaws.com/api/parts/be2e6211-7a2d-431d-9f38-2b0b68c31f7f/process" \
     | jq '.recent_orders[0] | {kind, satellite_id, part_instance_id}'
   ```
   Expected: object with non-null `satellite_id` and `part_instance_id` UUIDs (STR-ASSY on SAT-003 has seeded procurement_requests). If recent_orders is empty for this part_id, try `9e3dae95-6b95-4866-a15c-a88e69f381c8` (EPS-ASSY).
5. Auth gate intact: `curl -s "https://rjydekliee.execute-api.us-east-1.amazonaws.com/api/parts/.../process"` (no token) → `{"error":"Missing authorization token"}`.
  </verify>
  <done>
Both files committed in turion-satellite as a single commit authored `jeet-avatar <jm@techcloudpro.com>`. `npm test` green. Lambda redeployed (new code SHA captured). Live `/api/parts/:id/process` returns recent_orders rows with non-null `satellite_id` + `part_instance_id` UUIDs for at least one of the seeded SAT-003 parts. No `detail` field anywhere on 500 responses for this handler.
  </done>
</task>

<task type="auto">
  <name>Task 2: Frontend — anchor-wrap Recent orders rows + deploy + smoke (turion-space-demo repo)</name>
  <files>
    /Users/jeet/turion-space-demo/satellite/part.html
  </files>
  <action>
Edit `satellite/part.html` Recent orders panel render block (currently around lines 472-504). The existing renderer builds a `<table>` with a header row and one `<tr>` per `o` in `orders`. We need to make each data `<tr>` clickable to `/satellite/instance.html?id=<o.part_instance_id>&sat=<o.satellite_id>` while preserving the table layout, all 6 columns, and the existing kind/status/material/qty rendering.

DO NOT switch to anchor-per-row by replacing `<tr>` with `<a>` — that breaks table semantics and the current column widths. Instead, mirror the pattern already used in the "Instances across constellation" panel below it (lines 538-545), which puts the click handler on the `<tr>` via `onclick="location.href='...'"` plus `cursor:pointer;` and a hover tint. That pattern is in this file already and is the canonical "clickable row inside a data table" idiom for this codebase.

Concretely:
1. For each `o` in `orders.map`, add to the `<tr>` opening tag:
   - `style="cursor:pointer;"` (always)
   - `onmouseover="this.style.background='rgba(37,99,235,0.05)'"` and `onmouseout="this.style.background=''"` — this is the EXACT subtle blue tint the build-process clickable row uses (see line 452 of the same file). Reuse the same RGB values verbatim so the hover treatment reads identically across the page.
   - `onclick="location.href='/satellite/instance.html?id=${encodeURIComponent(o.part_instance_id)}&sat=${encodeURIComponent(o.satellite_id)}'"` — guarded so a missing field falls back to no-op:
     ```js
     ${o.part_instance_id && o.satellite_id
       ? `style="cursor:pointer;" onmouseover="this.style.background='rgba(37,99,235,0.05)'" onmouseout="this.style.background=''" onclick="location.href='/satellite/instance.html?id=${encodeURIComponent(o.part_instance_id)}&sat=${encodeURIComponent(o.satellite_id)}'"`
       : ''}
     ```
   The fallback (no UUIDs in payload) renders the row exactly as today — no cursor change, no hover, no click — so legacy backend responses degrade gracefully.
2. Wrap the new attribute fragment in a single template-literal interpolation right after `<tr` so the resulting markup is `<tr ${interactive_attrs}>` followed by the existing 6 `<td>` cells. Do NOT modify the 6 `<td>` cells. Do NOT touch the header row `<tr><th>...</th></tr>`. Do NOT touch the empty-orders branch (`if (orders.length === 0)`).
3. The BUY/MAKE distinction in the spec ("BUY part rows link to a vendor-order detail view (use existing pages where possible; if none, fall back to instance.html)") resolves to the SAME url for BOTH kinds since no vendor-order detail page exists — instance.html is the agreed fallback for both. The spec calls this out explicitly; do NOT branch on `o.kind` for the href.

Then deploy: `bash /Users/jeet/turion-space-demo/deploy-frontend.sh` (regen config + s3 sync + CF invalidate, ~30s, waits to completion).

Then smoke: `bash /Users/jeet/turion-space-demo/scripts/smoke-frontend.sh` — must end with `=== ALL PASS ===`. If it fails, diagnose and fix before committing — do NOT commit a frontend that breaks smoke.

Commit ONLY the changed file (no `git add -A`):
```
cd /Users/jeet/turion-space-demo
git add satellite/part.html
git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" commit -m "feat(part): make Recent orders rows clickable to instance.html

Each row deep-links to the part_instance the order was placed for
using the new satellite_id + part_instance_id fields from /api/parts/:id/process.
Hover tint mirrors the build-process clickable row pattern.

quick-330"
```
  </action>
  <verify>
1. Local grep: `grep -n "instance.html?id=\${encodeURIComponent(o.part_instance_id)}" /Users/jeet/turion-space-demo/satellite/part.html` shows exactly ONE match inside the Recent orders renderer.
2. Local grep: `grep -n "rgba(37,99,235,0.05)" /Users/jeet/turion-space-demo/satellite/part.html` shows the hover RGB used in BOTH the build-process row (pre-existing) AND the new Recent orders row (≥2 matches; was 2 before? if exactly 1 pre-existing, expect 2 after).
3. Live curl post-deploy: `curl -sI https://turionspace.zietra.com/satellite/part.html | head -5` → HTTP/2 200 + `content-type: text/html`.
4. Live grep: `curl -s https://turionspace.zietra.com/satellite/part.html | grep -c "instance.html?id="` returns ≥1 (the new clickable href is in the deployed bundle).
5. `bash /Users/jeet/turion-space-demo/scripts/smoke-frontend.sh 2>&1 | tail -5` ends with `=== ALL PASS ===`.
6. Manual user acceptance (the gate): user opens https://turionspace.zietra.com/satellite/part.html?id=be2e6211-7a2d-431d-9f38-2b0b68c31f7f&sat=24587565-b15b-42ce-b590-87ecf9b6bb99 → scrolls to Recent orders → confirms (a) row hovers show subtle blue tint, (b) clicking a row navigates to /satellite/instance.html with correct ?id= and &sat= params, (c) destination instance page loads without "Failed to load" toast.
  </verify>
  <done>
Single commit in turion-space-demo authored `jeet-avatar <jm@techcloudpro.com>`. CloudFront invalidation completed. `smoke-frontend.sh` returns `=== ALL PASS ===`. Live part.html source contains the new instance.html href interpolation. User has confirmed manual click-through works on at least one seeded SAT-003 part page (acceptance gate).
  </done>
</task>

</tasks>

<verification>
End-to-end happy path on the live demo:

1. Open https://turionspace.zietra.com/satellite/part.html?id=be2e6211-7a2d-431d-9f38-2b0b68c31f7f&sat=24587565-b15b-42ce-b590-87ecf9b6bb99 (STR-ASSY on SAT-003 — has seeded procurement_requests).
2. Recent orders panel renders ≥1 row.
3. Hover any row → subtle blue tint appears (matches build-process row hover above on the same page).
4. Click any row → browser navigates to `/satellite/instance.html?id=<uuid>&sat=24587565-b15b-42ce-b590-87ecf9b6bb99`.
5. Instance page loads without errors — header shows the part_number + instance_index, lifecycle timeline renders, BOM children + work orders panels load.
6. Backend recent_orders shape contains both new UUID fields; backend tests pass with assertion on those fields; `/smoke-frontend.sh` is green; auth gate (401) preserved on `/process`; no `detail:` leak on 500.

Edge cases covered:
- Legacy responses (no UUIDs in payload) → row renders without cursor/hover/click — graceful degradation. Tested via the conditional-attrs interpolation in part.html.
- Empty orders → existing empty-state branch unchanged.
- BUY rows and MAKE rows BOTH route to instance.html — explicitly per spec since no vendor-order detail page exists yet.
</verification>

<success_criteria>
- [ ] turion-satellite commit authored `jeet-avatar <jm@techcloudpro.com>` touches ONLY `backend/src/routes/parts.ts` + `backend/tests/parts.test.ts`
- [ ] turion-space-demo commit authored `jeet-avatar <jm@techcloudpro.com>` touches ONLY `satellite/part.html`
- [ ] `npm test` green in turion-satellite/backend (≥86 tests)
- [ ] Backend test asserts `recent_orders[0].satellite_id` and `recent_orders[0].part_instance_id` are present
- [ ] Lambda redeployed via `build-and-push.sh`; new code SHA captured
- [ ] Live `GET /api/parts/:id/process` (with valid bearer) returns at least one recent_orders row with non-null `satellite_id` + `part_instance_id`
- [ ] CloudFront frontend deploy completed via `deploy-frontend.sh`
- [ ] `scripts/smoke-frontend.sh` returns `=== ALL PASS ===`
- [ ] Live part.html source contains `instance.html?id=${encodeURIComponent(o.part_instance_id)}` interpolation
- [ ] Hover tint uses `rgba(37,99,235,0.05)` (same as build-process row)
- [ ] No `detail:` field added anywhere on 500 responses (hardened error pattern preserved)
- [ ] User confirms manual click-through works (acceptance gate)
</success_criteria>

<output>
After completion, create `.planning/quick/330-make-recent-orders-rows-on-part-html-cli/330-SUMMARY.md` capturing:
- Both commit SHAs (turion-satellite + turion-space-demo)
- New Lambda code SHA from `build-and-push.sh`
- CloudFront invalidation ID from `deploy-frontend.sh`
- `smoke-frontend.sh` final status line
- Backend test count delta (e.g. 86 → 86, mocks updated; or 86 → 87 if a new test was added)
- The two grep-line verifications (matches found + their line numbers)
- Sample curl JSON snippet showing recent_orders[0] with the two new UUID fields
- Any deviations + rationale (per Rule 3)
</output>
