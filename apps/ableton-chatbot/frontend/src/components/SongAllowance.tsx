"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/auth";
import type { SongAllowance as Allowance, Usage } from "@/lib/billing";

export default function SongAllowance({ sessionId, busy, refreshKey, usage, onSetup, onUpgrade }: {
  sessionId: string | null; busy: boolean; refreshKey: unknown; usage: Usage | null;
  onSetup: () => void; onUpgrade: () => void;
}) {
  const [state, setState] = useState<Allowance | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!sessionId || busy) return;
    let active = true;
    setState(null); setError("");
    void apiFetch(`/api/chats/${sessionId}/allowance`).then(async response => {
      if (!response.ok) throw new Error("Song allowance unavailable. Reopen the song to retry; production limits still apply.");
      const data = await response.json();
      if (active) setState(data);
    }).catch(error => { if (active) setError(error.message); });
    return () => { active = false; };
  }, [sessionId, busy, refreshKey]);
  const ai = usage?.ai_usage;
  const percent = ai?.fair_use_enforced && ai.fair_use_cap_usd > 0
    ? Math.min(100, Math.floor(100 * ai.estimated_usd / ai.fair_use_cap_usd)) : null;
  return <div aria-label="Song usage" className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: "var(--text-secondary)" }}>
    {state && <>
      <span>{state.used} / {state.included} new songs used {state.period === "trial" ? "in trial" : "this month (UTC)"}</span>
      {state.started ? <span>This song is counted</span> : state.remaining === 0
        ? <><span>No new song credits remaining</span><button type="button" onClick={onUpgrade} className="underline">Upgrade plan</button></>
        : !state.authorized && <button type="button" disabled={busy} onClick={onSetup} className="underline">Confirm song allowance</button>}
    </>}
    {percent !== null && <span role={percent >= 80 ? "status" : undefined}>AI allowance: {percent}% used{percent >= 100 ? " - resets on the 1st (UTC)" : percent >= 80 ? " - nearing monthly limit" : ""}</span>}
    {error && <span role="status">{error}</span>}
  </div>;
}
