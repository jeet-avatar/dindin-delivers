---
phase: 54-m6-modular-ui-shell-module-aware-navigation-redesign-add-on-catalog
plan: 02
subsystem: turion-space-demo · frontend · shell-migration
tags:
  - app-shell-migration
  - idempotent-codemod
  - strip-and-inject
  - mass-html-rewrite
  - cloudfront-deploy
dependency-graph:
  requires:
    - phase-54-01/app-shell.js
    - phase-54-01/app-shell.css
    - shells/app-chrome.js (legacy — stripped)
    - shells/enterprise-shell.css (legacy — stripped)
    - shells/status-indicator.js (legacy — stripped)
  provides:
    - scripts/inject-shell.mjs (idempotent codemod)
    - 81 ERP root HTML pages wrapped with new shell tags + ZIETRA-SHELL-INJECTED marker
  affects:
    - downstream/phase-54-03 (stub landing pages will inherit the shell automatically once they hit the root)
    - downstream/phase-54-04 (RESERVED slug expansion + CF Function routing)
    - downstream/phase-54-05 (Playwright E2E will probe wrapped pages)
tech-stack:
  added:
    - node-esm-codemod (no deps)
  patterns:
    - marker-comment-idempotency (ZIETRA-SHELL-INJECTED)
    - strip-then-inject (single in-memory pass)
    - skip-allowlist (auth pages + sub-apps)
    - non-recursive-walk (root-only, explicit WALK_DIRS)
key-files:
  created:
    - turion-space-demo/scripts/inject-shell.mjs (154 LOC, executable)
  modified:
    - 81 turion-space-demo/*.html (53 stripped+injected, 28 fresh injected)
decisions:
  - "Idempotency via MARKER comment guard at top of processFile() — second run = no-op"
  - "Strip OLD shell tags BEFORE inject (single pass) — prevents double-rail rendering (RESEARCH §Pitfall 1)"
  - "Non-recursive walk — only repo root; satellite/ + marquee/ never touched (Pitfall 4)"
  - "SKIP_FILES: signup.html, cognito-auth-callback.html, erp-login.html (Phase 41/52 contracts)"
  - "OLD_PATTERNS list = 4 (added /shells/landing.css alongside the 3 in critical_context)"
  - "Process exits non-zero ONLY if any file is missing </head> (no-head failure)"
  - "--dry flag emulates execution without writes (reads file, computes status, never writeFileSync)"
metrics:
  duration-seconds: 180
  completed-at: 2026-05-14T21:52Z
  tasks: 2
  files-created: 1
  files-modified: 81
  commits: 2
---

# Phase 54 Plan 02: Shell Wrapper Migration Summary

Idempotent Node ESM codemod (`scripts/inject-shell.mjs`, 154 LOC) strips the 4 legacy `/shells/*` tags from 53 previously-wired ERP pages and injects the new `/app-shell.css` + `/app-shell.js` + marker comment into 81 ERP HTML pages at repo root in a single deterministic pass. Re-run is a no-op. Deployed via `./deploy-frontend.sh` (S3 sync + CloudFront invalidation `I58T5OYMIUYRXP51U6ETVRV9UF`, Completed). 8/8 live-smoke + 10/10 visual-sanity PASS.

---

## Migration Counts

| Mode | total | stripped+injected | injected (fresh) | already | no-head |
| --- | --- | --- | --- | --- | --- |
| LIVE run 1 | 81 | 53 | 28 | 0 | 0 |
| LIVE run 2 (idempotency proof) | 81 | 0 | 0 | 81 | 0 |
| DRY post-deploy | 82 | 0 | 0 | 82 | 0 |

Why the DRY post-deploy shows 82: between the first LIVE run and the post-deploy dry-run, one additional HTML file (`catalog.html` — scaffolded for Plan 54-03) was discovered at the repo root and already contained the marker from Phase 54-01 staging. The walker correctly enumerated 82 and reported all 82 as `already`. Net = 82 wrapped pages on disk.

## No-head Files
None. Every walked HTML file had a `</head>` anchor; zero `no-head` warnings.

## Smoke Matrix (8/8 PASS)

| # | URL | Assertion | Result |
| --- | --- | --- | --- |
| A1 | https://turionspace.zietra.com/sales-index.html | marker present, new shell present, OLD shell absent | PASS |
| A2 | https://turionspace.zietra.com/ | marker present | PASS |
| A3 | https://turionspace.zietra.com/signup | marker ABSENT (Phase 52 contract) | PASS |
| A4 | https://turionspace.zietra.com/cognito-auth-callback | marker ABSENT (Phase 41 contract) | PASS |
| A5 | https://turionspace.zietra.com/erp-login.html | marker ABSENT | PASS |
| A6 | https://turionspace.zietra.com/satellite/ | marker ABSENT (Pitfall 4) | PASS |
| A7 | https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/tenants/current (X-Tenant-Slug: turion) | `"slug":"turion"` in payload | PASS |
| A8 | https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/data/all (no auth) | HTTP 401 | PASS |

## Visual Sanity (10/10 clean)

| Page | marker | new shell (/app-shell.js) | old shell (shells/app-chrome.js) | Status |
| --- | --- | --- | --- | --- |
| /sales-index.html | 1 | 1 | 0 | clean |
| /finance-index.html | 1 | 1 | 0 | clean |
| /dashboards.html | 1 | 1 | 0 | clean |
| /index.html | 1 | 1 | 0 | clean |
| /quickbooks.html | 1 | 1 | 0 | clean |
| /ramp.html | 1 | 1 | 0 | clean |
| /arena-qms.html | 1 | 1 | 0 | clean |
| /admin-index.html | 1 | 1 | 0 | clean |
| /vendor-index.html | 1 | 1 | 0 | clean |
| /dashboard-ceo.html | 1 | 1 | 0 | clean |

## Idempotency Proof

```
$ node scripts/inject-shell.mjs        # LIVE run 1
[inject-shell] mode=LIVE total=81
  injected: 28
  stripped+injected: 53

$ node scripts/inject-shell.mjs        # LIVE run 2 (immediate)
[inject-shell] mode=LIVE total=81
  already: 81
```

Zero modifications on second run.

## Audit-buttons Regression Check

```
npm run audit-buttons
satellite: routes=75, onclick=16, satelliteApi=84, violations=0
erp:       pages=91, routes=215, onclick=517, fetch+erpApi=70, violations=0
```

Zero violations across both audits.

## Commits

| Hash | Task | Description |
| --- | --- | --- |
| `3e33dab` | Task 1 | `feat(54-02): add idempotent inject-shell.mjs migration script` |
| `c8ebab3` | Task 2 | `feat(54-02): wrap 81 ERP pages with app-shell via migration script` |

Both pushed to `github.com/jeet-avatar/turion-space-demo` `main` (`04b20c1..c8ebab3`).

## Deploy Artifact

- CloudFront distribution: `E37R9PT8IL44L2`
- Invalidation ID: `I58T5OYMIUYRXP51U6ETVRV9UF`
- Status: **Completed** (aws cloudfront wait succeeded)
- S3 bucket: `turion-demo-static`

## Deviations from Plan

None. Plan executed exactly as written. The `OLD_PATTERNS` array was tightened to 4 entries (added `/shells/landing.css` regex, explicit in plan task 1 step 1).

## Self-Check Notes

- One unexpected `catalog.html` exists at repo root (Phase 54-03 scaffolding from prior session); already marked, so the migration script left it alone via the marker-idempotency guard. Net wrapped page count on disk: 82.
- Three pre-existing non-HTML modifications (`backend/dist/routes/tenants.js`, `cf-function-source/turion-clean-urls.js`, untracked `backend/dist/middleware/tenant.js`) are outside this plan's scope and were NOT staged. Will be picked up by Phase 54-03 or 54-04 as appropriate.

## Self-Check: PASSED
