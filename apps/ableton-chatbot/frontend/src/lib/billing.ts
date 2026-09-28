import { useCallback, useEffect, useState } from "react";
import { apiFetch, type User } from "./auth";

export type Interval = "month" | "year";
export type PlanId = "starter" | "pro" | "studio" | "mixmind" | "starter_mixmind" | "pro_mixmind";

export interface PlanOption {
  plan: PlanId;
  name: string;
  interval: Interval;
  amount: number;
  currency: string;
  tier: string;
  included_tracks: number;
  included_cloud: number;
  mixmind: boolean;
  available: boolean;
}

export interface Catalog {
  plans: PlanOption[];
  trial_days: number;
  trial: { tracks: number; cloud: number; chat_messages: number; estimated_usd: number };
  mixmind_sales_enabled: boolean;
}

export interface PlanState {
  source: "subscription" | "legacy" | "trial" | "none";
  plan: string | null;
  tier: string | null;
  interval: Interval | null;
  status: string | null;
  included_tracks: number;
  included_cloud: number;
  mixmind: boolean;
  current_period_end: string | null;
}

export interface Pack { id: string; kind: "track" | "cloud"; credits: number; price: { amount: number; currency: string } }

export interface Usage {
  enforced: boolean;
  plan: PlanState;
  included_per_month: number;
  tracks_used: number;
  allowance_left: number;
  included_cloud_per_month: number;
  cloud_used: number;
  cloud_allowance_left: number;
  track_credits: number;
  cloud_credits: number;
  packs: Pack[];
  subscribed: boolean;
  mixmind_access: boolean;
  can_buy_packs: boolean;
  billing_account: boolean;
  ai_usage: {
    estimated_usd: number;
    fair_use_cap_usd: number;
    trial?: { chat_messages: number; estimated_usd: number; exhausted: boolean; limits: { chat_messages: number; estimated_usd: number } };
  };
}

export const BEATMIND_PLANS: PlanId[] = ["starter", "pro", "studio"];
export const MIXMIND_PLANS: PlanId[] = ["mixmind", "starter_mixmind", "pro_mixmind"];

const PLAN_NAMES: Record<string, string> = {
  starter: "Starter", pro: "Pro", studio: "Studio", mixmind: "MixMind",
  starter_mixmind: "Starter + MixMind", pro_mixmind: "Pro + MixMind", trial: "Free trial",
};

/** True only for plans that include MixMind (Studio, MixMind, combos). Trial and Starter/Pro users are false. */
export function hasMixMindAccess(user: Pick<User, "mixmind_access"> | null | undefined): boolean {
  return user?.mixmind_access === true;
}

export function planName(plan: PlanState | null | undefined): string {
  if (!plan?.plan) return "No plan";
  return PLAN_NAMES[plan.plan] ?? plan.plan;
}

/** A paid plan (not the free trial): active, trialing on Stripe, or past due within its grace period. */
export function hasPaidPlan(plan: PlanState | null | undefined): boolean {
  return plan?.source === "subscription" || plan?.source === "legacy";
}

export function formatPrice(amount: number, currency: string): string {
  const whole = amount % 100 === 0;
  return new Intl.NumberFormat(undefined, {
    style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: whole ? 0 : 2,
  }).format(amount / 100);
}

export function daysLeft(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

async function errorDetail(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => ({}));
  return typeof body.detail === "string" ? body.detail : fallback;
}

export async function fetchPlans(): Promise<Catalog> {
  const response = await apiFetch("/api/stripe/plans");
  if (!response.ok) throw new Error(await errorDetail(response, "Plans are unavailable right now."));
  return response.json();
}

/** Sends the browser to Stripe Checkout for a plan. Throws with the server's reason (e.g. a code that doesn't apply). */
export async function startCheckout(plan: PlanId, interval: Interval, promoCode = ""): Promise<void> {
  const code = promoCode.trim();
  const response = await apiFetch("/api/stripe/checkout", {
    method: "POST", body: JSON.stringify({ plan, interval, ...(code ? { promo_code: code } : {}) }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.url) throw new Error(typeof body.detail === "string" ? body.detail : "Checkout could not start.");
  window.location.assign(body.url);
}

/** Opens the Stripe billing portal. Returns false when the user has no billing account yet. */
export async function openBillingPortal(): Promise<boolean> {
  const response = await apiFetch("/api/stripe/portal", { method: "POST", body: "{}" });
  if (response.status === 404) return false;
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.url) throw new Error(typeof body.detail === "string" ? body.detail : "Billing could not open.");
  window.location.assign(body.url);
  return true;
}

export function useUsage(refreshKey?: unknown) {
  const [usage, setUsage] = useState<Usage | null>(null);
  const load = useCallback(async () => {
    const response = await apiFetch("/api/stripe/usage");
    if (response.ok) setUsage(await response.json());
  }, []);
  useEffect(() => { void load().catch(() => undefined); }, [load, refreshKey]);
  return { usage, reload: load };
}
