# BeatMind detailed stems, local separation, Cloud HQ and track packages

Release branch `release/beatmind-audio-20260926`, commit `d0fdd7aa`.

## Artifacts

- Backend image `musai-api:beatmind-stems-d0fdd7aa`
  (`sha256:9398bf5b4a34b942d4d257cf543e8ff1eb13efa1f99d2991b18563564de966de`), ECS task definition 29
  (task definition 28 plus the image, `BEATMIND_RELEASE_SHA` and the three `BEATMIND_CLOUD_*` settings).
  Rollback: update the service to `beatmind-api:28`. The only schema change is two new tables
  (`credit_ledger`, `separations`), which older code ignores.
- GPU job image `musai-api:beatmind-gpu-798a2779`
  (`sha256:df3d69b0225b8384569e5b874ce9e15203ab16faabfea62ce61f26184e98c9d7`), Batch job definition
  `beatmind-cloud-separation:1`, created by `infra/cloud-separation/provision.sh`.
- Cloud resources: bucket `beatmind-cloud-separation-134607809447` (private, SSE, TLS only, one-day
  expiry, CORS POST from beatmind.io), roles `BeatMindBatchInstanceRole` and `BeatMindSeparationJobRole`,
  inline policy `BeatMindCloudSeparation` on the API task role, security group `beatmind-batch-gpu`,
  launch template and compute environment/queue `beatmind-cloud-separation` (g4dn/g5, AL2023 NVIDIA,
  0 to 16 vCPUs).
- Frontend `d0fdd7aa` at the site root, immutable copy `s3://beatmind-frontend/releases/web/d0fdd7aa/`,
  previous site `s3://beatmind-frontend/releases/web-before-d0fdd7aa/`, invalidation `I8XXX1K4ZHTWRL2T1KJUHKPJ7L`.
- drumsep checkpoint and MIT license at `https://www.beatmind.io/models/`; public SHA-256 verified.

## Behaviour

- Stem set v2: `htdemucs_ft` (shifts 2, overlap 0.5, 24-bit) plus the reviewed drumsep split: vocals,
  bass, other, kick, snare, toms, cymbals (with hi-hat), and the parent drums file for reference.
- Standard server uploads are unchanged (four stems, CPU). The web upload now uses BeatMind Cloud when
  it is available: the browser posts to S3, a Batch GPU job separates, the API imports the stems and
  deletes the S3 objects.
- Local separation runs in the Bridge (released separately); the web app offers it only when a Bridge
  with `local_separation_v1` is connected.
- Billing is dormant: `BEATMIND_INCLUDED_TRACKS` and `BEATMIND_PACKS` are unset, so separations are
  logged but not limited. Package prices must be created in Stripe before enabling.

## Verification

- 260 backend, 16 bridge and 16 frontend unit tests passed; production frontend build passed.
- Release image with networking disabled: application import, migration to a copy of the schema,
  cached model and a real four-stem separation.
- Direct Batch job: `htdemucs_ft` on CUDA, eight 24-bit stems, checks passed; cold start about 285 s.
- Production after deploy: five existing references readable, `/api/stripe/usage` 200 (new tables
  present), cloud available. A signed-in run from the www.beatmind.io page uploaded to S3 (204), ran on
  a GPU and was ready in 301 s with eight detailed stems; the kick stem served by production was
  `pcm_s24le`. The test reference and its S3 objects were deleted; the compute environment returned
  to 0 vCPUs.
- The QA fixture was deleted to free a slot and re-uploaded from its backup; all five references ready.
- Real browser, signed in, 1440 x 1000: References shows the local and GPU options, no console errors,
  no failed requests. The API returned 503 for about seven minutes during the rollout (target-group
  drain with `minimumHealthyPercent` 0).
