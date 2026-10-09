// Mirrors backend/stems.py: each reference report carries its own stem list.
export const CORE_STEMS = ["drums", "bass", "vocals", "other"];
export const DRUM_PARTS = ["kick", "snare", "toms", "cymbals"];

type StemReport = { stems?: { name: string }[] } | undefined;

export function audioStems(report: StemReport): string[] {
  return report?.stems?.length ? report.stems.map(stem => stem.name) : CORE_STEMS;
}

// The parent drums file is not a review choice once its drum parts exist.
export function reviewStems(report: StemReport): string[] {
  const names = audioStems(report);
  return names.some(name => DRUM_PARTS.includes(name)) ? names.filter(name => name !== "drums") : names;
}

export function isDetailed(stems: string[]): boolean {
  return stems.some(name => DRUM_PARTS.includes(name));
}

export function stemLabel(stem: string): string {
  switch (stem) {
    case "other": return "Other instruments";
    case "cymbals": return "Cymbals and hi-hat";
    case "mix": return "Original mix";
    default: return stem.charAt(0).toUpperCase() + stem.slice(1);
  }
}
