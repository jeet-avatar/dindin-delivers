export type TierName = 'starter' | 'growth' | 'scale';
export type ActionName =
  | 'add_contact'
  | 'send_email'
  | 'render_video'
  | 'ai_output'
  | 'meeting_minute'
  | 'tts_character';

export const TIERS: Record<TierName, Record<ActionName, number>> = {
  starter: {
    add_contact: 1000,
    send_email: 2000,
    render_video: 5,
    ai_output: 50,
    meeting_minute: 300,
    tts_character: 3500,
  },
  growth: {
    add_contact: 10000,
    send_email: 15000,
    render_video: 30,
    ai_output: 300,
    meeting_minute: 1200,
    tts_character: 21000,
  },
  scale: {
    add_contact: Infinity,
    send_email: 100000,
    render_video: Infinity,
    ai_output: Infinity,
    meeting_minute: Infinity,
    tts_character: 500000,
  },
};

// Stripe Price IDs — create these in Stripe Dashboard before first deploy
// Starter $79/mo, Growth $149/mo, Scale $249/mo
export const STRIPE_PRICE_TO_TIER: Record<string, TierName> = {
  [process.env.STRIPE_PRICE_STARTER!]: 'starter',
  [process.env.STRIPE_PRICE_GROWTH!]: 'growth',
  [process.env.STRIPE_PRICE_SCALE!]: 'scale',
};

export const TIER_TO_STRIPE_PRICE: Record<TierName, string> = {
  starter: process.env.STRIPE_PRICE_STARTER!,
  growth: process.env.STRIPE_PRICE_GROWTH!,
  scale: process.env.STRIPE_PRICE_SCALE!,
};
