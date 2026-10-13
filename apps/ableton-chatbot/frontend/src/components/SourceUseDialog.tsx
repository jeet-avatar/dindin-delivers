"use client";

import { useEffect, useRef, useState } from "react";

export type SourceUse = { rights_confirmed: true; intended_use: "private" | "publication" };

export default function SourceUseDialog({ name, onCancel, onConfirm }: {
  name: string; onCancel: () => void; onConfirm: (consent: SourceUse) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [use, setUse] = useState<SourceUse["intended_use"]>("private");
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal();
    return () => { element?.close(); if (opener?.isConnected) opener.focus(); };
  }, []);
  return <dialog ref={dialog} aria-labelledby="source-use-title" onCancel={onCancel}
    className="m-auto w-[calc(100%-2rem)] max-w-md max-h-[90dvh] overflow-y-auto rounded-lg border p-6 backdrop:bg-black/60"
    style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", borderColor: "var(--border)" }}>
    <form onSubmit={event => { event.preventDefault(); if (confirmed) onConfirm({ rights_confirmed: true, intended_use: use }); }} className="space-y-4 text-sm">
      <h3 id="source-use-title" className="text-base font-semibold">Use reference audio in Ableton</h3>
      <p className="break-words">{name}</p>
      <fieldset className="space-y-2">
        <legend className="mb-2 font-medium">Intended use</legend>
        {([['private', 'Private project only'], ['publication', 'Publication or distribution']] as const).map(([value, label]) =>
          <label key={value} className="flex items-center gap-2">
            <input type="radio" name="source-use" value={value} checked={use === value}
              onChange={() => { setUse(value); setConfirmed(false); }} />{label}
          </label>)}
      </fieldset>
      <label className="flex items-start gap-2">
        <input type="checkbox" className="mt-1 shrink-0" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />
        <span>I have the rights needed to reuse this recording and composition for the selected use.</span>
      </label>
      <p style={{ color: "var(--text-secondary)" }}>Upload permission and stem separation do not grant remix or distribution rights. Private use is not automatic legal clearance. BeatMind does not verify licences or publish this audio.</p>
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" autoFocus onClick={onCancel} className="rounded border px-4 py-2">Cancel</button>
        <button type="submit" disabled={!confirmed} className="rounded bg-emerald-700 px-4 py-2 text-white disabled:opacity-40">Confirm and place stems</button>
      </div>
    </form>
  </dialog>;
}
