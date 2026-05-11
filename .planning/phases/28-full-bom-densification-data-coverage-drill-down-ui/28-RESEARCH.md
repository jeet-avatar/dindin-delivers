# Phase 28: Full BOM densification + data coverage + drill-down UI — Research

**Researched:** 2026-05-10
**Domain:** Postgres data densification + Express/TS read-only API extensions + vanilla HTML/CSS/JS frontend drill-down (Turion Satellite stack)
**Confidence:** HIGH (codebase fully introspectable; production DB metrics stated in prompt; live working `instance.html` is the gold-standard reference)

## Summary

Phase 28 is **three parallel densification tracks** layered on the Phase 26-27 foundation, all on SAT-003 (`24587565-b15b-42ce-b590-87ecf9b6bb99`):

1. **(A) BOM densification (mig 018)** — mirror the PCDU pattern from migration 016 for ~15-25 mid-tier "should-have-children" parts. Add 5-10 internal sub-component `part_definitions` per parent (with `specifications` JSONB + cabinet-projection `drawing_svg` + `default_make_buy` + `itar_flag`), then seed 1 `part_instance` of each on SAT-003 and wire them under their parent via `bom_lines`. PCDU migration 016 is the textbook to copy verbatim — same 4-block layout, same `<!-- v=018 -->` sentinel idempotency, same `ON CONFLICT (part_number) DO NOTHING` shape.

2. **(B) Data coverage backfill (mig 019)** — every new sub-component AND the 7 PCDU children seeded by migration 016 lack the Phase 26-03 data layer (decisions, work_orders + build_steps for make parts, procurement_requests + vendor_orders for buy parts, make_costs + buy_costs templates + actuals). Migration 013 is the textbook: re-use the SAME `INSERT … SELECT … WHERE NOT EXISTS` shape, wrap in `BEGIN/COMMIT`, run against ALL parts on SAT-003 that lack coverage (set difference catches both the migration-016 PCDU children and the new migration-018 parts).

3. **(C) Drill-down UI overhaul** — three deliverables: (i) a NEW recursive BOM-tree page (replace today's flat 3-level `bom.html` SVG with an expandable/collapsible HTML tree); (ii) **SF→NS→Arena→MES integration side panel on `cost-detail.html` and `instance.html`** (the cross-system FKs `sales_order_id` / `ns_invoice_id` / `arena_doc_id` / `mes_work_order_id` already exist on `part_instances` from migration 008 + 014 but are **never surfaced in any UI page today**); (iii) surface the **recursive cost rollup** on `instance.html` (today's `/api/analytics/cost-rollup/:satId` is per-subsystem only — Phase 28 adds a new read-only endpoint that rolls Σ(make_actual + buy_invoiced) up the BOM subtree of a given `part_instance_id`).

**Primary recommendation:** Build migration 018 by copy-modify of `016_pcdu_3d_drawing_and_subcomponents.sql` (4-block layout, sentinel + `ON CONFLICT` idempotency). Build migration 019 by copy-modify of `013_densify_decisions_manufacturing_procurement.sql` Blocks 1-5 with no scope filter (let `WHERE NOT EXISTS` naturally backfill any missing rows for ALL parts on SAT-003 including migration-016 + migration-018 children). For the UI, **clone `instance.html` panel-by-panel** (it is the gold-standard reference per commit 42552aa) and add three new panels: BOM-tree page, integrations side panel, recursive cost rollup. **DO NOT introduce a frontend framework** — current stack is vanilla HTML + `satelliteApi`/`satelliteRender`/`satelliteCad` modules.

## Standard Stack

### Core (already in use — do NOT introduce new tech)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Postgres (Supabase pooler) | 15.x | Schema: `turion_satellite` | Already prod-live, hit via pgbouncer transaction mode |
| Node + Express + TypeScript | Express 5 / TS 5 | Backend at `lo254mvukl.execute-api.us-east-1.amazonaws.com` (Lambda) | Existing 22 route files in `backend/src/routes/` |
| pg (node-postgres) | 8.x | Direct SQL — `pool`, `query`, `queryOne`, `client.query` for transactions | Established `backend/src/db.ts` helpers; no ORM |
| `decimal.js` via `lib/money.ts` | n/a | Decimal-precise USD math (`toMoney`, `sum`, `diff`) | All money on wire is JSON string (preserves precision) |
| Vanilla HTML + ES2020 JS | n/a | 11 standalone HTML pages in `turion-space-demo/satellite/` | Zero build step; reload + edit |
| `satelliteApi` (`satellite-api.js`) | n/a | `get/post/patch/delete` wrappers, JWT injection, error→toast | Used by every HTML page |
| `satelliteRender` (`satellite-render.js`) | n/a | `topbarHTML`, `statusTag`, `breadcrumb`, `escapeHtml`, `fmtDate`, `getQueryParam`, `toast` | Shared chrome |
| `satelliteCad` (`satellite-cad.js`) | n/a | `loadPartCad`, `loadSubsystemCad`, `renderCalloutsOnSvg` (Phase 27) | SVG drawing fetch + callout overlay |
| `cost-render.js` | n/a | `formatMoney`, `trafficLight`, `renderMakeSheet`, `renderBuySheet`, `renderDecisionPanel`, `renderTotalsCard`, `renderPrevSatDelta`, `renderRollupRow` | Money formatting + cost UI helpers |
| Supabase JS UMD (CDN) | 2.x | Auth only (magic link) | Already wired via `satelliteAuth.requireSession()` |

### Supporting (used in tests / build)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | latest | Unit tests for cost-render pure functions | Add tests for new tree-traversal helpers |
| AWS SDK (Lambda+APIGW) | n/a | Deploy already in place | Re-deploy backend after route additions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vanilla HTML | React/Vue/Svelte | **REJECTED** — violates "zero hardcoding + zero deps" pattern Rajesh confirmed in memory; existing pages render in <300ms; introducing a framework triggers a build step + new deploy pipeline |
| Recursive CTE in Postgres | Server-side JS tree assembly | Postgres `WITH RECURSIVE` is faster + simpler; cost rollup needs SQL anyway to sum money columns |
| OpenAPI / typed SDK | Inline `fetch` | Project already uses thin `satelliteApi.get(path)` — adding OpenAPI doubles ceremony for no benefit at this scale |
| New cost table for rollup cache | Compute on read | Rollup is small (~183 nodes per satellite) — compute on demand; cache only if profile says >200ms |

**Installation:**
No new packages. All work is data (SQL migrations) + new route files + new HTML pages.

## Architecture Patterns

### Repo layout (existing — DO NOT restructure)
```
/Users/jeet/turion-satellite/
├── migrations/                       # 17 .sql files; add 018 + 019 here
│   ├── 016_pcdu_3d_drawing_and_subcomponents.sql   ← Phase 28-01 PATTERN
│   ├── 013_densify_decisions_manufacturing_procurement.sql ← Phase 28-02 PATTERN
│   └── 008_add_cross_system_fks.sql                ← FK schema reference
├── backend/src/
│   ├── app.ts                        # Mount new routes here
│   ├── routes/
│   │   ├── bom.ts                    # Add: GET /:satId/tree  (recursive)
│   │   ├── cost-rollup.ts            # Add: GET /instance/:instId  (recursive cost)
│   │   ├── instances.ts              # Add: cross-system links to response
│   │   └── parts.ts                  # /process is the reference for /tree
│   └── db.ts                         # pool + query + queryOne (do not modify)
/Users/jeet/turion-space-demo/satellite/
├── instance.html                     ← Phase 28-04 GOLD STANDARD (commit 42552aa)
├── cost-detail.html                  ← Phase 28-05 needs SF→NS→Arena→MES side panel
├── bom.html                          ← Phase 28-03 REPLACE flat SVG with recursive tree
├── part.html                         ← Already has sub-parts grid; add integrations badge
└── satellite-render.js / cost-render.js   # Add shared `renderIntegrationsPanel(inst)` here
```

### Pattern 1: Migration mirror (Phase 28-01 = clone of mig 016)
**What:** Each parent part to be densified gets 4 blocks in migration 018, byte-for-byte mirroring the PCDU pattern.
**When to use:** For every parent in the ~15-25 target list below.
**Example (verbatim shape from mig 016, lines 33-484):**
```sql
-- Block 1: replace parent drawing_svg with 3-face cabinet projection
UPDATE turion_satellite.part_definitions
   SET drawing_svg = $svg$<!-- v=018 -->...<svg>...</svg>$svg$
 WHERE part_number = 'PARENT-PN'
   AND (drawing_svg IS NULL OR drawing_svg NOT LIKE '%<!-- v=018 -->%');

-- Block 2: seed N child part_definitions
INSERT INTO turion_satellite.part_definitions
  (part_number, description, subsystem_id, default_make_buy, itar_flag, specifications, drawing_svg)
SELECT v.part_number, v.description, s.id, v.make_buy, v.itar, v.specs::jsonb, v.svg
FROM (VALUES ('CHILD-PN-1', '...', 'buy', FALSE, '{"weight_grams":...}', $svg$<svg>...</svg>$svg$),
             ...) AS v(part_number, description, make_buy, itar, specs, svg)
JOIN turion_satellite.subsystems s ON s.code = 'EPS'    -- per parent subsystem
ON CONFLICT (part_number) DO NOTHING;

-- Block 3: seed instances on SAT-003 (instance_index=1, serial SN-{PN}-001)
INSERT INTO turion_satellite.part_instances (satellite_id, part_definition_id, instance_index, serial_number)
SELECT '24587565-b15b-42ce-b590-87ecf9b6bb99', pd.id, 1, 'SN-' || pd.part_number || '-001'
FROM turion_satellite.part_definitions pd
WHERE pd.part_number IN ('CHILD-PN-1', 'CHILD-PN-2', ...)
AND NOT EXISTS (SELECT 1 FROM turion_satellite.part_instances pi
                WHERE pi.satellite_id = '24587565-b15b-42ce-b590-87ecf9b6bb99'
                  AND pi.part_definition_id = pd.id AND pi.instance_index = 1);

-- Block 4: seed bom_lines under PARENT instance #1
-- (PL/pgSQL DO block exactly like mig 016 lines 436-484)
```
Idempotency: re-run = 0 rows changed.
Source: `/Users/jeet/turion-satellite/migrations/016_pcdu_3d_drawing_and_subcomponents.sql` (HIGH confidence).

### Pattern 2: Data backfill (Phase 28-02 = clone of mig 013)
**What:** New parts (and the 7 mig-016 PCDU children) need decisions/WO/build_steps/PR/VO/make_costs/buy_costs rows.
**Why this works zero-config:** Migration 013 already uses `WHERE NOT EXISTS` set-difference logic — re-running it after migration 018 lands AUTOMATICALLY backfills only the new rows.
**Recommended approach:** **Don't re-run 013** (it's a Phase 26 artifact and re-running it is the testbed pattern). Instead, write `019_backfill_coverage_for_phase28_parts.sql` that copies blocks 1-5 of 013 verbatim, scoped to **ALL** parts on SAT-003 with the same `WHERE NOT EXISTS` guards. The set-difference handles all 7 + new mig-018 parts automatically.
**Example block (verbatim shape from mig 013, lines 95-130):**
```sql
INSERT INTO turion_satellite.make_buy_decisions
  (satellite_id, part_definition_id, decision, decision_status, rationale, decided_at)
SELECT '24587565-b15b-42ce-b590-87ecf9b6bb99'::uuid, pd.id, pd.default_make_buy, 'approved',
       CASE pd.default_make_buy WHEN 'make' THEN CASE s.code ... END
                                WHEN 'buy'  THEN CASE s.code ... END END,
       NOW() - INTERVAL '45 days'
FROM turion_satellite.part_definitions pd
JOIN turion_satellite.subsystems s ON s.id = pd.subsystem_id
ON CONFLICT (satellite_id, part_definition_id) WHERE superseded_by IS NULL DO NOTHING;
```
Each Block 2 (WO + build_steps), Block 3 (make_costs), Block 4 (PR + VO), Block 5 (buy_costs) re-uses `WHERE NOT EXISTS` exactly as mig 013. Wrap entire file in `BEGIN; ... COMMIT;` per the mig 013 transactional guarantee.

### Pattern 3: Recursive BOM-tree endpoint
**What:** New endpoint `GET /api/satellites/:satId/bom/tree` returning a nested JSON tree rooted at every top-level instance (no parent in bom_lines).
**When to use:** New `bom.html` page; integrations side panel needs depth context.
**Recommended SQL (Postgres WITH RECURSIVE):**
```sql
WITH RECURSIVE tree AS (
  -- roots: instances with no parent bom_line
  SELECT pi.id AS instance_id, pi.part_definition_id, pi.instance_index, pi.serial_number,
         pd.part_number, pd.description, pd.drawing_svg, pd.default_make_buy, pd.itar_flag,
         s.code AS subsystem_code, s.label AS subsystem_label,
         NULL::uuid AS parent_instance_id, NULL::numeric AS qty, NULL::text AS ref_designator,
         0 AS depth, ARRAY[pi.id] AS path
  FROM turion_satellite.part_instances pi
  JOIN turion_satellite.part_definitions pd ON pd.id = pi.part_definition_id
  LEFT JOIN turion_satellite.subsystems s ON s.id = pd.subsystem_id
  WHERE pi.satellite_id = $1
    AND NOT EXISTS (SELECT 1 FROM turion_satellite.bom_lines bl
                    WHERE bl.child_part_instance_id = pi.id
                      AND bl.parent_part_instance_id IS NOT NULL)
  UNION ALL
  SELECT c_pi.id, c_pi.part_definition_id, c_pi.instance_index, c_pi.serial_number,
         c_pd.part_number, c_pd.description, c_pd.drawing_svg, c_pd.default_make_buy, c_pd.itar_flag,
         s.code, s.label,
         t.instance_id, bl.qty, bl.ref_designator,
         t.depth + 1, t.path || c_pi.id
  FROM tree t
  JOIN turion_satellite.bom_lines bl ON bl.parent_part_instance_id = t.instance_id
  JOIN turion_satellite.part_instances c_pi ON c_pi.id = bl.child_part_instance_id
  JOIN turion_satellite.part_definitions c_pd ON c_pd.id = c_pi.part_definition_id
  LEFT JOIN turion_satellite.subsystems s ON s.id = c_pd.subsystem_id
  WHERE bl.satellite_id = $1
    AND bl.status = 'released'
    AND c_pi.id <> ALL(t.path)  -- defensive cycle guard
)
SELECT * FROM tree ORDER BY depth, part_number;
```
Wrap server-side in a `{parent: id, children: [...]}` tree via JS reduce on `parent_instance_id`. Returns ~183 rows for SAT-003 — fast.

### Pattern 4: Recursive cost rollup at an instance
**What:** New endpoint `GET /api/analytics/cost-rollup/instance/:instId` returning `{self_cost, subtree_cost, by_descendant: [...]}`. Sums `make_costs.total_cost_usd` (for make subtree leaves) and `buy_costs.invoiced_value_usd ?? po_value_usd ?? quoted_unit_cost_usd * ordered_qty` (for buy subtree leaves), keyed off the SAME `WITH RECURSIVE` tree as Pattern 3.
**Why surface separately from existing rollup:** Existing `/api/analytics/cost-rollup/:satId` returns per-subsystem totals only. For drill-down UX we need "what does this PCDU subtree cost?" answered at an instance node.
**SQL skeleton:**
```sql
WITH RECURSIVE subtree AS (
  SELECT $1::uuid AS instance_id, 0 AS depth
  UNION ALL
  SELECT c_pi.id, st.depth + 1
  FROM subtree st
  JOIN turion_satellite.bom_lines bl ON bl.parent_part_instance_id = st.instance_id
  JOIN turion_satellite.part_instances c_pi ON c_pi.id = bl.child_part_instance_id
  WHERE bl.satellite_id = $2 AND bl.status = 'released'
),
costs AS (
  SELECT st.instance_id, st.depth,
         COALESCE(mc.total_cost_usd, 0) AS make_cost,
         COALESCE(bc.invoiced_value_usd, bc.po_value_usd,
                  bc.quoted_unit_cost_usd * COALESCE(bc.ordered_qty, 1), 0) AS buy_cost
  FROM subtree st
  LEFT JOIN turion_satellite.part_instances pi ON pi.id = st.instance_id
  LEFT JOIN turion_satellite.make_costs_current mc ON mc.part_instance_id = pi.id
  LEFT JOIN turion_satellite.buy_costs_current  bc ON bc.part_instance_id = pi.id
)
SELECT
  (SELECT make_cost + buy_cost FROM costs WHERE depth = 0)                          AS self_cost_usd,
  SUM(make_cost + buy_cost) FILTER (WHERE depth > 0)                                AS descendants_cost_usd,
  SUM(make_cost + buy_cost)                                                          AS subtree_cost_usd
FROM costs;
```
Returns JSON `{self_cost_usd, descendants_cost_usd, subtree_cost_usd}` as Decimal strings (use `lib/money.ts` shim same as existing cost-rollup route).

### Pattern 5: Integrations side panel (SF→NS→Arena→MES)
**What:** Read-only panel on `cost-detail.html` and `instance.html` that surfaces the 4 cross-system FKs (`sales_order_id` / `ns_invoice_id` / `arena_doc_id` / `mes_work_order_id`) on the current `part_instance` AND the `ns_invoice_id` on its `vendor_orders` AND the `sales_order_id` on its `procurement_requests`.
**Data source:** All FK columns already exist (migration 008, seeded by migration 014). Backend extension: change `GET /api/satellites/:satId/instances/:instId` to include these 4 fields in the response (currently `pi.*` already returns them — verify by reading the column list from `instances.ts:88-94`; the `pi.*` wildcard already pulls them, so frontend can use the data today **if it knew to look**).
**UI shape (vanilla HTML, mirror `instance.html` panel style):**
```html
<div class="panel">
  <div class="panel-header">
    <strong>Cross-system links</strong>
    <span class="subtitle" id="xsysMeta">Updated <span class="mono">[cross_links_updated_at]</span></span>
  </div>
  <div style="padding:12px;">
    <div class="cost-row"><span class="cost-row-label">Salesforce SO</span>
      <span class="cost-row-value">[sales_order_id or "—"] <a>→</a></span></div>
    <div class="cost-row"><span class="cost-row-label">NetSuite invoice</span>
      <span class="cost-row-value">[ns_invoice_id or "—"] <a>→</a></span></div>
    <div class="cost-row"><span class="cost-row-label">Arena doc</span>
      <span class="cost-row-value">[arena_doc_id or "—"] <a>→</a></span></div>
    <div class="cost-row"><span class="cost-row-label">MES work order</span>
      <span class="cost-row-value">[mes_work_order_id or "—"] <a>→</a></span></div>
  </div>
</div>
```
Place into shared module `satellite-render.js` as `renderIntegrationsPanel(inst)` so both `cost-detail.html` and `instance.html` consume it.

### Anti-Patterns to Avoid
- **Frontend framework introduction:** Phase 27 just shipped vanilla; mixing in React mid-project doubles deploy complexity for zero user benefit.
- **Per-row INSERT in migrations:** Use SET-based `INSERT … SELECT … WHERE NOT EXISTS` (mig 011/012/013/016 pattern). Avoid `FOR loops` unless wiring requires variable resolution like mig 016 Block 4.
- **Hardcoded vendor / spec values in frontend:** All vendor names, status enums, subsystem labels, spec keys come from backend (memory anchor: `feedback_turion_no_frontend_hardcoding.md`, restated 2026-05-09).
- **Computing `parent_part_instance_id IS NULL` for "root":** That field is nullable + most rows ARE NULL when no BOM exists. Roots are instances that **are not referenced as `child_part_instance_id`**. See `bom.html:72-74` for the working pattern.
- **Re-running migration 013:** Don't. Author migration 019 as a separate file (same logic, broader scope) to keep migration history clean and re-runnable.
- **Adding tree state to URL:** Trees expand/collapse via in-memory state; don't put it in `?expanded=a,b,c`. Default to expanded for depth ≤2, lazy-load deeper.
- **Reusing `WITH RECURSIVE` without cycle guard:** Migration 016 → 018 don't introduce cycles in practice, but the `c_pi.id <> ALL(t.path)` check is cheap insurance against future hand-edits.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| BOM tree traversal in JS | Recursive client-side walk over flat `bom_lines[]` | `WITH RECURSIVE` server-side endpoint | 183 rows × N round-trips on client kills latency; Postgres CTE is one query |
| Decimal money arithmetic | `parseFloat` on `total_cost_usd` | `decimal.js` via `lib/money.ts` (`sum`, `diff`, `toMoney`) | Existing pattern; `parseFloat` introduces float drift on $1M+ rollups |
| Cost rollup cache | Pre-compute table | Compute on read in CTE | 183-node tree resolves <50ms; caching adds invalidation work for no speedup |
| Idempotency tracking | Custom `migrations_applied` table | `WHERE NOT EXISTS` + sentinel comment (`<!-- v=018 -->`) | Already the project's blessed idempotency pattern (mig 011/012/013/016) |
| Tree node positioning math | D3.js / dagre-d3 | Plain CSS `<details>`/`<summary>` + indentation | Tree is small; collapsible HTML semantics + a:hover already work; no new deps |
| Auth header on new endpoints | Re-implement | `requireAuth` middleware (`backend/src/middleware/auth.ts`) | Every route uses it; never skip |
| JWT validation | Decode + verify manually | Already done in `requireAuth` | Pattern set in Phase 2 |
| Cross-system link click handlers | Custom modal | `<a href>` deep-linking into `turionspace.zietra.com` legacy pages | Salesforce/NetSuite/Arena/MES UIs already exist on the demo site under `/sales/account`, `/finance/general-ledger`, `/records/:type/:id`, `/manufacturing/work-order/:id` — link out, don't re-render |

**Key insight:** Every problem in this phase has a battle-tested precedent in this repo. The job is **mechanical replication**, not invention.

## Common Pitfalls

### Pitfall 1: Picking parents that already have children
**What goes wrong:** Add 7 sub-components for `EPS-PCDU-250W` — but mig 016 already did this. Result: `ON CONFLICT` silently no-ops, but the migration looks "successful" while seeding nothing.
**Why it happens:** Without auditing existing `bom_lines.parent_part_instance_id`, you can't see who's already a parent.
**How to avoid:** Before drafting Block 2 of migration 018, run the candidate query below against prod and exclude any parent that already returns ≥1 child:
```sql
SELECT p_pd.part_number AS parent, COUNT(*) AS child_count
FROM turion_satellite.bom_lines bl
JOIN turion_satellite.part_instances p_pi ON p_pi.id = bl.parent_part_instance_id
JOIN turion_satellite.part_definitions p_pd ON p_pd.id = p_pi.part_definition_id
WHERE bl.satellite_id = '24587565-b15b-42ce-b590-87ecf9b6bb99'
GROUP BY p_pd.part_number ORDER BY child_count DESC;
```
**Warning signs:** Migration 018 commit count says "inserted 50 rows" but `bom_lines` row count on SAT-003 didn't grow by 50. Compare counts pre- and post-migration.

### Pitfall 2: New part_definitions miss `default_make_buy` and break `procurement_requests`
**What goes wrong:** Phase 24-03 introduced a hard gate (`procurement-requests.ts:53-65`): "procurement requires APPROVED make-vs-buy decision with `decision='buy'`". If a new part lacks `default_make_buy`, mig 019 Block 1 inserts `decision=NULL` → constraint violation.
**Why it happens:** Easy to forget when copy-pasting the migration 016 VALUES list.
**How to avoid:** Every row in mig 018 Block 2 MUST set `default_make_buy` to `'make'` or `'buy'` (no NULLs). Sub-component default is usually `'buy'` (PCBs, capacitors, FPGAs are COTS); harnesses + bracket-style internal hardware are `'make'`. Follow mig 016's classification: PCB/CAP/RELAY/MOSFET/FPGA/DSUB = buy; HARNESS = make.
**Warning signs:** Mig 019 Block 1 fails with `null value in column "decision" violates not-null constraint`.

### Pitfall 3: `make_costs` requires either template OR actual via CHECK
**What goes wrong:** Inserting `make_costs` with BOTH `part_definition_id` AND `part_instance_id` AND `satellite_id` violates `chk_make_costs_template_or_actual` (referenced in mig 013 line 56-60).
**Why it happens:** Template = `part_definition_id NOT NULL, part_instance_id NULL, satellite_id NULL`. Actual = `part_instance_id NOT NULL, satellite_id NOT NULL`. Mixing fields = CHECK fail.
**How to avoid:** Read `migrations/013_densify_decisions_manufacturing_procurement.sql:55-66` for the exact CHECK shape. Mirror Block 3a (template) and Block 3b (actual) byte-for-byte.
**Warning signs:** `ERROR: new row for relation "make_costs" violates check constraint "chk_make_costs_template_or_actual"`.

### Pitfall 4: Cross-system FK target rows don't exist
**What goes wrong:** Mig 014 seeded cross-system FK values pointing at `turion.sales_orders`, `turion.invoices`, etc. New part_instances seeded by mig 018 have these FKs as NULL. If you assume "all instances have SF/NS/Arena/MES" in the UI, the panel goes empty for 50+ new instances.
**Why it happens:** Mig 014 was scoped to existing Phase 25 instances; new mig-018 instances are orphans of the cross-system seed.
**How to avoid:** Either (a) re-run sync after mig 018 against legacy turion data (use `POST /api/integration/sync-sales-order/:soId` with `satelliteId`), OR (b) accept that new sub-component instances DON'T have cross-system links (board-level COTS components typically wouldn't) and render "—" in the UI. **Recommended: option (b)** — board-level components legitimately lack SF/NS/Arena/MES at the per-instance grain. Surface them at the **parent assembly** instance instead (PCDU-250W has cross-system links; PCDU-CAP-BANK doesn't and shouldn't).
**Warning signs:** All 4 cross-system fields on PCB/CAP/RELAY etc. show "—" — that's CORRECT, not a bug.

### Pitfall 5: Recursive CTE returns duplicates when parts have multiple parents
**What goes wrong:** Some sub-components (e.g., `STR-FASTENER-M4-TI`) have multiple instances at instance_index 1, 2, 3, 4 attached to different parents (per mig 012 Block 10). Without `c_pi.id <> ALL(t.path)`, a fastener visited from two paths returns 2 tree rows for the same node.
**Why it happens:** `bom_lines` is a many-to-many at the part_instance level; multiple `bom_lines` rows can point at the same child if hand-wired.
**How to avoid:** Always include `c_pi.id <> ALL(t.path)` in WITH RECURSIVE. Verify on SAT-003 that the row count is stable across runs.
**Warning signs:** Tree depth exceeds 8 (real depth is 4-5); duplicate nodes appear under siblings.

### Pitfall 6: `cost_rollup_v` is per-subsystem only
**What goes wrong:** Phase 28-04 (instance-level cost rollup) tries to JOIN `cost_rollup_v` and gets aggregate-only rows — no `part_instance_id` column.
**Why it happens:** `cost_rollup_v` was defined in migration 005 with `GROUP BY subsystem`. It's the wrong granularity.
**How to avoid:** Write fresh CTE in `cost-rollup.ts` per Pattern 4 above. Don't try to extend the existing view; add a NEW route handler.
**Warning signs:** SQL error about missing `part_instance_id` on `cost_rollup_v`, OR rollup numbers are subsystem-wide instead of subtree-only.

### Pitfall 7: `pgbouncer transaction mode` strips search_path mid-transaction
**What goes wrong:** Multi-statement transactions in migration 019 reference unqualified table names. After the first statement, pgbouncer may rotate the underlying session, losing `SET search_path`.
**Why it happens:** Supabase pooler uses transaction-mode pgbouncer (verified at `aws-1-us-east-2.pooler.supabase.com:6543`).
**How to avoid:** Fully-qualify EVERY table name in migration 018 + 019 (`turion_satellite.part_definitions`, never bare `part_definitions`). This is the pattern mig 008, 013, 016 already follow. Drop the `SET search_path` line if it gives false security — qualified names are the real defense.
**Warning signs:** `relation "part_definitions" does not exist` on the 2nd or 3rd statement of an otherwise-correct migration.

### Pitfall 8: BOM tree page tries to fetch drawings for 100+ nodes synchronously
**What goes wrong:** Naïve `await loadPartCad(id)` for every tree node serialized → 30+ second page load.
**Why it happens:** `satelliteCad.loadPartCad` fetches from `/api/parts/:id/drawing` per call.
**How to avoid:** The bom_lines response ALREADY includes `child_drawing_svg` (see `bom.ts:18-19`). Use it inline. For the new tree endpoint, JOIN `part_definitions.drawing_svg` into the CTE payload. Frontend should render the SVG directly from the tree response, NEVER refetch per-node.
**Warning signs:** Network panel shows 100+ requests to `/api/parts/:id/drawing` on bom.html load.

### Pitfall 9: Recursive cost rollup misses parts that have BOTH make_costs and buy_costs
**What goes wrong:** A part definition can have BOTH make_costs and buy_costs rows (template can exist for both even if decision is one). If you naively `COALESCE(make, buy)`, you double-count or lose data.
**Why it happens:** The make-vs-buy decision (`make_buy_decisions`) is the source of truth for which side to sum, not row presence.
**How to avoid:** In Pattern 4 SQL, JOIN `make_buy_decisions` and use `CASE WHEN d.decision = 'make' THEN make_cost ELSE buy_cost END`. Treat absent decisions as "skip" not "sum both."
**Warning signs:** Subtree cost exceeds the per-subsystem rollup for the same scope.

## Code Examples

Verified patterns from the codebase. Each is the literal shape to mirror.

### Idempotent INSERT … SELECT … WHERE NOT EXISTS (mig 012:72-82)
```sql
INSERT INTO part_instances (satellite_id, part_definition_id, instance_index, serial_number)
SELECT '24587565-b15b-42ce-b590-87ecf9b6bb99',
       pd.id,
       1,
       'SN-' || pd.part_number || '-001'
FROM turion_satellite.part_definitions pd
WHERE NOT EXISTS (
  SELECT 1 FROM turion_satellite.part_instances pi
  WHERE pi.satellite_id = '24587565-b15b-42ce-b590-87ecf9b6bb99'
    AND pi.part_definition_id = pd.id
);
```
Source: `migrations/012_densify_instances_and_bom.sql:72-82` (HIGH).

### bom_lines wiring inside DO block (mig 016:436-484)
```sql
DO $do$
DECLARE
  v_sat   UUID := '24587565-b15b-42ce-b590-87ecf9b6bb99';
  v_parent UUID; v_child  UUID;
  v_pn TEXT; v_qty NUMERIC; v_ref TEXT;
BEGIN
  SELECT pi.id INTO v_parent
    FROM turion_satellite.part_instances pi
    JOIN turion_satellite.part_definitions pd ON pd.id = pi.part_definition_id
   WHERE pi.satellite_id = v_sat
     AND pd.part_number = 'PARENT-PN' AND pi.instance_index = 1;

  IF v_parent IS NULL THEN
    RAISE EXCEPTION 'PARENT-PN instance on SAT-003 not found — Phase 26 mig 012 must run first';
  END IF;

  FOR v_pn, v_qty, v_ref IN VALUES
      ('CHILD-A', 1::NUMERIC, 'A1'),
      ('CHILD-B', 4::NUMERIC, 'B1-B4'),
      ...
  LOOP
    SELECT pi.id INTO v_child
      FROM turion_satellite.part_instances pi
      JOIN turion_satellite.part_definitions pd ON pd.id = pi.part_definition_id
     WHERE pi.satellite_id = v_sat
       AND pd.part_number = v_pn AND pi.instance_index = 1;

    IF v_child IS NOT NULL THEN
      INSERT INTO turion_satellite.bom_lines
        (satellite_id, parent_part_instance_id, child_part_instance_id, qty, uom, status, ref_designator)
      SELECT v_sat, v_parent, v_child, v_qty, 'EA', 'released', v_ref
      WHERE NOT EXISTS (
        SELECT 1 FROM turion_satellite.bom_lines
         WHERE parent_part_instance_id = v_parent
           AND child_part_instance_id = v_child
      );
    END IF;
  END LOOP;
END $do$;
```
Source: `migrations/016_pcdu_3d_drawing_and_subcomponents.sql:436-484` (HIGH).

### Specifications JSONB shape (mig 011 + mig 016)
```json
{
  "weight_grams": 85,
  "dimensions_mm": {"length":160,"width":110,"height":1.6},
  "material": "FR4 6-layer / immersion gold",
  "operating_temp_c_min": -40,
  "operating_temp_c_max": 85,
  "vendor_part_number": "AAC-CLYDE-PCDU-PCB-MAIN-A",
  "tolerance": "±0.1mm",
  "flight_heritage": "TRL 9 (this design across 8 missions)"
}
```
Required keys per `backend/src/lib/spec-keys.ts` (COMMON_SPEC_KEYS). Optional subsystem-specific keys (e.g., `capacitance_uf`, `rds_on_mohm`, `pin_count`) per SUBSYSTEM_SPEC_HINTS. Source: mig 011 lines 23-58 (HIGH).

### Express route — read-only with auth (cost-rollup.ts:28-78)
```typescript
router.get('/:satId', requireAuth, async (req, res) => {
  const { satId } = req.params;
  try {
    const bySub = await query<RollupRow>(`
      SELECT subsystem_code, subsystem_label,
             make_total_usd, buy_invoiced_usd, buy_committed_usd, instance_count
      FROM turion_satellite.cost_rollup_v
      WHERE satellite_id = $1
      ORDER BY subsystem_code`,
      [satId]);
    const totals = {
      make_total_usd:    sum(...bySub.map(r => r.make_total_usd)),
      buy_invoiced_usd:  sum(...bySub.map(r => r.buy_invoiced_usd)),
      buy_committed_usd: sum(...bySub.map(r => r.buy_committed_usd)),
    };
    res.json({ satellite_id: satId, by_subsystem: bySub, totals });
  } catch (err: any) {
    console.error('[cost-rollup] get failed:', err);
    res.status(500).json({ error: 'Failed to compute cost rollup' });
  }
});
```
Source: `backend/src/routes/cost-rollup.ts:28-78` (HIGH).

### Frontend: panel + skeleton + render-from-API (instance.html:122-128)
```html
<div class="panel">
  <div class="panel-header"><span><strong>Cost</strong> <span class="subtitle">· per unit</span></span>
    <span id="costConfidence" class="subtitle"></span></div>
  <div id="costPanel" style="padding:6px 12px;">
    <div class="skeleton" style="height:140px;"></div>
  </div>
</div>
```
Source: `turion-space-demo/satellite/instance.html:122-127` (HIGH).

### Frontend: cross-link patterns (cost-detail.html breadcrumb + nav sync)
```js
const q = `?sat=${encodeURIComponent(satId)}`;
document.getElementById('navWo').href = `work-orders.html${q}`;
document.getElementById('navBom').href = `bom.html${q}`;
document.getElementById('navKan').href = `kanban.html${q}`;
```
Source: `cost-detail.html:101-104` (HIGH).

## Candidate parent parts for BOM densification

Based on the prompt's audit (183 instances, 87 distinct definitions, 19 non-leaf, 164 leaf) and the seed lists in migration 012, the following are the **strongest candidates** for densification. Sub-component proposals mirror the PCDU 7-part pattern (PCB + capacitor + active component + connector + harness + housing/structural element).

### Recommended target list (~20 parents → ~120 child seeds)

| # | Parent PN | Subsystem | Proposed 5-8 children (sub-component names follow `PARENT-PN-{SUFFIX}` convention) |
|---|-----------|-----------|-------------------------------------------------------------------------------------|
| 1 | `EPS-BATTERY-LIION-100W` | EPS | `…-CELL-18650` (×8 buy), `…-BMS-PCB` (1 buy), `…-HOUSING-AL` (1 make), `…-HARNESS` (1 make), `…-CONNECTOR` (1 buy), `…-THERMAL-PAD` (1 buy) |
| 2 | `EPS-MPPT-CTRL` | EPS | `…-PCB-MAIN` (1 buy), `…-MOSFET-PAIR` (2 buy), `…-INDUCTOR` (1 buy), `…-CAPACITOR` (1 buy), `…-HEATSINK` (1 make), `…-CONNECTOR` (1 buy) |
| 3 | `EPS-LATCHING-RELAY-X4` | EPS | `…-COIL` (×4 buy), `…-CONTACTS` (×4 buy), `…-HOUSING` (1 make), `…-DIODE-SUPP` (1 buy) |
| 4 | `EPS-SOLAR-WING-DEPLOY` | EPS | `…-HINGE` (×2 make), `…-SPRING-ACT` (×2 buy), `…-LATCH-MECH` (1 make), `…-HARNESS` (1 make), `…-DAMPER` (1 buy) |
| 5 | `ADCS-STAR-TRACKER-A` | ADCS | `…-CMOS-SENSOR` (1 buy), `…-LENS-ASSY` (1 buy), `…-BAFFLE` (1 make), `…-PROCESSOR` (1 buy), `…-HARNESS` (1 make), `…-HOUSING` (1 make) |
| 6 | `ADCS-RW-MEDIUM-A` | ADCS | `…-MOTOR-BLDC` (1 buy), `…-FLYWHEEL` (1 make), `…-BEARING` (×2 buy), `…-CONTROLLER-PCB` (1 buy), `…-HOUSING` (1 make), `…-HARNESS` (1 make) |
| 7 | `ADCS-IMU-MEMS-A` | ADCS | `…-GYRO-CHIP` (1 buy), `…-ACCEL-CHIP` (1 buy), `…-DSP` (1 buy), `…-PCB` (1 buy), `…-HOUSING` (1 make), `…-CONNECTOR` (1 buy) |
| 8 | `ADCS-OBC-BOARD-A` | ADCS | `…-FPGA` (1 buy), `…-DRAM` (1 buy), `…-IO-CONN` (1 buy), `…-PWR-REG` (1 buy), `…-PCB` (1 buy), `…-HARNESS` (1 make) |
| 9 | `PROP-TANK-PROP-A` | PROP | `…-TANK-SHELL` (1 make), `…-BLADDER` (1 buy), `…-FILL-PORT` (1 buy), `…-TEMP-SENSOR` (1 buy), `…-BRACKET-MOUNT` (1 make) |
| 10 | `PROP-VALVE-LATCH-A` | PROP | `…-COIL` (1 buy), `…-ARMATURE` (1 make), `…-HOUSING` (1 make), `…-SPRING` (1 buy), `…-CONNECTOR` (1 buy), `…-SEAL` (1 buy) |
| 11 | `PROP-THRUSTER-MONO-A` | PROP | `…-NOZZLE` (1 make), `…-CATALYST-BED` (1 buy), `…-INJECTOR` (1 make), `…-MOUNT-BRACKET` (1 make), `…-HEATER` (1 buy), `…-TEMP-SENSOR` (1 buy) |
| 12 | `PAY-FOCAL-PLANE-A` | PAY | `…-CCD-SENSOR` (1 buy), `…-PELTIER-COOLER` (1 buy), `…-HEATSINK` (1 make), `…-FILTER-WHEEL` (1 buy), `…-HARNESS` (1 make), `…-HOUSING` (1 make) |
| 13 | `PAY-TELESCOPE-OTA` | PAY | `…-PRIMARY-MIRROR` (1 buy), `…-SECONDARY-MIRROR` (1 buy), `…-METERING-STRUT` (×3 make), `…-LIGHT-SHIELD` (1 make), `…-MOUNT-RING` (1 make) |
| 14 | `PAY-PROCESSOR-FPGA` | PAY | `…-FPGA-CHIP` (1 buy), `…-DRAM` (×2 buy), `…-PCB` (1 buy), `…-CONN-LVDS` (1 buy), `…-HARNESS` (1 make) |
| 15 | `COMM-RADIO-SBAND-A` | COMM | `…-RF-BOARD` (1 buy), `…-POWER-AMP` (1 buy), `…-LO-FILTER` (1 buy), `…-XTAL-OSC` (1 buy), `…-HOUSING` (1 make), `…-CONNECTOR` (1 buy) |
| 16 | `COMM-RADIO-XBAND-A` | COMM | `…-RF-BOARD` (1 buy), `…-POWER-AMP` (1 buy), `…-WAVEGUIDE-STUB` (1 make), `…-XTAL-OSC` (1 buy), `…-HOUSING` (1 make), `…-CONNECTOR` (1 buy) |
| 17 | `COMM-ANT-XBAND-HG` | COMM | `…-DISH` (1 make), `…-FEED` (1 buy), `…-STRUT` (×3 make), `…-GIMBAL` (1 buy), `…-HARNESS` (1 make) |
| 18 | `CDH-OBC-MAIN-A` | CDH | `…-FPGA` (1 buy), `…-DRAM` (×2 buy), `…-FLASH` (1 buy), `…-IO-CONN` (1 buy), `…-PCB` (1 buy), `…-HARNESS` (1 make) |
| 19 | `CDH-OBC-BACKUP-A` | CDH | `…-FPGA` (1 buy), `…-DRAM` (1 buy), `…-FLASH` (1 buy), `…-PCB` (1 buy), `…-CONN-LVDS` (1 buy), `…-HARNESS` (1 make) |
| 20 | `TCS-RADIATOR-PANEL-A` | TCS | `…-PANEL-AL` (1 make), `…-COATING-WHITE` (1 buy), `…-MOUNT-BRACKET` (×2 make), `…-TEMP-SENSOR` (×2 buy) |
| 21 | `TCS-HEATER-PATCH-A` | TCS | `…-HEATING-ELEMENT` (1 buy), `…-KAPTON-LAYER` (1 buy), `…-HARNESS` (1 make), `…-THERMOSTAT` (1 buy) |

**Numbers:** 21 parents × ~6 avg children = **~126 new `part_definitions`** + ~126 new `part_instances` + ~126 new `bom_lines` on SAT-003.

**Final-shape projection:**
- part_definitions: 80 (today) + ~126 = **~206**
- part_instances on SAT-003: 183 (today) + ~126 = **~309**
- bom_lines on SAT-003: ~93+63+7=163 (today, after mig 012+016) + ~126 = **~289**
- Non-leaf instances on SAT-003: 19 (today) + 21 (new densified parents become non-leaf) = **~40**

**Suggested split for planner:** Split mig 018 into **2-3 files by subsystem cluster** (e.g., 018a EPS+ADCS, 018b PROP+PAY+COMM, 018c CDH+TCS) — keeps each file ≤25KB like mig 016. Each file is independently idempotent. Or keep one giant 018 file (mig 011 is 173KB and works). **Recommend split for review velocity**; the planner can decide.

## Data coverage audit — what's missing today

Based on the codebase and prompt-stated SAT-003 metrics. Confidence: HIGH for migration scope, MEDIUM for live DB counts (couldn't psql in sandbox; trust prompt numbers).

### Parts on SAT-003 with COMPLETE Phase 26 coverage
Every `part_definition` that was on SAT-003 BEFORE migration 016 ran has:
- ✅ `specifications` JSONB populated (mig 011 covered all 80 baseline parts)
- ✅ `drawing_svg` populated (mig 011 covered all 80 baseline parts; mig 017 redrew 79 of them in cabinet projection)
- ✅ `default_make_buy`, `itar_flag` set (Phase 21 schema)
- ✅ ≥1 `part_instance` on SAT-003 (mig 012 Block 1a guaranteed)
- ✅ ≥1 `bom_line` either as parent or child (mig 012 Blocks 2-10)
- ✅ `make_buy_decisions` row with `decision_status='approved'`, rationale ≥20 chars (mig 013 Block 1)
- ✅ For make-parts: ≥1 `work_orders` with 6 `build_steps` (mig 013 Block 2)
- ✅ For make-parts: `make_costs` template + actual rows (mig 013 Block 3)
- ✅ For buy-parts: 1 `procurement_requests` row, status='ordered'; ~50% also have `vendor_orders` (mig 013 Block 4)
- ✅ For buy-parts: `buy_costs` template + actual with full RFQ→quoted→PO→invoiced lifecycle (mig 013 Block 5)

### Parts on SAT-003 with INCOMPLETE coverage (Phase 28-02 targets)
1. **The 7 PCDU children seeded by migration 016** (`EPS-PCDU-PCB-MAIN`, `EPS-PCDU-CAP-BANK`, `EPS-PCDU-RELAY-LATCH`, `EPS-PCDU-MOSFET-MOD`, `EPS-PCDU-FPGA-CTRL`, `EPS-PCDU-DSUB-25`, `EPS-PCDU-HARNESS-INT`):
   - ✅ `specifications`, `drawing_svg`, `default_make_buy`, `itar_flag` populated
   - ✅ `part_instances` on SAT-003 (mig 016 Block 3)
   - ✅ `bom_lines` wired under PCDU (mig 016 Block 4)
   - ❌ `make_buy_decisions` — NONE (mig 013 ran BEFORE mig 016)
   - ❌ `work_orders` + `build_steps` — NONE for the 1 make-part (HARNESS-INT)
   - ❌ `make_costs` template/actual — NONE
   - ❌ `procurement_requests` — NONE for the 6 buy-parts
   - ❌ `vendor_orders` — NONE
   - ❌ `buy_costs` template/actual — NONE

2. **The ~126 new sub-components seeded by migration 018** — same gaps as above.

### Mig 019 fix
Re-apply mig 013's Blocks 1-5 with the SAME `WHERE NOT EXISTS` shape. The set-difference automatically backfills the 7 + 126 = **~133 parts**. Wrap in `BEGIN/COMMIT`. Idempotent — running twice = 0 rows changed.

## UI page inventory + Phase 28 work plan

| Page | Lines | Status today | Phase 28 action |
|------|-------|--------------|------------------|
| `index.html` | 123 | ✅ Constellation list, KPIs, satellite cards | None |
| `sat.html` | 308 | ✅ Subsystem-region click → drawer with parts | None |
| `parts.html` | 149 | ✅ Catalog table with CAD thumbnails | None (already excellent) |
| `part.html` | 927 | ✅ Phase 27 callouts overlay + sub-parts gallery + workflow viz + cost + materials + orders | **MINOR ADD:** integrations badge ("1 SF, 0 NS, 1 Arena, 0 MES" summary tag); link the parent-instance's cross-system FKs from `process` payload |
| `instance.html` | 458 | ✅ **GOLD STANDARD** (commit 42552aa) — hero CAD, parent breadcrumb, spec sheet, cost, lifecycle timeline, BOM children gallery, work orders with inline steps, sibling instances | **ADD 2 PANELS:** (1) cross-system links panel (SF/NS/Arena/MES with `cross_links_updated_at`); (2) recursive subtree cost rollup ("This instance: $X · Subtree total: $Y across N descendants") |
| `bom.html` | 150 | ⚠️ **REPLACE** — current is a hand-laid 3-level SVG showing only "first 5 instances per subsystem". Not a tree. | **REWRITE:** recursive HTML `<details>`/`<summary>` tree powered by new `/api/satellites/:satId/bom/tree` endpoint. Each node: drawing thumbnail + part_number + qty + ref_designator + click → `instance.html`. Default-expand depth ≤2; lazy-expand deeper. |
| `cost.html` | 229 | ✅ Per-satellite + constellation rollup table; per-subsystem rollup w/ traffic-light deltas | None (already drives users to `cost-detail.html`) |
| `cost-detail.html` | 331 | ✅ Make sheet + buy sheet (both variances) + decision panel + Δ vs prev sat + cost history | **ADD 1 PANEL:** integrations side panel (4-FK card with deep-links to legacy `turionspace.zietra.com` SF/NS/Arena/MES pages) — placed between decision panel and prev-sat delta. **No make-cost / buy-cost rewrite** — already excellent. |
| `work-orders.html` | 117 | ✅ Per-sat WO table, "new WO" modal | None |
| `work-order.html` | 168 | ✅ Single WO view + step sign-off | None |
| `kanban.html` | 129 | ✅ Lifecycle stage columns with filter | None |
| `login.html` | 60 | ✅ Magic link | None |

### New shared helper (place in `satellite-render.js` or new `satellite-integrations.js`)
```js
window.satelliteRender.renderIntegrationsPanel = function(inst, prefix = '') {
  const link = (kind, id) => id
    ? `<a href="https://turionspace.zietra.com/${linkPath(kind, id)}" target="_blank">${esc(id.slice(0,16))} ↗</a>`
    : '—';
  return `
    <div class="panel" style="margin-bottom:18px;">
      <div class="panel-header">
        <strong>Cross-system links</strong>
        <span class="subtitle">${inst.cross_links_updated_at ? 'updated ' + fmtDate(inst.cross_links_updated_at) : 'never synced'}</span>
      </div>
      <div style="padding:12px;">
        <div class="cost-row"><span class="cost-row-label">Salesforce SO</span><span class="cost-row-value">${link('sales', inst.sales_order_id)}</span></div>
        <div class="cost-row"><span class="cost-row-label">NetSuite invoice</span><span class="cost-row-value">${link('netsuite', inst.ns_invoice_id)}</span></div>
        <div class="cost-row"><span class="cost-row-label">Arena doc</span><span class="cost-row-value">${link('arena', inst.arena_doc_id)}</span></div>
        <div class="cost-row"><span class="cost-row-label">MES work order</span><span class="cost-row-value">${link('mes', inst.mes_work_order_id)}</span></div>
      </div>
    </div>`;
};
```
`linkPath` maps to existing turion-space-demo routes (`/sales/account/:id`, `/finance/invoice/:id`, `/records/arena-doc/:id`, `/manufacturing/work-order/:id`).

### New backend route additions (`backend/src/routes/`)
1. **`bom.ts`** — add `GET /:satId/tree` returning hierarchical JSON (Pattern 3 SQL).
2. **`cost-rollup.ts`** — add `GET /instance/:instId?sat=<satId>` returning `{self_cost_usd, descendants_cost_usd, subtree_cost_usd, by_descendant}` (Pattern 4 SQL). Mount at `/api/analytics/cost-rollup/instance/:instId`.
3. **`instances.ts`** — no schema change; `pi.*` wildcard already pulls all 4 FK columns + `cross_links_updated_at`. Frontend just needs to USE them.

No new tables, no new columns. Migration count for Phase 28: **2 SQL files** (018, 019).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-row INSERT in DO loops | Set-based `INSERT … SELECT … WHERE NOT EXISTS` | Mig 012+ | 10-50× faster on cold start; cleaner re-run logic |
| Flat top-down PCDU drawing | Cabinet-projection 3-face SVG with `<!-- v=NNN -->` sentinel | Mig 016 (Phase 27) | Drill-down "wow" + idempotent re-renders |
| Hardcoded subsystem labels in HTML | Backend `/api/subsystems` + `/api/lifecycle-stages` lookups | Phase 27 (memory anchor) | Worldwide-release safe; no per-frontend literals |
| Auto-create `part_definitions` in integration sync | `WHERE part_number = ANY(...)` strict match only | Phase 25 (mig 008) | Prevents Phase 26 80/80 coverage contract violations |
| Per-subsystem cost-only rollup | Per-instance recursive subtree (Phase 28-NEW) | This phase | Surfaces cost at every drill-down level |

**Deprecated/outdated:**
- `bom.html` 3-level hand-laid SVG: replace with recursive tree (Phase 28).
- Reusing the `cost_rollup_v` view for instance-level rollup: doesn't have the granularity; build fresh CTE.

## Open Questions

1. **Should we densify EVERY non-leaf "small" subsystem instance, or only top-tier 20-25?**
   - What we know: 19 non-leaf today; 21 candidates listed (PCDU already done = #20 effectively). Stretch list could add another ~15 (`COMM-ANT-SBAND-PATCH`, `COMM-RF-AMP-XBAND`, `COMM-DIPLEXER-S`, etc.).
   - What's unclear: User said "~15-25" — does that mean 15-25 NEW or 15-25 TOTAL non-leaf?
   - Recommendation: Start with the 21 listed → final 40 non-leaf instances. If user wants deeper coverage, Phase 29 can add more in the same idempotent pattern.

2. **Sub-component spec JSONB depth — should we mirror PCDU's ~10-key shape or a leaner 5-key shape?**
   - What we know: Mig 016 PCDU children have ~10 keys (weight_grams, dimensions_mm, material, op temps, vendor_part_number, tolerance, flight_heritage, plus 1-2 subsystem-specific). Mig 011 baseline parts have similar 8-10 keys.
   - What's unclear: New parts could go leaner (5 keys) to save migration size.
   - Recommendation: **Match PCDU 10-key shape** verbatim. Consistency > brevity; the spec sheet UI already assumes the full key set (`instance.html:274-296`).

3. **Recursive cost rollup — propagate UP the tree from leaves, or DOWN from roots?**
   - What we know: Either direction is mathematically equivalent for total. UP-from-leaves matches accounting (only leaves have actual costs); DOWN-from-roots matches the UI drill direction.
   - What's unclear: Should the rollup show only the FROM-THIS-NODE subtree, or also the parent-trail running total?
   - Recommendation: Roll UP from leaves in SQL (lazy), return `{self_cost, subtree_cost, descendants_count}` at the queried node. Surface parent-trail running total in a SECOND endpoint or as a JS-side computation against the tree response.

4. **Integration panel — show only populated FKs or always all 4 slots?**
   - What we know: Most new instances will have 0/4 populated. Most original instances have 1-3 populated. The 4-slot grid is information-dense but mostly empty.
   - What's unclear: User experience — does empty slot reassure or frustrate?
   - Recommendation: **Always show all 4 slots** with "—" for empty. The dashboard story is "every part_instance HAS these dimensions; some are populated, some pending sync." Hiding empties hides the system architecture.

5. **bom.html — render style: tree (vertical with indent), org-chart (horizontal levels), or both?**
   - What we know: Current `bom.html` is org-chart style (horizontal, very limited). `instance.html` already has a tile-grid for BOM children (vertical, single level).
   - What's unclear: Whether users want SVG canvas or DOM tree.
   - Recommendation: **DOM tree with `<details>`/`<summary>`** — accessible, expand-all/collapse-all keyboard shortcuts work for free, search/find-in-page works. Embed the CAD drawing thumbnail inside each row. This is faster to build and friendlier to users than an SVG org chart.

6. **Migration 018 size — single file or split?**
   - What we know: Mig 011 is 173KB, mig 016 is 30KB. Both work fine. ~126 sub-components × ~1-2KB each = 150-250KB total for mig 018.
   - What's unclear: Review velocity vs. atomic transaction boundaries.
   - Recommendation: Split into 3 files (`018a` EPS+ADCS+CDH, `018b` PROP+PAY, `018c` COMM+TCS) for reviewability. Each is independently idempotent. No FK constraint forces atomic apply across files — the only inter-file dep is "mig 018 before mig 019," handled by file ordering.

## Sources

### Primary (HIGH confidence)
- `/Users/jeet/turion-satellite/migrations/016_pcdu_3d_drawing_and_subcomponents.sql` — 4-block pattern template for mig 018
- `/Users/jeet/turion-satellite/migrations/013_densify_decisions_manufacturing_procurement.sql` — 5-block pattern template for mig 019
- `/Users/jeet/turion-satellite/migrations/012_densify_instances_and_bom.sql` — instance + bom_lines idempotent INSERT patterns
- `/Users/jeet/turion-satellite/migrations/011_densify_drawings_and_specs.sql` — specifications JSONB shape (10-key schema)
- `/Users/jeet/turion-satellite/migrations/008_add_cross_system_fks.sql` — cross-schema FK columns + indexes (all already exist)
- `/Users/jeet/turion-satellite/backend/src/routes/cost-rollup.ts` — existing rollup route shape (per-subsystem)
- `/Users/jeet/turion-satellite/backend/src/routes/bom.ts` — existing flat BOM list (frontend assembles tree today)
- `/Users/jeet/turion-satellite/backend/src/routes/parts.ts` — `/process` endpoint as reference for new `/tree`
- `/Users/jeet/turion-satellite/backend/src/routes/instances.ts` — `pi.*` wildcard already exposes 4 FK columns + `cross_links_updated_at`
- `/Users/jeet/turion-satellite/backend/src/routes/integration.ts` — SF/NS/Arena/MES sync endpoints (already shipped, Phase 25)
- `/Users/jeet/turion-satellite/backend/src/app.ts` — route mount points (`/api/satellites`, `/api/parts`, `/api/analytics/cost-rollup`)
- `/Users/jeet/turion-space-demo/satellite/instance.html` — gold-standard reference UI (commit 42552aa)
- `/Users/jeet/turion-space-demo/satellite/cost-detail.html` — make/buy/decision pattern; needs integrations panel insertion
- `/Users/jeet/turion-space-demo/satellite/bom.html` — current flat 3-level org-chart; to be replaced
- `/Users/jeet/turion-space-demo/satellite/part.html` — Phase 27 callouts overlay reference + sub-parts grid
- `/Users/jeet/turion-space-demo/satellite/satellite-render.js`, `cost-render.js` — shared helper modules

### Secondary (MEDIUM confidence — prompt-stated, couldn't directly verify)
- Prompt-stated SAT-003 coverage metrics: 183 instances / 87 part_definitions / 19 non-leaf / 164 leaf
- Production DB URL pattern (AWS Secrets Manager `turion-satellite/production/database-url-NCbgX6`)

### Tertiary (LOW confidence — none for this phase)
- None. All findings are codebase- or migration-grounded.

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — every library already in production
- Architecture patterns: **HIGH** — mig 016 is the literal blueprint; mig 013 is the literal blueprint; `instance.html` is the literal blueprint
- Pitfalls: **HIGH** — every pitfall sourced from existing migration constraints + project memory feedback files
- Data coverage gaps: **HIGH** (for the 7 PCDU children — direct inference from mig 013 running before mig 016); **MEDIUM** (for new mig-018 parts — predictive, but uses same logic)
- Candidate part list: **MEDIUM** — based on subsystem patterns and migration 012's seed list. User should sanity-check the 21 picks before mig 018 lands.

**Research date:** 2026-05-10
**Valid until:** 2026-06-10 (30 days — stable, no upstream Turion Satellite framework churn expected)
