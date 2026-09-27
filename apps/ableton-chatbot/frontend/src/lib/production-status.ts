import type { ProductionAction } from "../components/ProductionLog";

const BAD = new Set(["failed", "partial", "unverified"]);
const READS = new Set(["list_browser", "list_sample_packs", "search_pack_samples", "inspect_pack_sample", "inspect_track", "describe_sound", "create_production_plan", "list_reference_sounds", "compare_reference_sound"]);
const AUDIO = new Set(["audition_part", "capture_combined_groove"]);

export function isInspection(action: ProductionAction) {
  return action.tool.startsWith("get_") || READS.has(action.tool);
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return JSON.stringify(Object.keys(value).sort().map(key => [key, canonical((value as Record<string, unknown>)[key])]));
  return JSON.stringify(value) ?? "undefined";
}

function sameClip(a: ProductionAction, b: ProductionAction) {
  return typeof a.input.track === "number" && typeof a.input.scene === "number"
    && a.input.track === b.input.track && a.input.scene === b.input.scene;
}

export interface ActionOutcome {
  kind: "done" | "checked" | "running" | "issue" | "repaired" | "waiting" | "skipped";
  label: string;
  repairedBy?: number;
}

export function actionOutcomes(actions: ProductionAction[]): ActionOutcome[] {
  return actions.map((action, index) => {
    const status = action.result?.status;
    if (!action.result) return { kind: "running", label: "In progress" };
    if (status === "verified") return { kind: "done", label: "Checked in Ableton" };
    if (status === "observed") return { kind: "checked", label: "Inspected" };
    const summary = action.result.summary || "";
    if (status === "failed" && /^(Listen and approve the current sound|One part at a time:)/.test(summary)) {
      return { kind: "waiting", label: "Paused at the time" };
    }
    if (status === "failed" && summary.startsWith("Skipped after an earlier failure")) {
      return { kind: "skipped", label: "Not run" };
    }
    if (BAD.has(status || "")) {
      let cleared = false;
      for (let j = index + 1; j < actions.length; j++) {
        const later = actions[j];
        if (/^(create_|delete_|duplicate_|load_)/.test(later.tool) && later.tool !== "create_production_plan") break;
        // Only a checked clear-and-rebuild resolves a changed MIDI batch. A later
        // successful load or track creation cannot prove an uncertain write was safe.
        if (action.tool === "add_notes" && sameClip(action, later)) {
          if (later.tool === "clear_notes") cleared = later.result?.status === "verified";
          if (later.tool === "add_notes") {
            if (cleared && later.result?.status === "verified" && Array.isArray(later.result.notes)) {
              return { kind: "repaired", label: "Pattern rebuilt and checked", repairedBy: j };
            }
            cleared = false;
          }
        }
        const sameRequest = later.tool === action.tool && canonical(later.input) === canonical(action.input);
        if (sameRequest && isInspection(action) && later.result?.status === "observed") {
          return { kind: "repaired", label: "Check succeeded on retry", repairedBy: j };
        }
        if (sameRequest && ["set_device_control", "set_device_parameter"].includes(action.tool) && later.result?.status === "verified") {
          return { kind: "repaired", label: "Setting rechecked", repairedBy: j };
        }
      }
    }
    return { kind: "issue", label: status === "partial" ? "Change needs checking" : "Needs attention" };
  });
}

export type RequestStatus = "running" | "complete" | "interrupted";

export function summarizeProduction(actions: ProductionAction[], requestStatus?: RequestStatus) {
  const outcomes = actionOutcomes(actions);
  const issues = outcomes.flatMap((o, index) => o.kind === "issue" ? [index] : []);
  const repairs = outcomes.filter(o => o.kind === "repaired").length;
  const waiting = outcomes.some(o => o.kind === "waiting");
  const interrupted = requestStatus === "interrupted";
  const running = !interrupted && (requestStatus === "running" || outcomes.some(o => o.kind === "running"));
  const done = outcomes.filter(o => o.kind === "done").length;
  const checked = outcomes.filter(o => o.kind === "checked").length;
  const lastWrite = actions.reduce((last, a, i) => a.result?.status === "verified" && !isInspection(a) ? i : last, -1);
  const audioReady = lastWrite >= 0 && AUDIO.has(actions[lastWrite].tool);
  const setupOnly = actions.some(a => a.tool === "create_midi_track" && a.result?.status === "verified")
    && !actions.some(a => ["add_notes", "duplicate_clip", "load_pack_sample", ...AUDIO].includes(a.tool) && a.result?.status === "verified");
  const title = interrupted ? "Request interrupted" : issues.length ? "Needs attention" : running ? "Working in Ableton" : waiting ? "Earlier production pause"
    : audioReady ? "Audio ready" : setupOnly ? "Instrument setup only" : done ? "Changes checked" : checked ? "Inspection complete" : "No changes made";
  const detail = interrupted ? `The request did not finish. ${audioReady ? "A recording was captured before interruption." : "No current audio preview was captured in this request."} Completed changes remain in Ableton; inspect before retrying.`
    : running ? "Your request is still running."
    : issues.length ? `${issues.length} unresolved ${issues.length === 1 ? "issue" : "issues"}. Inspect before repeating a command.`
    : waiting ? "This request stopped at a review checkpoint. Current decisions are shown on the recordings."
    : audioReady ? "An Ableton recording was captured. Its saved review status is shown below."
    : setupOnly ? "A MIDI track was created, but no MIDI pattern or audio preview was verified in this request. There is no new sound ready to approve."
    : done ? "Requested state changes were read back. This does not prove the full track is finished."
    : "Only inspections are recorded; no music changes were made.";
  return { outcomes, issues, repairs, waiting, running, done, checked, title, detail, audioReady };
}

export function trackOutcomes(actions: ProductionAction[]) {
  const tracks = new Map<number, { track: number; name: string; source?: string; noteCount?: number; notesVerified?: boolean; recording: boolean }>();
  let names: unknown[] = [];
  for (const action of actions) {
    const target = action.tool === "duplicate_clip" ? action.input.target_track : action.input.track;
    const previous = typeof target === "number" ? tracks.get(target) : undefined;
    if (previous && !isInspection(action) && !AUDIO.has(action.tool)) previous.recording = false;
    if (previous && BAD.has(action.result?.status || "")) {
      if (["add_notes", "clear_notes", "duplicate_clip"].includes(action.tool)) previous.noteCount = undefined;
      if (action.tool.startsWith("load_")) previous.source = undefined;
    }
    if (!["verified", "observed"].includes(action.result?.status || "")) continue;
    const observedNames = action.result?.observations?.["/live/song/get/track_names"];
    if (Array.isArray(observedNames)) names = observedNames;
    const track = action.tool === "duplicate_clip" ? action.input.target_track : action.input.track;
    if (typeof track !== "number" || !action.result) continue;
    if (!["set_track_name", "load_pack_sample", "load_library_item", "load_instrument", "load_sample", "add_notes", "clear_notes", "duplicate_clip", "audition_part", "get_track_device_tree", "get_clip_notes"].includes(action.tool)) continue;
    const item = tracks.get(track) || { track, name: typeof names[track] === "string" ? String(names[track]) : `Track ${track + 1}`, recording: false };
    if (action.tool === "set_track_name" && typeof action.input.name === "string") item.name = action.input.name;
    if (action.tool === "load_pack_sample" && action.result.source) item.source = `${action.result.source.pack_name} / ${action.result.source.relative_path.split("/").at(-1)}`;
    if (action.tool === "load_library_item" && action.input.kind === "instrument" && Array.isArray(action.input.folders)) item.source = action.input.folders.join(" / ");
    if (action.tool === "get_track_device_tree" && Array.isArray(action.result.devices) && (!item.source || !action.result.devices.length)) item.source = action.result.devices.map(d => d.name).join(" + ") || "No device present";
    if (["add_notes", "clear_notes", "duplicate_clip", "get_clip_notes"].includes(action.tool) && Array.isArray(action.result.notes)) {
      item.noteCount = action.result.notes.length;
      item.notesVerified = action.result.status === "verified";
    }
    if (action.tool === "audition_part") item.recording = true;
    tracks.set(track, item);
  }
  return [...tracks.values()];
}

export function actionLabel(tool: string) {
  const labels: Record<string, string> = {
    load_pack_sample: "Load selected pack sample", load_library_item: "Load instrument or effect",
    load_instrument: "Load instrument", load_sample: "Load sample", add_notes: "Write MIDI pattern",
    clear_notes: "Clear MIDI pattern", audition_part: "Record sound preview", create_midi_track: "Create MIDI track",
    get_device_control_map: "Inspect instrument controls", get_track_device_tree: "Inspect devices and drum pads",
    set_device_control: "Set instrument control", create_production_plan: "Save production plan",
    capture_combined_groove: "Record combined groove",
  };
  return labels[tool] || tool.replaceAll("_", " ").replace(/^./, c => c.toUpperCase());
}
