# Requirements: Hospital Wholesale Pricing Assurance

**Defined:** 2026-03-25
**Core Value:** Every invoice line is verified against the active contract within minutes — procurement officers see exactly what was overcharged and can dispute it with one click, before the invoice is paid.

## v1 Requirements

### Authentication & Multi-Tenancy

- [ ] **AUTH-01**: Procurement officer can log in with email and password, receive JWT access token + HttpOnly refresh cookie
- [ ] **AUTH-02**: Access token auto-refreshes via HttpOnly cookie on 401 (no re-login required)
- [ ] **AUTH-03**: All queries are row-level scoped to `entity_id` — one hospital cannot see another's data
- [ ] **AUTH-04**: Four roles enforced: `procurement_officer`, `procurement_approver`, `entity_admin`, `platform_admin`
- [ ] **AUTH-05**: Contract activation requires `procurement_approver` role or higher

### Contract Ingestion & Extraction

- [ ] **CONT-01**: Procurement officer can upload a wholesale contract PDF via the portal
- [ ] **CONT-02**: System stores PDF to S3 and queues async Celery parsing job
- [ ] **CONT-03**: GPT-4o extracts contract terms into structured Pydantic v2 schema (ContractTerms: pricing tiers, items, NDC codes, UOM, dates, MFN clause, 340B flag)
- [ ] **CONT-04**: Procurement officer reviews extracted terms before they are committed (LangGraph interrupt_before VERIFY gate)
- [ ] **CONT-05**: Contract lifecycle tracked: draft → active → expired → terminated

### Price Compliance Enforcement

- [ ] **COMP-01**: AKS safe harbor enforced at contract creation — admin_fee_pct > 3% blocked with 422 and statute citation (42 U.S.C. §1320a-7b(b))
- [ ] **COMP-02**: BAA document required flag blocks activation if `baa_required = true` and no document uploaded
- [ ] **COMP-03**: Price comparison engine checks every invoice line against matched contract item with tolerance max($0.01, 0.1%)
- [ ] **COMP-04**: UOM mismatch normalised via UOMConversion lookup before price comparison
- [ ] **COMP-05**: Six discrepancy types classified: price_mismatch, tier_mismatch, sku_mismatch, expired_contract, uom_mismatch, no_contract

### Invoice Processing

- [ ] **INV-01**: Procurement officer can upload invoice PDF with supplier_id and facility_id as query params
- [ ] **INV-02**: Facility ownership verified against user's entity_id before invoice is created (tenant isolation)
- [ ] **INV-03**: Invoice matched to active contract for supplier × facility combination
- [ ] **INV-04**: All discrepancies flagged automatically after invoice comparison

### Discrepancy Resolution

- [ ] **DISC-01**: Procurement officer can view all flagged discrepancies for their entity
- [ ] **DISC-02**: Procurement approver can resolve each line: approve / request_credit / dispute
- [ ] **DISC-03**: Every resolution writes an immutable AuditLogEntry (entity_id, actor, event_type, before/after payload)
- [ ] **DISC-04**: PostgreSQL trigger prevents any UPDATE or DELETE on audit_log_entries table
- [ ] **DISC-05**: Human review gate at RESOLVE node via LangGraph interrupt_before

### AI Contract Generation

- [ ] **DRAFT-01**: System drafts wholesale agreements from 4 GPO templates: pharma (with 340B + AKS sections), devices, supplies, general
- [ ] **DRAFT-02**: LangChain GPT-4o drafting agent fills template from hospital + supplier context
- [ ] **DRAFT-03**: Procurement officer reviews AI draft before contract status advances
- [ ] **DRAFT-04**: MFN clause text generated when `mfn_present = true`

### Frontend Portal

- [ ] **UI-01**: Login page with email/password form, JWT stored in sessionStorage (access) + HttpOnly cookie (refresh)
- [ ] **UI-02**: Discrepancy dashboard: table of flagged lines with type badge, invoiced/expected/difference columns
- [ ] **UI-03**: Approve / Request Credit / Dispute action buttons per discrepancy line
- [ ] **UI-04**: WebSocket real-time alert banner when new discrepancies are flagged
- [ ] **UI-05**: TypeScript types for all API response shapes (DiscrepancyLineItem, DiscrepancyAlert)

### Infrastructure & CI

- [ ] **INFRA-01**: Dockerfile with `api` and `worker` build targets (FastAPI + Celery)
- [ ] **INFRA-02**: docker-compose with PostgreSQL (pgvector), Redis, api, worker services
- [ ] **INFRA-03**: GitHub Actions CI: lint → pytest → coverage ≥75% — triggers on `apps/hospital-pricing/**` path filter
- [ ] **INFRA-04**: Alembic migrations for all 12 tables with immutability trigger applied

## v2 Requirements

### Supplier Portal

- **SUPP-01**: Supplier can log in and view contracts they are party to
- **SUPP-02**: Supplier can respond to dispute requests
- **SUPP-03**: Supplier can submit invoices via REST API (EDI 810 format)

### Market Benchmarking

- **BENCH-01**: System queries WAC/ASP/GPO indices to flag contracts above market price
- **BENCH-02**: Renegotiation alert when contract price drifts >10% above benchmark
- **BENCH-03**: HRSA OPAIS integration for 340B ceiling price verification (covered-entity registration required)

### Rebate Tracking

- **REBATE-01**: Volume rebate accruals tracked per contract tier
- **REBATE-02**: Effective net price calculated (contract price − rebates)
- **REBATE-03**: Rebate true-up scheduler for quarterly disclosure

### Advanced UI

- **UI-ADV-01**: Contract upload page with drag-drop PDF and extraction status
- **UI-ADV-02**: Invoice upload page with supplier/facility selectors
- **UI-ADV-03**: Compliance dashboard: MFN alerts, AKS flags, BAA status per contract
- **UI-ADV-04**: Audit log viewer: immutable 3-year history per contract

## Out of Scope

| Feature | Reason |
|---------|--------|
| HRSA OPAIS 340B real-time check | Requires covered-entity registration + API agreement; manual entry sufficient for Phase 1 |
| EDI primary ingestion | Requires EDI translator middleware; PDF upload covers 80% of hospitals now |
| E-signature (DocuSign/HelloSign) | API placeholder wired; full integration is Phase 2 |
| Microservices architecture | Adds 3–4× infrastructure complexity with no benefit at Phase 1 scale |
| Mobile app | Web-first; procurement is desktop workflow |
| Real-time WAC/ASP pricing feeds | Phase 2 market benchmarking feature |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 — Auth + Models | Pending |
| AUTH-02 | Phase 1 — Auth + Models | Pending |
| AUTH-03 | Phase 1 — Auth + Models | Pending |
| AUTH-04 | Phase 1 — Auth + Models | Pending |
| AUTH-05 | Phase 1 — Auth + Models | Pending |
| CONT-01 | Phase 2 — Ingestion + LangGraph | Pending |
| CONT-02 | Phase 2 — Ingestion + LangGraph | Pending |
| CONT-03 | Phase 3 — AI Extraction | Pending |
| CONT-04 | Phase 2 — Ingestion + LangGraph | Pending |
| CONT-05 | Phase 4 — REST Routers | Pending |
| COMP-01 | Phase 4 — REST Routers | Pending |
| COMP-02 | Phase 4 — REST Routers | Pending |
| COMP-03 | Phase 3 — AI Extraction | Pending |
| COMP-04 | Phase 3 — AI Extraction | Pending |
| COMP-05 | Phase 3 — AI Extraction | Pending |
| INV-01 | Phase 4 — REST Routers | Pending |
| INV-02 | Phase 4 — REST Routers | Pending |
| INV-03 | Phase 3 — AI Extraction | Pending |
| INV-04 | Phase 3 — AI Extraction | Pending |
| DISC-01 | Phase 4 — REST Routers | Pending |
| DISC-02 | Phase 4 — REST Routers | Pending |
| DISC-03 | Phase 4 — REST Routers | Pending |
| DISC-04 | Phase 1 — Auth + Models | Pending |
| DISC-05 | Phase 2 — Ingestion + LangGraph | Pending |
| DRAFT-01 | Phase 4 — Contract Generation | Pending |
| DRAFT-02 | Phase 4 — Contract Generation | Pending |
| DRAFT-03 | Phase 4 — Contract Generation | Pending |
| DRAFT-04 | Phase 4 — Contract Generation | Pending |
| UI-01 | Phase 5 — React Frontend | Pending |
| UI-02 | Phase 5 — React Frontend | Pending |
| UI-03 | Phase 5 — React Frontend | Pending |
| UI-04 | Phase 5 — React Frontend | Pending |
| UI-05 | Phase 5 — React Frontend | Pending |
| INFRA-01 | Phase 6 — Deploy + CI | Pending |
| INFRA-02 | Phase 6 — Deploy + CI | Pending |
| INFRA-03 | Phase 6 — Deploy + CI | Pending |
| INFRA-04 | Phase 1 — Auth + Models | Pending |

**Coverage:**
- v1 requirements: 35 total
- Mapped to phases: 35
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-25*
*Last updated: 2026-03-25 after initial definition*
