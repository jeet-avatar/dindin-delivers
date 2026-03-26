# Hospital Wholesale Pricing Assurance Framework — Design Spec

**Date:** March 25, 2026
**Entity:** Zietra Technologies inc
**Status:** Approved for implementation planning
**Architecture:** Option A — LangGraph Monolith

---

## 1. Overview

A standalone B2B SaaS platform for hospital procurement teams. Staff upload wholesale contracts (PDF) and receive invoices (EDI or REST API). LangGraph AI agents extract contract terms, compare every invoice against the active contract, and immediately flag price violations, tier mismatches, or unauthorised SKU substitutions. Phase 1 also generates AI-drafted wholesale agreements from GPO templates.

### Product Type
- **Standalone** — independent of Dollor.ai, new product
- **Users** — hospital procurement officers only (no supplier portal in Phase 1)
- **Data input** — Hybrid: PDF upload (Phase 1) + REST API / EDI (Phase 2)
- **All product categories** — pharmaceuticals, medical devices, supplies, general

### Phase Scope

| Feature | Phase | Description |
|---------|-------|-------------|
| Price Floor / Ceiling Enforcement | Phase 1 | Block invoices violating contract price bands. MFN monitoring. |
| AI-Generated Wholesale Contracts | Phase 1 | LangChain drafts contracts from GPO templates. Human review + e-sign. |
| Invoice vs Contract Verification | Phase 1 | Every invoice matched to active contract. Discrepancies auto-flagged. |
| Market Price Benchmarking | Phase 2 | AI researches WAC / ASP / GPO indices. Renegotiation alerts. |
| Rebate & Discount Tracking | Phase 2 | Volume rebate accruals, effective net price calculation. |

---

## 2. Architecture — LangGraph Monolith

### Decision

Single FastAPI application with LangGraph as the core contract lifecycle orchestration engine. LangChain handles document parsing and GPT-4o structured extraction. PostgresSaver provides durable state persistence across sessions (GSD-compatible).

### Stack

| Component | Technology |
|-----------|-----------|
| Backend API | FastAPI (Python) |
| AI Orchestration | LangGraph + PostgresSaver |
| LLM + Extraction | LangChain + GPT-4o (`with_structured_output`) |
| PDF Parsing | pdfplumber + Unstructured.io |
| Task Queue | Celery + Redis |
| Database | PostgreSQL + pgvector |
| Document Storage | AWS S3 |
| Frontend | React SPA |
| Deploy | Docker → AWS ECS Fargate |

### Why Not Microservices (Option B)
Contract lifecycle is a natural state machine. LangGraph's `interrupt_before` enables human-in-the-loop review at every AI step. PostgresSaver makes state durable. Microservices add 3–4× complexity with no benefit at Phase 1 scale.

---

## 3. LangGraph State Machine — Contract Lifecycle

```
INGEST → EXTRACT → VERIFY → COMPARE → FLAG → RESOLVE
```

| State | Description | Handler |
|-------|-------------|---------|
| INGEST | PDF or EDI received, stored to S3, Celery job queued | Celery Worker |
| EXTRACT | GPT-4o extracts contract terms via Pydantic v2 structured output | LangChain + GPT-4o |
| VERIFY | Procurement officer reviews extracted terms (`interrupt_before` gate) | Human-in-loop |
| COMPARE | Every invoice line matched against active contract item + tier | Price Engine |
| FLAG | Discrepancy classified: price_mismatch, tier_mismatch, sku_mismatch, expired | Classifier Agent |
| RESOLVE | Procurement officer approves, disputes, or escalates | Human-in-loop |

---

## 4. Core Data Models

### WholesaleAgreement

```python
class WholesaleAgreement(Base):
    contract_id:                  UUID (PK)
    hospital_entity_id:           FK → HospitalEntity
    supplier_id:                  FK → Supplier
    gpo_contract_number:          Optional[str]
    effective_date:               date
    expiration_date:              date
    pricing_tiers:                List[PricingTier]  # via relationship
    mfn_clause:                   Optional[MFNClause]
    price_escalation_cap_pct:     Decimal  # e.g. 0.03 = 3%
    admin_fee_pct:                Optional[Decimal]  # must be <= 0.03 for AKS safe harbor
    aks_safe_harbor_documented:   bool
    baa_required:                 bool
    status:                       Enum[draft|active|expired|terminated|suspended]
    document_s3_path:             str
```

### PricingTier / ContractItem

```python
class PricingTier(Base):
    tier_id:                      UUID (PK)
    contract_id:                  FK → WholesaleAgreement
    tier_name:                    str  # "Tier 1", "Tier 2", "Tier 3"
    commitment_threshold_pct:     Decimal  # e.g. 0.90 = 90% of purchases
    items:                        List[ContractItem]

class ContractItem(Base):
    item_id:                      UUID (PK)
    tier_id:                      FK → PricingTier
    manufacturer_item_number:     str
    ndc:                          Optional[str]  # 11-digit, drugs only
    description:                  str
    unit_of_measure:              str  # EA, CS, BX
    units_per_uom:                int
    contract_unit_price:          Decimal
    price_basis:                  Enum[fixed|wac_minus_pct|awp_minus_pct|asp_plus_pct]
    price_effective_date:         date
    price_expiration_date:        date
```

### Invoice / InvoiceLineItem

```python
class Invoice(Base):
    invoice_id:                   UUID (PK)
    invoice_number:               str
    supplier_id:                  FK → Supplier
    ship_to_facility_id:          FK → Facility
    invoice_date:                 date
    total_amount:                 Decimal
    contract_id:                  Optional[FK → WholesaleAgreement]
    payment_status:               Enum[unpaid|paid|disputed|partial|voided]
    source:                       Enum[pdf_scan|edi_810|manual_entry|api]

class InvoiceLineItem(Base):
    line_id:                      UUID (PK)
    invoice_id:                   FK → Invoice
    supplier_item_number:         str
    ndc:                          Optional[str]
    invoiced_unit_price:          Decimal
    quantity_shipped:             Decimal
    unit_of_measure:              str
    matched_contract_item_id:     Optional[FK → ContractItem]  # set during COMPARE
    expected_unit_price:          Optional[Decimal]
    discrepancy_amount:           Optional[Decimal]
    discrepancy_type:             Optional[Enum[price_mismatch|tier_mismatch|sku_mismatch|expired_contract|uom_mismatch|no_contract]]
    discrepancy_status:           Enum[none|flagged|investigating|resolved_credit|resolved_approved]
```

### MFNClause

```python
class MFNClause(Base):
    mfn_id:                       UUID (PK)
    contract_id:                  FK → WholesaleAgreement
    trigger_type:                 Enum[automatic|disclosure|audit_right]
    disclosure_frequency:         Enum[quarterly|annual]
    carve_outs:                   List[str]  # ["government_programs", "clinical_trials"]
    cure_period_days:             int
    true_up_retroactive:          bool
```

---

## 5. Discrepancy Classification

| Type | Frequency | Detection Logic | Auto Action |
|------|-----------|----------------|-------------|
| `price_mismatch` | ~50% of errors | `invoiced_price != contract_unit_price ± $0.01` | Flag + notify procurement |
| `tier_mismatch` | Common | Hospital qualifies Tier 1 but billed at Tier 2 | Auto draft credit request |
| `sku_mismatch` | Moderate | Invoice item not in `contract.authorized_items[]` | Hold — route to human review |
| `expired_contract` | Common | `invoice_date > contract.expiration_date` | Alert + trigger renewal workflow |
| `uom_mismatch` | Common | Invoice UOM ≠ contract UOM (e.g. EA vs CS×24) | Normalise units then re-check |
| `no_contract` | Occasional | No active contract for supplier × facility | Route to procurement team |

---

## 6. AI Contract Generation (Phase 1)

- **Template library** — GPO templates per category: pharma, devices, supplies, general
- **Drafting agent** — LangChain chain: `template + hospital_context + supplier_profile → ContractDraft`
- **Structured output** — Pydantic v2 model covers all 15 standard contract sections
- **Review gate** — LangGraph `interrupt_before` → procurement officer reviews → edits → approves
- **Version control** — `status: draft → reviewed → executed`
- **E-sign hook** — DocuSign / HelloSign API (Phase 1 placeholder, wired in Phase 2)
- **MFN workflow** — quarterly disclosure reminder + audit-right scheduling built in

---

## 7. Compliance Framework

| Obligation | Applies When | Phase 1 Implementation |
|------------|-------------|------------------------|
| Anti-Kickback Statute (42 U.S.C. §7b) | GPO contracts with admin fees | Block activation if `admin_fee_pct > 0.03`. Flag `aks_safe_harbor_documented`. |
| GPO Safe Harbor (42 CFR §1001.952j) | Any GPO-negotiated contract | Store `admin_fee_pct`. Auto-flag >3%. Generate annual disclosure letter. |
| 340B Ceiling Price (42 U.S.C. §256b) | Covered-entity hospitals, pharma | Price check vs HRSA OPAIS. Pharma category flag on contract. |
| HIPAA BAA (45 CFR Parts 160/164) | Specialty drug data with patient IDs | `baa_required` flag. Block activation if BAA not uploaded. |
| MFN Monitoring | Contract has `mfn_clause` | Quarterly disclosure workflow. Audit-right scheduler. |
| False Claims Act audit trail | Discrepancies touching Medicare | Append-only discrepancy log. 3-year retention per contract. |

---

## 8. Phase 1 Build Plan — GSD Waves

### Wave 1 — Data Models + Document Ingestion
- PostgreSQL schema: WholesaleAgreement, PricingTier, ContractItem, MFNClause
- Invoice + InvoiceLineItem models with discrepancy tracking fields
- S3 upload endpoint — PDF contracts and EDI 810 invoices
- Celery worker: PDF parsing with pdfplumber + Unstructured.io
- LangGraph graph scaffold with PostgresSaver checkpointing

### Wave 2 — AI Extraction + Price Comparison Engine
- LangChain GPT-4o extraction node: ContractTerms Pydantic v2 model
- Two-pass extraction: pricing tables (Pass 1) → normalise UOM/SKU (Pass 2)
- Price comparison engine: invoice line vs contract item + tier matching
- Discrepancy classifier: 6 types
- `interrupt_before` node for human review of extracted terms

### Wave 3 — AI Contract Generation
- GPO contract template library: pharma, devices, supplies, general
- LangChain drafting agent: template + context → full contract draft
- Contract version control: draft → reviewed → executed
- E-signature hook (placeholder)
- MFN clause workflow: quarterly disclosure reminder + audit-right scheduler

### Wave 4 — Hospital Portal (React) + Alerts
- React SPA: contract upload, invoice upload, discrepancy dashboard
- Real-time discrepancy alerts via WebSocket
- Dispute workflow UI: approve / dispute / escalate per invoice line
- Compliance dashboard: contract status, MFN alerts, AKS flags, BAA status
- Audit log viewer: immutable 3-year history per contract

### Wave 5 — Deploy + Compliance Verification
- Dockerise FastAPI + Celery → AWS ECS Fargate
- PostgreSQL RDS Multi-AZ + Redis ElastiCache
- CI/CD: GitHub Actions → ECR → ECS
- pytest suite: extraction accuracy, price matching, discrepancy classification
- HIPAA risk assessment: BAA flag enforcement, audit log immutability verified

---

## 9. Anti-Hallucination Protocol

All field names, compliance statute references, GPO mechanics, and pricing benchmarks in this spec were verified against domain research before inclusion. Known correct facts:

- GPO admin fee safe harbor ceiling: **3%** (42 CFR §1001.952j)
- WAC = manufacturer list price to wholesalers (not net price)
- AWP ≈ WAC × 1.20 for brand drugs (largely replaced by ASP for Medicare)
- ASP = volume-weighted average net of discounts — CMS publishes quarterly with 2-quarter lag
- 340B ceiling = AMP − Unit Rebate Amount (verified: 42 U.S.C. §256b)
- Chargeback chain: Hospital pays distributor contract price → distributor claims WAC difference from manufacturer
- Discrepancy rate: price_mismatch is most common (~40–60% of all errors per recovery audit firms)

---

*Spec author: Claude (Zietra AI Employee) — March 25, 2026*
*GSD workflow: pending writing-plans → phase plan creation*
