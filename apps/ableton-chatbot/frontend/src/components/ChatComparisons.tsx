"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/auth";
import { ComparisonPreview, type Comparison } from "./SoundComparison";
import type { ProductionAction } from "./ProductionLog";
import ChatTimestamp from "./ChatTimestamp";
import { RefreshIcon } from "./Icons";

function SavedComparison({ id, referenceId }: { id: string; referenceId: string }) {
  const [result, setResult] = useState<Comparison | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const base = `/api/references/${referenceId}/comparisons/${id}`;
  useEffect(() => {
    const controller = new AbortController();
    setResult(null); setError("");
    void (async () => {
      try {
        const response = await apiFetch(base, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Comparison unavailable.");
        if (!controller.signal.aborted) setResult(data);
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Comparison unavailable."); }
    })();
    return () => controller.abort();
  }, [base, attempt]);
  return <section aria-label="Chat sound comparison" className="min-w-0 mt-4 space-y-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
    {!result && !error && <p role="status" className="text-sm">Loading comparison...</p>}
    {error && <div className="flex items-center gap-2"><p role="alert" className="text-sm text-red-300">{error}</p>
      <button type="button" onClick={() => setAttempt(n => n + 1)} title="Retry loading comparison" aria-label="Retry loading comparison" className="p-2"><RefreshIcon size={18} /></button></div>}
    {result && <>
      <h4 className="text-sm font-medium break-words">{result.track_name} / {result.request.layer}</h4>
      <ChatTimestamp value={result.created_at} label="Compared" />
      <p className="text-xs">{result.request.duration_seconds}s: reference from {result.request.reference_start_seconds}s; recording from {result.request.recording_start_seconds}s.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ComparisonPreview base={base} side="reference" label="A - Reference (RMS matched)" />
        <ComparisonPreview base={base} side="candidate" label="B - Ableton recording (RMS matched)" />
      </div>
      <ul className="text-sm space-y-2">{result.next_checks.map(note => <li key={note}>{note}</li>)}</ul>
      <details className="text-xs"><summary>Comparison limitations</summary><ul className="mt-2 space-y-2">{result.limitations.map(note => <li key={note}>{note}</li>)}</ul></details>
    </>}
  </section>;
}

export default function ChatComparisons({ actions }: { actions: ProductionAction[] }) {
  const comparisons = new Map<string, { id: string; reference_id: string }>();
  for (const action of actions) {
    const result = action.result;
    if (result?.status === "observed" && result.comparison) comparisons.set(result.comparison.id, result.comparison);
  }
  return <>{[...comparisons.values()].map(item => <SavedComparison key={item.id} id={item.id} referenceId={item.reference_id} />)}</>;
}
