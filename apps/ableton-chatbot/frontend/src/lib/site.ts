export const BASE_URL = "https://www.beatmind.io";
export const SITE_NAME = "BeatMind";
export const LEGAL_NAME = "Zietra Technologies Inc.";
export const SUPPORT_EMAIL = "support@beatmind.io";
// Ableton Live 12 starter set; "Open new Live Set" uses it once saved as the Live default set.
export const STARTER_TEMPLATE_URL = "/templates/BeatMind-Starter.als";

export const LEGAL_POSTAL_ADDRESS = "12 Teaberry, Rancho Santa Margarita, CA 92688, USA";

export const GOVERNING_LAW_STATE = "California";
export const LEGAL_LAST_UPDATED = "September 28, 2026";

export const TRIAL_DAYS = 7;
export const TRIAL_TRACKS = 3;
export const TRIAL_AI_MESSAGES = 50;
export const TRIAL_TERMS = `${TRIAL_DAYS}-day free trial with ${TRIAL_TRACKS} tracks included. No credit card required.`;
export const TRIAL_SHORT = `Free trial: ${TRIAL_DAYS} days · ${TRIAL_TRACKS} tracks · no card`;
export const TRIAL_DETAILS = `The ${TRIAL_DAYS}-day free trial needs no credit card and includes ${TRIAL_TRACKS} tracks, separated on your own Mac, and limited AI (about ${TRIAL_AI_MESSAGES} messages). Cloud HQ separations and packs need a paid plan. You're never charged unless you choose a plan, and starting a plan during the trial ends the trial and begins the plan immediately.`;

export const OG_IMAGE = "/og.png";
export const OG_IMAGE_MIXMIND = "/og-mixmind.png";
export const OG_IMAGE_BLOG = "/og-blog.png";
export const OG_IMAGE_SIZE = { width: 1200, height: 630 };

// Official social profiles: footer icons and Organization.sameAs.
// Add each account only once it exists. Never add unverified links.
export const SOCIAL_LINKS: { name: string; url: string }[] = [
  { name: "Instagram", url: "https://www.instagram.com/beatmindio/" },
  { name: "TikTok", url: "https://www.tiktok.com/@beatmindio" },
  { name: "YouTube", url: "https://www.youtube.com/@beatmindio" },
  { name: "X", url: "https://x.com/beatmindio" },
  { name: "Facebook", url: "https://www.facebook.com/profile.php?id=61595121410950" },
];
export const SOCIAL_PROFILES: string[] = SOCIAL_LINKS.map((link) => link.url);

export const HOME_TITLE = "BeatMind — AI Music Producer for Ableton";
export const HOME_DESCRIPTION =
  "BeatMind is an AI music producer that works inside Ableton Live — describe a sound and build drums, bass and melodies part by part in your own Live Set. Plans from $19/month; 7-day free trial with 3 tracks, no card.";

export function absoluteUrl(path: string): string {
  return path === "/" ? `${BASE_URL}/` : `${BASE_URL}${path}`;
}
