# Dollor.ai — Code Complete Sprint Design

**Date:** 2026-03-26
**Goal:** Complete all remaining development phases so only testing remains. After this sprint, the platform enters QA + store submission mode with no further feature development.

---

## Context

Dollor.ai is a matchmaking platform for food delivery and rideshare. As of 2026-03-26:

- **Production backend** is live at `api.dollor.ai` (ECS Fargate, CI/CD via GitHub Actions)
- **iOS apps** (Customer 1127, Driver 233, Restaurant 222) are on TestFlight
- **Android apps** (Customer vC=40, Driver vC=36, Partner vC=35) are on Firebase App Distribution
- **v1.5 Production Readiness** is 91% complete (20/22 plans)
- **v2.0 Compliance & AI Agents** (Phases 14–18) is designed but unbuilt

6 open bugs exist that block App Store/Play Store review or core user flows.

---

## Approach

**Option B — Bugs first, then phases sequentially.**

Fix all known bugs before touching any phase code. This prevents regressions compounding and unblocks App Store review early. After bugs are fixed, execute v1.5 completion then v2.0 in order.

---

## Sprint Order

### Wave 0 — Bug Fixes (Quick Tasks)

Fix all 6 open bugs as atomic quick tasks before any phase work begins.

| ID | Bug | Fix Summary | Blocks |
|----|-----|-------------|--------|
| B1 | Demo Stripe payment broken | Standardize demo password to `DemoCustomer2025!` in `recreate-customer` endpoint; reset production hash via `/api/demo/setup` | App Store review |
| B2 | iOS fare price flickers on first screen | Fix race condition in customer app fare display — 3 diagnosed root causes in price fetch timing | UX quality |
| B3 | iOS customer auth broken post-keychain reset | Verify build 1127 resolves (new provisioning profile); if not, fix provisioning/SSL pinning | App Store review |
| B4 | Rideshare E2E gaps | Execute fix plan from existing diagnosis — backend + iOS fixes across multiple steps in ride lifecycle | Core ride flow |
| B5 | Restaurant ASC metadata wiped | Re-enter App Store Connect metadata (description, keywords, screenshots, category, review info, privacy policy) for Restaurant app | App Store submission |
| B6 | Admin portal UI broken after approval routing | Fix JSX/layout/import issues in change management screens introduced by quick-118 | Admin operations |

**Success criteria:** All 6 bugs have status `resolved` in `.planning/debug/`. Demo flow works end-to-end on production.

---

### Wave 1 — v1.5 Phase Completion

Complete the 4 remaining v1.5 items in sequence.

#### Phase 07: Play Store Publishing (Plan 03)
- Upload AAB bundles for all 3 Android apps (`ai.dollor.customer`, `ai.dollor.driver`, `ai.dollor.partner`)
- Complete store listings (title, description, screenshots, feature graphic) in Play Console
- Complete Data Safety forms for all 3 apps
- Submit all 3 apps for Google Play review
- **Success:** All 3 apps show "In review" status in Play Console

#### Phase 08: DB Password Rotation
- Configure Secrets Manager rotation Lambda for RDS password (30-day schedule)
- Validate full rotation cycle on staging with zero service interruption
- Enable production rotation
- Write runbook documenting process, monitoring checks, and rollback
- **Success:** Production rotation active, at least one successful cycle completed

#### Phase 09: Rideshare E2E Validation
- Build automated pytest covering the full 12-step rideshare lifecycle against staging:
  - Request → bid broadcast → driver bid → customer accept → driver navigate → pickup confirm → ride in progress → dropoff → payment capture → Prop 22 calculation → rating → payout
- Test can run on-demand after any backend deploy
- **Success:** Test passes end-to-end on staging, wired into CI

#### Phase 10 — Plan 03: iOS Live Chat
- Wire Live Chat button in iOS Customer app `HelpSupportView` to open `LiveChatView`
- `LiveChatView` connects to `/api/support/chat` AI backend
- User types message → receives AI text response
- **Success:** Customer can open Live Chat, send a message, and receive a response in the app

---

### Wave 2 — v2.0 Compliance & AI Agents

Execute phases 14–18 in sequential dependency order.

#### Phase 14: Compliance Foundation
- Alembic migration: 6 new tables (`state_compliance_rules`, `tnc_permits`, `driver_compliance_records`, `form_1099_records`, `sales_tax_remittances`, `compliance_events_log`) + seed 51 state rows
- `StateComplianceEngine` class: `get_rule()`, `check_w9_required()`, `check_fee_cap()`, `check_insurance()`
- W-9 gate: `POST /api/driver/w9`, TIN validation stub, payout block
- 1099-NEC nightly job: flag drivers crossing $600 YTD, create `Form1099Record`, send push
- Sales tax: TaxJar stub per-order, hook into order completion
- Nightly compliance batch: fee cap audit, insurance lapse, TNC permit expiry
- Admin API + portal: `/admin/compliance` with 4 tabs (W-9 Queue, 1099 Tracker, State Rules, TNC Permits)
- **Success:** 8 must-haves from ROADMAP verified

#### Phase 15: Onboarding Validation Agents
- LangGraph `CustomerOnboardingGraph`, `DriverOnboardingGraph`, `VendorOnboardingGraph`
- Shared nodes: phone OTP, email confirm, fraud score, state ruleset load
- Driver flow: W-9 gate, Persona license scan, insurance verify, Checkr background check, state gates (MA/NJ block, CA Prop 22 disclosure, NY TLC flag)
- Vendor flow: business license upload, health permit, W-9, city delivery fee cap check
- Wire all 3 graphs into existing registration endpoints
- Admin portal: `/admin/onboarding` — pending reviews queue
- **Success:** Every new registration routes through validated onboarding graph

#### Phase 16: Lifecycle Agents (Food + Rideshare)
- `FoodDeliveryGraph` and `RideShareGraph` as LangGraph StateGraphs in `lifecycle_agents.py`
- All failure paths: no-show fee, driver cancel rate enforcement (suspend at 30%), customer fraud block (3 strikes), payment failure recovery
- Prop 22 hooks: calls `prop22_utils.calculate_prop22_ride_data()` and `calculate_prop22_order_data()` at completion (no duplication of Phase 13)
- Dispute nodes: open support ticket, emit Redis `channel:admin`, freeze payout
- Wire both graphs into existing completion hooks in `order_flow.py` and `bid_routes.py`
- **Success:** All 5 must-haves verified

#### Phase 17: Voice Routing Agent
- `VoiceRouter` class extending existing `voice_agent.py` (does NOT replace it)
- `classify_intent()` maps utterances to 9 intents with priority order (SAFETY_ESCALATION first):
  `SAFETY_ESCALATION`, `ORDER_HELP`, `RIDE_HELP`, `PAYMENT_ISSUE`, `DRIVER_NO_SHOW`, `ACCOUNT_HELP`, `TAX_INQUIRY`, `COMPLAINT`, `GENERAL`
- Each intent handler returns structured response with `escalation=True/False` and `suggested_action`
- `TAX_INQUIRY` reads from `driver_compliance_records` (YTD earnings, 1099 status)
- `SAFETY_ESCALATION` publishes to Redis `channel:admin`
- Wire `VoiceRouter` into existing WebSocket handler
- **Success:** All 4 must-haves verified

#### Phase 18: Ops Orchestrator + Admin Ops Board
- `OpsOrchestrator` LangGraph subscribing to 4 Redis channels: `channel:orders`, `channel:rides`, `channel:compliance`, `channel:admin`
- SLA timers: order prep >25min → push; ride acceptance >5min → re-broadcast; compliance alert → admin push
- Admin API: `GET /admin/ops` full snapshot + sub-routes for orders, rides, compliance, agents, revenue
- Admin portal: `/admin/ops` React page — real-time board, SLA state colors (green/yellow/red), compliance alert queue, agent health, revenue snapshot
- **Success:** All 4 must-haves verified, real-time board updates on Redis events

---

### Wave 3 — E2E Testing Agent (Post-Development)

After all phases complete, a Claude-powered agent runs the full platform E2E:

- **Food delivery flow:** Customer places order → restaurant accepts → driver picks up → delivery confirmed → payment settled
- **Rideshare flow:** Customer requests ride → driver bids → accepted → pickup → dropoff → payment → Prop 22 check
- **Driver onboarding flow:** Registration → document upload → W-9 → background check
- **Vendor onboarding flow:** Registration → license → health permit → menu setup
- **Backend health:** All critical API endpoints return expected responses
- Agent reports failures in plain English, links to the failing step and relevant code

---

## Deployment Strategy

Every phase follows the established CI/CD pipeline:
1. `git push origin main`
2. `gh workflow run deploy-staging.yml --ref main`
3. Smoke test staging
4. `gh workflow run deploy-dollar-ai.yml`
5. Monitor via `gh run watch`

**No manual `docker build`, `aws ecs`, or direct ECR commands.**

---

## Anti-Hallucination Rules (Applied Throughout)

- Never invent API endpoints — verify with `grep` in `*.py` before including in any plan
- Customer registration uses single `name`/`full_name` field (not `first_name`/`last_name`)
- Driver registration uses `first_name` + `last_name` (separate)
- Platform fee: $1 flat food / $1-$3 fare-tiered rideshare (NOT 15% commission)
- `is_active` Boolean for customer status (NOT `CustomerStatus.X` enum)
- All Prop 22 calculations delegate to `prop22_utils.py` — no duplicate implementation in Phases 16-18

---

## Success Criteria (Sprint Complete When)

- [ ] All 6 bugs resolved (status: `resolved` in `.planning/debug/`)
- [ ] All 3 Android apps submitted to Google Play Store
- [ ] DB password rotation live on production (at least 1 cycle)
- [ ] Rideshare E2E test passing on staging, wired to CI
- [ ] iOS Live Chat working end-to-end
- [ ] Phases 14–18 executed and verified (VERIFICATION.md status: `passed` for each)
- [ ] E2E testing agent running against staging
- [ ] No open P0/P1 bugs
