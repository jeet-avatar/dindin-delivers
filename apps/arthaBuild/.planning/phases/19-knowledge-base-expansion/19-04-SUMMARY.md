---
phase: 19-knowledge-base-expansion
plan: 4
subsystem: knowledge-pipeline
tags: [knowledge-base, netsuite, faiss, suiteql, tba-oauth, admin-api]
dependency-graph:
  requires: [19-03, routers/netsuite.py, session_store.py]
  provides: [scripts/pull_customer_knowledge.py, routers/knowledge.py]
  affects: [rawapi.py, routers/netsuite.py, docs/ARCHITECTURE.md, docs/architecture-diagram.html, docs/test-report.html]
tech-stack:
  added: []
  patterns: [TBA-OAuth-1.0a-HMAC-SHA256, SuiteQL-REST-metadata-pull, asyncio-run_in_executor-background-task]
key-files:
  created:
    - apps/arthaBuild/src/backend/scripts/pull_customer_knowledge.py
    - apps/arthaBuild/src/backend/routers/knowledge.py
  modified:
    - apps/arthaBuild/src/backend/rawapi.py
    - apps/arthaBuild/src/backend/routers/netsuite.py
    - apps/arthaBuild/docs/ARCHITECTURE.md
    - apps/arthaBuild/docs/architecture-diagram.html
    - apps/arthaBuild/docs/test-report.html
decisions:
  - AB-1904-SESSION: knowledge.py uses get_session_creds(user_id) + NetSuiteCreds→dict conversion (plan called non-existent get_session())
  - AB-1904-ARCH: ARCHITECTURE.md bumped v3.0→v3.1 with Plan 04 customer pull pipeline section
metrics:
  duration: ~10 minutes
  completed: 2026-04-15
  tasks_completed: 10
  files_created: 2
  files_modified: 5
---

# Phase 19 Plan 04: Customer Instance Knowledge Pull Summary

**One-liner:** Customer FAISS knowledge pull — 6 SuiteQL/REST pulls from live NetSuite instance on TBA connect → markdown → FAISS at `data/customer_index/`

## What Was Built

On TBA connect, ArthaBuild now automatically pulls 6 data sources from the customer's NetSuite account and builds a customer-specific FAISS index for personalized RAG answers.

### scripts/pull_customer_knowledge.py (new)

Complete customer instance knowledge puller:

- `_tba_auth_header()` — OAuth 1.0a HMAC-SHA256 header generation (no external auth library)
- `_suiteql()` — POST to SuiteQL endpoint with TBA auth
- `_rest_get()` — GET to REST metadata endpoint with TBA auth
- `pull_account_metadata()` — Pull 1: `SELECT companyName FROM companyPreferences`
- `pull_custom_fields()` — Pull 2: custom fields grouped by `appliesto` record type
- `pull_custom_records()` — Pull 3+4: custom record types + REST `/record/v1/metadata-catalog/{scriptId}` fields
- `pull_deployed_scripts()` — Pull 5: active SuiteScripts from `script` table
- `pull_workflows()` — Pull 6: active workflows from `workflow` table
- `build_customer_index()` — chunk markdown (2400/400) + embed with nomic-embed-text → FAISS
- `pull_all()` — main entry point called by netsuite.py and knowledge.py

All pulls are non-fatal (individual `try/except` blocks, continue on failure).

### routers/knowledge.py (new)

Admin-only knowledge management API:

| Endpoint | Method | Description |
|---|---|---|
| `/api/admin/knowledge/refresh` | POST | Fire-and-forget background re-pull |
| `/api/admin/knowledge/status` | GET | Returns doc_count, last_built, status, file type counts |

`_build_status` dict tracks in-memory build state. On `status=unknown` (first request after restart), falls back to live file system inspection.

### rawapi.py (modified)

Added Phase 19 section registering `knowledge_router` after Phase 16 apikeys router.

### routers/netsuite.py (modified)

After successful TBA auth (line 231), fires `pull_all()` as a non-blocking background task:

```python
asyncio.create_task(
    asyncio.get_event_loop().run_in_executor(None, _pull_customer_knowledge, _knowledge_creds)
)
```

Wrapped in `try/except` — TBA connect succeeds even if pull trigger fails.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `get_session()` → `get_session_creds(user_id)`**

- **Found during:** Task 2 (writing knowledge.py)
- **Issue:** Plan's `knowledge.py` called `from session_store import get_session` and `creds = get_session()`. `get_session()` does NOT exist in `session_store.py` — the actual API is `get_session_creds(user_id: int) -> Optional[NetSuiteCreds]`.
- **Fix:** Used `get_session_creds(current_user.id)` and added NetSuiteCreds → dict conversion before passing to `pull_all()`.
- **Files modified:** `routers/knowledge.py`
- **Commit:** b915eab6

## Verification

- [x] Grep proof: `pull_customer_knowledge.py` exists, compiles clean (`python3 -m py_compile` → OK)
- [x] Routes: `/api/admin/knowledge/refresh` and `/api/admin/knowledge/status` confirmed registered via `rawapi.app.routes` inspection
- [x] Integration: `get_session_creds` present in knowledge.py, `pull_customer_knowledge` import present in netsuite.py, `knowledge_router` include present in rawapi.py
- [x] Key content: `companyPreferences` (Pull 1) and `metadata-catalog` (Pull 4) verified in script
- [x] Test suite: 146 passed, 0 regressions (2 pre-existing failures: nginx HTTPS redirect + alembic heads env — unchanged from before this plan)

## Self-Check: PASSED

All files created, all commits exist, both routes registered, no regressions.
