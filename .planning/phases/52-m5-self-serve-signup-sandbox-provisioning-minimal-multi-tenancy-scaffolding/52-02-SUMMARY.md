---
phase: 52-m5-self-serve-signup-sandbox-provisioning-minimal-multi-tenancy-scaffolding
plan: 02
subsystem: zietra-platform
tags: [zietra, signup, cognito, multi-tenancy, ses, iam, lambda, backend, m5]
dependency_graph:
  requires:
    - turion-demo-api Lambda (Phase 41 — Cognito-only auth)
    - zietra-api-lambda-role IAM role w/ secrets read (Phase 41)
    - Cognito user pool us-east-1_KQuNS85nP + customer Group (Phase 39)
    - Phase 39 Create-Auth-Challenge Lambda (CUSTOM_AUTH → SES SendEmail)
    - public.tenants + public.tenant_features tables (Phase 52-01 mig 024)
  provides:
    - POST /api/tenants/signup public endpoint
    - lib/ses-send.ts (kept narrow for Phase 53/54 trial-ending-soon emails)
    - getCognitoUserPoolId() export in secrets.ts
    - IAM inline policy zietra-signup-cognito-ses on zietra-api-lambda-role
  affects:
    - backend/src/app.ts (one router mount line + import)
    - backend/package.json (+1 dep: @aws-sdk/client-cognito-identity-provider)
tech_stack:
  added:
    - "@aws-sdk/client-cognito-identity-provider@^3.1046.0"
  patterns:
    - "Atomic 4-stage transaction with rollback path (Cognito create → DB INSERT → InitiateAuth → respond)"
    - "Public route mounted BEFORE requireAuth-guarded routes — pattern is per-route requireAuth in this codebase"
    - "Cognito MessageAction: SUPPRESS + AdminInitiateAuth CUSTOM_AUTH = single welcome email via Phase 39 magic-link path"
key_files:
  created:
    - /Users/jeet/turion-space-demo/backend/src/routes/tenants.ts
    - /Users/jeet/turion-space-demo/backend/src/lib/ses-send.ts
    - /tmp/zietra-signup-cognito-ses.json (IAM policy doc)
  modified:
    - /Users/jeet/turion-space-demo/backend/src/app.ts
    - /Users/jeet/turion-space-demo/backend/src/secrets.ts
    - /Users/jeet/turion-space-demo/backend/package.json
    - /Users/jeet/turion-space-demo/backend/package-lock.json
decisions:
  - "Welcome email path = AdminInitiateAuth CUSTOM_AUTH (single-click magic-link via Phase 39's Create-Auth-Challenge Lambda) — NOT a separate SES SendEmail. Eliminates one code path, reuses tested SES nonce flow."
  - "AdminAddUserToGroup customer runs BEFORE AdminInitiateAuth — ensures the IdToken cognito:groups claim is populated when the user clicks the welcome link."
  - "ses-send.ts helper kept narrow (~30 lines) for Phase 53/54 trial-ending-soon emails, even though signup itself doesn't call it."
  - "Cognito-only dep — restored exact same package that was deleted in 41-04 (it had only been used by the deleted Supabase migration script)."
metrics:
  duration_sec: 304
  tasks: 3
  files_created: 2
  files_modified: 4
  commits: 3
  completed_at: "2026-05-14T18:01:24Z"
---

# Phase 52 Plan 02: Backend signup endpoint + IAM grants + deploy Summary

Atomic `POST /api/tenants/signup` (Cognito user create → tenants + 13 tenant_features INSERT in single DB transaction → AdminInitiateAuth CUSTOM_AUTH welcome magic-link) shipped to turion-demo-api Lambda with full rollback path, IAM grants, and 6/6 smoke passing.

---

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Re-add Cognito SDK + export pool ID + SES helper + IAM | `7c8d875` | package.json, package-lock.json, secrets.ts, lib/ses-send.ts |
| 2 | routes/tenants.ts + mount publicly in app.ts | `d8b8992` | routes/tenants.ts, app.ts |
| 3 | Rebuild dist/ + deploy via build-and-push.sh + smoke | `52d6fd3` | dist/app.js, dist/secrets.js, dist/lib/ses-send.js, dist/routes/tenants.js |

All commits pushed to `github.com/jeet-avatar/turion-space-demo` main `52d6fd3`.

---

## Deploy

| Field | Value |
|---|---|
| Lambda | `turion-demo-api` |
| **Pre-deploy CodeSha256** | `e48f53324f4d83df52e6a055315bd615b04c094570c3858c31bef76da59ddf21` |
| **Post-deploy CodeSha256** | `70f2a2bf7c5d05bdc862a1debac9ce09c7e51639c52edc5546148aca6b4e18c9` |
| LastUpdateStatus | `Successful` |
| Architecture | arm64 |
| Method | `./build-and-push.sh` (npm run build → docker arm64 → ECR push → aws lambda update-function-code → wait) |
| Image URI | `134607809447.dkr.ecr.us-east-1.amazonaws.com/turion-demo-api:latest` |

---

## IAM grant

**Inline policy:** `zietra-signup-cognito-ses` on `zietra-api-lambda-role`

```
$ aws iam get-role-policy --role-name zietra-api-lambda-role \
    --policy-name zietra-signup-cognito-ses \
    --query 'PolicyDocument.Statement[].Sid' --output text
AllowCognitoAdminForSignup	AllowSesSendForWelcome
```

| Sid | Effect | Actions | Resource |
|---|---|---|---|
| `AllowCognitoAdminForSignup` | Allow | AdminCreateUser, AdminSetUserPassword, AdminAddUserToGroup, AdminDeleteUser, AdminGetUser, AdminInitiateAuth | `arn:aws:cognito-idp:us-east-1:134607809447:userpool/us-east-1_KQuNS85nP` |
| `AllowSesSendForWelcome` | Allow | ses:SendEmail, ses:SendRawEmail | `arn:aws:ses:us-east-1:134607809447:identity/zietra.com`, `…/identity/noreply@zietra.com` |

Two separate Sids = easy revoke per resource.

---

## Smoke transcript (6/6 pass — all unauthenticated)

API: `https://lo254mvukl.execute-api.us-east-1.amazonaws.com`

| # | Request | Expected | Actual | Body |
|---|---|---|---|---|
| 1 | `POST /api/tenants/signup {}` | 400 | **400** | `{"error":"Valid email required"}` |
| 2 | `POST /api/tenants/signup {email:"not-an-email", …}` | 400 | **400** | `{"error":"Valid email required"}` |
| 3 | `POST /api/tenants/signup {…, slug:"X"}` | 400 | **400** | `{"error":"Slug must be 3-32 chars, lowercase letters/digits/hyphens"}` |
| 4 | `POST /api/tenants/signup {…, slug:"admin"}` | 409 | **409** | `{"error":"Slug is reserved"}` |
| 5 | `GET /api/health` | 200 | **200** | (Phase 38/41 regression intact) |
| 6 | `GET /api/data/all` (no Authorization) | 401 | **401** | (Phase 41 auth still gates protected routes) |

**Bonus boundary smoke (3/3 pass):**

| Request | Expected | Actual | Body |
|---|---|---|---|
| `slug:"turion"` | 409 | **409** | `{"error":"Slug is reserved"}` |
| `slug:"-bad"` | 400 | **400** | `{"error":"Slug cannot start/end with hyphen or contain \"--\""}` |
| `slug:"bad--co"` | 400 | **400** | `{"error":"Slug cannot start/end with hyphen or contain \"--\""}` |

**Critical:** Empty-body POST returns **400, not 401** — proves the endpoint is mounted as a PUBLIC route (no auth gate).

---

## CloudWatch verification

| Filter | Result |
|---|---|
| `"Cognito JWKS loaded"` (cold-start) | 1 line (issuer=`https://cognito-idp.us-east-1.amazonaws.com/us-east-1_KQuNS85nP`, 2 keys) |
| `"[signup] Cognito create failed"` | 0 lines |
| `"[signup] DB transaction failed"` | 0 lines |
| `"[signup] welcome magic-link InitiateAuth failed"` | 0 lines |
| Lambda init duration | ~300ms cold, ~3ms warm |
| Memory used | 126 MB / 1024 MB |

---

## app.ts mount ordering (proves PUBLIC mount)

```
$ python3 << 'PY'
import re
src = open('/Users/jeet/turion-space-demo/backend/src/app.ts').read()
t = re.search(r"app\.use\('/api/tenants'", src)
a = re.search(r"app\.(get|post|put|delete|use)\([^)]*requireAuth", src)
print('tenants mount byte:', t.start())            # 947
print('first requireAuth middleware byte:', a.start())  # 5486
PY
tenants mount byte: 947
first requireAuth middleware byte: 5486
```

`/api/tenants` is mounted at byte 947 in app.ts — BEFORE the first `requireAuth` middleware use at byte 5486 (`/api/activity` endpoint). Confirms public allowlist.

---

## Resolved dependency version

```
$ node -p "require('/Users/jeet/turion-space-demo/backend/package.json').dependencies['@aws-sdk/client-cognito-identity-provider']"
^3.1046.0
```

Rule-3 auto-fix: RESEARCH said pin to `^3.1045.0` (match the other AWS SDK packages); npm resolved the caret-pin to the slightly newer `3.1046.0` patch. Semver `^3.1045.0` allows `>=3.1045.0 <4.0.0`, so the install is compatible — leaving as-is rather than forcing a patch-level downgrade.

---

## Atomic signup transaction (live code shape)

1. Validate `{email, name, organization_name, slug}` (regex + boundary + reserved list)
2. Pre-flight `SELECT 1 FROM public.tenants WHERE slug = $1` → 409 if taken
3. Cognito: `AdminCreateUser` (SUPPRESS, email_verified=true, custom:role=customer) → `AdminSetUserPassword` (Permanent, 24-byte random base64url + `A1!`) → `AdminAddUserToGroup customer`
4. DB transaction: `BEGIN` → `INSERT INTO public.tenants … RETURNING id` → 13× `INSERT INTO public.tenant_features` → `COMMIT`
5. Cognito: `AdminInitiateAuth CUSTOM_AUTH` (best-effort — `console.warn` on failure, still return 200)
6. Respond: `{ ok: true, tenant: { id, slug, name }, message: "Check your inbox at <email> to sign in." }`

**Rollback paths:**
- Step 3 fails (UsernameExistsException): 409 "Email already registered" (no DB or Cognito state to undo)
- Step 3 fails (other Cognito error): 500 "Signup failed" (no DB state to undo)
- Step 4 fails: `client.query('ROLLBACK')` + `AdminDeleteUser` Cognito user → 500
- Step 5 fails: best-effort — log warn, still return 200 (welcome email re-sendable from login page)

---

## Deviations from Plan

### Rule-3 auto-fix

**Cognito SDK patch version drift** — Plan/RESEARCH wanted `^3.1045.0` (match siblings). `npm install @aws-sdk/client-cognito-identity-provider@^3.1045.0` resolved to `^3.1046.0` (newer patch released since the sibling packages were installed). Semver-compatible (`^3.1045.0` allows `>=3.1045.0 <4.0.0`). Left as-is.

### None other

Plan executed exactly as written. No additional bugs found, no architectural decisions needed.

---

## Self-Check

```bash
# Created files exist
[ -f /Users/jeet/turion-space-demo/backend/src/routes/tenants.ts ] && echo FOUND  # FOUND
[ -f /Users/jeet/turion-space-demo/backend/src/lib/ses-send.ts ] && echo FOUND  # FOUND

# Modified files exist
[ -f /Users/jeet/turion-space-demo/backend/src/app.ts ] && echo FOUND  # FOUND
[ -f /Users/jeet/turion-space-demo/backend/src/secrets.ts ] && echo FOUND  # FOUND

# Commits exist
cd /Users/jeet/turion-space-demo && \
  git log --oneline | grep -q "7c8d875" && \
  git log --oneline | grep -q "d8b8992" && \
  git log --oneline | grep -q "52d6fd3" && echo "ALL 3 COMMITS PRESENT"

# IAM policy attached
aws iam get-role-policy --role-name zietra-api-lambda-role \
  --policy-name zietra-signup-cognito-ses \
  --query 'PolicyDocument.Statement[].Sid' --output text
# → AllowCognitoAdminForSignup	AllowSesSendForWelcome

# Lambda new CodeSha
aws lambda get-function-configuration --function-name turion-demo-api \
  --query 'CodeSha256' --output text
# → 70f2a2bf7c5d05bdc862a1debac9ce09c7e51639c52edc5546148aca6b4e18c9
```

## Self-Check: PASSED

All files exist, all commits pushed, IAM policy attached, Lambda new CodeSha256 active, 6/6 smoke pass.
