"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/auth";
import ProductionLog, { type ProductionAction } from "@/components/ProductionLog";
import ChatTimestamp from "@/components/ChatTimestamp";
import TrackLevel from "@/components/TrackLevel";
import { levelHint } from "@/lib/audio-level";
import { claimPreviewAutoplay } from "@/lib/music-workflow";
import { publishRecordingDecision, RECORDING_CHANGED, RECORDING_STORAGE_KEY } from "@/lib/recording-review";

export interface Recording {
  id: string;
  created_at?: string;
  supersedes?: string;
  track?: number;
  scene?: number;
  track_name: string;
  source: string;
  decision: "pending" | "accepted" | "revise";
  metrics: { duration_seconds: number; peak_dbfs: number; rms_dbfs?: number; waveform: number[] };
  sample_source?: { pack_name: string; relative_path: string; sha256?: string };
  continuation?: { message: string; session_id: string } | null;
}

function RecordingPlayer({ item, claimAutoplay, onDecision, allowReview, onPreview, superseded }: {
  item: Recording; claimAutoplay: () => boolean; onDecision: (item: Recording, decision: string) => void; allowReview: boolean;
  onPreview?: (actions: ProductionAction[]) => void;
  superseded: boolean;
}) {
  const [src, setSrc] = useState("");
  const [error, setError] = useState("");
  const [heard, setHeard] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playbackNotice, setPlaybackNotice] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [decision, setDecision] = useState(item.decision);
  const [actions, setActions] = useState<ProductionAction[] | null>(null);
  const [logLoading, setLogLoading] = useState(false);
  const attempted = useRef(false);
  const audio = useRef<HTMLAudioElement>(null);
  const waveformPeak = Math.max(0.000001, ...item.metrics.waveform);
  const hint = levelHint(item.metrics.peak_dbfs, item.metrics.rms_dbfs);

  useEffect(() => {
    setDecision(item.decision);
    if (item.decision !== "pending") audio.current?.pause();
  }, [item.decision]);

  useEffect(() => {
    const controller = new AbortController();
    let url = "";
    setSrc(""); setError(""); setAudioReady(false);
    apiFetch(`/api/recordings/${item.id}/audio`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Recording could not be loaded.");
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      }).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [item.id, loadAttempt]);

  async function playSound() {
    if (!audio.current) return;
    setPlaybackNotice("");
    try {
      await audio.current.play();
    } catch (error) {
      setPlaybackNotice(error instanceof DOMException && error.name === "NotAllowedError"
        ? "Playback was blocked by the browser. Press Play sound to listen."
        : "Playback did not start. Press Play sound to retry, or download the audio.");
    }
  }

  async function decide(next: "accepted" | "revise") {
    setSaving(true);
    setError("");
    try {
      const response = await apiFetch(`/api/recordings/${item.id}/decision`, {
        method: "POST", body: JSON.stringify({ decision: next }),
      });
      if (!response.ok) throw new Error("Your decision was not saved. Please retry.");
      const saved = await response.json();
      audio.current?.pause();
      setDecision(saved.decision);
      publishRecordingDecision(saved);
      onDecision(saved, saved.decision);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to save."); }
    finally { setSaving(false); }
  }

  async function loadLog() {
    if (actions || logLoading) return;
    setLogLoading(true);
    try {
      const response = await apiFetch(`/api/recordings/${item.id}`);
      if (!response.ok) throw new Error("Production details could not be loaded.");
      const data = await response.json();
      setActions(data.production_log || []);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to load details."); }
    finally { setLogLoading(false); }
  }

  return <article className="py-4 border-b min-w-0" style={{ borderColor: "var(--border)" }} aria-label={`Recording: ${item.track_name}`}>
    <div className="flex flex-wrap justify-between gap-2 text-sm">
      <h3 className="font-semibold break-words">{item.track_name}</h3>
      <span style={{ color: decision === "accepted" ? "#86efac" : "var(--text-secondary)" }}>
        {decision === "pending" ? "Awaiting review" : decision === "accepted" ? "Accepted" : "Changes requested"}
      </span>
    </div>
    <ChatTimestamp value={item.created_at} label="Captured" />
    {item.supersedes && <p className="text-xs mt-1 text-emerald-200">Updated preview. Your earlier recording and its decision are saved.</p>}
    {superseded && <p className="text-xs mt-1">Historical version. A newer recording is available.</p>}
    <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
      Ableton reference at capture: {typeof item.track === "number" && item.track >= 0 ? `Track ${item.track + 1}` : "Track not recorded"}
      {typeof item.scene === "number" && item.scene >= 0 ? ` / Scene ${item.scene + 1}` : ""}
    </p>
    <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
      {item.source} · {item.metrics.duration_seconds.toFixed(1)}s · Peak {item.metrics.peak_dbfs.toFixed(1)} dBFS
    </p>
    {item.sample_source && <p className="text-xs mt-1 break-words">{item.sample_source.pack_name} / {item.sample_source.relative_path}</p>}
    {item.sample_source && <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
      Source: {/ONE[ _-]?SHOTS?/i.test(item.sample_source.relative_path) ? "One-shot sample" : "Sample file"}
    </p>}
    {hint && <div role="status" className="border-l-2 border-amber-300 pl-3 mt-3 text-xs text-amber-200">
      <p className="font-semibold">{hint.title}</p>
      <p className="mt-1">Captured peak: {item.metrics.peak_dbfs.toFixed(1)} dBFS{Number.isFinite(item.metrics.rms_dbfs) ? ` / average: ${item.metrics.rms_dbfs!.toFixed(1)} dBFS` : ""}</p>
      <p className="mt-1">{hint.detail}</p>
    </div>}
    <div className="h-12 flex items-center gap-px my-2 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 80 }, (_, i) => {
        const values = item.metrics.waveform;
        const value = values[Math.min(values.length - 1, Math.floor(i * values.length / 80))] || 0;
        return <span key={i} className="flex-1 min-w-0" style={{ height: `${Math.max(3, Math.min(100, value / waveformPeak * 95))}%`, background: "#34d399" }} />;
      })}
    </div>
    {src ? <audio ref={audio} controls preload="auto" src={src} className="w-full min-w-0 h-10" aria-label={`Play ${item.track_name}`}
      onCanPlay={() => {
        setAudioReady(true);
        if (decision === "pending" && !superseded && !attempted.current && audio.current && claimAutoplay()) {
          attempted.current = true;
          audio.current.scrollIntoView({ behavior: "smooth", block: "center" });
          void playSound();
        }
      }}
      onPlay={() => { setPlaying(true); setPlaybackNotice(""); document.querySelectorAll("audio").forEach(other => { if (other !== audio.current) other.pause(); }); }}
      onPause={() => setPlaying(false)}
      onEnded={() => { setHeard(true); setPlaying(false); }}
      onError={() => { setAudioReady(false); setError("This browser could not play the recording."); }}
    /> : <p className="text-xs">{error || "Loading recording..."}</p>}
    {playbackNotice && <p role="status" className="text-xs mt-2 text-amber-200">{playbackNotice}</p>}
    <div className="flex flex-wrap items-center gap-3 mt-3">
      {src && <button type="button" onClick={() => playing ? audio.current?.pause() : void playSound()}
        className="rounded px-3 py-2 text-sm" style={{ background: "var(--accent)", color: "white" }}>
        {playing ? "Pause sound" : "Play sound"}
      </button>}
      {src && <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
        {playing ? "Playing recording" : heard ? "Finished listening" : "Ready to play"}
      </span>}
      {error && <button type="button" onClick={() => { attempted.current = false; setLoadAttempt(value => value + 1); }}
        className="rounded border px-3 py-2 text-xs">Reload audio</button>}
    </div>
    <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
      {allowReview && <>
        <button type="button" onClick={() => decide("accepted")} disabled={superseded || decision !== "pending" || !audioReady || saving}
          title={decision === "accepted" ? "This recording is already accepted" : decision === "revise" ? "Changes have been requested for this recording" : !audioReady ? "Recording is not ready to play" : "Accept this sound"}
          className="px-3 py-2 rounded disabled:opacity-40" style={{ background: "#16734a", color: "white" }}>{decision === "accepted" ? "Accepted" : "Accept sound"}</button>
        <button type="button" onClick={() => decide("revise")} disabled={superseded || saving || decision === "revise"}
          className="px-3 py-2 rounded border disabled:opacity-40" style={{ borderColor: "var(--border)" }}>{decision === "revise" ? "Changes requested" : "Request changes"}</button>
      </>}
      {src && <a href={src} download={`${item.track_name}.m4a`} className="underline">Download audio</a>}
      {!allowReview && <Link href={`/dashboard/recordings?id=${item.id}`} className="underline">Open recording</Link>}
    </div>
    {allowReview && !superseded && decision === "pending" && !audioReady && <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
      Accept sound is unavailable until the recording is ready to play.
    </p>}
    {error && src && <p role="alert" className="text-xs mt-2 text-red-300">{error}</p>}
    {allowReview && onPreview && item.sample_source?.sha256 && <TrackLevel recordingId={item.id} onPreview={onPreview} />}
    <details className="mt-3 text-xs" onToggle={event => { if (event.currentTarget.open) loadLog(); }}>
      <summary className="cursor-pointer py-1">Production details</summary>
      {logLoading && <p>Loading details...</p>}
      {actions && (actions.length ? <ProductionLog actions={actions} /> : <p>No saved command history for this recording.</p>)}
    </details>
  </article>;
}

export function useRecordings(recordingIds: string[]) {
  const [items, setItems] = useState<Recording[]>([]);
  const [error, setError] = useState("");
  const initialized = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const initialIds = useRef(new Set<string>());
  const mountedAt = useRef(Date.now());
  const idsKey = [...new Set(recordingIds)].sort().join(",");
  useEffect(() => {
    let active = true;
    let refreshing = false;
    let generation = 0;
    const controller = new AbortController();
    const refresh = async () => {
      if (refreshing) return;
      refreshing = true;
      const started = generation;
      try {
        const response = await apiFetch("/api/recordings", { signal: controller.signal });
        if (!response.ok) {
          if (active) setUnauthorized(response.status === 401);
          throw new Error(response.status === 401 ? "Sign in to open your recordings." : "Recordings are temporarily unavailable.");
        }
        const data = await response.json();
        if (!active || started !== generation) return;
        // Fetch chat-linked previews even after they leave the API's latest-20 list.
        const loaded: Recording[] = data.recordings;
        const missing = idsKey.split(",").filter(id => id && !loaded.some(item => item.id === id));
        for (const id of missing) {
          const detail = await apiFetch(`/api/recordings/${id}`, { signal: controller.signal });
          if (detail.ok) loaded.push(await detail.json());
        }
        if (!active || started !== generation) return;
        loaded.forEach(item => {
          if (!initialized.current || !item.created_at || Date.parse(item.created_at) <= mountedAt.current) initialIds.current.add(item.id);
        });
        initialized.current = true;
        setItems(loaded);
        setLoaded(true); setUnauthorized(false);
        setError("");
      } catch (error) { if (active && started === generation) setError(error instanceof Error ? error.message : "Recording request failed."); }
      finally { refreshing = false; if (active && started !== generation) void refresh(); }
    };
    const invalidate = () => { generation++; void refresh(); };
    const changed = (event: Event) => {
      const saved = (event as CustomEvent<Recording>).detail;
      generation++;
      setItems(previous => previous.map(item => item.id === saved.id ? { ...item, ...saved } : item));
      void refresh();
    };
    const storageChanged = (event: StorageEvent) => { if (event.key === RECORDING_STORAGE_KEY) invalidate(); };
    window.addEventListener(RECORDING_CHANGED, changed);
    window.addEventListener("storage", storageChanged);
    window.addEventListener("focus", invalidate);
    refresh();
    const timer = setInterval(refresh, 4000);
    return () => { active = false; controller.abort(); clearInterval(timer);
      window.removeEventListener(RECORDING_CHANGED, changed); window.removeEventListener("storage", storageChanged); window.removeEventListener("focus", invalidate); };
  }, [idsKey]);

  return { items, error, loaded, unauthorized, initialIds: initialIds.current };
}

export default function Recordings({ items, onDecision, initialIds, title = "Sounds", missing = false, allowReview = true, onPreview, supersededIds }: {
  items: Recording[]; onDecision: (item: Recording, decision: string) => void;
  initialIds: Set<string>; title?: string; missing?: boolean; allowReview?: boolean;
  onPreview?: (actions: ProductionAction[]) => void;
  supersededIds?: Set<string>;
}) {
  if (!items.length && !missing) return null;
  const historical = new Set([...(supersededIds || []), ...items.flatMap(item => item.supersedes ? [item.supersedes] : [])]);
  return <section aria-label="Ableton recordings" className="min-w-0">
    <h2 className="text-sm font-semibold mt-3">{title}</h2>
    {missing && <p role="status" className="text-xs mt-2">A linked recording is not available yet.</p>}
    {items.map(item => <RecordingPlayer key={item.id} item={item}
      claimAutoplay={() => claimPreviewAutoplay(item.id, item.decision, historical.has(item.id), initialIds)} onDecision={onDecision} allowReview={allowReview}
      superseded={historical.has(item.id)} onPreview={historical.has(item.id) ? undefined : onPreview} />)}
  </section>;
}
