"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/auth";
import { audioStems, reviewStems, stemLabel } from "@/lib/stems";
import { backgroundPollingAllowed } from "@/lib/background-polling";
import { uploadReference, UploadConfirmationError, type UploadProgress } from "@/lib/reference-upload";
import ReferenceStatus from "./ReferenceStatus";
import ReferenceListening from "./ReferenceListening";
import { listeningFinished, type ListeningData } from "@/lib/reference-listening";
import ReferenceTemplate, { type ReferenceTemplateData } from "./ReferenceTemplate";
import ReferenceReview, { type TimingMap, type StemReview, type StemHealth } from "./ReferenceReview";
import SoundComparison from "./SoundComparison";
import LocalSeparation from "./LocalSeparation";
import LocalStemActions from "./LocalStemActions";
import ReferenceWorkflow from "./ReferenceWorkflow";

type Report = {
  duration_seconds: number;
  tempo: { bpm: number | null };
  key_candidates: { key: string; correlation: number }[];
  waveform: number[];
  possible_change_points_seconds: number[];
  stems: { name: string; rms_dbfs: number; onset_events_per_second: number }[];
  limitations: string[];
  stem_health?: StemHealth;
};
type Reference = {
  id: string; name: string; status: string; created_at: string;
  stage?: string; error?: string; report?: Report;
  storage?: "local"; local_folder?: string;
  listening_busy?: boolean;
  template?: ReferenceTemplateData;
  timing?: TimingMap; stem_review?: StemReview;
  listening?: ListeningData;
};


function LocalOnlyNote({ onNext }: { onNext?: () => void }) {
  return <div role="status" className="space-y-2 border-t border-neutral-700 pt-4 text-sm">
    <p>This reference's audio stays on your computer, so AI listening and sound comparison, which need the audio on BeatMind, are off.
      Listen to the stems in Ableton or Finder instead.</p>
    {onNext && <button type="button" onClick={onNext} className="underline">Continue to template</button>}
  </div>;
}

const time = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;

function ReferenceAudio({ id, cue, stems }: { id: string; cue: { seconds: number }; stems: string[] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [stem, setStem] = useState("mix");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (audioRef.current) audioRef.current.currentTime = cue.seconds;
  }, [cue]);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";
    setUrl(""); setError("");
    void (async () => {
      try {
        const response = await apiFetch(`/api/references/${id}/audio/${stem}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Audio could not be loaded.");
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Audio failed.");
      }
    })();
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [id, stem]);
  return <div className="space-y-3">
    <label className="flex items-center gap-3 text-sm">Audio
      <select aria-label="Reference audio layer" value={stem} onChange={e => setStem(e.target.value)}
        className="rounded border border-neutral-600 bg-neutral-900 px-3 py-2">
        <option value="mix">Original mix</option>
        {stems.map(s => <option key={s} value={s}>{stemLabel(s)} (estimated)</option>)}
      </select>
    </label>
    {error ? <p role="alert" className="text-sm text-red-300">{error}</p> :
      url ? <audio ref={audioRef} key={url} aria-label={`${stem} audio`} controls preload="metadata" src={url}
        onPlay={event => document.querySelectorAll("audio").forEach(other => { if (other !== event.currentTarget) other.pause(); })}
        onLoadedMetadata={() => { if (audioRef.current) audioRef.current.currentTime = cue.seconds; }} className="w-full" /> :
        <p role="status" className="text-sm text-neutral-400">Loading audio...</p>}
  </div>;
}

export default function References({ onUse, chatBusy, selectedId, onSelect, guided = false, onTemplateApproved, onOpenChat }: {
  onUse: (id: string, template?: boolean) => void; chatBusy: boolean;
  selectedId?: string | null; onSelect?: (id: string | null) => Promise<void>; guided?: boolean;
  onTemplateApproved?: () => void; onOpenChat?: () => void;
}) {
  const [items, setItems] = useState<Reference[]>([]);
  const [available, setAvailable] = useState(false);
  const [listeningAvailable, setListeningAvailable] = useState(false);
  const [localAvailable, setLocalAvailable] = useState(false);
  const [reason, setReason] = useState("");
  const [pollError, setPollError] = useState("");
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const [observedJobId, setObservedJobId] = useState<string | null>(null);
  const [transfer, setTransfer] = useState<(UploadProgress & { startedAt: number }) | null>(null);
  const [uploadUnconfirmed, setUploadUnconfirmed] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rights, setRights] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadController = useRef<AbortController | null>(null);
  useEffect(() => () => { uploadController.current?.abort(); }, []);
  const [uploadReady, setUploadReady] = useState(false);
  const [uploadedReference, setUploadedReference] = useState<string | null>(null);
  const [processingBusy, setProcessingBusy] = useState(false);
  const [waitedForProcessing, setWaitedForProcessing] = useState(false);
  const [limits, setLimits] = useState<{ maxBytes: number; minSeconds: number; maxSeconds: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(selectedId || null);
  const [showSaved, setShowSaved] = useState(false);
  const [stage, setStage] = useState(guided ? "listening" : "stems");
  const pollDelay = useRef(4000);
  useEffect(() => {
    if (stage !== "stems") document.querySelectorAll<HTMLAudioElement>('audio[aria-label$="stem player"]').forEach(audio => audio.pause());
  }, [stage]);
  const [cue, setCue] = useState({ seconds: 0 });
  useEffect(() => { setSelected(selectedId || null); }, [selectedId]);
  async function select(id: string | null) {
    setBusy(true); setError("");
    try {
      await onSelect?.(id);
      setSelected(id); setFile(null); setRights(false); setUploadReady(false); setUploadedReference(null); setWaitedForProcessing(false);
      setUploadUnconfirmed(false);
      if (fileInput.current) fileInput.current.value = "";
      setStage(guided ? "listening" : "stems"); setCue({seconds:0});
    } catch (error) { setError(error instanceof Error ? error.message : "Could not attach this reference to the song."); }
    finally { setBusy(false); }
  }
  const refresh = useCallback(async (signal?: AbortSignal) => {
    const response = await apiFetch("/api/references", { signal });
    if (!response.ok) throw new Error(response.status === 401 ? "Sign in again to access references." : response.status === 429
      ? "Status updates are paused briefly because too many requests were received. Uploaded audio can continue processing."
      : "Could not update reference status. Retrying shortly.");
    const data = await response.json();
    if (signal?.aborted) return;
    setPollError("");
    setCheckedAt(Date.now());
    const activeJob = data.references.find((item: Reference) => ["choosing", "uploading", "processing"].includes(item.status));
    pollDelay.current = activeJob || data.processing?.busy || data.references.some((item: Reference) => item.listening_busy || item.listening?.job?.status === "running") ? 4000 : 15000;
    if (activeJob) setObservedJobId(activeJob.id);
    setItems(data.references); setAvailable(data.available); setReason(data.reason || "");
    setProcessingBusy(Boolean(data.processing?.busy));
    setListeningAvailable(Boolean(data.audio_listening?.available));
    setLocalAvailable(Boolean(data.local_separation?.available));
    if (Number.isFinite(data.max_bytes) && data.max_bytes > 0 && Number.isFinite(data.max_seconds) && data.max_seconds > 0) {
      setLimits({ maxBytes: data.max_bytes, minSeconds: data.min_seconds ?? 5, maxSeconds: data.max_seconds });
    } else { setLimits(null); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let inFlight = false;
    const poll = async () => {
      if (inFlight || controller.signal.aborted) return;
      clearTimeout(timer);
      inFlight = true;
      try { if (backgroundPollingAllowed()) await refresh(controller.signal); }
      catch (e) { pollDelay.current = 4000; if (!controller.signal.aborted) setPollError(e instanceof Error ? e.message : "Could not update reference status."); }
      finally { inFlight = false; }
      if (!controller.signal.aborted) timer = setTimeout(poll, pollDelay.current);
    };
    const visible = () => { if (document.visibilityState === "visible") void poll(); };
    document.addEventListener("visibilitychange", visible);
    void poll();
    return () => { controller.abort(); clearTimeout(timer); document.removeEventListener("visibilitychange", visible); };
  }, [refresh]);

  async function chooseFile(next: File | null) {
    if (!next) return;
    setFile(next); setRights(false); setSelected(null); setShowSaved(false);
    setObservedJobId(null);
    setUploadUnconfirmed(false);
    setWaitedForProcessing(processingBusy);
    setUploadReady(false); setUploadedReference(null); setError(""); setBusy(true);
    try {
      // A replacement is a new reference decision, even if its upload fails.
      await onSelect?.(null);
      setUploadReady(true);
      if (limits && next.size > limits.maxBytes) setError(`${next.name} was not uploaded. Choose a file up to ${Math.floor(limits.maxBytes / (1024 * 1024))} MB. No reference is selected.`);
    } catch (error) {
      setError(`The new file was not uploaded because the previous reference could not be detached. ${error instanceof Error ? error.message : "Try selecting the file again."}`);
    } finally { setBusy(false); }
  }
  async function upload() {
    if (!file || !rights || !uploadReady || !limits || busy || chatBusy || uploadUnconfirmed) return;
    if (uploadedReference) { await select(uploadedReference); return; }
    if (processingBusy) return;
    if (file.size > limits.maxBytes) { setError(`${file.name} was not uploaded. Choose a file up to ${Math.floor(limits.maxBytes / (1024 * 1024))} MB. No reference is selected.`); return; }
    setBusy(true); setError("");
    const controller = new AbortController();
    uploadController.current = controller;
    const startedAt = Date.now();
    setTransfer({ loaded: 0, total: file.size, sent: false, startedAt });
    try {
      const response = await uploadReference(file, controller.signal, progress => {
        if (!controller.signal.aborted) setTransfer({ ...progress, startedAt });
      });
      const data = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) {
        if (response.status === 409 && data.detail?.code === "reference_processing_busy") {
          setProcessingBusy(true); setWaitedForProcessing(true);
          return;
        }
        throw new Error(typeof data.detail === "string" ? data.detail : data.detail?.message || "Upload failed.");
      }
      setUploadedReference(data.id);
      setTransfer(null); setCheckedAt(Date.now()); setObservedJobId(data.id);
      setItems(previous => [data, ...previous.filter(item => item.id !== data.id)]);
      await select(data.id);
      await refresh();
    } catch (e) {
      if (!controller.signal.aborted) {
        setError(e instanceof Error ? e.message : "Upload failed.");
        if (e instanceof UploadConfirmationError) {
          setUploadUnconfirmed(true); setShowSaved(true);
          if (fileInput.current) fileInput.current.value = "";
        }
      }
    }
    finally { uploadController.current = null; setTransfer(null); setBusy(false); }
  }
  async function remove(id: string) {
    if (!window.confirm("Delete this reference and all its estimated stems?")) return;
    setError("");
    try {
      const response = await apiFetch(`/api/references/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error((await response.json()).detail || "Delete failed.");
      if (id === selected) await select(null);
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Delete failed."); }
  }
  const item = file ? undefined : items.find(i => i.id === selected);
  const observedJob = items.find(i => i.id === observedJobId && i.id !== selected && ["uploading", "processing", "ready", "failed"].includes(i.status));
  const audioSection = useRef<HTMLDivElement>(null);
  const activeReference = items.find(i => ["uploading", "processing"].includes(i.status) || i.listening_busy || i.listening?.job?.status === "running");
  return <section className="mx-auto w-full max-w-5xl p-4 sm:p-6 space-y-6">
    <h2 className="text-xl font-semibold">{guided ? "Your song reference" : "Reference tracks"}</h2>
    {guided && !selected && <h3 className="text-base font-medium">Upload your reference track</h3>}
    {reason && <p role="status" className="text-sm text-amber-200">{reason}</p>}
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {pollError && <p role="status" className="text-sm text-amber-200">{pollError}</p>}
    {transfer && file ? <ReferenceStatus reference={{ name: file.name, status: "uploading", created_at: new Date(transfer.startedAt).toISOString() }} checkedAt={checkedAt} transfer={transfer} startedAt={transfer.startedAt} />
      : item && <ReferenceStatus reference={item} checkedAt={checkedAt} pollError={pollError} onListen={() => { setStage("stems"); audioSection.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }} />}
    {observedJob && !transfer && <ReferenceStatus reference={observedJob} checkedAt={checkedAt} pollError={pollError} onOpen={() => { if (!busy && !chatBusy) void select(observedJob.id); }} />}
    {processingBusy && !transfer && <p role="status" className="text-sm break-words text-amber-200">
      {activeReference ? "Reference processing is in progress." : "Another reference operation is running."}
      {file && !uploadedReference ? " Your selected file has not been uploaded or queued. Keep this tab open; upload will become available when processing finishes." : " New uploads are paused until it finishes."}
    </p>}
    {!processingBusy && file && waitedForProcessing && !uploadedReference && <p role="status" className="text-sm text-emerald-300">Processing is available. Your selected file is ready to upload.</p>}
    <LocalSeparation available={localAvailable} disabled={busy || chatBusy} onStarted={async reference => {
      setObservedJobId(reference.id); await refresh(); await select(reference.id);
    }} />
    <div className="space-y-3 border-b border-neutral-700 pb-5">
      <h3 className="text-sm font-medium">Or upload to BeatMind</h3>
      <label className="block text-sm">Audio file <span className="text-neutral-400">{limits ? `(${Math.floor(limits.maxBytes / (1024 * 1024))} MB, ${limits.minSeconds} seconds to ${limits.maxSeconds / 60} minutes)` : "(Checking upload limits...)"}</span>
        <input ref={fileInput} type="file" aria-label="Reference audio file" accept=".wav,.aif,.aiff,.mp3,.m4a,.flac,.ogg"
          disabled={!available || !limits || busy || chatBusy} onChange={e => void chooseFile(e.target.files?.[0] || null)}
          className="block mt-2 w-full min-w-0 rounded border border-neutral-600 bg-neutral-900 p-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-emerald-700 file:px-4 file:py-3 file:font-medium file:text-white disabled:opacity-40" />
      </label>
      {file && <p role="status" className="text-sm break-words">Selected file: {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB). {transfer ? "Upload in progress." : uploadUnconfirmed ? "Upload result unknown. Check saved references before choosing the file again." : uploadedReference ? "Uploaded; not attached to this song yet." : "Not uploaded yet."}</p>}
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={rights} disabled={busy || chatBusy} onChange={e => setRights(e.target.checked)} className="mt-1" />
        I have permission to upload and analyze this audio.</label>
      <button type="button" onClick={upload} disabled={!available || !file || !rights || !uploadReady || !limits || file.size > limits.maxBytes || busy || chatBusy || uploadUnconfirmed || (processingBusy && !uploadedReference)}
        className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium disabled:opacity-40">{transfer ? transfer.sent ? "Confirming upload..." : "Uploading..." : busy ? "Saving selection..." : uploadedReference ? "Attach uploaded reference" : processingBusy ? "Waiting for processing" : "Upload and analyze"}</button>
    </div>
    {guided && <button type="button" aria-expanded={showSaved} aria-controls="saved-reference-library"
      onClick={() => setShowSaved(value => !value)} className="text-sm underline">
      {showSaved ? "Hide saved references" : "Choose a saved reference"}
    </button>}
    <div className={`grid gap-6 ${!guided || showSaved ? "md:grid-cols-[minmax(0,240px)_minmax(0,1fr)]" : "grid-cols-1"}`}>
      {(!guided || showSaved) && <div id="saved-reference-library" className="space-y-1" aria-label="Saved references">
        {!items.length && <p className="text-sm text-neutral-400">No reference tracks yet.</p>}
        {items.map(i => <button key={i.id} type="button" disabled={busy || chatBusy} onClick={() => void select(i.id)}
          aria-pressed={selected === i.id} className={`w-full border-l-2 p-3 text-left ${selected === i.id ? "border-emerald-400 bg-neutral-800" : "border-transparent"}`}>
          <span className="block break-all text-sm font-medium">{i.name}</span>
          <span className="text-xs text-neutral-400">{i.stage || i.status}</span>
        </button>)}
      </div>}
      {item && <div className="min-w-0 space-y-4">
        <h3 className="text-base font-semibold break-all">{item.name}</h3>
        <p className="text-xs text-neutral-400">{new Date(item.created_at).toLocaleString()}</p>
        {item.storage === "local" && <LocalStemActions key={`local-${item.id}`} id={item.id} folder={item.local_folder} status={item.status} refresh={refresh} />}
        {item.report && item.status === "ready" && <>
          {guided && <div className="border-l-2 border-emerald-400 pl-3 space-y-2 text-sm">
            {item.storage !== "local" && !listeningFinished(item.listening) ? <>
              <p>{item.listening?.job?.status === "running" ? "Listening is in progress. Completed notes will appear in the Listening step." : "Would you like me to listen to this track? What stands out to you?"}</p>
              {stage !== "listening" && <button className="underline" onClick={() => setStage("listening")}>Review listening consent</button>}
            </> : <>
              <p>{item.storage === "local" ? "Your stems are ready on this computer." : "Listening notes ready."} What would you like to borrow: the groove, bass, atmosphere, or structure?</p>
              <button disabled={chatBusy || busy} onClick={() => onUse(item.id)} className="underline disabled:opacity-40">Discuss what I like</button>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => setStage("stems")} className="underline">{item.stem_review?.status === "accepted" ? "Stems reviewed" : "Review estimated stems"}</button>
                <button onClick={() => setStage("timing")} className="underline">{item.timing?.status === "confirmed" ? "Timing confirmed" : "Confirm section timing"}</button>
                <button onClick={() => setStage("template")} className="underline">{item.template?.status === "approved" ? "Template approved" : "Shape my original template"}</button>
              </div>
            </>}
          </div>}
          <svg role="img" aria-label="Reference waveform" viewBox="0 0 160 40" className="h-20 w-full" preserveAspectRatio="none">
            {item.report.waveform.map((v, i) => <line key={i} x1={i} x2={i} y1={20-v*19} y2={20+v*19} stroke="#34d399" strokeWidth="0.6" />)}
          </svg>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-neutral-400">Estimated tempo</dt><dd>{item.report.tempo.bpm ?? "Unknown"} BPM</dd></div>
            <div><dt className="text-neutral-400">Duration</dt><dd>{time(item.report.duration_seconds)}</dd></div>
            <div className="col-span-2"><dt className="text-neutral-400">Possible keys</dt><dd>{item.report.key_candidates.map(k => k.key).join(" / ") || "Not enough tonal evidence"}</dd></div>
          </dl>
          {item.storage !== "local" && <div ref={audioSection}><ReferenceAudio key={item.id} id={item.id} cue={cue} stems={audioStems(item.report)} /></div>}
          <ReferenceWorkflow stage={stage} onStage={setStage} review={item.stem_review} timing={item.timing} listening={item.listening} listeningBusy={item.listening_busy}
            template={item.template} onOpenChat={onOpenChat} />
          {item.timing && item.stem_review && (["stems", "timing"] as const).map(mode => <div key={mode} hidden={stage!==mode}>
            <ReferenceReview key={`${item.id}-${mode}-${item.timing!.analysis_id}`} id={item.id} name={item.name} mode={mode} timing={item.timing!} review={item.stem_review!}
              health={item.report!.stem_health} stems={reviewStems(item.report)} local={item.storage === "local"} refresh={refresh} onCue={seconds => setCue({seconds})}
              onStemSaved={review => setItems(previous => previous.map(reference => reference.id === item.id ? { ...reference, stem_review: review } : reference))}
              onTimingSaved={timing => setItems(previous => previous.map(reference => reference.id === item.id ? { ...reference, timing } : reference))}
              onNext={() => setStage(mode === "stems" ? "timing" : "listening")} /></div>)}
          <div hidden={stage!=="listening"}>{item.storage === "local"
            ? <LocalOnlyNote onNext={() => setStage("template")} />
            : <ReferenceListening key={item.id} item={item} available={listeningAvailable} refresh={refresh}
              checkedAt={checkedAt} pollError={pollError} onNext={() => setStage("template")} onDiscuss={chatBusy || busy ? undefined : () => onUse(item.id)} />}</div>
          {stage === "compare" && (item.storage === "local" ? <LocalOnlyNote />
            : <SoundComparison key={`compare-${item.id}`} id={item.id} duration={item.report.duration_seconds} stems={audioStems(item.report)} />)}
          <div hidden={stage!=="template"}>{item.timing?.status === "confirmed" && item.stem_review?.status === "accepted" ?
            <ReferenceTemplate key={`template-${item.id}-${item.timing.revision}`} id={item.id} template={item.template} bpm={item.report.tempo.bpm} timing={item.timing}
              refresh={refresh} onUse={() => onUse(item.id, true)} chatBusy={chatBusy} onApproved={onTemplateApproved}
              onSaved={template => setItems(previous => previous.map(reference => reference.id === item.id ? { ...reference, template } : reference))}
              onCompare={() => setStage("compare")} /> :
            <p role="status" className="text-sm text-amber-200">Stem review and timing confirmation required.</p>}</div>
          <details className="text-sm"><summary className="cursor-pointer">Measured audio details</summary>
          <h4 className="text-sm font-medium">Estimated stem activity</h4>
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="text-neutral-400"><th>Stem</th><th>RMS dBFS</th><th>Onsets/sec</th></tr></thead>
            <tbody>{item.report.stems.map(s => <tr key={s.name} className="border-t border-neutral-800"><td className="py-2">{s.name}</td><td>{s.rms_dbfs}</td><td>{s.onset_events_per_second}</td></tr>)}</tbody></table></div>
          <p className="text-sm"><span className="text-neutral-400">Possible energy changes: </span>{item.report.possible_change_points_seconds.map(time).join(", ") || "None detected"}</p>
          <details className="text-xs text-neutral-400"><summary className="cursor-pointer">Analysis limitations</summary>
            <ul className="mt-2 space-y-1">{item.report.limitations.map(l => <li key={l}>{l}</li>)}</ul></details>
          </details>
          {!guided && <button type="button" disabled={chatBusy || busy} onClick={() => onUse(item.id)} className="rounded bg-emerald-700 px-4 py-2 text-sm disabled:opacity-40">Discuss reference in chat</button>}
        </>}
        {!['processing', 'uploading'].includes(item.status) && <button type="button" onClick={() => remove(item.id)} className="block text-sm text-red-300">Delete reference</button>}
      </div>}
    </div>
  </section>;
}
