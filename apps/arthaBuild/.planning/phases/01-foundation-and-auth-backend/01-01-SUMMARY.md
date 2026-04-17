---
phase: 01-foundation-and-auth-backend
plan: 01
subsystem: infrastructure
tags: [setup, venv, env-config, security, startup-guard, npm]
requires: []
provides: [src/backend/, src/frontend/, venv, requirements.txt, startup-guard]
affects: [all-subsequent-plans]
tech-stack-added: [fastapi, uvicorn, PyJWT, passlib, SQLAlchemy, aiosqlite, alembic, slowapi, fastapi-mail, pydantic, langchain, faiss-cpu, langgraph]
tech-stack-patterns: [venv-pip, dotenv-config, try-except-startup-guard]
key-files-created:
  - src/backend/rawapi.py (modified: startup guard added)
  - src/backend/model_utils.py (modified: hardcoded key removed, import os added)
  - src/backend/finetunedmodelrun.py (modified: hardcoded key removed)
  - src/backend/finetunedmodelrunv2.py (modified: hardcoded key removed)
  - src/backend/sdf_utils.py (modified: hardcoded key removed)
  - src/backend/requirements.txt (created)
  - src/backend/.env (created, gitignored)
  - src/frontend/.env (modified: VITE_API_URL 8080->8000)
  - src/backend/venv/ (created)
key-decisions:
  - langchain-core resolved to 0.3.63 (plan target 0.3.15 incompatible with langchain-community 0.3.8)
  - openai resolved to 1.109.1 (plan target 1.52.2 incompatible with langchain-openai 0.2.9)
  - SQLAlchemy resolved to 2.0.35 (plan target 2.0.36 downgraded by langchain deps)
metrics:
  duration: ~25 min
  completed: 2026-04-07
  tasks-completed: 5
  files-created-or-modified: 9
requirements-satisfied: [FR-AUTH-01]
---

# Phase 01 Plan 01: Source Extraction and Environment Setup Summary

**One-liner:** Python 3.12 venv with all Phase 1 deps, hardcoded OpenAI keys removed, rawapi.py FAISS/SuiteCloud startup guard applied, frontend npm install verified HTTP 200.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Copy source files and create Python venv [AB-005] | 1d6a966c | src/backend/*.py, src/frontend/src/, venv/ |
| 2 | Remove hardcoded OpenAI keys and set up .env files [AB-004] | b2def289 | model_utils.py, sdf_utils.py, finetunedmodelrun*.py, .env files |
| 3 | Apply FAISS/SuiteCloud startup guard to rawapi.py [AB-001] | aad565ed | rawapi.py |
| 4 | Install Phase 1 Python dependencies and write requirements.txt [AB-002] | 37a7daa1 | requirements.txt |
| 5 | Run npm install and smoke-test dev server [AB-003] | (no commit -- node_modules gitignored) | node_modules/ installed |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] langchain-core version conflict**
- **Found during:** Task 4
- **Issue:** Plan specified langchain-core==0.3.15 but langchain-community==0.3.8 requires >=0.3.21
- **Fix:** Let pip resolve -- installed langchain-core==0.3.63 (latest compatible)
- **Files modified:** requirements.txt
- **Commit:** 37a7daa1

**2. [Rule 1 - Bug] openai version conflict**
- **Found during:** Task 4
- **Issue:** Plan specified openai==1.52.2 but langchain-openai==0.2.9 requires >=1.54.0
- **Fix:** Let pip resolve -- installed openai==1.109.1 (latest compatible)
- **Files modified:** requirements.txt
- **Commit:** 37a7daa1

**3. [Rule 1 - Bug] model_utils.py missing top-level import os**
- **Found during:** Task 2
- **Issue:** After replacing hardcoded keys with os.getenv() at module level (lines 57, 71, 93), os was only imported inside infer_intent() -- NameError at startup
- **Fix:** Added import os at top of model_utils.py
- **Files modified:** model_utils.py
- **Commit:** b2def289

## Verification Results

All 9 plan verification checks passed:
1. grep -r "sk-proj" src/ -- zero matches
2. src/backend/ shows all Python files present
3. src/frontend/src/services/authService.ts exists
4. VITE_API_URL=http://localhost:8000 confirmed
5. _ai_ready appears 3 times in rawapi.py (declaration, try block, chatbot route)
6. venv/bin/python -- Python 3.12.7
7. requirements.txt -- 47 lines
8. node_modules/react/ directory exists
9. FRONTEND_BASE_URL=http://localhost:5173 confirmed

## Self-Check

## Self-Check: PASSED

All files verified present:
- src/backend/rawapi.py FOUND
- src/backend/requirements.txt FOUND
- src/frontend/src/services/authService.ts FOUND
- src/backend/venv/ FOUND
- src/frontend/node_modules/react FOUND
- .planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md FOUND

All commits verified:
- 1d6a966c (Task 1: source copy + venv) FOUND
- b2def289 (Task 2: key removal + .env) FOUND
- aad565ed (Task 3: startup guard) FOUND
- 37a7daa1 (Task 4: requirements.txt) FOUND
