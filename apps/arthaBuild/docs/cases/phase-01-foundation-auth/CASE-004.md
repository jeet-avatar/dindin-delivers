---
id: CASE-004
title: "finetunedmodelrunv2.py never invoked from production code"
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
blocked_by: []
files:
  - path: src/backend/finetunedmodelrunv2.py
    lines: "1-119"
---

## Why This Case Was Created
Triggered by the DEAD_CODE audit dimension. Similar to CASE-003, `finetunedmodelrunv2.py` is a standalone FastAPI prototype that is never imported by `rawapi.py` or any production module. Unlike `finetunedmodelrun.py` (CASE-002), this v2 file does use the Ollama-backed `model_utils` — so it does not violate the OpenAI prohibition — but it still constitutes dead code that duplicates the production chatbot endpoint.

## What Is Wrong
`src/backend/finetunedmodelrunv2.py` defines a standalone FastAPI app with a `/ask` route (line 37) and a `/reset` route (line 105). It imports from `model_utils`, `sdf_utils`, and `suitescripts_utils` — the same modules used by the production server. However, this file is never imported or invoked by the production entrypoint.

**Evidence — the only self-reference is the uvicorn run call on line 118:**
```python
if __name__ == "__main__":
    uvicorn.run('finetunedmodelrunv2:app', host="127.0.0.1", port=8000)
```

**Grep proof:**
```bash
grep -rn "finetunedmodelrunv2" src/backend/
# Result:
# src/backend/finetunedmodelrunv2.py:118:  uvicorn.run('finetunedmodelrunv2:app', ...)
```

No other file imports it. The production entrypoint at `rawapi.py` wires the same `model_utils.infer_intent`, `model_utils.build_graph`, `suitescripts_utils.handle_netsuite_data_request`, and `sdf_utils.handle_sdf_project` directly. `finetunedmodelrunv2.py` is a historical intermediate prototype.

**Notable: the file has a module-level assignment that is also dead code:**
```python
latest_javascript_code = ""  # line 16 — assigned, never read
graph = build_graph()         # line 17 — executed at import time, but file is never imported
```

## Why It Was Done This Way (Root Cause)
This was the second iteration prototype — built after `finetunedmodelrun.py` (v1) was migrated from OpenAI to Ollama, but before the full multi-router `rawapi.py` architecture was established. The `/ask` route logic in v2 became the template for the production `/api/chatbot/process` route. The file was not deleted when its logic was promoted into `rawapi.py`.

## What Is Done Right
The v2 file correctly uses Ollama via `model_utils` — no OpenAI dependency (unlike CASE-002). The intent routing logic in this file is correct and was successfully promoted to `rawapi.py:250-332`. The production implementation in `rawapi.py` supersedes it cleanly.

## How To Fix It
**Step 1:** Verify no production imports:
```bash
grep -rn "from finetunedmodelrunv2 import\|import finetunedmodelrunv2" src/backend/
```
Expected: empty output.

**Step 2:** Delete the file:
```bash
rm src/backend/finetunedmodelrunv2.py
```

**Step 3:** Confirm the production server still starts cleanly:
```bash
cd src/backend && uvicorn rawapi:app --reload --port 8000
```
Expected: startup logs show AI pipeline initialization, no import errors.

## Architecture Mapping

**Layer:** Dead prototype file — superseded by rawapi.py

**Flow:**

    [Production]
    rawapi.py:237 → /api/chatbot/process → model_utils.infer_intent() + graph.invoke()
                                                     ↓
                                            suitescripts_utils, sdf_utils

    [Dead Code — this file]
    finetunedmodelrunv2.py:37 → /ask (standalone, unreachable in production)
      → same model_utils, suitescripts_utils, sdf_utils (duplicated wiring)
               ↑
      THIS CASE LIVES HERE

**Upstream:** Nothing — no production file imports `finetunedmodelrunv2.py`

**Downstream:** Would duplicate the production chatbot behavior if run directly; confuses developers about which file is authoritative

## Verification
- [ ] Grep proof: `grep -rn "from finetunedmodelrunv2 import\|import finetunedmodelrunv2" src/backend/` → empty output
- [ ] Grep proof: `grep -rn "finetunedmodelrunv2" src/backend/` → only line 118 (self-referential uvicorn run)
- [ ] Delete proof: `rm src/backend/finetunedmodelrunv2.py` then `python -c "import rawapi"` → no ImportError

## Downstream Impact
**Impact if unfixed:** Cosmetic

The file is never executed in production. The risk is developer confusion: seeing two files that appear to implement the same chatbot endpoint makes it unclear which one is live. A new team member might modify `finetunedmodelrunv2.py` thinking they are changing production behavior.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-auth/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-003 (same pattern in v1 file), CASE-010 (dead assignment in this file's module scope)
