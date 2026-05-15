# Phase 56: M4 — Stripe Billing + Entitlements — Research

**Researched:** 2026-05-15
**Domain:** SaaS subscription billing (Stripe Subscriptions + Customer Portal + Webhook handler) on AWS Lambda/Express against an RLS-enforced Aurora Postgres backend
**Confidence:** HIGH (Stripe is HIGH from official docs; multi-tenant integration is HIGH from existing Phase 54.4 CHECKPOINT + the live RLS surface in Phase 55)

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| StripeTestModeIntegration | Stripe account in test mode, keys in Secrets Manager, dual-key (test+live) env var split | §A1, §A2, §J1 |
| ProductPriceCatalog | Stripe Products for base + per add-on module; idempotent setup script; local `pricing` mirror | §B1, §B2, §B3 |
| CheckoutFlow | `/billing/upgrade` page → Stripe Checkout session (subscription mode, base + add-ons line items, trial carry-over) | §C1–C5 |
| WebhookHandler | Public endpoint on turion-demo-api with raw-body signature verification + idempotency via `billing_events` table | §D1–D3, §H |
| CustomerPortal | `stripe.billingPortal.sessions.create` → tenant-scoped redirect URL | §E1, §E2 |
| TrialToPaidConversion | 30-day trial for new tenants, day-27/28/29 email reminders, day-31 read-only grace, day-38 suspend; existing 3 tenants grandfathered | §F1, §F2, §F3 |
| EntitlementSync | Webhook handler diffs `subscription.items` against `tenant_features`; UPSERT pattern; nightly reconciliation cron | §G1–G4 |
| StripeCustomerMapping | Migration 033 adds `public.tenants.stripe_customer_id TEXT UNIQUE`; created lazily on first checkout | §H1, §H2 |
| BillingChecklistItem | 5th onboarding checklist item ("Add payment method") + auto-set from `customer.subscription.created` webhook | §C5 + Phase 54.4 §2 |
| LiveModeCutover | Operator GO/NO-GO after 10-scenario test-mode pass; live keys, live webhook endpoint, live Products replay | §J1–J7 |

---

## User Constraints (from CHECKPOINT + ROADMAP)

> No CONTEXT.md exists for Phase 56 yet; constraints below are extracted verbatim from the ROADMAP Phase 56 entry and the Phase 54.4 CHECKPOINT § "Phase 56 entry checklist".

### Locked Decisions (ROADMAP-level)

- **Test-mode FIRST.** Entire flow ships in Stripe test mode. Operator runs ~10 test scenarios (signup → upgrade → cancel → restart → fail-card → etc.) before flipping live keys. Live-mode flip is operator GO/NO-GO.
- **$99/mo base subscription.** Includes the basic-ERP modules (`crm`, `sales`, `purchase`, `items` per ROADMAP M5 wording; cross-check below in §B1). All other modules are paid add-ons.
- **Per-tenant flat + add-ons** pricing (NOT per-seat). Per-seat deferred to M8.
- **USD only.** No multi-currency.
- **No tax handling.** Charge net of tax for SMB pilot. Stripe Tax deferred.
- **No metered usage.** Stripe Metered Billing deferred until a clear use case appears.
- **No discount/coupon engine in UI.** Stripe supports it natively; UI work deferred.
- **No annual prepay discount.** Easy to add later via Stripe Pricing.
- **Tenants stay tenant-isolated via Phase 55 RLS.** All billing tables MUST be tenant-id'd + RLS-policied + use `withTenantClient` for writes. The webhook handler MUST set `app.tenant_id` via the bypass role OR resolve tenant via `subscription.metadata.tenant_id` and use the app role.
- **Routes mounted at `/api/billing`** in a NEW `routes/billing.ts` file. DO NOT pollute `routes/onboarding.ts` with billing routes (CHECKPOINT §5).
- **Webhook route MUST be PUBLIC** (no `requireAuth`, no `tenantContext`) — signature verification replaces auth (CHECKPOINT §5, mirroring `routes/invites.ts` PUBLIC-magic-link pattern).
- **Existing 3 tenants are grandfathered.** Turion Space (paid in DB but no billing yet), dollor (trial), brandmonkz (trial) — do NOT auto-bill any of them. Operator must manually trigger upgrade.

### Claude's Discretion (planner-decidable)

- **Webhook deployment topology:** single endpoint on turion-demo-api Lambda vs. separate `stripe-webhook-handler` Lambda. (§D1 recommends ENDPOINT on turion-demo-api.)
- **Add-on pricing tier values:** $19 / $29 / $49 per tier are starter recommendations in §B2; final values are an operator + product decision before live cutover.
- **Failed-payment grace window length:** Stripe's Smart Retries handle the retries; the grace before forced downgrade is a product decision (§F3 recommends Stripe's default 23-day Smart Retry window, then 7 more days "read-only" before suspension = 30 days total).
- **Customer Portal feature toggles:** which Portal features are enabled (update subscription / cancel / payment methods / invoice history / cancellation reasons / retention coupons). §E2 recommends a conservative starter set.
- **Multi-tenant Stripe Customer mapping:** ONE Stripe Customer per platform Tenant (recommended) vs. one per User. CHECKPOINT §Open Q2 left this open; §H1 recommends per-Tenant.

### Deferred Ideas (OUT OF SCOPE for M4)

- Per-user seat billing (M8 enterprise tier)
- Usage-based metering (Stripe Metered Billing)
- Multi-currency
- Stripe Tax
- Custom Invoicing API (enterprise; M8)
- Discount / coupon UI
- Annual prepay discount
- Salesforce / NetSuite OAuth-pull migrations (M9 if customer asks)

---

## Summary

Phase 56 wires Stripe Subscriptions into the multi-tenant Zietra platform such that:

1. New tenants self-serve upgrade from trial via Stripe Checkout. Existing 3 tenants are grandfathered.
2. A single Express router on the existing `turion-demo-api` Lambda owns 4 routes (`/portal`, `/checkout`, `/subscription`, `/webhook`). The `/webhook` route is PUBLIC, raw-body, signature-verified, and idempotent via a new `public.billing_events` table.
3. Entitlements (`public.tenant_features.enabled`) are synced from `subscription.items` on every webhook event AND reconciled hourly by a cron job (defence against missed webhooks).
4. Test mode ships first. Operator runs a 10-scenario smoke matrix end-to-end before flipping the live key in Secrets Manager.

**Primary recommendation:** Ship as 4 sub-plans (56-01 → 56-04). Plan 01 = migration 033 + Products/Prices catalog setup script + webhook scaffold + `billing_events` table. Plan 02 = checkout + portal + entitlement sync. Plan 03 = trial-to-paid + checklist item + 10-scenario test-mode smoke + GO/NO-GO checkpoint. Plan 04 = live-mode cutover + production smoke + close M4 + CHECKPOINT.md for next milestone.

Do NOT split the webhook into its own Lambda; reuse `turion-demo-api`. The Lambda already has the Aurora connection, RLS bypass-role credentials, and the deploy pipeline. A separate Lambda doubles the cold-start surface, doubles the secret-rotation work, and gains nothing here.

Use the **`stripe` npm package latest stable** (currently API version `2026-04-22.dahlia` per the SDK release notes). Pin the API version EXPLICITLY in the Stripe constructor so a future SDK upgrade doesn't silently change behavior — this is Stripe's own recommendation [docs.stripe.com/api/versioning].

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `stripe` (npm) | latest (API ver `2026-04-22.dahlia` pinned in constructor) | Stripe SDK — subscriptions, checkout sessions, customer portal, webhooks, products/prices | Official Stripe Node SDK; the only sanctioned client. Auto-typed against the pinned API version. |
| `express` | ^4 (already installed) | Router | Already mounted in `app.ts`; new `routes/billing.ts` follows the same pattern as `routes/onboarding.ts` |
| `pg` | ^8 (already installed) | Postgres client | All billing tables sit on the same Aurora cluster; reuse the existing `withTenantClient` + `pool` helpers |
| `jsonwebtoken` | ^9 (already installed) | Token decode — already used by `requireAuth` | No new dep |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@types/stripe` | n/a — types ship inside `stripe` npm package since v8 | TypeScript types | Implicit; no separate install |
| `aws-sdk` v2 (already installed for `secrets.ts`) | n/a | Fetch Stripe keys from Secrets Manager at cold start | Reuse the existing `getSecretValue` pattern |
| `crypto` (Node builtin) | n/a | Idempotency-key generation for any direct API calls we make (NOT for webhook signature — Stripe's SDK does that) | When inserting `billing_events` rows |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Stripe Checkout (hosted) | Stripe Elements (embedded) | Elements = more design control; we have NO design control requirement and Checkout handles SCA / 3DS / wallet auth / failed-card retries out of the box. **Stick with Checkout.** |
| Stripe Customer Portal (hosted) | Custom billing UI calling Stripe APIs | Custom UI = ~5 extra weeks of work to rebuild what Portal already gives. **Use Portal.** |
| Separate `stripe-webhook-handler` Lambda | Endpoint on existing `turion-demo-api` | Separate Lambda = isolation (good) BUT doubles cold-start, doubles secret rotation, doubles deploys. The endpoint approach reuses existing Aurora client + Secrets Manager wiring. **Use endpoint on `turion-demo-api`.** |
| Stripe Connect (multi-party payments) | Direct subscription billing | Connect is for marketplaces where YOU pay third parties. We're a SaaS taking money directly. **No Connect.** |
| Stripe Tax | Manual / net-of-tax | Tax is OUT OF SCOPE (locked decision). Defer. |
| Per-tenant Stripe Account (Connect Custom) | One Stripe Account for the whole platform | Connect Custom = each tenant has their own Stripe sub-account; useful if tenants need their own payouts/branding. We don't. **One Stripe Account.** |
| Stripe MeteredBilling | Flat + add-on subscriptions only | OUT OF SCOPE (locked decision). Defer. |

**Installation:**
```bash
cd /Users/jeet/turion-space-demo/backend
npm install stripe
# Lockfile changes are committed via the Task 1 commit of plan 56-01.
```

No type-only install needed — `stripe` npm package ships its own types since v8.

---

## Architecture Patterns

### Recommended File Layout

```
turion-space-demo/backend/
├── migrations/
│   └── 033_billing.sql                       # +stripe_customer_id col, +billing_events table, +subscriptions table, +RLS policies
├── src/
│   ├── billing/
│   │   ├── stripe-client.ts                  # Lazy singleton, API version pinned, keys from Secrets Manager
│   │   ├── products-prices-catalog.ts        # Idempotent setup of Stripe Products + Prices; mirrors local `public.pricing` table
│   │   ├── checkout.ts                       # `createCheckoutSession(tenantId, addonModuleIds[])` → returns URL
│   │   ├── customer-portal.ts                # `createPortalSession(stripeCustomerId, returnUrl)` → returns URL
│   │   ├── webhook-handler.ts                # Stripe.Event handler dispatch; idempotency check; entitlement sync trigger
│   │   ├── entitlement-sync.ts               # Diffs subscription.items against tenant_features; UPSERTs
│   │   └── reconciliation.ts                 # Hourly cron: SELECT all subscriptions from Stripe API + diff against local entitlements + correct
│   ├── routes/
│   │   └── billing.ts                        # Express router; 4 routes; mounts /webhook with `express.raw({type:'application/json'})`
│   └── app.ts                                # MODIFY — mount '/api/billing' after '/api/onboarding'
turion-space-demo/lib/
└── pricing-tiers.js                          # `window.PRICING_TIERS` array for frontend display (mirrors module-catalog.js pattern)
turion-space-demo/billing/                    # NEW frontend pages
├── index.html                                # Main billing page (status + cards + portal CTA + upgrade CTA)
├── upgrade.html                              # "Pick your plan" — base + add-on checkbox grid + Checkout CTA
├── success.html                              # `/billing/success?session_id=...` — polls until webhook completes
└── return.html                               # `/billing/return` — Portal return URL (just re-fetches subscription state)
turion-space-demo/cf-function-source/
└── turion-clean-urls.js                      # MODIFY — add 4 /billing/* R-map entries (cap is 10,240 bytes, currently 10,024 — fits)
```

### Pattern 1: Lazy-singleton Stripe client (pinned API version)

**What:** One Stripe instance per Lambda warm container, lazy-loaded on first use.
**When to use:** All over `billing/*`.

```typescript
// Source: docs.stripe.com/api/versioning?lang=node + docs.stripe.com/sdks
// File: backend/src/billing/stripe-client.ts
import Stripe from 'stripe';
import { getSecret } from '../secrets';

let _stripe: Stripe | null = null;

export async function getStripe(): Promise<Stripe> {
  if (_stripe) return _stripe;
  // Test mode for now. Live key arrives in Plan 04.
  const key = await getSecret('zietra/stripe/test-secret-key'); // Secrets Manager ARN
  _stripe = new Stripe(key, {
    apiVersion: '2026-04-22.dahlia',  // PIN — Stripe official recommendation
    typescript: true,
    // No httpAgent — default fetch works in Lambda Node 20.x
  });
  return _stripe;
}
```

### Pattern 2: Raw-body webhook signature verification

**What:** Stripe signs the EXACT bytes of the HTTP body. Any JSON parse before signature verify breaks it.
**When to use:** Only on the `/api/billing/webhook` route.

```typescript
// Source: docs.stripe.com/webhooks/signature
// File: backend/src/routes/billing.ts
import express, { Router, Request, Response } from 'express';
import { getStripe } from '../billing/stripe-client';
import { getSecret } from '../secrets';
import { handleStripeEvent } from '../billing/webhook-handler';

const r = Router();

// CRITICAL: this MUST come BEFORE any global express.json() that touches /api/billing/webhook.
// The mount order in app.ts is:
//   app.use(express.json({ limit: '2mb' }))   // line 27
//   ...
//   app.use('/api/billing', billing)          // NEW
// We CANNOT use the global json parser for /webhook. Two safe approaches:
//   (A) Mount `express.raw({type:'application/json'})` per-route IN the router (this approach).
//   (B) Add an early skip in app.ts: app.use((req,res,next) => req.path === '/api/billing/webhook' ? next() : express.json()(req,res,next))
// Approach (A) is cleaner — global json() runs THEN per-route raw() overrides because express.raw() reads req as Buffer.
// BUT — express.json() at line 27 will already have CONSUMED the stream before our raw() handler runs.
// The PROVEN fix: in app.ts, register a SKIP guard for /api/billing/webhook BEFORE express.json:
//   app.use('/api/billing/webhook', express.raw({ type: 'application/json', limit: '1mb' }));
//   app.use(express.json({ limit: '2mb' }));   // unchanged
// Express picks the more specific path first; raw() runs; the global json() never sees /webhook.

r.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string | undefined;
  if (!sig) {
    res.status(400).send('Missing stripe-signature header');
    return;
  }
  const secret = await getSecret('zietra/stripe/test-webhook-secret');
  let event;
  try {
    const stripe = await getStripe();
    // req.body here is a Buffer (because of express.raw above).
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (e) {
    console.error('[billing/webhook] signature verify failed:', (e as Error).message);
    res.status(400).send(`Webhook signature verification failed: ${(e as Error).message}`);
    return;
  }
  try {
    await handleStripeEvent(event);
    // Reply 200 fast; Stripe retries on non-2xx for up to 3 days with exponential backoff.
    res.status(200).json({ received: true });
  } catch (e) {
    // Return 500 — Stripe will retry. Idempotency in handleStripeEvent prevents double-apply.
    console.error('[billing/webhook] handler error:', (e as Error).message);
    res.status(500).json({ error: 'Handler failed; Stripe will retry' });
  }
});
```

### Pattern 3: Webhook idempotency via `billing_events` table

**What:** Stripe guarantees at-least-once delivery. Dedupe on `event.id`.
**When to use:** First step inside `handleStripeEvent`.

```typescript
// Source: docs.stripe.com/webhooks (Best Practices §Idempotency)
// File: backend/src/billing/webhook-handler.ts
import { pool } from '../db';  // bypass-pool — webhook route has no tenant context

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  // 1. Resolve tenant from event payload (varies by event type — see §G).
  const tenantId = await resolveTenantFromEvent(event);
  // 2. INSERT idempotency row. UNIQUE constraint on stripe_event_id is the dedupe gate.
  // We use the bypass pool because webhook is unauthenticated and has no app.tenant_id set.
  const insert = await pool.query(
    `INSERT INTO public.billing_events
       (stripe_event_id, event_type, tenant_id, payload, received_at, processed_at)
     VALUES ($1, $2, $3, $4, NOW(), NULL)
     ON CONFLICT (stripe_event_id) DO NOTHING
     RETURNING id`,
    [event.id, event.type, tenantId, JSON.stringify(event)],
  );
  if (insert.rowCount === 0) {
    console.log(`[billing/webhook] duplicate event ${event.id} (${event.type}) — already processed`);
    return;   // already processed (idempotency hit)
  }
  // 3. Dispatch.
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await syncSubscription(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await downgradeSubscription(event.data.object as Stripe.Subscription);
      break;
    case 'invoice.payment_succeeded':
      await logInvoiceSuccess(event.data.object as Stripe.Invoice);
      break;
    case 'invoice.payment_failed':
      await alertOnPaymentFailure(event.data.object as Stripe.Invoice);
      break;
    case 'checkout.session.completed':
      await linkCheckoutToTenant(event.data.object as Stripe.Checkout.Session);
      break;
    default:
      console.log(`[billing/webhook] ignored event ${event.type}`);
  }
  // 4. Mark processed.
  await pool.query(`UPDATE public.billing_events SET processed_at=NOW() WHERE stripe_event_id=$1`, [event.id]);
}
```

### Pattern 4: Webhook tenant resolution via `subscription.metadata.tenant_id`

**What:** Stripe events don't natively know about platform tenants. We set `metadata.tenant_id` at Checkout creation time; webhooks read it back.
**When to use:** Always at the top of `handleStripeEvent`.

```typescript
// Source: docs.stripe.com/metadata + docs.stripe.com/api/checkout/sessions/create
// File: backend/src/billing/webhook-handler.ts
async function resolveTenantFromEvent(event: Stripe.Event): Promise<string | null> {
  const obj = event.data.object as Record<string, unknown>;
  // Try metadata directly (Subscription, Customer, Invoice all carry metadata).
  const meta = (obj.metadata as Record<string, string> | undefined) ?? {};
  if (meta.tenant_id) return meta.tenant_id;
  // Fallback: look up via stripe_customer_id on tenants table.
  const customerId = (obj.customer as string | undefined) || null;
  if (!customerId) return null;
  const r = await pool.query(`SELECT id FROM public.tenants WHERE stripe_customer_id = $1`, [customerId]);
  return r.rowCount ? (r.rows[0].id as string) : null;
}
```

### Pattern 5: Entitlement sync (diff `subscription.items` vs `tenant_features`)

**What:** When a subscription changes, sync the `enabled` flags on `tenant_features`.
**When to use:** From `customer.subscription.created` and `.updated` handlers.

```typescript
// File: backend/src/billing/entitlement-sync.ts
// Source: docs.stripe.com/api/subscriptions/object (items.data[].price.id)
import { pool } from '../db';

const BASE_MODULES = ['crm', 'sales', 'purchase', 'items'];   // §B1 — base $99/mo includes these

export async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  const tenantId = sub.metadata?.tenant_id;
  if (!tenantId) {
    console.warn(`[entitlement-sync] subscription ${sub.id} has no tenant_id metadata; skipping`);
    return;
  }
  // Map subscription.items[].price.id → module_code via local `pricing` table.
  const subscribedPriceIds = sub.items.data.map(i => i.price.id);
  if (subscribedPriceIds.length === 0) {
    console.warn(`[entitlement-sync] subscription ${sub.id} has no items; skipping`);
    return;
  }
  const priceMap = await pool.query(
    `SELECT stripe_price_id, module_code FROM public.pricing WHERE stripe_price_id = ANY($1)`,
    [subscribedPriceIds],
  );
  // Modules enabled by THIS subscription:
  const subscribedModules = new Set<string>(priceMap.rows.map(r => r.module_code as string));
  // If the BASE price is in the subscription, all BASE_MODULES are implicitly enabled.
  const hasBase = priceMap.rows.some(r => r.module_code === '__base__');
  if (hasBase) BASE_MODULES.forEach(m => subscribedModules.add(m));
  // Atomic: disable-then-enable. RLS bypass — webhook has no tenant context.
  await pool.query('BEGIN');
  try {
    await pool.query(`UPDATE public.tenant_features SET enabled=false WHERE tenant_id=$1`, [tenantId]);
    if (subscribedModules.size > 0) {
      await pool.query(
        `UPDATE public.tenant_features SET enabled=true
           WHERE tenant_id=$1 AND module_code = ANY($2)`,
        [tenantId, [...subscribedModules]],
      );
    }
    // Update tenants.plan if base is present.
    if (hasBase) {
      await pool.query(`UPDATE public.tenants SET plan='paid' WHERE id=$1 AND plan != 'paid'`, [tenantId]);
    }
    await pool.query('COMMIT');
  } catch (e) {
    await pool.query('ROLLBACK');
    throw e;
  }
}
```

**RLS note:** The webhook handler uses the BYPASS pool (the same `pool` exported from `db.ts` that the role-resolved bypass user uses). This is safe because (a) the webhook is signature-verified — only Stripe can hit it; (b) we explicitly scope every query by `tenant_id = $1`. We do NOT need `set_config('app.tenant_id', ...)` because the bypass role has `BYPASSRLS`.

### Pattern 6: Checkout session with trial carry-over

**What:** New tenant starts a 30-day trial. If they upgrade on day 7, the trial in Stripe should respect the remaining 23 days, not restart.
**When to use:** Inside `createCheckoutSession`.

```typescript
// Source: docs.stripe.com/billing/subscriptions/trials + docs.stripe.com/payments/checkout/billing-cycle
// File: backend/src/billing/checkout.ts
import { getStripe } from './stripe-client';
import { pool } from '../db';

export async function createCheckoutSession(
  tenantId: string,
  addonModuleIds: string[],
): Promise<{ url: string; sessionId: string }> {
  const stripe = await getStripe();
  // 1. Resolve tenant + ensure stripe_customer_id exists.
  const t = await pool.query(
    `SELECT id, slug, name, stripe_customer_id, trial_ends_at, plan
       FROM public.tenants WHERE id=$1`,
    [tenantId],
  );
  const tenant = t.rows[0];
  let customerId = tenant.stripe_customer_id;
  if (!customerId) {
    const c = await stripe.customers.create({
      metadata: { tenant_id: tenant.id, tenant_slug: tenant.slug },
      name: tenant.name,
      // Email arrives from Cognito session in caller; pass via param.
    });
    customerId = c.id;
    await pool.query(`UPDATE public.tenants SET stripe_customer_id=$1 WHERE id=$2`, [customerId, tenant.id]);
  }
  // 2. Build line items: base + add-ons (each → stripe_price_id).
  const prices = await pool.query(
    `SELECT stripe_price_id, module_code FROM public.pricing
      WHERE module_code = ANY($1) OR module_code = '__base__'`,
    [addonModuleIds],
  );
  const lineItems = prices.rows.map(p => ({ price: p.stripe_price_id as string, quantity: 1 }));
  // 3. Trial carry-over: compute days remaining.
  let trialDays: number | undefined;
  if (tenant.trial_ends_at) {
    const msLeft = new Date(tenant.trial_ends_at).getTime() - Date.now();
    trialDays = Math.max(1, Math.ceil(msLeft / 86400000));
    if (trialDays < 1) trialDays = undefined;   // trial already over
  }
  // 4. Create session. metadata.tenant_id is the magic that lets the webhook resolve back.
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: lineItems,
    subscription_data: {
      metadata: { tenant_id: tenant.id, tenant_slug: tenant.slug },
      trial_period_days: trialDays,   // undefined = no trial
    },
    metadata: { tenant_id: tenant.id, tenant_slug: tenant.slug },
    success_url: `https://${tenant.slug}.zietra.com/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `https://${tenant.slug}.zietra.com/billing/upgrade?canceled=true`,
    allow_promotion_codes: false,   // discounts deferred (locked decision)
    // payment_method_types defaults to [card]; Stripe auto-expands wallets (Apple/Google Pay) where supported
  });
  return { url: session.url as string, sessionId: session.id };
}
```

### Pattern 7: Customer Portal session

**What:** Hosted page for self-serve cancel / update card / view invoices.
**When to use:** From the `/billing` main page when tenant is already subscribed.

```typescript
// Source: docs.stripe.com/customer-management/integrate-customer-portal
// File: backend/src/billing/customer-portal.ts
export async function createPortalSession(
  tenantId: string,
  returnUrl: string,
): Promise<{ url: string }> {
  const stripe = await getStripe();
  const t = await pool.query(
    `SELECT stripe_customer_id FROM public.tenants WHERE id=$1`,
    [tenantId],
  );
  const customerId = t.rows[0]?.stripe_customer_id;
  if (!customerId) {
    throw new Error('Tenant has no Stripe customer yet — must run Checkout first');
  }
  // Configuration is created ONCE per environment via products-prices-catalog.ts setup
  // and referenced by ID. If null, uses the default from Stripe Dashboard.
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
    // configuration: configId,   // optional — see §E2
  });
  return { url: session.url };
}
```

### Anti-Patterns to Avoid

- **Calling `express.json()` before the `/webhook` route.** Breaks signature verification because the raw body bytes are gone. The fix is the `app.use('/api/billing/webhook', express.raw(...))` BEFORE `app.use(express.json(...))` mount order in `app.ts`. See Pattern 2.
- **Storing Stripe API keys in env vars of the Lambda directly.** Always fetch from Secrets Manager at cold start. Mirror the existing pattern in `backend/src/secrets.ts`.
- **Hard-coding Stripe Price IDs in code.** Price IDs are env-specific (test mode price IDs ≠ live mode price IDs). Always look up via the local `public.pricing` table which mirrors the active environment.
- **Granting modules immediately on `checkout.session.completed` without waiting for `customer.subscription.created`.** The session completed event fires BEFORE the subscription is fully provisioned in some edge cases. **Use `customer.subscription.created` as the entitlement-grant signal.**
- **Forgetting `metadata.tenant_id` on either the Customer or the Subscription.** Without it, the webhook can't resolve back to a platform tenant. Set it on BOTH at Checkout time (defense in depth).
- **Trusting the `tenant_id` from a webhook payload's metadata WITHOUT validating it against `subscription.customer = tenants.stripe_customer_id`.** A bad actor can forge a webhook (failing signature verify, so this is theoretical) — but the cross-check is cheap and adds defense in depth.
- **Doing webhook processing synchronously in the same response.** OK for this scale (3 tenants, growing slow). But if you ever see Stripe timing out, push to SQS first, return 200 immediately, process from SQS worker. NOT needed at current scale.
- **Forgetting RLS.** Even though the webhook uses the bypass pool, EVERY query must explicitly filter by `tenant_id`. The bypass role removes the safety net; we must enforce in SQL.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Card capture UI | Custom card form | Stripe Checkout (hosted) | SCA / 3DS / PCI scope reduction / wallet auth / failed-card retries all handled |
| Cancel-subscription UI | Custom form | Stripe Customer Portal | Cancel + retention coupon + reason capture all built-in; configurable in Dashboard |
| Invoice rendering | PDF generator | Stripe-hosted hosted_invoice_url | Branded, paid via portal, downloadable PDF — free |
| Failed-payment retries | Custom dunning logic | Stripe Smart Retries (built into Subscriptions) | ML-based retry timing tuned across all Stripe customers |
| Email reminders for trial expiry | Custom SES cron | Stripe-built email reminders OR Stripe events → our SES helper | Stripe sends "Trial ends in X days" emails natively if enabled in Portal config |
| Webhook signature verification | HMAC by hand | `stripe.webhooks.constructEvent` | Tolerance window, multiple secret versions, timing-safe compare — all handled |
| Idempotency key generation for API calls | UUID by hand | Built into `stripe-node` for `create` calls via `{idempotencyKey: ...}` second arg | Avoids double-create on retries |
| Trial countdown logic | Custom date math | `subscription.trial_end` + Stripe-emitted `customer.subscription.trial_will_end` event (fires 3 days before) | Battle-tested; emits as a webhook event |
| Proration math when adding/removing add-ons mid-cycle | Custom calc | Stripe Subscriptions API auto-prorates via `proration_behavior: 'create_prorations'` (default) | Stripe handles partial-month math |
| Customer-facing pricing display | Hard-coded HTML | `/lib/pricing-tiers.js` (one source of truth, mirrors Phase 54.4 pattern) | Add-a-tier = one-place edit |
| Subscription state polling on `/billing/success` page | Aggressive polling | Server-Sent Event from backend that pushes when webhook completes | OK to use 2-sec polling for MVP; SSE deferred per ROADMAP M8 note |

**Key insight:** Stripe Subscriptions + Customer Portal cover ≈ 90% of what a SaaS billing layer needs. Our job is wiring (auth, multi-tenant resolve, entitlement sync, idempotency), NOT recreating any payment UI. Every minute spent customizing the payment flow is a minute NOT spent shipping the rest of M4.

---

## Common Pitfalls

### Pitfall 1: Webhook signature verification fails because Express parsed the body

**What goes wrong:** Stripe signs the exact raw bytes. If `express.json()` runs before your webhook handler, `req.body` is a parsed object, not a Buffer. `stripe.webhooks.constructEvent(req.body, sig, secret)` then computes a signature over the re-serialized JSON, which differs from Stripe's signature → 400.
**Why it happens:** `app.use(express.json())` is mounted globally on `app.ts:27`. Without intervention, it consumes the body before our `/api/billing/webhook` handler runs.
**How to avoid:** Mount `express.raw({type:'application/json', limit:'1mb'})` for the EXACT webhook path BEFORE the global `express.json()`. Order matters: Express scans middleware in declaration order and the first one that consumes the stream wins.

```typescript
// File: backend/src/app.ts (MODIFY)
// BEFORE app.use(express.json({ limit: '2mb' })):
app.use('/api/billing/webhook', express.raw({ type: 'application/json', limit: '1mb' }));
app.use(express.json({ limit: '2mb' }));  // unchanged line 27
```

**Warning signs:** Stripe Dashboard shows webhook 400s with body "Webhook signature verification failed". Local debug: log `typeof req.body` inside the handler — must be `'object'` with `Buffer.isBuffer(req.body) === true`.

### Pitfall 2: Lambda cold start = first webhook hits a stale Secrets Manager cache

**What goes wrong:** A new Lambda container starts; Stripe key fetch from Secrets Manager takes ~300ms; meanwhile, Stripe retries on timeout.
**Why it happens:** Secrets Manager fetch is per-cold-start.
**How to avoid:** Keep webhook handler hot-friendly: cache the Stripe instance per container (Pattern 1). Also cache the webhook secret in the same lazy-singleton pattern. Stripe's default tolerance is 5 min; cold-start ~300ms is well inside.

**Warning signs:** Sporadic webhook timeouts in CloudWatch logs that correlate to `RequestId` first-invocation patterns.

### Pitfall 3: Stripe test mode price IDs leaked into production code

**What goes wrong:** Developer hard-codes `price_1Abc...` from test mode into `entitlement-sync.ts`. After live cutover, the live subscription has price ID `price_1Xyz...` — no match → entitlements all turn off.
**Why it happens:** Convenience copy-paste during development.
**How to avoid:** NEVER hard-code price IDs. Always look up via `public.pricing` table. The catalog setup script (Plan 01) writes the right IDs per environment. Add a vitest unit test that greps `backend/src/billing/` for any string matching `/price_[A-Za-z0-9]{14,}/` and fails CI if found.

**Warning signs:** Post-cutover, tenants who upgrade see modules NOT activating despite Stripe webhook firing successfully.

### Pitfall 4: Multiple add-ons created as separate Subscriptions instead of one with multiple Items

**What goes wrong:** Developer creates one Stripe Subscription per add-on. Tenant has 5 subscriptions. Webhooks fire 5x. Customer portal shows 5 subscriptions confusingly. Cancel-all becomes complex.
**Why it happens:** Misunderstanding of Subscriptions vs SubscriptionItems.
**How to avoid:** ONE Subscription per tenant. Each Stripe Price = one SubscriptionItem within that Subscription. Stripe Checkout in `mode: subscription` with multiple `line_items` automatically creates one Subscription with multiple Items.

**Warning signs:** Tenant's customer portal shows multiple separate subscriptions. Webhooks fire N times per change.

### Pitfall 5: Webhook retries cause duplicate entitlement flips

**What goes wrong:** Stripe retries failed webhook for up to 3 days. If `handleStripeEvent` is not idempotent, the second delivery re-runs the entitlement sync, potentially after the user already toggled something via the portal.
**Why it happens:** At-least-once delivery is documented Stripe behavior.
**How to avoid:** The `billing_events` table with UNIQUE constraint on `stripe_event_id` (Pattern 3) is the defense. Stripe's `event.id` is stable across retries.

**Warning signs:** Audit log shows the same module being flipped on/off repeatedly within seconds.

### Pitfall 6: Missed webhooks → entitlement drift

**What goes wrong:** Lambda OOM kills the handler mid-flight. Stripe records non-2xx → retries. But during the retry window, the local DB state is stale. Or worse: a webhook delivery fails and Stripe gives up after the retry window.
**Why it happens:** Lambda failures + Stripe's bounded retry window.
**How to avoid:** Hourly reconciliation cron (`backend/src/billing/reconciliation.ts`): `stripe.subscriptions.list()` paginated → for each, compare to local `tenant_features` → if diff, sync. Run via EventBridge schedule.

**Warning signs:** Tenant in Stripe Dashboard shows different modules than tenant in `/billing` page.

### Pitfall 7: Stripe Decimal type breaks string assumptions

**What goes wrong:** Latest stripe-node SDK changed `decimal_string` fields from `string` to `Stripe.Decimal`. Code doing `parseFloat(price.unit_amount_decimal)` breaks at compile or runtime.
**Why it happens:** Recent breaking change in stripe-node SDK (per CHANGELOG).
**How to avoid:** Use `Decimal.from("1.23")` for creates; `.toString()` for serialization. Don't `parseFloat` decimal strings. For monetary display, prefer `unit_amount` (integer cents) over `unit_amount_decimal` (string/Decimal).

**Warning signs:** TypeScript build failures after `npm install stripe`; runtime `NaN` in price displays.

### Pitfall 8: Cancel-immediately vs cancel-at-period-end confusion

**What goes wrong:** Tenant clicks "Cancel" in portal. Stripe default is `cancel_at_period_end=true` (access until end of billing period). Our entitlement sync sees `subscription.status='active'` still, doesn't downgrade. User keeps using modules. We don't downgrade until `customer.subscription.deleted` fires at period end.
**Why it happens:** Behavior depends on Portal config + Stripe default.
**How to avoid:** This is the CORRECT default for most SaaS. Document it. The user is "canceled but still has access through end of paid period." Our `subscription.cancel_at_period_end` flag is the truth source. Only fully downgrade on `customer.subscription.deleted`. ALSO show a clear "Subscription ends Mar 15" banner in `/billing` UI.

**Warning signs:** Tenant complaints "I canceled but still got charged" (they didn't — they have access through paid period).

### Pitfall 9: Trial conversion to first paid charge fails 4x more often than renewals

**What goes wrong:** Stripe's own data shows trial→first-paid card declines 4x more than mid-stream renewals (often expired/wrong cards captured during trial signup; sometimes no card was even captured during Checkout if trial allowed it).
**Why it happens:** Card was added during sign-up days/weeks ago. State drift.
**How to avoid:**
- Configure Checkout with `payment_method_collection='always'` (captures card AT trial start, fails loud if no card).
- Enable Stripe Smart Retries (default-on in Dashboard).
- Subscribe to `invoice.payment_failed` webhook → fire SES email to tenant ("Update your card") + show banner in `/billing`.
- Add an auto-downgrade-on-payment-failure delay grace window (§F3).

**Warning signs:** Stripe Dashboard's "Trial conversion rate" metric is misleadingly low. Use the failed-payment webhook data instead.

### Pitfall 10: Customer Portal lets users cancel anytime → revenue loss to retention coupons

**What goes wrong:** Default Portal config doesn't offer retention. User cancels in 2 clicks. We lose MRR we could have saved.
**Why it happens:** Default Portal config is bare.
**How to avoid:** In Plan 02, configure Portal via `stripe.billingPortal.configurations.create()`: enable `cancellation_reason.enabled=true`, optionally enable a retention coupon (e.g., 20% off for 3 months). Tradeoff: more friction = better retention but worse user experience.

**Warning signs:** High churn on the cancel→delete path; no insight into WHY.

### Pitfall 11: Webhook handler does DB writes BEFORE writing to billing_events → orphaned state

**What goes wrong:** Handler updates `tenant_features`, then crashes BEFORE `INSERT INTO billing_events`. Stripe retries. We re-process. Double-flip is silent.
**Why it happens:** Wrong order of operations.
**How to avoid:** ALWAYS write the `billing_events` row FIRST (with `processed_at=NULL`). Then do the business logic. Then `UPDATE ... SET processed_at=NOW()`. On retry, the `INSERT ... ON CONFLICT DO NOTHING` returns `rowCount=0` and we skip — the original processing is treated as authoritative regardless of whether processed_at is set. (If we crashed before completing, the reconciliation cron picks it up.)

**Warning signs:** `billing_events` rows with `processed_at IS NULL` older than 1 hour.

### Pitfall 12: Forgetting to remove the temporary Lambda → Aurora SG ingress rule from Phase 55-05

**What goes wrong:** Phase 55-05 added a temp SG rule `sgr-0536781d1e94645ca` for direct Lambda → Aurora connection. The 7-day soak window ends 2026-05-22. Forgetting to revoke = unnecessary attack surface.
**Why it happens:** Carryover from prior phase's open follow-ups list.
**How to avoid:** Phase 56-04 (live cutover) should include a checklist item: "Verify Phase 55-05 temp SG rule revoked (if soak ended cleanly)."

**Warning signs:** N/A (no functional impact — just hygiene).

### Pitfall 13: Local timezone in trial date arithmetic

**What goes wrong:** Trial-end calculations done in local timezone vs UTC produce off-by-one-day errors near midnight UTC.
**Why it happens:** `new Date()` in Node returns UTC ms-epoch but `.toString()` is local. Lambda runs in UTC, but devs test locally in Pacific time.
**How to avoid:** Always work in UTC. `Math.ceil((trialEnd.getTime() - Date.now()) / 86400000)` is timezone-safe (epoch math). Display in tenant's local time via Intl.DateTimeFormat on the FRONTEND only.

### Pitfall 14: CloudFront caches the /billing pages → stale subscription state

**What goes wrong:** Static `/billing/index.html` is served from CloudFront with default cache. After payment, the page shows trial UI for 24h.
**Why it happens:** CloudFront default TTL.
**How to avoid:** `/billing/*` HTML pages need a short max-age (e.g., 60s) OR the fetch to `/api/billing/subscription` happens client-side and the HTML is just a shell. Recommend: shell pattern, with `fetch('/api/billing/subscription')` on mount, so HTML can be cached aggressively but data is always fresh.

---

## Code Examples

### Migration 033 — billing schema

```sql
-- File: turion-space-demo/backend/migrations/033_billing.sql
-- Idempotent. Apply via Phase 55-05 one-shot Lambda zietra-rls-runner-55-05.
BEGIN;

-- 1. Map tenant → Stripe Customer.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

-- 2. Optional: store the most recent Subscription state for fast read.
-- Authoritative state lives in Stripe; this is a denormalized cache for fast /billing page render.
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  stripe_subscription_id   TEXT NOT NULL UNIQUE,
  stripe_customer_id       TEXT NOT NULL,
  status                   TEXT NOT NULL CHECK (status IN ('trialing','active','past_due','canceled','unpaid','incomplete','incomplete_expired','paused')),
  cancel_at_period_end     BOOLEAN NOT NULL DEFAULT false,
  trial_end                TIMESTAMPTZ,
  current_period_start     TIMESTAMPTZ NOT NULL,
  current_period_end       TIMESTAMPTZ NOT NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS subscriptions_tenant_id_idx ON public.subscriptions(tenant_id);

-- 3. Webhook idempotency table.
CREATE TABLE IF NOT EXISTS public.billing_events (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id      TEXT NOT NULL UNIQUE,         -- the dedupe key
  event_type           TEXT NOT NULL,
  tenant_id            UUID REFERENCES public.tenants(id) ON DELETE SET NULL, -- nullable: events fire before tenant link resolved
  payload              JSONB NOT NULL,
  received_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at         TIMESTAMPTZ                    -- NULL = received but not yet processed (or crashed mid-flight)
);
CREATE INDEX IF NOT EXISTS billing_events_tenant_id_idx ON public.billing_events(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS billing_events_unprocessed_idx ON public.billing_events(received_at) WHERE processed_at IS NULL;
CREATE INDEX IF NOT EXISTS billing_events_type_idx ON public.billing_events(event_type, received_at DESC);

-- 4. Pricing catalog mirror — env-specific Stripe Price IDs → module codes.
-- Populated by backend/src/billing/products-prices-catalog.ts setup script.
CREATE TABLE IF NOT EXISTS public.pricing (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code          TEXT NOT NULL,                 -- e.g. 'plm', 'asc606', or '__base__' for the $99 base
  tier                 TEXT NOT NULL CHECK (tier IN ('base','light','standard','premium')),
  unit_amount_cents    INTEGER NOT NULL CHECK (unit_amount_cents > 0),
  currency             TEXT NOT NULL DEFAULT 'usd' CHECK (currency = 'usd'),  -- USD-only locked decision
  stripe_product_id    TEXT NOT NULL,
  stripe_price_id      TEXT NOT NULL UNIQUE,
  interval             TEXT NOT NULL DEFAULT 'month' CHECK (interval IN ('month','year')),
  active               BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pricing_module_active_idx ON public.pricing(module_code) WHERE active = true;

-- 5. RLS policies — all 3 new tables are tenant-scoped; pricing is global (no tenant_id).
ALTER TABLE public.subscriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions    FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.billing_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events   FORCE  ROW LEVEL SECURITY;
-- pricing table is global catalog; readable by all authenticated tenants.
ALTER TABLE public.pricing          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing          FORCE  ROW LEVEL SECURITY;

-- Tenant SELECT own subscription.
DROP POLICY IF EXISTS subscriptions_select_own ON public.subscriptions;
CREATE POLICY subscriptions_select_own ON public.subscriptions
  FOR SELECT USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Tenant SELECT own billing_events (for admin audit panel later).
DROP POLICY IF EXISTS billing_events_select_own ON public.billing_events;
CREATE POLICY billing_events_select_own ON public.billing_events
  FOR SELECT USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Pricing is a global catalog; readable by all authenticated tenants.
DROP POLICY IF EXISTS pricing_select_all ON public.pricing;
CREATE POLICY pricing_select_all ON public.pricing FOR SELECT USING (active = true);

-- No INSERT/UPDATE/DELETE policies — those mutations come from the webhook handler
-- (which uses the BYPASSRLS role) and from the products-prices catalog setup script
-- (which also uses the bypass role). App role NEVER mutates billing data.

COMMIT;
```

### Products + Prices catalog setup script

```typescript
// File: backend/src/billing/products-prices-catalog.ts
// Run via: ts-node products-prices-catalog.ts <env>  where env in {test,live}
// Idempotent — uses lookup_keys to detect existing Prices.
// Source: docs.stripe.com/api/products/create + docs.stripe.com/api/prices/create
import { getStripe } from './stripe-client';
import { pool } from '../db';

// ---- Catalog (single source-of-truth in this file) ----
// Cross-checked against /lib/module-catalog.js (13 modules) and
// onboarding/rule-engine.ts ALL_MODULES. Re-verified in Plan 01 Wave 1.
const BASE_MODULES = ['crm', 'sales', 'purchase', 'items'];
const ADDON_MODULES = [
  { code: 'plm',          tier: 'standard', cents: 2900 },  // $29 — eng BOM management
  { code: 'mes',          tier: 'standard', cents: 2900 },  // $29 — shop floor
  { code: 'quality',      tier: 'standard', cents: 2900 },  // $29 — NCRs/CAPAs
  { code: 'lean-erp-pro', tier: 'premium',  cents: 4900 },  // $49 — full financials
  { code: 'asc606',       tier: 'light',    cents: 1900 },  // $19 — revenue rec
  { code: 'royalty',      tier: 'premium',  cents: 4900 },  // $49 — niche, high-value
  { code: 'dropship',     tier: 'light',    cents: 1900 },  // $19 — Ramp + drop-ship POs
  { code: 'ai-agents',    tier: 'premium',  cents: 4900 },  // $49 — AI agents (Anthropic costs)
  { code: 'qb-migration', tier: 'light',    cents: 1900 },  // $19 — one-shot import tool
];

export async function setupCatalog(): Promise<void> {
  const stripe = await getStripe();
  // 1. Base product.
  const baseProduct = await upsertProduct(stripe, 'zietra-base', 'Zietra Base ($99/mo)', 'Base subscription: CRM + Sales + Purchase + Items');
  const basePrice = await upsertPrice(stripe, 'zietra-base-monthly-usd', baseProduct.id, 9900);
  await mirrorToLocal('__base__', 'base', 9900, baseProduct.id, basePrice.id);

  // 2. Add-on products + prices.
  for (const addon of ADDON_MODULES) {
    const product = await upsertProduct(
      stripe,
      `zietra-addon-${addon.code}`,
      `Zietra Add-on: ${addon.code}`,
      `Add-on module: ${addon.code} (${addon.tier} tier)`,
    );
    const price = await upsertPrice(stripe, `zietra-addon-${addon.code}-monthly-usd`, product.id, addon.cents);
    await mirrorToLocal(addon.code, addon.tier, addon.cents, product.id, price.id);
  }
  console.log('[catalog] setup complete');
}

async function upsertProduct(stripe: Stripe, lookupKey: string, name: string, description: string): Promise<Stripe.Product> {
  // Stripe Products don't have lookup_keys natively, but we use metadata.lookup_key.
  const list = await stripe.products.search({ query: `metadata['lookup_key']:'${lookupKey}'` });
  if (list.data.length > 0) return list.data[0];
  return stripe.products.create({ name, description, metadata: { lookup_key: lookupKey } });
}

async function upsertPrice(stripe: Stripe, lookupKey: string, productId: string, cents: number): Promise<Stripe.Price> {
  const list = await stripe.prices.list({ lookup_keys: [lookupKey], expand: ['data.product'] });
  if (list.data.length > 0) return list.data[0];
  return stripe.prices.create({
    product: productId,
    unit_amount: cents,
    currency: 'usd',
    recurring: { interval: 'month' },
    lookup_key: lookupKey,
  });
}

async function mirrorToLocal(moduleCode: string, tier: string, cents: number, productId: string, priceId: string): Promise<void> {
  await pool.query(
    `INSERT INTO public.pricing (module_code, tier, unit_amount_cents, stripe_product_id, stripe_price_id)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (stripe_price_id) DO UPDATE SET
       module_code=EXCLUDED.module_code, tier=EXCLUDED.tier, unit_amount_cents=EXCLUDED.unit_amount_cents,
       stripe_product_id=EXCLUDED.stripe_product_id, active=true`,
    [moduleCode, tier, cents, productId, priceId],
  );
}
```

### Hourly reconciliation cron

```typescript
// File: backend/src/billing/reconciliation.ts
// Wire via EventBridge: every 1 hour → invokes reconciliation Lambda OR a /api/billing/_admin/reconcile route.
// Pulls authoritative state from Stripe; corrects local entitlement drift.
export async function reconcileAllSubscriptions(): Promise<{checked: number; corrected: number}> {
  const stripe = await getStripe();
  let checked = 0, corrected = 0;
  for await (const sub of stripe.subscriptions.list({ status: 'all', limit: 100 })) {
    checked++;
    const tenantId = sub.metadata?.tenant_id;
    if (!tenantId) continue;
    // Read local subscription state.
    const localResult = await pool.query(
      `SELECT status, current_period_end FROM public.subscriptions WHERE stripe_subscription_id=$1`,
      [sub.id],
    );
    const local = localResult.rows[0];
    if (!local || local.status !== sub.status) {
      // Drift detected. Re-run syncSubscription as if a webhook fired.
      await syncSubscription(sub);
      corrected++;
      console.warn(`[reconcile] drift on sub=${sub.id} tenant=${tenantId}: local=${local?.status} stripe=${sub.status}`);
    }
  }
  return { checked, corrected };
}
```

### Frontend pricing-tiers.js

```javascript
// File: turion-space-demo/lib/pricing-tiers.js — NEW (mirrors module-catalog.js pattern)
// Display-only; the AUTHORITATIVE values are in public.pricing (server-side).
// Cents → dollar strings here ONLY for display in /billing/upgrade.html.
window.PRICING_TIERS = {
  base: { name: 'Zietra Base', price_per_month_usd: 99, includes: ['crm','sales','purchase','items'] },
  addons: [
    { code: 'plm',          tier: 'standard', price_per_month_usd: 29, label: 'Arena PLM' },
    { code: 'mes',          tier: 'standard', price_per_month_usd: 29, label: 'Manufacturing Execution' },
    { code: 'quality',      tier: 'standard', price_per_month_usd: 29, label: 'Arena QMS' },
    { code: 'lean-erp-pro', tier: 'premium',  price_per_month_usd: 49, label: 'NetSuite Financials' },
    { code: 'asc606',       tier: 'light',    price_per_month_usd: 19, label: 'ASC 606 Revenue Recognition' },
    { code: 'royalty',      tier: 'premium',  price_per_month_usd: 49, label: 'Royalty Management' },
    { code: 'dropship',     tier: 'light',    price_per_month_usd: 19, label: 'Drop-ship + Ramp' },
    { code: 'ai-agents',    tier: 'premium',  price_per_month_usd: 49, label: 'AI Agents' },
    { code: 'qb-migration', tier: 'light',    price_per_month_usd: 19, label: 'QuickBooks → NetSuite' },
  ],
};
```

---

## Test-Mode 10-Scenario Smoke Matrix

This is the Plan 03 Wave 3 deliverable. ALL 10 must pass before operator can flip live keys.

| # | Scenario | Expected Result |
|---|----------|-----------------|
| 1 | New tenant signup → trial active → `/billing/upgrade` → select base only → Checkout success | `tenants.plan='paid'`, `tenant_features` matches base 4 modules, `subscriptions.status='trialing'` or 'active' |
| 2 | Same tenant → add 2 add-ons (e.g., plm + asc606) during initial Checkout | All 4 base + 2 selected add-ons enabled in `tenant_features`, single Stripe Subscription has 3 items (base + 2) |
| 3 | Existing subscriber → open Customer Portal → add 1 more add-on (quality) | `tenant_features.quality.enabled=true` within 10s of portal action (via `customer.subscription.updated` webhook) |
| 4 | Existing subscriber → portal → remove 1 add-on (asc606) | `tenant_features.asc606.enabled=false` at end of billing period (NOT immediately — `cancel_at_period_end=true`) |
| 5 | Checkout with Stripe test card `4000 0000 0000 0341` (attaches but fails on first charge) | `invoice.payment_failed` webhook fires, SES email sent to tenant.email, banner appears in `/billing` |
| 6 | Update card to `4242 4242 4242 4242` (success) via portal → next retry succeeds | `invoice.payment_succeeded` fires, banner clears, modules restored if previously downgraded |
| 7 | Cancel subscription via portal → access continues through `current_period_end` | UI shows "Subscription ends Mar 15" banner; modules stay enabled until period end |
| 8 | After cancel-at-period-end fires (force via Stripe Dashboard "Cancel immediately") → resubscribe via `/billing/upgrade` | New subscription created, `subscriptions` table has 2 rows (one canceled, one active); entitlements restored |
| 9 | Trial expires without upgrade (force via Stripe Dashboard "Advance subscription clock") → tenant downgraded after 30-day grace | After grace: `tenant_features` all disabled, `tenants.plan='disabled'`, banner says "Your trial expired" |
| 10 | Webhook replayed via Stripe Dashboard "Resend event" | `billing_events` has UNIQUE conflict; no double-flip; logs `duplicate event ... already processed` |

**Stripe test cards used:**
- `4242 4242 4242 4242` — succeeds always
- `4000 0000 0000 0341` — attaches OK, fails on first charge (perfect for trial→fail scenario 5)
- `4000 0000 0000 9995` — declined always (negative test)

**Stripe test clock:** Use `stripe.testHelpers.testClocks.create()` to fast-forward trial expirations without waiting 30 days.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Stripe Checkout `payment_intent` flow | `subscription` mode w/ `subscription_data.trial_period_days` | Stripe Billing GA | Simpler, less code |
| Per-Subscription metadata `tenant_id` only | BOTH `customer.metadata` AND `subscription.metadata` carry tenant_id | Stripe's "Metadata Best Practices" (deepwiki.com/get-convex/stripe) | Defense in depth for resolution |
| Stripe-cli polling for webhook signing secret | `stripe.webhooks.constructEvent` with secret from Dashboard | Always — this is the canonical pattern | n/a |
| `stripe.subscriptions.update` to add items | Same API, but use Customer Portal whenever possible | n/a | Less code to maintain |
| Custom dunning emails | Stripe Smart Retries (ML-based) + Stripe-native email reminders | Stripe Smart Retries GA ~2023 | Higher recovery rate; less code |
| Mixing test-mode and live-mode keys in same env | Separate `_TEST` and `_LIVE` env vars; explicit secret per mode | Stripe official guidance | Safer cutover |
| Stripe API version unpinned (defaults to whatever SDK ships with) | Pin `apiVersion: '2026-04-22.dahlia'` in constructor | docs.stripe.com/api/versioning | Stable behavior across SDK upgrades |

**Deprecated/outdated:**
- Stripe SKU API (replaced by Products/Prices) — don't use
- Stripe Plans API (replaced by Prices) — don't use
- `stripe.usageRecords.create` (legacy metered billing) — replaced by Meters API; we don't use either (out of scope)
- Stripe Charges API for one-off (use PaymentIntents instead) — N/A here

---

## Open Questions

1. **Add-on pricing tiers ($19/$29/$49):** Are these defensible? Could be too high for solo/SMB or too low for enterprise.
   - What we know: SaaS SMB add-ons in this space (NetSuite SuiteApps, QuickBooks add-ons) commonly run $15–$50/module/month.
   - What's unclear: Specific user research validating these for Zietra's audience.
   - Recommendation: Ship Plan 01 with these defaults. Adjust before live cutover based on operator product instinct. The `pricing` table makes mid-flight changes trivial (new Stripe Price → update mapping → next checkout uses new price; existing subscriptions grandfathered at old price until they change tier).

2. **Base subscription scope (which modules are "in the base"):** ROADMAP says "CRM + sales + purchase + items-lite". We're treating it as `[crm, sales, purchase, items]` (full items, not lite).
   - What we know: Phase 54.4 catalog has all 13 modules; the rule-engine treats them uniformly.
   - What's unclear: "items-lite" wording in ROADMAP — is there a real distinction between "items" and "items-lite"?
   - Recommendation: Treat as full `items`. If "items-lite" needs to be a separate module-code, that's a Phase 54.4-or-earlier scope addition.

3. **Existing 3 tenants (Turion Space, dollor, brandmonkz):** ROADMAP says new tenants get 30-day trial. Existing tenants?
   - What we know: Turion Space is `plan='paid'` in DB but no Stripe subscription. dollor + brandmonkz are `trial`.
   - What's unclear: Should we auto-create Stripe Customers for them at Plan 01 time, or wait until they themselves visit `/billing/upgrade`?
   - Recommendation: Lazy creation — create Stripe Customer on first `/billing/upgrade` visit per tenant. This avoids creating orphan Stripe Customers for tenants who never pay.

4. **Failed-payment grace window length:** Stripe Smart Retries has its own 23-day window. Then what?
   - What we know: Stripe stops retrying after 23 days (default).
   - What's unclear: Should we suspend immediately at 23 days, or add another N days of "read-only" grace?
   - Recommendation: 7 days of read-only after Stripe gives up = 30 days total. Then suspend (`tenants.plan='disabled'`, all entitlements off, redirect to `/billing` banner explaining how to reactivate).

5. **Webhook deployment topology:** Single endpoint vs separate Lambda. (Marked "Claude's Discretion" above.)
   - What we know: Current `turion-demo-api` Lambda has DB pool, Secrets Manager wiring, deploy pipeline already.
   - What's unclear: If webhook traffic ever becomes high enough to crowd out other API traffic on the shared Lambda, splitting becomes attractive.
   - Recommendation: ENDPOINT on `turion-demo-api` for Plan 02. Revisit at 100+ tenants OR if Stripe events exceed 1k/day.

6. **Annual prepay discount:** ROADMAP says deferred. Should Plan 01's pricing table at least carve out a column for it?
   - What we know: Easy to add; non-breaking.
   - What's unclear: Is there a sales motion already promising annual discounts?
   - Recommendation: Add `interval` column (already in migration above). Don't populate annual prices in Plan 01. Operator can add Stripe annual prices later via the same setup script.

7. **Email reminder content for trial expiry:** Day-27/28/29 reminders. Template owner?
   - What we know: SES is provisioned (zietra.com verified) per the kickoff memory.
   - What's unclear: Who writes the marketing copy?
   - Recommendation: Plan 03 includes 3 plain-text templates as placeholders; operator can replace before live cutover. Stripe Portal can ALSO send native trial-ending emails — we may not need our own.

8. **Trial length:** ROADMAP says 30 days. Confirm?
   - What we know: 30 days is industry standard for SMB SaaS.
   - What's unclear: Is this a marketing decision or a hard product floor?
   - Recommendation: 30 days locked.

9. **Promotion codes:** Locked off ("no discount/coupon engine"). But what if marketing wants a launch promo code?
   - What we know: Stripe natively supports `promotion_codes` in Checkout via `allow_promotion_codes: true`.
   - What's unclear: Is there a hard NO on this or is it a "later"?
   - Recommendation: Keep `allow_promotion_codes: false` in Plan 02 Checkout. Flip to true in a fast-follow if/when marketing asks. Single-line change.

---

## Recommended 4-Plan Structure

| Plan | Scope | Deliverables | Estimated Effort |
|------|-------|--------------|------------------|
| **56-01** | Stripe scaffold + catalog + webhook idempotency | Migration 033 (4 tables + RLS); `stripe-client.ts` lazy singleton; `products-prices-catalog.ts` setup script; `webhook-handler.ts` scaffold with idempotency via `billing_events`; `routes/billing.ts` mount + raw-body wiring in `app.ts`; SES helper hook for billing emails; vitest unit tests for entitlement-sync diff logic | 1 session |
| **56-02** | Checkout flow + Customer Portal + entitlement sync | `checkout.ts` (with trial carry-over from `tenants.trial_ends_at`); `customer-portal.ts`; full webhook handler dispatch (5 event types); `entitlement-sync.ts`; frontend `/billing`, `/billing/upgrade`, `/billing/success`, `/billing/return`; `lib/pricing-tiers.js`; CloudFront R-map updates (4 new entries, fits under 10,240 cap) | 1 session |
| **56-03** | Trial-to-paid + checklist item + 10-scenario test-mode smoke + GO/NO-GO | 5th onboarding checklist item ("Add payment method"); auto-set from `customer.subscription.created`; trial-end SES reminder cron (day -3, day 0, day +7); failed-payment SES; 10-scenario test-mode smoke script (operator runnable, captures results); GO/NO-GO checklist document | 1 session |
| **56-04** | Live-mode cutover + production smoke + CHECKPOINT | Provision live mode Secrets Manager entries; re-run catalog setup in live mode (gets DIFFERENT price IDs!); update `public.pricing` for live mode; configure live Stripe webhook endpoint; 1 real test payment (operator's own card) → refund; revoke Phase 55-05 temp SG ingress rule; close M4; write `CHECKPOINT.md` for next milestone | 1 session |

---

## Sources

### Primary (HIGH confidence)

- **Stripe Subscriptions Overview** — [docs.stripe.com/billing/subscriptions/overview](https://docs.stripe.com/billing/subscriptions/overview) — Subscription lifecycle (trialing → active → past_due → canceled), Smart Retries default behavior
- **Stripe Checkout Sessions API** — [docs.stripe.com/api/checkout/sessions/create](https://docs.stripe.com/api/checkout/sessions/create) — `subscription_data.metadata`, `subscription_data.trial_period_days`, line_items multi-Price support
- **Stripe Customer Portal** — [docs.stripe.com/customer-management/integrate-customer-portal](https://docs.stripe.com/customer-management/integrate-customer-portal) — `billingPortal.sessions.create`, configuration features (cancel/update/invoices)
- **Stripe Webhook Signature Verification** — [docs.stripe.com/webhooks/signature](https://docs.stripe.com/webhooks/signature) — raw body requirement, `stripe.webhooks.constructEvent`, tolerance window
- **Stripe API Versioning** — [docs.stripe.com/api/versioning?lang=node](https://docs.stripe.com/api/versioning?lang=node) — Pin via constructor `apiVersion`
- **Stripe Idempotency** — [docs.stripe.com/api/idempotent_requests](https://docs.stripe.com/api/idempotent_requests) — V4 UUID for client idempotency; webhook event.id as dedupe key
- **Stripe Multi-Tenant Metadata Best Practices** — [deepwiki.com/get-convex/stripe/7.3-metadata-best-practices](https://deepwiki.com/get-convex/stripe/7.3-metadata-best-practices) — Pattern of setting tenant_id on BOTH Customer and Subscription
- **Stripe Prorations** — [docs.stripe.com/billing/subscriptions/prorations](https://docs.stripe.com/billing/subscriptions/prorations) — Default proration_behavior, mid-cycle add/remove items
- **Stripe Trial Configuration** — [docs.stripe.com/billing/subscriptions/trials](https://docs.stripe.com/billing/subscriptions/trials) — `trial_period_days`, `payment_method_collection`
- **Stripe Node SDK CHANGELOG** — [github.com/stripe/stripe-node/blob/master/CHANGELOG.md](https://github.com/stripe/stripe-node/blob/master/CHANGELOG.md) — Latest API version 2026-04-22.dahlia, Decimal type breaking change
- **Phase 54.4 CHECKPOINT.md** — `/Users/jeet/doordash-p2p/.planning/phases/54.4-m6-module-selection-wizard-and-migration-onboarding-the-selling-point/CHECKPOINT.md` — Routes mount conventions, RLS UPDATE policy notes, single-source-of-truth lib pattern, 8 open questions for M4 planner
- **Phase 55-05 SUMMARY** — `/Users/jeet/doordash-p2p/.planning/phases/55-m3-multi-tenancy-rls-tenant-isolation/55-05-SUMMARY.md` — `zietra-rls-runner-55-05` one-shot Lambda pattern for DDL; RLS bypass-role + master-role split
- **Existing routes/onboarding.ts** — `/Users/jeet/turion-space-demo/backend/src/routes/onboarding.ts` — `withTenantClient` pattern, `requireRole('admin')` gate, `tenantContext` mount

### Secondary (MEDIUM confidence — WebSearch verified against Stripe official docs)

- **Stripe Pricing Breakdown 2026** — [flexprice.io/blog/stripe-pricing-breakdown-2026](https://flexprice.io/blog/stripe-pricing-breakdown-2026) — Stripe Billing 0.7% fee on recurring transactions; included Smart Retries, dunning, quotes, multi-phase schedules
- **Stripe Trial Conversion Failure Rates** — [reduxpayments.com/blog/trial-to-paid-conversion-rate](https://www.reduxpayments.com/blog/trial-to-paid-conversion-rate) — Trial→first-paid card declines 4x more than mid-stream renewals (drives Pitfall 9)
- **Hookdeck Guide to Stripe Webhooks** — [hookdeck.com/webhooks/platforms/guide-to-stripe-webhooks-features-and-best-practices](https://hookdeck.com/webhooks/platforms/guide-to-stripe-webhooks-features-and-best-practices) — Idempotency-via-event.id pattern
- **Multi-Tenant SaaS w/ Stripe Connect (NOT Connect, but pattern reference)** — [dev.to/diven_rastdus_c5af27d68f3/building-a-multi-tenant-saas-with-stripe-connect-in-2026-jjn](https://dev.to/diven_rastdus_c5af27d68f3/building-a-multi-tenant-saas-with-stripe-connect-in-2026-jjn) — Multi-tenant patterns; reinforces metadata.tenant_id approach
- **Lambda Webhook Raw Body Issue** — [github.com/stripe/stripe-node/issues/1768](https://github.com/stripe/stripe-node/issues/1768) — Known issue with API Gateway body transformation
- **Stripe SaaS Integration Guide** — [docs.stripe.com/saas](https://docs.stripe.com/saas) — Official SaaS integration patterns

### Tertiary (LOW confidence — single-source, flagged for validation in plan execution)

- **Specific add-on pricing tiers ($19/$29/$49):** Derived from rough SMB SaaS market positioning (NetSuite SuiteApp / QuickBooks add-on benchmarks); operator should validate before live cutover. NOT verified with primary source for this specific market.
- **Webhook deployment topology recommendation (endpoint vs separate Lambda):** Engineering judgment based on existing codebase shape; no formal cost-of-isolation study performed.
- **Reconciliation cron frequency (hourly):** Reasonable starting point; could be 15min or daily depending on operator preference.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Stripe is the only sanctioned SaaS billing primitive; docs are authoritative
- Architecture patterns: HIGH — All patterns trace to Stripe official docs + existing Phase 54.4 / 55 conventions
- Pitfalls (1–14): HIGH on 1, 2, 3, 4, 5, 6, 8, 9, 11 (well-documented Stripe gotchas); MEDIUM on 7 (Decimal type — depends on chosen SDK version); MEDIUM on 10 (Portal config opinion); HIGH on 12, 13, 14 (general patterns)
- Test-mode 10-scenario matrix: HIGH — Scenarios derived from Stripe's own integration testing recommendations + the locked decisions
- Add-on pricing tiers: LOW — Market-rate guess; operator must validate
- 4-plan structure: MEDIUM — Reasonable decomposition; could collapse to 3 if operator prefers larger plans

**Research date:** 2026-05-15
**Valid until:** 2026-06-15 (Stripe API moves fast; revalidate before live cutover if plan execution slips > 30 days)
**LOC:** ~960 lines | ~85 KB
