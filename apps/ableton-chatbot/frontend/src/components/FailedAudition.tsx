"use client";

import { failedAudition } from "@/lib/failed-audition";
import type { ProductionAction } from "@/components/ProductionLog";

export default function FailedAudition({ actions, onInspect, busy }: {
  actions: ProductionAction[]; onInspect: (prompt: string) => void; busy: boolean;
}) {
  const failure = failedAudition(actions);
  if (!failure) return null;
  return <section aria-label="Unavailable audition" className="mt-3 border-t pt-3 text-sm min-w-0" style={{ borderColor: "var(--border)" }}>
    <h3 className="font-semibold text-amber-200">Audio preview unavailable</h3>
    <p className="mt-1 text-xs">{failure.target} at the failed attempt</p>
    <p role="alert" className="mt-2 break-words text-amber-200">{failure.reason}</p>
    <p className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>No verified recording was returned for this attempt. Playback and approval remain unavailable. Inspect the existing part before retrying its recording.</p>
    <div className="mt-3 flex flex-wrap gap-3">
      <button type="button" disabled title="A verified audio recording is required" className="rounded border px-3 py-2 text-xs opacity-50">Play sound</button>
      <button type="button" disabled title="Listen to a verified recording before accepting" className="rounded border px-3 py-2 text-xs opacity-50">Accept sound</button>
      <button type="button" disabled={busy} onClick={() => onInspect(failure.prompt)} className="rounded border px-3 py-2 text-xs disabled:opacity-50">Prepare inspection</button>
    </div>
  </section>;
}
