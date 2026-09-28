# Showcase audio

Audio for the "Made with BeatMind" (home page) and "Built with MixMind" (/mixmind) sections.
Both sections stay hidden until `src/lib/showcase.ts` has at least one entry for that product.

## Add a track

1. Export an MP3: 128–192 kbps, 3 minutes or shorter, loudness about -14 LUFS integrated.
   Use a lowercase file name with hyphens, e.g. `night-drive.mp3`.
2. Put it in this folder (`public/showcase/`).
3. Add an entry to `SHOWCASE` in `src/lib/showcase.ts`:

   ```ts
   {
     id: "night-drive",
     title: "Night Drive (loop)",
     product: "beatmind",            // or "mixmind"
     genre: "Melodic techno",
     bpm: 126,                       // optional
     key: "A minor",                 // optional
     description: "BeatMind built the kick, hats, bassline and lead; arranged and mixed by DJ Example.",
     audioSrc: "/showcase/night-drive.mp3",
     prompt: "Dark melodic techno loop at 126 BPM in A minor. Start with the kick.", // optional
     credit: "DJ Example",           // optional
   },
   ```

4. Build and check the page, then deploy the site as usual.

## Honesty rule

Only list tracks actually produced with BeatMind, or sets actually built with MixMind. Say what the
product did and what the person did ("BeatMind built drums, bass and lead; arranged and mixed by …").
Get the artist's permission before publishing their audio or name.
