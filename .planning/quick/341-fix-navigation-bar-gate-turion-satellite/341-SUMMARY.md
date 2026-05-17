---
phase: 341-fix-navigation-bar-gate-turion-satellite
plan: 01
subsystem: app-shell-nav
tags: [navigation, multi-tenant, sidebar-ux, asc606, tenant-features, rls, cloudfront]
requires:
  - app-shell.js NAV_TAXONOMY at /Users/jeet/turion-space-demo/app-shell.js
  - public.tenant_features table with (tenant_id, module_code, enabled) columns
  - zietra-rls-runner-55-05 Lambda + cluster-master secret rds!cluster-16d5e38c-…-mhV473
  - CloudFront distribution E37R9PT8IL44L2 (turionspace.zietra.com + *.zietra.com)
  - playwright-based scripts/snapshot-turion-erp-views.mjs (51 in-scope pages)
provides:
  - Per-tenant sidebar isolation: non-Turion tenants no longer see "Turion Satellite PLM"
  - Collapsed Dashboards section: 12 entries → 1 link → /dashboards (Phase 62 landing)
  - Solo Brands tenant_features.asc606.enabled = true → live "Revenue & Royalty" links
  - verify-341-nav.sh: reusable 8-assertion regression script for future nav changes
affects:
  - All non-Turion tenants (Solo Brands, brandmonkz, dollor, test65empty) — cleaner sidebar
  - All tenants (incl. Turion) — collapsed Dashboards section (drill-down still works via landing page)
  - Solo Brands users — "Revenue & Royalty" group renders live ASC 606 external links
tech-stack:
  added: []
  patterns:
    - tenantOnly:'turion' attribute on NAV_TAXONOMY items (existing pattern at lines 86, was 111)
    - alwaysOn:true on a 1-item group (existing Phase 62 pattern; collapsed from 12 items)
    - zietra_admin via cluster-master secret for RLS-protected UPDATE (Quick 339 lesson)
key-files:
  created:
    - /Users/jeet/doordash-p2p/scripts/65-solobrands-import/sql/enable-solobrands-asc606.sql
    - /Users/jeet/doordash-p2p/scripts/65-solobrands-import/verify-341-nav.sh
    - /Users/jeet/doordash-p2p/.planning/quick/341-fix-navigation-bar-gate-turion-satellite/341-SOLOBRANDS-NAV-POST.json
    - /Users/jeet/doordash-p2p/.planning/quick/341-fix-navigation-bar-gate-turion-satellite/341-TURION-NAV-POST.json
  modified:
    - /Users/jeet/turion-space-demo/app-shell.js (NAV_TAXONOMY only, 2 hunks, +13/-17)
decisions:
  - Removed sidebar entry for DCMA dashboard (was the 12th item with tenantOnly:'turion'). Acceptable per plan note "DCMA ~line 111-or-removed" — drill-down via /dashboards landing page is intact.
  - Re-minted Cognito admin token (zietra/admin-bypass-password secret returns JSON {username,password}, not plain string) — wrote a fresh /tmp/cognito-tokens-65.3.env with 3600s TTL.
  - Used zietra_admin via cluster-master secret rds!cluster-16d5e38c-…-mhV473 for the public.tenant_features UPDATE (per Quick 339 lesson), NOT the existing run-sql.sh which uses zietra_app.
metrics:
  duration_seconds: 686
  tasks_completed: 3
  files_changed: 5
  commits: 3
  cf_invalidation_id: I3R2NWL62DB5RPL8F740O4EDPL
  cf_distribution_id: E37R9PT8IL44L2
  pages_snapshotted_per_tenant: 51
  assertions_passed: 8
  assertions_failed: 0
completed: 2026-05-17T09:43:00Z
---

# Quick 341 Summary: Sidebar Nav Gate (Turion-only PLM) + Dashboards Collapse + Solo Brands ASC 606

**One-liner:** Three NAV_TAXONOMY edits (+ one SQL row flip) close four sidebar defects exposed by the Solo Brands snapshot — Turion Satellite PLM leak, "+ Add to plan" CTA where ASC 606 should be live, 12-entry dashboard role-list bloat, and active-state CSS verification.

## What Changed

| # | Change | File | Lines |
|---|--------|------|-------|
| 1 | `tenantOnly: 'turion'` added to "Turion Satellite PLM" NAV item | `/Users/jeet/turion-space-demo/app-shell.js` | line 57 |
| 2 | Dashboards items[] collapsed: 12 → 1 (single "Dashboards" → /dashboards) | `/Users/jeet/turion-space-demo/app-shell.js` | lines 99-108 |
| 3 | New SQL helper: idempotent UPDATE of `public.tenant_features` for Solo Brands asc606 | `scripts/65-solobrands-import/sql/enable-solobrands-asc606.sql` | new file (7 lines) |
| 4 | Live UPDATE via runner Lambda (`zietra-rls-runner-55-05`) as `zietra_admin` | DB row | `tenant_features.enabled: false → true` |
| 5 | New 8-assertion regression script | `scripts/65-solobrands-import/verify-341-nav.sh` | new file (~75 lines, executable) |
| 6 | Solo Brands post-deploy snapshot (51 pages) | `341-SOLOBRANDS-NAV-POST.json` | new file |
| 7 | Turion post-deploy snapshot (51 pages) | `341-TURION-NAV-POST.json` | new file |

Active-state CSS (`body.z-shelled .z-nav-link.active`) confirmed already present at `app-shell.css:306-311` — no EDIT 3 needed.

## Verification Proof

### Task 1 — NAV_TAXONOMY edits
```
$ node --check /Users/jeet/turion-space-demo/app-shell.js
SYNTAX_OK
$ grep -n "tenantOnly: 'turion'" /Users/jeet/turion-space-demo/app-shell.js
57:      { label: 'Turion Satellite PLM',        href: '/satellite/',           code: 'plm', tenantOnly: 'turion' }
86:      { label: 'AI Agent • EVMS Watchdog',           href: '/agents/evms',        code: 'ai-agents', tenantOnly: 'turion' },
$ grep -c "href: '/dashboard-" /Users/jeet/turion-space-demo/app-shell.js
0
$ git diff --stat app-shell.js
 app-shell.js | 30 +++++++++++++-----------------
 1 file changed, 13 insertions(+), 17 deletions(-)
```
Exactly 2 hunks. No buildLeftRail() refactor. 13 dashboard-*.html files NOT deleted.

### Task 2 — Runner Lambda output (zietra-rls-runner-55-05, user=zietra_admin)
```
BEFORE: {"ok":true,"result":[{"command":"SET","rowCount":null},{"command":"SELECT","rowCount":1,"rows":[{"module_code":"asc606","enabled":false}]}]}
UPDATE: {"ok":true,"result":[{"command":"SET","rowCount":null},{"command":"UPDATE","rowCount":1,"rows":[]}]}
AFTER:  {"ok":true,"result":[{"command":"SET","rowCount":null},{"command":"SELECT","rowCount":1,"rows":[{"module_code":"asc606","enabled":true}]}]}
TURION (cross-tenant safety, unchanged):
        {"ok":true,"result":[{"command":"SET","rowCount":null},{"command":"SELECT","rowCount":1,"rows":[{"module_code":"asc606","enabled":true}]}]}
IDEMPOTENCY (2nd UPDATE matches 0 rows):
        {"ok":true,"result":[{"command":"SET","rowCount":null},{"command":"UPDATE","rowCount":0,"rows":[]}]}
```
- Solo Brands `45896e95-699f-494d-882b-bd780dfe46f3` asc606: `false → true` (UPDATE rowCount=1)
- Turion `00000000-0000-0000-0000-000000000001` asc606: `true → true` (untouched, cross-tenant safe)
- Idempotency: 2nd run UPDATE rowCount=0 (no-op since `AND enabled=false` predicate degenerates)
- Secret: `rds!cluster-16d5e38c-2fc2-4d06-8435-e4b01704bf74-mhV473` (cluster-master, Quick 339 lesson)

### Task 3 — Deploy + dual-snapshot 8/8 PASS
```
$ bash /Users/jeet/turion-space-demo/deploy-frontend.sh | tail -3
→ Invalidate CloudFront (E37R9PT8IL44L2) /*
  invalidation: I3R2NWL62DB5RPL8F740O4EDPL
✓ Frontend deployed: https://turionspace.zietra.com

$ aws cloudfront wait invalidation-completed --distribution-id E37R9PT8IL44L2 --id I3R2NWL62DB5RPL8F740O4EDPL
INVALIDATION_COMPLETED

$ bash /Users/jeet/doordash-p2p/scripts/65-solobrands-import/verify-341-nav.sh
PASS  [SB-1 no Turion Satellite PLM]
PASS  [SB-2 all pages contain ASC 606 Revenue Recognition]
PASS  [SB-3 no 11-entry dashboard block]
PASS  [SB-4 all pages contain collapsed Dashboards->Pitch]
PASS  [TR-5 all pages contain Turion Satellite PLM]
PASS  [TR-6 all pages contain EVMS Watchdog]
PASS  [TR-7 no 11-entry dashboard block]
PASS  [TR-8 /dashboards landing HTTP=200]
=== verify-341-nav.sh: 8 PASS / 0 FAIL ===
exit=0

$ jq '.pages | length' .planning/quick/341-fix-navigation-bar-gate-turion-satellite/341-SOLOBRANDS-NAV-POST.json
51
$ jq '.pages | length' .planning/quick/341-fix-navigation-bar-gate-turion-satellite/341-TURION-NAV-POST.json
51
```

Spot-check (one bodyText excerpt per tenant):
```
=== SB sample bodyText (netsuite-financials, around Dashboards) ===
DASHBOARDS
Dashboards
Pitch

=== TR sample bodyText (netsuite-financials, around Turion Satellite PLM) ===
Arena • Change Orders
Turion Satellite PLM
MANUFACTURING
```

## must_haves.truths Mapping

| Truth | Status | Verified by |
|-------|--------|-------------|
| Solo Brands sidebar has NO "Turion Satellite PLM" | PASS | SB-1 |
| Solo Brands sidebar has ASC 606 link (no "+ Add to plan") | PASS | SB-2 |
| Solo Brands Dashboards section has exactly 1 entry → /dashboards | PASS | SB-3 + SB-4 |
| Turion sidebar STILL has "Turion Satellite PLM" | PASS | TR-5 |
| Turion sidebar Dashboards collapsed to 1 (drill-down via /dashboards) | PASS | TR-7 + TR-8 |
| Turion sidebar STILL has "AI Agent · EVMS Watchdog" | PASS | TR-6 |
| Current page visually 'active' (CSS .z-nav-link.active rule present) | PASS | grep app-shell.css:306-311 |
| public.tenant_features (45896e95-…, asc606) enabled=true | PASS | Task 2 AFTER state |

## Commits

| Repo | Branch | SHA | Subject |
|------|--------|-----|---------|
| github.com/jeet-avatar/turion-space-demo | main | `a07437c` | `fix(341): gate Turion Satellite PLM tenantOnly:turion + collapse Dashboards 12→1 (sidebar UX)` |
| github.com/jeet-avatar/doordash-p2p | gsd/phase-65.2-data-aware-per-tenant-dynamic-onboarding-wizard | `f8870a17` | `fix(341): SQL helper to enable Solo Brands' asc606 module in tenant_features` |
| github.com/jeet-avatar/doordash-p2p | gsd/phase-65.2-data-aware-per-tenant-dynamic-onboarding-wizard | `e2ee2922` | `fix(341): verify-341-nav.sh + dual snapshot proof (Solo Brands + Turion, 8/8 PASS)` |

All commits authored as `jeet-avatar <jm@techcloudpro.com>` per MEMORY.md rule.

## Deviations from Plan

### Rule-3 Auto-fix — Cognito secret payload is JSON, not plain text
- **Found during:** Task 3 STEP C — `aws cognito-idp admin-initiate-auth` failed parsing `--auth-parameters` because `$ADMIN_PWD` contained `{"username": "...", "password": "..."}` (a JSON object) rather than a plain password string.
- **Fix:** Piped the secret through `python3 -c 'import json,sys; d=json.loads(sys.stdin.read()); print(d.get("password"))'` to extract just the password field, then re-issued the auth call. Token re-minted cleanly with 3600s TTL.
- **Out of scope:** Did not refactor any other script's secret-fetch logic — only this one invocation needed it.

### Rule-3 Auto-fix — Plan's `run-sql.sh` uses zietra_app; constraint requires zietra_admin
- **Found during:** Task 2 — the plan's `<action>` block said "Then execute it: scripts/65-solobrands-import/run-sql.sh …" but `run-sql.sh` hardcodes `user: zietra_app` with a service-role password. The constraint reminder explicitly requires `zietra_admin` via the cluster-master secret (Quick 339 lesson).
- **Fix:** Bypassed `run-sql.sh` and invoked `zietra-rls-runner-55-05` Lambda directly via `aws lambda invoke` with payload `{"sql":..., "password":..., "user":"zietra_admin"}` sourced from `rds!cluster-16d5e38c-…-mhV473`. SQL file itself is still committed under `scripts/65-solobrands-import/sql/` for audit-trail purposes.
- **Idempotency preserved:** the SQL `AND enabled=false` predicate makes re-running a no-op regardless of which executor runs it (verified — 2nd UPDATE = 0 rows).

### Pre-existing audit-erp-buttons miss (out of scope, logged for future)
- `node scripts/audit-erp-buttons.mjs` reports 1 violation: `netsuite-procurement.html` references `/api/netsuite/pos` which doesn't exist in the backend. Confirmed pre-existing by `git stash && audit && git stash pop` — present BEFORE Task 1's edits. Not caused by this task. Not fixed.

## Authentication Gates

None. Cognito re-mint succeeded automatically; AWS Secrets Manager access via the existing operator credentials worked for both `zietra/admin-bypass-password` and `rds!cluster-16d5e38c-…-mhV473`.

## Self-Check: PASSED

| Claim | Verified |
|-------|----------|
| `/Users/jeet/turion-space-demo/app-shell.js` modified, 2 hunks | FOUND (commit a07437c on turion-space-demo main) |
| `/Users/jeet/doordash-p2p/scripts/65-solobrands-import/sql/enable-solobrands-asc606.sql` created | FOUND (commit f8870a17) |
| `/Users/jeet/doordash-p2p/scripts/65-solobrands-import/verify-341-nav.sh` created | FOUND (commit e2ee2922) |
| `/Users/jeet/doordash-p2p/.planning/quick/341-fix-navigation-bar-gate-turion-satellite/341-SOLOBRANDS-NAV-POST.json` created | FOUND (51 pages, valid JSON) |
| `/Users/jeet/doordash-p2p/.planning/quick/341-fix-navigation-bar-gate-turion-satellite/341-TURION-NAV-POST.json` created | FOUND (51 pages, valid JSON) |
| Commit `a07437c` on turion-space-demo `main` | FOUND |
| Commit `f8870a17` on doordash-p2p `gsd/phase-65.2-…` | FOUND |
| Commit `e2ee2922` on doordash-p2p `gsd/phase-65.2-…` | FOUND |
| CloudFront invalidation `I3R2NWL62DB5RPL8F740O4EDPL` (E37R9PT8IL44L2) | Completed |
| Solo Brands tenant_features.asc606.enabled = true | DB-direct verified (Task 2 AFTER) |
| All 8 jq+curl assertions in verify-341-nav.sh | 8/8 PASS |
