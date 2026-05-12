---
phase: 35-editable-cad-drawings-part-management
plan: 03
subsystem: turion-satellite (backend routes)
tags: [cad, parts-lifecycle, retire, bom-line-delete, api]
requires: [35-01, 35-02]
provides:
  - "DELETE /api/parts/:id — soft-retire (retired_at=now()); 409 if live part_instances exist unless ?force=1; 404 if not found/already retired"
  - "DELETE /api/satellites/:satId/bom/:lineId — delete the bom_lines row only (orphaned part_instance survives); 409 if child has sub-lines unless ?recursive=1; recursive subtree delete of bom_lines; 200 {ok,deleted_lines}"
  - "retired_at filter sweep: hard-filter on GET /api/parts (list) + GET /:partDefId/children (picker); SURFACED (no filter) on GET /:id, /bom/tree nodes, GET /:satId/instances"
affects: [35-04, 35-05, 35-06]
tech-stack:
  added: []
  patterns: [hardened-catch, best-effort-audit-log, soft-delete, recursive-cte-subtree-delete, surface-not-hide]
key-files:
  created:
    - /Users/jeet/turion-satellite/backend/tests/bom.delete.test.ts
  modified:
    - /Users/jeet/turion-satellite/backend/src/routes/parts.ts
    - /Users/jeet/turion-satellite/backend/src/routes/bom.ts
    - /Users/jeet/turion-satellite/backend/src/routes/instances.ts
    - /Users/jeet/turion-satellite/backend/tests/parts.test.ts
decisions:
  - "Plan frontmatter named backend/src/routes/kanban.ts — no such file exists. The 'kanban' view groups part_instances by stage via GET /api/satellites/:satId/instances (instances.ts), so pd.retired_at was added there (list + single-instance) instead."
  - "audit_log actions use migration-022's CHECK list verbatim: 'retire_part_definition' (not 'retire_part') + 'delete_bom_line'. Audit inserts are best-effort (try/catch warn), so a CHECK mismatch could never fail the route — but the migration-valid names are used anyway."
  - "query() returns rows[] only (no rowCount) — so deleted_lines is 1 for the leaf case (the line is known to exist after the 404 lookup) and ids.length for the recursive case (counted from the WITH RECURSIVE subtree result)."
  - "Recursive bom_lines delete walks down via parent_part_instance_id = a previously-collected line's child_part_instance_id (a WITH RECURSIVE CTE), then DELETE ... WHERE id = ANY($1::uuid[]). Only bom_lines rows are deleted, never part_instances."
  - "Tasks 1 (parts.ts) and 2 (bom.ts + instances.ts) committed separately; Task 3 (tests) third — test-file ownership kept disjoint from 35-02 (parts.write.test.ts untouched; the retire cases went into parts.test.ts)."
metrics:
  duration: ~25min
  tasks: 3
  files: 5
  completed: 2026-05-12
---

# Phase 35 Plan 03: retire + BOM-line-delete routes + the retired_at filter sweep — Summary

The destructive-operations half of the Phase-35 backend: `DELETE /api/parts/:id` (soft-retire) and `DELETE /api/satellites/:satId/bom/:lineId` (delete a BOM line / subtree), plus the careful `retired_at` filter sweep — hard-filter ONLY the parts list + the candidate-parts picker; everywhere else (part detail, BOM tree, kanban/instances) the field is surfaced so the UI can badge a retired part WITHOUT amputating sub-assemblies or hiding in-flight work.

## What shipped

### Task 1 — `DELETE /api/parts/:id` + the parts.ts retired_at sweep (commit `ed7be61`)
`backend/src/routes/parts.ts`:
- New `router.delete('/:id', requireAuth, …)` (hardened catch): reads `?force=1` (also accepts `force=true`). If NOT force → `queryOne('SELECT 1 AS exists FROM part_instances WHERE part_definition_id=$1 LIMIT 1')` — if a row exists → `409 {error:'Part has live instances; pass ?force=1 to retire anyway'}`. Else (force OR no instances) → `UPDATE part_definitions SET retired_at = now() WHERE id=$1 AND retired_at IS NULL RETURNING id, retired_at` — `404 {error:'Part not found'}` if no row (covers not-found AND already-retired). On success → best-effort `audit_log` action `retire_part_definition` + `200 {ok:true, id, retired_at}`. (The matching un-retire `POST /:id/restore` already exists from 35-02.)
- `GET /api/parts` (list): added `WHERE pd.retired_at IS NULL` (then `AND (…subsystem…) AND (…search…)`). **Hides retired from the list.**
- `GET /:partDefId/children` (the add-BOM-line picker / children gallery): added `AND c_pd.retired_at IS NULL` to the child-rows filter. **Hides retired from the picker.**
- `GET /:id` (part detail): **unchanged behaviourally** — no `retired_at IS NULL` filter; `pd.*` already carries `retired_at` (and `drawing_rev`) to the client for badging. Added a comment.
- A block comment above `GET /` documents the policy: retired_at hard-filters ONLY the list + children/picker; everywhere else surfaces it; "do not 'fix' this".

### Task 2 — `DELETE /api/satellites/:satId/bom/:lineId` + surface retired_at on /bom/tree and instances (commit `79e44d8`)
`backend/src/routes/bom.ts`:
- New `router.delete('/:lineId', requireAuth, …)` (mounted at `/api/satellites/:satId/bom`, `mergeParams:true`, so the path is `/:lineId`; hardened catch): `queryOne('SELECT id, child_part_instance_id FROM bom_lines WHERE id=$1 AND satellite_id=$2')` — `404 {error:'BOM line not found'}` if no row (verifies the line belongs to this satellite). Then count sub-lines: `queryOne('SELECT COUNT(*)::int AS n FROM bom_lines WHERE parent_part_instance_id=$1 AND satellite_id=$2', [child_part_instance_id, satId])`. If `n>0` and NOT `?recursive=1` (also accepts `recursive=true`) → `409 {error:'This line has child lines; pass ?recursive=1 to delete the subtree', child_line_count:n}`. If `n>0` and recursive → `WITH RECURSIVE subtree` collects this line + all descendant `bom_lines` (walk down via `parent_part_instance_id = st.child_part_instance_id`), then `DELETE FROM bom_lines WHERE id = ANY($1::uuid[])` — `deleted_lines = ids.length`. If `n=0` → `DELETE FROM bom_lines WHERE id=$1` — `deleted_lines = 1`. On success → best-effort `audit_log` action `delete_bom_line` (`entity_type:'bom_line'`, payload `{satellite_id, recursive, deleted_lines}`) + `200 {ok:true, deleted_lines}`. **200 with a JSON body, never 204** — `satelliteApi.del()` calls `res.json()`. The orphaned `part_instance` survives; `/bom/tree`'s roots CTE re-roots it (no extra work).
- `GET /bom/tree`: added `pd.retired_at` to the roots-CTE select list, `c_pd.retired_at` to the recursive-child select list, `retired_at` to the final outer SELECT and to the `TreeNode` interface. **No `retired_at IS NULL` filter** on the roots CTE or the recursive join (filtering there amputates sub-assemblies under a force-retired part — RESEARCH.md Pitfall 3). Inline comments at both sites.

`backend/src/routes/instances.ts` (the "kanban" data — groups `part_instances` by stage; `kanban.ts` named in the plan frontmatter does not exist):
- `GET /` (list): added `pd.retired_at` to the SELECT. Comment: surface for badging; do NOT add a filter (would hide in-flight work). **No filter added.**
- `GET /:instId` (single instance): added `pd.retired_at` to the SELECT.

### Task 3 — tests (commit `c7716d7`)
- New `backend/tests/bom.delete.test.ts` — 6 vitest+supertest cases (`vi.mock('../src/db')`, ES256 JWT): `DELETE /api/satellites/:satId/bom/:lineId` — 401 no-auth · 404 (line lookup → null) · 409 sub-lines + no `?recursive=1` (asserts `error /recursive=1/` + `child_line_count:2`) · 200 leaf delete (`{ok:true, deleted_lines:1}`) · 200 `?recursive=1` (mocks the `WITH RECURSIVE subtree` result → 3 ids → `deleted_lines:3`) · 500 without leaking detail.
- Extended `backend/tests/parts.test.ts` (NOT `parts.write.test.ts` — that's 35-02's): a `DELETE /api/parts/:id` describe block — 401 · 409 w/ live instances + no force (`error /live instances/`) · 200 `?force=1` (skips the EXISTS check; UPDATE RETURNING → `{id, retired_at}`) · 200 no instances (EXISTS → null; UPDATE RETURNING → row) · 404 (UPDATE RETURNING → null) · 500 without leaking detail; plus a `GET /api/parts/:id` case asserting `retired_at` is returned when the mocked row includes it (the surface-not-hide regression assertion — the `GET /api/parts` list filter is in the SQL string and can't be unit-tested without a real DB).

`cd backend && npx vitest run tests/bom.delete.test.ts tests/parts.test.ts` → 37/37 pass. Full suite `npx vitest run` → **403 passed | 1 skipped** (was 390+1 after 35-02; +13 new — 6 bom.delete + 6 parts DELETE + 1 retired_at surfacing — zero regressions). `npx tsc --noEmit` clean. `node backend/scripts/audit-satellite-buttons.mjs` → `routes:74, onclick:16, satelliteApi:67, violations:0`.

## Deviations from Plan

**1. [Rule 3 — blocking] `backend/src/routes/kanban.ts` does not exist.** The plan frontmatter and Task 2 named it. The "kanban" view (cards grouped by lifecycle stage) is served by `GET /api/satellites/:satId/instances` in `instances.ts` (it joins `part_definitions` and a LATERAL "latest stage" sub-select). Added `pd.retired_at` there (both the list and the single-instance route) instead. No `kanban.ts` was created.

**2. [naming] audit actions** use migration-022's CHECK list verbatim — `retire_part_definition` (the critical-context note said `retire_part`) and `delete_bom_line`. The audit inserts are best-effort (`try/catch` → `console.warn`), so even a CHECK violation could never fail the route, but the migration-valid names are used to keep the rows clean.

**3. [pragmatic] `query()` has no `rowCount`** (it returns `rows[]` only). `deleted_lines` is therefore `1` for the leaf case (the line is known to exist — we 404'd if it didn't) and `ids.length` for the recursive case (counted from the `WITH RECURSIVE subtree` result before the bulk DELETE).

Otherwise the plan executed as written. No auth gates, no architectural changes, no fix-attempt retries.

## NOT done (owned by other plans)
- `git push` + `./build-and-push.sh` Lambda redeploy + CloudFront invalidation — owned by 35-07. The 3 commits (`ed7be61`, `79e44d8`, `c7716d7`) are local-only on `turion-satellite` main; no `aws`/`docker`/`build-and-push.sh` was run.
- Frontend: `satellite/svg-editor.js` + `satelliteApi.del()` + the audit-script regex tweak (35-04 — a parallel agent's WIP, untouched here); wiring the Retire/Restore + delete-BOM-line controls + the "🚫 retired" badge into part.html / instance.html / parts.html / bom.html (35-05 / 35-06). No frontend calls these DELETE routes yet — expected; the button audit still passes because the routes live in already-mounted routers.

## Self-Check: PASSED
- `backend/src/routes/parts.ts` — modified; `grep "router.delete('/:id'"` → FOUND; `grep "pd.retired_at IS NULL"` (list) + `grep "c_pd.retired_at IS NULL"` (children) → FOUND
- `backend/src/routes/bom.ts` — modified; `grep "router.delete('/:lineId'"` → FOUND; `grep "retired_at"` → FOUND on tree node selects (no `IS NULL` filter)
- `backend/src/routes/instances.ts` — modified; `grep "pd.retired_at"` → FOUND (no `IS NULL` filter)
- `backend/tests/bom.delete.test.ts` — FOUND; 6/6 pass
- `backend/tests/parts.test.ts` — modified; `DELETE /api/parts/:id` describe block + retired_at surfacing case present; full suite 403 pass / 1 skip
- `npx tsc --noEmit` clean; button audit `violations:0`
- commits `ed7be61`, `79e44d8`, `c7716d7` — FOUND on turion-satellite main (`jeet-avatar <jm@techcloudpro.com>`)
- `grep -rn "retired_at IS NULL" backend/src/routes/` → only `parts.ts` (list + children) — NOT in `bom.ts` or `instances.ts`. CONFIRMED.
