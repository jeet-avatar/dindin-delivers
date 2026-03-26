# Hospital Pricing Assurance — Frontend Design Spec

**Date:** March 26, 2026
**Product:** Hospital Wholesale Pricing Assurance Framework
**Scope:** Full React frontend — replaces 3-page stub; all files must be created
**Status:** Approved for implementation

> **Note:** `apps/hospital-pricing/` currently contains only `.planning/`. The backend code exists on the `feat/hospital-pricing` git branch and is running locally. All frontend files listed in Section 8 must be created as part of this build.

---

## 1. Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Navigation | Top navigation bar | Maximises vertical space for tables and PDF viewers |
| Theme | Light + Navy (`#1e3a5f`) | Enterprise clinical — matches Epic/Workday aesthetic, appropriate for hospital procurement |
| Discrepancy UX | Click row → right-side drawer | Provides full AI reasoning context before officer acts; table stays visible behind drawer |

---

## 2. App Shell

### Top Navigation Bar
- Background: navy `#1e3a5f`, white text
- **Left:** `⬡ HPA` logo (links to `/`)
- **Center tabs:** Dashboard · Contracts · Invoices · Discrepancies · Audit Log · Compliance
- **Right:** Entity name + user role chip + notification bell + avatar/logout dropdown
- Active tab: white text + `border-bottom: 2px solid #60a5fa`
- Inactive tabs: `#93b4d4`

**Notification bell badge:** Count of open discrepancies. The `AppContext` (new shared context) holds `openDiscrepancyCount`, set once on app load from `GET /discrepancies/?status=open`. The nav reads from context — no extra per-render fetch. Updated after any resolve action.

### Route Structure
```
/                   → Dashboard
/contracts          → Contracts
/invoices           → Invoices
/discrepancies      → Discrepancies
/audit              → Audit Log
/compliance         → Compliance
/login              → Login (public)
```

### Files Changed
- `App.tsx` — replace routes, add all 6 page imports
- `components/Layout.tsx` — replace sidebar with top nav, add AppContext provider
- `components/ProtectedRoute.tsx` — unchanged
- `contexts/AppContext.tsx` — new: holds `openDiscrepancyCount`, `currentUser` (from `GET /auth/me`)

---

## 3. Role-Based UI Gating

The `GET /auth/me` response includes `role`. The `AppContext` exposes `currentUser.role`. UI gating rules:

| Action | Allowed Roles |
|--------|--------------|
| Activate Contract (`POST /contracts/{id}/activate`) | `procurement_approver`, `entity_admin`, `platform_admin` |
| Resolve Discrepancy (`POST /discrepancies/{id}/resolve`) | `procurement_officer`, `procurement_approver`, `entity_admin`, `platform_admin` |
| View Audit Log | All authenticated roles |
| View Compliance | All authenticated roles |

**Implementation:** A `useRole()` hook returns `canActivateContract` and `canResolveDiscrepancy` booleans. Buttons are hidden (not just disabled) for roles without permission. A `procurement_officer` sees the Contracts table but no "Activate" button; they see the Discrepancy drawer but no Approve/Dispute/Escalate buttons — instead a "Pending approver review" label.

---

## 4. Pages

### 4.1 Dashboard (`/`)

**KPI Cards (top row, 4 cards):**
- Active Contracts (navy) — count from `GET /contracts/` where `status=active`
- Invoices This Month (blue) — count computed client-side from `GET /invoices/` response (filter `invoice_date` >= first day of current month; acceptable for Phase 1 data volumes)
- Open Discrepancies (red) — from `AppContext.openDiscrepancyCount`
- Resolved Today (green) — count from `GET /discrepancies/` where `resolved_at` >= today

**Recent Discrepancies table (below cards):**
- Top 5 open discrepancies, columns: Item · Supplier · Type · Delta · Date
- Each row clickable → navigates to `/discrepancies` with that row pre-selected via URL param `?highlight={id}`

**Contract Expiry Alerts:**
- Amber strip below KPI cards if any active contract expires within 30 days
- Lists contract name + expiry date + "Review" link to `/contracts`

**Loading:** Skeleton shimmer on all cards and table rows
**Empty:** "No activity yet — upload your first contract to get started"

---

### 4.2 Contracts (`/contracts`)

**Header:** "Contracts" title + "Upload Contract" button (primary, top-right)

**Upload flow (3-step):**
1. File picker opens (PDF only, max 50MB)
2. Call `POST /documents/upload` → backend returns `{ presigned_url, s3_path }`
3. Frontend PUTs file directly to `presigned_url` (client-to-S3, shows progress bar)
4. Call `POST /contracts/` with `{ document_s3_path, supplier_id?, ... }` → returns `contract_id`
5. Poll `GET /contracts/{contract_id}` every 3 seconds — `LangGraphProgress` tracker shows active step
6. On `status=pending_review`: amber banner "GPT-4o has extracted contract terms — please review before activating"
7. Review panel shows extracted fields (supplier, effective_date, expiration_date, pricing_tiers, admin_fee_pct, mfn_clause) with Confirm / Reject buttons
8. Confirm → `POST /contracts/{id}/activate` (role-gated, see Section 3)
9. **Partial failure recovery:** If step 4 fails after S3 PUT succeeds, show "Upload succeeded but contract creation failed — retry" button. Retry re-calls `POST /contracts/` with the same `s3_path`. No duplicate S3 upload.

**LangGraph polling:**
- Interval: 3 seconds
- Timeout: show amber "Processing is taking longer than expected…" after 2 minutes; show red error after 5 minutes with "Contact support" link
- EXTRACT or COMPARE failure: show red "Processing failed — {error message from API}" with retry option

**Contracts table:**
- Columns: Supplier · GPO # · Effective · Expires · Status chip · Action
- Status chips: `draft` (grey) · `active` (green) · `pending_review` (amber) · `expired` (red) · `terminated` (slate)
- Action: "View" button → contract detail drawer (read-only: all fields + original PDF link) + "Activate" button (role-gated)

**Empty:** "No contracts yet — upload your first wholesale agreement" + Upload button

---

### 4.3 Invoices (`/invoices`)

**Header:** "Invoices" + "Upload Invoice" button

**Upload zone:**
- Drag-and-drop area (PDF or EDI 810) at top of page
- On drop/select: `POST /invoices/upload` (multipart form, backend handles S3 + matching)
- Shows upload progress bar then "Processing…" spinner while backend matches against active contract

**Invoices table:**
- Columns: Invoice # · Supplier · Date · Amount · Lines · Match Status · Discrepancies
- Match Status chips: `matched` (green) · `discrepancies_found` (red) · `pending` (amber) · `no_contract` (grey)
- Clicking a row with `discrepancies_found` navigates to `/discrepancies?invoice={id}`

**Empty:** "No invoices uploaded yet"

---

### 4.4 Discrepancies (`/discrepancies`)

**Filter bar:**
- Type pills (multi-select): All · price_mismatch · tier_mismatch · sku_mismatch · expired_contract · uom_mismatch · no_contract
- Status toggle: Open / Resolved / All
- Supplier search input

**Discrepancies table:**
- Columns: Item / Supplier · Invoice # · Type badge · Contract $ · Invoiced $ · Delta · Date · Status
- Type badge colours: `price_mismatch` red · `tier_mismatch` amber · `sku_mismatch` purple · `expired_contract` orange · `uom_mismatch` blue · `no_contract` grey
- **Clicking any row opens right-side `DrawerPanel`**

**Right-side DrawerPanel (width: `min(480px, 40vw)`, slides in from right):**
- Header: Item name + discrepancy type badge
- Supplier, invoice number, date
- Comparison block: Contract price vs Invoiced price vs Delta (colour-coded)
- AI reasoning box (amber background): GPT-4o classification explanation from discrepancy record
- Contract terms summary (tier, UOM, effective dates)
- **Action buttons (role-gated per Section 3):**
  - `Approve` (green) — `POST /discrepancies/{id}/resolve` with `resolution=approved`
  - `Dispute` (red) — `POST /discrepancies/{id}/resolve` with `resolution=disputed` — inline text field for optional note
  - `Escalate` (slate) — `POST /discrepancies/{id}/resolve` with `resolution=escalated`
  - If role has no resolve permission: "Pending approver review" label instead of buttons
- On success: row status updates to resolved, `AppContext.openDiscrepancyCount` decrements, drawer closes
- On API error: inline error message in drawer, drawer stays open, buttons re-enabled

**Empty (open filter):** Green checkmark — "All clear — no open discrepancies"

---

### 4.5 Audit Log (`/audit`)

**New backend endpoint required:** `GET /audit/` (see Section 6)

**Filter bar:** Date range picker · Action type dropdown · Free-text search

**Table (read-only, no actions):**
- Columns: Timestamp · User · Action · Entity Type · Entity ID · Detail
- Sorted newest-first, paginated 50 per page with prev/next controls

**Empty:** "No audit events recorded yet"

---

### 4.6 Compliance (`/compliance`)

All data derived from `GET /contracts/` (which must embed `hospital_entity` fields — see Section 6 note). No additional endpoints.

**AKS Safe Harbor panel:**
- Lists contracts where `admin_fee_pct > 0.03` or `aks_safe_harbor_documented = false`
- Red badge per violation, link to contract in Contracts page

**BAA Status panel:**
- Lists contracts where `baa_required = true` — green (BAA uploaded) or red (missing)

**MFN Monitoring panel:**
- Lists contracts with `mfn_clause` present — trigger type, cure period, next quarterly disclosure date

**340B panel:**
- Lists contracts where the associated `HospitalEntity.is_covered_entity = true` and category is pharma
- `is_covered_entity` sourced from `currentUser.entity.is_covered_entity` in `AppContext` (populated from `GET /auth/me` response which should include entity details), not from the contracts list response

**Empty all panels:** Green "No compliance issues found"

---

## 5. Shared Components

| Component | Purpose |
|-----------|---------|
| `StatusChip` | Coloured pill for contract/invoice/discrepancy status |
| `DiscrepancyBadge` | Type badge (price_mismatch etc.) with correct colour per type |
| `SkeletonRow` | Shimmer placeholder for table loading state |
| `EmptyState` | Icon + message + optional CTA button |
| `DrawerPanel` | Right-side overlay, `min(480px, 40vw)`, slide-in animation |
| `LangGraphProgress` | INGEST→EXTRACT→VERIFY→COMPARE step tracker with 3s poll, timeout states |
| `UploadZone` | Drag-and-drop file upload with progress bar |
| `ErrorBanner` | Dismissible top-of-page error strip |

---

## 6. API Wiring Summary

| Page | Endpoints Used |
|------|---------------|
| App Shell | `GET /auth/me` (on load, populates AppContext) · `GET /discrepancies/?status=open` (badge count) |
| Dashboard | `GET /contracts/` · `GET /invoices/` · `GET /discrepancies/` |
| Contracts | `GET /contracts/` · `POST /documents/upload` · **`POST /contracts/`** *(new)* · **`GET /contracts/{id}`** *(new)* · `POST /contracts/{id}/activate` |
| Invoices | `GET /invoices/` · `POST /invoices/upload` |
| Discrepancies | `GET /discrepancies/` · `POST /discrepancies/{id}/resolve` |
| Audit Log | **`GET /audit/`** *(new)* |
| Compliance | `GET /contracts/` · `GET /auth/me` (entity fields) |

---

## 7. Backend Additions Required

### 7.1 `POST /contracts/`
Create a new wholesale agreement record after S3 upload. Returns `{ contract_id, status: "ingesting" }`. Triggers the LangGraph INGEST node.

```
POST /contracts/
Body: { document_s3_path: str, supplier_id?: UUID, gpo_contract_number?: str }
→ WholesaleAgreement (with contract_id, status)
```

### 7.2 `GET /contracts/{contract_id}`
Fetch a single contract by ID, including current LangGraph processing status.

```
GET /contracts/{contract_id}
→ WholesaleAgreement (full detail including status, extracted fields)
```

### 7.3 `GET /audit/`
Paginated audit log endpoint.

```
GET /audit/?page=1&limit=50&date_from=&date_to=&action_type=
→ { items: AuditLogEntry[], total: int, page: int }
```

### 7.4 `GET /auth/me` — extend response
The existing `/auth/me` returns `{ user_id, entity_id, email, role }`. Extend to include:
```json
{ ..., "entity": { "name": "...", "is_covered_entity": false, "gpo_memberships": [] } }
```
Needed by Compliance page for 340B panel.

### 7.5 `GET /contracts/` — verify response includes compliance fields
Confirm the list response includes: `admin_fee_pct`, `aks_safe_harbor_documented`, `baa_required`, `mfn_clause`. If these are omitted from the list serialiser, add them.

---

## 8. TypeScript Types

New file: `src/types/hospital.ts`

```typescript
export interface WholesaleAgreement { contract_id: string; supplier_id: string; status: ContractStatus; effective_date: string; expiration_date: string; admin_fee_pct: number | null; aks_safe_harbor_documented: boolean; baa_required: boolean; mfn_clause: object | null; document_s3_path: string; ... }
export type ContractStatus = 'draft' | 'active' | 'pending_review' | 'expired' | 'terminated' | 'suspended'
export interface Invoice { invoice_id: string; supplier_id: string; invoice_date: string; total_amount: number; match_status: InvoiceMatchStatus; discrepancy_count: number; ... }
export type InvoiceMatchStatus = 'matched' | 'discrepancies_found' | 'pending' | 'no_contract'
export interface Discrepancy { line_id: string; invoice_id: string; discrepancy_type: DiscrepancyType; contract_unit_price: number | null; invoiced_unit_price: number; delta: number; ai_reasoning: string; status: 'open' | 'approved' | 'disputed' | 'escalated'; ... }
export type DiscrepancyType = 'price_mismatch' | 'tier_mismatch' | 'sku_mismatch' | 'expired_contract' | 'uom_mismatch' | 'no_contract'
export interface AuditLogEntry { entry_id: string; timestamp: string; user_id: string; action: string; entity_type: string; entity_id: string; detail: string; }
```

---

## 9. Error Handling

| Scenario | Behaviour |
|----------|-----------|
| 401 Unauthorized | Axios interceptor → redirect to `/login` |
| 403 Forbidden | Inline "Access denied" message on page |
| 5xx Server Error | Dismissible `ErrorBanner` at top of page |
| S3 PUT failure | Inline error in upload zone + retry (re-fetches presigned URL) |
| `POST /contracts/` fails after S3 success | "Contract creation failed — retry" button; no duplicate upload |
| LangGraph timeout (>5 min) | Red error + "Contact support" link |
| Resolve failure | Inline error in drawer; drawer stays open, buttons re-enabled |
| Network offline | ErrorBanner "Connection lost…" |

---

## 10. Files Created / Modified

**New pages (6):**
- `src/pages/Dashboard.tsx` (replace stub)
- `src/pages/Contracts.tsx`
- `src/pages/Invoices.tsx`
- `src/pages/Discrepancies.tsx` (replace stub)
- `src/pages/AuditLog.tsx`
- `src/pages/Compliance.tsx`

**New components (8):**
- `src/components/StatusChip.tsx`
- `src/components/DiscrepancyBadge.tsx`
- `src/components/SkeletonRow.tsx`
- `src/components/EmptyState.tsx`
- `src/components/DrawerPanel.tsx`
- `src/components/LangGraphProgress.tsx`
- `src/components/UploadZone.tsx`
- `src/components/ErrorBanner.tsx`

**New API modules (4):**
- `src/api/contracts.ts`
- `src/api/invoices.ts`
- `src/api/discrepancies.ts`
- `src/api/audit.ts`

**New types & context (2):**
- `src/types/hospital.ts`
- `src/contexts/AppContext.tsx`

**New hooks (1):**
- `src/hooks/useRole.ts`

**Modified frontend (2):**
- `src/App.tsx` — 6 routes
- `src/components/Layout.tsx` — top nav

**New backend (3):**
- `backend/routers/audit.py`
- `backend/routers/contracts.py` — add `POST /contracts/` and `GET /contracts/{id}`
- `backend/main.py` — register audit router, extend `/auth/me` response

---

*Spec generated March 26, 2026 | Zietra Technologies inc | Hospital Wholesale Pricing Assurance Framework*
