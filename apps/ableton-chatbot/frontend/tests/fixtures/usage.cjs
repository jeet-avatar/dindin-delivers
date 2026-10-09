/* A complete /api/stripe/usage response for an active Pro subscriber. */
module.exports = {
  enforced: true,
  plan: { source: 'subscription', plan: 'pro', tier: 'pro', interval: 'month', status: 'active', included_tracks: 25,
    included_cloud: 5, mixmind: false, current_period_end: '2026-10-27T00:00:00Z', cancel_at: null },
  included_per_month: 25, tracks_used: 3, allowance_left: 22,
  included_cloud_per_month: 5, cloud_used: 0, cloud_allowance_left: 5,
  track_credits: 0, cloud_credits: 0, packs: [], subscribed: true, mixmind_access: false,
  can_buy_packs: true, billing_account: true, plan_price: { amount: 2900, currency: 'usd' },
  renewal_terms: null, ai_usage: { estimated_usd: 1.2, fair_use_cap_usd: 40 },
};
