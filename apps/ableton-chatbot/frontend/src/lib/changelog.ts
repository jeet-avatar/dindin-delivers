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
    version: "1.3.12",
    date: "2026-10-02",
    notes: [
      "Check for updates is always visible, with checking, up-to-date and update-available states.",
      "Failed checks are visible, retry after one minute and offer the official installer download. Duplicate checks and overlapping installations are prevented.",
    ],
  },
  {
    version: "1.3.11",
    date: "2026-10-02",
    notes: [
      "Live Set inspection uses document identity and main-window evidence instead of requiring one standard window.",
      "Choose Live Set automatically checks the open set and offers in-app retry with clear diagnostics. Ambiguous windows and save dialogs still block changes.",
    ],
  },
  {
    version: "1.3.10",
    date: "2026-10-02",
    notes: [
      "Set up Ableton integration now installs bundled AbletonOSC on a new Mac, without a separate download.",
      "Setup shows progress and visible errors, preserves existing integrations, and supports a custom User Library location.",
      "After setup, save and restart Live, then select AbletonOSC in Settings > Link/Tempo/MIDI.",
    ],
  },
  {
    version: "1.3.9",
    date: "2026-10-02",
    notes: [
      "Signed-in Bridge now shows your account instead of a locked email and password form.",
      "Sign out restores editable login fields; Disconnect keeps your saved sign-in for reconnecting.",
    ],
  },
  {
    version: "1.3.8",
    date: "2026-10-02",
    notes: [
      "Reconnect after clicking Disconnect without re-entering your password; Sign out remains available.",
      "Email and password fields keep readable colors after connecting.",
      "The Bridge window now fits its setup controls and version footer on first launch.",
    ],
  },
  {
    version: "1.3.7",
    date: "2026-10-02",
    notes: [
      "Set up Ableton integration from the Bridge, with automatic registration, backups and rollback.",
      "Supported actions can show the corresponding track, device or MIDI clip in Ableton and verify the displayed selection.",
      "Arrangement auditions check their playback start; clip automation verifies written values and holds the final value through the clip end.",
      "Improved packaged stem-separation startup and installer version reporting. Save your Live Set, run integration setup and restart Ableton after updating.",
    ],
  },
  {
    version: "1.3.6",
    date: "2026-09-30",
    notes: [
      "Bridge's update prompt now tells you what's new before you install, with a link to the full changelog.",
    ],
  },
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
