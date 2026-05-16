# Requirements: Dollor.ai v1.5 Production Readiness

**Defined:** 2026-02-26
**Core Value:** Drivers keep 100% of delivery fees and tips

## v1.5 Requirements

Requirements for production readiness milestone. Each maps to roadmap phases.

### SSL Pinning Rotation

- [x] **SSL-01**: iOS NetworkSecurity.swift migrated from leaf+intermediate pins to Amazon Root CA SPKI pins
- [x] **SSL-02**: New iOS builds uploaded to TestFlight with corrected SSL pins
- [x] **SSL-03**: CloudWatch alarm configured for ACM certificate DaysToExpiry metric on dollor.ai
- [x] **SSL-04**: SSL pinning rotation runbook documented with step-by-step procedures

### Play Store Publishing

- [ ] **PLAY-01**: Google Play Developer account created and verified (organization type)
- [x] **PLAY-02**: AAB release bundles built and signed for all 3 Android apps
- [ ] **PLAY-03**: Play App Signing configured with existing keystore as upload key
- [x] **PLAY-04**: Data Safety forms completed for all 3 apps (SDK data audit included)
- [ ] **PLAY-05**: Content rating (IARC) and CSAE compliance questionnaires completed for all 3 apps
- [x] **PLAY-06**: Store listing assets created (screenshots, feature graphics, descriptions) for all 3 apps
- [ ] **PLAY-07**: All 3 apps submitted for review and published on Google Play Store

### DB Password Rotation

- [x] **DBROT-01**: AWS Secrets Manager rotation Lambda enabled for RDS PostgreSQL (30-day cycle)
- [x] **DBROT-02**: ECS force-redeployment triggered after each rotation to refresh credentials
- [x] **DBROT-03**: Full rotation cycle validated on staging environment before production
- [x] **DBROT-04**: Production rotation enabled after staging validation passes
- [x] **DBROT-05**: Rotation runbook documented with monitoring and rollback procedures

### Rideshare E2E Testing

- [x] **E2E-01**: Automated backend API test covering 12-step rideshare lifecycle (request, bid, accept, pickup, dropoff, payment, rating) against staging

### Admin Portal UI

- [x] **ADMIN-01**: Vendor management screens (Main, DocumentReview, MenuReview) use `api` axios instance with auth interceptor -- no raw `fetch()` calls
- [x] **ADMIN-02**: Mock ERP dashboard tabs (Jira, NetSuite, ZIP, ProcessUtility, NetSuiteWolt) removed from dashboard and sidebar
- [x] **ADMIN-03**: Main dashboard wired to real `/api/dashboard/stats` and `/api/dashboard/recent-activity` endpoints
- [x] **ADMIN-04**: Sidebar navigation cleaned -- no links to nonexistent screens (JiraDashboard, NetsuiteDashboard, Transactions)
- [x] **ADMIN-05**: All mock data removed (mockData.ts, mockNetSuiteTransactions.ts, _mockVendors state)
- [x] **ADMIN-06**: VendorManagement data mapping aligned with actual backend Vendor model fields

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Real-Device Testing

- **RDEV-01**: Manual real-device testing protocol for 2-device rideshare E2E (customer + driver on cellular)
- **RDEV-02**: Push notification delivery verification for all 12 rideshare notification types on real devices
- **RDEV-03**: GPS tracking accuracy verification during active rides on real devices

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Client-side secret caching in database.py | ECS force-redeployment sufficient for 30-day rotation cycle; adds unnecessary code complexity |
| iOS App Store submission | TestFlight distribution for SSL pin fix; full App Store submission in future milestone |
| Alternating-user DB rotation strategy | Overkill for current scale (db.t3.micro, 2 ECS tasks); single-user rotation sufficient |
| Play Store paid app pricing | All apps are free; monetization is through platform matchmaking fees |
| Real-device manual testing | Deferred to future -- backend API E2E test covers business logic validation |
| Coupa Dashboard rewrite | Backend Coupa endpoints exist but may serve static data; audit deferred to future phase |
| Stripe Transactions screen | Finance section already covers revenue/payouts; separate transaction view not needed now |
| AI Dashboard | Not in sidebar, partially working -- leave as-is |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SSL-01 | 06 | Complete |
| SSL-02 | 06 | Complete |
| SSL-03 | 06 | Complete |
| SSL-04 | 06 | Complete |
| PLAY-01 | 07 | Pending |
| PLAY-02 | 07 | Complete |
| PLAY-03 | 07 | Pending |
| PLAY-04 | 07 | Complete |
| PLAY-05 | 07 | Pending |
| PLAY-06 | 07 | Complete |
| PLAY-07 | 07 | Pending |
| DBROT-01 | 08-01 | Complete |
| DBROT-02 | 08-01 | Complete |
| DBROT-03 | 08-01 | Complete |
| DBROT-04 | 08-02 | Complete |
| DBROT-05 | 08-02 | Complete |
| E2E-01 | 09 | Complete |
| ADMIN-01 | 12 | Complete |
| ADMIN-02 | 12 | Complete |
| ADMIN-03 | 12 | Complete |
| ADMIN-04 | 12 | Complete |
| ADMIN-05 | 12 | Complete |
| ADMIN-06 | 12 | Complete |

**Coverage:**
- v1.5 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0

## Zietra Platform Milestone (M1–M8) Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CognitoUserPool | 39-01 | Complete |
| CognitoSesIntegration | 39-02 | Complete |
| UserMigrationFromSupabase | 39-03 | Complete |
| CognitoAuthCheckpoint | 39-04 | Complete |
| DualIssuerJwtMiddleware | 40 | Complete |
| CognitoJwksLoader | 40 | Complete |
| CognitoFrontendHelper | 40 | Complete |
| CognitoOnlyFrontend | 41 | Complete |
| CognitoOnlyBackend | 41 | Complete |
| SupabaseAuthDeprecation | 41 | Complete |
| TenantsTable | 52-01 | Complete |
| TenantFeaturesTable | 52-01 | Complete |
| MinimalTenantIdBackfill | 52-01 | Complete |
| TenantSignupFlow | 52-02 + 52-03 + 52-04 | Complete (E2E smoke 9/9 PASS) |
| WelcomeEmailViaSES | 52-02 + 52-04 | Complete (CloudWatch hit confirmed) |
| WildcardACMCert | 53-01 | Complete (cert ARN 4a29032a-..., SANs *.zietra.com + zietra.com, Status=ISSUED, NotAfter 2026-11-27, R53 wildcard A+AAAA aliases live) |
| CloudFrontWildcardAlias | 53-02 | Complete (E37R9PT8IL44L2 Aliases=[turionspace.zietra.com, *.zietra.com], ViewerCertificate swapped to 4a29032a-..., Status Deployed; smoke A2 TLS handshake on fresh `smoke53-NNNNN.zietra.com` returned 200 on both runs) |
| TenantSubdomainExtractor | 53-02 | Complete (CF Function `turion-clean-urls` v53-02 LIVE 7645 B, host→x-tenant-slug prologue + 17-entry RESERVED filter + turionspace→turion alias; smoke A6 proves bogus slug → 404 on both Lambdas; Phase 36/37/41/52 URL rewrites preserved byte-for-byte) |
| BackendTenantContextMiddleware | 53-03 | Complete (tenantContext middleware mirror-deployed to BOTH Lambdas — turion-demo-api `efb8d369…079695` + turion-satellite-api `19c656b4…f7eee`, 60s positive / 5s negative cache, 400/404/500 contract, smoke 10/10 PASS at 53-03 + smoke A4+A5 prove fresh-signup slug→tenant resolution on both endpoints) |
| TenantConfigEndpoint | 53-03 | Complete (public GET /api/tenants/current LIVE on both Lambdas, returns `{id, slug, name, plan, trial_ends_at, features: [...]}`, 13 enabled features per tenant, mirror payload byte-identical between ERP+Sat; smoke A4+A5 confirm correct content for both Turion and fresh `smoke53-NNNNN` signups) |
| TenantIdColumnEverywhere | 55-01 | Complete (149 multi-tenant tables across 4 schemas now have `tenant_id uuid NOT NULL` + FK to `public.tenants(id)` ON DELETE RESTRICT + single-col index; migrations 027+028 in turion-space-demo, both idempotent; Bucket-4 exempt: public.tenants, public.schema_migrations + tenant_features/tenant_users left with pre-existing CASCADE FKs; row-count parity 3070→3070; audit method = one-shot VPC Lambda since direct operator psql to private-subnet Aurora is blocked) |
| RlsPoliciesActive | 55-02 | Complete (151 multi-tenant tables across 4 schemas now have ENABLE+FORCE ROW LEVEL SECURITY + canonical `tenant_isolation` policy with USING + WITH CHECK on `tenant_id = current_setting('app.tenant_id')::uuid`; per-schema: crm=37, public=9, turion=57, turion_satellite=48; migration 030 in turion-space-demo idempotent; Bucket-4 exempts preserved — public.tenants documented w/ inline COMMENT; FORCE makes RLS apply to owner zietra_admin too. **Fail-closed PROVEN** via 3-way smoke: zietra_app + no GUC → 42704 unrecognized configuration parameter; Turion GUC → 27 customers (matches 55-01 baseline); phantom UUID → 0 rows. Apps DOWN until Wave 3 (55-03) flips Lambda DATABASE_URLs to zietra_app + wraps routes in withTenantClient.) |
| AdminBypassRole | 55-02 | Complete (Postgres roles `zietra_app` LOGIN/NOINHERIT/**NO BYPASSRLS** + `zietra_admin_bypass` LOGIN/NOINHERIT/**BYPASSRLS** provisioned via migration 029 in turion-space-demo; both granted SELECT/INSERT/UPDATE/DELETE on all 4 schemas + ALTER DEFAULT PRIVILEGES for future tables; passwords random `gen_random_bytes(24)+base64`. 2 Secrets Manager secrets created: `zietra-aurora/app-role` ARN `…t0oumn` + `zietra-aurora/admin-bypass-role` ARN `…pTsZjr`, both JSON-shaped `{username,password,engine,host:<RDS Proxy endpoint>,port:5432,dbname:zietra}` compatible w/ Lambda secrets.ts parser. Temp `_zietra_role_passwords` DROPPed post-Secrets-Manager-write — zero plaintext lingers. provision-rls-secrets-and-iam.sh idempotent.) |
| SetLocalAppTenantId | 55-03 | Complete (withTenantClient(req, fn) helper in db.ts of BOTH repos wraps every RLS-protected query in BEGIN + `SELECT set_config('app.tenant_id', $1, true)` + COMMIT/ROLLBACK + client.release(); 37 route files refactored across both backends; UUID-shape guard at helper entry; 0 direct pool.query callsites remain in routes except 2 documented public-route exceptions (invites.ts /accept-invite, tenants.ts /signup). Both Lambdas flipped to `zietra_app` DSN. Smoke 4/4 PASS post-cutover. Pinning metric Max=1 over 30 min — RDS-Proxy-compatible.) |
| IsolationTestSuite | 55-04 | Complete (459 vitest tests across 2 repos in `backend/tests/rls/route-matrix.test.ts` — 255 space-demo + 204 satellite. Programmatic generation via describe.each over a 158-route route-matrix.json emitted by `scripts/extract-routes.mjs`. 3 probes per route: (a) tenant-A own resource → 200/404 no leak, (b) tenant-A → tenant-B resource → 4xx no leak, (c) tenant-A POST/PATCH with tenant_id=B → 4xx OR ignore (RLS WITH CHECK). Fixtures seed TENANT_A + TENANT_B via `zietra_admin_bypass` (BYPASSRLS); HTTP handler path uses `zietra_app`. Auth helpers mint RS256 Cognito-shape JWTs via `__setCognitoTestState` (added to space-demo secrets.ts to mirror satellite's existing pattern). CI workflow `.github/workflows/rls-isolation.yml` in both repos triggers on backend/* PRs; awaits 2 GitHub secrets per repo. Suite skips gracefully when TEST_DATABASE_URL unset.) |
| RlsPerfImpactAssessed | 55-04 | Complete (`scripts/perf-benchmark-top10.sh` hey-or-ab benchmark runs against top-10 hottest endpoints + captures CloudWatch DatabaseConnectionsCurrentlySessionPinned metric. Post-RLS baseline `55-04-perf-baseline.md` documents 11 endpoints — p50 380-529ms / p99 449-2378ms (cold-start dominated); pinning Max=3.0 ≤ 5 threshold (`SET LOCAL` continues RDS-Proxy-compatible under load per RESEARCH §G.3). **[NEEDS-INDEX] queue EMPTY** — 55-05 per-table rollout has NO preflight composite-index work. Caveat: no pre-RLS baseline available (55-03 cutover predates this plan); 55-05 should capture pre-RLS-per-table baselines before each table flip.) |
| RlsRollbackRunbook | 55-05 | Complete (`rls-rollback-runbook-55-05.md` 279 lines, 8 sections, 4-tier decision tree: per-table DISABLE → per-Lambda DATABASE_URL revert → pre-RLS snapshot restore → root-cause. Drill executed on `public.tenant_features` 2026-05-15T20:52Z — DISABLE+ENABLE cycle 9 sec wall-clock, /api/health stayed 200, relrowsecurity restored to `true`. `scripts/disable-rls-per-table.sh` (72 lines, master role for DDL) + `scripts/rls-rollback-drill.sh` (119 lines, captures pre/during/post state). 2 CloudWatch alarms armed `zietra-rls-pinning-spike` + `zietra-rls-lambda-p99-regression` wired to SNS `zietra-aurora-alarms`. Migration 031 committed as NO-OP marker (queue empty per 55-04). Per-stage rollout log captures 5 stages all ADVANCE. 7-day soak window 2026-05-15→2026-05-22 with daily operator actions documented in CHECKPOINT.md.) |
| CadFilesTable | 60-01 | Complete (migration 023 in turion-satellite applied to Aurora `zietra-aurora-prod-v2` via Phase 55-05 one-shot Lambda runner; `turion_satellite.part_cad_files` table created — 12 cols + UNIQUE(part_id, sha256) + 2 indexes + RLS ENABLE+FORCE + `part_cad_files_tenant_isolation` policy `TO zietra_app USING/WITH CHECK tenant_id = current_setting('app.tenant_id')::uuid`; verification confirms RLS=t/FORCE=t, 4 indexes present, policy attached) |
| CadStorageBucket | 60-01 | Complete (S3 bucket `zietra-cad-files-134607809447` in us-east-1; SSE-AES256 + versioning Enabled + lifecycle `cad-files-ia-then-expire` (30d→IA, 1825d non-current expire) + CORS for `https://turionspace.zietra.com` + `https://*.zietra.com` (GET/PUT/HEAD) + 4-flag Block Public Access; smoke PUT with --checksum-algorithm SHA256 returned ETag + matching ChecksumSHA256 + Metadata stored + cleaned up) |
| CadFileUploadEndpoint | 60-01 | Complete (5 routes mounted at `/api/parts/:id/cad-files/*` on turion-satellite-api Lambda CodeSha256 `2a8f36f1014e9bb55a4bf42f8180965f817b48e46660eabd3d25de0802576611`: POST /presign (5-min PUT URL w/ ChecksumSHA256 binding, admin/manager), POST /commit (HEAD S3 + INSERT + deactivate prior + audit, admin/manager), GET / (list revisions), GET /:fid/url (15-min GET URL), DELETE /:fid (soft-delete + audit, admin/manager); auth gate smoke 401 confirmed; route resolves with X-Tenant-Slug + 400 without. Browser UI at `satellite/part.html` with `cad-upload.js` (file picker + crypto.subtle SHA-256 + XHR PUT w/ progress + commit + revision history) deployed via CloudFront invalidation `I2XFC3ASIFMNBDF67UW8CBBH8T`. IAM `cad-bucket-rw` inline on existing `zietra-api-lambda-role`. CAD_BUCKET env var set.) |
| CadAuditLog | 60-01 | Complete (`turion_satellite.audit_log.action` CHECK widened with 4 Phase-60 actions: `cad_upload_presigned`, `cad_upload_commit`, `cad_file_deactivate`, `cad_pdf_generate`; all 18 existing values preserved verbatim. `backend/src/lib/cad-audit.ts` wraps INSERT with `actor_user_id=req.user.id` + `tenant_id=current_setting('app.tenant_id')::uuid` inside `withTenantClient` txn; smoke INSERT via runner Lambda succeeded with `cad_upload_commit` action — CHECK constraint accepted the new value, RLS allowed insert under SET app.tenant_id, cleanup DELETE removed the row. CloudWatch audit confirms zero `X-Amz-Signature` URL leakage in satellite Lambda logs.) |
| StlViewer | 60-02 | Complete (`satellite/cad-viewer-stl.js` 4.8 KB lazy-imported by `satellite/cad-viewer.js` dispatcher; uses Three.js STLLoader from the Phase-30 jsDelivr import-map; `geometry.computeVertexNormals()` (Pitfall 9 — fixes degenerate normals), `MeshStandardMaterial({color:0x9090a0, flatShading:true, metalness:0.15, roughness:0.55})`, auto-fit bbox camera, OrbitControls with damping + Reset-view chip, `renderer.setPixelRatio(Math.min(devicePixelRatio,2))` carries the Phase 30/31 size-blowup fix. Headless dispatch routing verified via puppeteer-core same-origin test against deployed login.html — kind:'stl' path triggers lazy import. Live render with a real STL+Cognito JWT is operator-gated per Plan 60-01 doc. Deployed via CF invalidation `I7R1VAFO2WHQGT2B950B39H49O`.) |
| StepViewer | 60-02 | Complete (`satellite/cad-viewer-step.js` 8.1 KB lazy-imported by dispatcher; loads `occt-import-js@0.0.23` from jsDelivr at runtime via `await import(OCCT_BASE + 'occt-import-js.js')` with `locateFile: f => OCCT_BASE + f` for the sibling .wasm — 5 MB WASM NEVER bundled, only fetched when STEP/IGES viewer mounts. Loading spinner within 100 ms (Pitfall 1), 20 MB Content-Length warning (Pitfall 2), `occt.ReadStepFile`/`ReadIgesFile` with `{linearUnit:'millimeter', linearDeflection:0.1, angularDeflection:0.5}`, iterates `result.meshes` into a `THREE.Group` of per-mesh `BufferGeometry` with per-mesh color + identical fit/OrbitControls setup. Mesh-count chip in top-left, Reset-view chip in top-right. Renders readable error on any failure path (network, OCCT load, parse throw, `result.success===false`). Bundle-size budget enforced: dispatcher 2327B (<5KB), step viewer 8138B (<20KB), parts.html has 0 references to either.) |
| TemplateDispatchFallback | 60-02 | Complete (new async `chooseDrawingSource(client, partId)` in `backend/src/cad-templates/index.ts` consults `turion_satellite.part_cad_files` FIRST — Pitfall 5 — and returns `{source:'uploaded', cad_file_id, format, s3_key, revision}` when an active row exists; falls back to the existing pure `chooseTemplate()` regex when no upload is found, returning `{source:'procedural', template_name}`. The existing `chooseTemplate()` + `generateDrawingSvg()` are preserved verbatim — Phase 27/35 backwards-compat fully intact. New `GET /api/parts/:id/drawing-source` route in `backend/src/routes/parts.ts` exposes the dispatcher to the browser; uploaded branch mints a 15-min presigned GET URL via `presignGet(s3_key, 900)`, procedural branch returns the existing `drawing_svg + drawing_rev` from `part_definitions`. Verified via runner Lambda: branch 1 (no upload for Turion part ADCS-ASSY) → 0 rows → procedural; branch 2 (INSERT synthetic active row) → 1 row → uploaded; DELETE cleanup verified. Lambda CodeSha256 `96634cc7f86a1a1956195a261af01f383c7f421a8a08f38360d117b54fe3d878`. `satellite/part.html` ADDITIVE rewire — new module script consumes `/drawing-source`, renders Source badge (blue for uploaded / amber for procedural), hides Phase 27/35 SVG + Phase 30 procedural 3D viewer when source=uploaded but leaves them fully working when source=procedural. Zero regression on 165 existing Turion parts.) |
| DrawingMarkup | 60-03 | Complete (Migration 024 in turion-satellite applied to Aurora via `zietra-rls-runner-55-05`: `turion_satellite.part_drawing_markups` table — id PK, part_cad_file_id FK ON DELETE CASCADE, tenant_id, markup_svg TEXT CHECK length≤524288 (512 KB), created_by_cognito_sub, created_at, updated_at + 2 indexes + RLS ENABLE+FORCE + `part_drawing_markups_tenant_isolation` policy `TO zietra_app USING/WITH CHECK tenant_id=current_setting('app.tenant_id')::uuid`. Backend `lib/markup-sanitizer.ts` wraps DOMPurify (SVG profile + FORBID_TAGS script/foreignObject/iframe/object/embed + FORBID_ATTR on* handlers); pinned `isomorphic-dompurify@2.16.0` because 2.36+/3.x pulls @exodus/bytes ESM-only that crashes Lambda Node 20 require(). 3 routes mounted under `/api/parts/:id/cad-files/:fileId/markup`: POST (admin/manager, UPSERT, sanitized, audited as cad_upload_commit), GET (any auth, scoped via cad_files JOIN), DELETE (admin/manager, hard DELETE + audited). Lambda CodeSha256 `19ba6068685e43943b4bcbc6fd569759e0c425ae167ca8c8d1d25f1853bce15b`. Frontend `satellite/cad-markup.js` 7,310 bytes — Fabric.js v6 ESM from jsDelivr, base-image-as-locked-DOM-layer (Pitfall 7) so canvas.toSVG() only serializes user annotations, debounced 500ms auto-save with in-flight save coalescing, role-gated via Cognito ID-token claims. `part.html` additive `#markupPanel` + toolbar (Text/Line/Rect/Freehand/Clear). CloudFront invalidation `I51LF3DZ0I20K9CAZBXN5G8L6Q`. Direct sanitizer 5-case unit smoke PASS (clean / `<script>` strip / `onclick` strip / oversize reject / empty reject). DB CHECK constraint test: 600 KB INSERT → 23514. DB-direct UPSERT verified via runner Lambda. Headless puppeteer module-parse smoke 3/3 PASS. Live Cognito-bound canvas E2E is operator-gated per Phase 60-01/02 pattern.) |
| RevisionControlOnUploads | 60-03 | Complete (Migration 024 extended `turion_satellite.part_revisions` with nullable `cad_file_id uuid REFERENCES part_cad_files(id) ON DELETE SET NULL` + supporting index — existing Phase 35 procedural rows keep cad_file_id NULL and remain visible; uploaded revs are synthesised from `part_cad_files` in the UNION view. New route `GET /api/parts/:id/revisions` on turion-satellite-api returns a single chronological list UNION of (a) `part_revisions WHERE cad_file_id IS NULL` (procedural Phase-35 history) and (b) `part_cad_files` (uploaded Phase-60 history) with EXISTS subquery for per-uploaded-row `has_markup` flag. Column-name substitution documented: `part_revisions.edited_by/edited_at` (mig 022) mapped to response fields `by_sub`/`created_at`. Frontend `satellite/part.html` additive `#revisionPanel` lists every entry with procedural/uploaded badge, filename, format, actor sub slice, timestamp, optional has-markup badge, and a `view this rev` deep-link (`?id=...&cad_file_id=...`) for uploaded revs — closes the mixed-history user requirement. DB-direct UNION test via runner Lambda returned exact expected shape `{revision:"99", source:"uploaded", cad_file_id, filename:"smoke-60-03.stl", format:"stl", by_sub, has_markup:true}`. Also pre-created `part_drawing_jobs` table (id PK, part_id FK, tenant_id, status CHECK queued|rendering|ready|failed, pdf_s3_key, error, requested_by_cognito_sub, requested_at, completed_at + RLS+FORCE) — consumed by Plan 60-04 SQS PDF gen, no migration needed there.) |

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-05-15T20:58Z -- **Phase 55 (M3 multi-tenancy + RLS) COMPLETE — all 5 plans + 7 requirement IDs closed.** RLS database-enforced on 152 tables across 4 schemas (10 public / 37 crm / 57 turion / 48 turion_satellite); 151 FORCEd. 459 isolation tests CI-gated; 2 CloudWatch alarms armed (pinning + Lambda p99); rollback runbook + drill PASS; 7-day soak started. **M4 (Phase 56 Stripe billing) UNBLOCKED.** Earlier 2026-05-14T20:35Z note: Phase 53 (M5 wildcard subdomain routing) COMPLETE — all 4 plans + 5 requirement IDs closed. Next: `/gsd:plan-phase 56` for M4 Stripe billing.*
