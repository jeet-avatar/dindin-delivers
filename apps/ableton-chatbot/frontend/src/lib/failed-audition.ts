import type { ProductionAction } from "@/components/ProductionLog";

export function failedAudition(actions: ProductionAction[]) {
  const action = actions.filter(item => ["audition_part", "audition_arrangement"].includes(item.tool)).at(-1);
  if (!action?.result || action.result.recording?.id) return null;
  const { track, scene } = action.input;
  const reason = action.result.error || action.result.summary || "No verified audio file was returned.";
  const target = action.tool === "audition_arrangement" && Number.isInteger(track) && Number(track) >= 0
    ? `Track ${Number(track) + 1} / Arrangement`
    : Number.isInteger(track) && Number(track) >= 0 && Number.isInteger(scene) && Number(scene) >= 0
    ? `Track ${Number(track) + 1} / Scene ${Number(scene) + 1}` : "Existing part";
  return { reason, target, prompt: `Diagnose the failed audition for ${target}. Previous error: ${JSON.stringify(reason)}. Read-only inspection first: confirm the current track name, instrument, clip and notes match the intended part, and identify the exact capture failure. Do not create, delete, replace or change tracks, instruments, notes, levels, monitoring or recording decisions. Do not start playback yet. Report what must be fixed before retrying only the audition.` };
}
