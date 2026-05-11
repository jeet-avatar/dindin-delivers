# Phase 28 — Deferred / Out-of-Scope Items

Discovered during Plan 28-06 (deploy + verify). These are **pre-existing data states that predate Phase 28** and were NOT caused by migrations 018/019. Logged here per the GSD executor scope boundary; NOT fixed in Phase 28.

## 1. Multi-instance parts (instance_index > 1) lack their own work_orders / procurement_requests

- **What:** 11 `make`-part instances and 85 `buy`-part instances on SAT-003 with `instance_index > 1` have no work_order / procurement_request. Examples: `EPS-SOLAR-CELL-30P` (instances #2–#14), `ADCS-ASSY` (#2), `CDH-ASSY` (#2), `EPS-SOLAR-PANEL` (#2, #3), `STR-ASSY` (#2), etc.
- **Root cause:** Migration 013 (Phase 26-03) and its mirror migration 019 only backfill manufacturing/procurement data for `instance #1` of each part_definition. The duplicate instances were created by migration 012 (Phase 26-02) for multi-quantity parts but never got their own WO/PR rows.
- **Why out of scope:** Phase 28's deliverable is the 78 new mid-tier sub-component part_definitions (mig 018) plus full data coverage for them — all 78 have decision + (make→WO / buy→PR) + cost (verified). The instance>1 gap is a Phase 26 data-modelling decision, not a Phase 28 regression.
- **If addressed later:** extend migration 019's Block 2/Block 4 `WHERE pi.instance_index = 1` filter to all instances, or decide that quantity-N parts intentionally share one WO/PR.

## 2. `ns_invoice_id` was never populated on any SAT-003 part_instance

- **What:** `part_instances.ns_invoice_id` is NULL for all 261 SAT-003 instances. `sales_order_id` (24), `arena_doc_id` (6), `mes_work_order_id` (5) ARE populated.
- **Root cause:** Phase 26-04 (cross-system FK linkage) wired sales orders / Arena docs / MES work orders but not NetSuite invoices.
- **Why out of scope:** Phase 28 did not touch cross-system FKs (the 78 new sub-components correctly get NULL cross-FKs per RESEARCH Pitfall 4 — internal sub-components don't have their own sales orders/invoices). The `with_ns_invoice >= 3` assertion in the original Plan 28-06 Q7 was based on an incorrect assumption about Phase 26's output.
- **If addressed later:** a Phase 26-style backfill that sets `ns_invoice_id` on a subset of top-level instances and points the FK at existing `turion.invoices` rows.

