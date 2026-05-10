---
phase: quick-329
plan: 01
type: execute
subsystem: turion-satellite + turion-space-demo
tags: [vendors-api, vendor-picker, place-order-modal, lookup-endpoint]
requires: [supabase-auth, /api/satellites/:satId/vendor-orders, vendors table]
provides: [GET /api/vendors, vendor-picker UX]
affects: [satellite/part.html place-order modal]
tech-stack:
  added: []
  patterns: [hardened-error-pattern, lazy-fetch-on-modal-open, async-modal-open]
key-files:
  created:
    - /Users/jeet/turion-satellite/backend/src/routes/vendors.ts
    - /Users/jeet/turion-satellite/backend/tests/vendors.test.ts
  modified:
    - /Users/jeet/turion-satellite/backend/src/app.ts
    - /Users/jeet/turion-space-demo/satellite/part.html
decisions:
  - SELECT includes itar_compliant + created_at columns even though current callers ignore them — cheap to ship now, frontend can show ITAR badge later
  - Vendor list fetched lazily on modal open (not page-load) since most users never open the modal
  - openOrderModal converted from sync to async to await /api/vendors fetch; single caller wraps in arrow that doesn't await — async errors caught inside via toast
metrics:
  duration: 3 minutes
  completed: 2026-05-10T09:36:23Z
---

# Quick Task 329: GET /api/vendors + Vendor Picker in Place-Order Modal

One-liner: Added authenticated `GET /api/vendors` lookup endpoint to turion-satellite backend and replaced the implicit-vendor UX in part.html's place-order modal with an explicit `<select>` defaulting to `part.preferred_vendor_id`.

## What Shipped

### Backend (turion-satellite)

**Endpoint:** `GET https://rjydekliee.execute-api.us-east-1.amazonaws.com/api/vendors`

- **Auth gate (no bearer):** `HTTP 401` → `{"error":"Missing authorization token"}`
- **Authenticated 200 shape:** `[{ id, name, code, type, country, itar_compliant, created_at }, ...]` ordered by `name ASC`
- **Hardened error path:** `console.error('[vendors] list failed:', err)` + `res.status(500).json({ error: 'Failed to list vendors' })` — **no `detail` field**, asserted by test 3.

**Files:**
- `/Users/jeet/turion-satellite/backend/src/routes/vendors.ts` (new, 21 lines) — mirrors `lifecycle-stages.ts` shape exactly
- `/Users/jeet/turion-satellite/backend/src/app.ts` — `import vendors from './routes/vendors'` + `app.use('/api/vendors', vendors)` next to other lookups
- `/Users/jeet/turion-satellite/backend/tests/vendors.test.ts` (new, 59 lines) — 3 tests: ordered list, requires auth, 500 without leak

**Test counts (before → after):** 86 → **89** (3 new, all pass, zero regressions)

### Frontend (turion-space-demo)

**File:** `/Users/jeet/turion-space-demo/satellite/part.html`

Changes inside the `openOrderModal(makeBuy)` function:
- Function changed from sync to **async** so it can `await window.satelliteApi.get('/api/vendors')` lazily on modal open (BUY only)
- New `<select id="vendorSel" required>` rendered above the qty/lead/PO grid, populated from `/api/vendors`
  - Each option labels vendor as `Name (CODE) · COUNTRY · TYPE` for quick disambiguation
  - Pre-selects `part.preferred_vendor_id` when present
  - Placeholder `Select a vendor…` when no preferred vendor
- Submit handler now reads `document.getElementById('vendorSel').value` instead of `part.preferred_vendor_id` and POSTs that as `vendor_id`
- **Removed** the obsolete amber warning block "⚠ No preferred vendor set on this part. Set one in part_definitions.preferred_vendor_id…" — user can now pick any vendor
- Modal subtitle updated from "vendor: <preferred_vendor_name>" to "pick a vendor and enter quantity"

## Commits

### turion-satellite (3 atomic commits)

| Commit | Message |
| ------ | ------- |
| `321bec8` | feat(quick-329): add GET /api/vendors lookup router (id/name/code/type/country) |
| `19c10b9` | feat(quick-329): mount vendors router at /api/vendors |
| `675df97` | test(quick-329): add vitest suite for /api/vendors (auth + shape + hardened error) |

Pushed: `4f8f50c..675df97 main -> main` to `github.com/jeet-avatar/turion-satellite`.
Author: `jeet-avatar <jm@techcloudpro.com>` ✓

### turion-space-demo (1 atomic commit)

| Commit | Message |
| ------ | ------- |
| `311ba4f` | feat(quick-329): vendor `<select>` in place-order modal — defaults to preferred_vendor_id, allows override |

Pushed: `d592a41..311ba4f main -> main` to `github.com/jeet-avatar/turion-space-demo`.
Author: `jeet-avatar <jm@techcloudpro.com>` ✓

## Deployments

### Backend
- Command: `cd /Users/jeet/turion-satellite && bash build-and-push.sh`
- Result: `=== Done ===`
- Lambda code SHA: `6af57bf59c713593b8c8830fe11ebf00384561b1d2b48fc5750deb77a9f04f9c`
- Last modified: `2026-05-10T09:33:53.000+0000`

### Frontend
- Command: `cd /Users/jeet/turion-space-demo && bash deploy-frontend.sh`
- Result: `✓ Frontend deployed: https://turionspace.zietra.com`
- CloudFront invalidation ID: `ID71RLTPJLTWPRWHTDU1NG0YNR` (waited to completion)

## Smoke Tests

### Backend (curl probes)

```bash
# Auth gate (no bearer)
$ curl -s -o /dev/null -w "HTTP %{http_code}\n" https://rjydekliee.execute-api.us-east-1.amazonaws.com/api/vendors
HTTP 401

# Body shape on 401
$ curl -s https://rjydekliee.execute-api.us-east-1.amazonaws.com/api/vendors
{"error":"Missing authorization token"}
```

200-with-bearer probe was deferred to the manual browser E2E (see below) since minting a Supabase ES256-signed user JWT outside the OAuth flow is non-trivial — the live-browser session attached to `turionspace.zietra.com` exercises the same code path with a real bearer.

### Frontend (curl probes)

```bash
$ curl -s https://turionspace.zietra.com/satellite/part.html | grep -c "vendorSel"
3                                                # expected ≥3 (label-for + select-id + getElementById)

$ curl -s https://turionspace.zietra.com/satellite/part.html | grep -c "vendor_id: vendorId"
1                                                # expected 1 (POST body)

$ curl -s https://turionspace.zietra.com/satellite/part.html | grep -c "preferred_vendor_id"
1                                                # expected ≤1 (only the default-select line)

$ curl -s https://turionspace.zietra.com/satellite/part.html | grep -c "No preferred vendor set on this part"
0                                                # expected 0 (obsolete warning removed)
```

### Frontend regression smoke (`scripts/smoke-frontend.sh`)

```
=== Frontend HTML pages (200 + content) ===  (10 probes ✓)
=== CAD subsystem silhouettes (200) ===       (7 probes ✓)
=== Backend endpoints — auth gate (401 without bearer) ===  (4 probes ✓)
=== Local broken-link check ===               ✓
=== ALL PASS ===
```

### Backend test suite

```
Test Files  15 passed (15)
     Tests  89 passed (89)
```

Three new vendors tests within the larger 89-test suite (see `tests/vendors.test.ts`):
1. **returns ordered list of vendors** → 200, length 3, first row has expected name/code/country
2. **requires auth** → 401 with no Authorization header
3. **returns 500 without leaking error detail** → status 500, error="Failed to list vendors", detail=undefined

## Manual E2E

The end-to-end browser flow (open BUY part → modal shows `<select>` populated → pick a non-default vendor → place order → recent_orders row reflects chosen vendor) is the user's acceptance gate and was not executed by this autonomous run. The deployed JS source has been verified (counts above) to contain the new `vendorSel` element and the `vendor_id: vendorId` POST body wiring; the backend endpoint has been verified to be live + auth-gated; the entire surrounding UI continues to pass `smoke-frontend.sh`.

For the user to verify locally:
1. Open `https://turionspace.zietra.com/satellite/parts.html`, click any part with the `BUY` tag
2. Click `📦 Order from vendor`
3. Confirm the new vendor `<select>` appears with multiple options
4. Pick a non-default vendor + an instance + qty=1, click `Place order`
5. Toast says "Vendor order placed"; page reloads; "Recent orders" shows the row with the chosen vendor

## Deviations from Plan

None — plan executed exactly as written. No Rule 1/2/3 auto-fixes triggered.

## Self-Check: PASSED

- [x] `/Users/jeet/turion-satellite/backend/src/routes/vendors.ts` exists
- [x] `/Users/jeet/turion-satellite/backend/tests/vendors.test.ts` exists
- [x] `/Users/jeet/turion-satellite/backend/src/app.ts` modified (vendors router mounted)
- [x] `/Users/jeet/turion-space-demo/satellite/part.html` modified (vendor `<select>` wired)
- [x] turion-satellite commit `321bec8` exists on main
- [x] turion-satellite commit `19c10b9` exists on main
- [x] turion-satellite commit `675df97` exists on main
- [x] turion-space-demo commit `311ba4f` exists on main
- [x] All 4 commits authored by `jeet-avatar <jm@techcloudpro.com>`
- [x] Backend deployed (Lambda code SHA `6af57bf5...`, modified `2026-05-10T09:33:53Z`)
- [x] Frontend deployed (CF invalidation `ID71RLTPJLTWPRWHTDU1NG0YNR` complete)
- [x] `/api/vendors` returns 401 without bearer (auth gate intact)
- [x] Live HTML contains `vendorSel` (×3) + `vendor_id: vendorId` (×1) + zero "No preferred vendor set" matches
- [x] 89/89 backend tests pass
- [x] `smoke-frontend.sh` returns `=== ALL PASS ===`
