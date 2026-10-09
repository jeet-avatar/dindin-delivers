// Showcase tracks: "Made with BeatMind" on the home page and "Built with MixMind" on /mixmind.
// A section renders only when it has at least one entry, so an empty list shows nothing.
//
// Honesty rule: list only tracks actually produced with BeatMind (or sets actually built with
// MixMind). Say what the product did and what the human did, e.g.
// "BeatMind built drums, bass and lead; arranged and mixed by <credit>." Get the artist's
// permission before publishing their audio or name.
//
// Audio: put the MP3 in public/showcase/ (see public/showcase/README.md) and reference it as
// "/showcase/<file>.mp3".
//
// Example entry:
// {
//   id: "night-drive",
//   title: "Night Drive (loop)",
//   product: "beatmind",
//   genre: "Melodic techno",
//   bpm: 126,
//   key: "A minor",
//   description: "BeatMind built the kick, hats, bassline and lead as Session clips; arranged and mixed by DJ Example.",
//   audioSrc: "/showcase/night-drive.mp3",
//   prompt: "Dark melodic techno loop at 126 BPM in A minor. Start with the kick.",
//   credit: "DJ Example",
// },

export type ShowcaseProduct = "beatmind" | "mixmind";

export interface ShowcaseItem {
  id: string;
  title: string;
  product: ShowcaseProduct;
  genre: string;
  bpm?: number;
  key?: string;
  description: string;
  audioSrc?: string; // "/showcase/<file>.mp3"
  prompt?: string;
  credit?: string;
}

export const SHOWCASE: ShowcaseItem[] = [];

export function showcaseFor(product: ShowcaseProduct): ShowcaseItem[] {
  return SHOWCASE.filter((item) => item.product === product);
}
