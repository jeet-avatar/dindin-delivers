# BeatMind

AI music-production assistant that **controls Ableton Live** via natural language.
Marketed at [beatmind.io](https://beatmind.io) (formerly "Musai").

> Not to be confused with **MixMind** (the CDJ/Rekordbox USB exporter). The two apps
> only share `io.beatmind.*` branding.

## Architecture

```
beatmind.io cloud (Claude + FastAPI)
        ⇅  WebSocket
   BeatMind Bridge (runs on the user's Mac)
        ⇅  OSC / UDP 11000 (send) · 11001 (recv)
   AbletonOSC (Live remote script)
        ⇅
   Ableton Live
```

- The subscription / login / Stripe layer is **only** the cloud SaaS gate.
- The actual engine is Claude tool-calls translated to OSC messages.
- Brain: `backend/claude_tools.py` — `ABLETON_TOOLS`, `SYSTEM_PROMPT`, `tool_to_osc`.

## Repository Layout

| Dir | Contents |
|-----|----------|
| `backend/` | FastAPI service, Claude/Bedrock provider, stem pipeline, Stripe routes |
| `bridge/` | Local WebSocket ⇄ OSC bridge that talks to AbletonOSC |
| `frontend/` | Web UI |

## Deployment Topology

BeatMind ships from **release branches, not `main`**.

- Deployed release: `origin/release/beatmind-audio-20260926` (`f5180dc9`).
- Clean deploy checkout (worktree): `/tmp/beatmind-audio-release-20260926`.
- The `apps/ableton-chatbot` working folder tracks stale `main`; files that appear
  "untracked" there are already committed on the release branch. This is expected.
- Stem-quality work-in-progress: branch `feat/stem-quality` (`305e98e4`, pushed).

## Stem Separation (Demucs)

Reference tracks are separated into `drums / bass / vocals / other` using
[Demucs](https://github.com/adefossez/demucs). Production currently runs base
`htdemucs` on CPU tuned for speed. The `feat/stem-quality` branch makes every quality
knob **environment-driven**, with defaults that preserve the existing CPU behavior:

| Env var | Default (current) | Higher-quality GPU |
|---------|-------------------|--------------------|
| `DEMUCS_MODEL` | `htdemucs` | `htdemucs_ft` |
| `DEMUCS_DEVICE` | `cpu` | `cuda` |
| `DEMUCS_SHIFTS` | `0` | `2` |
| `DEMUCS_OVERLAP` | `0.25` | `0.5` |
| `DEMUCS_SEGMENT` | `7` | `7` |
| `REFERENCE_MAX_SECONDS` | `600` | `600` |

Output is 24-bit (`pcm_s24le` decode + Demucs `--int24`, `--clip-mode clamp`).

### Build a higher-quality image

```bash
docker build --build-arg DEMUCS_MODEL=htdemucs_ft -t beatmind-api:ft backend/
```

The Dockerfile preloads model weights at build time so runtime never triggers a
download (`BEATMIND_REQUIRE_CACHED_MODEL=1` enforces this).

### Drum sub-separation (planned)

[drumsep](https://github.com/inagoy/drumsep) (**MIT — commercial-safe**) can split the
`drums` stem into kick / snare / toms / cymbals. LarsNet is noncommercial and must not
be used. Full drumsep integration additionally needs a derived-stem catalog,
parent/child review rules, and frontend UI.

## Pay-Per-Track GPU (planned)

`beatmind-api` runs on **Fargate (2 vCPU / 8 GB, no GPU)**, so high-quality GPU
separation must run as a **separate scale-to-zero job** (AWS Batch GPU recommended,
which keeps audio in-account):

1. Fargate API uploads the mix to S3.
2. API submits an AWS Batch job (g5/g4dn, scale-to-zero).
3. Job runs `htdemucs_ft`, writes stems back to S3, updates status. (~2–4 min cold start.)
4. Per-track metering feeds Stripe usage-based billing; a `separations` log per user
   provides the audit trail.

**Cost:** g5.xlarge $1.006/hr, g4dn.xlarge $0.526/hr (us-east-1);
`htdemucs_ft` + shifts ≈ 2–3 min/track → all-in ~$0.10–0.25/track. Target user price
$0.50–1.00/track (3–5x margin). Billing model is **usage-based per track, scale-to-zero**
— explicitly not a fixed monthly GPU fee.

## AI Model Configuration

Model is env-driven in `backend/ai_provider.py`:

```bash
BEATMIND_AI_PROVIDER=bedrock
BEATMIND_MODEL=us.anthropic.claude-opus-5-5   # Opus 5.5 (Bedrock, us-east-1/us-west-2)
```

Bedrock is used to bill via AWS (account `134607809447`) rather than a separate
Anthropic subscription.

## Local Development

Run the Ableton bridge directly (no cloud/subscription) via Bedrock:

```bash
cd backend
venv/bin/python direct_runner.py
```

Requires AbletonOSC installed at
`~/Music/Ableton/User Library/Remote Scripts/AbletonOSC` and selected as a Control
Surface in Live (Live then holds UDP :11000; verify with an OSC `/live/test` → `ok`).

### AbletonOSC gotchas (this build)

- `/live/browser/list samples` overflows one UDP datagram (`Message too long`) — you
  can't enumerate the samples category; load by exact name via `load_sample` / `load_device`.
- `get/has_clip` and `get/is_playing` return no boolean. Use ground truth instead:
  `/live/clip/get/length`, `/live/clip/get/notes`, `/live/track/get/num_devices`,
  `/live/song/get/current_song_time` (advancing = transport playing).
- Live's browser indexes real files under `~/Music/Ableton/User Library/Samples/` but
  does **not** follow symlinks — copy packs in, don't symlink.

## Safety / Deployment Rules

- Do **not** push or deploy without explicit approval.
- **Never** declare work done without runtime proof (see `CLAUDE.md`).
- No secrets in the repo.
- Every frontend/backend change follows the release-branch workflow, not `main`.
