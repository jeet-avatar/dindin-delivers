# ArthaBuild Case Ticket System — Design Spec

**Date:** 2026-04-10
**Status:** Approved
**Scope:** Phase 1–9 comprehensive audit case ticket system

---

## 1. Purpose

ArthaBuild has completed 9 development phases covering auth, NetSuite TBA, Ollama RAG, frontend integration, Docker/Terraform packaging, testing hardening, license system, frontend verification, and RBAC/team management. A comprehensive audit found 40 findings across 6 categories.

This spec defines a dual-format case ticket system that:
- Stores every finding as a structured Markdown file (source of truth)
- Renders all cases as an interactive local HTML Kanban board
- Tracks dependencies between cases
- Validates architecture coverage for every case

---

## 2. File & Folder Structure

```
apps/arthaBuild/docs/cases/
├── INDEX.md                                    # Auto-generated master index
├── CASE_BOARD.html                             # Auto-generated interactive board
│
├── phase-01-foundation-auth/
│   ├── CASE-001.md
│   ├── CASE-002.md
│   └── ...
├── phase-02-netsuite-tba/
│   └── CASE-NNN.md
├── phase-03-ollama-rag/
│   └── CASE-NNN.md
├── phase-04-frontend-integration/
│   └── CASE-NNN.md
├── phase-05-docker-terraform/
│   └── CASE-NNN.md
├── phase-06-testing-hardening/
│   └── CASE-NNN.md
├── phase-07-license-system/
│   └── CASE-NNN.md
├── phase-07.1-frontend-verification/
│   └── CASE-NNN.md
├── phase-08-launch-readiness/
│   └── (empty — Phase 08 runs LAST per locked order: 7.1→9→10→11→12→8; no audit findings yet)
├── phase-09-rbac-team-chat/
│   └── CASE-NNN.md
│
└── scripts/
    └── generate-board.py                       # Sync: CASE-*.md → INDEX.md + CASE_BOARD.html
```

**Rules:**
- `CASE-*.md` files are the single source of truth — never edit `CASE_BOARD.html` directly
- `INDEX.md` is auto-regenerated on every sync — never edit manually
- `CASE_BOARD.html` is a committed artifact so it can be opened without running the script
- Case numbers are globally sequential across all phases (CASE-001 through CASE-N)
- Phase folders use kebab-case matching the `.planning/phases/` directory names

---

## 3. Case File Format

Every `CASE-NNN.md` follows this exact template. All fields are required.

**Phase field format:** Use `"01"` through `"09"` for standard phases. Use `"07.1"` for Phase 07.1 (the only decimal phase). Never use `"7.1"` or `"7"`.

**Dependency field format:** `blocks` and `blocked_by` are YAML lists of bare case ID strings (no quotes). Example with deps: `blocks: [CASE-014, CASE-020]`. Empty: `blocks: []`.

**Section body rule:** Section bodies must NOT contain `## ` (H2) headings — the sync script splits on H2 to parse sections. Use `### ` or bold text (`**Sub-heading:**`) for any sub-structure inside a section body.

```markdown
---
id: CASE-001
title: "Short imperative title describing the problem"
phase: "01"
phase_name: "Foundation & Auth Backend"
category: HARDCODED | DEAD_CODE | API_CORRECTNESS | TEST_GAP | ARCH_VIOLATION | PHASE_CORRECTNESS
severity: CRITICAL | HIGH | MEDIUM | LOW | INFO
status: OPEN | IN_PROGRESS | FIXED | VERIFIED | WONT_FIX
created: YYYY-MM-DD
updated: YYYY-MM-DD
assignee: ""
blocks: [CASE-014, CASE-020]   # CASE IDs that cannot be fixed until this is fixed (bare strings, no quotes)
blocked_by: []                  # CASE IDs that must be fixed before this one can start
files:
  - path: src/backend/routers/auth.py
    lines: "45-52"
  - path: src/frontend/src/services/authService.ts
    lines: "12"
---

## Why This Case Was Created
<!-- What triggered this case — which audit dimension caught it (hardcode scan, dead code scan,
     API cross-reference, test gap analysis, architecture review, phase correctness check).
     What symptom would a real user or developer observe if this is not fixed. -->

## What Is Wrong
<!-- Exact description of what the code does vs what it should do.
     Include the problematic code snippet with file:line reference.
     Be specific — "this function does X but should do Y because Z". -->

## Why It Was Done This Way (Root Cause)
<!-- Why did the original developer write it this way?
     Phase constraint? Intentional shortcut? Copy-paste from example?
     Missing knowledge at the time? Placeholder left behind?
     This is not blame — it is context for understanding the fix. -->

## What Is Done Right
<!-- What works correctly in this area.
     Prevents over-fixing — makes clear what must be preserved when applying the fix. -->

## How To Fix It
<!-- Step-by-step fix. File path, line number, exact change.
     No vague "refactor this". Every step must be actionable by a developer
     who has never seen this code before. -->

## Architecture Mapping

**Layer:** `Backend Router` | `Frontend Service` | `DB Model` | `Auth` | `AI Pipeline` | `License` | `Deploy`

**Flow:**

    [User action] → [Frontend component] → [Service call] → [API route] → [DB/Model] → [Response]
                                                   ↑
                                           THIS CASE LIVES HERE

**Upstream:** What calls into this code path
**Downstream:** What this code path calls / what depends on it

## Verification
<!-- How to prove the fix works. Must include at least one executable proof. -->
- [ ] Grep proof: `grep -n "..." src/backend/...`
- [ ] Test proof: `pytest tests/test_X.py::test_Y -v`
- [ ] Runtime proof: curl command or browser steps

## Downstream Impact
<!-- What breaks or degrades if this case is NOT fixed.
     Rate: None | Cosmetic | Degraded UX | Data Loss | Security Risk | System Failure -->
**Impact if unfixed:** ...

## Links
- Phase SUMMARY: `.planning/phases/0N-name/0N-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md` (section: ...)
- Related cases: CASE-XXX, CASE-YYY
```

---

## 4. HTML Board: `CASE_BOARD.html`

### Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  ArthaBuild Case Board          [Search...] [Phase▼] [Severity▼]    │
│  [Category▼] [Assignee▼]        [Dependency Graph] [Export CSV]     │
├──────────────┬──────────────┬──────────────┬────────────────────────┤
│   OPEN (N)   │ IN PROGRESS  │   FIXED (N)  │   VERIFIED (N)         │
├──────────────┼──────────────┼──────────────┼────────────────────────┤
│ ┌──────────┐ │              │              │                        │
│ │CASE-001  │ │ ┌──────────┐ │ ┌──────────┐ │ ┌──────────────┐      │
│ │HIGH      │ │ │CASE-007  │ │ │CASE-003  │ │ │CASE-002      │      │
│ │Phase 01  │ │ │MEDIUM    │ │ │LOW       │ │ │LOW ✓         │      │
│ │🔒 blocked│ │ │Phase 02  │ │ │Phase 01  │ │ │Phase 01      │      │
│ └──────────┘ │ └──────────┘ │ └──────────┘ │ └──────────────┘      │
│ ...          │ ...          │ ...          │ ...                    │
└──────────────┴──────────────┴──────────────┴────────────────────────┘

[Click any card → right panel opens with full case detail]
[Dependency Graph tab → D3-style node graph, locked cases in red]
```

### Card fields (visible on board)
- Case ID + title
- Severity badge (color-coded: CRITICAL=red, HIGH=orange, MEDIUM=yellow, LOW=blue, INFO=grey)
- Phase badge
- Category icon
- 🔒 lock icon if `blocked_by` has any OPEN cases
- Assignee avatar initial (if set)

### Detail panel (click to open)
Full rendered Markdown for all case sections. Plus:
- Status dropdown (saves to localStorage)
- Assignee input (saves to localStorage)
- Comment thread (saves to localStorage, timestamped)
- "Copy case ID" button
- "Open MD file" path reference

### WONT_FIX cases
`WONT_FIX` cards are hidden from the Kanban columns by default. They appear only when the Status filter is explicitly set to `WONT_FIX`. They are never draggable once set to this status.

### Dependency Graph tab
- Implemented in hand-drawn SVG (vanilla JS only — no D3, no external libraries)
- Each case = SVG circle node, colored by severity (same color scale as severity badge)
- Each `blocks` relationship = directed SVG arrow from blocker to blocked case
- Locked cases (has open `blocked_by` deps) = red border on node
- Click node = opens detail panel
- Nodes laid out in phase-grouped rows (Phase 01 top → Phase 09 bottom)

### Filters
- Phase: All | Phase 01 | Phase 02 | Phase 03 | Phase 04 | Phase 05 | Phase 06 | Phase 07 | Phase 07.1 | Phase 08 | Phase 09
- Severity: All | CRITICAL | HIGH | MEDIUM | LOW | INFO
- Category: All | HARDCODED | DEAD_CODE | API_CORRECTNESS | TEST_GAP | ARCH_VIOLATION | PHASE_CORRECTNESS
- Status: All | OPEN | IN_PROGRESS | FIXED | VERIFIED | WONT_FIX
- Assignee: All | Unassigned | [name]

### Data model
- Case content (all MD fields) → embedded as JSON by `generate-board.py`
- Status, assignee, comments → saved in `localStorage` keyed by case ID
- On load: merge embedded JSON + localStorage overrides
- **Merge strategy:** `localStorage` values for `status`, `assignee`, and `comments` always take precedence over embedded JSON for those fields. All other fields (title, severity, category, file references, all body sections) always come from embedded JSON and cannot be overridden via localStorage.

---

## 5. Sync Script: `generate-board.py`

### Invocation

```bash
# Sync all cases → regenerate INDEX.md + CASE_BOARD.html
cd apps/arthaBuild
python docs/cases/scripts/generate-board.py

# Create new blank case in a phase folder (auto-increments to next global case number)
# Writes CASE-NNN.md into docs/cases/phase-NN-<name>/ matching the phase folder
# If the phase folder does not exist, the script errors and lists valid phase folders
python docs/cases/scripts/generate-board.py --new --phase 01

# Validate only (no write)
python docs/cases/scripts/generate-board.py --validate
```

### Steps (on each run)

1. **Glob** all `phase-*/CASE-*.md` files, sort by phase then case number
2. **Parse** each file:
   - Split on `---` to extract YAML frontmatter
   - Parse remaining body into named sections (split on `## ` headings)
3. **Validate:**
   - Duplicate case IDs → error
   - `blocks`/`blocked_by` references to non-existent cases → warning
   - `files[].path` entries that don't exist in `src/` → warning
   - Missing required fields → error
4. **Regenerate `INDEX.md`:** phase-grouped table (ID | Title | Severity | Status | Blocks | Blocked By)
5. **Embed into `CASE_BOARD.html`:** inject `const CASES = [...]` JSON into HTML template. The JSON must include ALL frontmatter fields for each case including `blocks` and `blocked_by` arrays (required for dependency graph rendering), not just display fields.
6. **Print summary:**
   ```
   Loaded 40 cases across 9 phases
   Warnings: 2 broken dep links, 1 missing file path
   Written: docs/cases/INDEX.md
   Written: docs/cases/CASE_BOARD.html
   Open with: open docs/cases/CASE_BOARD.html
   ```

### Dependencies
- Python stdlib only: `pathlib`, `re`, `json`, `yaml` (via `import yaml` — PyYAML already in requirements.txt)
- No npm, no Node, no external services

---

## 6. Initial Case Inventory (40 findings from audit)

Organized by phase, cases numbered globally:

### Phase 01 — Foundation & Auth Backend (CASE-001 to CASE-012)
| ID | Title | Severity | Category |
|----|-------|----------|----------|
| CASE-001 | Frontend API URL defaults to wrong port (8080 vs 8000) | MEDIUM | HARDCODED |
| CASE-002 | finetunedmodelrun.py uses OpenAI — violates Ollama-only rule | HIGH | DEAD_CODE |
| CASE-003 | finetunedmodelrun.py never imported — entire file is dead code | MEDIUM | DEAD_CODE |
| CASE-004 | finetunedmodelrunv2.py never invoked from production code | MEDIUM | DEAD_CODE |
| CASE-005 | TokenResponse.user_type hardcoded to "Administrator" for all users | MEDIUM | HARDCODED |
| CASE-006 | Login allows case-insensitive email but DB has no COLLATE NOCASE constraint | LOW | ARCH_VIOLATION |
| CASE-007 | No 422 validation error tests for /api/user/register | MEDIUM | TEST_GAP |
| CASE-008 | No test for account lockout counter reset on successful login | LOW | TEST_GAP |
| CASE-009 | Alembic migrations bypassed in test suite (conftest uses create_all) | MEDIUM | TEST_GAP |
| CASE-010 | latest_javascript_code variable assigned but never read | LOW | DEAD_CODE |
| CASE-011 | Duplicate subprocess import in rawapi.py | LOW | DEAD_CODE |
| CASE-012 | role field added to TokenResponse but not in frozen interface spec | LOW | PHASE_CORRECTNESS |

### Phase 02 — NetSuite TBA Session (CASE-013 to CASE-017)
| ID | Title | Severity | Category |
|----|-------|----------|----------|
| CASE-013 | No auth test for /api/netsuite/authenticate requires JWT | MEDIUM | TEST_GAP |
| CASE-014 | SessionStore credentials stored unencrypted in RAM dict | MEDIUM | ARCH_VIOLATION |
| CASE-015 | Commented-out code blocks in sdf_utils.py | LOW | DEAD_CODE |
| CASE-016 | Unused test stub in suitescripts_utils.py | LOW | DEAD_CODE |
| CASE-017 | Unused 're' import in finetunedmodelrunv2.py | LOW | DEAD_CODE |

### Phase 03 — Ollama RAG Pipeline (CASE-018 to CASE-021)
| ID | Title | Severity | Category |
|----|-------|----------|----------|
| CASE-018 | Ollama base URL duplicated across 5 files (not centralized) | LOW | HARDCODED |
| CASE-019 | Ollama model names hardcoded — no warning if wrong model pulled | LOW | HARDCODED |
| CASE-020 | No rate limit on /api/chatbot/process — DoS vector | HIGH | ARCH_VIOLATION |
| CASE-021 | Chat response latency_ms missing on early-return paths | LOW | API_CORRECTNESS |

### Phase 04 — Frontend Integration (CASE-022 to CASE-026)
| ID | Title | Severity | Category |
|----|-------|----------|----------|
| CASE-022 | Frontend base URL hardcoded fallback to localhost:5173 in multiple backend files | LOW | HARDCODED |
| CASE-023 | CORS dev port range hardcoded (5173-5180) not in env var | LOW | HARDCODED |
| CASE-024 | Token refresh response missing role — inconsistent with login response | MEDIUM | API_CORRECTNESS |
| CASE-025 | _persist_chat_to_db() silently swallows DB failures — client unaware | MEDIUM | ARCH_VIOLATION |
| CASE-026 | Chat response schema inconsistent — latency_ms absent on non-AI paths | LOW | API_CORRECTNESS |

### Phase 05 — Docker & Terraform (CASE-027)
| ID | Title | Severity | Category |
|----|-------|----------|----------|
| CASE-027 | No test coverage for Docker build or Terraform plan correctness | LOW | TEST_GAP |

### Phase 06 — Testing & Hardening (CASE-028 to CASE-029)
| ID | Title | Severity | Category |
|----|-------|----------|----------|
| CASE-028 | No test for 404 on non-existent chat session GET | LOW | TEST_GAP |
| CASE-029 | No Alembic migration smoke test — only schema tests via create_all | MEDIUM | TEST_GAP |

### Phase 07 — License System (CASE-030 to CASE-035)
| ID | Title | Severity | Category |
|----|-------|----------|----------|
| CASE-030 | /api/license/status requires no auth — leaks license state publicly | MEDIUM | ARCH_VIOLATION |
| CASE-031 | /health endpoint leaks ai_ready + suitecloud_ready + license_plan unauthenticated | MEDIUM | ARCH_VIOLATION |
| CASE-032 | SALES_EMAIL hardcoded to sales@techcloudpro.com — wrong for other deployments | LOW | HARDCODED |
| CASE-033 | LICENSE_SERVER_URL hardcoded domain in env fallback | LOW | HARDCODED |
| CASE-034 | GRACE_PERIOD_HOURS hardcoded to 72 — not configurable | LOW | HARDCODED |
| CASE-035 | CACHE_TTL_DAYS hardcoded to 7 — not configurable | LOW | HARDCODED |

### Phase 07.1 — Frontend Verification (CASE-036)
| ID | Title | Severity | Category |
|----|-------|----------|----------|
| CASE-036 | Auto-index credentials dict key mismatch — _index_customer_netsuite may fail silently | MEDIUM | PHASE_CORRECTNESS |

### Phase 08 — Launch Readiness
No audit findings at this stage — Phase 08 has not been executed yet. Per the locked execution order (7.1 → 9 → 10 → 11 → 12 → 8 FINAL), Phase 08 runs after all other phases complete. Folder `phase-08-launch-readiness/` is created empty as a placeholder for future cases once Phase 08 is executed.

### Phase 09 — RBAC & Team Chat (CASE-037 to CASE-040)
| ID | Title | Severity | Category |
|----|-------|----------|----------|
| CASE-037 | No cross-team isolation test for admin endpoints | MEDIUM | TEST_GAP |
| CASE-038 | No test for admin self-removal 400 response | LOW | TEST_GAP |
| CASE-039 | No deploy quota enforcement test (402 response) | MEDIUM | TEST_GAP |
| CASE-040 | Team member list does not explicitly verify team_id ownership | LOW | ARCH_VIOLATION |

---

## 7. Severity Definitions

| Severity | Definition | SLA |
|----------|------------|-----|
| CRITICAL | System fails to start or data loss occurs | Fix before next commit |
| HIGH | Security vulnerability or DoS vector | Fix in current session |
| MEDIUM | Incorrect behavior, silent failure, or test blind spot | Fix in current phase |
| LOW | Maintainability, clarity, or minor inconsistency | Fix when touching the file |
| INFO | Documentation or cosmetic issue | Optional |

---

## 8. Category Definitions

| Category | Description |
|----------|-------------|
| HARDCODED | Magic values, URLs, credentials, or config that should be in env vars |
| DEAD_CODE | Unreachable code, unused imports, abandoned files, commented-out blocks |
| API_CORRECTNESS | Frontend→Backend call mismatches: wrong path, missing auth, schema mismatch |
| TEST_GAP | Missing test coverage for a known code path (happy path, error path, or edge case) |
| ARCH_VIOLATION | Code that violates the system's architectural rules (auth, isolation, rate limits) |
| PHASE_CORRECTNESS | Code that doesn't match what a phase SUMMARY claims was built |

---

## 9. Workflow

```
Developer finds or is assigned a case
         ↓
Open CASE-NNN.md → read "How To Fix It"
         ↓
Check "Architecture Mapping" — understand upstream/downstream
         ↓
Check "blocked_by" — are dependencies FIXED/VERIFIED?
    If not → fix those first
         ↓
Apply fix → run Verification steps (grep, pytest, curl)
         ↓
Update CASE-NNN.md: status → FIXED, updated → today
         ↓
Run: python docs/cases/scripts/generate-board.py
         ↓
Open CASE_BOARD.html → drag card to FIXED column
         ↓
Peer review → drag to VERIFIED
```

---

## 10. Implementation Plan (phases)

**Plan A** — Scaffold structure + write all 40 case files
- Create all phase folders
- Write all 40 CASE-NNN.md files with full content (no shortcuts)
- Each case: all 8 sections complete

**Plan B** — Build generate-board.py
- YAML frontmatter parser
- MD section extractor
- Validator (dep links, file paths, required fields)
- INDEX.md generator
- CASE_BOARD.html generator

**Plan C** — Build CASE_BOARD.html template
- Kanban board layout (vanilla HTML/CSS/JS)
- Card rendering from embedded JSON
- Detail panel
- localStorage for status/comments
- Filter/search
- Dependency graph tab (SVG-based)
- Export CSV

**Plan D** — Verify end-to-end + commit
- Run generate-board.py on all 40 cases
- Open HTML, verify all cases render
- Drag a card, verify localStorage persists
- Commit everything
