"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch, getUser } from "@/lib/auth";
import { excerptRangeError, latestListening, listeningCoverage, requestWasSaved, type ListeningData, type ListeningExcerpt, type ListeningRequestReceipt } from "@/lib/reference-listening";

const stamp = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
const field = "mt-2 w-full min-w-0 rounded border border-neutral-600 bg-neutral-900 p-2";

export default function ReferenceListening({ item, available, refresh, checkedAt, pollError, onDiscuss }: {
  item: { id: string; listening?: ListeningData; listening_busy?: boolean; report?: { duration_seconds: number } };
  available: boolean; refresh: () => Promise<void>; checkedAt: number | null; pollError: string; onDiscuss?: () => void;
}) {
  const [intent, setIntent] = useState("");
  const [start, setStart] = useState(0);
  const [duration, setDuration] = useState(Math.min(20, item.report?.duration_seconds || 20));
  const [layer, setLayer] = useState("mix");
  const [whole, setWhole] = useState(true);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [accepted, setAccepted] = useState<ListeningData>();
  const [excerpt, setExcerpt] = useState<ListeningExcerpt>();
  const [uncertain, setUncertain] = useState<ListeningRequestReceipt | null>(null);
  const [storageKey, setStorageKey] = useState("");
  const [now, setNow] = useState(Date.now());
  const intentInput = useRef<HTMLTextAreaElement>(null);
  const composer = useRef<HTMLDivElement>(null);
  const consentInput = useRef<HTMLInputElement>(null);
  const sending = useRef(false);
  const listening = latestListening(item.listening, accepted);
  const job = listening?.job;
  const running = job?.status === "running" || Boolean(item.listening_busy);
  const locked = busy || running || Boolean(uncertain);
  const stale = Boolean(pollError || (checkedAt && now - checkedAt > 30000));
  const total = item.report?.duration_seconds || 0;
  const rangeError = whole ? "" : excerptRangeError(start, duration, total);

  useEffect(() => {
    try {
      const user = getUser();
      if (!user?.id) return;
      const key = `beatmind-listening:${user.id}:${item.id}`;
      setStorageKey(key);
      const saved = JSON.parse(sessionStorage.getItem(key) || "null");
      if (typeof saved?.intent === "string") setIntent(saved.intent.slice(0, 1000));
      if (typeof saved?.whole === "boolean") setWhole(saved.whole);
      if (Number.isFinite(saved?.start)) setStart(saved.start);
      if (Number.isFinite(saved?.duration)) setDuration(saved.duration);
      if (["mix", "drums", "bass", "vocals", "other"].includes(saved?.layer)) setLayer(saved.layer);
      if (typeof saved?.pending?.intent === "string" && Number.isFinite(saved.pending.sentAt)) setUncertain(saved.pending);
    } catch { /* Storage can be unavailable in private browsing. */ }
  }, [item.id]);
  useEffect(() => {
    if (!storageKey) return;
    try { sessionStorage.setItem(storageKey, JSON.stringify({ intent, whole, start, duration, layer, pending: uncertain })); } catch { /* Keep the form usable without storage. */ }
  }, [storageKey, intent, whole, start, duration, layer, uncertain]);
  useEffect(() => {
    if (uncertain && requestWasSaved(item.listening, uncertain)) {
      setUncertain(null); setError(""); setNotice("Your listening request is saved.");
    }
  }, [item.listening, uncertain]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    const viewport = window.visualViewport;
    const keepComposerVisible = () => {
      if (document.activeElement === intentInput.current) composer.current?.scrollIntoView({ block: "center" });
    };
    viewport?.addEventListener("resize", keepComposerVisible);
    return () => viewport?.removeEventListener("resize", keepComposerVisible);
  }, []);
  useEffect(() => {
    if (!pollError) setNotice(previous => previous.startsWith("Request accepted, but status updates") ? "Your listening request is saved." : previous);
  }, [checkedAt, pollError]);

  async function checkStatus() {
    try { await refresh(); setError(""); }
    catch { setError("Status could not be updated. Your saved request has not been repeated."); }
  }
  async function listen() {
    if (sending.current || locked || !available) return;
    setError(""); setNotice("");
    if (!intent.trim()) { setError("Tell me what you want from this reference."); intentInput.current?.focus(); return; }
    if (rangeError) { setError(rangeError); return; }
    if (!consent) { setError("Your permission to send this audio to OpenAI is required before listening."); consentInput.current?.focus(); return; }
    sending.current = true; setBusy(true);
    const request = { intent: intent.trim(), sentAt: Date.now(), whole, previousJobStartedAt: job?.started_at,
      previousExcerptIds: (listening?.excerpts || []).flatMap(e => e.id ? [e.id] : []) };
    setUncertain(request);
    // Record the in-flight request before navigation can interrupt its response.
    try { if (storageKey) sessionStorage.setItem(storageKey, JSON.stringify({ intent, whole, start, duration, layer, pending: request })); } catch { /* Optional local recovery. */ }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), whole ? 30000 : 120000);
    try {
      const response = await apiFetch(`/api/references/${item.id}/${whole ? "listen-whole" : "listen"}`, {
        method: "POST", signal: controller.signal,
        body: JSON.stringify(whole ? { intent: request.intent, consent } : { intent: request.intent, start_seconds: start, duration_seconds: duration, layer, consent }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status < 500) setUncertain(null);
        throw new Error(typeof result.detail === "string" ? result.detail : "The listening request could not be confirmed. Check its status before sending again.");
      }
      if (whole) {
        if (!result.job?.started_at || !Array.isArray(result.excerpts)) throw new Error("The server response was incomplete. Check the saved request status.");
        setAccepted(result);
      } else {
        if (!result.id || !result.created_at) throw new Error("The server response was incomplete. Check the saved request status.");
        setExcerpt(result);
      }
      setUncertain(null); setConsent(false);
      setNotice(whole ? "Request accepted. Your listening intent is saved below." : "Listening complete. Your answer is ready below.");
      try { await refresh(); }
      catch { setNotice("Request accepted, but status updates are unavailable. Do not resend it; check status below."); }
    } catch (e) {
      setConsent(false);
      setError(e instanceof Error && e.name !== "AbortError" ? e.message : "Connection interrupted. The request may still be processing. Check status before sending again.");
    } finally { clearTimeout(timeout); sending.current = false; setBusy(false); }
  }
  const excerpts = [...(listening?.excerpts || [])];
  if (excerpt && !excerpts.some(e => e.id === excerpt.id)) excerpts.push(excerpt);
  const newestExcerpt = excerpts.reduce<ListeningExcerpt | undefined>((latest, e) => !latest || Date.parse(e.created_at || "") > Date.parse(latest.created_at || "") ? e : latest, undefined);
  const excerptIsLatest = newestExcerpt && (!job?.started_at || Date.parse(newestExcerpt.created_at || "") > Date.parse(job.started_at));
  const latestIntent = excerptIsLatest ? newestExcerpt.intent : job?.intent;
  const shownJob = !uncertain && (!latestIntent || latestIntent === job?.intent) ? job : undefined;
  const sentAt = uncertain?.sentAt || shownJob?.started_at || newestExcerpt?.created_at;
  const notes = excerpts.filter(e => e.validation === "checks_passed" && (!latestIntent || e.intent === latestIntent));
  const earlier = excerpts.filter(e => e.validation !== "checks_passed" || (latestIntent && e.intent !== latestIntent));
  const coverage = listeningCoverage({ excerpts }, total, latestIntent);

  return <section aria-label="AI listening" className="min-w-0 space-y-4 border-t border-neutral-700 pt-4">
    <h4 className="text-sm font-medium">AI listening</h4>
    <form noValidate onSubmit={event => { event.preventDefault(); void listen(); }} className="space-y-3">
      <fieldset disabled={locked} className="flex flex-wrap gap-4 text-sm"><legend className="mb-2">Listening scope</legend>
        <label><input type="radio" name={`scope-${item.id}`} checked={whole} onChange={() => { setWhole(true); setConsent(false); setError(""); }} /> Whole track</label>
        <label><input type="radio" name={`scope-${item.id}`} checked={!whole} onChange={() => { setWhole(false); setConsent(false); setError(""); }} /> Excerpt</label>
      </fieldset>
      {!whole && <fieldset disabled={locked} className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <label>Start (seconds)<input type="number" min={0} max={Math.max(0, total - 5)} step="any" value={start} onChange={e => { setStart(Number(e.target.value)); setConsent(false); setError(""); }} className={field} /></label>
          <label>Length (seconds)<input type="number" min={5} max={Math.min(30, total - start)} step="any" value={duration} onChange={e => { setDuration(Number(e.target.value)); setConsent(false); setError(""); }} className={field} /></label>
        </div>
        <label className="block">Audio layer<select aria-label="Listening audio layer" value={layer} onChange={e => { setLayer(e.target.value); setConsent(false); }} className={field}>
          {["mix", "drums", "bass", "vocals", "other"].map(s => <option key={s}>{s}</option>)}
        </select></label>
        {rangeError && <p className="text-amber-200">{rangeError}</p>}
      </fieldset>}
      <label className="flex items-start gap-2 text-sm"><input ref={consentInput} type="checkbox" disabled={locked || !available} checked={consent} onChange={e => { setConsent(e.target.checked); setError(""); }} className="mt-1" />
        Send {whole ? "this whole track" : "this excerpt"} and my intent to OpenAI. Provider charges apply (up to {whole ? Math.ceil(total / 30) : 1} requests).</label>
      <div ref={composer} className="space-y-3 scroll-my-20">
        <label className="block text-sm">What do you want from this reference?
          <textarea ref={intentInput} value={intent} maxLength={1000} disabled={locked} onChange={e => { setIntent(e.target.value); setError(""); }} rows={3}
            onFocus={() => composer.current?.scrollIntoView({ block: "center" })}
            placeholder="I like the warm bass and gradual build. Keep that energy, with my own sounds." className={`${field} resize-y`} />
        </label>
        <button type="submit" disabled={!available || locked} className="w-full rounded bg-emerald-700 px-4 py-3 text-sm font-medium text-white disabled:opacity-50 sm:w-auto">
          {busy ? "Sending listening request..." : uncertain ? "Checking request status" : running ? "Listening in progress" : "Send listening request"}
        </button>
        <p className="text-xs text-neutral-300">{!available ? "Audio listening is unavailable on the server." : busy ? "Waiting for the server to confirm your request." : uncertain ? "Submission unconfirmed. Sending again is paused to avoid duplicate charges." : running ? "Your submitted intent is being processed." : !intent.trim() ? "Your listening intent is empty." : intent.trim() === latestIntent?.trim() ? "This intent was already submitted. Sending again requires fresh permission." : !consent ? "Draft not sent. Audio-sharing permission is required." : "Ready to send. Your intent has not been submitted yet."}</p>
      </div>
    </form>
    {error && <p role="alert" className="text-sm text-red-300 break-words">{error}</p>}
    {notice && <p role="status" className="text-sm text-emerald-200">{notice}</p>}
    {(job || newestExcerpt || uncertain) && <div className="space-y-2 border-l-2 border-emerald-500 pl-3 text-sm">
      <h5 className="font-medium">{uncertain ? "Awaiting confirmation" : "Submitted listening intent"}</h5>
      <p className="whitespace-pre-wrap break-words">{uncertain?.intent || latestIntent}</p>
      {sentAt && <p className="text-xs text-neutral-400">{uncertain ? "Sent" : shownJob ? "Started" : "Saved"}: {new Date(sentAt).toLocaleString()}</p>}
      {!uncertain && <p className="text-xs text-neutral-400">{shownJob ? `Whole track / Original mix / ${stamp(total)}` : newestExcerpt ? `Excerpt / ${newestExcerpt.layer} / ${stamp(newestExcerpt.start_seconds)}-${stamp(newestExcerpt.end_seconds)}` : ""}</p>}
      {shownJob && <>
        <p role="status">{shownJob.status === "running" ? stale ? "Listening status unavailable" : "Listening in progress" : shownJob.status === "complete" ? "Listening complete" : shownJob.status === "interrupted" ? "Listening stopped before completion" : "Listening needs attention"}. {shownJob.completed} of {shownJob.total} intervals passed checks.</p>
        <progress aria-label="Listening intervals checked" value={shownJob.completed} max={Math.max(1, shownJob.total)} className="w-full accent-emerald-500" />
        {shownJob.status === "running" && <p className="text-xs text-neutral-400">{stale ? "The job may still be running. No duplicate request has been sent." : "The next interval is pending; completion time depends on the audio provider."}</p>}
        {shownJob.failures.map((f, i) => <p key={i} className="text-amber-200 break-words">{stamp(f.start)}-{stamp(f.end)}: {f.error}</p>)}
        {shownJob.error && <p className="text-amber-200 break-words">{shownJob.error}</p>}
      </>}
      {checkedAt && <p className="text-xs text-neutral-400">Last status check: {new Date(checkedAt).toLocaleTimeString()}</p>}
      <div className="flex flex-wrap gap-4">
        <button type="button" disabled={busy} onClick={() => void checkStatus()} className="underline disabled:opacity-40">Check listening status</button>
        {running && <button type="button" disabled={busy} className="text-red-300 underline disabled:opacity-40" onClick={async () => {
          if (sending.current) return;
          sending.current = true; setBusy(true);
          try {
            const response = await apiFetch(`/api/references/${item.id}/listen-cancel`, { method: "POST" });
            if (!response.ok) throw new Error("Could not stop listening. Check its current status.");
            setNotice("Stop requested. Completed notes are saved; an in-flight provider request may still be charged.");
            await refresh();
          } catch (e) { setError(e instanceof Error ? e.message : "Could not confirm the stop request."); }
          finally { sending.current = false; setBusy(false); }
        }}>Stop listening</button>}
      </div>
      {uncertain && !busy && !running && checkedAt && checkedAt > uncertain.sentAt + 120000 && <div className="space-y-2 text-amber-200">
        <p>The latest status shows no matching saved request or active listening job. An earlier provider call may still have been charged.</p>
        <button type="button" className="underline" onClick={() => { setUncertain(null); setConsent(false); setError(""); setNotice("Unconfirmed request dismissed. A new request requires your permission again."); }}>Dismiss unconfirmed request</button>
      </div>}
    </div>}
    {notes.length > 0 && <div className="space-y-3 text-sm">
      <h5 className="font-medium">Listening notes</h5>
      <p className="text-xs text-amber-200">AI interpretations, not verified musical facts. Format and level checks do not verify instruments, notes, effects or song structure.</p>
      <p>Original-mix coverage for this intent: {coverage.percent}% ({stamp(coverage.covered)} of {stamp(total)}).</p>
      {coverage.gaps.length > 0 && <p className="text-xs text-amber-200">Missing original-mix intervals: {coverage.gaps.map(([start, end]) => `${stamp(start)}-${stamp(end)}`).join(", ")}</p>}
      {shownJob && <p className="text-xs text-neutral-400">Whole-track listening analyzes consecutive original-mix excerpts, not each separated stem. Exact production settings remain unknown.</p>}
      {notes.map((e, i) => <details key={e.id || i} open={i === 0} className="border-t border-neutral-800 pt-2">
        <summary className="cursor-pointer">{stamp(e.start_seconds)}-{stamp(e.end_seconds)} / {e.layer}</summary>
        <p className="mt-2 whitespace-pre-wrap break-words">{e.notes}</p>
        {e.evidence && <p className="mt-2 text-xs text-neutral-400">Measured audio, first/last 3 seconds: {e.evidence.start_rms_dbfs} to {e.evidence.end_rms_dbfs} dBFS RMS. Change: {e.evidence.delta_db} dB.</p>}
      </details>)}
      {onDiscuss && !running && !uncertain && <button type="button" onClick={onDiscuss} className="rounded bg-emerald-700 px-4 py-2 text-white">Discuss these listening notes</button>}
    </div>}
    {earlier.length > 0 && <details className="text-xs text-neutral-400"><summary className="cursor-pointer">Earlier listening notes</summary>
      {earlier.map((e, i) => <div key={e.id || i} className="mt-3 space-y-1 break-words"><p>Intent: {e.intent || "Not recorded"}</p><p>{stamp(e.start_seconds)}-{stamp(e.end_seconds)} / {e.validation === "checks_passed" ? "Checks passed" : "Unchecked notes"}</p><p className="whitespace-pre-wrap">{e.notes}</p></div>)}
    </details>}
  </section>;
}
