"use client";

import { useEffect, useRef, useState } from "react";
import { Shuffle } from "lucide-react";
import { apiFetch } from "@/lib/auth";
import { stemLabel } from "@/lib/stems";

export type RemixProject = {
  title: string; starting_point: "reference"; live_set: null; mode: "remix";
  remix: { source_name: string; style: string; target_bpm: number; layers: Record<string, string>; execution_status: "unavailable"; automatic_preview_id?: string };
};
export type RemixCreated = { sessionId: string; referenceId: string; project: RemixProject };
const field = "w-full min-w-0 rounded border border-neutral-600 bg-neutral-900 p-2 text-sm text-white";

export default function RemixDialog({ reference, stems, onCancel, onCreated }: {
  reference: { id: string; name: string; bpm: number | null }; stems: string[];
  onCancel: () => void; onCreated: (result: RemixCreated) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const sending = useRef(false);
  const [title, setTitle] = useState(`${reference.name.replace(/\.[^.]+$/, "")} remix`.slice(0, 70));
  const [style, setStyle] = useState("");
  const [bpm, setBpm] = useState(reference.bpm ? String(reference.bpm) : "");
  const [layers, setLayers] = useState<Record<string, string>>(() => Object.fromEntries(stems.map(name => [name, "omit"])));
  const [use, setUse] = useState("private");
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal();
    return () => { element?.close(); if (opener?.isConnected) opener.focus(); };
  }, []);
  async function save() {
    if (sending.current || !rights || !Object.values(layers).includes("retain")) return;
    sending.current = true; setBusy(true); setError("");
    try {
      const intent = { reference_id: reference.id, title: title.trim(), style: style.trim(), target_bpm: Number(bpm), layers,
        source_use: { rights_confirmed: true, intended_use: use } };
      const key = `beatmind_remix_${reference.id}`;
      const fingerprint = JSON.stringify(intent);
      let previous: { fingerprint?: string; id?: string } = {};
      try { previous = JSON.parse(sessionStorage.getItem(key) || "{}"); } catch { /* Replace malformed local state. */ }
      const request_id = previous?.fingerprint === fingerprint && /^[a-f0-9]{32}$/.test(previous.id || "")
        ? previous.id! : crypto.randomUUID().replaceAll("-", "");
      sessionStorage.setItem(key, JSON.stringify({ fingerprint, id: request_id }));
      const response = await apiFetch("/api/chats/remix", { method: "POST", body: JSON.stringify({ ...intent, request_id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.detail === "string" ? result.detail : "Check the remix name, style, tempo and stem choices.");
      if (!result.sessionId || result.referenceId !== reference.id || result.project?.mode !== "remix") {
        throw new Error("The saved remix plan was not confirmed. Retry here to check the same request.");
      }
      onCreated(result);
      sessionStorage.removeItem(key);
    } catch (error) { setError(error instanceof Error ? error.message : "Could not save the remix plan."); }
    finally { sending.current = false; setBusy(false); }
  }
  return <dialog ref={dialog} aria-labelledby="remix-title" onCancel={event => {
    if (sending.current) event.preventDefault(); else onCancel();
  }} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-lg border border-neutral-600 bg-neutral-950 p-0 text-white backdrop:bg-black/60">
    <form className="flex max-h-[90dvh] flex-col" onSubmit={event => { event.preventDefault(); void save(); }}>
      <div className="min-h-0 space-y-4 overflow-y-auto p-5">
      <h3 id="remix-title" className="flex items-center gap-2 text-base font-semibold"><Shuffle size={18} aria-hidden="true" />Plan a remix</h3>
      <p className="break-words text-sm text-neutral-300">Source: {reference.name}</p>
      <p role="status" className="text-sm text-amber-200">This saves a separate remix plan and leaves Ableton unchanged. For a rendered stem-arrangement preview, choose Automatic Remix.</p>
      <fieldset disabled={busy} className="space-y-4">
        <label className="block space-y-1 text-sm"><span>Remix name</span><input autoFocus required maxLength={70} className={field} value={title} onChange={e => setTitle(e.target.value)} /></label>
        <label className="block space-y-1 text-sm"><span>Target style</span><input required maxLength={120} className={field} value={style} onChange={e => setStyle(e.target.value)} /></label>
        <label className="block space-y-1 text-sm"><span>Target BPM</span><input required type="number" min={20} max={300} step="any" className={field} value={bpm} onChange={e => setBpm(e.target.value)} /></label>
        <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">Source layers</legend>
          {stems.map(name => <label key={name} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 text-sm">
            <span className="break-words">{stemLabel(name)}</span><select aria-label={`${stemLabel(name)} choice`} className={field} value={layers[name]} onChange={e => setLayers(previous => ({ ...previous, [name]: e.target.value }))}>
              <option value="omit">Leave out</option><option value="retain">Keep source</option><option value="replace">New sound</option>
            </select></label>)}
        </fieldset>
        {!Object.values(layers).includes("retain") && <p className="text-sm text-amber-200">Choose Keep source for at least one layer.</p>}
        <fieldset className="space-y-2 text-sm"><legend className="mb-2 font-medium">Intended use</legend>
          {[["private", "Private project only"], ["publication", "Publication or distribution"]].map(([value, label]) =>
            <label key={value} className="flex items-center gap-2"><input type="radio" name="remix-use" checked={use === value}
              onChange={() => { setUse(value); setRights(false); }} />{label}</label>)}
        </fieldset>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={rights} onChange={e => setRights(e.target.checked)} />
          <span>I have the rights needed to reuse this recording and composition for the selected use.</span></label>
        <p className="text-xs text-neutral-400">Separated stems may contain bleed and artifacts. Private use is not automatic legal clearance. This plan uses one song from your allowance; nothing is published.</p>
      </fieldset>
      </div>
      <div className="shrink-0 space-y-3 border-t border-neutral-700 bg-neutral-950 p-4">
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" disabled={busy} className="rounded border border-neutral-600 px-3 py-2 text-sm disabled:opacity-40" onClick={onCancel}>Cancel</button>
          <button type="submit" disabled={busy || !rights || !Object.values(layers).includes("retain") || !style.trim() || !title.trim()}
            className="rounded bg-emerald-700 px-3 py-2 text-sm text-white disabled:opacity-40">{busy ? "Saving..." : "Save remix plan and open chat"}</button>
        </div>
      </div>
    </form>
  </dialog>;
}
