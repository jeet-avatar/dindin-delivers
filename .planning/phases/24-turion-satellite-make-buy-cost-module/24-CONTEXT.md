# Phase 24: Turion Satellite Make/Buy Cost Module - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement spec §3.2 cost module for the Turion Satellite Production System: first-class **make-cost sheets** (labor + material + tooling + cleanroom + test), **buy-cost sheets** (RFQ → quoted → NRE → invoiced), per-(part × satellite) **make-vs-buy decision records** that gate procurement, and a **cost rollup analytics view** across satellites.

The schema is ~80% built (migration 001 already has `make_buy_decisions`, `make_costs`, `rfqs`, `buy_costs` with `superseded_by` versioning + `total_cost_usd GENERATED ALWAYS AS … STORED`). This phase adds: `labor_rates` lookup, currency columns, views, endpoints, frontend `cost.html`, and integration with existing `part.html` + procurement_request flow.

Out of scope: scheduled FX-rate ingestion infrastructure (use static FX table seeded daily via cron in a later phase), role-based access control (defer to a later auth-roles phase), advanced analytics dashboards beyond the rollup view.

</domain>

<decisions>
## Implementation Decisions

### Cost UI Surface
- **Dedicated `/satellite/cost.html` page** is the primary surface for full make-cost and buy-cost sheets. Maximum vertical space, drill-down from constellation → satellite → part → cost.
- **Top-level nav entry + drill-down** — add `Cost` to nav (analytics-summary view: rollup across satellites). Drill into details from there OR from `part.html`.
- **Replace** the existing partial `cost_breakdown` panel on `part.html` (Materials + Labor estimate from `parts.ts /process` handler) with first-class data: planned vs actual columns sourced from `make_costs` / `buy_costs` tables. No more approximations.
- **Granularity = both template + actuals**: `make_costs` rows at `part_definition` level represent the planned/budget cost sheet (template). `make_costs` rows at `part_instance` level represent actuals per satellite. UI shows planned alongside actuals with variance.

### Variance Surfacing
- **Buy-cost sheet shows BOTH variances side-by-side**: RFQ→PO procurement variance (negotiation effectiveness) AND PO→invoiced PPV (price purchase variance / actual overrun). Standard aerospace MES dual-view.
- **Make-cost variance modeling = Claude's discretion**. Recommend: planned-vs-actual per cost line (labor / material / tooling / cleanroom / test) with Δ$ + Δ% per line PLUS a total summary row. Reads cleanly without overwhelming.
- **Delta vs previous satellite** = expandable section (collapsed by default). Each cost line shows Δ vs same part on previous satellite ordered `program_start DESC LIMIT 1` excluding current. Surfaces learning curve / rate creep without crowding the default view.
- **Variance display style** = number ($) + percentage (%) + traffic-light badge (green/yellow/red) based on threshold. Threshold default suggestions for planner: ≤±5% green, ±5–15% yellow, >±15% red — but allow planner to refine.

### Make-vs-Buy Decision Flow
- **User decides + rationale** — no system recommendation. UI shows side-by-side make-cost total vs buy-cost total (lowest quoted) for context, but decision is human. User picks `make` or `buy`, types a free-text rationale (required, min 20 chars).
- **HARD GATE** before procurement. Implementation: backend `POST /api/satellites/:satId/procurement-requests` AND `POST /api/satellites/:satId/vendor-orders` MUST check `make_buy_decisions` row exists for `(part_definition_id, satellite_id)` with `decision_status='approved'` AND `decision='buy'`. If missing/wrong, return 409 with `{ error: 'Make-vs-buy decision required and must be \"buy\" before procurement' }`. Existing endpoints get this guard.
- **Granularity = per (part × satellite)**. Each satellite has its own decision per part. Maximum flexibility for ship-set-by-ship-set program changes.
- **Re-evaluation = manual flag only**. UI button `Re-evaluate` resets decision to status='pending'. No auto-trigger on cost variance or new RFQ. Simple v1.

### Cost Data Entry & Auditability
- **Editor model v1 = any authenticated user** (current Supabase magic-link). Roles deferred to a later auth-roles phase. Audit trail captures `user_id` from JWT for accountability.
- **Rate history = SCD Type 2**. New `labor_rates` table (replacing hardcoded $150/hr in `parts.ts:146`) has `(role_id, skill_code, rate_usd_per_hr, currency_code, effective_from, effective_to NULL=current, ...)`. Old computed costs stay accurate after rate increases — joins query the rate effective at the cost-row's `as_of_date`.
- **Audit trail = Claude's discretion**. Recommend: use existing `superseded_by` pattern on `make_costs` / `buy_costs` / `make_buy_decisions` (already in migration 001) — every edit creates a new row with `superseded_by` set on the old. History queryable from the same table. Add a thin `audit_log` table only for delete/restore/decision-status-change actions (since those don't fit supersede-on-write).
- **Currency = MULTI-CURRENCY with FX** (scope expanded by user choice). All cost tables get `currency_code TEXT NOT NULL DEFAULT 'USD'`. New `fx_rates` table: `(currency_code, rate_to_usd, as_of_date)`. UI shows source currency + USD equivalent. Reporting/rollup converts via FX rate effective at the cost row's `as_of_date` (not today's rate — historically accurate). FX rate ingestion mechanism (manual seed vs daily cron) = planner's call but **assume manual seed for v1** with a `POST /api/fx-rates` endpoint; daily-feed cron deferred to a later phase.

### Claude's Discretion
- Make-cost variance presentation (recommend per-line + summary).
- Audit trail mechanism (recommend supersede-on-write + thin audit_log).
- FX rate ingestion (recommend manual POST endpoint v1, defer cron).
- Variance traffic-light thresholds (recommend ±5% / ±15%).
- Cost-sheet edit UI patterns (modal vs inline, autosave vs save-button).

</decisions>

<specifics>
## Specific Ideas

- "Replace partial estimate with first-class data" — the existing `cost_breakdown` on `part.html` (Materials + Labor at $150/hr) was an approximation. Treat its replacement with authoritative `make_costs` / `buy_costs` data as a hard requirement, not a nice-to-have.
- "We will add authentication later" — don't build role-separation infrastructure now. Single editor model with audit trail captures who-did-what for later forensic review. Magic-link Supabase JWT already provides identity.
- "Multi-currency with FX" — user explicitly opted into the bigger-scope choice. Researcher recommended USD-only with currency-ready columns; user pushed past that. Plan must include FX table + USD conversion in views.
- Match existing UI conventions: vanilla HTML/CSS/JS, magic-link auth, hardened error pattern (`{ error: 'Failed to ...' }`, no `detail`), schema `turion_satellite`, deploy via `build-and-push.sh` + `deploy-frontend.sh`.

</specifics>

<deferred>
## Deferred Ideas

- **Auto-trigger re-evaluation** on variance threshold breach or new RFQ — manual flag only for v1.
- **Role-based access control** (eng vs finance vs procurement editors). Will need a separate auth-roles phase first.
- **Daily FX rate ingestion cron** (vs manual seed via `POST /api/fx-rates`). Likely fed from openexchangerates.org or ECB. Separate phase.
- **Earned-value PMP-style metrics** (PV, EV, AC, CPI). Considered but rejected — too PMP-flavored for v1; planned-vs-actual per line is enough.
- **Buyer scorecards** (RFQ effectiveness per buyer over time). Out of scope for cost-module phase; could be its own analytics phase.
- **Cost approval workflow** (draft → submit → approve states). Deferred — single editor edits in place; supersede-on-write provides history without ceremony.
- **Tooling/cleanroom/test as separate facility_rates** vs single `labor_rates` with `rate_type` enum. Recommend single table; planner can revisit.

</deferred>

---

*Phase: 24-turion-satellite-make-buy-cost-module*
*Context gathered: 2026-05-10*
