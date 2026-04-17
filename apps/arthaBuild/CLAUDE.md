# ArthaBuild — Project Law

> These rules are absolute. No exceptions. No approvals needed.

---

## EXECUTION RULES

### 1. No Approval Required
- Execute all tasks autonomously. Never pause to ask "should I proceed?" or "do you want me to continue?"
- Mark tasks complete and move to the next immediately.
- Only stop for human review at tasks explicitly marked `type="human"` in PLAN.md files.

### 2. All MD Files Are Separate
- Every planning document, summary, research file, and reference lives in its own `.md` file.
- Never combine multiple topics into one file.
- Never inline planning content into MEMORY.md — use topic files and pointer entries only.
- File naming: `PHASE-PLAN.md`, `PHASE-SUMMARY.md`, `PHASE-RESEARCH.md` — one file per purpose.

### 3. MD Files Contain All the Law
- Every rule, decision, frozen interface, and constraint for this project lives in an MD file.
- If a decision is made during execution (e.g., a workaround), it MUST be written to the relevant PLAN or SUMMARY before moving on.
- No tribal knowledge. If it's not in an MD file, it doesn't exist.

### 4. Architecture Update Rule (MANDATORY — every phase)
After EVERY phase execution, before writing SUMMARY.md:
1. Update `docs/ARCHITECTURE.md` — bump version, add new components/flows
2. Update `docs/architecture-diagram.html` — visual must match ARCHITECTURE.md
3. Update `docs/test-report.html` — add new test rows for the phase, mark all as PASS
These three files MUST be updated as the final step of every phase. Never defer to "next session."

### 5. Context Window — 60% Rule (NO EXCEPTION)
- When the context reaches approximately 60% full, STOP current work immediately.
- Write a handoff file at: `~/.claude/handoffs/YYYY-MM-DD-arthaBuild-<topic>.md`
- The handoff must contain:
  - Current phase and plan being executed
  - Exact task number and step where you stopped
  - What was completed
  - What is next (exact command to resume)
  - Any decisions made during the current session
- Then open a new Claude Code window (or instruct the user to do so).
- Resume in the new window with: `/gsd:resume-work`
- The 60% threshold is NON-NEGOTIABLE. Do not try to finish "just one more task."

---

## PROJECT-SPECIFIC RULES

### Authentication
- JWT library: PyJWT ONLY (never python-jose)
- JWT sub: always `str(user_id)` — string, never integer
- Algorithm: HS256
- Token storage (client): memory only — never localStorage

### NetSuite TBA Credentials
- NEVER write accountId, tokenKey, tokenSecret, consumerKey, consumerSecret to:
  - SQLite database
  - Any file on disk
  - Log output
  - Environment variables
- They live ONLY in `session_store.py` Python dict in RAM.
- Violation of this rule is a critical security bug.

### AI / LLM
- All inference via Ollama (local). Zero external LLM API calls.
- OpenAI references in production code = critical bug.
- Models: `llama3.1:8b` (chat), `nomic-embed-text` (embeddings, 768-dim)
- FAISS vectorstore: must use 768-dim. Old 1536-dim (OpenAI) index is incompatible.

### Database
- SQLite only (single-tenant BYOC)
- Alembic migrations: always `render_as_batch=True` (SQLite ALTER TABLE)
- Async SQLAlchemy: always `expire_on_commit=False` on async_sessionmaker

### Deployment
- All deployments: Docker Compose only (never manual docker run)
- Terraform for AWS provisioning
- Port 8000: backend (internal)
- Port 5173: frontend dev
- Port 80/443: nginx (public)
- Port 11434: Ollama (internal only — never expose publicly)

---

## GSD WORKFLOW

- All work goes through GSD. No direct edits outside a plan.
- Execute phases in order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8
- Never skip a phase.
- Each phase must pass its smoke tests before the next begins.
- Use `/gsd:execute-phase N` to run a phase.
- Use `/gsd:resume-work` to continue after context reset.

---

## FROZEN INTERFACES (DO NOT CHANGE WITHOUT UPDATING ALL CONSUMERS)

| Interface | Value | Consumers |
|-----------|-------|-----------|
| JWT sub | `str(user_id)` | Phases 2, 3, 4 |
| Login response | `{access_token, refresh_token, token_type:"bearer", first_name, last_name, email, user_type, role}` (flat — no nested user object) | Phase 4 frontend (`authService.ts` reads flat fields directly) |
| Backend port | `8000` | Phase 4 (.env), Phase 5 (nginx) |
| FAISS dims | `768` (nomic-embed-text) | Phase 3 rebuild, Phase 5 volume |
| Ollama URL (Docker) | `http://ollama:11434` | Phase 5 Compose |
| DB path (Docker) | `/app/data/arthaBuild.db` | Phase 5 volume |
| FAISS path (Docker) | `/app/data/vectorstore_ollama` | Phase 5 volume |
| token_type | `"bearer"` | Phase 4 frontend |
| POST /api/netsuite/authenticate | `{authenticated:bool, account_name?:str, message:str}` | Phase 3 (checks TBA status before deploy), Phase 4 (status indicator) |
| GET /api/netsuite/status | `{authenticated:bool, account_name?:str, account_id?:str, authenticated_at?:str}` | Phase 3, Phase 4 |
| POST /api/netsuite/logout | `{message:str}` | Phase 4 |
| POST /api/deploy/suitescript | `{success:bool, deploy_log:str, netsuite_url?:str, error?:str}` | Phase 3, Phase 4 |

---

*Last Updated: 2026-04-07*
