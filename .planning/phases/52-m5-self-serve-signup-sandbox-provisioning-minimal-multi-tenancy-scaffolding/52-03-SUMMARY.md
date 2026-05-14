---
phase: 52-m5-self-serve-signup-sandbox-provisioning-minimal-multi-tenancy-scaffolding
plan: 03
subsystem: zietra-platform-frontend
tags: [zietra, signup, frontend, cloudfront, s3, vanilla-html, m5]
dependency_graph:
  requires:
    - 52-01 (tenants + tenant_features tables — needed for the form to round-trip)
    - 52-02 (POST /api/tenants/signup endpoint — turion-demo-api CodeSha256 70f2a2bf…)
    - Phase 38 frontend (turionspace.zietra.com S3 + CloudFront E37R9PT8IL44L2)
    - Phase 41 magic-link login flow (/erp-login.html — destination of success path)
  provides:
    - Public signup page at https://turionspace.zietra.com/signup (clean URL via CF Function)
    - signup.html — vanilla HTML/CSS/JS, no framework, mirrors erp-login.html style
    - CloudFront Function turion-clean-urls /signup → /signup.html rewrite (LIVE)
  affects:
    - 52-04 (E2E smoke + cleanup — needs the page to drive a real signup)
    - M6 (Phase 53/54 — apex zietra.com + per-tenant subdomain routing)
tech_stack:
  added: []
  patterns:
    - "Vanilla HTML/CSS/JS — no framework, no bundler, matches erp-login.html idiom"
    - "Client-side validation mirrors server-side regex (^[a-z0-9-]{3,32}$) + boundary checks"
    - "API base via window.TURION_CONFIG.API_BASE (NEVER bare relative — S3 returns 403)"
    - "Form submit listener attached via addEventListener (no inline onclick — audit-buttons clean)"
    - "CloudFront Function publish-then-deploy: update-function → publish-function → s3 sync → create-invalidation"
key_files:
  created:
    - /Users/jeet/turion-space-demo/signup.html
  modified:
    - /Users/jeet/turion-space-demo/cf-function-source/turion-clean-urls.js
decisions:
  - "CF Function published manually BEFORE running deploy-frontend.sh — the deploy script does not republish CF Functions, only S3 sync + invalidation. Documented in Deviations."
  - "Login link goes to /erp-login.html (Phase 41 helper), consistent with welcome-magic-link landing — Phase 53 will swap this for the per-tenant subdomain."
  - "No 'Sign in with Google' button (M3+), no password fields (magic-link only), no subscription/payment UI (M4) — scope held tight per CONTEXT Rule 6."
  - "Restored .DS_Store + .superpowers/ files after deploy (F6 pre-flight pattern from Phases 37/41)."
metrics:
  duration_sec: 193
  started_at: "2026-05-14T18:05:59Z"
  completed_at: "2026-05-14T18:09:12Z"
  tasks: 3
  files_created: 1
  files_modified: 1
  commits: 2
requirements-completed: [TenantSignupFlow]
---

# Phase 52 Plan 03: Frontend signup page + CloudFront /signup rewrite Summary

Customer-facing signup page deployed at `https://turionspace.zietra.com/signup` — vanilla HTML form with 4 inputs, client-side validation, POST to `/api/tenants/signup`, success-screen swap; CloudFront Function `turion-clean-urls` re-published to LIVE with the new `/signup → /signup.html` rewrite; full 11/11 smoke pass.

---

## Performance

- **Duration:** 3m 13s (193s)
- **Started:** 2026-05-14T18:05:59Z
- **Completed:** 2026-05-14T18:09:12Z
- **Tasks:** 3
- **Files created:** 1 (`signup.html`)
- **Files modified:** 1 (`cf-function-source/turion-clean-urls.js`)
- **Commits:** 2 (Task 3 is deploy-only, no code change)

---

## Task Commits

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | signup.html — vanilla form, client-side validation, POST → /api/tenants/signup | `1b37ea3` | signup.html (NEW) |
| 2 | CF turion-clean-urls — add /signup → /signup.html rewrite | `82f7544` | cf-function-source/turion-clean-urls.js |
| 3 | Deploy via deploy-frontend.sh + smoke | _(no code commit — deploy + verification only)_ | n/a |

Both commits pushed to `github.com/jeet-avatar/turion-space-demo` main → HEAD `82f7544`.

---

## Deploy

| Field | Value |
|---|---|
| **S3 bucket** | `turion-demo-static` |
| **CloudFront distribution** | `E37R9PT8IL44L2` |
| **CloudFront Function** | `turion-clean-urls` |
| **CF Function pre-publish ETag** | `E1X6FK5RDHNB96` (Phase 41 — `/cognito-auth-callback` only) |
| **CF Function post-publish ETag (LIVE)** | `EN1VRQENFRJN5` (Phase 52-03 — adds `/signup`) |
| **CF Function publish status** | `IN_PROGRESS` at update time → `DEPLOYED` confirmed via re-GET |
| **CF Function LIVE stage Comment** | `Phase 52-03 - add /signup` |
| **CloudFront invalidation ID** | `I7JVKJH4R1CNU18GB62HVFDSGK` |
| **Invalidation paths** | `/*` |
| **Invalidation status** | `Completed` (waited via `aws cloudfront wait invalidation-completed`) |
| **signup.html size** | 5055 bytes (109 lines — RESEARCH spec was ~70 lines + style block; matches `erp-login.html` ~78 lines) |

---

## Smoke transcript (11/11 PASS)

API base: `https://lo254mvukl.execute-api.us-east-1.amazonaws.com`
Site: `https://turionspace.zietra.com`

| # | Check | Expected | Actual |
|---|---|---|---|
| 1 | `curl -sI /signup` HTTP status | 200 | **HTTP/2 200** |
| 1b | `curl -sI /signup` content-type | text/html | **text/html** |
| 2 | `curl -sI /signup.html` HTTP status | 200 | **HTTP/2 200** |
| 3 | `curl -sS /signup | grep -c 'id="signupForm"'` | ≥1 | **1** |
| 4 | `curl -sS /signup | grep -c 'TURION_CONFIG.API_BASE'` | ≥1 | **1** |
| 5 | `curl -sS /signup | grep -c '<script src="/turion-config.js">'` | 1 | **1** |
| 6 | Phase 38 regression: `/erp-login.html` | 200 | **HTTP/2 200** |
| 7 | Phase 41 regression: `/cognito-auth-callback` | 200 | **HTTP/2 200** |
| 8 | CF LIVE function has /signup mapping (grep) | 1 | **1** |
| 9 | `npm run audit-buttons` violations | 0 | **0** (satellite: 0/16/84; ERP: 0/517/70) |
| 10 | API: `POST /api/tenants/signup` empty body | 400 | **400 `{"error":"Valid email required"}`** |
| 11 | API: `POST /api/tenants/signup` slug=`www` | 409 | **409 `{"error":"Slug is reserved"}`** |

---

## CF Function publish details

```
$ aws cloudfront update-function --name turion-clean-urls \
    --if-match E1X6FK5RDHNB96 \
    --function-config Comment="Phase 52-03 - add /signup",Runtime=cloudfront-js-1.0 \
    --function-code fileb:///Users/jeet/turion-space-demo/cf-function-source/turion-clean-urls.js \
    --query 'ETag' --output text
EN1VRQENFRJN5

$ aws cloudfront publish-function --name turion-clean-urls --if-match EN1VRQENFRJN5
{
  "FunctionSummary": {
    "Name": "turion-clean-urls",
    "Status": "IN_PROGRESS",
    "FunctionConfig": { "Comment": "Phase 52-03 - add /signup", ... },
    "FunctionMetadata": { "Stage": "LIVE", "LastModifiedTime": "2026-05-14T18:07:34.341Z" }
  }
}
```

Confirmation of LIVE state:
```
$ aws cloudfront get-function --name turion-clean-urls --stage LIVE /tmp/cf-live-final.js
{ "ETag": "EN1VRQENFRJN5", "ContentType": "application/octet-stream" }
$ grep -c "'/signup': '/signup.html'" /tmp/cf-live-final.js
1
```

---

## Deviations from Plan

### Rule 3 auto-fix: deploy-frontend.sh does NOT republish CF Functions

**Found during:** Task 3, sub-step 3a
**Issue:** Plan said `./deploy-frontend.sh` "auto-publishes the CF function". Inspection of the 39-line script (`grep -i "publish-function\|update-function"`) showed it only runs `generate-*-config.sh` + `aws s3 sync` + `aws cloudfront create-invalidation`. No CF Function operations. If I had relied on the script, `/signup` would hit the OLD CF Function (which falls through to default `.html`-suffix logic) — would have returned 200 only because of the directory-rewrite path, but the dedicated rewrite would not be on LIVE.

**Fix:** Manually ran `aws cloudfront update-function` (pre-ETag `E1X6FK5RDHNB96` → post-ETag `EN1VRQENFRJN5`) then `aws cloudfront publish-function --if-match EN1VRQENFRJN5` BEFORE `./deploy-frontend.sh`. Plan Task 3 sub-step 3c documented this as the "fallback" path — it was actually the required path. No code change needed; the `cf-function-source/turion-clean-urls.js` file is the source of truth (Task 2 already committed it).

**Files modified:** none (procedural fix only)
**Commit:** none

### Deferred (out of scope, logged):

- **`deploy-frontend.sh` scope bloat** — the script's `--exclude "backend/*"` is overridden by `--include "*.js"`, causing it to upload ~500 `backend/node_modules/@aws-sdk/**` files to S3 on every deploy. This is a pre-existing bug from Phase 37/41 and predates this plan. Logged here but not fixed (per scope-boundary rule — only fix issues caused by current task's changes). Recommend a future quick task to flip the include/exclude order in `deploy-frontend.sh`.

---

## Engineering rules compliance (per `feedback_global_engineering_rules.md`)

1. **No hardcoded DB-derivable values** — slug regex `^[a-z0-9-]{3,32}$` and boundary rules match the server-side validation (Plan 52-02 `routes/tenants.ts`). API base read from `window.TURION_CONFIG.API_BASE` (runtime-generated by `scripts/generate-turion-config.sh`), not hardcoded. PASS.
2. **Every link goes somewhere useful** — login link → `/erp-login.html` (Phase 41 LIVE), form submit → `/api/tenants/signup` (Plan 52-02 LIVE). No `href="#"`, no toast stubs. PASS.
3. **No shortcuts, no assumptions** — verified `erp-login.html` palette before writing CSS, ran `node --check` on the CF Function before publishing, verified LIVE ETag before invalidation. PASS.
4. **Workflows work the same** — same dark-Zietra palette as `erp-login.html`, same `system-ui` font, same `.error` + `.success-box` idioms, same `<script src="/turion-config.js"></script>` pattern. PASS.
5. **Remove dead code as you find it** — no dead code touched. The pre-existing `deploy-frontend.sh` `backend/*` upload bug is logged for a future cleanup (not in scope). PASS.
6. **No unnecessary code** — 109 lines, zero unused functions, zero feature flags, validation only at the form-submission boundary. PASS.

---

## Self-Check: PASSED

- File `/Users/jeet/turion-space-demo/signup.html` exists (5055 bytes, 109 lines)
- File `/Users/jeet/turion-space-demo/cf-function-source/turion-clean-urls.js` modified (one `+/signup` line added)
- Commit `1b37ea3` exists on `turion-space-demo` main (verified `git log --oneline | grep 1b37ea3` → 1 match)
- Commit `82f7544` exists on `turion-space-demo` main (verified → 1 match)
- Both commits pushed to `github.com/jeet-avatar/turion-space-demo` (`git push origin main` showed `52d6fd3..82f7544 main -> main`)
- CloudFront Function `turion-clean-urls` LIVE stage ETag = `EN1VRQENFRJN5` (was `E1X6FK5RDHNB96`)
- CloudFront invalidation `I7JVKJH4R1CNU18GB62HVFDSGK` is `Completed`
- All 11 smoke checks PASS

---

## Next Phase Readiness

- **Ready for 52-04 (E2E smoke + cleanup):** signup form is reachable at `https://turionspace.zietra.com/signup`, posts to the live `/api/tenants/signup` endpoint, and renders success/error inline. A 52-04 agent can fill the form with a verified SES test address (e.g., `jm@techcloudpro.com`), submit, verify all 5 side effects (Cognito user, tenants row, 13 tenant_features rows, welcome magic-link email arrives, IAM grant unchanged), then clean up.
- **Phase 53 (subdomain routing):** the page will move from `turionspace.zietra.com/signup` to the apex `zietra.com/signup` when the apex zone + ACM cert + CloudFront alternate-domain are stood up. No code change to signup.html required — only Route 53 + CloudFront config.
- **Phase 54 (App shell + dynamic nav):** signup success path currently shows an inline success-box. Phase 54 may swap that for a redirect to a "Welcome to your sandbox" landing page in the new tenant's subdomain — but the magic-link in the welcome email is the actual sign-in event, and that flow is already wired (Plan 52-02 step 5).

---

*Phase: 52-m5-self-serve-signup-sandbox-provisioning-minimal-multi-tenancy-scaffolding*
*Completed: 2026-05-14*
