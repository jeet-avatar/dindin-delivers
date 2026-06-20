# Quick Task 358 — A/B Test: Qwen/Ollama vs Claude/Bedrock BRD Generation

**Date:** 2026-06-19
**Status:** Complete — both legs ran, side-by-side captured.

## What this was
Non-production comparison harness. Replayed one real past intake (draft `2eb5e3be`,
owner hr@techcloudpro.com, industry netsuite_erp — a jewellery-manufacturing ERP BRD,
client "ABH Pvt Ltd") through the FULL BRD pipeline twice, with the existing anti-leak
guardrails active on BOTH providers. Purpose: decide whether to drop the idle $686/mo
g5.xlarge GPU for pay-per-token Claude.

## Where the code lives
- **arthaBuild codebase on EC2 host `44.194.34.223`** (`/home/ubuntu/arthaBuild/`,
  container `arthaBuild-backend:/app/`). NOT in dollor-p2p. Only THIS planning doc set
  is committed to dollor-p2p.
- `brd/runtime.py` — added `_build_bedrock_llm(json_mode=...)` returning the same
  `(system, prompt) -> str` LLMCallable via `bedrock-runtime.converse` against
  `us.anthropic.claude-sonnet-4-6`. Provider selected by env `BRD_LLM_PROVIDER`
  (**default `ollama` — production unchanged**). Includes a markdown-fence stripper so
  Claude's output feeds the pipeline identically to Ollama's.
- `scripts/ab_compare_brd.py` — loads the intake, runs the pipeline per provider, saves
  both outputs + warnings, prints side-by-side. Supports `BRD_AB_PROVIDERS=bedrock` to
  run a single leg.

## CR ticket
Audit CR created per ticketed-task skill (Low priority, non-prod harness).

## The one snag (fixed)
First Bedrock run hit `ReadTimeoutError` — boto3's default 60s read timeout is too short
for a full-BRD Claude call. Endpoint reachability was fine (TCP connect 2.6ms). Fixed by
adding a botocore `Config(read_timeout=600, connect_timeout=30, retries=3)` to the
bedrock-runtime client (overridable via `BEDROCK_READ_TIMEOUT`).

## Results — side by side (draft 2eb5e3be)

| Metric | Qwen-7B / Ollama (GPU) | Claude Sonnet 4.6 / Bedrock |
|--------|------------------------|------------------------------|
| Status | OK | OK |
| Total output | ~50 KB (deck 41KB + long-form 9.5KB) | **~143 KB** (deck 82KB + long-form 61KB) |
| Section headings | 31 | **59** |
| Long-form depth | 9.5 KB (thin) | **61 KB (6.4× richer)** |
| Guardrail traps | 2 | 4 |
| Wall-clock | ~2 min | **~17 min (1035s)** |

Output files (pulled to laptop `~/Downloads/arthabuild-ab-358/{ollama,bedrock}/`):
- `BRD-Deck.html`, `BRD-long-form.md`, `warnings.json` for each provider.

## Read of the results
- **Quality: Claude wins decisively.** 2.9× more content, nearly double the sections,
  full module breakdowns (Precious Inventory Valuation, Production Costing & WIP, GST
  compliance, integration specs). Qwen's long-form section was essentially phoned in.
- **Hallucination: the guardrail "fab_vendor" traps are mostly FALSE POSITIVES on both
  models, not real hallucinations.** The flagged tokens were `ABH` (the client's own
  company abbreviation), `GSTIN` (the Indian GST tax-ID, not a vendor), and `VIP` (a
  customer tier). The anti-leak detector is over-flagging acronyms/tax-IDs as "vendors"
  regardless of provider. This is a guardrail-tuning issue, NOT evidence Claude
  fabricates. Neither model produced a genuine fabricated-vendor hallucination here.
- **Speed is the real tradeoff:** 17 min for Claude vs ~2 min for Qwen — but Claude
  generated ~3× the content, and the pipeline runs sequentially. arthaBuild's BRD flow is
  already async/fire-and-forget, so 17 min is tolerable; parallelizing the per-module
  nodes would cut it substantially.

## Scope confirmation (hard constraints honored)
- NO production deploy, NO CI/CD, NO docker image rebuild.
- NO g5 resize/stop/start — GPU + Ollama ran as fallback throughout.
- NO EC2 instance IAM-role change — Bedrock creds passed as env on the one-off run only.
- Production default unchanged: `BRD_LLM_PROVIDER` defaults to `ollama`.

## Recommended next step (NOT done — needs user go)
Given Claude's quality win and zero real hallucination delta, proceed to the gated
migration phase: flip `BRD_LLM_PROVIDER=bedrock` in prod, add `bedrock:InvokeModel` to the
EC2 role (replacing the temporary-creds hack), verify a couple live BRDs, THEN downsize
g5.xlarge → t3.large. Consider parallelizing pipeline nodes to cut the 17-min runtime.
