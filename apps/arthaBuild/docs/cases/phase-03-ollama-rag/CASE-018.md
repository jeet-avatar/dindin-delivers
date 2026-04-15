---
id: CASE-018
title: "Ollama base URL duplicated across 3 production files (not centralized)"
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
  - path: src/backend/model_utils.py
    lines: "19"
  - path: src/backend/rawapi.py
    lines: "37"
  - path: src/backend/sdf_utils.py
    lines: "90"
---

## Why This Case Was Created
Triggered by the HARDCODED audit dimension. The Ollama base URL (`http://localhost:11434` in development, `http://ollama:11434` in Docker) is loaded independently in three production files. Each file reads from the `OLLAMA_BASE_URL` environment variable with the same default — which is correct pattern individually, but the lack of a single centralized config module means: (a) if the env var name ever changes, it must be updated in three places; (b) the default value `http://localhost:11434` is duplicated three times.

## What Is Wrong
Three production files each independently read `OLLAMA_BASE_URL`:

**`src/backend/model_utils.py` line 19:**
```python
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
```

**`src/backend/rawapi.py` line 37 (inside `_check_ollama_available()`):**
```python
ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
```

**`src/backend/sdf_utils.py` line 90 (inside `extract_project_name()`):**
```python
base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
```

The CLAUDE.md frozen interface table specifies: "Ollama URL (Docker): `http://ollama:11434`". The production URL for Docker Compose differs from the development default. All three files use the same default (`http://localhost:11434`), which is correct for local dev but silently wrong in Docker if `OLLAMA_BASE_URL` is not set.

**Note:** `finetunedmodelrunv2.py` and `finetunedmodelrun.py` also contain references, but those are dead code files (CASE-003, CASE-004) and do not count as production occurrences.

The pattern `os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")` repeated in 3 files means: if the env var name or default changes, all 3 files must be updated atomically. This has already happened once — the Docker URL (`http://ollama:11434`) differs from the local default, which required adding the env var to Docker Compose but left the code defaults unchanged.

## Why It Was Done This Way (Root Cause)
Each module was written independently and followed the standard Python pattern of reading env vars at the point of use. There was no shared `config.py` module in Phase 3 to centralize Ollama configuration. The duplication was acceptable when only `model_utils.py` used Ollama; it became a concern when `rawapi.py` and `sdf_utils.py` also needed to reference the URL.

## What Is Done Right
All three files correctly read from the environment variable first (`os.getenv`) rather than hardcoding a URL directly. The env var name `OLLAMA_BASE_URL` is consistent across all usages. The Docker Compose file correctly sets `OLLAMA_BASE_URL=http://ollama:11434` to override the local default.

## How To Fix It
Create a centralized config module `src/backend/config.py`:

```python
# src/backend/config.py
"""Centralized configuration constants — read once, import everywhere."""
import os
from dotenv import load_dotenv

load_dotenv()

OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
OLLAMA_EMBED_MODEL: str = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")
FAISS_PATH: str = os.getenv("FAISS_PATH", "./data/vectorstore_ollama")
```

Then update each file to import from `config`:

**`model_utils.py` — replace lines 19-21:**
```python
# Before
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")

# After
from config import OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_EMBED_MODEL, FAISS_PATH
```

**`rawapi.py` — update `_check_ollama_available()` line 37:**
```python
# Before
ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

# After
from config import OLLAMA_BASE_URL as ollama_url
```

**`sdf_utils.py` — update `extract_project_name()` line 90:**
```python
# Before
base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),

# After
from config import OLLAMA_BASE_URL
# ... then
base_url=OLLAMA_BASE_URL,
```

## Architecture Mapping

**Layer:** Configuration — AI Pipeline (Ollama URL sourcing)

**Flow:**

    model_utils.py:19 → os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")   ← duplicate 1
    rawapi.py:37      → os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")   ← duplicate 2
    sdf_utils.py:90   → os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")   ← duplicate 3
                                        ↑
                              THIS CASE LIVES HERE (should be centralized in config.py)

    [Docker Compose sets]: OLLAMA_BASE_URL=http://ollama:11434  ← overrides all 3 defaults

**Upstream:** Docker Compose `environment:` section sets `OLLAMA_BASE_URL`; `.env` file sets it for local dev

**Downstream:** `ChatOllama(base_url=...)` and `OllamaEmbeddings(base_url=...)` in `model_utils.py`; `requests.get(f"{ollama_url}/api/tags")` in `rawapi.py`

## Verification
- [ ] Grep proof: `grep -rn "OLLAMA_BASE_URL\|localhost:11434" src/backend/ --include="*.py"` → shows 3 production file occurrences (rawapi.py:37, model_utils.py:19, sdf_utils.py:90)
- [ ] Fix proof: after adding `config.py`, `grep -rn "os.getenv.*OLLAMA_BASE_URL" src/backend/` → shows only `config.py`
- [ ] Runtime proof: `OLLAMA_BASE_URL=http://custom:11434 python -c "from config import OLLAMA_BASE_URL; print(OLLAMA_BASE_URL)"` → prints `http://custom:11434`

## Downstream Impact
**Impact if unfixed:** Cosmetic + potential Degraded UX in Docker

If the env var name ever changes (e.g., from `OLLAMA_BASE_URL` to `OLLAMA_URL`), three files must be updated. Missing one causes that module to fall back to `http://localhost:11434`, which silently fails in Docker where Ollama is at `http://ollama:11434`. This has zero impact in environments where `OLLAMA_BASE_URL` is always set explicitly.

## Links
- Phase SUMMARY: `.planning/phases/03-ollama-rag-pipeline/03-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-019 (Ollama model names also duplicated/hardcoded)
