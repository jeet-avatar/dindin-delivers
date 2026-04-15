---
id: CASE-002
title: "finetunedmodelrun.py uses OpenAI — violates Ollama-only rule"
phase: "01"
phase_name: "Foundation & Auth Backend"
category: DEAD_CODE
severity: HIGH
status: DONE
created: 2026-04-10
updated: 2026-04-11
assignee: "Arjun"
agent: "gsd-executor"
blocks:
  - CASE-003
blocked_by: []
files:
  - path: src/backend/finetunedmodelrun.py
    lines: "1-49"
---

## Why This Case Was Created
Triggered by the ARCH_VIOLATION and DEAD_CODE audit dimensions. CLAUDE.md states as an absolute rule: "All inference via Ollama (local). Zero external LLM API calls. OpenAI references in production code = critical bug." This file contains direct OpenAI API calls, which violates the core architectural principle of the project.

## What Is Wrong
`src/backend/finetunedmodelrun.py` imports and uses OpenAI APIs in three places:

**Line 6 — OpenAI embeddings import:**
```python
from langchain_openai import OpenAIEmbeddings
```

**Lines 35–40 — OpenAI embeddings instantiation with API key:**
```python
embedding = OpenAIEmbeddings(openai_api_key=os.getenv("OPENAI_API_KEY", ""))
vectorstore = FAISS.load_local(
    VECTORSTORE_PATH,
    embedding,
    allow_dangerous_deserialization=True
)
```

**Lines 49 and 71 — OpenAI GPT-4.1 model instantiation:**
```python
response_model = init_chat_model("openai:gpt-4.1", temperature=0, openai_api_key=os.getenv("OPENAI_API_KEY", ""))
grader_model = init_chat_model("openai:gpt-4.1", temperature=0, openai_api_key=os.getenv("OPENAI_API_KEY", ""))
```

**Lines 152–156 — Direct OpenAI client import and usage:**
```python
def infer_intent(user_input: str) -> str:
    from openai import OpenAI
    import json, re
    import os
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))
```

The file also uses `VECTORSTORE_PATH = "local_vectorstore_v2"` (line 32) which points to a 1536-dim OpenAI-generated FAISS index, incompatible with the production 768-dim nomic-embed-text index.

## Why It Was Done This Way (Root Cause)
This file is the original prototype — built before the architectural decision was made to go fully Ollama-local. It uses OpenAI's GPT-4.1 and OpenAI Embeddings as the initial implementation of the RAG pipeline. When Phase 3 rebuilt the AI pipeline with Ollama (`model_utils.py`), this file was not deleted — it was abandoned in place.

## What Is Done Right
The file itself demonstrates the correct LangGraph agentic RAG pattern (retrieve → grade → rewrite → generate) — this same pattern was correctly reimplemented in `model_utils.py` using Ollama. The graph topology is sound; only the model provider is wrong.

## How To Fix It
This file should be deleted entirely, since it is dead code (see CASE-003) and violates the OpenAI prohibition.

**Step 1:** Confirm it is not imported anywhere:
```bash
grep -rn "finetunedmodelrun" src/backend/
```

**Step 2:** Delete the file:
```bash
rm src/backend/finetunedmodelrun.py
```

**Step 3:** Verify the FAISS vectorstore at `local_vectorstore_v2/` is also not referenced anywhere (it uses 1536-dim OpenAI embeddings, incompatible with production):
```bash
grep -rn "local_vectorstore_v2" src/backend/
```
If only this file references it, delete the directory too.

## Architecture Mapping

**Layer:** AI Pipeline (dead prototype, should not exist in production codebase)

**Flow:**

    [This file is NOT in the production flow]
    Production flow: rawapi.py → model_utils.py → ChatOllama + FAISS(768-dim nomic)
    Dead code:       finetunedmodelrun.py → OpenAI GPT-4.1 + OpenAI Embeddings(1536-dim)
                                                    ↑
                                           THIS CASE LIVES HERE

**Upstream:** Nothing calls this file (see CASE-003)

**Downstream:** Would call `api.openai.com` if invoked — violates Ollama-only rule, leaks data to external service, requires `OPENAI_API_KEY`

## Verification
- [ ] Grep proof: `grep -n "OpenAI\|openai" src/backend/finetunedmodelrun.py` → shows lines 6, 35, 49, 71, 152-156
- [ ] No imports: `grep -rn "finetunedmodelrun" src/backend/` → only finetunedmodelrun.py itself (run as __main__)
- [ ] Delete proof: `rm src/backend/finetunedmodelrun.py && ls src/backend/` → file gone

## Downstream Impact
**Impact if unfixed:** Security Risk

If someone accidentally invokes this file (e.g., `python finetunedmodelrun.py`), it will attempt to call `api.openai.com`, requiring a paid API key and sending NetSuite question data to an external service — violating the data residency guarantee of the product. Additionally, `openai` and `langchain_openai` packages may appear in `requirements.txt`, increasing the attack surface and container image size.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-auth/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-003 (this file is never imported — full dead code)
