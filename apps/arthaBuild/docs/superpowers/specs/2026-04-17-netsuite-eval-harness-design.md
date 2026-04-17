# NetSuite Eval Harness — Design Spec

**Date:** 2026-04-17
**Status:** Design approved (sections 1–5). Spec review iteration 2.
**Goal:** Identify which of ArthaBuild's 5 NetSuite competence dimensions is weakest, so the next round of improvement work targets the highest-leverage gap.

**File layout** (per CLAUDE.md project rule #2 — separate MDs):
```
tests/eval/
├── run_eval.py                  # runner
├── score.py                     # deterministic + judge scoring
├── report.py                    # report generator + clusterer
├── judge_prompt.md              # full LLM judge system prompt + few-shots
├── cases/
│   ├── README.md                # case schema + per-dimension authoring guide
│   ├── A_coverage.json
│   ├── B_accuracy.json
│   ├── C_execution.json
│   ├── D_pattern.json
│   └── E_scenario.json
└── runs/<timestamp>/
    ├── meta.json
    ├── <case_id>.json
    └── REPORT.md
```

---

## 1. Scope

**One-shot discovery, not permanent CI.**

The harness exists to answer one question: *which dimension of NetSuite competence is weakest right now?* It is not a regression suite. After the first run produces actionable signal, the harness can be re-run periodically but is not gated on PRs.

**Five dimensions, eight test cases each = 40 cases total.**

| Code | Dimension | What it measures |
|------|-----------|------------------|
| **A** | Coverage breadth | Does ArthaBuild handle the full surface area of SuiteScript types — Map/Reduce, User Event, Workflow Action, RESTlet, Scheduled, Client, modules (N/record, N/search, N/query, N/https, N/task)? |
| **B** | Accuracy depth | Does it use real field IDs, real internal IDs, real sublist names, real script context properties — or does it hallucinate? |
| **C** | Execution loop | Can it scaffold a deployable SDF project — `objects/`, `deploy.xml`, `manifest.xml`, correct file references — that NetSuite would actually accept? |
| **D** | Pattern quality | Does the generated code follow NetSuite production patterns — governance budgeting, error handling, performance (search.create vs `lookupFields`), idempotency? |
| **E** | Real-scenario fluency | Does it solve end-to-end business scenarios — Order-to-Cash automation, Procure-to-Pay flows, Record-to-Report close tasks — not just isolated functions? |

8 cases per dimension is enough to see directional signal without overfitting to a single example. 40 total keeps full-corpus runs cheap (~$1–2 with prompt caching) and reviewable in one sitting.

**Out of scope for this harness:**
- Multi-turn conversations (each case is one prompt, one response)
- UI/UX testing (no frontend coverage)
- Latency benchmarking (correctness only)
- Hallucination detection at the token level (the LLM judge handles this holistically)

---

## 2. Runner

**Location:** `tests/eval/run_eval.py`
**Entry point:** `python tests/eval/run_eval.py [--cases A1,A2,...] [--smoke]`

**Backend contract (verified against `apps/arthaBuild/src/backend/rawapi.py:439`):**

| Concern | Resolution |
|---------|------------|
| Endpoint | `POST /api/chatbot/process` (NOT `/api/chat`) |
| Request body | `{"message": str, "session_id": str}` |
| Response | Single-shot JSON: `{"response": str, "intent": str, "session_id": str, "latency_ms": int}`. **Not streamed.** |
| Auth | `Authorization: Bearer <jwt>` header |
| Rate limit | `10/minute` (`@limiter.limit("10/minute")` at line 440) |
| Conversation isolation | Pass unique `session_id` per case (e.g., `eval-A-1-<run_ts>`). The backend keys history off `session_id`, so a fresh string = fresh conversation. No new-conversation endpoint needed. |
| License gate | Backend returns 402 if license invalid (line 446). Runner must surface this as a hard failure for the whole batch, not per-case — abort with clear message. |
| AI-readiness gate | Backend returns 503 if `_ai_ready` false (line 448). Same handling — abort with clear message. |

**Rate-limit strategy:** 10 req/min ⇒ 6s minimum spacing per case ⇒ 40 cases × 6s = 4 min minimum batch wall-time. Runner sleeps 6.5s between cases. No parallelism (would just hit the limiter).

**Required env vars** (also documented in `.env.example`):

| Variable | Purpose |
|----------|---------|
| `EVAL_BACKEND_URL` | e.g. `https://artha.build` (no trailing slash) |
| `EVAL_DEV_EMAIL` | Account in `DEVELOPER_EMAILS` whitelist (bypasses company-email gate) |
| `EVAL_DEV_PASSWORD` | Password for that account |
| `ANTHROPIC_API_KEY` | For Claude Opus 4.7 judge calls |

**Auth flow:**
1. POST `/api/auth/login` once at startup with `EVAL_DEV_EMAIL` / `EVAL_DEV_PASSWORD`.
2. Extract `access_token` from response. **Login response is a frozen interface — see `apps/arthaBuild/CLAUDE.md` § FROZEN INTERFACES.** Flat fields: `{access_token, refresh_token, token_type:"bearer", first_name, last_name, email, user_type, role}`.
3. Reuse for all 40 cases. Re-login on 401 (one retry).

**Per-case execution:**
1. Build unique `session_id = f"eval-{case.id}-{run_timestamp}"`.
2. POST `/api/chatbot/process` with `{"message": case.prompt, "session_id": session_id}` and Bearer auth.
3. Read JSON response synchronously (no streaming).
4. Persist to `tests/eval/runs/<timestamp>/<case_id>.json`.
5. Sleep 6.5s.

**Failure handling:**
- Per-case timeout (120s) → record `{score: 0, error: "timeout"}`, continue.
- HTTP 5xx → retry once with 5s backoff, then record as failure.
- HTTP 401 → re-login once, retry the failing case.
- HTTP 402 or 503 → **abort entire batch** with clear error (license/AI not ready is a global condition).
- HTTP 429 → sleep 60s and retry once.
- The runner does not support resume mid-batch. A full re-run takes ~5 min and costs ~$1; resume is over-engineering. (Resolved open question #2.)
- On batch abort (402/503), partial per-case JSONs already on disk in `runs/<timestamp>/` are preserved. The report step is skipped — `meta.json` records `"aborted": true` with the reason for post-mortem.

**Case file format** — universal schema, used for all 5 dimensions. See per-dimension example cases in Section 6.

```json
{
  "id": "A-1",
  "dimension": "A",
  "prompt": "string — the user message sent to /api/chatbot/process",
  "must_include": ["array of substrings that MUST appear in response"],
  "must_not_include": ["array of substrings that MUST NOT appear"],
  "expected_record_types": ["array of NetSuite record type IDs to mention"],
  "expected_files": ["optional — for C dimension: filenames the response should reference"],
  "requires_code": true,
  "rubric": "string — passed to the LLM judge as case-specific scoring guidance"
}
```

`expected_files` is optional, only used by C-dimension cases. The deterministic scorer treats it like `must_include` (each filename is a substring check).

**`requires_code` flag:** Defaults to `true`. If a case asks an explanation/design question with no code expected (likely some E or A "compare these approaches" cases), set `false`. The deterministic scorer then **skips the JS-parses 15-pt check and reweights the deterministic side to 40 pts** (all sub-scores re-normalized) so design cases aren't auto-penalized.

**`must_include` / `must_not_include` matching rule:** Plain substring match, case-sensitive. False positives from comments are accepted as a known limitation — the LLM judge catches semantic miss when this happens. Token-boundary matching is YAGNI for one-shot discovery.

**`meta.json` contents** (one per run):
```json
{
  "run_id": "2026-04-17T14-32-00Z",
  "git_commit_sha": "fbaa6696...",
  "backend_url": "https://artha.build",
  "model_under_test": "qwen2.5:14b",  // read from /health/detail JSON path .ollama_model
  "judge_model": "claude-opus-4-7",
  "case_count": 40,
  "started_at": "2026-04-17T14:32:00Z",
  "finished_at": "2026-04-17T14:38:14Z"
}
```
No env-var values, no secrets, no PII.

---

## 3. Scoring

**Hybrid 55/45 split — deterministic checks first, LLM judge second.**

### Deterministic (55 pts)

| Check | Points | How it's measured |
|-------|--------|-------------------|
| `must_include` tokens present | 15 | Each token is a substring check on the response. Score = `15 × (matched / total)`. |
| `must_not_include` tokens absent | 10 | Any forbidden token present → 0. All absent → 10. |
| JavaScript parses | 15 | Extract fenced ```` ```js ```` / ```` ```javascript ```` blocks. Parse each with **`esprima` (Python port — `pip install esprima`)** in `tolerant=True` mode. Each block must parse → full points. Any parse error → 0. If no JS blocks present in a case where rubric requires code → 0. |
| Expected record types mentioned | 10 | Every entry in `expected_record_types` appears in the response → 10. Score = `10 × (matched / total)`. |
| Sanity checks pass | 5 | Non-empty response AND completed within 120s AND `> 100` chars → 5. Else → 0. |

### LLM-as-judge (45 pts) — Claude Opus 4.7 via Anthropic SDK

| Criterion | Points | What the judge looks for |
|-----------|--------|--------------------------|
| `technical_correctness` | 0–10 | Would this code actually run in NetSuite? Are field IDs real? |
| `production_readiness` | 0–10 | Error handling, governance, logging, idempotency. |
| `hallucination_risk` | 0–15 | **Highest weight.** Any invented field IDs, fake API methods, made-up modules → low score. This matches the product promise of zero-hallucination NetSuite work. |
| `completeness` | 0–10 | Does it answer the actual question, or punt with TODOs? |

**Judge implementation:**
- One Anthropic API call per case (40 calls per full run).
- Anthropic SDK with **prompt caching** on the system prompt + reference snippets + few-shots.
- Estimated cost: $1–$2 per full 40-case run.
- Judge prompt returns strict JSON. Reasoning preserved in per-case JSON for spot-checking.

### 3.5 Judge Prompt Skeleton

The full prompt lives in `tests/eval/judge_prompt.md`. Skeleton:

```
[SYSTEM — cached]
You are a senior NetSuite consultant scoring an AI assistant's response to a SuiteScript question.

You are scoring on 4 criteria. Return STRICT JSON, no prose:
{
  "technical_correctness": <0-10>,
  "production_readiness": <0-10>,
  "hallucination_risk": <0-15>,
  "completeness": <0-10>,
  "reasoning": "<2-3 sentences explaining the lowest score>"
}

## Scoring Anchors

### technical_correctness (0-10)
- 10: Code is correct, runnable in NetSuite, field IDs verified.
- 7: Code runs but has minor issues (wrong sublist line accessor, missing context check).
- 4: Code has logic error or wrong API method (e.g., uses `record.lookupFields` for >1 field when `search.lookupFields` is needed).
- 0: Code references non-existent APIs or modules.

### production_readiness (0-10)
- 10: Try/catch, governance budget check (`runtime.getCurrentScript().getRemainingUsage()`), logging via `log.audit/error`, idempotent.
- 7: Has try/catch but missing governance budget; or governance present but no logging.
- 4: Bare happy-path code, no error handling, no governance awareness.
- 0: Would crash on first edge case (null sublist, governance exhausted, etc.).

### hallucination_risk (0-15)  -- HIGHEST WEIGHT
- 15: Every field ID, record type, module, and method is verifiably real in NetSuite 2024.x.
- 10: Mostly correct, one minor invented field name.
- 5: Multiple invented field IDs OR wrong record type structure.
- 0: Fabricated APIs (`N/erp/automation`), fake modules, invented field IDs throughout.

### completeness (0-10)
- 10: Solves the asked problem end-to-end. No TODOs.
- 7: Solves the core, leaves a small piece (e.g., "you'll want to add filtering for X").
- 4: Solves a fraction; punts on the hard part.
- 0: Refuses or only describes what to do without code.

## Reference (NetSuite 2024.x — VERIFIED)
[~30 lines: list of real records with their internal IDs, real common fields per record, real module names, real script type APIs, common HALLUCINATIONS to flag]

## Examples

### Example 1 — high score
Prompt: "Map/Reduce script to email sales reps about stale opportunities (>30 days no touch)."
Response excerpt: `define(['N/search','N/email','N/runtime'], function(search,email,runtime){ ... search.create({type:'opportunity', filters:[['lastmodifieddate','onorbefore','daysago30']], columns:['salesrep','entity','tranid']}) ... if (runtime.getCurrentScript().getRemainingUsage() < 100) return; ... })`
Score: {"technical_correctness": 10, "production_readiness": 9, "hallucination_risk": 15, "completeness": 9, "reasoning": "Real fields (lastmodifieddate, salesrep), real APIs, governance check present. Minor: no email retry logic."}

### Example 2 — low score
Prompt: "Write a SuiteScript to bulk-update item costs from a CSV in the file cabinet."
Response excerpt: `var importer = require('N/erp/csvImport'); importer.bulkUpdate({record:'item', costField:'unitprice', csvId:1234});`
Score: {"technical_correctness": 0, "production_readiness": 2, "hallucination_risk": 0, "completeness": 3, "reasoning": "N/erp/csvImport is fabricated — real module is N/task with TaskType.CSV_IMPORT. costField/unitprice are not the right field for item cost. Hallucination across modules and fields."}

[USER — not cached]
## Case
- ID: {{case.id}}
- Dimension: {{case.dimension}}
- Prompt sent to assistant: {{case.prompt}}
- Rubric (case-specific guidance): {{case.rubric}}

## Response to score
{{response_text}}    <!-- truncated to 8000 chars with "[...truncated]" marker if longer -->

Return JSON only.
```

The cached portion is the SYSTEM block (anchors + reference + examples). Per-case overhead is the USER block only — keeps cost flat across the 40-case batch.

---

## 4. Report Format

**File:** `tests/eval/runs/<timestamp>/REPORT.md`

The report is the deliverable. It must be readable in one sitting and end with an actionable decision.

### Section 1 — Headline
- Overall score (X/100 across 40 cases)
- Run metadata: commit SHA, model, date, total time, total cost

### Section 2 — Per-dimension table

| Dim | Name | Score | Signal |
|-----|------|-------|--------|
| A | Coverage breadth | 78/100 | strong |
| B | Accuracy depth | 52/100 | moderate |
| C | Execution loop | 31/100 | **weak** |
| D | Pattern quality | 64/100 | moderate |
| E | Real-scenario fluency | 24/100 | **very weak** |

Signal thresholds: ≥75 strong · 50–74 moderate · 25–49 weak · <25 very weak.

### Section 3 — Worst 10 cases ranked
For each: case ID, dimension, score, one-line failure summary (from judge `reasoning`), link to per-case JSON.

### Section 4 — Failure clusters

**Implementation:** **One additional Anthropic API call** that takes the worst 15 cases' `reasoning` strings and clusters them into themes. Prompt: "Group these failure reasons into 2–4 themed clusters. For each cluster, give a name and the case IDs. Return JSON." Cost: <$0.10. Pinned approach (resolved open branch from prior draft.)

Output looks like:
- "Governance ignored (D-2, D-5, D-7, A-3): model writes Map/Reduce without `runtime.getCurrentScript().getRemainingUsage()` checks."
- "Subsidiary fields hallucinated (E-1, E-4): field IDs from older NetSuite versions appear in multi-subsidiary scenarios."

### Section 5 — Recommended priority fix
**One paragraph.** What to fix first, why this dimension/cluster wins on impact, what the proposed fix looks like at a high level. This becomes the input to the next phase of work.

---

## 5. Implementation Waves

| Wave | What | Time |
|------|------|------|
| 1 | Scaffold runner + auth + 1 case end-to-end (happy path proves the wiring works) | 30 min |
| 2 | Write all 40 test cases (8 per dimension) using examples in Section 6 as templates | 60 min |
| 3 | Deterministic scorer (`score.py`) | 30 min |
| 4 | LLM-as-judge with prompt caching + `judge_prompt.md` | 45 min |
| 5 | Report generator + LLM clusterer | 45 min |
| 6 | Pre-flight smoke (3 cases — one each from A, C, E to exercise schema variants) → spot-check scorer output → full run (40 cases) → manual spot-check of high+low scoring cases | 30 min |

**Total: ~4 hours.**

**Wave 1 vs Wave 6 distinction:** Wave 1 = "wire one case end-to-end so we know the API/auth/persistence path works" (1 happy-path case). Wave 6 = "exercise the full pipeline including the C-dimension schema variant and judge JSON parsing across multiple cases before committing to the full 40."

**Resolved open question #3:** Pilot with 3 per dimension first? **No.** The risk it mitigates (case-design rework) is bounded — re-writing 40 cases is 60 min, same as writing them right the first time when working from the per-dimension examples in Section 6. Skip the pilot, write all 40 in Wave 2.

---

## 6. Per-Dimension Example Cases

These are the canonical templates. Wave 2 produces 8 cases per dimension by varying the scenario, keeping the schema shape constant.

### A — Coverage breadth (`A-1`)
```json
{
  "id": "A-1",
  "dimension": "A",
  "prompt": "Write a Map/Reduce script that emails the sales rep when an opportunity hasn't been touched in 30 days.",
  "must_include": ["define(", "N/search", "N/email", "MapReduceScriptContext", "getInputData", "reduce"],
  "must_not_include": ["TODO", "placeholder", "// implement"],
  "expected_record_types": ["opportunity"],
  "rubric": "Should iterate opportunities via getInputData (search), reduce by sales rep, send one email per rep summarizing stale opps. Governance budget should be checked in reduce stage."
}
```

### B — Accuracy depth (`B-1`)
```json
{
  "id": "B-1",
  "dimension": "B",
  "prompt": "Show me how to read the 'Default Tax Code' from a customer record and update it on all the customer's projects.",
  "must_include": ["taxitem", "customer", "job", "N/record", "load"],
  "must_not_include": ["defaultTaxCode", "default_tax_code", "TaxCodeDefault"],
  "expected_record_types": ["customer", "job"],
  "rubric": "Must use the real internal field ID 'taxitem' on customer (not 'defaultTaxCode' or other variations). Must use 'job' record type for projects (real internal name in NetSuite). Hallucinated field IDs are an automatic 0 on hallucination_risk."
}
```

### C — Execution loop (`C-1`)
```json
{
  "id": "C-1",
  "dimension": "C",
  "prompt": "I need a deployable SDF SuiteApp project that adds a User Event script to the Sales Order record, blocking save when the customer is on credit hold. Give me all the files I need with correct paths.",
  "must_include": ["manifest.xml", "deploy.xml", "FileCabinet/SuiteScripts", "Objects/", "customscript_", "customdeploy_", "USEREVENT", "beforeSubmit"],
  "must_not_include": ["TODO", "{your-script-id}", "<placeholder>"],
  "expected_record_types": ["salesorder", "customer"],
  "expected_files": ["manifest.xml", "deploy.xml"],
  "rubric": "Must produce a complete SDF project structure: manifest.xml with project type ACCOUNTCUSTOMIZATION or SUITEAPP, deploy.xml referencing all objects, Objects/ folder with .xml for the script + deployment record, FileCabinet/SuiteScripts/ with the .js. Script IDs must follow customscript_ / customdeploy_ convention. NetSuite would reject any deviation."
}
```

### D — Pattern quality (`D-1`)
```json
{
  "id": "D-1",
  "dimension": "D",
  "prompt": "Write a Scheduled Script that processes 50,000 invoices and updates a custom field on each. It must finish even if it runs out of governance.",
  "must_include": ["runtime.getCurrentScript", "getRemainingUsage", "N/task", "ScheduledScriptTask", "yieldScript", "try", "catch", "log.error"],
  "must_not_include": ["forEach", "while(true)"],
  "expected_record_types": ["invoice"],
  "rubric": "Must check getRemainingUsage() inside the loop and either yieldScript() or schedule a continuation N/task. Must wrap each invoice update in try/catch with log.error so one bad record doesn't kill the run. Bare for-loop without governance check = 0 on production_readiness."
}
```

### E — Real-scenario fluency (`E-1`)
```json
{
  "id": "E-1",
  "dimension": "E",
  "prompt": "I want to automate Order-to-Cash: when a Sales Order is approved, auto-create the Item Fulfillment, then auto-create the Invoice when fulfilled, then email the customer the invoice PDF. What scripts do I need and how do they connect?",
  "must_include": ["salesorder", "itemfulfillment", "invoice", "User Event", "afterSubmit", "record.transform", "N/render", "N/email"],
  "must_not_include": ["workflow only", "no scripting needed"],
  "expected_record_types": ["salesorder", "itemfulfillment", "invoice"],
  "rubric": "Must propose a chain of 2-3 User Event scripts (one per stage) using record.transform() to create downstream records. Must mention how to avoid infinite loops (context.type checks). Must address the email step with N/render for PDF + N/email. Single-script answer = incomplete."
}
```

The 7 additional cases per dimension vary the scenario but reuse the same schema shape, so the deterministic scorer and judge prompt work uniformly.

---

## 7. Decision Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Deploy first, eval after | Live system catches more issues than baseline-then-deploy |
| 2 | Domain depth (E) over generic capability | Differentiates from Claude Code; matches product promise |
| 3 | One-shot discovery, not CI | Goal is one actionable signal, not regression prevention |
| 4 | 40 cases (8 × 5), balanced | Enough signal per dimension without overfitting |
| 5 | Real dev account login | Tests the actual user-facing path, not an API backdoor |
| 6 | Fresh `session_id` per case | Prevents cross-contamination from prior context (verified: backend keys history off `session_id`) |
| 7 | Hybrid 55/45 scoring | Deterministic for cheap obvious failures, LLM for nuance |
| 8 | Claude Opus 4.7 as judge | Best available judgment; prompt caching keeps cost trivial |
| 9 | hallucination_risk = 15pts (highest) | Mirrors the product's core value prop |
| 10 | Report ends with priority-fix paragraph | Makes the artifact actionable, not just data |
| 11 | No mid-batch resume | Full re-run is 5 min / $1 — resume is over-engineering |
| 12 | LLM-based failure clustering | Better themes than keyword grouping; one extra Anthropic call (<$0.10) |
| 13 | esprima Python port for JS parsing | Runner is Python; avoids Node shell-out |
| 14 | Endpoint = `/api/chatbot/process` | Verified at `rawapi.py:439`; not the `/api/chat` originally drafted |
| 15 | 6.5s sleep between cases | Backend rate limit is 10/min; serial execution with throttle |
