export function streamHealth(now: number, lastEvent: number, lastProgress: number) {
  if (now - lastEvent >= 90_000) return {
    notice: "The server stopped responding. Completed actions may remain in Ableton; inspect before retrying.",
    disconnected: true,
  };
  if (now - lastEvent >= 45_000) return {
    notice: "Waiting for the server connection. No command has been retried.",
    disconnected: false,
  };
  if (now - lastProgress >= 60_000) return {
    notice: "Still connected, but no new result has arrived for this step. You can stop and inspect Ableton.",
    disconnected: false,
  };
  return { notice: "", disconnected: false };
}
