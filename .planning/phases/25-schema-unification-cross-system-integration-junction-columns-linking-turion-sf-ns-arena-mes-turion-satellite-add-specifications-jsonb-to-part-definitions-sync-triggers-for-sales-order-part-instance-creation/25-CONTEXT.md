# Phase 25: Schema Unification + Cross-System Integration - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning
**Decision authority:** User explicitly delegated all decisions in this phase to Claude ("you decide and all the future questions are you decide"). Decisions below are Claude's calls with rationale, intended to be authoritative for planner/researcher unless user overrides later.

<domain>
## Phase Boundary

Bridge the two parallel demo systems on `turionspace.zietra.com`:
- **`turion` schema** — legacy demo: sales_orders, customers, invoices (Salesforce/NetSuite), arena_docs (PLM), mes_stages (MES), bom, work_orders, vendors with `*_ns_integrations` cross-tables.
- **`turion_satellite` schema** — Phase 21+ production system: part_definitions, part_instances, bom_lines, make_costs, buy_costs, make_buy_decisions, vendor_orders, procurement_requests.

Phase 25 delivers:
1. Nullable FK junction columns on `turion_satellite` tables pointing into `turion` tables (cross-references — not data duplication).
2. New `specifications JSONB` column on `part_definitions` for structured spec sheets.
3. Sync endpoints (manual/pull) that populate the FKs and create satellite part_instances from SF sales_orders.

Out of scope (other phases):
- Bulk-populate the new columns with realistic data → **Phase 26**.
- Render the cross-system data as a unified UI on cost-detail.html → **Phase 28**.
- Bidirectional auto-sync via triggers / webhooks — deferred entirely; pull-only for v1.

</domain>

<decisions>
## Implementation Decisions

### Linkage direction
- **Nullable FKs FROM `turion_satellite` INTO `turion`.** turion_satellite is the newer, stricter schema; it pulls references to legacy demo data. Reverse direction would pollute the legacy schema and require backfilling its older `*_ns_integrations` patterns.
- **No junction tables.** Direct nullable FK columns on existing tables — simpler, queryable in one JOIN, fewer migrations.
- **Specific FKs to add** (Phase 26 will populate them):
  - `turion_satellite.part_instances.sales_order_id` → `turion.sales_orders(id)` NULLABLE
  - `turion_satellite.part_instances.ns_invoice_id` → `turion.invoices(id)` NULLABLE
  - `turion_satellite.part_instances.arena_doc_id` → `turion.arena_docs(id)` NULLABLE
  - `turion_satellite.part_instances.mes_work_order_id` → `turion.work_orders(id)` NULLABLE (legacy MES WO, not the satellite-internal `turion_satellite.work_orders`)
  - `turion_satellite.vendor_orders.ns_invoice_id` → `turion.invoices(id)` NULLABLE
  - `turion_satellite.procurement_requests.sales_order_id` → `turion.sales_orders(id)` NULLABLE (only meaningful for procurement requests tied to a customer order, not internal restocks)
- **Cross-schema FK enforcement is allowed** since both schemas live in the same Postgres database. Add `ON DELETE SET NULL` so deleting a legacy turion row doesn't cascade-destroy satellite data.

### Sync semantics
- **Pull-only via manual API endpoints. No triggers, no webhooks, no auto-sync.** Triggers are complex and brittle for demo data.
- **Idempotent endpoints** (re-running is safe and reports no-op):
  - `POST /api/integration/sync-sales-order/:salesOrderId` — reads `turion.sales_orders`, matches its line items against `turion_satellite.part_definitions.part_number`, and either (a) creates new `part_instances` on a target satellite (specified in body) or (b) sets `sales_order_id` on existing instances. Returns `{created: N, linked: M, skipped: P}`.
  - `POST /api/integration/sync-ns-invoice/:invoiceId` — links matching `turion_satellite.vendor_orders` rows by part_number/vendor pair, sets `ns_invoice_id`. Returns `{linked: N, skipped: M}`.
  - `POST /api/integration/sync-arena-doc/:docId` — links by part_number to `part_instances.arena_doc_id`.
  - `POST /api/integration/sync-mes-work-order/:woId` — links by part_number to `part_instances.mes_work_order_id`.
- **Match strategy:** by `part_number` string equality (no fuzzy matching). If no match found, the endpoint returns `{matches: 0}` and exits cleanly — does NOT create new part_definitions.
- **Auth:** all sync endpoints require `requireAuth` (Supabase JWT). Hardened error pattern (no `detail: err.message`).

### Specifications shape
- **Hybrid JSONB**: `part_definitions.specifications JSONB` column, free-form, but with a **documented "common keys" convention** in a TypeScript constants file (e.g. `backend/src/lib/spec-keys.ts`). Common keys are optional but if present must follow the type contract.
- **Common keys** (recommended subset, all optional):
  - `weight_grams` (number)
  - `dimensions_mm` (object: `{length, width, height}` or array `[L,W,H]` for cylinders)
  - `material` (string)
  - `operating_temp_c_min` (number)
  - `operating_temp_c_max` (number)
  - `vendor_part_number` (string)
  - `tolerance` (string, e.g. `±0.005mm`)
  - `surface_finish` (string)
  - `flight_heritage` (string, e.g. `TRL 9 (14 prior missions)`)
- **Subsystem-specific keys** (free-form, vary by subsystem):
  - EPS solar cell: `efficiency_pct`, `output_voltage_v`, `output_current_ma`
  - STR fastener: `thread_pitch`, `thread_size`, `head_type`
  - ADCS reaction wheel: `momentum_capacity_mnms`, `max_torque_mnm`, `max_speed_rpm`
  - PROP thruster: `thrust_n`, `isp_s`, `propellant`
- **No enforcement schema** in v1 — convention only. v2 (future phase) could add a JSON Schema validation layer.
- **Exposed verbatim** in `GET /api/parts/:id` response. Frontend renders by mapping known keys to friendly labels (Phase 28); unknown keys render with raw key as the label.

### Mutation ownership
- **Each system is canonical for its own domain.** turion_satellite owns satellite production data; turion owns SF/NS/Arena/MES data. Cross-references are read-only handles.
- **No conflict resolution needed** because no data is duplicated — cross-system queries JOIN at read time.
- **If a turion row is deleted**, the FK goes to NULL (`ON DELETE SET NULL`). The satellite part_instance stays valid; just loses its legacy linkage.
- **If a turion_satellite row is deleted**, the legacy turion side is unaffected (no reverse FKs).
- **No update propagation.** If `turion.sales_orders.status` changes from 'draft' to 'closed-won', the satellite side reads the new status at query time via JOIN — no syncing required.
- **Future phase consideration:** if real bidirectional sync is ever needed (e.g., closing a satellite work_order should mark MES work_order as done), that's a Phase 25.x or new phase — not v1.

### Claude's Discretion
- Exact migration file numbering: next number after 007 (assume 008/009/010 for the three migrations: schema additions, FK additions, specifications JSONB).
- Whether to split sync endpoints across one router file (`integration.ts`) or four (`sync-sf.ts`, `sync-ns.ts`, etc.). Recommend single `integration.ts` with route prefixes.
- Whether to add unit tests for sync endpoints (recommend yes — at least 3 cases per: happy path, no-match, idempotent re-run).
- Whether to add `created_at`/`updated_at` timestamps to the FK additions (recommend yes for audit; nullable timestamps are cheap).
- Whether to backfill the new columns to NULL or leave default (NULL is the default; no backfill needed).
- Whether the integration router gets a hard-gate similar to procurement-requests — recommend NO. Sync endpoints are admin-grade ops; the auth requirement is enough.

</decisions>

<specifics>
## Specific Ideas

- **"Cross-references are handles, not copies"** — the architectural principle. Don't duplicate sales_order data into turion_satellite; just store the UUID and JOIN at query time.
- **Pull beats push** for demo work — simple, debuggable, easy to re-run.
- **Specifications JSONB now, not later** — even though Phase 26 will populate it, the column needs to exist before Phase 26 can seed values.
- **Match by part_number string** — both schemas already converge on `part_number` as the natural identifier (e.g., `STR-HINGE-SA-DEPLOY` is meaningful in both contexts).
- **Existing legacy `*_ns_integrations` tables in turion (`arena_ns_integrations`, `mes_ns_integrations`, `vendor_ns_integrations`, `vendor_sync_runs`, `arena_sync_runs`, `mes_sync_runs`) are NOT modified by Phase 25.** They remain whatever they were in the original demo. Phase 25 only adds NEW columns to turion_satellite; turion is read-only here.

</specifics>

<deferred>
## Deferred Ideas

- **Bidirectional sync via Postgres triggers or app-level webhooks** — defer to Phase 25.x or new phase if needed. Pull-only is sufficient for v1.
- **JSON Schema enforcement on specifications** — defer; convention-only for v1.
- **GraphQL or unified-query layer that joins both schemas transparently** — not needed; REST endpoints + JOIN-aware SQL handle this.
- **Real-time subscriptions** (postgres LISTEN/NOTIFY for cross-system change events) — out of scope.
- **Backfill of all 69 existing part_definitions with `specifications` data** — that's Phase 26 (data densification), not Phase 25 (schema).
- **Wiring SF→NS→Arena→MES context into cost-detail.html or part.html** — that's Phase 28 (UI overhaul).
- **Audit log for sync operations** — recommend reusing the existing `audit_log` table (added in Phase 24) with action='sync_*'. Not a separate phase, but the planner can decide whether to wire it now or defer.

</deferred>

---

*Phase: 25-schema-unification-cross-system-integration*
*Context gathered: 2026-05-10*
