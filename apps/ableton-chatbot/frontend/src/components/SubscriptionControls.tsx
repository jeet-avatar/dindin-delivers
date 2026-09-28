"use client";

import { useState } from "react";
import { formatDate, formatPrice, planName, setCancellation, type Usage } from "@/lib/billing";

type Props = { usage: Usage; onChanged: () => Promise<void> | void; onManage: () => void };

// Plan, price and renewal date with one-click cancel at period end (a single confirmation) and resume.
export default function SubscriptionControls({ usage, onChanged, onManage }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { plan } = usage;
  const endsOn = formatDate(plan.cancel_at || plan.current_period_end);
  const price = usage.plan_price && plan.interval ? `${formatPrice(usage.plan_price.amount, usage.plan_price.currency)} / ${plan.interval}` : "";

  async function change(cancel: boolean) {
    setBusy(true); setError("");
    try { await setCancellation(cancel); setConfirming(false); await onChanged(); }
    catch (e) { setError(e instanceof Error ? e.message : "Please try again or use Manage billing."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-3 text-sm">
    <p><span className="font-semibold">{planName(plan)}</span>{price && <span style={{ color: "var(--text-secondary)" }}> · {price}</span>}</p>
    {endsOn && <p role="status" className={plan.cancel_at ? "text-amber-200" : ""} style={plan.cancel_at ? undefined : { color: "var(--text-secondary)" }}>
      {plan.cancel_at
        ? `Cancelled — your plan ends on ${endsOn}. You won't be charged again.`
        : `Renews automatically on ${endsOn}.`}
    </p>}
    {usage.renewal_terms && !plan.cancel_at && <p style={{ color: "var(--text-secondary)" }}>{usage.renewal_terms}</p>}

    <div className="flex flex-wrap gap-2">
      {plan.cancel_at
        ? <button type="button" disabled={busy} onClick={() => void change(false)}
            className="rounded-lg px-4 py-2 font-semibold disabled:opacity-50" style={{ background: "var(--accent)", color: "#fff" }}>
            {busy ? "Resuming..." : "Resume subscription"}
          </button>
        : <button type="button" disabled={busy} onClick={() => setConfirming(true)}
            className="rounded-lg border border-red-400 px-4 py-2 font-semibold text-red-300 disabled:opacity-50">
            Cancel subscription
          </button>}
      <button type="button" onClick={onManage} className="rounded-lg border px-4 py-2" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
        Manage billing
      </button>
    </div>

    {confirming && <div role="alertdialog" aria-modal="true" aria-labelledby="cancel-title" aria-describedby="cancel-body"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => !busy && setConfirming(false)}>
      <div className="w-full max-w-sm rounded-2xl border p-6" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
        onClick={event => event.stopPropagation()}>
        <h3 id="cancel-title" className="text-lg font-semibold">Cancel your {planName(plan)} plan?</h3>
        <p id="cancel-body" className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          You&apos;ll keep access until {endsOn || "the end of your paid period"}. You won&apos;t be charged again.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => void change(true)}
            className="rounded-lg bg-red-500 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? "Cancelling..." : "Cancel subscription"}</button>
          <button type="button" disabled={busy} onClick={() => setConfirming(false)}
            className="rounded-lg border px-4 py-2" style={{ borderColor: "var(--border)" }}>Keep my plan</button>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
      </div>
    </div>}
    {error && !confirming && <p role="alert" className="text-red-300">{error}</p>}
  </div>;
}
