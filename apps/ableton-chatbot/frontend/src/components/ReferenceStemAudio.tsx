"use client";

import { useEffect, useRef, useState } from "react";
import { Download, LoaderCircle, Play } from "lucide-react";
import { apiFetch } from "@/lib/auth";

export default function ReferenceStemAudio({ id, stem, name }: { id: string; stem: string; name: string }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [downloaded, setDownloaded] = useState(false);
  const objectUrl = useRef("");
  const controller = useRef<AbortController | null>(null);
  const player = useRef<HTMLAudioElement>(null);
  useEffect(() => () => { controller.current?.abort(); if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); }, []);
  async function load(download = false) {
    if (controller.current) return;
    setBusy(true); setError("");
    const request = new AbortController(); controller.current = request;
    const timeout = setTimeout(() => request.abort(), 120000);
    try {
      let audioUrl = objectUrl.current;
      if (!audioUrl) {
        const response = await apiFetch(`/api/references/${id}/audio/${stem}`, { signal: request.signal });
        if (!response.ok) throw new Error(response.status === 401 ? "Sign in again to access this stem." : `${stem} audio could not be loaded. The saved review is unchanged.`);
        const blob = await response.blob();
        if (request.signal.aborted) return;
        audioUrl = URL.createObjectURL(blob); objectUrl.current = audioUrl;
        setUrl(audioUrl);
      }
      if (download) {
        const link = document.createElement("a"); link.href = audioUrl;
        link.download = `${name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._ -]/g, "_")}-${stem}.wav`;
        document.body.appendChild(link); link.click(); link.remove(); setDownloaded(true);
      } else if (player.current) {
        if (player.current.src !== audioUrl) player.current.src = audioUrl;
        try { await player.current.play(); }
        catch { setError("Audio loaded. Playback is paused by the browser."); }
      }
    } catch (e) { setError(e instanceof Error && e.name !== "AbortError" ? e.message : "Audio loading timed out. No saved stems were changed."); }
    finally { clearTimeout(timeout); controller.current = null; setBusy(false); }
  }
  return <div className="space-y-2">
    <div className="flex items-center gap-2">
      <button type="button" aria-label={`Audition ${stem}`} title={`Audition ${stem}`} disabled={busy} onClick={() => void load()}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-neutral-600 disabled:opacity-40">{busy ? <LoaderCircle size={18} className="animate-spin" /> : <Play size={18} />}</button>
      <button type="button" aria-label={`Download ${stem} WAV`} title={`Download ${stem} WAV`} disabled={busy} onClick={() => void load(true)}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-neutral-600 disabled:opacity-40"><Download size={18} /></button>
      {busy ? <span role="status" className="text-xs text-neutral-300">Loading {stem} audio...</span> : downloaded ? <span role="status" className="text-xs text-emerald-300">WAV download started</span> : null}
    </div>
    <audio ref={player} aria-label={`${stem} stem player`} controls preload="none" src={url || undefined} hidden={!url} className="w-full min-w-0"
      onPlay={event => document.querySelectorAll("audio").forEach(other => { if (other !== event.currentTarget) other.pause(); })}
      onError={() => { if (objectUrl.current) { URL.revokeObjectURL(objectUrl.current); objectUrl.current = ""; } setUrl(""); setError("The browser could not decode this stem. Audio can be loaded again."); }} />
    {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
  </div>;
}
