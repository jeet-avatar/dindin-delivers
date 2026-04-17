---
id: CASE-003
title: "finetunedmodelrun.py never imported — entire file is dead code"
phase: "01"
phase_name: "Foundation & Auth Backend"
category: DEAD_CODE
severity: MEDIUM
status: DONE
created: 2026-04-10
updated: 2026-04-11
assignee: "Arjun"
agent: "gsd-executor"
blocks: []
blocked_by:
  - CASE-002
files:
  - path: src/backend/finetunedmodelrun.py
    lines: "1-245"
---

## Why This Case Was Created
Triggered by the DEAD_CODE audit dimension. A file that is never imported or referenced from any production entrypoint is dead code — it increases maintenance burden, creates confusion about which files are active, and in this case carries a critical security violation (CASE-002). Confirming the import gap is necessary before deletion.

## What Is Wrong
`src/backend/finetunedmodelrun.py` is a standalone FastAPI application (245 lines) that is never imported or referenced from the production entrypoint `rawapi.py` or any other production file.

**Grep proof — no production imports:**
```bash
grep -rn "finetunedmodelrun" src/backend/
# Result:
# src/backend/finetunedmodelrunv2.py:118:  uvicorn.run('finetunedmodelrunv2:app', ...)
```
The only reference to a file with "finetunedmodelrun" in the name is inside `finetunedmodelrunv2.py` line 118, which is the `uvicorn.run()` call for that file's own app — not an import of `finetunedmodelrun.py`. Zero files import `finetunedmodelrun`.

The file defines its own FastAPI `app` object (line 22), its own `/ask` route (line 193), and its own `/reset` route (line 231). It is intended to be run as a standalone server, not imported. The production server is `rawapi.py`, which has its own `/api/chatbot/process` route backed by `model_utils.py`.

## Why It Was Done This Way (Root Cause)
This was the first prototype iteration of the ArthaBuild chatbot — a single-file FastAPI app that predates the modular architecture. When the codebase grew into the multi-router structure (`rawapi.py` + `routers/` + `model_utils.py`), this prototype was not deleted. It was superseded rather than replaced.

## What Is Done Right
The production entrypoint `rawapi.py` correctly does not import this file. The Phase 3 AI pipeline was correctly implemented in `model_utils.py` with proper Ollama integration, and correctly wired into `rawapi.py`. The separation of concerns in the production code is correct.

## How To Fix It
**Step 1:** Verify no imports exist (expected: no output from production files):
```bash
grep -rn "from finetunedmodelrun import\|import finetunedmodelrun" src/backend/
```

**Step 2:** Delete the file:
```bash
rm src/backend/finetunedmodelrun.py
```

**Step 3:** Check if `local_vectorstore_v2/` (referenced only in this file at line 32) is also orphaned:
```bash
grep -rn "local_vectorstore_v2" src/backend/
```
If no other file references it, delete the directory (it contains a 1536-dim OpenAI FAISS index, incompatible with production).

**Step 4:** Check `requirements.txt` for packages that were only needed by this file (`langchain-openai`, `openai`) and remove them if unused elsewhere.

## Architecture Mapping

**Layer:** Dead prototype file — not part of any production flow

**Flow:**

    [Production]
    rawapi.py:237 → /api/chatbot/process → model_utils.infer_intent() + graph.invoke()

    [Dead Code — this file]
    finetunedmodelrun.py:193 → /ask (standalone route, unreachable from production)
                                              ↑
                                     THIS CASE LIVES HERE

**Upstream:** Nothing — no file imports `finetunedmodelrun.py`

**Downstream:** Would expose a standalone `/ask` endpoint, but only if run directly as `python finetunedmodelrun.py` — never in production

## Verification
- [ ] Grep proof: `grep -rn "from finetunedmodelrun import\|import finetunedmodelrun" src/backend/` → empty output
- [ ] Grep proof: `grep -rn "finetunedmodelrun" src/backend/` → only self-referential line in finetunedmodelrunv2.py
- [ ] Delete proof: after `rm`, run `python -c "import rawapi"` → no ImportError (confirms rawapi never needed it)

## Downstream Impact
**Impact if unfixed:** Cosmetic + Security Risk

On its own, the dead import is cosmetic — it does not affect runtime behavior. However, combined with CASE-002 (OpenAI usage), leaving this file in the repo risks: (1) a developer accidentally running it as the server, (2) CI/CD linting tools flagging OpenAI imports as policy violations, (3) confusion about which file is the real entrypoint.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-auth/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-002 (same file violates Ollama-only rule), CASE-004 (same problem in v2 file)
