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
*Last updated: 2026-03-29 -- Phase 19 added (CDJ-3000 Waveform Replica for MixMind)*
