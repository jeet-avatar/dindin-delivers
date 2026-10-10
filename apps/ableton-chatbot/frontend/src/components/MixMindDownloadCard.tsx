"use client";

import Link from "next/link";
import { useMixMindDownload } from "@/lib/use-mixmind-download";

export function MixMindDownloadCard() {
  const { download, downloading, error } = useMixMindDownload("/download");

  return (
    <div className="mt-8 rounded-2xl border p-8" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
      <h2 className="text-xl font-semibold">MixMind for Rekordbox</h2>
      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
        macOS (Apple Silicon) &middot; Requires Rekordbox 6 or 7 &middot; Sign in with a plan that includes MixMind
      </p>
      <button type="button" onClick={download} disabled={downloading}
        className="mt-6 inline-flex items-center gap-2 rounded-lg px-6 py-3 text-lg font-semibold disabled:opacity-60"
        style={{ background: "var(--cool)", color: "var(--on-accent)" }}>
        {downloading ? "Preparing download…" : "Download MixMind (.dmg)"}
      </button>
      {error && <p role="alert" className="mt-3 text-sm" style={{ color: "var(--error-text)" }}>{error}</p>}
      <p className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
        Signed and notarized by Apple. <Link href="/mixmind" className="underline underline-offset-4">What MixMind does</Link>
      </p>
    </div>
  );
}
