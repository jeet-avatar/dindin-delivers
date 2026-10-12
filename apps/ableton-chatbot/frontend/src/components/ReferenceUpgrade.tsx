"use client";

export default function ReferenceUpgrade({ hq = false, onUpgrade }: { hq?: boolean; onUpgrade: () => void }) {
  const name = hq ? "Cloud HQ" : "Reference tracks";
  return <section aria-label={`${name} upgrade`} className="space-y-3 rounded border border-neutral-700 p-5">
    <div aria-disabled="true" className="space-y-3 opacity-40">
      <h2 className="text-lg font-semibold">{name} · Locked</h2>
      <label className="block text-sm">Reference audio file
        <input type="file" disabled aria-label={`${name} locked audio file`} className="mt-2 block w-full rounded border border-neutral-600 p-2" />
      </label>
      <button type="button" disabled className="rounded border border-neutral-600 px-4 py-2">{hq ? "Separate with Cloud HQ" : "Add reference track"}</button>
    </div>
    <p className="text-sm text-neutral-400">{hq ? "Cloud HQ is available on Studio only." : "Reference tracks are available on Pro and Studio."}</p>
    <button type="button" onClick={onUpgrade} className="rounded bg-emerald-600 px-4 py-2 font-semibold text-white">{hq ? "Upgrade to Studio" : "Upgrade for reference tracks"}</button>
  </section>;
}
