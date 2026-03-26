# Roadmap: Hospital Wholesale Pricing Assurance

**Project:** Hospital Wholesale Pricing Assurance Framework
**Entity:** Zietra Technologies inc
**Status:** Ready for execution
**Plan:** `docs/superpowers/plans/2026-03-25-hospital-pricing-assurance.md`

---

## Milestone 1: Phase 1 — Core Platform

**Goal:** Working B2B SaaS where hospital procurement officers can upload contracts, receive automatic invoice discrepancy detection, resolve flagged items with full audit trail, and generate AI-drafted wholesale agreements.

**Requirements covered:** AUTH-01–05, CONT-01–05, COMP-01–05, INV-01–04, DISC-01–05, DRAFT-01–04, UI-01–05, INFRA-01–04 (all 35 v1 requirements)

---

### Phase 1: Data Models + Auth + Migrations

**Status:** ○ Pending
**Goal:** All SQLAlchemy models created with Alembic migrations, JWT auth with 4 roles, row-level tenant isolation, immutable audit log trigger.

**Plan tasks:** Tasks 1–6 (Chunk 1)
- Task 1: Bootstrap project structure and dependencies
- Task 2: HospitalEntity, Supplier, Facility, User models
- Task 3: WholesaleAgreement, PricingTier, ContractItem, MFNClause, UOMConversion, Invoice, InvoiceLineItem, AuditLogEntry models
- Task 4: Alembic migrations — all 12 tables + immutability trigger
- Task 5: JWT auth — create/verify tokens, role guards, login/refresh router
- Task 6: FastAPI app factory + async test conftest

**Requirements:** AUTH-01–05, DISC-04, INFRA-04

**Success criteria:**
1. `alembic upgrade head` creates 12 tables with no errors
2. `psql hospital_pricing -c "\\dt"` shows all 12 tables
3. `pytest tests/test_models.py tests/test_auth.py -v` passes (8+ tests)
4. `POST /auth/login` returns access_token + sets HttpOnly refresh cookie
5. Request to protected endpoint without token returns 401; with wrong role returns 403

---

### Phase 2: Document Ingestion + LangGraph Scaffold

**Status:** ○ Pending
**Goal:** PDF upload stored to S3, Celery parses text, LangGraph 6-node state machine compiles with interrupt_before gates, PostgresSaver wired.

**Plan tasks:** Tasks 7–8 (Chunk 2)
- Task 7: S3 service + Celery workers + PDF parser (pdfplumber)
- Task 8: LangGraph StateGraph scaffold — 6 stub nodes + interrupt_before=["verify","resolve"] + MemorySaver/PostgresSaver factory

**Requirements:** CONT-01, CONT-02, CONT-04, DISC-05

**Success criteria:**
1. `pytest tests/test_s3.py -v` passes (2 tests including Celery task mock)
2. `pytest tests/test_graph.py -v` passes (3 tests: compiles, state shape, interrupt pauses at verify)
3. Graph `snapshot.next == ("verify",)` when document_text is pre-populated
4. S3 presigned URL generated without hitting real AWS (mocked)

---

### Phase 3: AI Extraction + Price Comparison Engine

**Status:** ○ Pending
**Goal:** GPT-4o extracts ContractTerms from PDF text via Pydantic v2 structured output; price comparison engine classifies all 6 discrepancy types with tolerance logic.

**Plan tasks:** Tasks 9–11 (Chunk 3)
- Task 9: LangChain GPT-4o extraction node — ContractTerms Pydantic v2 schema
- Task 10: Price comparison engine — absolute + percentage tolerance, UOM normalisation
- Task 11: Discrepancy classifier — 6 types wired into FLAG node

**Requirements:** CONT-03, COMP-03, COMP-04, COMP-05, INV-03, INV-04

**Success criteria:**
1. `pytest tests/test_extraction.py -v` passes — ContractTerms schema validates with all required fields
2. `pytest tests/test_price_engine.py -v` passes (6 tests covering all discrepancy types)
3. `pytest tests/test_discrepancy_classifier.py -v` passes
4. price_mismatch detected when invoiced_price != contract_price ± tolerance
5. uom_mismatch normalises CS→EA via UOMConversion lookup before comparison

---

### Phase 4: AI Contract Generation + REST Routers

**Status:** ○ Pending
**Goal:** LangChain contract drafting agent with 4 GPO templates; REST routers for contracts (AKS guard), invoices (tenant-isolated upload), discrepancies (resolve + audit log).

**Plan tasks:** Tasks 12–13 (Chunk 4)
- Task 12: LangChain drafting agent + 4 GPO templates (pharma/devices/supplies/general)
- Task 13: REST routers — contracts + invoices + discrepancies, main.py updated

**Requirements:** CONT-05, COMP-01, COMP-02, INV-01, INV-02, DISC-01, DISC-02, DISC-03, DRAFT-01–04

**Success criteria:**
1. `POST /contracts/` with admin_fee_pct=0.05 returns 422 with AKS statute citation
2. `POST /contracts/` with admin_fee_pct=0.025 returns 201
3. `POST /invoices/upload` with unknown facility_id returns 404
4. `POST /discrepancies/{line_id}/resolve` writes AuditLogEntry and updates discrepancy_status
5. Template files exist for all 4 categories, load_template falls back to general.txt

---

### Phase 5: React Frontend

**Status:** ○ Pending
**Goal:** Vite React TS app with JWT client (HttpOnly cookie refresh), Login page, typed Discrepancy dashboard with WebSocket real-time alerts.

**Plan tasks:** Tasks 14–15 (Chunk 5)
- Task 14: React Vite TS scaffold + Tailwind + API client (sessionStorage access token, HttpOnly cookie refresh) + auth.ts + Login page
- Task 15: Typed discrepancy types + DiscrepancyBadge + WebSocket hook + Discrepancies dashboard wired to socket

**Requirements:** UI-01–05

**Success criteria:**
1. `npm run dev` starts without errors; Login page renders at localhost:5173
2. `npx tsc --noEmit` — 0 TypeScript errors
3. All 6 discrepancy badge types render with correct colour classes
4. Discrepancy table shows approve/credit/dispute buttons per row
5. WebSocket hook returns typed DiscrepancyLineItem[] (not any[])

---

### Phase 6: Deploy + Compliance Verification

**Status:** ○ Pending
**Goal:** Dockerised app (api + worker targets), docker-compose with pgvector + Redis, GitHub Actions CI, full integration test suite with AKS/BAA/audit immutability compliance checks.

**Plan tasks:** Tasks 16–18 (Chunk 6)
- Task 16: Dockerfile (api + worker) + docker-compose
- Task 17: Integration test suite + compliance verification
- Task 18: GitHub Actions CI/CD workflow

**Requirements:** INFRA-01, INFRA-02, INFRA-03

**Success criteria:**
1. `docker compose up --build` starts all 4 services without errors
2. `pytest tests/ --cov=. --cov-fail-under=75` passes
3. AKS test: admin_fee 5% → 422, 2.5% → 201
4. BAA test: baa_required=true, no document → activation blocked
5. Audit immutability: raw SQL UPDATE on audit_log_entries raises exception
6. GitHub Actions CI passes on push to `apps/hospital-pricing/**`

---

## Progress Summary

| Phase | Name | Tasks | Requirements | Status |
|-------|------|-------|--------------|--------|
| 1 | Data Models + Auth + Migrations | 6 | AUTH-01–05, DISC-04, INFRA-04 | ○ Pending |
| 2 | Document Ingestion + LangGraph Scaffold | 2 | CONT-01,02,04, DISC-05 | ○ Pending |
| 3 | AI Extraction + Price Comparison Engine | 3 | CONT-03, COMP-03–05, INV-03,04 | ○ Pending |
| 4 | AI Contract Generation + REST Routers | 2 | CONT-05, COMP-01,02, INV-01,02, DISC-01–03, DRAFT-01–04 | ○ Pending |
| 5 | React Frontend | 2 | UI-01–05 | ○ Pending |
| 6 | Deploy + Compliance Verification | 3 | INFRA-01–03 | ○ Pending |

**Total:** 18 tasks | 35 v1 requirements | 100% coverage ✓

---

## Parallelisation Strategy

Phases 1–4 are sequential (each depends on the prior). Within each phase, independent tasks (e.g., Tasks 2 and 3 within Phase 1) can run in parallel via `superpowers:subagent-driven-development`.

Phases 5 (frontend) and 6 (deploy) can be parallelised once Phase 4 REST routers are stable.

---
*Roadmap created: 2026-03-25*
*Based on spec: `docs/superpowers/specs/2026-03-25-hospital-wholesale-pricing-assurance-design.md`*
*Based on plan: `docs/superpowers/plans/2026-03-25-hospital-pricing-assurance.md`*
