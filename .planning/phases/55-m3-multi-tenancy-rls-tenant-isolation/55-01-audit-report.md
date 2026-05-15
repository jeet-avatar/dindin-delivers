# Phase 55-01 — tenant_id Coverage Audit Report

**Audited:** 2026-05-15
**Cluster:** zietra-aurora-prod-v2 (Aurora PostgreSQL 16.4)
**Connection method:** one-shot Node.js Lambda `zietra-tenant-id-audit-oneshot` (VPC-attached, deleted post-audit)
**Total tables audited:** 153 across 4 schemas (public, crm, turion, turion_satellite)
**Total live rows:** 3070 (matches Phase 54.6-01 parity baseline of 3070)

---

## Schema Summary

| Schema | Tables | Rows | Has tenant_id | Missing tenant_id | Exempt |
|--------|--------|------|---------------|-------------------|--------|
| `public` | 11 | 50 | 2 | 9 | 2 |
| `crm` | 37 | 44 | 0 | 37 | 0 |
| `turion` | 57 | 959 | 57 | 0 | 0 |
| `turion_satellite` | 48 | 2017 | 48 | 0 | 1 |

## Bucket Totals

| Bucket | Description | Tables | Rows |
|--------|-------------|--------|------|
| 1 | tenant_id present + ready for NOT NULL (no NULL rows) | 105 | 3000 |
| 2 | tenant_id present but has NULL rows — backfill needed | 1 | 15 |
| 3 | tenant_id missing — column add + backfill required | 44 | 44 |
| 4 | Exempt from RLS (platform/global/shared) | 3 | 11 |

## Bucket 1 — tenant_id present + ready for NOT NULL (no NULL rows)

| schema.table | rows | size | tenant_id status | is_nullable | NULL rows | has FK | action |
|--------------|------|------|------------------|-------------|-----------|--------|--------|
| `public.tenant_features` | 39 | 8 KB | HAS | NO | 0 | YES | lock NOT NULL + FK in 028 |
| `public.tenant_users` | 6 | 8 KB | HAS | NO | 0 | YES | lock NOT NULL + FK in 028 |
| `turion.arena_docs` | 12 | 24 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.arena_ns_integrations` | 17 | 24 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.arena_sync_runs` | 12 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.arm_schedule` | 1 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.asns` | 8 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.audit_log` | 129 | 144 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.audits` | 8 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.backlog` | 1 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.bank_ns_integrations` | 7 | 16 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.bank_sync_runs` | 9 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.bills` | 9 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.bom` | 1 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.capas` | 3 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.cases` | 5 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.clins` | 7 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.connector_stack` | 19 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.contacts` | 6 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.contracts` | 2 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.customers` | 27 | 16 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.ecos` | 10 | 16 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.evms_curve` | 1 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.gl_accounts` | 119 | 56 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.invoices` | 9 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.item_receipts` | 13 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.items` | 59 | 48 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.journal_entries` | 20 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.kpi_scorecard` | 12 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.mes_ns_integrations` | 7 | 16 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.mes_stages` | 8 | 16 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.mes_sync_runs` | 8 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.migration_runs` | 2 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.mrp_runs` | 3 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.ncrs` | 8 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.obligations` | 7 | 16 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.opportunities` | 2 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.persons` | 9 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.pos` | 14 | 16 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.procedures` | 12 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.projects` | 5 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.qb_records` | 149 | 128 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.qms_docs` | 5 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.quotes` | 11 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.ramp_card_txns` | 28 | 16 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.rfqs` | 3 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.risks` | 5 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.sales_orders` | 6 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.setup_config` | 13 | 16 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.sf_ns_integrations` | 24 | 32 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.sync_runs` | 13 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.tools` | 3 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.variances` | 2 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.vendor_ns_integrations` | 9 | 16 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.vendor_sync_runs` | 10 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.vendors` | 35 | 16 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.wbs_elements` | 12 | 16 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion.work_orders` | 5 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.anomalies` | 0 | 0 B | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.assembly_bays` | 8 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.audit_log` | 41 | 16 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.bom_change_log` | 0 | 0 B | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.bom_lines` | 241 | 40 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.build_steps` | 308 | 56 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.buy_costs` | 303 | 96 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.certifications` | 0 | 0 B | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.corrective_actions` | 0 | 0 B | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.drawing_approvals` | 0 | 0 B | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.drawing_change_log` | 0 | 0 B | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.drawings` | 0 | 0 B | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.eco_parts` | 0 | 0 B | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.ecos` | 0 | 0 B | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.fx_rates` | 1 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.gate_criteria` | 0 | 0 B | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.gate_review_packages` | 0 | 0 B | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.gate_signatures` | 0 | 0 B | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.heritage_registry` | 0 | 0 B | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.labor_rates` | 4 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.make_buy_decisions` | 165 | 40 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.make_costs` | 104 | 24 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.ncrs` | 0 | 0 B | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.part_definitions` | 165 | 512 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.part_instances` | 261 | 40 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.part_revisions` | 0 | 0 B | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.part_stage_events` | 94 | 16 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.plm_gate_types` | 5 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.plm_gates` | 0 | 0 B | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.procurement_requests` | 139 | 32 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.production_travelers` | 0 | 0 B | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.quality_docs` | 0 | 0 B | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.receiving_inspections` | 0 | 0 B | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.rfqs` | 0 | 0 B | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.sales_orders` | 0 | 0 B | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.satellite_summary_metrics` | 0 | 0 B | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.satellites` | 4 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.scars` | 0 | 0 B | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.subsystems` | 8 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.task_assignments` | 0 | 0 B | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.team_members` | 0 | 0 B | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.team_roles` | 10 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.vendor_build_steps` | 0 | 0 B | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.vendor_drawings` | 0 | 0 B | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.vendor_orders` | 69 | 16 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.vendors` | 29 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |
| `turion_satellite.work_orders` | 52 | 8 KB | HAS | YES | 0 | NO | lock NOT NULL + FK in 028 |

## Bucket 2 — tenant_id present but has NULL rows — backfill needed

| schema.table | rows | size | tenant_id status | is_nullable | NULL rows | has FK | action |
|--------------|------|------|------------------|-------------|-----------|--------|--------|
| `turion.visit_alerts` | 15 | 8 KB | HAS | YES | 2 | NO | backfill NULL → Turion UUID in 027, then NOT NULL + FK in 028 |

## Bucket 3 — tenant_id missing — column add + backfill required

| schema.table | rows | size | tenant_id status | is_nullable | NULL rows | has FK | action |
|--------------|------|------|------------------|-------------|-----------|--------|--------|
| `crm.activities` | 1 | 8 KB | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.activity_shares` | 0 | 0 B | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.automation_executions` | 0 | 0 B | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.automations` | 0 | 0 B | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.booking_links` | 1 | 8 KB | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.bookings` | 1 | 8 KB | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.campaign_companies` | 0 | 0 B | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.campaigns` | 3 | 8 KB | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.companies` | 2 | 8 KB | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.company_shares` | 0 | 0 B | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.contact_shares` | 0 | 0 B | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.contact_tags` | 0 | 0 B | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.contacts` | 6 | 8 KB | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.contract_otps` | 0 | 0 B | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.contracts` | 2 | 8 KB | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.csv_imports` | 0 | 0 B | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.deal_shares` | 0 | 0 B | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.deals` | 5 | 8 KB | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.email_composer` | 0 | 0 B | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.email_links` | 0 | 0 B | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.email_logs` | 3 | 8 KB | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.email_server_configs` | 1 | 8 KB | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.email_templates` | 1 | 8 KB | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.email_tracking_events` | 11 | 8 KB | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.leads` | 0 | 0 B | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.placement_candidates` | 0 | 0 B | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.placement_emails` | 0 | 0 B | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.placements` | 0 | 0 B | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.positions` | 0 | 0 B | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.quotes` | 1 | 8 KB | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.system_email_templates` | 0 | 0 B | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.tags` | 2 | 8 KB | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.users` | 4 | 8 KB | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.video_campaign_companies` | 0 | 0 B | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.video_campaigns` | 0 | 0 B | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.video_generation_jobs` | 0 | 0 B | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `crm.video_templates` | 0 | 0 B | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `public.availability_rules` | 0 | 0 B | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `public.calendar_tokens` | 0 | 0 B | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `public.contacts` | 0 | 0 B | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `public.hosts` | 0 | 0 B | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `public.magic_codes` | 0 | 0 B | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `public.meetings` | 0 | 0 B | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |
| `public.website_visits` | 0 | 0 B | MISSING | n/a | 0 | NO | add column + backfill in 027, then NOT NULL + FK in 028 |

## Bucket 4 — Exempt from RLS (platform/global/shared)

| schema.table | rows | size | exemption rationale |
|--------------|------|------|---------------------|
| `public.schema_migrations` | 2 | 8 KB | Platform-wide migration tracking (shared by all tenants). No tenant scope. |
| `public.tenants` | 3 | 8 KB | Chicken-and-egg — tenantContext middleware reads this BEFORE `app.tenant_id` is set. No RLS. |
| `turion_satellite.lifecycle_stages` | 6 | 8 KB | Shared lookup codes — same across tenants. |


---

## Migration 027 Scope (Bucket 2 + Bucket 3)

**Tables that need tenant_id column added (Bucket 3):**

- `crm.activities` (1 rows)
- `crm.activity_shares` (0 rows)
- `crm.automation_executions` (0 rows)
- `crm.automations` (0 rows)
- `crm.booking_links` (1 rows)
- `crm.bookings` (1 rows)
- `crm.campaign_companies` (0 rows)
- `crm.campaigns` (3 rows)
- `crm.companies` (2 rows)
- `crm.company_shares` (0 rows)
- `crm.contact_shares` (0 rows)
- `crm.contact_tags` (0 rows)
- `crm.contacts` (6 rows)
- `crm.contract_otps` (0 rows)
- `crm.contracts` (2 rows)
- `crm.csv_imports` (0 rows)
- `crm.deal_shares` (0 rows)
- `crm.deals` (5 rows)
- `crm.email_composer` (0 rows)
- `crm.email_links` (0 rows)
- `crm.email_logs` (3 rows)
- `crm.email_server_configs` (1 rows)
- `crm.email_templates` (1 rows)
- `crm.email_tracking_events` (11 rows)
- `crm.leads` (0 rows)
- `crm.placement_candidates` (0 rows)
- `crm.placement_emails` (0 rows)
- `crm.placements` (0 rows)
- `crm.positions` (0 rows)
- `crm.quotes` (1 rows)
- `crm.system_email_templates` (0 rows)
- `crm.tags` (2 rows)
- `crm.users` (4 rows)
- `crm.video_campaign_companies` (0 rows)
- `crm.video_campaigns` (0 rows)
- `crm.video_generation_jobs` (0 rows)
- `crm.video_templates` (0 rows)
- `public.availability_rules` (0 rows)
- `public.calendar_tokens` (0 rows)
- `public.contacts` (0 rows)
- `public.hosts` (0 rows)
- `public.magic_codes` (0 rows)
- `public.meetings` (0 rows)
- `public.website_visits` (0 rows)

**Tables that need NULL row backfill (Bucket 2):**

- `turion.visit_alerts` (2 NULL rows of 15 total)

**Default backfill value:** Turion UUID `00000000-0000-0000-0000-000000000001`
**Rationale:** Per RESEARCH §B.3, all ERP/satellite/CRM demo data today belongs to Turion (the only tenant with active business data). The 3 tenants currently in `public.tenants` are: turion (paid), dollor (trial — but no data yet), brandmonkz (trial — but no data yet).

## Migration 028 Scope (NOT NULL + FK + index lockdown)

**All tables with tenant_id column after migration 027 runs** (i.e., Bucket 1 + Bucket 2 + Bucket 3 = 150 tables across 4 schemas).

**Excluded (Bucket 4):**

- `public.schema_migrations` — exempt
- `public.tenants` — exempt
- `turion_satellite.lifecycle_stages` — exempt


## Existing Tenant FK Constraints (Phase 54.1 baseline)

Already in place — migration 028 will SKIP these (idempotent):

- `public.tenant_features` → `tenant_features_tenant_id_fkey` (ON DELETE: CASCADE)
- `public.tenant_users` → `tenant_users_tenant_id_fkey` (ON DELETE: CASCADE)


> Note: existing FKs use CASCADE (Phase 54.1 default). Migration 028 will only ADD new FKs to tables that lack any tenant_id FK; existing CASCADE FKs are left as-is to avoid Phase 54.1 churn. Tenants are soft-deleted via `tenants.plan='disabled'`, so CASCADE never triggers in practice.

---

## A.3 NULL tenant_id Scan Results

Tables with NULL tenant_id rows (will be backfilled by migration 027):

- `turion.visit_alerts`: 2 NULL rows


## A.2 Top-10 Largest Tables (by row count)

| schema.table | rows |
|--------------|------|
| `turion_satellite.build_steps` | 308 |
| `turion_satellite.buy_costs` | 303 |
| `turion_satellite.part_instances` | 261 |
| `turion_satellite.bom_lines` | 241 |
| `turion_satellite.make_buy_decisions` | 165 |
| `turion_satellite.part_definitions` | 165 |
| `turion.qb_records` | 149 |
| `turion_satellite.procurement_requests` | 139 |
| `turion.audit_log` | 129 |
| `turion.gl_accounts` | 119 |


---

## Verdict

- 105 tables already NOT-NULL-ready (Bucket 1) — migration 028 only
- 1 tables need NULL backfill before lockdown (Bucket 2)
- 44 tables need full column-add (Bucket 3)
- 3 tables exempt from RLS (Bucket 4)

**Total to be locked by migration 028:** 150 multi-tenant tables across 4 schemas.

**Row count parity gate:** 3070 == 3070 baseline (verified pre-migration). Post-migration counts MUST match.

