export function liveSetMessage(summary: string): string {
  if (/Unable to identify one Ableton document window/i.test(summary)) {
    return "BeatMind could not identify your Live Set window. This is not a permission-denied error. Update BeatMind Bridge, click the main Ableton Set window, then retry inspection. Nothing was changed.";
  }
  if (/not allowed assistive access|accessibility.*denied|-25211/i.test(summary)) {
    return "macOS blocked bridge control. Enable BeatMind Bridge in System Settings > Privacy & Security > Accessibility, then reopen and reconnect the bridge.";
  }
  if (/not authorized to send Apple events|-1743/i.test(summary)) {
    return "Allow BeatMind Bridge to control System Events and Ableton in System Settings > Privacy & Security > Automation, then retry inspection.";
  }
  return summary;
}
