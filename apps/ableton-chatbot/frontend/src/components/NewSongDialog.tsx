"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/auth";

export default function NewSongDialog({ message, onCancel, onCurrent, onNew }: {
  message: string; onCancel: () => void; onCurrent: (text: string) => void; onNew: (text: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState(message);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);
  const [title, setTitle] = useState("");
  const [tracks, setTracks] = useState<string[]>([]);
  useEffect(() => { dialog.current?.showModal(); }, []);

  async function step(operation: string) {
    setBusy(true); setError(false); setReady(false);
    try {
      const response = await apiFetch("/api/live-set", { method: "POST", body: JSON.stringify({ operation }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || "Live Set setup is unavailable.");
      setSummary(result.summary); setError(["failed", "unverified"].includes(result.status));
      if (operation === "inspect") {
        setReady(result.new_set_ready === true); setTitle(result.title || ""); setTracks(result.tracks || []);
      }
    } catch (error) { setError(true); setSummary(error instanceof Error ? error.message : "Live Set setup failed."); }
    finally { setBusy(false); }
  }

  async function start() {
    setBusy(true);
    try {
      const response = await apiFetch("/api/live-set", { method: "POST", body: JSON.stringify({ operation: "inspect" }) });
      const result = await response.json();
      if (!response.ok || result.new_set_ready !== true) throw new Error(result.summary || result.detail || "The new set is no longer confirmed. Check Ableton again.");
      onNew(text.trim());
    } catch (error) { setReady(false); setError(true); setSummary(error instanceof Error ? error.message : "New set check failed."); }
    finally { setBusy(false); }
  }

  const button = "rounded border px-3 py-2 text-sm disabled:opacity-40";
  return <dialog ref={dialog} onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}
    aria-labelledby="song-setup-title" className="fixed m-auto w-[calc(100%_-_2rem)] max-w-lg max-h-[90dvh] overflow-y-auto rounded-lg border p-5 backdrop:bg-black/70"
    style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
    <h2 id="song-setup-title" className="text-lg font-semibold">Start a new song</h2>
    <label htmlFor="song-brief" className="block text-xs mt-4 mb-1">Song request</label>
    <textarea id="song-brief" value={text} onChange={event => setText(event.target.value)} rows={3}
      className="w-full rounded border p-2 text-sm" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }} />
    <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
      <h3 className="text-sm font-semibold">Fresh Live Set</h3>
      <div className="flex flex-wrap gap-2 mt-3">
        <button disabled={busy} onClick={() => step("activate")} className={button}>Open Ableton</button>
        <button disabled={busy} onClick={() => step("save")} className={button}>1. Save current set</button>
        <button disabled={busy} onClick={() => step("new")} className={button}>2. Open new Live Set</button>
        <button disabled={busy} onClick={() => step("inspect")} className={button}>3. Check new set</button>
      </div>
      <p className="text-xs mt-3" style={{ color: "var(--text-secondary)" }}>Existing chats and sound reviews stay saved. Any save-location prompt must be completed in Ableton.</p>
      {summary && <p role={error ? "alert" : "status"} className={`text-sm mt-3 ${error ? "text-red-300" : "text-emerald-200"}`}>{summary}</p>}
      {title && <p className="text-sm mt-2 break-words">{title}</p>}
      {!!tracks.length && <details className="text-xs mt-2"><summary>Tracks in this set ({tracks.length})</summary>
        <ol className="mt-2 space-y-1">{tracks.map((track, i) => <li key={i}>{i + 1}. {track}</li>)}</ol></details>}
      <button disabled={busy || !ready || !text.trim()} onClick={start}
        className={`${button} mt-3`} style={{ background: "var(--accent)", color: "white" }}>Start song in new set</button>
    </div>
    <div className="flex flex-wrap justify-between gap-2 mt-5 border-t pt-4" style={{ borderColor: "var(--border)" }}>
      <button disabled={busy} onClick={onCancel} className={button}>Cancel</button>
      <button disabled={busy || !text.trim()} onClick={() => onCurrent(text.trim())} className={button}>Use current set instead</button>
    </div>
  </dialog>;
}
