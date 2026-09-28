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
    monthly: 19,
    yearly: 190,
    includedTracks: 10,
    includedCloud: 0,
    features: [
      "10 tracks / month",
      "High-quality stem separation on your computer via the Bridge",
      "AI producer inside Ableton Live (fair use)",
      "BeatMind Bridge for Mac (Apple Silicon, macOS 15+)",
    ],
    highlight: false,
    available: true,
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 39,
    yearly: 390,
    includedTracks: 30,
    includedCloud: 5,
    features: [
      "Everything in Starter, plus:",
      "30 tracks / month",
      "5 cloud HQ separations / month (no powerful computer needed)",
    ],
    highlight: true,
    available: true,
  },
  {
    id: "studio",
    name: "Studio",
    monthly: 79,
    yearly: 790,
    includedTracks: 80,
    includedCloud: 20,
    features: [
      "Everything in Pro, plus:",
      "80 tracks / month",
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
  "A track is one stem separation of a reference track. High-quality separation runs on your own Mac via the Bridge.";
export const CLOUD_HQ_DEFINITION =
  "Cloud HQ separations run on our cloud GPU, for computers that can't run high-quality separation locally. They need a paid plan.";

export const TRACK_PACKS: Pack[] = [
  { quantity: 10, price: 9 },
  { quantity: 25, price: 19 },
  { quantity: 60, price: 39 },
];

export const CLOUD_HQ_PACKS: Pack[] = [
  { quantity: 10, price: 7.99 },
  { quantity: 50, price: 34.99 },
];

export const PACK_TERMS =
  "Packs never expire. They're used after your monthly allowance and need a paid plan.";

export const FOUNDING_CODE = "FOUNDING100";
export const FOUNDING_DISCOUNT_PERCENT = 40;
export const FOUNDING_SEATS = 100;
export const FOUNDING_OFFER = `The first ${FOUNDING_SEATS} annual subscribers who use code ${FOUNDING_CODE} get ${FOUNDING_DISCOUNT_PERCENT}% off for as long as their subscription stays active. Annual plans only.`;

// One switch for MixMind sales. false = standalone MixMind and both combos are not purchasable:
// their site CTAs are disabled and their JSON-LD offers are no longer InStock.
export const MIXMIND_ON_SALE = true;

export const MIXMIND_PRICE = { id: "mixmind" as const, monthly: 12, yearly: 120, available: MIXMIND_ON_SALE };

export const MIXMIND_COMBOS: Combo[] = [
  { id: "starter_mixmind", beatmindPlan: "starter", name: "Starter + MixMind", monthly: 25, yearly: 250, savingsMonthly: 6, available: MIXMIND_ON_SALE },
  { id: "pro_mixmind", beatmindPlan: "pro", name: "Pro + MixMind", monthly: 45, yearly: 450, savingsMonthly: 6, available: MIXMIND_ON_SALE },
];

export const MIXMIND_COMBO_FROM_MONTHLY = Math.min(...MIXMIND_COMBOS.map((combo) => combo.monthly));
export const MIXMIND_TRIAL_NOTE =
  "The free trial covers BeatMind only. MixMind needs a MixMind, BeatMind + MixMind or Studio plan.";

export function formatUsd(amount: number): string {
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

export function signupHref(planId: CheckoutPlanId, interval: BillingInterval): string {
  return `/signup?plan=${planId}&interval=${interval}`;
}

export function planById(planId: PlanId): Plan {
  const plan = PLANS.find((candidate) => candidate.id === planId);
  if (!plan) {
    throw new Error(`Unknown plan: ${planId}`);
  }
  return plan;
}
