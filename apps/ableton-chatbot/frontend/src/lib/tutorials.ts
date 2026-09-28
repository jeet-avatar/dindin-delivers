// Video tutorials shown on /guide.
//
// To publish a video: upload it to the BeatMind YouTube channel, copy the ID from its URL
// (https://www.youtube.com/watch?v=<ID> or https://youtu.be/<ID>, 11 characters) and paste it
// into that entry's `youtubeId`. Add `duration` too, e.g. "4:12". Entries without a youtubeId
// render as "Coming soon" cards, so nothing on the page links to a missing video.

export type TutorialProduct = "beatmind" | "mixmind";

export interface Tutorial {
  id: string;
  title: string;
  product: TutorialProduct;
  youtubeId?: string;
  duration?: string;
  description: string;
}

export const TUTORIALS: Tutorial[] = [
  {
    id: "setup",
    title: "Setup in 4 minutes",
    product: "beatmind",
    description: "Install BeatMind Bridge, enable AbletonOSC in Live and sign in until the dashboard says Bridge connected.",
  },
  {
    id: "first-loop",
    title: "Your first loop",
    product: "beatmind",
    description: "One prompt, one part at a time: a kick, hats and a bassline, each reviewed from its captured audition.",
  },
  {
    id: "refining-sounds",
    title: "Make it warmer: refining sounds",
    product: "beatmind",
    description: "Refine a part in plain English: levels, sends, supported device controls and a different sound when it isn't working.",
  },
  {
    id: "reference-tracks",
    title: "Using reference tracks",
    product: "beatmind",
    description: "Separate a reference into stems, confirm its timing and turn it into a planning brief for your own original parts.",
  },
  {
    id: "mixmind-clean-library",
    title: "MixMind: clean your library",
    product: "mixmind",
    description: "Load your Rekordbox collection, review duplicate pairs and keep the version you want.",
  },
  {
    id: "mixmind-2-hour-set",
    title: "MixMind: build a 2-hour set",
    product: "mixmind",
    description: "Sync your library, pick a set type and BPM range, then add the finished set to Rekordbox as a playlist.",
  },
];

// A YouTube video ID is exactly 11 URL-safe characters.
export function isValidYouTubeId(id: string | undefined): id is string {
  return typeof id === "string" && /^[A-Za-z0-9_-]{11}$/.test(id);
}
