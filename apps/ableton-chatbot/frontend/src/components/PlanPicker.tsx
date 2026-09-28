"use client";

import { useEffect, useState } from "react";
import {
  BEATMIND_PLANS, MIXMIND_PLANS, fetchPlans, formatPrice, startCheckout,
  type Catalog, type Interval, type PlanId, type PlanOption,
} from "@/lib/billing";

type Props = {
  onClose: () => void;
  /** Why the picker opened, e.g. the server's 402 message. */
  reason?: string;
  /** The user is on the free trial: subscribing ends it and starts the plan today. */
  inTrial?: boolean;
};

function features(option: PlanOption): string[] {
  const list: string[] = [];
  if (option.tier !== "mixmind") {
    list.push("BeatMind AI for Ableton Live", `${option.included_tracks} track separations / month`);
  }
  if (option.included_cloud > 0) list.push(`${option.included_cloud} BeatMind Cloud GPU tracks / month`);
  if (option.mixmind) list.push(option.plan === "studio" ? "MixMind early access" : "MixMind for Mac + Windows");
  return list;
}

function PlanCard({ option, busy, onChoose }: { option: PlanOption; busy: boolean; onChoose: (plan: PlanId) => void }) {
  const perMonth = option.interval === "year" ? ` (${formatPrice(Math.round(option.amount / 12), option.currency)}/mo)` : "";
  return <div className="flex flex-col rounded-2xl border p-5" style={{ background: "var(--bg-primary)", borderColor: option.plan === "pro" ? "var(--accent)" : "var(--border)" }}>
    <div className="flex items-baseline justify-between gap-2">
      <h3 className="font-semibold">{option.name}</h3>
      {option.plan === "pro" && <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>Most popular</span>}
    </div>
    <p className="mt-2 text-2xl font-bold">{formatPrice(option.amount, option.currency)}
      <span className="text-sm font-normal" style={{ color: "var(--text-secondary)" }}> / {option.interval}{perMonth}</span></p>
    <ul className="mt-3 flex-1 space-y-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
      {features(option).map(item => <li key={item}>{item}</li>)}
    </ul>
    <button type="button" disabled={busy || !option.available} onClick={() => onChoose(option.plan)}
      className="mt-4 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
      style={{ background: option.available ? "var(--accent)" : "var(--bg-secondary)", color: option.available ? "#fff" : "var(--text-secondary)" }}>
      {option.available ? `Choose ${option.name}` : "Coming soon"}
    </button>
  </div>;
}

// Plan picker with a monthly/yearly toggle. MixMind plans show as "Coming soon" while their sales are closed.
export default function PlanPicker({ onClose, reason, inTrial }: Props) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [interval, setIntervalChoice] = useState<Interval>("month");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchPlans().then(result => { if (active) setCatalog(result); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : "Plans are unavailable right now."); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  async function choose(plan: PlanId) {
    setBusy(true); setError("");
    try { await startCheckout(plan, interval); }
    catch (e) { setError(e instanceof Error ? e.message : "Checkout could not start."); setBusy(false); }
  }

  const options = (ids: PlanId[]) => ids.map(id => catalog?.plans.find(p => p.plan === id && p.interval === interval))
    .filter((p): p is PlanOption => Boolean(p));
  const beatmind = options(BEATMIND_PLANS);
  const mixmind = options(MIXMIND_PLANS);
  const promoOnYearly = catalog?.promotion_codes_on.includes("year");

  return <div role="dialog" aria-modal="true" aria-labelledby="plan-picker-title"
    className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:items-center" onClick={onClose}>
    <div className="w-full max-w-4xl rounded-2xl border p-6" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
      onClick={event => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="plan-picker-title" className="text-xl font-bold">Choose your plan</h2>
          {reason && <p role="status" className="mt-1 text-sm text-amber-200">{reason}</p>}
          {inTrial && <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>Subscribing ends your free trial and starts your plan today with its full allowance.</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Close plans" className="rounded px-2 text-lg" style={{ color: "var(--text-secondary)" }}>×</button>
      </div>

      <div role="radiogroup" aria-label="Billing interval" className="mt-5 inline-flex rounded-xl border p-1" style={{ borderColor: "var(--border)" }}>
        {(["month", "year"] as Interval[]).map(value => <button key={value} type="button" role="radio" aria-checked={interval === value}
          onClick={() => setIntervalChoice(value)} className="rounded-lg px-4 py-1.5 text-sm font-medium"
          style={interval === value ? { background: "var(--accent)", color: "#fff" } : { color: "var(--text-secondary)" }}>
          {value === "month" ? "Monthly" : "Yearly · 2 months free"}
        </button>)}
      </div>
      {interval === "year" && promoOnYearly && <p className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>Have a promo code? Enter it at checkout (yearly plans only).</p>}

      {!catalog && !error && <p role="status" className="mt-6 text-sm" style={{ color: "var(--text-secondary)" }}>Loading plans...</p>}
      {catalog && beatmind.length === 0 && <p role="status" className="mt-6 text-sm text-amber-200">Plans are unavailable right now. Please try again shortly.</p>}
      {beatmind.length > 0 && <div className="mt-5 grid gap-4 md:grid-cols-3">
        {beatmind.map(option => <PlanCard key={option.plan} option={option} busy={busy} onChoose={choose} />)}
      </div>}

      {mixmind.length > 0 && <>
        <h3 className="mt-7 text-sm font-semibold">MixMind{mixmind.every(p => !p.available) && " · coming soon"}</h3>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {mixmind.map(option => <PlanCard key={option.plan} option={option} busy={busy} onChoose={choose} />)}
        </div>
      </>}

      <p className="mt-5 text-xs" style={{ color: "var(--text-secondary)" }}>Each separation uses one track; BeatMind Cloud also uses one cloud track. Failed separations are refunded. Need more? Track packs top up any paid plan. Cancel any time from Manage billing.</p>
      {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
    </div>
  </div>;
}
