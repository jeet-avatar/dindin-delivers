---
phase: 53-m5-wildcard-subdomain-routing-tenant-zietra-com
plan: 01
subsystem: infra
tags: [acm, route53, cloudfront, wildcard-cert, dns, aws]

# Dependency graph
requires:
  - phase: 52-m5-self-serve-signup-sandbox-provisioning-minimal-multi-tenancy-scaffolding
    provides: "tenants table + signup endpoint that creates tenant rows with slugs"
provides:
  - "Wildcard ACM cert arn:aws:acm:us-east-1:134607809447:certificate/4a29032a-1e82-4393-824c-5b2a6fb70207 (SANs *.zietra.com + zietra.com), Status=ISSUED"
  - "Route 53 wildcard A-alias *.zietra.com → d2bl7vqyf3n9m5.cloudfront.net (CloudFront E37R9PT8IL44L2)"
  - "Route 53 wildcard AAAA-alias *.zietra.com → same (IPv6 enabled on distro)"
  - "Idempotent provisioning script committed at /Users/jeet/turion-space-demo/scripts/provision-wildcard-cert.sh"
  - "Cert ARN written to /tmp/53-01-cert-arn.txt for plan 53-02 to consume"
affects: [53-02-cloudfront-distribution-update, 53-03-backend-tenant-middleware, 53-04-smoke]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pattern 1: idempotent shell script (list-certificates fast-path + --idempotency-token + apex-SAN belt-and-suspenders check)"
    - "Pattern 2: aws acm wait certificate-validated (avoids hardcoded sleeps for DNS-validated certs)"
    - "Pattern 3: CloudFront ALIAS records — both A AND AAAA when distro has IPv6 enabled (Pitfall 2)"

key-files:
  created:
    - /Users/jeet/turion-space-demo/scripts/provision-wildcard-cert.sh
  modified: []

key-decisions:
  - "Single cert with two SANs (*.zietra.com + zietra.com) — apex covered by SAN, no separate apex cert needed"
  - "us-east-1 region hardcoded (CloudFront requirement — certs in other regions are silently rejected by viewer-certificate attach in 53-02)"
  - "UPSERT-only DNS changes — never DELETE; safe for the 7 existing other-tenant aliases (marquee/asc606/meet/app/api/www/campaigns-api) which all stay routed to their own distributions/APIs via Route-53 most-specific-match precedence"
  - "Apex zietra.com A-record NOT touched — it points at marketing distro E1X82T89JWL8CA (dlzyv23o98bvo.cloudfront.net), NOT this Turion distro"
  - "Idempotency-token uses [a-zA-Z0-9]+ only (no hyphens) — discovered during execution that AWS regex is \\w+"

patterns-established:
  - "Phase-53 cert lifecycle: provision script is re-runnable as the single source of truth — re-running detects existing ISSUED cert with matching SANs and skips request/validation entirely, only re-UPSERTs the alias rows (which is idempotent itself)"
  - "Validation CNAME for cert with both wildcard + apex SAN: AWS deduplicates to ONE CNAME (per AWS docs — wildcard and apex SHARE the validation record)"

requirements-completed: [WildcardACMCert]

# Metrics
duration: 4 min
completed: 2026-05-14
---

# Phase 53 Plan 01: Wildcard ACM Cert + Route 53 Wildcard ALIAS Records Summary

**Wildcard ACM cert `*.zietra.com` + `zietra.com` SANs ISSUED in us-east-1, plus Route 53 A + AAAA wildcard ALIAS records pointing at CloudFront E37R9PT8IL44L2 — idempotent provisioning script committed for re-runs.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-14T20:01:19Z
- **Completed:** 2026-05-14T20:05:27Z
- **Tasks:** 2 (1 script + 1 execution+verify+commit)
- **Files modified:** 1 created
- **AWS API calls:** ~10 (sts, route53 get-zone, acm list/request/describe/wait, route53 change-record-sets x2, route53 list-record-sets x2)

## Accomplishments

- **ACM wildcard cert ISSUED in ~60s** — `arn:aws:acm:us-east-1:134607809447:certificate/4a29032a-1e82-4393-824c-5b2a6fb70207`. SANs verbatim: `*.zietra.com`, `zietra.com`. NotAfter: 2026-11-27 23:59:59 UTC. Auto-renew managed by ACM via the live Route 53 validation CNAME (will renew forever).
- **Route 53 wildcard DNS records live** — both A and AAAA ALIASes for `*.zietra.com` UPSERTed onto zone `Z090201115UMJZ8TIAX5G`, both pointing at `d2bl7vqyf3n9m5.cloudfront.net` (Turion CloudFront distro, IPv6 enabled).
- **Cert ARN captured for Wave 2** — `/tmp/53-01-cert-arn.txt` contains the full ARN. Plan 53-02 reads this to attach the cert to the distribution.
- **Zero non-target records changed** — pre/post snapshot of the 9 records we MUST NOT touch (apex `zietra.com`, `turionspace`, `marquee`, `asc606`, `meet`, `app`, `api`, `www`, `campaigns-api`) is byte-identical (`diff` exit 0).
- **Idempotency proven by re-execution** — run2 detected the existing ISSUED cert via `list-certificates` fast-path + apex-SAN check, skipped request/validation entirely, only re-UPSERTed the (already-correct) alias rows.

## Task Commits

1. **Task 1: Write idempotent provision-wildcard-cert.sh** — `8e5333c` (feat) — 118 lines, executable, passes all 7 plan verification gates (region hardcoded, A+AAAA aliases, both SANs, no apex/turionspace UPSERT, --idempotency-token + list-certificates idempotency).
2. **Task 2: Run + verify + idempotency proof** — code-fix commit `ca13775` (fix) — `--idempotency-token` regex `\w+` rejects hyphens. Plus the cert provisioning + DNS UPSERT happens at runtime against AWS (no code commit needed for AWS state).

**Plan metadata commit:** _next_ (this SUMMARY + STATE.md + ROADMAP.md in dollor.ai repo).

## Files Created/Modified

- **/Users/jeet/turion-space-demo/scripts/provision-wildcard-cert.sh** (created, 118 lines, executable) — idempotent shell script that:
  - Verifies AWS account + zietra.com hosted zone exist
  - Fast-paths to an existing ISSUED `*.zietra.com` cert if SANs include the apex (re-run safe)
  - Otherwise requests a fresh cert with `--idempotency-token`, reads the AWS-generated validation CNAME from `DomainValidationOptions[0]`, UPSERTs it into Route 53, then `aws acm wait certificate-validated` polls until ISSUED
  - UPSERTs wildcard A + AAAA ALIASes pointing at `d2bl7vqyf3n9m5.cloudfront.net` (CloudFront zone `Z2FDTNDATAQYW2`)
  - Writes the final cert ARN to `/tmp/53-01-cert-arn.txt` for downstream plans
  - Hardcodes `--region us-east-1` on every aws acm call (Pitfall 1 protection)

## AWS State After

| Resource | Value |
|---|---|
| Cert ARN | `arn:aws:acm:us-east-1:134607809447:certificate/4a29032a-1e82-4393-824c-5b2a6fb70207` |
| Cert Status | ISSUED |
| Cert SANs | `*.zietra.com`, `zietra.com` |
| Cert NotAfter | 2026-11-27 23:59:59 UTC (auto-renew enabled, validation CNAME in Route 53 is permanent) |
| Validation CNAME submitted | Change ID `/change/C07468132PAJDQB3DVG2I` |
| Wildcard aliases submitted (run1) | Change ID `/change/C00321562W30AKLL5849U` (A + AAAA in one batch) |
| Wildcard aliases re-UPSERT (run2) | Change ID `/change/C00241023JP8O7AIMROB6` (idempotent — same values) |
| Wildcard A target | `d2bl7vqyf3n9m5.cloudfront.net.` (CloudFront E37R9PT8IL44L2) |
| Wildcard AAAA target | `d2bl7vqyf3n9m5.cloudfront.net.` (same — distro has IPv6) |
| Apex `zietra.com` A | UNCHANGED → `dlzyv23o98bvo.cloudfront.net.` (marketing distro E1X82T89JWL8CA) |
| `turionspace.zietra.com` A | UNCHANGED → `d2bl7vqyf3n9m5.cloudfront.net.` (this distro) |
| Pre/post snapshot diff | 0 bytes (byte-identical for all 9 reserved-name records) |

## Logs

- **Run 1 log:** `/tmp/53-01-run1.log` — fresh provisioning, `WILDCARD_CERT_ARN=...` line emitted once
- **Run 2 log:** `/tmp/53-01-run2.log` — idempotency proof, contains "Reusing existing ISSUED cert" 1×
- **Pre-snapshot:** `/tmp/53-01-pre-snapshot.json` (132 lines, 9 reserved-name records)
- **Post-snapshot:** `/tmp/53-01-post-snapshot.json` (132 lines, identical to pre)

## Decisions Made

| Decision | Rationale |
|---|---|
| Single cert with 2 SANs (`*.zietra.com` + `zietra.com`) | CONTEXT.md locked decision. The apex SAN is needed if Wave 2 ever adds `zietra.com` itself to the distro Aliases list (currently it's on a different distro). The wildcard `*.zietra.com` does NOT cover the apex per RFC 6125. |
| us-east-1 hardcoded | CloudFront viewer-cert region requirement — Pitfall 1 in research. Certs in other regions can't be attached to CloudFront. |
| UPSERT-only, never DELETE | Rule 6 "no backup paths" + safety. The 7 other-tenant aliases (marquee/asc606/meet/app/api/www/campaigns-api) stay untouched. Route 53 routes more-specific names first, so wildcard doesn't shadow them. |
| Cert ARN to `/tmp/`, not env var or repo file | One-time handoff to plan 53-02 within the same session. No secret value (cert ARN is not sensitive). Persisting to repo is not needed — script is the source of truth and re-running 53-01 will rediscover the ARN. |
| `--idempotency-token` uses [a-zA-Z0-9]+ only | AWS ACM regex is `\w+` — hyphens rejected (discovered during execution). |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `--idempotency-token` regex mismatch**
- **Found during:** Task 2 (first script invocation)
- **Issue:** `aws acm request-certificate` returned `ValidationException: Value of the input at 'idempotencyToken' failed to satisfy constraint: Member must satisfy regular expression pattern: \w+`. The script used `phase-53-wildcard-<epoch>` which contains hyphens, but `\w+` only matches `[a-zA-Z0-9_]+`.
- **Fix:** Renamed token to `phase53wildcard<epoch>` (letters + digits only). Comment added documenting the regex constraint.
- **Files modified:** `/Users/jeet/turion-space-demo/scripts/provision-wildcard-cert.sh` (1 line + 1 comment)
- **Verification:** Re-ran script → cert ISSUED successfully (`arn:aws:acm:us-east-1:134607809447:certificate/4a29032a-...`). No orphan cert created by the failed run (AWS rejected at API layer before cert reservation).
- **Committed in:** `ca13775` (fix(53-01): idempotency-token must match \w+ regex (no hyphens))

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Single 1-line shell fix. Did NOT cascade — no test/research/PLAN.md changes needed. Caught quickly by AWS API validation. The plan's `<verify>` step 7 had specifically required `--idempotency-token` to be present, so the check passed; the failure mode (regex format) was undocumented in the AWS CLI docs. Now memorialized via the inline comment. Pattern is added to `tech-stack.patterns` for future ACM scripts.

## Issues Encountered

None beyond the auto-fix above. Cert validation took ~60s (within the 1-5 min expected window). DNS propagation was instant within AWS (validation CNAME picked up by ACM internally without external DNS resolver delays).

## User Setup Required

None. Fully automated via AWS CLI. No secrets, no env vars, no dashboard config, no email verification.

## Hand-off to Plan 53-02

```bash
WILDCARD_CERT_ARN=$(cat /tmp/53-01-cert-arn.txt)
echo $WILDCARD_CERT_ARN
# arn:aws:acm:us-east-1:134607809447:certificate/4a29032a-1e82-4393-824c-5b2a6fb70207
```

Plan 53-02 uses this ARN in the CloudFront `update-distribution` ViewerCertificate field.

## Next Phase Readiness

- **Ready for plan 53-02 (Wave 2):** Cert is ISSUED, ARN captured, wildcard DNS in place. CloudFront `update-distribution` will not get `InvalidViewerCertificate` error.
- **Ready for plan 53-03 (Wave 2 parallel):** No dependency on 53-01 directly — depends on the CF Function update in 53-02 to set `x-tenant-slug` (or the frontend wrappers per research §"CRITICAL architectural fact").
- **DNS propagation timeline:** Route 53 changes typically resolve in <60s globally. Wildcard subdomains will start responding once Wave 2 attaches the cert (today they 404 because CloudFront has only `turionspace.zietra.com` in its Aliases list).
- **No blockers for downstream Wave 2 work.**

## Self-Check: PASSED

- [x] `/Users/jeet/turion-space-demo/scripts/provision-wildcard-cert.sh` exists, is executable (verified `test -x` → OK)
- [x] Commit `8e5333c` present on `turion-space-demo` main (verified via `git log --oneline`)
- [x] Commit `ca13775` present on `turion-space-demo` main (verified via `git log --oneline`)
- [x] Both commits pushed to origin (`origin/main` at `ca13775`)
- [x] Cert ARN file `/tmp/53-01-cert-arn.txt` exists and contains valid ARN
- [x] AWS describes cert as Status=ISSUED with both SANs
- [x] Route 53 has wildcard A + AAAA records (verified via `jq` on `list-resource-record-sets`)
- [x] Pre/post snapshot diff is 0 (apex + 8 other reserved names UNCHANGED)
- [x] Idempotency proven (run2 reused cert)

---
*Phase: 53-m5-wildcard-subdomain-routing-tenant-zietra-com*
*Completed: 2026-05-14*
