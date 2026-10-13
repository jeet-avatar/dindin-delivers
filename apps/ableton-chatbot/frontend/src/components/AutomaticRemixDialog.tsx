"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Copy, Download, Play, Trash2, WandSparkles } from "lucide-react";
import { apiFetch } from "@/lib/auth";
import { queued } from "@/lib/fetch-queue";
import { backgroundPollingAllowed } from "@/lib/background-polling";
import { stemLabel } from "@/lib/stems";
import type { RemixCreated } from "./RemixDialog";
import RemixSamples from "./RemixSamples";

type Effect = { kind: string; [key: string]: string | number };
type Part = { id: string; name: string; sample_id: string; root_note: number; gain_db: number; loop_beats: number;
  replaces: string | null; notes: { beat: number; duration_beats: number; note: number; velocity: number }[]; effects: Effect[] };
type Segment = { section: number; repeats: number; levels: Record<string, number>; parts?: Part[]; effects?: Record<string, Effect[]> };
type Recipe = { analysis_id: string; timing_revision: number; target_bpm: number; segments: Segment[] };
type ChatDraft = { id: string; title: string; recipe: Recipe; changes: string[]; duration_seconds: number };
type Job = { id: string; title: string; status: string; stage: string; review?: string; recipe: Recipe; project: RemixCreated;
  placement?: { status: string; summary?: string };
  result?: { duration_seconds: number; lufs: number; true_peak_dbtp: number; files: { mix: { sha256: string } }; limitations: string[] } };
type Setup = { available: boolean; ableton_import_available: boolean; reason: string | null; stems: string[]; jobs: Job[];
  timing: { analysis_id: string; revision: number; bpm: number; sections: { name: string; start_seconds: number; end_seconds: number }[] } | null };
const field = "w-full min-w-0 rounded border border-neutral-600 bg-neutral-900 px-2 py-2 text-sm text-white";
const icon = "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded border border-neutral-600 disabled:opacity-30";

async function json(path: string, init?: RequestInit) {
  const response = await queued(() => apiFetch(path, init));
  const result = await response.json();
  if (!response.ok) throw new Error(typeof result.detail === "string" ? result.detail : "Check your remix choices and try again.");
  return result;
}

export default function AutomaticRemixDialog({ reference, onCancel, onOpenChat, initialJobId, chatSessionId }: {
  reference: { id: string; name: string }; onCancel: () => void; onOpenChat: (result: RemixCreated) => void;
  initialJobId?: string;
  chatSessionId?: string | null;
}) {
  const base = `/api/references/${reference.id}/automatic-remixes`;
  const dialog = useRef<HTMLDialogElement>(null), player = useRef<HTMLAudioElement>(null);
  const activePlayer = useRef<HTMLAudioElement | null>(null);
  const sending = useRef(false), audioRequest = useRef<AbortController | null>(null), objectUrl = useRef("");
  const [setup, setSetup] = useState<Setup | null>(null), [job, setJob] = useState<Job | null>(null);
  const [title, setTitle] = useState(`${reference.name.replace(/\.[^.]+$/, "")} automatic remix`.slice(0, 70));
  const [bpm, setBpm] = useState(120), [segments, setSegments] = useState<Segment[]>([]);
  const [rights, setRights] = useState(false), [use, setUse] = useState("private");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [audio, setAudio] = useState(""), [heard, setHeard] = useState(false);
  const [destination, setDestination] = useState<{ ready: boolean; set_id?: string; title?: string; reason?: string } | null>(null);
  const [revisionSession, setRevisionSession] = useState<string | null>(null);
  const [chatDraft, setChatDraft] = useState<ChatDraft | null>(null);
  const [chatChecked, setChatChecked] = useState(!chatSessionId);
  const [rendersRemaining, setRendersRemaining] = useState<number | null>(null);
  const importing = job?.placement?.status === "importing";
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.current?.showModal();
    return () => { audioRequest.current?.abort(); activePlayer.current?.pause(); if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); if (opener?.isConnected) opener.focus(); };
  }, []);
  useEffect(() => {
    let active = true;
    void json(base).then(async (result: Setup) => {
      if (!active) return;
      setSetup(result);
      if (result.timing) {
        setBpm(result.timing.bpm);
        setSegments(result.timing.sections.map((_, section) => ({ section, repeats: 1,
          levels: Object.fromEntries(result.stems.map(name => [name, 0])) })));
      }
      let selectedId = initialJobId;
      const savedPreview = initialJobId ? result.jobs.find(item => item.id === initialJobId) : undefined;
      if (savedPreview) { setJob(savedPreview); setTitle(savedPreview.title); }
      if (chatSessionId) {
        const current = await json(`/api/chats/${encodeURIComponent(chatSessionId)}/remix-edit-state`);
        if (!active) return;
        setChatChecked(true); setRendersRemaining(current.renders_remaining);
        setRevisionSession(chatSessionId);
        selectedId = current.base_preview_id || undefined;
        if (current.draft) {
          const draft: ChatDraft = current.draft;
          setJob(null); setChatDraft(draft); setTitle(draft.title); setBpm(draft.recipe.target_bpm); setSegments(draft.recipe.segments);
          return;
        }
        if (current.stale_draft) setError("The saved chat changes are out of date. Ask BeatMind to review them against the current remix.");
        setTitle(current.title); setBpm(current.recipe.target_bpm); setSegments(current.recipe.segments);
      }
      if (selectedId || (!chatSessionId && result.jobs.length)) {
        const latest = selectedId ? result.jobs.find(item => item.id === selectedId) : result.jobs[0];
        if (!latest) { setError("This song's saved preview was not found. No other preview was selected."); return; }
        setJob(latest); setTitle(latest.title);
        setBpm(latest.recipe.target_bpm); setSegments(latest.recipe.segments);
      }
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [base, initialJobId, chatSessionId]);
  useEffect(() => {
    if (!job || (job.status !== "rendering" && job.placement?.status !== "importing")) return;
    let active = true, pending = false;
    const check = async () => {
      if (pending || !backgroundPollingAllowed()) return;
      pending = true;
      try { const result = await json(`${base}/${job.id}`); if (active) { setJob(result); setError(""); } }
      catch (e) { if (active) setError(e instanceof Error ? e.message : "Status is temporarily unavailable. Rendering may continue."); }
      finally { pending = false; }
    };
    const timer = setInterval(() => void check(), 5000);
    return () => { active = false; clearInterval(timer); };
  }, [base, job?.id, job?.status, job?.placement?.status]);
  useEffect(() => {
    if (activePlayer.current) {
      activePlayer.current.pause(); activePlayer.current.removeAttribute("src"); activePlayer.current.load();
      activePlayer.current = null;
    }
    audioRequest.current?.abort(); if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = ""; setAudio(""); setHeard(false); setDestination(null);
  }, [job?.id]);

  async function render() {
    if (sending.current || !setup?.timing || !rights || !chatChecked) return;
    sending.current = true; setBusy(true); setError("");
    try {
      const intent = { title: title.trim(), session_id: revisionSession, recipe: { analysis_id: setup.timing.analysis_id,
        timing_revision: setup.timing.revision, target_bpm: bpm, segments }, source_use: { rights_confirmed: true, intended_use: use } };
      const draftIntent = chatDraft ? { ...intent, draft_id: chatDraft.id } : intent;
      const key = `beatmind_automatic_remix_${reference.id}`, fingerprint = JSON.stringify(draftIntent);
      let prior: { fingerprint?: string; id?: string } = {};
      try { prior = JSON.parse(sessionStorage.getItem(key) || "{}"); } catch { /* Replace invalid retry state. */ }
      const request_id = prior?.fingerprint === fingerprint && /^[a-f0-9]{32}$/.test(prior.id || "") ? prior.id! : crypto.randomUUID().replaceAll("-", "");
      sessionStorage.setItem(key, JSON.stringify({ id: request_id, fingerprint }));
      const result = await json(base, { method: "POST", body: JSON.stringify({ ...draftIntent, request_id }) });
      setChatDraft(null); setJob(result); setSetup(old => old ? { ...old, jobs: [result, ...old.jobs.filter(j => j.id !== result.id)] } : old);
    } catch (e) { setError(e instanceof Error ? e.message : "Render request failed. Reopen to check saved progress before retrying."); }
    finally { sending.current = false; setBusy(false); }
  }

  async function load(download = false) {
    if (!job || sending.current) return;
    if (!download && objectUrl.current && player.current) {
      setError("");
      await player.current.play().catch(() => setError("Press Play on the audio player to listen."));
      return;
    }
    sending.current = true; setBusy(true); setError("");
    const controller = new AbortController(); audioRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), 120000);
    try {
      const name = download ? "stems.zip" : "mix.wav";
      const response = await apiFetch(`${base}/${job.id}/files/${name}`, { signal: controller.signal });
      if (!response.ok) throw new Error("Could not load the saved remix audio. Your render is unchanged.");
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      if (download) {
        const link = document.createElement("a"); link.href = url; link.download = `BeatMind-remix-${job.id.slice(0, 8)}.zip`;
        document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
      } else {
        if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
        objectUrl.current = url; setAudio(url);
        if (player.current) { activePlayer.current = player.current; player.current.src = url; await player.current.play().catch(() => setError("Preview loaded. Press Play to listen.")); }
      }
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Audio loading failed."); else setError("Audio loading stopped. The saved preview is unchanged."); }
    finally { clearTimeout(timeout); audioRequest.current = null; sending.current = false; setBusy(false); }
  }

  async function review(accepted: boolean) {
    if (!job?.result || sending.current) return;
    sending.current = true; setBusy(true); setError("");
    try { setJob(await json(`${base}/${job.id}/review`, { method: "POST", body: JSON.stringify({
      mix_sha256: job.result.files.mix.sha256, accepted, heard }) })); }
    catch (e) { setError(e instanceof Error ? e.message : "Review was not saved."); }
    finally { sending.current = false; setBusy(false); }
  }
  async function selectPreview(id: string) {
    if (sending.current) return;
    sending.current = true; setBusy(true); setError("");
    activePlayer.current?.pause();
    try { setJob(await json(`${base}/${id}`)); setChatDraft(null); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load the saved preview."); }
    finally { sending.current = false; setBusy(false); }
  }
  function move(index: number, direction: number) {
    setSegments(old => { const next = [...old]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; return next; });
  }
  function revise() { setChatDraft(null); setRevisionSession(job?.project.sessionId || null); if (job) { setTitle(job.title); setBpm(job.recipe.target_bpm); setSegments(job.recipe.segments); }
    setJob(null); setRights(false); setError(""); sessionStorage.removeItem(`beatmind_automatic_remix_${reference.id}`); }
  async function place(checkOnly: boolean) {
    if (!job?.result || sending.current) return;
    sending.current = true; setBusy(true); setError("");
    try {
      if (checkOnly) setDestination(await json(`${base}/${job.id}/import-target`));
      else {
        const placement = await json(`${base}/${job.id}/import`, { method: "POST", body: JSON.stringify({
          set_id: destination?.set_id, mix_sha256: job.result.files.mix.sha256, retry: job.placement?.status === "failed" }) });
        setJob(old => old ? { ...old, placement } : old);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Could not confirm the destination. No retry was sent."); }
    finally { sending.current = false; setBusy(false); }
  }
  return <dialog ref={dialog} aria-labelledby="automatic-remix-title" onCancel={e => { if (busy) e.preventDefault(); else onCancel(); }}
    className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-lg border border-neutral-600 bg-neutral-950 p-0 text-white backdrop:bg-black/60">
    <form className="flex max-h-[90dvh] flex-col" onSubmit={e => { e.preventDefault(); void render(); }}>
      <div className="min-h-0 space-y-4 overflow-y-auto p-5">
        <h3 id="automatic-remix-title" className="flex items-center gap-2 text-base font-semibold"><WandSparkles size={18} />Automatic Remix</h3>
        <p className="break-words text-sm text-neutral-300">{reference.name}</p>
        <p className="text-sm text-amber-200">Remix preview with sampled instruments and effects. Original audio stays unchanged. Mac-only plugins and recovered original effects are not included.</p>
        <RemixSamples referenceId={reference.id} />
        {!setup && !error && <p role="status">Checking saved stems and timing...</p>}
        {setup?.reason && <p role="status" className="text-sm text-amber-200">{setup.reason}</p>}
        {chatDraft && <section aria-label="Proposed remix changes" className="space-y-2 border-b border-neutral-700 pb-3">
          <h4 className="font-medium">Your requested changes</h4>
          <ul className="list-disc space-y-2 pl-5 text-sm">{chatDraft.changes.map((line, index) => <li className="break-words" key={index}>{line}</li>)}</ul>
          <p className="text-sm">New preview: {Math.round(chatDraft.duration_seconds)} seconds. Existing audio is unchanged.</p>
        </section>}
        {rendersRemaining === 0 && <p role="status" className="text-amber-200 text-sm">This reference has reached its five-render limit. Saved previews remain available.</p>}
        {setup && setup.jobs.length > 0 && <label className="block space-y-1 text-sm"><span>Saved previews</span>
          <select className={field} value={job?.id || ""} disabled={busy} onChange={e => { const found = setup.jobs.find(j => j.id === e.target.value); if (found) void selectPreview(found.id); }}>
            <option value="" disabled>New remix choices</option>{setup.jobs.map(j => <option key={j.id} value={j.id}>{j.title} / {j.id.slice(0, 6)}</option>)}
          </select></label>}
        {job ? <section aria-label="Automatic remix result" className="space-y-3">
          <p role="status" className="text-sm">{job.stage}</p>
          <p className="text-xs text-neutral-400">{job.recipe.target_bpm} BPM / {job.recipe.segments.length} section choices</p>
          {job.status === "rendering" && <p className="text-sm">You can close this window. Rendering and its saved status continue.</p>}
          {job.status === "ready" && job.result && <>
            <p className="text-sm">{Math.round(job.result.duration_seconds)}s / {job.result.lufs} LUFS / true peak {job.result.true_peak_dbtp} dBTP</p>
            <button type="button" className={icon} aria-label="Play remix preview" title="Play remix preview" disabled={busy} onClick={() => void load()}><Play size={17} /></button>
            <audio ref={player} controls preload="none" hidden={!audio} className="w-full min-w-0" aria-label="Remix preview"
              onTimeUpdate={e => { if (objectUrl.current && e.currentTarget.currentSrc === objectUrl.current && !e.currentTarget.paused && e.currentTarget.currentTime >= 1) setHeard(true); }}
              onPlay={e => document.querySelectorAll("audio").forEach(a => { if (a !== e.currentTarget) a.pause(); })}
              onError={() => { setHeard(false); setError("This preview could not be played. Reload the audio before approving."); }} />
            <div className="flex flex-wrap gap-3">
              <button type="button" disabled={busy || !heard || job.review === "accepted"} onClick={() => void review(true)} className="rounded bg-emerald-700 px-3 py-2 text-sm disabled:opacity-40">{job.review === "accepted" ? "Preview approved" : "Approve preview"}</button>
              <button type="button" disabled={busy || importing} onClick={() => void review(false)} className="rounded border border-neutral-600 px-3 py-2 text-sm">Request changes</button>
            </div>
            {job.review === "accepted" && <div className="space-y-3">
              <button type="button" disabled={busy} onClick={() => void load(true)} className="inline-flex items-center gap-2 rounded border border-neutral-600 px-3 py-2 text-sm"><Download size={16} />Download aligned stems</button>
              {job.placement?.status && job.placement.status !== "idle" && <p role="status" className="text-sm text-amber-200">{job.placement.summary || (job.placement.status === "importing" ? "Sending approved stems to Ableton. Wait for verification." : "Placement could not be confirmed. Inspect Ableton before continuing; do not repeat the import.")}</p>}
              {!setup?.ableton_import_available && <p role="status" className="text-sm text-amber-200">Ableton import is not enabled in this release. Your approved preview and aligned stems remain available.</p>}
              {setup?.ableton_import_available && (!job.placement || ["idle", "failed"].includes(job.placement.status)) && <div className="space-y-3">
                <button type="button" disabled={busy} onClick={() => void place(true)} className="rounded border border-neutral-600 px-3 py-2 text-sm">Check Ableton destination</button>
                {destination?.reason && <p role="status" className="text-sm text-amber-200">{destination.reason}</p>}
                {destination?.ready && <>
                  <p className="break-words text-sm">Empty destination: {destination.title}. Tempo will be set to {job.recipe.target_bpm} BPM.</p>
                  <button type="button" disabled={busy} onClick={() => void place(false)} className="rounded bg-emerald-700 px-3 py-2 text-sm">{job.placement?.status === "failed" ? "Retry approved import" : "Send approved remix to Ableton"}</button>
                </>}
              </div>}
              <button type="button" disabled={busy} onClick={() => onOpenChat(job.project)} className="text-sm underline">Open this remix&apos;s chat</button>
            </div>}
            <details className="text-xs text-neutral-400"><summary>Audio limitations</summary><ul className="list-disc space-y-1 pl-4">{job.result.limitations.map(line => <li key={line}>{line}</li>)}</ul></details>
          </>}
          {job.status !== "rendering" && <button type="button" disabled={busy || importing || !setup?.available} onClick={revise} className="text-sm underline">Revise choices and render a new preview</button>}
        </section> : setup?.available && setup.timing && <fieldset disabled={busy || !chatChecked} className="space-y-4">
          <fieldset disabled={!!chatDraft} className="space-y-4">
          <label className="block space-y-1 text-sm"><span>Remix name</span><input className={field} required maxLength={70} value={title} onChange={e => setTitle(e.target.value)} /></label>
          <label className="block space-y-1 text-sm"><span>Target BPM</span><input className={field} type="number" required min={Math.max(20, setup.timing.bpm * .8)} max={Math.min(300, setup.timing.bpm * 1.25)} step="any" value={bpm} onChange={e => setBpm(Number(e.target.value))} /></label>
          <div className="space-y-4">{segments.map((row, index) => <div key={index} className="space-y-3 border-b border-neutral-700 pb-4">
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-0 flex-1 text-sm">Source section {index + 1}<select className={field} value={row.section} onChange={e => setSegments(old => old.map((r, i) => i === index ? { ...r, section: Number(e.target.value) } : r))}>
                {setup.timing!.sections.map((s, i) => <option key={i} value={i}>{s.name} ({s.start_seconds.toFixed(1)}-{s.end_seconds.toFixed(1)}s)</option>)}</select></label>
              <label className="w-20 text-sm">Repeats<input aria-label={`Section ${index + 1} repeats`} className={field} type="number" min={1} max={4} required value={row.repeats} onChange={e => setSegments(old => old.map((r, i) => i === index ? { ...r, repeats: Number(e.target.value) } : r))} /></label>
            </div>
            <div className="flex gap-2">
              <button type="button" className={icon} title="Move section up" aria-label={`Move section ${index + 1} up`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={16} /></button>
              <button type="button" className={icon} title="Move section down" aria-label={`Move section ${index + 1} down`} disabled={index === segments.length - 1} onClick={() => move(index, 1)}><ArrowDown size={16} /></button>
              <button type="button" className={icon} title="Duplicate section" aria-label={`Duplicate section ${index + 1}`} disabled={segments.length >= 32} onClick={() => setSegments(old => [...old.slice(0, index + 1), { ...row, levels: { ...row.levels } }, ...old.slice(index + 1)])}><Copy size={16} /></button>
              <button type="button" className={icon} title="Remove section" aria-label={`Remove section ${index + 1}`} disabled={segments.length === 1} onClick={() => setSegments(old => old.filter((_, i) => i !== index))}><Trash2 size={16} /></button>
            </div>
            {setup.stems.map(name => <div key={name} className="grid grid-cols-[minmax(0,1fr)_6rem] items-center gap-2 text-sm">
              <label className="flex min-w-0 items-center gap-2"><input type="checkbox" checked={name in row.levels} disabled={row.parts?.some(part => part.replaces === name)} aria-label={`Section ${index + 1} ${stemLabel(name)}`} onChange={e => setSegments(old => old.map((r, i) => {
                if (i !== index) return r; const levels = { ...r.levels }, effects = { ...r.effects };
                if (e.target.checked) levels[name] = 0; else { delete levels[name]; delete effects[name]; }
                return { ...r, levels, ...(r.effects ? { effects } : {}) };
              }))} /><span className="break-words">{stemLabel(name)}{row.parts?.some(part => part.replaces === name) ? " (replaced)" : ""}</span></label>
              <label className="flex items-center gap-1"><input className={field} aria-label={`Section ${index + 1} ${stemLabel(name)} dB`} type="number" min={-24} max={0} step={1} disabled={!(name in row.levels) || row.parts?.some(part => part.replaces === name)} value={row.levels[name] ?? 0} onChange={e => setSegments(old => old.map((r, i) => i === index ? { ...r, levels: { ...r.levels, [name]: Number(e.target.value) } } : r))} />dB</label>
            </div>)}
            {!!row.parts?.length && <ul className="space-y-2 text-sm">{row.parts.map(part => <li key={part.id} className="break-words">
              <strong>{part.name}</strong> / {part.replaces ? `Replaces ${stemLabel(part.replaces)}` : "Added instrument"} / {part.gain_db} dB
              <span className="block text-xs text-neutral-400">{part.notes.length} notes / {part.loop_beats}-beat pattern / root MIDI {part.root_note}
                {part.effects.length ? ` / ${part.effects.map(effect => effect.kind).join(", ")}` : ""}</span>
            </li>)}</ul>}
            {!!Object.keys(row.effects || {}).length && <ul className="space-y-1 text-sm">{Object.entries(row.effects || {}).map(([name, chain]) =>
              <li key={name}>{stemLabel(name)}: {chain.map(effect => effect.kind).join(", ")}</li>)}</ul>}
          </div>)}</div>
          </fieldset>
          <fieldset className="space-y-2 text-sm"><legend>Intended use</legend>{[["private", "Private project only"], ["publication", "Publication or distribution"]].map(([value, label]) =>
            <label key={value} className="flex items-center gap-2"><input type="radio" name="automatic-use" checked={use === value} onChange={() => { setUse(value); setRights(false); }} />{label}</label>)}</fieldset>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={rights} onChange={e => setRights(e.target.checked)} /><span>I have the rights needed to reuse all selected recordings, samples and compositions for the selected use.</span></label>
        </fieldset>}
      </div>
      <div className="shrink-0 space-y-3 border-t border-neutral-700 bg-neutral-950 p-4">
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        {!job && setup?.available && <p className="text-xs text-neutral-400">{revisionSession ? "Revision of this saved remix; no extra song credit." : "One song credit for this new remix; revisions stay with it."} Up to five renders per reference. Rights are your confirmation, not verified legal clearance.</p>}
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" disabled={busy} className="rounded border border-neutral-600 px-3 py-2 text-sm disabled:opacity-40" onClick={onCancel}>Close</button>
          {!job && <button type="submit" disabled={busy || !chatChecked || rendersRemaining === 0 || !setup?.available || !rights || !segments.length || segments.some(r => !Object.keys(r.levels).length)} className="inline-flex items-center gap-2 rounded bg-emerald-700 px-3 py-2 text-sm disabled:opacity-40"><WandSparkles size={16} />{busy ? "Starting..." : chatDraft ? "Confirm changes and render" : "Render preview"}</button>}
        </div>
      </div>
    </form>
  </dialog>;
}
