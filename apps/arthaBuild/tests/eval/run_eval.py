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
