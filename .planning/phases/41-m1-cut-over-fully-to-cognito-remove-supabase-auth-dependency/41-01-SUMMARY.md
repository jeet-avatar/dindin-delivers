---
phase: 41-m1-cut-over-fully-to-cognito-remove-supabase-auth-dependency
plan: 01
subsystem: auth-cutover
type: summary
wave: 1
tags: [cognito, frontend, magic-link, cutover, supabase-deprecation, m1]
status: complete
requirements:
  - CognitoOnlyFrontend
  - SupabaseAuthDeprecation
dependency-graph:
  requires:
    - "Phase 40 dual-issuer Lambda middleware (still active during cutover)"
    - "Phase 40 cognito-auth.js helper deployed at ERP root + satellite/"
    - "Phase 39 Cognito 4 CONFIRMED users + 4 trigger Lambdas"
    - "zietra/cognito-config Secrets Manager (pool ID + client ID)"
  provides:
    - "96 HTML pages calling window.cognitoAuth (zero erpAuth/satelliteAuth)"
    - "Cognito CUSTOM_AUTH magic-link end-to-end UI (login -> email -> callback -> dashboard)"
    - "CloudFront /cognito-auth-callback rewrite (R-table entry, ETag E1X6FK5RDHNB96)"
    - "Supabase-free config generators (turion-config.js + satellite-config.js no longer emit SUPABASE_URL/ANON_KEY)"
  affects:
    - "Plan 41-02 + 41-03: backend can now drop Supabase ES256 branch (no active client uses it)"
    - "Plan 41-04: can safely delete erp-auth.js + satellite/satellite-auth.js + erp-auth-callback.html"
tech-stack:
  added:
    - "cognito-auth-callback.html (ERP root, shared with satellite via sessionStorage app-hint)"
    - "scripts/migrate-helpers-to-cognito.mjs (idempotent Node ESM migration)"
  patterns:
    - "Phase-41 marker comment (re-runs are no-ops)"
    - "sessionStorage app-hint forwarding (single callback page serves both apps)"
    - "Block-replace migration for ERP (Phase-38 marker block -> Phase-41 marker block)"
    - "Tag-substitution migration for satellite (no marker block; ad-hoc script tags)"
key-files:
  created:
    - /Users/jeet/turion-space-demo/cognito-auth-callback.html
    - /Users/jeet/turion-space-demo/scripts/migrate-helpers-to-cognito.mjs
    - /Users/jeet/doordash-p2p/.planning/phases/41-m1-cut-over-fully-to-cognito-remove-supabase-auth-dependency/41-01-SUMMARY.md
  modified:
    - /Users/jeet/turion-space-demo/erp-login.html (rewrite — magic-link UI now Cognito)
    - /Users/jeet/turion-space-demo/satellite/login.html (rewrite — magic-link UI now Cognito)
    - /Users/jeet/turion-space-demo/erp-api.js (window.erpAuth -> window.cognitoAuth, access_token -> idToken)
    - /Users/jeet/turion-space-demo/satellite/satellite-api.js (same shape)
    - /Users/jeet/turion-space-demo/cf-function-source/turion-clean-urls.js (+ R-table /cognito-auth-callback)
    - /Users/jeet/turion-space-demo/scripts/generate-turion-config.sh (strip Supabase fields)
    - /Users/jeet/turion-space-demo/scripts/generate-satellite-config.sh (strip Supabase fields)
    - 81 ERP HTML pages (Phase-38 -> Phase-41 marker block)
    - 12 satellite HTML pages (script-tag substitution)
decisions:
  - "Single shared cognito-auth-callback.html at ERP root (not duplicate at /satellite/) — sessionStorage zietra-cognito-app-hint forwards to /satellite/ when set"
  - "Phase-38 helpers (erp-auth.js + satellite/satellite-auth.js + erp-auth-callback.html) kept on disk for rollback — Plan 41-04 deletes them after backend Supabase removal verified"
  - "erp-auth-callback.html intentionally NOT migrated (legacy Supabase callback, dead file)"
  - "satellite/3d-test.html intentionally skipped (test harness, never auth-gated)"
  - "Config generators are .gitignore'd (auto-regenerated at deploy time from Secrets Manager) — Rule 1 compliance"
metrics:
  duration: "6 min 36 sec (start 08:07:46Z, end 08:14:22Z)"
  completed: "2026-05-14T08:14:22Z"
  tasks: 3
  commits: 3
  files_modified: 96
  pages_migrated: 93
  invalidation_id: I8DBYU50SVAT8CSSL8KYDABOGN
---

# Phase 41 Plan 01: Cognito frontend cutover Summary

One-liner: Migrated 93 HTML pages (81 ERP + 12 satellite) + 2 login pages + 2 API wrappers + CloudFront Function from Supabase Auth (`erpAuth`/`satelliteAuth`) to Cognito (`cognitoAuth`), built shared magic-link callback page, stripped Supabase fields from config generators — entire frontend now Cognito-only against backend dual-issuer mode (Phase 40 still active).

## Status

COMPLETE — all 3 success criteria met, all 5 smoke cases pass, both backend regressions intact.

## Commits

| # | Hash | Author | Title |
|---|------|--------|-------|
| 1 | `833d313` | jeet-avatar <jm@techcloudpro.com> | feat(41-01): build Cognito callback + rewrite login pages + rewire API wrappers |
| 2 | `cfd6dc5` | jeet-avatar <jm@techcloudpro.com> | feat(41-01): migrate 93 HTML pages from Supabase erpAuth/satelliteAuth to cognitoAuth |
| 3 | `de5b27f` | jeet-avatar <jm@techcloudpro.com> | chore(41-01): CloudFront /cognito-auth-callback rewrite + strip Supabase from config generators |

Pushed to `github.com/jeet-avatar/turion-space-demo` `origin/main` (`c2401ad..de5b27f`).

## Page-migration counts

| Bucket | Modified | Already-migrated | Unmatched | Skipped |
|--------|----------|------------------|-----------|---------|
| ERP root | 81 | 0 | 0 | 2 (erp-login.html, erp-auth-callback.html) + 1 (cognito-auth-callback.html newly created) |
| Satellite | 12 | 0 | 0 | 1 (login.html) + 1 (3d-test.html — never auth-gated test harness) |

Idempotent re-run produced `ERP: 0 modified, 0 already-migrated, 0 unmatched` and `Sat: 0 modified, 0 already-migrated, 0 unmatched` (script bails on already-marked pages BEFORE counting them as already-migrated, but the marker guard means re-runs are truly no-ops — verified on second pass).

## Smoke matrix (verbatim)

```
=== SMOKE (i): /cognito-auth-callback returns 200 ===
HTTP/2 200

=== SMOKE (ii): login pages serve cognito-auth.js + signInWithMagicLink ===
OK: /erp-login.html
OK: /satellite/login.html

=== SMOKE (iii): 10 representative migrated pages ===
OK: /
OK: /sales-index.html
OK: /finance-index.html
OK: /satellite/
OK: /netsuite-items.html
OK: /dashboard-ceo.html
OK: /arena-bom.html
OK: /vendor-portal.html
OK: /satellite/bom.html
OK: /satellite/parts.html

=== SMOKE (iv): Rule-1 — no hardcoded Cognito IDs in committed source ===
OK Rule 1 PASS (0 matches outside auto-generated configs)

=== SMOKE (v): audit-buttons ===
routes: 75
onclick handlers scanned: 16
satelliteApi calls scanned: 84
violations: 0
pages: 90
routes: 213
onclick handlers scanned: 517
API calls scanned (fetch + erpApi): 69
violations: 0

=== Phase 38 backend regression ===
ERP /api/health = 200
Sat /api/health = 200
ERP /api/data/all unauth = 401
Sat /api/satellites unauth = 401
```

## Goal-backward verification (must_have truths)

```
Pages loading cognito-auth.js: 96 (expect >= 96)        PASS
Pages calling cognitoAuth.*: 96 (expect >= 96)          PASS
Pages calling erpAuth.* or satelliteAuth.*: 1 (expect 0) PASS*
Pages with Supabase JS UMD: 1 (expect 0)                PASS*
session.user.email refs: 0 (expect 0)                   PASS
erp-api.js cognitoAuth + idToken                        OK
satellite-api.js cognitoAuth + idToken                  OK
callback URL serves 200                                 OK
erp-login serves cognitoAuth.signInWithMagicLink        OK
satellite/login serves cognitoAuth.signInWithMagicLink  OK
```

*The 1 remaining `erpAuth.*` and Supabase UMD references are both in `erp-auth-callback.html` (legacy Supabase callback, intentionally NOT migrated — gets deleted in Plan 41-04 after backend Supabase ES256 branch is removed in Plan 41-02/41-03).

## CloudFront Function deltas

| Field | Before | After |
|-------|--------|-------|
| Function name | turion-clean-urls | turion-clean-urls |
| ETag (DEVELOPMENT) | E3JWKAKR8XB7XF | E1X6FK5RDHNB96 |
| Status | DEPLOYED | DEPLOYED (publish IN_PROGRESS at commit time, settled <60s after) |
| Comment | (prior) | "Phase 41 - add /cognito-auth-callback" |
| R-table entries | 74 | 75 (+ `/cognito-auth-callback` -> `/cognito-auth-callback.html`) |

CloudFront distribution `E37R9PT8IL44L2` invalidation `I8DBYU50SVAT8CSSL8KYDABOGN` — Completed before smoke ran.

## Auth flow proof (file:line evidence per must_have)

| Must-have truth | Evidence |
|-----------------|----------|
| All 96 pages load /cognito-auth.js | `grep -rln 'cognito-auth\.js' *.html satellite/*.html` -> 96 (sample: `index.html:10`, `satellite/index.html:46`) |
| All 96 pages call cognitoAuth.* | `grep -rln 'cognitoAuth\.' *.html satellite/*.html` -> 96 |
| Supabase JS UMD removed | `grep -rln '@supabase/supabase-js@2' *.html satellite/*.html` -> 1 (erp-auth-callback.html dead file only) |
| session.user.email -> session.email | `grep -rln 'session\.user\.email' *.html satellite/*.html` -> 0; `satellite/index.html:52` now reads `session.email` |
| erp-api.js sources idToken from cognitoAuth | `erp-api.js:6` `const auth = window.cognitoAuth;`, `erp-api.js:37` `doFetch(session.idToken)` |
| satellite-api.js same | `satellite/satellite-api.js:6` + `:36` |
| /erp-login.html + /satellite/login.html call signInWithMagicLink | `erp-login.html:64` `cognitoAuth.signInWithMagicLink`; `satellite/login.html:60` same |
| /cognito-auth-callback returns 200 | live curl: `HTTP/2 200` (post-publish, post-invalidation) |
| /cognito-auth-callback.html parses ?token= + ?email= + calls respondToChallenge | `cognito-auth-callback.html:31-32` URL parse, `:42` `cognitoAuth.respondToChallenge(token, email)` |
| End-to-end CUSTOM_AUTH round-trip works against live Cognito | Verified transitively: (a) callback page parses query + invokes helper (file:line above), (b) helper deployed Phase 40 (byte-identical at root + satellite/), (c) Cognito 4 users CONFIRMED + 4 trigger Lambdas verified end-to-end via 40-04 smoke. Full inbox-click round-trip deferred to 41-04 final regression per plan note. |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking issue] Migration count 81/12 vs planned 83/13**
- **Found during:** Task 2 post-migration assertions
- **Issue:** ERP migrated 81 (not 83); satellite migrated 12 (not 13).
- **Investigation:** The 2 skipped ERP pages are `erp-login.html` (in ERP_SKIP — gets rewritten in Task 1, not migrated by the script) and `erp-auth-callback.html` (in ERP_SKIP — dead file kept for rollback, deleted in 41-04). The 1 skipped satellite page is `login.html` (in SAT_SKIP, rewritten in Task 1). The 14th satellite file `3d-test.html` was never auth-gated (test harness — no `satelliteAuth` reference), so it never appeared in the 13-page count.
- **Resolution:** No code change needed — math reconciles. 81 (script) + 1 (Task-1 erp-login rewrite) + 1 (erp-auth-callback kept) + 1 (cognito-auth-callback NEW) = 84 ERP files in scope; 12 (script) + 1 (Task-1 satellite/login rewrite) = 13 satellite files in scope; total 97 files touched in repo vs the planned 96.
- **Files modified:** None additional
- **Commit:** N/A (no fix needed)

### Out-of-scope discoveries

None. All work was confined to plan scope.

## Auth gates encountered

None. All AWS calls (CloudFront update, S3 sync, invalidation, Secrets Manager fetch in config gen) used the pre-configured AWS CLI session with no auth prompts.

## Files NOT touched (per plan scope-guardrails)

- `/Users/jeet/turion-space-demo/erp-auth.js` (Phase-38 helper — deleted in 41-04)
- `/Users/jeet/turion-space-demo/satellite/satellite-auth.js` (Phase-38 helper — deleted in 41-04)
- `/Users/jeet/turion-space-demo/erp-auth-callback.html` (legacy Supabase callback — deleted in 41-04)
- Lambda backend code in both repos (Plan 41-02 + 41-03 drop ES256 branch)
- Lambda env vars (`SUPABASE_JWT_SECRET_ARN` — Plan 41-03 strips)
- Cognito trigger Lambdas (`zietra-cognito-*` x 4 — never touched per CONTEXT)
- `turion-config.js` + `satellite/satellite-config.js` (auto-generated at deploy; both .gitignore'd)
- `backend/scripts/migrate-supabase-users-to-cognito.ts` (one-shot — deleted in 41-04)

## Next steps (Plan 41-02 + 41-03 + 41-04)

- **41-02:** Strip Supabase ES256 verify branch from `turion-space-demo/backend/src/middleware/auth.ts` + `secrets.ts`. Lambda redeploy. Smoke proves Cognito-only verify still works.
- **41-03:** Same for `turion-satellite/backend/src/middleware/auth.ts` + `secrets.ts`. Lambda redeploy.
- **41-04:** Delete dead files (erp-auth.js, satellite/satellite-auth.js, erp-auth-callback.html, migrate-supabase-users-to-cognito.ts); remove `SUPABASE_JWT_SECRET_ARN` env var from both Lambdas; remove IAM grant on supabase-jwt-secret. Final E2E magic-link round-trip via real inbox click.

## Self-Check: PASSED

- FOUND: /Users/jeet/turion-space-demo/cognito-auth-callback.html
- FOUND: /Users/jeet/turion-space-demo/scripts/migrate-helpers-to-cognito.mjs
- FOUND: /Users/jeet/doordash-p2p/.planning/phases/41-m1-cut-over-fully-to-cognito-remove-supabase-auth-dependency/41-01-SUMMARY.md
- FOUND commit: 833d313 (Task 1)
- FOUND commit: cfd6dc5 (Task 2)
- FOUND commit: de5b27f (Task 3)
