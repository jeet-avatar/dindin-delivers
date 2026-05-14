---
phase: 39-m1-cognito-user-pool-ses-integration-migrate-users-from-supabase-auth
plan: 02
subsystem: cognito-custom-email-sender
tags:
  - cognito
  - lambda
  - ses
  - kms
  - aws
  - custom-auth
  - magic-link

dependency-graph:
  requires:
    - "Plan 39-01 (zietra/cognito-config Secrets Manager secret populated with user_pool_id + kms_key_arn)"
    - "AWS account 134607809447, us-east-1"
    - "SES domain zietra.com verified"
  provides:
    - "4 Cognito-trigger Lambdas deployed in us-east-1 (CustomEmailSender + Define/Create/Verify AuthChallenge)"
    - "IAM role zietra-cognito-email-sender-role with SES + KMS + logs inline policy"
    - "Cognito user pool us-east-1_KQuNS85nP has LambdaConfig populated (5 slots: CustomEmailSender + DefineAuthChallenge + CreateAuthChallenge + VerifyAuthChallengeResponse + KMSKeyID)"
  affects:
    - "Plan 39-03 (migration script can now AdminCreateUser without dropping CES events)"
    - "Plan 39-04 (smoke test admin-initiate-auth CUSTOM_AUTH will exercise these Lambdas end-to-end)"
    - "Phase 40 (the CUSTOM_AUTH magic-link is what the Cognito-auth-callback page must complete)"

tech-stack:
  added:
    - "@aws-crypto/client-node ^4.0.1 (AWS Encryption SDK — decrypts Cognito KMS-encrypted codes)"
    - "@aws-sdk/client-sesv2 ^3.658.0 (SES v2 SendEmail)"
    - "TypeScript 5.4 / Node.js 20 ESM"
  patterns:
    - "ESM __dirname shim via fileURLToPath(import.meta.url) — required for template path resolution under 'type': 'module'"
    - "Idempotent bash deploy script — polls upstream Secrets Manager dependency for parallel-wave safety"
    - "Cognito CUSTOM_AUTH 3-Lambda state machine: Define -> Create -> Verify (Cognito does NOT invoke Custom Email Sender for custom challenges, so Create-Auth-Challenge sends magic-link emails directly via SES)"

key-files:
  created:
    - "/Users/jeet/turion-space-demo/lambdas/cognito-custom-email-sender/package.json"
    - "/Users/jeet/turion-space-demo/lambdas/cognito-custom-email-sender/tsconfig.json"
    - "/Users/jeet/turion-space-demo/lambdas/cognito-custom-email-sender/iam-trust-policy.json"
    - "/Users/jeet/turion-space-demo/lambdas/cognito-custom-email-sender/iam-role-policy.json"
    - "/Users/jeet/turion-space-demo/lambdas/cognito-custom-email-sender/src/handler.ts (CustomEmailSender)"
    - "/Users/jeet/turion-space-demo/lambdas/cognito-custom-email-sender/src/define-auth-challenge.ts (CUSTOM_AUTH state machine)"
    - "/Users/jeet/turion-space-demo/lambdas/cognito-custom-email-sender/src/create-auth-challenge.ts (magic-link issuer)"
    - "/Users/jeet/turion-space-demo/lambdas/cognito-custom-email-sender/src/verify-auth-challenge.ts (nonce verifier)"
    - "/Users/jeet/turion-space-demo/lambdas/cognito-custom-email-sender/src/ses.ts (SES v2 wrapper)"
    - "/Users/jeet/turion-space-demo/lambdas/cognito-custom-email-sender/src/templates/magic-link.html"
    - "/Users/jeet/turion-space-demo/lambdas/cognito-custom-email-sender/src/templates/admin-create-user.html"
    - "/Users/jeet/turion-space-demo/lambdas/cognito-custom-email-sender/src/templates/forgot-password.html"
    - "/Users/jeet/turion-space-demo/lambdas/cognito-custom-email-sender/deploy.sh"
    - "/Users/jeet/turion-space-demo/lambdas/cognito-custom-email-sender/README.md"
    - "/Users/jeet/turion-space-demo/lambdas/cognito-custom-email-sender/.gitignore"
  modified: []

decisions:
  - "ESM __dirname shim required in both handler.ts AND create-auth-challenge.ts — without it, fs.readFile(path.join(__dirname, 'templates', ...)) throws because CommonJS __dirname is undefined under 'type': 'module'"
  - "Parallel indexed arrays (FN_NAMES / FN_ZIPS / FN_HANDLERS) replaced 'declare -A' associative arrays so deploy.sh works under macOS bash 3.2"
  - "IAM role description must be plain ASCII (no em-dashes / smart quotes) — AWS regex limits to \\u0009-\\u00FF"
  - "deploy.sh keeps the 5-minute (10 x 30s) poll loop on zietra/cognito-config — enables true Wave 1 parallel safety with Plan 39-01"
  - "node_modules bundled into CES + create-auth-challenge zips (production deps only); define + verify zips are bare (no external runtime deps)"

metrics:
  duration_min: 9
  completed: 2026-05-14T05:10:42Z
  tasks_completed: 3
  tasks_total: 3
  files_created: 15
  commits: 3
---

# Phase 39 Plan 02: Cognito Custom Email Sender + CUSTOM_AUTH Magic-Link Lambdas Summary

**One-liner:** Deployed 4 Cognito-trigger Lambdas (CustomEmailSender + Define/Create/Verify AuthChallenge) in us-east-1, plus IAM role with SES + KMS + logs inline policy, plus wired all 4 triggers into the Zietra user pool's LambdaConfig — enabling both built-in code flows (sign-up, AdminCreateUser, ForgotPassword) and the CUSTOM_AUTH magic-link UX in one parallel-safe deploy.

## What was built

### 4 Lambda functions (Node.js 20.x, ESM, us-east-1)

| Function | ARN | Handler |
|---|---|---|
| Custom Email Sender | `arn:aws:lambda:us-east-1:134607809447:function:zietra-cognito-custom-email-sender` | `handler.handler` |
| Define Auth Challenge | `arn:aws:lambda:us-east-1:134607809447:function:zietra-cognito-define-auth-challenge` | `define-auth-challenge.handler` |
| Create Auth Challenge | `arn:aws:lambda:us-east-1:134607809447:function:zietra-cognito-create-auth-challenge` | `create-auth-challenge.handler` |
| Verify Auth Challenge | `arn:aws:lambda:us-east-1:134607809447:function:zietra-cognito-verify-auth-challenge` | `verify-auth-challenge.handler` |

All 4 are in `State: Active`, runtime `nodejs20.x`, with env vars `KMS_KEY_ARN` (the Cognito CMK) and `MAGIC_LINK_BASE_URL=https://turionspace.zietra.com`.

### IAM role `zietra-cognito-email-sender-role`

ARN: `arn:aws:iam::134607809447:role/zietra-cognito-email-sender-role`

- Trust policy: `lambda.amazonaws.com` can assume
- Managed policy: `AWSLambdaBasicExecutionRole`
- Inline policy `zietra-cognito-email-sender-inline`:
  - `ses:SendEmail` + `ses:SendRawEmail` on `arn:aws:ses:us-east-1:134607809447:identity/zietra.com` + wildcard for sandbox-mode verified recipients
  - `kms:Decrypt` + `kms:DescribeKey` on `arn:aws:kms:us-east-1:134607809447:key/*`
  - `logs:CreateLogGroup` + `logs:CreateLogStream` + `logs:PutLogEvents` on CloudWatch

### Cognito invoke permissions

Each Lambda has a resource policy statement (id `cognito-invoke-<fn>`) granting `cognito-idp.amazonaws.com` `lambda:InvokeFunction`, scoped via `source-arn` to `arn:aws:cognito-idp:us-east-1:134607809447:userpool/us-east-1_KQuNS85nP`.

### User pool LambdaConfig

Pool `us-east-1_KQuNS85nP` (created by Plan 39-01) now has:

```json
{
  "DefineAuthChallenge": "arn:aws:lambda:us-east-1:134607809447:function:zietra-cognito-define-auth-challenge",
  "CreateAuthChallenge": "arn:aws:lambda:us-east-1:134607809447:function:zietra-cognito-create-auth-challenge",
  "VerifyAuthChallengeResponse": "arn:aws:lambda:us-east-1:134607809447:function:zietra-cognito-verify-auth-challenge",
  "CustomEmailSender": {
    "LambdaVersion": "V1_0",
    "LambdaArn": "arn:aws:lambda:us-east-1:134607809447:function:zietra-cognito-custom-email-sender"
  },
  "KMSKeyID": "arn:aws:kms:us-east-1:134607809447:key/fd1706a7-f70a-4464-bfa7-991f5c52537a"
}
```

All 5 slots populated. The pool is now ready for Plan 39-03 (migration) and Plan 39-04 (smoke test).

## Tasks

| # | Name | Commit | Files |
|---|---|---|---|
| 1 | Scaffold 4 Lambda source files + email templates + IAM JSON + package.json/tsconfig | `92d3a72` | 13 new files under `lambdas/cognito-custom-email-sender/` |
| 2 | Author deploy.sh (idempotent IAM + 4 Lambdas + UpdateUserPool) + README.md | `3cbb911` | 2 new files |
| 3 | Run deploy.sh + verify wiring + push to main | `ab28814` | deploy.sh bug fixes only (compat patches) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] IAM role description used a non-ASCII em-dash**
- **Found during:** Task 3, first deploy.sh execution
- **Issue:** `--description "Phase 39 — Cognito custom email sender + auth challenge Lambdas"` failed with `ValidationError: Value at 'description' failed to satisfy constraint: Member must satisfy regular expression pattern: [	
 -~¡-ÿ]*`. The em-dash (U+2014) is outside both the printable ASCII range AND the Latin-1 supplement range AWS allows.
- **Fix:** Replaced em-dash with a hyphen-minus: `"Phase 39 - Cognito custom email sender + auth challenge Lambdas"`
- **Files modified:** `lambdas/cognito-custom-email-sender/deploy.sh`
- **Commit:** `ab28814`

**2. [Rule 1 - Bug] `declare -A` associative array not supported by macOS bash 3.2**
- **Found during:** Task 3, second deploy.sh execution attempt
- **Issue:** macOS ships bash 3.2 (the last GPL-2 release). The plan's `declare -A FUNCTIONS=(...)` is bash 4+ syntax. Under bash 3.2 with `set -u` (nounset), the line was parsed as a regular variable assignment and the first hyphenated array key (`zietra-cognito-custom-email-sender`) was interpreted as the variable `zietra` minus the rest, causing `zietra: unbound variable`.
- **Fix:** Replaced the single associative array with 3 parallel indexed arrays (`FN_NAMES`, `FN_ZIPS`, `FN_HANDLERS`) iterated by integer index. Works under bash 3.2 + 4 + 5.
- **Files modified:** `lambdas/cognito-custom-email-sender/deploy.sh`
- **Commit:** `ab28814`

Both fixes shipped together in commit `ab28814` since they were discovered in adjacent deploy attempts of the same script.

## Verification Evidence

### LambdaConfig snapshot (proves wiring)

```bash
$ aws cognito-idp describe-user-pool --user-pool-id us-east-1_KQuNS85nP --region us-east-1 --query 'UserPool.LambdaConfig'
{
  "DefineAuthChallenge": "arn:aws:lambda:us-east-1:134607809447:function:zietra-cognito-define-auth-challenge",
  "CreateAuthChallenge": "arn:aws:lambda:us-east-1:134607809447:function:zietra-cognito-create-auth-challenge",
  "VerifyAuthChallengeResponse": "arn:aws:lambda:us-east-1:134607809447:function:zietra-cognito-verify-auth-challenge",
  "CustomEmailSender": {
    "LambdaVersion": "V1_0",
    "LambdaArn": "arn:aws:lambda:us-east-1:134607809447:function:zietra-cognito-custom-email-sender"
  },
  "KMSKeyID": "arn:aws:kms:us-east-1:134607809447:key/fd1706a7-f70a-4464-bfa7-991f5c52537a"
}
```

### Lambda states (proves all Active)

```
zietra-cognito-custom-email-sender   -> Active
zietra-cognito-define-auth-challenge -> Active
zietra-cognito-create-auth-challenge -> Active
zietra-cognito-verify-auth-challenge -> Active
```

### Cognito invoke permissions (proves Cognito can invoke each)

```
zietra-cognito-custom-email-sender    -> Cognito can invoke OK
zietra-cognito-define-auth-challenge  -> Cognito can invoke OK
zietra-cognito-create-auth-challenge  -> Cognito can invoke OK
zietra-cognito-verify-auth-challenge  -> Cognito can invoke OK
```

### Idempotency proof (second run excerpt)

```
=== 2. IAM role zietra-cognito-email-sender-role ===
Role exists: arn:aws:iam::134607809447:role/zietra-cognito-email-sender-role
=== Deploy zietra-cognito-custom-email-sender ===
Updated: zietra-cognito-custom-email-sender
=== Deploy zietra-cognito-define-auth-challenge ===
Updated: zietra-cognito-define-auth-challenge
=== Deploy zietra-cognito-create-auth-challenge ===
Updated: zietra-cognito-create-auth-challenge
=== Deploy zietra-cognito-verify-auth-challenge ===
Updated: zietra-cognito-verify-auth-challenge
```

Second run printed `Role exists` (not `Created`) and `Updated:` (not `Created:`) for all 4 Lambdas. Exit 0.

### Phase 38 regression (proves no backend touched)

```
GET https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/health           -> HTTP 200
GET https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/data/all (unauth) -> HTTP 401
```

ERP API health 200, unauth gate still returns 401 (Phase 38's global `requireAuth` middleware intact).

### Backend untouched

- `git log --since='2 hours ago' --name-only` in both `turion-space-demo` and `turion-satellite` shows **zero** changes under `backend/src/`. Phase 39 scope guardrail held.

## Commits

| Hash | Subject |
|---|---|
| `92d3a72` | feat(phase-39-02): scaffold cognito custom email sender + CUSTOM_AUTH magic-link Lambdas |
| `3cbb911` | feat(phase-39-02): deploy.sh + README for cognito custom email sender Lambdas |
| `ab28814` | fix(phase-39-02): deploy.sh compat for macOS bash 3.2 + plain ASCII IAM description |

Pushed to `github.com/jeet-avatar/turion-space-demo` `origin/main`.

## Self-Check: PASSED

- All 15 source files exist under `lambdas/cognito-custom-email-sender/`
- All 3 commits exist in git log
- All 4 Lambdas Active in us-east-1
- LambdaConfig has all 5 slots
- Cognito invoke permissions granted to all 4 Lambdas
- Phase 38 regression intact (200 / 401)
- No backend/src/ changes in either Lambda repo

## Next steps

- **Plan 39-03 (Wave 2, sequential):** `backend/scripts/migrate-supabase-users-to-cognito.ts` — migrate 4 confirmed Supabase users into Cognito with `AdminCreateUser` + `MessageAction: SUPPRESS`.
- **Plan 39-04 (Wave 3, sequential):** smoke test — `admin-initiate-auth CUSTOM_AUTH` for `jm@techcloudpro.com`, then `admin-respond-to-auth-challenge` with the nonce from CloudWatch logs or email.
