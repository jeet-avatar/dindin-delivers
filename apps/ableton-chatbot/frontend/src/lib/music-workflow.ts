export interface MusicChoice { label: string; message: string }

export function acceptedSound(name: string): { content: string; choices: MusicChoice[] } {
  return {
    content: `${name} accepted. What would you like to do next?`,
    choices: [
      { label: "Keep it and move on", message: `Keep ${name} as it is. Which part should we choose next?` },
      { label: "Refine the groove", message: `I'd like to discuss the groove of ${name}.` },
      { label: "Shape tone or effects", message: `I'd like to discuss the tone or effects for ${name}.` },
    ],
  };
}

export function claimPreviewAutoplay(id: string, decision: string, superseded: boolean, seen: Set<string>): boolean {
  if (decision !== "pending" || superseded || seen.has(id)) return false;
  seen.add(id);
  return true;
}
