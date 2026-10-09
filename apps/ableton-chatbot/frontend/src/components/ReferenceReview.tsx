"use client";

import { useRef, useState } from "react";
import { apiFetch } from "@/lib/auth";
import ReferenceStemReview from "./ReferenceStemReview";

export type TimingMap = {
  analysis_id: string; revision: number; status: string; bpm: number; numerator: number; denominator: number;
  sections: { name: string; start_seconds: number; end_seconds: number }[];
};
export type StemReview = { analysis_id: string; status: string; decisions: Record<string, string> };
export type StemHealth = { checks_passed: boolean; stems: Record<string, { aligned: boolean; finite: boolean; quiet: boolean; clipped_sample_fraction: number; rms_dbfs: number }> };
const field = "mt-1 w-full min-w-0 rounded border border-neutral-600 bg-neutral-900 p-2 text-sm";
const stamp = (n: number) => `${Math.floor(n / 60)}:${(n % 60).toFixed(2).padStart(5, '0')}`;

export default function ReferenceReview({ id, name = "reference", mode, timing, review, health, stems, local, refresh, onCue, onStemSaved, onTimingSaved, onNext }: {
  id: string; mode: "stems" | "timing"; timing: TimingMap; review: StemReview; health?: StemHealth; stems?: string[]; local?: boolean;
  refresh: () => Promise<void>; onCue: (time: number) => void;
  name?: string; onStemSaved?: (review: StemReview) => void; onNext?: () => void;
  onTimingSaved?: (timing: TimingMap) => void;
}) {
  const [map, setMap] = useState(timing);
  const [confirmed, setConfirmed] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const sending = useRef(false);
  async function post(path: string, body?: object) {
    if (sending.current) return;
    sending.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const response = await apiFetch(`/api/references/${id}/${path}`, { method: "POST", body: JSON.stringify(body || {}) });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.detail === "string" ? result.detail : "Check section boundaries and required values.");
      if (path === "timing") {setMap(result);setDirty(false);setConfirmed(false);onTimingSaved?.(result);setNotice("Timing map saved.");}
      try { await refresh(); } catch { setNotice("Timing map saved. The overview could not refresh; your save succeeded."); }
    } catch (e) {setError(e instanceof Error ? e.message : "Review could not be saved.");}
    finally {sending.current=false;setBusy(false);}
  }
  function changeMap(next: TimingMap) {setMap(next);setDirty(true);setConfirmed(false);}
  if (mode === "stems") return <ReferenceStemReview id={id} name={name} analysisId={timing.analysis_id} review={review} health={health}
    stems={stems} local={local} refresh={refresh} onSaved={onStemSaved} onNext={onNext} />;
  return <fieldset disabled={busy} className="min-w-0 space-y-4 border-t border-neutral-700 pt-4">
    <h4 className="font-medium">Confirm reference timing</h4>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {notice && <p role="status" className="text-sm text-emerald-200">{notice}</p>}
    <>
      <p className="text-sm text-neutral-400">{dirty ? "Unsaved edits" : map.status} / Section labels and meter require your review</p>
      <div className="grid grid-cols-3 gap-2">
        <label className="text-sm">Source BPM<input className={field} type="number" min={20} max={300} step={0.01} value={map.bpm} onChange={e => changeMap({...map, bpm: Number(e.target.value)})} /></label>
        <label className="text-sm">Beats/bar<input className={field} type="number" min={1} max={16} value={map.numerator} onChange={e => changeMap({...map, numerator: Number(e.target.value)})} /></label>
        <label className="text-sm">Beat unit<select className={field} value={map.denominator} onChange={e => changeMap({...map, denominator: Number(e.target.value)})}>{[2,4,8,16].map(v => <option key={v}>{v}</option>)}</select></label>
      </div>
      <div className="flex h-8 w-full overflow-hidden" aria-label="Reference section map">{map.sections.map((s, i) => <button key={i} type="button" title={`${s.name}: ${stamp(s.start_seconds)}-${stamp(s.end_seconds)}`} aria-label={`Cue ${s.name}`}
        onClick={() => onCue(s.start_seconds)} style={{flex: Math.max(0.01,s.end_seconds-s.start_seconds)}} className={`min-w-0 border-r border-neutral-950 ${['bg-emerald-700','bg-cyan-700','bg-rose-800'][i%3]}`} />)}</div>
      {map.sections.map((s, i) => <div key={i} className="space-y-2 border-b border-neutral-800 pb-3">
        <label className="block text-sm">Section {i+1} name<input className={field} value={s.name} maxLength={80} onChange={e => changeMap({...map, sections: map.sections.map((v,j) => j===i ? {...v,name:e.target.value} : v)})} /></label>
        <div className="grid grid-cols-2 gap-2 text-sm"><p className="self-center">Start: {stamp(s.start_seconds)}</p>
          <label>End (seconds)<input className={field} type="number" step={0.001} min={s.start_seconds+0.001} max={map.sections.at(-1)?.end_seconds}
            disabled={i===map.sections.length-1} value={s.end_seconds} onChange={e => changeMap({...map, sections: map.sections.map((v,j) => j===i ? {...v,end_seconds:Number(e.target.value)} : j===i+1 ? {...v,start_seconds:Number(e.target.value)} : v)})} /></label></div>
        <div className="flex flex-wrap gap-4 text-xs">
          <button type="button" onClick={() => onCue(s.start_seconds)}>Cue selected audio</button>
          <button type="button" disabled={map.sections.length>=32 || s.end_seconds-s.start_seconds<0.002} onClick={() => {
            const midpoint=(s.start_seconds+s.end_seconds)/2;
            changeMap({...map,sections:map.sections.flatMap((v,j)=>j===i?[{...v,end_seconds:midpoint},{...v,name:`${v.name} B`,start_seconds:midpoint}]:[v])});
          }}>Split section</button>
          <button type="button" disabled={i===0} className="text-red-300 disabled:opacity-40" onClick={() => changeMap({...map,sections:map.sections.filter((_,j)=>j!==i).map((v,j)=>j===i-1?{...v,end_seconds:s.end_seconds}:v)})}>Merge with previous</button>
        </div>
      </div>)}
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I reviewed the section boundaries, tempo and meter.</label>
      <button type="button" disabled={!confirmed} onClick={() => post("timing", {analysis_id:map.analysis_id,revision:map.revision,bpm:map.bpm,numerator:map.numerator,denominator:map.denominator,sections:map.sections,confirm:true})}
        className="rounded bg-emerald-700 px-3 py-2 text-sm disabled:opacity-40">Confirm timing map</button>
      {map.status === "confirmed" && !dirty && onNext && <button type="button" onClick={onNext} className="ml-3 rounded border border-emerald-500 px-3 py-2 text-sm">Continue to listening</button>}
    </>
  </fieldset>;
}
