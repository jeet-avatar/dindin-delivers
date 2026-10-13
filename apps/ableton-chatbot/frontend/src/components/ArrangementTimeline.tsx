"use client";

export interface ArrangementPlan {
  title: string;
  revision: string;
  approved: boolean;
  bpm: number;
  numerator: number;
  denominator: number;
  total_bars: number;
  duration_seconds: number;
  remaining_checks: string[];
  pending_revision?: {
    revision: string; section_name: string; track: number; reason: string;
    state: "proposed" | "attempted" | "applied"; approved: boolean;
  };
  sections: {
    id: string; name: string; purpose: string; energy: number;
    start_bar: number; end_bar_exclusive: number;
    start_seconds: number; end_seconds: number;
    state: "planned" | "attempted" | "placed";
    assignments: { track: number; role: string }[];
    transition: { type: string; bars: number; instructions: string };
    effects: string[];
  }[];
}

function stamp(seconds: number) {
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, "0")}`;
}

export default function ArrangementTimeline({ plan, onApprove, onApproveRevision, busy }: {
  plan: ArrangementPlan; onApprove?: (revision: string) => void;
  onApproveRevision?: (revision: string) => void; busy?: boolean;
}) {
  return <div className="my-3 min-w-0 space-y-3" aria-label="Song arrangement">
    <div>
      <h4 className="text-sm font-semibold break-words">{plan.title}</h4>
      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
        {plan.bpm} BPM · {plan.numerator}/{plan.denominator} · {plan.total_bars} bars · {stamp(plan.duration_seconds)}
      </p>
      <p className="text-xs mt-1">{plan.approved ? "Arrangement approved" : "Proposed arrangement"} · Audio and project save not yet verified</p>
    </div>
    <ol className="divide-y" style={{ borderColor: "var(--border)" }}>
      {plan.sections.map(section => <li key={section.id} className="py-2 space-y-1 break-words text-xs">
        <div className="flex flex-wrap justify-between gap-1">
          <strong>{section.name}</strong>
          <span>{section.state === "placed" ? "Clips checked" : section.state === "attempted" ? "Inspect before retrying" : "Planned"}</span>
        </div>
        <p>Bars {section.start_bar}-{section.end_bar_exclusive - 1} · {stamp(section.start_seconds)}-{stamp(section.end_seconds)} · Energy target {Math.round(section.energy * 100)}%</p>
        <p>{section.purpose}</p>
        <p>{Array.from(new Set(section.assignments.map(a => `${a.role} (Track ${a.track + 1})`))).join(", ")}</p>
        {section.transition.type !== "none" && <p>Transition intent: {section.transition.instructions} ({section.transition.bars} bars)</p>}
        {!!section.effects.length && <p>Effects to verify: {section.effects.join("; ")}</p>}
      </li>)}
    </ol>
    {!plan.approved && onApprove && <button type="button" disabled={busy} onClick={() => onApprove(plan.revision)}
      className="px-3 py-2 rounded-md text-sm font-medium disabled:opacity-50"
      style={{ background: "var(--accent)", color: "var(--on-accent)" }}>Approve arrangement</button>}
    {plan.pending_revision && <div className="border-t pt-3 space-y-2 text-xs" style={{ borderColor: "var(--border)" }}>
      <h5 className="font-semibold">{plan.pending_revision.section_name} / Track {plan.pending_revision.track + 1}</h5>
      <p className="break-words">{plan.pending_revision.reason}</p>
      <p>{plan.pending_revision.state === "applied" ? "Pattern checked. Audio approval is separate."
        : plan.pending_revision.state === "attempted" ? "Revision needs inspection before retrying."
        : plan.pending_revision.approved ? "Pattern revision approved" : "Proposed pattern revision"}</p>
      {plan.pending_revision.state === "proposed" && !plan.pending_revision.approved && onApproveRevision &&
        <button type="button" disabled={busy} onClick={() => onApproveRevision(plan.pending_revision!.revision)}
          className="px-3 py-2 rounded-md text-sm font-medium disabled:opacity-50"
          style={{ background: "var(--accent)", color: "var(--on-accent)" }}>Approve part revision</button>}
    </div>}
  </div>;
}
