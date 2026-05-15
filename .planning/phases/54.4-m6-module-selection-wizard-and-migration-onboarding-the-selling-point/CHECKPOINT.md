# Phase 54.4 CHECKPOINT — handoff to Phase 56 (M4 Stripe billing)

**Date:** 2026-05-15
**Phase 54.4 status:** CLOSED — all 6 ROADMAP requirements satisfied across 3 plans.

| Requirement | Closed by | Surface |
|-------------|-----------|---------|
| OnboardingWizard | 54.4-01 | `/onboarding/recommend` (5-question wizard) |
| ModuleRecommendationEngine | 54.4-01 | `POST /api/onboarding/recommend` (pure-function `recommend()`) |
| RecommendationRuleEngine | 54.4-01 | `backend/src/onboarding/rule-engine.ts` + `recommend-rules.json` |
| MigrationLanding | 54.4-02 | `/onboarding/migrate` (7 cards) |
| MigrationCards | 54.4-02 | 5 new wizards + `/lib/migration-sources.js` catalog |
| OnboardingChecklistOnHome | 54.4-03 | `index.html` mount + `/lib/onboarding-checklist.js` widget |

## What 54.4 shipped end-to-end

| Artifact | Lives at | Purpose |
|----------|----------|---------|
| Module-selection wizard | `/onboarding/recommend` (54.4-01) | 5-question wizard; pure-function rule engine; admin-only `/finalize` writes `tenant_features` + `onboarding_state.checklist.modules=true` + `wizard_completed_at=now()` |
| Migration menu | `/onboarding/migrate` (54.4-02) | 7-card landing renders from `/lib/migration-sources.js` |
| 5 NEW migration wizards | `/onboarding/migrate/{salesforce,netsuite-clone,items,vendors,sample-data}` | papaparse-driven CSV imports + sample-data clone via bypassPool |
| QB→NS card | links to `/quickbooks` (Phase 37, untouched) | One of 7 cards on `/onboarding/migrate` |
| Onboarding checklist | `index.html` mount + `/lib/onboarding-checklist.js` (54.4-03) | 4-step roadmap on `/`; auto-checks (modules from `/finalize`, data from any `/migrate/*` success); manual Mark-done via PATCH |
| Backend routes | `routes/onboarding.ts` mounted at `/api/onboarding` | 10 endpoints total (1 rules / 1 recommend / 1 finalize / 1 state / 1 checklist / 5 migrate/*) |
| `/api/tenants/current` extension | `routes/tenants.ts` (54.4-03) | Response now includes `onboarding_state` JSONB pass-through alongside `features` — home page renders checklist in one fetch |
| Migration 032 | `public.tenants.onboarding_state` JSONB + `tenants_update_own_onboarding` RLS policy | Self-update gate for wizard + checklist + migrate paths (UPDATE only own row via `id = current_setting('app.tenant_id')::uuid`) |

## State Phase 56 (M4 Stripe billing) needs to know

### 1. `tenants.onboarding_state` JSONB shape

```json
{
  "checklist": {
    "modules": false,
    "team": false,
    "data": false,
    "agents": false
  },
  "wizard_completed_at": null,
  "last_wizard_answers": null
}
```

`wizard_completed_at` is set as a JSON-stringified `now()::text` by `/finalize` (chained `jsonb_set` — see `routes/onboarding.ts:75-82`). Default backfilled by migration 032 on all existing tenants.

**M4 should NOT extend this column.** Add a separate `billing_state` JSONB column on `public.tenants` if Stripe state needs persisting — keeps onboarding and billing concerns separated, easier to roll back independently, and migration 032's RLS policy is table-level UPDATE so the same policy unlocks `billing_state` writes for free.

### 2. `tenant_features` rows are ACTIVELY gated now (was passively all-enabled)

| Era | Behavior |
|-----|----------|
| Pre-54.4 | Signup at `routes/tenants.ts:124-129` seeded all 13 modules with `enabled=true` (free trial — every tenant sees all modules) |
| Post-54.4 | Wizard `/finalize` at `routes/onboarding.ts:62-72` disables ALL then re-enables only the selected modules |

**M4 Stripe checkout MUST read `tenant_features.enabled=true` to determine billable add-ons.** The catalog at `/lib/module-catalog.js` is the canonical source for `code → name → price` mapping. M4 should consume it server-side too — recommended pattern: move to `backend/src/lib/module-catalog.json` and have BOTH `/lib/module-catalog.js` (frontend) AND `backend/src/lib/module-catalog.json` (server) regenerated from a single source, OR keep `/lib/module-catalog.js` as source-of-truth and import it via `require('../../lib/module-catalog.js')` server-side. Either way: ONE source-of-truth.

### 3. Single-source-of-truth lib files (DO NOT duplicate)

| File | Owner | Used by | Bytes |
|------|-------|---------|-------|
| `/lib/module-catalog.js` | 54.4-01 | catalog.html + recommend.html | ~3 KB |
| `/lib/migration-sources.js` | 54.4-02 | migrate.html (only) | ~2 KB |
| `/lib/onboarding-checklist.js` | 54.4-03 | index.html (only) | ~4 KB |
| `/lib/papaparse-5.4.1.min.js` | 54.4-02 | 4 migration CSV wizards | 19,469 |

M4 will likely add `/lib/pricing-tiers.js` for Stripe checkout — follow the same pattern: one `.js` file exporting `window.SOMETHING`, consumed by ONE page minimum, no duplication.

### 4. RLS UPDATE policy on `public.tenants`

Migration 032 added `tenants_update_own_onboarding` policy:
- **USING clause:** `id = current_setting('app.tenant_id')::uuid`
- **WITH CHECK clause:** `id = current_setting('app.tenant_id')::uuid`
- **Granularity:** table-level UPDATE (NOT column-level)

This unlocks app-role UPDATEs on `public.tenants` for ANY column the role can SELECT. M4 will likely UPDATE `public.tenants.plan` (trial → paid_basic → paid_plus) and a new `billing_state` JSONB. Those writes will be allowed because of THIS policy. If M4 wants column-level granularity (e.g., let app-role UPDATE only `billing_state` but not `plan` directly), it needs to AMEND the policy with a column-level RLS expression OR move billing writes to a dedicated SECURITY DEFINER function. Default recommendation: keep table-level, enforce business rules in the route handler.

### 5. Routes mounting — DO NOT collide

`routes/onboarding.ts` is mounted at `/api/onboarding` in `app.ts` (after team/invites mounts, before agents). It currently owns:

```
GET   /api/onboarding/rules
POST  /api/onboarding/recommend
POST  /api/onboarding/finalize
GET   /api/onboarding/state          (54.4-03)
PATCH /api/onboarding/checklist      (54.4-03)
POST  /api/onboarding/migrate/salesforce
POST  /api/onboarding/migrate/items
POST  /api/onboarding/migrate/vendors
POST  /api/onboarding/migrate/customers
POST  /api/onboarding/migrate/sample-data
```

**M4 Stripe routes should be a NEW file (`routes/billing.ts`), mounted at `/api/billing`.** Do NOT add Stripe routes to `routes/onboarding.ts` — keeps onboarding pure, lets billing webhook handlers have their own dependency surface (Stripe SDK is heavy), and means a billing-only deploy doesn't risk regressing wizard / migration paths.

Recommended `/api/billing` route shape:
```
GET   /api/billing/portal-link        (admin only — returns Stripe Customer Portal URL)
POST  /api/billing/checkout-session   (admin only — create Stripe Checkout Session)
GET   /api/billing/subscription       (any auth — current plan + add-ons)
POST  /api/billing/webhook            (PUBLIC — Stripe webhook, signature-verified)
```

The `/webhook` route MUST be public (no `requireAuth`) — mirror the Phase 54.1 `routes/invites.ts` PUBLIC pattern. Webhook signature verification via `stripe.webhooks.constructEvent(rawBody, sig, endpointSecret)` replaces auth.

### 6. CloudFront Function R-map

After 54.4, `cf-function-source/turion-clean-urls.js` has 7 `/onboarding/*` entries:
- `/onboarding/recommend` → `/onboarding/recommend.html` (R-table)
- `/onboarding/migrate` → `/onboarding/migrate.html` (R54M base via `OM` prefix)
- 5 additional `OM + '/salesforce|netsuite-clone|items|vendors|sample-data'` mappings

Current size: **10,024 bytes** (under the CloudFront 10,240-byte hard cap). M4 will likely add 2-3 entries for `/billing`, `/billing/checkout-success`, `/billing/portal-return` etc. — total still well under cap if it uses a similar `OB='/billing'` prefix pattern. Same publish + invalidate pattern (`scripts/update-cf-function.sh` or `aws cloudfront update-function` + `publish-function` + invalidation).

### 7. WAF state (Phase 54.6)

WAF is in COUNT mode. The 54.4 migration POST paths (`/api/onboarding/migrate/*`) carry up to 5K-row JSON payloads. Backend caps at `MAX_ROWS=5000` per request; client `papaparse` chunks at 100 rows/POST. As of 54.4 close: **no SizeRestrictions_BODY false-positives observed in COUNT-mode logs.** M3/M4 hardening can keep COUNT or flip to BLOCK without further onboarding-side changes.

### 8. Signup redirect target — DO NOT change without coordinating

`signup.html:107` retains the Phase 41 pattern:
```js
localStorage.setItem('zietra-cognito-erp-redirect', '/');
```

After Cognito magic-link callback, the user lands on `/` on their tenant subdomain. The home-page checklist widget then renders the 4-step roadmap, with the "Pick your modules" step linking to `/onboarding/recommend`. **There is NO hard redirect to the wizard.**

M4 will likely add a Stripe checkout-success redirect. Follow one of two patterns:
- **Option A (recommended):** Add a SEPARATE localStorage key (`zietra-cognito-billing-redirect`) so the Cognito callback resolver checks billing first, then falls back to the onboarding redirect.
- **Option B:** Reuse the same key, set it to `/billing/checkout-success` only when the user is bouncing back from Stripe Checkout. Risk: if onboarding flow sets the key concurrently with a billing flow, the last write wins.

## Cross-cutting smoke matrix

`scripts/smoke-phase-54-4.sh` exits 0 on full pass. **Run before merging M4 to confirm no regression.** Current state: 26/26 PASS as of 2026-05-15.

Checks performed:
- 8 frontend pages return 200 (wizard, migration menu, 5 wizards, catalog)
- 4 lib files return 200 (module-catalog, migration-sources, papaparse, onboarding-checklist)
- 10 backend endpoints return 401 without Bearer (rules, recommend, finalize, state, checklist, 5x migrate/*)
- `/api/tenants/current` response includes `onboarding_state` field
- CF Function R-map has 7 `/onboarding/*` entries (size under 10,240-byte cap)
- `inject-shell.mjs` reports zero new injections (idempotent)
- CloudWatch tail shows zero ERROR / UnhandledPromiseRejection in last 10 min

## What 54.4 does NOT include (explicit deferrals)

- **Stripe checkout (M4 = Phase 56):** wizard sets `tenant_features.enabled`, but no payment is captured. Free trial continues until billing wires up.
- **Per-tenant billing-aware feature gating (M4):** today a disabled module just doesn't show in nav; M4 will hard-disable the routes via middleware.
- **ML-driven recommendations:** explicit ROADMAP deferral — locked weighted-sum scoring matrix only.
- **SSE migration progress (M8):** currently polling-only client-side; no streaming.
- **Salesforce OAuth pull:** CSV-only; OAuth deferred to M9 if real customer asks.
- **Excel `.xlsx` binary parsing:** CSV-only; M9 if real customer asks.
- **Auto-detection of team step completion:** currently admin must Mark-done; future cron or trigger on `tenant_users.status='active'` transition. Phase 54.1 invite flow does set status, but no read-time computation hooked into `/api/onboarding/state` yet.
- **Cross-tenant onboarding probe (RLS):** `tests/rls/onboarding.test.ts` should add a test verifying tenant A's PATCH cannot affect tenant B's onboarding_state. Phase 55-04 covers the read side already; UPDATE side is verified-in-prod via the policy semantics but not automated.

## Phase 56 (M4 Stripe billing) entry checklist

Before starting M4:
- [ ] Confirm `scripts/smoke-phase-54-4.sh` exits 0 (no regression to inherit)
- [ ] Read this CHECKPOINT.md fully (especially sections 2, 3, 5, 8)
- [ ] Note the `/api/onboarding` route mount — do NOT add Stripe routes there
- [ ] Note `/lib/module-catalog.js` for price-tier lookup (and decide: import server-side or move to JSON)
- [ ] Note migration 032 RLS UPDATE policy — same policy unlocks `billing_state` writes for free
- [ ] Decide Stripe webhook signature verification approach (likely NEW PUBLIC route mirroring `routes/invites.ts` no-auth PUBLIC pattern; raw body required for signature verification, not the parsed JSON)
- [ ] Decide multi-tenant Stripe customer mapping: store `stripe_customer_id` on `public.tenants` (recommended) vs separate `public.billing_customers` join table
- [ ] Decide trial-to-paid conversion: hard expiry vs grace window vs convert-on-first-paid-action
- [ ] Plan webhook idempotency: dedupe on `event.id` in a new `public.stripe_events_processed` table to prevent double-processing on retry

## Resources

- **AWS account:** 134607809447 / us-east-1
- **Aurora cluster:** zietra-aurora-prod-v2 (cluster ID 16d5e38c-2fc2-4d06-8435-e4b01704bf74)
  - App role: zietra_app (no BYPASSRLS) — DATABASE_URL env var
  - Bypass role: zietra_admin_bypass (BYPASSRLS) — secret `zietra-aurora/admin-bypass-role-pTsZjr`
  - Master role: zietra_admin — secret `rds!cluster-16d5e38c-...-mhV473`
- **Lambdas (ERP):** turion-demo-api (arm64, container, CodeSha256 `e663415e...` post 54.4-03), zietra-rls-runner-55-05 (one-shot DDL)
- **APIGW:** lo254mvukl.execute-api.us-east-1.amazonaws.com (turion subdomain — tenant slug via X-Tenant-Slug header)
- **CloudFront distribution:** E37R9PT8IL44L2 (turion-demo-static origin)
- **CF Function:** turion-clean-urls (LIVE, ETag E3T4TT2Z381HKD, 10024 bytes)
- **Cognito user pool:** see Phase 41 + Phase 52 SUMMARYs
- **Stripe account:** NOT YET PROVISIONED — M4 first task is to create / link an existing Stripe account, store keys in Secrets Manager (`zietra/stripe-*` pattern matching DOLLOR project convention)

## Files M4 will likely touch (NEW, no edits to 54.4 files)

```
backend/src/routes/billing.ts                    (NEW)
backend/src/billing/stripe-client.ts             (NEW)
backend/src/billing/checkout.ts                  (NEW)
backend/src/billing/webhook-handler.ts           (NEW)
backend/src/billing/customer-portal.ts           (NEW)
backend/migrations/033_billing_state.sql         (NEW — adds tenants.billing_state JSONB + tenants.stripe_customer_id + stripe_events_processed table)
backend/src/app.ts                               (MODIFY — mount '/api/billing' AFTER '/api/onboarding')
backend/src/routes/tenants.ts                    (MAYBE — extend /current with subscription info, mirror onboarding_state pattern)
lib/pricing-tiers.js                             (NEW — frontend pricing display, mirrors module-catalog.js pattern)
billing.html OR settings/billing.html            (NEW frontend page)
cf-function-source/turion-clean-urls.js          (MODIFY — add /billing R-map entries, keep under 10,240 cap)
```

## Open questions for M4 planner

1. **Stripe test-mode strategy:** dedicated test/staging Stripe account vs same account with test mode toggle. Implication for env var split (`STRIPE_SECRET_KEY_TEST` vs `STRIPE_SECRET_KEY_LIVE`)?
2. **Multi-tenant Stripe customer mapping:** one Stripe Customer per Tenant (recommended — simpler webhook routing) vs one per User (allows per-seat billing later)?
3. **Trial-to-paid conversion flow:** how does the user discover the billing page? Banner on `/` after trial day 14? Email at trial end? Both?
4. **Prorate logic:** when a user adds a new module mid-cycle, prorate the difference or charge full at next cycle? (Stripe handles both; need product decision.)
5. **Webhook idempotency depth:** dedupe just on `event.id` (simplest) vs also dedupe on `event.created` window (defense in depth)?
6. **Failed payment handling:** suspend tenant immediately vs grace window vs downgrade-to-trial?
7. **Self-serve cancellation:** Stripe Customer Portal handles it, but does the cancellation also flip `tenant_features.enabled=false` for add-ons immediately or at period end?

## Closure evidence — 6/6 requirements (file:line citations)

| Requirement | File:line |
|-------------|-----------|
| OnboardingWizard | `/Users/jeet/turion-space-demo/onboarding/recommend.html:1` (5-question wizard page) |
| ModuleRecommendationEngine | `/Users/jeet/turion-space-demo/backend/src/onboarding/rule-engine.ts:1` (pure `recommend()` function) |
| RecommendationRuleEngine | `/Users/jeet/turion-space-demo/backend/src/onboarding/recommend-rules.json:1` (scoring matrix) |
| MigrationLanding | `/Users/jeet/turion-space-demo/onboarding/migrate.html:1` (7-card landing) |
| MigrationCards | `/Users/jeet/turion-space-demo/lib/migration-sources.js:1` + 5 wizards under `/onboarding/migrate-*.html` |
| OnboardingChecklistOnHome | `/Users/jeet/turion-space-demo/index.html:44` (mount div) + `/Users/jeet/turion-space-demo/lib/onboarding-checklist.js:1` (widget) |

## Must-not-break checklist for M4

The following Phase 54.x and 55 surfaces MUST continue to pass `scripts/smoke-phase-54-4.sh` after M4:

- Phase 54.1 `/team` invite flow + `/api/team` endpoints
- Phase 54.4-01 wizard at `/onboarding/recommend` + 3 endpoints
- Phase 54.4-02 migration menu + 5 wizards + 5 backend importers
- Phase 54.4-03 home checklist + 2 new endpoints + `/api/tenants/current.onboarding_state`
- Phase 54.5 (if applicable) — confirm separately
- Phase 54.6 WAF in COUNT mode (M4 may flip to BLOCK; out of scope here)
- Phase 55 RLS on 152 tables — M4 MUST NOT drop or weaken any policy; add-only

If any of these regresses post-M4, the regression is M4's responsibility to fix, NOT Phase 54.4's.

---

*Phase 54.4 closes here.*
*Next: Phase 56 — M4 Stripe billing (estimated effort: 2-3 sessions; planner should read this CHECKPOINT before writing PLAN.)*
