"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/auth";

type Pack = { id: string; kind: "track" | "cloud"; credits: number; price: { amount: number; currency: string } };
type Usage = { enforced: boolean; included_per_month: number; allowance_left: number; track_credits: number; cloud_credits: number; packs: Pack[] };

function price({ amount, currency }: Pack["price"]) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(amount / 100);
}

function packLabel(pack: Pack) {
  return pack.kind === "cloud" ? `${pack.credits} BeatMind Cloud tracks` : `${pack.credits} tracks`;
}

// Shows remaining tracks and packages for sale. Renders nothing while packages are not configured.
export default function TrackCredits({ refreshKey }: { refreshKey?: unknown }) {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState("");
  const [buying, setBuying] = useState("");
  const load = useCallback(async () => {
    const response = await apiFetch("/api/stripe/usage");
    if (response.ok) setUsage(await response.json());
  }, []);
  useEffect(() => { void load().catch(() => undefined); }, [load, refreshKey]);

  async function buy(pack: Pack) {
    setBuying(pack.id); setError("");
    try {
      const response = await apiFetch(`/api/stripe/packs/${pack.id}/checkout`, { method: "POST", body: "{}" });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(typeof result.detail === "string" ? result.detail : "Checkout could not start.");
      window.location.assign(result.url);
    } catch (e) { setError(e instanceof Error ? e.message : "Checkout could not start."); setBuying(""); }
  }

  if (!usage?.enforced) return null;
  return <div aria-label="Your tracks" className="space-y-3 rounded border border-neutral-700 p-4 text-sm">
    <div className="flex flex-wrap gap-x-6 gap-y-1">
      {usage.included_per_month > 0 && <span><strong>{usage.allowance_left}</strong> of {usage.included_per_month} included tracks left this month</span>}
      <span><strong>{usage.track_credits}</strong> purchased tracks</span>
      <span><strong>{usage.cloud_credits}</strong> BeatMind Cloud tracks</span>
    </div>
    <p className="text-xs text-neutral-400">Each separation uses one track. Separating on BeatMind Cloud also uses one cloud track. Failed separations are refunded.</p>
    {usage.packs.length > 0 && <div className="flex flex-wrap gap-2">
      {usage.packs.map(pack => <button key={pack.id} type="button" disabled={Boolean(buying)} onClick={() => void buy(pack)}
        className="rounded border border-emerald-600 px-3 py-2 disabled:opacity-40">{buying === pack.id ? "Opening checkout..." : `${packLabel(pack)}: ${price(pack.price)}`}</button>)}
    </div>}
    {error && <p role="alert" className="text-red-300">{error}</p>}
  </div>;
}
