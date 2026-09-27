"use client";

import { useEffect, useState } from "react";
import { BoltIcon, AlertTriangleIcon, CheckIcon, RefreshIcon } from "./Icons";
import { bridgeStatusLabel, type BridgeStatus } from "@/lib/bridge-status";

export default function BridgeLaunch({ status, onRetry }: { status: BridgeStatus; onRetry: () => void }) {
  const [state, setState] = useState<"idle" | "requested" | "waiting">("idle");
  useEffect(() => {
    if (state !== "requested") return;
    const timer = setTimeout(() => setState("waiting"), 15000);
    return () => clearTimeout(timer);
  }, [state]);
  useEffect(() => { if (status !== "disconnected") setState("idle"); }, [status]);
  const disconnected = status === "disconnected";
  const color = status === "connected" ? "#4ade80" : status === "checking" ? "var(--text-secondary)" : "#fbbf24";
  return <section aria-label="Bridge connection" className="min-w-0 shrink-0 py-2 space-y-3">
    <div className="flex items-center gap-2" style={{ color }}><span className="shrink-0">{status === "connected" ? <CheckIcon size={16} /> : status === "checking" ? <RefreshIcon size={16} /> : <AlertTriangleIcon size={16} />}</span>
      <p role="status" className="min-w-0 text-sm break-words">{disconnected && state === "requested" ? "Open request sent. Waiting for the bridge to connect..." : bridgeStatusLabel[status]}</p>
      {status === "unavailable" && <button onClick={onRetry} title="Check bridge connection" aria-label="Check bridge connection" className="shrink-0 rounded p-2"><RefreshIcon size={16} /></button>}
    </div>
    {status === "signed-out" && <a href="/login" className="text-sm underline">Sign in</a>}
    {disconnected && <div className="flex flex-wrap items-center gap-3">
      <a href="beatmind-bridge://open" onClick={() => setState("requested")}
        className="inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium" style={{ background: "var(--accent)", color: "#0a0a0a" }}>
        <BoltIcon size={16} /> Open BeatMind Bridge
      </a>
      <details className="text-sm"><summary className="cursor-pointer">Need to install the bridge?</summary>
        <a href="/BeatMind-Bridge.dmg" download className="mt-2 inline-block underline underline-offset-4">Download for Mac</a>
      </details>
    </div>}
    {disconnected && state === "waiting" && <p className="text-xs" style={{ color: "var(--text-secondary)" }}>No connection detected yet. Sign in to BeatMind Bridge. If the app is not installed, use the installer above.</p>}
  </section>;
}
