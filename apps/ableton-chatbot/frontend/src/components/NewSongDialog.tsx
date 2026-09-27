"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/auth";

export default function NewSongDialog({ sessionId, onCancel, onReady }: {
  sessionId: string; onCancel: () => void;
  onReady: (project: { title: string; starting_point: "reference" | "idea" | null; live_set: { title: string; choice: string } | null }) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
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
      const response = await apiFetch("/api/live-set", { method: "POST", body: JSON.stringify({ operation, session_id: sessionId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || "Live Set setup is unavailable.");
      setSummary(result.summary); setError(["failed", "unverified"].includes(result.status));
      if (operation === "inspect") {
        setReady(result.new_set_ready === true); setTitle(result.title || ""); setTracks(result.tracks || []);
      }
    } catch (error) { setError(true); setSummary(error instanceof Error ? error.message : "Live Set setup failed."); }
    finally { setBusy(false); }
  }

  async function start(fresh: boolean) {
    setBusy(true);
    try {
      const response = await apiFetch("/api/live-set", { method: "POST", body: JSON.stringify({ operation: fresh ? "confirm_new" : "confirm_current", session_id: sessionId }) });
      const result = await response.json();
      if (!response.ok || !result.project) throw new Error(result.detail || result.summary || "The set is no longer confirmed. Check Ableton again.");
      onReady(result.project);
    } catch (error) { setReady(false); setError(true); setSummary(error instanceof Error ? error.message : "New set check failed."); }
    finally { setBusy(false); }
  }

  const button = "rounded border px-3 py-2 text-sm disabled:opacity-40";
  return <dialog ref={dialog} onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}
    aria-labelledby="song-setup-title" className="fixed m-auto w-[calc(100%_-_2rem)] max-w-lg max-h-[90dvh] overflow-y-auto rounded-lg border p-5 backdrop:bg-black/70"
    style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
    <h2 id="song-setup-title" className="text-lg font-semibold">Choose Live Set</h2>
    <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
      <h3 className="text-sm font-semibold">Fresh Live Set</h3>
      <div className="flex flex-wrap gap-2 mt-3">
        <button disabled={busy} onClick={() => step("activate")} className={button}>Open Ableton</button>
        <button disabled={busy} onClick={() => step("save")} className={button}>1. Save current set</button>
        <button disabled={busy} onClick={() => step("new")} className={button}>2. Open new Live Set</button>
        <button disabled={busy} onClick={() => step("inspect")} className={button}>3. Inspect open set</button>
      </div>
      <p className="text-xs mt-3" style={{ color: "var(--text-secondary)" }}>Existing chats and sound reviews stay saved. Any save-location prompt must be completed in Ableton.</p>
      {summary && <p role={error ? "alert" : "status"} className={`text-sm mt-3 ${error ? "text-red-300" : "text-emerald-200"}`}>{summary}</p>}
      {title && <p className="text-sm mt-2 break-words">{title}</p>}
      {!!tracks.length && <details className="text-xs mt-2"><summary>Tracks in this set ({tracks.length})</summary>
        <ol className="mt-2 space-y-1">{tracks.map((track, i) => <li key={i}>{i + 1}. {track}</li>)}</ol></details>}
      <button disabled={busy || !ready} onClick={() => start(true)}
        className={`${button} mt-3`} style={{ background: "var(--accent)", color: "white" }}>Use this new set</button>
    </div>
    <div className="flex flex-wrap justify-between gap-2 mt-5 border-t pt-4" style={{ borderColor: "var(--border)" }}>
      <button disabled={busy} onClick={onCancel} className={button}>Cancel</button>
      <button disabled={busy || !title || error} onClick={() => start(false)} className={button}>Use inspected set instead</button>
    </div>
  </dialog>;
}
