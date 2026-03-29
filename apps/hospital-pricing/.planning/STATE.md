# Project State: Hospital Wholesale Pricing Assurance

## Project Reference

See: `apps/hospital-pricing/.planning/PROJECT.md` (updated 2026-03-25)

**Core value:** Every invoice line verified against active contract within minutes — procurement officers see exactly what was overcharged and can dispute before payment.
**Current focus:** Phase 5 (React Frontend) + Phase 6 (Deploy & CI)

## Current Phase

**Phase 5: React Frontend (Tasks 14–15)**
- Status: ◉ In Progress
- Tasks: 14 (Vite TS scaffold + Login page), 15 (Discrepancy dashboard + WebSocket)

**Phase 6: Deploy & CI (Tasks 16–18)**
- Status: ◉ In Progress
- Tasks: 16 (Dockerfile + docker-compose), 17 (Integration tests), 18 (GitHub Actions CI)

## Phase History

| Phase | Status | Completed |
|-------|--------|-----------|
| Phase 1 — Data Models + Auth + Migrations | ✅ Complete | 2026-03-25 |
| Phase 2 — Ingestion + LangGraph | ✅ Complete | 2026-03-25 |
| Phase 3 — AI Extraction + Price Engine | ✅ Complete | 2026-03-25 |
| Phase 4 — Drafting Agent + REST Routers | ✅ Complete | 2026-03-25 |
| Phase 5 — React Frontend | ◉ In Progress | — |
| Phase 6 — Deploy & CI | ◉ In Progress | — |

## Test Count
- 34 backend tests passing (SQLite in-memory via aiosqlite)

## Key Decisions

- **AKS ceiling:** 3% (0.03) — 42 U.S.C. §1320a-7b(b). admin_fee_pct > 0.03 → 422
- **Price tolerance:** max($0.01, 0.1% of contract_price) — take the LARGER of both
- **Database:** SQLite in tests, PostgreSQL+pgvector in prod (Docker)
- **Discrepancy types (6):** PRICE_BREACH, QUANTITY_MISMATCH, UOM_MISMATCH, UNAUTHORIZED_ITEM, MFN_VIOLATION, DUPLICATE_LINE
- **Auth:** JWT access token (15m) + HttpOnly cookie refresh (7d), 4 roles: admin/analyst/viewer/api_service
- **Frontend design system:** Dark mode Financial Dashboard — bg #020617, card #0E1223, text #F8FAFC, accent #22C55E, destructive #EF4444, Plus Jakarta Sans, Lucide React, Tailwind CSS

## Open Decisions

- None

## Blockers

- None

## Notes

- **Worktree:** `~/.config/superpowers/worktrees/doordash-p2p/feat-hospital-pricing` (branch `feat/hospital-pricing`)
- **Required env vars before any Python:** `JWT_SECRET_KEY="test-secret-key-at-least-32-chars-long"` + `OPENAI_API_KEY="sk-test-placeholder"`
- **database.py:** Lazy async engine via `get_db()` — NOT module-level engine
- **Alembic migrations:** NOT yet applied locally — run inside Docker in Task 16
- Full spec: `docs/superpowers/specs/2026-03-25-hospital-wholesale-pricing-assurance-design.md`
- Full plan: `docs/superpowers/plans/2026-03-25-hospital-pricing-assurance.md`

---
*State updated: 2026-03-26*
