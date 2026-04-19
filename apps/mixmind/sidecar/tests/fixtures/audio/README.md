# Audio Test Fixtures

**Phase 21-02 integration tests.**

This directory is intentionally empty in git. Tests that need audio generate it
programmatically via `numpy + soundfile` into `tmp_path`, so nothing large is
committed.

## Synthetic track recipe (see `tests/test_analyze_imported.py`)

Each track:

- 10 s, 44.1 kHz, 1-channel WAV
- 440 Hz sine carrier (A4 musical tone — essentia `KeyExtractor` should classify
  as `A major / minor`)
- 80 Hz kick click every `60/128 = 0.46875 s` (128 BPM → madmom
  `RhythmExtractor2013` / `DBNBeatTrackingProcessor` should land within ±5 of 128)
- Short (50 ms) kick envelope, amplitude clipped to `[-1.0, 1.0]`

## Why synthetic?

Committing real audio bloats the repo (even 10 s MP3s are ~160 KB each), and
our oracle is behavioural: we verify that *every* required field
(`bpm / camelot / beat_grid_mm / waveform_4stem / sections_mm / auto_cues_mm`)
is populated after analysis. Exact BPM/key values only need to be within a
broad tolerance, so a synthetic track with a known BPM and tone is sufficient.

The reference accuracy oracle (`~/Library/Pioneer/rekordbox/master.db`) is
used in Phase 21-05 live runs, not here.
