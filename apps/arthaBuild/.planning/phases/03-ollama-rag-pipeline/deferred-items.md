# Phase 03-01 Deferred Items

## Out-of-scope issues discovered during Task 5 execution

### finetunedmodelrun.py — Legacy OpenAI references
- **File:** `src/backend/finetunedmodelrun.py`
- **Issue:** Contains langchain-openai and openai imports (pre-existing, not caused by Phase 3)
- **Status:** NOT imported by rawapi.py or any production router — dead standalone script
- **Action:** Delete or migrate in a future cleanup phase
- **Not fixed now:** Outside scope of 03-01 changes; would require langchain-openai reinstallation to test

### FAISS vectorstore — Bootstrap only (203k docs not embedded)
- **Issue:** Full 1.2GB vectorstore (203,618 chunks) not present in local checkout
- **Source:** Lives in `~/Downloads/Artha.zip` per STATE.md
- **Current state:** 10-doc bootstrap index at `data/vectorstore_ollama/` (functional for dev/test)
- **Action:** When full vectorstore is available, run `python scripts/rebuild_vectorstore.py`
- **Phase 5 note:** Docker Compose volume mounts `/app/data/vectorstore_ollama` — needs full index before prod deploy
