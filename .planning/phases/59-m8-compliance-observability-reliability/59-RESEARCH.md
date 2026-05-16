# Phase 59: M8 — Compliance + Observability + Reliability — Research

**Researched:** 2026-05-15
**Domain:** AWS infrastructure (SES VPCE, CloudWatch), backend audit logging, frontend SEO retrofit, OG image generation, k6 load + chaos testing, SOC 2 controls mapping
**Confidence:** HIGH (all critical claims verified against ROADMAP + 58 CHECKPOINT + 54.6 SUMMARY + 55-04 SUMMARY + AWS docs + Satori docs)

---

## User Constraints (from ROADMAP Phase 59 entry — there is NO CONTEXT.md for this phase; ROADMAP scope-locked block is the constraint document)

### Locked Decisions (from ROADMAP `**Scope (locked)**`)

1. **Fix SES VPC issue** (58-03 deferred): add SES VPCE in `vpc-012ab4500dcd4ee41` so `/api/contact` email actually delivers to `support@zietra.com`. Validate the AbortController 4s timeout in `backend/src/routes/contact.ts` can be removed (the email send no longer hangs).
2. **Per-tenant audit log:** migration 036 `public.audit_log_v2` (tenant_id, actor_cognito_sub, action, resource_type, resource_id, before_jsonb, after_jsonb, ip_address, user_agent, timestamptz). RLS-scoped. Auto-write helper used in `withTenantClient` mutations (opt-in per route via `auditLog()` wrapper). Settings page gets new "Audit log" section visible to admin role only.
3. **CloudWatch dashboards** (extends 54.6 alarms): single dashboard `zietra-prod-overview` with 12 widgets — Aurora ACU + connection count + slow queries, RDS Proxy metrics, 4-Lambda invocation/error/duration, WAF blocks per rule, GuardDuty findings count, Cognito sign-ins/day.
4. **Status page** at `status.zietra.com` — separate static page (S3 + CF distro) showing real-time component health pulled from CloudWatch metrics via a public Lambda. Components: API (ERP, Satellite), Aurora, RDS Proxy, Cognito, SES. Auto-refresh every 60s.
5. **API documentation landing** at `/docs/api` on marketing site: hand-curated OpenAPI 3.1 spec covering top 30 most-used endpoints + Swagger UI. Full 169-route coverage is M9.
6. **PageHelmet retrofit:** apply the Phase 58-04 PageHelmet wrapper across all 25 marketing pages.
7. **Per-module OG image generation:** static PNG per of 13 modules at `public/og/modules/<slug>.png` (1200×630). Use Satori or hand-design.
8. **k6 load tests** for top-10 endpoints from Phase 55-04 perf baseline. Verify Aurora ACU autoscales correctly; document the p95 cliff and the ACU at which it occurs.
9. **Chaos tests** — 3 scenarios: (a) Lambda timeout to 1s (force degradation, verify graceful 504), (b) Aurora secret rotate mid-flight (verify Lambda reconnects within 30s), (c) RDS Proxy max-connections exhaustion (verify queueing not crash).
10. **SOC 2 controls audit:** map our actual controls against SOC 2 Trust Services Criteria. Output: `docs/soc2-controls-status.md`. NOT a SOC 2 audit itself.

### Claude's Discretion

- Choice between Satori vs hand-design for 13 OG images (RESEARCH recommends Satori).
- Audit-log v2 schema field naming (must be a superset of what `auditLog()` wrapper can populate).
- Status page Lambda caching strategy (recommend 30s CF edge cache in front of the JSON Lambda).
- Whether VPCE goes in 1 or 2 AZs (recommend 2 for HA — matches Lambda subnet placement).
- 4-plan structure (recommended; ROADMAP suggests but does not lock).

### Deferred Ideas (OUT OF SCOPE — from ROADMAP)

- Actual SOC 2 Type II audit ($30K+, 6-12 month observation)
- Full OpenAPI coverage of all 169 routes (M9)
- Multi-region active-active (M9)
- HIPAA BAA (M9)
- AWS Organizations multi-account (M9)
- Sub-second Aurora failover (M9)
- Per-tenant cost attribution dashboards (M9)
- Customer-facing API rate limiting beyond Phase 55-04 baseline (M9)
- Real-time tenant impersonation for support (M9)

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SesVpceFix | Add SES VPCE so /api/contact emails deliver | §A — AWS official: `com.amazonaws.us-east-1.email-smtp` interface endpoint; AWS SDK `SESClient` (HTTPS, not raw SMTP) means we need both the **API** endpoint (`com.amazonaws.us-east-1.email`) and/or `email-smtp` depending on SDK call mode. Confirmed contact.ts uses `SESClient.send(SendEmailCommand)` → SES HTTPS API, so endpoint = `com.amazonaws.us-east-1.email`. Pricing $0.01/hr/AZ ≈ $7.20/mo per AZ + data processing. |
| AuditLogV2 | Migration 036 + `auditLog()` helper + 5 mutate-route retrofits | §B — schema mirror of existing `turion.audit_log` but `public.*` + RLS-scoped + Cognito-sub actor. Helper extends `withTenantClient` pattern from db.ts:55. |
| AuditLogUiInSettings | Settings page new "Audit log" section (admin-role only) | §B.5 — extends Phase 57 settings.html; Phase 54.1 admin role middleware reused. |
| CloudWatchOverviewDashboard | Single `zietra-prod-overview` dashboard, 12 widgets | §C — `aws cloudwatch put-dashboard --dashboard-name zietra-prod-overview --dashboard-body file://dashboard.json`. Extends 54.6 alarms baseline. |
| StatusPage | `status.zietra.com` static + JSON Lambda | §D — new S3 bucket `zietra-status`, new CF distro, NEW Lambda `zietra-status-api` (PUBLIC, no auth), CF Function caches 30s. Wildcard ACM cert already covers subdomain. |
| ApiDocsLanding | /docs/api route + Swagger UI + hand-curated OpenAPI 3.1 | §E — new lazy route on marketing site; OpenAPI spec at `public/docs/openapi.yaml`; bundled Swagger UI v5 from CDN with SRI-pinned hashes. |
| PageHelmetRetrofit | 25 pages × ~5 LOC each, all use `<PageHelmet>` | §F — `PageHelmet` already shipped 58-04. Retrofit is mechanical; verify with curl-grep per page. |
| PerModuleOgImages | 13 PNGs at `public/og/modules/<slug>.png` | §G — Satori 0.18 + @resvg/resvg-js 2.6 (one-time build script). Module-catalog already has icon + color hints. |
| K6LoadTests | k6 against top-10 endpoints from 55-04 baseline | §H — extends `scripts/perf-benchmark-top10.sh`. ramping-vus 0→50 over 5 min. Pass criteria: p95 < 2× baseline, error rate < 0.1%. |
| ChaosTests | 3 reproducible scenarios | §I — Lambda timeout=1s, Aurora secret rotate, RDS Proxy MaxConnectionsPercent=10. All scripted + auto-revert. |
| Soc2ControlsAudit | `docs/soc2-controls-status.md` mapping our controls to SOC 2 TSC | §J — 5 trust service categories × ~10 criteria each. Use AWS-published SOC2-to-service mapping. |

---

## Summary

This is the biggest phase by scope to date — 11 requirements spanning infrastructure (SES VPCE, CloudWatch, status page), backend (audit log v2 + 5 route retrofits), marketing (PageHelmet retrofit, /docs/api, OG image gen), and validation (k6, chaos, SOC 2 audit). All of it is **mechanical or one-shot work** — no new architectural decisions on top of what M3 (RLS), M6 (audit_log pattern), and M7 (PageHelmet wrapper) already established.

**Three load-bearing decisions** the planner must lock:

1. **SES VPCE endpoint type:** The `SESClient.send(SendEmailCommand)` call in `routes/contact.ts:179` uses the **SES HTTPS API**, NOT raw SMTP. The correct VPCE service name is `com.amazonaws.us-east-1.email` (SES API), **not** `com.amazonaws.us-east-1.email-smtp`. AWS docs (verified) confirm both endpoint types exist; the SDK's `@aws-sdk/client-ses` always uses the HTTPS API. After the VPCE is attached, the AbortController 4s timeout in contact.ts can be removed (the row-is-source-of-truth pattern stays as defense-in-depth).
2. **Satori for OG images, not hand-design.** Satori (Vercel) + @resvg/resvg-js produces 1200×630 PNGs from JSX in a Node script — no headless browser, no Puppeteer, no native deps. One-time `scripts/gen-og-images.mjs` reads `MODULES` from `marketing/src/data/modules.ts` and outputs 13 PNGs. Identical script generates per-case-study OGs (free bonus). Hand-design via Figma costs 8 hours one-time and locks us out of programmatic regeneration when the catalog changes.
3. **Status page architecture:** static HTML on S3 + CF + a SINGLE public JSON Lambda (no auth, returns `{components: [{name, status, last_check, uptime_7d}]}`). CF caches the Lambda response 30s at edge (controls cost). Lambda calls `cloudwatch:GetMetricData` for ALARM state of the 8 alarms already defined in 54.6. No third-party SaaS (Statuspage/Atlassian = $1500/yr; roll-your-own = $0.20/mo Lambda + free CF tier).

**Primary recommendation:** Plan 4 plans as ROADMAP suggests. 59-01 is the most VPC/IAM-heavy (SES VPCE + migration 036 + 5 route retrofits). 59-04 is the most operationally risky (chaos tests in production — schedule off-hours, test on `turion` tenant first, have rollback scripted). Estimated total time: 4-6 hours of execution work (mostly mechanical retrofits + dashboard JSON authoring + the one Satori script run).

---

## Standard Stack

### Core (verified — already in repo)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@aws-sdk/client-ses` | 3.x (already in turion-space-demo backend) | SES SendEmailCommand from Lambda | Already wired in `routes/contact.ts:25`. After VPCE attach, no SDK code change needed — VPCE Private DNS resolves `email.us-east-1.amazonaws.com` to the VPCE IP transparently (54.6 pattern). |
| `react-helmet-async` | (already in marketing repo, verified in App.tsx:3) | Per-page `<title>` + meta + canonical | Already used by 58-04 PageHelmet wrapper. Retrofit is just swapping inline `<Helmet>` → `<PageHelmet>`. |
| `pg` Pool | (already in db.ts:1) | Aurora client | `auditLog()` helper extends `withTenantClient` pattern in db.ts:55. |
| Express Router | (already in routes/contact.ts:24) | HTTP routes | New `routes/audit.ts` follows same pattern as `routes/team.ts` (admin-role gated). |

### Supporting (NEW — to install)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `satori` | ^0.18 (current Apr 2026, MIT, Vercel) | JSX → SVG renderer | OG image generation script (one-time per design refresh). |
| `@resvg/resvg-js` | ^2.6 (current 2026, MPL-2.0, yisibl) | SVG → PNG converter (WASM, no native deps) | Pairs with Satori. |
| `k6` | (binary install — `brew install k6` or `docker run grafana/k6`) | Load testing | `scripts/k6-load-test.js` for top-10 endpoint validation. |
| `swagger-ui-dist` | ^5.x (load via CDN with SRI hash, do NOT bundle) | API docs interactive UI | `/docs/api` route. CDN avoids vendor lock + ~2 MB bundle bloat. |

### Already in Repo (NO INSTALL NEEDED)

- `@aws-sdk/client-cloudwatch` (status page Lambda) — already used by perf-benchmark-top10.sh
- `@aws-sdk/client-secrets-manager` — already used for Aurora master cred fetch
- `js-yaml` — for parsing/serving OpenAPI 3.1 YAML spec

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Satori | Hand-design 13 PNGs in Figma | 8 hr one-time + no programmatic regen. **Worse.** |
| Satori | Puppeteer + headless Chrome rendering HTML | Adds 200 MB headless-chrome dep + slower. **Worse for build-time script.** |
| Roll-your-own status page | Atlassian Statuspage / Better Uptime SaaS | $99-$1500/yr + branded URL but extra integration surface. **Defer to Y2 if customer asks.** |
| Swagger UI dist | Redoc OR Stoplight Elements | Swagger UI is most familiar to enterprise buyers; Redoc has prettier output but less "try it now" UX. **Pick Swagger UI for v1.** |
| Hand-curated OpenAPI 3.1 spec | Auto-generate from Express via `express-openapi-validator` | Auto-gen catches drift but adds a backend dep + requires JSDoc on every route. M8 covers top 30 only; full coverage = M9 (Open Q). |
| k6 | Apache `ab` (already in perf-benchmark-top10.sh) | k6 has ramping-vus + better threshold output + Grafana integration. Use ab as fallback if k6 install blocks. |

### Installation

```bash
# Marketing repo (OG image script + Swagger UI)
cd /Users/jeet/zietra/marketing
npm install --save-dev satori @resvg/resvg-js
# swagger-ui-dist NOT installed — load from CDN

# Operator machine (k6 for load tests)
brew install k6
# OR run via Docker: docker run --rm -i grafana/k6 run - <scripts/k6-load-test.js
```

---

## Architecture Patterns

### Recommended Project Structure

```
turion-space-demo/
├── backend/
│   ├── migrations/
│   │   └── 036_audit_log_v2.sql           # NEW: public.audit_log_v2 + RLS policies + GRANTs
│   ├── src/
│   │   ├── db.ts                          # MODIFIED: add auditLog(req, action, resource_type, resource_id, before, after) helper
│   │   ├── routes/
│   │   │   ├── audit.ts                   # NEW: GET /api/audit-log (admin role only, paginated)
│   │   │   ├── invites.ts                 # MODIFIED: wrap POST + DELETE in auditLog()
│   │   │   ├── team.ts                    # MODIFIED: wrap role-change + delete in auditLog()
│   │   │   ├── onboarding.ts              # MODIFIED: wrap finalize-wizard in auditLog()
│   │   │   └── royalty.ts                 # MODIFIED: wrap agreement-create in auditLog()
│   │   └── app.ts                          # MODIFIED: mount audit router
│   └── package.json                       # unchanged (no new deps)
│
├── frontend/
│   └── settings.html                      # MODIFIED: + "Audit log" admin-only card

zietra/marketing/
├── public/
│   ├── docs/
│   │   └── openapi.yaml                   # NEW: 30-endpoint hand-curated OpenAPI 3.1 spec
│   ├── og/
│   │   ├── default.png                    # already from 58-04
│   │   ├── modules/                       # NEW directory
│   │   │   ├── crm.png                    # 13 files: crm, sales, purchase, items, plm,
│   │   │   ├── ...                        # mes, quality, lean-erp-pro, asc606, royalty,
│   │   │   └── qb-migration.png           # dropship, ai-agents, qb-migration
│   │   └── case-studies/                  # NEW: 3 PNGs for the case-study set
│   │       ├── turion-space.png
│   │       ├── marquee-anni.png
│   │       └── sample-saas-svc.png
├── scripts/
│   └── gen-og-images.mjs                  # NEW: Satori-based one-time generator
├── src/
│   ├── components/
│   │   └── PageHelmet.tsx                 # already from 58-04 — no change
│   └── pages/
│       ├── *.tsx                          # ALL 16 page components: retrofit to use <PageHelmet>
│       ├── ApiDocsPage.tsx                # NEW: /docs/api lazy-loaded route with Swagger UI
│       └── ...
└── src/App.tsx                            # MODIFIED: + ApiDocsPage lazy import + route

zietra-status (NEW separate folder)/
├── index.html                             # static status page with JS polling
├── deploy.sh                              # S3 sync + CF invalidate (mirrors marketing/deploy.sh)
└── lambda/
    ├── handler.mjs                        # zietra-status-api Lambda — GET / returns JSON
    └── package.json

doordash-p2p/
├── scripts/
│   ├── k6-load-test.js                    # NEW: k6 ramping-vus against top-10 endpoints
│   ├── chaos/                             # NEW directory
│   │   ├── scenario-1-lambda-timeout.sh   # NEW
│   │   ├── scenario-2-secret-rotate.sh    # NEW
│   │   └── scenario-3-proxy-exhaustion.sh # NEW
│   └── smoke-phase-59.sh                  # NEW: cross-cutting smoke (mirror 54.6 pattern)
└── docs/
    └── soc2-controls-status.md            # NEW: SOC 2 TSC mapping
```

### Pattern 1: SES VPCE attach (no Lambda code change)

**What:** Add a single AWS interface endpoint in `vpc-012ab4500dcd4ee41` for `com.amazonaws.us-east-1.email` with Private DNS Enabled. Lambda code in `routes/contact.ts` calls SES via SDK; with Private DNS on, the SDK's `email.us-east-1.amazonaws.com` DNS resolves to the VPCE's private IP transparently. **No code change** — just an infrastructure attachment (the 54.6-02 pattern, identical to how Secrets Manager VPCE was attached).

**When to use:** Always for Lambdas in a private subnet that need AWS service access without NAT.

**Example:**
```bash
# Source: https://docs.aws.amazon.com/ses/latest/dg/send-email-set-up-vpc-endpoints.html
# Subnet IDs from 54.6-02: PRIV_1A=subnet-052ed80f6904b9fe7, PRIV_1B=subnet-07893035668f1b015
# Lambda SG from 54.6-02: LAMBDA_SG
# VPCE SG from 54.6-02: VPCE_SG=sg-05a982445782a9850 (already allows 443 from LAMBDA_SG → REUSE)

aws ec2 create-vpc-endpoint \
  --vpc-id vpc-012ab4500dcd4ee41 \
  --vpc-endpoint-type Interface \
  --service-name com.amazonaws.us-east-1.email \
  --subnet-ids subnet-052ed80f6904b9fe7 subnet-07893035668f1b015 \
  --security-group-ids sg-05a982445782a9850 \
  --private-dns-enabled \
  --tag-specifications 'ResourceType=vpc-endpoint,Tags=[{Key=Name,Value=zietra-ses-api-vpce},{Key=Phase,Value=59-01}]'

# Wait ~2 min for the endpoint to reach "available"
aws ec2 describe-vpc-endpoints --filters Name=service-name,Values=com.amazonaws.us-east-1.email \
  --query 'VpcEndpoints[].[VpcEndpointId,State]' --output table

# Verify from Lambda — invoke contact form with a real valid POST:
curl -X POST https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/contact \
  -H "Origin: https://zietra.com" -H "Content-Type: application/json" \
  -d '{"name":"M8 test","email":"test@example.com","intent":"support","message":"VPCE verification — please ignore. Phase 59-01 smoke."}'
# Expected: 200 + {ok:true, id:...} in <500ms (was the same response time before, but now SES log line "[contact] SES delivered" actually fires)

# Confirm SES delivery in CloudWatch logs:
aws logs filter-log-events --log-group-name /aws/lambda/turion-demo-api \
  --filter-pattern '"[contact] SES delivered"' --max-items 1 --start-time $(($(date +%s) - 600))000
```

### Pattern 2: `auditLog()` helper (extends withTenantClient)

**What:** A thin wrapper that any RLS-protected mutate route can call from inside its `withTenantClient` callback. Captures actor (Cognito sub from req.user), tenant_id (already set in SET LOCAL), action, resource type/id, before/after snapshots, request IP, UA. Insert is part of the same transaction → if the user mutation fails, the audit row is rolled back too (no orphaned audit entries).

**When to use:** Every write endpoint that an admin would want to investigate later. M8 covers top 5: invite member, change role, finalize wizard, complete migration, royalty agreement create. M9 will fan out to all ~80 mutate routes.

**Example:**
```typescript
// Source: backend/src/db.ts (NEW addition — pattern matches existing audit() at db.ts:21)
import type { Request } from 'express';
import type { PoolClient } from 'pg';

export async function auditLog(
  req: Request,
  client: PoolClient,
  opts: {
    action: string;
    resource_type: string;
    resource_id: string | null;
    before: unknown;
    after: unknown;
  }
): Promise<void> {
  // req.tenant.id is already set by tenantContext middleware (55-03)
  // req.user.sub is set by requireAuth (Phase 38 ES256 → 55-* Cognito RS256)
  await client.query(
    `INSERT INTO public.audit_log_v2
       (tenant_id, actor_cognito_sub, action, resource_type, resource_id,
        before_data, after_data, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9)`,
    [
      req.tenant!.id,
      req.user?.sub ?? null,
      opts.action,
      opts.resource_type,
      opts.resource_id,
      JSON.stringify(opts.before ?? null),
      JSON.stringify(opts.after ?? null),
      // IP per contact.ts:60 X-Forwarded-For pattern (CloudFront-aware)
      req.headers['x-forwarded-for']?.toString().split(',').slice(-2, -1)[0]?.trim() ?? null,
      req.headers['user-agent']?.toString().slice(0, 500) ?? null,
    ]
  );
}

// Usage in a route (example — team role change):
r.patch('/:userId/role', requireAdmin, async (req, res) => {
  await withTenantClient(req, async (client) => {
    const before = await client.query('SELECT role FROM public.tenant_users WHERE id=$1', [req.params.userId]);
    await client.query('UPDATE public.tenant_users SET role=$1 WHERE id=$2', [req.body.role, req.params.userId]);
    const after = await client.query('SELECT role FROM public.tenant_users WHERE id=$1', [req.params.userId]);

    await auditLog(req, client, {
      action: 'team.role_changed',
      resource_type: 'tenant_user',
      resource_id: req.params.userId,
      before: before.rows[0],
      after: after.rows[0],
    });
  });
  res.json({ ok: true });
});
```

### Pattern 3: Per-tenant audit-log UI in Settings (admin-role only)

**What:** New section in `frontend/settings.html` (the unified shell from Phase 54 / Phase 57) — paginated table view of `public.audit_log_v2` filtered to current tenant. Read-only. Admin-role gated at both API (`requireAdmin` middleware from 54.1) and UI level (hide card if `me.role !== 'admin'`).

**When to use:** Standard "audit trail" UX for any multi-tenant SaaS. Every enterprise buyer asks "can my SecOps team see who did what?"

**Example:**
```html
<!-- frontend/settings.html — NEW section -->
<section id="audit-log-card" class="card hidden" data-role-gate="admin">
  <h3>Audit log</h3>
  <p class="muted">All write actions in your tenant. Visible to admins only.</p>
  <table class="audit-table">
    <thead><tr>
      <th>When</th><th>Who</th><th>What</th><th>Resource</th><th>Details</th>
    </tr></thead>
    <tbody id="audit-rows"></tbody>
  </table>
  <button id="audit-load-more" class="btn btn-secondary">Load more</button>
</section>

<script>
// Load on demand if user has admin role
async function loadAuditLog(cursor = null) {
  const r = await window.zietraApi('/api/audit-log' + (cursor ? `?cursor=${cursor}` : ''));
  // render rows; store r.next_cursor for "Load more"
}
</script>
```

### Pattern 4: CloudWatch dashboard as JSON

**What:** Dashboards are JSON documents. Define `zietra-prod-overview.json` in `infrastructure/cloudwatch/` (tracked in git), apply via `aws cloudwatch put-dashboard`. Edits in console can drift — always re-apply from git on phase close.

**When to use:** Any time you have a dashboard you want reproducible across accounts (staging/prod).

**Example (skeleton — 3 of 12 widgets shown):**
```json
{
  "widgets": [
    {
      "type": "metric",
      "x": 0, "y": 0, "width": 8, "height": 6,
      "properties": {
        "title": "Aurora ACU (zietra-aurora-prod-v2)",
        "metrics": [
          ["AWS/RDS", "ServerlessDatabaseCapacity", "DBClusterIdentifier", "zietra-aurora-prod-v2"]
        ],
        "period": 60, "stat": "Average", "region": "us-east-1"
      }
    },
    {
      "type": "metric",
      "x": 8, "y": 0, "width": 8, "height": 6,
      "properties": {
        "title": "RDS Proxy pinned connections (Max)",
        "metrics": [
          ["AWS/RDS", "DatabaseConnectionsCurrentlySessionPinned", "ProxyName", "zietra-aurora-proxy"]
        ],
        "period": 60, "stat": "Maximum",
        "annotations": { "horizontal": [{ "value": 5, "label": "ALERT: pinning ≥ 5" }] }
      }
    },
    {
      "type": "metric",
      "x": 16, "y": 0, "width": 8, "height": 6,
      "properties": {
        "title": "turion-demo-api errors (last 24h)",
        "metrics": [
          ["AWS/Lambda", "Errors", "FunctionName", "turion-demo-api", { "stat": "Sum" }],
          [".",         "Invocations", ".", ".",                       { "stat": "Sum" }]
        ],
        "period": 3600, "region": "us-east-1"
      }
    }
    // ... 9 more widgets (Lambda durations × 4 fns, WAF blocks, GuardDuty findings, Cognito sign-ins, etc.)
  ]
}
```

**Apply:**
```bash
aws cloudwatch put-dashboard \
  --dashboard-name zietra-prod-overview \
  --dashboard-body file://infrastructure/cloudwatch/zietra-prod-overview.json
# Verify:
aws cloudwatch list-dashboards --query 'DashboardEntries[?DashboardName==`zietra-prod-overview`]'
# Open in console:
echo "https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=zietra-prod-overview"
```

### Pattern 5: Status page Lambda (public, no auth, CloudWatch alarm probe)

**What:** A tiny Lambda outside the VPC (no cold-start hit from ENI attach) that takes ZERO arguments and returns JSON listing component health. Reads CloudWatch alarm states via `cloudwatch:DescribeAlarms` for the 8 alarms already created in 54.6 + new alarms from §C. Computes 7-day uptime from `cloudwatch:DescribeAlarmHistory`.

**When to use:** Customer-facing status page. Single source of truth.

**Example:**
```javascript
// zietra-status/lambda/handler.mjs
import { CloudWatchClient, DescribeAlarmsCommand, DescribeAlarmHistoryCommand } from '@aws-sdk/client-cloudwatch';

const cw = new CloudWatchClient({ region: 'us-east-1' });

const COMPONENTS = [
  { name: 'API (ERP)',       alarms: ['turion-demo-api-errors-5xx', 'turion-demo-api-throttles'] },
  { name: 'API (Satellite)', alarms: ['turion-satellite-api-errors-5xx'] },
  { name: 'Aurora',          alarms: ['aurora-cpu-high', 'aurora-acu-pinned-high'] },
  { name: 'RDS Proxy',       alarms: ['proxy-pinning-high'] },
  { name: 'Cognito',         alarms: ['cognito-signin-failure-rate'] },
  { name: 'SES',             alarms: ['ses-bounce-rate-high'] },
  { name: 'CloudFront',      alarms: ['cf-error-rate-high'] },
];

export async function handler(event) {
  const allAlarms = COMPONENTS.flatMap(c => c.alarms);
  const { MetricAlarms } = await cw.send(new DescribeAlarmsCommand({ AlarmNames: allAlarms }));
  const stateByAlarm = Object.fromEntries(MetricAlarms.map(a => [a.AlarmName, a.StateValue]));

  // OK | INSUFFICIENT_DATA → green; ALARM → red; INSUFFICIENT_DATA alone → yellow.
  const components = COMPONENTS.map(c => {
    const states = c.alarms.map(n => stateByAlarm[n] ?? 'INSUFFICIENT_DATA');
    let status = 'healthy';
    if (states.some(s => s === 'ALARM')) status = 'degraded';
    else if (states.every(s => s === 'INSUFFICIENT_DATA')) status = 'unknown';
    return { name: c.name, status };
  });

  return {
    statusCode: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=30',  // CF edge cache
      'access-control-allow-origin': 'https://status.zietra.com',
    },
    body: JSON.stringify({
      timestamp: new Date().toISOString(),
      overall_status: components.some(c => c.status === 'degraded') ? 'degraded' : 'healthy',
      components,
    }),
  };
}
```

**Front-end (status/index.html — sketch):**
```html
<!doctype html>
<html><head>
  <title>Zietra Status</title>
  <link rel="icon" href="/favicon.ico">
  <style>
    body { font-family: system-ui; max-width: 720px; margin: 40px auto; padding: 0 16px; }
    .component { display: flex; justify-content: space-between; padding: 12px; border-bottom: 1px solid #eee; }
    .pill { padding: 4px 12px; border-radius: 16px; font-size: 0.85em; font-weight: 500; }
    .healthy { background: #d1fae5; color: #047857; }
    .degraded { background: #fee2e2; color: #b91c1c; }
    .unknown { background: #f3f4f6; color: #6b7280; }
  </style>
</head>
<body>
  <h1>Zietra Status</h1>
  <p>Real-time health of zietra.com infrastructure. Auto-refreshes every 60 seconds.</p>
  <div id="components"></div>
  <p class="muted">Last checked: <span id="ts">—</span></p>
  <script>
    async function refresh() {
      const r = await fetch('/api/status');
      const data = await r.json();
      document.getElementById('ts').textContent = data.timestamp;
      document.getElementById('components').innerHTML = data.components.map(c =>
        `<div class="component"><span>${c.name}</span><span class="pill ${c.status}">${c.status}</span></div>`
      ).join('');
    }
    refresh();
    setInterval(refresh, 60_000);
  </script>
</body></html>
```

**Status page mockup (rendered):**
```
┌──────────────────────────────────────────┐
│ Zietra Status                            │
│                                          │
│ Real-time health of zietra.com infra...  │
│                                          │
│ API (ERP)              [ healthy ]       │
│ ─────────────────────────────────────    │
│ API (Satellite)        [ healthy ]       │
│ ─────────────────────────────────────    │
│ Aurora                 [ healthy ]       │
│ ─────────────────────────────────────    │
│ RDS Proxy              [ degraded ]      │  ← red pill
│ ─────────────────────────────────────    │
│ Cognito                [ healthy ]       │
│ ─────────────────────────────────────    │
│ SES                    [ healthy ]       │
│ ─────────────────────────────────────    │
│ CloudFront             [ healthy ]       │
│                                          │
│ Last checked: 2026-05-15T14:32:01Z       │
└──────────────────────────────────────────┘
```

### Pattern 6: PageHelmet retrofit (mechanical change × 25)

**What:** Replace inline `<Helmet>...</Helmet>` blocks (or where missing, ADD them) with `<PageHelmet title="..." description="..." path="..." />`. Per-page: ~5 LOC, ~3 minutes per page = ~75 min total. Verify with curl/grep per route.

**Example before-after:**
```tsx
// BEFORE — src/pages/ModulePage.tsx (inline Helmet)
import { Helmet } from 'react-helmet-async'
// ...
return (
  <>
    <Helmet>
      <title>{module.title} · Zietra</title>
      <meta name="description" content={module.tagline} />
    </Helmet>
    {/* page content */}
  </>
)

// AFTER — uses PageHelmet
import { PageHelmet } from '../components/PageHelmet'
// ...
return (
  <>
    <PageHelmet
      title={module.title}
      description={module.tagline}
      path={`/modules/${module.slug}`}
      ogImage={`/og/modules/${module.slug}.png`}
    />
    {/* page content */}
  </>
)
```

**Verify per page:**
```bash
# After deploy, for each route:
curl -s https://zietra.com/modules/crm | grep -E '<title>|og:title|og:image|canonical' | head -5
# Expected:
# <title>Salesforce CRM — built into your ERP · Zietra</title>
# <meta property="og:title" content="Salesforce CRM — built into your ERP · Zietra"/>
# <meta property="og:image" content="/og/modules/crm.png"/>
# <link rel="canonical" href="https://zietra.com/modules/crm"/>
```

### Pattern 7: Satori OG image generation (one-time build script)

**What:** Node.js script reads `modules.ts` + `case-studies.ts`, renders JSX → SVG via Satori, converts SVG → PNG via @resvg/resvg-js, writes `public/og/modules/*.png`. Run once per design refresh, NOT on every build.

**Example:**
```javascript
// scripts/gen-og-images.mjs — NEW
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs/promises';
import path from 'node:path';

// Load module data (must be pre-built — modules.ts is autogen'd by sync-modules.mjs)
const { MODULES } = await import('../src/data/modules.ts');

// Load Inter font (Satori needs explicit font data)
const inter = await fs.readFile(path.join(import.meta.dirname, 'fonts/Inter-Bold.ttf'));

function template({ title, tagline, code }) {
  return {
    type: 'div',
    props: {
      style: {
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '80px',
        background: 'linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%)',
        color: 'white', fontFamily: 'Inter',
      },
      children: [
        { type: 'div', props: { style: { fontSize: 24, opacity: 0.7, marginBottom: 16 }, children: 'Zietra' } },
        { type: 'div', props: { style: { fontSize: 64, fontWeight: 700, marginBottom: 24 }, children: title } },
        { type: 'div', props: { style: { fontSize: 28, opacity: 0.9, lineHeight: 1.4 }, children: tagline } },
        { type: 'div', props: { style: { fontSize: 20, marginTop: 'auto', opacity: 0.6 }, children: `zietra.com/modules/${code}` } },
      ],
    },
  };
}

for (const m of MODULES) {
  const svg = await satori(template({ title: m.shortName, tagline: m.tagline, code: m.code }), {
    width: 1200, height: 630,
    fonts: [{ name: 'Inter', data: inter, weight: 700, style: 'normal' }],
  });
  const png = new Resvg(svg).render().asPng();
  const out = path.join('public/og/modules', `${m.slug}.png`);
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, png);
  console.log(`✓ ${out} (${png.length} bytes)`);
}
```

**Run:**
```bash
cd /Users/jeet/zietra/marketing
node scripts/gen-og-images.mjs
# Output: 13 PNGs, each ~40-80 KB, 1200×630
```

### Pattern 8: k6 load test (top-10 endpoints, ramping VUs)

**What:** k6 script with `ramping-vus` executor — 0 VUs → 50 over 5 minutes, 30s plateau, ramp-down. Pass criteria as k6 `thresholds`: `http_req_duration p95 < 2× baseline` (baseline from 55-04), `http_req_failed < 0.001`.

**Example:**
```javascript
// scripts/k6-load-test.js — NEW
import http from 'k6/http';
import { check, group } from 'k6';

export const options = {
  scenarios: {
    ramp_50: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '30s', target: 50 },
        { duration: '1m', target: 0 },
      ],
    },
  },
  thresholds: {
    // From 55-04 baseline: p50 380-529ms, p99 449-2378ms (cold-start dominated)
    // M8 budget: p95 < 2× the 55-04 p99 (gives headroom for cold starts under load)
    'http_req_duration{endpoint:data-all}':          ['p(95)<3000'],
    'http_req_duration{endpoint:satellites}':        ['p(95)<2000'],
    'http_req_duration{endpoint:parts}':             ['p(95)<2000'],
    'http_req_duration{endpoint:work-orders}':       ['p(95)<2000'],
    'http_req_duration{endpoint:tenants-current}':   ['p(95)<1000'],
    'http_req_failed': ['rate<0.001'],
  },
};

const JWT = __ENV.ZIETRA_TURION_JWT;
if (!JWT) throw new Error('Set ZIETRA_TURION_JWT env var');

const HEADERS = {
  Authorization: `Bearer ${JWT}`,
  'X-Tenant-Slug': 'turion',
};

export default function () {
  group('top-10 endpoints', () => {
    http.get('https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/data/all',
      { headers: HEADERS, tags: { endpoint: 'data-all' } });
    http.get('https://rjydekliee.execute-api.us-east-1.amazonaws.com/api/satellites',
      { headers: HEADERS, tags: { endpoint: 'satellites' } });
    http.get('https://rjydekliee.execute-api.us-east-1.amazonaws.com/api/parts',
      { headers: HEADERS, tags: { endpoint: 'parts' } });
    http.get('https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/tenants/current',
      { headers: HEADERS, tags: { endpoint: 'tenants-current' } });
    // ... 6 more endpoints (mirror perf-benchmark-top10.sh list)
  });
}
```

**Run + capture results:**
```bash
ZIETRA_TURION_JWT="eyJ..." k6 run --summary-export=k6-results.json scripts/k6-load-test.js
# Output: k6-results.json + console summary table

# Aurora ACU progression during the test:
aws cloudwatch get-metric-statistics --namespace AWS/RDS \
  --metric-name ServerlessDatabaseCapacity \
  --dimensions Name=DBClusterIdentifier,Value=zietra-aurora-prod-v2 \
  --statistics Maximum --period 60 \
  --start-time $(date -u -v-10M +%FT%TZ) --end-time $(date -u +%FT%TZ)
# Document p95 cliff + the ACU at which it plateaus in 59-04 SUMMARY.
```

### Pattern 9: Chaos scenarios (scripted, reproducible, auto-revert)

**What:** 3 small shell scripts that perturb a single AWS resource, probe the system, then revert. NO manual steps — operator runs the script and reads the verdict.

**Scenario 1 — Lambda timeout to 1s:**
```bash
#!/usr/bin/env bash
# scripts/chaos/scenario-1-lambda-timeout.sh
set -uo pipefail
FUNCTION_NAME="turion-demo-api"
ORIGINAL_TIMEOUT=$(aws lambda get-function-configuration --function-name "$FUNCTION_NAME" --query Timeout --output text)
echo "Original timeout: ${ORIGINAL_TIMEOUT}s"

# Set to 1s
aws lambda update-function-configuration --function-name "$FUNCTION_NAME" --timeout 1 >/dev/null
echo "[chaos] timeout = 1s applied; waiting 10s for config to propagate..."
sleep 10

# Probe — expect 504 not 500 crash
RESP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Origin: https://zietra.com" -H "Content-Type: application/json" \
  -d '{"name":"chaos","email":"c@c.com","intent":"support","message":"chaos test 1 — please ignore. ten chars."}' \
  https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/contact)
echo "[chaos] response code: $RESP_CODE"
[ "$RESP_CODE" = "504" ] || [ "$RESP_CODE" = "502" ] && VERDICT="PASS (graceful gateway timeout)" || VERDICT="FAIL (expected 504/502, got $RESP_CODE)"

# REVERT
aws lambda update-function-configuration --function-name "$FUNCTION_NAME" --timeout "$ORIGINAL_TIMEOUT" >/dev/null
echo "[chaos] timeout reverted to ${ORIGINAL_TIMEOUT}s"
echo "Verdict: $VERDICT"
```

**Scenario 2 — Aurora master secret rotate mid-flight:**
```bash
#!/usr/bin/env bash
# scripts/chaos/scenario-2-secret-rotate.sh
# Triggers the rotation Lambda for the RDS-managed master secret.
# Verifies that turion-demo-api still serves /api/health within 30s.
set -uo pipefail
SECRET_ID="rds!cluster-16d5e38c-d8c4-4a35-9c47-39df84b06abd-mhV473"

echo "[chaos] triggering Aurora master secret rotation..."
aws secretsmanager rotate-secret --secret-id "$SECRET_ID" >/dev/null

# Probe every 5s for 60s; record first failure + first recovery
FAIL_COUNT=0; SUCCESS_AFTER=""
for i in $(seq 1 12); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/health)
  echo "  t+${i}*5s: HTTP $CODE"
  if [ "$CODE" != "200" ]; then FAIL_COUNT=$((FAIL_COUNT+1)); fi
  if [ "$CODE" = "200" ] && [ -z "$SUCCESS_AFTER" ] && [ "$FAIL_COUNT" -gt 0 ]; then
    SUCCESS_AFTER="${i}*5s"
  fi
  sleep 5
done

[ "$FAIL_COUNT" -le 2 ] && VERDICT="PASS (≤2 failures during rotation)" || VERDICT="FAIL ($FAIL_COUNT failures)"
echo "Verdict: $VERDICT (first recovery at $SUCCESS_AFTER)"
# No revert needed — rotation creates a new credential version, both work.
```

**Scenario 3 — RDS Proxy connection exhaustion:**
```bash
#!/usr/bin/env bash
# scripts/chaos/scenario-3-proxy-exhaustion.sh
set -uo pipefail
PROXY_NAME="zietra-aurora-proxy"
ORIGINAL_PCT=$(aws rds describe-db-proxy-target-groups --db-proxy-name "$PROXY_NAME" \
  --query 'TargetGroups[0].ConnectionPoolConfig.MaxConnectionsPercent' --output text)
echo "Original MaxConnectionsPercent: $ORIGINAL_PCT"

aws rds modify-db-proxy-target-group --db-proxy-name "$PROXY_NAME" --target-group-name default \
  --connection-pool-config MaxConnectionsPercent=10 >/dev/null
echo "[chaos] MaxConnectionsPercent=10 applied; waiting 30s for proxy to adjust..."
sleep 30

# Fire 50 parallel requests
echo "[chaos] firing 50 parallel /api/data/all requests..."
seq 50 | xargs -P 50 -I{} -- curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $ZIETRA_TURION_JWT" -H "X-Tenant-Slug: turion" \
  https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/data/all > /tmp/chaos-3-codes.txt

OK=$(grep -c '^200$' /tmp/chaos-3-codes.txt || true)
ERR=$(grep -cv '^200$' /tmp/chaos-3-codes.txt || true)
echo "[chaos] 200s: $OK, non-200s: $ERR"
[ "$OK" -ge 45 ] && VERDICT="PASS (queueing — ≥45/50 succeeded)" || VERDICT="FAIL (only $OK/50 succeeded)"

# REVERT
aws rds modify-db-proxy-target-group --db-proxy-name "$PROXY_NAME" --target-group-name default \
  --connection-pool-config MaxConnectionsPercent="$ORIGINAL_PCT" >/dev/null
echo "[chaos] MaxConnectionsPercent reverted to $ORIGINAL_PCT"
echo "Verdict: $VERDICT"
```

### Anti-Patterns to Avoid

- **Don't bundle Swagger UI into the marketing JS bundle.** It's ~2 MB. Load from CDN with `<link>` + `<script>` tags + SRI hash. This keeps `/docs/api` page-load light and only paid when the user lands on that route.
- **Don't store audit_log_v2 forever in the same table.** Audit rows grow unboundedly. Schema needs a `created_at` index AND a daily DELETE cron via EventBridge (90-day retention by default).
- **Don't run chaos tests in business hours.** Schedule after 19:00 local; test on `turion` tenant only first; have rollback in muscle memory.
- **Don't call CloudWatch from the status Lambda on every request.** CF cache 30s. Otherwise 1000 concurrent visitors = 1000 CloudWatch API calls/minute → throttling.
- **Don't include PII in audit_log_v2's `before_data`/`after_data`.** Email is OK (already in the row that's being changed); avoid logging customer phone numbers, raw passwords (impossible — they're already hashed). Filter at the route level.
- **Don't auto-regenerate OG images on every `npm run build`.** Make `gen-og-images.mjs` a separate script the operator runs when copy changes. Otherwise CI rebuilds add 30s and PNGs end up in git diffs forever.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Outbound HTTPS from Lambda to AWS service | Custom proxy / SSH tunnel / NAT instance | AWS interface VPC endpoint | $7/mo/AZ, native, no code change, the established 54.6 pattern. |
| Per-tenant audit log table | Separate Mongo / Elasticsearch / DynamoDB | Postgres `public.audit_log_v2` with RLS | Already have Postgres + RLS + Cognito sub on every request; new infra = new failure mode. |
| Status page | Custom React app with Redis pub/sub | Static HTML + JSON Lambda + CF 30s cache | 1 Lambda + 1 HTML file vs 4 services. |
| Status-page-as-a-service | Atlassian Statuspage ($29-$1499/mo) | Roll-your-own (above) | $0.20/mo for our scale; brand-controlled. Revisit if customer asks for incident timelines + subscription UX. |
| OG image generation | Headless Puppeteer + Chrome (300 MB) | Satori + @resvg/resvg-js (15 MB) | No Chrome dep, faster, JSX-native, designed exactly for this. |
| API documentation | Hand-written HTML tables | OpenAPI 3.1 + Swagger UI | OpenAPI is the standard enterprise buyers expect; Swagger UI gives "try it now" for free. |
| Load testing | Bash loop with `curl` + `time` | k6 (or `ab` as fallback) | k6 has thresholds, ramping VUs, JSON output, Grafana integration. |
| Chaos testing | Manually toggling things in console | Scripted scenarios with auto-revert | Reproducible + safe + records baseline behavior. |
| SOC 2 controls tracker | Custom spreadsheet | Markdown doc in repo + AWS-published SOC 2 mapping | Lives next to code, version-controlled, auditor-friendly. |
| Per-page meta tags | Inline `<Helmet>` in every page | `<PageHelmet>` wrapper (already shipped 58-04) | DRY — title format, canonical URL prefix, OG fallback all in one place. |

**Key insight:** Almost every item in this phase has a "use the AWS-native or library-standard answer." The only genuinely custom pieces are the audit_log_v2 schema (mirror existing `turion.audit_log`), the status page Lambda (~80 LOC), and the SOC 2 markdown doc.

---

## Common Pitfalls

### Pitfall 1: SES VPCE endpoint type confusion

**What goes wrong:** Operator creates `com.amazonaws.us-east-1.email-smtp` (SMTP endpoint) when the code uses `@aws-sdk/client-ses` (HTTPS API). The endpoint exists but routes are wrong → SES calls still hang.

**Why it happens:** AWS exposes BOTH SMTP and API VPCEs; the docs sometimes show SMTP examples and SDK examples interchangeably without naming the right service.

**How to avoid:** Verify the SDK in use:
```bash
grep -rn "@aws-sdk/client-ses\|nodemailer\|smtp" /Users/jeet/turion-space-demo/backend/src/
```
If `@aws-sdk/client-ses` → endpoint is `com.amazonaws.us-east-1.email`.
If `nodemailer` w/ SMTP → endpoint is `com.amazonaws.us-east-1.email-smtp`.
**For us: it's the API endpoint** (`client-ses` in contact.ts:25).

**Warning signs:** After VPCE attached, `[contact] SES delivered` still doesn't fire → wrong endpoint type.

### Pitfall 2: VPCE in unsupported Availability Zone

**What goes wrong:** `create-vpc-endpoint` succeeds but the endpoint is in `pending-acceptance` forever because the subnet's AZ isn't supported for that endpoint type.

**Why it happens:** AWS publishes a list of AZs where SES SMTP VPCE is NOT supported: `use1-az2, use1-az3, use1-az5, ...`

**How to avoid:** Confirm subnet AZs are NOT in that list:
```bash
aws ec2 describe-subnets --subnet-ids subnet-052ed80f6904b9fe7 subnet-07893035668f1b015 \
  --query 'Subnets[].[SubnetId,AvailabilityZoneId]' --output table
# If either AZ is use1-az2/3/5, swap to a supported subnet OR use SES API endpoint (which has broader AZ support).
```

For SES API VPCE: broader support; only confirm via console.

### Pitfall 3: react-helmet-async only hydrates client-side

**What goes wrong:** `<PageHelmet>` renders correctly in Chrome but LinkedIn/Twitter/iMessage previews fall back to the bare `dist/index.html` `<head>` because their crawlers don't execute JS.

**Why it happens:** Vite SPA — there's a SINGLE `dist/index.html` for all routes. Helmet hydrates after JS runs.

**How to avoid:** Document this in the SUMMARY as a KNOWN limitation. Default OG image (`/og/default.png` from 58-04) covers the non-JS case acceptably. Full per-page social previews require either Astro SSR (M9 decision) or a Lambda@Edge OG-injector. Both are out of scope for M8 — the M8 requirement is the WRAPPER + the per-module IMAGES, not server-side rendering.

**Warning signs:** Operator pastes a `/modules/crm` link in LinkedIn and sees the default Zietra OG (not the CRM OG). That's expected for M8.

### Pitfall 4: `auditLog()` called outside `withTenantClient`

**What goes wrong:** Developer calls `auditLog(req, ...)` from a route that doesn't use `withTenantClient` → insert succeeds but `tenant_id` falls back to NULL or fails RLS.

**Why it happens:** Easy mistake when retrofitting routes one by one.

**How to avoid:** The helper takes a `PoolClient` as 2nd arg, NOT `pool`. The PoolClient must come from inside `withTenantClient(req, async (client) => { ... auditLog(req, client, ...) })`. Type system enforces this if `auditLog` is declared `(req: Request, client: PoolClient, opts: ...)`.

**Warning signs:** Test failure with "new row violates row-level security policy for table audit_log_v2" or `null value in column tenant_id`.

### Pitfall 5: Audit log table growth → query slowness

**What goes wrong:** After 3 months at 1000 writes/tenant/day × 50 tenants = 4.5M rows. Settings UI `SELECT * FROM audit_log_v2 ORDER BY created_at DESC LIMIT 50` becomes slow.

**Why it happens:** Default Postgres scan; no efficient (tenant_id, created_at DESC) composite index.

**How to avoid:** Migration 036 MUST include `CREATE INDEX audit_log_v2_tenant_created_idx ON public.audit_log_v2(tenant_id, created_at DESC);`. AND a 90-day retention DELETE cron via EventBridge: `DELETE FROM public.audit_log_v2 WHERE created_at < now() - interval '90 days'` daily at 03:00 UTC.

**Warning signs:** Settings → Audit log page takes >2s to render after 3 months of operation.

### Pitfall 6: Swagger UI CDN breaks CSP

**What goes wrong:** Marketing site has a tight Content-Security-Policy header (good security). Loading Swagger UI from `unpkg.com` breaks because CSP doesn't allow that origin.

**Why it happens:** CF deployment 54.6 set `default-src 'self'`.

**How to avoid:** Either (a) host swagger-ui-dist files in `/public/swagger-ui/` (no CDN, ~500 KB on first visit but cached), OR (b) add `unpkg.com` to script-src + style-src + img-src with SRI hashes pinned.

Recommended: **(a) host locally.** No external dep, no CDN downtime risk.

### Pitfall 7: k6 from operator machine doesn't simulate VPC latency

**What goes wrong:** k6 runs from operator's Mac → goes via public CloudFront → hits APIGW. Latency includes operator's home internet hop (+50-200ms RTT). Numbers look worse than real SaaS-region traffic.

**Why it happens:** Real users are scattered across the world; the operator is one data point.

**How to avoid:** Run k6 from a t3.micro EC2 in us-east-1 (same region). OR document the operator-machine latency offset in the SUMMARY. For M8, **operator-machine k6 is acceptable** — we're checking pass/fail vs baseline, not absolute numbers. M9 should productionize via Lambda k6 runner.

### Pitfall 8: Chaos test forgets to revert

**What goes wrong:** Scenario 1 (Lambda timeout = 1s) is left at 1s after script crashes mid-way. Production is now serving 504s indefinitely.

**Why it happens:** Script uses `set -e` and crashes before the revert step.

**How to avoid:** Use `set -uo pipefail` (NOT `set -e`) AND wrap the revert in a `trap`:
```bash
trap 'aws lambda update-function-configuration --function-name "$FUNCTION_NAME" --timeout "$ORIGINAL_TIMEOUT" >/dev/null 2>&1 || true' EXIT
```
ALSO run from a screen/tmux session so interrupted SSH doesn't leave state changed.

**Warning signs:** `aws lambda get-function-configuration ... --query Timeout` returns 1 after the chaos run.

### Pitfall 9: SOC 2 controls doc claims more than we deploy

**What goes wrong:** Marking "CC6.1 Logical access controls" as DEPLOYED when we only have Cognito sign-in (no MFA enforced, no SSO).

**Why it happens:** Optimism + lack of specificity in TSC language.

**How to avoid:** Each "deployed" row in `docs/soc2-controls-status.md` MUST include the file:line or AWS resource ARN that backs it. "Cognito sign-in with required password complexity" ≠ "MFA enforced." Be honest: many will be PARTIAL.

**Warning signs:** Document is mostly green checkmarks before phase end → likely over-claimed.

### Pitfall 10: Status page reads CloudWatch on every visitor request

**What goes wrong:** Marketing tweet → 1000 visitors load `status.zietra.com` simultaneously → status Lambda fires `DescribeAlarms` 1000×/min → throttled (`cloudwatch:DescribeAlarms` quota is 50 TPS).

**Why it happens:** Forgot edge caching.

**How to avoid:** CF distro in front of the API Lambda. Set `cache-control: public, max-age=30` in Lambda response. CF respects it → 1 backend call per 30s regardless of visitor count. Alternative: have the Lambda be invoked on a 60s EventBridge schedule writing to S3, and the static page reads the S3 JSON (zero hot-path Lambda). For M8, CF 30s cache is simpler.

### Pitfall 11: OG images don't get the right `Content-Type`

**What goes wrong:** `og:image` points to `/og/modules/crm.png` but S3 serves it with `binary/octet-stream` → Facebook/LinkedIn refuses to preview it.

**Why it happens:** `aws s3 sync` sometimes mis-detects mime types when source files lack extensions OR when set-content-type rules aren't applied.

**How to avoid:** Use explicit `--content-type image/png` on sync, or use `aws s3 cp` per file with `--content-type`. Verify after deploy: `curl -I https://zietra.com/og/modules/crm.png | grep -i content-type` should be `image/png`.

### Pitfall 12: Migration 036 RLS gap (no FORCE)

**What goes wrong:** RLS policy is created on `audit_log_v2` but `FORCE ROW LEVEL SECURITY` not set → tenant superuser (e.g., zietra_admin_bypass) can leak across tenants.

**Why it happens:** 55-03 established the pattern but it's easy to forget for new tables.

**How to avoid:** Migration 036 MUST include:
```sql
ALTER TABLE public.audit_log_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log_v2 FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_log_v2_tenant_isolation ON public.audit_log_v2
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
```
Then the 459-test RLS isolation suite (55-04) will catch any gap on next PR.

### Pitfall 13: PageHelmet retrofit conflicts with existing per-page `<Helmet>`

**What goes wrong:** Page has both inline `<Helmet>` AND new `<PageHelmet>` → two `<title>` tags, browser uses last one which may not be the intended one.

**Why it happens:** Incomplete retrofit; old code not deleted.

**How to avoid:** Per-page checklist in 59-03 plan:
1. Delete the inline `import { Helmet } from 'react-helmet-async'` line.
2. Delete the `<Helmet>...</Helmet>` block.
3. Add `import { PageHelmet } from '../components/PageHelmet'`.
4. Add `<PageHelmet ... />` near the top of the JSX return.
5. Verify with `curl ... | grep -c '<title>'` → should be exactly 1.

---

## Code Examples

(Patterns 1-9 above are the core code examples — VPCE attach, auditLog helper, dashboard JSON, status Lambda, PageHelmet retrofit, Satori script, k6 script, 3 chaos scenarios.)

### Common Operation: OpenAPI 3.1 spec authoring (top 30 endpoints)

```yaml
# marketing/public/docs/openapi.yaml — NEW
openapi: 3.1.0
info:
  title: Zietra Platform API
  version: 0.1.0
  description: |
    Public REST API for the Zietra multi-tenant SaaS platform.
    All authenticated endpoints expect a Cognito ID token in `Authorization: Bearer <jwt>`
    and a tenant slug in `X-Tenant-Slug: <slug>`.
  contact:
    email: support@zietra.com
servers:
  - url: https://lo254mvukl.execute-api.us-east-1.amazonaws.com
    description: Zietra ERP API (turion-demo-api Lambda)
  - url: https://rjydekliee.execute-api.us-east-1.amazonaws.com
    description: Zietra Satellite API (turion-satellite-api Lambda)
paths:
  /api/contact:
    post:
      summary: Submit a contact-form message (public, no auth)
      tags: [Public]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [name, email, intent, message]
              properties:
                name:    { type: string, minLength: 1, maxLength: 200 }
                email:   { type: string, format: email, maxLength: 320 }
                company: { type: string, maxLength: 200 }
                intent:  { type: string, enum: [sales, support, security, partner, other] }
                message: { type: string, minLength: 10, maxLength: 5000 }
                website: { type: string, description: "Honeypot — leave empty" }
      responses:
        '200': { description: Submission received }
        '400': { description: Validation error }
        '403': { description: Origin not allowed }
        '429': { description: Rate limit exceeded (5/IP/hour) }
  /api/tenants/current:
    get:
      summary: Get current tenant metadata
      tags: [Tenants]
      security: [{ bearerAuth: [], tenantSlug: [] }]
      responses:
        '200':
          description: Tenant info
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:   { type: string, format: uuid }
                  slug: { type: string }
                  name: { type: string }
  # ... 28 more endpoints (signup, team/invite, team/role, modules/, onboarding/recommend, etc.)
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    tenantSlug:
      type: apiKey
      in: header
      name: X-Tenant-Slug
```

**Swagger UI loader:**
```html
<!-- marketing/src/pages/ApiDocsPage.tsx (skeleton) -->
import { PageHelmet } from '../components/PageHelmet'
import { useEffect } from 'react'

export default function ApiDocsPage() {
  useEffect(() => {
    // Load Swagger UI from local /public/swagger-ui/ (CSP-safe)
    // @ts-ignore - global from swagger-ui-bundle.js
    if (window.SwaggerUIBundle) {
      // @ts-ignore
      window.SwaggerUIBundle({
        url: '/docs/openapi.yaml',
        dom_id: '#swagger-ui',
        deepLinking: true,
      })
    }
  }, [])
  return (
    <>
      <PageHelmet title="API Documentation" description="Interactive REST API reference for the Zietra platform" path="/docs/api" />
      <link rel="stylesheet" href="/swagger-ui/swagger-ui.css" />
      <script src="/swagger-ui/swagger-ui-bundle.js" />
      <div id="swagger-ui" />
    </>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| OG images: hand-design in Figma | OG images: Satori (Vercel) — JSX → SVG → PNG | Satori released 2023; Resvg-JS mature 2024 | One-time script reusable for arbitrary route metadata. |
| Status page: roll-your-own with Redis pubsub | Status page: static + Lambda + 30s CF cache (or Statuspage SaaS) | Statuspage SaaS market matured 2018-2020; serverless static became cheap 2020+ | Two-file Lambda + index.html replaces a multi-service deployment. |
| Lambda outbound: NAT gateway ($32-65/mo) | Lambda outbound: VPC interface endpoint per service (~$7/mo each) | AWS expanded VPCE service coverage 2020-2024; SES VPCE released April 2020 | 60-80% cost reduction at our scale. |
| API docs: hand-written HTML | API docs: OpenAPI 3.1 + Swagger UI | OpenAPI 3.0 (2017), 3.1 (2021) | Enterprise buyers expect machine-readable specs. |
| Load test: ab (Apache Bench) | Load test: k6 (Grafana) | k6 v1.0 released 2017; community standard 2020+ | Ramping VUs + thresholds + JS scripting. ab still works for smoke. |
| Audit log: file-based or `printf` | Audit log: RLS-scoped Postgres table + retention cron | Postgres RLS available since 9.5 (2016); standard SaaS practice 2018+ | Same DB, same backup story, queryable by tenant. |
| SOC 2: hire a consultant | SOC 2: self-prep with AWS-published TSC-to-service mapping (AWS Audit Manager has templates) | AWS Audit Manager GA'd 2020 | $10-50K savings on prep work; consultant validates rather than authors. |

**Deprecated / outdated for our context:**
- **NAT gateway** for SES alone — VPCE is cheaper and faster.
- **Custom audit-log DynamoDB tables** — pointless overhead when Postgres + RLS already exists.
- **Headless Puppeteer for OG images** — Satori is purpose-built; Puppeteer was the only option in 2020-2022.
- **Atlassian Statuspage at our scale** — SaaS pricing assumes you'd rather pay than build; we have the infra to build, and we already pay for CF + Lambda.

---

## Open Questions

1. **Audit log retention: 90 days (default) — confirm with operator.**
   - What we know: 90d covers Q1 audit windows. Storage cost negligible (~$10/mo at 5M rows).
   - What's unclear: Some SOC 2 auditors want 1 year of audit history. We can extend to 1y at any time by changing the EventBridge schedule + bumping retention env var.
   - Recommendation: Default to 90 days for M8. Document the env var (`AUDIT_LOG_RETENTION_DAYS=90`) for easy bump in M9 if an auditor pushes back.

2. **`docs.zietra.com` subdomain vs `/docs/api` route — confirm scope.**
   - What we know: ROADMAP says `/docs/api` on marketing site. 58-deferred mentioned `docs.zietra.com` as a possible future.
   - What's unclear: Does the operator want JUST the API spec at `/docs/api`, OR a full developer-docs subdomain (Mintlify/VitePress)?
   - Recommendation: Stay with `/docs/api` for M8 (matches ROADMAP). Defer subdomain decision to M9.

3. **Cognito sign-up rate as a status component — yes/no?**
   - What we know: Status page lists 7 components; Cognito sign-in failure rate alarm exists.
   - What's unclear: Do we surface that as a public component, or keep it internal?
   - Recommendation: SURFACE. Customer-facing transparency is the point.

4. **Chaos test environment — staging vs production?**
   - What we know: We don't have a separate staging environment; all 4 Lambdas serve production. The 3 chaos scenarios are designed to auto-revert in <60s.
   - What's unclear: Does the operator accept brief (~60s) controlled degradation on the `turion` tenant for evidence?
   - Recommendation: Schedule chaos for 22:00 UTC (low traffic). Notify any active users in advance via the status page banner. Run on `turion` first; abort if anything unexpected; then run other tenants only if needed.

5. **Cross-tenant impact of audit log RLS — does `zietra_admin_bypass` see all tenants?**
   - What we know: 55-03 added FORCE RLS so even the BYPASSRLS role respects policies in normal usage. But the bypass role exists for admin tooling.
   - What's unclear: Does the future support-impersonation UX need to view audit logs cross-tenant?
   - Recommendation: For M8, audit log query goes through `withTenantClient` (RLS-scoped). For M9 support-impersonation, add a separate `/api/admin/audit-log` route that uses bypass and is logged-to-itself for accountability.

6. **OpenAPI spec freshness — how do we keep it in sync?**
   - What we know: Hand-curated YAML drifts. 169 routes total; we cover 30.
   - What's unclear: Do we want a CI check that diff's the YAML against `extract-routes.mjs` output (alerts on uncovered new routes)?
   - Recommendation: For M8, no CI check (covered set is hand-picked, doesn't track all 169). For M9, add `scripts/openapi-drift-check.mjs` that warns if a new route appears.

7. **Per-module OG: include the module icon image?**
   - What we know: Module catalog has icon names (e.g., `users`, `shopping-cart`) — refers to lucide-react names, not actual image files.
   - What's unclear: Do we render the icon in the OG, or use color + typography only?
   - Recommendation: Color + typography only for M8 (Satori can do icons but it's an extra fetch + complication). Hand-design pass in M9 can add icons.

---

## Sources

### Primary (HIGH confidence)
- ROADMAP Phase 59 entry (lines 1014-1046 of `/Users/jeet/doordash-p2p/.planning/ROADMAP.md`) — scope lock + 11 requirements
- Phase 58 CHECKPOINT.md — M7 closure + deferred items + recommended plan structure
- Phase 58 deferred-items.md — SES-VPC issue context (full 23 lines)
- Phase 54.6-04 SUMMARY — CloudWatch alarms baseline, smoke matrix pattern, VPCE pattern proven on Secrets Manager/KMS/Cognito
- Phase 55-04 SUMMARY — perf baseline (p50 380-529ms, p99 449-2378ms), top-10 endpoint list, 459-test isolation suite
- `/Users/jeet/turion-space-demo/backend/src/db.ts` — `withTenantClient` pattern + existing `audit()` helper to extend
- `/Users/jeet/turion-space-demo/backend/src/routes/contact.ts` — SES SDK usage confirmed (`@aws-sdk/client-ses` → API endpoint, not SMTP)
- `/Users/jeet/zietra/marketing/src/components/PageHelmet.tsx` — wrapper shape for retrofit
- `/Users/jeet/zietra/marketing/src/App.tsx` — 16 lazy-loaded pages (NOT 25 — see note below)
- `/Users/jeet/doordash-p2p/scripts/perf-benchmark-top10.sh` — k6 input list
- [AWS Docs: Setting up VPC endpoints with Amazon SES](https://docs.aws.amazon.com/ses/latest/dg/send-email-set-up-vpc-endpoints.html) — VPCE service names + AZ exclusion list
- [AWS Blog: SES VPC endpoint launch (2020)](https://aws.amazon.com/blogs/aws/new-amazon-simple-email-service-ses-for-vpc-endpoints/) — confirms both SMTP + API endpoint types
- [AWS: SES now offers VPC Endpoint support for SMTP endpoints](https://aws.amazon.com/about-aws/whats-new/2020/04/amazon-ses-now-offers-vpc-endpoint-support-for-smtp-endpoints/)
- [vercel/satori GitHub](https://github.com/vercel/satori) — JSX → SVG renderer (MIT)
- [satori on npm](https://www.npmjs.com/package/satori)
- [Generate Image From HTML Using Satori and Resvg (DEV.to)](https://dev.to/anasrin/generate-image-from-html-using-satori-and-resvg-46j6) — Node.js usage pattern

### Secondary (MEDIUM confidence)
- [Amazon SES Pricing 2026](https://smtpedia.com/amazon-aws-ses-pricing/) — VPCE cost reference
- [Generating Open Graph Images at Build Time (2026)](https://theportraitofageek.com/2026/generating-og-images-at-build-time/) — Satori build-time integration pattern

### Tertiary (validation pending)
- Specific AWS Audit Manager SOC 2 template format — operator should fetch the latest from console before authoring `docs/soc2-controls-status.md` (template content evolves quarterly).

### Inline corrections to upstream inputs
- ROADMAP says "25 marketing pages" — `src/App.tsx` actually has 16 page components. The 25 number was approximate; correct count is 16 routes (with `/modules/:slug` × 13 module URLs + `/case-studies/:slug` × 3 case study URLs reaching 26 total URLs per Phase 58 CHECKPOINT). PageHelmet retrofit work is per-component (16) not per-URL (26+).

---

## Metadata

**Confidence breakdown:**
- SES VPCE service name + commands: **HIGH** — verified against AWS official docs + WebSearch + 54.6 precedent
- Audit log v2 schema + helper: **HIGH** — extends existing `turion.audit_log` pattern + 55-03 `withTenantClient` pattern + 55-04 RLS test infra
- CloudWatch dashboard JSON shape: **HIGH** — standard AWS pattern, applied via `put-dashboard`
- Status page architecture: **MEDIUM-HIGH** — own design, but built from proven primitives (S3 + CF + Lambda + CW alarms)
- /docs/api + Swagger UI + OpenAPI 3.1: **HIGH** — industry standard
- PageHelmet retrofit scope: **HIGH** — 16 pages confirmed from `src/App.tsx`
- Satori OG image generation: **HIGH** — verified library, common pattern (Anas Rin DEV.to + Mfyz Astro guides), one-time script
- k6 load tests: **HIGH** — extends 55-04 `perf-benchmark-top10.sh`; ramping-vus is k6 standard
- Chaos scenarios: **MEDIUM-HIGH** — designs sound, but real verdict only after operator runs them
- SOC 2 controls audit: **MEDIUM** — TSC mapping is honest work but auditor opinions vary; we're producing a self-assessment, not a Type II report

**Research date:** 2026-05-15
**Valid until:** 2026-06-15 (30 days — AWS service prices may shift; SDK versions may bump but interface is stable)

---

*Phase 59 RESEARCH complete. Planner can now create PLAN.md files for the recommended 4-plan structure (59-01 through 59-04).*
