# Hospital Wholesale Pricing Assurance Framework

## What This Is

A standalone B2B SaaS platform for hospital procurement teams at Zietra Technologies inc. Hospital staff upload wholesale contracts (PDF) and receive invoices — LangGraph AI agents extract contract terms, compare every invoice line against the active contract, and immediately flag price violations, tier mismatches, and unauthorised SKU substitutions. Phase 1 also generates AI-drafted wholesale agreements from GPO templates.

## Core Value

Every invoice line is verified against the active contract within minutes of receipt — procurement officers see exactly what was overcharged and can dispute it with one click, before the invoice is paid.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Procurement officer can upload a wholesale contract PDF and have it AI-extracted into structured pricing data
- [ ] System flags price violations (6 discrepancy types) for every invoice line
- [ ] Procurement officer can approve, dispute, or request credit for each discrepancy
- [ ] AI drafts wholesale agreements from 4 GPO category templates (pharma/devices/supplies/general)
- [ ] Human-in-the-loop review gates at VERIFY and RESOLVE via LangGraph interrupt_before
- [ ] Contract lifecycle tracked: draft → active → expired (INGEST → EXTRACT → VERIFY → COMPARE → FLAG → RESOLVE)
- [ ] AKS safe harbor enforced (block contracts where admin_fee_pct > 3%) per 42 U.S.C. §1320a-7b(b)
- [ ] HIPAA BAA flag blocks contract activation if BAA document not uploaded
- [ ] Immutable audit log (PostgreSQL trigger prevents any UPDATE/DELETE on audit_log_entries)
- [ ] Row-level tenant isolation — entity_id scoped on all queries, 4-role RBAC
- [ ] React SPA: Login, discrepancy dashboard, WebSocket real-time alerts

### Out of Scope

- Supplier portal (Phase 1 is hospital-side only) — planned Phase 2
- EDI 810 primary ingestion (Phase 1 = PDF upload; EDI deferred to Phase 2)
- HRSA OPAIS integration for 340B ceiling prices (Phase 2; Phase 1 = manual entry)
- Market price benchmarking (WAC/ASP/GPO indices) — Phase 2
- Rebate and volume discount tracking — Phase 2
- E-signature wiring (DocuSign/HelloSign placeholder only in Phase 1)

## Context

- **Entity:** Zietra Technologies inc (Team ID: PRKZ4UVCD7, same Apple developer account as Dollor.ai)
- **Architecture decision:** LangGraph Monolith (Option A) — single FastAPI app with LangGraph state machine. PostgresSaver for durable state across context resets. Chosen over microservices (Option B) and API-first/Celery-only (Option C).
- **Spec:** `docs/superpowers/specs/2026-03-25-hospital-wholesale-pricing-assurance-design.md`
- **Implementation plan:** `docs/superpowers/plans/2026-03-25-hospital-pricing-assurance.md` (18 tasks, 6 chunks, fully reviewed and approved)
- **App location:** `apps/hospital-pricing/` (backend + frontend)
- **Compliance obligations in scope:** AKS §1320a-7b(b), GPO safe harbor 42 CFR §1001.952(j), HIPAA BAA, MFN monitoring, False Claims Act audit trail
- **Key domain facts (anti-hallucination):**
  - GPO admin fee ceiling: 3% (42 CFR §1001.952(j))
  - AKS statute: 42 U.S.C. §1320a-7b(b) (NOT §7b)
  - 340B ceiling = AMP − Unit Rebate Amount (42 U.S.C. §256b)
  - Price mismatch is ~50% of all invoice discrepancies (industry data)
  - Price tolerance: max($0.01, 0.1% of contract price) to avoid false positives on high-value drugs

## Constraints

- **Tech stack:** Python 3.12, FastAPI, LangGraph ≥0.2, LangChain, GPT-4o, SQLAlchemy 2.x async, Alembic, PostgreSQL + pgvector, Celery + Redis, pdfplumber, React 18 + Vite + TypeScript — all locked in spec
- **Security:** Refresh token as HttpOnly cookie; access token in sessionStorage only; row-level tenant isolation mandatory on all queries
- **Compliance:** AKS guard must run at contract creation time, not deferred; audit log immutability enforced at DB level via PostgreSQL trigger
- **TDD:** Every implementation task follows fail → implement → pass → commit cycle

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| LangGraph Monolith over microservices | Contract lifecycle is a natural state machine; PostgresSaver gives durable state; 3-4× less infrastructure complexity at Phase 1 scale | — Pending |
| PostgresSaver over Redis-only state | GSD-compatible durable state; survives context resets; enables interrupt_before human gates | — Pending |
| sessionStorage for access token (not localStorage) | localStorage persists across tabs and is XSS-accessible; sessionStorage clears on tab close | — Pending |
| HttpOnly cookie for refresh token | Immune to XSS token theft; spec requirement (§4 auth section) | — Pending |
| Price tolerance = max($0.01, 0.1%) | Fixed $0.01 produces false positives on $500 pharma items; percentage alone misses penny-rounding on cheap supplies | — Pending |
| 340B HRSA OPAIS deferred to Phase 2 | Requires covered-entity registration + API agreement; Phase 1 uses manual ceiling price entry on ContractItem | — Pending |

---
*Last updated: 2026-03-25 after initialization*
