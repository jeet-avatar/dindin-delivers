---
phase: quick-358
plan: 358
type: execute
wave: 1
depends_on: []
files_modified:
  - "arthaBuild:brd/runtime.py"
  - "arthaBuild:scripts/ab_compare_brd.py"
autonomous: true
requirements: [QWEN-BEDROCK-AB-01]
user_setup:
  - service: aws-bedrock
    why: "Temporary AWS creds (Bedrock invoke) passed as env vars to the one-off script run ONLY — do NOT touch the EC2 instance IAM role"
    env_vars:
      - name: AWS_ACCESS_KEY_ID
        source: "Temporary creds for AWS account 134607809447 with bedrock:InvokeModel on us.anthropic.claude-sonnet-4-6"
      - name: AWS_SECRET_ACCESS_KEY
        source: "Temporary creds (paired with above)"
      - name: AWS_SESSION_TOKEN
        source: "Temporary creds (if STS session)"
      - name: AWS_REGION
        source: "us-east-1 (or the region where the cross-region inference profile resolves)"

must_haves:
  truths:
    - "User can read the Qwen BRD output and the Bedrock/Claude BRD output for the same real intake (draft 2eb5e3be) side by side"
    - "Both BRD runs pass through the existing anti-leak guardrails (guarded_call + detect_brd_traps), unchanged"
    - "Production behavior is unchanged: BRD_LLM_PROVIDER defaults to ollama; bedrock is only used when explicitly set"
    - "The g5 GPU / Ollama keeps running as the fallback throughout — nothing is stopped, resized, or redeployed"
    - "A side-by-side summary prints output length, guardrail trap counts, section headings, and wall-clock time per provider"
  artifacts:
    - path: "arthaBuild:brd/runtime.py"
      provides: "_build_bedrock_llm(json_mode=...) returning an (system, prompt) -> str LLMCallable + BRD_LLM_PROVIDER env switch in build_default_deps()"
      contains: "_build_bedrock_llm"
    - path: "arthaBuild:scripts/ab_compare_brd.py"
      provides: "One-off harness that loads draft 2eb5e3be, runs the BRD pipeline once per provider, saves both outputs + warnings, prints the comparison"
      min_lines: 80
  key_links:
    - from: "scripts/ab_compare_brd.py"
      to: "brd/runtime.py:build_default_deps"
      via: "sets BRD_LLM_PROVIDER then builds PipelineDeps per provider"
      pattern: "BRD_LLM_PROVIDER"
    - from: "brd/runtime.py:_build_bedrock_llm"
      to: "bedrock-runtime.converse(us.anthropic.claude-sonnet-4-6)"
      via: "boto3 client converse call"
      pattern: "converse"
    - from: "brd/runtime.py:build_default_deps"
      to: "brd/llm_call.py:guarded_call + brd/anti_leak.py:detect_brd_traps"
      via: "guardrails wrap whichever llm callable is selected (preserved automatically)"
      pattern: "guarded_call"
---

<objective>
Build a NON-PRODUCTION A/B comparison harness for arthaBuild BRD generation: run one real past intake (draft `2eb5e3be`) through the full BRD pipeline twice — once on the current Qwen-7B via Ollama (the $686/mo g5 GPU), once on Claude via Amazon Bedrock — with the existing anti-leak guardrails active on BOTH providers, then print/save a side-by-side quality + hallucination comparison.

Purpose: Let the user eyeball Claude-vs-Qwen output quality and hallucination on a real intake BEFORE deciding whether to drop the idle GPU for pay-per-token Bedrock. This is decision-support only.

Output:
- `arthaBuild:brd/runtime.py` — new `_build_bedrock_llm(json_mode=...)` LLMCallable + `BRD_LLM_PROVIDER` env switch (default `ollama`)
- `arthaBuild:scripts/ab_compare_brd.py` — the one-off comparison harness
- On disk (EC2 / container): both rendered BRDs + both `warnings_json` + a printed side-by-side summary

IMPORTANT — this is the dollor-p2p (GSD) repo. Only THIS plan doc (`.planning/quick/358-*`) is committed here. The actual `runtime.py` and `ab_compare_brd.py` edits live in the SEPARATE arthaBuild codebase on EC2 host `44.194.34.223` (`/home/ubuntu/arthaBuild/`, container `/app/`). All `arthaBuild:`-prefixed paths above refer to that codebase, NOT this repo.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.agents/skills/ticketed-task/SKILL.md

# arthaBuild codebase (on EC2 host 44.194.34.223 / container arthaBuild-backend:/app/) — NOT in this repo
# - brd/runtime.py        : _build_llm(*, json_mode=False) -> LLMCallable; build_default_deps() -> PipelineDeps(llm, json_llm)
# - brd/llm_call.py        : LLMCallable Protocol (system: str, prompt: str) -> str ; guarded_call (model-agnostic guardrail)
# - brd/anti_leak.py       : detect_brd_traps (model-agnostic anti-leak)
# - DB: SQLite /app/data/arthaBuild.db, table brd_drafts, row id prefix 2eb5e3be (intake_json ~3487B)
# - SSH: ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 ; then docker exec arthaBuild-backend ...
</context>

<scope_boundaries>
OUT OF SCOPE — the plan must NOT do any of these (HARD CONSTRAINTS):
- NO production deploy, NO CI/CD (`gh workflow run ...`), NO image rebuild.
- NO resize / stop / start of the g5.xlarge instance. The GPU + Ollama keep running as the fallback the entire time.
- NO change to production default behavior: `BRD_LLM_PROVIDER` defaults to `ollama`; Bedrock is opt-in only.
- NO modification of the EC2 instance IAM role. Bedrock access comes ONLY from TEMPORARY AWS creds passed as env vars on the single one-off script run.
- This harness is decision-support only; it does not alter any live BRD that customers see.
</scope_boundaries>

<tasks>

<task type="auto">
  <name>Task 1: Locate arthaBuild source + create CR ticket + verify boto3/Bedrock reachability</name>
  <files>arthaBuild:scripts/ab_compare_brd.py (location decision only — no edits yet)</files>
  <action>
    Establish the work location and prerequisites before touching code.

    1. LOCATE the arthaBuild source. The arthaBuild code is NOT in this dollor-p2p repo. Check, in order:
       a. Is there a local clone? Run: `find ~ -maxdepth 4 -type d -name arthaBuild -not -path '*/node_modules/*' 2>/dev/null` and check for a `brd/runtime.py` inside any hit.
       b. If a local clone with `brd/runtime.py` exists AND it is git-synced to the EC2 host, you MAY edit locally then rsync. Otherwise, operate directly on the EC2 host over SSH:
          `ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223`
          Source on host: `/home/ubuntu/arthaBuild/` ; runtime inside container: `docker exec arthaBuild-backend cat /app/brd/runtime.py`.
       Record in the summary WHICH location you are editing (local clone path vs EC2 host path) so later tasks are unambiguous.

    2. Confirm the injection contract by reading the real file (do NOT guess):
       `docker exec arthaBuild-backend python -c "import inspect, brd.runtime as r; print(inspect.getsource(r._build_llm)); print('---'); print(inspect.getsource(r.build_default_deps))"`
       Verify `_build_llm(*, json_mode=False)` returns a callable with signature `(system: str, prompt: str) -> str`, and that `build_default_deps()` wires `PipelineDeps(llm=_build_llm(), json_llm=_build_llm(json_mode=True))`. Also confirm `brd/llm_call.py` exposes `LLMCallable` + `guarded_call`.

    3. Verify boto3 availability inside the container:
       `docker exec arthaBuild-backend python -c "import boto3; print(boto3.__version__)"`
       If it errors with ModuleNotFoundError, install it CONTAINER-LOCAL (NOT an image rebuild):
       `docker exec arthaBuild-backend pip install boto3` and re-verify. Note: a container-local pip install does not survive a container recreate — that is acceptable for a one-off harness.

    4. Verify the SQLite test intake exists:
       `docker exec arthaBuild-backend sqlite3 /app/data/arthaBuild.db "SELECT id, owner_email, industry, length(intake_json) FROM brd_drafts WHERE id LIKE '2eb5e3be%';"`
       Expect one row (owner hr@techcloudpro.com, industry netsuite_erp, intake_json length ~3487). Record the FULL id (e.g. 2eb5e3be-68ac-4719-89d7-cdadf3faf568).

    5. Create a Change Request ticket per .agents/skills/ticketed-task/SKILL.md (audit trail). Use change_type "code", priority "Low" (non-production research harness):
       title "quick-358: A/B test arthaBuild BRD generation — Qwen/Ollama vs Claude/Bedrock (non-prod harness)".
       Submit it. Capture the CR id for the commit message. If `ADMIN_SECRET_KEY` is unavailable, log a warning and continue — do NOT block the task.

    Do NOT modify the IAM role, do NOT deploy, do NOT stop the GPU.
  </action>
  <verify>
    - The chosen edit location is recorded (local clone path OR EC2 host path).
    - `docker exec arthaBuild-backend python -c "import boto3; print(boto3.__version__)"` prints a version.
    - The `brd_drafts` SELECT returns exactly one 2eb5e3be row with its full id and intake_json length ~3487.
    - CR id captured (or warning logged that ADMIN_SECRET_KEY was unavailable).
  </verify>
  <done>arthaBuild source location is confirmed, boto3 is importable in the container, the 2eb5e3be intake row is confirmed present with its full id, and a CR ticket exists (or is gracefully skipped).</done>
</task>

<task type="auto">
  <name>Task 2: Add _build_bedrock_llm + BRD_LLM_PROVIDER switch to brd/runtime.py (default ollama)</name>
  <files>arthaBuild:brd/runtime.py</files>
  <action>
    Add a Bedrock-backed LLMCallable alongside the existing Ollama one, selected by an env var that DEFAULTS TO OLLAMA so production is untouched.

    1. Add `_build_bedrock_llm(*, json_mode: bool = False) -> LLMCallable` to `brd/runtime.py`. It must return a callable with the SAME signature as `_build_llm`: `(system: str, prompt: str) -> str`. Implementation:
       - Lazy-import boto3 inside the function (so absence of boto3 never breaks the Ollama path / production import).
       - Build client: `boto3.client("bedrock-runtime", region_name=os.environ.get("AWS_REGION", "us-east-1"))`. Rely on standard boto3 env-var credential resolution (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_SESSION_TOKEN passed at run time). Do NOT hardcode creds and do NOT reference the instance IAM role.
       - Model id MUST be the cross-region inference profile `us.anthropic.claude-sonnet-4-6` (the raw on-demand id throws ValidationException — VERIFIED FACT). Make it overridable via `os.environ.get("BEDROCK_MODEL_ID", "us.anthropic.claude-sonnet-4-6")`.
       - The returned callable calls `client.converse(modelId=..., system=[{"text": system}], messages=[{"role": "user", "content": [{"text": prompt}]}], inferenceConfig={"temperature": 0.2})`.
         - For `json_mode=True`: append a strict JSON-only instruction to the prompt (e.g. "Respond with ONLY valid JSON, no prose, no markdown fences."), and after extracting the response text, tolerate/strip a leading ```json / trailing ``` fence before returning (mirror how the JSON node consumes json_llm output). Return the cleaned text string (the pipeline's existing JSON parsing handles the rest).
         - Extract text from the converse response: `resp["output"]["message"]["content"][0]["text"]`.
       - Return type is `str` to satisfy the `LLMCallable` Protocol — the guardrails (`guarded_call`, `detect_brd_traps`) wrap this callable automatically in build_default_deps, so do NOT re-implement guardrails here.

    2. Add the provider switch in `build_default_deps()`:
       - Read `provider = os.environ.get("BRD_LLM_PROVIDER", "ollama").strip().lower()`.
       - If `provider == "bedrock"`: build `llm = _build_bedrock_llm()` and `json_llm = _build_bedrock_llm(json_mode=True)`.
       - Else (DEFAULT, including unset or any other value): keep the existing `_build_llm()` / `_build_llm(json_mode=True)` path EXACTLY as today.
       - Whatever the provider, the existing guardrail wrapping around the callables in build_default_deps stays unchanged so anti-leak runs on both. (Confirm by reading current build_default_deps — if guarded_call is applied to the callables there, apply it identically to the bedrock callables.)
       - Keep `import os` present at module top.

    Constraint reminders: production default MUST remain ollama; do NOT remove or alter the Ollama path; do NOT add any deploy/CI step.
  </action>
  <verify>
    - Inside the container, default path still selects Ollama:
      `docker exec arthaBuild-backend python -c "import brd.runtime as r; d=r.build_default_deps(); print(type(d.llm))"` (no BRD_LLM_PROVIDER set) runs without error and uses the Ollama callable.
    - Bedrock path constructs without error when creds + provider are set:
      `docker exec -e BRD_LLM_PROVIDER=bedrock -e AWS_REGION=us-east-1 arthaBuild-backend python -c "import brd.runtime as r; print(r._build_bedrock_llm.__name__)"` prints `_build_bedrock_llm`.
    - `grep -n "BRD_LLM_PROVIDER\|_build_bedrock_llm\|converse" brd/runtime.py` (run against the edited file) shows all three present.
  </verify>
  <done>`_build_bedrock_llm(json_mode=...)` exists and returns an `(system, prompt) -> str` callable using `bedrock-runtime.converse` against `us.anthropic.claude-sonnet-4-6`; `build_default_deps()` selects provider via `BRD_LLM_PROVIDER` (default `ollama`); the Ollama path and guardrail wrapping are unchanged.</done>
</task>

<task type="auto">
  <name>Task 3: Write scripts/ab_compare_brd.py, run it on draft 2eb5e3be, print side-by-side comparison</name>
  <files>arthaBuild:scripts/ab_compare_brd.py</files>
  <action>
    Create the one-off harness that runs the full BRD pipeline twice on the same real intake and reports the comparison.

    1. Write `scripts/ab_compare_brd.py` (in the arthaBuild codebase). It must:
       - Accept the draft id (default `2eb5e3be`, matched via `LIKE '2eb5e3be%'`) and an output dir (default `/app/data/ab_compare/`).
       - Load `intake_json` for that draft from SQLite `/app/data/arthaBuild.db`, table `brd_drafts`. Parse it to the same shape the pipeline normally consumes (mirror how the existing BRD entrypoint loads intake — read the existing pipeline runner in the codebase rather than inventing the call signature).
       - For each provider in `["ollama", "bedrock"]`:
           a. Set `os.environ["BRD_LLM_PROVIDER"] = provider` BEFORE calling `build_default_deps()` so the right callable is built.
           b. Build `deps = build_default_deps()` and run the FULL BRD pipeline on the loaded intake (use the same pipeline-run function the production path uses — locate it in brd/ and call it; do NOT reimplement node logic). Guardrails run automatically inside the pipeline.
           c. Time the run with `time.perf_counter()` (wall-clock seconds).
           d. Capture: the rendered BRD output (HTML/markdown the pipeline produces) and the `warnings_json` (guardrail / anti-leak trap warnings the pipeline accumulates).
           e. Save to disk: `<outdir>/<provider>/BRD-Deck.html` (or the pipeline's native render extension) and `<outdir>/<provider>/warnings.json`.
       - The Ollama run MUST work with no AWS creds present. The Bedrock run requires AWS_* env vars; if Bedrock invoke raises (e.g. missing creds / AccessDenied), catch it, record the error for that provider, still save what's available, and continue so the Ollama side is never lost.
    2. Print a side-by-side summary table to stdout with, per provider: output length (chars), number of guardrail/anti-leak traps (len of warnings), the list of section headings extracted from the rendered output (regex the H1/H2 or deck section titles), and wall-clock generation time in seconds. Also print the two output file paths so the user can open both BRDs.
    3. RUN the harness once inside the container, passing TEMPORARY AWS creds as env vars (NOT via IAM role):
       `docker exec -e BRD_LLM_PROVIDER=bedrock -e AWS_REGION=us-east-1 -e AWS_ACCESS_KEY_ID=... -e AWS_SECRET_ACCESS_KEY=... -e AWS_SESSION_TOKEN=... arthaBuild-backend python /app/scripts/ab_compare_brd.py`
       (The script itself loops both providers; the creds are only needed for the bedrock leg. If the user has not provided creds yet, run the Ollama leg to prove the harness works, and clearly report that the Bedrock leg is pending creds.)
    4. Capture the printed summary and the saved file paths into the task summary so the user can compare. Do NOT deploy, do NOT touch the GPU, do NOT modify the IAM role.
  </action>
  <verify>
    - `docker exec arthaBuild-backend ls /app/data/ab_compare/ollama/` shows `BRD-Deck.html` (or native render) + `warnings.json`.
    - If creds were supplied: `docker exec arthaBuild-backend ls /app/data/ab_compare/bedrock/` shows the same two files; otherwise the run output explicitly states "bedrock leg pending AWS creds".
    - The script's stdout shows a side-by-side summary with per-provider output length, trap count, section headings, and wall-clock time.
    - Ollama-side numbers are non-zero (a real BRD was regenerated for draft 2eb5e3be).
  </verify>
  <done>Running `ab_compare_brd.py` regenerates the BRD for draft 2eb5e3be on Ollama (and on Bedrock when creds are passed), saves both rendered outputs + warnings to `/app/data/ab_compare/<provider>/`, and prints a side-by-side comparison of length / trap count / headings / time — with the GPU still running and production default unchanged.</done>
</task>

</tasks>

<verification>
- Production default is preserved: with `BRD_LLM_PROVIDER` unset, `build_default_deps()` uses the Ollama callable (Task 2 verify).
- Bedrock leg uses the cross-region inference profile `us.anthropic.claude-sonnet-4-6` via `converse` (grep in Task 2; successful invoke in Task 3 when creds present).
- Anti-leak guardrails (`guarded_call` / `detect_brd_traps`) ran on BOTH providers — reflected as non-empty/zero trap counts in each provider's `warnings.json`.
- No production deploy, no CI/CD, no instance resize/stop, no IAM-role change occurred (scope_boundaries honored).
- Both BRD outputs + both warnings files exist on disk and the side-by-side summary printed.
</verification>

<success_criteria>
- `brd/runtime.py` (arthaBuild) has `_build_bedrock_llm(json_mode=...)` + `BRD_LLM_PROVIDER` switch defaulting to `ollama`; Ollama path and guardrails unchanged.
- `scripts/ab_compare_brd.py` (arthaBuild) loads draft 2eb5e3be, runs the full pipeline per provider, saves outputs + warnings, prints the comparison.
- The user has, on disk and in the printed summary, a real side-by-side of Qwen/Ollama vs Claude/Bedrock for one real intake (output length, hallucination/anti-leak trap counts, section headings, wall-clock time) to inform the GPU-vs-Bedrock cost decision.
- The g5 GPU / Ollama remained running as the fallback throughout; nothing was deployed.
</success_criteria>

<output>
After completion, create `.planning/quick/358-a-b-test-brd-generation-qwen-ollama-vs-c/358-SUMMARY.md` recording: which arthaBuild location was edited (local clone vs EC2 host), the CR id (or that it was skipped), the printed side-by-side comparison numbers, the saved output file paths, and an explicit confirmation that no deploy / no IAM change / no GPU resize occurred.
</output>
