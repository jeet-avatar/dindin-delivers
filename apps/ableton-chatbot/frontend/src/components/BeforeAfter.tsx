"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/auth";

type Side = "before" | "after";

async function audioUrl(id: string, signal: AbortSignal) {
  const response = await apiFetch(`/api/recordings/${id}/audio`, { signal });
  if (!response.ok) throw new Error("Recording could not be loaded.");
  return URL.createObjectURL(await response.blob());
}

/** Plays the previous and the new preview of a part at matched loudness, so a chain is judged by tone, not volume. */
export default function BeforeAfter({ beforeId, afterId, afterRms }: { beforeId: string; afterId: string; afterRms?: number }) {
  const [urls, setUrls] = useState<Record<Side, string>>({ before: "", after: "" });
  const [beforeRms, setBeforeRms] = useState<number | undefined>();
  const [playing, setPlaying] = useState<Side | null>(null);
  const [error, setError] = useState("");
  const players = { before: useRef<HTMLAudioElement>(null), after: useRef<HTMLAudioElement>(null) };

  useEffect(() => {
    const controller = new AbortController();
    const made: string[] = [];
    Promise.all([audioUrl(beforeId, controller.signal), audioUrl(afterId, controller.signal),
      apiFetch(`/api/recordings/${beforeId}`, { signal: controller.signal }).then(r => r.ok ? r.json() : null)])
      .then(([before, after, meta]) => {
        made.push(before, after);
        setUrls({ before, after });
        setBeforeRms(meta?.metrics?.rms_dbfs);
      }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Comparison unavailable."); });
    return () => { controller.abort(); made.forEach(url => URL.revokeObjectURL(url)); };
  }, [beforeId, afterId]);

  // Turn the louder version down by the measured RMS difference.
  const difference = beforeRms != null && afterRms != null ? afterRms - beforeRms : 0;
  const volume = (side: Side) => {
    const louder = difference > 0 ? "after" : "before";
    return side === louder ? Math.pow(10, -Math.abs(difference) / 20) : 1;
  };

  async function play(side: Side) {
    const other = side === "before" ? "after" : "before";
    players[other].current?.pause();
    const player = players[side].current;
    if (!player) return;
    player.volume = volume(side);
    player.currentTime = 0;
    try { await player.play(); setPlaying(side); } catch { setError("Playback was blocked by the browser. Press play again."); }
  }

  if (error) return <p className="text-xs mt-2 text-amber-200">{error}</p>;
  if (!urls.before || !urls.after) return <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>Loading before and after...</p>;
  return <div aria-label="Before and after" className="mt-3 flex flex-wrap items-center gap-2 text-sm">
    {(["before", "after"] as Side[]).map(side => <button key={side} type="button" onClick={() => void play(side)}
      aria-pressed={playing === side} className="rounded border px-3 py-1" style={{ borderColor: "var(--border)" }}>
      {playing === side ? "Playing " : "Play "}{side}</button>)}
    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
      {Math.abs(difference) >= 0.5 ? `Matched loudness: the ${difference > 0 ? "after" : "before"} version is turned down ${Math.abs(difference).toFixed(1)} dB.` : "Both versions are at similar loudness."}
    </span>
    {(["before", "after"] as Side[]).map(side => <audio key={side} ref={players[side]} src={urls[side]} preload="auto"
      onEnded={() => setPlaying(null)} className="hidden" />)}
  </div>;
}
