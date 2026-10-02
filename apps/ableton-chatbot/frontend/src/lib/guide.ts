// Content for /guide ("How to use BeatMind & MixMind") and its HowTo / FAQPage JSON-LD.
// Keep every claim grounded in the shipped Bridge, dashboard and MixMind app.

import type { Faq } from "@/lib/faqs";
import { MIXMIND_ON_SALE, MIXMIND_PRICE, MIXMIND_TRIAL_NOTE, formatUsd } from "@/lib/pricing";
import { TRIAL_DAYS, TRIAL_TRACKS } from "@/lib/site";

// Stable installer path, the same one the dashboard's connection bar links to. It always serves
// the current release (see www.beatmind.io/bridge/latest.json), so no version is hardcoded here.
export const BRIDGE_MAC_DOWNLOAD = "/BeatMind-Bridge.dmg";
export const ABLETONOSC_URL = "https://github.com/ideoforms/AbletonOSC";

export interface GuideStep {
  id: string;
  name: string;
  text: string;
  details?: string[];
  link?: { href: string; label: string; external?: boolean };
}

export const BEATMIND_REQUIREMENTS: string[] = [
  "Ableton Live 11 or 12 (Standard or Suite). Live 10 and other DAWs aren't supported.",
  "BeatMind Bridge for macOS: the current installer is for Apple Silicon Macs running macOS 15 or later.",
  "Windows: a Windows Bridge isn't offered as a download yet. Captured auditions, automatic Live Set file actions and local stem separation are macOS-only for now.",
  "AbletonOSC, a free, open-source remote script for Live.",
];

export const BEATMIND_STEPS: GuideStep[] = [
  {
    id: "account",
    name: "Create your account and start the free trial",
    text: `Sign up at beatmind.io to start the ${TRIAL_DAYS}-day free trial. It includes ${TRIAL_TRACKS} tracks and limited AI, and needs no credit card. You're only charged if you choose a plan.`,
    link: { href: "/signup", label: "Start the free trial" },
  },
  {
    id: "bridge",
    name: "Download and install BeatMind Bridge",
    text: "Download BeatMind Bridge, open the disk image and drag BeatMind Bridge into Applications. The disk image also contains an AbletonOSC-Extensions folder with its own README.",
    details: [
      "The dashboard links the same installer under “Need to install the bridge?” while the Bridge is disconnected.",
      "In Bridge 1.3.10 or later, click Set up Ableton integration. It installs bundled AbletonOSC and BeatMind extensions on a new Mac, or updates a recognized existing integration with backups. Save your Set and restart Live afterward.",
      "Bridge checks for updates when it launches and every few hours. It installs an update only when you click, never in the middle of a stem separation.",
    ],
    link: { href: BRIDGE_MAC_DOWNLOAD, label: "Download BeatMind Bridge for Mac" },
  },
  {
    id: "abletonosc",
    name: "Enable AbletonOSC as a Control Surface in Live",
    text: "Click Set up Ableton integration in Bridge 1.3.10 or later, then save your Set and restart Live. Open Settings (Preferences in Live 11) → Link/Tempo/MIDI and choose AbletonOSC in an empty Control Surface slot.",
    details: [
      "macOS: ~/Music/Ableton/User Library/Remote Scripts/AbletonOSC",
      "For a custom location, click Choose User Library in the Bridge and select the same folder shown in Ableton Settings > Library before running setup.",
      "Live's status bar should show that AbletonOSC is listening on port 11000. It replies on port 11001.",
    ],
    link: { href: ABLETONOSC_URL, label: "Get AbletonOSC on GitHub", external: true },
  },
  {
    id: "connect",
    name: "Sign in to the Bridge and check it's connected",
    text: "Open BeatMind Bridge and sign in with the same email and password as beatmind.io. It shows Connected to BeatMind, and the dashboard's connection bar shows Bridge connected. On a Mac, allow audio capture when macOS asks: that permission is what makes captured auditions possible.",
    details: [
      "Bridge stays signed in (the sign-in is kept in your macOS Keychain) and reconnects by itself after a network drop or a BeatMind update.",
      "Click Let's make music in the Bridge to open the dashboard.",
    ],
  },
  {
    id: "prompt",
    name: "Write your first prompt",
    text: "In music chat, use Choose Live Set to save, start new, inspect or confirm the Set you'll work in. Then describe what you're making: genre, tempo, key, mood and the first part you want, for example “Dark melodic techno loop at 126 BPM in A minor. Start with the kick.”",
    details: [
      "BeatMind inspects your Set and installed sounds before changing anything, and may ask which pack or sound you want.",
      "If you name a pack, BeatMind loads from that exact pack. If the files are missing it stops and tells you instead of swapping in something else.",
    ],
  },
  {
    id: "audition",
    name: "Review the audition and iterate",
    text: "BeatMind builds one part as a Session clip and, on macOS, records a short captured audition of what it actually built. Listen, then keep it, ask for changes or reject it. BeatMind never approves a sound for you and only moves on when you do.",
    details: [
      "Refine in plain English: “make the bass warmer and pull it back 2 dB”, “sparser hats”, “more reverb send on the pad”.",
      "An edit to one part stays in that part.",
    ],
  },
  {
    id: "arrange",
    name: "Take over and arrange",
    text: "When the loop feels right, ask for sections as Session scenes (intro, breakdown, peak). Then arm Arrangement Record, launch the scenes in your order, and edit, automate and mix in Arrangement View yourself.",
  },
];

export const EXAMPLE_PROMPTS: { genre: string; prompt: string }[] = [
  { genre: "Melodic techno", prompt: "Dark melodic techno loop at 126 BPM in A minor. Start with the kick." },
  { genre: "Deep house", prompt: "Deep house at 122 BPM in F minor. Add a swung, open hi-hat groove over the four-on-the-floor kick." },
  { genre: "Minimal", prompt: "Minimal tech groove at 128 BPM. Give me a rolling off-beat bassline in G minor using Operator." },
  { genre: "Drum and bass", prompt: "Liquid drum and bass at 174 BPM. Start with a light two-step break, nothing too busy." },
  { genre: "Afro house", prompt: "Afro house at 120 BPM. Add a shaker and a percussion pattern that leaves space for a vocal." },
  { genre: "Ambient", prompt: "Ambient pad in D minor at 90 BPM using Wavetable: slow attack, long release, plenty of reverb send." },
  { genre: "Hip hop", prompt: "Lo-fi hip hop at 85 BPM. A lazy, dusty drum loop first, then a simple electric piano chord progression." },
  { genre: "Refining", prompt: "Make the bass warmer and pull it back 2 dB. Keep the drums exactly as they are." },
];

export const TIPS: string[] = [
  "Give BPM, key, genre and mood up front. Genre guides the plan; it doesn't pick a fixed template.",
  "Ask for one part at a time and approve it before the next. Small steps are easier to steer.",
  "Start in a fresh Set saved under a project name, so experiments never overwrite something you care about.",
  "Name a pack only if it's installed. BeatMind treats a named pack as a strict requirement.",
  "Copy sample folders into your User Library instead of symlinking them: Live's browser doesn't follow symlinks.",
  "Native Ableton devices expose their controls most clearly. Third-party plugins vary.",
  "Use exact numbers when you mean them. “Turn it up 2 dB” means 2 dB on the fader.",
  "Turn off Ableton's recording before asking for an audition.",
];

export const LIMITS: string[] = [
  "It doesn't generate or export finished songs. It builds parts as Session clips and scenes; you arrange and export.",
  "It doesn't write the Arrangement timeline for you (placing reference stems at the start of the Arrangement in Live 12 is the one exception, via the optional extension).",
  "It can only change controls a device exposes. Some third-party plugin parameters are out of reach.",
  "Captured auditions, automatic Live Set file actions and local stem separation need macOS.",
  "Exact sample-pack loading covers the Factory Packs installed on your Mac; external sample folders and pack presets aren't treated as supported sources.",
  "It isn't a mastering tool, and a measured comparison with a reference isn't a quality score.",
  "It works with Ableton Live 11 and 12 only.",
];

export const REFERENCE_STEPS: string[] = [
  "Add a reference track under References in the dashboard. On a Mac, high-quality separation runs on your computer through the Bridge and saves stems to ~/Music/BeatMind Stems/. Cloud HQ separation (paid plans) runs on BeatMind's cloud GPU instead.",
  "Each separation uses one track from your allowance.",
  "Stems: play each stem and mark it Use as reference, Exclude from my track or Separation needs work, then save your review. Stems are estimates and can have bleed; they aren't the artist's studio files.",
  "Timing: check the BPM, meter and proposed sections, adjust them, then confirm the timing map.",
  "Listening (optional): AI listening sends the stated audio to a third-party AI provider only after you allow it, and charges may apply. You can write a manual brief instead.",
  "Template: describe what to keep and avoid, choose style, sounds and sections, then approve the planning brief and build original parts in chat.",
  "Compare: once a part has a captured audition, A/B it against a reference layer with level-matched previews.",
];

export const BEATMIND_TROUBLESHOOTING: Faq[] = [
  {
    q: "The dashboard says “Bridge not connected”",
    a: "Open BeatMind Bridge (the Bridge button in the dashboard opens it; your browser may ask permission first) and sign in with your beatmind.io email and password. Bridge reconnects by itself after network drops and only asks you to sign in again if its sign-in is rejected. Use the refresh button in the connection bar to check again.",
  },
  {
    q: "AbletonOSC isn't listed as a Control Surface",
    a: "Check that the folder is named AbletonOSC and sits directly inside User Library/Remote Scripts (not nested in another folder), then restart Live and look again under Settings → Link/Tempo/MIDI.",
  },
  {
    q: "Bridge is connected but nothing happens in Live",
    a: "Make sure AbletonOSC is selected in a Control Surface slot and that no other app is using UDP ports 11000 or 11001. After updating the AbletonOSC-Extensions files, save your Set and restart Live, because Live can keep the old modules loaded.",
  },
  {
    q: "There's no sound in my audition",
    a: "Captured auditions need macOS and the audio capture permission for BeatMind Bridge. Turn off Ableton's arrangement and session recording before an audition. If BeatMind reports that the recording is silent, check the track's instrument, volume and audio routing. A quiet preview is flagged as quiet rather than treated as silent.",
  },
  {
    q: "BeatMind says it needs the audio capture helper",
    a: "Reinstall BeatMind Bridge from the latest disk image, which includes the capture helper, and allow audio capture when macOS asks.",
  },
  {
    q: "A sample pack I named can't be found",
    a: "Install the pack in Live, or copy its files into your User Library. Symlinked folders don't show up in Live's browser. BeatMind won't substitute another pack for one you named.",
  },
  {
    q: "A plugin parameter won't change",
    a: "The plugin may not expose that control to Live. Try a native Ableton device for that part, or adjust the control yourself.",
  },
  {
    q: "Bridge says it can't update itself",
    a: "That copy isn't running as an installed app. Download the current Bridge from beatmind.io and drag it into Applications.",
  },
];

export const MIXMIND_AVAILABILITY = MIXMIND_ON_SALE
  ? `On sale now: MixMind is ${formatUsd(MIXMIND_PRICE.monthly)}/month or ${formatUsd(MIXMIND_PRICE.yearly)}/year, and it's included in BeatMind + MixMind and Studio. ${MIXMIND_TRIAL_NOTE}`
  : `MixMind isn't on sale yet. These steps describe how it works once it launches. ${MIXMIND_TRIAL_NOTE}`;

export const MIXMIND_REQUIREMENTS: string[] = [
  "Rekordbox 6 or 7 with your library in it.",
  "Mac: Apple Silicon natively; Intel Macs run it through Rosetta 2. Windows: Windows 10 or 11 (x64).",
  "A BeatMind account on a MixMind, BeatMind + MixMind or Studio plan.",
];

export const MIXMIND_STEPS: GuideStep[] = [
  {
    id: "download",
    name: "Download MixMind",
    text: "Sign in on beatmind.io with a plan that includes MixMind, then download it for Mac or Windows from the MixMind page or Dashboard → Downloads.",
    details: ["Windows SmartScreen may warn about a new app: click More info → Run anyway."],
    link: { href: "/mixmind", label: "Go to MixMind" },
  },
  {
    id: "sign-in",
    name: "Sign in with your BeatMind account",
    text: "Open MixMind and sign in with the same email and password as beatmind.io. One account covers BeatMind, the Bridge and MixMind.",
    details: ["If you've been offline for more than 7 days, MixMind asks you to sign in again."],
  },
  {
    id: "library",
    name: "Let your library load",
    text: "MixMind reads your Rekordbox library and shows every track with BPM, key, genre and duration in a searchable table. Browsing never modifies your Rekordbox files.",
  },
  {
    id: "duplicates",
    name: "Clean up duplicates",
    text: "Open Duplicates and scan. For each pair, choose Keep Left or Keep Right. The other copy is hidden inside MixMind; nothing is deleted from Rekordbox or your drive.",
  },
  {
    id: "playlists",
    name: "Build AI playlists",
    text: "Ask for a playlist in plain English, for example “20 deep house tracks under 124 BPM in Am”. MixMind picks only from tracks you already own and saves the result to Playlists.",
  },
  {
    id: "set-builder",
    name: "Build a set with the Set Builder",
    text: "In Set Builder, quit Rekordbox and click Sync library, then let the first audio analysis finish. Choose the style (techno or minimal), a length from 60 to 240 minutes, a set type (Journey, Warm-up, Peak time or Closing), an optional BPM range, My style or Clean key mixing, and Skip played in the last 7, 30 or 90 days.",
    details: [
      "The first analysis takes a few seconds per track, so a large library needs a while. Later builds reuse it.",
      "Each build shows the BPM arc and key transitions so you can review the flow before you use it.",
    ],
  },
  {
    id: "add-to-rekordbox",
    name: "Add the set to Rekordbox",
    text: "Quit Rekordbox completely (Cmd+Q on a Mac), then click Add to rekordbox and name the playlist. MixMind backs up your Rekordbox library first (it keeps its three newest backups) and adds the set as a playlist. Open Rekordbox to see it.",
  },
  {
    id: "usb",
    name: "Get it onto your USB",
    text: "Plug in your Pioneer USB: MixMind detects it and lets you browse its PIONEER folder. To put a new playlist on the drive, open Rekordbox and sync the playlist to USB as usual.",
  },
];

export const MIXMIND_TROUBLESHOOTING: Faq[] = [
  {
    q: "MixMind says “Quit rekordbox and try again”",
    a: "MixMind only writes to Rekordbox while Rekordbox is closed. Quit the Rekordbox app completely (Cmd+Q on a Mac) and try again.",
  },
  {
    q: "Set Builder asks me to sync first",
    a: "Click ↻ Sync library with Rekordbox closed, wait for the audio analysis to finish, then build the set.",
  },
  {
    q: "MixMind says my account doesn't include it",
    a: "MixMind needs a MixMind, BeatMind + MixMind or Studio plan on the same BeatMind login. Right after checkout it can take a minute to show up.",
  },
];
