# BeatMind 24-bit stem release (Phase 0)

Release branch: `release/beatmind-audio-20260926`, backend commit `0e9eedee`.

## Artifacts

- Backend image: `musai-api:beatmind-stem24-0e9eedee`, digest
  `sha256:431bad9eceac19076c4cd8986d3b75338a24b60f57bc227ef2469d426a1440af`.
- ECS service: `dollor-production/beatmind-api-service`; task definition 28
  (task definition 27 with only the image and `BEATMIND_RELEASE_SHA` changed).
- Previous backend: `beatmind-api:27`, image tag `beatmind-reference-busy-20260926`
  (`86796f6a`). Rollback: update the service to `beatmind-api:27`. No database
  or storage format change; existing 16-bit references remain readable.
- `release.json` updated to backend `0e9eedee` / task 28 (invalidation
  `I87J8ZM81XJ31MXUJ4KEQ2R4NN`). Frontend and bridge are unchanged.

## Change

Stems and the decoded mix are written as 24-bit PCM (`pcm_s24le`, Demucs `--int24`,
`--clip-mode clamp`). The model and speed are unchanged: `htdemucs`, CPU, shifts 0.
Quality knobs (`DEMUCS_MODEL`, `DEMUCS_DEVICE`, `DEMUCS_SHIFTS`, `DEMUCS_OVERLAP`,
`DEMUCS_SEGMENT`) are env-driven and left at their defaults in production.

Do not set `htdemucs_ft` / shifts on this Fargate service: a 40-second clip took
315 s at shifts 2 on two CPU threads (about 8x real time), so tracks over roughly
3.5 minutes would exceed the 30-minute worker timeout.

## Verification

- 223 backend tests, 8 bridge tests and 14 frontend unit tests passed; production
  frontend build passed with `NEXT_PUBLIC_API_URL=https://api.beatmind.io`.
- The release image separated a 10-second clip with networking disabled and
  `BEATMIND_REQUIRE_CACHED_MODEL=1`: four `pcm_s24le` stems, checks passed.
- Rollout completed with one running task; circuit breaker did not trigger.
  The API returned 503 for about seven minutes, mostly the target group's
  300-second deregistration delay with `minimumHealthyPercent` 0.
- Signed-in production upload of a 40-second owned test clip: `ready` in about
  70 s, 123 BPM, C minor candidate, four aligned stems; downloaded drums and bass
  from the production API were `pcm_s24le`, 44.1 kHz stereo. The test reference
  was deleted afterwards.
- The account was at its five-reference limit, so the synthetic QA fixture
  `BeatMind QA - 1f386151.wav` was backed up, deleted and re-uploaded from its
  decoded mix. It now has a new id and 24-bit stems. The four music references
  were not modified.
