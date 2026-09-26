"use client";

import { actionLabel, summarizeProduction, trackOutcomes } from "@/lib/production-status";
import ChatTimestamp from "@/components/ChatTimestamp";

export interface MidiNote {
  pitch: number;
  start: number;
  duration: number;
  velocity: number;
  muted?: boolean;
}

interface ExecutionStep {
  number: number;
  address: string;
  args: unknown[];
  kind: string;
  status: string;
  elapsed_ms: number;
  result?: unknown;
  error?: string;
}

export interface ProductionAction {
  id?: string;
  startedReceivedAt?: string;
  completedReceivedAt?: string;
  tool: string;
  input: Record<string, unknown>;
  result?: {
    recording?: { id: string };
    status?: string;
    section_brief?: { name: string; sound: string; bars: number; source_mode: string; pack_name?: string; scene_candidates: number[] };
    summary?: string;
    error?: string;
    steps?: ExecutionStep[];
    notes?: MidiNote[];
    devices?: { name: string }[];
    observations?: Record<string, unknown[]>;
    missing_notes?: MidiNote[];
    unexpected_notes?: MidiNote[];
    source?: { pack_name: string; relative_path: string; sha256?: string; analysis_basis?: string };
    plan?: { title: string; genre: string; bpm: number; key: string; scope: string; assumptions: string[];
      parts: { role: string; source: string; sound: string; bars: number }[] };
    parameters?: { index: number; name: string; min: number; max: number; value: number; display?: string; enabled?: boolean; state?: number; automation_state?: number; choices?: string[] }[];
    items?: { name: string; folder: boolean; loadable: boolean }[];
    next_offset?: number | null;
    total?: number;
    sound?: {
      role: string;
      character: string;
      rhythm: string;
      mix_intent: string;
      basis: string;
      devices: string[];
      notes: MidiNote[];
    };
  };
}

function NoteTable({ notes, label = "MIDI notes" }: { notes: MidiNote[]; label?: string }) {
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-xs py-1">{notes.length} {label}</summary>
      <div className="overflow-auto max-h-64 mt-2" tabIndex={0} aria-label="MIDI note details">
        <table className="w-full text-xs text-left whitespace-nowrap">
          <thead><tr>{["Pitch", "Start (beats)", "Duration", "Velocity", "Muted"].map(label => <th key={label} className="py-2 pr-4 font-medium">{label}</th>)}</tr></thead>
          <tbody>{notes.map((note, index) => (
            <tr key={index} className="border-t" style={{ borderColor: "var(--border)" }}>
              <td className="py-1.5 pr-4">{note.pitch}</td>
              <td className="pr-4">{Number(note.start.toFixed(4))}</td>
              <td className="pr-4">{Number(note.duration.toFixed(4))}</td>
              <td className="pr-4">{note.velocity}</td>
              <td>{note.muted ? "Yes" : "No"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </details>
  );
}

export default function ProductionLog({ actions }: { actions: ProductionAction[] }) {
  if (!actions.length) return null;
  const summary = summarizeProduction(actions);
  const tracks = trackOutcomes(actions);
  const section = actions.map(action => action.result?.section_brief).filter(Boolean).at(-1);
  return (
    <section className="min-w-0 mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }} aria-label="Production actions">
      <div className="mb-3">
        <h3 className="text-sm font-semibold" style={{ color: summary.issues.length ? "#fda4af" : "var(--text-primary)" }}>{summary.title}</h3>
        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{summary.detail}</p>
        {summary.repairs > 0 && <p className="text-xs mt-2 text-emerald-300">{summary.repairs} earlier {summary.repairs === 1 ? "issue repaired" : "issues repaired"} and rechecked.</p>}
      </div>
      {section && <div aria-label="Requested section" className="text-sm mb-3 space-y-1 break-words">
        <p className="font-semibold">{section.name} / {section.bars} bars</p>
        <p className="text-xs">{section.sound}</p>
        <p className="text-xs">Source: {section.pack_name || (section.source_mode === "existing" ? "Existing sounds" : "Discover sources")}</p>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Planned section. Musical clips and audio are not yet verified.</p>
      </div>}
      {summary.issues.length > 0 && <ul className="text-sm space-y-2 mb-3" aria-label="Unresolved issues">
        {summary.issues.map(index => <li key={index} className="break-words">
          <strong>{actionLabel(actions[index].tool)}{typeof actions[index].input.track === "number" ? ` / Track ${Number(actions[index].input.track) + 1}` : ""}</strong>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{actions[index].result?.summary || "No reliable completion was recorded. Inspect Ableton before retrying."}</p>
        </li>)}
      </ul>}
      {tracks.length > 0 && <ul className="text-xs divide-y mb-3" aria-label="Part results">
        {tracks.map(track => <li key={track.track} className="py-2 min-w-0" style={{ borderColor: "var(--border)" }}>
          <p className="font-semibold break-words">{track.name}</p>
          {track.source && <p className="mt-1 break-words" style={{ color: "var(--text-secondary)" }}>Device/source: {track.source}</p>}
          <p className="mt-1" style={{ color: "var(--text-secondary)" }}>{[track.noteCount != null ? `${track.noteCount} MIDI notes ${track.notesVerified ? "checked" : "present"}` : "", track.recording ? "Recording available" : ""].filter(Boolean).join(" / ")}</p>
        </li>)}
      </ul>}
      <details className="text-xs">
        <summary className="cursor-pointer py-2" style={{ color: "var(--text-secondary)" }}>Technical history ({actions.length} actions)</summary>
      <ol className="divide-y" style={{ borderColor: "var(--border)" }}>
        {actions.map((action, index) => {
          const outcome = summary.outcomes[index];
          const state = { label: outcome.label, color: outcome.kind === "issue" ? "#fda4af" : outcome.kind === "repaired" ? "#86efac" : "var(--text-secondary)" };
          const sound = action.result?.sound;
          const notes = sound?.notes || action.result?.notes;
          return (
            <li key={action.id || index} className="py-3 min-w-0" style={{ borderColor: "var(--border)" }}>
              <details>
              <summary className="cursor-pointer text-xs break-words">
                <span className="font-medium">{index + 1}. {actionLabel(action.tool)}</span>
                <span className="ml-3" style={{ color: state.color }}>{state.label}</span>
              </summary>
              {(action.startedReceivedAt || action.completedReceivedAt) && <div className="my-2">
                <ChatTimestamp value={action.startedReceivedAt} label="Start received" />
                {action.completedReceivedAt && <ChatTimestamp value={action.completedReceivedAt} label="Result received" />}
              </div>}
              {outcome.repairedBy != null && <p className="text-xs mt-2 text-emerald-300">Rechecked in action {outcome.repairedBy + 1}. The original attempt is retained below.</p>}
              {typeof action.input.track === "number" && <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Track {action.input.track + 1}{typeof action.input.scene === "number" ? ` / Scene ${action.input.scene + 1}` : ""}</p>}
              {action.result?.summary && <p className="text-sm mt-1 break-words">{action.result.summary}</p>}
              {action.result?.section_brief && <div className="text-xs mt-2 space-y-1 break-words">
                <p><strong>Section:</strong> {action.result.section_brief.name} / {action.result.section_brief.bars} bars</p>
                <p><strong>Requested sound:</strong> {action.result.section_brief.sound}</p>
                <p><strong>Source:</strong> {action.result.section_brief.pack_name || (action.result.section_brief.source_mode === "existing" ? "Existing sounds" : "Discover sources")}</p>
                <p>Brief saved; musical clips and audio still require verification.</p>
              </div>}
              {action.result?.source && <div className="text-xs mt-2 space-y-1 break-all">
                <p><strong>Sample pack:</strong> {action.result.source.pack_name}</p>
                <p><strong>Source file:</strong> {action.result.source.relative_path}</p>
                {action.result.source.sha256 && <details><summary className="cursor-pointer">File identity (SHA-256)</summary><code>{action.result.source.sha256}</code></details>}
              </div>}
              {action.result?.plan && <div className="mt-3 text-xs space-y-2">
                <p className="font-semibold">{action.result.plan.title}</p>
                <p>{action.result.plan.genre} / {action.result.plan.bpm} BPM / {action.result.plan.key} / {action.result.plan.scope.replaceAll("_", " ")}</p>
                <ol className="space-y-2">{action.result.plan.parts.map((part, i) => <li key={i}>
                  <strong>{i + 1}. {part.role}</strong> / {part.source} / {part.bars} bars
                  <p style={{ color: "var(--text-secondary)" }}>{part.sound}</p>
                </li>)}</ol>
                {!!action.result.plan.assumptions.length && <p style={{ color: "var(--text-secondary)" }}>Defaults: {action.result.plan.assumptions.join("; ")}</p>}
              </div>}
              {action.result?.items && <details className="mt-2 text-xs" open>
                <summary className="cursor-pointer">Source choices ({action.result.items.length} of {action.result.total})</summary>
                <ul className="max-h-48 overflow-auto py-2 space-y-1">{action.result.items.map((item, i) => <li key={i}>{item.name}{item.folder ? " /" : ""}{!item.folder && !item.loadable ? " (unavailable)" : ""}</li>)}</ul>
                {action.result.next_offset != null && <p>More entries available.</p>}
              </details>}
              {action.result?.parameters && <details className="mt-2 text-xs" open>
                <summary className="cursor-pointer">Control map ({action.result.parameters.length}{action.result.total != null ? ` of ${action.result.total}` : ""})</summary>
                <div className="overflow-auto max-h-64 mt-2">
                  <table className="w-full text-left whitespace-nowrap">
                    <thead><tr>{["Control", "Current", "Native range", "Choices"].map(label => <th key={label} className="pr-4 py-2">{label}</th>)}</tr></thead>
                    <tbody>{action.result.parameters.map(parameter => <tr key={parameter.index} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="pr-4 py-2">{parameter.name}{parameter.enabled === false ? " (disabled)" : parameter.state ? " (inactive)" : ""}{parameter.automation_state ? " (automated)" : ""}</td>
                      <td className="pr-4">{parameter.display ?? parameter.value}</td>
                      <td className="pr-4">{parameter.min} to {parameter.max}</td>
                      <td>{parameter.choices?.join(", ") || "-"}</td>
                    </tr>)}</tbody>
                  </table>
                </div>
              </details>}
              {sound && (
                <dl className="text-xs mt-2 space-y-2 break-words">
                  <div><dt className="font-medium">Sound source</dt><dd style={{ color: "var(--text-secondary)" }}>{sound.devices.length ? sound.devices.join(" → ") : "No device observed"}</dd></div>
                  <div><dt className="font-medium">Rhythm</dt><dd style={{ color: "var(--text-secondary)" }}>{sound.rhythm}</dd></div>
                  <div><dt className="font-medium">Mix intention</dt><dd style={{ color: "var(--text-secondary)" }}>{sound.mix_intent}</dd></div>
                  <div><dt className="sr-only">Evidence</dt><dd style={{ color: "#fde68a" }}>{sound.basis}</dd></div>
                </dl>
              )}
              {notes && <NoteTable notes={notes} />}
              {!!action.result?.missing_notes?.length && <NoteTable notes={action.result.missing_notes} label="missing or changed notes" />}
              {!!action.result?.unexpected_notes?.length && <NoteTable notes={action.result.unexpected_notes} label="unexpected notes" />}
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer py-1" style={{ color: "var(--text-secondary)" }}>Execution details{action.result?.steps ? ` (${action.result.steps.length})` : ""}</summary>
                <pre className="whitespace-pre-wrap break-all max-h-48 overflow-auto mt-2">{JSON.stringify(action.input, null, 2)}</pre>
                <p>Original status: {action.result?.status || "running"}</p>
                {action.result?.steps?.map(step => (
                  <details key={step.number} className="border-t py-2" style={{ borderColor: "var(--border)" }}>
                    <summary className="cursor-pointer break-all">{step.number}. {step.kind} {step.address} [{step.status}]</summary>
                    <pre className="whitespace-pre-wrap break-all max-h-48 overflow-auto mt-2">{JSON.stringify({ arguments: step.args, response: step.result, error: step.error, elapsed_ms: step.elapsed_ms }, null, 2)}</pre>
                  </details>
                ))}
              </details>
              </details>
            </li>
          );
        })}
      </ol>
      </details>
    </section>
  );
}
