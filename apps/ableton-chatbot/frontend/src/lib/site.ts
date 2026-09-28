export const BASE_URL = "https://www.beatmind.io";
export const SITE_NAME = "BeatMind";
export const LEGAL_NAME = "Zietra Technologies Inc.";
export const SUPPORT_EMAIL = "support@beatmind.io";

export const TRIAL_DAYS = 7;
export const TRIAL_TERMS = `${TRIAL_DAYS}-day free trial, no credit card required. Cancel anytime.`;

export const OG_IMAGE = "/og.png";
export const OG_IMAGE_MIXMIND = "/og-mixmind.png";
export const OG_IMAGE_BLOG = "/og-blog.png";
export const OG_IMAGE_SIZE = { width: 1200, height: 630 };

// Official social profile URLs for Organization.sameAs. Intentionally empty:
// add each URL here once the account exists. Never add unverified links.
export const SOCIAL_PROFILES: string[] = [];

export const HOME_TITLE = "BeatMind — AI Music Producer for Ableton";
export const HOME_DESCRIPTION =
  "BeatMind is an AI music producer that works inside Ableton Live — describe a sound and build drums, bass and melodies part by part in your own Live Set. Plans from $19/month, 7-day free trial.";

export function absoluteUrl(path: string): string {
  return path === "/" ? `${BASE_URL}/` : `${BASE_URL}${path}`;
}
