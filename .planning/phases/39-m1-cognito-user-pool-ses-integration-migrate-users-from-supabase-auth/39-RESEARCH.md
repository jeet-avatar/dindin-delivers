# Phase 39: M1 — Cognito user pool + SES integration + Supabase Auth migration — Research

**Researched:** 2026-05-14
**Domain:** AWS Cognito user pools · KMS · SES · Lambda triggers · Supabase Auth migration
**Confidence:** HIGH (Cognito APIs verified against `aws cognito-idp` skeleton + official AWS docs; Supabase auth.users inventoried via direct DB query; AWS account/region/SES state verified live)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
| Topic | Decision |
|---|---|
| Auth provider | **AWS Cognito** (replacing Supabase Auth) |
| Cognito JWT alg | **RS256** (Cognito default — don't override) |
| Magic-link UX | Preserve exactly — same email, same flow, same callback URL |
| Email sender address | `noreply@zietra.com` via SES |
| Email transport | Cognito's **Custom Email Sender Lambda trigger** (NOT Cognito's built-in `EmailSendingAccount: DEVELOPER` SES route, which is plain-text only and loses branding control) |
| Tenancy | **Single user pool** for all tenants — `tenant_id` lives in custom attribute + DB, not in pool boundary |
| User attributes preserved | `email` (lowercase normalized), `role` (admin/customer/driver/vendor), `created_at`, anything in Supabase `auth.users.raw_user_meta_data` |
| Region | `us-east-1` |
| AWS account | `134607809447` |

### Claude's Discretion
- Cognito Groups vs `custom:role` attribute (preference: Groups + a redundant `custom:role` mirror so the JWT carries both `cognito:groups` and `custom:role` with no extra middleware logic in Phase 40).
- Provisioning method (preference: idempotent shell script in `infrastructure/cognito/` of `turion-space-demo` repo, mirroring `turion-satellite/scripts/provision-aws.sh:1-46` style).
- Custom Sender Lambda source location (preference: a new `lambdas/cognito-custom-email-sender/` directory in `turion-space-demo` so it sits next to existing Lambda code without needing a new repo).
- KMS CMK alias name (preference: `alias/zietra-cognito-email-sender`, tag `Service=cognito-email,Owner=zietra-platform`).
- Migration script language (preference: TypeScript + AWS SDK v3 in the same `turion-space-demo/backend/` so it reuses the `pg` + `@aws-sdk/client-cognito-identity-provider` deps that already exist; runs locally with `tsx`).

### Deferred Ideas (OUT OF SCOPE for Phase 39)
- Lambda middleware switch (Phase 40 — dual-issuer JWT verify)
- Removing Supabase Auth (Phase 41)
- Multi-tenancy / `tenant_id` (M3, Phases 44–48)
- RDS migration (M2, Phases 42–43)
- Stripe billing (M4)
- Hosted UI / Cognito custom domain / ACM cert in us-east-1 for `auth.zietra.com` (defer — Phase 39 uses SDK-driven flows only)
- MFA, SAML, federated identity, advanced security
- Bulk CSV import (`CreateUserImportJob`) — user count is 10 (4 real, 6 noise); use admin-create-user script
- Account takeover protection
- Dead-code cleanup of the migration script itself (carry to Phase 41 — see Rule 5 marker)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

The 4 requirement IDs from `.planning/ROADMAP.md:632`:

| ID | Description | Research Support |
|----|-------------|------------------|
| **CognitoUserPool** | A Cognito user pool exists in us-east-1, configured with email as the username, RS256 JWTs, no MFA, no advanced security, attribute schema includes `email` (verified) + `custom:role`, has 4 Groups (`admin`/`customer`/`driver`/`vendor`), app client with `ALLOW_ADMIN_USER_PASSWORD_AUTH` + `ALLOW_CUSTOM_AUTH` + `ALLOW_REFRESH_TOKEN_AUTH`. | §"Cognito User Pool Spec" + §"Provisioning Script" |
| **CognitoSesIntegration** | A KMS CMK exists in us-east-1 with the documented two-statement policy (Cognito principal `kms:CreateGrant`, Lambda role `kms:Decrypt`). A Custom Email Sender Lambda exists, has `@aws-crypto/client-node` bundled, calls `sesv2.SendEmail` with `From: noreply@zietra.com`, and handles all 8 `CustomEmailSender_*` trigger sources. The pool's `LambdaConfig.CustomEmailSender` references it; `LambdaConfig.KMSKeyID` references the CMK. **One magic-link email lands in the user's inbox via SES during the smoke test.** | §"Custom Email Sender Lambda" + §"KMS Setup" + §"Email Templates" |
| **UserMigrationFromSupabase** | All 4 real Supabase `auth.users` rows (`demo@zietra.com`, `gteshnair@gmail.com`, `jm@techcloudpro.com`, `jeetnair.in@gmail.com`) exist in the new Cognito pool with `email_verified=true`, lowercase email, the `custom:role` and Groups assignment that maps to their Supabase metadata, and `aws cognito-idp admin-get-user` returns each one. | §"Migration Strategy" + §"Supabase Inventory" |
| **CognitoAuthCheckpoint** | `aws cognito-idp admin-initiate-auth` succeeds for at least one migrated user (returns an `AuthenticationResult` with `IdToken`/`AccessToken`/`RefreshToken`), AND a magic-link email lands in the verified recipient's SES inbox. **Lambdas remain untouched** (no `turion-satellite-api`/`turion-demo-api` deploys). | §"Smoke Test Plan" |
</phase_requirements>

---

## Summary

Phase 39 is **AWS infrastructure provisioning** (one user pool + one KMS key + one Lambda + IAM grants) plus a **one-shot 10-user migration script**. No Lambda backend code change. No frontend change. The "magic-link UX preserved" requirement is the hardest part: Cognito's Custom Email Sender Lambda only fires for codes (6-digit numerics) — there is no built-in magic-link URL flow. We solve this with **Cognito's `CUSTOM_AUTH` flow** where the Create-Auth-Challenge Lambda generates a random nonce, sends a `https://turionspace.zietra.com/erp-auth-callback?token=<nonce>` link directly via SES (sidestepping Custom Email Sender for this code path), stashes the nonce in `privateChallengeParameters`, and the Verify-Auth-Challenge-Response Lambda compares it. Both pieces ship in Phase 39 since "magic-link works end-to-end" is part of the acceptance criteria, but the frontend/Lambda wiring that *uses* this flow is Phase 40/41.

**Primary recommendation:** 4 plans across 3 waves:
- Wave 1 (parallel): (a) KMS CMK + Cognito user pool + app client + Groups via idempotent bash script in `turion-space-demo/infrastructure/cognito/`; (b) Custom Email Sender Lambda + Define/Create/Verify-Auth-Challenge Lambdas + email templates in `turion-space-demo/lambdas/cognito-custom-email-sender/` (one repo, four function entry points).
- Wave 2 (sequential, depends on Wave 1): migration script in `turion-space-demo/backend/scripts/migrate-supabase-users-to-cognito.ts` — queries `auth.users`, calls `AdminCreateUser` + `AdminSetUserPassword` + `AdminAddUserToGroup`, idempotent (skips users already in Cognito).
- Wave 3 (sequential): smoke test plan — `aws cognito-idp admin-initiate-auth` for one user + magic-link email delivery for one verified recipient + write a `CHECKPOINT.md` documenting success criteria evidence.

**Critical decisions surfaced during research:**
1. **No `role` in current Supabase JWTs.** Inventoried `auth.users.raw_app_meta_data` and `auth.users.raw_user_meta_data` for all 10 rows (`/Users/jeet/turion-space-demo/backend/auth-users-inventory.mjs` — script was deleted after run; output captured in this doc §"Supabase Inventory"). **No row has a `role` claim anywhere.** `turion-space-demo/backend/src/middleware/auth.ts:31-38` reads `app_metadata.role ?? user_metadata.role` and currently returns `"unknown"` for every user — the existing role gate is a no-op today. Phase 39's migration must **assign a role for each migrated user** (defaulting to `admin` for the 4 real users since they're the platform builders + demo accounts). Phase 40 will then have real role data to verify.
2. **`@aws-crypto/client-node` is required** in the Custom Email Sender Lambda — Cognito doesn't pass the secret code in plaintext; it's encrypted with the KMS CMK using the AWS Encryption SDK. The Lambda must `import { KmsKeyringNode, buildClient, CommitmentPolicy }` and `decrypt()` before reading the code (verified against the AWS Cognito docs sample code).
3. **The 6 unconfirmed Supabase users are spam signups** (random `*@gmail.com`, no `last_sign_in_at`, no `email_confirmed_at`, names like `JivBTnJDQjKSGkeOtGfMJht`). **Don't migrate them.** Plan must filter to `email_confirmed_at IS NOT NULL`.

---

## Standard Stack

### Core
| Library / Service | Version | Purpose | Why Standard |
|-------------------|---------|---------|--------------|
| AWS Cognito User Pools | API 2016-04-18 | User identity service | Locked decision; AWS-native; integrates with API Gateway authorizer in Phase 40 |
| AWS KMS (symmetric CMK) | API 2014-11-01 | Encrypts the verification code passed to Custom Sender | **Mandatory** for Custom Email Sender — Cognito will reject pool config without it (verified against [AWS doc §Encryption concepts](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-custom-sender-triggers.html)) |
| AWS SES v2 | API 2019-09-27 | Outbound email transport | Already provisioned (`zietra.com` verified, DKIM SUCCESS, sandbox 200/day) |
| AWS Lambda (Node.js 20.x) | latest runtime | Custom Sender + 3 challenge triggers | Existing pattern (`turion-demo-api`, `turion-satellite-api` both run Node.js Lambda) |
| `@aws-crypto/client-node` | ^4.0.x | AWS Encryption SDK — decrypt the Cognito-encrypted code | **Required** by Cognito Custom Sender contract; no substitute |
| `@aws-sdk/client-sesv2` | ^3.1045.x (matches existing) | Send email from Lambda | Same major as already in `backend/package.json:8` (`@aws-sdk/client-ses` v3.1045 — use sesv2 for newer template features) |
| `@aws-sdk/client-cognito-identity-provider` | ^3.1045.x | Migration script + admin operations | New dep; v3 matches all existing AWS SDK deps |
| `pg` | ^8.13.x (existing) | Migration script reads `auth.users` | Already in `backend/package.json:14` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `aws cognito-idp` CLI | bundled w/ AWS CLI v2 | Provisioning + smoke test | Idempotent shell scripts |
| `aws kms` CLI | bundled w/ AWS CLI v2 | CMK creation + grant + policy attach | Provisioning script |
| `aws lambda` CLI | bundled w/ AWS CLI v2 | Create function + add-permission for Cognito to invoke | Provisioning script |
| `tsx` | ^4.19.x (existing) | Run migration script in TS without compile | Backend `package.json:24` already has it |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom Email Sender Lambda | Cognito's built-in SES integration (`EmailSendingAccount: DEVELOPER` with `EmailConfiguration.SourceArn`) | Cognito's built-in SES route uses **plain text** templates with no HTML branding control — locked decision in CONTEXT says to use Custom Sender Lambda for branding (`/Users/jeet/doordash-p2p/.planning/phases/39-.../CONTEXT.md:32`). Custom Sender also lets us route different trigger sources to different templates. |
| CUSTOM_AUTH flow for magic-link | Use the `AdminCreateUser` temporary-password flow and call it a "magic link" | Temp-password is a code, not a clickable URL — degrades UX vs. Supabase's magic-link. CUSTOM_AUTH preserves the click-to-sign-in feel. |
| Idempotent bash provisioning script | CloudFormation / Terraform | Repo has no IaC tooling today; bash mirrors `turion-satellite/scripts/provision-aws.sh:1-46` already in tree. Phase 41+ can promote to CloudFormation when more resources accumulate. |
| Cognito Groups for role | `custom:role` attribute only | Groups → `cognito:groups` claim is **the AWS-standard way**; attribute → `custom:role` is fine too but requires the app to read a custom claim. **Recommend: do both.** Groups give clean IAM integration for future; `custom:role` keeps middleware unchanged-style (`getRoleFromJwt`-friendly). Both come for free per user-migration. |
| Bulk CSV import (`CreateUserImportJob`) | Per-user `AdminCreateUser` script | 10 users (4 real, 6 spam-filtered) — bulk import is overkill; admin-create-user is more readable + idempotent. |
| Cognito Hosted UI | SDK-driven flows | Hosted UI requires custom domain + ACM cert in us-east-1 — explicitly **deferred** in CONTEXT.md. |

**Installation (added to `turion-space-demo/backend/package.json` for the migration script + Lambda):**
```bash
# In turion-space-demo/lambdas/cognito-custom-email-sender/
npm install @aws-crypto/client-node @aws-sdk/client-sesv2

# In turion-space-demo/backend/ (for migration script)
npm install @aws-sdk/client-cognito-identity-provider
# (already has pg + tsx + @aws-sdk/client-secrets-manager)
```

---

## Architecture Patterns

### Recommended Project Structure
```
turion-space-demo/
├── infrastructure/                      # NEW — Phase 39 infra-as-bash
│   └── cognito/
│       ├── provision-cognito.sh         # idempotent: KMS + user pool + app client + Groups + Lambda config
│       ├── teardown-cognito.sh          # rollback (delete pool + KMS schedule deletion 7d)
│       └── README.md                    # operator runbook + env vars
├── lambdas/                              # NEW — Cognito trigger functions
│   └── cognito-custom-email-sender/
│       ├── src/
│       │   ├── handler.ts                # CustomEmailSender entry: decrypts code + sends via SES
│       │   ├── create-auth-challenge.ts  # CUSTOM_AUTH magic-link issuer
│       │   ├── define-auth-challenge.ts  # CUSTOM_AUTH state machine (single CUSTOM_CHALLENGE → IssueTokens)
│       │   ├── verify-auth-challenge.ts  # CUSTOM_AUTH nonce verifier
│       │   ├── templates/
│       │   │   ├── magic-link.html       # HTML email template for magic-link
│       │   │   ├── admin-create-user.html
│       │   │   └── forgot-password.html
│       │   └── ses.ts                    # thin SES v2 wrapper
│       ├── package.json
│       ├── tsconfig.json
│       └── deploy.sh                     # build + zip + aws lambda update-function-code
└── backend/
    └── scripts/
        └── migrate-supabase-users-to-cognito.ts  # NEW — Phase 39 one-shot migration
```

Mirrors existing layout: `turion-satellite/scripts/provision-aws.sh:1-46` for infra-as-bash, `turion-space-demo/backend/src/` for Lambda code, `turion-space-demo/scripts/` for one-off ops scripts.

### Pattern 1: Cognito CUSTOM_AUTH magic-link flow
**What:** Cognito's CUSTOM_AUTH gives full control over the auth ceremony — the Lambda decides what challenge to issue, what answer to expect. We use it to send a magic-link URL with a random nonce.

**When to use:** Magic-link emails. (Cognito's built-in flows only emit 6-digit codes.)

**Flow:**
1. Frontend (deferred to Phase 40/41 — we just verify it works in Phase 39 via CLI) calls `InitiateAuth { AuthFlow: 'CUSTOM_AUTH', AuthParameters: { USERNAME: email } }`.
2. Cognito invokes **DefineAuthChallenge** → respond `{ challengeName: 'CUSTOM_CHALLENGE', issueTokens: false, failAuthentication: false }`.
3. Cognito invokes **CreateAuthChallenge** → Lambda generates a random nonce (e.g. `crypto.randomBytes(32).toString('base64url')`), sends an email via SES with `https://turionspace.zietra.com/erp-auth-callback?token=<nonce>`, returns `{ privateChallengeParameters: { answer: <nonce> }, publicChallengeParameters: { email: <email> }, challengeMetadata: 'MAGIC_LINK' }`.
4. User clicks the email → frontend extracts `token` from URL → calls `RespondToAuthChallenge { ChallengeName: 'CUSTOM_CHALLENGE', ChallengeResponses: { USERNAME: email, ANSWER: <nonce> }, Session: <session> }`.
5. Cognito invokes **VerifyAuthChallengeResponse** → Lambda returns `{ answerCorrect: <answer === expected> }`.
6. Cognito invokes **DefineAuthChallenge** again → on success, respond `{ issueTokens: true }` → Cognito returns `AuthenticationResult` with `IdToken`/`AccessToken`/`RefreshToken`.

**Note on Custom Email Sender vs. magic-link:** The Custom Email Sender Lambda **does not get invoked** for CUSTOM_AUTH challenges (it's only for `SignUp`/`Authentication`/`ForgotPassword`/`AdminCreateUser`/etc. built-in flows where Cognito generates a code). Our Create-Auth-Challenge Lambda sends the email itself directly via SES. This is the standard pattern (verified against [AWS Cognito Create-Auth-Challenge docs](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-create-auth-challenge.html)).

**Why ship the Custom Email Sender then?** Because `AdminCreateUser` (the migration script's primary action) fires `CustomEmailSender_AdminCreateUser` — if we don't have a sender, those events get dropped silently. Also `ForgotPassword` and any future built-in flows need it. The Custom Email Sender covers the "default Cognito" code paths; CUSTOM_AUTH covers the magic-link UX.

**Example skeleton (verified against AWS docs):**
```typescript
// lambdas/cognito-custom-email-sender/src/handler.ts
// Source: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-custom-email-sender.html#custom-email-sender-code-examples
import { KmsKeyringNode, buildClient, CommitmentPolicy } from '@aws-crypto/client-node';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

const { decrypt } = buildClient(CommitmentPolicy.REQUIRE_ENCRYPT_ALLOW_DECRYPT);
const keyring = new KmsKeyringNode({
  generatorKeyId: process.env.KEY_ID!,
  keyIds: [process.env.KEY_ARN!],
});
const ses = new SESv2Client({ region: process.env.AWS_REGION ?? 'us-east-1' });

export const handler = async (event: any) => {
  let code: string | undefined;
  if (event.request.code) {
    const { plaintext } = await decrypt(keyring, Buffer.from(event.request.code, 'base64'));
    code = Buffer.from(plaintext).toString('utf-8');
  }
  const email = event.request.userAttributes.email;
  const subject = subjectFor(event.triggerSource);
  const body = bodyFor(event.triggerSource, code);

  await ses.send(new SendEmailCommand({
    FromEmailAddress: 'noreply@zietra.com',
    Destination: { ToAddresses: [email] },
    Content: { Simple: {
      Subject: { Data: subject },
      Body: { Html: { Data: body } },
    }},
  }));
};
```

### Pattern 2: Idempotent provisioning bash script
**What:** A single `bash provision-cognito.sh` that can be re-run safely — uses `aws cognito-idp list-user-pools | grep <name> || aws cognito-idp create-user-pool ...` style guards.

**When to use:** Any AWS resource creation in this repo. Mirrors `turion-satellite/scripts/provision-aws.sh:1-46`.

**Skeleton:**
```bash
#!/usr/bin/env bash
set -euo pipefail
REGION=us-east-1
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
POOL_NAME=zietra-platform-users

# 1. KMS CMK (idempotent via alias check)
KEY_ID=$(aws kms describe-key --key-id alias/zietra-cognito-email-sender --region "$REGION" --query 'KeyMetadata.KeyId' --output text 2>/dev/null || \
  aws kms create-key --description 'Cognito Custom Email Sender — Zietra platform' --tags TagKey=Service,TagValue=cognito-email --region "$REGION" --query 'KeyMetadata.KeyId' --output text)
aws kms create-alias --alias-name alias/zietra-cognito-email-sender --target-key-id "$KEY_ID" --region "$REGION" 2>/dev/null || true

# 2. KMS key policy (Cognito CreateGrant + Lambda Decrypt)
aws kms put-key-policy --key-id "$KEY_ID" --policy-name default --policy file://cognito-kms-policy.json --region "$REGION"

# 3. Cognito user pool (idempotent via name check)
POOL_ID=$(aws cognito-idp list-user-pools --max-results 60 --region "$REGION" --query "UserPools[?Name=='${POOL_NAME}'].Id" --output text)
if [ -z "$POOL_ID" ]; then
  POOL_ID=$(aws cognito-idp create-user-pool --cli-input-json file://user-pool-config.json --region "$REGION" --query 'UserPool.Id' --output text)
fi
# ...etc.
```

### Pattern 3: Migration script with idempotency + dry-run
**What:** TypeScript script that queries Supabase `auth.users`, filters to confirmed users, calls `AdminCreateUser` with `MessageAction: SUPPRESS`, then `AdminSetUserPassword` + `AdminAddUserToGroup` + `AdminUpdateUserAttributes` for the `custom:role` mirror.

**When to use:** One-shot migration. Carries `// TEMPORARY: delete after Phase 41 cutover` per Global Rule 5.

**Skeleton:**
```typescript
// turion-space-demo/backend/scripts/migrate-supabase-users-to-cognito.ts
// TEMPORARY: delete after Phase 41 cutover — Cognito will be source-of-truth for users from M2 onward.
import { Client as PgClient } from 'pg';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminAddUserToGroupCommand,
  AdminGetUserCommand,
  UsernameExistsException,
} from '@aws-sdk/client-cognito-identity-provider';
import crypto from 'crypto';

const POOL_ID = process.env.COGNITO_USER_POOL_ID!;  // Rule 1: env var, never hardcoded
const REGION = process.env.AWS_REGION ?? 'us-east-1';
const DRY_RUN = process.env.DRY_RUN === '1';

// Mapping table — keyed by Supabase email
const ROLE_MAP: Record<string, 'admin' | 'customer' | 'driver' | 'vendor'> = {
  'jm@techcloudpro.com': 'admin',
  'jeetnair.in@gmail.com': 'admin',
  'demo@zietra.com': 'admin',
  'gteshnair@gmail.com': 'admin',
};

const cog = new CognitoIdentityProviderClient({ region: REGION });
const pg = new PgClient({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }});
await pg.connect();

const { rows } = await pg.query(`
  SELECT id, email, raw_user_meta_data, created_at
  FROM auth.users
  WHERE email_confirmed_at IS NOT NULL
  ORDER BY created_at
`);

for (const r of rows) {
  const email = r.email.toLowerCase();
  const role = ROLE_MAP[email] ?? 'admin';
  if (DRY_RUN) { console.log('[dry-run]', email, '→', role); continue; }

  // Idempotency check
  try {
    await cog.send(new AdminGetUserCommand({ UserPoolId: POOL_ID, Username: email }));
    console.log('[skip-exists]', email);
    continue;
  } catch (e: any) {
    if (e.name !== 'UserNotFoundException') throw e;
  }

  await cog.send(new AdminCreateUserCommand({
    UserPoolId: POOL_ID,
    Username: email,
    MessageAction: 'SUPPRESS',  // don't email — we're migrating silently
    UserAttributes: [
      { Name: 'email', Value: email },
      { Name: 'email_verified', Value: 'true' },
      { Name: 'custom:role', Value: role },
      { Name: 'custom:supabase_sub', Value: r.id },  // forward link for audit
      { Name: 'name', Value: r.raw_user_meta_data?.name ?? '' },
    ],
  }));

  // Set a strong random permanent password — user logs in via magic-link, not password
  const tempPwd = crypto.randomBytes(32).toString('base64') + 'A1!';
  await cog.send(new AdminSetUserPasswordCommand({
    UserPoolId: POOL_ID,
    Username: email,
    Password: tempPwd,
    Permanent: true,
  }));

  await cog.send(new AdminAddUserToGroupCommand({
    UserPoolId: POOL_ID,
    Username: email,
    GroupName: role,
  }));
  console.log('[migrated]', email, '→', role);
}

await pg.end();
```

### Anti-Patterns to Avoid

- **Reusing the Supabase JWKS secret for Cognito.** Cognito uses RS256 with its own JWKS endpoint (`https://cognito-idp.us-east-1.amazonaws.com/<pool-id>/.well-known/jwks.json`); the existing `turion-satellite/production/supabase-jwt-secret-sWnNlr` secret holds Supabase's ES256 JWKS — completely different keys. Phase 40 fetches Cognito JWKS at cold start. **In Phase 39, do not modify the Supabase JWKS secret.**

- **Re-deriving SES SMTP credentials.** The existing `zietra/ses-smtp-credentials-RsRKSm` SMTP creds are for Supabase's custom SMTP integration. **The Cognito Custom Email Sender Lambda does NOT use SMTP — it calls the SES v2 SendEmail API via its IAM role.** Don't re-create the IAM user or rotate the SMTP key. Just give the new Lambda's role `ses:SendEmail` on `arn:aws:ses:us-east-1:134607809447:identity/zietra.com`.

- **Touching Lambda code.** `turion-satellite-api` and `turion-demo-api` source code MUST NOT change in Phase 39. The very last `./build-and-push.sh` for either Lambda happened on 2026-05-13 (Phase 38 closeout). If Phase 39 work touches `turion-space-demo/backend/src/`, **stop** — that's Phase 40.

- **Putting tenant_id on Cognito.** Locked: **single user pool**, `tenant_id` is a DB-level concern. Don't add a `custom:tenant_id` attribute yet (defer to M3 Phase 44). Stick to `email`, `name`, `custom:role`, `custom:supabase_sub` (audit forward-link).

- **Forgetting `email_verified=true` on migration.** If you AdminCreateUser without `email_verified=true`, Cognito will gate the user behind a confirmation step → magic-link won't work until they re-confirm. Always set it `true`; we already know Supabase verified them.

- **Forgetting `MessageAction: SUPPRESS`.** Without it, `AdminCreateUser` sends a Cognito invitation email (in our case, via the Custom Email Sender → SES). Users would get spammed with "your account was created" emails. SUPPRESS skips.

- **Lowercase mismatch.** Supabase stores email case-sensitively in some columns but treats it case-insensitively for lookups. Cognito with `UsernameAttributes: ['email']` ALSO normalizes username, but **the `email` attribute itself stays as-stored** — if you create a user with `Demo@Zietra.com`, the username becomes `demo@zietra.com` but the email attribute stays `Demo@Zietra.com`. Always `.toLowerCase()` BOTH the username and the email attribute value.

- **Hardcoding the user pool ID.** Rule 1. Read from env var / Secrets Manager. The migration script + the eventual Phase-40 Lambdas + the frontend all need `COGNITO_USER_POOL_ID` and `COGNITO_APP_CLIENT_ID`. Plan to write these into a new Secrets Manager secret `zietra/cognito-config` so Phase 40+ can read them like the existing JWKS secret pattern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Decrypt Cognito-encrypted code in the Custom Email Sender Lambda | Your own AES-GCM decryptor | `@aws-crypto/client-node` (AWS Encryption SDK) | Cognito uses the AWS Encryption SDK ciphertext format — not raw KMS Decrypt. Custom implementation will fail; the AWS SDK handles the envelope encryption + key derivation correctly. (Verified against AWS Cognito docs sample.) |
| Verify Cognito JWTs in Phase 40 | A custom JWKS fetcher + RS256 verifier | `aws-jwt-verify` (or the existing `jsonwebtoken` w/ a manual JWKS PEM load mirroring `turion-space-demo/backend/src/secrets.ts:13-17`) | Out of scope for Phase 39 but worth noting: the existing JWKS-to-PEM pattern at `secrets.ts:13-17` already works for Supabase ES256 — Phase 40 just extends it for Cognito RS256. |
| Send email via SMTP from the Lambda | `nodemailer` + SMTP creds | `@aws-sdk/client-sesv2.SendEmailCommand` | The Lambda already has an IAM role for `ses:SendEmail`. SMTP would require putting creds in env vars or Secrets Manager — adds attack surface for no benefit. |
| Bulk-import users | CSV import via `CreateUserImportJob` | Per-user `AdminCreateUser` in a script loop | 10 users (4 real). Bulk import requires generating a CSV with hashed passwords, uploading to S3, monitoring the job — overkill for 4 rows. |
| Generate magic-link nonce | A counter or timestamp | `crypto.randomBytes(32).toString('base64url')` | The challenge nonce must be unguessable. 32 bytes = 256 bits, base64url-safe in URLs. |
| Hash + cache JWKS | Custom cache layer | Cold-start load (existing `secrets.ts` pattern) | Lambda cold-start is ~100-300ms; JWKS rotation is rare; pull at cold start, hold in module scope. Same pattern as `turion-space-demo/backend/src/secrets.ts:21-42`. |

**Key insight:** Cognito's documented contracts (Custom Email Sender event shape, CUSTOM_AUTH flow, KMS encryption envelope) are non-negotiable. Building any of these from scratch will fail in subtle ways. Use the SDKs.

---

## Common Pitfalls

### Pitfall 1: Skipping the KMS CMK setup
**What goes wrong:** Calling `UpdateUserPool` with `LambdaConfig.CustomEmailSender` set but `LambdaConfig.KMSKeyID` empty → API returns `InvalidParameterException: KMS Key Id is required when using CustomEmailSender`.
**Why it happens:** Cognito needs the KMS key to encrypt the secret code before sending it to the Lambda. Without it, no Custom Sender config is accepted.
**How to avoid:** In the provisioning script, ALWAYS create the KMS CMK FIRST, attach the policy, THEN create the Lambda, THEN call `UpdateUserPool`. The bash script in Wave 1 must enforce this order.
**Warning signs:** `aws cognito-idp update-user-pool` returns a 400 on the first attempt despite the Lambda existing.

### Pitfall 2: KMS policy missing the EncryptionContext condition
**What goes wrong:** Cognito's `kms:CreateGrant` call fails because the policy didn't scope the grant to the specific user pool. Symptom: pool config succeeds but the Custom Sender Lambda gets an unencrypted-decrypt error at runtime.
**Why it happens:** Per [AWS docs](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-custom-sender-triggers.html#enable-custom-sender-lambda-trigger), the KMS policy MUST include `Condition: { StringEquals: { 'kms:EncryptionContext:userpool-id': '<pool-id>' }}` on the Cognito principal's `kms:CreateGrant` allow. Without it, the grant may be denied at invocation time.
**How to avoid:** Include the EncryptionContext condition in `cognito-kms-policy.json`. After `create-user-pool`, the script should re-write the policy with the actual pool ID (chicken-and-egg: policy needs pool ID, pool needs key; solution: create key with permissive policy first → create pool → update key policy with pool-id condition).
**Warning signs:** Custom Sender Lambda CloudWatch log shows `KMSInvalidStateException` or `AccessDenied` on `decrypt()`.

### Pitfall 3: SES sandbox blocks unverified recipients
**What goes wrong:** Magic-link emails sent to non-verified addresses (anything other than the 12 verified identities listed in `aws ses list-identities`) → SES returns `MessageRejected: Email address is not verified`. The Lambda still returns 200 to Cognito → Cognito thinks email sent → user is stuck.
**Why it happens:** SES is in SANDBOX (confirmed via `aws sesv2 get-account` → `ProductionAccessEnabled: false`). 200/day, 1/sec, verified recipients only.
**How to avoid:** Plan must include a "verify these recipient emails in SES" task as a USER-action or a tasks-action that verifies them via `aws ses verify-email-identity`. The 4 real users (`jm@techcloudpro.com`, `jeetnair.in@gmail.com`, `gteshnair@gmail.com`, `demo@zietra.com`) — **all 4 are already in `aws ses list-identities` output today** (verified live: `jm@techcloudpro.com`, `jeetnair.in@gmail.com`, `gteshnair@gmail.com` confirmed; `demo@zietra.com` is NOT in the list — needs verification). Add `demo@zietra.com` to SES before the smoke test.
**Warning signs:** SES `MessageRejected` errors in Lambda logs; user reports no email arrival.

### Pitfall 4: HTML-escaped temporary passwords
**What goes wrong:** When `triggerSource === 'CustomEmailSender_AdminCreateUser'`, the decrypted code is the user's **temporary password**, and Cognito HTML-escapes `<`, `>`, `&` before encrypting. If you put it directly in an email, users see `&lt;` instead of `<`.
**Why it happens:** Documented Cognito behavior (`/Users/jeet/.../user-pool-lambda-custom-sender-triggers.html` — "Amazon Cognito HTML-escapes reserved characters like < (&lt;) and > (&gt;) in your user's temporary password").
**How to avoid:** After decrypting, unescape with `code.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')` ONLY for `CustomEmailSender_AdminCreateUser`. Verification codes (6 digits) don't have this issue.
**Warning signs:** Users complain `<password>` looks like literal HTML in their email.

### Pitfall 5: `MessageAction: SUPPRESS` is silently ignored if you use the wrong API
**What goes wrong:** Using `SignUp` instead of `AdminCreateUser` → can't pass `MessageAction: SUPPRESS` → Cognito always sends a confirmation email.
**Why it happens:** `SignUp` is the public API (no admin creds needed); it doesn't support suppressing emails. `AdminCreateUser` is the admin API (requires IAM admin perms on Cognito) and supports suppression.
**How to avoid:** Migration script MUST use `AdminCreateUser`, not `SignUp`. The script runs locally with admin IAM creds → it has the right permissions.
**Warning signs:** Migration script triggers 4 unwanted emails to the real users.

### Pitfall 6: `email_verified` is a string, not a boolean
**What goes wrong:** Setting `{ Name: 'email_verified', Value: true }` → API returns `InvalidParameterException: Value must be a string`. Cognito attribute values are always strings.
**Why it happens:** Cognito's attribute schema uses `AttributeType: String` even for boolean-semantic attributes; values are serialized as `"true"`/`"false"`.
**How to avoid:** Always use `Value: 'true'` (string). Same for `phone_number_verified`.
**Warning signs:** `AdminCreateUser` fails with `InvalidParameterException`.

### Pitfall 7: Custom attributes must be declared in the schema BEFORE first use
**What goes wrong:** Migration script tries to set `custom:role` on the user → `InvalidParameterException: custom:role attribute does not exist`.
**Why it happens:** Custom attributes have to be added to the pool's schema at creation time (or via `add-custom-attributes`). You can't just set them on a user.
**How to avoid:** In `user-pool-config.json`, include the schema:
```json
{
  "Schema": [
    { "Name": "role", "AttributeDataType": "String", "Mutable": true, "Required": false,
      "StringAttributeConstraints": { "MinLength": "1", "MaxLength": "32" }},
    { "Name": "supabase_sub", "AttributeDataType": "String", "Mutable": false, "Required": false,
      "StringAttributeConstraints": { "MinLength": "36", "MaxLength": "36" }}
  ]
}
```
Note: `Name: "role"` → access as `custom:role` (Cognito prepends `custom:` automatically for non-standard attributes).
**Warning signs:** Migration first user fails with attribute-not-exists.

### Pitfall 8: App client's auth flow allow-list doesn't include CUSTOM_AUTH
**What goes wrong:** `aws cognito-idp admin-initiate-auth --auth-flow CUSTOM_AUTH` returns `InvalidParameterException: Cannot find configuration for CUSTOM_AUTH_FLOW`.
**Why it happens:** App client's `ExplicitAuthFlows` defaults to `ALLOW_REFRESH_TOKEN_AUTH` only. CUSTOM_AUTH must be opted in.
**How to avoid:** When creating the app client, set `ExplicitAuthFlows: ['ALLOW_ADMIN_USER_PASSWORD_AUTH', 'ALLOW_CUSTOM_AUTH', 'ALLOW_REFRESH_TOKEN_AUTH']`. (No `ALLOW_USER_SRP_AUTH` — we don't use passwords from the client.)
**Warning signs:** smoke-test `admin-initiate-auth` returns the cited error.

### Pitfall 9: Misreading the magic-link redirect URL
**What goes wrong:** Sending `https://turionspace.zietra.com/erp-auth-callback?token=...` but the existing callback handler at `erp-auth-callback.html` is hard-coded to extract Supabase's `access_token` from the URL hash (`#access_token=...`), not a `?token=...` query param.
**Why it happens:** Current callback is Supabase-specific.
**How to avoid:** Phase 39 doesn't need to wire the callback — that's Phase 40. But the email URL the Lambda generates must match the callback Phase 40 will build. Recommended: `https://turionspace.zietra.com/cognito-auth-callback?session=<base64(session_id)>&token=<nonce>&email=<urlencoded>`. Phase 40 will create the new callback page.
**Warning signs:** None in Phase 39 (the smoke test is CLI-only — `admin-initiate-auth` returns the session, tester manually calls `respond-to-auth-challenge` with the nonce).

### Pitfall 10: 10 Supabase users include 6 spam signups
**What goes wrong:** Migration script blindly migrates all 10 rows → spam users + their random names land in Cognito.
**Why it happens:** Supabase signup endpoint was public during the demo phase; bots filled it.
**How to avoid:** Filter `WHERE email_confirmed_at IS NOT NULL` in the SQL query. Only 5 rows pass (including `jeetnair.in+zietra-c8@gmail.com` which is a deprecated test alias — drop too). Final migration set: 4 rows (the table in §"Supabase Inventory").
**Warning signs:** Cognito ends up with 10 users instead of 4.

---

## Code Examples

### Provisioning: KMS key policy with EncryptionContext condition
```json
// infrastructure/cognito/cognito-kms-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EnableRootAccountManagement",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::134607809447:root" },
      "Action": "kms:*",
      "Resource": "*"
    },
    {
      "Sid": "AllowCognitoCreateGrant",
      "Effect": "Allow",
      "Principal": { "Service": "cognito-idp.amazonaws.com" },
      "Action": "kms:CreateGrant",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "kms:EncryptionContext:userpool-id": "<POOL_ID_AFTER_CREATE>"
        }
      }
    },
    {
      "Sid": "AllowLambdaDecrypt",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::134607809447:role/zietra-cognito-email-sender-role" },
      "Action": "kms:Decrypt",
      "Resource": "*"
    }
  ]
}
```

### Provisioning: Cognito user pool config
```json
// infrastructure/cognito/user-pool-config.json
{
  "PoolName": "zietra-platform-users",
  "Policies": {
    "PasswordPolicy": {
      "MinimumLength": 16,
      "RequireUppercase": true,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": true
    }
  },
  "DeletionProtection": "ACTIVE",
  "AutoVerifiedAttributes": ["email"],
  "UsernameAttributes": ["email"],
  "MfaConfiguration": "OFF",
  "UserAttributeUpdateSettings": {
    "AttributesRequireVerificationBeforeUpdate": ["email"]
  },
  "EmailConfiguration": {
    "EmailSendingAccount": "DEVELOPER",
    "From": "noreply@zietra.com",
    "SourceArn": "arn:aws:ses:us-east-1:134607809447:identity/zietra.com"
  },
  "Schema": [
    { "Name": "role", "AttributeDataType": "String", "Mutable": true, "Required": false,
      "StringAttributeConstraints": { "MinLength": "1", "MaxLength": "32" }},
    { "Name": "supabase_sub", "AttributeDataType": "String", "Mutable": false, "Required": false,
      "StringAttributeConstraints": { "MinLength": "36", "MaxLength": "36" }}
  ],
  "AdminCreateUserConfig": {
    "AllowAdminCreateUserOnly": false,
    "InviteMessageTemplate": {
      "EmailSubject": "Welcome to Zietra",
      "EmailMessage": "Your sign-in is ready. {####} (this is the temporary access code)."
    }
  },
  "AccountRecoverySetting": {
    "RecoveryMechanisms": [{ "Priority": 1, "Name": "verified_email" }]
  },
  "UserPoolTier": "ESSENTIALS"
}
```
**Note on `EmailConfiguration`:** Even though we're using a Custom Email Sender Lambda, the pool still needs a default `EmailConfiguration` for the rare case where the Lambda fails — Cognito falls back to default SES. Set `From: noreply@zietra.com` and `SourceArn` to the verified zietra.com identity.

### Provisioning: App client config
```bash
aws cognito-idp create-user-pool-client \
  --user-pool-id "$POOL_ID" \
  --client-name 'zietra-platform-web' \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_ADMIN_USER_PASSWORD_AUTH ALLOW_CUSTOM_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --refresh-token-validity 30 \
  --access-token-validity 60 \
  --id-token-validity 60 \
  --token-validity-units AccessToken=minutes,IdToken=minutes,RefreshToken=days \
  --prevent-user-existence-errors ENABLED \
  --enable-token-revocation \
  --region us-east-1
```
- `no-generate-secret` — web/SPA client (Cognito secrets aren't safe in browsers).
- `PreventUserExistenceErrors ENABLED` — security; both "user not found" and "wrong password" return generic error.
- `refresh-token-validity 30` days — matches Supabase default; users re-auth monthly.

### Lambda: define-auth-challenge.ts (CUSTOM_AUTH state machine)
```typescript
// lambdas/cognito-custom-email-sender/src/define-auth-challenge.ts
// CUSTOM_AUTH magic-link state machine — single round-trip.
export const handler = async (event: any) => {
  if (event.request.session.length === 0) {
    // First call — issue the custom challenge (Create-Auth-Challenge will send the email)
    event.response.challengeName = 'CUSTOM_CHALLENGE';
    event.response.failAuthentication = false;
    event.response.issueTokens = false;
  } else if (
    event.request.session.length === 1 &&
    event.request.session[0].challengeName === 'CUSTOM_CHALLENGE' &&
    event.request.session[0].challengeResult === true
  ) {
    // Nonce verified → issue tokens
    event.response.failAuthentication = false;
    event.response.issueTokens = true;
  } else {
    // Anything else (wrong nonce, replay, etc.) → fail
    event.response.failAuthentication = true;
    event.response.issueTokens = false;
  }
  return event;
};
```

### Lambda: create-auth-challenge.ts (issues magic-link)
```typescript
// lambdas/cognito-custom-email-sender/src/create-auth-challenge.ts
import crypto from 'crypto';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

const ses = new SESv2Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
const BASE_URL = process.env.MAGIC_LINK_BASE_URL!;  // Rule 1: env var

export const handler = async (event: any) => {
  if (event.request.challengeName !== 'CUSTOM_CHALLENGE') return event;
  if (event.request.session.length !== 0) return event;  // already past round 1

  const nonce = crypto.randomBytes(32).toString('base64url');
  const email = event.request.userAttributes.email;
  const url = `${BASE_URL}/cognito-auth-callback?token=${nonce}`;

  await ses.send(new SendEmailCommand({
    FromEmailAddress: 'noreply@zietra.com',
    Destination: { ToAddresses: [email] },
    Content: { Simple: {
      Subject: { Data: 'Sign in to Zietra' },
      Body: { Html: { Data: `<p>Click to sign in:</p><p><a href="${url}">${url}</a></p><p>Expires in 15 minutes.</p>` }},
    }},
  }));

  event.response.publicChallengeParameters = { email };
  event.response.privateChallengeParameters = { answer: nonce };
  event.response.challengeMetadata = 'MAGIC_LINK';
  return event;
};
```

### Lambda: verify-auth-challenge.ts
```typescript
// lambdas/cognito-custom-email-sender/src/verify-auth-challenge.ts
export const handler = async (event: any) => {
  event.response.answerCorrect =
    event.request.challengeAnswer === event.request.privateChallengeParameters.answer;
  return event;
};
```

### Smoke test: admin-initiate-auth + respond-to-auth-challenge
```bash
# After migration, verify Cognito auth works end-to-end for one user.
POOL_ID=$(aws cognito-idp list-user-pools --max-results 60 --region us-east-1 \
  --query "UserPools[?Name=='zietra-platform-users'].Id" --output text)
CLIENT_ID=$(aws cognito-idp list-user-pool-clients --user-pool-id "$POOL_ID" --region us-east-1 \
  --query "UserPoolClients[?ClientName=='zietra-platform-web'].ClientId" --output text)

# Step 1: Initiate CUSTOM_AUTH — this triggers Create-Auth-Challenge Lambda → email lands
INIT=$(aws cognito-idp admin-initiate-auth \
  --user-pool-id "$POOL_ID" --client-id "$CLIENT_ID" \
  --auth-flow CUSTOM_AUTH \
  --auth-parameters USERNAME=jm@techcloudpro.com \
  --region us-east-1)
echo "$INIT" | jq .
SESSION=$(echo "$INIT" | jq -r .Session)

# Step 2: User clicks email link, extracts token, then:
# (For the smoke test, fetch the nonce from CloudWatch logs of the create-auth-challenge Lambda
# OR temporarily log it to a known place. Production: token comes from URL click.)
NONCE='<paste from email URL>'

aws cognito-idp admin-respond-to-auth-challenge \
  --user-pool-id "$POOL_ID" --client-id "$CLIENT_ID" \
  --challenge-name CUSTOM_CHALLENGE \
  --session "$SESSION" \
  --challenge-responses USERNAME=jm@techcloudpro.com,ANSWER="$NONCE" \
  --region us-east-1
# Expected: AuthenticationResult.IdToken / AccessToken / RefreshToken
```

---

## JWT Claim Mapping (for Phase 40 — documented here)

The current Supabase JWT → what `turion-space-demo/backend/src/middleware/auth.ts:31-38` reads:

| Supabase JWT claim | Lambda reads as | Today's value (verified) | Cognito equivalent |
|--------------------|-----------------|--------------------------|--------------------|
| `sub` | `payload.sub` (user UUID) | All real users have it | `sub` (Cognito user UUID — NEW, different from Supabase sub) |
| `email` | (not read currently) | All users | `email` |
| `app_metadata.role` | `payload.app_metadata.role` | **MISSING for all users** | `cognito:groups[0]` OR `custom:role` |
| `user_metadata.role` | `payload.user_metadata.role` (fallback) | **MISSING for all users** | (same — both populated) |
| `user_metadata.vendor_id` | `payload.user_metadata.vendor_id` | MISSING | `custom:vendor_id` (defer — no users have it today) |
| `exp` | (default JWT verify) | Standard | `exp` (Cognito sets to client's `access-token-validity`) |
| `iss` | (not read currently) | `https://lbpkbpfwdpnwlccmlfxn.supabase.co/auth/v1` | `https://cognito-idp.us-east-1.amazonaws.com/<pool-id>` |
| `aud` | (not read currently) | `authenticated` | `<client-id>` |

**Phase 40 mapping in middleware:**
```typescript
// Phase 40 will need this — documented here for the planner.
function getRoleFromCognitoJwt(payload: any): string {
  if (Array.isArray(payload['cognito:groups']) && payload['cognito:groups'][0]) {
    return payload['cognito:groups'][0];
  }
  if (typeof payload['custom:role'] === 'string') {
    return payload['custom:role'];
  }
  return 'unknown';
}
```

**Critical Phase-39 implication:** Because the existing Supabase JWTs DON'T have a role, the Phase 38 `requireRole()` middleware (`turion-space-demo/backend/src/middleware/auth.ts:64-76`) is currently a no-op (any authenticated user passes). Phase 40 will start enforcing roles — but Phase 39 must ensure the migrated Cognito users HAVE roles, otherwise Phase 40 breaks `requireRole`. This is why we populate both `cognito:groups` AND `custom:role` for every migrated user in the script.

---

## Supabase Inventory (verified live, 2026-05-14)

Live query via `node` + `pg` against `postgres.lbpkbpfwdpnwlccmlfxn@aws-1-us-east-2.pooler.supabase.com:6543/postgres` (DATABASE_URL from `turion-demo-api` Lambda env var):

**Total:** 10 rows in `auth.users`.

**Real (confirmed) — MIGRATE these 4:**
| email | sub (Supabase) | created_at | last_sign_in_at | raw_user_meta_data |
|-------|----------------|------------|-----------------|---------------------|
| `demo@zietra.com` | `2919d215-e3c2-4dcf-b14f-00f020b20665` | 2026-04-18 | 2026-05-07 | `{"name":"Demo User","email_verified":true}` |
| `gteshnair@gmail.com` | `b1ddd626-2d1e-4bba-8f75-8e74c742ca7c` | 2026-04-18 | null | `{"name":"Gtesh Nair","email_verified":true}` |
| `jm@techcloudpro.com` | `21235658-909d-48c0-97c3-24edc5a822cd` | 2026-05-10 | 2026-05-14 | `{"sub":"21235658-...","email":"jm@techcloudpro.com","email_verified":true}` |
| `jeetnair.in@gmail.com` | `76d9f93b-b1fb-467a-870a-5b8fa3a66c2d` | 2026-05-10 | 2026-05-10 | `{"sub":"76d9f93b-...","email":"jeetnair.in@gmail.com","email_verified":true}` |

**Confirmed but deprecated test alias — DROP (don't migrate):**
| email | reason |
|-------|--------|
| `jeetnair.in+zietra-c8@gmail.com` | gmail `+` alias, used for one-off test; no longer in use. Confirm with user before dropping; otherwise migrate as `customer` role. |

**Spam signups (NOT confirmed, no last_sign_in) — DO NOT migrate:**
| email | created_at |
|-------|------------|
| `be.rohi.y.ed.o.6.20@gmail.com` | 2026-04-19 |
| `k.opa.go.va.d.a.12@gmail.com` | 2026-04-26 |
| `up.u.yu.x.o.z.e514@gmail.com` | 2026-04-28 |
| `l.a.p.onev.e.ze.0.4@gmail.com` | 2026-04-28 |
| `gawiv.ac.o.va.q.i.44@gmail.com` | 2026-05-11 |

**Critical finding:** **No row has a `role` in either `raw_app_meta_data` or `raw_user_meta_data`.** All `raw_app_meta_data` values are `{"provider":"email","providers":["email"]}` (Supabase default). The existing `auth.ts:31` role-reading code returns `"unknown"` for every user today. Migration must explicitly assign roles.

**SES verified identities (live):** `jm@techcloudpro.com`, `jeetnair.in@gmail.com`, `gteshnair@gmail.com` — confirmed in `aws ses list-identities` output. `demo@zietra.com` is **NOT** verified — must run `aws ses verify-email-identity --email-address demo@zietra.com --region us-east-1` (sends a click-to-verify email; demo account holder confirms). Add this as a task in Plan 1.

---

## Migration Strategy (Live Cutover — Recommended)

Per CONTEXT.md §"Migration strategy" — live cutover is the right call given 4 users. Steps:

1. **Pre-check:** SES verify `demo@zietra.com`. Confirm `jeetnair.in+zietra-c8@gmail.com` disposition with user (drop vs. migrate).
2. **Provision:** Wave 1 stands up the pool + KMS + Lambdas.
3. **Dry-run:** Run migration script with `DRY_RUN=1` → prints what it would do, exit 0.
4. **Migrate:** Run migration script for real → 4 `AdminCreateUser` calls succeed, 4 `AdminSetUserPassword` calls succeed, 4 `AdminAddUserToGroup` calls succeed.
5. **Idempotency check:** Re-run script → all 4 print `[skip-exists]`, exit 0.
6. **Smoke test:** `admin-initiate-auth` for `jm@techcloudpro.com` → returns session → wait for email → extract nonce from email → `respond-to-auth-challenge` → returns `AuthenticationResult` with all 3 tokens.

**Rollback plan:** If migration fails:
- Cognito users are NEW rows in a NEW system — Supabase `auth.users` is untouched (we read it, never write).
- `aws cognito-idp delete-user --user-pool-id <id> --username <email>` removes individual users.
- `aws cognito-idp delete-user-pool --user-pool-id <id>` wipes the whole pool (no recovery — re-run provisioning).
- KMS CMK can be `aws kms schedule-key-deletion --key-id <id> --pending-window-in-days 7` (minimum 7-day window; cheaper to re-use).

**What NOT to do during rollback:** Don't touch Supabase `auth.users`. Don't redeploy the Lambdas. Don't change the Supabase JWT secret. The Turion demo continues working off Supabase Auth throughout — that's the whole point of keeping Phase 39 infrastructure-only.

---

## SES Sandbox Handling

Verified live: `aws sesv2 get-account` → `ProductionAccessEnabled: false`, `Max24HourSend: 200`, `MaxSendRate: 1.0/sec`. The 200/day quota is fine for Phase 39 testing (1 magic-link per smoke test).

**Required verifications before Wave 3 smoke test:**
- ✅ `jm@techcloudpro.com` — already verified
- ✅ `jeetnair.in@gmail.com` — already verified
- ✅ `gteshnair@gmail.com` — already verified
- ❌ `demo@zietra.com` — **NOT verified** — task in Plan 1 must run `aws ses verify-email-identity --email-address demo@zietra.com` (the demo@ inbox holder must click the verification link)

**SES production-access task:** This is an open USER-action follow-up (`#19` in task list per STATE.md:13) — not a blocker for Phase 39. The smoke test only needs ONE recipient to verify the chain end-to-end; the 4 already-verified emails cover that.

---

## Cost Estimate

| Resource | Pricing | Phase-39 monthly | Notes |
|---|---|---|---|
| Cognito User Pool (Essentials tier) | $0 for first 10,000 MAU | $0 | 4 real users; free tier covers M1 entirely |
| KMS CMK | $1/month + $0.03 per 10K requests | $1 | One key, low request volume |
| Lambda (Custom Email Sender + 3 challenge fns) | $0.20 per 1M requests + compute | $0 | Few invocations per month; free tier covers it |
| SES | $0.10 per 1K emails (after 62K/mo free w/ EC2/Lambda) | $0 | Free tier easily covers our volume |
| CloudWatch logs | $0.50/GB ingested | <$0.10 | Trivial |
| **Total Phase-39 marginal cost:** | | **~$1/mo** | Almost entirely the KMS CMK |

---

## Smoke Test Plan (the CognitoAuthCheckpoint requirement)

**Goal:** Prove `aws cognito-idp admin-initiate-auth` works for one migrated user AND a magic-link email lands in their SES-verified inbox. **No Lambda code change.**

**Pre-conditions:**
- All Wave-1 resources exist (pool, app client, KMS, 4 Lambdas)
- Migration script ran successfully → 4 users in Cognito (`aws cognito-idp list-users` shows them)
- `jm@techcloudpro.com` is in SES verified identities

**Test steps:**
1. `aws cognito-idp admin-initiate-auth --user-pool-id <id> --client-id <id> --auth-flow CUSTOM_AUTH --auth-parameters USERNAME=jm@techcloudpro.com` → expect `Session` returned in response
2. Verify email landed in `jm@techcloudpro.com` inbox (manual user step — researcher can't automate)
3. Extract nonce from email URL OR from Create-Auth-Challenge Lambda CloudWatch log
4. `aws cognito-idp admin-respond-to-auth-challenge --user-pool-id <id> --client-id <id> --challenge-name CUSTOM_CHALLENGE --session <session> --challenge-responses USERNAME=jm@techcloudpro.com,ANSWER=<nonce>` → expect `AuthenticationResult` with 3 tokens
5. Decode `IdToken` (`jwt.io` or `python -c 'import jwt; print(jwt.decode(...))'`) → verify it has `email`, `cognito:groups: ['admin']`, `custom:role: 'admin'`, `iss: https://cognito-idp.us-east-1.amazonaws.com/<pool-id>`

**Pass criteria:** All 5 steps return expected output. Write outcome to `.planning/phases/39-.../CHECKPOINT.md`.

**Also verify (regression):** `curl https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/health` returns `{db:ok}` (proves the Turion ERP demo Lambda untouched — Phase 38 still works). `curl -H 'Authorization: Bearer <forged-jwt>' https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/data/all` returns 401 (proves Phase 38 auth gate still works).

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Cognito Hosted UI | SDK-driven flows + Custom Email Sender Lambda | Deferred to future | Hosted UI is fine for 2-minute MVP demos; we have full control with SDK + Custom Sender. Hosted UI needs ACM cert + custom domain that we don't have today. |
| `EmailSendingAccount: COGNITO_DEFAULT` (limited to 50/day, plain-text) | `EmailSendingAccount: DEVELOPER` + Custom Email Sender Lambda | 2020+ | Required for production-scale email with branding. |
| 6-digit OTP emails | Magic-link URL via CUSTOM_AUTH | Designed in Phase 39 | UX preference; both equally secure when nonce is high-entropy. |
| Bulk CSV import via `CreateUserImportJob` | Script-driven `AdminCreateUser` loop | Scale-dependent | <1000 users → script; >1000 → CSV import. We have 4. |
| User pool per tenant | Single pool + `tenant_id` in DB | Locked in CONTEXT | Cheaper, simpler, works for our scale (we're a startup, not Salesforce). |

**Deprecated/outdated:**
- `auth.ts:31-38` role-reading from `app_metadata.role ?? user_metadata.role` — currently returns `"unknown"` for every user because Supabase data has no role. **NOT outdated code per se** — just a feature waiting for data. Phase 39 migration populates `custom:role` so the Phase-40 equivalent Cognito middleware will have a real value to read.

---

## Open Questions

1. **`jeetnair.in+zietra-c8@gmail.com` — migrate or drop?**
   - What we know: confirmed Supabase user, last sign-in 2026-04-27, gmail `+` alias of `jeetnair.in@gmail.com`.
   - What's unclear: whether user wants this preserved as a separate Cognito user or considers it a deprecated test alias.
   - Recommendation: Plan 1 asks user; default to "drop" (not migrate). Planner can note as a user-confirmation checkpoint.

2. **`demo@zietra.com` SES verification — automated or manual?**
   - What we know: `demo@zietra.com` is NOT in SES verified identities today.
   - What's unclear: whether the demo@ inbox is monitored by someone who can click the verification link.
   - Recommendation: `aws ses verify-email-identity --email-address demo@zietra.com` sends a verification email. **Phase 39 Plan 1 should run this CLI call**; the user (jm@) needs to access the demo@ inbox to click the link. List as USER-action follow-up.

3. **CloudFormation vs. bash script for provisioning?**
   - What we know: Repo has no IaC tooling today; `turion-satellite/scripts/provision-aws.sh:1-46` is the established pattern.
   - What's unclear: whether the user wants to adopt CloudFormation/CDK now or defer.
   - Recommendation: Bash script for Phase 39 (mirrors existing pattern, fast iteration). Promote to CloudFormation in M5 when we're provisioning per-tenant resources.

4. **Where do the Cognito pool ID + client ID get stored for Phase 40 to read?**
   - What we know: Phase 38 stored Supabase JWKS in `turion-satellite/production/supabase-jwt-secret-sWnNlr`.
   - What's unclear: Same pattern for Cognito, or environment variables on the Lambda?
   - Recommendation: Create a new Secrets Manager secret `zietra/cognito-config` with `{user_pool_id, app_client_id, region}`. Plan 4 (smoke test) writes this secret. Phase 40 reads it via the existing `secrets.ts:21-42` cold-start pattern.

5. **Where does the magic-link callback URL point?**
   - What we know: Today, Phase 38's `erp-auth-callback.html` exists at `https://turionspace.zietra.com/erp-auth-callback` and handles Supabase magic-link callbacks via URL hash.
   - What's unclear: Whether to add a new `cognito-auth-callback.html` (Phase 40 work) or reuse the existing one (overload it for both providers).
   - Recommendation: Phase 39 hardcodes `MAGIC_LINK_BASE_URL=https://turionspace.zietra.com` env var on the Lambda; URL path `/cognito-auth-callback?token=<nonce>`. Phase 40 builds the new page. **For Phase 39 smoke test**, we don't need a working callback page — we extract the nonce from CloudWatch logs and use it via CLI.

---

## Wave Structure (Recommended for the Planner)

### Wave 1 — Infrastructure (parallel-safe, 2 plans)
**Plan 39-01:** KMS CMK + Cognito user pool + app client + 4 Cognito Groups via idempotent bash script `infrastructure/cognito/provision-cognito.sh`. Writes pool ID + client ID into Secrets Manager `zietra/cognito-config`. Verifies `demo@zietra.com` in SES.
**Plan 39-02:** Custom Email Sender Lambda + Define/Create/Verify-Auth-Challenge Lambdas + email templates + zietra-cognito-email-sender-role IAM role + `cognito-idp.amazonaws.com` invoke permission grants. Deploys via `lambdas/cognito-custom-email-sender/deploy.sh`. After both 39-01 + 39-02 land: a follow-on shell step calls `aws cognito-idp update-user-pool --lambda-config ...` to wire the 4 Lambdas into the pool (CustomEmailSender + Define/Create/Verify challenge).

**Why parallel-safe:** 39-01 creates only Cognito + KMS + Secrets; 39-02 creates only Lambdas + IAM. They share no resource. The "wire them together" step at the end of Wave 1 is a 3-line bash call.

### Wave 2 — Migration (sequential, depends on Wave 1, 1 plan)
**Plan 39-03:** `backend/scripts/migrate-supabase-users-to-cognito.ts` — queries Supabase auth.users (filter confirmed only), maps to Cognito, runs DRY_RUN=1 first, then real, then re-runs to verify idempotency. Confirms with `aws cognito-idp list-users --user-pool-id` showing 4 users.

### Wave 3 — Smoke test (sequential, depends on Wave 2, 1 plan)
**Plan 39-04:** Smoke test per §"Smoke Test Plan". Manual user step (click email). Write outcome to `CHECKPOINT.md`. Verify Phase 38 regression intact. Update STATE.md + ROADMAP.md.

**Total:** 4 plans, 3 waves.

---

## Phase 40/41 implications (for the planner to be aware of, NOT to plan)

- **Phase 40 will need:** Cognito JWKS PEM fetched at cold start in `secrets.ts`; dual-issuer JWT verify in `auth.ts` (try Cognito RS256 first, fall back to Supabase ES256); new shared `cognitoAuth.js` frontend helper; new `cognito-auth-callback.html` page that calls `RespondToAuthChallenge` with the token from the URL.
- **Phase 41 will need:** Delete `migrate-supabase-users-to-cognito.ts` (Rule 5); remove `supabase-js` from `index.html`; remove `erp-auth.js` references; archive Supabase auth.users (optional — Supabase project stays for the DB until M2).

---

## Sources

### Primary (HIGH confidence)
- AWS docs · [Custom email sender Lambda trigger](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-custom-email-sender.html) — full event shape, KMS encryption envelope, code example
- AWS docs · [Custom sender Lambda triggers (activation)](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-custom-sender-triggers.html) — KMS policy, Cognito permission grant pattern
- AWS docs · [Custom authentication challenge Lambda triggers](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-challenge.html) — CUSTOM_AUTH flow + Define/Create/Verify pattern
- AWS docs · [Create Auth challenge Lambda trigger](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-create-auth-challenge.html) — publicChallengeParameters/privateChallengeParameters contract
- `aws cognito-idp create-user-pool --generate-cli-skeleton` — verified LambdaConfig structure live
- `aws sesv2 get-account` — verified SES sandbox state live
- `aws ses list-identities` — verified email verifications live
- Supabase `auth.users` table — queried live via `pg` + `node` from `turion-space-demo/backend/`
- `/Users/jeet/turion-space-demo/backend/src/middleware/auth.ts:1-77` — current auth pattern (the Supabase-shaped JWT verifier Phase 40 extends)
- `/Users/jeet/turion-space-demo/backend/src/secrets.ts:1-42` — JWKS-to-PEM cold-start pattern (Phase 40 mirrors for Cognito)
- `/Users/jeet/turion-satellite/scripts/provision-aws.sh:1-46` — bash provisioning style to mirror
- `/Users/jeet/turion-space-demo/scripts/generate-turion-config.sh:1-34` — config-from-Secrets-Manager pattern for the eventual frontend Cognito config
- `/Users/jeet/.claude/handoffs/2026-05-14-zietra-platform-milestone-kickoff.md` — kickoff handover w/ AWS state
- `/Users/jeet/doordash-p2p/.planning/ROADMAP.md:620-660` — Phase 39/40/41 scoping

### Secondary (MEDIUM confidence)
- None — all sources above are HIGH (live verification or official docs)

### Tertiary (LOW confidence)
- None used

---

## Metadata

**Confidence breakdown:**
- Cognito user pool spec: HIGH — verified against CLI skeleton + official docs
- Custom Email Sender Lambda + KMS contract: HIGH — official AWS code example + activation procedure
- CUSTOM_AUTH magic-link flow: HIGH — combined two official docs (Custom-Auth + Create-Auth-Challenge) into a verified pattern
- Supabase user inventory: HIGH — queried DB live
- SES sandbox state: HIGH — verified live
- AWS resources already provisioned: HIGH — verified live (account, secrets, identities, sandbox state, Lambda config, existing pool list)
- Migration script: HIGH — well-trodden `AdminCreateUser`+`AdminSetUserPassword`+`AdminAddUserToGroup` pattern
- Rollback plan: HIGH — Cognito + KMS are independent of Supabase; deletion is straightforward
- JWT claim mapping: HIGH — verified Supabase JWTs lack role today; Cognito Groups vs custom attribute well-documented

**Research date:** 2026-05-14
**Valid until:** 2026-07-14 (Cognito API is stable; Custom Email Sender introduced 2020 and largely unchanged. Re-check if Cognito announces breaking changes; AWS announces 90-day deprecation notices.)

---

## RESEARCH COMPLETE

**Phase:** 39 - M1 — Cognito user pool + SES integration + migrate users from Supabase Auth
**Confidence:** HIGH

### Key Findings
1. **4 real Supabase users to migrate** (not 10 — 6 are spam signups, filterable by `email_confirmed_at IS NOT NULL`). The 4 are `demo@zietra.com`, `gteshnair@gmail.com`, `jm@techcloudpro.com`, `jeetnair.in@gmail.com`. `jeetnair.in+zietra-c8@gmail.com` is a 5th edge case — confirm-or-drop with user.
2. **No `role` exists on any Supabase user today.** The current `requireRole()` gate at `auth.ts:64-76` is a no-op. Migration script must explicitly assign roles (default: all 4 as `admin`) via Cognito Groups + `custom:role` attribute.
3. **Magic-link UX preservation requires CUSTOM_AUTH flow + a Create-Auth-Challenge Lambda that sends its own email via SES.** Cognito's Custom Email Sender Lambda only handles built-in code-based flows (signup confirmation, password reset, AdminCreateUser invite, MFA codes) — those still go through CES for the migration's "AdminCreateUser silent invite" path (suppressed via `MessageAction: SUPPRESS`) and any future password resets. The CES Lambda needs `@aws-crypto/client-node` to decrypt Cognito's KMS-encrypted code.
4. **KMS CMK is mandatory** for the Custom Email Sender — Cognito rejects `LambdaConfig.CustomEmailSender` without `LambdaConfig.KMSKeyID`. Policy must include both `Service: cognito-idp.amazonaws.com` with `kms:CreateGrant` (conditioned on `EncryptionContext:userpool-id`) AND the Lambda role with `kms:Decrypt`.
5. **`demo@zietra.com` is NOT verified in SES** — must `aws ses verify-email-identity` before smoke test passes; verification is a user-click action.
6. **Phase 39 is purely AWS infrastructure + a one-shot script** — zero Lambda code change, zero frontend change. The Turion Thursday demo keeps using Supabase Auth verbatim.

### File Created
`/Users/jeet/doordash-p2p/.planning/phases/39-m1-cognito-user-pool-ses-integration-migrate-users-from-supabase-auth/39-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard stack | HIGH | All sources verified live or against official AWS docs |
| Architecture (CUSTOM_AUTH + CES) | HIGH | Combined two AWS official patterns; both are documented and stable |
| Migration strategy | HIGH | 4 users; AdminCreateUser pattern is well-trodden |
| Pitfalls | HIGH | Sourced from official docs, including Cognito-specific gotchas (HTML escape, attribute schema timing, `email_verified` string-not-boolean, KMS EncryptionContext condition) |
| Cost estimate | HIGH | At our scale (4 MAU) Cognito is free tier; KMS is the only marginal cost |

### Open Questions (forwarded to planner)
1. Migrate `jeetnair.in+zietra-c8@gmail.com` or drop? (Recommend drop, ask user.)
2. `demo@zietra.com` SES verification — automated CLI + user inbox click is the standard path; flag as a USER-action item.
3. Where to store Cognito pool ID + client ID for Phase 40 to read? (Recommend: new `zietra/cognito-config` Secrets Manager secret.)
4. Magic-link callback URL — Phase 39 hardcodes `MAGIC_LINK_BASE_URL` env var; Phase 40 builds the actual callback page.

### Ready for Planning
Research complete. Planner can break into 4 plans across 3 waves (1 + 1 in Wave 1, 1 in Wave 2, 1 in Wave 3).
