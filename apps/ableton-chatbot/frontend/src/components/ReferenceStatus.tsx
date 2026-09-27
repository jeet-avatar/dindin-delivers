"use client";

import { useEffect, useState } from "react";
import type { UploadProgress } from "@/lib/reference-upload";

type StatusReference = { name: string; status: string; stage?: string; created_at: string; error?: string };
const elapsed = (seconds: number) => `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60).toString().padStart(2, "0")}s`;

export default function ReferenceStatus({ reference, checkedAt, pollError, transfer, startedAt, onOpen, onListen }: {
  reference: StatusReference; checkedAt: number | null; pollError?: string;
  transfer?: UploadProgress | null; startedAt?: number;
  onOpen?: () => void; onListen?: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const tick = () => { if (document.visibilityState === "visible") setNow(Date.now()); };
    const timer = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, []);
  const active = ["uploading", "processing"].includes(reference.status);
  const age = checkedAt ? Math.max(0, Math.floor((now - checkedAt) / 1000)) : null;
  const uncertain = !transfer && active && (Boolean(pollError) || age === null || age > 30);
  const ready = reference.status === "ready";
  const failed = reference.status === "failed";
  const measuring = reference.stage === "Measuring tempo, tonal centre and energy changes";
  const decoding = reference.stage === "Decoding audio" || reference.stage === "Validating audio";
  const step = ready ? 4 : reference.status === "uploading" ? 0 : measuring ? 2 : 1;
  const title = transfer ? transfer.sent ? "Confirming upload" : "Uploading audio"
    : failed ? "Processing failed" : uncertain ? "Current status not confirmed" : ready ? "Ready to listen"
    : reference.status === "uploading" ? "Upload in progress" : measuring ? "Analyzing your track" : decoding ? "Preparing your audio" : "Separating stems";
  const seconds = Math.max(0, Math.floor((now - (startedAt || Date.parse(reference.created_at) || now)) / 1000));
  const percent = transfer ? Math.min(100, Math.floor(transfer.loaded / Math.max(1, transfer.total) * 100)) : null;
  return <div aria-label={`Reference status: ${reference.name}`} className={`min-w-0 border-l-4 pl-4 py-2 space-y-3 ${failed ? "border-red-400" : ready ? "border-emerald-400" : "border-amber-300"}`}>
    <div role="status" aria-live="polite" aria-atomic="true">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm break-words text-neutral-300">{reference.name}</p>
    </div>
    {transfer ? <>
      <progress aria-label="Audio upload progress" max={transfer.total || 1} value={transfer.loaded} className="block w-full h-2 accent-emerald-400" />
      <p className="text-sm">{percent}% sent / {(transfer.loaded / 1048576).toFixed(1)} / {(transfer.total / 1048576).toFixed(1)} MB</p>
      <p className="text-sm text-neutral-300">{transfer.sent ? "Bytes sent. Waiting for the server to confirm the upload; analysis has not been confirmed yet." : "Sending your file. Keep this tab open until the upload is confirmed."}</p>
    </> : failed ? <p role="alert" className="text-sm text-red-300">{reference.error || "Analysis could not finish. Your other references are unchanged."}</p>
      : uncertain ? <p className="text-sm text-amber-200">{pollError || "The server has not confirmed this status recently. Reconnecting automatically."} Last known stage: {reference.stage || reference.status}. Do not upload another copy.</p>
      : ready ? <p className="text-sm text-emerald-200">Upload and analysis complete. Your audio and estimated stems are saved. No need to upload again.</p>
      : <p className="text-sm text-neutral-300">{reference.status === "uploading" ? "The server is receiving the file. Analysis has not started." : measuring ? "Stem separation is complete. Measuring tempo, tonal content and energy changes." : "Upload confirmed. Estimating drums, bass, vocals and other stems. This can take several minutes; progress within this stage is not reported."}</p>}
    {!failed && <ol aria-label="Reference processing steps" className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
      {["Upload", "Separate stems", "Analyze", "Ready"].map((label, index) => <li key={label} className={`border-t-2 pt-2 ${index < step ? "border-emerald-400 text-emerald-300" : index === step && !uncertain ? "border-amber-300 text-white" : "border-neutral-700 text-neutral-400"}`}>
        <span className="block">{index + 1}. {label}</span>
        <span>{index < step ? "Done" : index === step ? uncertain ? "Last known stage" : "In progress" : "Pending"}</span>
      </li>)}
    </ol>}
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400">
      {active && <span>Elapsed: {elapsed(seconds)}</span>}
      {!transfer && <span>{age === null ? "Waiting for a server check" : `Server checked ${age === 0 ? "just now" : `${age}s ago`}`}</span>}
    </div>
    {onOpen && <button type="button" onClick={onOpen} className="text-sm underline">{ready ? "Open ready reference" : failed ? "Review failed reference" : "Open processing reference"}</button>}
    {ready && onListen && <button type="button" onClick={onListen} className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white">Listen to stems</button>}
  </div>;
}
