import { Router, Request, Response } from 'express';
import Redis from 'ioredis';
import { TIERS, TierName, ActionName } from '../config/tiers';

const router = Router();

// Connect to Redis ElastiCache (dollor-production cluster)
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
  console.error('[Redis] Connection error:', err.message);
});

/**
 * Get the current month string in YYYY-MM format.
 */
function currentMonth(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * POST /entitlements/check
 * Body: { launchos_user_id, action, quantity? }
 * Returns 200 { allowed: true, remaining, limit } or
 *         402 { allowed: false, tier, limit, used, upgrade_url }
 */
router.post('/check', async (req: Request, res: Response): Promise<void> => {
  const { launchos_user_id, action, quantity = 1 } = req.body;

  if (!launchos_user_id || !action) {
    res.status(400).json({ error: 'launchos_user_id and action are required' });
    return;
  }

  if (!isValidAction(action)) {
    res.status(400).json({ error: `Invalid action: ${action}` });
    return;
  }

  try {
    // Get tier from Redis (default: starter)
    const tierRaw = await redis.get(`launchos:tier:${launchos_user_id}`);
    const tier: TierName = isValidTier(tierRaw) ? tierRaw : 'starter';

    // Get current month usage counter
    const month = currentMonth();
    const usageKey = `launchos:usage:${launchos_user_id}:${action}:${month}`;
    const usageRaw = await redis.get(usageKey);
    const used = parseInt(usageRaw || '0', 10);

    const limit = TIERS[tier][action as ActionName];

    // Handle Infinity (scale tier unlimited actions)
    if (limit === Infinity) {
      res.status(200).json({
        allowed: true,
        remaining: Infinity,
        limit: null, // null signals unlimited
        used,
        tier,
      });
      return;
    }

    const remaining = Math.max(0, limit - used);

    if (used + quantity > limit) {
      res.status(402).json({
        allowed: false,
        tier,
        limit,
        used,
        remaining,
        upgrade_url: 'https://techcloudpro.com/launchos#pricing',
      });
      return;
    }

    res.status(200).json({
      allowed: true,
      remaining,
      limit,
      used,
      tier,
    });
  } catch (err) {
    console.error('[entitlements/check] Redis error:', err);
    res.status(503).json({ error: 'Entitlement service temporarily unavailable' });
  }
});

/**
 * POST /entitlements/consume
 * Body: { launchos_user_id, action, quantity? }
 * Atomically increments monthly counter. Sets 33-day TTL on first write.
 * Returns { consumed: true, new_total }
 */
router.post('/consume', async (req: Request, res: Response): Promise<void> => {
  const { launchos_user_id, action, quantity = 1 } = req.body;

  if (!launchos_user_id || !action) {
    res.status(400).json({ error: 'launchos_user_id and action are required' });
    return;
  }

  if (!isValidAction(action)) {
    res.status(400).json({ error: `Invalid action: ${action}` });
    return;
  }

  const qty = parseInt(String(quantity), 10);
  if (isNaN(qty) || qty < 1) {
    res.status(400).json({ error: 'quantity must be a positive integer' });
    return;
  }

  try {
    const month = currentMonth();
    const usageKey = `launchos:usage:${launchos_user_id}:${action}:${month}`;

    // 33-day TTL in seconds (slightly longer than a month to handle edge cases)
    const TTL_SECONDS = 33 * 24 * 60 * 60; // 2851200

    // Atomically INCRBY and set TTL on first write using pipeline
    const pipeline = redis.pipeline();
    pipeline.incrby(usageKey, qty);
    pipeline.expire(usageKey, TTL_SECONDS, 'NX'); // NX: only set if not already set
    const results = await pipeline.exec();

    const newTotal = (results?.[0]?.[1] as number) ?? qty;

    res.status(200).json({
      consumed: true,
      new_total: newTotal,
      action,
      quantity: qty,
    });
  } catch (err) {
    console.error('[entitlements/consume] Redis error:', err);
    res.status(503).json({ error: 'Entitlement service temporarily unavailable' });
  }
});

/**
 * GET /entitlements/usage/:user_id
 * Returns all action counters for the current month + tier limits.
 * Used by LaunchOS dashboards.
 */
router.get('/usage/:user_id', async (req: Request, res: Response): Promise<void> => {
  const { user_id } = req.params;

  if (!user_id) {
    res.status(400).json({ error: 'user_id is required' });
    return;
  }

  try {
    const tierRaw = await redis.get(`launchos:tier:${user_id}`);
    const tier: TierName = isValidTier(tierRaw) ? tierRaw : 'starter';
    const month = currentMonth();
    const actions: ActionName[] = [
      'add_contact',
      'send_email',
      'render_video',
      'ai_output',
      'meeting_minute',
      'tts_character',
    ];

    // Batch get all usage counters
    const pipeline = redis.pipeline();
    for (const action of actions) {
      pipeline.get(`launchos:usage:${user_id}:${action}:${month}`);
    }
    const results = await pipeline.exec();

    const usage: Record<string, { used: number; limit: number | null; remaining: number | null }> =
      {};
    actions.forEach((action, i) => {
      const used = parseInt((results?.[i]?.[1] as string) || '0', 10);
      const limit = TIERS[tier][action];
      const isUnlimited = limit === Infinity;
      usage[action] = {
        used,
        limit: isUnlimited ? null : limit,
        remaining: isUnlimited ? null : Math.max(0, limit - used),
      };
    });

    res.status(200).json({
      user_id,
      tier,
      month,
      usage,
    });
  } catch (err) {
    console.error('[entitlements/usage] Redis error:', err);
    res.status(503).json({ error: 'Entitlement service temporarily unavailable' });
  }
});

// Helpers

function isValidTier(value: string | null): value is TierName {
  return value === 'starter' || value === 'growth' || value === 'scale';
}

function isValidAction(value: string): value is ActionName {
  const validActions: ActionName[] = [
    'add_contact',
    'send_email',
    'render_video',
    'ai_output',
    'meeting_minute',
    'tts_character',
  ];
  return validActions.includes(value as ActionName);
}

export { router as entitlementRouter };
