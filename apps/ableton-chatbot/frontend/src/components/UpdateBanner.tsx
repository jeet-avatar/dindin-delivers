"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/auth";
import { newerVersion, updateNotice, type UpdateNotice } from "@/lib/update-check";

const CHECK_MS = 10 * 60 * 1000;
const FIRST_VISIBLE_UPDATER = "1.3.1";
const BUILT_COMMIT = process.env.NEXT_PUBLIC_RELEASE_COMMIT;

async function json(request: Promise<Response>): Promise<unknown> {
  const response = await request;
  return response.ok ? response.json() : null;
}

export default function UpdateBanner() {
  const [notice, setNotice] = useState<UpdateNotice>({ web: false, bridge: null });
  const [dismissed, setDismissed] = useState(false);
  const [download, setDownload] = useState("");
  const [legacy, setLegacy] = useState(false);

  useEffect(() => {
    let active = true;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const [release, latest, status] = await Promise.all([
          json(fetch("/release.json", { cache: "no-store" })),
          json(fetch("/bridge/latest.json", { cache: "no-store" })),
          json(apiFetch("/api/bridge/status")),
        ]);
        const bridge = status && typeof status === "object" ? status as { bridge_connected?: boolean; bridge_version?: string | null } : {};
        // Bridges before 1.2.0 report no version and cannot install updates themselves; 1.2.0 and 1.3.0 can,
        // but their fixed-size window hides the Install update row, so they are pointed to the download too.
        const version = bridge.bridge_connected ? bridge.bridge_version || "0" : null;
        if (!active) return;
        setNotice(updateNotice(BUILT_COMMIT, release, version, latest));
        setLegacy(version !== null && newerVersion(FIRST_VISIBLE_UPDATER, version));
        setDownload(latest && typeof latest === "object" && "url" in latest ? String(latest.url) : "");
      } catch { /* Checked again at the next interval. */ }
    };
    void check();
    const timer = setInterval(check, CHECK_MS);
    document.addEventListener("visibilitychange", check);
    return () => { active = false; clearInterval(timer); document.removeEventListener("visibilitychange", check); };
  }, []);

  if (dismissed || (!notice.web && !notice.bridge)) return null;
  return <div role="status" className="shrink-0 flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-3 sm:px-6 py-2 text-sm"
    style={{ borderColor: "var(--border)", background: "rgba(255,107,0,0.08)" }}>
    {notice.web && <span className="flex flex-wrap items-center gap-2">
      A new version of BeatMind is ready. Your Ableton set is not affected.
      <button type="button" onClick={() => window.location.reload()} className="rounded border px-2 py-1 text-xs">Reload</button>
    </span>}
    {notice.bridge && (legacy
      ? <span>BeatMind Bridge {notice.bridge} keeps you signed in and updates itself. <a href={download} className="underline">Download it</a>, then replace the old app when your song is saved.</span>
      : <span>BeatMind Bridge {notice.bridge} is available. Click Install update in the Bridge window when you are ready.</span>)}
    <button type="button" onClick={() => setDismissed(true)} className="ml-auto text-xs underline">Later</button>
  </div>;
}
