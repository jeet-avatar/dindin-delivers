---
phase: 03-ollama-rag-pipeline
plan: "01"
subsystem: ai-llm-pipeline
tags: [ollama, faiss, langgraph, rag, embeddings, local-llm]
dependency_graph:
  requires: [01-05]
  provides: [build_graph, infer_intent, vectorstore_ollama]
  affects: [rawapi._ai_ready, /api/chatbot/process, /health]
tech_stack:
  added: [langchain-ollama==0.2.3]
  removed: [langchain-openai==0.2.9, openai==1.109.1]
  patterns: [ChatOllama, OllamaEmbeddings, RAGState TypedDict, LangGraph StateGraph]
key_files:
  created:
    - src/backend/scripts/rebuild_vectorstore.py
    - src/backend/data/vectorstore_ollama/index.faiss
    - src/backend/data/vectorstore_ollama/index.pkl
  modified:
    - src/backend/model_utils.py
    - src/backend/rawapi.py
    - src/backend/requirements.txt
    - src/backend/.env
    - src/backend/sdf_utils.py
key_decisions:
  - "langchain-ollama pinned to 0.2.3 (1.1.0 pulled langchain-core 1.2.28, breaking langgraph 0.2.38)"
  - "RAGState TypedDict replaces MessagesState — cleaner graph interface (question/documents/generation/rewrite_count)"
  - "Bootstrap vectorstore (10 docs) committed; full 203k rebuild requires source FAISS from Artha.zip"
  - "finetunedmodelrun.py left with OpenAI refs — not imported anywhere, deferred to cleanup phase"
  - "_ai_ready=True requires: Ollama health check pass + llama3.1:8b + nomic-embed-text both pulled + FAISS loaded"
metrics:
  duration_seconds: 879
  completed_date: "2026-04-09"
  tasks_completed: 5
  tasks_total: 5
  files_modified: 5
  files_created: 3
requirements:
  - FR-LLM-01
  - FR-LLM-02
  - FR-LLM-03
---

# Phase 3 Plan 01: Ollama RAG Pipeline Migration Summary

**One-liner:** Migrated LLM stack from OpenAI (gpt-4 + ada-002) to fully local Ollama (llama3.1:8b + nomic-embed-text 768-dim), rebuilding FAISS with new embeddings and wiring Ollama health check into _ai_ready flag.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Verify/Install Ollama + pull models | (OS-level, no files) | Ollama 0.12.5 + llama3.1:8b + nomic-embed-text pulled |
| 2 | Update requirements.txt | 84fd816b | requirements.txt, .env |
| 3 | Rewrite model_utils.py for Ollama | ec10f688 | model_utils.py |
| 4 | Rebuild FAISS vectorstore | 2df17948 | scripts/rebuild_vectorstore.py, data/vectorstore_ollama/ |
| 5 | Update rawapi.py _ai_ready + Ollama health check | fe0844b3 | rawapi.py, sdf_utils.py |

---

## Must-Have Verification

| Check | Result |
|-------|--------|
| `grep -r 'sk-proj' src/backend/` (production code) | PASS — zero matches in rawapi.py, model_utils.py, sdf_utils.py |
| Ollama running on http://localhost:11434 | PASS — Ollama 0.12.5 |
| llama3.1:8b pulled | PASS |
| nomic-embed-text pulled | PASS |
| FAISS vectorstore at data/vectorstore_ollama/ with 768-dim | PASS — index.faiss + index.pkl exist |
| infer_intent('write SuiteScript') returns generate_suitescript | PASS |
| build_graph() compiles (CompiledStateGraph) | PASS |
| rawapi.py syntax valid | PASS |

---

## Architecture: New LangGraph RAG Pipeline

```
User question
     │
     ▼
retrieve_node (FAISS similarity_search k=5, nomic-embed-text 768-dim)
     │
     ▼
grade_node (llama3.1:8b grades each doc YES/NO for relevance)
     │
     ├── no relevant docs + rewrite_count==0 → rewrite_node → retrieve_node
     │
     └── relevant docs or rewrite_count>0 → generate_node
                                                     │
                                                     ▼
                                             Final answer (llama3.1:8b)
```

**State:** `RAGState = TypedDict(question, documents, generation, rewrite_count)`

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] sdf_utils.py extract_project_name() used OpenAI**
- **Found during:** Task 5 — zero-openai grep check
- **Issue:** `sdf_utils.py:84` had `from openai import OpenAI` + gpt-4 call. Since `openai` package was uninstalled, calling `handle_sdf_project` (manage_sdf_project intent) would fail at runtime with ImportError
- **Fix:** Replaced OpenAI call with `ChatOllama(model=llama3.1:8b)` — same local-only pattern as model_utils.py
- **Files modified:** `src/backend/sdf_utils.py`
- **Commit:** fe0844b3

**2. [Rule 1 - Bug] /api/chatbot/process used MessagesState interface**
- **Found during:** Task 5 — graph interface mismatch
- **Issue:** Old model_utils.py used `MessagesState` with `{"messages": [...]}`. New model_utils.py uses `RAGState` with `{"question": str, ...}`. The chatbot handler would fail at runtime on `graph.invoke({"messages": ...})`
- **Fix:** Updated chatbot handler to use `graph.invoke({"question": user_input, "documents": [], "generation": "", "rewrite_count": 0})`
- **Files modified:** `src/backend/rawapi.py`
- **Commit:** fe0844b3

**3. [Rule 3 - Blocking] langchain-ollama 1.1.0 incompatible with langgraph 0.2.38**
- **Found during:** Task 2 — pip install conflict
- **Issue:** `langchain-ollama>=0.2.0` pulled 1.1.0 which requires langchain-core 1.2.28, breaking langgraph 0.2.38 (requires langchain-core <0.4)
- **Fix:** Pinned to `langchain-ollama==0.2.3` (compatible with langchain-core 0.3.63)
- **Files modified:** `src/backend/requirements.txt`
- **Commit:** 84fd816b

### Deferred Items (out of scope)

**finetunedmodelrun.py — Legacy OpenAI script**
- Pre-existing file, NOT imported by rawapi.py or any production router
- Still contains `langchain-openai` and `openai` imports
- Not fixed: outside scope of 03-01 changes; documented at `.planning/phases/03-ollama-rag-pipeline/deferred-items.md`

**Full FAISS rebuild (203,618 docs)**
- Full vectorstore from `~/Downloads/Artha.zip` not present in this checkout
- Bootstrap index (10 NetSuite docs, 768-dim) committed for dev/test
- When full index needed: run `python scripts/rebuild_vectorstore.py` after placing source index at `data/vectorstore/`

---

## Decisions Made

1. **langchain-ollama pinned to 0.2.3:** 1.1.0 broke langchain-core compatibility. 0.2.3 is the last release in the 0.2.x series compatible with langchain-core 0.3.63.

2. **RAGState TypedDict instead of MessagesState:** Cleaner graph interface — explicit fields (question, documents, generation, rewrite_count) vs opaque messages list. Easier to debug, test, and extend in Phase 4.

3. **Bootstrap vectorstore committed to git:** 10-doc 768-dim index ensures `_ai_ready=True` works on any machine with Ollama running, without needing the 1.2GB full index. The `rebuild_vectorstore.py` script handles migration when full data is available.

4. **_ai_ready requires Ollama health check pass:** Added `_check_ollama_available()` function that hits `/api/tags` with 5s timeout and validates both models. Server starts without AI if Ollama is down (graceful degradation, 503 on chatbot endpoint).

---

---

## Post-Phase Bug Fixes (2026-04-09 — Session 2)

These bugs were found during live use after Phase 6 completed. All fixes are in `rawapi.py` and `suitescripts_utils.py`.

### Bug 1 — `generate_suitescript` blank screen (ChatMessage.tsx crash)
- **Symptom:** Asking "create a purchase order automation script" blanked the screen
- **Root cause:** `ChatMessage.tsx` used `code.includes('[')` to detect JSON array data, but SuiteScript JavaScript contains array literals (`var filters = []`) → `JSON.parse(code)` threw `SyntaxError` → React crashed with no error boundary
- **Fix:** `ChatMessage.tsx` — changed condition to `code.trim().startsWith('[') && (try JSON.parse returns true)`. Also upgraded the `else` fallback to render unknown code blocks via `SyntaxHighlighter` instead of raw text.
- **Files:** `src/frontend/src/components/ChatMessage.tsx`

### Bug 2 — "how to deploy this" → "Request failed" (SystemExit kill)
- **Symptom:** Asking "how to deploy this" returned "Request failed" with no error detail
- **Root cause:** `infer_intent()` classified "deploy" as `manage_sdf_project` → `handle_sdf_project()` called `suitecloud project:deploy` (not installed) → `run_command()` called `sys.exit(1)` → `SystemExit` raised → NOT caught by `except Exception` → uvicorn worker killed → frontend got no response
- **Fix:** `rawapi.py` — added `_suitecloud_ready` guard on `manage_sdf_project` handler; changed outer catch from `except Exception` to `except BaseException` (catches `SystemExit`); changed 500 error key from `{"error": ...}` to `{"detail": ...}` so frontend shows real message
- **Files:** `src/backend/rawapi.py`

### Bug 3 — `"yes"` handler saved wrong message (wrong session index)
- **Symptom:** Typing "yes" after SuiteScript generation returned "❌ No valid js/xml code blocks found"
- **Root cause:** After appending both the user "yes" and the RAG response to `chat_sessions`, `chat_sessions[session_id][-1]` pointed to the RAG response to "yes" (not the prior SuiteScript). `save_generated_files()` got a text response with no code blocks → always failed.
- **Fix:** `rawapi.py` — replaced `[-1]` index with backwards search through `history[:-2]` for the last assistant message containing triple-backtick code blocks
- **Files:** `src/backend/rawapi.py`

### Bug 4 — `fetch_netsuite_data` and `manage_sdf_project` could return `None` response
- **Symptom:** NetSuite data fetch or SDF errors sent `{"response": null}` to frontend
- **Root cause (a):** `download_suitescript_file()` and `extract_custom_suitescript_metadata()` had `except CalledProcessError` blocks with no `return` statement → implicit `None` return
- **Root cause (b):** `handle_netsuite_data_request()` result not guarded before setting as `response_text`
- **Fix:** `suitescripts_utils.py` — added `return "❌ ..."` to both except blocks. `rawapi.py` — added `None`-fallback guard on `fetch_netsuite_data` path
- **Files:** `src/backend/suitescripts_utils.py`, `src/backend/rawapi.py`

### Bug 5 — `graph.invoke()` result not guarded against `None`
- **Symptom:** Would crash with `AttributeError: 'NoneType' object has no attribute 'get'` if graph returned None
- **Root cause:** `result.get("generation", "")` called unconditionally — would crash if `graph.invoke()` returned `None`
- **Fix:** `rawapi.py` — changed to `(result.get("generation", "") if isinstance(result, dict) else "") or "I could not find..."`
- **Files:** `src/backend/rawapi.py`

---

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/backend/model_utils.py | FOUND |
| src/backend/scripts/rebuild_vectorstore.py | FOUND |
| src/backend/data/vectorstore_ollama/index.faiss | FOUND |
| src/backend/data/vectorstore_ollama/index.pkl | FOUND |
| Commit 84fd816b (requirements.txt) | FOUND |
| Commit ec10f688 (model_utils.py) | FOUND |
| Commit 2df17948 (rebuild script + vectorstore) | FOUND |
| Commit fe0844b3 (rawapi.py + sdf_utils.py) | FOUND |
