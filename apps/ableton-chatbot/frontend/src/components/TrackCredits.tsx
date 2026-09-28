"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/auth";
import { daysLeft, formatPrice, hasPaidPlan, openBillingPortal, planName, useUsage, type Pack } from "@/lib/billing";
import PlanPicker from "./PlanPicker";

function packLabel(pack: Pack) {
  return pack.kind === "cloud" ? `${pack.credits} BeatMind Cloud tracks` : `${pack.credits} tracks`;
}

// Tracks used vs included, purchased credits, packs and plan upgrades. Renders nothing while billing is not metered.
export default function TrackCredits({ refreshKey }: { refreshKey?: unknown }) {
  const { usage } = useUsage(refreshKey);
  const [error, setError] = useState("");
  const [buying, setBuying] = useState("");
  const [picker, setPicker] = useState(false);

  async function buy(pack: Pack) {
    setBuying(pack.id); setError("");
    try {
      const response = await apiFetch(`/api/stripe/packs/${pack.id}/checkout`, { method: "POST", body: "{}" });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(typeof result.detail === "string" ? result.detail : "Checkout could not start.");
      window.location.assign(result.url);
    } catch (e) { setError(e instanceof Error ? e.message : "Checkout could not start."); setBuying(""); }
  }

  async function upgrade() {
    setError("");
    // Subscribers change plans in the Stripe billing portal, which prorates the difference.
    try { if (!(await openBillingPortal())) setPicker(true); }
    catch (e) { setError(e instanceof Error ? e.message : "Billing could not open."); }
  }

  if (!usage?.enforced) return null;
  const { plan } = usage;
  const paid = hasPaidPlan(plan);
  const trial = plan.source === "trial";
  const outOfTracks = usage.allowance_left === 0 && usage.track_credits === 0;
  const trialDays = daysLeft(plan.current_period_end);

  let heading = "No active plan";
  if (paid) heading = `${planName(plan)} plan`;
  else if (trial) heading = `Free trial · ${usage.allowance_left} of ${usage.included_per_month} tracks left · ${trialDays} day${trialDays === 1 ? "" : "s"} left`;

  return <div aria-label="Your tracks" className="space-y-3 rounded border border-neutral-700 p-4 text-sm">
    <p className="font-medium">{heading}</p>
    {paid && <div className="flex flex-wrap gap-x-6 gap-y-1">
      <span><strong>{usage.tracks_used}</strong> of {usage.included_per_month} tracks used this month</span>
      {usage.included_cloud_per_month > 0 && <span><strong>{usage.cloud_used}</strong> of {usage.included_cloud_per_month} BeatMind Cloud tracks used</span>}
      <span><strong>{usage.track_credits}</strong> purchased tracks</span>
      <span><strong>{usage.cloud_credits}</strong> purchased Cloud tracks</span>
    </div>}
    <p className="text-xs text-neutral-400">{trial
      ? "Your free trial separates tracks on your computer with the BeatMind Bridge. BeatMind Cloud and track packs come with a paid plan."
      : "Each separation uses one track, from this month's plan first, then purchased tracks. BeatMind Cloud also uses one Cloud track. Failed separations are refunded. Purchased tracks don't expire and are used while you have a paid plan."}</p>

    {paid
      ? <button type="button" onClick={() => void upgrade()}
          className={`rounded px-4 py-2 ${outOfTracks ? "bg-emerald-600 font-semibold text-white" : "border border-neutral-600"}`}>Upgrade plan</button>
      : <button type="button" onClick={() => setPicker(true)} className="rounded bg-emerald-600 px-4 py-2 font-semibold text-white">Start your plan</button>}

    {usage.can_buy_packs && usage.packs.length > 0 && <div className="flex flex-wrap gap-2">
      {usage.packs.map(pack => <button key={pack.id} type="button" disabled={Boolean(buying)} onClick={() => void buy(pack)}
        className="rounded border border-emerald-600 px-3 py-2 disabled:opacity-40">{buying === pack.id ? "Opening checkout..." : `${packLabel(pack)}: ${formatPrice(pack.price.amount, pack.price.currency)}`}</button>)}
    </div>}
    {error && <p role="alert" className="text-red-300">{error}</p>}
    {picker && <PlanPicker onClose={() => setPicker(false)} inTrial={trial}
      reason={trial && outOfTracks ? `Your free trial includes ${usage.included_per_month} tracks. Choose a plan to keep going.` : undefined} />}
  </div>;
}
