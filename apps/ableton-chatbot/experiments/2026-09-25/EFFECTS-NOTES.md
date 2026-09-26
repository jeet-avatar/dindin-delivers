# Effects Study 01: Kick and Bass

This is an estimated listening study, not a recovered production session.
Audio-capable model observations are preserved in the adjacent JSON files.
They may be incorrect; separated stems can contain bleed and artificial tails.

## Evidence and Hypotheses

| Source passage | Reported audible character | Possible explanation, not confirmed |
| --- | --- | --- |
| Drums, 00:32-00:44 | Clear attacks, steady pulse, generally dry, possible short snare tails | Source envelopes/transient processing; possible short room ambience |
| Bass, 00:32-00:44 | Rounded, mostly centered, some harmonic colour and mild tonal variation | Synth timbre or light saturation; envelope/filter movement possible |
| Full mix, 01:10-01:22 | Atmospheric background, wider high-frequency layers | Reverb/stereo sound design; exact routing and effect identity unknown |

Confidence in specific processing causes is low. No exact plugin, compressor
settings, sidechain routing, delay subdivision or reverb decay was identified.
Vocals and the separated Other stem have not received a dedicated effects pass.
Do not infer whole-song automation from these short excerpts.

## One-Effect Experiment

Added only Ableton Saturator after Operator on YOUR Bass:

- Soft Sine curve; Drive 4.0 dB; Dry/Wet 35%; Color Off.
- Output left at its discovered 0.0 dB default.
- Every changed parameter independently read back from Live.
- No MIDI, kick processing, send levels, reverb or delay changed.
- Original set preserved as `Original Groove - Before Bass Saturation.als`.
- Current writing set saved with this experiment active, pending user preference.

The effect made the raw groove louder. Listening files use constant gain only
to remove that advantage; no loudness compressor or limiter was applied.

| Comparison file | Measured integrated loudness | True peak |
| --- | --- | --- |
| Reference-Matched.wav | -23.00 LUFS | -12.66 dBTP |
| Dry-Fresh-Matched.wav | -23.00 LUFS | -12.94 dBTP |
| Saturation-Matched.wav | -23.00 LUFS | -14.04 dBTP |

Reference playback is the separated drums and bass combined from 00:32-00:40,
not the full original mix. Our captures are approximately 8.5 seconds. The
reference contains additional percussion, so this is not an exact arrangement
or source-count match. Full-mix comments are context, not properties we claim
the current two-part loop reproduces.

Both versions of our groove were recorded from actual Ableton output. Signal,
headroom and loudness checks passed; musical improvement awaits user judgment.
This manual study is not an implemented or deployed automatic effects detector.
