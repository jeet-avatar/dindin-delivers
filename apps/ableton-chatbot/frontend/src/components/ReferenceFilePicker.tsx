"use client";

import type { RefObject } from "react";

export default function ReferenceFilePicker({ inputRef, name, disabled, onChange }: {
  inputRef: RefObject<HTMLInputElement | null>; name?: string | null; disabled: boolean;
  onChange: (file: File | null) => void;
}) {
  return <div className="mt-2 flex min-w-0 items-center gap-3 rounded border border-neutral-600 bg-neutral-900 p-2">
    <input ref={inputRef} type="file" aria-label="Reference audio file" accept=".wav,.aif,.aiff,.mp3,.m4a,.flac,.ogg"
      disabled={disabled} onChange={event => onChange(event.target.files?.[0] || null)} className="sr-only" />
    <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()}
      className="shrink-0 rounded bg-emerald-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-40">{name ? "Change file" : "Choose file"}</button>
    <span role="status" aria-label="Selected reference file" className="min-w-0 break-all text-sm">{name || "No file selected"}</span>
  </div>;
}
