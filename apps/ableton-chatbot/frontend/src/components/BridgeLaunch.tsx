"use client";

import { useEffect, useState } from "react";
import { BoltIcon, AlertTriangleIcon } from "./Icons";

export default function BridgeLaunch() {
  const [state, setState] = useState<"idle" | "requested" | "waiting">("idle");
  useEffect(() => {
    if (state !== "requested") return;
    const timer = setTimeout(() => setState("waiting"), 15000);
    return () => clearTimeout(timer);
  }, [state]);
  return <section aria-label="Bridge connection" className="mx-3 sm:mx-6 mt-4 shrink-0 border rounded p-3 space-y-3" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
    <div className="flex items-start gap-2 text-amber-200"><span className="shrink-0"><AlertTriangleIcon size={16} /></span>
      <p role="status" className="min-w-0 text-sm break-words">{state === "idle" ? "Ableton bridge offline" : state === "requested" ? "Open request sent. Waiting for the bridge to connect..." : "No bridge connection detected. Sign in to BeatMind Bridge and keep Ableton open."}</p>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <a href="beatmind-bridge://open" onClick={() => setState("requested")}
        className="inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium" style={{ background: "var(--accent)", color: "white" }}>
        <BoltIcon size={16} /> Open BeatMind Bridge
      </a>
      <a href="/BeatMind-Bridge.dmg" download className="text-sm underline underline-offset-4">Download for Mac</a>
    </div>
    {state === "waiting" && <p className="text-xs" style={{ color: "var(--text-secondary)" }}>App did not open? Install the latest Mac bridge, then try again.</p>}
  </section>;
}
