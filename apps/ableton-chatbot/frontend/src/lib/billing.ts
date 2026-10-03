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
  /** Set when the plan is cancelled and ends at this time instead of renewing. */
  cancel_at: string | null;
}

export interface Pack { id: string; kind: "track" | "cloud"; credits: number; price: { amount: number; currency: string } }

export interface Usage {
  songs?: SongAllowance;
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
  plan_price: { amount: number; currency: string } | null;
  renewal_terms: string | null;
  ai_usage: {
    estimated_usd: number;
    fair_use_cap_usd: number;
    fair_use_enforced?: boolean;
    trial?: { chat_messages: number; estimated_usd: number; exhausted: boolean; limits: { chat_messages: number; estimated_usd: number } };
  };
}

export interface SongAllowance {
  included: number; used: number; remaining: number; period: string;
  authorized: boolean; started: boolean; live_title: string | null;
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
  // Callers add " plan" themselves ("✓ Original $19 plan", "Cancel your Original $19 plan?").
  if (plan.tier === "legacy") return "Original $19";
  return PLAN_NAMES[plan.plan] ?? plan.plan;
}

/** A paid plan (not the free trial): active, trialing on Stripe, or past due within its grace period. */
export function hasPaidPlan(plan: PlanState | null | undefined): boolean {
  return plan?.source === "subscription" || plan?.source === "legacy";
}

/** A plan chosen on the public site, carried through signup/login to the dashboard plan picker. */
export interface PlanIntent { plan: PlanId; interval: Interval }

const PLAN_INTENT_PARAMS = ["plan", "interval", "upgrade"];

/** Reads ?plan=<id>&interval=<month|year> (or the older ?upgrade=<id>). Unknown plan ids are ignored. */
export function parsePlanIntent(search: string): PlanIntent | null {
  const params = new URLSearchParams(search);
  const plan = params.get("plan") ?? params.get("upgrade");
  const known: string[] = [...BEATMIND_PLANS, ...MIXMIND_PLANS];
  if (!plan || !known.includes(plan)) return null;
  return { plan: plan as PlanId, interval: params.get("interval") === "year" ? "year" : "month" };
}

/** "?plan=<id>&interval=<i>" for a valid intent, or "" so links stay clean. */
export function planIntentQuery(intent: PlanIntent | null): string {
  return intent ? `?plan=${intent.plan}&interval=${intent.interval}` : "";
}

/** The search string with the plan-intent params removed, so a refresh doesn't reopen the picker. */
export function withoutPlanIntent(search: string): string {
  const params = new URLSearchParams(search);
  PLAN_INTENT_PARAMS.forEach(name => params.delete(name));
  const rest = params.toString();
  return rest ? `?${rest}` : "";
}

export function planIntentNote(intent: PlanIntent): string {
  const plan = PLAN_NAMES[intent.plan];
  return `You picked ${plan}. You'll start on the free 7-day BeatMind trial (no card). Start ${plan} whenever you're ready — `
    + "MixMind unlocks once a plan that includes it starts.";
}

export function formatPrice(amount: number, currency: string): string {
  const whole = amount % 100 === 0;
  return new Intl.NumberFormat(undefined, {
    style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: whole ? 0 : 2,
  }).format(amount / 100);
}

/** The auto-renewal disclosure shown next to every checkout button (the server sends the same text to Stripe). */
export function renewalTerms(option: Pick<PlanOption, "amount" | "currency" | "interval">): string {
  return `Your plan renews automatically at ${formatPrice(option.amount, option.currency)}/${option.interval} until you cancel. `
    + "Cancel anytime in Dashboard → Account → Billing — you keep access until the end of the paid period. Taxes may apply.";
}

export function formatDate(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "";
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

export interface PromoPreview {
  code: string;
  interval: Interval;
  plans: Partial<Record<PlanId, { ok: true; first_amount: number; terms: string } | { ok: false; message: string }>>;
}

/** Which plans a code applies to for this billing period. Throws with the reason for an unknown code. */
export async function previewPromo(code: string, interval: Interval): Promise<PromoPreview> {
  const response = await apiFetch(`/api/stripe/promo?code=${encodeURIComponent(code.trim())}&interval=${interval}`);
  if (!response.ok) throw new Error(await errorDetail(response, "That code couldn't be checked."));
  return response.json();
}

export interface SubscriptionState { status: string; cancel_at_period_end: boolean; cancel_at: string | null; current_period_end: string | null }

/** Cancel at period end (cancel = true) or resume a pending cancellation. */
export async function setCancellation(cancel: boolean): Promise<SubscriptionState> {
  const response = await apiFetch(`/api/stripe/subscription/${cancel ? "cancel" : "resume"}`, { method: "POST", body: "{}" });
  if (!response.ok) throw new Error(await errorDetail(response, cancel ? "Cancellation failed." : "Resuming failed."));
  return response.json();
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
