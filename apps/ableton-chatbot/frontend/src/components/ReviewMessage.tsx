import ChatText from "@/components/ChatText";
import type { ProductionAction } from "@/components/ProductionLog";
import type { Recording } from "@/components/Recordings";
import { reviewMessage } from "@/lib/recording-review";

export default function ReviewMessage({ text, actions, ids, recordings }: {
  text: string; actions: ProductionAction[]; ids: string[]; recordings: Recording[];
}) {
  const status = reviewMessage(text, actions, ids, recordings);
  return <>
    {status && <p role="status" className="mt-3 text-sm whitespace-pre-wrap">{status}</p>}
    {status || (actions.length > 0 && text.length > 500) ? <details className="mt-3 text-xs">
      <summary className="cursor-pointer py-1" style={{ color: "var(--text-secondary)" }}>{status ? "Original message (historical)" : "Producer notes"}</summary>
      <ChatText text={text} />
    </details> : <ChatText text={text} />}
  </>;
}
