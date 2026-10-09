# Stem Review Persistence and Drum Separation

## Deployed Release

- Frontend runtime `37611bc42935956cf644e6c18571ee953cab2cb6`, pushed to `release/beatmind-audio-20260926` and archived at `s3://beatmind-frontend/releases/web/37611bc4/`.
- CloudFront invalidation `I8XHJCPDZW1VJHK3M9YU8MUV0X` completed; public release manifest verified.
- Backend remains `beatmind-api:27`, source `86796f6a48fe2ca49f22761a0bfa77e530b3f056`; Bridge unchanged.
- Stem-review and listening browser contracts passed against deployed assets at both 1440px and 390px using intercepted API fixtures.
- Separate authenticated real-production test used Full Moon, actual API reads and actual audio. All four players decoded and advanced playback, with only one active at a time. Tests were muted and are not a claim of human audition or perceptual approval.
- All four real WAV download buttons succeeded: 70,097,356 bytes each, 397.377052 seconds. Downloaded drums hash exactly matched the source used for the local separation. Bass, vocals and other were saved beside the four new drum estimates, producing seven distinct full-length files in Downloads.
- Validation and saved-choice readback worked on the real reference. Zero mutating production requests, zero page errors; user's review and Ableton set unchanged. Desktop/mobile screenshots inspected.
- Changed files mirrored to the original workspace after baseline checks; unrelated local changes preserved.

## Scope

Repair saving and navigation for the existing four-source reference workflow. Replace the previous inline stem review rather than retain competing implementations. No production audio, creative approvals, reference timing or Ableton sets are changed by this release.

Production inspection found all five saved references ready with passing stored stem-integrity checks, but no saved stem decisions. This is not evidence of missing audio files. The previous interface conflated files already saved with a separate, incomplete review and did not explain its disabled save button.

## Changes

- Separate saved-audio, draft-choice, confirmed-review and unconfirmed-save states.
- Persist unfinished decisions per account, reference and analysis in local storage. Unsaved listening confirmation is not restored.
- Visible validation identifies missing choices and listening confirmation. Preserve choices through server-busy errors.
- Block duplicate submissions synchronously. Retain an uncertain submission across reload and recover through authoritative readback instead of silently retrying.
- A successful POST remains a successful save if the following overview refresh fails. Update parent state immediately from the receipt.
- Audition and authenticated WAV download beside every stem. Native audio controls, explicit failures, retry, one player at a time and pause when leaving the stem step.
- Preserve the review gate for needs-work and all-excluded choices. A saved review is not necessarily an approved template input.
- Explicit Continue to timing and Continue to listening actions. Timing saves also remain successful when only the following refresh fails.

## Verification

- Optimized frontend build passed.
- All 13 frontend unit test files passed.
- Twelve backend timing/review tests passed, including file persistence, fresh listing readback, ownership, incomplete review rejection and needs-review gating.
- Thirteen existing reference backend tests and the desktop/mobile song-project workflow also passed.
- New browser contracts passed at 1440px and 390px: integrity refresh, missing fields, draft reload, all four audition/download controls, busy response, duplicate clicks, successful POST/failed GET, lost-response reload recovery, saved-choice readback and timing split/merge/cue/save/next.
- Existing listening, reference-status and replacement browser regressions passed at both widths.
- Browser failure cases use intercepted API fixtures. They do not claim a real user's creative approval or certify separation quality.
- Existing npm audit findings remain in Next, nanoid, postcss and sharp. This change adds lucide-react; it does not upgrade unrelated framework dependencies or claim the dependency tree is vulnerability-free. The deployed frontend is a static export, not a Next server.

## Detailed Drum Evaluation

User selected Full Moon. The source is its existing saved drums WAV, not a different song or a newly synthesized substitute. The local evaluation script never writes to Ableton or changes the server review.

- Current production Demucs output is drums, bass, vocals and other. This is the selected model's taxonomy, not a universal maximum.
- Evaluated the trained four-source [inagoy/drumsep](https://github.com/inagoy/drumsep) model: kick, snare, toms and cymbals including hi-hat. No separate hi-hat output is claimed.
- Reviewed checkpoint globals and use restricted tensor deserialization plus the model class allowlist. Pin downloaded checkpoint SHA-256 `aefaa8543c9b9c75e22f5f32b53ab86dfe416457849af1383ff1aef83401423f`.
- Local script refuses existing output directories, validates model/input shape, finite aligned output, saved file frame counts and distinct audio hashes, and records provenance and common anti-clipping gain in a manifest.
- Twenty-second evaluation passed file checks. These checks do not establish perceptual quality or pure instrument isolation.
- Full Moon's complete 397.377052-second saved drums were subsequently processed in 223.8 seconds on CPU. Four stereo 44.1 kHz, 24-bit WAVs, each 17,524,328 frames, passed readback/alignment/distinct-hash checks. Shared output attenuation was 0.489 dB to prevent clipping. Files are in `~/Downloads/BeatMind Stems/Full Moon - Drum Study 2026-09-27/`, with a provenance/limitations manifest. Perceptual quality still requires review.
- [LarsNet](https://github.com/polimi-ispl/larsnet) separates hat and cymbals but its pretrained weights use a noncommercial license. It was not added to the commercial service.
- Experimental Demucs six-source output adds guitar and piano, not individual drums: [Demucs documentation](https://github.com/facebookresearch/demucs/blob/main/README.md).

Extra drum outputs are a local evaluation, not a deployed backend feature. Production integration still needs a durable separation job, authenticated derived-stem catalog, parent/child review rules that avoid counting drums twice, template support, quality evaluation and model licensing/deployment review. A larger number of labeled files must not be represented as guaranteed clean isolation.
