---
phase: 39-m1-cognito-user-pool-ses-integration-migrate-users-from-supabase-auth
plan: 01
subsystem: aws-infra
tags: [cognito, kms, ses, secretsmanager, iam, idempotent-bash]
status: complete-with-pending-user-action
dependency-graph:
  requires: []
  provides:
    - COGNITO_USER_POOL_ID (consumed by 39-02 LambdaConfig + 39-03 AdminCreateUser + Phase 40 dual-issuer)
    - COGNITO_APP_CLIENT_ID (consumed by 39-04 admin-initiate-auth + Phase 40)
    - COGNITO_KMS_KEY_ARN (consumed by 39-02 Lambda env + IAM role kms:Decrypt grant)
    - SES_DEMO_IDENTITY_PENDING (39-04 smoke test targets jm@ instead, so non-blocking)
  affects:
    - .planning/STATE.md (Current Plan → 39-02)
    - .planning/ROADMAP.md (Phase 39 progress 1/4)
    - .planning/REQUIREMENTS.md (CognitoUserPool ✓)
tech-stack:
  added:
    - aws-cognito user pool (zietra-platform-users, us-east-1)
    - aws-kms symmetric CMK (alias/zietra-cognito-email-sender)
    - aws-secretsmanager secret (zietra/cognito-config)
    - bash 3.2-compatible idempotent provisioner
  patterns:
    - mirrors turion-satellite/scripts/provision-aws.sh style (set -euo pipefail + describe-then-grep idempotency)
    - Rule 1 compliance: pool/client/key IDs read from Secrets Manager, never hardcoded
key-files:
  created:
    - /Users/jeet/turion-space-demo/infrastructure/cognito/provision-cognito.sh (~140 lines, executable)
    - /Users/jeet/turion-space-demo/infrastructure/cognito/user-pool-config.json (~70 lines)
    - /Users/jeet/turion-space-demo/infrastructure/cognito/cognito-kms-policy-bootstrap.json
    - /Users/jeet/turion-space-demo/infrastructure/cognito/cognito-kms-policy-final.json
    - /Users/jeet/turion-space-demo/infrastructure/cognito/README.md (~135 lines)
  modified: []
decisions:
  - "AllowLambdaDecrypt KMS statement deferred to Plan 39-02 — KMS rejects role principals that don't yet exist."
  - "ROLE_GROUPS instead of GROUPS — GROUPS is a readonly POSIX-gid array in macOS bash 3.2."
  - "demo@zietra.com SES verification is OPTIONAL for Phase 39 (smoke test uses already-verified jm@techcloudpro.com); pending click deferred to Phase 41 if not done."
metrics:
  duration: "~6m"
  tasks_completed: 3
  tasks_total: 4
  commits: 3
  files_created: 5
  aws_resources_created: 5
  completed: "2026-05-14T05:06Z"
---

# Phase 39 Plan 01: Cognito User Pool + KMS + Secrets Manager Provisioning

> Idempotent AWS infrastructure: KMS CMK + Cognito user pool + app client + 4 Groups + Secrets Manager secret + SES verify-email request — all in `us-east-1` on account `134607809447`.

## What landed

Five AWS resources provisioned via a single idempotent bash script:

| Resource | Identifier | Purpose |
|---|---|---|
| KMS CMK | `arn:aws:kms:us-east-1:134607809447:key/fd1706a7-f70a-4464-bfa7-991f5c52537a` (alias `alias/zietra-cognito-email-sender`) | Encrypts the verification code passed to the Plan-39-02 Custom Email Sender Lambda. |
| Cognito user pool | `us-east-1_KQuNS85nP` (name `zietra-platform-users`) | Platform identity service. RS256 default, MFA OFF, DeletionProtection ACTIVE, UserPoolTier ESSENTIALS. |
| App client | `1tuq2a1eedd3hvdsl0kvtu55ih` (name `zietra-platform-web`) | No client secret. ExplicitAuthFlows: ALLOW_ADMIN_USER_PASSWORD_AUTH, ALLOW_CUSTOM_AUTH, ALLOW_REFRESH_TOKEN_AUTH. 60-min access/id tokens, 30-day refresh. |
| Cognito Groups | `admin`, `customer`, `driver`, `vendor` | Mirror the four platform roles. Map to `cognito:groups` JWT claim in Phase 40. |
| Secrets Manager | `zietra/cognito-config` | JSON `{user_pool_id, app_client_id, kms_key_arn, region}` for downstream consumers. |
| SES identity | `demo@zietra.com` | Queued for verification (`VerificationStatus=Pending`); recipient click pending. |

Custom attributes declared in the pool schema: `custom:role` (mutable, max 32 chars) and `custom:supabase_sub` (immutable, 36-char UUID for audit forward-link).

## Why

Phase 40 (dual-issuer JWT verify), 39-02 (Custom Email Sender Lambda), 39-03 (AdminCreateUser migration), and 39-04 (smoke test) all consume these IDs. Per Global Engineering Rule 1 (no hardcoded DB-derivable values), they must read pool/client/key IDs from Secrets Manager rather than literals — `zietra/cognito-config` is the canonical store.

## Verification (proof, not "should work")

```text
$ aws secretsmanager get-secret-value --secret-id zietra/cognito-config --region us-east-1 \
    --query SecretString --output text | python3 -m json.tool
{
    "user_pool_id": "us-east-1_KQuNS85nP",
    "app_client_id": "1tuq2a1eedd3hvdsl0kvtu55ih",
    "kms_key_arn": "arn:aws:kms:us-east-1:134607809447:key/fd1706a7-f70a-4464-bfa7-991f5c52537a",
    "region": "us-east-1"
}

$ aws cognito-idp describe-user-pool --user-pool-id us-east-1_KQuNS85nP --region us-east-1 \
    --query '{Name:UserPool.Name,MFA:UserPool.MfaConfiguration,DelProt:UserPool.DeletionProtection,Tier:UserPool.UserPoolTier}'
{ "Name": "zietra-platform-users", "MFA": "OFF", "DelProt": "ACTIVE", "Tier": "ESSENTIALS" }

$ aws cognito-idp list-groups --user-pool-id us-east-1_KQuNS85nP --region us-east-1 \
    --query 'Groups[].GroupName'
["admin","driver","vendor","customer"]   # 4 groups, names exactly as planned

$ aws cognito-idp describe-user-pool --user-pool-id us-east-1_KQuNS85nP --region us-east-1 \
    --query 'UserPool.SchemaAttributes[?Name==`custom:role` || Name==`custom:supabase_sub`].Name'
custom:supabase_sub  custom:role

$ aws cognito-idp describe-user-pool-client --user-pool-id us-east-1_KQuNS85nP \
    --client-id 1tuq2a1eedd3hvdsl0kvtu55ih --region us-east-1 \
    --query 'UserPoolClient.ExplicitAuthFlows'
["ALLOW_ADMIN_USER_PASSWORD_AUTH","ALLOW_CUSTOM_AUTH","ALLOW_REFRESH_TOKEN_AUTH"]

$ aws kms get-key-policy --key-id <KEY_ARN> --policy-name default --region us-east-1 \
    --query Policy --output text | grep -c "kms:EncryptionContext:userpool-id"
1   # EncryptionContext scopes Cognito grants to this pool only

$ aws ses get-identity-verification-attributes --identities demo@zietra.com --region us-east-1 \
    --query 'VerificationAttributes."demo@zietra.com".VerificationStatus'
Pending
```

### Idempotency proof (run 3 = pure no-op)

```text
=== Account: 134607809447 · Region: us-east-1 ===
=== 1. KMS CMK — alias alias/zietra-cognito-email-sender ===
KMS key exists: fd1706a7-f70a-4464-bfa7-991f5c52537a
=== 2. Cognito user pool — zietra-platform-users ===
User pool exists: us-east-1_KQuNS85nP
=== 3. Tighten KMS policy with pool-ID EncryptionContext ===
KMS policy tightened with EncryptionContext=us-east-1_KQuNS85nP
=== 4. App client — zietra-platform-web ===
App client exists: 1tuq2a1eedd3hvdsl0kvtu55ih
=== 5. Cognito Groups — admin customer driver vendor ===
Group exists: admin
Group exists: customer
Group exists: driver
Group exists: vendor
=== 6. Secrets Manager — zietra/cognito-config ===
Updated secret: zietra/cognito-config
=== 7. SES verify demo@zietra.com (if not already verified) ===
demo@zietra.com already in SES identities — status: Pending
```

Exit 0. No AlreadyExists errors, no duplicate resources.

### Phase 38 regression intact

```text
$ curl -s -o /dev/null -w "%{http_code}\n" https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/health
200
$ curl -s -o /dev/null -w "%{http_code}\n" https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/data/all
401   # auth still required, no leak
```

### Lambda code untouched

```text
$ cd /Users/jeet/turion-satellite && git status --short
(empty)
$ cd /Users/jeet/turion-space-demo && git diff --stat HEAD~3 HEAD -- backend/
(empty — no backend/src/*.ts touched in any Phase-39-01 commit)
```

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 — Blocking] `GROUPS` array silently overwritten by bash POSIX-gid array**

- **Found during:** Task 3 run 1
- **Issue:** macOS bash 3.2 treats `GROUPS` as a readonly array containing the user's numeric POSIX group IDs (`20 12 61 79 ...`). The script's `GROUPS=(admin customer driver vendor)` was silently ignored; the loop ran with the user's GIDs and created 16 bogus Cognito groups named `"20"`, `"12"`, … `"400"`.
- **Fix:** Renamed the variable to `ROLE_GROUPS`. Manually deleted the 16 bogus groups via `aws cognito-idp delete-group`. Re-ran the script — created the correct 4 groups (`admin`, `customer`, `driver`, `vendor`). Added an inline comment in the script warning future maintainers.
- **Files modified:** `infrastructure/cognito/provision-cognito.sh`
- **Commit:** `68c92cd`

**2. [Rule 3 — Blocking] KMS final policy referenced a not-yet-existing IAM role**

- **Found during:** Task 3 run 1
- **Issue:** `cognito-kms-policy-final.json` had an `AllowLambdaDecrypt` statement principal `arn:aws:iam::134607809447:role/zietra-cognito-email-sender-role` — a role that Plan 39-02 creates. KMS validates principals strictly at `put-key-policy` time and rejected with `MalformedPolicyDocumentException: Policy contains a statement with one or more invalid principals`.
- **Fix:** Removed `AllowLambdaDecrypt` from `cognito-kms-policy-final.json`. Plan 39-02 will append the `kms:Decrypt` grant after creating the role. Updated README under "What this script does NOT do" to document the deferral.
- **Files modified:** `infrastructure/cognito/cognito-kms-policy-final.json`, `infrastructure/cognito/README.md`
- **Commit:** `68c92cd`

Both deviations were caught at the same point and bundled into one fix commit.

## Pending user action (Task 4 checkpoint — non-blocking)

The script successfully called `aws ses verify-email-identity --email-address demo@zietra.com`. SES has sent a verification email to that inbox. Status is currently `Pending`.

**To complete the verification:**
1. Open the `demo@zietra.com` inbox (jm@ has access).
2. Find the email from `no-reply-aws@amazon.com` titled "Amazon Web Services – Email Address Verification Request".
3. Click the verification link in the email body.
4. SES Console will display "Verification Successful".

This step is **optional for Phase 39** — Plan 39-04's smoke test targets `jm@techcloudpro.com`, which is already SES-verified. The `demo@zietra.com` click can be deferred to Phase 41 (full Supabase Auth removal + demo-user flow) without blocking M1 progress.

## Downstream consumption guide

| Consumer | Reads | Action |
|---|---|---|
| Plan 39-02 deploy.sh | `kms_key_arn` from secret | Create `zietra-cognito-email-sender-role`, append `kms:Decrypt` statement to KMS key policy, deploy Lambda with `KMS_KEY_ARN` env. |
| Plan 39-02 (post-Lambda) | `user_pool_id` from secret | Call `aws cognito-idp update-user-pool --lambda-config CustomEmailSender={LambdaArn,LambdaVersion=V1_0},KMSKeyID=<arn>`. |
| Plan 39-03 migration | `user_pool_id` from secret | Per-user `AdminCreateUser` / `AdminSetUserPassword` / `AdminAddUserToGroup` for the 4 confirmed Supabase users. |
| Plan 39-04 smoke test | `user_pool_id`, `app_client_id` | `aws cognito-idp admin-initiate-auth` for one migrated user. |
| Phase 40 middleware | `user_pool_id`, `region` | Dual-issuer JWT verify — load JWKS from `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_KQuNS85nP/.well-known/jwks.json`. |

All consumers MUST read these IDs from `zietra/cognito-config` Secrets Manager — never hardcode in source.

## Commits

| Commit | Task | Summary |
|---|---|---|
| `cb2c713` | Task 1 | Author user-pool-config + KMS bootstrap/final policy JSON inputs |
| `b4fa1aa` | Task 2 | Idempotent provision-cognito.sh + README |
| `68c92cd` | Task 3 | Fix GROUPS->ROLE_GROUPS + defer KMS Decrypt grant to 39-02 |

All three pushed to `github.com/jeet-avatar/turion-space-demo` `origin/main`.

## Self-Check: PASSED

- `[FOUND]` /Users/jeet/turion-space-demo/infrastructure/cognito/provision-cognito.sh
- `[FOUND]` /Users/jeet/turion-space-demo/infrastructure/cognito/user-pool-config.json
- `[FOUND]` /Users/jeet/turion-space-demo/infrastructure/cognito/cognito-kms-policy-bootstrap.json
- `[FOUND]` /Users/jeet/turion-space-demo/infrastructure/cognito/cognito-kms-policy-final.json
- `[FOUND]` /Users/jeet/turion-space-demo/infrastructure/cognito/README.md
- `[FOUND]` commit cb2c713 (Task 1)
- `[FOUND]` commit b4fa1aa (Task 2)
- `[FOUND]` commit 68c92cd (Task 3)
- `[FOUND]` Cognito pool us-east-1_KQuNS85nP (verified via describe-user-pool)
- `[FOUND]` 4 Cognito Groups (verified via list-groups, count==4)
- `[FOUND]` KMS CMK alias/zietra-cognito-email-sender (verified via describe-key)
- `[FOUND]` Secrets Manager zietra/cognito-config (verified via get-secret-value)
- `[FOUND]` SES demo@zietra.com identity (status=Pending — user click required)
