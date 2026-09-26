"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/auth";
import type { TimingMap } from "./ReferenceReview";

type Section = { name: string; bars: number; direction: string };
type Effect = { family: string; purpose: string; amount: string };
type Part = { role: string; sound: string; effects?: Effect[] };
type Brief = {
  title: string; style: string; mood: string; borrow: string; avoid: string;
  bpm: number; key: string; numerator: number; denominator: number;
  feel: string; source_constraint: string; parts: Part[]; sections: Section[];
  timing_mode?: "reference_seconds" | "custom_bars";
};
export type ReferenceTemplateData = {
  brief: Brief; status: string; revision: number; total_bars: number; duration_seconds: number;
  sections: (Section & { start_bar: number; end_bar_exclusive: number; start_seconds: number; end_seconds?: number })[];
  limitations: string[];
};

const field = "mt-1 w-full min-w-0 rounded border border-neutral-600 bg-neutral-900 p-2 text-sm";

export default function ReferenceTemplate({ id, template, bpm, timing, refresh, onUse, chatBusy }: {
  id: string; template?: ReferenceTemplateData; bpm: number | null;
  refresh: () => Promise<void>; onUse: () => void; chatBusy: boolean;
  timing: TimingMap;
}) {
  const [step, setStep] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  const [brief, setBrief] = useState<Brief>(() => template?.brief || {
    title: "My reference-inspired track", style: "", mood: "", borrow: "", avoid: "",
    bpm: timing.bpm || bpm || 120, key: "Choose after audition", numerator: timing.numerator, denominator: timing.denominator,
    timing_mode: "reference_seconds",
    feel: "subtly human", source_constraint: "", parts: [
      { role: "Kick", sound: "Choose attack, body and tail after audition" },
      { role: "Bass", sound: "Complement the approved kick; audition the tone" },
    ], sections: [
      { name: "Intro", bars: 16, direction: "Introduce selected elements gradually" },
      { name: "Build", bars: 8, direction: "Increase rhythmic density without a default effect chain" },
      { name: "Main", bars: 32, direction: "Bring the approved core parts together" },
      { name: "Breakdown", bars: 16, direction: "Create contrast with fewer parts" },
      { name: "Outro", bars: 16, direction: "Remove parts gradually" },
    ],
  });
  const followsReference = brief.timing_mode === "reference_seconds";
  const effectiveBrief = followsReference ? {...brief, bpm: timing.bpm, numerator: timing.numerator, denominator: timing.denominator,
    sections: timing.sections.map(s => ({name:s.name, bars:(s.end_seconds-s.start_seconds)/(60/timing.bpm*timing.numerator*4/timing.denominator),
      direction:brief.sections.find(existing => existing.name===s.name)?.direction || "Choose replacement sounds for this interval"}))} : brief;
  function update<K extends keyof Brief>(key: K, value: Brief[K]) {
    setBrief(previous => ({ ...previous, [key]: value })); setDirty(true);
  }
  async function save(approve = false) {
    setBusy(true); setError("");
    try {
      const response = await apiFetch(`/api/references/${id}/template${approve ? "/approve" : ""}`, {
        method: "POST", body: JSON.stringify(approve ? { revision: template?.revision } : effectiveBrief),
      });
      const result = await response.json();
      if (!response.ok) {
        const message = Array.isArray(result.detail) ? result.detail.map((e: { loc: string[]; msg: string }) => `${e.loc.slice(1).join(".")}: ${e.msg}`).join("; ") : result.detail;
        throw new Error(message || "Template could not be saved.");
      }
      setBrief(result.brief); await refresh(); setDirty(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Template failed."); }
    finally { setBusy(false); }
  }
  async function suggest() {
    setBusy(true); setError("");
    try {
      const response = await apiFetch(`/api/references/${id}/template/suggest`, { method: "POST", body: JSON.stringify({ consent, brief: effectiveBrief }) });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.detail === "string" ? result.detail : "Complete your taste, style and mood before generating a template.");
      setBrief(result.brief); setDirty(false); setStep(3); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Template suggestion failed."); }
    finally { setBusy(false); }
  }
  async function download() {
    setBusy(true); setError("");
    try {
      const response = await apiFetch(`/api/references/${id}/template/download`);
      if (!response.ok) throw new Error("Approve a current template before downloading.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href=url; link.download="beatmind-reference-template.zip"; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {setError(e instanceof Error ? e.message : "Download failed.");}
    finally {setBusy(false);}
  }
  return <fieldset disabled={busy} className="min-w-0 space-y-4 break-words border-t border-neutral-700 pt-5">
    <h4 className="font-medium">Your track template</h4>
    <p className="text-xs text-neutral-400">Planning draft / No Ableton changes</p>
    <label className="block text-sm">Timing mode<select className={field} value={brief.timing_mode || "custom_bars"}
      onChange={e => update("timing_mode", e.target.value as Brief["timing_mode"])}>
      <option value="reference_seconds">Follow confirmed reference timing</option><option value="custom_bars">Custom bar lengths</option>
    </select></label>
    <div role="tablist" aria-label="Creative brief" className="flex flex-wrap gap-2">
      {["Taste", "Direction", "Sounds", "Sections"].map((label, index) => <button key={label} role="tab"
        aria-selected={step === index} onClick={() => setStep(index)} className={`border-b-2 px-2 py-1 text-sm ${step === index ? "border-emerald-400" : "border-transparent text-neutral-400"}`}>{label}</button>)}
    </div>
    {step === 0 && <div className="space-y-3">
      <label className="block text-sm">What do you want to keep from the reference?
        <textarea className={field} rows={3} maxLength={1000} value={brief.borrow} onChange={e => update("borrow", e.target.value)} /></label>
      <label className="block text-sm">What should your track avoid?
        <textarea className={field} rows={2} maxLength={1000} value={brief.avoid} onChange={e => update("avoid", e.target.value)} /></label>
    </div>}
    {step === 1 && <div className="space-y-3">
      {([['title', 'Track name'], ['style', 'Style'], ['mood', 'Mood'], ['key', 'Key preference']] as const).map(([key, label]) =>
        <label key={key} className="block text-sm">{label}<input className={field} value={brief[key]} maxLength={key === 'mood' ? 300 : key === 'key' ? 80 : 120}
          onChange={e => update(key, e.target.value)} /></label>)}
      <label className="block text-sm">Target BPM<input disabled={followsReference} className={field} type="number" min={20} max={300} step={0.1} value={effectiveBrief.bpm} onChange={e => update("bpm", Number(e.target.value))} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">Beats per bar<input disabled={followsReference} className={field} type="number" min={1} max={16} value={effectiveBrief.numerator} onChange={e => update("numerator", Number(e.target.value))} /></label>
        <label className="text-sm">Beat unit<select disabled={followsReference} className={field} value={effectiveBrief.denominator} onChange={e => update("denominator", Number(e.target.value))}>{[2, 4, 8, 16].map(v => <option key={v}>{v}</option>)}</select></label>
      </div>
      <label className="block text-sm">Feel<select className={field} value={brief.feel} onChange={e => update("feel", e.target.value)}>{["steady", "subtly human", "loose"].map(v => <option key={v}>{v}</option>)}</select></label>
    </div>}
    {step === 2 && <div className="space-y-3">
      <label className="block text-sm">Required pack or instrument (optional)<input className={field} maxLength={300} value={brief.source_constraint} onChange={e => update("source_constraint", e.target.value)} /></label>
      {brief.parts.map((part, index) => <div key={index} className="space-y-2 border-b border-neutral-800 pb-3">
        <label className="block text-sm">Part {index + 1}<input className={field} aria-label={`Part ${index + 1} role`} maxLength={80} value={part.role}
          onChange={e => update("parts", brief.parts.map((p, i) => i === index ? { ...p, role: e.target.value } : p))} /></label>
        <label className="block text-sm">Desired sound<textarea className={field} maxLength={400} rows={2} value={part.sound}
          onChange={e => update("parts", brief.parts.map((p, i) => i === index ? { ...p, sound: e.target.value } : p))} /></label>
        {(part.effects || []).map((effect, effectIndex) => <div key={effectIndex} className="space-y-2 text-sm">
          <label className="block">{effect.family} / Proposed amount<select className={field} value={effect.amount} onChange={e => update("parts", brief.parts.map((p,i) => i===index ? {...p,effects:p.effects?.map((fx,j) => j===effectIndex ? {...fx,amount:e.target.value} : fx)} : p))}>
            {['off','subtle','moderate'].map(v => <option key={v}>{v}</option>)}</select></label>
          <p className="text-xs text-neutral-400">{effect.purpose}</p>
        </div>)}
        <button type="button" disabled={brief.parts.length === 1} className="text-xs text-red-300 disabled:opacity-40" onClick={() => update("parts", brief.parts.filter((_, i) => i !== index))}>Remove part</button>
      </div>)}
      <button type="button" disabled={brief.parts.length >= 16} className="text-sm text-emerald-300" onClick={() => update("parts", [...brief.parts, { role: "", sound: "" }])}>Add part</button>
    </div>}
    {step === 3 && <div className="space-y-3">
      <p className="text-xs text-neutral-400">Proposed sections</p>
      {effectiveBrief.sections.map((section, index) => <div key={index} className="space-y-2 border-b border-neutral-800 pb-3">
        <div className="grid grid-cols-[minmax(0,1fr)_80px] gap-2">
          <label className="text-sm">Section {index + 1}<input disabled={followsReference} className={field} maxLength={80} value={section.name} onChange={e => update("sections", effectiveBrief.sections.map((s, i) => i === index ? { ...s, name: e.target.value } : s))} /></label>
          <label className="text-sm">Bars<input disabled={followsReference} className={field} type="number" min={0.001} step="any" max={512} value={Number(section.bars.toFixed(3))} onChange={e => update("sections", effectiveBrief.sections.map((s, i) => i === index ? { ...s, bars: Number(e.target.value) } : s))} /></label>
        </div>
        {followsReference && <p className="text-xs text-neutral-400">{timing.sections[index].start_seconds.toFixed(3)}-{timing.sections[index].end_seconds.toFixed(3)} seconds</p>}
        <label className="block text-sm">Direction<textarea className={field} maxLength={400} rows={2} value={section.direction} onChange={e => update("sections", effectiveBrief.sections.map((s, i) => i === index ? { ...s, direction: e.target.value } : s))} /></label>
        {!followsReference && <button type="button" disabled={brief.sections.length === 1} className="text-xs text-red-300 disabled:opacity-40" onClick={() => update("sections", brief.sections.filter((_, i) => i !== index))}>Remove section</button>}
      </div>)}
      {!followsReference && <button type="button" disabled={brief.sections.length >= 32} className="text-sm text-emerald-300" onClick={() => update("sections", [...brief.sections, { name: "", bars: 8, direction: "" }])}>Add section</button>}
    </div>}
    <div className="flex flex-wrap gap-3">
      {step > 0 && <button type="button" onClick={() => setStep(step - 1)} className="text-sm">Back</button>}
      {step < 3 ? <button type="button" onClick={() => setStep(step + 1)} className="rounded bg-neutral-700 px-3 py-2 text-sm">Continue</button> :
        <button type="button" disabled={busy} onClick={() => save()} className="rounded bg-emerald-700 px-3 py-2 text-sm disabled:opacity-40">{busy ? "Saving..." : "Save template draft"}</button>}
    </div>
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={consent} onChange={e => setConsent(e.target.checked)} />
      Send my brief and saved reference analysis to OpenAI for a template proposal. Provider charges apply.</label>
    <button type="button" disabled={busy || !consent || !brief.borrow.trim() || !brief.style.trim() || !brief.mood.trim()}
      onClick={suggest} className="rounded bg-neutral-700 px-3 py-2 text-sm disabled:opacity-40">{busy ? "Working..." : "Suggest template from my taste"}</button>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {template && <div className="space-y-3 border-t border-neutral-700 pt-3 text-sm">
      <h5 className="font-medium">{template.brief.title} / Revision {template.revision} / {dirty ? "Unsaved changes" : template.status}</h5>
      <p>{template.brief.style} / {template.brief.bpm} BPM / {Number(template.total_bars.toFixed(3))} bars / {template.duration_seconds.toFixed(3)} seconds</p>
      <p><span className="text-neutral-400">Keep: </span>{template.brief.borrow}</p>
      <p><span className="text-neutral-400">Avoid: </span>{template.brief.avoid || "Not specified"}</p>
      <p><span className="text-neutral-400">Parts: </span>{template.brief.parts.map(p => p.role).join(", ")}</p>
      <ol className="space-y-1">{template.sections.map((s, i) => <li key={i}>{s.start_seconds.toFixed(3)}s{s.end_seconds != null ? `-${s.end_seconds.toFixed(3)}s` : ''}: {s.name} / {s.direction}</li>)}</ol>
      <p className="text-amber-200">Sources not verified. No musical parts built.</p>
      {template.status !== "approved" ? <button type="button" disabled={busy || dirty || template.status === "needs_review"} onClick={() => save(true)} className="rounded bg-emerald-700 px-3 py-2 disabled:opacity-40">Approve planning brief</button> :
        <button type="button" disabled={chatBusy || dirty || busy} onClick={onUse} className="rounded bg-emerald-700 px-3 py-2 disabled:opacity-40">Plan first part in chat</button>}
      {template.status === "approved" && <button type="button" disabled={dirty || busy} onClick={download} className="block rounded bg-neutral-700 px-3 py-2 disabled:opacity-40">Download timing guide and blueprint</button>}
      <details className="text-xs text-neutral-400"><summary>Template limits</summary>{template.limitations.map(l => <p key={l} className="mt-2">{l}</p>)}</details>
    </div>}
  </fieldset>;
}
