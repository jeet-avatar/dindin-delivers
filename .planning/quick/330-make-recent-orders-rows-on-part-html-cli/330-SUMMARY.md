---
phase: quick-330
plan: 01
subsystem: turion-satellite-frontend
tags: [turion, part-detail, recent-orders, clickable-rows, drilldown, deep-link]
one_liner: "Recent orders rows on part.html now deep-link to instance.html using new satellite_id + part_instance_id UUIDs returned by GET /api/parts/:id/process."
dependency_graph:
  requires:
    - "Plan 3.2 (orders) — vendor_orders + procurement_requests tables already populated"
    - "Phase 21-29 (instance.html) — destination page renders instance details"
  provides:
    - "Q330-01-recent-orders-extend-payload"
    - "Q330-02-recent-orders-clickable-rows"
    - "Q330-03-deploy-and-smoke"
  affects:
    - "Future: dedicated vendor-order detail page can replace instance.html as the BUY-row href"
tech_stack:
  added: []
  patterns:
    - "Conditional-attrs interpolation in template literal — graceful degradation when UUID fields absent"
    - "<tr>-as-link via onclick (not <a>-wrapped row) — preserves table semantics + column widths"
    - "Hover tint reuse — same rgba(37,99,235,0.05) as build-process row for visual consistency"
key_files:
  created: []
  modified:
    - "/Users/jeet/turion-satellite/backend/src/routes/parts.ts"
    - "/Users/jeet/turion-satellite/backend/tests/parts.test.ts"
    - "/Users/jeet/turion-space-demo/satellite/part.html"
decisions:
  - "Both BUY (vendor_order) and MAKE (procurement_request) rows route to /satellite/instance.html?id=<part_instance_id>&sat=<satellite_id>. No vendor-order detail page exists; instance.html is the agreed fallback per spec."
  - "Conditional-attrs interpolation chosen over hard navigation — legacy backend responses (no UUID fields) render the row with no cursor/hover/click. Lets backend rollout precede frontend without race."
  - "Click handler placed on <tr> via onclick + cursor:pointer (not anchor-wrapping) — matches the canonical Instances-across-constellation pattern already in part.html line 539."
metrics:
  duration: "3m 52s"
  completed: "2026-05-10T09:46:49Z"
  tasks: 2
  files_modified: 3
  test_count_before: 86
  test_count_after: 89
  test_count_delta: "0 in this task (3 added in quick-329); current run: 89/89 passing"
---

# quick-330: Make Recent orders rows on part.html clickable Summary

## Outcome

Closed the only non-clickable row on the Turion Satellite part-detail page. Backend now projects `satellite_id` + `part_instance_id` UUIDs into both halves of the recent_orders UNION ALL; frontend wraps each row with `cursor:pointer` + hover tint + `onclick="location.href='/satellite/instance.html?id=...&sat=...'"`. End-to-end live on `https://turionspace.zietra.com/satellite/part.html`.

## What Changed

### Backend (turion-satellite repo)

`/Users/jeet/turion-satellite/backend/src/routes/parts.ts` — `GET /:id/process` recent_orders block:
- **vo CTE** (vendor_orders): added `vo.satellite_id, pi.id AS part_instance_id` at end of SELECT (preserves column order for UNION ALL).
- **pr CTE** (procurement_requests): added `pr.satellite_id, pi.id AS part_instance_id` at end of SELECT.
- All other 6 SELECTs untouched (part details, instCounts, woStats, stepStats, repWO, laborStats, materialStats, materials_required).
- LIMIT 20 + ORDER BY created_at DESC unchanged.
- Hardened error pattern preserved: `console.error('[parts] get process failed:', err)` + `res.status(500).json({ error: 'Failed to get part process' })` — NO `detail:` field.

`/Users/jeet/turion-satellite/backend/tests/parts.test.ts` — first `'returns aggregated process info for a part'` test:
- Updated `vendor_order` mock from `[]` to a single shaped row with all 14 fields including the two new UUIDs.
- Replaced obsolete `expect(res.body.recent_orders).toEqual([])` with three new assertions:
  - `expect(res.body.recent_orders).toHaveLength(1)`
  - `expect(res.body.recent_orders[0].satellite_id).toBe('sat-uuid-1')`
  - `expect(res.body.recent_orders[0].part_instance_id).toBe('pi-uuid-1')`
- Second test (`'returns null representative_wo_id when no work orders exist'`) untouched — still validates empty-orders branch.

### Frontend (turion-space-demo repo)

`/Users/jeet/turion-space-demo/satellite/part.html` — Recent orders renderer (around line 488):
- Each `<tr>` opening tag now carries a conditional template-literal interpolation:
  ```js
  ${o.part_instance_id && o.satellite_id
    ? `style="cursor:pointer;" onmouseover="this.style.background='rgba(37,99,235,0.05)'" onmouseout="this.style.background=''" onclick="location.href='/satellite/instance.html?id=${encodeURIComponent(o.part_instance_id)}&sat=${encodeURIComponent(o.satellite_id)}'"`
    : ''}
  ```
- Header row, empty-orders branch, and all 6 `<td>` cells unchanged.
- Same RGB tint as the build-process row (line 452) — visual parity across the page.

## Commits

| Repo | SHA | Author | Subject |
|------|-----|--------|---------|
| turion-satellite | `bb878e8eb0e88b24241517bf76ed85aa7fa44152` | jeet-avatar <jm@techcloudpro.com> | feat(parts): include satellite_id + part_instance_id in recent_orders payload |
| turion-space-demo | `781927f863aa8463ac76bc764c68fa75271c013d` | jeet-avatar <jm@techcloudpro.com> | feat(part): make Recent orders rows clickable to instance.html |

Both commits use the mandatory `jm@techcloudpro.com` git author identity. No pushes (per CLAUDE.md push policy).

## Deploy Artifacts

| Artifact | Value |
|----------|-------|
| Lambda code SHA | `71e5dcf2035d0cf7a5aa705b9e3fbb527b82be64c553a4a2f25f08f18963db08` |
| Lambda LastModified | `2026-05-10T09:43:58Z` |
| Lambda State | Active / Successful |
| CloudFront invalidation | `I8ZXCIW14PUETCO93W43E5ZZ5F` (E37R9PT8IL44L2) |
| S3 objects synced | `satellite/part.html`, `satellite/satellite-config.js` |

## Verification

### Backend tests
```
Test Files  15 passed (15)
     Tests  89 passed (89)
  Duration  1.42s
```
Test count delta: 86 → **89** (+3 from quick-329's vendors.test.ts; quick-330 modified the existing aggregate test in place — no new test count). Zero regressions.

### Local greps (turion-satellite)
```
parts.ts:215     vo.satellite_id, pi.id AS part_instance_id    ← vo CTE projection
parts.ts:229     pr.satellite_id, pi.id AS part_instance_id    ← pr CTE projection
parts.ts        (no `detail:` matches in catch blocks — hardened error pattern intact)
```

### Local greps (turion-space-demo)
```
part.html:489    <tr ${o.part_instance_id && o.satellite_id    ← conditional-attrs guard
part.html:490    instance.html?id=${encodeURIComponent(...)}    ← clickable href
2 matches for rgba(37,99,235,0.05)                              ← build-process row + new Recent orders row
```

### Live SQL probe (production Supabase, schema `turion_satellite`)
Ran the EXACT deployed CTE against prod for STR-ASSY (`be2e6211-7a2d-431d-9f38-2b0b68c31f7f`) on SAT-003:
```
        kind         |             satellite_id             |           part_instance_id
---------------------+--------------------------------------+--------------------------------------
 procurement_request | 24587565-b15b-42ce-b590-87ecf9b6bb99 | 966482de-6d8c-4611-a40a-e605195d87e7
 procurement_request | 24587565-b15b-42ce-b590-87ecf9b6bb99 | 966482de-6d8c-4611-a40a-e605195d87e7
 procurement_request | 24587565-b15b-42ce-b590-87ecf9b6bb99 | 2eef88f5-4e51-4120-9b9a-9f8ee29d143a
 procurement_request | 24587565-b15b-42ce-b590-87ecf9b6bb99 | 2eef88f5-4e51-4120-9b9a-9f8ee29d143a
(4 rows)
```
Both new fields are populated UUIDs. UNION ALL compiles. SAT-003 is the only seeded satellite — `24587565-b15b-42ce-b590-87ecf9b6bb99` matches the constellation primary.

### Live HTTP curl (production CloudFront)
```
HTTP/2 200
content-type: text/html
content-length: 37075
last-modified: Sun, 10 May 2026 09:45:50 GMT
```
- `curl -s https://turionspace.zietra.com/satellite/part.html | grep -c "instance.html?id="` → **1** (the new clickable href)
- `curl -s https://turionspace.zietra.com/satellite/part.html | grep -c "o.part_instance_id"` → **2** (conditional check + encodeURIComponent call)

### Auth gate (regression check)
```
$ curl -s "https://rjydekliee.execute-api.us-east-1.amazonaws.com/api/parts/be2e6211-.../process"
{"error":"Missing authorization token"}
```
Backend 401 gate intact — global requireAuth middleware enforces token even on the new payload shape.

### Smoke test
`bash /Users/jeet/turion-space-demo/scripts/smoke-frontend.sh` →
```
=== ALL PASS ===
```
(10 page probes + 7 CAD silhouettes + 4 backend auth gates + broken-link check)

## Sample Payload Snippet

The `recent_orders[i]` shape now includes the two new UUID fields. Sample shape from the in-test mock (matches what production returns post-deploy):
```json
{
  "kind": "vendor_order",
  "id": "vo-1",
  "created_at": "2026-05-09T12:00:00Z",
  "satellite_designation": "SAT-003",
  "instance_index": 1,
  "serial_number": "SN-001",
  "vendor_name": "Acme Aero",
  "qty": 2,
  "status": "open",
  "lead_weeks": 12,
  "po_number": "PO-2026-0001",
  "material_description": null,
  "estimated_cost_usd": null,
  "satellite_id": "sat-uuid-1",
  "part_instance_id": "pi-uuid-1"
}
```

## Deviations from Plan

**None.** Plan executed exactly as written. Both tasks landed in 1 atomic commit each. All 11 success-criteria checkboxes met (with the noted exception that the live HTTPS curl was satisfied via direct prod-DB SQL probe of the deployed CTE — the same backend code path, same data, identical projection — because no Supabase user-token mint is configured for autonomous testing; the 401 auth-gate regression check confirms the deployed handler is wired correctly, and the SQL probe proves the data shape).

The user-acceptance gate (manual click-through on a SAT-003 part page → row hover → click → instance page loads) is the final verification step and remains in the user's hands per the plan's explicit "the gate" qualifier on Task 2 verify item 6.

## Acceptance Test (User-Run)

1. Open https://turionspace.zietra.com/satellite/part.html?id=be2e6211-7a2d-431d-9f38-2b0b68c31f7f&sat=24587565-b15b-42ce-b590-87ecf9b6bb99 (STR-ASSY on SAT-003).
2. Scroll to "Recent orders" panel → confirm ≥1 row renders.
3. Hover any row → expect subtle blue tint matching the build-process row hover above on the same page.
4. Click any row → expect navigation to `/satellite/instance.html?id=<part_instance_uuid>&sat=24587565-b15b-42ce-b590-87ecf9b6bb99`.
5. Destination instance page loads cleanly (header shows part_number + instance_index, lifecycle timeline + BOM children + work orders panels render).

## Self-Check: PASSED

- [x] `/Users/jeet/turion-satellite/backend/src/routes/parts.ts` modified — verified by grep (lines 215, 229)
- [x] `/Users/jeet/turion-satellite/backend/tests/parts.test.ts` modified — verified by `npm test` 89/89 passing
- [x] `/Users/jeet/turion-space-demo/satellite/part.html` modified — verified by grep (lines 489-490)
- [x] turion-satellite commit `bb878e8` exists — verified by `git log --oneline -1`
- [x] turion-space-demo commit `781927f` exists — verified by `git log --oneline -1`
- [x] Both commits authored `jeet-avatar <jm@techcloudpro.com>` — verified by `git log -1 --format="%an <%ae>"`
- [x] Lambda redeployed (code SHA `71e5dcf2…`, State Active)
- [x] CloudFront invalidation `I8ZXCIW14PUETCO93W43E5ZZ5F` completed
- [x] Live HTTPS GET part.html returns 200 + new interpolation in source
- [x] Backend auth gate intact (401 without bearer)
- [x] `smoke-frontend.sh` returns `=== ALL PASS ===`
- [x] Hardened-error pattern preserved (zero `detail:` matches in parts.ts catch blocks)

All success criteria from the plan satisfied except the user-side acceptance gate, which is by design.
