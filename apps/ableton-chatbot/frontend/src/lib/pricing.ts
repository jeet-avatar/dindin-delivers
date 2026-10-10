// Single source of truth for public pricing copy. Must match the live Stripe prices.

export { TRIAL_AI_MESSAGES, TRIAL_DAYS, TRIAL_DETAILS, TRIAL_SHORT, TRIAL_TERMS, TRIAL_TRACKS } from "@/lib/site";

export type PlanId = "starter" | "pro" | "studio";
export type MixMindPlanId = "mixmind" | "starter_mixmind" | "pro_mixmind";
export type CheckoutPlanId = PlanId | MixMindPlanId;
export type BillingInterval = "month" | "year";

export interface Plan {
  id: PlanId;
  name: string;
  monthly: number;
  yearly: number;
  includedTracks: number;
  includedCloud: number;
  features: string[];
  highlight: boolean;
  available: boolean;
}

export interface Pack {
  quantity: number;
  price: number;
}

export interface Combo {
  id: MixMindPlanId;
  beatmindPlan: PlanId;
  name: string;
  monthly: number;
  yearly: number;
  savingsMonthly: number;
  available: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    monthly: 39.99,
    yearly: 399.99,
    includedTracks: 10,
    includedCloud: 0,
    features: [
      "Fast mode AI (Haiku 4.5)",
      "10 songs / month · 30 AI rounds per song",
      "$25/mo AI budget",
      "Unlimited stem separations",
      "BeatMind Bridge for Mac (Apple Silicon, macOS 15+)",
    ],
    highlight: false,
    available: true,
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 69.99,
    yearly: 699.99,
    includedTracks: 25,
    includedCloud: 5,
    features: [
      "Fast + Pro mode AI (Haiku + Sonnet)",
      "25 songs / month · 30 AI rounds per song",
      "$45/mo AI budget",
      "Unlimited stem separations",
      "5 cloud HQ separations / month",
    ],
    highlight: true,
    available: true,
  },
  {
    id: "studio",
    name: "Studio",
    monthly: 99.99,
    yearly: 999.99,
    includedTracks: 50,
    includedCloud: 20,
    features: [
      "Fast + Pro + Ultra mode AI (all models)",
      "50 songs / month · 30 AI rounds per song",
      "$80/mo AI budget",
      "Unlimited stem separations",
      "20 cloud HQ separations / month",
      "MixMind for Rekordbox included",
      "Priority support",
    ],
    highlight: false,
    available: true,
  },
];

export const LOWEST_MONTHLY_USD = Math.min(...PLANS.map((plan) => plan.monthly));
export const HIGHEST_MONTHLY_USD = Math.max(...PLANS.map((plan) => plan.monthly));
export const ANNUAL_DISCOUNT_LABEL = "2 months free";

export const TRACK_DEFINITION =
  "Each song includes up to 30 AI rounds. Need more? Buy extra rounds from within a song ($1.99 for 10 rounds, $3.99 for 25 rounds).";
export const CLOUD_HQ_DEFINITION =
  "Cloud HQ separations run on our cloud GPU, for computers that can't run high-quality separation locally. They need a paid plan.";

export const TRACK_PACKS: Pack[] = [
  { quantity: 10, price: 1.99 },
  { quantity: 25, price: 3.99 },
];

export const CLOUD_HQ_PACKS: Pack[] = [
  { quantity: 10, price: 7.99 },
  { quantity: 50, price: 34.99 },
];

export const PACK_TERMS =
  "Round packs are per-song and never expire. Cloud HQ packs are used after your monthly allowance.";

export const FOUNDING_CODE = "FOUNDING100";
export const FOUNDING_DISCOUNT_PERCENT = 40;
export const FOUNDING_SEATS = 100;
export const FOUNDING_OFFER = `The first ${FOUNDING_SEATS} annual subscribers who use code ${FOUNDING_CODE} get ${FOUNDING_DISCOUNT_PERCENT}% off for as long as their subscription stays active. Annual plans only.`;

// One switch for MixMind sales. false = standalone MixMind and both combos are not purchasable:
// their site CTAs are disabled and their JSON-LD offers are no longer InStock.
export const MIXMIND_ON_SALE = true;

export const MIXMIND_PRICE = { id: "mixmind" as const, monthly: 19.99, yearly: 199.99, available: MIXMIND_ON_SALE };

export interface MixMindTier {
  id: MixMindPlanId;
  name: string;
  monthly: number;
  yearly: number;
  features: string[];
  highlight: boolean;
  available: boolean;
}

export const MIXMIND_TIERS: MixMindTier[] = [
  {
    id: "mixmind",
    name: "MixMind",
    monthly: 19.99,
    yearly: 199.99,
    features: [
      "Full library browser — unlimited tracks",
      "Duplicate detection & cleanup",
      "Pioneer USB drive support",
      "Mac (Apple Silicon) · Windows coming soon",
    ],
    highlight: false,
    available: MIXMIND_ON_SALE,
  },
  {
    id: "starter_mixmind",
    name: "MixMind Pro",
    monthly: 29.99,
    yearly: 299.99,
    features: [
      "Everything in MixMind, plus:",
      "AI playlist builder",
      "Advanced search & filters",
      "Intelligent Set Builder",
    ],
    highlight: true,
    available: MIXMIND_ON_SALE,
  },
  {
    id: "pro_mixmind",
    name: "MixMind Studio",
    monthly: 49.99,
    yearly: 499.99,
    features: [
      "Everything in MixMind Pro, plus:",
      "Multi-genre Set Builder",
      "Export playlists to Rekordbox",
      "Priority support",
    ],
    highlight: false,
    available: MIXMIND_ON_SALE,
  },
];

export const MIXMIND_COMBOS: Combo[] = [
  { id: "starter_mixmind", beatmindPlan: "starter", name: "MixMind Pro", monthly: 29.99, yearly: 299.99, savingsMonthly: 0, available: MIXMIND_ON_SALE },
  { id: "pro_mixmind", beatmindPlan: "pro", name: "MixMind Studio", monthly: 49.99, yearly: 499.99, savingsMonthly: 0, available: MIXMIND_ON_SALE },
];

export const MIXMIND_COMBO_FROM_MONTHLY = Math.min(...MIXMIND_TIERS.map((t) => t.monthly));
export const MIXMIND_TRIAL_NOTE =
  "The free trial covers BeatMind only. MixMind needs a MixMind plan or BeatMind Studio.";

export function formatUsd(amount: number): string {
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

export function signupHref(planId: CheckoutPlanId, interval: BillingInterval): string {
  return `/signup?plan=${planId}&interval=${interval}`;
}

/**
 * Where a pricing card's button should go. A signed-in visitor already has an account — sending them
 * to /signup would either 409 ("account already exists") or start a second one, so they go straight
 * to the dashboard's plan picker instead, pre-selected on this plan (see parsePlanIntent).
 */
export function ctaHref(planId: CheckoutPlanId, interval: BillingInterval, loggedIn: boolean): string {
  return loggedIn ? `/dashboard?plan=${planId}&interval=${interval}` : signupHref(planId, interval);
}

export function planById(planId: PlanId): Plan {
  const plan = PLANS.find((candidate) => candidate.id === planId);
  if (!plan) {
    throw new Error(`Unknown plan: ${planId}`);
  }
  return plan;
}
