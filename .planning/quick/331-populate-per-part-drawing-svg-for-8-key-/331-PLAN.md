---
phase: quick-331
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/turion-satellite/migrations/003_seed_per_part_drawing_svg.sql
autonomous: true
requirements:
  - QUICK-331-01-populate-per-part-drawing-svg-for-8-key-parts
must_haves:
  truths:
    - "Each of the 8 chosen part_definitions rows has a distinct, non-null drawing_svg in turion_satellite.part_definitions"
    - "GET /api/parts/:id/drawing returns the part-specific SVG (not the subsystem default) for each of the 8 parts"
    - "The 8 SVGs render correctly in the part-detail CAD viewer in place of the subsystem fallback"
    - "Migration is idempotent — re-running it does not duplicate or corrupt rows"
    - "Smoke script (scripts/smoke-frontend.sh) stays green after deploy"
    - "No frontend code changes were needed (CAD loader already prefers per-part drawing_svg)"
  artifacts:
    - path: "/Users/jeet/turion-satellite/migrations/003_seed_per_part_drawing_svg.sql"
      provides: "8 UPDATE statements that populate drawing_svg for STR-ASSY, EPS-SOLAR-CELL-30P, ADCS-RW-MEDIUM-A, PROP-THRUSTER-MONO-A, PAY-TELESCOPE-OTA, COMM-ANT-XBAND-HG, TCS-RADIATOR-PANEL-A, CDH-OBC-MAIN-A"
      contains: "UPDATE turion_satellite.part_definitions SET drawing_svg"
  key_links:
    - from: "satellite-cad.js loadPartCad()"
      to: "/api/parts/:id/drawing"
      via: "fetch + cache, falls back to /satellite/cad/{subsystem}.svg ONLY when drawing_svg is null"
      pattern: "let svg = resp.drawing_svg"
    - from: "part.html (line 217)"
      to: "drawing.drawing_svg"
      via: "direct read with subsystem fallback only on null"
      pattern: "let svg = drawing.drawing_svg"
---

<objective>
Populate per-part drawing_svg for 8 representative parts (one per subsystem) in `turion_satellite.part_definitions` so each part shows a unique CAD silhouette in `part.html` instead of falling back to the subsystem default at `/satellite/cad/{subsystem}.svg`.

Purpose: The user added the 8 subsystem-level CAD silhouettes in HEAD `d592a41` (all parts in a subsystem currently render the same picture). This task gives 8 chosen parts their own distinct drawings, demonstrating the per-part override path the schema and frontend already support.

Output: 1 SQL migration file + redeploy of NOTHING on the frontend (CAD loader precedence already correct, verified) + smoke verification via curl + smoke-frontend.sh.

**No frontend changes needed** — verified `satellite-cad.js:45` (`let svg = resp.drawing_svg; if (!svg && resp.subsystem_code) { ... }`) and `part.html:217-219` (same pattern) both already prefer per-part `drawing_svg` over the subsystem default. The whole task is backend-DB only.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
# Repo + auth
- Backend repo: `/Users/jeet/turion-satellite` (standalone, on `main`, HEAD ~`6af57bf` post-quick-329).
- Schema: `turion_satellite` (NOT public).
- Git author MUST be: `git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar"`.
- Migration convention (from existing `migrations/001_create_turion_satellite_schema.sql` + `migrations/002_add_part_drawing_svg.sql`):
  - File path: `migrations/NNN_short_name.sql` where NNN = next sequential 3-digit number (next is **003**).
  - Header: `-- 003_seed_per_part_drawing_svg.sql · 2026-05-10` + 1-line description.
  - Use fully-qualified `turion_satellite.part_definitions` OR start with `SET search_path TO turion_satellite, public;`.
  - Run via: `psql "$DATABASE_URL" -f migrations/003_seed_per_part_drawing_svg.sql` (matches header comment in 001).
- DATABASE_URL: pulled from AWS SM `turion-satellite/production/database-url`. To run the migration:
  ```bash
  DATABASE_URL=$(aws secretsmanager get-secret-value --secret-id turion-satellite/production/database-url --query SecretString --output text | jq -r .url)
  psql "$DATABASE_URL" -f /Users/jeet/turion-satellite/migrations/003_seed_per_part_drawing_svg.sql
  ```
  (If the secret JSON shape is different — try `jq -r .DATABASE_URL` or just `--output text` then dequote — verify with `aws secretsmanager get-secret-value --secret-id turion-satellite/production/database-url --query SecretString --output text | head -c 200` first.)

# Verified part code mapping (live from /Users/jeet/turion-satellite/scripts/seed.ts lines 178-256)

The user's spec listed candidate codes that **don't all exist** in the seed. I verified the actual seeded part_numbers and picked the most representative make/buy item per subsystem:

| Subsystem | Spec said | Actual seeded part_number used | Rationale |
|-----------|-----------|--------------------------------|-----------|
| STR  | STR-ASSY       | `STR-ASSY`                  | exists verbatim — primary structure L1 assembly |
| EPS  | EPS-PV         | `EPS-SOLAR-CELL-30P`        | "solar panel section" — triple-junction GaAs cell, the closest to a "solar panel section close-up". (Alt: `EPS-SOLAR-WING-DEPLOY` for full wing.) |
| ADCS | ADCS-RW        | `ADCS-RW-MEDIUM-A`          | "reaction wheel close-up" — 100mNms wheel |
| PROP | PROP-NOZZLE    | `PROP-THRUSTER-MONO-A`      | "thruster bell" — 0.5N monoprop thruster (the only thruster part) |
| PAY  | PAY-LENS       | `PAY-TELESCOPE-OTA`         | "imager lens assembly" — Optical Telescope Assembly SDA spec |
| COMM | COMM-FEED      | `COMM-ANT-XBAND-HG`         | "feed horn close-up" — X-band high-gain antenna with feed (closest match; pure feed-horn part doesn't exist) |
| TCS  | TCS-FIN        | `TCS-RADIATOR-PANEL-A`      | "single radiator fin" — OSR-coated radiator panel |
| CDH  | CDH-PCB        | `CDH-OBC-MAIN-A`            | "single PCB closeup" — flight computer rad-tolerant SoC board |

The migration MUST UPDATE BY part_number, not by UUID, so it works in any environment regardless of insert order.

# Style reference (from /Users/jeet/turion-space-demo/satellite/cad/structure.svg — 43 lines, ~1.5KB)
- viewBox: `0 0 60 60`
- xmlns: `http://www.w3.org/2000/svg`
- 2-3 `<linearGradient>` (or `<radialGradient>`) defs for face shading
- 1 `<filter>` for drop-shadow (`feGaussianBlur` + `feOffset` + `feMerge`)
- Wrapping `<g filter="url(#...)">` around the drawn shapes
- Cabinet projection / isometric perspective
- Highlight strips for specularity
- Bottom text label: `<text x="30" y="57" text-anchor="middle" font-family="Fira Code, monospace" font-size="3.4" fill="#9ab1c8" letter-spacing="0.4">{UNIQUE PART LABEL}</text>`
- Total size target: ~2-3KB per SVG (structure.svg is 1.5KB; the user wants slightly richer). Don't go over 4KB.

The 8 part-level SVGs MUST visually differ from their subsystem-level counterparts at `/Users/jeet/turion-space-demo/satellite/cad/{structure,eps,adcs,propulsion,payload,comms,thermal,cdh}.svg` — same conventions, different subject. For example:
- subsystem `eps.svg` shows the FULL solar array; the per-part `EPS-SOLAR-CELL-30P` SVG should show a SINGLE solar cell close-up with the GaAs grid pattern.
- subsystem `adcs.svg` shows the abstract subsystem; the per-part `ADCS-RW-MEDIUM-A` SVG should show a reaction-wheel cross-section with rotor + bearing + housing detail.
- subsystem `propulsion.svg` shows the tank + bell; the per-part `PROP-THRUSTER-MONO-A` should show JUST the thruster nozzle close-up.
- subsystem `comms.svg` shows the dish; the per-part `COMM-ANT-XBAND-HG` should show the dish + feed-horn assembly with mast detail (still distinct from subsystem).

# Unique label strings (so smoke-grep can prove each part returned its own SVG, not the subsystem default)

| part_number | Required `<text>` label string (verbatim, must appear in SVG) |
|-------------|---------------------------------------------------------------|
| STR-ASSY                | `BUS · L1 ASSEMBLY` |
| EPS-SOLAR-CELL-30P      | `GaAs CELL · 30%` |
| ADCS-RW-MEDIUM-A        | `RW · 100 mNms` |
| PROP-THRUSTER-MONO-A    | `THRUSTER · 0.5 N` |
| PAY-TELESCOPE-OTA       | `OTA · SDA OPTICAL` |
| COMM-ANT-XBAND-HG       | `X-BAND · HIGH GAIN` |
| TCS-RADIATOR-PANEL-A    | `RADIATOR · OSR` |
| CDH-OBC-MAIN-A          | `OBC · RAD-TOL SoC` |

The smoke test will grep for each of these literal strings against the API response; uniqueness across the 8 SVGs proves per-part precedence is working.

# CAD loader precedence (verified, no change needed)

`/Users/jeet/turion-space-demo/satellite/satellite-cad.js:36-54`:
```js
async function loadPartCad(partId) {
  ...
  const resp = await api.get(`/api/parts/${encodeURIComponent(partId)}/drawing`);
  let svg = resp.drawing_svg;
  if (!svg && resp.subsystem_code) {
    // ONLY fall back when drawing_svg is null
    const r = await fetch(`/satellite/cad/${codeToFilename(resp.subsystem_code)}.svg`);
    if (r.ok) svg = await r.text();
  }
  ...
}
```

`/Users/jeet/turion-space-demo/satellite/part.html:217-220`:
```js
let svg = drawing.drawing_svg;
if (!svg && drawing.subsystem_code) {
  svg = await window.satelliteCad.loadSubsystemCad(drawing.subsystem_code);
}
```

Both prefer `drawing_svg` and only fall through on null. **No frontend changes required.**

# Backend handler (already returns drawing_svg verbatim, no change needed)

`/Users/jeet/turion-satellite/backend/src/routes/parts.ts:56-74` GET `/:id/drawing` already SELECTs `pd.drawing_svg` and returns it as `drawing_svg` in the JSON. Once the migration runs, this endpoint will start returning the new SVGs without redeploying the Lambda.

# Existing tests
- `backend/tests/parts.test.ts` covers list / get / drawing handlers via mocked db. No new test file needed for this DB-only change — the smoke test is the contract.
- Run baseline `cd /Users/jeet/turion-satellite/backend && npm test` BEFORE migration to confirm 89/89 passing (post-quick-329 baseline).

@/Users/jeet/turion-satellite/migrations/002_add_part_drawing_svg.sql
@/Users/jeet/turion-satellite/scripts/seed.ts
@/Users/jeet/turion-satellite/backend/src/routes/parts.ts
@/Users/jeet/turion-space-demo/satellite/satellite-cad.js
@/Users/jeet/turion-space-demo/satellite/cad/structure.svg
</context>

<tasks>

<task type="auto">
  <name>Task 1: Verify CAD loader precedence + verify part_number existence in prod DB</name>
  <files>none (read-only verification)</files>
  <action>
Pre-flight checks before writing any SQL. Do all of these and assert each passes; abort the plan if any fail.

1. **Confirm frontend precedence** is unchanged from this plan's snapshot:
   ```bash
   grep -n "let svg = resp.drawing_svg" /Users/jeet/turion-space-demo/satellite/satellite-cad.js
   grep -n "let svg = drawing.drawing_svg" /Users/jeet/turion-space-demo/satellite/part.html
   ```
   Both MUST match. If either is gone, STOP — the precedence assumption is no longer valid and a frontend change becomes part of this plan.

2. **Confirm the 8 part_numbers actually exist in production**. The seed.ts file shows them, but production may have drifted. Pull DATABASE_URL from Secrets Manager and run:
   ```bash
   DATABASE_URL=$(aws secretsmanager get-secret-value --region us-east-1 --secret-id turion-satellite/production/database-url --query SecretString --output text | jq -r '.url // .DATABASE_URL // .')
   # If that returned a JSON object string instead of a URL, inspect raw:
   #   aws secretsmanager get-secret-value --region us-east-1 --secret-id turion-satellite/production/database-url --query SecretString --output text | head -c 300
   psql "$DATABASE_URL" -c "SET search_path TO turion_satellite; SELECT part_number, drawing_svg IS NOT NULL AS has_drawing FROM part_definitions WHERE part_number IN ('STR-ASSY','EPS-SOLAR-CELL-30P','ADCS-RW-MEDIUM-A','PROP-THRUSTER-MONO-A','PAY-TELESCOPE-OTA','COMM-ANT-XBAND-HG','TCS-RADIATOR-PANEL-A','CDH-OBC-MAIN-A') ORDER BY part_number;"
   ```
   MUST return exactly 8 rows. If any part_number is missing, look up its UUID and substitute the closest seeded part of the same subsystem (re-grep `seed.ts` to pick a replacement). Document any substitution at the top of the migration file as a header comment.

3. **Capture baseline test count** (will be re-asserted in Task 3):
   ```bash
   cd /Users/jeet/turion-satellite/backend && npm test 2>&1 | tail -20
   ```
   Expect "89 passed" (post-quick-329 baseline). If different, note current count for regression check.

4. **Confirm migration directory + next number**:
   ```bash
   ls /Users/jeet/turion-satellite/migrations/
   ```
   MUST show `001_*.sql` and `002_add_part_drawing_svg.sql`. Next migration number is **003**. If 003 already exists, STOP and reconcile.
  </action>
  <verify>
- `grep` returns both expected lines verbatim from satellite-cad.js + part.html
- psql query returns exactly 8 rows; each `has_drawing` is currently `f` (or, if some are already `t`, the migration's `WHERE drawing_svg IS NULL` clause from Task 2 will leave them alone — note this in the SUMMARY)
- baseline `npm test` shows the documented count (89 expected) with zero failures
- `ls migrations/` shows 001 + 002 only (not 003)
  </verify>
  <done>
Pre-flight green: precedence verified, 8 part rows confirmed in prod, baseline tests pass, migration slot 003 is open. Any substitutions documented for use in Task 2.
  </done>
</task>

<task type="auto">
  <name>Task 2: Author + apply migration 003 with 8 hand-authored isometric SVGs</name>
  <files>/Users/jeet/turion-satellite/migrations/003_seed_per_part_drawing_svg.sql</files>
  <action>
Create `/Users/jeet/turion-satellite/migrations/003_seed_per_part_drawing_svg.sql` with the structure below. Then apply it to production.

**File header (verbatim style match with 002):**
```sql
-- 003_seed_per_part_drawing_svg.sql · 2026-05-10
-- Populates drawing_svg for 8 representative parts (one per subsystem) so each renders
-- a distinct CAD silhouette instead of falling back to the subsystem default at
-- /satellite/cad/{subsystem}.svg. Idempotent: only updates rows where drawing_svg IS NULL,
-- so re-running the migration is a no-op and never overwrites manual edits.
--
-- Run via: psql "$DATABASE_URL" -f migrations/003_seed_per_part_drawing_svg.sql

SET search_path TO turion_satellite, public;
```

**For each of the 8 parts, emit one statement of the form:**
```sql
UPDATE part_definitions
   SET drawing_svg = $svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60">...</svg>$svg$
 WHERE part_number = 'STR-ASSY' AND drawing_svg IS NULL;
```

**Use Postgres dollar-quoted strings** (`$svg$...$svg$`) for the SVG payload — single-quote escaping inside SVGs (apostrophes in label text) becomes a maintenance nightmare otherwise. Dollar quoting is supported in plain SQL files run via psql.

**SVG authoring requirements (each ~2-3KB, distinct from the matching subsystem SVG):**

Use `/Users/jeet/turion-space-demo/satellite/cad/structure.svg` as the style template (linearGradient/radialGradient + filter drop-shadow + wrapping `<g>` + `<text>` label at y=57). Each SVG MUST:
1. Use viewBox `0 0 60 60` and `xmlns="http://www.w3.org/2000/svg"` (so the part.html injection at line 235 scales correctly: `transform="translate(-140,-140) scale(4.7)"`).
2. Contain at least 2 gradient defs (any combination of linearGradient/radialGradient).
3. Contain at least 1 filter for drop-shadow (mirroring the `feGaussianBlur+feOffset+feMerge` pattern from structure.svg).
4. Render an isometric or 3D-projected view of THAT specific part — NOT a copy of the subsystem default. Examples:
   - **STR-ASSY**: Full L1 bus structure with all 4 deck panels visible (more detail than subsystem's simple cuboid). Mounting holes + payload-mount interface ring at top + LV-adapter ring at bottom. Label: `BUS · L1 ASSEMBLY`.
   - **EPS-SOLAR-CELL-30P**: Single solar cell close-up — square with grid line pattern showing the GaAs surface metallization (8x8 finger grid, plus busbar across top), beveled blue/purple gradient face, slight perspective tilt. Label: `GaAs CELL · 30%`.
   - **ADCS-RW-MEDIUM-A**: Reaction wheel cross-section — outer ring (housing) + inner rotor + bearing hub + 4-spoke pattern + radial gradient on the rotor face for spin-axis specularity. Label: `RW · 100 mNms`.
   - **PROP-THRUSTER-MONO-A**: Bell nozzle close-up — converging-diverging cross-section, throat narrowing, exit cone with linearGradient front-to-back, faint plume hint at exit. Label: `THRUSTER · 0.5 N`.
   - **PAY-TELESCOPE-OTA**: Telescope barrel side view — primary mirror at back, secondary mirror on spider in front, baffle tube wrapping, lens cap end visible. Label: `OTA · SDA OPTICAL`.
   - **COMM-ANT-XBAND-HG**: Parabolic dish 3/4 view with feed horn at focus + tripod struts + mounting bracket at back — distinct from subsystem comms.svg (which is more abstract). Label: `X-BAND · HIGH GAIN`.
   - **TCS-RADIATOR-PANEL-A**: Single radiator panel face-on — OSR mirror tile pattern (8x4 grid of tiles with subtle gradient + reflection highlights), thin frame around perimeter. Label: `RADIATOR · OSR`.
   - **CDH-OBC-MAIN-A**: Single PCB top-down — green soldermask gradient, 4-6 IC packages of varying size (the rad-tol SoC dominates center), connector edge along one side, mounting holes at corners, faint trace pattern. Label: `OBC · RAD-TOL SoC`.

Each SVG's `<text>` element MUST contain its EXACT label string from the table in `<context>` so smoke grep can prove uniqueness.

**Idempotence:** every UPDATE has `WHERE part_number = '...' AND drawing_svg IS NULL`. Re-running the migration is safe — already-populated parts are untouched. This also protects against accidentally clobbering future manual edits.

**End-of-file summary block (mirrors seed-demo-data.sql:144-150 style):**
```sql
SELECT part_number, OCTET_LENGTH(drawing_svg) AS svg_bytes, LENGTH(drawing_svg) > 0 AS has_svg
  FROM part_definitions
 WHERE part_number IN (
   'STR-ASSY','EPS-SOLAR-CELL-30P','ADCS-RW-MEDIUM-A','PROP-THRUSTER-MONO-A',
   'PAY-TELESCOPE-OTA','COMM-ANT-XBAND-HG','TCS-RADIATOR-PANEL-A','CDH-OBC-MAIN-A'
 )
 ORDER BY part_number;
```

**Apply the migration:**
```bash
DATABASE_URL=$(aws secretsmanager get-secret-value --region us-east-1 --secret-id turion-satellite/production/database-url --query SecretString --output text | jq -r '.url // .DATABASE_URL // .')
psql "$DATABASE_URL" -f /Users/jeet/turion-satellite/migrations/003_seed_per_part_drawing_svg.sql
```

The trailing SELECT prints the 8 rows + their svg_bytes (~2000-3000 each). Capture this output for the SUMMARY.
  </action>
  <verify>
1. File exists with valid SQL:
   ```bash
   psql "$DATABASE_URL" -f /Users/jeet/turion-satellite/migrations/003_seed_per_part_drawing_svg.sql
   ```
   Trailing SELECT returns 8 rows, each with `svg_bytes` between 1500 and 4000, and `has_svg=t`.

2. Re-run the same `psql -f` invocation a second time. UPDATE row counts MUST all be 0 (idempotence — `WHERE drawing_svg IS NULL` blocks the re-update); trailing SELECT still returns 8 rows. If the second run reports `UPDATE 1` for any statement, the WHERE clause is wrong.

3. Each SVG file is well-formed XML — pipe each one through `xmllint --noout`:
   ```bash
   for pn in STR-ASSY EPS-SOLAR-CELL-30P ADCS-RW-MEDIUM-A PROP-THRUSTER-MONO-A PAY-TELESCOPE-OTA COMM-ANT-XBAND-HG TCS-RADIATOR-PANEL-A CDH-OBC-MAIN-A; do
     psql "$DATABASE_URL" -tA -c "SET search_path TO turion_satellite; SELECT drawing_svg FROM part_definitions WHERE part_number='$pn'" | xmllint --noout - && echo "$pn OK" || echo "$pn FAIL"
   done
   ```
   All 8 must print `OK`.

4. Each SVG contains its required UNIQUE label string (proves we didn't paste the same SVG twice):
   ```bash
   declare -A LABELS=( [STR-ASSY]="BUS · L1 ASSEMBLY" [EPS-SOLAR-CELL-30P]="GaAs CELL · 30%" [ADCS-RW-MEDIUM-A]="RW · 100 mNms" [PROP-THRUSTER-MONO-A]="THRUSTER · 0.5 N" [PAY-TELESCOPE-OTA]="OTA · SDA OPTICAL" [COMM-ANT-XBAND-HG]="X-BAND · HIGH GAIN" [TCS-RADIATOR-PANEL-A]="RADIATOR · OSR" [CDH-OBC-MAIN-A]="OBC · RAD-TOL SoC" )
   for pn in "${!LABELS[@]}"; do
     psql "$DATABASE_URL" -tA -c "SET search_path TO turion_satellite; SELECT drawing_svg LIKE '%${LABELS[$pn]}%' FROM part_definitions WHERE part_number='$pn'" | grep -qx t && echo "$pn label OK" || echo "$pn label MISSING"
   done
   ```
   All 8 must print `label OK`.
  </verify>
  <done>
- `migrations/003_seed_per_part_drawing_svg.sql` committed (will be done in Task 3).
- 8 distinct, well-formed SVGs persisted in `turion_satellite.part_definitions.drawing_svg`.
- Migration is idempotent (second run is a no-op).
- Each SVG contains its unique label string.
  </done>
</task>

<task type="auto">
  <name>Task 3: Live API smoke + frontend smoke + git commit</name>
  <files>none (smoke + commit only)</files>
  <action>
1. **Live API smoke** — verify `/api/parts/:id/drawing` returns the new SVG for each of the 8 parts (no Lambda redeploy needed; Lambda reads from DB at request time).

   First, get a valid bearer token. The frontend uses Supabase magic-link, but for curl smoke the existing `tests/parts.test.ts` shows a synthetic ES256 JWT works. For prod, we need a real session token — easiest path is to log in via `https://turionspace.zietra.com/satellite/` in a browser, open devtools → Application → Local Storage → copy the `sb-lbpkbpfwdpnwlccmlfxn-auth-token` value's `access_token` field. Save as `TOK` env var.

   Resolve UUIDs from part_numbers (one round-trip):
   ```bash
   DATABASE_URL=$(aws secretsmanager get-secret-value --region us-east-1 --secret-id turion-satellite/production/database-url --query SecretString --output text | jq -r '.url // .DATABASE_URL // .')
   psql "$DATABASE_URL" -tA -F$'\t' -c "SET search_path TO turion_satellite; SELECT part_number, id FROM part_definitions WHERE part_number IN ('STR-ASSY','EPS-SOLAR-CELL-30P','ADCS-RW-MEDIUM-A','PROP-THRUSTER-MONO-A','PAY-TELESCOPE-OTA','COMM-ANT-XBAND-HG','TCS-RADIATOR-PANEL-A','CDH-OBC-MAIN-A') ORDER BY part_number" > /tmp/331-parts.tsv
   cat /tmp/331-parts.tsv
   ```

   Curl each one and grep for the unique label:
   ```bash
   API=https://rjydekliee.execute-api.us-east-1.amazonaws.com
   declare -A LABELS=( [STR-ASSY]="BUS · L1 ASSEMBLY" [EPS-SOLAR-CELL-30P]="GaAs CELL · 30%" [ADCS-RW-MEDIUM-A]="RW · 100 mNms" [PROP-THRUSTER-MONO-A]="THRUSTER · 0.5 N" [PAY-TELESCOPE-OTA]="OTA · SDA OPTICAL" [COMM-ANT-XBAND-HG]="X-BAND · HIGH GAIN" [TCS-RADIATOR-PANEL-A]="RADIATOR · OSR" [CDH-OBC-MAIN-A]="OBC · RAD-TOL SoC" )
   while IFS=$'\t' read -r PN ID; do
     RESP=$(curl -sS -H "Authorization: Bearer $TOK" "$API/api/parts/$ID/drawing")
     if echo "$RESP" | jq -er '.drawing_svg' | grep -qF "${LABELS[$PN]}"; then
       echo "$PN: PASS — unique label '${LABELS[$PN]}' present in /api/parts/$ID/drawing"
     else
       echo "$PN: FAIL — response: $(echo "$RESP" | head -c 200)"
     fi
   done < /tmp/331-parts.tsv
   ```
   All 8 MUST print PASS. If any FAILs, the migration didn't take or the precedence in the handler broke; abort + investigate before committing.

2. **Auth-gate regression check** — confirm /api/parts/:id/drawing without bearer still returns 401:
   ```bash
   curl -sS -o /dev/null -w "%{http_code}\n" "$API/api/parts/$(head -1 /tmp/331-parts.tsv | cut -f2)/drawing"
   ```
   Expect `401`.

3. **Frontend smoke** stays green (no frontend changes, but proves nothing collateral broke):
   ```bash
   bash /Users/jeet/turion-space-demo/scripts/smoke-frontend.sh
   ```
   Must end with `=== ALL PASS ===`.

4. **Backend test re-run** — the migration touches no Lambda code, but re-run anyway to confirm nothing else regressed:
   ```bash
   cd /Users/jeet/turion-satellite/backend && npm test 2>&1 | tail -5
   ```
   Expect same baseline as Task 1 (89 passing, post-quick-329).

5. **Commit the migration** (turion-satellite repo, single atomic commit, MUST use the required git author):
   ```bash
   cd /Users/jeet/turion-satellite
   git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" add migrations/003_seed_per_part_drawing_svg.sql
   git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" commit -m "$(cat <<'EOF'
   chore(quick-331): seed per-part drawing_svg for 8 representative parts

   Populates turion_satellite.part_definitions.drawing_svg for one chosen
   part per subsystem (STR-ASSY, EPS-SOLAR-CELL-30P, ADCS-RW-MEDIUM-A,
   PROP-THRUSTER-MONO-A, PAY-TELESCOPE-OTA, COMM-ANT-XBAND-HG,
   TCS-RADIATOR-PANEL-A, CDH-OBC-MAIN-A) so each renders a distinct
   isometric CAD silhouette instead of the subsystem default at
   /satellite/cad/{subsystem}.svg.

   Each SVG ~2-3KB with linearGradient/radialGradient defs, drop-shadow
   filter, and a unique part-name label string. Migration is idempotent
   (UPDATEs only WHERE drawing_svg IS NULL).

   No frontend changes — satellite-cad.js and part.html already prefer
   per-part drawing_svg over subsystem fallback. No Lambda redeploy
   needed — handler reads drawing_svg from DB at request time.
   EOF
   )"
   ```

   **Do NOT push** — per CLAUDE.md, git push is local-only unless user explicitly asks.

6. **Visual smoke (1-2 sample parts)** — open the live frontend in a browser:
   - Get a part UUID: `head -1 /tmp/331-parts.tsv | cut -f2` (e.g. STR-ASSY)
   - Navigate to: `https://turionspace.zietra.com/satellite/part.html?id=<UUID>&sat=24587565-b15b-42ce-b590-87ecf9b6bb99`
   - Confirm the CAD viewer shows the NEW unique drawing (not the subsystem default).
   - Repeat for EPS-SOLAR-CELL-30P UUID.

   If the user can't visually confirm in this session, the API smoke (#1) above is the contract — JS-rendered DOM matches what the API returned.
  </action>
  <verify>
- All 8 curl probes print PASS with their unique label string
- Auth-gate regression: 401 without bearer
- `smoke-frontend.sh` returns `=== ALL PASS ===`
- `npm test` baseline preserved (89 passing)
- 1 atomic commit on turion-satellite/main, author `jeet-avatar <jm@techcloudpro.com>` (verify with `git log -1 --pretty=format:"%H %an <%ae>"`)
- Visual confirmation on at least 1 part page in browser (or skipped with explicit note)
  </verify>
  <done>
- 8 parts return their own SVGs from /api/parts/:id/drawing.
- Smoke-frontend stays green, backend tests stay green, auth gate intact.
- Migration committed locally on turion-satellite/main with the required git author identity.
- Frontend visual proof captured (or noted as user-acceptance-gated).
  </done>
</task>

</tasks>

<verification>
End-to-end checks for the whole quick task:

1. Migration file exists and applies cleanly twice (idempotence proven).
2. All 8 chosen part_definitions rows have a non-null, well-formed drawing_svg whose `<text>` element contains the unique label string from the context table.
3. Live `GET /api/parts/:id/drawing` returns the per-part SVG (NOT the subsystem default at /satellite/cad/{subsystem}.svg) for all 8 parts, proven by grepping for the unique label.
4. Auth gate intact (401 without bearer).
5. `scripts/smoke-frontend.sh` returns `=== ALL PASS ===`.
6. `npm test` shows 89 passing (post-quick-329 baseline preserved).
7. 1 atomic commit on turion-satellite/main, author `jeet-avatar <jm@techcloudpro.com>`. No push.
8. Browser-rendered part.html for at least 1 chosen part shows the new distinct CAD drawing (visual UAT).
</verification>

<success_criteria>
- 8 chosen parts now show distinct, isometric, ~2-3KB SVG drawings in part.html that are visibly different from their subsystem-level defaults.
- Per-part precedence path (`drawing_svg` over subsystem fallback) is exercised end-to-end in production for the first time.
- Migration is idempotent and safe to re-run.
- Zero frontend changes (precedence already correct in HEAD).
- Zero Lambda redeploys (handler already reads `drawing_svg` from DB).
- Zero test regressions (backend `npm test` stays at 89/89).
- 1 atomic commit, correct author, file committed but not pushed.
</success_criteria>

<output>
After completion, create `.planning/quick/331-populate-per-part-drawing-svg-for-8-key-/331-SUMMARY.md` capturing:
- Migration filename + commit SHA
- The 8 part_number → UUID mapping pulled in Task 3 step 1
- Trailing SELECT output (8 rows × svg_bytes) from Task 2
- Per-part curl PASS/FAIL grid from Task 3 step 1
- smoke-frontend.sh result
- npm test count delta
- Any deviations or substitutions vs. the spec's candidate part codes
- Visual UAT result (or note it's pending user confirmation)
- Phase X follow-ups (e.g., add per-part SVGs for the remaining ~57 parts? Add an admin upload UI for drawing_svg? Render unique drawings for L2 buy parts via vendor logos?)
</output>
