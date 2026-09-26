# Dark Current

Current editable set: **Peak Bites - Dark Current 123 - Ready 02.als**.

123 BPM, 4/4, 192 musical bars plus a four-bar tail: 6:22.439.
17 audio lanes, 2,372 editable Arrangement clips, 105 distinct Peak Bites
source files out of the pack's 162. No finished demo track, full-mix loop,
reference stem, external synthesizer or other sample pack is used.

## Song Map

| Section | Time | Bar |
| --- | --- | --- |
| Intro | 0:00 | 1 |
| Groove In | 0:31 | 17 |
| Pressure | 1:02 | 33 |
| Build I | 1:34 | 49 |
| Drop I | 2:05 | 65 |
| Breakdown | 3:07 | 97 |
| Build II | 3:39 | 113 |
| Drop II | 4:10 | 129 |
| Release | 5:12 | 161 |
| DJ Outro | 5:43 | 177 |
| Tail | 6:15 | 193 |

The first noise riser lasts eight bars; the second lasts sixteen. Native Auto
Filter sweeps, reverse Peak Bites train-FX swells, accelerating snare/hat rolls,
one-beat repeats and brief low-end gaps lead into the drops. The two drops use
different bass/synth rotations, offset phrases and shuffled percussion.

## Media and Processing

- `Samples/Originals`: exact copied Peak Bites sources, retained for editing.
- `Samples/Processed`: 107 prepared assets, including role-specific variants.
  Rubber Band pitch-preserving stretch fits loops to 123 BPM; corrective
  high/low cuts, peak balancing and beat-synced bass ducking are baked into these
  versions. Native filter, Echo, Reverb and Beat Repeat settings remain editable.
- `composition-manifest.json`: every source, hash, clip placement, gain and
  arrangement automation. Source files remain local; do not publish the pack.
- `Review`: native full Main render, actual Live output captures, timing and
  level audits. The initial silent capture is retained as a failed diagnostic;
  `live-verification.json` describes the passing relinked captures.
- `Exports`: versioned delivery files and their final format/loudness report.
  Matching copies are placed in `/Users/jeet/Downloads` without overwriting
  existing files. The export is a checkpoint, not a frozen editing project.

## Verification

Ready 02 was opened and saved in Live 12.2.7 after correcting initial project
folder/media resolution and unwarped clip end-marker issues. Native Collect
All and Save was completed. All 107 referenced processed files are inside this
project, with no missing paths. The old Original Groove project is separate,
with a preserved before-Peak-Bites checkpoint.

All 2,372 starts were checked through OSC, and the native-saved clip edges match
the composition plan. Both build/drop captures contain audio without clipping;
the rising filter and transition repeats activate. The full 6:22.439 native
render passes duration, signal, clipping, ending and intro-pulse checks. See
the JSON reports for exact measurements. A very quiet breakdown is intentional
in this first export and remains an obvious listening-review point.

This is an arranged song and a measured export, not a claim of subjective
approval or professional mastering. WAV/MP3 formats are compatible with
Rekordbox; no Rekordbox library or USB device has been modified.

Technical note: Live's `Clip.length` is not meaningful for unwarped audio;
verification uses actual starts and native-saved right edges instead:
https://docs.cycling74.com/apiref/lom/clip/
