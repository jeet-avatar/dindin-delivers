# Dollor.ai Roadmap

## Milestones

- ✅ **v1.0 Production Release** — iOS apps, QA, security rounds 1+2, scaling, staging infra (shipped pre-2026-02-20)
- ✅ **v1.1 Security Hardening + Stability** — Phases 01-04 + 03.1 (shipped 2026-02-20)
- ✅ **v1.2 App Store Ready** — Endpoint auth, API alignment, Android fixes, CI stability, ops security (shipped 2026-02-21)
- ✅ **v1.3 Platform Hardening** — 276 endpoints auth-secured, 50 rate-limited, deployed to production (shipped 2026-02-22)
- ✅ **v1.4 App Store Distribution** — API verification (iOS + Android), app distribution (TestFlight + Firebase), infra cleanup (shipped 2026-02-26)
- 🚧 **v1.5 Production Readiness** — SSL pin fix, Play Store publishing, DB rotation, rideshare E2E (in progress)
- 🔲 **v2.0 Compliance & AI Agents** — Prop 22 floor, 50-state compliance engine, W-9 gate, 1099-NEC, sales tax, onboarding agents, lifecycle agents, voice routing, ops orchestrator

## Phases

<details>
<summary>v1.4 App Store Distribution (Phases 01-05) -- SHIPPED 2026-02-26</summary>

- [x] Phase 01: Infrastructure Cleanup (1/1 plan) -- CloudFront headers, key audit, credential cleanup
- [x] Phase 02: iOS API Verification (3/3 plans) -- 256 calls audited, 11 mismatches fixed
- [x] Phase 03: Android API Verification (3/3 plans) -- all 3 apps verified, Retrofit/Gson fixes
- [x] Phase 04: iOS Distribution (2/2 plans) -- 3 apps to TestFlight (Customer 1095, Driver 203, Restaurant 172)
- [x] Phase 05: Android Distribution (3/3 plans) -- 3 apps to Firebase (Customer vC=27, Driver vC=24, Partner vC=20)

Full archive: `.planning/milestones/v1.4-ROADMAP.md`

</details>

<details>
<summary>v1.3 Platform Hardening (Phases 01-03) -- SHIPPED 2026-02-22</summary>

- [x] Phase 01: Customer + Driver Endpoint Auth (3/3 plans) -- 127 endpoints with role-specific Depends() + ownership checks
- [x] Phase 02: Vendor + Admin Endpoint Auth (4/4 plans) -- 120+ vendor/admin endpoints, gap closure, AUTH-06 audit
- [x] Phase 03: Rate Limiting Expansion (2/2 plans) -- 50 endpoints rate-limited via Redis (password reset, registration, payment, admin)
- [ ] Phase 04: Infrastructure Security (skipped) -- INFRA items deferred to v1.4

Full archive: `.planning/milestones/v1.3-ROADMAP.md`

</details>

<details>
<summary>v1.2 App Store Ready (Phases 01-05) -- SHIPPED 2026-02-21</summary>

- [x] Phase 01: Finish Endpoint Auth (3/3 plans) -- 32 per-endpoint Depends() guards, 93 dead stubs deleted
- [x] Phase 02: API Endpoint Standardization (3/3 plans) -- 9 route aliases, 3 iOS fixes, production deployed
- [x] Phase 03: Android Fixes (1/1 plan) -- 5 path fixes, staging URLs, photo URL centralization
- [x] Phase 04: Fix CI + API Contract Tests (2/2 plans) -- 208 contract tests, CI env vars fixed
- [x] Phase 05: Ops Security (3/3 plans) -- credentials removed, 61 URL fixes, CLAUDE.md updated

Full archive: `.planning/milestones/v1.2-ROADMAP.md`

</details>

<details>
<summary>v1.1 Security Hardening + Stability (Phases 01-04) -- SHIPPED 2026-02-20</summary>

- [x] Phase 01: Unit Test Fixes (1/1 plan) -- 17 stale assertions fixed, CI green
- [x] Phase 02: Security Auth Fix (1/1 plan) -- 170+ endpoints secured, auth_utils.py created
- [x] Phase 03: Deploy Security Auth (2/2 plans) -- staging + production via CI/CD
- [x] Phase 03.1: Endpoint Validation Guardrails (1/1 plan) -- API registry, CLAUDE.md rules
- [x] Phase 04: Documentation Overhaul (2/2 plans) -- CLAUDE.md, GROUND_TRUTH, xcconfig fixed

Full archive: `.planning/milestones/v1.1-ROADMAP.md`

</details>

### v1.5 Production Readiness (In Progress)

**Milestone Goal:** Graduate Android apps to Google Play, harden production infrastructure (DB rotation, SSL strategy), and validate rideshare E2E with real devices.

- [x] **Phase 06: SSL Pinning Rotation Fix** - Migrate iOS from leaf pins to Amazon Root CA pins and ship updated builds (completed 2026-02-27)
- [ ] **Phase 07: Play Store Publishing** - Set up Google Play Console and publish all 3 Android apps
- [x] **Phase 08: DB Password Rotation** - Enable automated Secrets Manager rotation for RDS credentials (completed 2026-03-27)
- [x] **Phase 09: Rideshare E2E Validation** - Automated backend test covering full 12-step rideshare lifecycle (completed 2026-03-27)
- [ ] **Phase 10: Automated Support System** - Hide aspirational AI features, set up Twilio + OpenAI Realtime voice for phone support, fix chat for order tracking
- [x] **Phase 11: Change Management Workflow** - Enterprise case management: request -> approval -> GSD execution -> PR -> CI/CD pipeline -> deploy. All 2512+ cases tracked with full lifecycle. (completed 2026-03-07)
- [x] **Phase 12: Fix Admin Portal UI** - Fix vendor management auth, remove mock ERP dashboards, wire real dashboard stats (completed 2026-03-07)

## Phase Details

### Phase 06: SSL Pinning Rotation Fix
**Goal**: iOS apps survive ACM certificate renewals without breaking API connectivity
**Depends on**: Nothing (urgent, first phase of v1.5)
**Requirements**: SSL-01, SSL-02, SSL-03, SSL-04
**Success Criteria** (what must be TRUE):
  1. iOS apps connect to api.dollor.ai using Amazon Root CA SPKI pins instead of leaf/intermediate pins
  2. Updated iOS builds are available on TestFlight with the corrected SSL pin configuration
  3. CloudWatch alarm fires when the dollor.ai ACM certificate is within 30 days of expiry
  4. A runbook exists with step-by-step instructions for handling future SSL pin changes
**Plans**: 2 plans (Wave 1 -- parallel)

Plans:
- [ ] 06-01-PLAN.md -- Replace leaf/intermediate SSL pins with 5 Amazon Root CA pins, build and upload all 3 iOS apps to TestFlight
- [ ] 06-02-PLAN.md -- Add CloudWatch ACM expiry alarms (30-day + 7-day) to Terraform, write rotation runbook

### Phase 07: Play Store Publishing
**Goal**: All 3 Android apps are publicly available on Google Play Store
**Depends on**: Phase 06 (sequential for milestone clarity, but no technical dependency)
**Requirements**: PLAY-01, PLAY-02, PLAY-03, PLAY-04, PLAY-05, PLAY-06, PLAY-07
**Success Criteria** (what must be TRUE):
  1. Google Play Developer account is active with organization verification complete
  2. All 3 Android apps (Customer, Driver, Partner) are signed with Play App Signing and AAB bundles are uploaded
  3. Data Safety forms accurately declare all SDK data collection for each app
  4. Content rating and CSAE compliance are approved for all 3 apps
  5. All 3 apps are published and installable from the Google Play Store
**Plans**: 3 plans (Wave 1 parallel: 07-01 + 07-02, Wave 2: 07-03)

Plans:
- [ ] 07-01-PLAN.md -- Build AAB bundles, fix feature graphic, create store listing descriptions and Data Safety audit
- [ ] 07-02-PLAN.md -- Verify/create Play Console account, create 3 apps with Play App Signing, complete IARC content ratings
- [ ] 07-03-PLAN.md -- Upload store listings and Data Safety to Play Console, upload AABs, submit all 3 apps for review

### Phase 08: DB Password Rotation
**Goal**: Production database credentials rotate automatically every 30 days with zero downtime
**Depends on**: Phase 06 (sequential for milestone clarity, but no technical dependency -- can parallel with Phase 07)
**Requirements**: DBROT-01, DBROT-02, DBROT-03, DBROT-04, DBROT-05
**Success Criteria** (what must be TRUE):
  1. Secrets Manager rotation Lambda successfully rotates the RDS password on a 30-day schedule
  2. ECS tasks automatically pick up new credentials via force-redeployment after each rotation
  3. A full rotation cycle has been validated on staging with zero service interruption
  4. Production rotation is active and has completed at least one successful cycle
  5. A runbook documents the rotation process, monitoring checks, and rollback procedure
**Plans**: 2 plans (Wave 1: 08-01, Wave 2: 08-02)

Plans:
- [x] 08-01-PLAN.md -- Build rotation Lambda + ECS redeployment Lambda, deploy to AWS, wire EventBridge to staging secret, validate full rotation cycle on staging
- [x] 08-02-PLAN.md -- Deploy production rotation Lambda, enable 30-day schedule on production secret, add CloudWatch alarm, write runbook

### Phase 08.1: Fix rideshare failure paths — no-show fee enforcement, bid race condition, payment failure recovery, no-drivers expiry flow, driver cancel handling (INSERTED)

**Goal:** Fix all open rideshare failure paths so rides degrade gracefully instead of silently failing
**Depends on:** Phase 8
**Plans:** 2/2 plans complete

Plans:
- [ ] 08.1-01-PLAN.md -- Enforce $5.00 no-show fee via Stripe: cancel pre-auth intent, create off-session $5 charge, transfer $4 to driver via Connect
- [ ] 08.1-02-PLAN.md -- Replace silent payment capture failure with capture_failed flag + 5-min retry background job (3 attempts)
- [ ] 08.1-03-PLAN.md -- Wire RideRequestExpired push notification to in-app banner in iOS customer app with "Try Again" CTA

### Phase 09: Rideshare E2E Validation
**Goal**: Rideshare business logic is continuously validated through automated lifecycle testing
**Depends on**: Phase 06, Phase 08 (runs after infrastructure changes are stable)
**Requirements**: E2E-01
**Success Criteria** (what must be TRUE):
  1. An automated test executes the full 12-step rideshare lifecycle (request, bid, accept, pickup, dropoff, payment, rating) against staging and passes
  2. The test can be run on-demand to verify rideshare integrity after any backend deployment
**Plans**: TBD

Plans:
- [ ] 09-01: Build and verify 12-step rideshare E2E test against staging

### Phase 10: Automated Support System
**Goal**: One-man company has fully automated customer support -- AI phone agent handles calls, chat tracks orders
**Depends on**: None (can run independently)
**Requirements**: SUPPORT-01, SUPPORT-02, SUPPORT-03
**Success Criteria** (what must be TRUE):
  1. AI Employees and aspirational AI feature toggles are hidden from Restaurant app (AI Insights/analytics remains)
  2. Twilio + OpenAI Realtime Voice handles incoming calls on support number -- can look up orders, give status, handle basic support
  3. In-app chat for customer order tracking works (broken URLs fixed)
**Plans**: 3 plans (Wave 1 parallel: 10-01 + 10-02, Wave 2: 10-03)

Plans:
- [ ] 10-01-PLAN.md -- Hide aspirational AI features in Restaurant app (#if ENABLE_AI_EMPLOYEES), build OrderChatView for Customer and Driver apps, fix HelpSupportView phone number
- [ ] 10-02-PLAN.md -- Create Twilio + OpenAI Realtime voice agent backend (voice_agent.py, voice_agent_tools.py), add AI text chat endpoint (/api/support/chat)
- [ ] 10-03-PLAN.md -- Wire iOS Live Chat button to AI text agent, verify all Phase 10 deliverables

### Phase 11: Change Management Workflow
**Goal**: Enterprise-grade case management system -- all changes flow through request -> approval -> execution -> PR -> CI/CD -> deploy pipeline with full audit trail
**Depends on**: Phase 10 (builds on existing project tracker from quick tasks 106-113)
**Requirements**: CM-01, CM-02, CM-03, CM-04, CM-05, CM-06
**Success Criteria** (what must be TRUE):
  1. Change requests can be submitted via admin portal form AND API endpoint
  2. Requests auto-route to department lead for approval (no auto-approve -- everything needs sign-off)
  3. Approved cases trigger GSD executor to implement changes on feature branch with PR
  4. CI pipeline runs all checks (pytest, TypeScript, staging smoke test, approval verification) before merge
  5. Full enterprise status lifecycle: Draft -> Submitted -> Under Review -> Approved -> In Progress -> PR Created -> CI Running -> Staging -> Production -> Verified -> Closed
  6. Full audit log with every status change, approval, PR link, deploy -- timestamped with who did it
  7. Email + in-app notifications on key transitions (approval needed, deployed, failed)
  8. Rollback creates revert PR through same approval flow (auditable)
**Plans**: 3 plans (Wave 1: 11-01, Wave 2 parallel: 11-02 + 11-03)

Plans:
- [ ] 11-01-PLAN.md -- Backend models (ChangeRequest, AuditLog), state machine, all CRUD/lifecycle/audit API routes, department lead routing, rollback
- [ ] 11-02-PLAN.md -- Admin portal UI: change management screens (request form, approval queue, request detail with timeline, audit log export)
- [ ] 11-03-PLAN.md -- Email + in-app notifications on lifecycle transitions, CI approval check endpoint, stale request monitoring

### Phase 12: Fix Admin Portal UI
**Goal:** Make the admin portal production-ready -- fix broken vendor management screens (auth headers), remove mock ERP dashboards, wire main dashboard to real operational stats
**Depends on:** Phase 11 (admin frontend now served from backend)
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06
**Success Criteria** (what must be TRUE):
  1. Vendor management screens load real data with proper auth headers (no 401 errors)
  2. Main dashboard shows real Dollor.ai operational stats from /api/dashboard/stats
  3. Mock ERP tabs and screens (Jira, NetSuite, ZIP) removed from dashboard and sidebar
  4. No mock data files remain in the frontend codebase
  5. All sidebar navigation items point to working, real-data screens
**Plans**: 2 plans (Wave 1 -- parallel)

Plans:
- [ ] 12-01-PLAN.md -- Fix vendor management auth (replace raw fetch with api axios instance), remove mock vendor data, align data mapping
- [ ] 12-02-PLAN.md -- Rewire dashboard to real stats, remove mock ERP tabs/screens, clean sidebar navigation, delete mock data files

### Phase 13: Prop 22 Driver Earnings Floor
**Goal**: Implement California Proposition 22 statutory earnings floor for both rideshare and food delivery drivers — per-14-day-period reconciliation, automatic Stripe top-ups, BPC §7453/7454/7463 compliant earnings statements, admin compliance portal, and iOS driver payout disclosure
**Depends on**: Phase 12 (admin portal foundation)
**Requirements**: PROP22-01, PROP22-02, PROP22-03, PROP22-04, PROP22-05, PROP22-06, PROP22-07, PROP22-08
**Success Criteria** (what must be TRUE):
  1. New Alembic migration adds 5 columns to ride_requests, 5 columns to orders, and 4 new tables (prop22_config, prop22_city_wages, prop22_earning_periods, prop22_earnings_statement)
  2. Per-ride/per-order Prop 22 floor computed at completion using acceptance-GPS engaged miles (not pickup→dropoff) with correct city wage (GPS-based, handles July 1 mid-year increases)
  3. 14-day reconciliation job runs at PT midnight on period boundaries for both rideshare (RideRequest) and food delivery (Order) drivers; tops up via Stripe or flags MANUAL_REVIEW
  4. Earnings statements persisted to DB per BPC §7454(b)(2) with QTD engaged hours (calendar quarter)
  5. iOS PayoutDashboardView shows Prop 22 period cards (hours, miles, floor, earned, top-up) and per-ride/delivery floor disclosure
  6. Admin portal /admin/prop22 shows compliance table and MANUAL_REVIEW queue with deadline countdown and manual top-up trigger
  7. Tips excluded from net_earnings in all calculations (rideshare: driver_payout already excludes tips; food delivery: delivery_fee excludes tip)
  8. All period boundaries in America/Los_Angeles timezone; Driver.state never used for CA detection (GPS bounds only)
**Plans**: 6 plans across 3 waves

Plans:
- [ ] 13-01-PLAN.md -- Alembic migration: 5 ride_request cols, 5 order cols, prop22_config + prop22_city_wages + prop22_earning_periods + prop22_earnings_statement tables with seed data and unique constraint
- [ ] 13-02-PLAN.md -- Per-ride/order Prop 22 calculation at completion: bid_routes.py (rideshare), order_flow.py (food delivery), gps_to_city(), get_city_min_wage(), road_miles() with haversine fallback
- [ ] 13-03-PLAN.md -- Reconciliation jobs: prop22_period_reconciliation_job + prop22_manual_review_escalation_job in order_flow.py APScheduler with PT boundary guard, SELECT-before-INSERT safety, per-driver commit isolation, Stripe top-up
- [ ] 13-04-PLAN.md -- New API endpoints: GET /api/driver/prop22/periods, GET /api/driver/prop22/periods/{id}/rides, GET /api/admin/prop22/periods, POST /api/admin/prop22/manual-topup
- [ ] 13-05-PLAN.md -- iOS PayoutDashboardView: Prop 22 period cards, status badges, per-ride floor disclosure, QTD hours in statement detail view
- [ ] 13-06-PLAN.md -- Admin portal React: /admin/prop22 compliance table, MANUAL_REVIEW queue tab, manual top-up form with reference number

## Progress

**Execution Order:**
Phase 06 (SSL fix, urgent) -> Phase 07 (Play Store) -> Phase 08 (DB rotation) -> Phase 09 (E2E validation) -> Phase 10 (Automated Support) -> Phase 11 (Change Management) -> Phase 12 (Admin Portal UI) -> Phase 13 (Prop 22 Compliance)

Note: Phases 07 and 08 are technically independent and could run in parallel.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 06. SSL Pinning Rotation Fix | 2/2 | Complete    | 2026-02-27 | - |
| 07. Play Store Publishing | 1/3 | In Progress|  | - |
| 08. DB Password Rotation | v1.5 | Complete    | 2026-03-28 | 2026-03-27 |
| 08.1. Fix Rideshare Failure Paths | 3/3 | Complete   | 2026-03-19 | - |
| 09. Rideshare E2E Validation | 1/1 | Complete    | 2026-03-27 | - |
| 10. Automated Support System | 2/3 | In Progress|  | - |
| 11. Change Management Workflow | 3/3 | Complete    | 2026-03-07 | - |
| 12. Fix Admin Portal UI | 2/2 | Complete    | 2026-03-07 | - |
| 13. Prop 22 Driver Earnings Floor | 6/6 | Complete    | 2026-03-26 | - |
| 14. Compliance Foundation | 0/8 | Not started | - | - |
| 15. Onboarding Validation Agents | 0/5 | Not started | - | - |
| 16. Lifecycle Agents (Food + Rideshare) | 0/5 | Not started | - | - |
| 17. Voice Routing Agent | 0/4 | Not started | - | - |
| 18. Ops Orchestrator + Admin Ops Board | 0/4 | Not started | - | - |
| 19. CDJ-3000 Waveform Replica | 5/5 | Complete   | 2026-03-30 | - |

---

### Phase 14: Compliance Foundation
**Goal**: Build the 50-state compliance engine, W-9 gate, 1099-NEC threshold agent, sales tax collection hook, nightly compliance batch, and admin portal compliance UI — all independent of Prop 22 (handled by Phase 13)
**Depends on**: Phase 13 (Prop 22 tables must exist so DriverComplianceRecord can reference them)
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, COMP-06, COMP-07, COMP-08
**Success Criteria** (what must be TRUE):
  1. `state_compliance_rules` table seeded with 51 rows (50 states + DC), covering TNC permit, ABC test, Prop 22 flag, insurance minimums, sales tax rate, risk level
  2. `tnc_permits`, `driver_compliance_records`, `form_1099_records`, `sales_tax_remittances`, `compliance_events_log` tables created via Alembic (NO Prop22TopupRecord — Phase 13 owns that, NO LedgerJournalEntry — reuse existing JournalEntry/JournalEntryLine from models.py:877)
  3. W-9 gate: POST /api/driver/w9 endpoint validates TIN via IRS stub, sets driver_compliance_records.w9_collected=True, blocks payouts if not collected
  4. 1099-NEC: nightly job flags drivers crossing $600 YTD, creates Form1099Record rows, sends push notification
  5. Sales tax: TaxJar stub calculates per-order tax, writes to sales_tax_remittances, hooks into order completion
  6. StateComplianceEngine class with get_rule(state), check_w9_required(), check_1099_threshold() — NO calculate_prop22() method (Phase 13 owns Prop 22 calculation)
  7. Admin portal: /admin/compliance — 4 tabs: W-9 Queue (unvalidated drivers), 1099 Tracker (YTD amounts), State Rules (all 51 rows with edit), TNC Permits (permit status per state)
  8. All nightly jobs use existing APScheduler + file-lock guard pattern from order_flow.py:2881
**Plans**: 8 plans across 4 waves

Plans:
- [ ] 14-01-PLAN.md -- Alembic migration: 5 new tables (state_compliance_rules, tnc_permits, driver_compliance_records, form_1099_records, sales_tax_remittances, compliance_events_log) + seed 51 state rows
- [ ] 14-02-PLAN.md -- StateComplianceEngine class in compliance_engine.py: get_rule(), check_w9_required(), check_fee_cap(), check_insurance() — NO calculate_prop22()
- [ ] 14-03-PLAN.md -- W-9 gate: POST /api/driver/w9, TIN validation stub, payout block, compliance event log
- [ ] 14-04-PLAN.md -- 1099-NEC agent: nightly job checks YTD threshold ($600), creates Form1099Record, push notification
- [ ] 14-05-PLAN.md -- Sales tax: TaxJar stub integration, hook into order completion in order_flow.py, writes SalesTaxRemittance
- [ ] 14-06-PLAN.md -- Nightly compliance batch scheduler: fee cap audit, insurance lapse check, TNC permit expiry — uses existing APScheduler/file-lock
- [ ] 14-07-PLAN.md -- Admin compliance API endpoints: GET /api/admin/compliance/w9-queue, /api/admin/compliance/1099, /api/admin/compliance/state-rules, /api/admin/compliance/tnc-permits, POST /api/admin/compliance/state-rules/{state}
- [ ] 14-08-PLAN.md -- Admin portal UI: /admin/compliance React page (4 tabs: W-9 Queue, 1099 Tracker, State Rules, TNC Permits), wire into App.tsx + MainLayout.tsx

---

### Phase 15: Onboarding Validation Agents
**Goal**: LangGraph state-machine onboarding flows for all 3 user types (customer, driver, vendor) — phone OTP, email confirmation, fraud score, state ruleset check, W-9 gate, license scan, insurance verify, background check, state-specific gates (NY TLC, CA Prop 22 disclosure, MA/NJ block)
**Depends on**: Phase 14 (StateComplianceEngine, W-9 gate, state_compliance_rules data)
**Requirements**: ONBOARD-01, ONBOARD-02, ONBOARD-03, ONBOARD-04, ONBOARD-05
**Success Criteria** (what must be TRUE):
  1. CustomerOnboardingGraph, DriverOnboardingGraph, VendorOnboardingGraph as LangGraph StateGraphs in onboarding_agent.py
  2. Driver flow enforces W-9 gate (block if not collected), Persona license scan, insurance verify, Checkr background check
  3. State-specific nodes: MA/NJ block (legal_counsel_required=True → hard stop), CA Prop 22 disclosure (acknowledgment required, NOT calculation), NY TLC flag
  4. Vendor flow enforces business license upload, health permit, W-9, city delivery fee cap check
  5. All 3 onboarding graphs wired into existing registration endpoints (customer: main_new.py, driver: document upload, vendor: registration)
**Plans**: 5 plans across 3 waves

Plans:
- [ ] 15-01-PLAN.md -- OnboardingState TypedDict + shared nodes (phone OTP, email confirm, fraud score, state ruleset load)
- [ ] 15-02-PLAN.md -- DriverOnboardingGraph: W-9 gate, Persona scan, insurance verify, Checkr, state-specific (MA/NJ block, CA disclosure, NY TLC)
- [ ] 15-03-PLAN.md -- CustomerOnboardingGraph + VendorOnboardingGraph: customer (fraud only), vendor (business license, health permit, W-9, fee cap check)
- [ ] 15-04-PLAN.md -- Wire all 3 graphs into registration endpoints in main_new.py
- [ ] 15-05-PLAN.md -- Admin portal: /admin/onboarding — pending reviews queue (Checkr 'consider', insurance manual review, MA/NJ blocks)

---

### Phase 16: Lifecycle Agents (Food + Rideshare)
**Goal**: LangGraph state machines for food delivery and rideshare lifecycles — all failure paths, compliance hooks, dispute handling, cancel rate enforcement; delegates Prop 22 per-ride calculation to Phase 13's prop22_utils.py (no duplication)
**Depends on**: Phase 15 (onboarding complete), Phase 13 (prop22_utils.py exists)
**Requirements**: LIFECYCLE-01, LIFECYCLE-02, LIFECYCLE-03, LIFECYCLE-04, LIFECYCLE-05
**Success Criteria** (what must be TRUE):
  1. FoodDeliveryGraph and RideShareGraph as LangGraph StateGraphs in lifecycle_agents.py
  2. Rideshare graph calls prop22_utils.calculate_prop22_ride_data() at completion (Phase 13 function — no duplicate implementation)
  3. Food delivery graph calls prop22_utils.calculate_prop22_order_data() at delivery completion (Phase 13 function)
  4. All failure paths handled: no-show fee, driver cancel rate enforcement (suspend at 30%), customer fraud block (3 strikes), payment failure recovery
  5. Dispute nodes: open support ticket, emit Redis channel:admin, freeze payout
**Plans**: 5 plans

Plans:
- [ ] 16-01-PLAN.md -- Shared lifecycle types: RideState, OrderState TypedDicts, shared nodes (payment retry, push notify, compliance event log)
- [ ] 16-02-PLAN.md -- FoodDeliveryGraph: accept → prepare → pickup → deliver → complete, all failure paths, prop22 hook at delivery
- [ ] 16-03-PLAN.md -- RideShareGraph: bid → accept → pickup → ride → complete, prop22 hook at completion, cancel rate enforcement
- [ ] 16-04-PLAN.md -- Dispute + fraud nodes: dispute opens admin queue, customer 3-strike block, driver suspension
- [ ] 16-05-PLAN.md -- Wire both graphs into existing completion hooks in order_flow.py and bid_routes.py

---

### Phase 17: Voice Routing Agent
**Goal**: VoiceRouter class extending existing voice_agent.py — classifies 9 intents (SAFETY_ESCALATION, ORDER_HELP, RIDE_HELP, PAYMENT_ISSUE, DRIVER_NO_SHOW, ACCOUNT_HELP, TAX_INQUIRY, COMPLAINT, GENERAL) and routes to correct handler; does NOT rewrite voice_agent.py
**Depends on**: Phase 16
**Requirements**: VOICE-01, VOICE-02, VOICE-03, VOICE-04
**Success Criteria** (what must be TRUE):
  1. VoiceRouter class in voice_agent.py (extends, not replaces existing code)
  2. classify_intent() maps utterances to all 9 intents with priority order (SAFETY_ESCALATION first)
  3. Each intent handler returns structured response with escalation=True/False and suggested_action
  4. TAX_INQUIRY handler reads from driver_compliance_records (YTD earnings, 1099 status)
  5. SAFETY_ESCALATION publishes to Redis channel:admin
**Plans**: 4 plans

Plans:
- [ ] 17-01-PLAN.md -- VoiceRouter class skeleton + classify_intent() with all 9 intents
- [ ] 17-02-PLAN.md -- Intent handlers: ORDER_HELP, RIDE_HELP, PAYMENT_ISSUE, DRIVER_NO_SHOW, ACCOUNT_HELP
- [ ] 17-03-PLAN.md -- Intent handlers: TAX_INQUIRY (reads compliance records), SAFETY_ESCALATION (Redis publish), COMPLAINT, GENERAL
- [ ] 17-04-PLAN.md -- Wire VoiceRouter into existing voice_agent.py WebSocket handler

---

### Phase 18: Ops Orchestrator + Admin Ops Board
**Goal**: LangGraph ops orchestrator subscribing to Redis event bus (channel:orders, channel:rides, channel:compliance, channel:admin), SLA timer enforcement, and admin ops board at /admin/ops with real-time state
**Depends on**: Phase 17
**Requirements**: OPS-01, OPS-02, OPS-03, OPS-04
**Success Criteria** (what must be TRUE):
  1. OpsOrchestrator subscribes to all 4 Redis channels and routes events to correct handler nodes
  2. SLA timers: order prep >25min → push notification; ride acceptance >5min → re-broadcast; compliance alert → admin notification
  3. Admin API: GET /admin/ops (full snapshot), /admin/ops/orders, /admin/ops/rides, /admin/ops/compliance (reads Phase 13 prop22_earning_periods for Prop 22 deficits — no duplication), /admin/ops/agents, /admin/ops/revenue
  4. Admin portal: /admin/ops React page — real-time dashboard, orders by SLA state (green/yellow/red), compliance alert queue, agent health, revenue snapshot
**Plans**: 4 plans

Plans:
- [ ] 18-01-PLAN.md -- OpsOrchestrator LangGraph + Redis subscription + event router
- [ ] 18-02-PLAN.md -- SLA monitor nodes + alert dispatch
- [ ] 18-03-PLAN.md -- Admin ops API endpoints (all 6 read-only endpoints, require_admin auth)
- [ ] 18-04-PLAN.md -- Admin portal /admin/ops React page: real-time ops board

### Phase 21: mixmind-native-pioneer-usb-export

**Goal:** Make MixMind a full native Rekordbox replacement for CDJ-3000 USB prep. MixMind must ingest a folder of audio files, analyze each track (BPM, beatgrid, key/Camelot, hot + memory cues, 3-band waveform, sections), persist results to its own library DB, and export a Pioneer-format USB (`PIONEER/export.pdb` + `PIONEER/USBANLZ/P***/ANLZ****.DAT` + `ANLZ****.EXT` + audio files at the Pioneer-expected paths) that plugs into a CDJ-3000 and plays — with correct BPM, beatgrid lock, waveform, and recalled hot cues — without Rekordbox touching the machine or the drive at any step.

**Depends on:** Phase 20

**Success criteria (goal-backward, verifiable):**
1. `/api/library/import` accepts a folder path, recursively adds `.mp3/.aiff/.wav/.flac/.m4a`, and returns per-track analysis status
2. Each imported track has: BPM (±0.1 of Rekordbox reference), first-beat offset (ms), beatgrid of downbeats, Camelot key, ≥8 auto-detected memory cues, 3-band waveform, section labels
3. `/api/usb/export` writes `PIONEER/export.pdb` + `USBANLZ/` that a CDJ-3000 mounts and lists the tracks from
4. Plugging the exported USB into a CDJ-3000: track loads, BPM display matches MixMind's value, beatgrid is locked, waveform renders with 3-band color, hot cues recall at the same positions MixMind assigned
5. `tests/test_cdj_export_roundtrip.py` exports a USB image, re-parses it with the existing `anlz_parser.py` + `pyrekordbox`, and asserts round-trip equality for all fields
6. No Rekordbox install required on the exporting Mac; no Rekordbox touches the USB before CDJ insert

**Requirements:** MM-EXP-01, MM-EXP-02, MM-EXP-03, MM-EXP-04, MM-EXP-05, MM-EXP-06

**Best-in-industry quantitative bar (competitive targets):**

The success criteria above gate functional correctness. This table gates *quality parity or better* versus Rekordbox 7 on the same reference corpus (`~/Music/MixMind-Inbox/`, 1458 tracks) and the pinned reference USB (`/Volumes/Untitled/`, 91 analyzed tracks — see `21-REFERENCE-DATASET.md`). All metrics computed on real hardware (M-series Mac, CDJ-3000).

| Dimension | Target | Measurement | Stretch goal |
|-----------|--------|-------------|--------------|
| **BPM accuracy** | ±0.05 BPM median vs Rekordbox on 91-track oracle; ±0.1 BPM p99 | `abs(mm_bpm - rb_bpm)` aggregated from `master.db` | ±0.02 median |
| **Beatgrid first-beat offset** | ±10 ms median; ±25 ms p99 | Downbeat alignment vs Rekordbox anchor | ±5 ms median |
| **Key detection F1** | ≥0.92 vs Rekordbox (macro F1 across 24 Camelot classes) | Confusion matrix on oracle corpus | ≥0.95, matching Mixed In Key |
| **Auto-cue precision** | ≥8 memory cues per track on 95% of corpus; ≥1 cue within 50 ms of each Rekordbox reference cue on 80% of tracks | Cue-position diff; nearest-neighbor match | 10+ cues, 90% within 50 ms |
| **3-band waveform fidelity** | Per-band RMS within 3% of Rekordbox `.2EX` values across whole track | Sample-level diff of `PWV5` payload | Within 1% |
| **Reference byte-equivalence (ANLZ)** | Level 1+2 parity 100% (tag inventory + field values); Level 3 byte-equal ≥50% of 91-track oracle on first pass | `sha256(out) == sha256(ref)` pass rate | ≥80% |
| **Reference byte-equivalence (PDB)** | `sqldiff` empty for `exportLibrary.db` across oracle; `export.pdb` Level 1+2 parity 100%, Level 3 ≥30% | `sqldiff` + sha256 | export.pdb Level 3 ≥60% |
| **Export speed** | < 0.5× real-time on M-series Mac (1 hour of audio → < 30 min end-to-end analyze+export) | Wall-clock on 1458-track Inbox corpus | < 0.2× real-time |
| **CDJ-3000 plug-and-play rate** | 100% of exported USBs mount, list, load, and play without on-deck errors across the 1458-track Inbox | Physical CDJ-3000 acceptance test; zero USB ERROR, zero "Cannot read" | Same on CDJ-3000X (OneLibrary path) |
| **Round-trip survival** | 100% of exported tracks re-imported via our own parser preserve BPM/key/cues/grid to bit-level | `tests/test_cdj_export_roundtrip.py` | Also survive re-import into Rekordbox 7 (one-way compat) |
| **Analyzer accuracy regression** | Swapping analyzers (e.g. madmom → allin1) must not regress any metric above by > 1% | Gated in CI via oracle diff | Net improvement on every swap |

These are *exit bars*, not aspirations — Phase 21 is not done until every row meets its Target column on the reference corpus. Stretch column tracks post-launch investment.

**Plans:** 5/6 plans executed

Plans:
- [x] 21-01-PLAN.md -- Folder importer (mutagen + imported_tracks table + POST /api/library/import + from_rekordbox flag)
- [x] 21-02-PLAN.md -- Analysis pipeline (POST /api/library/analyze hooked into existing AnalysisBatchRunner with source="import")
- [x] 21-03-PLAN.md -- ANLZ writer (hand-rolled per Option C: construct + Deep Symmetry Kaitai spec; PQTZ/PCO2/PCOB/PWAV/PWV3/PSSI; .DAT/.EXT/.2EX; byte-equivalence oracle vs reference USB)
- [x] 21-04-PLAN.md -- PDB writer + USB orchestrator (hand-rolled export.pdb + exportExt.pdb + exportLibrary.db DEFERRED/SQLCipher + aux files RBFLTR/DEVSETTING/MYSETTING*; audio path `Contents/<Artist>/<Album>/<filename>`; pdb_reader + reference oracle; 112 Phase 21 tests)
- [ ] 21-05-PLAN.md -- Electron UI (folder picker IPC, ImportFolderButton, AnalyzeProgress, UsbExportWizard) + real CDJ-3000 acceptance + DMG build via build-mac.sh
- [ ] 21-06-PLAN.md -- Artwork pipeline (extract embedded APIC/COVR via mutagen, resize 80×80 + 240×240 JPEG via Pillow, `Artwork/<bucket>/{a,b}<slot>{,_m}.jpg` with SLOTS_PER_BUCKET=38, wire into pdb_writer Artwork table)

### Phase 24: Turion Satellite Make/Buy Cost Module — make-cost sheet, buy-cost sheet, make-vs-buy decision records per spec §3.2

**Goal:** First-class make-cost sheets + buy-cost sheets + per-(part × satellite) make-vs-buy decision records that gate procurement, with cost-rollup analytics, multi-currency support, audit trail via supersede-on-write, and a dedicated cost.html primary surface — replacing the existing approximate cost_breakdown panel on part.html with authoritative data.
**Depends on:** Phase 21
**Plans:** 4/5 plans complete

Plans:
- [ ] 24-01-PLAN.md — schema migrations (labor_rates SCD-2, fx_rates, currency_code, audit_log, views) + db.ts NUMERIC->Decimal typecast + lib/money.ts (Wave 1)
- [ ] 24-02-PLAN.md — 6 read-only routers: GET /api/{labor-rates,fx-rates,make-costs,buy-costs,make-buy-decisions,analytics/cost-rollup} (Wave 2)
- [ ] 24-03-PLAN.md — write endpoints with supersede-on-write + HARD GATE on procurement-requests + vendor-orders + retire $150/hr hardcode (Wave 3)
- [ ] 24-04-PLAN.md — cost.html + cost-detail.html + cost-render.js + part.html replacement + Cost nav across 8 pages (Wave 4)
- [ ] 24-05-PLAN.md — seed SAT-003 cost data + extend smoke script + deploy backend + frontend + live hard-gate verification (Wave 5, has human checkpoint)

### Phase 25: Schema unification + cross-system integration: junction columns linking turion (SF/NS/Arena/MES) ↔ turion_satellite, add specifications JSONB to part_definitions, sync triggers for sales_order → part_instance creation

**Goal:** Bridge the two parallel demo schemas (`turion` legacy + `turion_satellite` Phase 21+) on `turionspace.zietra.com` by adding nullable cross-schema TEXT FK columns, a free-form `specifications` JSONB column on part_definitions, four pull-only sync API endpoints under `/api/integration/*`, and an expanded audit_log — all shipped to live Lambda with goal-backward verification.
**Depends on:** Phase 24
**Plans:** 4/4 plans complete

Plans:
- [x] 25-01-PLAN.md — Migrations 008/009/010: 6 cross-schema TEXT FK columns + ON DELETE SET NULL, specifications JSONB on part_definitions, audit_log entity_id widened to TEXT + sync_* actions added to CHECK (shipped 2026-05-10, commit e41c212)
- [x] 25-02-PLAN.md — Backend code: spec-keys.ts library + integration.ts router with 4 sync endpoints (sales-order/ns-invoice/arena-doc/mes-work-order) + parts.ts surfaces specifications + app.ts mount (shipped 2026-05-10, commits 427d000+d70ca6d+b93be0d)
- [x] 25-03-PLAN.md — Vitest coverage: 4 new integration test files (39 cases: sales-order 11 + ns-invoice 9 + arena-doc 10 + mes-wo 9) + parts.test.ts extended with 3 specifications cases; test count 188→230 (+42); zero regressions; tsc clean (shipped 2026-05-10, commits e564a2f+aebfec1)
- [ ] 25-04-PLAN.md — Deploy turion-satellite-api Lambda via build-and-push.sh, verify CodeSha256 changed, live curl smoke (401 gate + auth'd happy-path + audit_log assertion), commit GSD artifacts, human checkpoint

### Phase 26: Full demo data densification: populate all 69 part_definitions on SAT-003 with instances, drawings, specifications, work_orders, build_steps, procurement_requests, costs, decisions, full BOM hierarchy

**Goal:** Every SAT-003 part_definition (80 total) has a complete demo story — unique drawing, populated specifications JSONB, ≥1 instance, an approved make/buy decision, manufacturing process (work_orders + build_steps for make-parts) or procurement chain (procurement_requests + vendor_orders for buy-parts), realistic tiered cost data, deepened BOM hierarchy (~150 lines), and representative cross-system linkages (15-20 part_instances + 5-8 vendor_orders linked to legacy turion sales_orders / invoices / arena_docs / work_orders).
**Depends on:** Phase 25
**Plans:** 5/5 plans complete

Plans:
- [x] 26-01-PLAN.md — Node.js generator script + migration 011: drawings (59 SVGs filling drawing_svg) + specifications (80 JSONB blobs matching spec-keys.ts contract) — fastener SVG parameterized template (shipped 2026-05-10, commit 9f262a4 on github.com/jeet-avatar/turion-satellite; migration generated + committed, NOT YET APPLIED — Plan 26-05 owns apply)
- [x] 26-02-PLAN.md — Migration 012: 50 new part_instances (100% coverage: 80/80 part_definitions have ≥1 SAT-003 instance) + 16 multi-qty for L3 wiring + 63 new bom_lines (93→156, every subsystem ASSY wired to children + 6 of 8 subsystems have L3 depth) (shipped 2026-05-10, commit 8403dba on github.com/jeet-avatar/turion-satellite; idempotent via BEGIN/ROLLBACK double-apply test, NOT YET APPLIED — Plan 26-05 owns apply)
- [ ] 26-03-PLAN.md — Migration 013: 80 approved make_buy_decisions (rationale ≥20 chars) + work_orders + build_steps for make-parts + procurement_requests + sampled vendor_orders + tiered make_costs/buy_costs ($5M-$15M rollup)
- [ ] 26-04-PLAN.md — Migration 014: 15-20 cross-system FK linkages on part_instances (sales_order_id / ns_invoice_id / arena_doc_id / mes_work_order_id) + 5-8 on vendor_orders, audit_log densify_seed entries
- [ ] 26-05-PLAN.md — Apply all 4 migrations to production DB, prove live idempotency (re-apply changes 0 rows), live curl smoke 5-10 representative parts, push commits to github.com/jeet-avatar/turion-satellite

### Phase 27: Last-mile CAD coverage: ~70 unique SVG drawings for every part, plus interactive SVG hotspots for ~10 hero parts (clickable regions navigate to sub-parts)

**Goal:** Replace migration-011's flat auto-generated SVGs with truly isometric 3D-rendered cabinet-projection drawings for all 87 SAT-003 part_definitions (79 generator-emitted + 8 v=016-protected from migration 016), and overlay clickable BOM-child callouts on every parent's drawing so users can drill down by clicking labels on the CAD diagram itself.
**Depends on:** Phase 26
**Requirements:** Drawings, Hotspots, Generator, FrontendOverlay, Coverage
**Plans:** 5/5 plans complete

Plans:
- [ ] 27-01-PLAN.md — Generator foundation: palette extraction from 8 hand-crafted silhouettes + cabinet-projection primitives + fastener/plate templates + Vitest coverage
- [ ] 27-02-PLAN.md — Frontend callout overlay: renderCalloutsOnSvg + show/hide toggle + CSS in turion-space-demo (parallel with 27-01, independent files)
- [ ] 27-03-PLAN.md — Remaining 6 part-family templates: assembly, subassembly, cylindrical, lens-optical, antenna-dish, solar-cell + 25-case test suite
- [ ] 27-04-PLAN.md — Generator orchestrator: DB introspect, dispatch 79 parts across 8 templates (skip v=016 sentinel), emit migration 017 + preview gallery + human-verify visual QA gate
- [ ] 27-05-PLAN.md — Deploy: apply migration 017 to production, prove idempotency, deploy frontend via deploy-frontend.sh, live smoke test 5+ parts, push commits to both repos

### Phase 28: Full BOM densification + data coverage + drill-down UI

**Goal:** Make the satellite system fully drillable end-to-end: (a) seed internal sub-components for the ~15-25 mid-tier parts (batteries, OBC boards, IMU, star tracker, radios, tanks, valves, focal plane, FPGAs, MPPT, heat pipes, heater) so every non-leaf bottoms out at legitimate leaves (fasteners, single cells, harnesses) — mirror PCDU pattern from migration 016; (b) backfill spec sheet + cost + build steps + work order + procurement data for every new sub-component AND audit Phase 26 coverage; (c) ship the drill-down UI overhaul: BOM tree viewer page, integrated SF→NS→Arena→MES side panel on cost-detail.html, recursive cost rollup, full-featured part page with all panels populated. New migration 018 (BOM densify) and 019 (data backfill); both idempotent. After this, every part has full data and the UI surfaces it everywhere.
**Depends on:** Phase 27
**Requirements:** BOMDensity, DataCoverage, DrillDownUI, CostRollup, CrossSystem
**Plans:** 6/6 plans complete

Plans:
- [x] 28-01-PLAN.md — Migration 018: BOM densification (14 valid mid-tier parents → 78 new sub-component part_definitions + 78 instances + 78 bom_lines on SAT-003, mirror of mig 016 PCDU pattern; 7 RESEARCH candidates dropped for already having children; ALL 14 targets Phase 27-drawn → Block 1 drawing UPDATE omitted everywhere; idempotency double-apply proven, Phase 27 count 79 unchanged) — DONE 2026-05-11 (commit a253902 on turion-satellite, NOT pushed; Plan 28-06 owns apply)
- [x] 28-02-PLAN.md — Migration 019: data coverage backfill (615-line SQL, 5 blocks mirroring mig 013: decisions ON CONFLICT DO NOTHING / work_orders+6 build_steps / make_costs T+A / procurement_requests+vendor_orders / buy_costs T+A — all via set-difference WHERE NOT EXISTS, fully turion_satellite.-qualified, single BEGIN/COMMIT; vendor_orders ~50% subset uses DETERMINISTIC (HASHTEXT(pi.id)%2)=0 replacing mig 013's non-idempotent v_counter%2; written against the actual introspected schema since the plan's example SQL referenced ~8 nonexistent columns; idempotency double-apply = INSERT 0 0 for all 9 metrics) — DONE 2026-05-11 (commit 40c7c87 on turion-satellite, NOT pushed; DEVIATION: production WAS modified — the migration's own inner BEGIN/COMMIT committed the outer BEGIN the idempotency test wrapped it in; left in place as it IS the intended Plan 28-06 end-state + is idempotent + all integrity checks pass; Plan 28-06's apply step is now a no-op)
- [x] 28-03-PLAN.md — Backend: new GET /api/satellites/:satId/bom/tree (recursive CTE with cycle guard) + GET /api/analytics/cost-rollup/instance/:instId (decision-aware subtree rollup) + Vitest coverage — DONE 2026-05-11 (commits a67110d, db27995; 16 new Vitest cases; full suite 325/326; deploy deferred to 28-06)
- [x] 28-04-PLAN.md — Frontend: replace bom.html with recursive <details>/<summary> tree + add shared renderIntegrationsPanel helper to satellite-render.js — DONE 2026-05-11 (bom.html 150→204 lines: recursive renderNodeClean, depth≤2 expanded, inline drawing_svg per node no refetch, badges subsystem/make/buy/ITAR, click-through to instance.html?inst=&id=&sat=, expand/collapse with aria-label, aria-current=page on terminal crumb, empty/error states, zero hardcoded enums; satellite-render.js 80→132 lines: window.satelliteRender.renderIntegrationsPanel(inst, opts?) 4-slot cross-system FK panel for Plan 28-05; commits 6b5a0d8, 1360908 on turion-space-demo, NOT pushed; deploy deferred to 28-06)
- [x] 28-05-PLAN.md — Frontend: insert integrations panel on cost-detail.html + insert integrations panel + subtree cost rollup panel on instance.html (parent-trail computed client-side) — DONE 2026-05-11 (cost-detail.html 331→340 lines, +9 all additions: #integrationsPanel div between decision panel and make/buy sheets, rendered via shared renderIntegrationsPanel(inst); instance.html 458→570 lines, +113/−1: now accepts ?inst=||?id=, #integrationsPanel full-width row after the spec/cost grid — DEVIATION/Rule 3 since a literal interleave is impossible in the 2-col .info-grid — plus new #subtreeRollupPanel showing self/descendants/subtree cost + descendants_count from GET /api/analytics/cost-rollup/instance/:instId, plus client-side parent-trail via findParentChain over GET /api/satellites/:satId/bom/tree which is sessionStorage-cached per sat (bom-tree:<satId>, 5-min TTL) with window.__bomTreeCacheBust(satId) busting it on stage advance/revert; .muted→.subtitle (DEVIATION/Rule 3); zero hardcoded enums; graceful 404 degradation; both pages' inline JS pass node --check; commits fc150ef, 75a933b on turion-space-demo, NOT pushed; deploy deferred to 28-06)
- [x] 28-06-PLAN.md — Deploy: apply migrations 018+019 to prod DB (idempotency proof) → redeploy backend Lambda → deploy frontend → E2E smoke test 5-10 parts root-to-leaf → push commits to both repos — DONE 2026-05-11: migrations 018+019 applied to prod Postgres (87→165 part_definitions, 183→261 SAT-003 instances, 163→241 bom_lines, 87→165 decisions, 30→52 work_orders, 83→139 procurement_requests, 32→54 make_costs actuals, 132→188 buy_costs actuals; parts_missing_decision=0; max_bom_depth=4), live re-apply = INSERT 0 0 everywhere (all 8 metrics unchanged — live idempotency proven); turion-satellite Lambda redeployed via build-and-push.sh (CodeSha256 9d2b9910→bddd42c868, State Active, LastUpdateStatus Successful) — /bom/tree + /cost-rollup/instance/:instId live + 401-gated (200 informational gate skipped: Lambda uses ES256/JWKS, no signing private key — DB-direct is authoritative per plan W9 fix); frontend deployed via deploy-frontend.sh (CloudFront invalidation I8QQOU3ZO1KTAIIL0YSGQO6EOZ Completed on dist E37R9PT8IL44L2) — bom.html/cost-detail.html/instance.html/satellite-render.js live at turionspace.zietra.com; DB-direct verify 8/8 scoped queries PASS (all 78 mig-018 children have decision+WO|PR+cost; spec ≥9 keys; total cost rollup $12,081,500.83; Phase-26 sales-order cross-links preserved — 24 instances); 5-parent E2E walk (EPS-BATTERY-LIION-100W / ADCS-STAR-TRACKER-A / PROP-VALVE-LATCH-A / PAY-FOCAL-PLANE-A / COMM-RADIO-XBAND-A) all green — 6 fully-covered children each; deployed-HTML smoke PASS on all 3 pages; pushed turion-satellite e2bc0d9..40c7c87 + turion-space-demo 11c6988..75a933b. DEVIATION (scope boundary): Q2/Q3/Q7 literal-plan-query "FAIL" = pre-existing out-of-scope Phase 26 data states (96 instance>1 multi-qty duplicate instances missing their own WO/PR from mig 012/013 which only backfill instance #1; ns_invoice_id never populated on any SAT-003 instance by Phase 26-04) → logged to .planning/phases/28-…/deferred-items.md, NOT fixed. **Phase 28 COMPLETE — every non-leaf bottoms out at legitimate leaves, every part has populated data, UI surfaces cross-system FKs, BOM tree drills end-to-end.**

### Phase 29: UI workflow E2E UAT + fixes

**Goal:** Every interactive button across the 11 satellite pages persists to backend and reflects on reload. Audit constellation, satellite, part, instance, work-order, bom, kanban, cost, cost-detail, sub-parts pages. Verify stage advance/revert, place-order modal, sign build step, create WO, edit BOM line, etc. Catch and fix dead buttons + missing endpoints. Ship final user-acceptance verification: launch a fresh browser session as the demo user, exercise every primary flow, prove backend persistence.
**Depends on:** Phase 28
**Requirements:** E2E_UAT, ButtonAudit, EndpointCoverage, PersistenceVerify
**Plans:** 3/3 plans complete

Plans:
- [x] 29-01-PLAN.md — Static button/endpoint audit script (Vitest case in turion-satellite/backend deriving the route allowlist from app.ts) + auth/callback.html review (F4) + parts.html honors ?subsystem=/?search= (F3) + instance.html instance_index>1 "tracked on instance #1" hint (F5) — DONE 2026-05-11: turion-satellite/backend/scripts/audit-satellite-buttons.mjs (~430 lines, dependency-free Node 20) derives the 61-route allowlist from app.ts's mount tree (app.use + nested router.use + router.{get,post,patch,put,delete}), regex-scans every satellite/*.html for onclick attrs (allowlist: location.*/window.location.*/history.back()/window.satelliteAuth.signOut()|.signInWithMagicLink()/getElementById('...').remove()|.dispatchEvent()|.value=/dispatchEvent(new Event())/event.preventDefault()/this.style.* OR a fn defined in a <script> in the same file) + satelliteApi.{get,post,patch} calls, FAILS CLOSED (strip ?query+trailing/, template ${} → :X segment, concat boundaries → :X fragments BUT 2+ adjacent non-literals → unparseable-path, exact segment-count match else missing-endpoint, unresolvable bare identifier → unparseable-path — incl. resolving `const NAME = <expr|ternary>` and `function NAME(NAME){...}` wrapper call sites against the file text so the real safeGet(path)/const url=ternary call sites stay clean); reports 0 violations against the current codebase (61 routes, 15 onclick, 57 satelliteApi). Vitest case at backend/tests/audit-satellite-buttons.test.ts (matches the repo's actual `tests/**/*.test.ts` glob, not `test/**`; it.skipIf(!fs.existsSync(satelliteDir)) so CI stays green). `npm run audit-buttons` in BOTH repos (turion-space-demo/scripts/audit-satellite-buttons.mjs = thin re-export wrapper pointing at this repo's satellite/ + the sibling backend's src/). F4: auth/callback.html reviewed — NO change (already runs the Supabase magic-link exchange with detectSessionInUrl, redirects to /satellite/ on success, shows error_description + redirects to login.html on a bad link; login.html carries no next/redirect_to param). F3: parts.html pre-applies r.getQueryParam('subsystem')/('search') AFTER the awaited GET /api/subsystems populates #subFilter and BEFORE the first load() (unknown ?subsystem= harmlessly ignored; no-param path defaults to all). F5: instance.html — when inst.instance_index>1 AND no WOs, the WO panel shows "Manufacturing & procurement for this part are tracked on instance #1." linked to the #1 sibling (from the already-loaded allInstances) instead of bare "No work orders"; instance #1 unchanged; pure client-side, no new onclick/satelliteApi. Backend suite 326 pass / 1 skip (pre-existing) / 0 regressions; node --check passes on every edited inline <script>. Commits under jm@techcloudpro.com/jeet-avatar (NOT pushed — Plan 29-03 owns deploy): turion-satellite 43f2875 (Task 1); turion-space-demo 6223725 (Task 2 — parts.html + wrapper + package.json) + e687591 (Task 3 — instance.html). DEVIATIONS (all Rule 1/3, auto-fixed): test dir test/→tests/ to match the actual vitest glob; added identifier-resolution to the audit so the real safeGet(path) wrapper + const url ternary stay clean; tightened the concat normalizer so 2+ adjacent non-literals fail closed as unparseable-path instead of silently collapsing to /api/:X. SUMMARY at .planning/phases/29-ui-workflow-e2e-uat-fixes/29-01-SUMMARY.md.
- [x] 29-02-PLAN.md — "+ Add BOM line" modal in bom.html wired to the existing POST /api/satellites/:satId/bom (F1, zero backend change) + document the 4 /api/integration/sync-* routes as API-only batch backfills (F2) — DONE 2026-05-11: bom.html +126 lines (#addBomLineBtn in tree-controls shown only when ?sat= && >=1 instance; openAddBomLineModal() with parent/child instance pickers flattened+deduped from the already-fetched /bom/tree response, qty number input, optional ref-designator, inline #bomLineErr; #modalSave validates child set / parent set / parent != child / qty whole >= 1 BEFORE the API call, then POSTs { child_part_instance_id, parent_part_instance_id, qty, ref_designator } — exact bom.ts:156 field names, no `quantity`/`reference_designator`, uom omitted so backend defaults 'EA' — then r.toast + location.reload on success / e.message inline on ApiError; recursive tree + expand/collapse + ?sat= guard untouched; node --check passes; commit 3aa14e2 on turion-space-demo). integration.ts +27 lines: JSDoc block above the router declaration documenting the 4 POST /api/integration/sync-* routes as API-only batch backfills (cross-system FK population from the legacy `turion` schema, no "Sync now" button by design, invoke from cron/admin) — satisfies EndpointCoverage's "wire or document"; comment-only, tsc --noEmit clean; commit 8b25a30 on turion-satellite. DEVIATION (Rule 3): the planned comment text referenced `.planning/phases/28-*/deferred-items.md` verbatim — `28-*/` contains `*/` which terminated the JSDoc block early (tsc TS1127/TS1005/TS1161); rephrased to "the Phase 28 deferred-items.md note #2". No new backend route. Live persistence proof + deploy = Plan 29-03. SUMMARY at .planning/phases/29-ui-workflow-e2e-uat-fixes/29-02-SUMMARY.md.
- [x] 29-03-PLAN.md — Deploy with F6 pre-flight + UAT verification of all 7 primary flows — DONE 2026-05-11: F6 pre-flight on turion-space-demo found {3 ERP-demo WIP root HTML (about-this-demo/agent-sales-cash/dashboard-cio, +1199 lines, would ride along on deploy-frontend.sh's `aws s3 sync .`), backend/* (excluded by --exclude backend/*), .superpowers/ (untracked brainstorm scratch with .html files that would also ride along)} dirty; satellite/* already clean (29-01/29-02 commits e687591/6223725/3aa14e2) → git-stashed the 3 ERP HTML + `mv .superpowers` aside before deploy (only committed satellite/* shipped; the 3 ERP HTML went up in baseline state; stale .superpowers/* deleted from S3), restored both after. Audit (pre+post deploy): 61 routes / 0 violations / exit 0 from both repos. `bash deploy-frontend.sh` → CloudFront invalidation I6P7YJAD2XDAPRNNNSRE1Q5AYJ on dist E37R9PT8IL44L2 → polled to Completed; deployed-HTML curl checks pass (bom.html addBomLineBtn×2/openAddBomLineModal×2/correct POST field names/parent==child rejection; parts.html getQueryParam('subsystem')×1+('search')×1; instance.html instance_index×9+"tracked on instance #1"×1; cost-render.js emits parts.html?subsystem=…&sat=… — F3 link↔reader match; login.html/auth/callback.html 200). Backend Lambda NOT redeployed (the 29-02 integration.ts JSDoc block does land in dist/routes/integration.js so a redeploy would change CodeSha256, but it's a documentation-only change with zero runtime change, Phase 28 functional routes already live+401-gated — orchestrator decision; dist/ is gitignored). Pushes under jm@techcloudpro.com/jeet-avatar: turion-space-demo 75a933b..e687591, turion-satellite 40c7c87..43f2875. Task 2 (checkpoint:human-action live magic-link sign-in) CANNOT be satisfied headless (no browser, demo whitelisted email not provided, no synthetic-JWT path — Lambda verifies ES256 via JWKS) → per orchestrator directive "agent drives via DB-direct verification": 7 primary flows verified DB-direct. Phase 28 state intact (165 part_definitions, Cygnus=24587565-…, SAT-003 261 instances/241 bom_lines max depth 4/52 work_orders/69 vendor_orders/139 procurement_requests/165 make_buy_decisions one-current-per-pdef). All 12 mutating endpoints HTTP-probe to 401 (route alive) vs bogus path → 404 (proving the distinction); POST /api/satellites/:satId/bom destructures exactly {child_part_instance_id, parent_part_instance_id, qty, uom default 'EA', ref_designator} — matches the deployed modal. 7-flow PASS table with psql persistence proof (all PASS): F1 drill-down (instance #1 rows w/ SN-*); F2 BOM tree + Add-BOM-line (bom_lines schema confirmed qty/uom/ref_designator/created_at, NO quantity/reference_designator; F1 fix live); F3 lifecycle (part_stage_events rows — note prod direction='forward'/'backward' not 'advance'/'revert', minor doc discrepancy; advance/revert 401-gated=live); F4 manufacturing (complete WO w/ completed_at + signed pass build steps; create-WO/add-step/sign-step/PATCH-WO 401-gated=live); F5 procurement (vendor_orders + procurement_requests rows; both POST 401-gated=live); F6 cost rollup + make/buy (make_buy_decisions rows + one-current-per-pdef invariant + cost_rollup_v populated; F3 verified live; save-decision/re-evaluate 401-gated=live); F7 edge auth (login.html/auth/callback.html 200, F4 redirect logic intact). Cross-system ERP shells alive (sales/account 200, finance/general-ledger 200). Phase 28 deferred items explicitly acknowledged OUT OF SCOPE (UAT walks instance #1): 96 instance_index>1 instances lack own WO/PR (F5 hint explains it); ns_invoice_id NULL on all 261 SAT-003 instances (integrations panel shows "—"; sync-ns-invoice routes documented API-only). **Phase 29 verdict: PASS** (caveat: UAT is DB-direct rather than a live magic-link browser walk — headless environment; DB-direct is the authoritative gate per the W9-style design; a follow-up browser session can re-walk the 7 flows if a literal live-browser sign-off is needed). E2E_UAT + PersistenceVerify met. SUMMARY at .planning/phases/29-ui-workflow-e2e-uat-fixes/29-03-SUMMARY.md (217 lines). DEVIATIONS: (1) Rule 3 — Task 2 checkpoint can't be satisfied headless → DB-direct substitute per orchestrator; (2) pre-flight hygiene — ERP WIP git-stashed + .superpowers/ moved aside before deploy, restored after; (3) decision per orchestrator — Lambda not redeployed (comment-only); (4) doc discrepancy noted not a defect — part_stage_events.direction is forward/backward in prod. **Phase 29 COMPLETE — frontend live at turionspace.zietra.com/satellite/ with no unrelated WIP shipped; audit 0 violations; all 7 primary flows DB-direct-verified; F1/F3/F4/F5 fixes live; Phase 28 deferred items acknowledged out-of-scope.**

### Phase 30: Interactive WebGL 3D part viewer (all 165 parts)

**Goal:** Replace the static isometric SVG drawings with a real interactive Three.js 3D viewer on part.html + instance.html so users can rotate / zoom / orbit each part and see it from every angle. Every one of the 165 part_definitions renders as a procedurally-built 3D mesh — shape dispatched by part-family (box / cylinder / sphere / antenna-dish / extruded-plate / fastener / solar-panel / harness) mirroring the Phase 27 8-template dispatch, sized from `specifications.dimensions_mm` (with defaults), colored by the subsystem palette. OrbitControls (drag-rotate, scroll-zoom, pan), three-point lighting, a ground plane / grid for scale. WebGL-unavailable browsers fall back to the existing isometric SVG. Three.js + OrbitControls loaded via CDN (the satellite frontend is vanilla HTML/JS — no bundler). Client-side only — no backend route or migration change (the frontend already receives subsystem_code / default_make_buy / specifications / part_number from /api/parts/:id). Static SVG kept as a selectable "2D drawing" view alongside the 3D one. Existing bom.html tree thumbnails stay SVG (3D per node would be too heavy); add a "view in 3D" link per node.
**Depends on:** Phase 29
**Requirements:** ThreeJSViewer, MeshGenerator, OrbitControls, WebGLFallback
**Plans:** 3/3 plans complete

Plans:
- [x] 30-01-PLAN.md -- satellite-3d.js: Three.js viewer module (mount3DViewer/dispose, OrbitControls, WebGL feature-detect) + procedural mesh generator (8 part families, ported Phase-27 dispatch/perturb/palette) + 3d-test.html 8-family visual harness
- [x] 30-02-PLAN.md -- Wire the viewer into part.html + instance.html (jsDelivr import map, .cad-frame #viewer3d, 2D/3D toggle keeping the SVG as fallback, auto-rotate, ?view= param) + bom.html per-row "view in 3D" deep-link
- [x] 30-03-PLAN.md -- Deploy: F6 pre-flight + push satellite/ changes + turion-satellite b36691a -> deploy-frontend.sh -> CloudFront invalidation IEHSI8TUSOTIJS0DZWF75YC244 -> smoke-check (deployed pages + jsDelivr URLs all 200+CORS) -> headless-substitute checkpoint (curl/HEAD proxies passed; browser visual walk = follow-up). DONE 2026-05-11; audit 0 violations.

### Phase 31: 3D dimension HUD + clickable multi-mesh assemblies

**Goal:** Enhance the Phase-30 Three.js viewer so it conveys part SIZE and lets you inspect assembly internals. (1) A dimension HUD overlay on the `.cad-frame` canvas, always visible, showing the current part's `L × W × H mm` + mass + material from `specifications` (the mesh is normalized to fit the viewport, so the textual dims are how size is communicated). (2) Assembly parts (those with ≥1 BOM child on a satellite) render as MULTIPLE meshes — one per BOM child built via the existing `buildPartMesh`, laid out in 3D (radial ring or grid sized by child count), each pickable via `THREE.Raycaster` + pointer events (hover → highlight outline, click → select + camera-frame it); selecting a child updates the HUD to that child's dimensions and shows its part number / ref designator. Leaf parts keep the single-mesh path. Small backend change: add `specifications` (or `dimensions_mm`) to the `GET /api/parts/:partDefId/children` SELECT so the viewer has each child's real dimensions (needs a Lambda redeploy via build-and-push.sh). Frontend changes in `satellite/satellite-3d.js` (new `mountAssemblyViewer` or an `assemblyChildren` opt on `mount3DViewer`, raycaster picker, HUD render helper) + `part.html` + `instance.html` (HUD overlay div in `.cad-frame`, fetch `/api/parts/:id/children?sat=` when present, wire `onSelect`). The static SVG 2D fallback + 2D/3D toggle from Phase 30 stay.
**Depends on:** Phase 30
**Requirements:** DimensionHUD, AssemblyMultiMesh, RaycastPicker, ChildrenSpecsAPI
**Plans:** 4/4 plans complete

Plans:
- [x] 31-01-PLAN.md — Backend: add `c_pd.specifications AS specifications` to the GET /api/parts/:partDefId/children SELECT + update parts.test.ts mock rows/assertion (no DB migration)
- [x] 31-02-PLAN.md — satellite-3d.js: extend mount3DViewer with `opts.assemblyChildren` + `opts.onSelect` — radial-ring multi-mesh layout (one buildPartMesh per child), THREE.Raycaster picker (canvas-rect NDC), emissive hover highlight, camera fly-to tween, viewerHandle.deselect(), dispose() listener cleanup (leaf single-mesh path untouched)
- [x] 31-03-PLAN.md — part.html + instance.html: DOM dimension HUD `<div class=cad-hud>` in .cad-frame (L × W × H mm + Mass + Material + identity) + #hudBack chip + updateHud()/fmtDims(); wire `assemblyChildren`+`onSelect`→updateHud; instance.html gains the /api/parts/:id/children?sat= fetch (audit stays 0 violations)
- [x] 31-04-PLAN.md — Deploy: F6 pre-flight + push both repos + turion-satellite ./build-and-push.sh (Lambda redeploy) + turion-space-demo deploy-frontend.sh + CloudFront invalidation + audit 0 violations + curl/HEAD smoke + human-verify checkpoint (headless-substitute allowed)

### Phase 32: Build/procurement process documented + shown symmetrically (make AND buy)

**Goal:** Comprehensive pass so every part page clearly documents how a part is realized, with the MAKE path and the BUY path given equal prominence. (1) The make/buy DECISION shown consistently everywhere — decision, rationale, decided_by, decided_at (from `make_buy_decisions`, latest non-superseded). (2) MAKE parts: manufacturing workflow + work order(s) + build steps (step number, type build/inspection/test, torque spec, estimated duration, result pass/fail/rework, sign-off + signer) + materials required + labor cost breakdown — clearly grouped as "the build process". (3) BUY parts: the FULL procurement chain rendered with the SAME prominence — RFQ (vendor, quoted unit cost, NRE, due date, awarded) → purchase request (material, est cost, status) → vendor order (vendor name/country/ITAR-compliant, qty, PO number, lead weeks, status) → invoiced value — instead of just a thin "no build steps for this part" placeholder. Audit + fix across `part.html` ("Make/Buy detail" / "Build process" / "Materials required" / "Recent orders" panels) and `instance.html` (the make/buy-aware "Manufacturing / Procurement" panel added in 29260a0); verify `work-order.html` (build steps + sign-off) and `cost-detail.html` (make/buy cost sheets + decision panel + integrations) are consistent. A small backend addition may be needed if `/api/parts/:partDefId/process` `recent_orders` doesn't already surface the RFQ→PO→invoice fields (check `parts.ts` + the `rfqs` / `buy_costs` tables) — if so, redeploy the Lambda via build-and-push.sh; otherwise frontend-only. Also: remove the temporary `[3d-wd]` console watchdog from `part.html`/`instance.html` + `debugInfo()`/`frameCount` from `satellite-3d.js` (the Phase-30/31 size-blowup is fixed; the watchdog has served its purpose). Deploy: `deploy-frontend.sh` with the F6 pre-flight.
**Depends on:** Phase 31
**Requirements:** MakeBuyDecisionUI, MakeProcessUI, BuyProcessUI, ProcessConsistency
**Plans:** 4/4 plans complete

Plans:
- [x] 32-01-PLAN.md — part.html: fetch /api/make-buy-decisions → Decision card under a "Realization" section; symmetric BUY "Procurement chain" panel (PR cards → VO cards → PO/invoiced from /api/buy-costs) with the same prominence as MAKE's "Build process"; fix the BUY workflow visualizer to Decision→Quote→Purchase request→Vendor order→PO issued→Invoiced (drop phantom RFQ/Receiving/Acceptance); remove the [3d-wd] watchdog
- [x] 32-02-PLAN.md — instance.html: Decision card at the top of the commit-29260a0 "Manufacturing / Procurement" panel; add the authoritative buy_costs numbers (quoted/NRE/PO value/invoiced) after the existing PR + VO cards (from /api/buy-costs); leave the per-unit cost_breakdown panel as-is; remove the [3d-wd] watchdog
- [x] 32-03-PLAN.md — satellite-3d.js: remove debugInfo()/frameCount (keep resize/deselect/selectChild/dispose + the Phase-31 assembly path); work-order.html: show signed_by_name instead of the (signed_by||'').slice(0,8) UUID slice
- [x] 32-04-PLAN.md — Deploy (FRONTEND-ONLY, no Lambda redeploy): Phase-29 audit 0 violations + push turion-space-demo + deploy-frontend.sh with the F6 pre-flight + CloudFront E37R9PT8IL44L2 invalidation + curl/HEAD smoke + /api/make-buy-decisions & /api/buy-costs route-alive probes + human-verify checkpoint (headless-substitute allowed per Phase 27-31)

### Phase 33: End-to-end satellite-build flow — sales order → delivery, guided wizard + wire all pages

**Goal:** Make the satellite app a complete, walkable end-to-end procedure for "build a satellite", from sales order to delivery. (A) A NEW "New satellite program" wizard: create a sales order (in the satellite-app context, persisting to the DB, tying into the Phase-25 cross-system sync where it makes sense) → it spawns the satellite + its BOM + initial part instances + lifecycle-stage-0 events. (B) Audit the WHOLE lifecycle chain (sales order → satellite → part_definitions → part_instances → BOM tree → procurement requests / vendor orders → work orders → build steps → lifecycle-stage advancement → cost rollup → ... → delivery/completion) and fix every dead end — every page gets a clear "next step" link so a user never gets stuck. (C) Backend: a sales-order creation endpoint + the "spawn satellite from sales order" logic (likely extends the Phase-25 sync triggers) — needs a Lambda redeploy via build-and-push.sh. (D) Frontend: the wizard pages + the "next step" wiring across constellation / satellite / parts / instance / bom / work-orders / work-order / kanban / cost / cost-detail / sub-parts. Phase-29 button audit must stay 0 violations. Likely 5-8 plans across several waves.
**Depends on:** Phase 32
**Requirements:** SalesOrderWizard, SatelliteSpawn, LifecycleWiring, NoDeadEnds, E2EFlowVerified
**Plans:** 6/6 plans complete

Plans:
- [x] 33-01-PLAN.md — Migration 020: turion_satellite.sales_orders table + spawn_satellite_program() function (full SAT-003 BOM clone + stage-0 events), applied to prod, idempotent
- [x] 33-02-PLAN.md — Backend routes: POST /api/sales-orders (+GET), POST /api/satellites (wraps spawn_satellite_program, transactional), PATCH /api/satellites/:id (status advance), app.ts mount, tests, button audit 0 violations — also migration 021 (audit_log action CHECK)
- [x] 33-03-PLAN.md — Wizard page satellite/program-new.html (program details → spawn → done) + "+ New satellite program" CTA on /satellite/ index
- [x] 33-04-PLAN.md — programProgress() lifecycle strip in satellite-render.js + "Next step ▸" wiring on sat.html / bom.html / kanban.html (incl. PATCH-driven advance-program-status)
- [x] 33-05-PLAN.md — "Next step ▸" / "Back ▸" wiring + complete-WO control on instance.html / work-order.html / work-orders.html / part.html / cost.html / cost-detail.html — no dead ends — DONE 2026-05-12: work-order.html (97e2efb) — complete-WO control moved to a slot gated on every build step signed PASS (hint shows n/total when not), ✓ Completed badge in header when status==complete, #nextStepBar (back-to-instance always · next open WO when satellite has another open/in_progress/rework WO · all-WOs link); PATCH stays satellite-scoped `/api/satellites/:satId/work-orders/:woId` NOT `/api/work-orders/:woId` (DEVIATION Rule 1: the standalone route 400s w/o satId — work-orders.ts:76 requires req.params.satId; work-order.html already used the working form) — no new backend route. instance.html + work-orders.html (54505da) — instance.html: at final lifecycle stage (no `next`) append "This part is done — back to the satellite ▸"→sat.html?id=; if effMakeBuy==make && no WO for this instance append "🔧 Open / create a work order ▸"→existing open WO else work-orders.html?sat= (buy-path "place a vendor order" hint left intact); work-orders.html: #backToSat "↩ Back to satellite <designation> ▸"→sat.html?id=. part.html + cost.html + cost-detail.html (79b5ed7) — part.html: #satNav (only when ?sat=) "↩ Back to the BOM tree ▸"(bom.html?sat=)·"View instances on this satellite ▸"(#instancesAll anchor)·"Work orders on this satellite ▸"; cost.html: #backToSat updated by syncNav() + on ?sat= preselect "↩ Back to satellite <designation> ▸"→sat.html?id= (empty for constellation rollup); cost-detail.html: pageSubtitle adds "back to the instance ▸"(instance.html?sat=&id=) + "Back to the BOM tree ▸"(bom.html?sat=) next to existing "back to the part ▸". Button audit 0 violations (66 routes/16 onclick/65 satelliteApi). No new onclick — all `<a href>` or addEventListener. Phases 27-32 features on the 6 pages untouched (only additive). NOT deployed (33-06 owns deploy); 3 commits on turion-space-demo main under jm@techcloudpro.com/jeet-avatar, not pushed. SUMMARY at .planning/phases/33-end-to-end-satellite-build-flow/33-05-SUMMARY.md.
- [x] 33-06-PLAN.md — Deploy: ./build-and-push.sh Lambda redeploy + deploy-frontend.sh w/ F6 pre-flight + CF invalidation + button audit 0 violations both repos + DB-direct E2E walk (spawn → confirm chain → cleanup) + headless-substitute checkpoint + update STATE/ROADMAP — DONE 2026-05-12: turion-satellite pushed `15df18d..c13e4ce`, `./build-and-push.sh` redeployed Lambda `turion-satellite-api` (CodeSha256 `5438a289…`→`ffde2154…`); new routes `POST /api/sales-orders` `POST /api/satellites` `PATCH /api/satellites/:id` all 401-gated, bogus path 404, `/api/health` ok. turion-space-demo pushed `f3195a5..79b5ed7`, `./deploy-frontend.sh` with F6 pre-flight (stashed about-this-demo/agent-sales-cash/dashboard-cio.html + moved `.superpowers/` aside, both restored — `git stash list` empty, tree == baseline), CloudFront E37R9PT8IL44L2 invalidation `IC5BXDW47M3MIBSQTULPJMGPQJ` → Completed; `program-new.html` live, `satellite-render.js` has `programProgress`, `+ New satellite program` CTA on index, next-step links on sat/bom/kanban/instance/work-order/work-orders/part/cost/cost-detail; Phases 27-32 (3D viewer, BOM 3D badges, integrations panels, jsDelivr three@0.184.0 import-map) unregressed. Button audit `audit-satellite-buttons.mjs` from both repos: 0 violations, exit 0 (66 routes / 16 onclick / 65 satelliteApi). DB-direct E2E walk (headless-substitute for the magic-link browser walk, per Phases 27-32): spawned throwaway `SO-E2E-TEST-33` + `spawn_satellite_program('E2E Test Sat','SAT-999',…)` → new satellite (status `design`, sales_order_id back-linked) with 261 part_instances + 241 bom_lines + 0 dangling refs at SAT-003 instances + 20 root instances + 261 stage-0 `drawing`/`forward`/`entered` events + 0 other-stage events + status advance `design`→`build` OK → ordered cleanup → satellites count back to baseline (4), no test rows remain. DEVIATION (Rule 1): the plan's "NULL-parent root bom_line >0" assertion didn't hold — SAT-003 has 0 such rows; verified the real "20 root instances (never a bom_lines child)" invariant instead. SUMMARY at .planning/phases/33-end-to-end-satellite-build-flow/33-06-SUMMARY.md.

### Phase 34: In-site AI chat assistant — site-aware help (navigation, search, workflows), LLM-backed

**Goal:** A floating chat button on EVERY satellite page → a chat panel → a NEW `POST /api/assistant/chat` endpoint on the turion-satellite Lambda that calls Claude (Anthropic SDK) with a curated "site knowledge" system prompt: every page + what it does, how to navigate, how to search/filter, the full sales-order→delivery workflow (Phase-33), the make/buy distinction, where data lives, common tasks ("how do I advance a lifecycle stage?", "where do I see a part's 3D model?", "how do I place a vendor order?", "how do I create a new satellite program?"). The endpoint reads the Anthropic API key from AWS Secrets Manager (NEW secret ARN, e.g. `turion-satellite/production/anthropic-key`) — if the secret/key is absent, the endpoint returns a clear "assistant not configured" message and the chat widget shows that gracefully (so it ships + deploys before the key is added; the user adds the key to light it up). Chat widget = a small shared JS module (`satellite/satellite-chat.js`) loaded on every page (via the topbar/shell or each page); passes the current page path so answers are page-aware. Chat button wired via addEventListener; the new `/api/assistant/chat` path resolves against `app.ts` (audit stays 0 violations). Backend redeploy via build-and-push.sh; frontend deploy via deploy-frontend.sh w/ F6 pre-flight. ~3-5 plans.
**Depends on:** Phase 33 (so the site-knowledge prompt can describe the completed E2E flow)
**Requirements:** ChatEndpoint, SiteKnowledgePrompt, ChatWidget, GracefulNoKey
**Plans:** 3/3 plans complete

Plans:
- [x] 34-01-PLAN.md — backend: @anthropic-ai/sdk dep + assistant-knowledge.ts (SITE_KNOWLEDGE) + routes/assistant.ts (POST /api/assistant/chat, requireAuth, graceful-no-key) + app.ts mount + vitest — DONE 2026-05-12: `@anthropic-ai/sdk@^0.95.2` added to backend `dependencies` (npm ls confirms; ships in the `npm ci --omit=dev` image); `backend/src/assistant-knowledge.ts` exports `SITE_KNOWLEDGE` (~8.2KB) covering every satellite page + navigation/search/filter + the Phase-33 sales-order→delivery workflow + make-vs-buy + data location (Postgres schema `turion_satellite`) + common tasks; `backend/src/routes/assistant.ts` — `router.post('/chat', requireAuth, …)`, lazy memoized try/catch'd Secrets-Manager key fetch (reads `ANTHROPIC_API_KEY` env or `ANTHROPIC_API_KEY_ARN` secret JSON→`.ANTHROPIC_API_KEY` w/ bare-string fallback; does NOT touch `loadSecrets()`/`lambda.ts` cold-start path), 200 `{configured:false, reply}` when no key, calls `client.messages.create({model:'claude-haiku-4-5', max_tokens:1024, system:SITE_KNOWLEDGE+page, messages})` → 200 `{configured:true, reply}`, 400 on bad/non-user-final `messages`, 502 on Anthropic failure, hardened catch (no `err.message` leak); mounted `app.use('/api/assistant', assistantRouter)` in `app.ts`. Tests in `backend/tests/assistant.test.ts` (repo convention — `tests/`, not `src/routes/__tests__/`): 401 no-auth · 200 `{configured:false}` no-key · 200 `{configured:true, reply}` with `@anthropic-ai/sdk` mocked (asserts the `system` prompt + forwarded `messages`) · 400 bad `messages` — all pass; full backend suite 354 pass / 1 skip, `tsc --noEmit` clean, button audit 0 violations (67 routes, +1 for `/api/assistant/chat`). 3 commits on turion-satellite `main` under jm@techcloudpro.com/jeet-avatar (86a540c · a3a4407 · 96e3f77), NOT pushed (34-03 owns deploy). SUMMARY at .planning/phases/34-in-site-chat-assistant/34-01-SUMMARY.md.
- [x] 34-02-PLAN.md — frontend: satellite/satellite-chat.js self-injecting widget + <script> line on 12 content pages; button audit 0 violations — DONE 2026-05-12: created `satellite/satellite-chat.js` (204 lines) — IIFE w/ `window.__satelliteChatLoaded` double-injection guard; boots on DOMContentLoaded, polls ≤5s for `window.satelliteApi`; injects a scoped `<style>` (colors matching `satellite-shell.css` `:root`) + a floating circular `#sat-chat-fab` "💬" button (fixed bottom-right) + a hidden 360×480 `#sat-chat-panel` (header + ✕, scrollable `#sat-chat-log`, `#sat-chat-note` strip, `<textarea>` + Send) — all `createElement`, appended to `document.body`; module-scope `history` array, `render()` uses `textContent` (no HTML injection) + a "…" thinking bubble; **all wiring via `addEventListener`** (fab→toggle, close→hide, send-btn→send, input keydown Enter-no-Shift→send — no inline handler attributes); `send()` POSTs `{messages: history.slice(-12), page: location.pathname}` to `/api/assistant/chat` via `window.satelliteApi.post` → renders the reply, on `{configured:false}` shows the `#sat-chat-note` + disables the textarea/Send, `.catch` → "Sorry, something went wrong — try again." (stays usable). Added one `<script src="/satellite/satellite-chat.js"></script>` line before `</body>` (last script, after `satellite-api.js`/`satellite-render.js`) on the 12 content pages (index/sat/bom/kanban/instance/part/parts/work-order/work-orders/cost/cost-detail/program-new — `grep -c` = 1 each; `login.html`/`3d-test.html` = 0). `node --check` clean; zero `onclick`; `node scripts/audit-satellite-buttons.mjs` → `routes 67 / onclick 16 / satelliteApi 65 / violations 0 / exit 0`. 2 commits on turion-space-demo `main` under jm@techcloudpro.com/jeet-avatar (`108b5ab` widget · `8bfcf32` 12-page `<script>` lines), NOT pushed, only named files staged (repo's dirty WIP untouched); deploy + both-repo audit + the `anthropic-key` secret/env-var are 34-03. 0 deviations. SUMMARY at .planning/phases/34-in-site-chat-assistant/34-02-SUMMARY.md.
- [x] 34-03-PLAN.md — deploy: build-and-push.sh Lambda redeploy (CodeSha256 ffde2154…→c9372b81…) + deploy-frontend.sh (F6 pre-flight stash/restore) + CF invalidation I2DCYF361MVJLY75INLW75EXZJ → Completed + curl smoke (POST /api/assistant/chat 401 unauth / 404 bogus / health ok; 200 {configured:false} authed covered by the 34-01 vitest) + satellite-chat.js 200 + linked on 12 pages + button audit 0 violations both repos (67 routes/16 onclick/65 satelliteApi) + Phase 27-33 regression intact + STATE/ROADMAP — DONE 2026-05-12, headless-substitute checkpoint approved (per Phases 27-33). USER lights it up: create AWS Secrets Manager secret `turion-satellite/production/anthropic-key` (us-east-1, payload `{"ANTHROPIC_API_KEY":"sk-ant-..."}`) + `aws secretsmanager put-resource-policy` granting `zietra-api-lambda-role` `secretsmanager:GetSecretValue` + `aws lambda update-function-configuration --function-name turion-satellite-api` adding `ANTHROPIC_API_KEY_ARN=<secret-arn>` (keep existing DATABASE_URL_ARN/SUPABASE_JWT_SECRET_ARN/S3_FILES_BUCKET); until then the route returns {configured:false} and the widget shows "assistant not configured yet" w/ a disabled input. SUMMARY at .planning/phases/34-in-site-chat-assistant/34-03-SUMMARY.md.

---

### Phase 35: Editable CAD drawings + part management (add / edit / retire parts)

**Goal:** Let users fix what doesn't look right. (A) **Freehand SVG drawing editor** — an "Edit drawing" mode on `part.html` (and reachable from `instance.html`) that loads the part's `drawing_svg` into a lightweight in-browser SVG editor: select / move / resize / rotate / delete any shape, edit text labels, add new primitives (rect, line, circle, polyline, text), undo/redo, then Save → `PATCH` the part's `drawing_svg` back to the backend and bump a `drawing_rev`; the existing generated drawing + the Phase-30/31 3D viewer keep working (3D still re-derives from `dimensions_mm`, unaffected). A "Revert to generated" button regenerates the cabinet-projection SVG from the part's family+dimensions (the Phase-27 generator logic, server-side). (B) **Part management**: add a new BOM child to an assembly (extend the Phase-29 "+ Add BOM line" modal — pick an existing part OR create a brand-new `part_definition` inline: part_number, description, subsystem, dimensions_mm, default_make_buy, itar_flag); remove a BOM line; edit an existing part_definition's fields (rename / re-describe / change subsystem / dimensions / make-buy) — editing dimensions offers to regenerate the drawing + updates the 3D mesh; soft-delete / retire a part_definition that's wrong (a `retired_at` timestamp — hidden from the parts list, BOM tree, kanban, pickers; kept for audit; blocked if it still has live part_instances unless force). All gated behind auth. (C) **Backend**: new routes — `PATCH /api/parts/:partDefId` (fields), `PATCH /api/parts/:partDefId/drawing` (svg + rev bump), `POST /api/parts/:partDefId/drawing/regenerate` (server-side generator), `POST /api/parts` (create part_definition), `DELETE /api/parts/:partDefId` (soft-delete/retire, `?force=1` override), `DELETE /api/satellites/:satId/bom/:lineId` (remove BOM line) — all mounted in `app.ts`; a migration adds `part_definitions.drawing_rev int default 1` + `part_definitions.retired_at timestamptz` + a `part_revisions` audit table (or just an `audit_log` action); the Phase-27 SVG generator ported into a backend module so "regenerate" works server-side; Lambda redeploy via `build-and-push.sh`. (D) **Frontend**: the SVG editor module (`satellite/svg-editor.js` — vanilla, no bundler), the "Edit drawing" / "Revert to generated" controls on `part.html`/`instance.html`, the extended add-BOM-line modal + a "create new part" sub-form, an "Edit part" form, a "Retire part" control with confirmation, a delete control on BOM tree rows; everything via `addEventListener` (Phase-29 button audit stays 0 violations); frontend deploy via `deploy-frontend.sh` w/ F6 pre-flight. ~5-8 plans across several waves.
**Depends on:** Phase 33 (BOM/instance/part pages + the spawn flow), Phase 30/31 (the 3D viewer that re-derives from dimensions)
**Requirements:** DrawingEditor, DrawingRegenerate, PartCreate, PartEdit, PartRetire, BomLineDelete
**Plans:** 7/7 plans complete

Plans:
- [x] 35-01-PLAN.md — migration 022 (drawing_rev + retired_at + part_revisions, applied to prod) + port the Phase-27 SVG generator into backend/src/cad-templates/ + cad-generator byte-equality self-test [W1, foundation] — DONE 2026-05-12: `migrations/022_part_revisions_and_retire.sql` (idempotent, mirrors mig 021) — `part_definitions.drawing_rev int NOT NULL DEFAULT 1` + `.retired_at timestamptz` + `idx_part_definitions_retired_at` + `CREATE TABLE part_revisions(id uuid PK, part_def_id uuid FK ON DELETE CASCADE, rev int, drawing_svg text, edited_by uuid, edited_at timestamptz, UNIQUE(part_def_id,rev))` + widened `audit_log.action` CHECK (mig-021 list + create/edit/retire/restore_part_definition + edit_part_drawing + delete_bom_line); applied to prod (secret `turion-satellite/production/database-url` — **the plan's `…-NCbgX6` id is stale; real secret is `turion-satellite/production/database-url`, plain conn string not JSON** — `?…` suffix stripped), double-apply 0 ERRORs. Ported the 10 PURE Phase-27 templates (primitives/palettes/assembly/subassembly/cylindrical/lens-optical/antenna-dish/solar-cell/fastener/plate) from `scripts/cad-templates/` into `backend/src/cad-templates/` (only `.js` ESM specifiers stripped → bare, for `module:commonjs`); new `backend/src/cad-templates/index.ts` — `chooseTemplate(part)` verbatim from `scripts/generate-cad-svgs.ts` (incl. W5 SOLAR-before-plate) + `generateDrawingSvg(part):string`; `scripts/*` left intact; `npm run build` → `dist/cad-templates/` has index.js + 10 (ships in Lambda image); `tsc --noEmit` clean. `backend/tests/cad-generator.test.ts` (14 cases): byte-equality — `generateDrawingSvg` reproduces mig-017's `drawing_svg` for ADCS-ASSY + ADCS-MAGTORQ-A byte-for-byte (helper parses mig 017 at test time); dispatch (10 families incl. W5); determinism. `npx vitest run` → 368 pass / 1 skip (no regressions). 3 commits on turion-satellite `main` under jm@techcloudpro.com/jeet-avatar (`23388b4` mig 022 · `1757de7` template port · `469bda7` test), NOT pushed (35-07 owns push + Lambda redeploy; mig 022 already live on prod). 1 deviation (Rule 3 — stale secret id). SUMMARY at .planning/phases/35-editable-cad-drawings-part-management/35-01-SUMMARY.md.
- [x] 35-02-PLAN.md — backend: POST /api/parts (create + auto-generated drawing), PATCH /api/parts/:id (fields), PATCH /api/parts/:id/drawing (+rev bump + part_revisions row), POST /api/parts/:id/drawing/regenerate, POST /api/parts/:id/restore + tests [W2] — DONE 2026-05-12: 5 new requireAuth routes in `backend/src/routes/parts.ts` (no app.ts change — mounted router auto-allowlists them). `POST /api/parts` validates part_number/description/subsystem_id/default_make_buy(∈{make,buy})/dimensions_mm?/itar_flag?, looks up subsystem `code`, generates `drawing_svg` via `generateDrawingSvg`, INSERTs `drawing_rev=1` → 201/400/409-on-23505. `PATCH /api/parts/:id` updates any subset of {part_number,description,default_make_buy,itar_flag,subsystem_id,dimensions_mm} (dimensions_mm → `jsonb_set`), `WHERE id=$ AND retired_at IS NULL` → 200/400/404/409. `PATCH /api/parts/:id/drawing` (`{drawing_svg, expected_rev?}`) validates `<svg…</svg>`+<500KB, optional `expected_rev` 409, then update+`drawing_rev+1`+INSERT `part_revisions(part_def_id,rev,drawing_svg,edited_by)` → `{part_id,drawing_rev}`. `POST /api/parts/:id/drawing/regenerate` re-runs `generateDrawingSvg`, same update+bump+revision, returns `{part_id,drawing_rev,drawing_svg}`. `POST /api/parts/:id/restore` clears `retired_at`. All hardened catch; best-effort `audit_log` (create/edit/restore_part_definition + edit_part_drawing). `backend/tests/parts.write.test.ts` — 22 vitest+supertest cases; full suite **390 pass / 1 skip** (+22, no regressions); `tsc --noEmit` clean; button audit `violations:0`. 2 commits on turion-satellite `main` (`7cb7de1` routes [Tasks 1+2 combined] · `b4a88b5` tests), NOT pushed (35-07 owns push + redeploy). 3 deviations: Tasks 1+2 share a commit; `created_by` left unset on POST (FK→team_members vs JWT auth UUID mismatch — nullable; `part_revisions.edited_by`+`audit_log.actor_user_id` get `req.user.id`); `req.params.id` is `string|string[]` here → `String()` coercion. SUMMARY at .planning/phases/35-editable-cad-drawings-part-management/35-02-SUMMARY.md.
- [x] 35-03-PLAN.md — backend: DELETE /api/parts/:id (soft-retire, ?force=1), DELETE /api/satellites/:satId/bom/:lineId (refuse-on-sub-lines) + the retired_at sweep (hard-filter ONLY the parts list + children/picker; badge elsewhere) + tests [W3] — DONE 2026-05-12: `DELETE /api/parts/:id` in `backend/src/routes/parts.ts` (requireAuth, hardened catch) — if not `?force=1`, `SELECT 1 FROM part_instances WHERE part_definition_id=$1 LIMIT 1` → `409 {error:'Part has live instances; pass ?force=1 to retire anyway'}`; else `UPDATE part_definitions SET retired_at=now() WHERE id=$1 AND retired_at IS NULL RETURNING id,retired_at` → 404 if no row, audit `retire_part_definition`, `200 {ok:true,id,retired_at}`. `DELETE /api/satellites/:satId/bom/:lineId` in `bom.ts` — `SELECT id,child_part_instance_id FROM bom_lines WHERE id=$1 AND satellite_id=$2` (404), count sub-lines; if `n>0` and not `?recursive=1` → `409 {error:'This line has child lines; pass ?recursive=1 to delete the subtree', child_line_count:n}`; recursive → `WITH RECURSIVE subtree` (walk down `parent_part_instance_id=st.child_part_instance_id`) → `DELETE FROM bom_lines WHERE id=ANY($1::uuid[])`; leaf → `DELETE FROM bom_lines WHERE id=$1`; audit `delete_bom_line`; `200 {ok:true,deleted_lines}` (NOT 204). The `retired_at` sweep: `WHERE pd.retired_at IS NULL` on `GET /api/parts` (list) + `AND c_pd.retired_at IS NULL` on `GET /:partDefId/children` (picker) — and NOWHERE else; `GET /:id` keeps returning retired parts; `pd.retired_at`/`c_pd.retired_at` ADDED (no filter) to `/bom/tree` node selects (+`TreeNode` iface) and `pd.retired_at` to `GET /api/satellites/:satId/instances` (list + `/:instId`) — the "kanban" data; inline "do NOT filter" comments at every non-filtered site. Tests: new `backend/tests/bom.delete.test.ts` (6 cases) + `parts.test.ts` extended (DELETE /:id 401/409/200×2/404/500 + GET /:id surfaces retired_at). `npx vitest run` → **403 pass / 1 skip** (+13, no regressions); `tsc --noEmit` clean; button audit `routes:74, violations:0`. 3 commits on turion-satellite `main` under jm@techcloudpro.com/jeet-avatar (`ed7be61` parts.ts · `79e44d8` bom.ts+instances.ts · `c7716d7` tests), NOT pushed (35-07 owns push+redeploy). 3 deviations: `kanban.ts` named in the plan doesn't exist → `pd.retired_at` went into `instances.ts`; audit actions use mig-022's CHECK names; `query()` has no `rowCount` so `deleted_lines` is computed (1 leaf / ids.length recursive). SUMMARY at .planning/phases/35-editable-cad-drawings-part-management/35-03-SUMMARY.md.
- [x] 35-04-PLAN.md — frontend plumbing: satellite/svg-editor.js (hand-rolled vanilla SVG editor) + satellite-api.js del() + audit-satellite-buttons.mjs regex tweak [W3] — DONE 2026-05-12: new `satellite/svg-editor.js` (783 lines, plain `<script>` IIFE, no bundler, double-load guard) — `window.svgEditor.open(svg,{onSave,onCancel,onRevert?})` full-screen modal: toolbar (Select/+Rect/+Line/+Circle/+Ellipse/+Polyline/+Text/Delete/Undo/Redo/[Revert]/Save/Cancel, all `addEventListener`), DOMParser parse w/ parsererror→raw `<textarea>` fallback, live-SVG-DOM editing (select w/ 8 resize handles + 1 rotate handle in a removable `<g class="__editor-ui">`, move/resize/rotate via composed `transform`, dbl-click text edit, add-6-primitives via `createElementNS`, per-tag properties panel), undo/redo via `XMLSerializer` snapshots (cap 50), `serialize()` strips the UI layer; host-agnostic (imports nothing — callbacks: 35-05 wires onSave→`patch /api/parts/:id/drawing`, onRevert→`post /api/parts/:id/drawing/regenerate`). `satelliteApi.del(path)` added to `satellite-api.js` (DELETE → `res.json()`; backend DELETE routes return `200 {ok:true}`). `backend/scripts/audit-satellite-buttons.mjs` `iterApiCalls` regex widened to `(get|post|patch|put|delete|del)` + `DEL`→`DELETE` map (validates the new DELETE calls 35-06 adds; no-op vs current frontend). `node --check` clean both JS; `node audit-satellite-buttons.mjs` → `routes:74, violations:0, exit 0`; `grep -c onclick= svg-editor.js`→0. 3 commits NOT pushed (35-07 owns push + Lambda redeploy + frontend deploy): `d06360c`+`4053c0e` (turion-space-demo) + `ab2814b` (turion-satellite), `jeet-avatar <jm@techcloudpro.com>`, named-file adds only. 0 deviations. SUMMARY at .planning/phases/35-editable-cad-drawings-part-management/35-04-SUMMARY.md.
- [x] 35-05-PLAN.md — wire the drawing editor into part.html + instance.html (Edit drawing / Revert to generated / ?edit=drawing deep-link / retired banner) [W4] — DONE 2026-05-12: `part.html` — `<script src="/satellite/svg-editor.js">` loaded; refactored the inline drawing-injection block into a reusable `renderDrawingSvg(svgStr)` (re-injects into `#cadCenter` w/ the existing translate/scale wrapping-`<g>`) + `let currentDrawingSvg = drawing.drawing_svg || null` (editable source only — never the subsystem-silhouette fallback); two `.cad-toggle` chips `#editDrawingBtn` ("✎ edit drawing") + `#revertDrawingBtn` ("↻ revert to generated") positioned bottom-left of `.cad-frame` via new CSS (clear of the top-right labels chip + top-left view/rotate chips); `wireDrawingEditor()` IIFE (all `addEventListener`): Edit click → `ensure2DMode()` then `window.svgEditor.open(currentDrawingSvg, {onSave→satelliteApi.patch('/api/parts/'+id+'/drawing',{drawing_svg})→currentDrawingSvg=newSvg + renderDrawingSvg + toast('Drawing saved (rev N)'), onRevert→doRevert(): confirm→satelliteApi.post('/api/parts/'+id+'/drawing/regenerate',{})→update+renderDrawingSvg+toast→returns res.drawing_svg to the editor, onCancel→noop})`; standalone `#revertDrawingBtn`→`doRevert()`; `?edit=drawing`→`setTimeout(openEditor,0)`; `isRetired = !!part.retired_at`→`#retiredBanner` ("🚫 This part is retired (retired <fmtDate>).", `createElement`+`textContent`) inserted below `#crumb` + `#restorePartBtn`→confirm→`satelliteApi.post('/api/parts/'+id+'/restore',{})`→reload + editor chips shown-but-disabled. 3D viewer / 2D-3D toggle / `#viewToggle` / `#viewer3d` / `#autoRotateChk` / Phase-31 `.cad-hud`/`#hudBack` / Phase-27 callouts toggle all untouched (`mount3DViewer` re-derives from `dimensions_mm`, never parses `drawing_svg`). `instance.html` — `#editDrawingBtn` `.cad-toggle` chip ("✎ edit this part's drawing", bottom-left)→`addEventListener`→`location.href='part.html?id='+partDefId+'&edit=drawing'+(satId?'&sat='+satId:'')` (disabled if retired); `if (inst.retired_at)`→`#stageTagWrap` prepended a `🚫 retired part` `tag-danger` badge (GET /api/satellites/:satId/instances/:instId surfaces `pd.retired_at` per 35-03 — not filtered); existing make/buy panels + Phase-32 decision card + Phase-33 CTAs + 3D + siblings + subtree-rollup untouched. 4 pre-existing `onclick=` in part.html (none added); 0 in instance.html; inline `<script>` of both pages `node --check` clean; `node audit-satellite-buttons.mjs` → `routes:74, onclick:16, satelliteApi:70, violations:0` (the 3 new calls — PATCH `/api/parts/:id/drawing`, POST `.../drawing/regenerate`, POST `.../restore` — all resolve against the mounted `parts` router). 2 commits in `turion-space-demo` NOT pushed (35-07 owns push + Lambda redeploy + `deploy-frontend.sh` + CF invalidation): `d8ea47a` (part.html) + `d84eff9` (instance.html), `jeet-avatar <jm@techcloudpro.com>`, named-file adds only (pre-existing dirty WIP untouched). 0 deviations. SUMMARY at .planning/phases/35-editable-cad-drawings-part-management/35-05-SUMMARY.md.
- [x] 35-06-PLAN.md — part-management UI: extended Add-BOM modal + create-new-part sub-form on bom.html, Edit-part form + Retire/Restore on part.html, retire control on parts.html, delete control on bom.html tree rows [W5] — DONE 2026-05-12: `bom.html` (commit `b6c47e3`) — Add-BOM-line modal gains a `[Pick existing part] [➕ Create new part]` tab; the create tab does `POST /api/parts` → `POST /api/satellites/:satId/instances` → `POST /api/satellites/:satId/bom` (409 dup part_number highlights the field; partial-create failures tell the user the part exists + can be added manually); each recursive-tree row gets a 🗑 delete control (delegated `click` on `#treeContainer`, `preventDefault`+`stopPropagation` so it doesn't toggle the `<details>`) → `satelliteApi.del('/api/satellites/'+satId+'/bom/'+lineId)` w/ 409→offer `?recursive=1` (the line id resolved via a best-effort flat `GET /api/satellites/:satId/bom` fetch keyed `<parentInstanceId|ROOT>|<childInstanceId>` — the `/bom/tree` node doesn't carry it); retired part definitions get a `⚠ retired` badge. `part.html` (commit `dae1474`) — `#editPartBtn`("✎ Edit part")+`#retirePartBtn`("🗑 Retire part") in `#partActions`, a `wirePartManagement()` IIFE after 35-05's `wireDrawingEditor()` (doesn't touch the 35-05 retired-banner/restore); both hidden when `retired_at` is set; Edit → `createElement` modal prefilled from `part` → `satelliteApi.patch('/api/parts/'+partId, changedFieldsOnly)`, 409→"part number exists", `dimensions_mm` changed → confirm-regenerate → `POST .../drawing/regenerate` → `location.reload()`; Retire → confirm → `satelliteApi.del('/api/parts/'+partId)`, 409 (live instances) → confirm → `?force=1` → reload. `parts.html` (commit `a142a48`) — per-row `🗑` retire button (delegated `click` on `#partsBody`, `stopPropagation` so it doesn't trigger row nav) → `satelliteApi.del('/api/parts/'+pid)` w/ 409→`?force=1` → `load()` (the now-retired part is excluded by `GET /api/parts` per 35-03 so the row vanishes); no Edit/Restore here (the part page is canonical). `onclick=` counts unchanged (bom 3 / part 4 / parts 1); inline `<script>` of all 3 `node --check` clean; `node audit-satellite-buttons.mjs` → `routes:74, onclick:16, satelliteApi:83, violations:0`. 3 commits in turion-space-demo under `jeet-avatar <jm@techcloudpro.com>` (`git -c user.email=… -c user.name=…`; named-file adds only — pre-existing dirty WIP untouched), NOT pushed (35-07 owns push + Lambda redeploy + frontend deploy + CF invalidation). 3 deviations (Rule 3: `/bom/tree` node has no `bom_lines.id` → flat-fetch the line id, best-effort, no backend change; pragmatic: `ApiError` carries no body → generic recursive-subtree confirm not the count; pragmatic: parts.html has no "show retired" toggle — 35-03 hard-filters with no `?include_retired` opt-in, so retire-only here + restore on the part page). SUMMARY at .planning/phases/35-editable-cad-drawings-part-management/35-06-SUMMARY.md.
- [x] 35-07-PLAN.md — deploy: build-and-push.sh Lambda redeploy + deploy-frontend.sh (F6 pre-flight) + CF invalidation + curl smoke + button audit both repos + Phase 27-34 regression + headless-substitute checkpoint + STATE/ROADMAP update [W6] — DONE 2026-05-12: turion-satellite pushed `23388b4..ab2814b`, `./build-and-push.sh` redeployed Lambda `turion-satellite-api` (CodeSha256 `c9372b81…`→`2984d8e9…`); `/api/health` ok; migration 022 re-apply = clean idempotent no-op (0 ERRORs); the 7 new routes (`PATCH /api/parts/:id`, `PATCH /api/parts/:id/drawing`, `POST /api/parts/:id/drawing/regenerate`, `POST /api/parts`, `POST /api/parts/:id/restore`, `DELETE /api/parts/:id`, `DELETE /api/satellites/:satId/bom/:lineId`) all 401-gated unauth, bogus path 404. **Migration 022 needs NO new secret/env var (unlike Phase 34's Anthropic key) — there is NO user-action follow-up.** turion-space-demo pushed `82eb63f..a142a48`, `./deploy-frontend.sh` with the F6 pre-flight (stashed about-this-demo/agent-sales-cash/dashboard-cio.html + moved `.superpowers/`/`.DS_Store` aside — all restored, `git stash list` empty, tree == baseline), CloudFront `E37R9PT8IL44L2` invalidation `IDJW9PZ26WRZMYCE8TDGCY1M3M` → Completed; `satellite/svg-editor.js` + the part-management UI (edit-drawing/revert + Add-BOM create-new-part tab + Edit/Retire part + per-row delete/retire) live on `part.html`/`instance.html`/`bom.html`/`parts.html`. Verification headless-substitute (per Phases 27-34): a DB-direct round-trip against prod (create→bump-rev+`part_revisions`→retire→restore→delete, FK cascade verified, `part_definitions` count back to the 165 baseline, zero leftover `TEST-P35-DEL`/`TEST-DELETE-ME-35` rows) + the 7 routes 401-gated + `svg-editor.js` 200 & linked + button audit `routes:74 · onclick:16 · satelliteApi:83 · violations:0` exit 0 in BOTH repos + Phase 27-34 regression intact (165 parts keep their `drawing_svg`; Cygnus 241 `bom_lines` / 261 `part_instances`; `satellite-3d.js`/`satellite-chat.js`/`program-new.html`/`sat.html`(`programProgress`)/`kanban.html`(`Pick a satellite`) all 200/present). Headless-substitute checkpoint approved. SUMMARY at .planning/phases/35-editable-cad-drawings-part-management/35-07-SUMMARY.md.

---

### Phase 36: Zero hardcodes + end-to-end audit across the WHOLE Turion Space demo (satellite PLM + Arena + Salesforce + NetSuite + MES)

**Goal:** Make the entire `turionspace.zietra.com` demo — BOTH the satellite-manufacturing PLM app (`turion-space-demo/satellite/*` + the `turion-satellite` Lambda → schema `turion_satellite`) AND the legacy ERP demo (`turion-space-demo/*` for Salesforce / NetSuite / Arena / MES + the `turion-space-demo/backend/` Lambda → schema `turion`) — (A) **completely free of hardcoded, DB-derivable data in the frontend**: every dropdown option, status enum, stage list, satellite/vendor/account/invoice/doc list, module-config value, nav item, etc. must be fetched from an API; for every gap, add a small lookup endpoint to the appropriate backend (per the PERMANENT "Turion frontend — zero hardcoding" rule, now extended to the ERP-demo side). (B) **working end to end with backend persistence** in every module: satellite PLM (sales order → satellite spawn → BOM → kanban → lifecycle → work orders → build steps → cost rollup → delivery — re-verify the Phase-33 flow), Arena (PLM docs / change orders), Salesforce (CRM accounts / opportunities / sales), NetSuite (finance: invoices / GL / payouts), MES (manufacturing work orders) — no dead pages, no stubbed buttons, no broken links, every page reachable + every action persists; the Phase-29-style button audit must be 0 violations on BOTH the satellite frontend AND the ERP-demo frontend (extend/port the audit script to cover the ERP pages + their backend if it doesn't already). (C) **Resolve the in-tree WIP**: `turion-space-demo/` has uncommitted changes (`about-this-demo.html`, `agent-sales-cash.html`, `dashboard-cio.html`, `backend/src/routes/agents.ts`, `backend/src/routes/notify.ts`, `backend/dist/*`, `backend/lambda-build`) that have been getting stashed during every deploy — review them, finish/fix or revert them as part of this phase. (D) **Both backends redeployed** (turion-satellite via `./build-and-push.sh`; the ERP-demo Lambda via its own deploy — find it) + **frontend deployed** via `./deploy-frontend.sh` with the F6 pre-flight; full E2E walk + curl smoke as the headless-substitute gate. ~6-12 plans; start with a research pass that inventories every hardcode + every dead end across all 5 module areas.
**Depends on:** Phase 35
**Requirements:** NoFrontendHardcodes, LookupEndpoints, SatellitePlmE2E, ArenaE2E, SalesforceE2E, NetSuiteE2E, MesE2E, WipResolved, ButtonAuditCleanBothFrontends
**Plans:** 8/9 plans executed

Plans:
- [x] 36-01-PLAN.md — satellite backend: confirmed /api/lifecycle-stages shape + added GET /api/lookups/satellite-statuses (sat.html had a 2nd hardcode) + shared SATELLITE_STATUSES const + tests; vitest 407 pass, tsc clean, audit 0; committed 404a968 (not pushed) [W1] ✅
- [x] 36-02-PLAN.md — ERP backend: added GET /api/{arena,netsuite,salesforce,mes}/lookups (canonical enums + DB-hydrated name lists, hardened) + confirmed /api/data/all covers every turion.* table the frontend reads + generate-turion-config.sh → gitignored turion-config.js (window.TURION_CONFIG.API_BASE, wired into deploy-frontend.sh) + 22 files (was ~12) switched off the copy-pasted const API_BASE literal; tsc/build green; committed 99702da (not pushed); dist/app.js left for 36-09's deploy build (shared w/ 36-07 WIP) [W1] ✅
- [x] 36-03-PLAN.md — satellite frontend: PROGRAM_STAGES → lazy-fetch /api/lifecycle-stages + SAT_STATUSES → /api/lookups/satellite-statuses + Phase-33 PLM spot-check (11 pages 200, routes mounted) + audit 0; committed 4f21d5c (not pushed) [W2] ✅
- [x] 36-04-PLAN.md — ERP de-hardcode Salesforce + NetSuite: new erp-lookups.js (ERPLookups.fill) + 13 "+ New" forms' dropdowns fetch /api/{salesforce,netsuite}/lookups + data-loader.js/-sf.js fail loud (visible Retry banner, no silent fall-through; static snapshot still hydrates config-only globals) + turion-config.js on 18 SF/NS view/index pages + netsuite-items.html dropped enterprise-data.js; node --check + http.server smoke green; committed 0231170+4afaa15 (not pushed). DEVIATION: did NOT delete the 6 *-data.js files / fail-blank — they hold ~25 config globals (BUDGET/FORECAST/TAX_RATES/COA_CLASSES/EMP_TO_PERSON/…) with no turion.* table / not in /api/data/all; deleting blanks NetSuite COA/TB/BS/FP&A/Setup + ~10 dashboards. [W2] ✅
- [x] 36-05-PLAN.md — ERP de-hardcode Arena + MES + integration: removed static *-data.js includes from arena-bom/netsuite-mrp/integration-{arena-ns,mes-ns,vendor-ns,bank-siem,sf-ns}.html + deleted orphaned bom-data.js; pages render from /api/data/all (data-loader.js, gated on turion-data-ready) — integration renders wrapped in render<Module>() fns reading window.*_NS_INTEGRATIONS + CONNECTOR_STACK_BY_SCOPE['<m>-ns']; arena-qms/arena-bom/mes-shop-floor inline data literals demoted const→let + turion-data-ready swap to window.*; data-loader.js derives window.SAT_BOM_BY_PARENT; new arena-lookups.js (window.populateLookups) wired into all 6 arena-new-* forms → /api/arena/lookups; turion-config.js added on edited pages. NO new MES endpoint (STAGE_DATA from /api/data/all + existing GET/PATCH /api/mes/stages suffice; mes-shop-floor has no <select> controls). node --check + inline-script syntax check + http.server smoke green; committed 76d8f38 (19 files, not pushed). Out of scope: 4 integration-*-data.js still in dashboard-cio.html (36-07's); mes/qms/arena-doc/integration-data.js still in exec dashboards + ns-record.html (future plan). [W2] ✅
- [ ] 36-06-PLAN.md — ERP persistence: ns-editable.js → PATCH the backend + wire the primary state-change buttons per module (SF opp-stage/case-status, Arena ECO/NCR/CAPA submit·approve·close, NetSuite invoice/JE post + setup edit, MES stage advance); leave the ns-actions.js demo simulations alone [W3]
- [x] 36-07-PLAN.md — WIP resolution: scrubbed notify.ts's plaintext Resend key (re_JRdox6wH_…) → lazy getResendKey() reading process.env.RESEND_API_KEY at send time (no cold-start touch; missing key = logged no-op); fixed agents.ts module-top throw → lazy getAnthropic(); rebuilt dist/ from cleaned src/ (key in neither src/ nor dist/); git rm --cached -r backend/node_modules (was tracked despite .gitignore); lambda-build diff = benign ARG CACHEBUST=1; landed the 3-AI-agents feature (NCR→CAPA / EVMS Watchdog / Integration Sentinel — real DB writes + audit_log) + agent-sales-cash/dashboard-cio/about-this-demo.html; npm run build + tsc --noEmit green; committed 9edebd0 (not pushed). DEVIATION: dropped the optional RESEND_API_KEY_ARN→Secrets-Manager fallback (no @aws-sdk/client-secrets-manager dep; would re-bloat node_modules) — plain env var matches the repo's DATABASE_URL convention. ⚠️ USER-ACTION for 36-09: rotate the exposed Resend key + set RESEND_API_KEY as a turion-demo-api Lambda env var before deploying. [W3] ✅
- [ ] 36-08-PLAN.md — button audit: add scripts/audit-erp-buttons.mjs (allowlist derived from the ERP backend; scans the ERP frontend; treats demo simulations as valid), wire npm run audit-buttons to run both, drive both frontends to 0 violations [W4]
- [ ] 36-09-PLAN.md — deploy: set the RESEND_API_KEY secret + Lambda env var, push both repos, redeploy both Lambdas (turion-satellite-api if changed; turion-demo-api), deploy-frontend.sh with recomputed F6 pre-flight, CF invalidation, curl smoke + per-module DB-direct E2E walk + dual button audit + Phases 27-35 regression + headless-substitute checkpoint + STATE/ROADMAP update [W5]

---

### Phase 19: CDJ-3000 Waveform Replica
**Goal**: Replace the broken DJWaveformView.tsx with a pixel-perfect CDJ-3000 display replica -- mirrored 3Band waveform, subtle beat grid, 3 color modes, source toggle, post-analysis UI update
**Depends on**: None (MixMind standalone feature)
**Requirements**: SPEC-01, SPEC-02, SPEC-03, SPEC-04, SPEC-05
**Success Criteria** (what must be TRUE):
  1. Waveform renders mirrored bars from center with CDJ-3000 3Band color blend (blue bass, orange mid, white high)
  2. Beat grid uses 3 levels of subtle white lines (regular 0.06, downbeat 0.25, phrase 0.4 opacity)
  3. Three color modes (3Band/RGB/BLUE) are visually distinct and togglable
  4. RB/MM/Auto source toggle shows colored badges and updates waveform on switch
  5. After MixMind analysis, waveform refreshes without page reload with toast notification
**Plans**: 5 plans (all sequential -- Wave 1 through Wave 5)

Plans:
- [ ] 19-01-PLAN.md -- Waveform rendering: 3Band blend algorithm, mirrored bars from center, playhead at 35%
- [ ] 19-02-PLAN.md -- Beat grid: subtle CDJ-3000 white lines (regular/downbeat/phrase markers)
- [ ] 19-03-PLAN.md -- CDJ/RGB/BLUE style toggle: 3 visually distinct color modes
- [ ] 19-04-PLAN.md -- RB/MM/Auto source toggle: colored badges, status label, waveform update on switch
- [ ] 19-05-PLAN.md -- Analyze to UI update: post-analysis refresh, toast notification, no page reload

*Roadmap created: 2026-02-21*
*Last updated: 2026-05-12 -- Phase 36 PLANNED (9 plans, 4 waves): zero hardcodes + E2E audit across the whole Turion Space demo (satellite PLM + Arena/Salesforce/NetSuite/MES). Run /gsd:execute-phase 36. (prev) Phase 35 COMPLETE (7/7 plans): editable CAD drawings (in-browser SVG editor + server-side Phase-27-generator "revert") + part management (create/edit/retire parts, delete BOM lines) + migration 022 (drawing_rev + retired_at + part_revisions). Lambda redeployed, frontend redeployed, headless-substitute checkpoint approved. No user-action follow-up.*

*(historical) Last updated: 2026-04-19 -- Plan 21-04 complete: PDB writer + USB orchestrator (hand-rolled, zero rbox). exportLibrary.db deferred (SQLCipher-encrypted reference file, key unknown). Phase 21 progress 4/6.*

### Phase 20: CDJ-3000 Functional Controls
**Goal**: Make every button in the CDJ-3000 DJDeck component fully functional -- no stubbed buttons, no dead state, every control does exactly what it does on real CDJ-3000 hardware
**Depends on**: Phase 19 (CDJ-3000 Waveform Replica)
**Requirements**: CDJ-01, CDJ-02, CDJ-03, CDJ-04, CDJ-05, CDJ-06, CDJ-07, CDJ-08, CDJ-09, CDJ-10
**Success Criteria** (what must be TRUE):
  1. Hot cues load from Rekordbox ANLZ data when a track loads and display on waveform
  2. Loop enforcement runs in the audio engine (not React render), loops are audio-tight
  3. Pitch fader is draggable (click + drag), not just click-to-position
  4. CUE button correctly distinguishes tap (set cue) from hold (preview) with no race condition
  5. SYNC matches this deck's BPM to the other deck's effective BPM
  6. MASTER designates sync source (exclusive -- one deck at a time)
  7. QUANTIZE and SLIP toggle on/off with visual feedback
  8. Beat grid nudge buttons visually shift beat grid lines on the waveform
**Plans**: 5 plans (all sequential -- Wave 1 through Wave 5)

Plans:
- [ ] 20-01-PLAN.md -- Load Rekordbox hot cues on track load, merge with user-set cues, display on waveform
- [ ] 20-02-PLAN.md -- Move loop enforcement from React render to audio engine RAF tick
- [ ] 20-03-PLAN.md -- Draggable pitch fader + fix CUE button click/mousedown race condition
- [ ] 20-04-PLAN.md -- Wire SYNC/MASTER/QUANTIZE/SLIP buttons with real logic and cross-deck BPM sharing
- [ ] 20-05-PLAN.md -- Wire beat grid nudge to waveform display via gridOffsetMs prop
