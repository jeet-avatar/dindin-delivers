---
id: CASE-127
title: "No hardcoded OpenAI API keys found in Python source files under src/"
phase: "06"
phase_name: "Testing & Hardening"
category: FEATURE_TEST
severity: INFO
status: PASS
created: 2026-04-10
updated: 2026-04-10
assignee: "Kiran"
agent: "gsd-verifier"
blocks: []
blocked_by: []
feature: "No OpenAI keys in codebase"
test_ref: "tests/test_security.py::test_no_hardcoded_openai_keys"
files:
  - path: src/backend/
    lines: ""
---

## Why This Case Was Created
Verifies that no hardcoded OpenAI API key strings are present in any Python source file
under `src/`. ArthaBuild uses Ollama exclusively for all LLM inference — any OpenAI key in
the codebase would indicate either accidental inclusion or an architectural violation, and
would be a secret leak if committed to version control.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- A developer may have temporarily added `openai.api_key = "sk-..."` during debugging and
  committed it
- A dependency or library initialisation may be referencing an OpenAI key pattern that
  regex-matches but is not actually an OpenAI key (false positive — adjust the pattern)
- A new file may have been added under `src/` that imports the `openai` package with a key

## Why It Was Done This Way (Root Cause)
The test uses Python's `pathlib` (or `os.walk`) to enumerate all `.py` files under `src/`,
then greps each for the pattern `sk-[a-zA-Z0-9]{32,}` (the OpenAI key format). Zero matches
are required. This is a static analysis check that runs in CI as part of the hardening suite.
The `CLAUDE.md` project law states "OpenAI references in production code = critical bug."

## What Is Done Right
- Scans all Python files (not just a subset) under `src/`
- Uses a regex pattern matching the actual OpenAI key format (`sk-` prefix + 32+ chars)
- Zero-tolerance: any match causes the test to fail immediately with the offending file path

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_security.py::test_no_hardcoded_openai_keys -v
```

## Architecture Mapping

**Layer:** Static Analysis (test-time scan)

**Flow:**
    test_no_hardcoded_openai_keys()
      → enumerate all *.py files under src/
        → for each file: grep for /sk-[a-zA-Z0-9]{32,}/
          → assert matches == []  ← THIS TEST COVERS THIS

**Upstream:** Developer code changes or dependency updates
**Downstream:** Zero OpenAI keys in source; all LLM calls go to Ollama at `http://ollama:11434`

## Verification
- [ ] Test passes: `pytest tests/test_security.py::test_no_hardcoded_openai_keys -v`

## Downstream Impact
**Impact if unfixed:** An OpenAI key in source would be committed to git history, leading to
immediate key revocation by OpenAI's automated scanner, potential billing fraud, and a
critical security incident. Additionally it would indicate the system has silently switched
from Ollama to OpenAI, breaking the air-gapped / on-premises deployment model.

## Links
- Phase SUMMARY: `.planning/phases/06-testing-hardening/06-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-128 (rate limit on auth), CASE-129 (weak JWT secret), CASE-130 (CORS)
