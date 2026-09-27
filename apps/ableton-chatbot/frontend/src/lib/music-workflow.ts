export interface MusicChoice { label: string; message: string }

export function acceptedSound(name: string): { content: string; choices: MusicChoice[] } {
  return {
    content: `${name} accepted. What would you like to do next?`,
    choices: [
      { label: "Keep it and move on", message: `Keep ${name} as it is. This part is finished. Ask which part I want next; do not replay or change anything yet.` },
      { label: "Refine the groove", message: `Let's discuss the groove of ${name}. Ask one question about velocity or timing, keeping the accepted sound unchanged for now.` },
      { label: "Shape tone or effects", message: `Let's discuss the tone or effects for ${name}. Ask which quality I want to change before suggesting one subtle treatment. Do not change or replay anything yet.` },
    ],
  };
}

export function claimPreviewAutoplay(id: string, decision: string, superseded: boolean, seen: Set<string>): boolean {
  if (decision !== "pending" || superseded || seen.has(id)) return false;
  seen.add(id);
  return true;
}
