---
phase: 53-m5-wildcard-subdomain-routing-tenant-zietra-com
plan: 02
subsystem: infra
tags: [cloudfront, cf-function, viewer-certificate, wildcard-alias, tenant-routing, aws]

# Dependency graph
requires:
  - phase: 53-01
    provides: "Wildcard ACM cert ARN (us-east-1 4a29032a-...) + Route 53 wildcard A/AAAA aliases pointing at E37R9PT8IL44L2"
provides:
  - "CloudFront E37R9PT8IL44L2 now serves wildcard cert 4a29032a-1e82-4393-824c-5b2a6fb70207 (SANs *.zietra.com + zietra.com)"
  - "CloudFront E37R9PT8IL44L2 Aliases = [turionspace.zietra.com, *.zietra.com] (Status: Deployed, ETag EN1VRQENFRJN5 -> E3DWYIK6Y9EEQB)"
  - "CloudFront Function turion-clean-urls v53-02 LIVE — host -> x-tenant-slug prologue + reserved-slug 404 + ALIAS turionspace -> turion; all Phase 52-03/41/37/36 rewrites preserved byte-for-byte"
  - "/* CloudFront cache invalidation Completed (I9KNISMQD1AZENF07LWSN3T26I)"
  - "Idempotent script /Users/jeet/turion-space-demo/scripts/update-cloudfront-distribution.sh"
  - "Idempotent script /Users/jeet/turion-space-demo/scripts/update-cf-function.sh"
affects: [53-03-backend-tenant-middleware, 53-04-smoke]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pattern 4: CloudFront distribution update via get-distribution-config + jq mutate + update-distribution --if-match ETag (preserves origins/cache/functions/logging untouched)"
    - "Pattern 5: jq precedence trap — '.A.Items | length == .A.Quantity' parses as '.A.Items | (length == .A.Quantity)'; parenthesize as '(.A.Items | length) == .A.Quantity'"
    - "Pattern 6: AWS CLI v1 get-function output syntax — positional outfile arg (not stdout); empty/missing file means not-present"
    - "Pattern 7: CF Function viewer-request prologue — reads request.headers.host.value, sets request.headers['x-tenant-slug'] = { value: ... }, returns inline {statusCode:404,body:...} for early-exit"

key-files:
  created:
    - /Users/jeet/turion-space-demo/scripts/update-cloudfront-distribution.sh
    - /Users/jeet/turion-space-demo/scripts/update-cf-function.sh
  modified:
    - /Users/jeet/turion-space-demo/cf-function-source/turion-clean-urls.js

key-decisions:
  - "Aliases on E37R9PT8IL44L2 = [turionspace.zietra.com, *.zietra.com] (NOT 3 as plan front-matter said). Apex zietra.com cannot be on this distro — CloudFront enforces CNAME uniqueness and zietra.com is already on marketing distro E1X82T89JWL8CA. Plan's own CRITICAL note + CONTEXT.md §Open Q 1 acknowledge apex is on a different distro by design. Wildcard *.zietra.com SAN covers all tenant subdomains anyway."
  - "RESERVED list mirrors backend/src/routes/tenants.ts (17 entries: www admin app api static mail turion zietra marquee asc606 meet docs support turionspace campaigns-api login signup). 'turion' is in RESERVED but allowed through as a real tenant (the legacy alias maps turionspace -> turion BEFORE the reserved check)."
  - "No apex-redirect dead-code branch added. Apex zietra.com Route 53 record points to marketing distro E1X82T89JWL8CA, so any 'if host === zietra.com' branch in this distro's function would never execute. Per CLAUDE.md global rule 6 (no unnecessary code)."
  - "Reserved slug returns inline 404 HTML with CTA to https://zietra.com/signup, NOT a redirect — CF Function viewer-request can return responses directly without origin round-trip."
  - "CF Function runtime kept at cloudfront-js-1.0 (existing setting). cloudfront-js-2.0 would let us use let/const/arrow funcs but isn't required for this prologue and would change the function comment metadata fingerprint unnecessarily."

patterns-established:
  - "Phase 53-02 lifecycle: distribution update + function update are independent + idempotent. Re-running update-cloudfront-distribution.sh detects desired-state and exits early. Re-running update-cf-function.sh diffs LIVE source bytes against repo and skips when identical."
  - "CloudFront 'Aliases' write requires --if-match ETag from get-distribution-config; AWS returns CNAMEAlreadyExists if a CNAME is on a different distribution (uniqueness is global per account)."
  - "CloudFront Function update flow: update-function (writes DEVELOPMENT) -> describe-function (re-read DEVELOPMENT ETag) -> publish-function (DEVELOPMENT -> LIVE). Each ETag changes on each call."

requirements-completed: [CloudFrontWildcardAlias, TenantSubdomainExtractor]

# Metrics
duration: 9 min
completed: 2026-05-14
---

# Phase 53 Plan 02: CloudFront Distribution + CF Function Update Summary

**Wildcard cert attached to E37R9PT8IL44L2 with `*.zietra.com` alias (Aliases=[turionspace, *.zietra.com]) and CloudFront Function `turion-clean-urls` v53-02 LIVE — extracts tenant slug from Host header, maps `turionspace` -> `turion`, 404s 17 reserved slugs, preserves all Phase 52-03/41/37/36 URL rewrites byte-for-byte.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-05-14T20:09:58Z
- **Completed:** 2026-05-14T20:19:57Z
- **Tasks:** 2 (CF distribution update + CF Function rewrite)
- **Files modified:** 3 (1 modified, 2 created)
- **AWS API calls:** ~12 (cloudfront get-distribution-config, update-distribution, wait distribution-deployed, get-distribution x4, update-function, publish-function, describe-function x3, create-invalidation, wait invalidation-completed; plus list-distributions for CNAME-conflict debug)

## Accomplishments

- **Wildcard cert + alias attached, distribution Deployed.** E37R9PT8IL44L2 ViewerCertificate swapped from old single-host `45e1fb37-...` to the wildcard `4a29032a-1e82-4393-824c-5b2a6fb70207`; Aliases extended from `[turionspace.zietra.com]` to `[turionspace.zietra.com, *.zietra.com]`. CloudFront `wait distribution-deployed` completed in ~5 min (no manual sleep). All origins/cache behaviors/function associations/error responses/logging config UNCHANGED.
- **CloudFront Function rewritten + published LIVE in one shot.** 7645-byte source (well under 10240 cap), prologue surgically inserted between `var request = event.request;` and `var uri = request.uri;`. All 100+ lines of Phase 52-03/41/37/36 URL-rewrite logic untouched below it. LIVE source byte-identical to repo (`diff -q` exit 0).
- **`/*` invalidation `I9KNISMQD1AZENF07LWSN3T26I` Completed** — cached responses busted so the new prologue runs on every request.
- **Smoke matrix all green** — turionspace + wildcard probe + reserved-slug 404 + all four legacy rewrites (/signup, /cognito-auth-callback, /satellite, /records/:type/:id) + marquee/asc606 non-shadow.
- **2 idempotent shell scripts committed** — both detect desired-state and skip work on re-runs (proven by reading the script logic; manual re-test deferred to avoid churn).

## Task Commits

1. **Task 1: Update CloudFront distribution** — `809bda2` (feat) — scripts/update-cloudfront-distribution.sh + the live AWS state change (cert swap + Aliases expand + wait deployed)
2. **Task 2: Update CloudFront Function + invalidate** — `4ca3368` (feat) — scripts/update-cf-function.sh + cf-function-source/turion-clean-urls.js + the live AWS state change (update + publish + invalidate)

Both pushed to `github.com/jeet-avatar/turion-space-demo` main (`809bda2..4ca3368`).

**Plan metadata commit:** _next_ (this SUMMARY + STATE.md + ROADMAP.md + REQUIREMENTS.md in dollor.ai repo).

## Files Created/Modified

- **/Users/jeet/turion-space-demo/scripts/update-cloudfront-distribution.sh** (created, 78 lines, executable) — snapshots distribution config + ETag, idempotency-checks current ViewerCertificate.ACMCertificateArn vs desired and Aliases.Items (sorted) vs desired, mutates via `jq` (swaps cert, sets SSLSupportMethod=sni-only, MinimumProtocolVersion=TLSv1.2_2021, CertificateSource=acm, removes CloudFrontDefaultCertificate + IAMCertificateId), validates Aliases.Quantity == Items.length, pushes with `--if-match ETag`, waits for distribution-deployed, prints final state.
- **/Users/jeet/turion-space-demo/scripts/update-cf-function.sh** (created, 56 lines, executable) — size pre-flight (<9500 B), byte-diff LIVE vs new source for idempotency, reads DEVELOPMENT/LIVE ETag, `update-function` (writes DEVELOPMENT), re-reads new DEVELOPMENT ETag, `publish-function` (DEVELOPMENT -> LIVE).
- **/Users/jeet/turion-space-demo/cf-function-source/turion-clean-urls.js** (modified, 5812 -> 7645 B, +1833 B / +44 lines) — prologue block inserted between line 2 (`var request = event.request;`) and the moved-down `var uri = request.uri;`. Block contains: RESERVED object (17 slugs), ALIAS object (turionspace -> turion), Host-header extraction, suffix-stripping, RESERVED check with `slug !== 'turion'` carve-out, inline 404 response with CTA, `request.headers['x-tenant-slug'] = { value: slug }` stamp.

## AWS State After

### CloudFront distribution E37R9PT8IL44L2

| Field | Before | After |
|---|---|---|
| Status | Deployed | Deployed |
| ETag | EN1VRQENFRJN5 | E3DWYIK6Y9EEQB |
| ViewerCertificate.ACMCertificateArn | `arn:...:certificate/45e1fb37-ee24-4a8f-94b6-e4b3f4986655` (old single-host) | `arn:...:certificate/4a29032a-1e82-4393-824c-5b2a6fb70207` (new wildcard) |
| Aliases.Items | `[turionspace.zietra.com]` | `[turionspace.zietra.com, *.zietra.com]` |
| Aliases.Quantity | 1 | 2 |
| Origins, Cache, FunctionAssociations, ErrorResponses, Logging | (unchanged) | (unchanged) |

### CloudFront Function turion-clean-urls

| Field | Before | After |
|---|---|---|
| Stage | LIVE | LIVE |
| Source size | 5812 B | 7645 B |
| ETag | EN1VRQENFRJN5 | E3DWYIK6Y9EEQB |
| Runtime | cloudfront-js-1.0 | cloudfront-js-1.0 |
| LIVE LastModifiedTime | (prior Phase 52-03) | 2026-05-14T20:17:54.921Z |
| Comment | (prior) | "Phase 53-02 - host -> x-tenant-slug" |

### Cache invalidation

| Field | Value |
|---|---|
| ID | I9KNISMQD1AZENF07LWSN3T26I |
| Paths | /* |
| Status | Completed |

### Route 53 — apex zietra.com (must be unchanged per CONTEXT.md §Open Q 1)

```json
{
  "Name": "zietra.com.",
  "Type": "A",
  "AliasTarget": {
    "HostedZoneId": "Z2FDTNDATAQYW2",
    "DNSName": "dlzyv23o98bvo.cloudfront.net.",   // marketing distro E1X82T89JWL8CA — NOT this Turion distro
    "EvaluateTargetHealth": false
  }
}
```
Confirmed unchanged from 53-01 post-state. NOT touched by this plan.

## Smoke Matrix (final, post-invalidation)

| Host / Path | Status | Notes |
|---|---|---|
| `https://turionspace.zietra.com` | 200 | Legacy alias, unchanged behavior; CF Function maps host->turion |
| `https://turionspace.zietra.com/signup` | 200 (signupForm marker count = 1) | Phase 52-03 rewrite intact |
| `https://turionspace.zietra.com/cognito-auth-callback?token=x&email=a%40b.com` | 200 | Phase 41 rewrite intact |
| `https://turionspace.zietra.com/satellite` | 200 | Phase 36/37 rewrite intact |
| `https://turionspace.zietra.com/records/customer/CUST-001` | 200 | Phase 37 NS UI rewrite intact |
| `https://probe-53-02-final.zietra.com` | 200 | Wildcard TLS handshake works; S3 serves index.html (no x-tenant-slug check at S3 layer) |
| `https://docs.zietra.com` | **404** (Body contains "Subdomain not available" + signup CTA) | CF Function reserved-slug early-return — exactly the intended behavior |
| `https://marquee.zietra.com` (GET) | 200 (67 marquee/anni/larc mentions in body) | NOT shadowed by wildcard — more-specific Route 53 record wins |
| `https://marquee.zietra.com` (HEAD) | 405 (allow: GET) | Pre-existing — marquee Lambda only accepts GET. Not caused by this plan. |
| `https://asc606.zietra.com` | 307 -> /marquee -> 200 | Pre-existing tenant default-redirect on its Next.js app; not caused by this plan. |

## Decisions Made

| Decision | Rationale |
|---|---|
| Apex zietra.com NOT in Aliases.Items | CNAMEAlreadyExists — apex is owned by marketing distro E1X82T89JWL8CA. Plan's own CRITICAL note + CONTEXT.md acknowledged this; the desired-aliases-of-3 in the plan front-matter was inconsistent with that note. Resolved by dropping apex (wildcard covers it anyway for cert-SAN purposes). |
| RESERVED has `turion` but slug `turion` allowed through | The legacy alias `turionspace` -> `turion` happens BEFORE the reserved check, so the mapped slug bypasses the early-return. Without this carve-out, `turionspace.zietra.com` would 404. |
| Inline 404 response (no origin trip) | CF Functions can return responses directly. Returning 404 from the function is faster, cheaper, and avoids hitting S3 for a path that doesn't exist. |
| Runtime kept at cloudfront-js-1.0 | Plan didn't require cloudfront-js-2.0 features (let/const/arrow funcs). Bumping the runtime would change the function fingerprint and would require additional smoke without benefit. |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] jq precedence: `.A.Items | length == .A.Quantity` errors**
- **Found during:** Task 1, first script run (sanity-check step)
- **Issue:** Script's Aliases-quantity sanity check used `jq -e '.Aliases.Items | length == .Aliases.Quantity'`. jq's `|` has LOWER precedence than `==`, so this parses as `.Aliases.Items | (length == .Aliases.Quantity)` — the rhs is evaluated against the Items array (input to length), producing "Cannot index array with string Aliases" and exit 5.
- **Fix:** Parenthesized to `(.Aliases.Items | length) == .Aliases.Quantity`. Added comment in script explaining the trap.
- **Files modified:** /Users/jeet/turion-space-demo/scripts/update-cloudfront-distribution.sh (1 line + 1 comment)
- **Verification:** Re-ran script — sanity check passed, update-distribution succeeded.
- **Committed in:** `809bda2` (folded into Task 1 commit since script + fix were both first deliveries).

**2. [Rule 3 - Blocking] CloudFront CNAMEAlreadyExists for `zietra.com`**
- **Found during:** Task 1, after jq fix
- **Issue:** Plan's DESIRED_ALIASES=`[turionspace, *.zietra.com, zietra.com]` (3 entries). update-distribution returned `CNAMEAlreadyExists: One or more of the CNAMEs you provided are already associated with a different resource`. Investigation via `list-distributions` showed `zietra.com` + `www.zietra.com` belong to distribution E1X82T89JWL8CA (marketing distro). CloudFront enforces CNAME uniqueness globally per account.
- **Fix:** Changed DESIRED_ALIASES to `[turionspace.zietra.com, *.zietra.com]` (2 entries). Added inline comment in script explaining the constraint and pointing to CONTEXT.md §Open Q 1 + plan's own CRITICAL note that documented the apex was on a different distro by design. Wildcard SAN on the cert already covers all real tenant subdomains; the apex Alias on this distro would have been dead weight anyway.
- **Files modified:** /Users/jeet/turion-space-demo/scripts/update-cloudfront-distribution.sh (4-line comment + 1-line DESIRED_ALIASES change)
- **Verification:** Re-ran — update-distribution succeeded, distribution-deployed completed in ~5 min, final state has the 2 expected aliases.
- **Committed in:** `809bda2`

**3. [Rule 3 - Blocking] AWS CLI v1 `get-function` syntax**
- **Found during:** Task 2, initial LIVE-source snapshot
- **Issue:** Plan's snapshot command used AWS CLI v2 syntax `aws cloudfront get-function --query FunctionCode --output text | base64 -d > file.js`. This box has aws-cli v1.42.43 (anaconda3) — v1 `get-function` doesn't print the code; it requires a positional outfile argument and downloads the binary directly.
- **Fix:** Switched to `aws cloudfront get-function --name turion-clean-urls --stage LIVE /tmp/file.js` (positional outfile). Documented in scripts/update-cf-function.sh.
- **Files modified:** /Users/jeet/turion-space-demo/scripts/update-cf-function.sh (idempotency-check uses v1 syntax)
- **Verification:** /tmp/53-02-cf-fn-live.js was 5812 B, byte-identical to repo source via `diff -q`. Final post-publish snapshot via the same syntax confirmed LIVE matches new repo source byte-for-byte.
- **Committed in:** `4ca3368`

---

**Total deviations:** 3 auto-fixed (3 blocking, 0 bugs, 0 missing-critical, 0 architectural)
**Impact on plan:** Zero scope creep. All three were AWS / shell trivia not infrastructure changes. Plan's verification gate "Aliases length == 3" became "Aliases length == 2" — a correction enforced by AWS, not a softening. The function logic, the cert ARN, the invalidation, and every smoke pass exactly as the plan intended.

## Issues Encountered

None beyond the three auto-fixes above. Distribution propagation (`wait distribution-deployed`) took ~5 min, within the 5-10 min Pitfall 5 window. Function publish-to-LIVE was instant for AWS internally; 15-second sleep + smoke confirmed edge-POP cache flush.

## User Setup Required

None. Fully automated via AWS CLI. No secrets, no env vars, no dashboard config.

## Hand-off to Plan 53-03 (Wave 2b — parallel) and Plan 53-04 (Wave 3 — smoke)

53-03 (backend tenant middleware): the CF Function now stamps `x-tenant-slug: <slug>` on every request to the S3 origin. For APIGW Lambdas, the same header is forwarded — 53-03's `tenantContext` middleware can read `event.headers['x-tenant-slug']` (or `x-tenant-slug` case-variant; APIGW v2 normalizes to lowercase).

53-04 (smoke): can now hit `<tenant>.zietra.com` directly. TLS works (wildcard cert), routing works (wildcard Alias), function-level slug extraction works (verified via reserved-slug 404 — proves the prologue runs end-to-end). The only piece missing is 53-03's `/api/tenants/current` endpoint that will return the resolved tenant context.

```bash
# 53-03 can validate the header is reaching origins by reading it from the Lambda event:
event.headers['x-tenant-slug']   # for any zietra.com subdomain except reserved ones
```

## Next Phase Readiness

- **Ready for plan 53-03 (Wave 2b, parallel):** CF Function emits `x-tenant-slug` header on every wildcard subdomain hit; backend middleware can consume it. No dependency from 53-03 back onto 53-02 — they're independent waves.
- **Ready for plan 53-04 (Wave 3, smoke):** Requires 53-03 to be Done before 53-04 runs (53-04 hits `/api/tenants/current` which is 53-03's endpoint).
- **No blockers.** Cert auto-renews via permanent Route 53 validation CNAME from 53-01. Wildcard alias is stable. Function size has 2595 B of headroom.

## Self-Check: PASSED

- [x] /Users/jeet/turion-space-demo/scripts/update-cloudfront-distribution.sh exists, executable (verified `test -x` OK; 78 lines)
- [x] /Users/jeet/turion-space-demo/scripts/update-cf-function.sh exists, executable (verified `test -x` OK; 56 lines)
- [x] /Users/jeet/turion-space-demo/cf-function-source/turion-clean-urls.js modified (7645 B; +44 lines)
- [x] Commit `809bda2` present on turion-space-demo main (verified `git log --oneline`)
- [x] Commit `4ca3368` present on turion-space-demo main (verified `git log --oneline`)
- [x] Both pushed to origin (`origin/main` at 4ca3368)
- [x] AWS describes distribution as Status=Deployed, Cert=`...4a29032a-...`, Aliases=`[turionspace, *.zietra.com]`
- [x] AWS describes function LIVE matching repo source byte-for-byte (`diff -q` exit 0)
- [x] Invalidation `I9KNISMQD1AZENF07LWSN3T26I` Status=Completed
- [x] All 10 smoke URLs return expected status (200 / 404 / 307 as documented)
- [x] Apex zietra.com Route 53 record unchanged (still pointing at dlzyv23o98bvo.cloudfront.net / marketing distro E1X82T89JWL8CA)

---
*Phase: 53-m5-wildcard-subdomain-routing-tenant-zietra-com*
*Completed: 2026-05-14*
