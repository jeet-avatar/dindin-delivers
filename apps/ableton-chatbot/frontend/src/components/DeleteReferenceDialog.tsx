"use client";

import { useEffect } from "react";

// What deleting does differs by where the stems were separated, so say exactly what is kept.
export function DeleteReferenceDialog({ name, local, busy, onCancel, onConfirm }: {
  name: string; local: boolean; busy: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="delete-reference-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !busy && onCancel()}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-2xl border p-6"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
        <h3 id="delete-reference-title" className="text-base font-semibold break-words">Delete “{name}”?</h3>
        {local ? (
          <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
            BeatMind forgets this reference and its analysis. <strong style={{ color: "var(--text-primary)" }}>The stem
            files on your computer stay where they are</strong>, and anything already in Ableton is untouched.
          </p>
        ) : (
          <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
            This permanently deletes the stems and analysis stored by BeatMind and frees one of your five upload
            slots. Stems you already sent to Ableton stay in your Live set. <strong style={{ color: "var(--text-primary)" }}>This
            can&apos;t be undone.</strong>
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={busy}
            className="rounded-lg border px-4 py-2 text-sm" style={{ borderColor: "var(--border)" }}>Cancel</button>
          <button type="button" onClick={onConfirm} disabled={busy} autoFocus
            className="rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
            style={{ background: "var(--error)", color: "var(--on-accent)" }}>
            {busy ? "Deleting…" : "Delete reference"}
          </button>
        </div>
      </div>
    </div>
  );
}
