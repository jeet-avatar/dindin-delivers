# NetSuite Eval Harness — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a one-shot eval harness that scores ArthaBuild's NetSuite competence across 5 dimensions and outputs an actionable REPORT.md identifying the weakest dimension to fix next.

**Architecture:** Python CLI (`run_eval.py`) drives 40 test cases serially against deployed `/api/chatbot/process`. Per case: deterministic scoring (substring/regex/JS-parse) + LLM judge (Claude Opus 4.7 with prompt caching) → JSON artifact. Report generator + LLM clusterer produce final REPORT.md.

**Tech Stack:** Python 3.11, `httpx` (HTTP), `esprima` (JS parsing), `anthropic` SDK (judge), `python-dotenv` (env loading), `pytest` (tests).

**Spec:** `apps/arthaBuild/docs/superpowers/specs/2026-04-17-netsuite-eval-harness-design.md`

---

## File Structure

All paths relative to repo root.

| Path | Responsibility |
|------|----------------|
| `apps/arthaBuild/tests/eval/__init__.py` | Package marker |
| `apps/arthaBuild/tests/eval/run_eval.py` | CLI entry point, auth, batch driver, rate limiting |
| `apps/arthaBuild/tests/eval/score.py` | Pure functions: deterministic scorer + judge invocation |
| `apps/arthaBuild/tests/eval/report.py` | Report assembly, dimension aggregation, LLM clusterer |
| `apps/arthaBuild/tests/eval/judge_prompt.md` | Full judge system prompt + reference + few-shots |
| `apps/arthaBuild/tests/eval/cases/README.md` | Case schema authoring guide |
| `apps/arthaBuild/tests/eval/cases/A_coverage.json` | 8 A-dimension cases |
| `apps/arthaBuild/tests/eval/cases/B_accuracy.json` | 8 B-dimension cases |
| `apps/arthaBuild/tests/eval/cases/C_execution.json` | 8 C-dimension cases |
| `apps/arthaBuild/tests/eval/cases/D_pattern.json` | 8 D-dimension cases |
| `apps/arthaBuild/tests/eval/cases/E_scenario.json` | 8 E-dimension cases |
| `apps/arthaBuild/tests/eval/test_score.py` | Unit tests for scoring functions |
| `apps/arthaBuild/tests/eval/runs/` | Output dir (gitignored) |
| `apps/arthaBuild/.env.example` | Add `EVAL_*` and `ANTHROPIC_API_KEY` keys |
| `apps/arthaBuild/.gitignore` | Add `tests/eval/runs/` |
| `apps/arthaBuild/src/backend/requirements-dev.txt` | Add `esprima`, `anthropic`, `httpx`, `python-dotenv` if missing |

---

## Chunk 1: Wave 1 — Scaffold + Auth + 1 Case End-to-End

Goal: prove the wiring (env loading → login → /api/chatbot/process → JSON file on disk) works with one happy-path case.

### Task 1.1: Create directory scaffolding

**Files:**
- Create: `apps/arthaBuild/tests/eval/__init__.py` (empty)
- Create: `apps/arthaBuild/tests/eval/cases/__init__.py` (empty)
- Modify: `apps/arthaBuild/.gitignore` (append `tests/eval/runs/`)

- [ ] **Step 1: Create dirs and empty package markers**

```bash
mkdir -p apps/arthaBuild/tests/eval/cases
mkdir -p apps/arthaBuild/tests/eval/runs
touch apps/arthaBuild/tests/eval/__init__.py
touch apps/arthaBuild/tests/eval/cases/__init__.py
```

- [ ] **Step 2: Add runs/ to .gitignore**

Edit `apps/arthaBuild/.gitignore`, append:
```
# Eval harness artifacts
tests/eval/runs/
```

- [ ] **Step 3: Commit**

```bash
git add apps/arthaBuild/tests/eval/ apps/arthaBuild/.gitignore
git commit -m "chore(arthaBuild): scaffold tests/eval directory"
```

### Task 1.2: Add Python dependencies

**Files:**
- Modify: `apps/arthaBuild/src/backend/requirements-dev.txt` (create if missing)

- [ ] **Step 1: Check requirements-dev.txt exists**

```bash
ls apps/arthaBuild/src/backend/requirements-dev.txt 2>&1 || echo "MISSING — create"
```

- [ ] **Step 2: Add eval deps**

If file exists, append. If not, create with:
```
# Eval harness deps
httpx==0.27.2
esprima==4.0.1
anthropic==0.40.0
python-dotenv==1.0.1
```

- [ ] **Step 3: Install in venv**

```bash
cd apps/arthaBuild/src/backend
source venv/bin/activate  # or however the project venv is activated
pip install httpx==0.27.2 esprima==4.0.1 anthropic==0.40.0 python-dotenv==1.0.1
```

Expected: all 4 packages install cleanly.

- [ ] **Step 4: Commit**

```bash
git add apps/arthaBuild/src/backend/requirements-dev.txt
git commit -m "chore(arthaBuild): add eval harness deps"
```

### Task 1.3: Add env var template

**Files:**
- Modify: `apps/arthaBuild/.env.example`

- [ ] **Step 1: Append eval env vars**

Append to `apps/arthaBuild/.env.example`:
```
# === Eval Harness (tests/eval/run_eval.py) ===
EVAL_BACKEND_URL=https://artha.build
EVAL_DEV_EMAIL=your-dev-account@yourcompany.com
EVAL_DEV_PASSWORD=
ANTHROPIC_API_KEY=
```

- [ ] **Step 2: Commit**

```bash
git add apps/arthaBuild/.env.example
git commit -m "chore(arthaBuild): document eval harness env vars"
```

### Task 1.4: Write the canonical A-1 case

**Files:**
- Create: `apps/arthaBuild/tests/eval/cases/A_coverage.json`

- [ ] **Step 1: Write A-1 only (rest of A cases come in Wave 2)**

Create `apps/arthaBuild/tests/eval/cases/A_coverage.json`:
```json
[
  {
    "id": "A-1",
    "dimension": "A",
    "prompt": "Write a Map/Reduce script that emails the sales rep when an opportunity hasn't been touched in 30 days.",
    "must_include": ["define(", "N/search", "N/email", "MapReduceScriptContext", "getInputData", "reduce"],
    "must_not_include": ["TODO", "placeholder", "// implement"],
    "expected_record_types": ["opportunity"],
    "requires_code": true,
    "rubric": "Should iterate opportunities via getInputData (search), reduce by sales rep, send one email per rep summarizing stale opps. Governance budget should be checked in reduce stage."
  }
]
```

- [ ] **Step 2: Validate JSON parses**

```bash
python -c "import json; json.load(open('apps/arthaBuild/tests/eval/cases/A_coverage.json'))"
```

Expected: no output (success).

### Task 1.5: Write the runner — minimal version (auth + 1 case + write JSON)

**Files:**
- Create: `apps/arthaBuild/tests/eval/run_eval.py`

- [ ] **Step 1: Write minimal runner**

Create `apps/arthaBuild/tests/eval/run_eval.py`:
```python
"""NetSuite eval harness — Wave 1 minimal runner.

Loads env, logs in, runs one case, writes JSON. No scoring yet.
Spec: apps/arthaBuild/docs/superpowers/specs/2026-04-17-netsuite-eval-harness-design.md
"""
from __future__ import annotations
import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import httpx
from dotenv import load_dotenv

EVAL_DIR = Path(__file__).parent
CASES_DIR = EVAL_DIR / "cases"
RUNS_DIR = EVAL_DIR / "runs"


def load_cases(case_filter: list[str] | None = None) -> list[dict]:
    """Load all case JSONs from cases/, optionally filtered by id."""
    cases = []
    for path in sorted(CASES_DIR.glob("*.json")):
        cases.extend(json.loads(path.read_text()))
    if case_filter:
        cases = [c for c in cases if c["id"] in case_filter]
    return cases


def login(backend_url: str, email: str, password: str) -> str:
    """Login and return JWT access_token. Raises on failure."""
    resp = httpx.post(
        f"{backend_url}/api/auth/login",
        json={"username": email, "password": password},
        timeout=30.0,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


class BatchAbort(Exception):
    """Raised when a global condition (license, AI not ready) means continuing is pointless."""


def fetch_model_under_test(backend_url: str, token: str) -> str:
    """Read /health/detail to populate meta.json model provenance."""
    try:
        resp = httpx.get(
            f"{backend_url}/health/detail",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10.0,
        )
        resp.raise_for_status()
        return resp.json().get("ollama_model", "unknown")
    except Exception:
        return "unknown"


def post_chat_with_retries(backend_url: str, token: str, payload: dict) -> tuple[int, dict | str]:
    """POST /api/chatbot/process with spec-mandated retry policy.

    Returns (status_code, body_or_text).
    Raises BatchAbort on 402/503 (license/AI gates — global, not per-case).
    """
    for attempt in range(2):  # one retry max for 5xx/429/401
        try:
            resp = httpx.post(
                f"{backend_url}/api/chatbot/process",
                json=payload,
                headers={"Authorization": f"Bearer {token}"},
                timeout=120.0,
            )
        except (httpx.TimeoutException, httpx.RequestError):
            if attempt == 0:
                time.sleep(5)
                continue
            raise

        if resp.status_code == 402:
            raise BatchAbort(f"402 license required: {resp.text[:200]}")
        if resp.status_code == 503:
            raise BatchAbort(f"503 AI not ready: {resp.text[:200]}")
        if resp.status_code == 401 and attempt == 0:
            # Caller should re-login then retry — signal via sentinel
            return (401, resp.text)
        if resp.status_code == 429 and attempt == 0:
            time.sleep(60)
            continue
        if 500 <= resp.status_code < 600 and attempt == 0:
            time.sleep(5)
            continue

        if resp.status_code == 200:
            return (200, resp.json())
        return (resp.status_code, resp.text[:500])

    return (resp.status_code, resp.text[:500])


def run_case(backend_url: str, token_box: dict, email: str, password: str, case: dict, run_ts: str) -> dict:
    """Run a single case. token_box is mutable so re-login can update the token.

    Returns the result dict. Raises BatchAbort on global failure conditions.
    """
    session_id = f"eval-{case['id']}-{run_ts}"
    started = time.time()
    payload = {"message": case["prompt"], "session_id": session_id}

    status, body = post_chat_with_retries(backend_url, token_box["token"], payload)

    if status == 401:
        # Re-login once, retry the case
        token_box["token"] = login(backend_url, email, password)
        status, body = post_chat_with_retries(backend_url, token_box["token"], payload)

    elapsed = round(time.time() - started, 2)
    if status == 200 and isinstance(body, dict):
        return {
            "case_id": case["id"], "dimension": case["dimension"],
            "session_id": session_id, "status": "ok",
            "elapsed_s": elapsed, "http_status": 200,
            "response": body.get("response", ""),
            "intent": body.get("intent"),
            "latency_ms": body.get("latency_ms"),
        }
    return {
        "case_id": case["id"], "dimension": case["dimension"],
        "session_id": session_id, "status": "http_error",
        "elapsed_s": elapsed, "http_status": status,
        "error": str(body)[:500],
    }


def get_git_sha() -> str:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=EVAL_DIR
        ).decode().strip()
    except Exception:
        return "unknown"


def main() -> int:
    parser = argparse.ArgumentParser(description="ArthaBuild NetSuite eval harness")
    parser.add_argument("--cases", help="Comma-separated case IDs (e.g. A-1,C-1,E-1)")
    parser.add_argument("--smoke", action="store_true", help="Run only A-1, C-1, E-1")
    parser.add_argument("--no-judge", action="store_true", help="Skip LLM judge (wired in Wave 4)")
    args = parser.parse_args()

    load_dotenv(EVAL_DIR.parent.parent / ".env")
    backend_url = os.environ["EVAL_BACKEND_URL"].rstrip("/")
    email = os.environ["EVAL_DEV_EMAIL"]
    password = os.environ["EVAL_DEV_PASSWORD"]

    case_filter = None
    if args.smoke:
        case_filter = ["A-1", "C-1", "E-1"]
    elif args.cases:
        case_filter = [c.strip() for c in args.cases.split(",")]

    cases = load_cases(case_filter)
    if not cases:
        print("No cases to run", file=sys.stderr)
        return 1

    print(f"Logging in as {email}...")
    token_box = {"token": login(backend_url, email, password)}
    print(f"Got JWT (len={len(token_box['token'])})")

    model_under_test = fetch_model_under_test(backend_url, token_box["token"])
    print(f"Model under test: {model_under_test}")

    run_ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")
    run_dir = RUNS_DIR / run_ts
    run_dir.mkdir(parents=True, exist_ok=True)
    print(f"Run dir: {run_dir}")

    started_at = datetime.now(timezone.utc).isoformat()
    aborted = False
    abort_reason = None
    cost_usd = 0.0  # populated when judge wired in Wave 4 (Task 4.3)

    for i, case in enumerate(cases, 1):
        print(f"[{i}/{len(cases)}] {case['id']} ...", end=" ", flush=True)
        try:
            result = run_case(backend_url, token_box, email, password, case, run_ts)
        except BatchAbort as e:
            print(f"BATCH ABORT: {e}")
            aborted = True
            abort_reason = str(e)
            break
        out_path = run_dir / f"{case['id']}.json"
        out_path.write_text(json.dumps(result, indent=2))
        print(f"{result['status']} ({result['elapsed_s']}s)")
        if i < len(cases):
            time.sleep(6.5)  # rate limit: 10/min

    finished_at = datetime.now(timezone.utc).isoformat()
    meta = {
        "run_id": run_ts,
        "git_commit_sha": get_git_sha(),
        "backend_url": backend_url,
        "model_under_test": model_under_test,
        "judge_model": "claude-opus-4-7",
        "case_count": len(cases),
        "started_at": started_at,
        "finished_at": finished_at,
        "aborted": aborted,
        "cost_usd": cost_usd,
    }
    if aborted:
        meta["abort_reason"] = abort_reason
    (run_dir / "meta.json").write_text(json.dumps(meta, indent=2))
    print(f"\nDone. Output: {run_dir}")
    return 0 if not aborted else 2


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Run with A-1 only against production**

```bash
cd apps/arthaBuild
# Ensure .env has EVAL_BACKEND_URL, EVAL_DEV_EMAIL, EVAL_DEV_PASSWORD
python tests/eval/run_eval.py --cases A-1
```

Expected output:
```
Logging in as your-dev@your.com...
Got JWT (len=200+)
Run dir: tests/eval/runs/2026-04-17T...
[1/1] A-1 ... ok (XXs)
Done. Output: tests/eval/runs/...
```

- [ ] **Step 3: Verify the JSON artifact**

```bash
ls apps/arthaBuild/tests/eval/runs/*/A-1.json
cat apps/arthaBuild/tests/eval/runs/*/A-1.json | python -m json.tool
```

Expected: valid JSON with `status: "ok"`, non-empty `response` field with NetSuite code in it.

- [ ] **Step 4: Commit Wave 1**

```bash
git add apps/arthaBuild/tests/eval/run_eval.py apps/arthaBuild/tests/eval/cases/A_coverage.json
git commit -m "feat(arthaBuild): eval harness Wave 1 — runner + auth + A-1 E2E

Proves wiring: env -> login -> /api/chatbot/process -> JSON on disk."
```

---

## Chunk 2: Wave 2 — Write 40 Test Cases

Goal: complete the 5 dimension JSON files with 8 cases each = 40 total.

### Task 2.1: Write authoring guide

**Files:**
- Create: `apps/arthaBuild/tests/eval/cases/README.md`

- [ ] **Step 1: Write authoring guide**

Create `apps/arthaBuild/tests/eval/cases/README.md`:
```markdown
# Case Authoring Guide

## Schema
Every case JSON object has:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | yes | `<dim>-<n>`, e.g. `A-1` |
| `dimension` | string | yes | One of A, B, C, D, E |
| `prompt` | string | yes | The user message sent to /api/chatbot/process |
| `must_include` | string[] | yes | Substrings that MUST appear in response |
| `must_not_include` | string[] | yes | Substrings that MUST NOT appear |
| `expected_record_types` | string[] | yes | NetSuite record type IDs to mention |
| `expected_files` | string[] | C dim only | Filenames the response should reference |
| `requires_code` | bool | yes | If false, scorer skips JS-parse check and reweights |
| `rubric` | string | yes | Case-specific guidance for the LLM judge |

## Per-Dimension Authoring Tips

**A (Coverage breadth)** — vary the SuiteScript type. 8 cases should cover: Map/Reduce, User Event, Workflow Action, RESTlet, Scheduled, Client Script, Suitelet, Portlet.

**B (Accuracy depth)** — pick scenarios where field IDs are non-obvious or commonly hallucinated (taxitem on customer, internalid casing, multi-subsidiary, custom fields with `custbody_`/`custentity_` prefixes).

**C (Execution loop)** — every case should ask for a deployable artifact. Vary script type (User Event, Map/Reduce, RESTlet) but always require manifest.xml + deploy.xml + Objects/.

**D (Pattern quality)** — high-volume, error-prone, governance-bound scenarios. 50K record loops, retry logic, idempotent webhook handlers.

**E (Real-scenario fluency)** — multi-step business flows. O2C, P2P, R2R, ASC 606 revenue recognition, intercompany, period close.
```

### Task 2.2: Write 7 more A-dimension cases

**Files:**
- Modify: `apps/arthaBuild/tests/eval/cases/A_coverage.json`

- [ ] **Step 1: Append A-2 through A-8**

Replace the file with a JSON array of 8 cases. A-1 is already in place. Add 7 more covering distinct SuiteScript types: User Event (A-2), Workflow Action (A-3), RESTlet (A-4), Scheduled (A-5), Client Script (A-6), Suitelet (A-7), Portlet (A-8).

For each case, follow the A-1 schema. `must_include` should always include `define(` and the relevant N/ module(s). `must_not_include` always includes `TODO` and `placeholder`.

Example skeleton for A-2:
```json
{
  "id": "A-2",
  "dimension": "A",
  "prompt": "Write a User Event script (beforeSubmit) on the Sales Order that prevents save when the customer has past-due invoices > $10,000.",
  "must_include": ["define(", "N/search", "N/record", "UserEventContext", "beforeSubmit", "throw"],
  "must_not_include": ["TODO", "placeholder"],
  "expected_record_types": ["salesorder", "customer", "invoice"],
  "requires_code": true,
  "rubric": "Must use beforeSubmit context. Must search for past-due invoices on the customer. Must throw error.UserEventError to block save with a clear message."
}
```

- [ ] **Step 2: Validate JSON**

```bash
python -c "import json; cases = json.load(open('apps/arthaBuild/tests/eval/cases/A_coverage.json')); assert len(cases) == 8; print(f'A: {len(cases)} cases OK')"
```

Expected: `A: 8 cases OK`.

> **Domain expertise required:** This task asks the implementer to author 7 case JSONs with real NetSuite knowledge (real `N/*` module names, real `*Context` types, real script-type constraints). Use `apps/arthaBuild/src/backend/knowledge/bootstrap/oracle-*.md` as the canonical NetSuite 2024.x reference. Cases referencing nonexistent modules/contexts will false-positive the `must_include` scorer and corrupt the A-dimension score.

### Task 2.3: Write 8 B-dimension cases

**Files:**
- Create: `apps/arthaBuild/tests/eval/cases/B_accuracy.json`

- [ ] **Step 1: Write 8 cases with hallucination-trap scenarios**

Use spec Section 6 B-1 as canonical example. 7 more should target: subsidiary fields, custom field naming convention, sublist accessors (`getSublistValue` vs `getValue`), savedsearch column casing, internal ID vs script ID, transactionnumber vs tranid, currency rate fields.

- [ ] **Step 2: Validate JSON**

```bash
python -c "import json; cases = json.load(open('apps/arthaBuild/tests/eval/cases/B_accuracy.json')); assert len(cases) == 8; print(f'B: {len(cases)} cases OK')"
```

> **Domain expertise required:** B-dimension is the hallucination-trap dimension — these cases only have signal if the trap is real. The `must_not_include` field must list NetSuite identifiers that look plausible but don't exist in the record schema (e.g. `taxitem` on customer, `N/erp/invoice`, `defaultTaxCode`). Verify every trap against `apps/arthaBuild/src/backend/knowledge/bootstrap/oracle-*.md` (58 Oracle docs) before checking in the case. Don't invent traps.

### Task 2.4: Write 8 C-dimension cases

**Files:**
- Create: `apps/arthaBuild/tests/eval/cases/C_execution.json`

- [ ] **Step 1: Write 8 SDF-project cases**

Use spec Section 6 C-1 as canonical. Vary by script type and project type (ACCOUNTCUSTOMIZATION vs SUITEAPP). Every case must have `expected_files` populated.

- [ ] **Step 2: Validate JSON**

```bash
python -c "import json; cases = json.load(open('apps/arthaBuild/tests/eval/cases/C_execution.json')); assert len(cases) == 8; print(f'C: {len(cases)} cases OK')"
```

> **Domain expertise required:** Every C case must produce an SDF-valid project — `expected_files` lists the filenames the scorer will grep. Use real SDF conventions: `manifest.xml`, `deploy.xml`, `Objects/<scriptid>.xml`, `FileCabinet/SuiteScripts/<module>/*.js`. Cross-reference `apps/arthaBuild/src/backend/knowledge/bootstrap/oracle-*.md` for project-type choice (ACCOUNTCUSTOMIZATION vs SUITEAPP) and required `.xml` element names. A case listing a non-existent SDF file path will produce a 0% execution score.

### Task 2.5: Write 8 D-dimension cases

**Files:**
- Create: `apps/arthaBuild/tests/eval/cases/D_pattern.json`

- [ ] **Step 1: Write 8 governance/pattern cases**

Use spec Section 6 D-1. Vary scenarios: 100K customer batch update, retry on `RCRD_HAS_BEEN_CHANGED`, idempotent webhook RESTlet, search.runPaged for >1000 results, suiteql vs search performance, async N/task scheduling, log level discipline.

- [ ] **Step 2: Validate JSON**

```bash
python -c "import json; cases = json.load(open('apps/arthaBuild/tests/eval/cases/D_pattern.json')); assert len(cases) == 8; print(f'D: {len(cases)} cases OK')"
```

> **Domain expertise required:** D-dimension rewards governance-aware, production-hardened patterns. Reference real NetSuite governance limits (1000 usage units for User Event, 10000 for Scheduled, 5000 per stage in Map/Reduce) and real error codes (`RCRD_HAS_BEEN_CHANGED`, `SSS_REQUEST_LIMIT_EXCEEDED`, `USER_ERROR`). Verify error-code strings against `apps/arthaBuild/src/backend/knowledge/bootstrap/oracle-*.md`. A case asking about a fabricated governance limit or non-existent error code will produce noise, not signal.

### Task 2.6: Write 8 E-dimension cases

**Files:**
- Create: `apps/arthaBuild/tests/eval/cases/E_scenario.json`

- [ ] **Step 1: Write 8 end-to-end scenario cases**

Use spec Section 6 E-1. Vary by business flow: O2C (E-1 already), P2P (PR→PO→IR→Vendor Bill), R2R (period close), Returns (RMA → Credit Memo), Drop Ship, Subscription billing, Intercompany journal, Multi-currency revaluation.

- [ ] **Step 2: Validate JSON**

```bash
python -c "import json; cases = json.load(open('apps/arthaBuild/tests/eval/cases/E_scenario.json')); assert len(cases) == 8; print(f'E: {len(cases)} cases OK')"
```

> **Domain expertise required:** E-dimension = multi-step business flows. Each prompt must reflect real NetSuite transaction chains (O2C: SO → item fulfillment → invoice → customer payment; P2P: PR → PO → IR → vendor bill → payment; R2R: revenue arrangement → revenue plan → GL impact). `expected_record_types` must list every record the flow touches. Cross-check with `apps/arthaBuild/src/backend/knowledge/bootstrap/oracle-*.md` — a case missing a real intermediate record will penalize good responses that include it.

### Task 2.7: Verify total = 40 cases and commit

- [ ] **Step 1: Verify count**

```bash
python -c "
import json, glob
total = sum(len(json.load(open(p))) for p in glob.glob('apps/arthaBuild/tests/eval/cases/*.json'))
assert total == 40, f'expected 40, got {total}'
print(f'Total: {total} cases')
"
```

Expected: `Total: 40 cases`.

- [ ] **Step 2: Smoke check that runner can load all 40**

```bash
cd apps/arthaBuild
python -c "
import sys; sys.path.insert(0, 'tests/eval')
from run_eval import load_cases
cases = load_cases()
assert len(cases) == 40
ids = [c['id'] for c in cases]
assert len(set(ids)) == 40, 'duplicate IDs'
print(f'Loaded {len(cases)} unique cases')
"
```

- [ ] **Step 3: Commit Wave 2**

```bash
git add apps/arthaBuild/tests/eval/cases/
git commit -m "feat(arthaBuild): eval harness Wave 2 — 40 test cases (8 per dimension)"
```

---

## Chunk 3: Wave 3 — Deterministic Scorer

Goal: pure-function scorer (`score.py`) with full unit tests, returning a 0–55 score per case.

### Task 3.1: Write failing unit tests for scorer

**Files:**
- Create: `apps/arthaBuild/tests/eval/test_score.py`

- [ ] **Step 1: Write tests covering each scoring component**

```python
"""Unit tests for tests/eval/score.py — deterministic scorer.

Each test isolates one scoring component.
"""
import pytest
from score import (
    score_must_include,
    score_must_not_include,
    score_js_parses,
    score_record_types,
    score_sanity,
    score_deterministic,
    extract_js_blocks,
)


def test_must_include_all_present():
    assert score_must_include("foo bar baz", ["foo", "bar"]) == 15.0


def test_must_include_partial():
    assert score_must_include("foo only", ["foo", "bar"]) == 7.5


def test_must_include_none():
    assert score_must_include("nothing", ["foo", "bar"]) == 0.0


def test_must_include_empty_list():
    # No requirements -> full credit
    assert score_must_include("anything", []) == 15.0


def test_must_not_include_all_absent():
    assert score_must_not_include("clean text", ["TODO", "placeholder"]) == 10.0


def test_must_not_include_one_present():
    assert score_must_not_include("has TODO here", ["TODO"]) == 0.0


def test_extract_js_blocks_javascript_fence():
    text = "Some text\n```javascript\nconst x = 1;\n```\nMore text"
    assert extract_js_blocks(text) == ["const x = 1;"]


def test_extract_js_blocks_js_fence():
    text = "```js\nvar x = 1;\n```"
    assert extract_js_blocks(text) == ["var x = 1;"]


def test_extract_js_blocks_multiple():
    text = "```js\nvar a;\n```\n```javascript\nvar b;\n```"
    assert extract_js_blocks(text) == ["var a;", "var b;"]


def test_extract_js_blocks_none():
    assert extract_js_blocks("plain text no code") == []


def test_js_parses_valid():
    blocks = ["const x = 1;"]
    assert score_js_parses(blocks, requires_code=True) == 15.0


def test_js_parses_invalid():
    blocks = ["const x = ;;;invalid"]
    assert score_js_parses(blocks, requires_code=True) == 0.0


def test_js_parses_no_blocks_requires_code():
    # Requires code but none present -> 0
    assert score_js_parses([], requires_code=True) == 0.0


def test_js_parses_no_blocks_not_requires_code():
    # When code not required, this check is skipped (returns None — caller reweights)
    assert score_js_parses([], requires_code=False) is None


def test_record_types_all_mentioned():
    text = "use the salesorder and customer records"
    assert score_record_types(text, ["salesorder", "customer"]) == 10.0


def test_record_types_partial():
    text = "salesorder only here"
    assert score_record_types(text, ["salesorder", "customer"]) == 5.0


def test_record_types_empty_list():
    assert score_record_types("any", []) == 10.0


def test_sanity_pass():
    assert score_sanity("x" * 200, elapsed_s=10) == 5.0


def test_sanity_fail_too_short():
    assert score_sanity("short", elapsed_s=10) == 0.0


def test_sanity_fail_timeout():
    assert score_sanity("x" * 200, elapsed_s=121) == 0.0


def test_full_deterministic_requires_code_true():
    case = {
        "must_include": ["foo", "bar"],
        "must_not_include": ["TODO"],
        "expected_record_types": ["salesorder"],
        "requires_code": True,
    }
    response = "foo bar\n```js\nconst x = 1;\n```\nuse salesorder"
    result = score_deterministic(case, response, elapsed_s=5)
    # 15 + 10 + 15 + 10 + 5 = 55
    assert result["total"] == 55.0
    assert result["max"] == 55


def test_full_deterministic_requires_code_false_reweights():
    # When requires_code=False, JS-parse 15 pts is dropped, total max = 40
    case = {
        "must_include": ["foo"],
        "must_not_include": ["TODO"],
        "expected_record_types": ["salesorder"],
        "requires_code": False,
    }
    response = "foo here, salesorder mentioned"
    result = score_deterministic(case, response, elapsed_s=5)
    # 15 + 10 + 10 + 5 = 40
    assert result["total"] == 40.0
    assert result["max"] == 40
```

- [ ] **Step 2: Run tests — they should fail (score.py doesn't exist yet)**

```bash
cd apps/arthaBuild/tests/eval
pytest test_score.py -v
```

Expected: `ImportError: No module named 'score'` or all-fail.

### Task 3.2: Implement score.py to pass tests

**Files:**
- Create: `apps/arthaBuild/tests/eval/score.py`

- [ ] **Step 1: Write minimal implementation**

Create `apps/arthaBuild/tests/eval/score.py`:
```python
"""Deterministic + LLM-judge scoring for the NetSuite eval harness.

Spec: apps/arthaBuild/docs/superpowers/specs/2026-04-17-netsuite-eval-harness-design.md § 3
"""
from __future__ import annotations
import re
from typing import Optional

import esprima

JS_BLOCK_RE = re.compile(r"```(?:js|javascript)\n(.*?)\n```", re.DOTALL)


def extract_js_blocks(text: str) -> list[str]:
    return JS_BLOCK_RE.findall(text)


def score_must_include(response: str, tokens: list[str]) -> float:
    if not tokens:
        return 15.0
    matched = sum(1 for t in tokens if t in response)
    return round(15.0 * matched / len(tokens), 2)


def score_must_not_include(response: str, tokens: list[str]) -> float:
    if any(t in response for t in tokens):
        return 0.0
    return 10.0


def score_js_parses(blocks: list[str], requires_code: bool) -> Optional[float]:
    if not requires_code:
        return None  # Caller reweights to 40 max instead of 55
    if not blocks:
        return 0.0
    for block in blocks:
        try:
            esprima.parseScript(block, tolerant=True)
        except Exception:
            return 0.0
    return 15.0


def score_record_types(response: str, types: list[str]) -> float:
    if not types:
        return 10.0
    matched = sum(1 for t in types if t in response)
    return round(10.0 * matched / len(types), 2)


def score_sanity(response: str, elapsed_s: float) -> float:
    if response and len(response) > 100 and elapsed_s <= 120:
        return 5.0
    return 0.0


def score_deterministic(case: dict, response: str, elapsed_s: float) -> dict:
    """Return per-component + total deterministic score.

    Max is 55 normally; 40 when requires_code=False (JS-parse 15-pt check skipped).
    """
    blocks = extract_js_blocks(response)
    must_inc = score_must_include(response, case.get("must_include", []))
    must_not = score_must_not_include(response, case.get("must_not_include", []))
    js_parse = score_js_parses(blocks, case.get("requires_code", True))
    rec_types = score_record_types(response, case.get("expected_record_types", []))
    sanity = score_sanity(response, elapsed_s)

    components = {
        "must_include": must_inc,
        "must_not_include": must_not,
        "expected_record_types": rec_types,
        "sanity": sanity,
    }
    if js_parse is not None:
        components["js_parses"] = js_parse
        max_pts = 55
    else:
        max_pts = 40

    return {
        "components": components,
        "total": sum(components.values()),
        "max": max_pts,
    }
```

- [ ] **Step 2: Run tests**

```bash
cd apps/arthaBuild/tests/eval
pytest test_score.py -v
```

Expected: all tests pass.

- [ ] **Step 3: Commit Wave 3**

```bash
git add apps/arthaBuild/tests/eval/score.py apps/arthaBuild/tests/eval/test_score.py
git commit -m "feat(arthaBuild): eval harness Wave 3 — deterministic scorer + tests"
```

---

## Chunk 4: Wave 4 — LLM-as-Judge

Goal: judge function in `score.py` calling Claude Opus 4.7 with prompt caching, returning 0–45 score from 4 criteria.

### Task 4.1: Write the judge prompt MD file

**Files:**
- Create: `apps/arthaBuild/tests/eval/judge_prompt.md`

- [ ] **Step 1: Write full judge prompt**

Create `apps/arthaBuild/tests/eval/judge_prompt.md` containing the SYSTEM block from spec §3.5, expanded with a ~30-line NetSuite 2024.x reference section, 4 scoring-anchor blocks, and the 2 worked examples from spec verbatim.

**Domain expertise required.** The NetSuite reference section is the heart of the judge — bad reference content = bad judgments, and the judge drives 45 of the 100 points. Do **not** invent any NetSuite identifier. Source everything from `apps/arthaBuild/src/backend/knowledge/bootstrap/oracle-*.md` (58 verified Oracle docs already ingested). Minimum content:

- **20+ real record type IDs**, one per line — start from: `customer`, `salesorder`, `invoice`, `itemfulfillment`, `vendorbill`, `purchaseorder`, `journalentry`, `transferorder`, `creditmemo`, `customerpayment`, `opportunity`, `lead`, `prospect`, `job`, `employee`, `subsidiary`, `account`, `currency`, `inventoryitem`, `serviceitem`, `assemblyitem`, `kitItem`. Grep oracle docs to add 5+ more.
- **15+ real `N/*` modules**, one per line — start from: `N/record`, `N/search`, `N/query`, `N/email`, `N/render`, `N/file`, `N/https`, `N/runtime`, `N/task`, `N/transaction`, `N/format`, `N/url`, `N/ui/serverWidget`, `N/ui/dialog`, `N/error`. Grep to confirm.
- **8+ script context types** — `UserEventContext`, `MapReduceScriptContext`, `ScheduledScriptContext`, `ClientScriptContext`, `SuiteletScriptContext`, `WorkflowActionScriptContext`, `RESTletScriptContext`, `PortletScriptContext`.
- **10+ commonly hallucinated identifiers to flag** — `N/erp/*` (not a real namespace), `N/automation`, `defaultTaxCode` on customer, `record.bulkUpdate`, `Search.executeAll`, `transactionnumber` vs real `tranid`. Add more from hallucination patterns observed in oracle docs' anti-patterns sections.
- **Both worked examples from spec §3.5 verbatim** — copy the A-1 and B-1 scoring examples.

The file is the SYSTEM block content only — no `[USER]` part. The runner constructs the user message at call time. If any identifier above fails a `grep` check against `oracle-*.md`, drop it and substitute a verified one.

### Task 4.2: Add `score_with_judge` function

**Files:**
- Modify: `apps/arthaBuild/tests/eval/score.py`

- [ ] **Step 1: Append judge function to score.py**

Append:
```python
import json as _json
import os
from pathlib import Path
import anthropic

_JUDGE_PROMPT_PATH = Path(__file__).parent / "judge_prompt.md"
_RESPONSE_TRUNCATE = 8000

# Lazy-loaded
_anthropic_client = None
_judge_system_text = None

# Cumulative Anthropic cost (per process). Read by run_eval.py after the loop.
_judge_cost_accumulator = {"usd": 0.0}


def _get_anthropic_client() -> anthropic.Anthropic:
    global _anthropic_client
    if _anthropic_client is None:
        _anthropic_client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY
    return _anthropic_client


def _get_judge_system() -> str:
    global _judge_system_text
    if _judge_system_text is None:
        _judge_system_text = _JUDGE_PROMPT_PATH.read_text()
    return _judge_system_text


def score_with_judge(case: dict, response: str, model: str = "claude-opus-4-7") -> dict:
    """Call Claude judge on the case+response. Returns scores + reasoning.

    Uses prompt caching on the system block so the per-case incremental cost
    is just the user message + judge output (~$0.03/case).
    """
    truncated = response[:_RESPONSE_TRUNCATE]
    if len(response) > _RESPONSE_TRUNCATE:
        truncated += "\n\n[...truncated]"

    user_msg = (
        f"## Case\n"
        f"- ID: {case['id']}\n"
        f"- Dimension: {case['dimension']}\n"
        f"- Prompt sent to assistant: {case['prompt']}\n"
        f"- Rubric (case-specific guidance): {case['rubric']}\n\n"
        f"## Response to score\n{truncated}\n\n"
        f"Return JSON only."
    )

    client = _get_anthropic_client()
    msg = client.messages.create(
        model=model,
        max_tokens=600,
        system=[
            {
                "type": "text",
                "text": _get_judge_system(),
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": user_msg}],
    )

    # Track Anthropic cost (Opus 4.7: $15/MTok input, $75/MTok output, cache read $1.50/MTok)
    usage = msg.usage
    input_tokens = getattr(usage, "input_tokens", 0) or 0
    cache_read_tokens = getattr(usage, "cache_read_input_tokens", 0) or 0
    cache_creation_tokens = getattr(usage, "cache_creation_input_tokens", 0) or 0
    output_tokens = getattr(usage, "output_tokens", 0) or 0
    input_cost = input_tokens * 15.0 / 1_000_000
    cache_read_cost = cache_read_tokens * 1.50 / 1_000_000
    cache_creation_cost = cache_creation_tokens * 18.75 / 1_000_000  # 1.25x input for ephemeral
    output_cost = output_tokens * 75.0 / 1_000_000
    call_cost = input_cost + cache_read_cost + cache_creation_cost + output_cost
    _judge_cost_accumulator["usd"] += call_cost

    raw = msg.content[0].text.strip()
    # Strip ```json fences if judge added them despite instructions
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
    parsed = _json.loads(raw)

    return {
        "technical_correctness": int(parsed.get("technical_correctness", 0)),
        "production_readiness": int(parsed.get("production_readiness", 0)),
        "hallucination_risk": int(parsed.get("hallucination_risk", 0)),
        "completeness": int(parsed.get("completeness", 0)),
        "reasoning": parsed.get("reasoning", ""),
        "total": (
            int(parsed.get("technical_correctness", 0))
            + int(parsed.get("production_readiness", 0))
            + int(parsed.get("hallucination_risk", 0))
            + int(parsed.get("completeness", 0))
        ),
        "max": 45,
        "raw": raw,
        "cost_usd": round(call_cost, 6),
    }
```

- [ ] **Step 2: Quick smoke test against the API**

```bash
cd apps/arthaBuild
python -c "
import sys; sys.path.insert(0, 'tests/eval')
from dotenv import load_dotenv; load_dotenv()
from score import score_with_judge
case = {'id':'test','dimension':'A','prompt':'Write hello world in SuiteScript','rubric':'Just a smoke test.'}
result = score_with_judge(case, 'define([], function(){return{};});  // empty script')
print(result)
"
```

Expected: JSON-like dict with 4 numeric scores + reasoning. Cost: ~$0.05.

### Task 4.3: Wire scoring into the runner

**Files:**
- Modify: `apps/arthaBuild/tests/eval/run_eval.py`

- [ ] **Step 1: Call scorers in main loop + read cost accumulator**

The `--no-judge` flag was already added in Task 1.5 Step 1's main(); here we wire the scorer calls.

Modify `run_eval.py` `main()`:
1. At top of file add: `from score import score_deterministic, score_with_judge, _judge_cost_accumulator`
2. After `result = run_case(...)` in the loop, if `result["status"] == "ok"`, call:
```python
det = score_deterministic(case, result["response"], result["elapsed_s"])
result["deterministic"] = det
if not args.no_judge:
    try:
        judge = score_with_judge(case, result["response"])
        result["judge"] = judge
        result["score_total"] = det["total"] + judge["total"]
        result["score_max"] = det["max"] + judge["max"]
    except Exception as e:
        result["judge_error"] = str(e)
        result["score_total"] = det["total"]
        result["score_max"] = det["max"]
else:
    result["score_total"] = det["total"]
    result["score_max"] = det["max"]
```
3. Before building `meta`, replace `cost_usd = 0.0` with a read from the accumulator:
```python
# After the loop (before building meta):
cost_usd = round(_judge_cost_accumulator["usd"], 4)
```
(i.e. remove the `cost_usd = 0.0` line above the loop and compute after the loop so both abort and success paths capture partial spend.)

- [ ] **Step 2: Re-run smoke against A-1 with judge enabled**

```bash
cd apps/arthaBuild
python tests/eval/run_eval.py --cases A-1
```

Expected: A-1.json now has `deterministic`, `judge`, `score_total`, `score_max` fields.

- [ ] **Step 3: Spot-check the judge JSON**

```bash
cat apps/arthaBuild/tests/eval/runs/*/A-1.json | python -m json.tool | grep -A 2 reasoning
```

Expected: human-readable reasoning text from the judge.

- [ ] **Step 4: Commit Wave 4**

```bash
git add apps/arthaBuild/tests/eval/judge_prompt.md apps/arthaBuild/tests/eval/score.py apps/arthaBuild/tests/eval/run_eval.py
git commit -m "feat(arthaBuild): eval harness Wave 4 — Claude Opus judge with prompt caching"
```

---

## Chunk 5: Wave 5 — Report Generator + LLM Clusterer

Goal: `report.py` reads all per-case JSONs in a run dir, computes per-dimension aggregates, asks the judge to cluster failure reasons, writes REPORT.md.

### Task 5.1: Write report.py

**Files:**
- Create: `apps/arthaBuild/tests/eval/report.py`

- [ ] **Step 1: Write report module**

Create `apps/arthaBuild/tests/eval/report.py`:
```python
"""Report generator for the NetSuite eval harness.

Reads tests/eval/runs/<ts>/*.json, writes REPORT.md.
Spec: apps/arthaBuild/docs/superpowers/specs/2026-04-17-netsuite-eval-harness-design.md § 4
"""
from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path
from typing import Any

from score import _get_anthropic_client

DIMENSION_NAMES = {
    "A": "Coverage breadth",
    "B": "Accuracy depth",
    "C": "Execution loop",
    "D": "Pattern quality",
    "E": "Real-scenario fluency",
}

SIGNAL_THRESHOLDS = [(75, "strong"), (50, "moderate"), (25, "weak"), (0, "very weak")]


def signal_for(score: float) -> str:
    for threshold, label in SIGNAL_THRESHOLDS:
        if score >= threshold:
            return label
    return "very weak"


def load_results(run_dir: Path) -> tuple[dict, list[dict]]:
    meta = json.loads((run_dir / "meta.json").read_text())
    results = []
    for path in sorted(run_dir.glob("*.json")):
        if path.name == "meta.json":
            continue
        results.append(json.loads(path.read_text()))
    return meta, results


def aggregate_by_dimension(results: list[dict]) -> dict[str, dict]:
    by_dim: dict[str, list[dict]] = {}
    for r in results:
        by_dim.setdefault(r["dimension"], []).append(r)

    out = {}
    for dim, items in by_dim.items():
        # Normalize each case to 0-100 then average
        normalized = []
        for r in items:
            if r.get("status") != "ok":
                normalized.append(0.0)
            else:
                total = r.get("score_total", 0)
                max_pts = r.get("score_max", 100)
                normalized.append(100.0 * total / max_pts if max_pts else 0)
        avg = sum(normalized) / len(normalized) if normalized else 0
        out[dim] = {
            "name": DIMENSION_NAMES.get(dim, dim),
            "score": round(avg, 1),
            "signal": signal_for(avg),
            "count": len(items),
        }
    return out


def worst_cases(results: list[dict], n: int = 10) -> list[dict]:
    scored = []
    for r in results:
        total = r.get("score_total", 0)
        max_pts = r.get("score_max", 100)
        normalized = 100.0 * total / max_pts if max_pts else 0
        scored.append((normalized, r))
    scored.sort(key=lambda x: x[0])
    return [
        {
            "case_id": r["case_id"],
            "dimension": r["dimension"],
            "score": round(score, 1),
            "summary": (r.get("judge") or {}).get("reasoning", r.get("error", "no judge data"))[:200],
        }
        for score, r in scored[:n]
    ]


def cluster_failures(worst: list[dict], model: str = "claude-opus-4-7") -> list[dict]:
    """Ask the judge to cluster the worst-15 failure reasons into 2-4 themes."""
    if not worst:
        return []
    payload = "\n".join(f"[{w['case_id']}] ({w['dimension']}): {w['summary']}" for w in worst)
    user_msg = (
        "Group these failure reasons into 2-4 themed clusters. "
        "For each cluster: pick a short name, list the case IDs that fit, write one sentence describing the theme. "
        "Return strict JSON: {\"clusters\": [{\"name\": str, \"case_ids\": [str], \"theme\": str}]}\n\n"
        f"Failures:\n{payload}"
    )
    client = _get_anthropic_client()
    msg = client.messages.create(
        model=model,
        max_tokens=800,
        messages=[{"role": "user", "content": user_msg}],
    )
    raw = msg.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
    return json.loads(raw).get("clusters", [])


def render_report(meta: dict, by_dim: dict, worst: list[dict], clusters: list[dict]) -> str:
    from datetime import datetime as _dt
    lines: list[str] = []
    lines.append("# NetSuite Eval Run — REPORT")
    lines.append("")
    lines.append("## Headline")
    total_cases = sum(d["count"] for d in by_dim.values())
    overall = sum(d["score"] * d["count"] for d in by_dim.values()) / total_cases if total_cases else 0
    # Duration
    start_dt = _dt.fromisoformat(meta["started_at"].replace("Z", "+00:00"))
    end_dt = _dt.fromisoformat(meta["finished_at"].replace("Z", "+00:00"))
    duration_min = (end_dt - start_dt).total_seconds() / 60
    lines.append(f"- **Overall:** {overall:.1f}/100 across {total_cases} cases")
    lines.append(f"- **Total time:** {duration_min:.1f} min")
    lines.append(f"- **Total cost:** ${meta.get('cost_usd', 0):.2f}")
    lines.append(f"- **Run:** `{meta['run_id']}`")
    lines.append(f"- **Commit:** `{meta['git_commit_sha'][:8]}`")
    lines.append(f"- **Backend:** {meta['backend_url']}")
    lines.append(f"- **Model under test:** {meta.get('model_under_test', 'unknown')}")
    lines.append(f"- **Judge:** {meta['judge_model']}")
    if meta.get("aborted"):
        lines.append(f"- **⚠️ ABORTED:** {meta.get('abort_reason', 'unknown reason')}")
    lines.append("")

    lines.append("## Per-Dimension")
    lines.append("| Dim | Name | Score | Signal |")
    lines.append("|-----|------|-------|--------|")
    for dim in sorted(by_dim.keys()):
        d = by_dim[dim]
        lines.append(f"| {dim} | {d['name']} | {d['score']:.1f}/100 | {d['signal']} |")
    lines.append("")

    lines.append("## Worst 10 Cases")
    lines.append("| # | ID | Dim | Score | Summary |")
    lines.append("|---|----|----|-------|---------|")
    for i, w in enumerate(worst, 1):
        summary = w["summary"].replace("|", "\\|").replace("\n", " ")
        lines.append(f"| {i} | {w['case_id']} | {w['dimension']} | {w['score']:.1f} | {summary} |")
    lines.append("")

    lines.append("## Failure Clusters")
    if not clusters:
        lines.append("_No clusters available._")
    for c in clusters:
        ids = ", ".join(c.get("case_ids", []))
        lines.append(f"- **{c.get('name')}** ({ids}): {c.get('theme')}")
    lines.append("")

    lines.append("## Recommended Priority Fix")
    weakest = min(by_dim.values(), key=lambda d: d["score"]) if by_dim else None
    if weakest:
        lines.append(
            f"The weakest dimension is **{weakest['name']}** "
            f"(score {weakest['score']:.1f}/100, signal: {weakest['signal']}). "
            f"This should be the focus of the next improvement cycle. "
            f"See the failure clusters above to scope the specific intervention."
        )
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate REPORT.md from a run dir")
    parser.add_argument("run_dir", help="Path to tests/eval/runs/<timestamp>/")
    parser.add_argument("--no-cluster", action="store_true", help="Skip LLM clustering (offline mode)")
    args = parser.parse_args()

    run_dir = Path(args.run_dir)
    if not run_dir.exists():
        print(f"Run dir not found: {run_dir}", file=sys.stderr)
        return 1

    meta, results = load_results(run_dir)
    by_dim = aggregate_by_dimension(results)
    worst = worst_cases(results, n=10)
    worst_for_cluster = worst_cases(results, n=15)
    clusters = [] if args.no_cluster else cluster_failures(worst_for_cluster)

    report = render_report(meta, by_dim, worst, clusters)
    out_path = run_dir / "REPORT.md"
    out_path.write_text(report)
    print(f"Wrote {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Write a 3-case fake run dir for testing**

```bash
mkdir -p /tmp/fake-run
cat > /tmp/fake-run/meta.json <<'EOF'
{"run_id":"test","git_commit_sha":"abc12345","backend_url":"https://x","judge_model":"claude-opus-4-7","case_count":3,"started_at":"2026-04-17T00:00:00Z","finished_at":"2026-04-17T00:01:00Z"}
EOF
cat > /tmp/fake-run/A-1.json <<'EOF'
{"case_id":"A-1","dimension":"A","status":"ok","score_total":80,"score_max":100,"judge":{"reasoning":"Good script."}}
EOF
cat > /tmp/fake-run/B-1.json <<'EOF'
{"case_id":"B-1","dimension":"B","status":"ok","score_total":30,"score_max":100,"judge":{"reasoning":"Hallucinated taxitem field."}}
EOF
cat > /tmp/fake-run/C-1.json <<'EOF'
{"case_id":"C-1","dimension":"C","status":"ok","score_total":15,"score_max":100,"judge":{"reasoning":"Missing manifest.xml entirely."}}
EOF
```

- [ ] **Step 3: Generate report (no-cluster, offline)**

```bash
cd apps/arthaBuild
python tests/eval/report.py /tmp/fake-run --no-cluster
cat /tmp/fake-run/REPORT.md
```

Expected: REPORT.md with headline, per-dim table (A, B, C), worst-cases table, "no clusters" note, recommended fix paragraph pointing at C.

- [ ] **Step 4: Commit Wave 5**

```bash
git add apps/arthaBuild/tests/eval/report.py
git commit -m "feat(arthaBuild): eval harness Wave 5 — report generator + LLM clusterer"
```

---

## Chunk 6: Wave 6 — Smoke Run, Full Run, Spot-Check

Goal: prove the whole pipeline works on 3 cases, then run all 40 against production, then sanity-check.

### Task 6.1: Smoke run (3 cases)

- [ ] **Step 1: Verify env is loaded and prod is reachable**

```bash
cd apps/arthaBuild
curl -sI https://artha.build/health | head -5
```

Expected: `HTTP/2 200`.

- [ ] **Step 2: Run smoke**

```bash
cd apps/arthaBuild
python tests/eval/run_eval.py --smoke
```

Expected: 3 cases (A-1, C-1, E-1) run, ~30s wall time (3 × 6.5s sleep + ~5s/case). All `status: "ok"`. Each per-case JSON has `deterministic` and `judge` blocks.

- [ ] **Step 3: Generate smoke report**

```bash
SMOKE_DIR=$(ls -td apps/arthaBuild/tests/eval/runs/*/ | head -1)
python apps/arthaBuild/tests/eval/report.py "$SMOKE_DIR"
cat "$SMOKE_DIR/REPORT.md"
```

Expected: REPORT.md with 3-case results, per-dim aggregates, clusters, priority fix.

- [ ] **Step 4: Spot-check scorer output**

Read the JSON for the highest-scoring and lowest-scoring case in the smoke run. Verify the judge's `reasoning` matches the actual response quality. If they wildly disagree, the judge prompt needs adjustment — fix `judge_prompt.md` and re-smoke.

### Task 6.2: Full run (40 cases)

- [ ] **Step 1: Run all 40**

```bash
cd apps/arthaBuild
python tests/eval/run_eval.py
```

Expected: ~5 min wall time (40 × 6.5s + processing). Cost: ~$1-2.

Watch for any unexpected `http_error` or `timeout` cases — if more than 2-3 fail, investigate before generating report.

- [ ] **Step 2: Generate full report**

```bash
FULL_DIR=$(ls -td apps/arthaBuild/tests/eval/runs/*/ | head -1)
python apps/arthaBuild/tests/eval/report.py "$FULL_DIR"
cat "$FULL_DIR/REPORT.md"
```

- [ ] **Step 3: Manual spot-check 2 cases**

Pick the highest-scoring and lowest-scoring case from REPORT.md. Open their JSON files. Read the response. Sanity-check the judge's reasoning. If the judge gave 95/100 to obvious garbage or 10/100 to clearly-good code, the judge prompt is broken — iterate on `judge_prompt.md` and re-run.

- [ ] **Step 4: Commit the full run artifacts (if you want them tracked)**

NOTE: `tests/eval/runs/` is gitignored (Task 1.1). To preserve the report long-term, copy REPORT.md outside the gitignored dir:

```bash
cp "$FULL_DIR/REPORT.md" "apps/arthaBuild/docs/superpowers/eval-runs/2026-04-17-baseline-REPORT.md"
git add apps/arthaBuild/docs/superpowers/eval-runs/
git commit -m "docs(arthaBuild): baseline eval run — Apr 17 2026

40 cases × 5 dimensions. See REPORT.md for per-dimension scores
and recommended priority fix."
```

### Task 6.3: Mark task #6 done, queue task #7

- [ ] **Step 1: Mark task complete**

```bash
# Update GSD tasks: #6 (Run eval) → completed, #7 (Identify gap + fix) → in_progress
```

The "Recommended priority fix" paragraph from REPORT.md becomes the input prompt to task #7.

---

## Done When

- [ ] All 40 cases produce per-case JSONs with deterministic + judge scores
- [ ] REPORT.md is committed under `apps/arthaBuild/docs/superpowers/eval-runs/`
- [ ] Manual spot-check confirms judge reasoning aligns with response quality
- [ ] One dimension is clearly identified as weakest with a one-paragraph priority-fix recommendation
