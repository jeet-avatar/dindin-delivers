export function liveSetMessage(summary: string): string {
  if (/not allowed assistive access|accessibility.*denied|-25211/i.test(summary)) {
    return "macOS blocked bridge control. Enable BeatMind Bridge in System Settings > Privacy & Security > Accessibility, then reopen and reconnect the bridge.";
  }
  return summary;
}
