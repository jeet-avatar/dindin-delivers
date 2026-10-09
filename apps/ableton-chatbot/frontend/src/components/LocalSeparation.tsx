"use client";

import { useState } from "react";
import { Laptop } from "lucide-react";
import { apiFetch } from "@/lib/auth";

type Started = { id: string; status: string; error?: string };
const CHOICE_WAIT_MS = 11 * 60 * 1000;

// The server answers at once; the file choice on the user's computer resolves in the background.
async function waitForChoice(id: string): Promise<Started | null> {
  const deadline = Date.now() + CHOICE_WAIT_MS;
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const response = await apiFetch("/api/references");
    if (!response.ok) continue;
    const item = (await response.json()).references.find((reference: Started) => reference.id === id) as Started | undefined;
    if (!item) return null;
    if (item.status !== "choosing") return item;
  }
  throw new Error("No file choice was confirmed. Check the BeatMind Bridge on your computer.");
}

export default function LocalSeparation({ available, disabled, onStarted }: {
  available: boolean; disabled: boolean; onStarted: (reference: Started) => Promise<void>;
}) {
  const [waiting, setWaiting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function start() {
    setWaiting(true); setError(""); setMessage("");
    try {
      const response = await apiFetch("/api/references/local", { method: "POST", body: "{}" });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Separation could not start on your computer.");
      const chosen = await waitForChoice(data.id);
      if (!chosen) { setMessage("No file was chosen. Nothing was separated."); return; }
      if (chosen.status === "failed") throw new Error(chosen.error || "Separation could not start on your computer.");
      setMessage("Separating on your computer. You can keep working while it runs.");
      await onStarted(chosen);
    } catch (e) { setError(e instanceof Error ? e.message : "Separation could not start on your computer."); }
    finally { setWaiting(false); }
  }

  return <div aria-label="Separate on this computer" className="space-y-2 rounded border border-emerald-800 p-4">
    <h3 className="flex items-center gap-2 text-sm font-medium"><Laptop size={16} aria-hidden="true" />Separate on this computer <span className="text-xs font-normal text-emerald-300">Recommended</span></h3>
    <p className="text-sm text-neutral-300">Highest quality, with detailed drums: kick, snare, toms and cymbals, plus bass, vocals and other instruments.
      Your track and its stems stay on your computer; BeatMind receives only the measurements.</p>
    {available ? <>
      <button type="button" onClick={() => void start()} disabled={disabled || waiting}
        className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium disabled:opacity-40">{waiting ? "Waiting for your file choice..." : "Choose a track on this computer"}</button>
      {waiting && <p role="status" className="text-sm text-emerald-200">A file window opened on your computer, where the BeatMind Bridge is running. Choose your track there.</p>}
    </> : <p role="status" className="text-sm text-amber-200">Open the latest BeatMind Bridge on your Mac to separate tracks there.</p>}
    {message && <p role="status" className="text-sm text-emerald-200">{message}</p>}
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
  </div>;
}
