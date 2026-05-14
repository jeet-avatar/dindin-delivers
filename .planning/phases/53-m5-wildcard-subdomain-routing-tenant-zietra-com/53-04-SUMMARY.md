---
phase: 53-m5-wildcard-subdomain-routing-tenant-zietra-com
plan: 04
subsystem: smoke + handoff
tags: [m5, smoke, e2e, autonomous, anchor-guarded, checkpoint, phase-close-out]
status: complete

# Dependency graph
requires:
  - phase: 53-01
    provides: "Wildcard ACM cert ISSUED + Route 53 wildcard A/AAAA aliases"
  - phase: 53-02
    provides: "CloudFront distro accepts *.zietra.com + CF Function host→x-tenant-slug"
  - phase: 53-03
    provides: "Both Lambdas have tenantContext middleware + public GET /api/tenants/current"
provides:
  - "Autonomous re-runnable end-to-end smoke `scripts/smoke-phase-53.sh` proving full Phase 53 path works"
  - "Phase 54 CHECKPOINT.md handoff doc with inheritance contract"
  - "Phase 53 close-out evidence — all 5 reqs Complete in REQUIREMENTS.md, all 4 plans `[x]` in ROADMAP.md"
affects:
  - "Phase 54 (M6 — modular UI shell + add-on catalog) — has full input contract via CHECKPOINT.md"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pattern 1: Phase 52-04 smoke template extended for Phase 53 wildcard scope (signup + ENT lookup + ENT lookup + reserved filter + non-shadow regression)"
    - "Pattern 2: Auto-fetch DB password from Secrets Manager (`turion-satellite/production/database-url`) if PGPASSWORD env unset — avoids manual setup for re-runs"
    - "Pattern 3: `set -euo pipefail` + `grep -q ... && ... || ...` chains can silently fail under bash; rewrote as explicit if/else blocks. (Auto-fix Rule 1 below.)"
    - "Pattern 4: `set -e` + 90s sleep for Lambda warm-container cache (60s TTL) + edge propagation (30s) — same belt-and-suspenders as Phase 52-04"

key-files:
  created:
    - /Users/jeet/turion-space-demo/scripts/smoke-phase-53.sh (314 lines, executable)
    - /Users/jeet/doordash-p2p/.planning/phases/53-m5-wildcard-subdomain-routing-tenant-zietra-com/CHECKPOINT.md (208 lines)
    - /Users/jeet/doordash-p2p/.planning/phases/53-m5-wildcard-subdomain-routing-tenant-zietra-com/53-04-SUMMARY.md (this file)
  modified:
    - /Users/jeet/doordash-p2p/.planning/ROADMAP.md (+1/-1 — Phase 53 entry now 4/4 [x], DONE label)
    - /Users/jeet/doordash-p2p/.planning/REQUIREMENTS.md (fleshed 53-02/53-03/53-04 evidence; bumped Last-updated)
    - /Users/jeet/doordash-p2p/.planning/STATE.md (Phase 53 COMPLETE prepend)

key-decisions:
  - "Auto-fetch DB password from AWS Secrets Manager — Phase 52-04 required `export PGPASSWORD=...` as a precondition; Phase 53-04 removes that friction so smoke is one-shot autonomous"
  - "Accept asc606 307 redirect as PASS (pre-existing behavior — asc606 Next.js default-redirects /  → /marquee, documented in 53-02-SUMMARY smoke matrix); don't try to force 200"
  - "Use temp file + `if grep -q ...; then` (NOT pipe + `&&/||` chain) — discovered during Run 1 that `set -euo pipefail` interacts unpredictably with `curl | grep -q && echo || { echo; exit 1; }` chains (Auto-fix Rule 1)"
  - "Smoke uses BOTH Lambda endpoints (ERP + satellite) for tenant lookup — proves Rule 4 mirror discipline works at runtime, not just at compile time"

requirements-completed: []   # 53-04 itself ships no new reqs — it CLOSES all 5 from 53-01/53-02/53-03

# Metrics
duration_minutes: 9
completed: 2026-05-14
---

# Phase 53 Plan 04: End-to-end smoke + Phase 54 CHECKPOINT.md Summary

**`scripts/smoke-phase-53.sh` autonomous, anchor-guarded, re-runnable — both runs PASS with different random slugs (`smoke53-5735` + `smoke53-10917`), 9 assertions + 3 regressions green each, zero orphans post-cleanup; Phase 54 CHECKPOINT.md (208 lines) written with full inheritance contract — Phase 53 (M5 wildcard subdomain routing) CLOSED.**

## Performance

- **Duration:** ~9 min (script write + 2 runs × 90s sleep + handoff doc)
- **Started:** 2026-05-14T20:25Z
- **Completed:** 2026-05-14T20:34Z
- **Tasks:** 2 (smoke + handoff)
- **Files created:** 3 (smoke, CHECKPOINT, this SUMMARY)
- **Files modified:** 3 (ROADMAP, REQUIREMENTS, STATE)

## Accomplishments

- **`scripts/smoke-phase-53.sh` (314 LOC, executable, idempotent, autonomous).** Anchor-guarded (NEVER deletes `jm@techcloudpro.com` Cognito user OR Turion tenant `00000000-…-001`). Uses fresh random slug per run (`smoke53-$RANDOM`) + fresh random epoch email. Auto-fetches DB password from Secrets Manager (`turion-satellite/production/database-url`) if `PGPASSWORD` unset. `trap cleanup EXIT` runs deletes on BOTH success AND failure paths. 90s sleep covers Lambda warm-container 60s positive cache + 5s negative cache + DNS recursors.
- **Run 1 PASS** — tenant `smoke53-5735` (UUID `3f0d2a49-2c02-4bab-8821-b8dc9cdfb3f3`), all 9 assertions + 3 regressions green; cleanup deleted Cognito user + tenants row (CASCADE removed 13 tenant_features rows).
- **Run 2 PASS** — tenant `smoke53-10917` (UUID `efb6cb38-dda7-40c4-9d7a-b663b029ce68`), all 9 assertions + 3 regressions green; idempotency proven (different random slug); cleanup deleted Cognito + tenants row.
- **Zero orphans post-run** — `SELECT count(*) FROM public.tenants WHERE slug LIKE 'smoke53-%'` returned `0`; `aws cognito-idp list-users --filter 'email ^= "phase53-smoke-"'` returned `[]`. Anchor resources untouched.
- **CHECKPOINT.md written (208 lines)** — Full Phase 54 inheritance contract: wildcard routing resource table (cert ARN, distro, CF Function, R53 zone, provisioning scripts), both-Lambda tenant resolution table, `GET /api/tenants/current` shape + sample Turion payload, frontend `X-Tenant-Slug` injection details, 17 reserved slugs, 6 caveats (no RLS, no CF cache key on Host, in-memory cache lag, apex on marketing distro, SES sandbox), Phase 54 resources table, suggested 4-plan outline for M6, must-not-break checklist, files-Phase-54-will-probably-touch table, 10 deferred items table, closure-evidence table for all 5 Phase 53 requirement IDs, full 2-run smoke matrix.
- **ROADMAP.md updated** — Phase 53 entry shows 4/4 plans complete with all `[x]`, label "PHASE 53 (M5 wildcard subdomain) DONE".
- **REQUIREMENTS.md updated** — All 5 Phase 53 IDs now have detailed Complete-with-evidence rows. Last-updated trailer rewritten to declare Phase 53 closed.

## Task Commits

1. **Task 1: Write + run smoke 2× + commit** — `31b9d5d` (`test(53-04): end-to-end smoke for Phase 53 wildcard subdomain routing`) on `github.com/jeet-avatar/turion-space-demo` `main`. Pushed.
2. **Task 2: CHECKPOINT + STATE/ROADMAP/REQUIREMENTS update + SUMMARY** — `docs(53-04): close Phase 53 — all 5 reqs Complete + Phase 54 CHECKPOINT.md handoff` (pending — created after this SUMMARY is written).

## Smoke Matrix (Run 1 + Run 2 — both PASS)

| Check | Run 1 (`smoke53-5735`) | Run 2 (`smoke53-10917`) |
|---|---|---|
| A1 signup → 200 + tenant.id | ✅ `3f0d2a49-…` | ✅ `efb6cb38-…` |
| A2 TLS handshake on `<slug>.zietra.com` | ✅ 200 ssl_verify=20 | ✅ 200 ssl_verify=20 |
| A3 `/` serves HTML | ✅ 200 + 28921 B body | ✅ 200 + 28921 B body |
| A4 ERP /api/tenants/current with slug | ✅ slug match + plan=trial + 13 features | ✅ slug match + plan=trial + 13 features |
| A5 Sat /api/tenants/current with slug | ✅ same UUID as ERP (mirror) | ✅ same UUID as ERP (mirror) |
| A6 bogus slug → 404 on both | ✅ ERP=404 Sat=404 | ✅ ERP=404 Sat=404 |
| A7 turionspace.zietra.com 200 + maps to `turion` | ✅ | ✅ |
| A8 marquee.zietra.com NOT shadowed | ✅ 200, 357755 B, marquee keywords | ✅ 200, 357755 B, marquee keywords |
| A9 asc606.zietra.com NOT shadowed | ✅ 307 (pre-existing redirect) | ✅ 307 (pre-existing redirect) |
| R1 Phase 52 signup `{}` → 400 | ✅ "Valid email required" | ✅ "Valid email required" |
| R2 Phase 41 unauth `/api/data/all` | ✅ 401 | ✅ 401 |
| R3 Phase 38 `/api/health` ERP+Sat | ✅ 200/200 | ✅ 200/200 |
| Cleanup Cognito | ✅ Deleted | ✅ Deleted |
| Cleanup tenants row | ✅ Deleted (CASCADE) | ✅ Deleted (CASCADE) |

## Smoke Logs

- **Run 1:** `/tmp/53-04-smoke-run1.log` — `Phase 53 smoke — ALL 9 ASSERTIONS + 3 REGRESSIONS PASS` (final line before cleanup)
- **Run 2:** `/tmp/53-04-smoke-run2.log` — same final line, different random slug

## Cleanup audit (post-Run-2)

- Orphan `smoke53-%` rows in `public.tenants`: **0**
- Orphan `phase53-smoke-%` users in Cognito pool `us-east-1_KQuNS85nP`: **0** (`list-users --filter 'email ^= "phase53-smoke-"'` returned `[]`)
- Total tenants in DB: 3 — `turion` (anchor), `brandmonkz`, `dollor` — all pre-existing, none from smoke

## Anchor-guard transcript

```
ANCHOR_EMAIL:     jm@techcloudpro.com (never deleted)
ANCHOR_TENANT:    turion (never deleted)
```

Both runs printed this header at start. Smoke `TEST_EMAIL` was `phase53-smoke-1778790629-5735@zietra.com` (run 1) and `phase53-smoke-1778790736-10917@zietra.com` (run 2) — never collided with `jm@techcloudpro.com`. Smoke `TEST_SLUG` was `smoke53-5735` and `smoke53-10917` — never collided with `turion`. Smoke aborts at line 90 if either collision happens.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `set -euo pipefail` + `curl | grep -q ... && ... || { ...; exit 1; }` chains fail silently**
- **Found during:** Run 1, assertion A8 (marquee body check)
- **Issue:** With `set -euo pipefail` active, `curl https://marquee.zietra.com/ | grep -qi "marquee\|anni\|larc" && echo PASS || { echo FAIL; exit 1; }` reliably entered the `||` branch even though grep was finding the keywords (verified manually outside the script). This is a known bash quirk where `set -e` + `||` in compound contexts produces unexpected exits.
- **Fix:** Rewrote A8 (and R1, A6, R2, R3 for consistency) using explicit `if grep -q ...; then echo PASS; else echo FAIL; exit 1; fi` blocks. A3 already used this pattern. Added inline comment explaining the trap.
- **Files modified:** `/Users/jeet/turion-space-demo/scripts/smoke-phase-53.sh` (5 if/else block rewrites)
- **Verification:** Run 1 retry PASS, Run 2 PASS — both with all 9+3 assertions green.
- **Committed in:** `31b9d5d` (folded into Task 1 commit since fix was on first delivery of the file)

---

**Total deviations:** 1 auto-fixed (1 bug). Zero scope creep, zero architectural changes, zero auth gates. The smoke is otherwise faithful to the plan's 9-assertion / 3-regression spec.

## Issues Encountered

None beyond the auto-fix above. The 90s sleep covered Lambda+CF+DNS without issue; no flakes across either run.

## User Setup Required

None. Smoke is fully autonomous — auto-fetches DB password from Secrets Manager, auto-generates fresh random slug, auto-creates Cognito user via signup endpoint, auto-cleans up on EXIT.

Optional: `PGPASSWORD=...` env var can override the Secrets Manager fetch (useful if running from a sandbox without secrets access).

## Hand-off to Phase 54

CHECKPOINT.md at `.planning/phases/53-m5-wildcard-subdomain-routing-tenant-zietra-com/CHECKPOINT.md` is the **full input contract** for Phase 54. Key facts:

- `<tenant>.zietra.com` wildcard routing LIVE — every signed-up tenant gets a working URL
- `GET /api/tenants/current` returns `{id, slug, name, plan, trial_ends_at, features[]}` on both ERP + satellite Lambdas
- Browser auto-stamps `X-Tenant-Slug` header on every `/api/*` fetch (both wrappers)
- 13 module codes available in `tenant_features` table for nav-rendering
- Phase 54's job: app shell + dynamic top-nav from `features[]` + `/catalog` page

Run `/gsd:plan-phase 54` to begin M6.

## Next Phase Readiness

- **Phase 54 (M6) READY** — all 5 Phase 53 requirements closed with evidence, CHECKPOINT.md documents inheritance + must-not-break + suggested 4-plan outline.
- **No blockers** — wildcard cert auto-renews via permanent Route 53 validation CNAME; Lambda CodeSha256s stable; CF Function has 2595 B headroom under 10 KB cap.
- **Deferred items carried forward** — 10 items listed in CHECKPOINT (cert NotAfter alarm, old single-host cert cleanup, in-memory cache invalidation, SES production-access reopen, Resend rotation, M2 RDS, M3 RLS, M4 Stripe, ACM auto-renew alarm, CF cache key on Host for tenant-specific HTML).

## Self-Check: PASSED

- [x] `/Users/jeet/turion-space-demo/scripts/smoke-phase-53.sh` exists, executable (verified `test -x` OK; 314 lines)
- [x] Contains `ANCHOR_EMAIL` + `ANCHOR_TENANT_SLUG` (grep count ≥ 3)
- [x] Contains `trap cleanup EXIT` (grep count = 1)
- [x] Commit `31b9d5d` present on turion-space-demo main (verified via `git log --oneline`)
- [x] Pushed to origin/main (verified — `4ca3368..31b9d5d main -> main`)
- [x] Run 1 log contains "Phase 53 smoke — ALL 9 ASSERTIONS + 3 REGRESSIONS PASS"
- [x] Run 2 log contains "Phase 53 smoke — ALL 9 ASSERTIONS + 3 REGRESSIONS PASS"
- [x] Runs used different slugs: `smoke53-5735` (run1) ≠ `smoke53-10917` (run2)
- [x] Cleanup ran on both runs (Cognito + DB DELETE)
- [x] Post-run DB orphan count: 0 `smoke53-%` rows
- [x] Post-run Cognito orphan count: 0 `phase53-smoke-%` users
- [x] CHECKPOINT.md exists, 208 lines (≥ 100 required)
- [x] CHECKPOINT.md cites all 5 Phase 53 requirement IDs in closure-evidence table
- [x] CHECKPOINT.md has all 7 required sections (status / inheritance / Phase 54 scope / must-not-break / files / deferred / closure-evidence)
- [x] ROADMAP.md Phase 53 entry: 4/4 `[x]`, "PHASE 53 (M5 wildcard subdomain) DONE" label
- [x] REQUIREMENTS.md: 5 Phase 53 rows all Complete with detailed evidence
- [x] M1 admin jm@techcloudpro.com Cognito user untouched (anchor guard verified across both runs)
- [x] Turion tenant `00000000-0000-0000-0000-000000000001` untouched (anchor guard verified across both runs)

---
*Phase: 53-m5-wildcard-subdomain-routing-tenant-zietra-com*
*Completed: 2026-05-14*
