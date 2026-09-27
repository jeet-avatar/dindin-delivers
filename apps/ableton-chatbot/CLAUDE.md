# BeatMind — Claude Code Working Instructions

You are picking up the BeatMind **stem-quality upgrade + pay-per-track GPU** work.
Read this file first, then read the handoff:
`~/.claude/handoffs/2026-09-27-beatmind-stem-quality-gpu.md`.

## What BeatMind Is

AI music-production assistant that **controls Ableton Live** (marketed at beatmind.io,
formerly "Musai"). Different app from MixMind (the CDJ USB exporter) — they only share
`io.beatmind.*` branding.

**Runtime path:** `beatmind.io cloud (Claude + FastAPI) ⇄WebSocket⇄ Bridge (local)
⇄OSC UDP 11000/11001⇄ AbletonOSC (Live remote script) ⇄ Ableton Live`.
The subscription/login/Stripe layer is only the cloud SaaS gate; the engine is
Claude tool-calls → OSC. Brain = `backend/claude_tools.py`
(`ABLETON_TOOLS`, `SYSTEM_PROMPT`, `tool_to_osc`).

Code lives here: `backend/`, `bridge/`, `frontend/`.

## Deployment Topology — READ BEFORE YOU PANIC

- BeatMind ships from **RELEASE branches, NOT `main`.**
- Deployed release = `origin/release/beatmind-audio-20260926` (head `f5180dc9`).
- This working folder (`apps/ableton-chatbot`) sits on **stale `main`**. The clean
  deploy checkout is the worktree `/tmp/beatmind-audio-release-20260926`.
- **The ~228 "untracked" files here are NOT unsaved work** — they are committed and
  pushed on the release branch; they only look untracked because the working dir is
  on `main`. Do not "rescue" them, do not `git add -A`, do not commit them to main.
- The stem-quality changes are on branch **`feat/stem-quality`** (commit `305e98e4`,
  PUSHED to origin, off `origin/release/beatmind-audio-20260926`). Fetch/checkout
  from origin — no longer `/tmp`-dependent.

## Verification Protocol — MANDATORY

**Never say "done" / "complete" / "works" without proof.**
- Backend: grep showing the route/field exists + actual run output (curl/pytest/CLI).
- "I edited the file" and "should work" are NOT proof. Run it, show the output.
- The quality upgrade is committed but **NOT runtime-verified** — a real
  `htdemucs_ft` separation must be run and its output confirmed BEFORE any deploy.
  CPU test run is ~30+ min; do it on GPU.

## Safety Rules

- **Do NOT push or deploy without explicit user OK.** Local edits/commits/tests are fine.
- Do not merge `feat/stem-quality` into a release branch without user approval.
- No hardcoded secrets. There are none in the repo today — keep it that way.
- This account: AWS `134607809447`, region `us-east-1`, IAM user `CRMaccesskey`.

## Current State of the Stem-Quality Upgrade (committed on `feat/stem-quality`)

All quality knobs are **env-driven; defaults preserve current behavior** (safe/reversible):

| Env var | Default | GPU deploy value |
|---------|---------|------------------|
| `DEMUCS_MODEL` | `htdemucs` | `htdemucs_ft` |
| `DEMUCS_DEVICE` | `cpu` | `cuda` |
| `DEMUCS_SHIFTS` | `0` | `2` |
| `DEMUCS_OVERLAP` | `0.25` | `0.5` |
| `DEMUCS_SEGMENT` | `7` | `7` |
| `REFERENCE_MAX_SECONDS` | `600` | `600` |

Also: 24-bit output (`pcm_s24le` decode + Demucs `--int24`), `--clip-mode clamp`,
Dockerfile `ARG DEMUCS_MODEL` for build-time model selection, and
`cached_model_ready()` now checks the *selected* model's manifest. `py_compile` passes.

## Pending / Next Steps (most important first)

1. **BLOCKING user decision:** flat per-track charge (e.g. $0.75) vs credit/quota
   bundle (e.g. 50 stems/mo included, then $X). Shapes the Stripe metered setup.
   Do NOT build billing until this is answered.
2. **Build pay-per-track GPU pipeline** (AWS Batch GPU, keeps audio in-account):
   decouple `reference_worker.py` into a containerized Batch job — Fargate API uploads
   mix to S3, submits Batch job (g5/g4dn, scale-to-zero), job runs `htdemucs_ft`,
   writes stems to S3, updates status. Note ~2–4 min cold-start.
3. **Wire per-track metering + Stripe usage-based billing**; add a `separations`
   usage log per user for the audit trail.
4. **Runtime-verify** the quality upgrade on GPU before deploy (see protocol above).
5. **Decide drumsep timing** — fold into the same GPU job (`htdemucs_ft` then a
   drumsep pass on the drums stem) or ship as a follow-on. drumsep (inagoy/drumsep)
   is **MIT — commercial-safe**. LarsNet is noncommercial — do NOT use it. Full
   drumsep also needs a derived-stem catalog + parent/child review rules + frontend UI.
6. **Deploy path when approved:** build ft image
   (`--build-arg DEMUCS_MODEL=htdemucs_ft`), set env
   (`DEMUCS_MODEL=htdemucs_ft`, `DEMUCS_DEVICE=cuda`, `DEMUCS_SHIFTS=2`,
   `DEMUCS_OVERLAP=0.5`), then merge/push. **Only with user OK.**

## Cost Economics (pay-per-track)

- g5.xlarge $1.006/hr, g4dn.xlarge $0.526/hr (us-east-1).
- `htdemucs_ft` + shifts ≈ 2–3 min GPU/track.
- All-in ~$0.10–0.25/track (warm ~$0.05, cold ~$0.15–0.20 + S3/egress ~$0.06).
- Suggested user price $0.50–1.00/track = 3–5x margin.
- **Constraint:** `beatmind-api` runs on **Fargate (2 vCPU/8GB, no GPU)** → GPU
  separation MUST be a separate scale-to-zero job. User explicitly wants usage-based
  (per-track) billing that scales to zero, NOT a fixed monthly GPU fee.

## AI Model Config

Model selection is env-driven in `backend/ai_provider.py`
(`BEATMIND_MODEL` + `BEATMIND_AI_PROVIDER=bedrock`). To run BeatMind's backend on
Opus 5.5: `BEATMIND_MODEL=us.anthropic.claude-opus-5-5`. Opus 5.5 is ACTIVE on
Bedrock in this account (us-east-1/us-west-2), inference-profile-only.

## Key Files

| File | Why It Matters |
|------|----------------|
| `backend/reference_worker.py` | Stem pipeline; env-driven quality knobs + 24-bit. Needs decoupling into a Batch GPU job. |
| `backend/references.py` | `cached_model_ready()` honors `DEMUCS_MODEL`. |
| `backend/Dockerfile` | `ARG DEMUCS_MODEL`; a GPU (CUDA base + torch-cuda) variant still needs authoring. |
| `backend/ai_provider.py` | Env-driven model selection (`BEATMIND_MODEL`, `BEATMIND_AI_PROVIDER`). |
| `backend/stripe_routes.py` | Where per-track Stripe usage-based billing hooks in. |
| `backend/claude_tools.py` | The Ableton tool/OSC brain. |
| `STEM_REVIEW_AUDIT_2026-09-27.md` | Prior drumsep evaluation + model taxonomy notes. |
