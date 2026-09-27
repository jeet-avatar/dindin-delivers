"use client";

import { useEffect, useState } from "react";
import { BoltIcon, AlertTriangleIcon, CheckIcon, RefreshIcon } from "./Icons";
import { bridgeStatusLabel, type BridgeStatus } from "@/lib/bridge-status";
import { ExternalLink, X } from "lucide-react";

export default function BridgeLaunch({ status, onRetry, ableton }: { status: BridgeStatus; onRetry: () => void;
  ableton?: { open: () => Promise<boolean>; busy: boolean; waiting: boolean; message: string; failed: boolean; cancel: () => void };
}) {
  const [state, setState] = useState<"idle" | "requested" | "waiting">("idle");
  useEffect(() => {
    if (state !== "requested") return;
    const timer = setTimeout(() => setState("waiting"), 15000);
    return () => clearTimeout(timer);
  }, [state]);
  useEffect(() => { if (status !== "disconnected") setState("idle"); }, [status]);
  const disconnected = status === "disconnected";
  const color = status === "connected" ? "#4ade80" : status === "checking" ? "var(--text-secondary)" : "#fbbf24";
  return <section aria-label="Bridge connection" className="min-w-0 shrink-0 flex flex-wrap items-center gap-x-4 gap-y-2 py-2">
    <div className="flex items-center gap-2" style={{ color }}><span className="shrink-0">{status === "connected" ? <CheckIcon size={16} /> : status === "checking" ? <RefreshIcon size={16} /> : <AlertTriangleIcon size={16} />}</span>
      <p role="status" className="min-w-0 text-sm break-words">{disconnected && state === "requested" ? "Open request sent. Waiting for the bridge to connect..." : bridgeStatusLabel[status]}</p>
      <button onClick={onRetry} title="Check bridge connection" aria-label="Check bridge connection" className="shrink-0 rounded p-2"><RefreshIcon size={16} /></button>
    </div>
    {status === "signed-out" && <a href="/login" className="text-sm underline">Sign in</a>}
    <div className="flex flex-wrap items-center gap-3">
      <a href="beatmind-bridge://open" onClick={() => { setState("requested"); onRetry(); }} aria-label="Open BeatMind Bridge" title="Open BeatMind Bridge"
        className="inline-flex items-center gap-2 rounded border border-neutral-600 px-3 py-2 text-sm font-medium">
        <BoltIcon size={16} /> Bridge
      </a>
      {ableton && <button type="button" onClick={() => void ableton.open()} disabled={ableton.busy || ableton.waiting} aria-label="Open Ableton" title="Open Ableton without changing the Live Set"
        className="inline-flex items-center gap-2 rounded border border-neutral-600 px-3 py-2 text-sm disabled:opacity-50"><ExternalLink size={16} />{ableton.busy ? "Opening..." : "Ableton"}</button>}
      {disconnected && <details className="text-sm"><summary className="cursor-pointer">Need to install the bridge?</summary>
        <a href="/BeatMind-Bridge.dmg" download className="mt-2 inline-block underline underline-offset-4">Download for Mac</a>
      </details>}
    </div>
    {ableton?.message && <div className="basis-full flex items-center gap-2"><p role={ableton.failed ? "alert" : "status"} className={`text-xs break-words ${ableton.failed ? "text-amber-200" : "text-neutral-300"}`}>{ableton.message}</p>
      {ableton.waiting && <button type="button" onClick={ableton.cancel} title="Cancel pending Ableton launch" aria-label="Cancel pending Ableton launch" className="shrink-0 p-2"><X size={16} /></button>}</div>}
    {disconnected && state === "waiting" && <p className="text-xs" style={{ color: "var(--text-secondary)" }}>No connection detected yet. Sign in to BeatMind Bridge. If the app is not installed, use the installer above.</p>}
  </section>;
}
