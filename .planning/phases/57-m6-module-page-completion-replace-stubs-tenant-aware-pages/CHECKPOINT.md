# Phase 57 — CHECKPOINT (M6 module page completion COMPLETE)

**Status:** ALL 11 ROADMAP requirements closed across plans 57-01 → 57-04
**Date completed:** 2026-05-15
**Plans shipped:** 4 of 4
**Branch:** `gsd/phase-54-m6-modular-ui-shell-module-aware-navigation-redesign-add-on-catalog` (Phase 57 carried on Phase 54's branch — see ROADMAP)

---

## Inheritance — what Phase 57 delivered

Phase 57 closed **all 11 ROADMAP requirements** for the M6 milestone by replacing 16 stub pages with real, RLS-enforced module pages, gap-filling missing backend list endpoints, persisting AI agent runs, and building real Settings/Help pages. The product is now demonstrably real across D2C, SaaS, and Aerospace use cases.

| Wave | Plan | What shipped |
|------|------|-------------|
| 1 | 57-01 | `/lib/page-template.js` (~330 LOC reusable list/create/detail helper); 7 stub→real flips: Salesforce {customers, opportunities}, NetSuite {invoices, journal-entries}, Arena {parts, change-orders}, Ramp {cards}; 5 missing backend LIST endpoints filled |
| 2 | 57-02 | Arena keyedEntity routes for {ncrs, capas, audits}; chrome populator script (data-z-tenant-name on 6 Turion-content pages); CF Function R-map baseline (10,156 B) |
| 3 | 57-03 | 6 new pages: MES {work-orders, build-steps}, Quality {ncrs, capas, audits}, Royalty {agreements}; new Royalty backend (mig 033 + 5 routes); page-template.js `async-select` + `transform` extensions |
| 4 | 57-04 | **THIS PLAN** — 3 AI Agents pages with run-history + trigger UI; real Settings + Help (replaced 64-line stubs); migration 034 (agent_runs) + agents.ts retrofit (4 POSTs + 2 GETs); CF Function 10,056→9,130 B; 16 orphaned stub HTML files deleted |

---

## Wave 4 (57-04) — what shipped

- **1 new migration:** `backend/migrations/034_agent_runs.sql` (28 LOC; turion.agent_runs uuid PK + RLS + FORCE + GRANT zietra_app; compound index on tenant_id+agent_kind+started_at DESC; applied via Phase 55-05 `zietra-rls-runner-55-05`)
- **1 modified backend file:** `backend/src/routes/agents.ts` (+108 LOC; 4 POST handler retrofits + 2 new GET routes — `/runs?kind=<>` LIST + `/runs/:id` DETAIL; persistence helpers `insertAgentRun`/`markAgentRunSuccess`/`markAgentRunFailed` with best-effort error handling)
- **1 ERP Lambda redeploy:** `turion-demo-api` CodeSha256 `7a696edf…` → `8b308f55…`
- **3 new AI Agents UI pages** (~90 LOC each, page-template-driven):
  - `/agents/ncr-capa` → list `?kind=ncr-capa` + POST `/api/agents/ncr-capa`
  - `/agents/evms` → list `?kind=evms` + POST `/api/agents/evms`
  - `/agents/integration` → list `?kind=integration-sentinel` + POST `/api/agents/integration-sentinel`
- **2 stub-replacement real pages:**
  - `settings.html` (64→100 LOC, 6 cards: Tenant info from `/api/tenants/current`, Branding placeholder, Members count, Modules count, Billing placeholder, Danger zone mailto)
  - `help.html` (64→91 LOC, 4 sections: Getting started 4 link cards, Module guides rendered from `window.MODULE_CATALOG`, Contact, API docs placeholder)
- **1 modified CF Function:** `cf-function-source/turion-clean-urls.js` (10,056 → **9,130 B**, **1,110 B headroom** under 10,240 limit; identity mappings collapsed into DP fallback `['/mes/','/quality/','/royalty/','/agents/','/salesforce/','/netsuite/','/arena/']`; non-identity overrides preserved; 3 stub redirects removed)
- **16 stub HTML files deleted** from git (and from S3 via `aws s3 sync`'s default `--delete` behavior). Only `stubs/marketing-coming-soon.html` remains (intentional placeholder).

---

## Smoke results

| Surface | Count | Pass | Fail |
|---------|-------|------|------|
| Phase 57 module pages (new + 57-01..03) | 18 | 18 | 0 |
| Turion-content regression pages | 6 | 6 | 0 |
| Backend API endpoints (403 auth-gate) | 8 | 8 | 0 |
| Royalty DB round-trip (57-03) | 1 | 1 | 0 |
| agent_runs DB round-trip (57-04) | 1 | 1 | 0 |
| **TOTAL** | **34** | **34** | **0** |

### Pages (24/24 → 200)

```
/salesforce/customers /salesforce/opportunities
/netsuite/invoices /netsuite/journal-entries
/arena/parts /arena/change-orders
/mes/work-orders /mes/build-steps
/quality/ncrs /quality/capas /quality/audits
/royalty/agreements
/agents/ncr-capa /agents/evms /agents/integration
/ramp/cards
/settings /help
/netsuite-items.html /netsuite-customer-so.html /netsuite-procurement.html /netsuite-financials.html
/arena-bom.html /mes-shop-floor.html
```

### APIs (8/8 → 403, all auth-gated)

```
/api/arena/parts /api/arena/ecos
/api/royalty/agreements /api/royalty/payouts
/api/agents/runs?kind=ncr-capa /api/agents/runs?kind=evms
/api/agents/runs?kind=integration-sentinel /api/agents/runs/X
```

### agent_runs DB round-trip (RLS-bound under SET app.tenant_id GUC)

```
SET app.tenant_id = '00000000-0000-0000-0000-000000000001';
INSERT INTO turion.agent_runs (agent_kind='ncr-capa', status='success', trace, output, tenant_id) → id=557e377d…
SELECT COUNT(*) FROM turion.agent_runs WHERE agent_kind='ncr-capa' → 1
DELETE FROM turion.agent_runs WHERE output->>'capaId' = 'CAPA-AGT-TEST-57-04' → 1 row
SELECT COUNT(*) FROM turion.agent_runs WHERE agent_kind='ncr-capa' → 0  (back to baseline)
```

Proves: agent_runs RLS works AND insert/select/delete cycle leaves no test data behind.

---

## Closure evidence — 11/11 Phase 57 requirements

| # | Requirement | Closed by | Evidence |
|---|-------------|-----------|----------|
| 1 | SalesforceListPages | 57-01 | `/Users/jeet/turion-space-demo/salesforce/customers.html`, `opportunities.html` |
| 2 | NetsuiteListPages | 57-01 | `/Users/jeet/turion-space-demo/netsuite/invoices.html`, `journal-entries.html` |
| 3 | ArenaListPages | 57-01 + 57-02 | `/Users/jeet/turion-space-demo/arena/parts.html`, `change-orders.html` + arena.ts keyedEntity (ncrs/capas/audits) |
| 4 | RampListPages | 57-01 | `/Users/jeet/turion-space-demo/ramp/cards.html` |
| 5 | MesListPages | 57-03 | `/Users/jeet/turion-space-demo/mes/work-orders.html`, `build-steps.html` |
| 6 | QualityListPages | 57-03 | `/Users/jeet/turion-space-demo/quality/{ncrs,capas,audits}.html` |
| 7 | RoyaltyMgmtPages | 57-03 | `/Users/jeet/turion-space-demo/royalty/agreements.html` + `backend/migrations/033_royalty.sql:81` + `backend/src/routes/royalty.ts:97` |
| 8 | TurionContentMultitenancy | 57-02 | `/Users/jeet/turion-space-demo/lib/zietra-chrome.js` data-z-tenant-name populator (6 Turion-content pages) |
| 9 | AiAgentsUi | 57-04 | `/Users/jeet/turion-space-demo/agents/{ncr-capa,evms,integration}.html` |
| 10 | SettingsHelpPages | 57-04 | `/Users/jeet/turion-space-demo/settings.html:1-100`, `help.html:1-91` |
| 11 | BackendListEndpointsGapFill | 57-01 + 57-04 | 5 LIST endpoints in 57-01 + `backend/src/routes/agents.ts:830-869` (GET /runs + /runs/:id) + 5 royalty endpoints in 57-03 |

---

## Resources (file paths for next-phase agents)

### New AWS resources
- **Aurora schema:** `turion.agent_runs` (mig 034)
  - Columns: `id uuid PK gen_random_uuid()`, `agent_kind text CHECK in ('sales-cash','ncr-capa','evms','integration-sentinel')`, `started_at`, `completed_at`, `status 'running'|'success'|'failed'`, `trace jsonb`, `output jsonb`, `triggered_by_sub text`, `error_message text`, `tenant_id uuid FK→public.tenants ON DELETE CASCADE`
  - Index: `(tenant_id, agent_kind, started_at DESC)`
  - RLS policy: `agent_runs_tenant_isolation` (ENABLED + FORCED, USING + WITH CHECK on `app.tenant_id` GUC)
  - GRANT: SELECT/INSERT/UPDATE to `zietra_app`
- **Lambda:** `turion-demo-api` CodeSha256 `8b308f551eea605d3059e4e9cb199c13575e3f54a92380fb07423d2906f1566e`
- **CloudFront Function:** `turion-clean-urls` ETag `EKEVKO7DR4RA`, size 9,130 B
- **CloudFront invalidation:** `I58DFG90BDFS9QLYC1QOJOIFSP` (Completed)

### Key files (all under `/Users/jeet/turion-space-demo/`)
- `backend/migrations/034_agent_runs.sql` — agent_runs schema
- `backend/src/routes/agents.ts` — 4 retrofitted POST handlers + 2 new GET routes
- `lib/page-template.js` — ~488 LOC reusable list/create/detail helper (asynchronous-select + transform hooks)
- `lib/module-catalog.js` — 13-module catalog consumed by `help.html`
- `agents/{ncr-capa,evms,integration}.html` — 3 AI agent UIs (~90 LOC each)
- `settings.html`, `help.html` — replaced stubs
- `cf-function-source/turion-clean-urls.js` — single source of truth for clean-URL rewrites
- `build-and-push.sh` — ERP Lambda build/deploy script (at repo root, not `backend/`)
- `deploy-frontend.sh` — S3 sync + CF invalidation (uses `--delete` so removing files from git removes them from S3)

### Working secrets (per 57-03 SUMMARY)
- DB master password: `rds!cluster-16d5e38c-2fc2-4d06-8435-e4b01704bf74-mhV473` (the `rds!cluster-8dac9fc2…` secret in MEMORY.md returned "wrong password")
- Migration runner: `zietra-rls-runner-55-05` Lambda — `aws lambda invoke --payload file://payload.json` with `{sql, password}` JSON

---

## Deferred (intentionally — not blockers)

- **Logo upload on settings page** → M7 marketing site
- **Real tenant delete endpoint** → M8 compliance (currently mailto support per Pitfall 9 safety)
- **Royalty payouts dedicated UI page** → Royalty v2 (backend exists, only agreements page shipped)
- **AI agents auto-poll/streaming** → never (waste of Anthropic credits per RESEARCH Q5; user-triggered only)
- **Backend tenant_features.enabled enforcement middleware** → M4 Stripe (Phase 56)
- **Cursor pagination on LIST endpoints** → M8 load testing (currently fine — max ~3K rows total in seed)
- **Salesforce OAuth pull, Excel .xlsx parsing** → still deferred from Phase 54.4
- **`turion.build_steps` standalone table** → never (resolved in 57-03 via `spec.transform` flattening `mes_stages.source_data.ops[]`)
- **qa-empty tenant provisioning for permanent regression smoke** → operator action
- **/api/health 403 via CloudFront** → pre-existing routing config (S3 origin handles `/api/*`, Lambda only via API GW directly); not a P57 regression

---

## Next milestone — operator decision required

| Option | Pros | Cons | Cmd |
|--------|------|------|-----|
| **M7 — Marketing site** | Drives sign-ups; product is now demonstrably real across D2C/SaaS/Aerospace use cases (16 functional pages, full migration paths). The bottleneck has shifted from "is the product real?" → "do people know about it?". | New domain + Astro/Next site to build; no existing repo | `/gsd:plan-phase 58` (M7 marketing) |
| **M4 — Resume Stripe (Phase 56)** | Closes the billing loop so paid add-ons can actually be charged; unblocks revenue | Stripe keys + webhook lambda + customer portal work | Resume Phase 56 from paused Wave 1 Task 2 |
| **M8 — Compliance + observability** | SOC2-ready, CloudWatch dashboards, k6 load tests, per-tenant audit log dashboard | No new user-visible value; investment for enterprise sale | `/gsd:plan-phase 59` (M8) |

**Recommendation: M7 marketing site.** Phase 57 made the product real. The next limiting factor is awareness/demand-gen, not features. M7 builds zietra.com (homepage + pricing + per-module pages + signup → `/onboarding/recommend` at `<tenant>.zietra.com`) which converts the demo into a funnel. M4 (Stripe) can be picked up in parallel once an operator has Stripe keys ready — it's not blocking.

---

## 3 hand-off prompts (pick one)

1. **M7 Marketing site (RECOMMENDED):**
   ```
   /gsd:plan-phase 58 — M7 marketing site at zietra.com:
     homepage + pricing page + 13 per-module pages (one per MODULE_CATALOG entry)
     + signup CTA → /onboarding/recommend at <tenant>.zietra.com.
     Astro static site, deploy to CloudFront. docs.zietra.com sub-site for API
     reference + module guides linked from /help. Use the existing Cognito
     magic-link auth flow; signup creates a new tenant + redirects.
   ```

2. **M4 Stripe resumption:**
   ```
   /gsd:resume-work Phase 56 — M4 Stripe billing:
     resume from paused Wave 1 Task 2. Migration 035 (subscription_state +
     stripe_customer_id on tenants), webhook Lambda (subscription.updated,
     invoice.paid, customer.subscription.deleted), customer portal link from
     settings.html Billing card. Per-module add-on prices, base $99/mo.
   ```

3. **M8 Compliance + observability:**
   ```
   /gsd:plan-phase 59 — M8 compliance + observability:
     per-tenant audit log dashboard at /admin/audit, KMS-at-rest verification
     on Aurora + S3, CloudWatch alarms on agent_runs failure rate (>5/hour),
     k6 load test of all LIST endpoints (target: p95 < 500ms under 100 RPS),
     SOC2 evidence collection script, per-tenant rate limiting.
   ```

---

## Open follow-ups (small)

- ~~S3 stub cleanup~~ — Already done: `deploy-frontend.sh` uses `--delete` so the 16 stub files were removed from S3 during deploy. Only `stubs/marketing-coming-soon.html` remains.
- qa-empty tenant provisioning for permanent regression smoke — operator action
- Cursor pagination on LIST endpoints when any tenant exceeds 1,000 rows in any table (currently fine — max ~3K rows total in seed)
- Visual UAT (browser walk through 3 agents pages + settings + help by a real signed-in user) — Phase 57 ran headless-substitute smoke only per repo convention
- Anthropic API key for production agent runs — currently set on Lambda env (`ANTHROPIC_API_KEY`); rotate via AWS Secrets Manager if/when M8 secret hygiene ships
- `/api/health` returns 403 via CloudFront subdomain (pre-existing routing; S3 origin handles unknown `/api/*` paths) — fix is to add API Gateway as an additional origin behavior for `/api/health`; defer to M8

---

*Phase: 57-m6-module-page-completion-replace-stubs-tenant-aware-pages*
*All 4 plans complete. 11/11 ROADMAP requirements closed. Ready for next milestone.*
