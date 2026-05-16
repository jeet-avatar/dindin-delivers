---
phase: 60-real-cad-support-step-stl-upload-3d-viewer-drawing-markup
plan: 01
subsystem: cad-substrate
tags: [cad, s3, presigned-url, sha256, rls, postgres, aurora, lambda, iam, audit-log, multi-tenant]

requires:
  - phase: 55-m3-multi-tenancy-rls-tenant-isolation
    provides: "withTenantClient + tenantContext + requireRole multi-tenant fabric; zietra-rls-runner-55-05 one-shot Lambda for in-VPC DDL"
  - phase: 35-part-revisions-and-cad-editing
    provides: "turion_satellite migration chain at 022 (part_revisions + retire/restore + audit_log CHECK)"
provides:
  - "turion_satellite.part_cad_files table (RLS+FORCE, 12 cols, UNIQUE(part_id, sha256), 2 indexes)"
  - "audit_log.action CHECK widened with 4 cad_* actions"
  - "S3 bucket zietra-cad-files-134607809447 (AES256 SSE + versioned + 5-yr lifecycle + 4-flag BPA + CORS for *.zietra.com)"
  - "IAM policy cad-bucket-rw inline on existing zietra-api-lambda-role (NO new role)"
  - "CAD_BUCKET env var on turion-satellite-api Lambda"
  - "5 backend routes: POST /presign, POST /commit, GET /, GET /:fid/url, DELETE /:fid"
  - "Browser CAD upload UI on satellite/part.html (file picker + client-side SHA-256 + presigned PUT + commit)"

affects:
  - 60-02-cad-viewer
  - 60-03-cad-markup
  - 60-04-cad-pdf-generation

tech-stack:
  added:
    - "@aws-sdk/s3-request-presigner@^3.1048.0 (browser-bound presigned-URL minting)"
    - "@aws-sdk/client-s3 aligned to ^3.1048.0 (resolves S3Client handler-class type mismatch with presigner)"
    - "mime-types@^3.0.2"
  patterns:
    - "Direct-to-S3 browser upload via presigned PUT (bypasses APIGW 6 MB cap) — pattern reusable for any large-object route"
    - "Content-addressable S3 keys: <tenant_id>/<part_id>/<sha256>.<ext> — same bytes uploaded twice = same key = S3-level idempotency"
    - "S3 ChecksumSHA256 binding in presigned URL: server signature locks the body hash; browser MUST send matching x-amz-checksum-sha256 header"
    - "Commit-time HEAD verification: server confirms S3 ContentLength matches client claim before INSERTing the DB row (defense against partial-upload race)"
    - "Audit log emitted INSIDE withTenantClient txn so a failure rolls back BOTH the data row and the audit row atomically"
    - "Per-route role gate (requireRole('admin','manager')) on mutations only — list/get-URL routes are tenant-scoped but role-agnostic"

key-files:
  created:
    - /Users/jeet/turion-satellite/migrations/023_part_cad_files.sql
    - /Users/jeet/turion-satellite/backend/src/lib/s3-presigner.ts
    - /Users/jeet/turion-satellite/backend/src/lib/file-validator.ts
    - /Users/jeet/turion-satellite/backend/src/lib/cad-audit.ts
    - /Users/jeet/turion-satellite/backend/src/routes/cad-files.ts
    - /Users/jeet/turion-space-demo/satellite/cad-upload.js
  modified:
    - /Users/jeet/turion-satellite/backend/src/routes/parts.ts
    - /Users/jeet/turion-satellite/backend/package.json
    - /Users/jeet/turion-satellite/backend/package-lock.json
    - /Users/jeet/turion-space-demo/satellite/part.html

key-decisions:
  - "Used SSE-AES256 (S3-managed) NOT KMS — no existing zietra prod CMK exists to reuse (alias/zietra-cognito-email-sender is Cognito-only). Sibling bucket turion-satellite-files also uses AES256, matching convention. Plan said 'reuse the zietra prod KMS key (do NOT create a new CMK)' — since none exists, AES256 is the right call (Rule 3 deviation, blocking)."
  - "Used existing role zietra_app (NOT zietra_app_user) for the RLS policy grant — verified live role list. Plan stub used a role name that doesn't exist in this DB."
  - "Used existing master secret rds!cluster-16d5e38c...-mhV473 (NOT rds!cluster-8dac9fc2...-VbuP4h from plan) — the latter is the legacy cluster's secret; current prod cluster is zietra-aurora-prod-v2."
  - "cad-audit.ts inserts via actor_user_id column (NOT uploaded_by_cognito_sub) — the satellite audit_log schema has actor_user_id (uuid) + actor_email (text); the cognito_sub-named column lives on part_cad_files only."
  - "Aligned @aws-sdk/client-s3 from 3.600 → 3.1048 to match s3-request-presigner — running mixed versions caused tsc errors on S3Client argument type to getSignedUrl()."

patterns-established:
  - "Phase 55-05 one-shot Lambda runner (zietra-rls-runner-55-05) re-used for in-VPC migration apply + read-only schema inspection — pattern is the only path to Aurora since the RDS Proxy SG is locked to 10.0.10.0/24 + 10.0.11.0/24 internal CIDRs"
  - "Smoke pattern when JWT minting is blocked: prove (a) routes mounted by curl auth-gate response, (b) DB-side INSERT under SET app.tenant_id via runner Lambda, (c) S3 PUT/HEAD via aws CLI (caller IAM identity sufficient) — the only piece the autonomous executor can't run is the full client-credentialed presign→PUT→commit roundtrip"

requirements-completed:
  - CadFilesTable
  - CadStorageBucket
  - CadFileUploadEndpoint
  - CadAuditLog

# Metrics
duration: 1h 17min
completed: 2026-05-16
---

# Phase 60 Plan 01: Real CAD Support — upload + storage substrate Summary

**Upload substrate for STEP/STL/IGES/DWG/SLDPRT/3DPDF files: RLS-isolated `part_cad_files` table on Aurora, versioned S3 bucket with SHA-256 binding, 5 RBAC-gated routes (presign / commit / list / get-URL / delete) on the satellite Lambda, and a browser file-picker that hashes client-side then PUTs direct to S3.**

## Performance

- **Duration:** ~1h 17min
- **Started:** 2026-05-16T08:30:00Z (approx)
- **Completed:** 2026-05-16T09:47:36Z
- **Tasks:** 2 (autonomous, no checkpoints)
- **Files created:** 6
- **Files modified:** 4
- **Git commits:** 4 (3 in turion-satellite + 1 in turion-space-demo)

## Accomplishments

### Task 1 — Migration 023 + S3 bucket + IAM + Lambda env

- **Migration `023_part_cad_files.sql`** authored (91 lines) and applied to Aurora `zietra-aurora-prod-v2` via the Phase 55-05 one-shot runner Lambda (`zietra-rls-runner-55-05`). Single transaction; idempotent re-run safe.
  - New table `turion_satellite.part_cad_files` (12 cols): `id`, `part_id` (FK ON DELETE CASCADE → `part_definitions`), `tenant_id`, `format` (CHECK whitelist 10 fmts), `s3_key`, `sha256`, `file_size` (CHECK ≤ 100 MB), `filename`, `uploaded_by_cognito_sub`, `uploaded_at`, `is_active`, `revision`, `UNIQUE(part_id, sha256)` (S3-level content-addressable idempotency).
  - 2 indexes: `idx_part_cad_files_tenant_part_active(tenant_id, part_id, is_active)`, `idx_part_cad_files_uploaded_at(uploaded_at DESC)`.
  - RLS ENABLE + FORCE + policy `part_cad_files_tenant_isolation FOR ALL TO zietra_app USING (tenant_id = current_setting('app.tenant_id', true)::uuid)` WITH CHECK same.
  - `GRANT SELECT, INSERT, UPDATE, DELETE` to both `zietra_app` and `zietra_admin_bypass`.
  - `audit_log.action` CHECK constraint widened to add 4 cad_* actions (the 18 existing values from Phase 35 preserved verbatim).
  - **Verification** (via runner Lambda):
    - columns: `id,part_id,tenant_id,format,s3_key,sha256,file_size,filename,uploaded_by_cognito_sub,uploaded_at,is_active,revision`
    - rls/force: `true / true`
    - policies: `part_cad_files_tenant_isolation`
    - indexes: `part_cad_files_pkey,part_cad_files_part_id_sha256_key,idx_part_cad_files_tenant_part_active,idx_part_cad_files_uploaded_at`
    - audit CHECK: includes all 4 cad_* actions
- **S3 bucket `zietra-cad-files-134607809447`** provisioned in `us-east-1` with all 4 security configs:
  - **Block Public Access:** `BlockPublicAcls=true, IgnorePublicAcls=true, BlockPublicPolicy=true, RestrictPublicBuckets=true`
  - **Encryption:** SSE-AES256 with `BucketKeyEnabled=true` (NOT KMS — see Decisions; no zietra prod CMK exists to reuse)
  - **Versioning:** Enabled (required for the `NoncurrentVersionExpiration` lifecycle rule)
  - **CORS:** AllowedOrigins=`https://turionspace.zietra.com` + `https://*.zietra.com`, Methods=`GET,PUT,HEAD`, AllowedHeaders=`*`, ExposeHeaders=`ETag,x-amz-version-id`, MaxAgeSeconds=3600
  - **Lifecycle:** rule `cad-files-ia-then-expire` — transition to `STANDARD_IA` after 30 days, expire non-current versions after 1825 days (5 yr)
- **IAM:** inline policy `cad-bucket-rw` attached to existing role `zietra-api-lambda-role` (NO new role). Grants `s3:PutObject,GetObject,HeadObject,DeleteObject` on `arn:aws:s3:::zietra-cad-files-134607809447/*` + `s3:ListBucket` on the bucket ARN. Single principal extension per Phase 59-01 Pitfall 11.
- **Lambda env:** `CAD_BUCKET=zietra-cad-files-134607809447` added to `turion-satellite-api` (merged with existing 3 env vars). Verified via `aws lambda get-function-configuration --query 'Environment.Variables.CAD_BUCKET'`.

### Task 2 — Backend lib + routes + frontend + redeploy + smoke

- **3 new lib files** at `backend/src/lib/`:
  - `s3-presigner.ts` (50 lines): `presignPut(opts)` mints a 5-min PUT URL with `ChecksumSHA256` (base64 of hex sha256) bound into the signature + `ContentLength` + Metadata; `presignGet(key, ttl=900)` mints a 15-min GET URL; `headObject(key)` for commit-time size verification. `CAD_BUCKET` env required at first call.
  - `file-validator.ts` (40 lines): `validateUploadShape(body)` — discriminated-union result. Enforces filename 1-500 chars, file_size > 0 AND ≤ 100 MB, sha256 = 64 hex chars, format ∈ {step,stp,stl,iges,igs,brep,dwg,sldprt,3dpdf,pdf}.
  - `cad-audit.ts` (35 lines): `cadAudit(req, client, action, partId, payload)` — typed union of 4 `CadAction` values; INSERTs into `turion_satellite.audit_log` with `entity_type='part_cad_file'`, `entity_id=partId`, `actor_user_id=req.user.id`, `tenant_id=current_setting('app.tenant_id')::uuid`. Wraps in try/catch + console.warn (matches existing parts.ts `auditPart` pattern).
- **New route file** `backend/src/routes/cad-files.ts` (175 lines) with 5 endpoints; mounted via `partsRouter.use('/:id/cad-files', cadFilesRouter)` in `parts.ts` BEFORE the catch-all `GET /:id` to avoid shadowing.
  - `POST /presign` (admin/manager): validates shape → builds key `<tenant_id>/<part_id>/<sha256>.<ext>` → mints 5-min PUT URL → audits `cad_upload_presigned` → returns `{url, key, expires_in}`. Logs only `partId, format, file_size, sha256_prefix` — NEVER the URL (Pitfall 4).
  - `POST /commit` (admin/manager): HEAD S3 (404 if missing, 409 if size mismatch) → in single txn: deactivate prior `is_active=true` rows for this part, compute `nextRev = max(prev.revision)+1`, INSERT new row, audit `cad_upload_commit` → returns `{id, revision, uploaded_at}` 201. Handles 23505 (sha256 collision) → 409 duplicate.
  - `GET /` (any role): list all revisions for the part ordered by revision DESC.
  - `GET /:fileId/url` (any role): 404 if not found, else mint 15-min GET URL → returns `{url, format, expires_in}`.
  - `DELETE /:fileId` (admin/manager): soft-delete (`is_active=false`) + audit `cad_file_deactivate` → 204.
- **`parts.ts` modified**: imports `cadFilesRouter` and mounts at `/:id/cad-files` before existing routes.
- **New frontend module** `satellite/cad-upload.js` (130 lines): `mountCadUpload(panelEl, partId)` API. On file pick: (1) extension whitelist check + 100 MB size check, (2) `crypto.subtle.digest('SHA-256', arrayBuffer)` → 64-hex string with UI 'Hashing…' state, (3) `satelliteApi.post('/presign', {…})` → gets `{url, key}`, (4) `XMLHttpRequest PUT` to the presigned URL with `x-amz-checksum-sha256: base64(hex)` header + `upload.onprogress` driving 'Uploading X%…' UI, (5) `satelliteApi.post('/commit', {…})` → server confirms + INSERTs, (6) refresh revision-history list. Zero hardcoded API base (uses `window.satelliteApi` which reads `SATELLITE_CONFIG.API_BASE`).
- **`part.html` modified**: added `<section id="cadUploadPanel">` with file input + progress div + revision-history `<ul>`. Mounted via `<script type="module">` after DOMContentLoaded.
- **Lambda redeploy:** `cd /Users/jeet/turion-satellite && ./build-and-push.sh` → arm64 Docker image → ECR push → `update-function-code`. New CodeSha256: `2a8f36f1014e9bb55a4bf42f8180965f817b48e46660eabd3d25de0802576611`. `LastUpdateStatus=Successful` at `2026-05-16T09:43:50Z`.
- **Frontend deploy:** `cd /Users/jeet/turion-space-demo && ./deploy-frontend.sh` → S3 sync (4 changed objects: `cad-upload.js`, `part.html`, `satellite-config.js`, `turion-config.js`) → CloudFront invalidation `I2XFC3ASIFMNBDF67UW8CBBH8T`.
- **Smoke proofs** (multi-pronged because client JWT minting is operator-gated):
  - Routes mounted: `curl … /api/parts/<id>/cad-files` with `X-Tenant-Slug: turion` but no auth → `HTTP 401 {"error":"Invalid or expired token"}`. With no `X-Tenant-Slug` → `HTTP 400 {"error":"Missing X-Tenant-Slug header"}`. Both responses prove the route hit the auth/tenant middleware chain (route is registered).
  - DB-side RLS: via the runner Lambda — SET `app.tenant_id` = turion's uuid (`00000000-0000-0000-0000-000000000001`), INSERT into `part_cad_files` succeeded, INSERT into `audit_log` with `cad_upload_commit` action succeeded (proves CHECK widen works), `SELECT count(*)` returned 1/1, cleanup `DELETE` removed both rows (no test data leaked).
  - S3 path: via `aws s3api put-object … --checksum-algorithm SHA256` — PUT returned `ETag` + `ChecksumSHA256: ZdGh1bXn7lHq/tlb4vsGBm7HO/nR1/J3rj4/ZUnRna8=` + `ServerSideEncryption: AES256` + `VersionId`. HEAD returned `ContentLength: 10240` + `Metadata: {uploaded-by, tenant-id, part-id}`. Cleanup `aws s3 rm` removed the test object.
  - CloudWatch URL-leak audit: `aws logs filter-log-events --filter-pattern 'X-Amz-Signature'` → zero matches (Pitfall 4 honoured).

## Task Commits

1. **Task 1: migration 023 + S3 + IAM + Lambda env** → `8fa189c` (feat) in turion-satellite
2. **Task 2 backend: 5 routes + lib + parts.ts mount + npm align** → `6bedc49` (feat) in turion-satellite
3. **Task 2 frontend: cad-upload.js + part.html** → `ce001cd` (feat) in turion-space-demo
4. **Task 2 deploy marker: CodeSha256 record** → `59ef4a9` (chore) in turion-satellite

All commits pushed via `jm@techcloudpro.com` to `github.com/jeet-avatar/turion-satellite` and `github.com/jeet-avatar/turion-space-demo` respectively.

## Files Created/Modified

**Created:**
- `/Users/jeet/turion-satellite/migrations/023_part_cad_files.sql` (91 lines) — table + 2 indexes + RLS + policy + audit CHECK widen
- `/Users/jeet/turion-satellite/backend/src/lib/s3-presigner.ts` (50 lines) — presignPut/Get/headObject
- `/Users/jeet/turion-satellite/backend/src/lib/file-validator.ts` (40 lines) — validateUploadShape
- `/Users/jeet/turion-satellite/backend/src/lib/cad-audit.ts` (35 lines) — cadAudit wrapper
- `/Users/jeet/turion-satellite/backend/src/routes/cad-files.ts` (175 lines) — 5 routes
- `/Users/jeet/turion-space-demo/satellite/cad-upload.js` (130 lines) — file picker + sha256 + PUT + commit

**Modified:**
- `/Users/jeet/turion-satellite/backend/src/routes/parts.ts` — mounted cadFilesRouter at /:id/cad-files
- `/Users/jeet/turion-satellite/backend/package.json` — added s3-request-presigner + mime-types; aligned client-s3 to ^3.1048.0
- `/Users/jeet/turion-satellite/backend/package-lock.json` — npm resolutions
- `/Users/jeet/turion-space-demo/satellite/part.html` — added #cadUploadPanel + module-script mount

## Decisions Made

1. **AES256 instead of KMS SSE.** Plan said "reuse zietra prod KMS CMK; do NOT create a new one". Reality: the only zietra KMS alias is `alias/zietra-cognito-email-sender` (Cognito-bound, not for app data). Sibling bucket `turion-satellite-files` uses AES256. AES256 is fine for tenant-scoped CAD blobs already protected by IAM, RLS, and presigned-URL signatures. Avoiding KMS also dodges the `kms:GenerateDataKey`/`kms:Decrypt` IAM grant on the Lambda role and removes a per-call KMS API cost.
2. **`zietra_app` role (not `zietra_app_user`).** The plan's RLS grant template used `TO zietra_app_user`, but the live role list (`SELECT rolname FROM pg_roles WHERE rolname LIKE 'zietra%'`) returned `zietra_admin_bypass, zietra_admin, zietra_app`. Granted to the real role.
3. **Master secret `rds!cluster-16d5e38c…-mhV473`.** Plan referenced `rds!cluster-8dac9fc2…-VbuP4h` (the LEGACY `zietra-aurora-prod` cluster). Current prod is `zietra-aurora-prod-v2` whose secret has a different ARN; used the correct one.
4. **Audit `actor_user_id` column.** Plan's `cad-audit.ts` stub referenced an `uploaded_by_cognito_sub` column on `audit_log` that doesn't exist. The satellite `audit_log` schema is: `id, entity_type, entity_id, action, payload, actor_user_id (uuid), actor_email (text), created_at, tenant_id (uuid)`. The `uploaded_by_cognito_sub` column lives on `part_cad_files` only.
5. **AWS SDK alignment.** Existing `@aws-sdk/client-s3@^3.600.0` + new `@aws-sdk/s3-request-presigner@^3.1048.0` produced TypeScript handler-class mismatch (two `S3Client` types with separately declared private `handlers`). Upgraded `client-s3` and `s3-presigned-post` to `^3.1048.0`. No runtime regression — all 3 packages now share the same `Client` base class.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] No zietra prod KMS CMK exists to reuse**
- **Found during:** Task 1 Step C (S3 bucket provisioning)
- **Issue:** Plan said "Look up existing prod KMS key (reuse — NEVER create new CMK for this)" with `aws kms list-aliases --query "Aliases[?contains(AliasName,'zietra')]"`. The only match is `alias/zietra-cognito-email-sender`, a Cognito-bound CMK that is NOT appropriate for general app data. No `zietra-prod` or `zietra-aurora` CMK exists. The sibling bucket `turion-satellite-files` uses AES256.
- **Fix:** Used SSE-AES256 with BucketKeyEnabled=true. Removed KMS perms from the IAM `cad-bucket-rw` policy.
- **Files modified:** none extra (plan's IAM block was adapted in place).
- **Verification:** `aws s3api get-bucket-encryption` returns `SSEAlgorithm: AES256, BucketKeyEnabled: true`. PUT smoke succeeded with no KMS interaction.
- **Committed in:** `8fa189c` (Task 1)

**2. [Rule 3 — Blocking] Plan's RLS GRANT to non-existent role `zietra_app_user`**
- **Found during:** Task 1 Step B (writing migration 023)
- **Issue:** Plan template said `FOR ALL TO zietra_app_user`. Live `pg_roles` query showed only `zietra_admin_bypass`, `zietra_admin`, `zietra_app` exist.
- **Fix:** Migration uses `FOR ALL TO zietra_app` + explicit GRANTs to both `zietra_app` (RLS-enforced) and `zietra_admin_bypass` (cross-tenant SELECT for admin scripts).
- **Files modified:** `/Users/jeet/turion-satellite/migrations/023_part_cad_files.sql`
- **Verification:** Migration applied cleanly; verification query shows policy attached to `part_cad_files`.
- **Committed in:** `8fa189c` (Task 1)

**3. [Rule 3 — Blocking] Plan referenced wrong RDS master secret ARN**
- **Found during:** Task 1 Step B (applying migration)
- **Issue:** Plan's psql block used `rds!cluster-8dac9fc2…-VbuP4h` (legacy `zietra-aurora-prod` cluster). Connection failed at password check: "The password that was provided for the role zietra_admin is wrong."
- **Fix:** Queried `aws rds describe-db-clusters --db-cluster-identifier zietra-aurora-prod-v2 --query 'DBClusters[].MasterUserSecret'` → ARN `rds!cluster-16d5e38c-2fc2-4d06-8435-e4b01704bf74-mhV473`. Reused throughout.
- **Files modified:** none (operational only)
- **Verification:** Migration applied; inspection queries returned expected schema.
- **Committed in:** `8fa189c` (Task 1)

**4. [Rule 1 — Bug] Plan's cad-audit.ts stub referenced wrong column name**
- **Found during:** Task 2 Step D (writing cad-audit.ts)
- **Issue:** Plan's INSERT was `INSERT INTO turion_satellite.audit_log (action, entity_type, entity_id, actor_cognito_sub, payload) VALUES …` — `actor_cognito_sub` doesn't exist on this table. Schema is `actor_user_id (uuid), actor_email (text)`.
- **Fix:** Rewrote INSERT to use `actor_user_id` (matches the existing `parts.ts:auditPart` pattern) and added `tenant_id = current_setting('app.tenant_id')::uuid` so RLS doesn't block.
- **Files modified:** `/Users/jeet/turion-satellite/backend/src/lib/cad-audit.ts`
- **Verification:** Smoke INSERT via runner Lambda succeeded; row was queryable and deletable.
- **Committed in:** `6bedc49` (Task 2 backend)

**5. [Rule 3 — Blocking] AWS SDK type mismatch between client-s3 3.600 and presigner 3.1048**
- **Found during:** Task 2 Step B (tsc --noEmit after authoring s3-presigner.ts)
- **Issue:** Mixed SDK majors produced two distinct `S3Client` types with separately-declared private fields; tsc rejected `getSignedUrl(s3, cmd)` calls.
- **Fix:** `npm install --save @aws-sdk/client-s3@^3.1048.0 @aws-sdk/s3-presigned-post@^3.1048.0` aligned all SDK packages.
- **Files modified:** `package.json`, `package-lock.json`
- **Verification:** `npx tsc --noEmit` exited clean. Lambda redeploy + smoke also pass.
- **Committed in:** `6bedc49` (Task 2 backend)

**6. [Rule 2 — Missing Critical] Enabled S3 bucket versioning**
- **Found during:** Task 1 Step C (lifecycle config)
- **Issue:** Plan's lifecycle rule uses `NoncurrentVersionExpiration` which requires bucket versioning to be enabled; plan did not turn it on.
- **Fix:** `aws s3api put-bucket-versioning --bucket … --versioning-configuration Status=Enabled` before applying lifecycle.
- **Files modified:** none extra (bucket config only)
- **Verification:** PUT smoke returned a `VersionId`.
- **Committed in:** `8fa189c` (Task 1)

---

**Total deviations:** 6 auto-fixed (3 blocking — Rule 3, 2 bug/correction — Rules 1+2, 1 missing critical — Rule 2)
**Impact on plan:** All six were correctness fixes against plan stubs that were generated from RESEARCH notes without verifying the live schema/AWS state. None expanded scope. The core deliverables (5 routes, 1 table, 1 bucket, 1 IAM extension, 1 env var, 1 UI panel) all landed exactly as specified.

## Issues Encountered

- **Live presign→PUT→commit smoke is operator-gated.** The autonomous executor cannot mint a Cognito ID token for an admin user (Cognito SRP requires the user's password, which is not in any secret reachable to the executor). The full roundtrip smoke (browser file → server presign → S3 PUT → server commit → DB row) requires either an operator with admin credentials or a future fixture that uses Cognito `admin-initiate-auth` with a service-account password stored in Secrets Manager. **Substitute smoke** (route-mount auth gate via curl + RLS INSERT via runner Lambda + S3 PUT via aws CLI + CloudWatch URL-leak audit) covered every layer the executor can reach. The remaining gap is the JWT-bound browser smoke, which is a 2-minute manual test once an operator with admin creds logs into https://turionspace.zietra.com/satellite/parts.html and picks a STEP file.

## Authentication Gates

- **Cognito JWT for live smoke** — operator action required to verify the full presign→PUT→commit roundtrip end-to-end with a real ID token. Substitute smoke (above) covered every infrastructure layer independently.

## User Setup Required

None — Phase 60-01 added zero new external services. AWS Secrets Manager is the only secret-store (already in use); no new env vars on developer machines.

## Next Phase Readiness

- **Plan 60-02 (3D viewers — STEP/STL via OCCT.wasm + Three.js)** is unblocked. The `GET /:fid/url` endpoint mints presigned GET URLs the viewer needs; the `part_cad_files.format` discriminator tells the viewer which loader to use.
- **Plan 60-03 (Fabric.js markup overlay + part_drawing_markups table)** is unblocked. Migration 024 (per RESEARCH §I) will FK `part_drawing_markups.part_cad_file_id` → `part_cad_files.id`; the substrate is in place.
- **Plan 60-04 (async PDF generation via Sparticuz Chromium Lambda)** is unblocked. The CHECK constraint already includes `cad_pdf_generate`; the IAM `cad-bucket-rw` policy lets the PDF Lambda PUT/GET on the same bucket.

## Self-Check: PASSED

- [x] `/Users/jeet/turion-satellite/migrations/023_part_cad_files.sql` exists (91 lines)
- [x] `/Users/jeet/turion-satellite/backend/src/lib/s3-presigner.ts` exists (50 lines)
- [x] `/Users/jeet/turion-satellite/backend/src/lib/file-validator.ts` exists (40 lines)
- [x] `/Users/jeet/turion-satellite/backend/src/lib/cad-audit.ts` exists (35 lines)
- [x] `/Users/jeet/turion-satellite/backend/src/routes/cad-files.ts` exists (175 lines)
- [x] `/Users/jeet/turion-satellite/backend/src/routes/parts.ts` contains `cad-files` import + mount
- [x] `/Users/jeet/turion-space-demo/satellite/cad-upload.js` exists (130 lines, contains `crypto.subtle.digest`)
- [x] `/Users/jeet/turion-space-demo/satellite/part.html` contains `cadUploadPanel`
- [x] Commit `8fa189c` exists in turion-satellite (Task 1)
- [x] Commit `6bedc49` exists in turion-satellite (Task 2 backend)
- [x] Commit `ce001cd` exists in turion-space-demo (Task 2 frontend)
- [x] Commit `59ef4a9` exists in turion-satellite (deploy marker)
- [x] S3 bucket `zietra-cad-files-134607809447` exists with AES256 + CORS + lifecycle + BPA
- [x] IAM `cad-bucket-rw` attached to `zietra-api-lambda-role`
- [x] Lambda env `CAD_BUCKET=zietra-cad-files-134607809447`
- [x] Lambda CodeSha256 = `2a8f36f1014e9bb55a4bf42f8180965f817b48e46660eabd3d25de0802576611`
- [x] CloudFront invalidation `I2XFC3ASIFMNBDF67UW8CBBH8T` created
- [x] Curl auth-gate smoke 401/400 confirmed
- [x] DB RLS INSERT smoke (CAD + audit row) confirmed via runner Lambda

---
*Phase: 60-real-cad-support-step-stl-upload-3d-viewer-drawing-markup*
*Completed: 2026-05-16*
