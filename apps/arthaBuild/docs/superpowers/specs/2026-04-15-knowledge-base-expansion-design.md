# ArthaBuild Knowledge Base Expansion — Design Spec

**Date:** 2026-04-15
**Status:** Approved
**Author:** Brainstorming session — Jeet + Claude

---

## Problem

The ArthaBuild RAG vectorstore currently has **10 bootstrap chunks** from a single placeholder
source. When users ask NetSuite questions, the model answers from weights at generation time
(no context retrieved) — which is where hallucination occurs. The system prompt rules say
"only cite paths/field IDs from retrieved context", but with no context, the model either
guesses or says "verify in your account."

---

## Solution

Two-tier knowledge base with **zero-assumption content** at both tiers:

1. **Bootstrap index** — 95 authored `.md` files covering the full NetSuite platform,
   sourced from Claude's training knowledge of official Oracle documentation. Committed to
   the repo. Auto-ingested on every deploy. Covers every N/ module, all script types, all
   standard record schemas, and every major business process.

2. **Customer index** — pulled live from the customer's NetSuite instance via SuiteQL on
   TBA connect. Covers their actual custom fields, custom records, deployed scripts, custom
   lists, and active workflows. Refreshed on demand via admin panel.

The model goes from **generating under uncertainty → retrieving verified context then
formatting it**. It becomes a lookup + formatter, not a guesser.

---

## Architecture

ArthaBuild is **single-tenant BYOC** — one customer per deployment. There are no per-user
subdirectories. The customer index is one flat FAISS index per deployment, exactly matching
the existing code at `model_utils.py:160` and `netsuite.py:119`.

```
User message
    │
    ▼
retrieve_node()  (model_utils.py:172 — UNCHANGED interface)
    │
    ├─ 1. Customer index  →  data/customer_index/   ← flat, one per deployment
    │      • Custom fields per record type (pulled via SuiteQL)
    │      • Custom record types + their fields
    │      • Deployed SuiteScripts
    │      • Custom lists
    │      • Active workflows
    │      • Account metadata (company name, accountId from TBA session)
    │      Built on TBA connect. Refreshed on demand.
    │      Path: CUSTOMER_INDEX_PATH env var (default ./data/customer_index)
    │
    └─ 2. Bootstrap index  →  data/vectorstore_ollama/  (fallback)
           • 95 authored .md files (see full list below)
           • All N/ modules, all script types, all record schemas
           • O2C, P2P, R2R, manufacturing, CRM, subscription, fixed assets
           • Navigation paths, error codes, integration patterns
           Authored from training knowledge of official Oracle docs.
           Version-tagged. Baked into Docker image.
    │
    ▼
grade_node() → generate_node()  (unchanged)
```

**No changes to `model_utils.py`.** `retrieve_node()` already implements the two-tier
lookup at exactly the right paths. This spec adds real content to both tiers.

---

## New Files

```
apps/arthaBuild/src/backend/
  knowledge/
    bootstrap/                    ← 95 authored .md files (baked into Docker image via
                                     existing Dockerfile COPY — no new volume needed)
  data/
    customer_knowledge/           ← auto-generated markdown (inside app_data named volume)
  scripts/
    ingest_bootstrap.py           ← rebuilds bootstrap FAISS from /app/knowledge/bootstrap/
                                     includes Ollama readiness poll before embedding
    pull_customer_knowledge.py    ← SuiteQL pull from live instance → markdown → FAISS
    test_retrieval.py             ← 20 ground-truth retrieval checks (18/20 gate)
  routers/
    knowledge.py                  ← POST /api/admin/knowledge/refresh
                                     GET  /api/admin/knowledge/status
```

**Docker — no new volumes needed:**
- Bootstrap docs baked into image at `/app/knowledge/bootstrap/` via existing `COPY src/backend/ /app/`
- Customer knowledge markdown at `/app/data/customer_knowledge/` — inside existing `app_data` named volume
- Customer FAISS at `/app/data/customer_index/` — inside existing `app_data` named volume

**New `docker-compose.yml` env vars for backend service:**
```yaml
environment:
  - CUSTOMER_KNOWLEDGE_PATH=/app/data/customer_knowledge
  - CUSTOMER_INDEX_PATH=/app/data/customer_index   # already used by model_utils.py
```

Frontend:
```
apps/arthaBuild/src/frontend/src/components/
  KnowledgeBaseTab.tsx            ← new tab in AdminPanel
```

---

## Bootstrap Knowledge Base — 95 Files

Every file uses this frontmatter:
```markdown
---
source: <Oracle official doc section>
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---
```

### N/ Module Reference (23 files)

| File | Covers |
|------|--------|
| `module-record.md` | load, create, save, submit, copy, transform, field access, sublists — includes N/transaction (void, findBaseCurrencyAmount) |
| `module-currentrecord.md` | N/currentRecord — client-side record access, getValue, setValue, getCurrentSublistValue |
| `module-search.md` | Search.create, filters, columns, operators, ResultSet, runPaged |
| `module-query.md` | N/query — SuiteQL in SuiteScript, createQuery, run, page |
| `module-log.md` | debug/audit/error/emergency, governance costs |
| `module-email.md` | send(), sendBulk(), attachments, templates, relatedRecords |
| `module-file.md` | load, create, save, folder paths, File Cabinet structure |
| `module-url.md` | resolveScript, resolveRecord, resolveTaskLink |
| `module-https.md` | get/post/put/delete, headers, ClientResponse, SecureString |
| `module-runtime.md` | getCurrentUser, getCurrentScript, governance units, execution context |
| `module-redirect.md` | toRecord, toSuitelet, toURL, toTaskLink |
| `module-task.md` | ScheduledScriptTask, MapReduceTask, QueryTask, CsvImportTask |
| `module-workbook.md` | N/workbook — Dataset, Pivot, Chart, createWorkbook |
| `module-currency.md` | exchangeRate(), formatCurrency(), multi-currency conversions |
| `module-format.md` | format/parse — date, currency, number, percent — locale-safe |
| `module-xml.md` | Parser, XPath, Document — parsing XML responses |
| `module-crypto.md` | SecretKey, createHmac, createHash — signing requests |
| `module-encode.md` | Base64, UTF, Hex encode/decode |
| `module-error.md` | create(), SuiteScriptError types, error.name codes |
| `module-transaction.md` | void, findBaseCurrencyAmount |
| `module-ui-serverwidget.md` | Form, Field, Sublist, Tab, FieldGroup |
| `module-ui-dialog.md` | alert, confirm, prompt — client-side dialogs |
| `module-ui-message.md` | create, show, hide — client-side inline messages |

### Additional N/ Modules (5 files)

| File | Covers |
|------|--------|
| `module-sftp.md` | N/sftp — connect, get, put, list, move |
| `module-compress.md` | N/compress — create, add, extract — zip/unzip |
| `module-cache.md` | N/cache — getCache, get, put, remove — TTL, partitions |
| `module-auth.md` | N/auth — OAuth 2.0, token exchange, scope setup |
| `module-action.md` | N/action — trigger workflow actions from scripts, action executor |

### Script Types & Patterns (11 files)

| File | Covers |
|------|--------|
| `script-userevent.md` | beforeLoad/beforeSubmit/afterSubmit, context types, UserEventType constants |
| `script-scheduled.md` | execute(), governance, retry pattern, task submission |
| `script-mapreducer.md` | getInputData/map/reduce/summarize, chunk sizes, error handling |
| `script-suitelet.md` | onRequest, GET/POST, serverWidget forms, redirect patterns |
| `script-restlet.md` | get/post/put/delete, auth, JSON patterns, error responses |
| `script-client.md` | pageInit/saveRecord/fieldChanged/validateField/validateLine |
| `script-portlet.md` | render(), onRefresh, onDrilldown — dashboard portlets |
| `script-massupdate.md` | each(), Record parameter — bulk record updates |
| `script-workflowaction.md` | onAction() — custom workflow action scripts |
| `script-suitescript-21.md` | async/await, ES2019 features, 2.1 vs 2.0 differences |
| `script-governance.md` | Unit costs per operation table, reschedule(), MapReduce chunking |

### Standard Record Schemas (10 files)

| File | Covers |
|------|--------|
| `record-sales-order.md` | All body fields, item/shipping/billing sublists, status flow |
| `record-purchase-order.md` | Body fields, item sublist, approval status, vendor bill transformation |
| `record-invoice.md` | Body fields, apply sublist, payment application, AR impact |
| `record-journal-entry.md` | line sublist, debit/credit, multi-book, approved status |
| `record-customer.md` | Body fields, addressbook/contact/currency sublists, credit limit |
| `record-vendor.md` | Body fields, addressbook sublist, payment terms, 1099 |
| `record-employee.md` | Body fields, roles sublist, department, subsidiary |
| `record-item.md` | InventoryItem/NonInventoryItem/ServiceItem/AssemblyItem — pricing sublist |
| `record-work-order.md` | BOM, routing, component sublist, manufacturing fields |
| `record-project.md` | Project, ProjectTask — time tracking, billing, resource assignment |

### Platform Features (9 files)

| File | Covers |
|------|--------|
| `feature-suiteflow.md` | Workflow setup, states, transitions, conditions, actions, triggers |
| `feature-suiteanalytics.md` | Workbooks UI, Datasets, Pivot Tables, Charts, SuiteAnalytics Connect |
| `feature-suiteql.md` | SQL syntax for NetSuite, available tables, JOINs, REST endpoint |
| `feature-saved-search.md` | Filter expressions, formula fields, summary types, scheduling |
| `feature-custom-records.md` | Creating custom record types, fields, sublists, relationships |
| `feature-custom-fields.md` | Body/column/entity/item field types, internal ID conventions |
| `feature-sdf.md` | Project structure, deploy.xml, object types, sandbox→prod deployment |
| `feature-auth-tba.md` | TBA setup, token creation, roles needed, OAuth 1.0 signature |
| `feature-roles-permissions.md` | Permission levels, script execution roles, allowedRoles |

### Platform — Advanced Features (6 files)

| File | Covers |
|------|--------|
| `feature-oneworld.md` | Multi-subsidiary, intercompany, consolidated reporting, subsidiary context |
| `feature-multicurrency.md` | Currency exchange, revaluation, base currency, transaction currency |
| `feature-revenue-recognition.md` | ARM setup, rev rec rules, schedules, event-based recognition |
| `feature-inventory-wms.md` | Inventory management, bin/lot/serial tracking, transfers, WMS |
| `navigation-paths.md` | UI menu paths — Setup, Customization, Scripts, Lists, Reports |
| `errors-troubleshooting.md` | Common SuiteScript errors, fixes, debugging with Suite Debugger |

### Business Process Guides (27 files)

| File | Covers |
|------|--------|
| `process-o2c-overview.md` | Full O2C: Lead → Opportunity → Quote → SO → Fulfillment → Invoice → Payment |
| `process-o2c-quote-so.md` | Quote creation, approval, SO conversion, pricing, discount tiers |
| `process-o2c-fulfillment.md` | Pick/Pack/Ship workflow, statuses, partial fulfillment, shipping |
| `process-o2c-invoicing.md` | Invoice from SO, billing schedules, progress billing, credit memos |
| `process-o2c-payment.md` | Customer payment, cash application, unapplied payments, AR aging |
| `process-p2p-overview.md` | Full P2P: Purchase Req → PO → Receipt → Vendor Bill → Payment |
| `process-p2p-purchasing.md` | PR creation, PO approval workflow, blanket POs, drop shipping |
| `process-p2p-receiving.md` | Item receipt, partial receipt, landed costs, return authorizations |
| `process-p2p-vendor-bill.md` | Bill from PO, 3-way match, bill approval, credit memo, prepayments |
| `process-p2p-payment.md` | Vendor payment, payment batch, ACH/check/wire, bank reconciliation |
| `process-lead-to-cash.md` | CRM: Lead → Prospect → Opportunity → Quote → SO — full sales cycle |
| `process-crm.md` | Cases, activities, tasks, campaigns, call center, escalation workflows |
| `process-record-to-report.md` | Month-end close: period lock, GL reconciliation, consolidation |
| `process-journal-entries.md` | Manual JE, intercompany JE, recurring JE, statistical JE, reversals |
| `process-bank-reconciliation.md` | Bank feeds, matching rules, clearing accounts, reconciliation report |
| `process-plan-to-produce.md` | BOM, routing, work centers, work order creation, production costing |
| `process-manufacturing-advanced.md` | Work center capacity, production variances, co-products, scrap |
| `process-inventory-replenishment.md` | Reorder points, demand planning, transfer orders, bin management |
| `process-returns-rma.md` | Return Authorization, RMA workflow, credit memo, item return, refund |
| `process-project-accounting.md` | Project billing (T&M, fixed fee, milestone), time entry, expenses |
| `process-subscription-billing.md` | SuiteBilling: subscription plans, billing intervals, ARR, proration |
| `process-fixed-assets.md` | Asset creation, depreciation methods, asset register, disposal |
| `process-revenue-recognition.md` | ARM setup, rev rec rules, event-based vs time-based, deferred revenue |
| `process-payroll-hr.md` | Employee setup, payroll basics, expense reports, time tracking, PTO |
| `process-intercompany.md` | OneWorld intercompany transactions, elimination entries, netting |
| `process-tax-compliance.md` | Tax codes, nexus, SuiteTax, 1099 vendor setup, VAT reporting |
| `process-cash-management.md` | Bank accounts, cash position, fund transfers, foreign currency |

### Integration & Implementation Patterns (5 files)

| File | Covers |
|------|--------|
| `pattern-integration.md` | RESTlet + HTTPS patterns, retry logic, idempotency |
| `pattern-bulk-operations.md` | MapReduce for bulk processing, CSV import via N/task |
| `pattern-approval-workflows.md` | SO/PO/JE approval — SuiteFlow vs custom script, delegation |
| `pattern-custom-gl-lines.md` | Custom GL plugin — generating additional GL impact on transactions |
| `pattern-dynamic-pdf.md` | Advanced PDF templates, custom forms, email-ready PDFs |

---

## Customer Instance Knowledge Pull

**Trigger:** Immediately after `POST /api/netsuite/authenticate` succeeds.
Background task — does not block the auth response.

**6 data pulls:**

```sql
-- Pull 1: Account metadata
-- accountId sourced directly from TBA session (session_store.py) — no SuiteQL needed
-- companyName via SuiteQL:
SELECT companyName FROM companyPreferences LIMIT 1
-- (accountId and version NOT available as companyPreferences columns —
--  read accountId from session_store, version from /rest/platform/v1/record/v1/ headers)

-- Pull 2: Custom fields on standard record types
SELECT id, label, fieldType, appliesTo, isMandatory, defaultValue
FROM customfield
WHERE isInactive = 'F'

-- Pull 3: Custom record type definitions
SELECT scriptId, name, description
FROM customrecordtype
WHERE isInactive = 'F'

-- Pull 4: Fields on each custom record type
-- Use REST metadata endpoint — SuiteQL does not expose custom record fields reliably
-- GET /record/v1/metadata-catalog/customrecord_{scriptId}
-- Returns field definitions as JSON — parsed and formatted as markdown

-- Pull 5: Deployed SuiteScripts
SELECT name, scriptType, description
FROM script
WHERE isInactive = 'F'

-- Pull 6: Active Workflows
SELECT name, recordType, description
FROM workflow
WHERE isInactive = 'F'
```

**Output structure** (single-tenant — one deployment = one customer, flat paths):
```
data/customer_knowledge/          ← markdown source files (inside app_data volume)
  account-metadata.md
  custom-fields-salesorder.md
  custom-fields-purchaseorder.md
  ... (one per record type with custom fields)
  custom-record-{scriptid}.md
  ... (one per custom record type)
  custom-lists.md
  deployed-scripts.md
  active-workflows.md

data/customer_index/              ← FAISS index (matches CUSTOMER_INDEX_PATH env var)
  index.faiss                        read by model_utils.py:181 — path unchanged
  index.pkl
```

**Refresh:** `POST /api/admin/knowledge/refresh` — re-runs all 6 pulls, regenerates
markdown, rebuilds FAISS. Returns `{status: "building"}`. Client polls
`GET /api/admin/knowledge/status` for completion.

**Error handling:**
- Failed pull → skip + log, continue remaining pulls
- TBA expired → 401 with "reconnect NetSuite" message
- Embedding failure → retry 3x, then surface in status endpoint
- Partial builds are usable

---

## Ingestion Pipeline

**Chunking strategy:**

`RecursiveCharacterTextSplitter` measures in **characters**, not tokens.
nomic-embed-text handles up to 8192 tokens (~32K characters). Targets below are
in characters (~4 chars per token for English + code).

```
Bootstrap docs:
  chunk_size: 3200 chars  (~800 tokens)
  chunk_overlap: 600 chars (~150 tokens)
  splitter: MarkdownHeaderTextSplitter (## / ###) first — keeps sections intact
            RecursiveCharacterTextSplitter for oversized sections
  → Each chunk stays within one logical section (e.g., all N/search filter
    operators stay together, not split mid-table)

Customer docs:
  chunk_size: 2400 chars (~600 tokens)
  chunk_overlap: 400 chars (~100 tokens)
  splitter: RecursiveCharacterTextSplitter
  → Custom fields: one chunk per field (field ID + label + type + description)
    ensures field-ID lookups always retrieve the full field definition
```

**Chunk metadata:**
```python
{
  "source": "module-search.md",
  "category": "module",   # module | record | script | process | pattern | customer
  "topic": "N/search",
  "netsuite_version": "2024.2+",
  "customer_id": None,    # populated for customer index chunks
  "chunk_index": 3,
  "total_chunks": 12
}
```

**Auto-ingest on deploy** (`docker-compose.yml`):
```yaml
command: >
  sh -c "python scripts/ingest_bootstrap.py &&
         uvicorn rawapi:app --host 0.0.0.0 --port 8000"
```

`ingest_bootstrap.py` polls `GET http://ollama:11434/api/tags` every 10s (max 10 min)
until `nomic-embed-text` appears before starting embedding. This handles the race where
`ollama-init` hasn't finished pulling the model yet when the backend starts.

**Rollback — atomic swap:**
1. Before rebuild: rename live index to `vectorstore_ollama_{timestamp}/` (keep last 2, delete older)
2. Write new index to `vectorstore_ollama_new/`
3. If `test_retrieval.py` passes (18/20): rename `_new` → `vectorstore_ollama`
4. If test fails: restore from most recent timestamp backup, log failure
Live index is never in a partially-written state.

**No new Docker volume** — bootstrap docs baked into image, customer data inside existing `app_data`:
```yaml
volumes:
  - app_data:/app/data          # existing — covers customer_knowledge/ and customer_index/
```

---

## Admin Panel — Knowledge Base Tab

New tab in `AdminPanel.tsx`:

```
┌─────────────────────────────────────────────────┐
│  Knowledge Base                                  │
│                                                  │
│  Last updated: Apr 14, 2026 10:23 AM            │
│  Documents indexed: 47                           │
│  Custom fields: 312   Custom records: 8          │
│  Deployed scripts: 23  Workflows: 11             │
│                                                  │
│  [ Refresh Knowledge ]                           │
│                                                  │
│  Bootstrap index: 94 docs (SuiteScript 2.x,     │
│  O2C, P2P, all modules)                         │
└─────────────────────────────────────────────────┘
```

---

## Verification Suite

`scripts/test_retrieval.py` — 20 ground-truth Q&A pairs run after every ingest.
Must pass 18/20 before deployment proceeds.

Sample cases:
```python
{"query": "how do I load a sales order in SuiteScript",
 "must_contain": ["record.load", "record.Type.SALES_ORDER", "N/record"]},
{"query": "what modules do I need for sending email",
 "must_contain": ["N/email", "email.send"]},
{"query": "O2C fulfillment statuses",
 "must_contain": ["Picked", "Packed", "Shipped", "itemFulfillment"]},
{"query": "SuiteQL syntax for custom fields",
 "must_contain": ["customfield", "fieldId", "SELECT"]},
# ... 16 more covering P2P, governance, record schemas, navigation
```

---

## What Does NOT Change

- `model_utils.py` — `retrieve_node()` interface unchanged
- `grade_node()`, `generate_node()` — unchanged
- Existing customer script indexing in `netsuite.py` — still works, now supplements
  the new customer knowledge pull
- System prompts — unchanged (they already reference retrieved context correctly)
- FAISS paths, embedding model, chunk embedding format — unchanged

---

## Hallucination Risk After This Change

| Question type | Source | Risk |
|---|---|---|
| SuiteScript API methods | Bootstrap: authored from Oracle docs | Near zero |
| Standard record field IDs | Bootstrap: authored record schemas | Near zero |
| Navigation paths | Bootstrap: navigation-paths.md | Near zero |
| Business process steps (O2C, P2P) | Bootstrap: process guides | Near zero |
| Customer's custom field IDs | Customer index: pulled live | Zero |
| Customer's custom records | Customer index: pulled live | Zero |
| Customer's deployed scripts | Customer index: pulled live | Zero |
| Post-Aug-2025 NetSuite changes | Neither tier | Residual (minor) |
