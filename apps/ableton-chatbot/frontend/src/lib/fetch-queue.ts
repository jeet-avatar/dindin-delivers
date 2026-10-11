// Runs at most a few downloads at once, so a chat with many recordings doesn't flood the server.
const MAX_ACTIVE = 4;
let active = 0;
const waiting: Array<() => void> = [];

export async function queued<T>(task: () => Promise<T>): Promise<T> {
  if (active >= MAX_ACTIVE) await new Promise<void>(resolve => waiting.push(resolve));
  active++;
  try {
    return await task();
  } finally {
    active--;
    waiting.shift()?.();
  }
}
