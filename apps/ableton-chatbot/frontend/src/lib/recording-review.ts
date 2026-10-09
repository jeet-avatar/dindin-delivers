import type { Recording } from "@/components/Recordings";
import type { ProductionAction } from "@/components/ProductionLog";

export function reviewMessage(text: string, actions: ProductionAction[], ids: string[], recordings: Recording[]) {
  const historicalPause = actions.some(action => action.result?.status === "failed"
    && /^(Listen and approve the current sound|One part at a time:)/.test(action.result.summary || ""));
  const prompt = /(?:awaiting|waiting for).*(?:review|approv)|listen and (?:accept|approve)|listen and accept it/i.test(text);
  if (!historicalPause && !prompt) return null;
  if (!ids.length) return "Earlier review pause. This historical message does not represent a current approval request.";
  const linked = ids.map(id => recordings.find(item => item.id === id));
  if (linked.some(item => !item)) return "Checking saved recording decisions...";
  const current = (linked as Recording[]).filter(item => !recordings.some(next => next.supersedes === item.id));
  if (!current.length) return "A newer recording version is available. This preview is historical.";
  return current.map(item => `${item.track_name}: ${item.decision === "accepted" ? "Accepted. No further approval needed."
    : item.decision === "revise" ? "Changes requested."
    : item.supersedes ? "New recording version awaiting review." : "Recording awaiting review."}`).join("\n");
}

export const RECORDING_CHANGED = "beatmind:recording-changed";
export const RECORDING_STORAGE_KEY = "beatmind_recording_change";

export function publishRecordingDecision(item: Recording) {
  window.dispatchEvent(new CustomEvent(RECORDING_CHANGED, { detail: item }));
  try { localStorage.setItem(RECORDING_STORAGE_KEY, JSON.stringify({ id: item.id, nonce: crypto.randomUUID() })); } catch { /* Polling still synchronizes when storage is unavailable. */ }
}
