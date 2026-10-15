"use client";

import { useEffect, useState } from "react";
import { BoltIcon, AlertTriangleIcon, CheckIcon, RefreshIcon } from "./Icons";
import { bridgeStatusLabel, type BridgeStatus } from "@/lib/bridge-status";
import { bridgeVersionMessage } from "@/lib/bridge-version";
import { ExternalLink, X } from "lucide-react";

export default function BridgeLaunch({ status, version, onRetry, ableton, compact = false }: { status: BridgeStatus; version?: string | null; onRetry: () => void; compact?: boolean;
  ableton?: { open: () => Promise<boolean>; busy: boolean; waiting: boolean; message: string; failed: boolean; cancel: () => void };
}) {
  const [state, setState] = useState<"idle" | "requested" | "waiting">("idle");
  useEffect(() => {
    if (state !== "requested") return;
    const timer = setTimeout(() => setState("waiting"), 15000);
    return () => clearTimeout(timer);
  }, [state]);
  useEffect(() => { if (status !== "disconnected") setState("idle"); }, [status]);
  const [latest, setLatest] = useState<string | null>(null);
  const [versionCheckFailed, setVersionCheckFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setVersionCheckFailed(false);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    void fetch("/bridge/latest.json", { signal: controller.signal, cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("Latest release unavailable");
      const release = await response.json();
      if (typeof release.version !== "string") throw new Error("Release version missing");
      if (!controller.signal.aborted) setLatest(release.version);
    }).catch(() => { if (active) setVersionCheckFailed(true); })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; controller.abort(); clearTimeout(timeout); };
  }, [version]);
  const disconnected = status === "disconnected";
  const color = status === "connected" ? "var(--success)" : status === "checking" ? "var(--text-secondary)" : "var(--warning)";
  const versionNotice = status === "connected" && <p role="status" aria-label="Installed Bridge version" className="basis-full text-xs break-words" style={{ color: "var(--text-secondary)" }}>
    {versionCheckFailed && version ? `Running Bridge ${version}. Latest release could not be checked; update is not yet confirmed.` : bridgeVersionMessage(version, latest)}
  </p>;
  const installHelp = disconnected && <details className="text-xs"><summary className="cursor-pointer">Need to install the bridge?</summary>
    <a href="/BeatMind-Bridge.dmg" download className="mt-2 inline-block underline underline-offset-4">Download for Mac</a>
  </details>;
  return <section aria-label="Bridge connection" className={`min-w-0 shrink-0 flex flex-wrap items-center gap-y-1 py-2 ${compact ? "gap-x-2" : "gap-x-4"}`}>
    <div className={`flex items-center gap-2 ${compact ? "min-w-0 flex-1" : ""}`} style={{ color }}><span className="shrink-0">{status === "connected" ? <CheckIcon size={16} /> : status === "checking" ? <RefreshIcon size={16} /> : <AlertTriangleIcon size={16} />}</span>
      <p role="status" className={`min-w-0 break-words ${compact ? "text-xs" : "text-sm"}`}>{disconnected && state === "requested" ? "Open request sent. Waiting for the bridge to connect..." : bridgeStatusLabel[status]}</p>
      <button onClick={onRetry} title="Check bridge connection" aria-label="Check bridge connection" className="shrink-0 rounded p-2"><RefreshIcon size={16} /></button>
    </div>
    {!compact && versionNotice}
    {status === "signed-out" && <a href="/login" className="text-sm underline">Sign in</a>}
    <div className={`flex items-center ${compact ? "shrink-0 gap-1" : "flex-wrap gap-3"}`}>
      <a href="beatmind-bridge://open" onClick={() => { setState("requested"); onRetry(); }} aria-label="Open BeatMind Bridge" title="Open BeatMind Bridge"
        className={`inline-flex items-center justify-center gap-2 rounded border border-neutral-600 text-sm font-medium ${compact ? "w-9 h-9" : "px-3 py-2"}`}>
        <BoltIcon size={16} />{!compact && " Bridge"}
      </a>
      {ableton && <button type="button" onClick={() => void ableton.open()} disabled={ableton.busy || ableton.waiting} aria-label="Open Ableton" title="Open Ableton without changing the Live Set"
        className={`inline-flex items-center justify-center gap-2 rounded border border-neutral-600 text-sm disabled:opacity-50 ${compact ? "w-9 h-9" : "px-3 py-2"}`}><ExternalLink size={16} />{!compact && (ableton.busy ? "Opening..." : "Ableton")}</button>}
      {!compact && installHelp}
    </div>
    {compact && status === "connected" && <details className="basis-full text-xs"><summary className="cursor-pointer">Connection details</summary>{versionNotice}</details>}
    {compact && disconnected && <div className="basis-full">{installHelp}</div>}
    {ableton?.message && <div className="basis-full flex items-center gap-2"><p role={ableton.failed ? "alert" : "status"} className={`text-xs break-words ${ableton.failed ? "text-amber-200" : "text-neutral-300"}`}>{ableton.message}</p>
      {ableton.waiting && <button type="button" onClick={ableton.cancel} title="Cancel pending Ableton launch" aria-label="Cancel pending Ableton launch" className="shrink-0 p-2"><X size={16} /></button>}</div>}
    {disconnected && state === "waiting" && <p className="text-xs" style={{ color: "var(--text-secondary)" }}>No connection detected yet. Sign in to BeatMind Bridge. If the app is not installed, use the installer above.</p>}
  </section>;
}
