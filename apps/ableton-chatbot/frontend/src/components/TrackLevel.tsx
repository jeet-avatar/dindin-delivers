"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/auth";
import type { ProductionAction } from "@/components/ProductionLog";

interface FaderMap {
  value: number; display: string; map_id: string; enabled: boolean;
  automation_state: number; state: number;
  curve: { value: number; display: string }[];
  sample_sha256: string;
}

export default function TrackLevel({ recordingId, onPreview }: {
  recordingId: string; onPreview: (actions: ProductionAction[]) => void;
}) {
  const [map, setMap] = useState<FaderMap | null>(null);
  const [selected, setSelected] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState(false);
  const [applied, setApplied] = useState(false);
  async function run(operation: "inspect" | "record") {
    setBusy(true); setNotice(""); setError(false);
    try {
      const response = await apiFetch(`/api/recordings/${recordingId}/mixer`, {
        method: "POST", body: JSON.stringify({ operation, ...(operation === "record" && map ? {
          map_id: map.map_id, expected_value: map.value, value: dirty ? map.curve[selected].value : map.value,
        } : {}) }),
      });
      const data = await response.json();
      if (!response.ok || !["observed", "verified"].includes(data.status)) throw new Error(data.detail || data.summary || "Level mapping failed.");
      if (operation === "inspect") {
        setMap(data); setApplied(false); setDirty(false);
        setSelected(data.curve.reduce((best: number, entry: { value: number }, index: number) =>
          Math.abs(entry.value - data.value) < Math.abs(data.curve[best].value - data.value) ? index : best, 0));
        setNotice("Exact loaded sample verified. Fader values read from Ableton.");
      } else {
        setMap(null); setApplied(true); setNotice("New level recorded below. The previous preview is unchanged.");
        onPreview(data.tool_calls);
      }
    } catch (error) { setMap(null); setError(true); setNotice(error instanceof Error ? error.message : "Unable to adjust level."); }
    finally { setBusy(false); }
  }
  const editable = map?.enabled && map.automation_state === 0 && map.state === 0;
  return <section aria-label="Ableton track level" className="mt-4 border-t pt-3 text-xs" style={{ borderColor: "var(--border)" }}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h4 className="font-semibold text-sm">Ableton track fader</h4>
      <button disabled={busy} onClick={() => run("inspect")} className="rounded border px-3 py-2 disabled:opacity-40">{map ? "Refresh fader" : "Map current fader"}</button>
    </div>
    {map && <div className="mt-3">
      <p>Live readback: <strong>{map.display}</strong></p>
      <label htmlFor={`fader-${recordingId}`} className="block mt-3 mb-1">Requested fader: {dirty ? map.curve[selected].display : map.display}</label>
      <input id={`fader-${recordingId}`} type="range" min={0} max={map.curve.length - 1} step={1} value={selected}
        aria-valuetext={map.curve[selected].display} disabled={busy || !editable}
        onChange={event => { setSelected(Number(event.target.value)); setDirty(true); }} className="w-full h-8" />
      <div className="flex justify-between"><span>{map.curve[0].display}</span><span>{map.curve.at(-1)?.display}</span></div>
      {!editable && <p className="mt-2 text-amber-200">Fader is automated or disabled. No override is available.</p>}
      {dirty && selected === 0 && <p className="mt-2 text-amber-200">This setting silences the track. An audible preview cannot be recorded at this level.</p>}
      <p className="mt-2" style={{ color: "var(--text-secondary)" }}>Changes the Ableton track, not just browser volume. Stop Live playback first. The existing recording will not change.</p>
      <button disabled={busy || !editable || applied} onClick={() => run("record")} className="rounded px-3 py-2 mt-3 disabled:opacity-40"
        style={{ background: "var(--accent)", color: "white" }}>Apply fader and record preview</button>
    </div>}
    {busy && <p role="status" className="mt-2">{map ? "Applying and recording in Ableton..." : "Checking current track and sample..."}</p>}
    {notice && <p role={error ? "alert" : "status"} className={`mt-2 ${error ? "text-red-300" : "text-emerald-200"}`}>{notice}</p>}
  </section>;
}
