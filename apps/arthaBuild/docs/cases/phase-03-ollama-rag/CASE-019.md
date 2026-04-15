---
id: CASE-019
title: "Ollama model names hardcoded — no startup warning if wrong model pulled"
phase: "03"
phase_name: "Ollama RAG Pipeline"
category: HARDCODED
severity: LOW

deferred_reason: "Low severity — env vars already used. Centralization deferred to M2 refactoring phase"
created: 2026-04-10
updated: 2026-04-11
assignee: "Rohan"
agent: "gsd-executor"
blocks: []
blocked_by: []
files:
  - path: src/backend/rawapi.py
    lines: "43-49"
  - path: src/backend/model_utils.py
    lines: "20-21"
---

## Why This Case Was Created
Triggered by the HARDCODED audit dimension. The model names `llama3.1:8b` and `nomic-embed-text` are specified in multiple places and the startup check in `rawapi.py` validates model availability using substring matching against `any("llama3.1" in m ...)` — which passes for any `llama3.1:*` tag. If a user pulls `llama3.1:70b` instead of `llama3.1:8b`, the startup check succeeds but `model_utils.py` will attempt to use `llama3.1:8b` specifically, causing Ollama to return a 404 at inference time with a cryptic error.

## What Is Wrong
`src/backend/rawapi.py` lines 43–49 — the Ollama availability check uses substring matching:
```python
models = [m["name"] for m in resp.json().get("models", [])]
has_llm = any("llama3.1" in m for m in models)       # matches llama3.1:70b too
has_embed = any("nomic" in m for m in models)         # matches nomic-embed-text:v1.5 too
if not has_llm:
    _log.warning("llama3.1:8b not pulled. Run: ollama pull llama3.1:8b")
if not has_embed:
    _log.warning("nomic-embed-text not pulled. Run: ollama pull nomic-embed-text")
return has_llm and has_embed
```

`src/backend/model_utils.py` lines 20–21 — the model names used for inference are loaded from env vars with hardcoded defaults:
```python
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")
```

**The mismatch scenario:**
1. User runs `ollama pull llama3.1:70b` (large model, different tag)
2. `_check_ollama_available()` returns `True` (substring "llama3.1" is found)
3. `_ai_ready = True` — server starts normally
4. User sends a chat message
5. `ChatOllama(model="llama3.1:8b")` is instantiated
6. Ollama returns: `{"error":"model 'llama3.1:8b' not found"}` (the 8b tag was not pulled)
7. User sees a 500 error or an LLM failure message — no actionable guidance

Additionally, the `OLLAMA_MODEL` env var override path is not validated — if a user sets `OLLAMA_MODEL=my-custom-model`, there is no startup check confirming that model exists in Ollama.

## Why It Was Done This Way (Root Cause)
The substring matching approach (`any("llama3.1" in m ...)`) was used to be tolerant of minor tag variations (e.g., `llama3.1:8b-instruct-q4_K_M`). The assumption was that any `llama3.1` variant would behave similarly to `llama3.1:8b`. The env var defaults were set once during Phase 3 and not revisited. There is no validation loop that cross-checks which specific tag the user pulled against which tag the code will request.

## What Is Done Right
The `_check_ollama_available()` function in `rawapi.py` (lines 35–52) is a well-designed startup gate — it checks Ollama connectivity AND model availability before setting `_ai_ready = True`. The warning messages (`llama3.1:8b not pulled. Run: ollama pull llama3.1:8b`) are actionable. The env var override mechanism (`OLLAMA_MODEL`, `OLLAMA_EMBED_MODEL`) is the correct pattern for deployment flexibility.

## How To Fix It
**Step 1 — Exact tag matching in `_check_ollama_available()`:**

In `rawapi.py`, replace substring matching with exact tag comparison using the configured model names:

```python
def _check_ollama_available() -> bool:
    from config import OLLAMA_MODEL, OLLAMA_EMBED_MODEL  # or read env vars directly
    ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    try:
        resp = _requests.get(f"{ollama_url}/api/tags", timeout=5)
        if resp.status_code != 200:
            return False
        models = [m["name"] for m in resp.json().get("models", [])]
        # Exact match: the configured model tag must exist
        has_llm = OLLAMA_MODEL in models
        has_embed = OLLAMA_EMBED_MODEL in models
        if not has_llm:
            _log.warning(f"Model '{OLLAMA_MODEL}' not found in Ollama. Run: ollama pull {OLLAMA_MODEL}")
            _log.warning(f"Available models: {models}")
        if not has_embed:
            _log.warning(f"Embedding model '{OLLAMA_EMBED_MODEL}' not found. Run: ollama pull {OLLAMA_EMBED_MODEL}")
        return has_llm and has_embed
    except Exception as e:
        _log.warning(f"Ollama not available at {ollama_url}: {e}")
        return False
```

**Step 2 — Add model validation to the startup event:**
In `startup_validation()`, add a check that prints available models if `_ai_ready` is False after the startup guard.

## Architecture Mapping

**Layer:** Backend Application Startup — AI Pipeline Initialization

**Flow:**

    rawapi.py startup:
      _check_ollama_available()
        → GET /api/tags (Ollama)
          → any("llama3.1" in m for m in models)   ← THIS CASE LIVES HERE (substring match)
             → True if llama3.1:70b exists (but code uses llama3.1:8b)
        → _ai_ready = True (false positive)
      model_utils.build_graph()
        → ChatOllama(model="llama3.1:8b")   ← uses specific tag from env var default
          → Ollama API: model 'llama3.1:8b' not found → 500 at inference time

**Upstream:** Docker Compose or local developer sets up Ollama and pulls models

**Downstream:** `model_utils.get_llm()` and `model_utils.get_embeddings()` use the exact model tag; if the tag doesn't exist in Ollama, all LLM calls fail

## Verification
- [ ] Grep proof: `grep -n "any.*llama3.1\|any.*nomic" src/backend/rawapi.py` → shows lines 43-44 (substring match)
- [ ] Grep proof: `grep -n "OLLAMA_MODEL\|llama3.1:8b\|nomic-embed-text" src/backend/model_utils.py` → shows lines 20-21
- [ ] Fix proof: after exact matching, test with `ollama pull llama3.1:70b` only → server should log warning and set `_ai_ready=False`

## Downstream Impact
**Impact if unfixed:** Degraded UX — silent failure at inference time

If a user pulls the wrong model tag, the server starts successfully (`_ai_ready=True`) but all chat requests fail with 500 errors or empty responses. The error message from Ollama ("model not found") may be swallowed by the try/except in `rawapi.py:334` and returned as a generic error, providing no guidance to the operator.

## Links
- Phase SUMMARY: `.planning/phases/03-ollama-rag-pipeline/03-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-018 (Ollama URL also duplicated — same centralization gap)
