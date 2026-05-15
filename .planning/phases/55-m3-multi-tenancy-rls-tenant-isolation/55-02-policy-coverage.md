# Phase 55-02 — RLS Policy Coverage Report

**Generated:** 2026-05-15
**Cluster:** zietra-aurora-prod-v2 (Aurora PostgreSQL 16.4)
**Connection method:** one-shot Lambda `zietra-rls-migration-runner` (VPC-attached)
**Migration applied:** `030_rls_policies.sql`
**Total RLS-enabled tables:** 151

---

## RLS-enabled tables

Every table in this report has `relrowsecurity=true`, `relforcerowsecurity=true`, and a `tenant_isolation` policy with USING + WITH CHECK on `tenant_id = current_setting('app.tenant_id')::uuid`.

### `crm` schema (37 tables)

| Table | Policy | ENABLE | FORCE | USING expression | WITH CHECK expression |
|-------|--------|--------|-------|------------------|-----------------------|
| `crm.activities` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.activity_shares` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.automation_executions` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.automations` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.booking_links` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.bookings` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.campaign_companies` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.campaigns` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.companies` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.company_shares` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.contact_shares` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.contact_tags` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.contacts` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.contract_otps` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.contracts` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.csv_imports` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.deal_shares` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.deals` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.email_composer` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.email_links` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.email_logs` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.email_server_configs` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.email_templates` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.email_tracking_events` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.leads` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.placement_candidates` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.placement_emails` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.placements` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.positions` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.quotes` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.system_email_templates` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.tags` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.users` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.video_campaign_companies` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.video_campaigns` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.video_generation_jobs` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `crm.video_templates` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |

### `public` schema (9 tables)

| Table | Policy | ENABLE | FORCE | USING expression | WITH CHECK expression |
|-------|--------|--------|-------|------------------|-----------------------|
| `public.availability_rules` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `public.calendar_tokens` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `public.contacts` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `public.hosts` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `public.magic_codes` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `public.meetings` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `public.tenant_features` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `public.tenant_users` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `public.website_visits` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |

### `turion` schema (57 tables)

| Table | Policy | ENABLE | FORCE | USING expression | WITH CHECK expression |
|-------|--------|--------|-------|------------------|-----------------------|
| `turion.arena_docs` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.arena_ns_integrations` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.arena_sync_runs` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.arm_schedule` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.asns` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.audit_log` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.audits` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.backlog` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.bank_ns_integrations` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.bank_sync_runs` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.bills` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.bom` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.capas` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.cases` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.clins` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.connector_stack` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.contacts` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.contracts` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.customers` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.ecos` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.evms_curve` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.gl_accounts` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.invoices` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.item_receipts` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.items` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.journal_entries` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.kpi_scorecard` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.mes_ns_integrations` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.mes_stages` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.mes_sync_runs` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.migration_runs` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.mrp_runs` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.ncrs` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.obligations` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.opportunities` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.persons` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.pos` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.procedures` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.projects` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.qb_records` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.qms_docs` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.quotes` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.ramp_card_txns` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.rfqs` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.risks` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.sales_orders` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.setup_config` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.sf_ns_integrations` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.sync_runs` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.tools` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.variances` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.vendor_ns_integrations` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.vendor_sync_runs` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.vendors` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.visit_alerts` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.wbs_elements` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion.work_orders` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |

### `turion_satellite` schema (48 tables)

| Table | Policy | ENABLE | FORCE | USING expression | WITH CHECK expression |
|-------|--------|--------|-------|------------------|-----------------------|
| `turion_satellite.anomalies` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.assembly_bays` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.audit_log` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.bom_change_log` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.bom_lines` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.build_steps` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.buy_costs` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.certifications` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.corrective_actions` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.drawing_approvals` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.drawing_change_log` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.drawings` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.eco_parts` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.ecos` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.fx_rates` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.gate_criteria` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.gate_review_packages` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.gate_signatures` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.heritage_registry` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.labor_rates` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.lifecycle_stages` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.make_buy_decisions` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.make_costs` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.ncrs` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.part_definitions` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.part_instances` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.part_revisions` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.part_stage_events` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.plm_gate_types` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.plm_gates` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.procurement_requests` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.production_travelers` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.quality_docs` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.receiving_inspections` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.rfqs` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.sales_orders` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.satellite_summary_metrics` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.satellites` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.scars` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.subsystems` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.task_assignments` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.team_members` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.team_roles` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.vendor_build_steps` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.vendor_drawings` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.vendor_orders` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.vendors` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |
| `turion_satellite.work_orders` | `tenant_isolation` | true | true | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` | `(tenant_id = (current_setting('app.tenant_id'::text))::uuid)` |

---

## Bucket-4 — exempt from RLS

These tables intentionally have NO Row-Level Security applied. See `55-01-audit-report.md` for full classification rationale.

| Table | Rationale |
|-------|-----------|
| `public.tenants` | Chicken-and-egg — read by tenantContext middleware BEFORE `app.tenant_id` is set. RLS would block tenant lookup. Write access controlled at application layer (only Lambda signup endpoint inserts). COMMENT documented inline in migration 030. |
| `public.schema_migrations` | Platform-wide migration tracking — shared across all tenants. No tenant scope. |
| `public.lifecycle_stages` | Placeholder for shared lookup codes — table does not currently exist; reserved exempt slot. |
| `public.satellite_statuses` | Placeholder for shared lookup codes — table does not currently exist; reserved exempt slot. |
| `crm._prisma_migrations` | Prisma migration tracking — CRM uses Prisma; reserved exempt slot. |

**Note on `turion_satellite.lifecycle_stages`:** the 55-01 audit listed this as Bucket-4 ("shared lookup codes"), but migration 028 already locked it as multi-tenant (`tenant_id NOT NULL + FK`). Migration 030 therefore RLS'd it consistently with all other multi-tenant tables in the `turion_satellite` schema. If product later requires it to be a shared lookup table (cross-tenant readable), this is a Wave-5 rollback decision (`ALTER TABLE turion_satellite.lifecycle_stages DISABLE ROW LEVEL SECURITY`).

---

## Fail-closed smoke verdict

**Test:** connect as `zietra_app` WITHOUT setting `app.tenant_id` GUC → run `SELECT COUNT(*) FROM turion.customers`.

**Expected:** Postgres raises `unrecognized configuration parameter "app.tenant_id"` (Postgres error code 42704).

**Actual error returned:**

```
unrecognized configuration parameter "app.tenant_id"
```

**Verdict:** PASS — fail-closed proven. The non-defaulted form `current_setting('app.tenant_id')::uuid` correctly errors loudly when the GUC is missing, ensuring no query can accidentally bypass RLS by forgetting the `SET LOCAL` preamble.

### GUC-set smoke (positive control)

**Test:** connect as `zietra_app` + `SET LOCAL app.tenant_id = '00000000-0000-0000-0000-000000000001'` (Turion) → `SELECT COUNT(*) FROM turion.customers`.

**Result:** 27 rows (matches Phase 55-01 audit baseline).

### Cross-tenant probe (negative control)

**Test:** connect as `zietra_app` + `SET LOCAL app.tenant_id = '00000000-0000-0000-0000-000000000099'` (phantom UUID) → `SELECT COUNT(*) FROM turion.customers`.

**Result:** 0 rows (RLS correctly isolates — no leakage).

---

## Counts

| Schema | Multi-tenant tables (from 55-01 audit) | RLS'd by migration 030 | Match? |
|--------|------|--------|--------|
| `crm` | 37 | 37 | ✅ |
| `public` | 9 multi-tenant (of 11 total; 2 exempt) | 9 | ✅ |
| `turion` | 57 | 57 | ✅ |
| `turion_satellite` | 48 | 48 | ✅ |
| **Total** | **151 multi-tenant** | **151** | **✅** |

All 151 tables with `tenant_id NOT NULL` (per migration 028) now have `tenant_isolation` policy + ENABLE + FORCE applied.

---

## Verification queries (reproducible)

Run via the one-shot Lambda `zietra-rls-migration-runner` (or any client connected as `zietra_admin`):

```sql
-- Policy count by schema
SELECT pn.nspname, COUNT(*) AS policies
  FROM pg_policy pol
  JOIN pg_class pc ON pc.oid = pol.polrelid
  JOIN pg_namespace pn ON pn.oid = pc.relnamespace
 WHERE pn.nspname IN ('public','crm','turion','turion_satellite')
   AND pol.polname = 'tenant_isolation'
 GROUP BY pn.nspname ORDER BY pn.nspname;

-- public.tenants is intentionally NOT RLS'd
SELECT relname, relrowsecurity, relforcerowsecurity
  FROM pg_class
 WHERE relname = 'tenants' AND relnamespace = 'public'::regnamespace;
-- Expected: tenants | f | f

-- Verify FORCE on every RLS-enabled table
SELECT pn.nspname, pc.relname, pc.relrowsecurity, pc.relforcerowsecurity
  FROM pg_class pc JOIN pg_namespace pn ON pn.oid = pc.relnamespace
 WHERE pn.nspname IN ('public','crm','turion','turion_satellite')
   AND pc.relkind = 'r'
   AND pc.relrowsecurity = true
   AND pc.relforcerowsecurity = false; -- Expected: 0 rows
```

