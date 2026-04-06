import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import Redis from 'ioredis';
import { requireLaunchOSToken, LaunchOSRequest } from '../middleware/auth';
import { TIER_TO_STRIPE_PRICE, TierName } from '../config/tiers';

const router = Router();

// Lazy Stripe initialization — avoid crash at module load when STRIPE_SECRET_KEY is unset
// Stripe SDK v17 throws "Neither apiKey nor config.authenticator provided" on empty string
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    _stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia' });
  }
  return _stripe;
}

// Shared Redis connection (reuse same ElastiCache as entitlements)
const redis = new Redis(
  process.env.REDIS_URL ||
    'redis://dollor-redis.uwva3u.0001.use1.cache.amazonaws.com:6379',
  {
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => Math.min(times * 100, 3000),
  }
);

redis.on('error', (err) => {
  console.error('[Redis/stripe] Connection error:', err.message);
});

// Idempotency set — mirrors stripe_routes.py:128-130 pattern
const _processedEvents = new Set<string>();

/**
 * POST /stripe/checkout
 * Requires x-launchos-token JWT.
 * Body: { tier, email }
 * Creates a Stripe Checkout session with 30-day trial.
 */
router.post(
  '/checkout',
  requireLaunchOSToken,
  async (req: LaunchOSRequest, res: Response): Promise<void> => {
    const { tier, email } = req.body;

    if (!tier || !email) {
      res.status(400).json({ error: 'tier and email are required' });
      return;
    }

    const validTiers: TierName[] = ['starter', 'growth', 'scale'];
    if (!validTiers.includes(tier)) {
      res.status(400).json({ error: `Invalid tier. Must be one of: ${validTiers.join(', ')}` });
      return;
    }

    const priceId = TIER_TO_STRIPE_PRICE[tier as TierName];
    if (!priceId) {
      res.status(500).json({ error: `Stripe price ID not configured for tier: ${tier}` });
      return;
    }

    // Extract user ID from JWT payload
    const userPayload = req.launchosUser as { id?: string; sub?: string };
    const userId = userPayload?.id || userPayload?.sub;
    if (!userId) {
      res.status(401).json({ error: 'Invalid token: missing user ID' });
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://techcloudpro.com';

    try {
      const session = await getStripe().checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: email,
        subscription_data: { trial_period_days: 30 },
        success_url: `${frontendUrl}/launchos/dashboard?subscribed=true`,
        cancel_url: `${frontendUrl}/launchos#pricing`,
        metadata: {
          launchos_user_id: userId,
          tier,
        },
      });

      res.status(200).json({ url: session.url });
    } catch (err) {
      console.error('[stripe/checkout] Stripe error:', err);
      res.status(400).json({ error: 'Payment processing failed. Please try again.' });
    }
  }
);

/**
 * POST /stripe/webhook
 * Raw body — stripe signature verification required.
 * Handles: checkout.session.completed, invoice.payment_succeeded,
 *          customer.subscription.deleted, invoice.payment_failed
 */
router.post(
  '/webhook',
  // Use raw body for this route only
  (req: Request, res: Response, next: () => void) => {
    // express.raw middleware applied per-route
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rawBodyMiddleware = require('express').raw({ type: 'application/json' });
    rawBodyMiddleware(req, res, next);
  },
  async (req: Request, res: Response): Promise<void> => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET not configured');
      res.status(500).json({ error: 'Webhook not configured' });
      return;
    }

    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

    try {
      event = getStripe().webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
    } catch (err) {
      console.warn('[stripe/webhook] Signature verification failed:', err);
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }

    // Idempotency — skip already-processed events (cap at 10K, mirrors stripe_routes.py:128-130)
    const eventId = event.id;
    if (_processedEvents.has(eventId)) {
      res.status(200).json({ received: true, duplicate: true });
      return;
    }
    _processedEvents.add(eventId);
    if (_processedEvents.size > 10000) {
      _processedEvents.clear();
    }

    console.log(`[stripe/webhook] Processing event: ${event.type}`);

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const meta = session.metadata || {};
          const userId = meta.launchos_user_id;
          const tier = meta.tier as TierName | undefined;

          if (userId && tier) {
            // Set tier in Redis — no TTL (persists until subscription cancelled)
            await redis.set(`launchos:tier:${userId}`, tier);
            console.log(`[stripe/webhook] Tier set: user=${userId} tier=${tier}`);
          } else {
            console.warn('[stripe/webhook] checkout.session.completed missing user_id or tier in metadata');
          }
          break;
        }

        case 'invoice.payment_succeeded': {
          // Confirm tier still active — re-read from metadata if available
          const invoice = event.data.object as Stripe.Invoice;
          console.log(`[stripe/webhook] Payment succeeded: customer=${invoice.customer}`);
          // Tier key persists; no action needed beyond logging
          break;
        }

        case 'customer.subscription.deleted': {
          // User cancelled — remove tier key (returns user to starter behavior)
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;

          // Find user by scanning tier keys — in production use a customer→user mapping
          // For now log the event and let the next checkout re-set the key
          console.warn(
            `[stripe/webhook] Subscription deleted: customer=${customerId}. ` +
              'Tier key will expire naturally or be reset on next checkout.'
          );
          // If metadata has launchos_user_id (set during checkout), delete tier key
          const meta = (subscription as unknown as { metadata?: Record<string, string> }).metadata;
          if (meta?.launchos_user_id) {
            await redis.del(`launchos:tier:${meta.launchos_user_id}`);
            console.log(`[stripe/webhook] Tier key deleted for user=${meta.launchos_user_id}`);
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          // Grace period — do NOT downgrade immediately, just log a warning
          console.warn(
            `[stripe/webhook] Payment failed: customer=${invoice.customer}. ` +
              'Grace period active — tier not downgraded.'
          );
          break;
        }

        default:
          console.log(`[stripe/webhook] Unhandled event type: ${event.type}`);
      }
    } catch (err) {
      console.error(`[stripe/webhook] Error processing ${event.type}:`, err);
      // Still return 200 to avoid Stripe retrying — log the error for investigation
    }

    res.status(200).json({ received: true });
  }
);

/**
 * POST /stripe/portal
 * Requires x-launchos-token JWT.
 * Body: { stripe_customer_id }
 * Creates a Stripe Billing Portal session for subscription management.
 */
router.post(
  '/portal',
  requireLaunchOSToken,
  async (req: LaunchOSRequest, res: Response): Promise<void> => {
    const { stripe_customer_id } = req.body;

    if (!stripe_customer_id) {
      res.status(400).json({ error: 'stripe_customer_id is required' });
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://techcloudpro.com';

    try {
      const session = await getStripe().billingPortal.sessions.create({
        customer: stripe_customer_id,
        return_url: `${frontendUrl}/launchos/dashboard`,
      });

      res.status(200).json({ url: session.url });
    } catch (err) {
      console.error('[stripe/portal] Stripe error:', err);
      res.status(400).json({ error: 'Unable to open billing portal. Please contact support.' });
    }
  }
);

export { router as stripeRouter };
