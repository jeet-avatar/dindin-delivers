# Phase 26: Full Demo Data Densification - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning
**Decision authority:** User delegated all decisions to Claude ("you decide and all future questions are you decide"). Decisions below are Claude's calls with rationale.

<domain>
## Phase Boundary

Bulk-populate SAT-003 (Cygnus, id `24587565-b15b-42ce-b590-87ecf9b6bb99`) and the supporting `turion_satellite.*` tables so every part page tells a complete demo story — drawings, specifications, instances, BOM hierarchy, make/buy decisions, manufacturing process (work_orders + build_steps), procurement chain (procurement_requests + vendor_orders), and a representative sample of Phase 25 cross-system links (sales_order_id, ns_invoice_id, arena_doc_id, mes_work_order_id).

**Baseline (measured 2026-05-10):**
- 80 part_definitions total; 21 have drawing_svg; 0 have specifications JSONB populated.
- 120 part_instances on SAT-003; 93 bom_lines (sparse hierarchy); 16 approved make_buy_decisions; 3 work_orders; 24 procurement_requests total.
- Legacy `turion`: 6 sales_orders, 9 invoices, 5 work_orders, 12 arena_docs.

**Phase 26 ships:** ~59 more SVG drawings, ~80 specifications JSONB blobs, ~64 more make_buy_decisions, ~40 work_orders + ~200 build_steps for make-parts, ~40 procurement_requests + ~30 vendor_orders for buy-parts, ~50+ more bom_lines to deepen the assembly tree, and ~15-20 cross-system FK populations.

Out of scope (other phases):
- New schema columns or migrations → Phase 25 done, no schema work in 26.
- UI changes (rendering specifications, BOM tree viewer, cross-system side panel) → Phase 28.
- Interactive SVG hotspots → Phase 27.
- Densifying parts across satellites other than SAT-003 → defer (single satellite is the demo target).

</domain>

<decisions>
## Implementation Decisions

### Density target ("done" criteria)
- **100% drawing coverage**: every part_definition has a non-null drawing_svg (~2-3KB isometric, gradient + drop-shadow + label). Fasteners get a shared generic-bolt SVG template parameterized by size label.
- **100% specifications coverage**: every part_definition has a non-empty `specifications` JSONB blob using the common-keys convention from `backend/src/lib/spec-keys.ts` (weight_grams, dimensions_mm, material, operating_temp_c_min/max, vendor_part_number, tolerance, surface_finish, flight_heritage) plus subsystem-specific keys (efficiency_pct for solar cells, momentum_capacity_mnms for reaction wheels, thrust_n for thrusters, etc.).
- **100% instance coverage on SAT-003**: every part_definition has ≥1 part_instance on SAT-003.
- **100% make_buy_decisions on SAT-003**: every (part_def × SAT-003) pair has an approved decision (make or buy per realistic engineering judgment — structural assemblies make, fasteners buy, payload optics buy, software components make, etc.).
- **Make parts get manufacturing process**: every make-part has ≥1 work_order with 4-8 build_steps (drawing, materials, build, QA stages).
- **Buy parts get procurement chain**: every buy-part has ≥1 procurement_request + (for representative ~30 parts) a vendor_order linked via vendor_id.
- **Deeper BOM hierarchy**: each subsystem root assembly has 5-10 direct children; ~half of those have 2-5 sub-children; fasteners attach as leaves. Target ~150 total bom_lines on SAT-003.
- **Cross-system sample**: link ~15-20 parts (sampling across subsystems) to existing turion.sales_orders / invoices / arena_docs / work_orders. Use Phase 25's sync endpoints OR direct UPDATEs in the seed migration (latter is simpler for bulk seed).

### Approach
- **Single idempotent SQL migration** at `migrations/011_densify_demo_data.sql` (turion-satellite repo). All inserts use `ON CONFLICT DO NOTHING` (where unique constraints exist) or `WHERE NOT EXISTS` guards. Re-running is a no-op.
- **No frontend changes** — Phase 28 handles UI.
- **No new endpoints** — existing endpoints already serve the data once it's there.
- **Specifications shape** = JSONB per `spec-keys.ts` convention. Common keys for all parts; subsystem-specific keys per category.
- **Drawing style** = match Phase 21's CAD silhouette aesthetic (`satellite/cad/structure.svg` style: viewBox 0 0 60 60, linearGradient + drop-shadow filter, bottom-aligned text label, ~2-3KB).
- **Cost data** — populate `make_costs` (templates + actuals) for make parts at realistic price points; `buy_costs` (templates + RFQ→quoted→PO→invoiced for actuals) for buy parts. Reuse Phase 24 schema.
- **Audit log** — every UPDATE/INSERT in the migration logs into `turion_satellite.audit_log` with `action='densify_seed'`. Adds new CHECK constraint value via migration 012 if needed.

### Realistic pricing tiers (Claude's judgment)
- **Fasteners**: $5 - $20 per unit
- **Sub-components** (springs, pins, brackets, busbars): $50 - $500
- **Sub-assemblies** (panel, hinge assembly, latch assembly): $1K - $10K
- **Subsystem assemblies** (full wing, full reaction wheel, full radiator): $10K - $100K
- **Payload/comms hardware**: $50K - $500K
- **Total satellite cost (rollup)** should land in $5M - $15M range — realistic for a small-sat demo.

### Cross-system FK linkage (sample distribution)
- Link 3-5 part_instances to each of the 6 turion.sales_orders (different parts per order).
- Link 5-8 vendor_orders to turion.invoices (buy-side procurement → vendor billing).
- Link 3-5 part_instances to turion.arena_docs (Arena PLM drawing references).
- Link 3-5 part_instances to turion.work_orders (MES production tickets).
- Keep linkage realistic — solar parts get linked to "solar wing" arena_docs, structural parts to structure-related work_orders, etc.

### Risk management
- **Drawing template approach** for fasteners (shared SVG template, parameterized by size) keeps the migration file manageable (~6000 lines vs ~10000+ if every fastener gets a fully unique drawing).
- **No real-time backfill of audit_log for old rows** — only seed-time inserts get audit entries. Pre-existing rows are untouched.
- **Cost rollups** should be consistent — if a wing assembly costs $500K total and has 100 child parts, child costs must sum to roughly $500K. Use rough proportional allocation: structure 40%, components 30%, fasteners 5%, assembly labor 25%.
- **Specifications validation**: spec-keys.ts constants are imported into the migration via... actually no, SQL can't import TS. Convention is documented in TS for the frontend; SQL migration just produces JSONB matching the contract. Manual cross-check by planner.

### Claude's Discretion
- Exact mapping of which 15-20 parts get cross-system FK linkage.
- Exact subsystem-specific keys for each spec sheet (within the documented categories).
- Whether to use one giant migration or split into 011_drawings_and_specs.sql + 012_instances_and_bom.sql + 013_work_orders_and_procurement.sql + 014_cross_system_links.sql. Recommend split (4 migrations) for executor checkpointing.
- Whether to generate the SQL by hand or use a Node.js script to emit it. Recommend Node.js script for fastener variants and the bulk specs blobs, then commit both the script and its generated SQL output.
- Test approach: backend tests already cover endpoint correctness; no new tests needed. Smoke verification = run the migration twice (idempotent proof) + spot-check ~10 parts via live curl.

</decisions>

<specifics>
## Specific Ideas

- **"Every part tells a story"** — when user clicks any of the 80 parts, they should see: a unique drawing, a populated spec sheet, instance(s) on SAT-003, an approved make/buy decision with rationale, manufacturing process steps (for make) or procurement chain (for buy), and the BOM context (parent assembly + child components if any).
- **The Solar Array Hinge (STR-HINGE-SA-DEPLOY)** — already partially seeded by quick-332. Phase 26 polishes it: add specifications, ensure all 4 hinge instances have full data, deepen child trees so Spring/Damper/Pivot Pin/Bracket also have their own children (e.g., spring has wire material spec; bracket has its own machining work order).
- **Subsystem-specific richness** — the EPS solar story (quick-332) is a good template. Phase 26 builds equivalent depth for the other 7 subsystems: STR primary structure, ADCS reaction wheel + sun sensor, PROP thruster + tank, PAY imager + lens, COMM antennas + radio, TCS radiators + heat pipes, CDH OBC + memory.
- **Realistic vendor distribution** — use existing turion_satellite.vendors rows for vendor_id assignment. Don't invent new vendors. Map subsystem to typical vendor category (e.g., COMM-antennas → "RF Hardware Inc", STR-fasteners → "MIL-SPEC Fasteners").

</specifics>

<deferred>
## Deferred Ideas

- **CAD interactive hotspots** (clickable SVG regions) → Phase 27.
- **BOM tree viewer page** + integrated SF/NS/Arena/MES side panel → Phase 28.
- **Recursive cost rollup view** (Σ children = parent total) → Phase 28.
- **Multi-satellite densification** (SAT-001, SAT-002, etc.) — defer; SAT-003 is the demo target.
- **Spec validation library** (JSON Schema enforcement on specifications JSONB) → Phase 25.x or later.
- **Real RFQ→quoted→PO→invoiced lifecycle simulation** (timestamps spread across months to demonstrate variance over time) → consider in a later analytics phase.
- **Photo-realistic CAD renders** (replace flat isometric SVG with raytraced PNGs) — out of scope for SVG-based demo.
- **Auto-populate cross-system FKs via Phase 25 sync endpoints during seed migration** — would require an HTTP call from SQL which is awkward; just UPDATE directly. Phase 25 endpoints remain available for ad-hoc user-triggered syncs post-Phase-26.

</deferred>

---

*Phase: 26-full-demo-data-densification*
*Context gathered: 2026-05-10*
