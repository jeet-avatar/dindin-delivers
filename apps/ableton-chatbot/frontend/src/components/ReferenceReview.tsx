"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/auth";

export type TimingMap = {
  analysis_id: string; revision: number; status: string; bpm: number; numerator: number; denominator: number;
  sections: { name: string; start_seconds: number; end_seconds: number }[];
};
export type StemReview = { analysis_id: string; status: string; decisions: Record<string, string> };
export type StemHealth = { checks_passed: boolean; stems: Record<string, { aligned: boolean; finite: boolean; quiet: boolean; clipped_sample_fraction: number; rms_dbfs: number }> };
const field = "mt-1 w-full min-w-0 rounded border border-neutral-600 bg-neutral-900 p-2 text-sm";
const stamp = (n: number) => `${Math.floor(n / 60)}:${(n % 60).toFixed(2).padStart(5, '0')}`;

export default function ReferenceReview({ id, mode, timing, review, health, refresh, onCue }: {
  id: string; mode: "stems" | "timing"; timing: TimingMap; review: StemReview; health?: StemHealth;
  refresh: () => Promise<void>; onCue: (time: number) => void;
}) {
  const [map, setMap] = useState(timing);
  const [decisions, setDecisions] = useState(review.decisions);
  const [heard, setHeard] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function post(path: string, body?: object) {
    setBusy(true); setError("");
    try {
      const response = await apiFetch(`/api/references/${id}/${path}`, { method: "POST", body: JSON.stringify(body || {}) });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.detail === "string" ? result.detail : "Check section boundaries and required values.");
      if (path === "timing") {setMap(result);setDirty(false);}
      await refresh();
    } catch (e) {setError(e instanceof Error ? e.message : "Review could not be saved.");}
    finally {setBusy(false);}
  }
  function changeMap(next: TimingMap) {setMap(next);setDirty(true);setConfirmed(false);}
  return <fieldset disabled={busy} className="min-w-0 space-y-4 border-t border-neutral-700 pt-4">
    <h4 className="font-medium">{mode === "stems" ? "Review separated stems" : "Confirm reference timing"}</h4>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {mode === "stems" ? <>
      <p className="text-sm text-neutral-400">Estimated separation / Bleed and artifacts may remain</p>
      {!health ? <button type="button" onClick={() => post("refresh-analysis")} className="rounded bg-emerald-700 px-3 py-2 text-sm">Refresh timing and stem checks</button> :
        <p className={`text-sm ${health.checks_passed ? "text-emerald-300" : "text-red-300"}`}>{health.checks_passed ? "All stem files aligned; signal integrity checks passed" : "Stem integrity needs attention"}</p>}
      {["drums", "bass", "vocals", "other"].map(stem => <div key={stem} className="border-b border-neutral-800 pb-3">
        <label className="block text-sm">{stem}<select className={field} aria-label={`${stem} reference decision`} value={decisions[stem] || ""}
          onChange={e => {setDecisions({...decisions, [stem]: e.target.value});setHeard(false);}}>
          <option value="">Choose after listening</option><option value="keep">Use as reference</option><option value="ignore">Exclude from my track</option><option value="needs_work">Separation needs work</option>
        </select></label>
        {health?.stems[stem] && <p className="mt-1 text-xs text-neutral-400">{health.stems[stem].rms_dbfs} dBFS RMS{health.stems[stem].quiet ? " / Very quiet" : ""}{health.stems[stem].clipped_sample_fraction > 0.001 ? " / Possible clipping" : ""}</p>}
      </div>)}
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={heard} onChange={e => setHeard(e.target.checked)} />I listened and reviewed each stem choice.</label>
      <button type="button" disabled={!heard || !health?.checks_passed || Object.values(decisions).filter(Boolean).length !== 4} onClick={() => post("stem-review", {analysis_id: timing.analysis_id, decisions, heard})}
        className="rounded bg-emerald-700 px-3 py-2 text-sm disabled:opacity-40">Save stem review</button>
      <p className="text-xs text-neutral-400">Saved review: {review.status.replaceAll('_', ' ')}</p>
    </> : <>
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
    </>}
  </fieldset>;
}
