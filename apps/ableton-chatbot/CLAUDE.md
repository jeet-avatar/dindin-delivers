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

- BeatMind ships from **RELEASE branches, NOT `main`.** Deployed release =
  `origin/release/beatmind-audio-20260926`. Records: `STEM24_RELEASE_2026-09-27.md`,
  `DETAILED_STEMS_RELEASE_2026-09-27.md`.
- Backend: ECS `dollor-production/beatmind-api-service`, task def **29**
  (`musai-api:beatmind-stems-d0fdd7aa`). Rollback = task def 28. Deploys stop the old task first
  (min healthy 0%) — expect ~7 min of 503 (300 s target-group drain). Deploy in quiet windows.
- Frontend: `s3://beatmind-frontend` root + CloudFront `E3F24X4TEVJ9X2`. The bucket root also holds
  installers, `models/` and `releases/` — **never `aws s3 sync --delete` to the root.**
- Untracked files in `/Users/jeet/doordash-p2p/apps/ableton-chatbot` (stale `main`) are NOT unsaved work.

## Verification Protocol — MANDATORY

Never say "done" without proof: tests + real runs + production checks (see the release records).

## Safety Rules

- Do NOT push or deploy without explicit user OK. No hardcoded secrets.
- Stripe is **live**: never create prices or enable billing without the user's amounts.
- AWS `134607809447`, `us-east-1`.

## What Is Live (2026-09-27)

- **Stem set v2 (detailed):** `htdemucs_ft` (shifts 2, overlap 0.5, 24-bit) + reviewed drumsep
  (MIT, checkpoint SHA-256 `aefaa854…423f`, hosted at `www.beatmind.io/models/`) → vocals, bass,
  other, kick, snare, toms, cymbals(+hi-hat), plus parent drums. Engine: `backend/separation.py`;
  taxonomy `backend/stems.py` / `frontend/src/lib/stems.ts`. Stem lists come from each report.
- **Local (default, no hosting):** Bridge `local_separation.py` — file picker on the user's Mac,
  Apple GPU, stems to `~/Music/BeatMind Stems/`, only the report goes to the API. Bridge stack:
  `bridge/requirements-separation.txt` (torch 2.14 + demucs 4.1; torch 2.5 can't run htdemucs on MPS).
  Placing stems in Ableton needs `abletonosc/beatmind_stems.py` installed + Live 12.
- **BeatMind Cloud (paid lane):** browser → S3 presigned POST → AWS Batch GPU (`beatmind-cloud-separation`,
  g4dn/g5, scales to 0) → API imports stems. Infra: `infra/cloud-separation/provision.sh`; job image
  `backend/Dockerfile.gpu`. Cold start ~5 min.
- Standard CPU server upload still exists (four stems) as fallback when Cloud is unavailable.
- **Billing (branch `feat/beatmind-pricing-tiers`, not yet deployed):** plans and packs resolve from Stripe
  lookup keys + product metadata (`backend/catalog.py`); per-plan monthly track/cloud allowances and packs
  (`billing.py`); no-card 7-day app trial with 3 local tracks and an AI cap; webhook re-reads subscriptions from
  Stripe and stores processed event ids (`stripe_events`); one-click cancel/resume; AI usage log + fair-use cap
  (`ai_usage.py`). Env knobs are listed in `backend/.env.example`.

- **Sign-in and updates (2026-09-28, service api :34, :35 = same + email copy fix, web c0877660, Bridge 1.2.0 at www.beatmind.io/BeatMind-Bridge-1.2.0.dmg):** bridge tokens are signed
  JWTs (`typ=bridge`, 180 days) tracked in the `bridge_tokens` table, so deploys no longer sign Bridges out;
  web JWT auth rejects them. The Bridge keeps its token in the macOS Keychain (`credentials.py`), reconnects
  with backoff through 5xx/outages, and only a 401/403/4001 returns it to the login screen. `updater.py`
  checks `www.beatmind.io/bridge/latest.json` (launch + every 6 h), installs on click only (sha256 + Team
  PRKZ4UVCD7 + Gatekeeper), never during a separation. The dashboard `UpdateBanner` compares
  `/release.json` `frontend_commit` with the build-time `NEXT_PUBLIC_RELEASE_COMMIT` (always set both) and
  never reloads by itself. Product-update email: `backend/send_product_update.py` as an ECS one-off task;
  SES is in sandbox, so only verified addresses receive mail until production access is granted.
- **Secrets:** JWT_SECRET, ANTHROPIC_API_KEY, SMTP_PASSWORD come from Secrets Manager
  `beatmind/production/app` (task-def `secrets`). Start new task defs from the live revision. Stripe keys are
  still env vars (owned by the pricing session).
- **Deploys:** service runs max 100% / min 0% (single SQLite writer on EFS), so each deploy has ~2.5 min of
  503s (target group drain 20 s, health interval 10 s).

## Pending / Next Steps

1. **User must provide prices** (track packs, cloud per-track, included tracks/month) → create Stripe
   products/prices → set the two env vars → deploy → verify a real purchase.
2. Request SES production access before emailing all users (`send_product_update.py --campaign bridge-1.2.0`).
3. Real in-Ableton test of "Place stems in Ableton" in a disposable Live set (not run: it writes to
   the user's open set and needs the extension installed + Live restart).
4. Windows Bridge has no local separation yet (macOS only).
5. Security debt: STRIPE secrets are still plain task-def env vars → move to Secrets Manager (pricing session).
6. Production brain is `claude-haiku-4-5`; Opus 5.5 is enabled on Bedrock if quality is preferred over cost.

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
