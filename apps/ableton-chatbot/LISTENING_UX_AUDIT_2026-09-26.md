# Listening Submission and Accuracy Audit

## Deployed Release

- Frontend runtime: `03b2babe35d66bb6b85527c86ae2acf980cf043a`, pushed to `release/beatmind-audio-20260926`.
- Archive: `s3://beatmind-frontend/releases/web/03b2babe/`.
- CloudFront invalidation `I3U6P6GCYFT8XNPA14RWBUCDL0` completed. Public release manifest verified.
- Backend remains `beatmind-api:27`, source `86796f6a48fe2ca49f22761a0bfa77e530b3f056`; no restart.
- New listening browser contracts passed against deployed assets at 1440px and 390px, using intercepted API fixtures with no paid provider calls.
- Separate authenticated production check loaded the real Full Moon reference, verified the visible send action and explicit accuracy limits, and confirmed submission without consent made zero mutating API requests. Desktop/mobile screenshots inspected.
- Existing reference-status and replacement browser suites also passed at both widths locally.
- All seven release files mirrored to the original workspace with identical Git hashes; unrelated changes preserved.

## Scope

Frontend-only repair of reference listening submission and result presentation. No model, backend, source audio, saved analysis or Ableton project was changed. No paid provider request was made during this audit.

The old inline listening component was replaced, not left alongside a competing implementation.

## Listening Workflow

- Explicit Send listening request form, visible action area and actionable validation instead of an unexplained disabled button.
- Drafts retained in session storage per signed-in account and reference. Consent is never restored and resets when scope, range or layer changes.
- Submitted intent, server timestamps, original-mix/excerpt scope, real interval progress, status checks and cancellation are visible.
- Synchronous duplicate-click guard. An accepted POST is not reported as a failed listening job when the following GET fails.
- Unconfirmed submissions survive reload and block automatic retries. Recovery matches saved request identity, intent and time, excluding the previous job/excerpts. After a fresh status check more than two minutes later with no matching or active job, dismissal requires an explicit user action and renewed consent.
- Checked notes are shown separately from older intents and unchecked history. Coverage is recomputed from valid original-mix intervals for the displayed intent, with missing intervals listed. Old global coverage cannot mark a running new whole-track job complete.
- Measured RMS values are separate from explicitly unverified musical interpretations. Whole-track listening does not imply each separated stem was analyzed, an exact effect chain was recovered, or a track was built in Ableton.

## Actual Production Audio Audit

Reference: Full Moon, Arthur Davidson.

- Original WAV: 397.377052154195 seconds, 44,100 Hz, stereo, 16-bit PCM.
- Saved whole-track job: complete, 14 of 14 intervals, no failed intervals.
- Original-mix windows cover every frame from start to finish, with no gaps.
- Independently recomputed first/last three-second RMS and their difference for each window: all 42 values match the stored measurements within 0.011 dB.
- An additional 20-second drums excerpt is a separate request, not evidence of whole-track analysis of every stem.

### Semantic Accuracy Is Not Certified

The current provider validator checks JSON shape, required observation fields and consistency with large endpoint level changes. This does not verify every sentence or independently establish instrument identity, harmony, structure or processing.

Examples requiring review:

- Original-mix descriptions speculate about separation artifacts. Only the original mix was supplied to those calls, so separation artifacts cannot be assumed from the request.
- 56.768-85.152 seconds: measured endpoint RMS increases 7.73 dB while the model labels energy as steady.
- 227.073-255.457 seconds: measured endpoint RMS increases 7.42 dB while the model labels energy as steady.
- The existing 12 dB consistency threshold does not reject these cases. Musical energy and RMS loudness are different quantities, so these are review flags, not proof that the musical characterization is necessarily false.
- Whole-track coverage is assembled from consecutive excerpts of at most 30 seconds. It is not proof of an independently verified whole-song interpretation.

No claim of zero hallucinations or complete reconstruction is justified. No saved AI prose was silently rewritten or retrospectively marked accurate.

### Tempo Follow-Up

The saved Full Moon report shows 123 BPM. The current librosa onset/autocorrelation setup at 22,050 Hz and hop length 512 has a 21-frame tempo bin at 123.046875 BPM, matching that rounded result. The filename's 122 is not treated as ground truth.

A straight-line fit to the saved detected beats in 90-180 seconds gives 121.998664 BPM with a 13.045 ms 95th-percentile residual. Other windows fit less cleanly; a whole-track fit gives 122.331612 BPM with a 166.998 ms 95th-percentile residual. This is evidence that the current coarse estimate and beat sequence require refinement and full-track grid validation. It is not certification of a corrected global BPM. No production tempo or timing map was altered.

## Verification

- Optimized production build and TypeScript checks passed.
- All 13 frontend unit test files passed, including request identity, stale-read protection, per-intent coverage, gaps, invalid ranges and consent-related state.
- 21 focused backend tests passed: actual WAV delivery to the provider, incomplete-response rejection, large-level-change validation, ownership/consent gates, partial failure recovery, template privacy/revisions and constraints. Provider responses in these tests are mocked; they do not certify musical accuracy.
- New browser contracts passed at 1440px and 390px: draft restoration, fresh consent, empty/invalid input, duplicate clicks, accepted POST followed by failed GET, job progress, lost-response recovery, stop, rate limiting, excerpt submission, four playable stem fixtures, review, timing, manual template approval/download and planning-only chat handoff.
- Existing song-project browser regressions passed at both widths. These verify new-song isolation, upload/consent/discussion, saved-song restoration and explicit Live Set selection without production.
- Desktop and mobile screenshots inspected for readable controls and horizontal overflow.

## Accuracy Acceptance Design

Recommended next engineering work, not claimed implemented by this UI release:

1. A claim-level evidence contract: measured, estimated, user-confirmed or unknown. Never convert model self-confidence into verified status.
2. Deterministic checks for measurable properties; independent estimators plus ambiguity reporting for tempo, beats, key and section candidates.
3. Source-aware prompts and validation: original mix versus estimated stems; silence/low-signal abstention; no invented source plugins, presets, MIDI or effect settings.
4. A labeled evaluation corpus containing real originals, stems, silence, noise, tempo changes, ambiguous keys and genre diversity. Evaluate each claim category separately with declared error tolerances.
5. Timing and stem review gates before template construction, with explicit unresolved conflicts. User confirmation is a creative acceptance decision, not scientific proof of an estimate.
6. Rendered arrangement playback and timing checks before declaring a template usable. Proposed effects for a new track must remain proposals, not claims about the reference's original production.

The objective is complete accountability for every published claim, not an unsupported 100% musical-accuracy badge.

## Established Engine Candidates

Research only; no dependency or analysis-engine replacement was deployed in this release.

- [Essentia KeyExtractor](https://essentia.upf.edu/reference/std_KeyExtractor.html): HPCP-based key/scale extraction, tuning correction and selectable key profiles. [Repository](https://github.com/MTG/essentia), [licensing information](https://essentia.upf.edu/licensing_information.html).
- [Mixxx libkeyfinder](https://github.com/mixxxdj/libkeyfinder): C++ musical-key estimator used by Mixxx, GPL-3.0-or-later. Candidate for independent comparison, subject to deployment/license review.
- [librosa 0.11 beat tracker](https://librosa.org/doc/0.11.0/generated/librosa.beat.beat_track.html): already used by BeatMind; outputs estimated tempo and beat locations and accepts time-varying tempo. The immediate gap is refinement and full-track validation, not the absence of a standard library. [ISC license](https://github.com/librosa/librosa/blob/main/LICENSE.md).

The current Full Moon key profile scores are F major 0.679, F minor 0.627 and C major 0.458. These are correlations, not probabilities or a verified key. Benchmarking should distinguish tonic errors, major/minor ambiguity, relative keys, modulations and weak tonal evidence. Cross-engine agreement is corroboration, not proof.
