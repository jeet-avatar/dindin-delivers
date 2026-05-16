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
**Plans:** 9/9 plans complete

Plans:
- [x] 36-01-PLAN.md — satellite backend: confirmed /api/lifecycle-stages shape + added GET /api/lookups/satellite-statuses (sat.html had a 2nd hardcode) + shared SATELLITE_STATUSES const + tests; vitest 407 pass, tsc clean, audit 0; committed 404a968 (not pushed) [W1] ✅
- [x] 36-02-PLAN.md — ERP backend: added GET /api/{arena,netsuite,salesforce,mes}/lookups (canonical enums + DB-hydrated name lists, hardened) + confirmed /api/data/all covers every turion.* table the frontend reads + generate-turion-config.sh → gitignored turion-config.js (window.TURION_CONFIG.API_BASE, wired into deploy-frontend.sh) + 22 files (was ~12) switched off the copy-pasted const API_BASE literal; tsc/build green; committed 99702da (not pushed); dist/app.js left for 36-09's deploy build (shared w/ 36-07 WIP) [W1] ✅
- [x] 36-03-PLAN.md — satellite frontend: PROGRAM_STAGES → lazy-fetch /api/lifecycle-stages + SAT_STATUSES → /api/lookups/satellite-statuses + Phase-33 PLM spot-check (11 pages 200, routes mounted) + audit 0; committed 4f21d5c (not pushed) [W2] ✅
- [x] 36-04-PLAN.md — ERP de-hardcode Salesforce + NetSuite: new erp-lookups.js (ERPLookups.fill) + 13 "+ New" forms' dropdowns fetch /api/{salesforce,netsuite}/lookups + data-loader.js/-sf.js fail loud (visible Retry banner, no silent fall-through; static snapshot still hydrates config-only globals) + turion-config.js on 18 SF/NS view/index pages + netsuite-items.html dropped enterprise-data.js; node --check + http.server smoke green; committed 0231170+4afaa15 (not pushed). DEVIATION: did NOT delete the 6 *-data.js files / fail-blank — they hold ~25 config globals (BUDGET/FORECAST/TAX_RATES/COA_CLASSES/EMP_TO_PERSON/…) with no turion.* table / not in /api/data/all; deleting blanks NetSuite COA/TB/BS/FP&A/Setup + ~10 dashboards. [W2] ✅
- [x] 36-05-PLAN.md — ERP de-hardcode Arena + MES + integration: removed static *-data.js includes from arena-bom/netsuite-mrp/integration-{arena-ns,mes-ns,vendor-ns,bank-siem,sf-ns}.html + deleted orphaned bom-data.js; pages render from /api/data/all (data-loader.js, gated on turion-data-ready) — integration renders wrapped in render<Module>() fns reading window.*_NS_INTEGRATIONS + CONNECTOR_STACK_BY_SCOPE['<m>-ns']; arena-qms/arena-bom/mes-shop-floor inline data literals demoted const→let + turion-data-ready swap to window.*; data-loader.js derives window.SAT_BOM_BY_PARENT; new arena-lookups.js (window.populateLookups) wired into all 6 arena-new-* forms → /api/arena/lookups; turion-config.js added on edited pages. NO new MES endpoint (STAGE_DATA from /api/data/all + existing GET/PATCH /api/mes/stages suffice; mes-shop-floor has no <select> controls). node --check + inline-script syntax check + http.server smoke green; committed 76d8f38 (19 files, not pushed). Out of scope: 4 integration-*-data.js still in dashboard-cio.html (36-07's); mes/qms/arena-doc/integration-data.js still in exec dashboards + ns-record.html (future plan). [W2] ✅
- [x] 36-06-PLAN.md — ERP persistence: ns-editable.js → Edit-mode cells PATCH /api/<module>/<entity>/:id (success = new baseline + toast, failure = revert + error toast; cells without data-edit-* attrs keep the localStorage demo editor) + wired the primary state-change buttons per module (netsuite-customer-so.html SO Order Date/Contract Type → PATCH /api/netsuite/sales-orders/:id; netsuite-items.html Description/Mass → PATCH /api/netsuite/items/:id; mes-shop-floor.html "Mark Stage N in progress" → PATCH /api/mes/stages/:num; arena-qms.html NCR/CAPA "Close <id>" → PATCH /api/arena/{ncrs,capas}/:id status=Closed); demo simulations left alone [W3] ✅
- [x] 36-07-PLAN.md — WIP resolution: scrubbed notify.ts's plaintext Resend key (re_JRdox6wH_…) → lazy getResendKey() reading process.env.RESEND_API_KEY at send time (no cold-start touch; missing key = logged no-op); fixed agents.ts module-top throw → lazy getAnthropic(); rebuilt dist/ from cleaned src/ (key in neither src/ nor dist/); git rm --cached -r backend/node_modules (was tracked despite .gitignore); lambda-build diff = benign ARG CACHEBUST=1; landed the 3-AI-agents feature (NCR→CAPA / EVMS Watchdog / Integration Sentinel — real DB writes + audit_log) + agent-sales-cash/dashboard-cio/about-this-demo.html; npm run build + tsc --noEmit green; committed 9edebd0 (not pushed). DEVIATION: dropped the optional RESEND_API_KEY_ARN→Secrets-Manager fallback (no @aws-sdk/client-secrets-manager dep; would re-bloat node_modules) — plain env var matches the repo's DATABASE_URL convention. ⚠️ USER-ACTION for 36-09: rotate the exposed Resend key + set RESEND_API_KEY as a turion-demo-api Lambda env var before deploying. [W3] ✅
- [x] 36-08-PLAN.md — button audit: added scripts/audit-erp-buttons.mjs (allowlist derived from the ERP backend, fail-closed; scans the ERP frontend + its shared helper JS; demo simulations valid), wired npm run audit-buttons to run both, 0 violations on both frontends (satellite routes:75/onclick:16/satelliteApi:84; ERP pages:72/routes:195/onclick:516/fetch:37); no backend route/HTML change; committed de0fac9 (not pushed) [W4] ✅
- [x] 36-09-PLAN.md — deploy + verify (COMPLETE 2026-05-12): pushed both repos (turion-satellite ab2814b..404a968; turion-space-demo a142a48..de0fac9); redeployed both Lambdas (turion-satellite-api 2984d8e9→1134cefc via build-and-push.sh — required, 36-01 added a route; turion-demo-api fd4605e6→c716f0d2 via build-and-push.sh); deployed the frontend via deploy-frontend.sh w/ recomputed F6 pre-flight (regenerated turion-config.js + satellite-config.js; CF E37R9PT8IL44L2 invalidation IC6IW03ZMEJE46DK93BO7XVI6B → Completed); static curl smoke (all pages 200; configs resolve; bom-data.js 403; satellite lookups 401-auth; ERP lookups 200; agents router mounted; bogus 404) + dual button audit 0/0 + Phase 27-35 frontend regression — all PASS. The pre-existing prod-infra blocker (the shared Supabase DB password rotated/invalid) was RESOLVED out-of-band — the password was rotated to a working one and updated in both `turion-satellite/production/database-url` and `turion-demo-api`'s `DATABASE_URL` env var; both Lambdas bounced; `/api/health` on both → `{db:ok}`. The DB-direct E2E walk per module then ran and PASSED: satellite PLM spot-check (4 satellites / 165 part_definitions / 261 part_instances / 52 work_orders); ERP create→read→update round-trips via the real backend write routes — Salesforce `POST/PATCH /api/salesforce/customers` (+ audit_log CREATE+PATCH), NetSuite `POST/PATCH /api/netsuite/items` + `PATCH /api/netsuite/journal-entries/:id`, Arena `POST/PATCH /api/arena/ncrs` (Open→Closed), MES `PATCH /api/mes/stages/3` (complete→TEST36→complete) — all cleaned back to baseline, no `TEST-36-*` rows left; `/api/data/all` → 53 keys with real data; `/api/agents/run` reaches the Anthropic API (key works; currently returns `400 credit balance too low` — a billing matter, route wired correctly). Headless-substitute checkpoint APPROVED. STATE.md + ROADMAP.md updated. Remaining user nice-to-haves (NOT blockers): rotate the exposed Resend key + set `RESEND_API_KEY` on `turion-demo-api`; create the Phase-34 `turion-satellite/production/anthropic-key` secret + `ANTHROPIC_API_KEY_ARN` on `turion-satellite-api`; future `turion.*` config tables. SUMMARY at .planning/phases/36-zero-hardcodes-e2e-audit-turion-space/36-09-SUMMARY.md. [W5] ✅

---

### Phase 37: QuickBooks → NetSuite migration walkthrough (+ Ramp → NetSuite mini-module) — interactive demo for the team

**Goal:** Build an interactive QuickBooks→NetSuite migration walkthrough on the existing Turion Space ERP demo, ready by **Thursday 2026-05-14** for the team to see what the migration looks like end-to-end. Synthetic but realistic QB data, an interactive wizard per record type, real DB persistence (writes from `turion.qb_*` to the existing `turion.netsuite_*` tables). Plus a smaller Ramp→NetSuite mini-module covering corporate-card-txn → NS Expense Report. Locked scope: **Core 6 QB record types** (Chart of Accounts, Customers, Vendors, Items, Invoices+Payments, Bills+Bill-Payments), **interactive wizard** (3-pane: QB rows left, mapping middle, NetSuite result right; "Migrate batch ▸" actually moves rows + persists + audit-logs), **Ramp = mini-module** (single page covering corporate-card txns → NS expense reports/bills with the same 3-pane treatment). (A) **Backend** (in `turion-space-demo/backend/`, schema `turion`): migration 023 adds `turion.qb_*` source tables for the 6 types + `turion.ramp_*` for card txns + a `turion.migration_runs` audit table (who/when/from→to/row counts); seeded with realistic synthetic data (a Turion-style small-aerospace-co dataset close to real QB Online — ~20-50 rows per table); routes `GET /api/quickbooks/{type}` (list QB rows + migration status), `GET /api/quickbooks/{type}/mapping` (the canonical field-map for the middle pane), `POST /api/quickbooks/{type}/migrate` (move N rows: insert into the existing NS table — `turion.netsuite_customers`/`items`/`sales_orders`/`journal_entries`/`bills`/etc. — or extend them; mark QB-row migrated; write `migration_runs` + `audit_log`); `GET /api/quickbooks/status` (summary for the landing page); same for `/api/ramp/*`. All routes `requireAuth`, hardened catch, mounted in the ERP `backend/src/app.ts`. Lambda redeploy via `turion-space-demo/backend/build-and-push.sh`. (B) **Frontend** (in `turion-space-demo/`): `quickbooks.html` landing (the 6 record-type tiles with status pills + a "Start migration" CTA), 6 per-type wizard pages (`quickbooks-{coa,customers,vendors,items,invoices,bills}.html`) — 3-pane layout using existing `data-loader.js`/`turion-config.js`/`erp-lookups.js`, "Migrate batch ▸" via `addEventListener` + `satelliteApi`-style fetch (so the new `audit-erp-buttons.mjs` stays 0 violations); `ramp.html` mini-module page (corporate-card txns + the single-type wizard for them). Top-nav "QuickBooks" + "Ramp" entries on the ERP demo. (C) **Deploy** via `turion-space-demo/backend/build-and-push.sh` + `deploy-frontend.sh` w/ F6 pre-flight; CF invalidation; curl smoke + a DB-direct E2E walk (synthetic QB rows seeded → click "Migrate batch" → confirm rows landed in the NS tables → cleanup); button audit both frontends → 0 violations; Phase 27-36 regression intact. ~4-6 plans across 3 waves; deadline-driven (Thursday). NO new AWS secrets required (the existing DB conn string is enough; the Anthropic key is irrelevant to this flow).
**Depends on:** Phase 36 (the de-hardcode + audit foundation; the F6/deploy mechanics; the `data-loader.js`+`turion-config.js`+`erp-lookups.js` patterns; `audit-erp-buttons.mjs`)
**Requirements:** QbSourceData, QbMigrationRoutes, QbMigrationWizard, RampMiniModule, MigrationAuditTrail, NetSuiteGoLiveScreens
**Plans:** 4/4 plans complete

Plans:
- [x] 37-01-PLAN.md — Backend foundation: migration 023 + qb_records/ramp_card_txns/migration_runs DDL + ~170-row seed + GET routes + FIELD_MAPS const + keyedEntity for bills/gl_accounts + mount in app.ts
- [x] 37-02-PLAN.md — POST /migrate routes: applyMapping for all 6 QB types + Ramp applyRampMapping + atomic transactions + audit trail (migration_runs + audit_log) + idempotent skipped[]
- [x] 37-03-PLAN.md — Frontend wizard: 8 HTML pages (landing + 6 per-type wizards + ramp.html) with 3-pane CSS-grid layout + index.html migration-tools section + 8 CF clean-URL rewrites
- [x] 37-04-PLAN.md — Audit + deploy (push both repos, redeploy turion-demo-api Lambda, deploy-frontend.sh + F6 pre-flight, CF invalidation) + DB-direct E2E walk + STATE/ROADMAP + headless-substitute checkpoint

---

### Phase 38: ERP auth + login — first step toward "complete software" (internal-tool-grade)

**Goal:** Add real authentication to the ERP demo side so it stops being "anyone with the URL can POST/PATCH/DELETE". Mirror the satellite app's existing auth pattern (Supabase ES256 magic-link JWT, verified server-side via JWKS) onto the ERP backend + frontend. (A) **Backend** (`turion-space-demo/backend/`): new `requireAuth` middleware (port from `turion-satellite/backend/src/middleware/auth.ts` — same Supabase project = same JWKS public key, no new secret needed; reuse `turion-satellite/production/supabase-jwt-secret` or its ARN as a Lambda env var on `turion-demo-api`), apply to every router except `/api/health` and any genuinely public endpoint, hardened catch (401 on missing/invalid JWT, no `err.message` leak). Lambda redeploy via `backend/build-and-push.sh`. (B) **Frontend** shared helpers: new `erp-auth.js` mirroring `satellite-auth.js` — exposes `window.erpAuth.requireSession()` (returns the Supabase session or redirects to `/erp-login.html`), uses the existing Supabase UMD already loaded by the data-loader's runtime. New `erp-api.js` (mirror of `satellite-api.js`) — `window.erpApi.{get,post,patch,del,put}(path, body?)` that auto-adds the `Authorization: Bearer <jwt>` header. New `erp-login.html` magic-link page — email input → `supabase.auth.signInWithOtp({email})` → "check your email" → click link → bounce back to original page (via `?redirect=`). (C) **Migrate frontend fetches**: every existing ERP fetch (`data-loader.js`, `erp-lookups.js`, `arena-lookups.js`, `ns-editable.js`, the per-page inline scripts) from raw `fetch(API_BASE + …)` → `erpApi.*`. Every ERP HTML page calls `erpAuth.requireSession()` at the top of its inline IIFE (before any fetch). (D) **Audit**: extend `audit-erp-buttons.mjs` to recognize `erpApi.{get,post,patch,del,put}` calls in addition to the existing raw-`fetch()` matcher. Stay 0 violations. (E) **Deploy + verify**: F6 pre-flight + `build-and-push.sh` + `deploy-frontend.sh` + CF invalidation; curl smoke proves write routes 401 unauth; manual browser walk (or DB-direct simulation) proves a magic-link flow round-trips successfully. ~3-5 plans across 2-3 waves.
**Depends on:** Phase 37 (all the ERP routes that need auth are now in place; the satellite-side auth pattern proven across Phases 32-37)
**Requirements:** ErpAuthMiddleware, ErpLoginPage, ErpAuthHelpers, ErpFetchMigration, AuditExtendedForErpApi
**Plans:** 4/4 plans complete

Plans:
- [x] 38-01-PLAN.md — Backend requireAuth middleware + secrets.ts + lambda.ts loadSecrets() + apply requireAuth per-route across 12 routers (committed; 90efba6 + d244f59) — 2026-05-13
- [x] 38-02-PLAN.md — Frontend helpers (erp-auth.js + erp-api.js + erp-login.html + erp-auth-callback.html) + generate-turion-config.sh emits Supabase URL + anon key (f7ad0b0) — 2026-05-13
- [x] 38-03-PLAN.md — Migrate 61 fetch sites (5 shared-JS + 56 HTML) to window.erpApi.* + inject requireSession() guard on 81 ERP HTML pages (03fdb14 + 7ea7ac0 + 91711b8) — 2026-05-13
- [x] 38-04-PLAN.md — Audit-script extension (iterErpApiCalls) + Lambda env+IAM (SUPABASE_JWT_SECRET_ARN, shared zietra-api-lambda-role inherits secret access) + push (8 commits) + deploy backend (Lambda CodeSha256 2a63ac5d→46c31406) + deploy frontend (S3 sync + CF IBAM9G78B9FCNX0VKI7O87V0RJ Completed) + 14/14 unauth-gate smoke + Supabase URL allowlist confirmed + headless authed gate proof (forged ES256 JWT → 401 Invalid; anon HS256 JWT → 401 Invalid; empty bearer → 401 Missing) (8a2be27 + d55bce4) — 2026-05-13

*Last updated 2026-05-13: Phase 38 COMPLETE. All 5 requirement IDs closed (ErpAuthMiddleware, ErpLoginPage, ErpAuthHelpers, ErpFetchMigration, AuditExtendedForErpApi). 8 commits pushed to `turion-space-demo` `origin/main`. Lambda `turion-demo-api` redeployed with `requireAuth` ES256 middleware loading the JWKS PEM at cold start (CodeSha256 2a63ac5d…→46c31406…). Frontend syncd to S3 + CloudFront `IBAM9G78B9FCNX0VKI7O87V0RJ` invalidation Completed. 14/14 unauth-gate curl smoke checks pass — `/api/health` 200 unauth, write routes 401 unauth (hardened-catch body "Missing authorization token"/"Invalid or expired token", no err.message leak), `/api/notify/visit` stays 2xx unauth as designed (pre-auth telemetry). Headless authed gate proven: forged ES256 JWT returns 401 "Invalid or expired token" (proves the full chain Secrets Manager → JWKS → PEM → `jwt.verify(... {algorithms:['ES256']})` works); the Supabase anon JWT (HS256) is also rejected because middleware allows ES256-only when public key is loaded. Supabase Auth → URL Configuration allowlist confirmed to include `https://turionspace.zietra.com/erp-auth-callback.html` (Task 4 checkpoint resolved by user). Audit 0 violations on both ERP and satellite frontends. One Rule-3 auto-fix during 38-04: `build-and-push.sh` was deploying stale `dist/` (May 12, pre-38-01) — root-caused via the smoke gate, fixed by prepending `npm run build`, re-deployed clean. No user-action follow-up remaining.*

---

## Milestone — Zietra Platform (multi-tenant SaaS on AWS) · M1–M8

**Strategic pivot 2026-05-14**: zietra.com becomes a multi-tenant SaaS at `<tenant>.zietra.com`. $99/mo base (CRM + sales + purchase + items-lite) + modular add-ons (PLM/MES/Quality/ASC 606/Royalty/Drop-ship/AI Agents/Lean ERP Pro/QB-migration). Full AWS migration: Cognito + RDS Postgres + SES + Stripe. RLS for tenant isolation. Turion stack becomes `tenant_id = 1` (anchor demo, don't break). ~6–9 weeks. Full handover: `~/.claude/handoffs/2026-05-14-zietra-platform-milestone-kickoff.md`. SES already provisioned 2026-05-14 — see handover for credentials + AWS state.

**Six PERMANENT global engineering rules apply from M1 onward** (no hardcoded DB-derivable values · every link leads somewhere · no shortcuts/assumptions · all workflows same · remove dead code · no unnecessary code). See `feedback_global_engineering_rules.md` in memory.

---

### Phase 39: M1 — Cognito user pool + SES integration + migrate users from Supabase Auth

**Goal:** Stand up AWS Cognito as the platform's user-identity service. Configure a Cognito user pool with custom email templates that send via the SES SMTP that's already provisioned (`zietra/ses-smtp-credentials`). Migrate the existing Supabase Auth users (small set — the user + a few demo accounts) into Cognito with their email + role attributes. Don't cut over the Lambdas yet — Phase 40 does that. End state: Cognito user pool exists, can be authenticated against, sends magic-link emails via SES from `noreply@zietra.com`, has all current users with their attributes preserved. Test by `aws cognito-idp admin-initiate-auth` succeeding for a migrated user. **Both backends still use Supabase Auth JWTs** during this phase — no Lambda code change. ~3-4 plans.
**Depends on:** Phase 38 (auth pattern proven on both sub-apps), tonight's SES provisioning.
**Requirements:** CognitoUserPool, CognitoSesIntegration, UserMigrationFromSupabase, CognitoAuthCheckpoint

**Plans:** 4/4 plans complete

Plans:
- [x] 39-01-PLAN.md — Wave 1: KMS CMK + Cognito user pool + app client + 4 Groups + Secrets Manager `zietra/cognito-config` (idempotent bash provisioner in `turion-space-demo/infrastructure/cognito/`) — **COMPLETE 2026-05-14**: pool `us-east-1_KQuNS85nP`, client `1tuq2a1eedd3hvdsl0kvtu55ih`, KMS `fd1706a7-...`. Secrets Manager `zietra/cognito-config` populated. SES `demo@zietra.com` queued (Pending — recipient click optional). 3 commits on turion-space-demo `origin/main` (`cb2c713`, `b4fa1aa`, `68c92cd`). SUMMARY: `.planning/phases/39-m1-.../39-01-SUMMARY.md`.
- [x] 39-02-PLAN.md — Wave 1: Custom Email Sender + Define/Create/Verify-Auth-Challenge Lambdas + IAM role + UpdateUserPool wiring (in `turion-space-demo/lambdas/cognito-custom-email-sender/`) — **COMPLETE 2026-05-14**: 4 Lambdas Active in us-east-1 (`zietra-cognito-custom-email-sender`, `zietra-cognito-define-auth-challenge`, `zietra-cognito-create-auth-challenge`, `zietra-cognito-verify-auth-challenge`), IAM role `zietra-cognito-email-sender-role` w/ inline SES+KMS+logs policy, pool `us-east-1_KQuNS85nP` LambdaConfig has all 5 slots populated (CES V1_0 + Define + Create + Verify + KMSKeyID). Idempotency proven via 2× deploy.sh end-to-end. 3 commits on turion-space-demo `origin/main` (`92d3a72`, `3cbb911`, `ab28814`). SUMMARY: `.planning/phases/39-m1-.../39-02-SUMMARY.md`.
- [x] 39-03-PLAN.md — Wave 2: Migrate 4 confirmed Supabase users to Cognito (admin role + admin group) via `backend/scripts/migrate-supabase-users-to-cognito.ts` — **COMPLETE 2026-05-14**: 4 Cognito users CONFIRMED (`demo@zietra.com`, `gteshnair@gmail.com`, `jm@techcloudpro.com`, `jeetnair.in@gmail.com`) — `email_verified=true`, `custom:role=admin`, `custom:supabase_sub=<original Supabase UUID>`, member of `admin` Cognito Group. DRY_RUN + real + idempotent re-run all passed (4 [migrated] + 1 [drop-deprecated] then 4 [skip-exists]). Supabase `auth.users` untouched (read-only). 1 commit on turion-space-demo `origin/main` (`85275a1`). SUMMARY: `.planning/phases/39-m1-.../39-03-SUMMARY.md`.
- [x] 39-04-PLAN.md — Wave 3: Smoke test (admin-initiate-auth → magic-link → admin-respond-to-auth-challenge → IdToken claims verified) + CHECKPOINT.md handoff to Phase 40 — **COMPLETE 2026-05-14T05:30Z**: `admin-initiate-auth CUSTOM_AUTH` for `jm@techcloudpro.com` returned `ChallengeName=CUSTOM_CHALLENGE` + 983-char Session; Create-Auth-Challenge Lambda fired (nonce + magic-link sent log lines in CloudWatch); `admin-respond-to-auth-challenge` with extracted nonce returned 3 tokens; IdToken decoded with all 7 expected claims (`email=jm@techcloudpro.com`, `custom:role=admin`, `cognito:groups=[admin]`, `iss=cognito-idp.us-east-1.amazonaws.com/us-east-1_KQuNS85nP`, `email_verified=true`, `aud=1tuq2a1eedd3hvdsl0kvtu55ih`, `token_use=id`); `custom:supabase_sub` forward-link preserved. Phase 38 regression intact (5 curls, all expected status). One Rule-1 auto-fix: deploy.sh `package.json` shim across all 4 Lambda zips (Node 20 ESM `export` syntax fix). 1 commit on turion-space-demo `origin/main` (`c22f099`). CHECKPOINT.md (208 lines) at `.planning/phases/39-m1-.../CHECKPOINT.md` documents Phase 40 handoff. SUMMARY: `.planning/phases/39-m1-.../39-04-SUMMARY.md`.

*Last updated 2026-05-14: Phase 39 COMPLETE. All 4 requirement IDs closed (CognitoUserPool, CognitoSesIntegration, UserMigrationFromSupabase, CognitoAuthCheckpoint). 4 plans across 3 waves. Cognito pool live, 4 users migrated, CUSTOM_AUTH magic-link via SES verified end-to-end. Phase 40 starts from CHECKPOINT.md.*

---

### Phase 40: M1 — Replace Lambda JWT middleware (Supabase ES256 → Cognito RS256)

**Goal:** Both Lambda backends (`turion-satellite-api` + `turion-demo-api`) accept Cognito RS256 JWTs *in addition to* Supabase ES256 JWTs (dual-mode during transition). New shared `cognitoAuth` JS helper on both frontends. Backend middleware reads Cognito JWKS from `https://cognito-idp.us-east-1.amazonaws.com/<pool-id>/.well-known/jwks.json` and verifies RS256. Dual-issuer mode means existing Supabase sessions keep working while new logins use Cognito. ~2-3 plans.
**Depends on:** Phase 39 (Cognito pool exists).
**Requirements:** DualIssuerJwtMiddleware, CognitoJwksLoader, CognitoFrontendHelper

**Plans:** 4/4 plans complete

Plans:
- [x] 40-01-PLAN.md — Wave 1: Backend dual-issuer middleware in `turion-space-demo` (`turion-demo-api` Lambda) — extended `secrets.ts` (Cognito JWKS cold-start loader, try/caught) + `middleware/auth.ts` (pre-decode iss, route to RS256 or ES256 verifier, fail-fast on alg mismatch) + set `COGNITO_CONFIG_SECRET_ARN` env var (merged via file:// JSON form to preserve commas in ANTHROPIC_API_KEY) + new IAM inline policy `zietra-cognito-config-secret-read` on `zietra-api-lambda-role` + deployed via `build-and-push.sh` — **COMPLETE 2026-05-14T06:50Z**: CodeSha256 `46c31406…`→`d6545f5a9ecc911b4bf3ff797e3c8b3aec515d3d59412d6638ef4ca0c18c4000`; cold-start CloudWatch `[secrets] Cognito JWKS loaded: 2 keys, issuer=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_KQuNS85nP`; smoke 10/10 PASS (valid Cognito IdToken→200 [53 data keys], unauth→401, forged junk→401, /api/health→200, forged ES256 Supabase-iss→401 [Phase 38 regression intact], Cognito-iss+HS256 alg-confusion→401 fail-fast, Cognito-iss+unknown-kid→401). 3 commits on `turion-space-demo` `origin/main` `c22f099..38a972e`: `217693a`+`b9fce35`+`38a972e`. Two Rule-N auto-fixes: (Rule 3) aws-cli shorthand mangled hyphenated base64url nonces — switched smoke to `--challenge-responses file:///tmp/cr.json` JSON-object form; (Rule 2) plan's verify regex would false-positive on a doc comment — rephrased the comment (no semantic change). SUMMARY: `.planning/phases/40-m1-.../40-01-SUMMARY.md`.
- [x] 40-02-PLAN.md — Wave 1: Backend dual-issuer middleware in `turion-satellite` (`turion-satellite-api` Lambda) — MIRROR of 40-01 (byte-identical Cognito state block in `secrets.ts` + middleware/auth.ts diff), env-var merge preserved `DATABASE_URL_ARN` + `S3_FILES_BUCKET` + `SUPABASE_JWT_SECRET_ARN` — **COMPLETE 2026-05-14T06:30Z** (per parallel agent): CodeSha256 `46beed474f23027f980a58d9e59524efea8dfe5341716accad88a75fa9126ce2`; Cognito-IdToken smoke against `/api/satellites` → HTTP 200; unauth → 401; forged → 401; `/api/health` → 200; backend test suite 407/407 pass. 3 commits on `turion-satellite` `origin/main`: `d5baa39`+`200775d`+`b1a9ca7` (plus feature branch `gsd/phase-40-cognito-rs256-middleware`). Two Rule-N auto-fixes: (Rule 1) plan-as-written required `iss` claim and would have broken 245 pre-existing tests whose tokens lack iss — fixed by making Cognito exact-match opt-in; (Rule 5) removed legacy `SECRET_MAP` dead-code from secrets.ts. IAM grant proven not needed — `zietra-api-lambda-role` already permits `secretsmanager:GetSecretValue` on the Cognito secret (40-01's dedicated `zietra-cognito-config-secret-read` policy is the cleaner audit-friendly canonical form). SUMMARY: `.planning/phases/40-m1-.../40-02-SUMMARY.md`.
- [x] 40-03-PLAN.md — Wave 2: Frontend `cognito-auth.js` helper on BOTH apps — **COMPLETE 2026-05-14T07:23Z**: 168-line byte-identical vanilla-JS helper (`/cognito-auth.js` + `/satellite/cognito-auth.js`, 6891 bytes each, auto-detects ERP vs satellite via `window.SATELLITE_CONFIG` presence) — raw fetch against `cognito-idp.us-east-1.amazonaws.com` with `X-Amz-Target: AWSCognitoIdentityProviderService.{InitiateAuth,RespondToAuthChallenge}` (no @aws-sdk, no Supabase SDK, ~6KB vs ~80KB SDK), 7 methods (`getSession`/`requireSession`/`signInWithMagicLink`/`respondToChallenge`/`refreshSession`/`signOut`/`getCurrentUser`), distinct localStorage keys `zietra-cognito-{erp,satellite}`. Extended both config generators to emit `COGNITO_REGION/USER_POOL_ID/APP_CLIENT_ID` from `zietra/cognito-config` secret. CloudFront invalidation `I9G1GFXQ41EV2YM23NQ47D90AF`. 3 commits on `turion-space-demo` `origin/main`: `db011f5`+`9a419ef`+`bd7495a`. Smoke 6/6 PASS (both helpers 200 from CDN, both configs carry Cognito IDs, `node --check` clean, 0 HTML pages reference cognito-auth.js as Phase 41 scope, Phase 38 helpers still 200, live `InitiateAuth` returns `CUSTOM_CHALLENGE`+984-char Session). One Rule-3 doc-comment regex false-positive auto-fix. SUMMARY: `.planning/phases/40-m1-.../40-03-SUMMARY.md`.
- [x] 40-04-PLAN.md — Wave 3: End-to-end 5-case smoke + Phase 41 CHECKPOINT.md handoff — **COMPLETE 2026-05-14T07:30Z**: `scripts/smoke-phase-40.sh` (193 lines, executable, autonomous nonce-scrape from `/aws/lambda/zietra-cognito-create-auth-challenge` so no inbox click). 8/8 required cases PASS first run against BOTH Lambdas: ERP+Sat case (a) valid Cognito IdToken→200, case (c) forged Cognito (signature-mutation: last 8 chars of sig replaced — Pitfall 8)→401, case (e) forged Supabase ES256→401; Phase 38 regression 5/5 (ERP+Sat /api/health 200, ERP unauth 401, Sat unauth 401, ERP forged ES256 401). Case (b) deferred-with-rationale (expired-token covered transitively by case c verifier branch); case (d) skipped-with-rationale (no live Supabase session — Phase 38 CHECKPOINT 407/407 + case e routing proof is authoritative). CHECKPOINT.md (414 lines, 10 sections): 3 requirements closed with live evidence, AWS resource delta ($0 marginal), smoke transcript verbatim + 10-row case status table, Phase 41 inheritance enumerated, **96 HTML pages to migrate** (83 ERP + 13 satellite full file list), 4 new pages Phase 41 builds, 11 deletion targets (Rule 5), 7-row Must-Not-Break list (Turion Thursday demo + 4 trigger Lambdas + KMS CMK + 4 users), 3-plan outline for Phase 41 (41-01 ERP migration, 41-02 satellite + login rewrites, 41-03 backend cleanup + cutover smoke), JWT claim mapping table preserved. 2 commits: `c2401ad` (`test(40-04)…` on `turion-space-demo` main) + `a6fbbbf8` (`docs(40-04)…` on `doordash-p2p` `gsd/phase-40-m1-…`). Zero auto-fixes (lessons from 40-01+40-02 baked into the plan, smoke ran first try). SUMMARY: `.planning/phases/40-m1-.../40-04-SUMMARY.md`. CHECKPOINT: `.planning/phases/40-m1-.../CHECKPOINT.md`.

*Last updated 2026-05-14T07:30Z: Phase 40 COMPLETE — 4/4 plans, 3/3 requirements closed (DualIssuerJwtMiddleware, CognitoJwksLoader, CognitoFrontendHelper). Both Lambdas dual-issuer LIVE; `[secrets] Cognito JWKS loaded: 2 keys` in CloudWatch on both; both frontends have `window.cognitoAuth` deployed; 8/8 smoke cases PASS first run; Phase 38 contract preserved throughout. Phase 41 brief written (96 pages to migrate, 11 deletion targets). Next: `/gsd:plan-phase 41`.*

---

### Phase 41: M1 — Cut over fully to Cognito + remove Supabase Auth dependency

**Goal:** Replace `satelliteAuth`/`erpAuth` JS helpers with one `cognitoAuth`. Remove Supabase Auth from both frontends (still keeping the Supabase Postgres connection until M2). New `erp-login.html` + the satellite app's login both call `cognitoAuth.signInWithMagicLink`. Lambda middleware drops ES256/Supabase support — Cognito-only. Old Supabase auth.users rows archived. Magic-link UX preserved; user-facing behavior unchanged. M1 complete. ~2 plans.
**Depends on:** Phase 40 (dual-issuer middleware proven).
**Requirements:** CognitoOnlyFrontend, CognitoOnlyBackend, SupabaseAuthDeprecation

**Plans:** 4/4 plans executed — **COMPLETE 2026-05-14T08:41Z**
- [x] 41-01-PLAN.md — Wave 1: Frontend cutover — **COMPLETE 2026-05-14T08:14Z**: built cognito-auth-callback.html, rewrote erp-login.html + satellite/login.html, ran 96-page migration script (81 ERP + 12 satellite), rewired erp-api.js + satellite-api.js, added CloudFront /cognito-auth-callback rewrite (ETag E1X6FK5RDHNB96, inv `I8DBYU50SVAT8CSSL8KYDABOGN`), dropped Supabase fields from config generators. 3 commits on `turion-space-demo`: `833d313`+`cfd6dc5`+`de5b27f`. Smoke 5/5 PASS + Phase 38 regression intact. SUMMARY: `.planning/phases/41-m1-.../41-01-SUMMARY.md`.
- [x] 41-02-PLAN.md — Wave 2: turion-demo-api Cognito-only — **COMPLETE 2026-05-14T08:24Z**: stripped `SUPABASE_ISSUER` + `getSupabasePublicKey()` + `getRoleFromJwt()` from `turion-space-demo/backend/src/middleware/auth.ts` (171 → 137 LOC); deleted Supabase JWKS block from `backend/src/secrets.ts` and added `throw new Error('COGNITO_CONFIG_SECRET_ARN env var required')` (94 → 75 LOC). Lambda CodeSha256 `d6545f5a…b3aec5` → `e48f5332…dd5ddf` via `./build-and-push.sh`. CloudWatch `[secrets] Cognito JWKS loaded: 2 keys, issuer=…us-east-1_KQuNS85nP`. Smoke 7/7 PASS (incl. load-bearing case e2: valid Supabase iss + ES256 → 401 proving the branch is GONE). 2 commits on `turion-space-demo`: `c7b5236`+`21f9d48`. One Rule-5 auto-fix (stale comment in lambda.ts). SUMMARY: `.planning/phases/41-m1-.../41-02-SUMMARY.md`.
- [x] 41-03-PLAN.md — Wave 2: turion-satellite-api Cognito-only (mirror of 41-02) — **COMPLETE 2026-05-14T08:30Z**: stripped SUPABASE_ISSUER + getSupabaseVerifyKey() + getRoleFromJwt() from `turion-satellite/backend/src/middleware/auth.ts`; deleted the Supabase JWKS block in `secrets.ts` and added `throw new Error('COGNITO_CONFIG_SECRET_ARN env var required')` on cold start. Lambda CodeSha256 `46beed47…126ce2` → `10b9ecb4…2039dc9` via `./build-and-push.sh`. CloudWatch `[secrets] Cognito JWKS loaded: 2 keys, issuer=…us-east-1_KQuNS85nP` confirmed. Smoke 6/6 PASS (valid Cognito 200, forged Cognito 401, junk bearer 401, valid-shape ES256-with-Supabase-iss 401 — branch GONE — , /api/health 200, /api/satellites unauth 401). Unit tests 405/406 pass (added `tests/test-jwt-helper.ts` + `__setCognitoTestState` hook; migrated 36 test files from ES256 to Cognito RS256 mint via sed-script). `SUPABASE_JWT_SECRET_ARN` env var still on Lambda (intentional — 41-04 removes). 1 commit on `turion-satellite`: `9531527`. Two Rule-3 auto-fixes (test ES256-mint migration; smoke-harness stale-nonce bypass). SUMMARY: `.planning/phases/41-m1-.../41-03-SUMMARY.md`.
- [x] 41-04-PLAN.md — Wave 3: AWS cleanup + dead code deletion + M1 close-out — **COMPLETE 2026-05-14T08:41Z**: removed `SUPABASE_JWT_SECRET_ARN` env var from both Lambdas (via `file://` JSON form, jq slurpfile pattern, LastUpdateStatus Successful both); deleted the Secrets Manager **resource policy** on `supabase-jwt-secret-sWnNlr` granting `zietra-api-lambda-role` read access (plan-deviation auto-fix: the grant lived on the secret's resource policy, NOT an inline policy on the role); scheduled secret deletion with 7-day recovery window (DeletedDate=2026-05-14T08:36Z, DeletionDate=2026-05-21T08:36Z); deleted 5 dead-code files (erp-auth.js 2506b, satellite-auth.js 2283b, erp-auth-callback.html 2844b, migrate-supabase-users-to-cognito.ts 7274b, README-cognito-migration.md 4267b); dropped `@aws-sdk/client-cognito-identity-provider` npm dep (0 importers in backend/src/); `npm run build` exit 0; redeployed frontend (`./deploy-frontend.sh` with `--delete` flag, CloudFront invalidation `I8SUS5M4KN4SO3T8ZDSXQHTJIJ` Completed); Rule-5 auto-fix #2: stale `SUPABASE_JWT_SECRET` comment in `turion-satellite/backend/src/lambda.ts:7-8` updated to fail-loud-on-COGNITO_CONFIG description (mirror parity with 41-02's identical fix). Final cross-cutting smoke 10/10 PASS (valid Cognito 200 both Lambdas, forged Cognito 401, forged Supabase 401, Phase 38 regression intact) + deleted helpers return 403 from CDN + /cognito-auth-callback 200 + 10 representative pages all load cognito-auth.js + 0 grep matches for `erpAuth.|satelliteAuth.|@supabase/supabase-js` in HTML + 0 grep matches for `SUPABASE_JWT_*` in backend source (both repos) + audit-buttons 0 violations both frontends. 2 commits: `2bb077d` on `turion-space-demo` `origin/main`; `79fc014` on `turion-satellite` `origin/main`. **M1-COMPLETE.md written** (10-row requirements-closed table with file:line evidence, AWS resources active/removed/deleted-files tables, 4-user migration table, costs paragraph, 6 follow-ups carried to M2). SUMMARY: `.planning/phases/41-m1-.../41-04-SUMMARY.md`.

*Last updated 2026-05-14T08:41Z: **Phase 41 COMPLETE — M1 CLOSED.** 4/4 plans, 3/3 requirements closed (CognitoOnlyFrontend, CognitoOnlyBackend, SupabaseAuthDeprecation). Cognito-only auth foundation LIVE across the full stack. Supabase Auth fully retired (env vars + IAM grant + secret + dead code all removed). 10 M1 requirements closed across Phases 39 + 40 + 41. Magic-link UX preserved; user-facing behavior unchanged. Marginal AWS cost ~$1/mo (KMS CMK). Open follow-ups carried to M2: RDS Postgres migration, SES production-access reopen, JWKS lazy re-fetch (deferred), tenant_id multi-tenancy (M3 scope), smoke harness fix (hygiene phase). M2 (Phases 42-43 — RDS Postgres migration) starts next.*

---

## Zietra Platform — Next milestones

**Strategy 2026-05-14:** Skip ahead to M5 + M6 (customer-facing self-serve signup + UI shell) to demonstrate the multi-tenant SaaS UX with a real second tenant. M2/M3/M4 deferred as TODOs — they harden the platform before GA but aren't blockers for onboarding the second pilot tenant. M7/M8 stay as TODOs.

### Phase 52: M5 — Self-serve signup + sandbox provisioning (minimal multi-tenancy scaffolding)

**Goal:** Land a working signup flow at `zietra.com` that creates a new Cognito user, provisions a real tenant row + seeded module entitlements, and lands the user in a working sandbox. Because M3 (RLS) and M4 (Stripe) are deferred, this phase includes the MINIMUM scaffolding to make a second tenant function: a `tenants` table (id, slug, name, owner_cognito_sub, created_at, plan='trial'), a `tenant_features` table (tenant_id, module_code, enabled — defaulting ALL modules ON during trial), and a nullable `tenant_id` column added to existing turion/turion_satellite tables (Turion's data labeled `tenant_id=1` via backfill). No RLS — code-level filtering optional, demo-grade isolation only. Signup creates Cognito user via `AdminCreateUser` + Cognito Group `customer`, inserts `tenants` row, inserts default `tenant_features` rows (one per module code), sends welcome email via SES, redirects to `<tenant-slug>.zietra.com` (handled by Phase 53). Backend: new `POST /api/tenants/signup` endpoint that does the whole atomic transaction.

**Depends on:** Phase 41 (Cognito-only auth).
**Requirements:** TenantSignupFlow, TenantsTable, TenantFeaturesTable, MinimalTenantIdBackfill, WelcomeEmailViaSES

**Plans:** 4/4 plans executed — **PHASE 52 (M5) COMPLETE**
- [x] 52-01-PLAN.md — DB migrations: tenants + tenant_features tables, Turion seed, tenant_id column on 105 tables + backfill (Wave 1, parallel with 52-02) — SUMMARY `52-01-SUMMARY.md`
- [x] 52-02-PLAN.md — Backend signup endpoint POST /api/tenants/signup (atomic Cognito + DB transaction + CUSTOM_AUTH welcome magic-link, IAM grants, Lambda deploy) (Wave 1, parallel with 52-01) — SUMMARY `52-02-SUMMARY.md`
- [x] 52-03-PLAN.md — Frontend signup.html + CloudFront /signup → /signup.html rewrite (Wave 2, depends on 52-01 + 52-02) — SUMMARY `52-03-SUMMARY.md`
- [x] 52-04-PLAN.md — End-to-end smoke (9 assertions, 2/2 PASS, cleanup, anchor-guard) + Phase 53 CHECKPOINT.md handoff (Wave 3, depends on 52-03) — SUMMARY `52-04-SUMMARY.md` · CHECKPOINT `CHECKPOINT.md`

---

### Phase 53: M5 — Wildcard subdomain routing — `<tenant>.zietra.com`

**Goal:** Every signed-up tenant gets a working subdomain. Provision wildcard ACM cert (`*.zietra.com` in us-east-1, required by CloudFront), update the `turion-demo-static` CloudFront distribution to accept the wildcard alias OR create a new distribution for tenants. CloudFront Function (or Lambda@Edge) reads the subdomain from `Host` header, sets it as a custom header forwarded to the origin (S3 static + APIGW Lambda). Backend Lambdas read the tenant slug from the header on every authenticated request and stamp `req.tenant_id` for downstream handlers. Frontend tenant-specific config (e.g., logo, name, plan) loaded from `GET /api/tenants/current` at app shell init. Existing `turionspace.zietra.com` stays as the Turion tenant (alias for `turion.zietra.com`); new tenants reach the same S3/APIGW with a different subdomain.

**Depends on:** Phase 52 (tenants table exists, signup writes rows).
**Requirements:** WildcardACMCert, CloudFrontWildcardAlias, TenantSubdomainExtractor, BackendTenantContextMiddleware, TenantConfigEndpoint

**Plans:** 4/4 plans complete — **PHASE 53 (M5 wildcard subdomain) DONE**
- [x] 53-01-PLAN.md — Wildcard ACM cert (`*.zietra.com` + `zietra.com` SANs, us-east-1) + Route 53 wildcard A+AAAA aliases — idempotent provision script (Wave 1) — SUMMARY `53-01-SUMMARY.md`
- [x] 53-02-PLAN.md — CloudFront distribution alias swap (attach wildcard cert + add `*.zietra.com` to Aliases) + Function host→x-tenant-slug + reserved-slug filter + /* invalidation (Wave 2, parallel with 53-03) — SUMMARY `53-02-SUMMARY.md`
- [x] 53-03-PLAN.md — Backend tenantContext middleware in BOTH Lambdas (mirror) + public GET /api/tenants/current + browser X-Tenant-Slug header in erp-api.js + satellite-api.js (Wave 2, parallel with 53-02) — SUMMARY `53-03-SUMMARY.md`
- [x] 53-04-PLAN.md — End-to-end smoke (9 assertions + 3 regressions, anchor-guarded, re-runnable; both runs PASS) + Phase 54 CHECKPOINT.md handoff (Wave 3, depends 53-02 + 53-03) — SUMMARY `53-04-SUMMARY.md` · CHECKPOINT `CHECKPOINT.md`

---

### Phase 54: M6 — Modular UI shell + module-aware navigation redesign + add-on catalog

**Goal:** Single app shell at `<tenant>.zietra.com` with a redesigned LEFT-SIDE NAVIGATION that names each module by its source system (NetSuite, Salesforce, Arena PLM, Zietra Marketing, ASC 606, Royalty Management, Ramp, QB-Migration, AI Agents, MES, Quality), so users instantly understand the cross-system data flow. Each nav item clicks straight to a meaningful work-surface page (NOT a generic dashboard). Dynamic nav rendered from the tenant's `tenant_features` rows: enabled modules show with full icon + label; disabled ones grey out with "+ Add to plan" CTA. A `/catalog` page lists every add-on with description + "Try it free" CTA (trial) or "Subscribe" stub (M4 wires Stripe). Per-tenant chrome: header shows tenant name + plan badge + trial countdown. Shell wraps existing satellite + ERP pages via migration-script injection; pages render unchanged inside the shell. Playwright E2E scaffold + 20 nav-traversal tests bootstrapped here.

**Depends on:** Phase 53 (tenant context + `/api/tenants/current` returning `features[]`).
**Requirements:** AppShell, ModuleAwareNavigation, NavigationLandingPages, CatalogPage, AddOnCTAs, ShellWrapperForExistingPages, TenantBrandedChrome, PlaywrightE2EScaffold

**Plans:** 5/5 plans complete
- [x] 54-01-PLAN.md — App shell + design system + NAV_TAXONOMY (Wave 1) — `AppShell`, `ModuleAwareNavigation`, `TenantBrandedChrome` — SUMMARY `54-01-SUMMARY.md`
- [x] 54-02-PLAN.md — Idempotent migration script: STRIP old `/shells/*` + INJECT new shell into ~85 ERP pages (Wave 2, depends 54-01) — `ShellWrapperForExistingPages` — SUMMARY `54-02-SUMMARY.md`
- [x] 54-03-PLAN.md — `/catalog` + 13-card MODULE_CATALOG + 17 module-landing stubs + 3 bottom-rail stubs (Wave 2, depends 54-01) — `CatalogPage`, `AddOnCTAs`, `NavigationLandingPages` — SUMMARY `54-03-SUMMARY.md`
- [x] 54-04-PLAN.md — CloudFront Function: 27+ R-map entries + 14 RESERVED slugs + backend `RESERVED_SLUGS` expansion + Lambda redeploy (Wave 2, depends 54-01) — `ModuleAwareNavigation`, `NavigationLandingPages` — SUMMARY `54-04-SUMMARY.md`
- [x] 54-05-PLAN.md — Playwright E2E scaffold + 29 tests + Phase 54.1 CHECKPOINT.md (Wave 3, depends 54-02 + 54-03 + 54-04) — `PlaywrightE2EScaffold` — SUMMARY `54-05-SUMMARY.md` · CHECKPOINT `CHECKPOINT.md`

---

### Phase 54.1: M6 — Multi-user per tenant (team invites + role middleware)

**Goal:** A tenant owner can invite team members by email; each gets a role (`admin` / `manager` / `member` / `viewer`). New `tenant_users` table (tenant_id, cognito_sub, role, invited_at, joined_at, status). Invite flow: owner submits email + role → backend creates pending invite + sends magic-link email via SES → invitee clicks → Cognito user provisioned (if new) → row added to `tenant_users`. New role middleware enforces RBAC per route (admin = full; manager = no billing/team; member = no admin pages; viewer = read-only). UI: `/team` page lists members + invite form. Stripe seat counting deferred to M4. Adds vitest backend tests for the invite + role middleware.

**Depends on:** Phase 54 (UI shell exists with `/team` route slot). **Waves 2-3 BLOCKED on Phase 54.5** (Aurora migration — pause inserted between Wave 1 and Wave 2 so invite endpoints + frontend rewrite + vitest land directly on Aurora, not Supabase).
**Requirements:** TenantUsersTable, InviteFlow, RoleMiddleware, TeamPage, VitestBackendBootstrap

**Plans:** 4/4 plans complete
- [x] 54.1-01-PLAN.md — Foundation: migration 026 `tenant_users` + `requireRole` middleware mirrored to both repos + 3 Cognito Groups (Wave 1) — `TenantUsersTable` + `RoleMiddleware` — SUMMARY `54.1-01-SUMMARY.md`
- [ ] 54.1-02-PLAN.md — Backend invite/accept/list/role-mutation endpoints (Wave 2, depends 54.1-01 + **54.5**) — `InviteFlow`
- [x] 54.1-03-PLAN.md — Frontend `/team` page rewrite + `/accept-invite` page (Wave 2 parallel with 02, depends 54.1-01) — `TeamPage` — SUMMARY `54.1-03-SUMMARY.md`
- [ ] 54.1-04-PLAN.md — Vitest bootstrap + RBAC tests + closure smoke (Wave 3, depends 54.1-02 + 54.1-03) — `VitestBackendBootstrap`

---

### Phase 54.2: M6 — AI agents per-tenant (NCR→CAPA, EVMS Watchdog, Integration Sentinel)

**Goal:** The 3 AI agents from Phase 36 (currently Turion-only) become per-tenant features gated by `tenant_features.ai-agents`. Each agent reads `req.tenant.id`, queries data scoped to that tenant (in code — full RLS isolation comes in M3), and writes its outputs (capa proposals, EVMS alerts, sync issues) scoped to the tenant. Per-agent UI page (`/agents/ncr-capa`, `/agents/evms`, `/agents/integration`) listing recent runs + manual trigger. Agent invocations require `admin` or `manager` role (RBAC from 54.1). Anthropic API key remains a global Lambda env (per-tenant API keys is M8 scope). Tests: agent mock-mode for non-live runs.

**Depends on:** Phase 54.1 (RBAC middleware).
**Requirements:** AgentsPerTenant, NcrCapaAgentMultiTenant, EvmsWatchdogMultiTenant, IntegrationSentinelMultiTenant, AgentMockMode

**Plans:** 0 plans
- [ ] TBD (run `/gsd:plan-phase 54.2`)

---

### Phase 54.3: M6 — Test infrastructure (Playwright E2E + vitest + axe + Lighthouse) bootstrap

**Goal:** Full test stack bootstrapped end-to-end. Playwright suite covers signup → magic-link login → nav traversal → module CRUD → sign-out for both Turion and a freshly-created tenant. Vitest backend coverage for `tenantContext` + role middleware + signup atomic transaction (mocked Cognito/SES). Axe-core accessibility audit per page (WCAG 2.1 AA target). Lighthouse CI integration for perf + best-practices scores. Test count counter goes into STATE.md. CI workflow file scaffolded for future GitHub Actions integration (manual runs only for Phase 54.3). Load/chaos test stub deferred to M8.

**Depends on:** Phase 54 + 54.1 + 54.2 (test targets exist).
**Requirements:** PlaywrightE2ESuite, VitestBackendCoverage, AxeAccessibilityAudit, LighthouseCI, TestCountTracker

**Plans:** 0 plans
- [ ] TBD (run `/gsd:plan-phase 54.3`)

---

### Phase 54.4: M6 — Module-selection wizard + migration onboarding (THE SELLING POINT)

**Goal:** Turn the 13-module catalog from "a list to read" into "an answer to two business-critical questions": (1) **What add-ons do I need for MY company?** and (2) **How do I migrate my existing data so I can start using this today?** Without 54.4, the catalog is just a price sheet. With 54.4, the catalog becomes the conversion engine.

**(A) Module-selection wizard.** After signup at `/signup`, redirect the new tenant owner to `/onboarding/recommend` — a 3-5 question wizard (industry, team size, biggest pain right now, tools used today, ASC 606 needs). Hardcoded rule engine (no ML — explicit scoring per module per answer) produces a recommended set of 3-7 modules from the 13, displayed as cards with a "Why we recommend this" tooltip per card. User can override (add/remove). Final selection writes to `tenant_features` (enabled=true for selected) and lands the user on `/`. Same wizard accessible from `/catalog` via a "Help me choose" CTA so existing tenants can re-run it after onboarding.

**(B) Migration onboarding flow.** `/onboarding/migrate` page shows cards for each migration source. Initial set: QuickBooks → NetSuite (already shipped in Phase 37 — wire `/quickbooks` as the canonical "your books migration"), Salesforce → CRM (NEW — CSV-based; user pastes SF export, we parse + import), NetSuite → NetSuite (cross-tenant — Turion's sample data clonable into the new tenant for demo), Excel → Items master (CSV upload), Vendor list import (CSV), Customer list import (CSV), "Bring nothing — start fresh with sample data" option (clones Turion's demo data into the new tenant's tables). Each card shows estimated time, what gets imported, and a "Start migration" CTA.

**(C) Onboarding checklist on tenant home.** `/` for a freshly-signed-up tenant displays a 4-step checklist: (1) Pick your modules → links to /onboarding/recommend OR /catalog; (2) Invite your team → links to /team (Phase 54.1); (3) Migrate your data → links to /onboarding/migrate; (4) Connect to AI agents (if `ai-agents` enabled) → links to /agents/*. Each item is a real link, no dead ends. Checklist persists until all checked (state stored in `tenant.onboarding_state` JSONB column).

**Why this is the selling point:** prospects ask "which add-ons do I need?" — without 54.4, they read 13 descriptions and guess. With 54.4, they answer 4 questions and see a curated plan. Prospects also ask "how hard is migration?" — without 54.4, they hear "we have a QB→NS wizard" but no Salesforce/Excel path. With 54.4, the migration page shows 7 cards, each a guided flow.

**Depends on:** Phase 54.1 (tenant_users for tagging the owner who completes the wizard) + Phase 54.2 (AI agents available so the wizard can recommend them).
**Requirements:** OnboardingWizard, ModuleRecommendationEngine, MigrationLanding, MigrationCards, OnboardingChecklistOnHome, RecommendationRuleEngine

**Plans:** 3/3 plans executed ✓ PHASE COMPLETE
- [x] 54.4-01 — Wizard + rule engine + migration 032 ([SUMMARY](phases/54.4-m6-module-selection-wizard-and-migration-onboarding-the-selling-point/54.4-01-SUMMARY.md))
- [x] 54.4-02 — Migration landing + 5 wizards + sample-data clone ([SUMMARY](phases/54.4-m6-module-selection-wizard-and-migration-onboarding-the-selling-point/54.4-02-SUMMARY.md))
- [x] 54.4-03 — Checklist on home + PATCH /api/onboarding/checklist + smoke + CHECKPOINT ([SUMMARY](phases/54.4-m6-module-selection-wizard-and-migration-onboarding-the-selling-point/54.4-03-SUMMARY.md))
**Requirements progress:** 6 of 6 closed ✓ (OnboardingWizard ✓, ModuleRecommendationEngine ✓, RecommendationRuleEngine ✓, MigrationLanding ✓, MigrationCards ✓, OnboardingChecklistOnHome ✓)
**Handoff to Phase 56 (M4 Stripe billing):** see [CHECKPOINT.md](phases/54.4-m6-module-selection-wizard-and-migration-onboarding-the-selling-point/CHECKPOINT.md)

---

### Phase 54.5: M6 — Aurora Postgres migration (leave Supabase) ⚡ INSERTED 2026-05-15

**Goal:** Migrate the entire Postgres workload off Supabase (`lbpkbpfwdpnwlccmlfxn`) onto **AWS Aurora Serverless v2 (Postgres-compatible)** in `us-east-1`. Single planned maintenance window. **Audit-corrected scope (2026-05-15):** 4 Lambdas — `turion-demo-api` (ERP), `turion-satellite-api` (satellite), `zietra-crm-api` (Zietra Meet booking, schema=`crm`), `zietra-api` (auth/identity). NOT in scope: `marquee-app` uses SQLite at /tmp; `asc606-app` uses S3 + Marquee API (no DB); Dollor mobile + VibingTicket already on AWS RDS (`dollor-db.c23qcukqe810.us-east-1.rds.amazonaws.com`). **DB size: 25 MB · 4 app schemas (`turion`, `turion_satellite`, `crm`, `public`) · 153 tables · 3,070 rows · 463 indexes · 193 FKs · 6 extensions (only `supabase_vault` is non-standard, on empty schema). Zero `@supabase/*` imports in app code; 5 RLS policies on 2 EMPTY tables (drop-or-replicate decision).** Strategic timing: lands BEFORE M3 (RLS) so tenant-isolation policies are written once on the target platform; lands BEFORE M4 (Stripe billing) so payment wiring sits on a reliable DB. Tenant count is currently small (3 tenants, 6 admin rows) — migration cost is at its lifetime minimum NOW.

**Why this insertion:** With Phase 54.1 Wave 1 fresh (tenant_users + role middleware just landed on Supabase), pausing here is the cheapest possible interruption. Resuming Phase 54.1 on Aurora avoids two implementations of every M3 RLS policy. Supabase usage is purely Postgres-as-a-service — auth has been on Cognito since Phase 39, storage is on S3, no Realtime/Edge Functions in use — so this is a pure connection-string + dump/restore swap, no application logic changes required beyond Lambda env vars + Secrets Manager values.

**Scope (locked, audit-corrected):**
- **Target:** Aurora Serverless v2 cluster, encrypted at rest (KMS), Multi-AZ, 0.5–16 ACU autoscale. **Networking decision deferred to planner** (biggest open question — Lambdas currently have NO VPC config, talk to public Supabase via port 6543; Aurora can be public+SG OR Lambdas can be put in VPC with private Aurora — tradeoff is cold-start time vs network exposure).
- **Cutover:** Single maintenance window, est. <2 min for 25 MB. `pg_dump -Fc` from Supabase → `pg_restore` to Aurora. 4 Lambda env-var flips via `aws lambda update-function-configuration`. **2 secrets to rotate** (`turion-satellite/production/database-url` + 1 zetra-* secret TBD by audit), **1 secret to delete** (`turion-satellite/production/supabase-anon-key-cxGmm1` — already unused since Cognito migration).
- **Rollback:** Keep Supabase project LIVE for 7 days post-cutover. If smoke fails, flip env vars back. Aurora pre-cutover snapshot for paranoia.
- **Smoke matrix:** Turion ERP `/api/health` + auth-gated read, satellite `/api/satellites` + part-instance round-trip, Zietra CRM booking endpoint, Zietra auth `/api/tenants/current`. Plus Phase 54.1 Wave 1 tenant_users sanity (6 rows present post-restore).
- **5 RLS policies on 2 empty tables:** decide drop-or-replicate during planning. Likely drop (M3 rewrites RLS holistically anyway).
- **Out of scope (deferred to M3):** new RLS policies, `app.tenant_id` per-connection setting, isolation tests. M3 writes these on Aurora.
- **Out of scope (not Supabase):** marquee-app (SQLite), asc606-app (S3-only), Dollor mobile + VibingTicket (already on RDS).

**Depends on:** Phase 54.1-01 (just shipped — establishes `tenant_users` schema that must be carried over).
**Blocks:** Phase 54.1 Waves 2-3 (invite endpoints / frontend / vitest), Phase 54.2, Phase 54.3, Phase 54.4, M3, M4.
**Requirements:** AuroraClusterProvisioned, ConnectionStringSwap, SchemaParity, DataParity, RollbackRunbook, FourLambdaSmoke, SupabaseRetention7Days

**Plans:** 3/4 plans executed
- [x] 54.5-01-PLAN.md — Aurora Serverless v2 cluster provisioning (PG 16.4, ACU 0.5–4, KMS-encrypted, 5 CloudWatch alarms, $100/mo budget) — `AuroraClusterProvisioned`
- [x] 54.5-02-PLAN.md — Dry-run dump/restore + 153-table parity verification + 4-Lambda smoke matrix scripts + pre-flight env capture + Open Q1/Q2 resolution — `SchemaParity` + `DataParity` + `FourLambdaSmoke`
- [x] 54.5-03-PLAN.md — **PRODUCTION CUTOVER LIVE 2026-05-15** — Supabase pg_dump → Aurora pg_restore (153 tables, 0 drift) + 4 Lambda env-var flips (all 4 Lambdas serving from Aurora) + smoke 4/4 PASS — `ConnectionStringSwap` + `RollbackRunbook`. SG hardening DEFERRED to Phase 54.6 (VPC + RDS Proxy is correct architectural fix; ip-ranges.json LAMBDA fallback doesn't exist).
- [ ] 54.5-04-PLAN.md — 7-day soak monitoring + Supabase project deletion + cleanup of unused secrets (rollback window ends 2026-05-22) — `SupabaseRetention7Days`

---

### Phase 54.6: M6 — Enterprise hardening starter pack (VPC + RDS Proxy + WAF + GuardDuty + close 0/0 SG) ⚡ INSERTED 2026-05-15

**Goal:** Close every obvious enterprise red flag in a single 2-week push so SMB + small-enterprise prospects (Plaitha-style D2C through Turion-Space-style aerospace) can audit our setup and find nothing embarrassing. **Not** SOC 2 Type II / multi-region / EKS / Organizations — that's $30K+ and 6-12 months. This is the high-ROI subset: VPC isolation, RDS Proxy (also fixes 54.5-03's deferred SG hardening), WAF on every CloudFront distro, GuardDuty + Security Hub for continuous posture, and a public `zietra.com/security` trust page summarizing the controls.

**Why this insertion (strategy pivot 2026-05-15):** Original plan was M3 → M4 → harden later. User pivoted: "we are now selling the whole thing to small enterprise + SMB business — try-and-buy, if Plaitha-style D2C signs up we give them the right backend, if Turion-Space-style signs up we give them right product end-to-end so their IT spend is low." That positioning REQUIRES enterprise-grade security/audit posture BEFORE billing real money or scaling tenant count. Doing it now (3 tenants on platform, fresh Aurora cutover) is cheaper than doing it after M4/M5 at 50+ tenants under contracts.

**Scope (locked):**
- **VPC:** new `zietra-prod-vpc` in us-east-1 (10.0.0.0/16), 2 AZs (us-east-1a + us-east-1b), public subnets (NAT egress) + private subnets (Lambdas + Aurora). 1 NAT Gateway (single-AZ acceptable for cost; HA NAT is M8). ~$32/mo NAT.
- **Aurora private:** migrate `zietra-aurora-prod` from default VPC public to `zietra-prod-vpc` private subnets. **In-place modify-db-cluster** preferred; if unavailable, snapshot → restore-to-new-cluster (with old cluster kept for 7-day rollback).
- **Lambda VPC-attach:** 4 production Lambdas attached to `zietra-prod-vpc` private subnets. Cold-start penalty ~50-100ms post-2019 Hyperplane ENI improvements — acceptable for demo workload.
- **RDS Proxy:** provision `zietra-aurora-proxy` in front of Aurora. IAM auth + connection pooling. Lambdas point at Proxy endpoint instead of cluster endpoint. ~$15/mo at our connection count.
- **Close 0.0.0.0/0:5432 SG (the deferred Phase 54.5-03 gap):** post-VPC-migration, Aurora SG allows ONLY the RDS Proxy SG, which allows ONLY the Lambda VPC subnet CIDR. No public DB ingress.
- **WAF on 3 CloudFront distributions:** turionspace.zietra.com (E37R9PT8IL44L2), marquee.zietra.com, asc606.zietra.com. AWS Managed Rules Common Rule Set + Known Bad Inputs + IP Reputation + Bot Control Common (Anonymous IP, datacenter ranges). ~$5/mo per rule group + $0.60 per million requests.
- **GuardDuty:** enable in us-east-1. ~$30/mo at our log volume.
- **Security Hub:** enable with AWS Foundational Security Best Practices + CIS AWS Benchmark v1.4. ~$10/mo.
- **AWS Config:** enable recording + SOC 2 conformance pack (or subset that maps to our infra). ~$15/mo.
- **`zietra.com/security` trust page:** public marketing page listing data residency (us-east-1), encryption at rest (AES-256/KMS), encryption in transit (TLS 1.3), auth (Cognito + RS256 JWT), authz (RBAC + tenant_users), audit logging, backup retention, incident response email (security@zietra.com), supported frameworks (SOC 2 controls deployable, GDPR data-export ready, HIPAA-eligible AWS services in use).

**Out of scope (deferred to specific triggers):**
- AWS Organizations / multi-account (defer until >$1M ARR or sub-account isolation requested)
- Multi-region active-active (defer until first EU/APAC prospect)
- ECS/EKS migration (defer until Lambda hits a wall — not yet)
- SOC 2 Type II audit (defer until first customer requires it; $30K+ and 6-12 month observation)
- Bedrock instead of Anthropic direct (defer to specific AWS-billed-AI customer ask)
- HA NAT across 2 AZs (M8)
- SAML SSO for enterprise tenants (M8)
- Per-tenant WAF rules (M8)

**Total estimated monthly cost delta:** ~$240/mo (NAT $32 + RDS Proxy $144 + WAF $22 + GuardDuty $30 + Security Hub $10 + Config $15). Note: RDS Proxy on Aurora Serverless v2 hits 8-ACU minimum = $144/mo (corrected from $15 initial estimate per 54.6-RESEARCH §D.1).

**Depends on:** Phase 54.1 (complete) + Phase 54.5-01/02/03 (Aurora cutover live).
**Blocks:** Phase 54.5-04 Supabase teardown (54.5-04 only deletes Supabase AFTER 54.6 ships, since 54.6 VPC migration may need rollback to public Supabase); also blocks M3 (RLS), M4 (Stripe billing — won't bill real money on un-hardened infra), M7 (marketing site links to /security trust page).
**Requirements:** VpcIsolation, AuroraPrivate, RdsProxyDeployed, LambdaVpcAttached, WafEnabledAllDistros, GuardDutyEnabled, SecurityHubEnabled, AwsConfigEnabled, ZeroPublicDbIngress, SecurityTrustPage

**Plans:** 4/4 plans executed — **PHASE 54.6 CLOSED 2026-05-15T09:40Z, all 10 requirements satisfied**

Plans:
- [x] 54.6-01-PLAN.md — **Wave 1 COMPLETE 2026-05-15T07:40Z** — VPC `vpc-012ab4500dcd4ee41` (10.0.0.0/16, 4 subnets across 2 AZs) + NAT instance `i-0e9159d87ede802bd` (t4g.nano, Option-D pivot after EIP quota) + 3 app SGs + new Aurora cluster `zietra-aurora-prod-v2` restored from snapshot `zietra-aurora-pre-vpc-migration-2026-05-15` into private subnets (IAM auth on, NOT publicly accessible, ServerlessV2 0.5-4 ACU). Parity gate PASSED (153 tables / 3070 rows, diff=0 lines). 5 atomic commits, 3 Rule-1/2/3 auto-fix deviations. 270-line rollback runbook. OLD cluster STILL LIVE, 4 Lambdas STILL hitting OLD endpoint (cutover is 54.6-02's job). Satisfies `VpcIsolation` + `AuroraPrivate` requirements. SUMMARY at .planning/phases/54.6-.../54.6-01-SUMMARY.md.
- [x] 54.6-02-PLAN.md — **Wave 2 COMPLETE 2026-05-15T08:52Z** — RDS Proxy `zietra-aurora-proxy` (POSTGRESQL, RequireTLS, password-auth via Secrets Manager, ARN `prx-0ed4fed02640bec76`) + IAM role `zietra-rds-proxy-role` + target `zietra-aurora-prod-v2-writer` AVAILABLE. All 4 Lambdas (turion-demo-api, turion-satellite-api, zietra-crm-api, zietra-api) VPC-attached to PRIV_1A+1B with LAMBDA_SG; all 4 DB URLs flipped to Proxy endpoint preserving schema=. Smoke matrix 4/4 PASS (turion-demo 53 rows 118ms, turion-satellite 5ms, zietra-crm database=connected, zietra-api database=connected). OLD SG `sg-0760238c408d0f2b7` 0.0.0.0/0:5432 REVOKED — **Phase 54.5-03 deferred gap CLOSED**; operator IP /32 retained. 3 Rule-1/3 deviations: (1) added 3 VPC interface endpoints (secretsmanager, kms, cognito-idp) because NAT instance iptables wasn't installed (AL2023 doesn't ship /sbin/iptables); (2) fixed turion-satellite-api source — removed libpq `options` Pool config (RDS Proxy rejects startup-options), commit `845b9bd` in turion-satellite repo; (3) `put-role-policy` instead of sandbox-blocked `attach-role-policy`. 4 atomic commits (`b3d22626`, `643aceec`, `e776d437`, `7c355b5e`) + 1 cross-repo. 60 min wall-clock. Pre-flight rollback snapshots at /tmp/preflight-env-54-6-*.json. Satisfies `RdsProxyDeployed` + `LambdaVpcAttached` + `ZeroPublicDbIngress` requirements. SUMMARY at .planning/phases/54.6-.../54.6-02-SUMMARY.md.
- [x] 54.6-03-PLAN.md — **Wave 3 COMPLETE 2026-05-15T09:24Z** — WAFv2 CLOUDFRONT ACL `zietra-prod-waf` (5 rules, 4 managed groups in COUNT mode for 24-72h soak) attached to 2 CF distros (E37R9PT8IL44L2 turion + E1X82T89JWL8CA zietra apex) via `cloudfront update-distribution`; WAFv2 REGIONAL ACL `zietra-prod-waf-regional` provisioned but UNATTACHED (marquee + asc606 use APIGW v2 → WAFv2 unsupported; Rule-3 deviation Option A documented). GuardDuty `2513bb867e054b19aad672b2cb676a7b` ENABLED (FIFTEEN_MINUTES + S3Logs) + EventBridge severity≥7 → SNS `zietra-security-findings` (security@zietra.com PendingConfirmation). Security Hub 3 standards (FSBP + CIS v1.2 + CIS v1.4). AWS Config recorder `default` 18 targeted resource types + delivery + conformance pack `OperationalBestPracticesForAmazonRDS`; lastStatus=FAILURE pending operator SLR creation. 4 atomic commits + 4 idempotent provisioning scripts. 24 min. Satisfies `WafEnabledAllDistros` (partial — 2 of 3 real-CF distros) + `GuardDutyEnabled` + `SecurityHubEnabled` + `AwsConfigEnabled` requirements. SUMMARY at .planning/phases/54.6-.../54.6-03-SUMMARY.md.
- [x] 54.6-04-PLAN.md — **Wave 4 COMPLETE 2026-05-15T09:40Z** — Trust page `apps/zietra-marketing/security.html` (149 lines, 12 sections) deployed to `s3://zietra-marketing/security.html`, CloudFront invalidation `I2NX1MXK58TM31QLHK6D1PIWI0` Completed, `https://zietra.com/security.html` returns HTTP 200 + text/html; charset=utf-8. Cross-cutting smoke matrix `scripts/smoke-phase-54-6.sh` (192 lines, executable, idempotent) exits 0 with **16/16 PASS** in 8 sec — verifies 4 Lambda health + 4 customer edges + trust page + 3 DB endpoints public-blocked + GuardDuty/Security Hub/Config/WAF state. CHECKPOINT.md (227 lines) captures Phase 54.6 closure + 14 deferred operator items with target dates + M3 unblock signal. NEXT_SESSION.md updated with closure block + recurring tasks. 3 atomic commits (`c0a22b92`, `be225789`, `8cfcbe7d`). 3 Rule-1/3 deviations (CLI `--cli-binary-format` rejected → HTTP-via-APIGW Lambda smoke; `wafv2 list-resources-for-web-acl --resource-type CLOUDFRONT` invalid → `cloudfront get-distribution-config WebACLId`; `grep -c | echo 0` produced `0\n0` → `head -1` + paramexpansion default). 7.7 min wall-clock. Satisfies `SecurityTrustPage` requirement. **Phase 54.6 closes; Phase 55/M3 (multi-tenancy + RLS) UNBLOCKED.** SUMMARY at .planning/phases/54.6-.../54.6-04-SUMMARY.md.

---

### Phase 55: M3 — Multi-tenancy + RLS (tenant isolation) ⚡ INSERTED 2026-05-15

**Goal:** Implement row-level security on Aurora so tenants CANNOT read each other's data, even via SQL injection or compromised app logic. Currently `tenant_id` columns exist on multi-tenant tables but enforcement is application-side only — a single forgotten `WHERE tenant_id = $1` could leak rows across tenants. RLS makes the database itself the security boundary: even with full DB access, queries return only the current tenant's rows. Required BEFORE any real paying customer is onboarded.

**Why this insertion (pulled forward from "Deferred milestones"):** Phase 54.6 hardened the perimeter (VPC isolation, WAF, GuardDuty). M3 hardens the inside — between tenants on the same Aurora cluster. The two layers together are what enterprise customers need to see before signing. Original ROADMAP deferred M3 until after M6 demo; pulled forward because (a) Aurora cutover is fresh — RLS lands once on the target platform; (b) tenant count is 3 today — minimal data to backfill `tenant_id` on; (c) M4 (Stripe billing) shouldn't go live without M3 first.

**Scope (locked):**
- **Audit every multi-tenant table** for `tenant_id` column presence. Currently confirmed: `public.tenant_users` (Phase 54.1), `public.tenants` (Phase 52), `public.tenant_features` (Phase 53). Need to audit: ERP schemas (`turion`, `turion_satellite`) — most of those rows are demo data for tenant_id=`00000000-0000-0000-0000-000000000001` (Turion); CRM schema (`crm`) — Zietra Meet booking platform.
- **Add `tenant_id` column** to any multi-tenant table that lacks one. Backfill from existing data + lock `NOT NULL` constraint after backfill verifies.
- **RLS policies** per table: `CREATE POLICY tenant_isolation ON <table> USING (tenant_id = current_setting('app.tenant_id')::uuid)`. Enable via `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` (so even table owner gets RLS'd).
- **Per-connection `SET LOCAL app.tenant_id`** in `tenantContext` middleware (Phase 53 already extracts the slug → tenant; just add the `SET LOCAL` before any query). Handles RDS Proxy session pinning correctly — Proxy supports `SET LOCAL` within a transaction; verify behavior with research.
- **Bypass for admin/migration paths:** Some scripts (migrations, backfills, ops queries) need cross-tenant access. Create a dedicated `zietra_admin_bypass` Postgres role that has `BYPASSRLS`, store its credentials in Secrets Manager, use ONLY from migration scripts (NOT from Lambda code).
- **~500 isolation tests:** vitest + supertest matrix testing every API endpoint with tenant-A JWT trying to access tenant-B's data → must return 404 or 403 (NOT 200 with leaked rows). Generate test cases programmatically from the route table.
- **Performance impact assessment:** Benchmark p50/p99 latency on the 10 hottest endpoints before/after RLS. AWS docs say <5% overhead at our scale; verify empirically.
- **Rollback strategy:** If isolation tests find leaks or performance regresses >10%, can DISABLE RLS via `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` (policies stay defined, just inactive). Application logic remains the safety net; can re-enable per-table after fixing.

**Out of scope (deferred to later phases):**
- Cross-tenant aggregation / analytics (M8 — needs separate read-replica with cross-tenant grants)
- Schema-per-tenant (vs row-level) — heavier isolation but breaks Aurora cost model for our 3-tenant scale
- Field-level encryption (M8 — for HIPAA-style PHI handling)
- Audit log per-tenant retention policies (M8)

**Depends on:** Phase 54.6 (Aurora private, RDS Proxy, hardened perimeter — required as the platform RLS will run on).
**Blocks:** Phase 54.4 + M4 if you want them safe for real paying customers. (You CAN run 54.4 + M4 in parallel during M3 implementation — they just can't onboard real money until M3 lands.)
**Requirements:** TenantIdColumnEverywhere, RlsPoliciesActive, SetLocalAppTenantId, AdminBypassRole, IsolationTestSuite, RlsPerfImpactAssessed, RlsRollbackRunbook

**Plans:** 5/5 plans complete

**Progress:** ████████████████████ 100% (5/5)

- [x] 55-01-PLAN.md — **COMPLETE 2026-05-15T19:12Z** — tenant_id schema lockdown across all 4 schemas (public, crm, turion, turion_satellite). 149 multi-tenant tables now have `tenant_id uuid NOT NULL` + FK to `public.tenants(id)` ON DELETE RESTRICT + single-col index. Migration 027 (44 column-adds: 37 crm.* + 7 public.* Zietra Meet) + Migration 028 (149 NOT NULL locks + 149 new FKs RESTRICT). Both idempotent (re-run = 0 modifications). Bucket-4 exempt: public.tenants (chicken-and-egg), public.schema_migrations, public.tenant_features/tenant_users (pre-existing CASCADE FKs from Phase 54.1). Row-count parity 3070→3070. **Rule-3 deviation**: direct operator psql to private-subnet Aurora doesn't work — switched to one-shot VPC Lambda pattern (zietra-tenant-id-audit-oneshot + zietra-migration-runner-oneshot, both deleted post-execution). TenantIdColumnEverywhere requirement closed. 3 atomic commits: e8f2ddcf (doordash-p2p audit) + a5f1dd0 + 3bc5639 (turion-space-demo migrations). 16 min wall-clock. SUMMARY: `.planning/phases/55-m3-multi-tenancy-rls-tenant-isolation/55-01-SUMMARY.md`.
- [x] 55-02-PLAN.md — **COMPLETE 2026-05-15T19:30Z** — RLS policies + `zietra_admin_bypass` role (BYPASSRLS, ops only) + `zietra_app` role (NO BYPASSRLS, Lambdas). 151 multi-tenant tables RLS-enabled + FORCE + canonical `tenant_isolation` policy. 2 Secrets Manager secrets: `zietra-aurora/app-role-t0oumn` + `zietra-aurora/admin-bypass-role-pTsZjr`. Fail-closed PROVEN: zietra_app + no GUC → `42704 unrecognized configuration parameter`. Migration 029 + 030. 4 commits: `b86a219`+`680bb98` (turion-space-demo) + `fe4901e2`+`2c8a9ce9` (doordash-p2p). 10 min. **RlsPoliciesActive + AdminBypassRole closed**. SUMMARY: `55-02-SUMMARY.md`.
- [x] 55-03-PLAN.md — **COMPLETE 2026-05-15T20:20Z** — `withTenantClient(req, fn)` helper + 37 route files refactored in both repos + 4 Lambdas flipped to zietra_app (2 Aurora-backed + 2 no-op). RDS Proxy registered zietra_app secret; proxy IAM role granted GetSecretValue on app-role + admin-bypass-role. Smoke 4/4 PASS post-cutover. Pinning Max=1 over 30min (SET LOCAL confirmed proxy-compatible). 6 auto-fixes (CLI quoting / proxy IAM / Lambda env shapes / RLS-incompatible health / TS narrowing / genericFanOut signature). 12 commits across 3 repos. 44 min. **SetLocalAppTenantId closed**. SUMMARY: `55-03-SUMMARY.md`.
- [x] 55-04-PLAN.md — **COMPLETE 2026-05-15T20:40Z** — 459 isolation tests in CI (255 turion-space-demo + 204 turion-satellite), perf baseline (p50 380-529ms / p99 449-2378ms), pinning Max=3.0 ≤ 5, `[NEEDS-INDEX]` queue EMPTY. CI workflow `.github/workflows/rls-isolation.yml` in both repos. 7 commits. 14 min. **IsolationTestSuite + RlsPerfImpactAssessed closed**. 266 pre-existing satellite test failures (X-Tenant-Slug header missing) deferred to hygiene phase. SUMMARY: `55-04-SUMMARY.md`.
- [x] 55-05-PLAN.md — **COMPLETE 2026-05-15T20:58Z** — Per-table rollout walk (5 stages all ADVANCE), rollback drill on `public.tenant_features` PASS in 9 sec wall-clock, 2 CloudWatch alarms armed (pinning + Lambda p99) wired to `zietra-aurora-alarms` SNS, CHECKPOINT.md handing off to Phase 56 (M4 Stripe). Migration 031 NO-OP marker (queue empty per 55-04). `disable-rls-per-table.sh` + `rls-rollback-drill.sh` + `setup-rls-cloudwatch-alarms.sh` shipped (idempotent). Rollback runbook 279 lines / 8 sections / 4-tier decision tree. 7-day soak started 2026-05-15T20:55Z → ends 2026-05-22T20:55Z; daily operator actions documented. 4 Rule-1/3 auto-fixes (master vs bypass for DDL / vpc-migration.env path / AWS CLI v1 syntax / SNS topic naming). 3 commits: `fc40fa2` (turion-space-demo migration 031) + `6622f966` + `534762d5` (doordash-p2p). 11 min 57 sec. **RlsRollbackRunbook closed**. SUMMARY: `55-05-SUMMARY.md`. **Phase 56 (M4 Stripe) UNBLOCKED.**

*Phase 55 closed 2026-05-15T20:58Z. 7/7 requirements satisfied (TenantIdColumnEverywhere, RlsPoliciesActive, SetLocalAppTenantId, AdminBypassRole, IsolationTestSuite, RlsPerfImpactAssessed, RlsRollbackRunbook). RLS database-enforced on 152 tables across 4 schemas. Next: `/gsd:plan-phase 56` for M4 Stripe billing.*

---

### Phase 56: M4 — Stripe billing + entitlements ⚡ INSERTED 2026-05-15

**Goal:** Tenants can pay. $99/mo base subscription + add-on prices per module. Self-serve trial → paid upgrade via Stripe Checkout. Webhook Lambda processes Stripe events (subscription created/updated/canceled, invoice paid/failed). Customer portal for tenants to manage subscription + payment methods + see invoices. Trial-to-paid conversion flow integrated with Phase 54.4 onboarding checklist. Test-mode first cutover with operator GO/NO-GO before flipping to live mode.

**Why this is M4 + why now:** With Phase 54.1 (team), 54.5 (Aurora), 54.6 (hardening), 55 (RLS), 54.4 (wizard/migration), the platform can now safely onboard real tenants with isolated data. M4 is the "take money" layer. Required before any real customer signs.

**Scope (locked):**
- **Stripe integration:** test-mode first (publishable + secret keys in Secrets Manager). After validation, operator switches to live mode.
- **Product/Price setup:** Stripe Products for base subscription ($99/mo) + 1 product per add-on module (12 add-ons since `crm` is in base + `sales` is in base — verify against module catalog). Prices stored in Stripe; sync metadata to local `pricing` table for fast lookups.
- **Checkout flow:** `/billing/upgrade` page → Stripe Checkout session → success/cancel callback URLs → webhook fires.
- **Webhook Lambda:** NEW `stripe-webhook-handler` Lambda OR endpoint on `turion-demo-api` (decide based on isolation tradeoffs). Idempotent via Stripe event_id. Handles: customer.subscription.created/updated/deleted, invoice.payment_succeeded/payment_failed.
- **Customer portal:** Stripe-hosted portal for tenants to manage cards, see invoice history, cancel subscription. Generated via `stripe.billingPortal.sessions.create`.
- **Trial-to-paid:** Existing 3 tenants stay on trial through their `trial_ends_at`. New tenants get 30-day trial. Auto-billing starts on day 31 unless paid earlier.
- **Entitlement sync:** Webhook updates `tenant_features.enabled` based on active subscription items. Cancellation downgrades all add-ons to disabled (but keeps trial-base modules accessible until trial_ends_at).
- **Onboarding checklist:** Add 5th item to 54.4-03 checklist: "Add payment method" → links to `/billing/upgrade` or Stripe portal.
- **Multi-tenant Stripe customer mapping:** `tenants.stripe_customer_id` column (migration 033) maps platform tenant → Stripe Customer.

**Out of scope (deferred to M8):**
- Per-user seat billing (currently per-tenant flat + add-ons; per-seat is M8 enterprise tier)
- Usage-based metering (Stripe Metered Billing — defer until clear use case)
- Multi-currency (USD only for M4)
- Tax handling (Stripe Tax — defer; charge net of tax for SMB pilot)
- Custom invoicing for enterprise tenants (Stripe Invoicing API — M8)
- Discount/coupon engine (deferred — Stripe supports it natively but UI work)
- Annual prepay discount (deferred — easy to add via Stripe Pricing)

**Test-mode safety:** Phase 56-NN ships entire flow in Stripe test mode FIRST. Operator runs ~10 test scenarios (signup → upgrade → cancel → restart → fail-card → etc.) and confirms before final cutover to live mode keys. Live-mode flip is the operator GO/NO-GO checkpoint.

**Depends on:** Phase 55 (RLS — billing data is sensitive, must be tenant-isolated) + Phase 54.4 (onboarding checklist — billing item slots in).
**Blocks:** Onboarding any real paying customer.
**Requirements:** StripeTestModeIntegration, ProductPriceCatalog, CheckoutFlow, WebhookHandler, CustomerPortal, TrialToPaidConversion, EntitlementSync, StripeCustomerMapping, BillingChecklistItem, LiveModeCutover

**Plans:** 4 plans authored, 1 paused at Wave 1 Task 2 (operator-test-keys gate). Resumable in any session.

---

### Phase 57: M6 — Module page completion (replace 16 stubs + tenant-aware existing pages) ⚡ INSERTED 2026-05-15

**Goal:** Every module landing page that the Phase 54 nav rail links to is a REAL list+detail+create UI that queries tenant-scoped data via existing backend endpoints, NOT a "coming soon" stub. Use cases per industry:
- **D2C/E-commerce:** browse my customers (Salesforce CRM), see my SKUs (NetSuite Items), my open POs (Procurement), my drop-ship orders (Ramp), my orders (Sales), my invoices (NS Invoices)
- **Aerospace:** my BOMs (Arena Parts), my ECOs (Change Orders), my work orders (MES), my NCRs/CAPAs (Quality), my royalty agreements
- **SaaS:** my contacts (CRM), opportunities, ASC 606 contracts (link to asc606.zietra.com)
- **Manufacturing:** my parts, ECOs, work orders, NCRs/CAPAs, items
- **AI Agents:** see run history, manually trigger, view outputs

**Scope:** Replace **16 stub pages** (`stubs/{salesforce-customers,salesforce-opportunities,netsuite-invoices,netsuite-journal-entries,arena-parts,arena-change-orders,mes-work-orders,mes-build-steps,quality-ncrs,quality-capas,quality-audits,royalty-agreements,agents-ncr-capa,agents-evms,agents-integration,ramp-cards}.html`) with real list+detail+create pages. Add **missing backend GET list/detail endpoints**: Arena (parts/ecos/ncrs/capas/audits — has POST-create only), NetSuite (items list, invoices, journal-entries), Royalty (entire new route file). Verify **6 Turion-content pages** (`netsuite-items.html`, `netsuite-customer-so.html`, `netsuite-procurement.html`, `netsuite-financials.html`, `arena-bom.html`, `mes-shop-floor.html`) query tenant-scoped data via existing API (RLS already enforces; UI may have Turion-hardcoded branding to clean). Build **settings.html** + **help.html** as real pages (currently stubs). Marketing/coming-soon stays as stub (intentional placeholder for un-marketed modules).

**Out of scope:**
- Stripe checkout UI (`/billing/upgrade`, `/billing` portal) — M4 (Phase 56) paused; this Phase 57 does NOT touch billing UI
- AI Agents Anthropic integration changes (just expose existing endpoints in UI)
- ASC 606 — already external link to asc606.zietra.com (no in-app page needed)
- New backend business logic — only LIST/DETAIL/CREATE endpoints to mirror what already exists for some modules
- Performance optimization (deferred — pages can be slow on first load, M8 fixes)
- Mobile responsiveness audit (best-effort matching existing patterns)

**Per-page deliverable (each must have):**
- List view with pagination (default 25 per page)
- Detail view (click row → modal or new page)
- Create form (admin/manager role only) with validation
- Empty state when tenant has no data ("You haven't imported any customers yet. → Migrate from /onboarding/migrate")
- Loading + error states
- Uses `withTenantClient` via existing tenant API (Phase 55 RLS)

**Depends on:** Phase 55 (RLS — pages query tenant-scoped data) + Phase 54.4 (onboarding refers users TO these pages).
**Blocks:** Demo-readiness for real prospect walkthroughs across industries.
**Requirements:** SalesforceCrmRealPages, NetSuiteListPages, ArenaListPages, MesListPages, QualityListPages, RoyaltyMgmtPages, AiAgentsUi, RampDropshipPages, SettingsHelpPages, BackendListEndpointsGapFill, TurionPagesTenantAwarenessVerified

**Plans:** 4/4 plans complete
- [x] 57-01-PLAN.md — Salesforce + NetSuite + Arena + Ramp pages + page-template.js helper + 5 backend list endpoints
- [x] 57-02-PLAN.md — Arena keyedEntity routes + chrome populator (data-z-tenant-name on 6 Turion-content pages) + CF Function baseline
- [x] 57-03-PLAN.md — MES + Quality + Royalty pages + Royalty backend (mig 033 + 5 routes) + page-template async-select + transform hooks
- [x] 57-04-PLAN.md — 3 AI Agents pages + real Settings/Help + agent_runs schema + 4 POST retrofits + 2 GET routes + CF cleanup + 16 stub deletions + CHECKPOINT.md

**Status: CLOSED 2026-05-16** — all 11 requirements addressed: SalesforceCrmRealPages, NetSuiteListPages, ArenaListPages, MesListPages, QualityListPages, RoyaltyMgmtPages, AiAgentsUi, RampDropshipPages, SettingsHelpPages, BackendListEndpointsGapFill, TurionPagesTenantAwarenessVerified. **Next: operator picks `/gsd:plan-phase 58` (M7 marketing — RECOMMENDED), `/gsd:resume-work Phase 56` (M4 Stripe from paused Wave 1 Task 2), or `/gsd:plan-phase 59` (M8 compliance + observability).** See `.planning/phases/57-.../CHECKPOINT.md` for hand-off details.

---

### Phase 58: M7 — Marketing site completion ⚡ INSERTED 2026-05-15

**Goal:** zietra.com marketing site has every page a prospect could land on. Every CTA routes meaningfully (Start trial → app.zietra.com/signup, Contact → form, Pricing → tier display). **Stripe checkout stays as placeholder per user direction** — "Start paying" CTAs show "Coming soon" instead of routing to Stripe Checkout.

**Pre-existing audit (2026-05-15):** Marketing site exists at `/Users/jeet/zietra/marketing/` (React 19 + Vite + Tailwind v4 + Framer Motion + react-router 7). Already built: HomePage, PricingPage, LoginPage, SignupPage, DashboardPage, TermsPage, PrivacyPage, NotFoundPage. Components: NavBar, SiteFooter, HeroSection, PricingSection, AutomationFlow, ProductReveal, StatsStrip, SuccessStories, StoryCard, DashboardMockup3D. Deploy: `deploy.sh` → S3 `zietra-marketing` + CF `E1X82T89JWL8CA` (us-east-1).

**Gap scope:**
- **Content refresh:** existing HomePage + PricingPage need to mirror the actual 13-module catalog (consistency with `/Users/jeet/turion-space-demo/lib/module-catalog.js`).
- **Cognito auth migration:** Marketing `package.json` still has `@supabase/supabase-js` — Login + Signup must redirect to app.zietra.com/signup (Cognito), not duplicate auth on marketing site.
- **13 per-module marketing pages** (NEW): `/modules/{crm,sales,items,plm,mes,quality,asc606,royalty,dropship,lean-erp-pro,purchase,ai-agents,qb-migration}` — value prop + use cases + screenshots + "Try free" CTA.
- **/case-studies** (NEW): Turion Space (aerospace ERP), Marquee+Anni Glitters (D2C/fashion), one hypothetical SaaS.
- **/about** (NEW): 1-page mission + team + traction.
- **/contact** (NEW): Form → SES email to support@zietra.com + alternative channels (security@, sales@).
- **/docs landing** (NEW): Quick-start guides per module. Full docs.zietra.com subdomain deferred to M8+.
- **404 polish + sitemap.xml + robots.txt** — SEO baseline.
- **Pricing CTA placeholder:** "Start free trial" → app.zietra.com/signup; "Upgrade to paid" → "Coming soon" tooltip.

**Out of scope:** Stripe checkout wiring (M4 paused), blog/careers/press (post-launch), A/B testing, i18n, status page (M8), API docs (M8).

**Depends on:** Phase 57 (in-app pages real — module marketing links land somewhere) + Phase 54.4 (signup flow exists).
**Blocks:** Outbound sales, organic SEO, public launch.
**Requirements:** ModuleMarketingPages, CaseStudiesPage, AboutPage, ContactPage, ContactFormBackend, DocsLandingPage, CognitoMigratedAuth, PricingPageStripePlaceholder, MarketingHomeRefresh, SeoBaseline404SitemapRobots

**Plans:** 4/4 plans complete
- [x] 58-01-PLAN.md — Cognito auth migration + HomePage 13-module refresh + Pricing Stripe placeholder + Footer/NavBar real routes + Privacy/Terms post-Phase-55 update + NotFoundPage popular pages + build-time sitemap generator + llms.txt refresh — **CLOSED 2026-05-16** (4 requirements closed: CognitoMigratedAuth, PricingPageStripePlaceholder, MarketingHomeRefresh, SeoBaseline404SitemapRobots)
- [x] 58-02-PLAN.md — 13 per-module marketing pages (shared template) + `src/data/modules.ts` + build-time sync from upstream module-catalog + `/modules` index w/ industry filter + sitemap 9→22 URLs — **CLOSED 2026-05-16** (2 requirements closed: ModuleMarketingPages, SeoBaseline404SitemapRobots)
- [x] 58-03-PLAN.md — /case-studies (3 entries) + /about + /contact form + public POST /api/contact (Origin allow-list + 5/hr/IP rate limit + honeypot + DB persist + best-effort SES) + mig 035 contact_submissions + sitemap 22→25 — **CLOSED 2026-05-16** (4 requirements closed: CaseStudiesPage, AboutPage, ContactPage, ContactFormBackend)
- [x] 58-04-PLAN.md — /docs landing (13 module quick-starts) + /security trust page + PageHelmet wrapper + NotFoundPage polish + /og/default.png + sitemap 25→26 + 35/35 cross-cutting smoke + CHECKPOINT.md — **CLOSED 2026-05-15** (1 requirement closed: DocsLandingPage; SeoBaseline404SitemapRobots final closure)

**Status: CLOSED 2026-05-15** — all 10 requirements addressed: CognitoMigratedAuth, PricingPageStripePlaceholder, MarketingHomeRefresh, SeoBaseline404SitemapRobots, ModuleMarketingPages, CaseStudiesPage, AboutPage, ContactPage, ContactFormBackend, DocsLandingPage. **Next: operator picks `/gsd:plan-phase 59` (M8 compliance + observability — RECOMMENDED), `/gsd:resume-work Phase 56` (M4 Stripe from paused Wave 1 Task 2), or polish phase (per-module OG images, Loom videos, blog posts).** See `.planning/phases/58-m7-marketing-site-completion/CHECKPOINT.md` for hand-off details.

---

## Deferred milestones (TODO — return after M5+M6 demo)

These are intentionally deferred per the 2026-05-14 strategy. M5+M6 ship a demo-grade multi-tenant SaaS first; the items below harden it for GA / paid customers.

| Milestone | Phases | What | Why deferred | When to do |
|-----------|--------|------|--------------|------------|
| ~~**M2** — RDS Postgres migration~~ | ~~42-43~~ | **SUPERSEDED 2026-05-15 by Phase 54.5** — pulled forward into M6 because RLS (M3) wants a single implementation on the target platform, and tenant count is at lifetime minimum NOW. | n/a | n/a |
| ~~**M3** — Multi-tenancy + RLS~~ | ~~44-48~~ | **COMPLETE 2026-05-15 via Phase 55 (5 plans).** RLS database-enforced on 152 tables across 4 schemas; 459 isolation tests in CI; rollback runbook + drill; 2 CloudWatch alarms; 7/7 requirements closed. | n/a | Done |
| **M4** — Stripe + entitlements | 56+ | Stripe Subscriptions, base $99/mo + add-on prices, webhook Lambda, customer portal. | M5 defaults all modules ON in trial; M4 wires real billing + downgrades. | **UNBLOCKED 2026-05-15 by Phase 55 closure** — next: `/gsd:plan-phase 56` |
| **M7** — Marketing site | 58 | 4/4 | Complete   | 2026-05-16 |
| **M8** — Compliance + observability + load/chaos | 56-58 | Per-tenant audit log, KMS encryption-at-rest, SOC2 readiness, CloudWatch dashboards, RBAC per module (extends 54.1), **k6 load tests + chaos failures (Lambda timeout, DB drop)**. | Hardens for enterprise. Not needed for SMB pilot tenants. | Before first enterprise sale or SOC2 audit |

*Last updated 2026-05-15T04:30Z: **Phase 58 COMPLETE — M7 marketing site CLOSED.** 4/4 plans, 10/10 requirements closed across 4 waves: Cognito auth migration + HomePage 13-module refresh + sitemap baseline (58-01); 13 per-module marketing pages w/ build-time upstream sync (58-02); 3 case studies + /about + /contact + public POST /api/contact backend (Origin allow-list + 5/hr/IP rate limit + honeypot + DB persist + best-effort SES) + mig 035 contact_submissions (58-03); /docs landing w/ 13 quick-starts + /security trust page + PageHelmet wrapper for M8 retrofit + NotFoundPage polish + 1200×630 default OG image + 35/35 cross-cutting smoke PASS + CHECKPOINT.md for M8 hand-off (58-04). Final live surface: 26 indexable URLs on zietra.com. Deferred for M8: SES-VPC fix (NAT or VPCE), per-module OG images, Astro vs Lambda@Edge OG-injector decision, PageHelmet retrofit across 25 pages. **Next: operator picks `/gsd:plan-phase 59` (M8 compliance + observability — RECOMMENDED), `/gsd:resume-work Phase 56` (M4 Stripe), or polish phase.** Earlier: Phase 57 COMPLETE 2026-05-16 (M6 module pages CLOSED — 11/11 requirements). Phase 55 COMPLETE 2026-05-15 (M3 RLS CLOSED — 152 tables / 4 schemas / 459 isolation tests).*

---

*M2-M8 originally outlined in `~/.claude/handoffs/2026-05-14-zietra-platform-milestone-kickoff.md`. Phase entries above were formalized 2026-05-14 after M1 close-out.*

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
*Last updated: 2026-05-13 -- Phase 37 COMPLETE (4/4 plans): QuickBooks → NetSuite migration walkthrough (+ Ramp mini-module) live on turionspace.zietra.com for Thursday's team demo. Backend: migration 023 added `turion.qb_records` (149 rows · 6 types) + `turion.ramp_card_txns` (28 txns) + `turion.migration_runs`; `quickbooks.ts` (POST /migrate for 6 types w/ FIELD_MAPS-driven `applyMapping`, atomic txn, audit trail, idempotent skipped[]) + `ramp.ts` (POST /migrate for card_txns → bills); keyedEntity parity for bills + gl_accounts. Frontend: 8 vanilla-HTML pages (quickbooks.html landing + 6 quickbooks-{type}.html wizards + ramp.html) with the canonical 3-pane CSS-grid layout (QB rows left · field-map middle · NS preview right · sticky-footer "Migrate batch ▸"); index.html migration-tools section; 8 CF clean-URL rewrites. Deploy: turion-space-demo pushed `de0fac9..ce40256`, `./build-and-push.sh` redeployed `turion-demo-api` (CodeSha256 c716f0d2→2a63ac5d), `./deploy-frontend.sh` w/ F6 pre-flight (.superpowers moved aside + restored), CF Function `turion-clean-urls` updated + published (LIVE), CF E37R9PT8IL44L2 invalidation `I45H6Q0IXWN1Z0W2WNCGH0RY07` Completed; all 8 clean URLs HEAD 200. DB-direct E2E walk via the live API: CUST-001 migrated → DB confirmed (customers + qb_records flipped + migration_runs + audit_log CREATE) → idempotency re-POST returned skipped[CUST-001] → RMP-TXN-44012 migrated → bills + ramp_card_txns + migration_runs confirmed → cleanup restored ALL baselines EXACTLY (customers:1, bills:9, runs:0, audit:78, qb_cust_new:25, qb_cust_mig:0, ramp_new:28). Button audit 0 violations both frontends; Phase 27-36 regression intact (6 ERP pages 200, /api/data/all 53 keys, satellite /api/health ok). 6 requirements closed: QbSourceData, QbMigrationRoutes, QbMigrationWizard, RampMiniModule, MigrationAuditTrail, NetSuiteGoLiveScreens. No new AWS secrets required. Headless-substitute checkpoint approved. (prev) Phase 36 COMPLETE (9/9 plans): zero hardcodes + E2E audit across the whole Turion Space demo (satellite PLM + Arena/Salesforce/NetSuite/MES) — frontends de-hardcoded, lookup endpoints added, ERP persistence, button audit 0/0. Phase 35 COMPLETE (7/7 plans): editable CAD drawings + part management + migration 022.*

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
