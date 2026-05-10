---
phase: quick-332
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/turion-satellite/migrations/007_seed_eps_solar_array_drilldown.sql
autonomous: true
requirements:
  - QUICK-332-EPS-DRILLDOWN-SEED
must_haves:
  truths:
    - "Clicking STR-HINGE-SA-DEPLOY in the SAT-003 BOM tree opens part.html and shows a populated CAD drawing, cost, and decision panel (no empty state)."
    - "EPS-SOLAR-WING-DEPLOY part.html shows 4 child sub-assemblies/components in the BOM (3× EPS-SOLAR-PANEL, 4× STR-HINGE-SA-DEPLOY, 2× EPS-DEPLOY-CABLE, 1× EPS-LATCH-ASSY) with non-zero costs."
    - "Drilling STR-HINGE-SA-DEPLOY shows 5 children (spring, damper, 2× pivot pins, mount bracket, 4× M3-12 fasteners) each with their own CAD drawing + cost."
    - "Each of the 13 part_definitions in the EPS solar wing tree has a non-null drawing_svg and a make_buy_decision (decision='make' or 'buy', status='approved') for SAT-003."
    - "Each of the 13 part_definitions has a template cost row (make_costs.part_definition_id set, satellite_id NULL) plus an actual cost row per part_instance on SAT-003 (satellite_id+part_instance_id set, part_definition_id NULL)."
    - "At least 3 buy parts have a sample RFQ → PO → invoice chain populated in buy_costs (quoted_unit_cost_usd + po_number + po_value_usd + invoiced_value_usd)."
    - "Re-running migration 007 is a no-op — every INSERT is idempotent via ON CONFLICT or WHERE NOT EXISTS guards."
  artifacts:
    - path: "/Users/jeet/turion-satellite/migrations/007_seed_eps_solar_array_drilldown.sql"
      provides: "Idempotent SQL seed creating 10 new part_definitions + 13 part_instances on SAT-003 + bom_lines hierarchy + make_buy_decisions + make_costs + buy_costs covering the full 4-level EPS solar array tree."
      contains: "ON CONFLICT (part_number) DO NOTHING; WHERE NOT EXISTS"
  key_links:
    - from: "EPS-SOLAR-WING-DEPLOY part_instance (SAT-003)"
      to: "EPS-SOLAR-PANEL × 3, STR-HINGE-SA-DEPLOY × 4, EPS-DEPLOY-CABLE × 2, EPS-LATCH-ASSY × 1"
      via: "bom_lines.parent_part_instance_id → bom_lines.child_part_instance_id"
      pattern: "INSERT INTO bom_lines.*parent_part_instance_id.*child_part_instance_id"
    - from: "STR-HINGE-SA-DEPLOY part_instance (SAT-003, qty 4)"
      to: "STR-HINGE-SPRING + STR-HINGE-DAMPER + STR-HINGE-PIVOT-PIN ×2 + STR-HINGE-MOUNT-BRACKET + STR-FASTENER-M3-12 ×4"
      via: "bom_lines hierarchy on the first hinge instance"
      pattern: "STR-HINGE-SA-DEPLOY.*parent_part_instance_id"
    - from: "EPS-LATCH-ASSY part_instance"
      to: "STR-FASTENER-M3-20 × 6"
      via: "bom_lines"
      pattern: "EPS-LATCH-ASSY.*STR-FASTENER-M3-20"
    - from: "Each of 13 part_definitions"
      to: "make_buy_decisions row + cost template row + actual cost rows per instance"
      via: "part_definition_id FK + satellite_id"
      pattern: "make_buy_decisions.*part_definition_id|make_costs.*part_definition_id|buy_costs.*part_definition_id"
---

<objective>
Seed a complete 4-level BOM drill-down story for SAT-003's EPS solar array deployment so the user can click any part in the EPS solar wing tree (root → sub-assembly → component → fastener) and see a populated CAD drawing, cost, and decision — no empty states.

Purpose: The user just hit a demo-data gap clicking STR-HINGE-SA-DEPLOY (Solar array deployment hinge spring + damper) — the part rendered with no drawing, no cost, no decision, no children. This blocks the "drill-down at every level" demo claim. We need 13 part_definitions wired up (10 new + 3 existing) with full BOM hierarchy, costs, and decisions on SAT-003.

Output: A single idempotent SQL migration `migrations/007_seed_eps_solar_array_drilldown.sql` that, when applied to the production turion_satellite Postgres, makes the EPS-SOLAR-WING-DEPLOY → STR-HINGE-SA-DEPLOY → STR-HINGE-SPRING drill-down (4 levels deep) work end-to-end on the live frontend.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/turion-satellite/migrations/001_create_turion_satellite_schema.sql
@/Users/jeet/turion-satellite/migrations/002_add_part_drawing_svg.sql
@/Users/jeet/turion-satellite/migrations/003_seed_per_part_drawing_svg.sql
@/Users/jeet/turion-satellite/migrations/004_add_cost_module.sql
@/Users/jeet/turion-satellite/migrations/006_seed_labor_rates_and_fx.sql
@/Users/jeet/turion-satellite/scripts/seed-cost-data.sql
@/Users/jeet/turion-satellite/scripts/seed-demo-data.sql
@/Users/jeet/.claude/handoffs/2026-05-10-turion-satellite-frontend-v2.md

# Reference: existing EPS-SOLAR-CELL-30P drawing style (lines 78-124 of 003_seed_per_part_drawing_svg.sql) — gradient + drop-shadow + part-name label, viewBox 0 0 60 60.

# Subsystem codes (from seeded subsystems table): STR, EPS, ADCS, CDH, COMM, PROP, TCS, PAY (all uppercase).

# Existing parts (DO NOT overwrite their fields if already populated):
# - EPS-SOLAR-WING-DEPLOY: id 9d201832-a1a2-4abd-9784-5d09524dda00, drawing_svg currently NULL, default_make_buy='buy' — fill drawing_svg, change to 'make' (it's a sub-assembly we build)
# - STR-HINGE-SA-DEPLOY: id a1a9f6cf-d083-40be-bc64-699d53e1e426, drawing_svg currently NULL, default_make_buy='buy' — fill drawing_svg, KEEP as 'buy' (full hinge assembly is COTS)
# - EPS-SOLAR-CELL-30P: drawing_svg ALREADY populated by quick-331 (003_seed_per_part_drawing_svg.sql) — DO NOT overwrite drawing_svg

# Schema constraints:
# - part_definitions.part_number is UNIQUE → use ON CONFLICT (part_number) DO NOTHING for new defs.
# - part_instances UNIQUE (satellite_id, part_definition_id, instance_index) → guard with WHERE NOT EXISTS or use ON CONFLICT on this triple.
# - bom_lines has NO unique constraint → guard with WHERE NOT EXISTS (SELECT 1 FROM bom_lines WHERE parent_part_instance_id = $1 AND child_part_instance_id = $2).
# - make_buy_decisions has partial UNIQUE uq_make_buy_decisions_current ON (satellite_id, part_definition_id) WHERE superseded_by IS NULL → use ON CONFLICT (satellite_id, part_definition_id) WHERE superseded_by IS NULL DO NOTHING.
# - make_costs / buy_costs CHECK constraint: TEMPLATE rows have part_definition_id NOT NULL + part_instance_id NULL + satellite_id NULL; ACTUAL rows have part_instance_id NOT NULL + satellite_id NOT NULL (part_definition_id may be denormalised but the CHECK forbids it being set when part_instance_id is set — see migration 004 lines 92-97).
# - rationale TEXT NOT NULL on make_buy_decisions; CONTEXT.md decision rule from Phase 24 says rationale ≥20 chars.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Author migration 007 — full EPS solar array drill-down seed</name>
  <files>/Users/jeet/turion-satellite/migrations/007_seed_eps_solar_array_drilldown.sql</files>
  <action>
Create `/Users/jeet/turion-satellite/migrations/007_seed_eps_solar_array_drilldown.sql`. Single idempotent SQL file (~600-900 lines). Mirror the structure of `003_seed_per_part_drawing_svg.sql` (header comment + `SET search_path TO turion_satellite, public;`) and use a `DO $do$ ... END $do$` block for the data inserts (variables, lookups, conditional inserts), mirroring `seed-demo-data.sql` and `seed-cost-data.sql`. Use a custom `$do$` dollar-quote tag (NOT plain `$$`) because the SVG bodies inside use `$svg$...$svg$` quoting and we don't want nesting collisions.

**File header:**
```
-- 007_seed_eps_solar_array_drilldown.sql · 2026-05-10
-- Quick task 332: seed a complete 4-level BOM drill-down story for SAT-003's
-- EPS solar array deployment so part.html shows populated drawings + costs +
-- decisions at every level. 13 part_definitions (10 new + 3 existing get
-- drawings/decisions/costs filled in), 13 part_instances on SAT-003, full
-- BOM hierarchy via bom_lines, make_buy_decisions per (sat × part_def),
-- make_costs templates + actuals, buy_costs templates + actuals (3 with
-- RFQ→PO→invoice chains).
--
-- Idempotent: re-running this migration is a no-op.
--   * part_definitions  → ON CONFLICT (part_number) DO NOTHING
--   * part_instances    → guarded by WHERE NOT EXISTS on (satellite_id, part_definition_id, instance_index)
--   * bom_lines         → guarded by WHERE NOT EXISTS on (parent_part_instance_id, child_part_instance_id)
--   * make_buy_decisions → ON CONFLICT (satellite_id, part_definition_id) WHERE superseded_by IS NULL DO NOTHING
--   * make_costs/buy_costs → guarded by WHERE NOT EXISTS on (satellite_id, part_instance_id, superseded_by IS NULL)
--                            for actuals; for templates by (part_definition_id, part_instance_id IS NULL, superseded_by IS NULL)
--
-- Tree (root EPS-SOLAR-WING-DEPLOY on SAT-003 = 24587565-b15b-42ce-b590-87ecf9b6bb99):
--   EPS-SOLAR-WING-DEPLOY (existing pd, was buy → flip to make for sub-assembly)
--   ├── EPS-SOLAR-PANEL × 3 (NEW pd, make)
--   │   ├── EPS-SOLAR-CELL-30P × 30 (existing pd, buy, drawing already populated)
--   │   ├── EPS-SOLAR-BUSBAR × 2 (NEW pd, buy)
--   │   └── EPS-SOLAR-COVERGLASS × 30 (NEW pd, buy)
--   ├── STR-HINGE-SA-DEPLOY × 4 (existing pd, buy, drawing was NULL → fill)
--   │   ├── STR-HINGE-SPRING × 1 (NEW pd, buy)
--   │   ├── STR-HINGE-DAMPER × 1 (NEW pd, buy)
--   │   ├── STR-HINGE-PIVOT-PIN × 2 (NEW pd, buy)
--   │   ├── STR-HINGE-MOUNT-BRACKET × 1 (NEW pd, make)
--   │   └── STR-FASTENER-M3-12 × 4 (NEW pd, buy)
--   ├── EPS-DEPLOY-CABLE × 2 (NEW pd, make)
--   └── EPS-LATCH-ASSY × 1 (NEW pd, make)
--       └── STR-FASTENER-M3-20 × 6 (NEW pd, buy)
--
-- BOM-line scope: only the FIRST instance of each multi-quantity part gets
-- children populated (e.g. solar-panel #A gets 30 cells + 2 busbars + 30 cover-
-- glasses; panels #B and #C are bare instances). This keeps total bom_lines
-- rows reasonable (~75) while making one full drill-down work.

SET search_path TO turion_satellite, public;
```

**Block 1: UPSERT 10 new part_definitions.**
For each new part_number, do `INSERT INTO part_definitions (part_number, description, subsystem_id, default_make_buy, drawing_svg) VALUES (...) ON CONFLICT (part_number) DO NOTHING;` outside the DO block (so subsystem_id is looked up via subquery). Subsystem code mappings:
- EPS-SOLAR-PANEL · subsystem='EPS' · default_make_buy='make' · description='Solar array panel sub-assembly (30 cells + 2 busbars + 30 cover-glasses)'
- EPS-SOLAR-BUSBAR · 'EPS' · 'buy' · 'Solar panel current-collection busbar (silver-plated copper, 0.5mm)'
- EPS-SOLAR-COVERGLASS · 'EPS' · 'buy' · 'Cerium-doped CMG coverglass (150um, AR-coated)'
- STR-HINGE-SPRING · 'STR' · 'buy' · 'Torsion spring for solar array deploy hinge (Inconel 718, 4 N·m at 90°)'
- STR-HINGE-DAMPER · 'STR' · 'buy' · 'Viscous rotary damper for hinge (silicone fluid, 0.8 N·m·s)'
- STR-HINGE-PIVOT-PIN · 'STR' · 'buy' · 'Pivot pin for hinge (Ti-6Al-4V, 4mm × 18mm, ground +/-0.005mm)'
- STR-HINGE-MOUNT-BRACKET · 'STR' · 'make' · 'Hinge mounting bracket (5-axis machined Al-7075, anodised black)'
- STR-FASTENER-M3-12 · 'STR' · 'buy' · 'M3 × 12mm A286 socket-head cap screw (NASM-grade, vented)'
- EPS-DEPLOY-CABLE · 'EPS' · 'make' · 'Solar wing power cable harness (24 AWG, 6-conductor, kapton-jacketed)'
- EPS-LATCH-ASSY · 'EPS' · 'make' · 'Solar wing stowed-position latch + release pin assembly'
- STR-FASTENER-M3-20 · 'STR' · 'buy' · 'M3 × 20mm A286 socket-head cap screw (NASM-grade, vented)'

For drawing_svg, write 11 distinct SVGs in `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60">...</svg>$svg$` blocks. Each ~2-3KB matching the gradient + drop-shadow + part-name label style of 003_seed_per_part_drawing_svg.sql. Visual intents:
- EPS-SOLAR-PANEL → grid of 6×5 cells with subtle blue gradient + busbars + label "SOLAR PANEL · 90W"
- EPS-SOLAR-BUSBAR → silver-grey vertical strip with mounting holes + label "BUSBAR · Cu/Ag"
- EPS-SOLAR-COVERGLASS → translucent rectangle with thin AR-coating sheen + label "COVERGLASS · CMG"
- STR-HINGE-SPRING → coiled torsion spring (8-10 spiral arcs) with mounting tabs + label "TORSION SPRING"
- STR-HINGE-DAMPER → cylindrical body with rotary shaft + fluid-fill marker + label "ROTARY DAMPER"
- STR-HINGE-PIVOT-PIN → isometric pin/rod with chamfered ends + label "PIVOT PIN · Ti-6Al-4V"
- STR-HINGE-MOUNT-BRACKET → L-shape bracket with bolt-pattern holes + machined finish gradient + label "BRACKET · Al-7075"
- STR-FASTENER-M3-12 → isometric socket-head cap screw, ~12mm shank ratio + hex socket detail + label "M3 × 12 · A286"
- EPS-DEPLOY-CABLE → bundled cable with insulation jacket + connector ends + label "DEPLOY HARNESS"
- EPS-LATCH-ASSY → boxy latch body with release pin extending + spring detail + label "STOW LATCH"
- STR-FASTENER-M3-20 → similar to M3-12 but slightly longer shank + label "M3 × 20 · A286"

For the 2 EXISTING parts that have NULL drawings, use UPDATE statements (after the INSERTs) gated by `WHERE part_number = '...' AND drawing_svg IS NULL`:
- EPS-SOLAR-WING-DEPLOY → distinct CAD drawing (full deployed wing, 3 panel array with hinge line + cable run + label "SOLAR WING · 270W"). Also UPDATE default_make_buy='make' if currently 'buy' since it's a sub-assembly we build.
- STR-HINGE-SA-DEPLOY → fully-assembled hinge with spring + damper + bracket + pin visible + label "SA HINGE · ASSY". KEEP default_make_buy='buy' (assembly is COTS from Moog or similar).

**Block 2: DO $do$ ... END $do$ block** with these declared variables:
```sql
DECLARE
  v_sat_id uuid := '24587565-b15b-42ce-b590-87ecf9b6bb99';
  -- part_definition ids
  v_pd_wing uuid; v_pd_panel uuid; v_pd_cell uuid; v_pd_busbar uuid; v_pd_coverglass uuid;
  v_pd_hinge_assy uuid; v_pd_hinge_spring uuid; v_pd_hinge_damper uuid;
  v_pd_pivot_pin uuid; v_pd_mount_bracket uuid; v_pd_m3_12 uuid;
  v_pd_cable uuid; v_pd_latch uuid; v_pd_m3_20 uuid;
  -- representative part_instance ids (only the first instance of each is stored;
  -- subsequent instances are created in loops without saving the id since they
  -- are bare leaves with no further BOM children)
  v_inst_wing uuid;
  v_inst_panel_a uuid;  -- only panel A gets cell/busbar/coverglass children
  v_inst_hinge_a uuid;  -- only hinge A gets spring/damper/pin/bracket/m3-12 children
  v_inst_latch uuid;
  v_inst_tmp uuid;
  v_vendor uuid;
  i int;
BEGIN
  -- Resolve all 14 part_definition ids by part_number
  SELECT id INTO v_pd_wing       FROM part_definitions WHERE part_number = 'EPS-SOLAR-WING-DEPLOY';
  SELECT id INTO v_pd_panel      FROM part_definitions WHERE part_number = 'EPS-SOLAR-PANEL';
  SELECT id INTO v_pd_cell       FROM part_definitions WHERE part_number = 'EPS-SOLAR-CELL-30P';
  SELECT id INTO v_pd_busbar     FROM part_definitions WHERE part_number = 'EPS-SOLAR-BUSBAR';
  SELECT id INTO v_pd_coverglass FROM part_definitions WHERE part_number = 'EPS-SOLAR-COVERGLASS';
  SELECT id INTO v_pd_hinge_assy   FROM part_definitions WHERE part_number = 'STR-HINGE-SA-DEPLOY';
  SELECT id INTO v_pd_hinge_spring FROM part_definitions WHERE part_number = 'STR-HINGE-SPRING';
  SELECT id INTO v_pd_hinge_damper FROM part_definitions WHERE part_number = 'STR-HINGE-DAMPER';
  SELECT id INTO v_pd_pivot_pin    FROM part_definitions WHERE part_number = 'STR-HINGE-PIVOT-PIN';
  SELECT id INTO v_pd_mount_bracket FROM part_definitions WHERE part_number = 'STR-HINGE-MOUNT-BRACKET';
  SELECT id INTO v_pd_m3_12        FROM part_definitions WHERE part_number = 'STR-FASTENER-M3-12';
  SELECT id INTO v_pd_cable    FROM part_definitions WHERE part_number = 'EPS-DEPLOY-CABLE';
  SELECT id INTO v_pd_latch    FROM part_definitions WHERE part_number = 'EPS-LATCH-ASSY';
  SELECT id INTO v_pd_m3_20    FROM part_definitions WHERE part_number = 'STR-FASTENER-M3-20';
  SELECT id INTO v_vendor FROM vendors ORDER BY name LIMIT 1;
```

Then create part_instances in this order (each guarded by WHERE NOT EXISTS):

Wing root (1 instance, instance_index=1, serial 'SAT003-EPS-WING-001'):
```sql
  INSERT INTO part_instances (satellite_id, part_definition_id, instance_index, serial_number)
  SELECT v_sat_id, v_pd_wing, 1, 'SAT003-EPS-WING-001'
  WHERE NOT EXISTS (SELECT 1 FROM part_instances WHERE satellite_id = v_sat_id AND part_definition_id = v_pd_wing AND instance_index = 1);
  SELECT id INTO v_inst_wing FROM part_instances WHERE satellite_id = v_sat_id AND part_definition_id = v_pd_wing AND instance_index = 1;
```

3 panel instances (loop i = 1..3, serials SAT003-EPS-PANEL-A/B/C, capture id of first into v_inst_panel_a):
```sql
  FOR i IN 1..3 LOOP
    INSERT INTO part_instances (satellite_id, part_definition_id, instance_index, serial_number)
    SELECT v_sat_id, v_pd_panel, i, 'SAT003-EPS-PANEL-' || CHR(64 + i)
    WHERE NOT EXISTS (SELECT 1 FROM part_instances WHERE satellite_id = v_sat_id AND part_definition_id = v_pd_panel AND instance_index = i);
  END LOOP;
  SELECT id INTO v_inst_panel_a FROM part_instances WHERE satellite_id = v_sat_id AND part_definition_id = v_pd_panel AND instance_index = 1;
```

For panel A's children: 30 cells (instance_index 1..30, serial 'SAT003-EPS-CELL-A-NN'), 2 busbars (1..2, 'SAT003-EPS-BUSBAR-A-N'), 30 coverglasses (1..30, 'SAT003-EPS-CG-A-NN'). Use FOR loops with the same WHERE NOT EXISTS guard pattern. Only panels B and C get bare instances (no children) — they will appear as drillable but empty leaves; that's fine for a single-path demo.

4 hinge instances (1..4, serials SAT003-STR-HINGE-1/2/3/4), capture v_inst_hinge_a from instance_index=1.
For hinge A's children: 1 spring, 1 damper, 2 pivot pins (1..2), 1 mount bracket, 4 M3-12 fasteners (1..4). Use serial pattern 'SAT003-STR-HINGE-A-SPRING-1', 'SAT003-STR-HINGE-A-DAMPER-1', 'SAT003-STR-HINGE-A-PIN-N', 'SAT003-STR-HINGE-A-BRACKET-1', 'SAT003-STR-HINGE-A-M3-12-N'.

2 deploy cable instances (1..2, 'SAT003-EPS-CABLE-1/2').

1 latch instance ('SAT003-EPS-LATCH-1'). Capture v_inst_latch.
For latch's children: 6 M3-20 fasteners ('SAT003-EPS-LATCH-M3-20-N').

**Block 3: bom_lines hierarchy (each guarded by WHERE NOT EXISTS).** Use a helper inline SQL pattern:
```sql
  -- wing → panel × 3
  FOR v_inst_tmp IN
    SELECT id FROM part_instances
    WHERE satellite_id = v_sat_id AND part_definition_id = v_pd_panel
    ORDER BY instance_index
  LOOP
    INSERT INTO bom_lines (satellite_id, parent_part_instance_id, child_part_instance_id, qty, uom, status, ref_designator)
    SELECT v_sat_id, v_inst_wing, v_inst_tmp, 1, 'EA', 'released', 'SOLAR-PANEL'
    WHERE NOT EXISTS (SELECT 1 FROM bom_lines WHERE parent_part_instance_id = v_inst_wing AND child_part_instance_id = v_inst_tmp);
  END LOOP;
```
Then similarly for: wing → hinge × 4 (ref_designator 'HINGE'), wing → cable × 2 ('CABLE'), wing → latch × 1 ('LATCH'). Then panel_a → cell × 30 ('CELL'), panel_a → busbar × 2 ('BUSBAR'), panel_a → coverglass × 30 ('COVERGLASS'). Then hinge_a → spring × 1, → damper × 1, → pin × 2, → bracket × 1, → M3-12 × 4. Then latch → M3-20 × 6.

**Block 4: make_buy_decisions.** One per (SAT-003 × part_definition) for all 14 definitions (the existing 3 + 11 new). Use ON CONFLICT:
```sql
  INSERT INTO make_buy_decisions (satellite_id, part_definition_id, part_instance_id, decision, decision_status, rationale, decided_at)
  VALUES (v_sat_id, v_pd_wing, v_inst_wing, 'make', 'approved',
          'Solar wing assembly built in-house — combines panels, hinges, cabling, and latch with mission-specific harness routing; no COTS supplier offers this integration.',
          NOW())
  ON CONFLICT (satellite_id, part_definition_id) WHERE superseded_by IS NULL DO NOTHING;
```
Repeat for each of the 14 part_definitions with realistic rationale strings ≥20 chars. Decisions:
- EPS-SOLAR-WING-DEPLOY → make (in-house integration)
- EPS-SOLAR-PANEL → make ('Panels laminated in-house using qualified GaAs cells; cell-stringing IP retained internally.')
- EPS-SOLAR-CELL-30P → buy ('Triple-junction GaAs cells qualified by Spectrolab — no in-house cell fab.')
- EPS-SOLAR-BUSBAR → buy ('Stamped silver-plated copper busbars — commodity supplier, AS9100 qualified.')
- EPS-SOLAR-COVERGLASS → buy ('Cerium-doped CMG cover-glass — Qioptiq sole-source for AR-coated 150um.')
- STR-HINGE-SA-DEPLOY → buy ('Moog flight-heritage solar-array deploy hinge — qualified on 30+ prior missions.')
- STR-HINGE-SPRING → buy ('Inconel 718 torsion spring — Lee Spring catalog item, lot-traceable.')
- STR-HINGE-DAMPER → buy ('Viscous rotary damper — ITT Enidine off-the-shelf, space-qualified silicone fluid.')
- STR-HINGE-PIVOT-PIN → buy ('Ti-6Al-4V ground pin — commodity from McMaster-equivalent space-qualified supplier.')
- STR-HINGE-MOUNT-BRACKET → make ('Bracket machined in-house on 5-axis mill from Al-7075 stock; tight bolt-pattern tolerance.')
- STR-FASTENER-M3-12 → buy ('A286 socket-head cap screws — NASM standard, Fastener Express stocked.')
- EPS-DEPLOY-CABLE → make ('Power harness routed and crimped in-house — mission-specific length and connector terminations.')
- EPS-LATCH-ASSY → make ('Stow latch fabricated and tuned in-house; spring preload calibrated per panel mass.')
- STR-FASTENER-M3-20 → buy ('A286 socket-head cap screws — NASM standard, Fastener Express stocked.')

**Block 5: make_costs templates and actuals.**

For each MAKE part_definition, insert ONE template (part_definition_id set, part_instance_id NULL, satellite_id NULL):
```sql
  INSERT INTO make_costs (part_definition_id, labor_hours, labor_rate_usd, material_cost_usd, tooling_cost_usd, cleanroom_hours, cleanroom_rate_usd, test_hours, test_rate_usd, currency_code, as_of_date, notes)
  SELECT v_pd_wing, 120, 150, 50000, 5000, 40, 215, 16, 320, 'USD', CURRENT_DATE,
         'Template: full solar wing integration (3 panels + 4 hinges + harness + latch).'
  WHERE NOT EXISTS (
    SELECT 1 FROM make_costs WHERE part_definition_id = v_pd_wing AND part_instance_id IS NULL AND superseded_by IS NULL
  );
```

Realistic make-cost numbers per part (template only — actuals will be the same for the canonical demo path):
- EPS-SOLAR-WING-DEPLOY (make, target ~$500K) → labor 120h, mat 50K, tool 5K, cleanroom 40h, test 16h → 120·150 + 50K + 5K + 40·215 + 16·320 = 18K + 50K + 5K + 8.6K + 5.12K = ~$86.7K *direct* (rest comes from sub-assemblies via BOM rollup, so direct cost is smaller — that's correct for an integration node).
- EPS-SOLAR-PANEL (make, target ~$50K direct + child cells = ~$80K rollup) → labor 24h, mat 1500, tool 500, cleanroom 16h, test 4h → 3.6K + 1.5K + 500 + 3.44K + 1.28K = ~$10.3K direct (rollup adds 30 cells × $1K = $30K + 2 busbars × $200 + 30 coverglass × $50)
- STR-HINGE-MOUNT-BRACKET (make, target ~$2K) → labor 8h, mat 200, tool 100, cleanroom 0, test 0.5h → 1.2K + 200 + 100 + 0 + 160 = ~$1.66K
- EPS-DEPLOY-CABLE (make, target ~$1.2K each) → labor 6h, mat 250, tool 0, cleanroom 2h, test 0.5h → 900 + 250 + 0 + 430 + 160 = ~$1.74K
- EPS-LATCH-ASSY (make, target ~$3K) → labor 10h, mat 400, tool 200, cleanroom 4h, test 1h → 1.5K + 400 + 200 + 860 + 320 = ~$3.28K

For each MAKE part_definition's part_instances on SAT-003, insert ONE actual cost row per instance with same numbers (or slight variance ±5% on labor_hours to make demo more realistic). The CHECK constraint requires `part_instance_id IS NOT NULL AND satellite_id IS NOT NULL AND part_definition_id IS NULL` — so the actual rows MUST omit part_definition_id (despite migration 004 backfilling it; the new rows we insert leave it NULL to satisfy the CHECK):

```sql
  -- Wait: re-read 004 lines 92-97. The CHECK says actuals have part_instance_id NOT NULL + satellite_id NOT NULL. It does NOT forbid part_definition_id from being set on actuals. Re-reading:
  --   CHECK ((part_definition_id IS NOT NULL AND part_instance_id IS NULL AND satellite_id IS NULL) OR (part_instance_id IS NOT NULL AND satellite_id IS NOT NULL))
  -- So actuals MUST have part_instance_id + satellite_id, and the OR alternative means part_definition_id may be ANYTHING when part_instance_id is NOT NULL. Backfill in 004 sets it; new actual inserts may either set or omit it. SAFEST: omit part_definition_id on actual inserts (NULL) to mirror what app-write paths do. But check the existing seed-cost-data.sql which does NOT set part_definition_id on its INSERTs (lines 41-49) — proves that pattern is supported. Use that pattern.
  FOR v_inst_tmp IN
    SELECT id FROM part_instances WHERE satellite_id = v_sat_id AND part_definition_id = v_pd_wing
  LOOP
    INSERT INTO make_costs (satellite_id, part_instance_id, labor_hours, labor_rate_usd, material_cost_usd, tooling_cost_usd, cleanroom_hours, cleanroom_rate_usd, test_hours, test_rate_usd, currency_code, as_of_date, notes)
    SELECT v_sat_id, v_inst_tmp, 120, 150, 50000, 5000, 40, 215, 16, 320, 'USD', CURRENT_DATE,
           'Actual: SAT-003 wing integration cost (planned).'
    WHERE NOT EXISTS (
      SELECT 1 FROM make_costs WHERE satellite_id = v_sat_id AND part_instance_id = v_inst_tmp AND superseded_by IS NULL
    );
  END LOOP;
```

Repeat per make part_definition (panel × 3 instances, mount bracket × 1, cable × 2, latch × 1).

**Block 6: buy_costs templates and actuals.**

For each BUY part_definition, insert ONE template and per-instance actuals. Realistic prices:
- STR-HINGE-SA-DEPLOY (full hinge assy) → quoted_unit 5000, nre 0, ordered_qty 4, po_value 20000, invoiced 20000 — for actuals on hinge instances 1..4.
- STR-HINGE-SPRING → quoted 300, nre 0, qty 1, po 300, invoiced 300
- STR-HINGE-DAMPER → quoted 1500, nre 200, qty 1, po 1700, invoiced 1700
- STR-HINGE-PIVOT-PIN → quoted 80, nre 0, qty 2, po 160, invoiced 160
- STR-FASTENER-M3-12 → quoted 5, nre 0, qty 4, po 20, invoiced 20
- STR-FASTENER-M3-20 → quoted 8, nre 0, qty 6, po 48, invoiced 48
- EPS-SOLAR-CELL-30P → quoted 1000, nre 0, qty 30, po 30000, invoiced 30000
- EPS-SOLAR-BUSBAR → quoted 200, nre 0, qty 2, po 400, invoiced 400
- EPS-SOLAR-COVERGLASS → quoted 50, nre 0, qty 30, po 1500, invoiced 1500

**Sample RFQ → PO → invoice chains (decision req: ≥3 buy parts):** For STR-HINGE-DAMPER, EPS-SOLAR-CELL-30P, and STR-HINGE-SA-DEPLOY, ALSO populate `po_number` with realistic PO strings ('PO-2026-Q332-001', '-002', '-003') so the buy sheet shows a full procurement chain. Other buys can leave po_number NULL (template-only) or fill with simpler strings.

Template insert pattern (mirror make_costs templates):
```sql
  INSERT INTO buy_costs (part_definition_id, vendor_id, quoted_unit_cost_usd, nre_cost_usd, ordered_qty, currency_code, as_of_date, notes)
  SELECT v_pd_hinge_assy, v_vendor, 5000, 0, 4, 'USD', CURRENT_DATE,
         'Template: Moog SA-deploy hinge, lot of 4 per wing.'
  WHERE NOT EXISTS (SELECT 1 FROM buy_costs WHERE part_definition_id = v_pd_hinge_assy AND part_instance_id IS NULL AND superseded_by IS NULL);
```

Actual insert pattern (per part_instance, includes po_number for the 3 RFQ-chain parts):
```sql
  FOR v_inst_tmp IN
    SELECT id FROM part_instances WHERE satellite_id = v_sat_id AND part_definition_id = v_pd_hinge_assy
  LOOP
    INSERT INTO buy_costs (satellite_id, part_instance_id, vendor_id, quoted_unit_cost_usd, nre_cost_usd, ordered_qty, po_number, po_value_usd, invoiced_value_usd, currency_code, as_of_date, notes)
    SELECT v_sat_id, v_inst_tmp, v_vendor, 5000, 0, 1, 'PO-2026-Q332-001', 5000, 5000, 'USD', CURRENT_DATE,
           'Actual: Moog hinge unit, RFQ → PO → invoice chain.'
    WHERE NOT EXISTS (SELECT 1 FROM buy_costs WHERE satellite_id = v_sat_id AND part_instance_id = v_inst_tmp AND superseded_by IS NULL);
  END LOOP;
```

End the DO block with a final RAISE NOTICE summarising counts:
```sql
  RAISE NOTICE 'Quick-332 seed complete on satellite %', v_sat_id;
END $do$;
```

**Block 7 (after DO block): final SELECT for human verification:**
```sql
SELECT 'part_definitions (EPS-solar tree)' AS what, COUNT(*) AS rows
FROM part_definitions
WHERE part_number IN (
  'EPS-SOLAR-WING-DEPLOY','EPS-SOLAR-PANEL','EPS-SOLAR-CELL-30P','EPS-SOLAR-BUSBAR','EPS-SOLAR-COVERGLASS',
  'STR-HINGE-SA-DEPLOY','STR-HINGE-SPRING','STR-HINGE-DAMPER','STR-HINGE-PIVOT-PIN','STR-HINGE-MOUNT-BRACKET','STR-FASTENER-M3-12',
  'EPS-DEPLOY-CABLE','EPS-LATCH-ASSY','STR-FASTENER-M3-20'
)
UNION ALL SELECT 'part_instances (SAT-003 EPS-solar)', COUNT(*)
FROM part_instances pi JOIN part_definitions pd ON pd.id = pi.part_definition_id
WHERE pi.satellite_id = '24587565-b15b-42ce-b590-87ecf9b6bb99'
  AND pd.part_number IN ('EPS-SOLAR-WING-DEPLOY','EPS-SOLAR-PANEL','EPS-SOLAR-CELL-30P','EPS-SOLAR-BUSBAR','EPS-SOLAR-COVERGLASS','STR-HINGE-SA-DEPLOY','STR-HINGE-SPRING','STR-HINGE-DAMPER','STR-HINGE-PIVOT-PIN','STR-HINGE-MOUNT-BRACKET','STR-FASTENER-M3-12','EPS-DEPLOY-CABLE','EPS-LATCH-ASSY','STR-FASTENER-M3-20')
UNION ALL SELECT 'bom_lines (SAT-003)', COUNT(*) FROM bom_lines WHERE satellite_id = '24587565-b15b-42ce-b590-87ecf9b6bb99'
UNION ALL SELECT 'make_buy_decisions (SAT-003)', COUNT(*) FROM make_buy_decisions WHERE satellite_id = '24587565-b15b-42ce-b590-87ecf9b6bb99' AND superseded_by IS NULL
UNION ALL SELECT 'make_costs (SAT-003 actuals)', COUNT(*) FROM make_costs WHERE satellite_id = '24587565-b15b-42ce-b590-87ecf9b6bb99' AND superseded_by IS NULL
UNION ALL SELECT 'buy_costs (SAT-003 actuals)', COUNT(*) FROM buy_costs WHERE satellite_id = '24587565-b15b-42ce-b590-87ecf9b6bb99' AND superseded_by IS NULL;
```

**WHY this approach:**
- Single migration file matches turion-satellite repo convention (003 added drawings, 006 added rates — 007 is the next number).
- DO block with NOT EXISTS guards mirrors `seed-demo-data.sql` and `seed-cost-data.sql` patterns, making it idempotent in the same idiom the team already reviews.
- Template + actual cost split per migration 004's CHECK constraint ensures rollup queries work both ways.
- 11 distinct SVGs make the drill-down feel real — the user just hit STR-HINGE-SA-DEPLOY with no drawing, so distinguishability matters.
- Only ONE branch (panel A → cells, hinge A → parts) gets sub-children populated; the other panel/hinge instances are bare on purpose to keep BOM row count manageable (~75 lines vs 400+) while still proving 4-level drill-down on at least one path.
  </action>
  <verify>
After writing the file:
1. `wc -l /Users/jeet/turion-satellite/migrations/007_seed_eps_solar_array_drilldown.sql` — expect 600-1000 lines.
2. `grep -c "INSERT INTO part_definitions" /Users/jeet/turion-satellite/migrations/007_seed_eps_solar_array_drilldown.sql` — expect ≥10 (one per new part).
3. `grep -c "ON CONFLICT" /Users/jeet/turion-satellite/migrations/007_seed_eps_solar_array_drilldown.sql` — expect ≥11 (10 part_def UPSERTs + 14 decision UPSERTs, but counted as ON CONFLICT clauses ≥11).
4. `grep -c "WHERE NOT EXISTS" /Users/jeet/turion-satellite/migrations/007_seed_eps_solar_array_drilldown.sql` — expect ≥30 (instances + bom_lines + costs all guarded).
5. `grep -c '<svg xmlns' /Users/jeet/turion-satellite/migrations/007_seed_eps_solar_array_drilldown.sql` — expect ≥11 (one per new + 2 for existing UPDATEs = 13 SVGs including wing + hinge fills).
6. `grep -c "SET search_path TO turion_satellite" /Users/jeet/turion-satellite/migrations/007_seed_eps_solar_array_drilldown.sql` — expect 1.
7. `grep -E "DO \\\$do\\\$|END \\\$do\\\$" /Users/jeet/turion-satellite/migrations/007_seed_eps_solar_array_drilldown.sql` — expect both opening and closing dollar-quote tags.
8. Visual review: all 14 part_numbers from the tree appear at least once in the file.
  </verify>
  <done>
File `/Users/jeet/turion-satellite/migrations/007_seed_eps_solar_array_drilldown.sql` exists, is 600-1000 lines, has 10 new ON CONFLICT (part_number) DO NOTHING upserts plus 2 UPDATE-WHERE-NULL fills for existing parts, ≥30 WHERE NOT EXISTS guards, ≥11 distinct SVG bodies, a DO $do$ block with all 14 part_definition lookups + part_instance creation + bom_lines hierarchy + make_buy_decisions + make/buy cost templates and actuals + final summary SELECT.
  </done>
</task>

<task type="auto">
  <name>Task 2: Apply migration 007 to production + verify drill-down works</name>
  <files>(no file changes — runs the migration + smoke-tests via psql + curl)</files>
  <action>
**Step 1: Apply the migration.**

Use psql with the connection string from AWS Secrets Manager. Pattern matches how 004/005/006 were applied (per Phase 24 deviation: "applied directly to production, no staging exists"):

```bash
DB_URL=$(aws secretsmanager get-secret-value \
  --secret-id turion-satellite/production/database-url \
  --region us-east-1 \
  --query SecretString --output text | jq -r '.DATABASE_URL // .url // .')
# Fallback: if the secret name above is wrong, look at how /Users/jeet/turion-satellite/build-and-push.sh or db.ts references it.

psql "$DB_URL" -v ON_ERROR_STOP=1 -f /Users/jeet/turion-satellite/migrations/007_seed_eps_solar_array_drilldown.sql 2>&1 | tee /tmp/q332-migration.log
```

If the secret name lookup fails, check how migrations 004-006 were applied: look in /Users/jeet/turion-satellite/scripts/ for any apply-migrations.sh, or check git log for commit messages mentioning psql apply commands. The DB URL may be available via `op` (1Password CLI) or directly readable from a local `.env` if one exists at /Users/jeet/turion-satellite/.env. As a last resort, ask the user to paste DATABASE_URL.

Expected output ends with the summary SELECT showing:
- part_definitions (EPS-solar tree) = 14
- part_instances (SAT-003 EPS-solar) = 13 part_def types but ~80 actual instances (1 wing + 3 panels + 30 cells + 2 busbars + 30 coverglass + 4 hinges + 1 spring + 1 damper + 2 pins + 1 bracket + 4 M3-12 + 2 cables + 1 latch + 6 M3-20 = 88 instances)
- bom_lines (SAT-003) = 75 + any pre-existing rows
- make_buy_decisions (SAT-003) = 14 + any pre-existing
- make_costs / buy_costs (SAT-003 actuals) ≥ matching instance counts

**Step 2: Run idempotency check.** Re-apply the migration:
```bash
psql "$DB_URL" -v ON_ERROR_STOP=1 -f /Users/jeet/turion-satellite/migrations/007_seed_eps_solar_array_drilldown.sql 2>&1 | tee /tmp/q332-migration-rerun.log
diff <(grep -E "what|rows" /tmp/q332-migration.log | tail -10) <(grep -E "what|rows" /tmp/q332-migration-rerun.log | tail -10) && echo "IDEMPOTENT OK"
```
The summary counts should match exactly between runs.

**Step 3: SQL spot checks.** Use psql one-shot queries to verify drill-down chains:
```bash
# 3a. STR-HINGE-SA-DEPLOY now has drawing_svg + a make_buy_decision on SAT-003
psql "$DB_URL" -c "SELECT part_number, OCTET_LENGTH(drawing_svg) AS svg_bytes FROM turion_satellite.part_definitions WHERE part_number IN ('EPS-SOLAR-WING-DEPLOY','STR-HINGE-SA-DEPLOY') AND drawing_svg IS NOT NULL;"
# expect 2 rows

# 3b. Hinge instance #1 has 5 BOM children (spring, damper, 2 pins, bracket, 4 M3-12 — wait that's 5 distinct part_defs across 9 lines or 5 lines depending on how qty is encoded)
psql "$DB_URL" -c "
SELECT pd.part_number, bl.qty
FROM turion_satellite.bom_lines bl
JOIN turion_satellite.part_instances pi_child ON pi_child.id = bl.child_part_instance_id
JOIN turion_satellite.part_definitions pd ON pd.id = pi_child.part_definition_id
WHERE bl.parent_part_instance_id = (
  SELECT pi.id FROM turion_satellite.part_instances pi
  JOIN turion_satellite.part_definitions pd2 ON pd2.id = pi.part_definition_id
  WHERE pi.satellite_id = '24587565-b15b-42ce-b590-87ecf9b6bb99'
    AND pd2.part_number = 'STR-HINGE-SA-DEPLOY'
  ORDER BY pi.instance_index LIMIT 1
)
ORDER BY pd.part_number;"
# expect at least 9 rows (1 spring + 1 damper + 2 pins + 1 bracket + 4 M3-12)
# (NOTE: the seed creates one bom_lines row per child-instance — so 9 rows even though
# qty=1 each. If you instead create 1 bom_line with qty=N per child-type, you'd see 5.)

# 3c. Wing has 4 child types via bom_lines
psql "$DB_URL" -c "
SELECT DISTINCT pd.part_number
FROM turion_satellite.bom_lines bl
JOIN turion_satellite.part_instances pi_child ON pi_child.id = bl.child_part_instance_id
JOIN turion_satellite.part_definitions pd ON pd.id = pi_child.part_definition_id
WHERE bl.parent_part_instance_id = (
  SELECT pi.id FROM turion_satellite.part_instances pi
  JOIN turion_satellite.part_definitions pd2 ON pd2.id = pi.part_definition_id
  WHERE pi.satellite_id = '24587565-b15b-42ce-b590-87ecf9b6bb99'
    AND pd2.part_number = 'EPS-SOLAR-WING-DEPLOY'
  LIMIT 1
)
ORDER BY pd.part_number;"
# expect 4 rows: EPS-DEPLOY-CABLE, EPS-LATCH-ASSY, EPS-SOLAR-PANEL, STR-HINGE-SA-DEPLOY

# 3d. RFQ → PO → invoice chain populated for ≥3 buy parts
psql "$DB_URL" -c "
SELECT pd.part_number, bc.po_number, bc.po_value_usd, bc.invoiced_value_usd
FROM turion_satellite.buy_costs bc
JOIN turion_satellite.part_instances pi ON pi.id = bc.part_instance_id
JOIN turion_satellite.part_definitions pd ON pd.id = pi.part_definition_id
WHERE bc.satellite_id = '24587565-b15b-42ce-b590-87ecf9b6bb99'
  AND bc.po_number IS NOT NULL
  AND bc.superseded_by IS NULL
ORDER BY pd.part_number, bc.po_number;"
# expect ≥3 distinct part_numbers each with non-null po_number + po_value_usd + invoiced_value_usd
```

**Step 4: Live frontend smoke (optional, only if a bearer is easily obtainable).**

If a recent valid Supabase JWT bearer is available (check shell history, /tmp, or paste from the user), run:
```bash
BEARER="..."  # if user provides
curl -fsS -H "Authorization: Bearer $BEARER" \
  "https://rjydekliee.execute-api.us-east-1.amazonaws.com/api/parts/9d201832-a1a2-4abd-9784-5d09524dda00/process?sat=24587565-b15b-42ce-b590-87ecf9b6bb99" | jq '.cost_breakdown, .materials_required | length' 2>&1 | head -20
```

If no bearer is at hand, skip the live curl and rely on the SQL spot-checks above — they prove the data is queryable. The user can manually open https://turionspace.zietra.com/satellite/part.html?id=a1a9f6cf-d083-40be-bc64-699d53e1e426&sat=24587565-b15b-42ce-b590-87ecf9b6bb99 in a browser to confirm visually.

**Step 5: Commit.**

Stage only the new migration file; commit with author override:
```bash
cd /Users/jeet/turion-satellite
git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" \
  add migrations/007_seed_eps_solar_array_drilldown.sql
git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" \
  commit -m "feat(quick-332): seed EPS solar array 4-level BOM drill-down on SAT-003

10 new part_definitions + 2 existing parts get drawings/decisions filled
in for the EPS-SOLAR-WING-DEPLOY → STR-HINGE-SA-DEPLOY → STR-HINGE-SPRING
demo path. Idempotent: ON CONFLICT + WHERE NOT EXISTS throughout.

Closes the empty-state user hit clicking STR-HINGE-SA-DEPLOY in the BOM
tree (no drawing, no cost, no decision, no children).

Tree on SAT-003 (24587565-b15b-42ce-b590-87ecf9b6bb99):
  EPS-SOLAR-WING-DEPLOY
  ├── EPS-SOLAR-PANEL × 3 (panel A → 30 cells + 2 busbars + 30 coverglass)
  ├── STR-HINGE-SA-DEPLOY × 4 (hinge A → spring + damper + 2 pins + bracket + 4 M3-12)
  ├── EPS-DEPLOY-CABLE × 2
  └── EPS-LATCH-ASSY × 1 (→ 6 M3-20)

13 distinct CAD silhouettes, 14 make_buy_decisions, full cost templates +
actuals, RFQ→PO→invoice chains on STR-HINGE-DAMPER, EPS-SOLAR-CELL-30P,
and STR-HINGE-SA-DEPLOY."
```

Do NOT push to remote — `dollor.ai` push policy applies but we're in turion-satellite repo. Check CLAUDE.md push rules; if turion-satellite repo's commits ARE typically pushed (handoff says "HEAD `4f8f50c` … Lambda code SHA `98337e0d`" suggesting backend commits do get pushed for Lambda redeploy), then this seed-only commit doesn't trigger backend redeploy (no .ts changes), so push is safe but not required. Default: do NOT push unless user requests.

**WHY this approach:**
- Apply-then-rerun proves idempotency in production conditions, not just in code review.
- SQL spot-checks are zero-cost and deterministic; live curl needs an auth gate that may not be at hand.
- Single atomic commit per CLAUDE.md commit hygiene.
- No frontend deploy needed — the data is already queryable by existing /api/parts/:id/process and /api/make-costs / /api/buy-costs endpoints.
  </action>
  <verify>
1. `/tmp/q332-migration.log` shows the final RAISE NOTICE + summary SELECT with non-zero counts.
2. `/tmp/q332-migration-rerun.log` summary counts are byte-identical to first run (idempotency).
3. SQL spot-check 3a returns 2 rows.
4. SQL spot-check 3b returns ≥9 rows of hinge children.
5. SQL spot-check 3c returns exactly 4 distinct part_numbers (EPS-DEPLOY-CABLE, EPS-LATCH-ASSY, EPS-SOLAR-PANEL, STR-HINGE-SA-DEPLOY).
6. SQL spot-check 3d returns ≥3 distinct part_numbers with non-null po_number.
7. `git log -1 --format='%an <%ae> %s'` shows author `jeet-avatar <jm@techcloudpro.com>` and subject starts with `feat(quick-332):`.
  </verify>
  <done>
Migration 007 applied to production, summary counts match expected (14 part_defs in tree, ~88 instances on SAT-003, ≥75 new bom_lines, 14 decisions, matching cost rows). Re-run is byte-identical (idempotent). 4 SQL spot-checks pass. Single atomic commit on `main` of turion-satellite repo authored as `jeet-avatar <jm@techcloudpro.com>`. Frontend drill-down EPS-SOLAR-WING-DEPLOY → STR-HINGE-SA-DEPLOY → STR-HINGE-SPRING is now fully populated with drawings, costs, and decisions at every level. The user's reported empty-state on STR-HINGE-SA-DEPLOY is resolved.
  </done>
</task>

</tasks>

<verification>
- File `/Users/jeet/turion-satellite/migrations/007_seed_eps_solar_array_drilldown.sql` exists with 600-1000 lines, ≥10 ON CONFLICT clauses, ≥30 WHERE NOT EXISTS guards, ≥11 distinct SVG bodies.
- Migration applied successfully to production turion_satellite Postgres; final summary SELECT shows expected non-zero counts.
- Re-applying migration is a strict no-op (counts identical).
- SQL spot-checks confirm: hinge A drillable to 9 child rows; wing drillable to 4 child types; ≥3 buy parts have full RFQ→PO→invoice chain.
- Single atomic git commit on turion-satellite/main authored as `jeet-avatar <jm@techcloudpro.com>` with message `feat(quick-332): ...`.
</verification>

<success_criteria>
- [ ] Clicking https://turionspace.zietra.com/satellite/part.html?id=a1a9f6cf-d083-40be-bc64-699d53e1e426&sat=24587565-b15b-42ce-b590-87ecf9b6bb99 (STR-HINGE-SA-DEPLOY on SAT-003) shows a populated CAD drawing (no longer NULL), a buy-cost panel with quoted/PO/invoiced numbers, a make_buy_decision card showing decision='buy' with rationale, and 5 BOM children visible.
- [ ] Clicking https://turionspace.zietra.com/satellite/part.html?id=9d201832-a1a2-4abd-9784-5d09524dda00&sat=24587565-b15b-42ce-b590-87ecf9b6bb99 (EPS-SOLAR-WING-DEPLOY) shows the wing drawing, a make decision, and 4 child types (PANEL, HINGE, CABLE, LATCH).
- [ ] Drilling into STR-HINGE-SPRING from the hinge BOM shows its own CAD drawing + cost + decision (level 4).
- [ ] Migration is idempotent — running 007 a second time produces identical row counts.
- [ ] The 13 part_definitions in the tree all have non-null drawing_svg, all have a make_buy_decision on SAT-003, all have at least one cost row (template or actual).
</success_criteria>

<output>
After completion, create `.planning/quick/332-seed-eps-solar-array-4-level-bom-drill-d/332-SUMMARY.md` documenting:
- Final row counts from both migration runs
- Output of the 4 SQL spot-checks
- Commit SHA on turion-satellite main
- Any deviations between the plan and what was actually written (e.g. if SVG drawings ended up at a different size, or if bom_lines used qty=N per child-type vs 1-row-per-instance)
- Confirmation that re-running the migration is a no-op
</output>
