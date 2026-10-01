// Single source of truth for release notes, shared by the /changelog page and (via
// apps/ableton-chatbot/bridge/CHANGELOG.json, kept in sync by hand until a release script
// generates both) the Bridge in-app updater's "what's new" notes.
export interface ChangelogEntry {
  version: string;
  date: string; // ISO date, or a range like "2026-09-27 – 2026-09-28" for an older bundled entry
  notes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.3.5",
    date: "2026-09-29",
    notes: [
      "Smooth entrances (fade-ins and builds) are now recorded as real Arrangement automation, not just played live.",
      "Replacing part of an Arrangement is safer — it no longer overwrites automation it shouldn't.",
      "Transition previews can run longer, so you can hear more before committing to a change.",
    ],
  },
  {
    version: "1.3.4",
    date: "2026-09-29",
    notes: ["Transition previews can now play up to 30 seconds of audio, up from a few seconds."],
  },
  {
    version: "1.3.3",
    date: "2026-09-29",
    notes: [
      "Previewing a transition can launch the next scene right on the beat, not just overlap it.",
      "Reliability improvements to how Bridge talks to Ableton Live.",
    ],
  },
  {
    version: "1.2.0 – 1.3.2",
    date: "2026-09-27 – 2026-09-28",
    notes: [
      "Bridge now stays signed in across launches and reconnects automatically after a dropped connection or a brief BeatMind outage — no more re-entering your password every time.",
      "Updates install with one click from inside the app; your open Ableton set is never touched.",
      "BeatMind can now ride clip and mixer automation — volume, pan and sends — directly in your set.",
      "Added kick-to-bass sidechaining and more arrangement-building rules.",
      "Added per-part effect chains, an engineering mix check, and a master limiter.",
      "Added full-mix scene previews and recording a song straight into the Arrangement.",
    ],
  },
];
