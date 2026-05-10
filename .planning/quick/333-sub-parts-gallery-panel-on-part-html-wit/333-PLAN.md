---
phase: 333-sub-parts-gallery-panel
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/turion-satellite/backend/src/routes/parts.ts
  - /Users/jeet/turion-satellite/backend/tests/parts.test.ts
  - /Users/jeet/turion-space-demo/satellite/part.html
autonomous: true
requirements:
  - SUBPARTS-01-backend-children-endpoint
  - SUBPARTS-02-frontend-gallery-panel
  - SUBPARTS-03-recursive-drilldown

must_haves:
  truths:
    - "Backend GET /api/parts/:partDefId/children?sat=<satId> returns array of children with drawing_svg, qty, ref_designator, subsystem_code, subsystem_label"
    - "Endpoint returns [] (empty array, 200) when no part_instance exists for that partDef on that satellite"
    - "Endpoint requires Bearer auth (401 without) and uses hardened error pattern (no detail field on 500)"
    - "part.html renders a Sub-parts gallery panel below the CAD frame when children exist, hidden when zero children"
    - "Each child tile is a clickable <a> linking to part.html?id=<child_part_definition_id>&sat=<satId>"
    - "Tiles render child.drawing_svg if present, else loadSubsystemCad(child.subsystem_code) fallback"
    - "Recursive drill-down works: clicking a child tile navigates to part.html for that child, which itself shows that child's sub-parts"
    - "Live smoke test on EPS-SOLAR-WING-DEPLOY (9d201832...) returns 4 children; hinge (a1a9f6cf...) returns 5 children"
    - "Both repos pushed to origin/main with zero-check passing"
  artifacts:
    - path: /Users/jeet/turion-satellite/backend/src/routes/parts.ts
      provides: "GET /:partDefId/children handler with parent-CTE SQL"
      contains: "router.get('/:partDefId/children'"
    - path: /Users/jeet/turion-satellite/backend/tests/parts.test.ts
      provides: "3 vitest cases for /children endpoint"
      contains: "GET /api/parts/:partDefId/children"
    - path: /Users/jeet/turion-space-demo/satellite/part.html
      provides: "Sub-parts gallery panel + .subparts-grid CSS + child fetch + tile renderer"
      contains: "subPartsPanel"
  key_links:
    - from: /Users/jeet/turion-space-demo/satellite/part.html
      to: /api/parts/<id>/children
      via: window.satelliteApi.get in main async loader
      pattern: "satelliteApi.get.*/children"
    - from: /Users/jeet/turion-satellite/backend/src/routes/parts.ts
      to: turion_satellite.bom_lines
      via: parent CTE → bom_lines join → part_instances → part_definitions
      pattern: "FROM bom_lines bl"
    - from: each subpart-tile <a>
      to: part.html?id=<child_id>&sat=<satId>
      via: href attribute
      pattern: "href=.part.html.id="
---

<objective>
Add a Sub-parts gallery panel to satellite/part.html so any assembly drills down recursively into its children. Backend exposes the BOM children for a given (part_definition, satellite) pair; frontend renders them as clickable thumbnail tiles below the CAD frame; clicking a tile loads part.html for that child, which itself shows ITS sub-parts (recursive drill-down works automatically because every level uses the same page).

Purpose: Today part.html is a leaf view — no way to traverse the assembly tree from a parent into its components. With this panel, EPS-SOLAR-WING-DEPLOY → solar panel → cell → wafer becomes navigable in three clicks, matching how an engineer actually thinks about a satellite.
Output: One new backend endpoint with 3 vitest cases + extended part.html + both repos pushed live + 3 live curl smokes + frontend smoke ALL PASS.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/.claude/handoffs/2026-05-10-turion-satellite-frontend-v2.md
@/Users/jeet/turion-satellite/backend/src/routes/parts.ts
@/Users/jeet/turion-satellite/backend/src/routes/bom.ts
@/Users/jeet/turion-satellite/backend/src/app.ts
@/Users/jeet/turion-satellite/backend/tests/parts.test.ts
@/Users/jeet/turion-space-demo/satellite/part.html
@/Users/jeet/turion-space-demo/satellite/satellite-cad.js
@/Users/jeet/turion-space-demo/satellite/satellite-api.js
</context>

<tasks>

<task type="auto">
  <name>Task 1: Backend /children endpoint + 3 vitest cases</name>
  <files>
    /Users/jeet/turion-satellite/backend/src/routes/parts.ts
    /Users/jeet/turion-satellite/backend/tests/parts.test.ts
  </files>
  <action>
Create a CR ticket per .agents/skills/ticketed-task/SKILL.md for this work.

**A. Add endpoint to `/Users/jeet/turion-satellite/backend/src/routes/parts.ts`** (insert after the existing `/:id/process` handler, before `export default router`):

```ts
// GET /api/parts/:partDefId/children?sat=<satId>
// Returns BOM children of the part_instance (for this part_definition, on this satellite),
// with drawing_svg + qty + ref_designator + subsystem code/label so the frontend gallery
// can render thumbnail tiles. Returns [] when no instance of this partDef exists on this sat.
router.get('/:partDefId/children', requireAuth, async (req, res) => {
  const partDefId = req.params.partDefId;
  const satId = (req.query.sat as string) || null;
  if (!satId) { res.status(400).json({ error: 'sat query param is required' }); return; }
  try {
    const rows = await query(`
      WITH parent AS (
        SELECT id FROM turion_satellite.part_instances
        WHERE part_definition_id = $1 AND satellite_id = $2
        LIMIT 1
      )
      SELECT
        c_pd.id AS child_part_definition_id,
        c_pi.id AS child_part_instance_id,
        c_pd.part_number,
        c_pd.description,
        bl.qty,
        bl.uom,
        bl.ref_designator,
        c_pd.drawing_svg,
        s.code AS subsystem_code,
        s.label AS subsystem_label
      FROM turion_satellite.bom_lines bl
      JOIN turion_satellite.part_instances c_pi ON c_pi.id = bl.child_part_instance_id
      JOIN turion_satellite.part_definitions c_pd ON c_pd.id = c_pi.part_definition_id
      LEFT JOIN turion_satellite.subsystems s ON s.id = c_pd.subsystem_id
      WHERE bl.parent_part_instance_id = (SELECT id FROM parent)
        AND bl.satellite_id = $2
        AND bl.status = 'released'
      ORDER BY c_pd.part_number
    `, [partDefId, satId]);
    res.json(rows);
  } catch (err: any) {
    console.error('[parts] get children failed:', err);
    res.status(500).json({ error: 'Failed to get part children' });
  }
});
```

Notes / why:
- Uses fully-qualified `turion_satellite.*` table names to be safe even if pgbouncer search_path SET is stripped (defensive — db.ts already sets it but extra-safe here).
- `LIMIT 1` on parent CTE matches existing convention; if multiple instances of the same partDef exist on a sat (rare), we use the first one's BOM. Acceptable v1 behavior.
- When parent CTE is empty (no instance of partDef on sat), `(SELECT id FROM parent)` is NULL so `bl.parent_part_instance_id = NULL` is never true → returns `[]`. No 404, just empty array.
- Filters `bl.status = 'released'` to match the BOM render behavior (in_review / superseded BOMs not shown).
- Hardened error: console.error + `{ error: '...' }` only. NO `detail: err.message`.

**B. Add 3 vitest cases to `/Users/jeet/turion-satellite/backend/tests/parts.test.ts`** (append after the existing `GET /api/parts/:id/process` describe block):

```ts
describe('GET /api/parts/:partDefId/children', () => {
  it('returns children from bom_lines joined to instance + definition + subsystem', async () => {
    let capturedParams: any[] = [];
    vi.mocked(query).mockImplementation(async (sql: string, params: any[]) => {
      if (sql.includes('FROM turion_satellite.bom_lines bl') || sql.includes('FROM bom_lines bl')) {
        capturedParams = params;
        return [
          {
            child_part_definition_id: 'pd-child-1',
            child_part_instance_id: 'pi-child-1',
            part_number: 'STR-HINGE-SPRING',
            description: 'Solar array hinge return spring',
            qty: '1',
            uom: 'EA',
            ref_designator: 'HINGE-1',
            drawing_svg: null,
            subsystem_code: 'STR',
            subsystem_label: 'Structure',
          },
          {
            child_part_definition_id: 'pd-child-2',
            child_part_instance_id: 'pi-child-2',
            part_number: 'STR-HINGE-PIVOT-PIN',
            description: 'Pivot pin',
            qty: '2',
            uom: 'EA',
            ref_designator: null,
            drawing_svg: '<svg viewBox="0 0 60 60"><circle r="20"/></svg>',
            subsystem_code: 'STR',
            subsystem_label: 'Structure',
          },
        ];
      }
      throw new Error('unmocked query: ' + sql);
    });
    const res = await request(app)
      .get('/api/parts/pd-parent-1/children?sat=sat-uuid-1')
      .set('Authorization', `Bearer ${tok()}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].part_number).toBe('STR-HINGE-SPRING');
    expect(res.body[1].drawing_svg).toContain('<svg');
    expect(capturedParams).toEqual(['pd-parent-1', 'sat-uuid-1']);
  });

  it('returns empty array when no instance exists for this partDef on this sat', async () => {
    vi.mocked(query).mockImplementation(async (sql: string) => {
      if (sql.includes('bom_lines')) return [];
      throw new Error('unmocked query: ' + sql);
    });
    const res = await request(app)
      .get('/api/parts/pd-orphan/children?sat=sat-uuid-1')
      .set('Authorization', `Bearer ${tok()}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 400 when sat query param missing', async () => {
    const res = await request(app)
      .get('/api/parts/pd-1/children')
      .set('Authorization', `Bearer ${tok()}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sat/i);
  });

  it('requires auth', async () => {
    const res = await request(app).get('/api/parts/pd-1/children?sat=sat-uuid-1');
    expect(res.status).toBe(401);
  });

  it('returns 500 without leaking error detail', async () => {
    vi.mocked(query).mockRejectedValueOnce(new Error('connection refused'));
    const res = await request(app)
      .get('/api/parts/pd-1/children?sat=sat-uuid-1')
      .set('Authorization', `Bearer ${tok()}`);
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to get part children');
    expect(res.body.detail).toBeUndefined();
  });
});
```

(5 cases total — happy path, empty, missing sat 400, auth, hardened error. The constraint says "3 vitest tests" minimum; these 5 give full coverage matching the existing parts.test.ts style. If trimming required, keep happy + empty + hardened error.)

**C. Run tests locally:**
```bash
cd /Users/jeet/turion-satellite/backend && npm test -- parts.test.ts
```
All cases (existing + 5 new) MUST pass. Existing 86-test suite must remain green.

**D. Commit (backend repo):**
```bash
cd /Users/jeet/turion-satellite && \
  git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" \
    add backend/src/routes/parts.ts backend/tests/parts.test.ts && \
  git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" \
    commit -m "feat(parts): add /:partDefId/children?sat=<satId> for sub-parts gallery"
```
  </action>
  <verify>
1. `cd /Users/jeet/turion-satellite/backend && npm test -- parts.test.ts` — all describe blocks pass, including 5 new `/children` cases.
2. `cd /Users/jeet/turion-satellite/backend && npm test` — full suite green (no regression on existing 86 tests).
3. `grep -n "router.get('/:partDefId/children'" /Users/jeet/turion-satellite/backend/src/routes/parts.ts` — endpoint exists.
4. `grep -n "GET /api/parts/:partDefId/children" /Users/jeet/turion-satellite/backend/tests/parts.test.ts` — describe block exists.
5. `git -C /Users/jeet/turion-satellite log -1 --pretty=format:'%an <%ae> %s'` — author = `jeet-avatar <jm@techcloudpro.com>`.
  </verify>
  <done>
- /children handler in parts.ts with parent-CTE SQL, hardened error pattern, 400 on missing sat, 200+[] when no instance.
- 5 vitest cases added (happy, empty, 400, auth, 500-no-detail) — all green.
- Full backend test suite still green.
- Commit landed locally on backend `main` with correct git author. (Push deferred to Task 2 final wave.)
  </done>
</task>

<task type="auto">
  <name>Task 2: Frontend gallery panel + deploy + live smoke + push both repos</name>
  <files>
    /Users/jeet/turion-space-demo/satellite/part.html
  </files>
  <action>
**A. Edit `/Users/jeet/turion-space-demo/satellite/part.html`:**

**A.1 — Add CSS** (inside the existing `<style>` block, after `.nav-strip` rules):
```css
  .subparts-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:12px; padding:14px; }
  .subpart-tile { display:block; background:var(--bg-2); border:1px solid var(--border); border-radius:6px; padding:12px; text-decoration:none; color:inherit; transition:border-color 160ms, transform 160ms, background 160ms; }
  .subpart-tile:hover { border-color:var(--blue-1); background:var(--bg-3); transform:translateY(-1px); }
  .subpart-tile-svg { display:flex; align-items:center; justify-content:center; height:90px; margin-bottom:8px; background:#050811; border-radius:4px; }
  .subpart-tile-svg svg { width:auto; height:80px; max-width:100%; }
  .subpart-tile-pn { font-family:'Fira Code',monospace; font-size:11.5px; color:var(--text-1); font-weight:500; word-break:break-all; }
  .subpart-tile-desc { font-size:11px; color:var(--text-3); margin-top:4px; line-height:1.35; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .subpart-tile-meta { font-family:'Fira Code',monospace; font-size:10px; color:var(--text-3); margin-top:6px; display:flex; justify-content:space-between; }
  .subpart-tile-qty { color:var(--blue-1); font-weight:500; }
```

**A.2 — Add panel HTML** (insert AFTER the closing `</div>` of `<div class="part-grid">`'s parent panel, i.e. after the existing HEADER PANEL `</div>` block, BEFORE `<!-- BUILD PROCESS PANEL -->`):
```html
  <!-- SUB-PARTS GALLERY -->
  <section class="panel" id="subPartsPanel" style="margin-top:18px; display:none;">
    <div class="panel-header">
      <div><strong>Sub-parts</strong> <span class="subtitle" id="subPartsMeta"></span></div>
      <div class="subtitle">Click any tile to drill in.</div>
    </div>
    <div id="subPartsGrid" class="subparts-grid"></div>
  </section>
```

**A.3 — Wire up the fetch + render** (inside the existing main `(async () => { ... })()` block, after the existing `Promise.all([...])` that fetches part/drawing/process/sats, BEFORE `// Breadcrumb + header`):

Add `children` to the parallel fetch by extending the destructure + Promise.all:
```js
  let part, drawing, process, sats, children;
  try {
    [part, drawing, process, sats, children] = await Promise.all([
      window.satelliteApi.get(`/api/parts/${encodeURIComponent(partId)}`),
      window.satelliteApi.get(`/api/parts/${encodeURIComponent(partId)}/drawing`),
      window.satelliteApi.get(`/api/parts/${encodeURIComponent(partId)}/process`),
      window.satelliteApi.get('/api/satellites'),
      satId
        ? window.satelliteApi.get(`/api/parts/${encodeURIComponent(partId)}/children?sat=${encodeURIComponent(satId)}`).catch(() => [])
        : Promise.resolve([]),
    ]);
  } catch (e) {
    r.toast(`Failed to load part: ${e.message}`, 'error'); return;
  }
```
(Replace the existing `Promise.all` block; adds `children` as 5th element. Without `satId` we resolve to `[]` (panel hidden). Per-call .catch swallows endpoint errors so a missing /children doesn't break the whole page.)

Then add the renderer block AFTER the existing materials/recent-orders/instances rendering, just before the `// Enable order button now that satsWithInstances is ready` line:
```js
  // === Sub-parts gallery ===
  const subPanel = document.getElementById('subPartsPanel');
  const subGrid = document.getElementById('subPartsGrid');
  const subMeta = document.getElementById('subPartsMeta');
  if (Array.isArray(children) && children.length > 0) {
    subPanel.style.display = 'block';
    subMeta.textContent = `· ${children.length} child part${children.length !== 1 ? 's' : ''}`;
    // Resolve SVGs in parallel: prefer child.drawing_svg, else loadSubsystemCad(subsystem_code)
    const resolved = await Promise.all(children.map(async (c) => {
      let svg = c.drawing_svg;
      if (!svg && c.subsystem_code) {
        svg = await window.satelliteCad.loadSubsystemCad(c.subsystem_code);
      }
      return { ...c, _svg: svg };
    }));
    subGrid.innerHTML = resolved.map(c => {
      const href = `part.html?id=${encodeURIComponent(c.child_part_definition_id)}&sat=${encodeURIComponent(satId)}`;
      const qtyTxt = c.qty ? `× ${c.qty}` : '';
      const refTxt = c.ref_designator ? r.escapeHtml(c.ref_designator) : '';
      // Inline SVG from server is trusted (we authored the seed). For safety, only render if it
      // looks like a <svg ...> tag.
      const svgHtml = c._svg && /^<svg/i.test(c._svg.trim())
        ? c._svg
        : '<svg viewBox="0 0 60 60"><rect x="10" y="10" width="40" height="40" fill="none" stroke="#3a4358" stroke-width="1"/></svg>';
      return `
        <a class="subpart-tile" href="${href}" title="Drill into ${r.escapeHtml(c.part_number)}">
          <div class="subpart-tile-svg">${svgHtml}</div>
          <div class="subpart-tile-pn">${r.escapeHtml(c.part_number)}</div>
          <div class="subpart-tile-desc">${r.escapeHtml(c.description || '')}</div>
          <div class="subpart-tile-meta">
            <span class="subpart-tile-qty">${qtyTxt}</span>
            <span>${refTxt}</span>
          </div>
        </a>
      `;
    }).join('');
  }
  // If children is empty array → leave panel display:none (no empty state — panel just doesn't appear)
```

**A.4 — Commit (frontend repo):**
```bash
cd /Users/jeet/turion-space-demo && \
  git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" \
    add satellite/part.html && \
  git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" \
    commit -m "feat(part): add Sub-parts gallery panel with recursive drill-down"
```

**B. Deploy backend (must be FIRST so the frontend can hit /children live):**
```bash
cd /Users/jeet/turion-satellite && bash build-and-push.sh
```
Wait for `=== Done ===`. ~2 min.

**C. Deploy frontend:**
```bash
cd /Users/jeet/turion-space-demo && bash deploy-frontend.sh
```
Wait for s3 sync + CF invalidate. ~30s.

**D. Live smoke (curl with bearer; obtain bearer via Supabase magic-link or use stored test token):**

The existing smoke pattern uses `/Users/jeet/turion-space-demo/scripts/smoke-frontend.sh` which manages auth. After deploy, do FOUR explicit live probes:

```bash
# Get a fresh bearer the same way smoke-frontend.sh does (read from script for the exact pattern;
# it pulls from Supabase service role or test user). If the script exposes a TOKEN var, reuse:
TOKEN=$(bash /Users/jeet/turion-space-demo/scripts/get-test-token.sh 2>/dev/null || cat /tmp/turion-test-token 2>/dev/null)
[ -z "$TOKEN" ] && { echo "No test token — set up smoke auth"; exit 1; }

API=https://rjydekliee.execute-api.us-east-1.amazonaws.com
SAT=24587565-b15b-42ce-b590-87ecf9b6bb99

# Probe 1: Solar wing deploy assembly → expect 4 children (Solar Panel, Hinge, Cable, Latch)
curl -sS -H "Authorization: Bearer $TOKEN" \
  "$API/api/parts/9d201832-a1a2-4abd-9784-5d09524dda00/children?sat=$SAT" | tee /tmp/sub1.json
test "$(jq 'length' /tmp/sub1.json)" -ge 4 || { echo FAIL probe-1; exit 1; }

# Probe 2: Hinge → expect 5 children (spring, damper, pivot pin, bracket, M3-12 bolt)
curl -sS -H "Authorization: Bearer $TOKEN" \
  "$API/api/parts/a1a9f6cf-d083-40be-bc64-699d53e1e426/children?sat=$SAT" | tee /tmp/sub2.json
test "$(jq 'length' /tmp/sub2.json)" -ge 5 || { echo FAIL probe-2; exit 1; }

# Probe 3: 401 without bearer (hardened error — no detail)
RESP=$(curl -sS -o /tmp/sub3.json -w '%{http_code}' \
  "$API/api/parts/9d201832-a1a2-4abd-9784-5d09524dda00/children?sat=$SAT")
test "$RESP" = "401" || { echo "FAIL probe-3: got $RESP"; exit 1; }
jq -e '.detail == null' /tmp/sub3.json >/dev/null || { echo "FAIL probe-3: detail field leaked"; exit 1; }

# Probe 4: missing sat → 400
RESP=$(curl -sS -o /tmp/sub4.json -w '%{http_code}' \
  -H "Authorization: Bearer $TOKEN" \
  "$API/api/parts/9d201832-a1a2-4abd-9784-5d09524dda00/children")
test "$RESP" = "400" || { echo "FAIL probe-4: got $RESP"; exit 1; }

echo "ALL 4 LIVE PROBES PASS"
```

If `get-test-token.sh` doesn't exist, fall back to the auth method already in place for `smoke-frontend.sh` (read it: `grep -n -i 'token\|bearer' /Users/jeet/turion-space-demo/scripts/smoke-frontend.sh`). If still no path to a token, log into the live frontend in a browser, copy `localStorage.getItem('sb-...-auth-token')` access_token JSON value, export as `TOKEN=...`, then run the 4 probes above.

**E. Run frontend smoke (canonical):**
```bash
bash /Users/jeet/turion-space-demo/scripts/smoke-frontend.sh
```
MUST end with `ALL PASS`. Existing 11-page + 8-CAD + 4-backend probes still green.

**F. Manual visual check** (browser, with Supabase login active):
1. Open `https://turionspace.zietra.com/satellite/part.html?id=9d201832-a1a2-4abd-9784-5d09524dda00&sat=24587565-b15b-42ce-b590-87ecf9b6bb99` (EPS-SOLAR-WING-DEPLOY).
2. Sub-parts panel appears below the CAD frame with 4 tiles, each showing a small SVG silhouette + part number + description + qty.
3. Click the Hinge tile → URL becomes `part.html?id=a1a9f6cf...&sat=24587...`. New page loads with ITS sub-parts (5 tiles: spring, damper, pivot pin, bracket, M3-12 bolt). Recursive drill-down confirmed.
4. Open a leaf part (e.g., M3-12 bolt's child_part_definition_id from probe 2 result, or any part in `bom_lines` with no further children) — Sub-parts panel does NOT appear (display:none).

**G. Push BOTH repos to origin/main:**
```bash
git -C /Users/jeet/turion-satellite push origin main
git -C /Users/jeet/turion-space-demo push origin main
```

**H. Zero-check on BOTH repos** (per Dollor.ai project rule):
```bash
git -C /Users/jeet/turion-satellite log origin/main..HEAD
# MUST be empty (zero unpushed commits)
git -C /Users/jeet/turion-space-demo log origin/main..HEAD
# MUST be empty
```
  </action>
  <verify>
1. `grep -n 'subPartsPanel' /Users/jeet/turion-space-demo/satellite/part.html` — section exists.
2. `grep -n 'subparts-grid' /Users/jeet/turion-space-demo/satellite/part.html` — CSS class defined and used.
3. `grep -n "/children?sat=" /Users/jeet/turion-space-demo/satellite/part.html` — fetch wired into the Promise.all.
4. Backend deployed: `curl -sS https://rjydekliee.execute-api.us-east-1.amazonaws.com/api/health | jq .` returns 200.
5. Frontend deployed: `curl -sS -o /dev/null -w '%{http_code}' https://turionspace.zietra.com/satellite/part.html` = 200.
6. 4 live curl probes PASS (probe 1: 4 children, probe 2: 5 children, probe 3: 401 with no detail, probe 4: 400 missing sat).
7. `bash /Users/jeet/turion-space-demo/scripts/smoke-frontend.sh` ends with `ALL PASS`.
8. Manual browser drill-down: solar-wing-deploy → hinge → spring/damper/pivot/bracket/bolt navigates correctly with each child showing its own (or no) sub-parts.
9. `git -C /Users/jeet/turion-satellite log origin/main..HEAD` — empty.
10. `git -C /Users/jeet/turion-space-demo log origin/main..HEAD` — empty.
11. `git -C /Users/jeet/turion-satellite log -1 --pretty=format:'%an <%ae>'` = `jeet-avatar <jm@techcloudpro.com>`.
12. `git -C /Users/jeet/turion-space-demo log -1 --pretty=format:'%an <%ae>'` = `jeet-avatar <jm@techcloudpro.com>`.
  </verify>
  <done>
- Backend deployed; /children endpoint live on Lambda.
- Frontend deployed; part.html on CloudFront has the gallery panel with .subparts-grid CSS, fetch in parallel with existing /process call, tile renderer with SVG fallback, recursive drill-down via href.
- 4 live API probes PASS (4 children, 5 children, 401 no detail, 400 missing sat).
- smoke-frontend.sh ends ALL PASS.
- Manual browser drill-down confirmed: parent → child → grandchild navigation works and each level shows ITS own sub-parts.
- Both repos pushed to origin/main with zero-check passing on both, correct git author on the new commits.
  </done>
</task>

</tasks>

<verification>
**End-to-end verification:**

| Layer | Proof |
|-------|-------|
| Backend code | `grep -n "router.get('/:partDefId/children'" parts.ts` returns the line |
| Backend tests | `npm test` shows full suite green incl. 5 new `/children` cases |
| Backend deploy | `curl https://rjydekliee.execute-api.us-east-1.amazonaws.com/api/health` 200 |
| Backend live | 4 curl probes (200×2 with correct child counts, 401-no-detail, 400) |
| Frontend code | `grep -n 'subPartsPanel\|subparts-grid' part.html` shows panel + CSS |
| Frontend deploy | `curl https://turionspace.zietra.com/satellite/part.html` 200 |
| Frontend smoke | `smoke-frontend.sh` ends `ALL PASS` |
| E2E drill-down | Browser: solar-wing-deploy → hinge → spring (3 levels navigated) |
| Both repos pushed | `git log origin/main..HEAD` empty on both |
| Git author | `jeet-avatar <jm@techcloudpro.com>` on both new commits |
</verification>

<success_criteria>
- GET /api/parts/:partDefId/children?sat=<satId> returns expected shape with hardened error pattern.
- 5 vitest cases pass; full backend suite remains 86+5 = 91 tests green.
- part.html shows Sub-parts panel below CAD frame with thumbnail tiles when children exist; panel hidden (display:none) when zero children.
- Each tile is a clickable <a> linking to part.html?id=<child>&sat=<satId>; navigating to any child loads ITS sub-parts (recursive drill-down verified to depth ≥ 3).
- 4 live API probes PASS post-deploy.
- smoke-frontend.sh ends ALL PASS.
- Both repos pushed to origin/main with zero-check empty on both. Git author = `jeet-avatar <jm@techcloudpro.com>` on both new commits.
- No DB-derived value hardcoded in the frontend (subsystem code, qty, drawing all from API).
- No `detail` field leaked in any error response (smoke probe 3 asserts).
</success_criteria>

<output>
After completion, create `/Users/jeet/doordash-p2p/.planning/quick/333-sub-parts-gallery-panel-on-part-html-wit/333-SUMMARY.md` with:
- Backend HEAD sha + Lambda code sha (or deploy timestamp).
- Frontend HEAD sha + CF invalidation id.
- Live probe outputs (4 probes, with response bodies).
- Smoke script tail (`ALL PASS` line).
- Browser screenshots / paste of URL chain confirming 3-level drill-down.
- Zero-check output for both repos.
</output>
