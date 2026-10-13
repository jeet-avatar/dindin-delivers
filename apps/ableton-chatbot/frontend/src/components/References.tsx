"use client";

import type React from "react";
import { Shuffle } from "lucide-react";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/auth";
import { queued } from "@/lib/fetch-queue";
import { audioStems, reviewStems, stemLabel } from "@/lib/stems";
import { backgroundPollingAllowed } from "@/lib/background-polling";
import { uploadReference, UploadConfirmationError, type UploadProgress } from "@/lib/reference-upload";
import ReferenceFilePicker from "./ReferenceFilePicker";
import ReferenceUpgrade from "./ReferenceUpgrade";
import ReferenceStatus from "./ReferenceStatus";
import ReferenceListening from "./ReferenceListening";
import { listeningFinished, type ListeningData } from "@/lib/reference-listening";
import ReferenceTemplate, { type ReferenceTemplateData } from "./ReferenceTemplate";
import ReferenceReview, { type TimingMap, type StemReview, type StemHealth } from "./ReferenceReview";
import SoundComparison from "./SoundComparison";
import LocalSeparation from "./LocalSeparation";
import LocalStemActions from "./LocalStemActions";
import TrackCredits from "./TrackCredits";
import { uploadToCloud } from "@/lib/cloud-upload";
import ReferenceWorkflow from "./ReferenceWorkflow";
import { DeleteReferenceDialog } from "./DeleteReferenceDialog";
import SourceUseDialog, { type SourceUse } from "./SourceUseDialog";
import RemixDialog, { type RemixCreated } from "./RemixDialog";
import { importOperation, finishImport } from "@/lib/reference-import";

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


const UPLOAD_LIMIT = 5;

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
        const response = await queued(() => apiFetch(`/api/references/${id}/audio/${stem}`, { signal: controller.signal }));
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

function StemPlayer({ id, stem, cue }: { id: string; stem: string; cue: { seconds: number } }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { if (audioRef.current) audioRef.current.currentTime = cue.seconds; }, [cue]);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";
    setUrl(""); setError("");
    void (async () => {
      try {
        const response = await queued(() => apiFetch(`/api/references/${id}/audio/${stem}`, { signal: controller.signal }));
        if (!response.ok) throw new Error("Audio could not be loaded.");
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Audio failed."); }
    })();
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [id, stem]);
  if (error) return <p role="alert" className="text-xs text-red-300">{error}</p>;
  if (!url) return <p className="text-xs text-neutral-500">Loading…</p>;
  return <audio ref={audioRef} key={url} aria-label={`${stem} stem player`} controls preload="metadata" src={url}
    onPlay={event => document.querySelectorAll("audio").forEach(other => { if (other !== event.currentTarget) other.pause(); })}
    onLoadedMetadata={() => { if (audioRef.current) audioRef.current.currentTime = cue.seconds; }} className="w-full h-8" />;
}

function StemPicker({ id, stems, cue, importing, disabled, bridgeConnected, liveSet, onImport }: {
  id: string; stems: string[]; cue: { seconds: number };
  importing: boolean; disabled: boolean; bridgeConnected?: boolean; liveSet?: string | null; onImport: (stems: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(stems));
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  useEffect(() => { setSelected(new Set(stems)); }, [stems.join(",")]);
  function toggle(stem: string) {
    setSelected(prev => { const next = new Set(prev); if (next.has(stem)) next.delete(stem); else next.add(stem); return next; });
  }
  function togglePreview(stem: string) {
    setExpanded(prev => { const next = new Set(prev); if (next.has(stem)) next.delete(stem); else next.add(stem); return next; });
  }
  const allSelected = selected.size === stems.length;
  const connected = bridgeConnected === true;
  return <div className="space-y-3">
    <div className="flex items-center gap-2 text-sm">
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: connected ? "var(--success)" : "var(--error)" }} />
      <span style={{ color: connected ? "var(--success-text)" : "var(--error-text)" }}>
        {connected
          ? (liveSet ? `Ableton connected — ${liveSet}` : "Ableton connected")
          : "Ableton not connected — open the BeatMind Bridge"}
      </span>
    </div>
    <div className="rounded border border-neutral-700 divide-y divide-neutral-700">
      <div className="flex items-center gap-3 px-3 py-2 text-sm">
        <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(stems))}
          className="accent-emerald-500" aria-label="Select all stems" />
        <span className="text-neutral-300 font-medium">Stems</span>
        <span className="text-neutral-500 ml-auto">{selected.size} of {stems.length} selected</span>
      </div>
      {stems.map(stem => <div key={stem} className="px-3 py-2">
        <div className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={selected.has(stem)} onChange={() => toggle(stem)}
            className="accent-emerald-500" aria-label={`Select ${stemLabel(stem)}`} />
          <span>{stemLabel(stem)}</span>
          <button type="button" onClick={() => togglePreview(stem)}
            className="ml-auto text-xs text-neutral-400 hover:text-neutral-200">
            {expanded.has(stem) ? "Hide" : "Preview"}
          </button>
        </div>
        {expanded.has(stem) && <div className="mt-2"><StemPlayer id={id} stem={stem} cue={cue} /></div>}
      </div>)}
    </div>
    <button type="button" disabled={disabled || importing || selected.size === 0 || !connected}
      onClick={() => onImport([...selected])}
      className="rounded bg-emerald-700 px-5 py-3 text-sm font-medium disabled:opacity-40 flex items-center gap-2">
      <span className="inline-block w-4 h-4"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></span>
      {importing ? "Placing stems in Ableton…" : `Send ${selected.size === stems.length ? "all" : selected.size} stem${selected.size === 1 ? "" : "s"} to Ableton`}
    </button>
  </div>;
}

export default function References({ onUse, onRemix, chatBusy, selectedId, onSelect, guided = false, onTemplateApproved, onOpenChat, bridgeConnected, bridgeLiveSet, abletonSet, cloudHQAllowed = false, onUpgrade }: {
  cloudHQAllowed?: boolean; onUpgrade?: () => void;
  onUse: (id: string, template?: boolean) => void; chatBusy: boolean;
  onRemix?: (result: RemixCreated) => void;
  selectedId?: string | null; onSelect?: (id: string | null) => Promise<void>; guided?: boolean;
  onTemplateApproved?: () => void; onOpenChat?: () => void; bridgeConnected?: boolean; bridgeLiveSet?: string | null; abletonSet?: React.ReactNode;
}) {
  const [items, setItems] = useState<Reference[]>([]);
  const [available, setAvailable] = useState(false);
  const [listeningAvailable, setListeningAvailable] = useState(false);
  const [localAvailable, setLocalAvailable] = useState(false);
  const [cloudAvailable, setCloudAvailable] = useState(false);
  const [reason, setReason] = useState("");
  const [pollError, setPollError] = useState("");
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const [observedJobId, setObservedJobId] = useState<string | null>(null);
  const [transfer, setTransfer] = useState<(UploadProgress & { startedAt: number }) | null>(null);
  const [uploadUnconfirmed, setUploadUnconfirmed] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importNotice, setImportNotice] = useState("");
  const importGeneration = useRef(0);
  const [pendingImport, setPendingImport] = useState<{ id: string; name: string; stems?: string[] } | null>(null);
  const [remixSource, setRemixSource] = useState<Reference | null>(null);
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
  const [pendingDelete, setPendingDelete] = useState<Reference | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Hitting the upload limit should show what can be deleted, not leave the list hidden.
  useEffect(() => { if (error.includes("Delete an older reference")) setShowSaved(true); }, [error]);
  const [stage, setStage] = useState(guided ? "listening" : "stems");
  const pollDelay = useRef(4000);
  useEffect(() => {
    if (stage !== "stems") document.querySelectorAll<HTMLAudioElement>('audio[aria-label$="stem player"]').forEach(audio => audio.pause());
  }, [stage]);
  const [cue, setCue] = useState({ seconds: 0 });
  useEffect(() => { setSelected(selectedId || null); }, [selectedId]);
  useEffect(() => {
    const generation = ++importGeneration.current;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    setImportNotice(""); setImporting(false);
    if (!selected) return;
    async function check() {
      try {
        const response = await apiFetch(`/api/references/${selected}/import-status`, { signal: controller.signal });
        if (!response.ok) return;
        const result = await response.json();
        if (controller.signal.aborted || generation !== importGeneration.current) return;
        setImporting(result.status === "importing");
        if (result.status === "importing") {
          setImportNotice("Placing stems in Ableton. Your import is saved; no need to send it again.");
          timer = setTimeout(check, 5000);
        } else if (result.status === "needs_inspection" || result.status === "failed") {
          setError(result.error || "Inspect the stem import in Ableton before continuing.");
          setImportNotice("");
        } else if (result.status === "verified") {
          setImportNotice(`Last import: ${result.summary || "Stem placement completed."}`);
        }
      } catch {
        if (!controller.signal.aborted && generation === importGeneration.current) {
          setImportNotice("Cannot check stem placement right now. Reconnecting does not repeat the import.");
          timer = setTimeout(check, 5000);
        }
      }
    }
    void check();
    return () => { ++importGeneration.current; controller.abort(); clearTimeout(timer); };
  }, [selected]);
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
  async function importToAbleton(id: string, sourceUse: SourceUse, stems?: string[]) {
    const generation = ++importGeneration.current;
    setImporting(true); setImportNotice(""); setError("");
    try {
      const intent = { stems, source_use: sourceUse };
      const operation_id = importOperation(sessionStorage, id, intent);
      const body = JSON.stringify({ ...intent, operation_id });
      const res = await apiFetch(`/api/references/${id}/import-to-ableton`, { method: "POST", body });
      let result = await res.json();
      if (!res.ok) throw new Error(typeof result.detail === "string" ? result.detail : "Could not place stems in Ableton.");
      // Downloading full-length stems can take minutes, so the server works in the background.
      const deadline = Date.now() + 11 * 60 * 1000;
      while (result.status === "importing" && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (generation !== importGeneration.current) return;
        const poll = await apiFetch(`/api/references/${id}/import-status`);
        if (poll.ok) result = await poll.json();
      }
      if (generation !== importGeneration.current) return;
      if (result.status === "failed") finishImport(sessionStorage, id);
      if (result.status !== "verified") throw new Error(result.error || "Stem placement is not confirmed. Inspect Ableton before continuing; do not repeat the import.");
      finishImport(sessionStorage, id);
      setImportNotice(result.summary || "Stems placed in Ableton.");
      onUse(id, true);
    } catch (e) { if (generation === importGeneration.current) setError(e instanceof Error ? e.message : "Could not place stems in Ableton."); }
    finally { if (generation === importGeneration.current) setImporting(false); }
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
    const activeJob = data.references.find((item: Reference) => ["choosing", "uploading", "processing", "importing"].includes(item.status));
    pollDelay.current = activeJob || data.processing?.busy || data.references.some((item: Reference) => item.listening_busy || item.listening?.job?.status === "running") ? 4000 : 15000;
    if (activeJob) setObservedJobId(activeJob.id);
    setItems(data.references); setAvailable(data.available); setReason(data.reason || "");
    setProcessingBusy(Boolean(data.processing?.busy));
    setListeningAvailable(Boolean(data.audio_listening?.available));
    setLocalAvailable(Boolean(data.local_separation?.available));
    setCloudAvailable(Boolean(data.cloud_separation?.available));
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
    if (processingBusy && !cloudAvailable) return;
    if (file.size > limits.maxBytes) { setError(`${file.name} was not uploaded. Choose a file up to ${Math.floor(limits.maxBytes / (1024 * 1024))} MB. No reference is selected.`); return; }
    setBusy(true); setError("");
    const controller = new AbortController();
    uploadController.current = controller;
    const startedAt = Date.now();
    setTransfer({ loaded: 0, total: file.size, sent: false, startedAt });
    try {
      if (cloudAvailable) {
        // BeatMind Cloud: the file goes straight to S3, then a GPU job separates it.
        const created = await apiFetch("/api/references/cloud", { method: "POST", body: JSON.stringify({ name: file.name, bytes: file.size, rights }) });
        const form = await created.json();
        if (!created.ok) throw new Error(typeof form.detail === "string" ? form.detail : "BeatMind Cloud could not accept this file.");
        await uploadToCloud(form.upload, file, controller.signal, progress => {
          if (!controller.signal.aborted) setTransfer({ ...progress, startedAt });
        });
        const started = await apiFetch(`/api/references/${form.reference.id}/cloud-start`, { method: "POST", body: "{}" });
        const data = await started.json();
        if (!started.ok) throw new Error(typeof data.detail === "string" ? data.detail : "The GPU separation could not start.");
        setUploadedReference(data.id);
        setTransfer(null); setCheckedAt(Date.now()); setObservedJobId(data.id);
        setItems(previous => [data, ...previous.filter(item => item.id !== data.id)]);
        await select(data.id);
        await refresh();
        return;
      }
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
    setError(""); setDeleting(true);
    try {
      const response = await apiFetch(`/api/references/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error((await response.json()).detail || "Delete failed.");
      if (id === selected) await select(null);
      setPendingDelete(null);
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Delete failed."); setPendingDelete(null); }
    finally { setDeleting(false); }
  }
  // The server allows five uploaded references; references separated on the user's computer don't count.
  const uploadsUsed = items.filter(i => i.storage !== "local").length;
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
      : item && <ReferenceStatus reference={item} checkedAt={checkedAt} pollError={pollError} onDelete={() => void remove(item.id)} onListen={() => { setStage("stems"); audioSection.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }} />}
    {observedJob && !transfer && <ReferenceStatus reference={observedJob} checkedAt={checkedAt} pollError={pollError} onDelete={() => void remove(observedJob.id)} onOpen={() => { if (!busy && !chatBusy) void select(observedJob.id); }} />}
    {processingBusy && !transfer && <p role="status" className="text-sm break-words text-amber-200">
      {activeReference ? "Reference processing is in progress." : "Another reference operation is running."}
      {file && !uploadedReference ? " Your selected file has not been uploaded or queued. Keep this tab open; upload will become available when processing finishes." : " New uploads are paused until it finishes."}
    </p>}
    {!processingBusy && file && waitedForProcessing && !uploadedReference && <p role="status" className="text-sm text-emerald-300">Processing is available. Your selected file is ready to upload.</p>}
    <TrackCredits refreshKey={items.length} />
    <LocalSeparation available={localAvailable} disabled={busy || chatBusy} onStarted={async reference => {
      setObservedJobId(reference.id); await refresh(); await select(reference.id);
    }} />
    {!cloudHQAllowed && onUpgrade && <ReferenceUpgrade hq onUpgrade={onUpgrade} />}
    {cloudHQAllowed && cloudAvailable && <div className="space-y-3 border-b border-neutral-700 pb-5">
      <h3 className="text-sm font-medium">{localAvailable ? "Or upload and separate on BeatMind GPU (faster)" : "Upload and separate on BeatMind GPU (pay as you go)"}</h3>
      <p className="text-sm text-neutral-400">{localAvailable ? "Faster than local separation. Your file is uploaded, separated on a GPU, then deleted." : "Highest quality with detailed drums. BeatMind deletes the uploaded file after separation."}</p>
      <div className="block text-sm">Audio file <span className="text-neutral-400">{limits ? `(${Math.floor(limits.maxBytes / (1024 * 1024))} MB, ${limits.minSeconds} seconds to ${limits.maxSeconds / 60} minutes)` : "(Checking upload limits...)"}</span>
        <ReferenceFilePicker inputRef={fileInput} name={file?.name || item?.name}
          disabled={!available || !limits || busy || chatBusy} onChange={next => void chooseFile(next)} />
      </div>
      {file && <p role="status" className="text-sm break-words">Selected file: {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB). {transfer ? "Upload in progress." : uploadUnconfirmed ? "Upload result unknown. Check saved references before choosing the file again." : uploadedReference ? "Uploaded; not attached to this song yet." : "Not uploaded yet."}</p>}
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={rights} disabled={busy || chatBusy} onChange={e => setRights(e.target.checked)} className="mt-1" />
        I have permission to upload and analyze this audio.</label>
      <button type="button" onClick={upload} disabled={!available || !file || !rights || !uploadReady || !limits || file.size > limits.maxBytes || busy || chatBusy || uploadUnconfirmed || (processingBusy && !cloudAvailable && !uploadedReference)}
        className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium disabled:opacity-40">{item && !file ? "Reference selected" : transfer ? transfer.sent ? "Confirming upload..." : "Uploading..." : busy ? "Saving selection..." : uploadedReference ? "Attach uploaded reference" : processingBusy ? "Waiting for processing" : "Upload and analyze"}</button>
    </div>}
    {guided && <button type="button" aria-expanded={showSaved} aria-controls="saved-reference-library"
      onClick={() => setShowSaved(value => !value)} className="text-sm underline">
      {showSaved ? "Hide saved references" : "Choose a saved reference"}
    </button>}
    <div className={`grid gap-6 ${!guided || showSaved ? "md:grid-cols-[minmax(0,240px)_minmax(0,1fr)]" : "grid-cols-1"}`}>
      {(!guided || showSaved) && <div id="saved-reference-library" className="space-y-1" aria-label="Saved references">
        {!items.length && <p className="text-sm text-neutral-400">No reference tracks yet.</p>}
        {items.length > 0 && <p className="px-1 pb-1 text-xs text-neutral-400">
          {uploadsUsed} of {UPLOAD_LIMIT} uploads used{uploadsUsed >= UPLOAD_LIMIT ? " · delete one to upload another" : ""}
        </p>}
        {items.map(i => <div key={i.id} className={`group flex items-stretch border-l-2 ${selected === i.id ? "border-emerald-400 bg-neutral-800" : "border-transparent"}`}>
          <button type="button" disabled={busy || chatBusy} onClick={() => void select(i.id)}
            aria-pressed={selected === i.id} className="min-w-0 flex-1 p-3 text-left">
            <span className="block break-all text-sm font-medium">{i.name}</span>
            <span className="text-xs text-neutral-400">{i.stage || i.status}</span>
          </button>
          <button type="button" aria-label={`Delete ${i.name}`} title="Delete reference"
            disabled={busy || chatBusy || deleting} onClick={() => setPendingDelete(i)}
            className="px-3 text-neutral-500 hover:text-red-300 focus:text-red-300 disabled:opacity-40">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
            </svg>
          </button>
        </div>)}
      </div>}
      {item && <div className="min-w-0 space-y-4">
        <h3 className="text-base font-semibold break-all">{item.name}</h3>
        <p className="text-xs text-neutral-400">{new Date(item.created_at).toLocaleString()}</p>
        {item.storage === "local" && item.status !== "ready" && <LocalStemActions key={`local-${item.id}`} id={item.id} folder={item.local_folder} status={item.status} refresh={refresh} />}
        {item.report && item.status === "ready" && <>
          <div className="border-l-4 border-emerald-400 pl-4 py-3 space-y-3">
            <p className="text-sm text-emerald-200 font-medium">Stems are ready</p>
            <svg role="img" aria-label="Reference waveform" viewBox="0 0 160 40" className="h-16 w-full" preserveAspectRatio="none">
              {item.report.waveform.map((v, i) => <line key={i} x1={i} x2={i} y1={20-v*19} y2={20+v*19} stroke="var(--success)" strokeWidth="0.6" />)}
            </svg>
            <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <div><span className="text-neutral-400">Tempo </span><span>{item.report.tempo.bpm ?? "—"} BPM</span></div>
              <div><span className="text-neutral-400">Key </span><span>{item.report.key_candidates.map(k => k.key).join(" / ") || "—"}</span></div>
              <div><span className="text-neutral-400">Duration </span><span>{time(item.report.duration_seconds)}</span></div>
            </dl>
            <button type="button" disabled={chatBusy || busy || importing || !onRemix}
              onClick={() => setRemixSource(item)}
              className="inline-flex items-center gap-2 rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
              <Shuffle size={17} aria-hidden="true" />Remix this reference
            </button>
            {item.storage === "local" && <LocalStemActions key={`ready-${item.id}`} id={item.id} folder={item.local_folder} status={item.status} refresh={refresh}
              disabled={chatBusy || busy || importing} onImport={() => setPendingImport({ id: item.id, name: item.name })} />}
            {item.storage !== "local" && <StemPicker key={item.id} id={item.id} stems={reviewStems(item.report)} cue={cue}
              importing={importing} disabled={chatBusy || busy} bridgeConnected={bridgeConnected} liveSet={bridgeLiveSet}
              onImport={stems => setPendingImport({ id: item.id, name: item.name, stems })} />}
            {importNotice && <p role="status" className="text-sm text-emerald-200">{importNotice}</p>}
            {abletonSet && <div aria-label="Ableton set for this song" className="flex flex-wrap items-center gap-3 rounded border border-neutral-700 p-3 text-xs">
              {abletonSet}
            </div>}
            <button type="button" disabled={chatBusy || busy} onClick={() => onUse(item.id)}
              className="text-sm underline disabled:opacity-40">
              Discuss this reference in chat (nothing changes in Ableton)
            </button>
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer text-neutral-400">Advanced: review stems, timing, listening and template</summary>
            <div className="mt-3 space-y-4">
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
                  refresh={refresh} onUse={() => setPendingImport({ id: item.id, name: item.name })} chatBusy={chatBusy || importing} onApproved={onTemplateApproved}
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
            </div>
          </details>
        </>}
        <button type="button" onClick={() => setPendingDelete(item)} disabled={busy || chatBusy || deleting}
          className="rounded-lg border px-3 py-1.5 text-sm text-red-300 disabled:opacity-40" style={{ borderColor: "var(--border)" }}>
          Delete reference
        </button>
      </div>}
    </div>
    {remixSource && onRemix && <RemixDialog key={remixSource.id}
      reference={{ id: remixSource.id, name: remixSource.name, bpm: remixSource.report?.tempo.bpm ?? null }}
      stems={reviewStems(remixSource.report)} onCancel={() => setRemixSource(null)}
      onCreated={result => { onRemix(result); setRemixSource(null); }} />}
    {pendingImport && <SourceUseDialog key={pendingImport.id} name={pendingImport.name} onCancel={() => setPendingImport(null)}
      onConfirm={consent => { const request = pendingImport; setPendingImport(null); void importToAbleton(request.id, consent, request.stems); }} />}
    {pendingDelete && <DeleteReferenceDialog name={pendingDelete.name} local={pendingDelete.storage === "local"} busy={deleting}
      onCancel={() => setPendingDelete(null)} onConfirm={() => void remove(pendingDelete.id)} />}
  </section>;
}
