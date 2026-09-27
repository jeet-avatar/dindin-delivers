"use client";

import { useState } from "react";
import { FolderOpen, Music } from "lucide-react";
import { apiFetch } from "@/lib/auth";

export default function LocalStemActions({ id, folder, status, refresh }: {
  id: string; folder?: string; status: string; refresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function post(path: string, body: object, done: (result: { summary?: string; folder?: string }) => string) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await apiFetch(`/api/references/${id}/${path}`, { method: "POST", body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.detail === "string" ? result.detail : "The Bridge could not complete this.");
      setNotice(done(result));
    } catch (e) { setError(e instanceof Error ? e.message : "The Bridge could not complete this."); }
    finally { setBusy(false); }
  }

  return <div aria-label="Stems on this computer" className="space-y-2 rounded border border-neutral-700 p-3 text-sm">
    <p>Stems are saved on your computer{folder ? <>: <span className="break-all text-neutral-300">{folder}</span></> : "."}</p>
    {status === "ready" ? <div className="flex flex-wrap gap-2">
      <button type="button" disabled={busy} onClick={() => void post("local-open", { action: "finder" }, () => "Opened the stems folder on your computer.")}
        className="inline-flex items-center gap-2 rounded border border-neutral-600 px-3 py-2 disabled:opacity-40"><FolderOpen size={16} aria-hidden="true" />Show stems in Finder</button>
      <button type="button" disabled={busy} onClick={() => void post("local-open", { action: "ableton" }, result => result.summary || "Stems placed in Ableton.")}
        className="inline-flex items-center gap-2 rounded bg-emerald-700 px-3 py-2 disabled:opacity-40"><Music size={16} aria-hidden="true" />Place stems in Ableton</button>
    </div> : status === "processing" && <button type="button" disabled={busy}
      onClick={() => void post("local-cancel", {}, () => "Separation was cancelled on your computer.").then(() => refresh().catch(() => undefined))}
      className="rounded border border-neutral-600 px-3 py-2 disabled:opacity-40">Cancel separation</button>}
    <p className="text-xs text-neutral-400">Placing stems adds new audio tracks aligned at the start of the Arrangement. Listen in Ableton or Finder; this audio is not uploaded.</p>
    {notice && <p role="status" className="text-emerald-200">{notice}</p>}
    {error && <p role="alert" className="text-red-300">{error}</p>}
  </div>;
}
