# Phase 54.1 → Phase 54.6 CHECKPOINT

> Handoff from M6 multi-user per tenant (54.1) to **Phase 54.6 — Enterprise Hardening Starter Pack** (NEW phase, inserted before the original M3/RLS work). The strategic pivot: with auth + multi-tenant + Aurora cutover complete, the next priority is enterprise security posture — VPC isolation, RDS Proxy, WAF, GuardDuty, Security Hub, and a public `/security` trust page on zietra.com. This positions Zietra Platform for enterprise sales conversations before deepening RLS row-level isolation.

---

## Inheritance — what 54.1 and 54.5 delivered

### Phase 54.1 — DELIVERED (4/4 plans, 5/5 requirements closed)

#### Requirements closed (5/5)
- [x] **TenantUsersTable** — `public.tenant_users` table (Aurora) with role/status CHECK constraints, FK cascade-delete to tenants, (tenant_id, email) UNIQUE; 6 admin rows backfilled (turion=4, dollor=1, brandmonkz=1). File:line — `migrations/026_tenant_users.sql:1-61` (turion-space-demo).
- [x] **RoleMiddleware** — `requireRole(...allowed)` + `invalidateRoleCache(tenantId, sub)` exported from `backend/src/middleware/role.ts` in BOTH repos (turion-space-demo + turion-satellite); DB lookup with 60s positive / 5s negative cache + JWT fallback on DB error. File:line — `backend/src/middleware/role.ts:49` (both repos, mirror).
- [x] **InviteFlow** — `POST /api/team/invite` (idempotent UPDATE-on-pending vs INSERT, last-admin-safe, role-promotion-guarded, self-invite-blocked, best-effort SES) + `POST /api/invites/accept-invite` (PUBLIC, token-authed, AdminGetUser → AdminCreateUser → AdminSetUserPassword → AdminAddUserToGroup chain). File:line — `backend/src/routes/team.ts:52` + `backend/src/routes/invites.ts:35` (turion-space-demo).
- [x] **TeamPage** — Real `/team` UI (7536 B) replaces Phase 54 stub: member table + invite modal + role-aware action menu (admin sees Remove, manager sees no Remove); `/accept-invite` PUBLIC landing (3651 B) with referrer-no-referrer + URL clear + magic-link pivot. File:line — `team.html:1-203` + `accept-invite.html:1-87` (turion-space-demo).
- [x] **VitestBackendBootstrap** — vitest@^2.1.9 + supertest@^7.2.2 + @types/supertest@^6.0.3 installed in turion-space-demo/backend (caret-compatible with satellite's ^2.1.0); 3 test files in `tests/unit/`; **29 tests all passing in 463 ms**. File:line — `backend/vitest.config.ts:1-10`, `backend/package.json:11-12` (test scripts).

#### Available exports for Phase 54.6 and beyond

**Middleware stack (apply to all new tenant-scoped routes):**
```ts
import { requireAuth } from '../middleware/auth';
import { tenantContext } from '../middleware/tenant';
import { requireRole, invalidateRoleCache } from '../middleware/role';

router.use(tenantContext, requireAuth);
router.post('/admin-only', requireRole('admin'), handler);
router.get('/anyone', requireRole('admin', 'manager', 'member', 'viewer'), handler);
```

**DB tables / columns (Aurora Postgres 16.4):**
- `public.tenants` (Phase 52) — tenant directory
- `public.tenant_features` (Phase 52) — feature flags per tenant; gate add-ons here
- `public.tenant_users` (Phase 54.1) — RBAC source of truth, 6 admin rows live

**Cognito Groups (pool `us-east-1_KQuNS85nP`):**
- `admin`, `manager`, `member`, `viewer` — Zietra Platform RBAC, mapped 1:1 to DB role
- `customer`, `driver`, `vendor` — legacy Dollor.ai (do NOT use for Zietra Platform)

**Frontend conventions (mirror existing shell):**
- `window.cognitoAuth.requireSession()` at top of all authenticated HTML pages
- `window.erpApi.{get,post,patch,del}(path, body)` for backend calls (auto-attaches Bearer + X-Tenant-Slug)
- Role-gated UI: fetch `/api/team`, find self-row by `cognito_sub`, drive UI state from `row.role`

### Phase 54.5 — DELIVERED (3/4 plans complete; 54.5-04 7-day soak runs in parallel)

#### Aurora cutover state
- **Aurora cluster:** `zietra-aurora-prod` (Postgres 16.4, ACU 0.5–4, Multi-AZ, encrypted, IAM-auth)
- **Writer endpoint:** `zietra-aurora-prod.cluster-c23qcukqe810.us-east-1.rds.amazonaws.com:5432`
- **Reader endpoint:** `zietra-aurora-prod.cluster-ro-c23qcukqe810.us-east-1.rds.amazonaws.com:5432`
- **Master credential:** `arn:aws:secretsmanager:us-east-1:134607809447:secret:rds!cluster-8dac9fc2-9172-4e70-a167-9fe6fe9e98d9-VbuP4h`
- **Pre-cutover snapshot:** `zietra-aurora-pre-migration-cutover-2026-05-15` (available, 100%)
- **All 4 Lambdas on Aurora:** `turion-demo-api`, `turion-satellite-api`, `zietra-crm-api`, `zietra-api` — verified by smoke 4/4 PASS + zero `pooler.supabase.com` in 5-min CloudWatch
- **153 tables / 3070 rows** restored with byte-for-byte parity (`diff supabase-final-counts.csv aurora-final-counts.csv` = 0 lines)

### Production state at handoff (verified 2026-05-15)

| Surface | State | Verification |
|---|---|---|
| ERP Lambda `turion-demo-api` | Aurora-backed, all 6 endpoints live | CodeSha256 `6f5ed24a44244b83cf262e0257a2ec825d0de8e69247b1b889f7a636aae4c4ce` |
| Satellite Lambda `turion-satellite-api` | Aurora-backed | secret rotated (54.5-03) |
| CRM Lambda `zietra-crm-api` | Aurora-backed | env DATABASE_URL+DIRECT_URL flipped (54.5-03) |
| Auth Lambda `zietra-api` | Aurora-backed | SUPABASE_DB_URL value points at Aurora (name kept) |
| Frontend CF distribution | `E37R9PT8IL44L2` | `/team`, `/accept-invite` both 200 |
| Cognito user pool | `us-east-1_KQuNS85nP` | 7 groups (4 legacy + 4 RBAC) |
| Aurora cluster | available | 6 admin rows, 153 tables, 3070 rows |
| Vitest test suite | 29/29 green in 463ms | turion-space-demo/backend |

---

## Suggested next phase: Phase 54.6 — Enterprise Hardening Starter Pack

### Goal
Move Zietra Platform from "demo-grade public-internet AWS" to "enterprise-conversation-ready AWS" by VPC-isolating compute + database, fronting CloudFront with WAF, enabling continuous threat detection (GuardDuty + Security Hub), and publishing a public security trust page at `zietra.com/security`. This is the prerequisite for serious enterprise prospects asking SOC 2-style security questionnaires.

### Suggested plan scope (4 plans)

| Plan | Name | Provides | Closes |
|---|---|---|---|
| 54.6-01 | VPC + Aurora private subnets + Lambda VPC-attach | Private VPC with 2 AZ private subnets, NAT Gateway, Aurora moved to private subnets, all 4 Lambdas attached to the VPC with private egress to Aurora | VpcIsolation, AuroraPrivate, LambdaVpcAttach |
| 54.6-02 | RDS Proxy + tighten Aurora SG | RDS Proxy in front of Aurora (connection pooling + Secrets Manager auth), Aurora SG narrowed to RDS-Proxy-only ingress, closes the 0.0.0.0/0:5432 gap from 54.5-03 | RdsProxy, SgHardening |
| 54.6-03 | WAF + GuardDuty + Security Hub | WAF Web ACL attached to all CloudFront distributions (Core rules + Bot Control + Anonymous IP), GuardDuty enabled in us-east-1, Security Hub with AWS Foundational Security Best Practices + CIS standards | WafProtection, GuardDuty, SecurityHub |
| 54.6-04 | zietra.com/security trust page + smoke matrix | Public `/security` page on zietra.com describing the security posture (VPC isolation, encryption at rest/in transit, RBAC, audit logging, GuardDuty, WAF), final cross-cutting smoke (all 4 Lambdas + frontend + Aurora + WAF + GuardDuty) | SecurityTrustPage, EnterpriseHardeningSmoke |

### Pre-conditions met by 54.1 + 54.5

- [x] Aurora cluster live and serving all 4 Lambdas (54.5)
- [x] Lambda env-var / secret-rotation pattern proven (54.5-03)
- [x] RBAC middleware ready to gate per-tenant resources (54.1)
- [x] Cognito groups + tenant_users provide RBAC source of truth
- [x] Frontend ERP shell + zietra.com apex distribution operational
- [x] Vitest infrastructure ready for VPC-config unit tests if needed

---

## Must-not-break checklist (regression guards for Phase 54.6)

| Surface | Contract | Verification command |
|---|---|---|
| Phase 41 auth | Cognito JWT verify, `req.user.id` shape | `curl /api/team -H 'X-Tenant-Slug: turion'` → 401 |
| Phase 52 signup | `POST /api/tenants/signup` PUBLIC, atomic Cognito+DB | `curl -X POST /api/tenants/signup` → 400 (validation) |
| Phase 53 tenantContext | `X-Tenant-Slug` → `req.tenant` | `curl /api/team` (no slug) → 400 |
| Phase 54 shell | `/team` + `/accept-invite` 200, app-shell renders | `curl /team` → 200 |
| Phase 54.1 team/invites | All 6 endpoints respond correctly (GET/POST/PATCH/DELETE/accept-invite) | full smoke matrix in this CHECKPOINT |
| Phase 54.5 Aurora | All 4 Lambdas connect, smoke 4/4 PASS | `scripts/aurora-cutover-smoke.sh` with SMOKE_WRITE=1 |
| 4 Lambdas serving traffic | turion-demo-api, turion-satellite-api, zietra-crm-api, zietra-api all `Active` | `aws lambda get-function-configuration --function-name {name}` |
| Cognito 7 groups | admin/manager/member/viewer + admin/customer/driver/vendor | `aws cognito-idp list-groups --user-pool-id us-east-1_KQuNS85nP --query 'length(Groups)'` → 7 |
| 6 tenant_users admins | turion=4, dollor=1, brandmonkz=1 | `select count(*) from public.tenant_users where role='admin' and status='active'` → 6 |

---

## Closure evidence — 5/5 requirement IDs satisfied

| Req ID | Source file:line | Live verification |
|---|---|---|
| TenantUsersTable | `backend/migrations/026_tenant_users.sql:1-61` | `\d public.tenant_users` shows role_chk + status_chk + UNIQUE; 6 admin rows |
| RoleMiddleware | `backend/src/middleware/role.ts:49` (both repos) | 10 unit tests pass; cache hits proven |
| InviteFlow | `backend/src/routes/team.ts:52` + `routes/invites.ts:35` | 12 unit tests pass; live smoke 4/4 gate codes correct |
| TeamPage | `team.html:1-203` + `accept-invite.html:1-87` | 200 on `turion.zietra.com/team` + `/accept-invite` |
| VitestBackendBootstrap | `backend/vitest.config.ts:1-10` + `tests/unit/*.test.ts` | `npm run test` → 3 files / 29 tests pass in 463ms |

---

## Deferred items (carry into 54.6 or later)

| Item | Defer to | Why |
|---|---|---|
| Aurora SG `0.0.0.0/0:5432` ingress (paranoid security gap) | **54.6-01/02** | The single biggest open security issue from 54.5-03. RDS Proxy + VPC-attach closes it cleanly. |
| `zietra-api` Lambda missing live APIGW route | 54.6 or earlier | Discovered in Wave 2 (no `$default` integration); Phase 53 contract `/api/tenants/current` runs DB-direct only. Not blocking 54.6 but should be fixed before SOC 2-style review. |
| SES sandbox prod-access | AWS Console (out-of-band) | User must request via AWS Console; not blocking 54.6 (SES is best-effort in invite flow). |
| Phase 54.5-04 7-day soak | Calendar item ending **2026-05-22** | Runs in parallel with 54.6 planning/execution; not on 54.6's critical path. |
| Per-tenant audit log of role changes | M8 | Per ROADMAP scope; demo-grade for now. |
| Stripe seat counting / billing | M4 | Per ROADMAP scope. |
| SSO / SAML / federated identity | M8 | Per ROADMAP scope. |
| 2FA / MFA | M8 | Per ROADMAP scope. |
| Resend-invite from UI | 54.5 (if needed) | Backend supports via re-POST; UI button is polish. |
| Bulk invite via CSV | Out of scope | Per CONTEXT.md ABSOLUTELY OUT. |
| Last-admin race condition (2 admins delete each other) | Demo-grade accepted | RESEARCH §810-814; race-window <1s. |
| Invite token hashing in DB | M8 | Plaintext acceptable per CONTEXT §6. |

---

## Resources for Phase 54.6 planner

### AWS
| Resource | Identifier |
|---|---|
| Account | `134607809447` |
| Region | `us-east-1` |
| Aurora cluster | `zietra-aurora-prod` (writer + reader endpoints in inheritance table above) |
| Aurora master credential | `arn:aws:secretsmanager:us-east-1:134607809447:secret:rds!cluster-8dac9fc2-9172-4e70-a167-9fe6fe9e98d9-VbuP4h` |
| Aurora KMS key | `arn:aws:kms:us-east-1:134607809447:key/1086212a-cf06-41ca-8767-514b2b18a008` |
| Aurora SG | `sg-0760238c408d0f2b7` (currently 0.0.0.0/0:5432 — close in 54.6-02) |
| Default VPC | `vpc-019418bb8d484ad8c` (consider new VPC vs reuse — open Q4) |
| Pre-cutover snapshot | `zietra-aurora-pre-migration-cutover-2026-05-15` (paranoia rollback) |
| Cognito user pool | `us-east-1_KQuNS85nP` |
| Route 53 zone | `Z090201115UMJZ8TIAX5G` (zietra.com) |
| CloudFront distributions | `E37R9PT8IL44L2` (turion ERP), plus zietra.com apex + asc606 + marquee + turion satellite (5 total — WAF applies to all) |
| 4 Lambdas (in-scope) | `turion-demo-api`, `turion-satellite-api`, `zietra-crm-api`, `zietra-api` |
| Lambda execution role | `zietra-api-lambda-role` (shared by all 4) |
| Smoke scripts | `/Users/jeet/doordash-p2p/scripts/smoke-{turion-demo,turion-satellite,zietra-crm,zietra-api}.sh` |

### Planning artifacts
| Artifact | Path |
|---|---|
| ROADMAP | `.planning/ROADMAP.md` |
| STATE | `.planning/STATE.md` |
| REQUIREMENTS | `.planning/REQUIREMENTS.md` |
| Phase 54.1 SUMMARY (this phase) | `.planning/phases/54.1-m6-multi-user-per-tenant-team-invites-role-middleware/54.1-04-SUMMARY.md` |
| Aurora cutover runbook | `.planning/runbooks/aurora-cutover-54-5-03.md` |
| Aurora rollback runbook | `.planning/runbooks/aurora-rollback-54-5-03.md` |

---

## Files Phase 54.6 will probably touch

### 54.6-01: VPC + Aurora private + Lambda VPC-attach
- AWS infrastructure (Terraform OR `aws` CLI shell scripts):
  - New VPC (or reuse default) with 2 AZ private subnets + NAT Gateway
  - DB subnet group rebuilt for private-subnet-only Aurora
  - 4 Lambda VpcConfig blocks (SubnetIds + SecurityGroupIds)
- Files:
  - `scripts/setup-vpc-and-private-aurora.sh` (NEW)
  - 4 × `aws lambda update-function-configuration --vpc-config` calls

### 54.6-02: RDS Proxy + tighten SG
- `scripts/provision-rds-proxy.sh` (NEW)
- RDS Proxy IAM role (Secrets Manager read for Aurora credential)
- All 4 Lambda env-vars: DATABASE_URL host swap to Proxy endpoint (mirror 54.5-03 flip pattern)
- Aurora SG: revoke 0.0.0.0/0:5432, add RDS Proxy SG ingress only

### 54.6-03: WAF + GuardDuty + Security Hub
- `scripts/provision-waf-acls.sh` (NEW)
- AWS WAFv2 WebACL with AWS-managed rule groups: Core + Bot Control + Anonymous IP
- Associate WebACL with all 5 CloudFront distributions
- GuardDuty enable in us-east-1 + email SNS topic for findings
- Security Hub enable + AWS Foundational + CIS standards
- Cost: ~$5/mo WAF base + ~$1/million requests + GuardDuty ~$5/mo + Security Hub ~$2/mo

### 54.6-04: zietra.com/security trust page + smoke
- `security.html` at zietra.com apex (NEW) — public security trust page
- CloudFront Function R-map entry: `/security` → `/security.html`
- Cross-cutting smoke matrix script (NEW): hits all 4 Lambda health endpoints through RDS Proxy, verifies WAF blocks known bad UA, verifies Aurora unreachable from public IPs

---

## Open questions for the 54.6 planner

1. **VPC strategy — new VPC vs default VPC?** New VPC = clean slate, no legacy SG cruft, but requires NAT Gateway provisioning ($32/mo per AZ). Default VPC = reuse existing subnets but need to add private subnets + DB subnet group. Recommend NEW VPC for clean enterprise audit trail. **Cost impact: +$32-$64/mo for NAT.**

2. **NAT Gateway count — 1 vs 2 AZs?** Cost-optimized: 1 NAT (~$32/mo). High-availability: 2 NATs (~$64/mo). Demo-grade today is single-AZ; recommend 2 AZs to align with Aurora's Multi-AZ writer/reader pair.

3. **WAF rules tier — start minimal or comprehensive?** AWS Managed Rules are ~$1/mo per rule group + traffic costs. Minimal: Core (~$5/mo total). Comprehensive: Core + Bot Control + Anonymous IP + Known Bad Inputs (~$20-25/mo). Recommend comprehensive — this is the security posture pitch.

4. **Aurora private endpoint migration — in-place or new cluster?** In-place: modify cluster's DB subnet group to private subnets (downtime ~5min). New cluster: create private cluster + snapshot-restore from current cluster (no downtime, but doubles cost briefly). Recommend in-place — the production cutover already proved we tolerate brief connectivity blips.

5. **zietra.com/security trust page content — depth?** Minimal (one page, bullet list of controls) vs comprehensive (separate sub-pages per control: encryption, RBAC, audit, network, monitoring). For initial enterprise conversations a single substantive page is enough; deeper pages can follow when prospects ask.

6. **Does Phase 54.6 attempt to fix the `zietra-api` Lambda missing APIGW route discovered in Wave 2?** If yes, scope creeps; if no, it's an open item carried into M8. Recommend: include in 54.6-04 as a follow-on smoke fix (low effort, high alignment with the "everything verified live" theme).

---

## Next command

```
/gsd:plan-phase 54.6
```

Planner should consume this CHECKPOINT.md, ROADMAP.md (Phase 54.6 entry — see note: ROADMAP entry will be inserted by the executor before this CHECKPOINT closes), CLAUDE.md, and the AWS resource inventory above to produce 4 plans across 4 waves (or 3 waves if 54.6-01 + 54.6-02 can run in parallel with separate AWS resource scopes).

---

*Written 2026-05-15 during 54.1-04 execution. Autonomous mode. Phase 54.1 CLOSED with 5/5 requirements satisfied. Phase 54.6 (Enterprise Hardening Starter Pack) is the user's locked next priority, inserted before original M3 RLS work.*
