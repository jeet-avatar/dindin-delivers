"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/auth";
import { RefreshIcon } from "./Icons";
import type { Recording } from "./Recordings";

type Metrics = { rms_dbfs: number; crest_db: number; spectral_centroid_hz: number; side_energy_percent: number };
export type Comparison = {
  id: string; created_at: string; track_name: string;
  reference: Metrics; candidate: Metrics; candidate_minus_reference: Metrics;
  request: { layer: string; reference_start_seconds: number; recording_start_seconds: number; duration_seconds: number };
  next_checks: string[]; limitations: string[];
};

async function responseData(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Sound comparison is unavailable. Check the selected intervals.");
  return data;
}

export function ComparisonPreview({ base, side, label }: { base: string; side: string; label: string }) {
  const [src, setSrc] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let url = "";
    setSrc(""); setError("");
    void (async () => {
      try {
        const response = await apiFetch(`${base}/audio/${side}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Comparison audio could not be loaded. Reopen this comparison to retry.");
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(blob); setSrc(url);
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Audio unavailable."); }
    })();
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [base, side]);
  return <div className="min-w-0 space-y-2">
    <h5 className="text-sm font-medium">{label}</h5>
    {src && <audio controls preload="metadata" src={src} aria-label={label} className="w-full min-w-0 h-10"
      onPlay={event => document.querySelectorAll("audio").forEach(other => { if (other !== event.currentTarget) other.pause(); })}
      onError={() => setError("This browser could not play the comparison audio.")} />}
    {!src && !error && <p role="status" className="text-xs">Loading audio...</p>}
    {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
  </div>;
}

export default function SoundComparison({ id, duration }: { id: string; duration: number }) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [history, setHistory] = useState<Comparison[]>([]);
  const [selected, setSelected] = useState("");
  const [recordingId, setRecordingId] = useState("");
  const [layer, setLayer] = useState("bass");
  const [referenceStart, setReferenceStart] = useState("0");
  const [recordingStart, setRecordingStart] = useState("0");
  const [length, setLength] = useState("8");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const base = `/api/references/${id}/comparisons`;
  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const data = await responseData(await apiFetch(base, { signal }));
      const sounds = await responseData(await apiFetch("/api/recordings", { signal }));
      if (signal?.aborted) return;
      setHistory(data.comparisons); setAvailable(data.available); setReason(data.reason || "");
      setRecordings(sounds.recordings); setError("");
    } catch (e) { if (!signal?.aborted) setError(e instanceof Error ? e.message : "Could not load comparisons."); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [base]);
  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  const recording = recordings.find(item => item.id === recordingId);
  const result = history.find(item => item.id === selected);
  const valid = recording && length !== "" && referenceStart !== "" && recordingStart !== ""
    && Number(length) >= 2 && Number(length) <= 16 && Number(referenceStart) >= 0 && Number(recordingStart) >= 0
    && Number(referenceStart) + Number(length) <= duration
    && Number(recordingStart) + Number(length) <= recording.metrics.duration_seconds;
  async function compare(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true); setError("");
    try {
      const data = await responseData(await apiFetch(base, { method: "POST", body: JSON.stringify({
        recording_id: recordingId, layer, reference_start_seconds: Number(referenceStart),
        recording_start_seconds: Number(recordingStart), duration_seconds: Number(length),
      }) }));
      setHistory(previous => [data, ...previous]); setSelected(data.id);
    } catch (e) { setError(e instanceof Error ? e.message : "Comparison failed."); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!result || !window.confirm("Delete this comparison and its two previews? The reference and original recording will remain.")) return;
    setBusy(true); setError("");
    try {
      await responseData(await apiFetch(`${base}/${result.id}`, { method: "DELETE" }));
      setHistory(previous => previous.filter(item => item.id !== result.id)); setSelected("");
    } catch (e) { setError(e instanceof Error ? e.message : "Delete failed."); }
    finally { setBusy(false); }
  }
  const inputStyle = "block mt-1 w-full min-w-0 rounded border border-neutral-600 bg-neutral-900 p-2";
  return <section aria-label="Sound comparison" className="min-w-0 space-y-4">
    <div className="flex items-center justify-between gap-3">
      <h4 className="text-sm font-medium">Reference / Ableton audition</h4>
      <button type="button" title="Refresh recordings and comparisons" aria-label="Refresh recordings and comparisons"
        disabled={loading || busy} onClick={() => void refresh()} className="p-2 disabled:opacity-40"><RefreshIcon size={18} /></button>
    </div>
    {loading && <p role="status" className="text-sm">Loading comparisons...</p>}
    {reason && <p role="status" className="text-sm text-amber-200">{reason}</p>}
    {!loading && !recordings.length && <p className="text-sm text-amber-200">No saved Ableton auditions yet.</p>}
    <form onSubmit={compare} className="space-y-3 text-sm">
      <fieldset disabled={busy || loading} className="space-y-3 min-w-0">
        <label className="block">Ableton recording<select value={recordingId} onChange={e => setRecordingId(e.target.value)} className={inputStyle} required>
          <option value="">Choose a captured sound</option>
          {recordings.map(item => <option key={item.id} value={item.id}>{item.track_name} | {item.created_at ? new Date(item.created_at).toLocaleString() : item.id.slice(0, 8)} | {item.decision}</option>)}
        </select></label>
        <label className="block">Reference layer<select value={layer} onChange={e => setLayer(e.target.value)} className={inputStyle}>
          {["bass", "drums", "other", "vocals", "mix"].map(name => <option key={name}>{name}</option>)}
        </select></label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label>Reference start (s)<input type="number" min={0} max={Math.max(0, duration - Number(length))} step="0.1" required value={referenceStart} onChange={e => setReferenceStart(e.target.value)} className={inputStyle} /></label>
          <label>Recording start (s)<input type="number" min={0} max={Math.max(0, (recording?.metrics.duration_seconds || 0) - Number(length))} step="0.1" required value={recordingStart} onChange={e => setRecordingStart(e.target.value)} className={inputStyle} /></label>
          <label>Length (s)<input type="number" min={2} max={16} step="0.1" required value={length} onChange={e => setLength(e.target.value)} className={inputStyle} /></label>
        </div>
        {recording && !valid && <p className="text-amber-200">Both intervals must fit within their audio; length must be 2-16 seconds.</p>}
        <button type="submit" disabled={!available || !valid} className="rounded bg-emerald-700 px-4 py-2 disabled:opacity-40">{busy ? "Comparing..." : "Compare sounds"}</button>
      </fieldset>
    </form>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {!!history.length && <label className="block text-sm">Saved comparisons<select disabled={busy} value={selected} onChange={e => setSelected(e.target.value)} className={inputStyle}>
      <option value="">Choose a comparison</option>
      {history.map(item => <option key={item.id} value={item.id}>{item.track_name} | {item.request.layer} | {new Date(item.created_at).toLocaleString()}</option>)}
    </select></label>}
    {result && <div className="space-y-4 border-t border-neutral-700 pt-4">
      <p className="text-xs text-neutral-400 break-words">{result.track_name} / {result.request.layer} / {result.request.duration_seconds}s. Reference from {result.request.reference_start_seconds}s; recording from {result.request.recording_start_seconds}s.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ComparisonPreview base={`${base}/${result.id}`} side="reference" label="A - Reference (RMS matched)" />
        <ComparisonPreview base={`${base}/${result.id}`} side="candidate" label="B - Ableton recording (RMS matched)" />
      </div>
      <div className="overflow-x-auto"><table className="w-full text-left text-xs">
        <caption className="text-left text-sm mb-2">Measured differences, not a match score</caption>
        <thead><tr><th className="py-2">Measurement</th><th>A</th><th>B</th><th>B minus A</th></tr></thead>
        <tbody>{([["rms_dbfs", "Original RMS (dBFS)"], ["crest_db", "Crest factor (dB)"], ["spectral_centroid_hz", "Spectral centroid (Hz)"], ["side_energy_percent", "Side energy (%)"]] as const).map(([key, label]) =>
          <tr key={key} className="border-t border-neutral-800"><th className="py-2 pr-3 font-normal">{label}</th><td className="pr-2">{result.reference[key].toFixed(1)}</td><td className="pr-2">{result.candidate[key].toFixed(1)}</td><td>{result.candidate_minus_reference[key].toFixed(1)}</td></tr>)}</tbody>
      </table></div>
      <ul className="space-y-2 text-sm">{result.next_checks.map(note => <li key={note}>{note}</li>)}</ul>
      <details className="text-xs text-neutral-400"><summary className="cursor-pointer">Scope and limitations</summary>
        <ul className="mt-2 space-y-2">{result.limitations.map(note => <li key={note}>{note}</li>)}</ul>
      </details>
      <button type="button" disabled={busy} onClick={remove} className="text-xs text-red-300 disabled:opacity-40">Delete comparison</button>
    </div>}
  </section>;
}
