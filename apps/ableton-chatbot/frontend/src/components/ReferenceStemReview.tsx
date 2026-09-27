"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, RefreshCw, Save } from "lucide-react";
import { apiFetch, getUser } from "@/lib/auth";
import type { StemHealth, StemReview } from "./ReferenceReview";
import ReferenceStemAudio from "./ReferenceStemAudio";
import { CORE_STEMS, isDetailed, stemLabel } from "@/lib/stems";

export default function ReferenceStemReview({ id, name, analysisId, review, health, refresh, onSaved, onNext, stems = CORE_STEMS }: {
  id: string; name: string; analysisId: string; review: StemReview; health?: StemHealth; refresh: () => Promise<void>; stems?: string[];
  onSaved?: (review: StemReview) => void; onNext?: () => void;
}) {
  const same = (a: Record<string, string>, b: Record<string, string>) => stems.every(stem => (a[stem] || "") === (b[stem] || ""));
  const detailed = isDetailed(stems);
  const [decisions, setDecisions] = useState(review.decisions);
  const [saved, setSaved] = useState(review);
  const [heard, setHeard] = useState(review.status === "accepted");
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [storageKey, setStorageKey] = useState("");
  const sending = useRef(false);
  const confirmation = useRef<HTMLInputElement>(null);
  const section = useRef<HTMLElement>(null);
  const unchanged = same(decisions, saved.decisions);
  const savedChoices = unchanged && saved.status !== "pending" && !uncertain;
  const ready = savedChoices && saved.status === "accepted";
  const missing = stems.filter(stem => !decisions[stem]);
  const needsWork = stems.filter(stem => decisions[stem] === "needs_work");
  const kept = stems.filter(stem => decisions[stem] === "keep");
  const stemName = (stem: string) => stemLabel(stem).toLowerCase();
  function focusChoice(stem: string) {
    const control = section.current?.querySelector<HTMLSelectElement>(`select[aria-label="${stem} reference decision"]`);
    control?.focus({ preventScroll: true });
    control?.closest("[data-stem]")?.scrollIntoView({ block: "center" });
  }
  const next = busy ? { label: "Updating review...", action: () => {} }
    : uncertain ? { label: "Check save status", action: () => void checkSaved() }
    : !health?.checks_passed ? { label: "Check stem files", action: () => void refreshChecks() }
    : ready ? { label: "Next: Timing", action: () => onNext?.() }
    : missing.length ? { label: `Review ${stemName(missing[0])}`, action: () => focusChoice(missing[0]) }
    : savedChoices ? { label: needsWork.length ? `Revisit ${stemName(needsWork[0])}` : "Choose a reference layer", action: () => focusChoice(needsWork[0] || stems[0]) }
    : !heard ? { label: "Confirm listening review", action: () => confirmation.current?.focus() }
    : { label: "Save choices", action: () => void save() };

  useEffect(() => {
    try {
      const user = getUser(); if (!user?.id) return;
      const key = `beatmind-stem-review:${user.id}:${id}:${analysisId}`;
      setStorageKey(key);
      const stored = JSON.parse(localStorage.getItem(key) || "null");
      const draft = stored?.decisions;
      if (draft && stems.every(s => !draft[s] || ["keep", "ignore", "needs_work"].includes(draft[s]))) {
        setDecisions(draft); if (!same(draft, review.decisions)) setHeard(false);
        setUncertain(Boolean(stored.pending));
      }
    } catch { /* Draft storage is optional; server persistence is authoritative. */ }
  }, [id, analysisId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!storageKey) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ decisions, pending: uncertain })); } catch { /* Keep saving to the server available. */ }
  }, [storageKey, decisions, uncertain]);
  useEffect(() => {
    if (review.analysis_id !== analysisId) return;
    setSaved(previous => (previous.status !== "pending" && review.status === "pending") || (previous.status === review.status && same(previous.decisions, review.decisions)) ? previous : review);
    if (uncertain && review.status !== "pending" && same(review.decisions, decisions)) {
      setUncertain(false); setError(""); setNotice("Your stem choices are saved on the server.");
    }
  }, [review, analysisId, uncertain, decisions]);

  function accept(result: StemReview) {
    setSaved(result); setUncertain(false); setError(""); onSaved?.(result);
    setNotice(result.status === "accepted" ? "Stem choices saved. Ready for timing review." : "Choices saved. This review still needs attention.");
  }
  async function refreshChecks() {
    if (sending.current) return;
    sending.current = true; setBusy(true); setError("");
    try {
      const response = await apiFetch(`/api/references/${id}/refresh-analysis`, { method: "POST", body: "{}" });
      if (!response.ok) { const result = await response.json(); throw new Error(typeof result.detail === "string" ? result.detail : "Analysis checks could not be started."); }
      setNotice("Analysis check request accepted. Existing audio files are unchanged.");
      try { await refresh(); } catch { setNotice("Analysis checks were requested, but status updates are unavailable."); }
    } catch (e) { setError(e instanceof Error ? e.message : "Could not confirm the analysis request."); }
    finally { sending.current = false; setBusy(false); }
  }
  async function checkSaved() {
    if (sending.current) return;
    sending.current = true; setBusy(true);
    try {
      const response = await apiFetch("/api/references");
      if (!response.ok) throw new Error("Saved choices could not be checked. Your draft is retained.");
      const result = (await response.json()).references.find((item: { id: string }) => item.id === id)?.stem_review as StemReview | undefined;
      if (!result || result.analysis_id !== analysisId) throw new Error("The analysis changed. Reopen this reference before reviewing it.");
      setSaved(result); onSaved?.(result); setUncertain(false);
      if (result.status !== "pending" && same(result.decisions, decisions)) accept(result);
      else { setError(""); setNotice("Your latest choices are not saved on the server. The draft is retained."); }
    } catch (e) { setError(e instanceof Error ? e.message : "Could not check saved choices."); }
    finally { sending.current = false; setBusy(false); }
  }
  async function save() {
    if (sending.current || savedChoices || uncertain) return;
    setError(""); setNotice("");
    if (!health?.checks_passed) { setError("Stem file integrity is not confirmed. Analysis checks must finish before review can be saved."); return; }
    if (missing.length) {
      setError(`A choice is required for: ${missing.join(", ")}.`);
      section.current?.querySelector<HTMLSelectElement>(`select[aria-label="${missing[0]} reference decision"]`)?.focus(); return;
    }
    if (!heard) { setError("Listening confirmation is required before saving your choices."); confirmation.current?.focus(); return; }
    sending.current = true; setBusy(true); setUncertain(true);
    try { if (storageKey) localStorage.setItem(storageKey, JSON.stringify({ decisions, pending: true })); } catch { /* Optional local recovery. */ }
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await apiFetch(`/api/references/${id}/stem-review`, { method: "POST", signal: controller.signal,
        body: JSON.stringify({ analysis_id: analysisId, decisions, heard }) });
      if (!response.ok) {
        if (response.status < 500) setUncertain(false);
        const result = await response.json();
        throw new Error(typeof result.detail === "string" ? result.detail : "The server could not confirm this review.");
      }
      const result = await response.json();
      if (result.analysis_id !== analysisId || !same(result.decisions || {}, decisions) || !["accepted", "needs_review"].includes(result.status)) {
        setUncertain(true); throw new Error("The saved review response was incomplete. Check the saved choices before retrying.");
      }
      accept(result);
      try { await refresh(); } catch { setNotice("Stem choices saved. The overview could not refresh; your save succeeded."); }
    } catch (e) {
      if (!(e instanceof Error) || e.name === "AbortError" || e instanceof TypeError) setUncertain(true);
      setError(e instanceof Error && e.name !== "AbortError" ? e.message : "Save confirmation was lost. Your draft is retained; the server may have saved it.");
    } finally { clearTimeout(timeout); sending.current = false; setBusy(false); }
  }
  return <section ref={section} aria-label="Stem review" className="min-w-0 space-y-4 border-t border-neutral-700 pt-4">
    <h4 className="font-medium">Review separated stems</h4>
    <div className="space-y-1 text-sm">
      <p className={health?.checks_passed ? "text-emerald-300" : "text-amber-200"}>{health?.checks_passed ? `${stems.length} separated stems saved with this reference` : "Stem file integrity has not passed checks"}</p>
      <p className="text-xs text-neutral-400">{stems.map(stemLabel).join(" / ")}. Estimated separation; bleed and artifacts may remain.</p>
      <p className="text-xs text-neutral-400">{detailed ? "Kick, snare, toms and cymbals are estimated from the drums stem. Hi-hat stays with cymbals, and some bleed between drum parts is possible."
        : "Drums contains kick, snare, hi-hat and other percussion together. Individual drum stems are not available for this reference."}</p>
      <p role="status">{ready ? "Choices saved for the next step" : savedChoices ? "Choices saved; review needs attention" : uncertain ? "Save not confirmed" : `Review not saved: ${stems.length - missing.length} of ${stems.length} layer choices made`}</p>
      {!health?.checks_passed && <button type="button" disabled={busy} onClick={() => void refreshChecks()} className="inline-flex items-center gap-2 rounded border border-neutral-600 px-3 py-2 text-sm"><RefreshCw size={16} />Refresh stem checks</button>}
    </div>
    <div aria-label="Next stem review action" className="flex flex-wrap items-center justify-between gap-3 border-y border-neutral-700 py-3">
      <span className="text-sm font-medium">Next step</span>
      <button type="button" disabled={busy || (ready && !onNext)} onClick={next.action}
        className="inline-flex max-w-full items-center gap-2 rounded bg-emerald-700 px-3 py-2 text-left text-sm text-white disabled:opacity-50">
        <span>{next.label}</span><ArrowRight size={16} className="shrink-0" aria-hidden="true" />
      </button>
    </div>
    {stems.map(stem => <div key={stem} data-stem={stem} className="space-y-3 border-b border-neutral-800 pb-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h5 className="text-sm font-medium">{stemLabel(stem)}</h5>
        {health?.stems[stem] && <span className="text-xs text-neutral-400">{health.stems[stem].rms_dbfs} dBFS RMS{health.stems[stem].quiet ? " / Very quiet" : ""}{health.stems[stem].clipped_sample_fraction > 0.001 ? " / Possible clipping" : ""}</span>}
      </div>
      <ReferenceStemAudio id={id} stem={stem} name={name} />
      <label className="block text-sm">Reference choice<select aria-label={`${stem} reference decision`} value={decisions[stem] || ""} disabled={busy || uncertain}
        onChange={e => { setDecisions({ ...decisions, [stem]: e.target.value }); setHeard(false); setError(""); setNotice(""); }}
        className="mt-1 w-full min-w-0 rounded border border-neutral-600 bg-neutral-900 p-2 text-sm">
        <option value="">No choice yet</option><option value="keep">Use as reference</option><option value="ignore">Exclude from my track</option><option value="needs_work">Separation needs work</option>
      </select></label>
    </div>)}
    <label className="flex items-start gap-2 text-sm"><input ref={confirmation} type="checkbox" checked={heard} disabled={busy || uncertain || savedChoices} onChange={e => { setHeard(e.target.checked); setError(""); }} className="mt-1" />I listened and reviewed each stem choice.</label>
    {needsWork.length > 0 && <p className="text-sm text-amber-200">Separation needs work: {needsWork.join(", ")}. These choices can be saved, but are not ready for a template.</p>}
    {!missing.length && !kept.length && <p className="text-sm text-amber-200">No stems are included. At least one reference stem is required for a template.</p>}
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {notice && <p role="status" className="text-sm text-emerald-200">{notice}</p>}
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" disabled={busy || uncertain || savedChoices} onClick={() => void save()} className="inline-flex items-center gap-2 rounded bg-emerald-700 px-3 py-2 text-sm text-white disabled:opacity-50">
        {savedChoices ? <Check size={16} /> : <Save size={16} />}{busy ? "Saving..." : savedChoices ? "Stem choices saved" : "Save stem review"}</button>
      <button type="button" disabled={busy} onClick={() => void checkSaved()} className="text-sm underline disabled:opacity-40">Check saved choices</button>
      {ready && onNext && <button type="button" disabled={busy} onClick={onNext} className="rounded border border-emerald-500 px-3 py-2 text-sm">Continue to timing</button>}
    </div>
    <p className="text-xs text-neutral-400">Saved review: {saved.status.replaceAll("_", " ")}</p>
  </section>;
}
