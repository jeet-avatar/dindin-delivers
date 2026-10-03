"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/auth";
import { liveSetMessage } from "@/lib/live-set-status";
import type { SongAllowance } from "@/lib/billing";

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
  const [allowance, setAllowance] = useState<SongAllowance | null>(null);
  const [consent, setConsent] = useState(false);
  const [sameSong, setSameSong] = useState(false);
  const [diagnostics, setDiagnostics] = useState<unknown>(null);
  const inspectedSession = useRef<string | null>(null);
  // A new set replaces what is open in Ableton, so the user must first save it or choose to close it.
  const [current, setCurrent] = useState<"saved" | "close" | null>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    let current = true;
    void apiFetch(`/api/chats/${sessionId}/allowance`).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Song allowance is unavailable. Close and retry.");
      if (current) setAllowance(data);
    }).catch(error => { if (current) { setError(true); setSummary(error.message); } });
    return () => { current = false; };
  }, [sessionId]);

  const step = useCallback(async (operation: string) => {
    setBusy(true); setError(false); setReady(false); setTitle(""); setTracks([]); setDiagnostics(null);
    setSummary(operation === "inspect" ? "Checking your open Live Set..." : "Waiting for Ableton...");
    try {
      const response = await apiFetch("/api/live-set", { method: "POST", body: JSON.stringify({ operation, session_id: sessionId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || "Live Set setup is unavailable.");
      const failed = ["failed", "unverified"].includes(result.status);
      setSummary(result.summary); setError(failed); setDiagnostics(result.diagnostics || null);
      if (operation === "save" && !failed) setCurrent("saved");
      if (operation === "inspect") {
        setReady(result.new_set_ready === true); setTitle(result.title || ""); setTracks(result.tracks || []);
      }
    } catch (error) { setError(true); setSummary(error instanceof Error ? error.message : "Live Set setup failed."); }
    finally { setBusy(false); }
  }, [sessionId]);

  useEffect(() => {
    if (inspectedSession.current === sessionId) return;
    inspectedSession.current = sessionId;
    void step("inspect");
  }, [sessionId, step]);

  async function start(fresh: boolean) {
    setBusy(true);
    try {
      const response = await apiFetch("/api/live-set", { method: "POST", body: JSON.stringify({ operation: fresh ? "confirm_new" : "confirm_current", session_id: sessionId, authorize_song: consent, same_song: sameSong }) });
      const result = await response.json();
      if (!response.ok || !result.project) throw new Error(result.detail || result.summary || "The set is no longer confirmed. Check Ableton again.");
      onReady(result.project);
    } catch (error) { setReady(false); setError(true); setSummary(error instanceof Error ? error.message : "New set check failed."); }
    finally { setBusy(false); }
  }

  const button = "rounded border px-3 py-2 text-sm disabled:opacity-40";
  const retargeted = allowance?.started && allowance.live_title !== title;
  const canConfirm = allowance && (allowance.started || allowance.remaining > 0)
    && (allowance.authorized || consent) && (!retargeted || sameSong);
  return <dialog ref={dialog} onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}
    aria-labelledby="song-setup-title" className="fixed m-auto w-[calc(100%_-_2rem)] max-w-lg max-h-[90dvh] overflow-y-auto rounded-lg border p-5 backdrop:bg-black/70"
    style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
    <h2 id="song-setup-title" className="text-lg font-semibold">Choose Live Set</h2>
    <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
      <h3 className="text-sm font-semibold">Current Live Set</h3>
      {summary && <p role={error ? "alert" : "status"} className={`text-sm mt-3 ${error ? "text-red-300" : "text-emerald-200"}`}>{liveSetMessage(summary)}</p>}
      {(liveSetMessage(summary) !== summary || !!diagnostics) && <details className="mt-2 text-xs break-words"><summary>Technical details</summary>
        {summary}<pre className="whitespace-pre-wrap">{diagnostics ? JSON.stringify(diagnostics, null, 2) : ""}</pre>
      </details>}
      {title && <p className="text-sm mt-2 break-words">{title}</p>}
      {!!tracks.length && <details className="text-xs mt-2"><summary>Tracks in this set ({tracks.length})</summary>
        <ol className="mt-2 space-y-1">{tracks.map((track, i) => <li key={i}>{i + 1}. {track}</li>)}</ol></details>}
      <div className="mt-3 space-y-2 text-sm" aria-label="Song allowance">
        {!allowance ? <p role="status">Checking song allowance...</p> : <>
          <p>{allowance.used} of {allowance.included} new songs used {allowance.period === "trial" ? "in this trial" : "this month (UTC)"}.</p>
          {allowance.started ? <p>This song is already counted. Continuing it does not use another song credit.</p>
            : allowance.remaining === 0 ? <p role="alert">No new songs remaining. Continue an existing song or upgrade in Account. Saving, archiving and deleting do not restore credits.</p>
            : <label className="flex items-start gap-2"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-1" />
              <span>I agree to use one song credit when production starts. Planning is not charged. Saving, archiving or deleting will not restore it.</span></label>}
          {retargeted && <label className="flex items-start gap-2"><input type="checkbox" checked={sameSong} onChange={event => setSameSong(event.target.checked)} className="mt-1" />
            <span>This is the same composition, renamed or saved elsewhere. For a different composition, I must start a new song chat.</span></label>}
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Each chat is one song, including its instruments and revisions. Monthly AI usage limits also apply. Failed or interrupted production may have changed Ableton and does not automatically refund a song.</p>
        </>}
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <button disabled={busy || !title || error || !canConfirm} onClick={() => start(false)} className={button}
          style={{ background: "var(--accent)", color: "white" }}>Use this Live Set</button>
        <button disabled={busy} onClick={() => step("inspect")} className={button}>{error ? "Retry inspection" : "Check again"}</button>
        <button disabled={busy} onClick={() => step("activate")} className={button}>Open Ableton</button>
      </div>
    </div>
    <details className="mt-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
      <summary className="text-sm font-semibold cursor-pointer">Start a new Live Set instead</summary>
      <div className="flex flex-wrap gap-2 mt-3">
        <button disabled={busy} onClick={() => step("save")} className={button}>1. Save current set</button>
        <button disabled={busy} onClick={() => setCurrent("close")} aria-pressed={current === "close"} className={button}>1. Close it without saving</button>
        <button disabled={busy || !current} onClick={() => step("new")} className={button}>2. Open new Live Set</button>
        <button disabled={busy} onClick={() => step("inspect")} className={button}>3. Inspect open set</button>
      </div>
      <p className="text-xs mt-3" style={{ color: "var(--text-secondary)" }}>
        {current === null && "First save the set that is open in Ableton, or choose to close it. "}
        {current === "saved" && "Save requested. Complete any save prompt in Ableton. "}
        {current === "close" && "When Ableton asks to save, choose Don't Save. "}
        Existing chats and sound reviews stay saved. Any save-location prompt must be completed in Ableton.</p>
      <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
        A new Live Set starts from your Ableton default set. For a clean BeatMind layout, set up the BeatMind Starter template from Downloads first.</p>
      <button disabled={busy || !ready || !canConfirm || allowance?.started} onClick={() => start(true)}
        className={`${button} mt-3`} style={{ background: "var(--accent)", color: "white" }}>Use this new set</button>
    </details>
    <div className="flex flex-wrap justify-between gap-2 mt-5 border-t pt-4" style={{ borderColor: "var(--border)" }}>
      <button disabled={busy} onClick={onCancel} className={button}>Cancel</button>
    </div>
  </dialog>;
}
