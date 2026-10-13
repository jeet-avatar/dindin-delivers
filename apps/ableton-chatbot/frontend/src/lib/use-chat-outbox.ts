"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { emptyQueue, readQueue, recoverQueue, type InstructionQueue } from "./chat-outbox";

export function useChatOutbox(key: string | null, onError: (message: string) => void) {
  const [state, setState] = useState<{ key: string | null; queue: InstructionQueue }>({ key: null, queue: emptyQueue() });
  const current = useRef(state);
  useEffect(() => {
    if (!key) return;
    try {
      const queue = recoverQueue(readQueue(localStorage, key));
      localStorage.setItem(key, JSON.stringify(queue));
      current.current = { key, queue };
      setState(current.current);
    } catch (error) { onError(error instanceof Error ? error.message : "Could not restore saved instructions."); }
  }, [key, onError]);

  const update = useCallback((change: (queue: InstructionQueue) => InstructionQueue) => {
    if (!key || current.current.key !== key) throw new Error("Wait for this song's saved instructions to load.");
    const queue = change(current.current.queue);
    // Never clear the composer or dispatch a request until its checkpoint is durable.
    localStorage.setItem(key, JSON.stringify(queue));
    current.current = { key, queue };
    setState(current.current);
    return queue;
  }, [key]);

  return { queue: state.key === key ? state.queue : emptyQueue(), update, ready: Boolean(key && state.key === key) };
}
