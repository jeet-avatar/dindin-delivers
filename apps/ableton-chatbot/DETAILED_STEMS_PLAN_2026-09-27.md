# Detailed stems, local separation, cloud HQ and track packages

Decisions (user, 2026-09-27):

- Monthly subscription plus prepaid track packages (10, 25, ... tracks).
- Default: separation runs on the user's own computer through the Bridge. Audio
  never reaches BeatMind hosting. Optional paid "BeatMind hosts it" lane,
  pay as you go.
- Highest stem quality, and detailed stems rather than four.

## Stem set v2 ("detailed")

`htdemucs_ft` (shifts 2, overlap 0.5, 24-bit) gives vocals, bass, other and drums.
drumsep (inagoy/drumsep, MIT, checkpoint SHA-256 `aefaa854...423f`) then splits
drums into kick, snare, toms and cymbals (cymbals include hi-hat).

Review stems: vocals, bass, other, kick, snare, toms, cymbals. The parent `drums`
file is kept for listening and integrity only and is not a review choice, so
drum material is never counted twice. Legacy four-stem references keep their
original list. Every consumer reads the stem list from the reference report.

Not added: Demucs 6-source (piano documented as poor), LarsNet (noncommercial).

## Phase 1: local separation in the Bridge

1. `backend/separation.py`: shared engine without FastAPI imports. Runs Demucs,
   optional drumsep, model cache checks. Used by the Fargate worker, the Bridge
   and the cloud job.
2. Stem lists generalized in backend (`stems.py`) and frontend.
3. Bridge `local_reference` operation: native file picker on the user's Mac,
   separation on MPS/CUDA/CPU, stems written to `~/Music/BeatMind Stems/<name>/`,
   progress and the analysis report (no audio) sent to the backend, optional load
   into new Ableton audio tracks.
4. Backend stores local references (`storage: local`): report and review files
   only. Server audio features that need audio (browser playback, OpenAI listening,
   sound comparison) are replaced by "open in Ableton / show in Finder" for local
   references.
5. Bridge packaging with torch; models downloaded on first use into
   `~/Library/Application Support/BeatMind/models`, pinned by SHA-256.
   Signed and notarized DMG.

## Phase 2: BeatMind Cloud HQ (paid)

Browser uploads directly to S3 (presigned PUT, lifecycle expiry). AWS Batch GPU
job (g4dn/g5, scale to zero) runs the same engine and writes stems and report to
S3. The API imports results into the reference directory and deletes S3 objects.

## Phase 3: billing

Credit ledger per user (track credits, cloud credits), Stripe Checkout one-time
packs, cloud usage charged per track. A `separations` usage log records every
local and cloud separation (counts only, no audio). Prices come from the user.
