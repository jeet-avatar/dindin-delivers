---
phase: 65
plan: 01
subsystem: solobrands-tenant-data + pitch-content
tags: [solobrands, zietra, real-data-import, sec-filings, pitch-refresh, fy25]
requires:
  - "Phase pitch-solobrands placeholder seed in DB"
  - "scraped product catalog at /Users/jeet/Downloads/solobrands-research-2026-05-16/"
  - "FY25 10-K facts extracted from SEC EDGAR (CIK 1870600)"
provides:
  - "109 real scraped products in turion.items for solobrands tenant"
  - "4 representative sales orders ($71K total) using verified item IDs"
  - "/pitch.html refreshed with FY25 financials + Larson bio + supply pivot"
  - "data/solobrands-corporate.json static file for Phase 65-02 wizard consumption"
affects:
  - "https://solobrands.zietra.com/netsuite/items (page now shows 109 SKUs)"
  - "https://solobrands.zietra.com/sales/orders (4 reps orders)"
  - "https://solobrands.zietra.com/pitch (refreshed for John Larson outreach)"
tech-stack:
  added: []
  patterns:
    - "Statement-by-statement SQL execution against zietra-rls-runner-55-05 Lambda"
    - "SESSION_SET capture+replay in run-sql.sh to handle stateless runner Lambda + RLS session var"
    - "Idempotent ON CONFLICT (id) DO UPDATE for re-runnable imports"
    - "source_data jsonb pattern: brand/sku/slug/list_price/msrp/image_url/product_url packed into items.source_data"
key-files:
  created:
    - "/Users/jeet/doordash-p2p/scripts/65-solobrands-import/build-import-sql.py"
    - "/Users/jeet/doordash-p2p/scripts/65-solobrands-import/run-sql.sh"
    - "/Users/jeet/doordash-p2p/scripts/65-solobrands-import/sql/wipe.sql"
    - "/Users/jeet/doordash-p2p/scripts/65-solobrands-import/sql/import-items.sql"
    - "/Users/jeet/doordash-p2p/scripts/65-solobrands-import/sql/import-sales-orders.sql"
    - "/Users/jeet/turion-space-demo/data/solobrands-corporate.json"
  modified:
    - "/Users/jeet/turion-space-demo/pitch.html"
    - "/Users/jeet/turion-space-demo/scripts/smoke-solobrands.sh"
decisions:
  - "Skip TerraFlame entirely — brand divested Jun 12, 2025 (sold back to original sellers for -$2.5M cash payment OUT). Retained as note in pitch + corporate-info.json only."
  - "Use double-prefix item IDs (e.g. ORU-ORU-LAKE, CHUB-CHUB-DREAMHOUSE-PINKS-55-SWIM) when scraped SKUs already start with brand acronym — preserves traceability to source SKU."
  - "Keep 19 parts + 8 customers + 5 vendors + 7 agent runs + 1 ECO from Phase pitch-solobrands seed — still valid demo data; only items + sales_orders were wiped."
  - "Use SOLO-BONFIRE-19-5 ($299.99) for REI wholesale order — Bonfire 2.0 SKU doesn't appear in scraped catalog, the 19.5\" standalone is the closest verified product."
  - "Run all DB writes via existing zietra-rls-runner-55-05 Lambda + SET app.tenant_id (no new infra). Patched run-sql.sh to replay the SET on every invocation because runner is stateless."
  - "Pitch.html — target John Larson directly for Wedge 3 (not Q3 CFO replacement) because Larson IS a turnaround CEO (Bestop 2015-21 Jeep aftermarket; Escort 2008-14) and back-office consolidation matches his prior playbook."
metrics:
  duration_minutes: 16
  duration_seconds: 982
  completed_date: 2026-05-16
  task_count: 7
  file_count_created: 6
  file_count_modified: 2
  items_imported: 109
  sales_orders_imported: 4
  total_so_value_usd: 71181.50
  brands_covered: 4
  brands_skipped: 3
  smoke_pass: 45
  smoke_fail: 0
---

# Phase 65 Plan 01: Solo Brands Real-Data Import + Pitch Refresh Summary

**One-liner:** Replaced 15 placeholder items with 109 real scraped Solo Stove + Oru + ISLE + Chubbies products + 4 representative sales orders, and refreshed `/pitch.html` with verified FY25 10-K financials (revenue $316.58M, op-loss -$113M, 327 employees, NYSE delisted) + John Larson turnaround bio + supply chain pivot context.

## What shipped

### A. Data layer — Solo Brands tenant (`45896e95-699f-494d-882b-bd780dfe46f3`)

**Wiped (Phase pitch-solobrands placeholders):**
- 15 placeholder items (TerraFlame×3 + Solo Stove×3 + Chubbies×3 + Oru×3 + ISLE×3)
- 5 placeholder sales orders

**Kept untouched (still valid demo data):**
- 19 parts (Oru Lake BOM 10 + ISLE Pioneer BOM 9)
- 8 customers
- 5 vendors
- 1 ECO (ECO-2026-0001)
- 7 agent runs (NCR→CAPA, EVMS Watchdog, Integration Sentinel)

**Imported (109 real scraped products):**

| Brand | Count | Catalog source | Price range | Total MSRP |
|---|---|---|---|---|
| Solo Stove | 32 | SFCC sitemap-custom-index.xml + per-PDP JSON-LD | $9.99 - $679.99 | $7,453.68 |
| Oru Kayak | 22 | Shopify products.json (limit=50) | $80 - $2,166 | $22,477.00 |
| ISLE | 36 | Shopify products.json pages 1-3 | $0.98 - $2,499 | $14,044.98 |
| Chubbies | 19 | chubbiesshorts.com/products.json | $19.50 - $89.50 | $1,167.00 |
| **Total** | **109** |  |  | **$45,142.66** |

Skipped per scope decision:
- **TerraFlame** (brand divested Jun 12, 2025 — entity sold back to original sellers for $2.5M cash payment OUT; IP retained; brand still rolled into Solo Stove segment in FY25 10-K)
- **IcyBreeze** (no scraped catalog yet — round-2 discovery from 10-K mentions)
- **Watersports** umbrella (no standalone storefront)

**4 representative sales orders** ($71,181.50 total) using verified item IDs:

| Order | Customer | Channel | Items | Total | Status |
|---|---|---|---|---|---|
| SO-SB-2026-1001 | REI | wholesale | 100× SOLO-BONFIRE-19-5 | $29,999.00 | fulfilled |
| SO-SB-2026-1002 | Sarah Hennessey | dtc | 1× Oru Lake + 1× ISLE Pioneer Pro 2 | $1,194.00 | shipped |
| SO-SB-2026-1003 | Dick's Sporting Goods | wholesale | 50× ISLE Pioneer Pro 2 | $39,750.00 | fulfilled |
| SO-SB-2026-1004 | Marcus Riley | dtc | 3× Chubbies swim trunks | $238.50 | processing |

### B. `/pitch.html` — refreshed for John Larson outreach

**Removed stale Q1 2026 TradingView data:**
- ~~$62.9M revenue, $1.6M EBITDA (2.5% margin)~~ — wrong CIK in round-1 (had 1881845 = Gymble Inc Charlotte NC; correct is 1870600)

**Added FY25 10-K facts (filed 2026-03-23):**
- Revenue: **$316,580,000** (-30.4% YoY from $454,550,000)
- Operating loss: **-$113,483,000** (3rd straight year)
- Net loss: **-$101,320,000**
- Asset impairment: -$74,401,000 FY25 (~$443M cumulative over 3 years)
- Goodwill: $73.1M (down from $410.6M FY21 — 82% destroyed)
- Stockholders' equity: $46M (down from $363M FY22)
- Employees: 327 (down from ~480)
- Exchange: NYSE delisted April 2026 → OTC (SBDS)
- Market cap: ~$11.5M (May 15, 2026)
- FY26 guidance: $280-310M revenue · $24-30M adj EBITDA

**New sections:**
1. "Why this conversation, why now" card with FY25 metrics table, brand portfolio (6 brands, 2 segments), capital structure ($330M JPMorgan facility), supply chain pivot, **full John P. Larson bio** (Bestop CEO 2015-21, Escort CEO 2008-14, GM 1986-2007, NIU/Purdue), and full leadership roster from Mar 2026 DEF 14A
2. Wedge 1 supply-pivot urgency call-out (Vietnam/Cambodia sourcing makes BOM control existential)
3. Wedge 2 327-employee + RIF context call-out
4. Wedge 3 reframed as Larson turnaround mandate — target John directly, not Q3 CFO replacement

**Stack diagram updated:**
- 5 sub-entities → 6 brands · 2 reportable segments (Solo Stove + TerraFlame brand · Chubbies) · Corp/All Other (Oru · ISLE · Watersports · IcyBreeze)
- 327 employees · 2 active DCs (Grapevine + Manchester)

**Counts on the page:**
- "109 real SKUs across 4 live brands" (was "15 SKUs across 5 brands")
- "4 representative orders ($71K)" (was "5 sales orders ($96K)")
- ISLE Pioneer BOM corrected 8 → 9 parts

### C. `data/solobrands-corporate.json` — Phase 65-02 wizard consumption

Standalone JSON at `https://solobrands.zietra.com/data/solobrands-corporate.json` (244-line file) holding:

- **company:** legal name, ticker, exchange, CIK, EIN, SIC, HQ address, phone, IR contact
- **leadership:** Larson full bio + 3 executives + 7-person board (incl. former Deckers CEO David Powers)
- **financials_fy25:** revenue, op loss, net loss, impairment, equity, cash, market cap, FY26 guidance, restructuring breakdown
- **financials_history:** 5-year revenue + op loss + goodwill + impairment series
- **capital_structure:** $330M JPMorgan facility (Amendment No 4 Jun 13 2025), 9.17% rate, 2028 maturity, PIK option, covenant relief
- **organization:** 327 employees, 2 reportable segments, 2 DCs, Mexico DC closure
- **brands:** 7 brand entries (4 with catalog imports, 3 not-imported with notes incl. TerraFlame divestiture)
- **supply_chain:** FY25 actions (China → Vietnam/Cambodia after Section 321 repeal)
- **recent_sec_filings:** 10-Q, DEF 14A, 10-K with direct EDGAR URLs
- **zietra_pitch_hooks:** 5 ready-to-render bullets for wizard

### D. Smoke test refresh

`scripts/smoke-solobrands.sh` baseline updated:
- items: 15 → 109
- sales_orders: 5 → 4
- Added 8 new pitch needles: `316,580,000`, `John P. Larson`, `Bestop`, `JPMorgan`, `Vietnam`, `FY25 10-K`, `109 real SKUs`, `327`

Full smoke matrix passes **45/45** (was 32/32 pre-refresh).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocker] run-sql.sh failed because runner Lambda is stateless**

- **Found during:** Task 2 (wipe.sql execution)
- **Issue:** First invocation of wipe.sql returned `invalid input syntax for type uuid: ""` on every statement after the `SET app.tenant_id=...`. RLS policy uses `current_setting('app.tenant_id')::uuid` but the runner Lambda terminates the Postgres session after each invocation, so the SET doesn't persist.
- **Fix:** Patched `run-sql.sh` to detect `SET app.tenant_id=...` lines, capture them into `SESSION_SET`, and prefix the captured SET to every subsequent statement's payload (`SET ... ; STMT`).
- **Files modified:** `scripts/65-solobrands-import/run-sql.sh`
- **Commit:** `ac3a0c4e`
- **Verification:** Wipe re-ran and reported `items_remaining=0`, `sales_orders_remaining=0`. Turion regression check passed (59 items unchanged).

**2. [Rule 1 — Bug] Sales-order item_id references didn't match actual imported item IDs**

- **Found during:** Task 4 (sales-order import)
- **Issue:** Pre-flight I guessed item IDs as `ORU-OUTDOOR-FOLDABLE`, `ISLE-PIONEER-PRO-2`, `SOLO-SS-BONFIRE-2.0`, etc. Actual canonical IDs after items import are `ORU-ORU-LAKE` (double-prefix because scraped SKU `oru-lake` already starts with `oru`), `ISLE-ISLE-PIONEER-PRO-2`, `SOLO-BONFIRE-19-5` (no Bonfire 2.0 in scraped catalog — closest is the 19.5" standalone).
- **Fix:** Queried `turion.items` for the actual IDs and patched `SALES_ORDERS` constant in `build-import-sql.py`, regenerated `import-sales-orders.sql`, re-ran.
- **Files modified:** `scripts/65-solobrands-import/build-import-sql.py`
- **Commit:** `5956d081`
- **Verification:** 4 sales orders inserted, totals match ($71,181.50). Spot-checked all 6 distinct item IDs exist in DB.

### Skipped per scope decision

- **TerraFlame products** — brand entity divested Jun 12, 2025. Round-1 had 2 TerraFlame items; intentionally NOT re-imported. Documented as note in `data/solobrands-corporate.json` + the pitch's "Why this conversation" card.
- **IcyBreeze** — discovered in round-2 10-K mentions (24x) but no storefront scraped. Documented in corporate JSON only.
- **Watersports** — umbrella brand, no standalone storefront. Documented in corporate JSON only.
- **Tenant module changes** — none. Phase pitch-solobrands already configured the correct 9-module set (`plm, ai-agents, mes, quality, crm, sales, items, purchase, lean-erp-pro`); `royalty`, `dropship`, `qb-migration`, `asc606` correctly disabled. No additions needed.
- **`public.tenants.corporate_data` column** — skipped checking/adding. Corporate data lives in the static `data/solobrands-corporate.json` (Phase 65-02 wizard reads from there) so no schema migration was needed for this phase.

### No authentication gates

All DB writes went through the existing `zietra-rls-runner-55-05` Lambda (provisioned in Phase 55-05). No new IAM, no new secrets, no user action required.

## Verification

| Check | Method | Result |
|---|---|---|
| Old 15 placeholder items wiped | `count(*) FROM turion.items WHERE tenant_id=sb` | 0 after wipe |
| 109 real products inserted | Same query post-import | **109** |
| 4 sales orders inserted with correct totals | `SELECT id, total FROM turion.sales_orders` | $29,999 + $1,194 + $39,750 + $238.50 = $71,181.50 |
| Brand split correct | `GROUP BY source_data->>'brand_name'` | Solo Stove 32 / Oru 22 / ISLE 36 / Chubbies 19 |
| Turion tenant unaffected (RLS isolation) | `count(*) FROM turion.items WHERE tenant_id=turion` | **59** (unchanged) |
| Cross-tenant probe | Turion session query for SOLO/ORU/ISLE/CHUB-prefixed items | 0 visible (RLS enforced) |
| `/pitch.html` reflects new FY25 facts | 12 curl + grep needles | **12/12 PASS** |
| `data/solobrands-corporate.json` reachable + valid schema | curl + Python json.load + key-value assertions | **PASS** |
| Full solobrands smoke matrix | `scripts/smoke-solobrands.sh` | **45/45 PASS** |

## Commits

| Repo | Hash | Message |
|---|---|---|
| `doordash-p2p` | `038e0f55` | feat(65-01): add Solo Brands real-data import scripts (109 products + 4 sales orders) |
| `doordash-p2p` | `ac3a0c4e` | fix(65-01): run-sql.sh — replay SET app.tenant_id on each Lambda invocation |
| `doordash-p2p` | `5956d081` | feat(65-01): use verified turion.items IDs in representative sales orders |
| `turion-space-demo` | `db2feef` | feat(65-01): pitch.html — refresh with FY25 10-K facts + Larson bio + supply pivot |
| `turion-space-demo` | `cfd714e` | feat(65-01): data/solobrands-corporate.json — FY25 corporate facts for Phase 65-02 |
| `turion-space-demo` | `2667490` | chore(65-01): smoke-solobrands.sh — update baseline counts (15->109 items, 5->4 SO, +new pitch needles) |

## Live URLs

- **Pitch:** https://solobrands.zietra.com/pitch
- **Items catalog:** https://solobrands.zietra.com/netsuite/items
- **Sales orders:** https://solobrands.zietra.com/sales/orders
- **Corporate JSON:** https://solobrands.zietra.com/data/solobrands-corporate.json

CloudFront invalidation `IW276JTFJOSPMTFVMCI2QBJQH` completed at 2026-05-16T21:55Z.

## Open follow-ups (for future phases — not blocking)

1. **Phase 65-02 (THE SELLING POINT):** Module-selection wizard + migration onboarding — will consume `data/solobrands-corporate.json` directly.
2. **IcyBreeze + Watersports product scrape** — round-3 scraper job; not blocking for John Larson pitch.
3. **TerraFlame manufacturing relationship doc** — SB still produces TerraFlame product for the divested entity; could be modeled as a contract-manufacturing demo asset for the PLM wedge.
4. **Per-brand revenue mix** — 10-K only discloses 2 reportable segments (Solo Stove + Chubbies), with Oru/ISLE/Watersports/IcyBreeze rolled into "Corporate and All Other." Round-1 brand-mix percentages remain unverified and were intentionally NOT added to the pitch.

## Self-Check: PASSED

All 8 files declared in this SUMMARY exist on disk and all 6 commits exist in their respective repos:

```
FOUND: scripts/65-solobrands-import/build-import-sql.py
FOUND: scripts/65-solobrands-import/run-sql.sh
FOUND: scripts/65-solobrands-import/sql/{wipe,import-items,import-sales-orders}.sql
FOUND: turion-space-demo/data/solobrands-corporate.json
FOUND: turion-space-demo/pitch.html
FOUND: .planning/phases/65-solobrands-real-data/65-01-SUMMARY.md

doordash-p2p commits:        038e0f55, ac3a0c4e, 5956d081
turion-space-demo commits:   db2feef, cfd714e, 2667490
```

Live verification matrix passed 45/45 via `bash scripts/smoke-solobrands.sh`.
CloudFront invalidation `IW276JTFJOSPMTFVMCI2QBJQH` completed.
Turion tenant items unchanged at 59 (RLS isolation confirmed both pre and post wipe).

