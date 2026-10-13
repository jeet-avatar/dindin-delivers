"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Upload } from "lucide-react";
import { apiFetch } from "@/lib/auth";

type Sample = { id: string; name: string; duration_seconds: number; peak_dbfs: number };

export default function RemixSamples({ referenceId }: { referenceId: string }) {
  const base = `/api/references/${referenceId}/remix-samples`;
  const [samples, setSamples] = useState<Sample[]>([]), [file, setFile] = useState<File | null>(null);
  const [rights, setRights] = useState(false), [busy, setBusy] = useState(false), [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const audio = useRef<HTMLAudioElement>(null), url = useRef(""), input = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null), pending = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    void apiFetch(base, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Sample library could not be loaded. Reopen this window to retry.");
      const result = await response.json();
      if (!controller.signal.aborted) setSamples(result.samples || []);
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    const player = audio.current;
    return () => { controller.abort(); request.current?.abort(); player?.pause(); if (url.current) URL.revokeObjectURL(url.current); };
  }, [base]);

  async function upload() {
    if (!file || !rights || pending.current) return;
    if (file.size > 12 * 1024 * 1024) { setError("Choose a sample no larger than 12 MB."); return; }
    pending.current = true; setBusy(true); setError(""); setStatus("Uploading and checking sample audio...");
    const controller = new AbortController(); request.current = controller;
    const timer = setTimeout(() => controller.abort(), 90000);
    try {
      const response = await apiFetch(base, { method: "POST", signal: controller.signal, body: file,
        headers: { "Content-Type": "application/octet-stream", "X-Sample-Name": encodeURIComponent(file.name), "X-Rights-Confirmed": "true" } });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.detail === "string" ? result.detail : "Sample upload failed.");
      setSamples(old => [...old.filter(item => item.id !== result.id), result]); setFile(null); setRights(false);
      if (input.current) input.current.value = "";
      setStatus(`${result.name} saved. Existing remix audio is unchanged.`);
    } catch (e) { setStatus(""); setError(controller.signal.aborted ? "Upload confirmation was interrupted. Reopen the sample library to check before retrying." : e instanceof Error ? e.message : "Sample upload failed."); }
    finally { clearTimeout(timer); pending.current = false; setBusy(false); }
  }

  async function play(sample: Sample) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError("");
    const controller = new AbortController(); request.current = controller;
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await apiFetch(`${base}/${sample.id}/audio`, { signal: controller.signal });
      if (!response.ok) throw new Error("Sample audio is unavailable.");
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      audio.current?.pause(); if (url.current) URL.revokeObjectURL(url.current);
      url.current = URL.createObjectURL(blob);
      if (audio.current) { audio.current.src = url.current; await audio.current.play(); }
      setStatus(sample.name);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not play this sample."); }
    finally { clearTimeout(timer); pending.current = false; setBusy(false); }
  }

  return <details className="border-y border-neutral-700 py-3">
    <summary className="cursor-pointer text-sm font-medium">Samples and instruments ({samples.length}/16)</summary>
    <div className="mt-3 space-y-3 text-sm">
      <label className="block">Sample audio (0.02-10 seconds, up to 12 MB)
        <input ref={input} type="file" accept=".wav,.aif,.aiff,.mp3,.flac,.ogg,.m4a" disabled={busy || samples.length >= 16}
          className="mt-2 block w-full min-w-0 text-sm" onChange={e => { setFile(e.target.files?.[0] || null); setRights(false); setError(""); }} /></label>
      <label className="flex items-start gap-2"><input type="checkbox" checked={rights} disabled={busy} onChange={e => setRights(e.target.checked)} />
        I have permission to upload and reuse this sample.</label>
      <button type="button" disabled={busy || !file || !rights || samples.length >= 16} onClick={() => void upload()}
        className="inline-flex items-center gap-2 rounded border border-neutral-600 px-3 py-2 disabled:opacity-40"><Upload size={16} />Upload sample</button>
      <ul className="space-y-2">{samples.map(sample => <li key={sample.id} className="flex items-center gap-3">
        <button type="button" title={`Listen to ${sample.name}`} aria-label={`Listen to ${sample.name}`} disabled={busy} onClick={() => void play(sample)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-neutral-600 disabled:opacity-40"><Play size={16} /></button>
        <span className="min-w-0 break-words">{sample.name}<span className="block text-xs text-neutral-400">{sample.duration_seconds.toFixed(2)}s / peak {sample.peak_dbfs} dBFS</span></span>
      </li>)}</ul>
      <audio ref={audio} controls preload="none" className="w-full min-w-0" aria-label="Sample audition"
        onPlay={e => document.querySelectorAll("audio").forEach(player => { if (player !== e.currentTarget) player.pause(); })} />
      {status && <p role="status" className="break-words text-neutral-300">{status}</p>}
      {error && <p role="alert" className="text-red-300">{error}</p>}
    </div>
  </details>;
}
