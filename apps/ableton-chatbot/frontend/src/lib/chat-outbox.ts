export interface QueuedInstruction {
  id: string;
  text: string;
  createdAt: string;
  state: "queued" | "sending" | "uncertain";
}

export interface InstructionQueue {
  items: QueuedInstruction[];
  paused: boolean;
}

export const emptyQueue = (): InstructionQueue => ({ items: [], paused: false });

export function outboxKey(userId: number, songId: string): string {
  return `beatmind_outbox_v1_${userId}_${songId}`;
}

export function readQueue(storage: Pick<Storage, "getItem">, key: string): InstructionQueue {
  const raw = storage.getItem(key);
  if (!raw) return emptyQueue();
  const saved = JSON.parse(raw);
  if (!Array.isArray(saved.items) || saved.items.some((item: QueuedInstruction) =>
    !item || typeof item.id !== "string" || typeof item.text !== "string" ||
    typeof item.createdAt !== "string" || !["queued", "sending", "uncertain"].includes(item.state))) {
    throw new Error("Saved instructions could not be read. They have not been overwritten.");
  }
  return { items: saved.items, paused: Boolean(saved.paused) };
}

export function recoverQueue(queue: InstructionQueue): InstructionQueue {
  // Reload is not evidence that an in-flight request never reached Ableton.
  return { paused: queue.items.length > 0, items: queue.items.map(item =>
    item.state === "sending" ? { ...item, state: "uncertain" } : item) };
}

export function appendInstruction(queue: InstructionQueue, text: string): InstructionQueue {
  text = text.trim();
  if (!text) return queue;
  if (text.length > 12000) throw new Error("This brief exceeds 12,000 characters. Your draft is unchanged; shorten it before sending.");
  if (queue.items.length >= 30) throw new Error("30 instructions are already saved. Review them before adding more.");
  return { ...queue, items: [...queue.items, { id: crypto.randomUUID(), text,
    createdAt: new Date().toISOString(), state: "queued" }] };
}

export function nextInstructions(queue: InstructionQueue): { ids: string[]; text: string } | null {
  if (queue.items.some(item => item.state !== "queued")) return null;
  const prefix = "Read all these saved instructions together before acting. They are in chronological order; later changes override earlier conflicting choices. Inspect the current Live Set, retain completed parts, update the whole-song plan, and execute only the next appropriate step.\n\n";
  const selected: QueuedInstruction[] = [];
  for (const item of queue.items) {
    const candidate = [...selected, item];
    const text = prefix + candidate.map((entry, index) => `${index + 1}. ${entry.text}`).join("\n\n");
    if (text.length > 12000) break;
    selected.push(item);
  }
  if (!selected.length) {
    const first = queue.items[0];
    return first ? { ids: [first.id], text: first.text } : null;
  }
  return { ids: selected.map(item => item.id), text: selected.length === 1 ? selected[0].text
    : prefix + selected.map((item, index) => `${index + 1}. ${item.text}`).join("\n\n") };
}

export function settleInstructions(queue: InstructionQueue, ids: string[], completed: boolean): InstructionQueue {
  return { paused: !completed || queue.paused, items: completed
    ? queue.items.filter(item => !ids.includes(item.id))
    : queue.items.map(item => ids.includes(item.id) ? { ...item, state: "uncertain" } : item) };
}
