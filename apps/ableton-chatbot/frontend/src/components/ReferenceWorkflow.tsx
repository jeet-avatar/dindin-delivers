"use client";

import { ArrowLeft, Check } from "lucide-react";
import type { ListeningData } from "@/lib/reference-listening";

const steps = [["stems", "1. Stems"], ["timing", "2. Timing"], ["listening", "3. Listening"], ["template", "4. Template"], ["compare", "5. Compare"]] as const;

export default function ReferenceWorkflow({ stage, onStage, review, timing, listening, listeningBusy, template, onOpenChat }: {
  stage: string; onStage: (stage: string) => void;
  review?: { status: string }; timing?: { status: string }; listening?: ListeningData;
  listeningBusy?: boolean;
  template?: { status: string }; onOpenChat?: () => void;
}) {
  const index = Math.max(0, steps.findIndex(([key]) => key === stage));
  const stemsReady = review?.status === "accepted", timingReady = timing?.status === "confirmed";
  const running = listeningBusy || listening?.job?.status === "running";
  const incomplete = Boolean(listening?.job && !["running", "complete"].includes(listening.job.status));
  const notes = Boolean(listening?.excerpts.some(note => note.validation === "checks_passed"));
  const states = [stemsReady ? "Saved" : "Review pending", timingReady ? "Confirmed" : "Review pending",
    running ? "In progress" : incomplete ? "Needs attention" : notes ? "Notes saved" : "Optional", template?.status === "approved" ? "Approved" : template ? "Draft" : "Not started", "Optional"];
  const summaries: Record<string, string> = {
    stems: stemsReady ? "Stem choices saved. Next: timing review." : "Stem review pending: four choices and listening confirmation required.",
    timing: timingReady ? "Timing confirmed. Next: listening or a manual creative brief." : "Timing review pending: tempo, meter and section boundaries.",
    listening: running ? listening?.job?.status === "running" ? `Listening in progress: ${listening.job.completed} of ${listening.job.total} intervals checked.` : "Listening request in progress." : incomplete ? "Listening incomplete. Previously saved notes remain available." : notes ? "Listening notes saved. Musical interpretations still need review." : "No listening notes saved. Audio-sharing permission and a listening brief are required for AI analysis.",
    template: !stemsReady || !timingReady ? `Template prerequisites pending: ${[!stemsReady && "stem review", !timingReady && "timing confirmation"].filter(Boolean).join(", ")}.` : template?.status === "approved" ? "Planning brief approved. Ableton build not verified." : "Creative brief pending: taste, direction, sounds and sections.",
    compare: "Comparison inputs: reference and captured Ableton audio.",
  };
  return <section aria-label="Reference progress" className="space-y-3">
    <div role="tablist" aria-label="Reference workflow" className="flex flex-wrap gap-x-4 gap-y-2 border-b border-neutral-700">
      {steps.map(([key, label], i) => <button key={key} type="button" role="tab" aria-label={label} aria-selected={stage === key}
        aria-describedby={`reference-step-${key}`} onClick={() => onStage(key)} className={`border-b-2 py-2 text-left text-sm ${stage === key ? "border-emerald-400" : "border-transparent text-neutral-400"}`}>
        <span className="flex items-center gap-1">{label}{["Saved", "Confirmed", "Approved"].includes(states[i]) && <Check size={14} aria-hidden="true" />}</span>
        <span id={`reference-step-${key}`} className="block text-xs text-neutral-400">{states[i]}</span>
      </button>)}
    </div>
    <div className="space-y-2 border-l-2 border-neutral-600 pl-3">
      <p className="text-xs text-neutral-400">Step {index + 1} of {steps.length}</p>
      <p role="status" className="text-sm">{summaries[stage]}</p>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {index > 0 && <button type="button" onClick={() => onStage(steps[index - 1][0])} className="inline-flex items-center gap-1 underline"><ArrowLeft size={14} />Back to {steps[index - 1][0]}</button>}
        {stage === "template" && !stemsReady && <button type="button" onClick={() => onStage("stems")} className="underline">Review stems</button>}
        {stage === "template" && !timingReady && <button type="button" onClick={() => onStage("timing")} className="underline">Review timing</button>}
        {stage === "compare" && onOpenChat && <button type="button" onClick={onOpenChat} className="underline">Open music chat</button>}
      </div>
    </div>
  </section>;
}
