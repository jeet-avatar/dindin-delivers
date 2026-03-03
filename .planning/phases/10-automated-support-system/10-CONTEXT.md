# Phase 10: Automated Support System - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

One-man company gets fully automated customer support. Three deliverables:
1. Hide aspirational AI features from Restaurant app (keep AI Insights)
2. Twilio + OpenAI Realtime Voice handles incoming calls on 1-800-DOLLOR
3. Fix in-app chat — build order chat UI for food delivery, fix Help screen, wire Live Chat to AI text agent

</domain>

<decisions>
## Implementation Decisions

### AI Feature Visibility (Restaurant App)
- **Keep:** AI Insights tab (Tab 3) — functional, real backend data (demand forecasting, top items, staffing)
- **Hide:** AI Employees / Workforce view (`AIEmployeesView.swift`) — aspirational, Firebase-based mock
- **Hide:** AI Feature Toggles in Settings (Demand Prediction, Prep Time, Menu Suggestions) — placeholder, not wired
- **Hide:** AI Suggestion Banner in Orders Dashboard (`EnhancedDashboardView.swift`) — never populated
- **Method:** Compile-time feature flag (`#if ENABLE_AI_EMPLOYEES`) — easy to restore later
- **Scope:** Flag Restaurant app views and navigation links only — shared models in eatfair-ios-shared stay untouched
- **Backend:** Leave mock endpoint `/api/erp/analytics/ai-employees` as-is (harmless)

### Voice Agent Scope & Personality
- **Purpose:** Full support agent — order issues, complaints, refunds, account help, restaurant/driver help
- **Identity:** Transparent AI — "Hi, this is Dollor AI support" — honest about being AI
- **Voice:** Claude's discretion (pick best OpenAI Realtime voice for a support agent)
- **Phone number:** Use existing 1-800-DOLLOR vanity number (+1-800-365-5671) — already referenced in apps
- **Caller auth:** Phone number match — match caller ID to account phone number
- **User types:** All three (customers, drivers, restaurants) — AI routes based on phone number match to role
- **Refunds:** Escalate only — AI logs the request and promises follow-up, user approves manually
- **Architecture:** Add Twilio webhook endpoints to existing FastAPI backend (main_new.py) — no new microservice

### Chat Fix Scope
- **Order chat UI:** Build new chat view for food delivery orders (backend API already exists at `/api/customer/orders/{order_id}/chat`)
- **Chat parties:** Customer chats with delivery driver only (like rideshare DriverChatView pattern)
- **Driver app:** Yes — add order chat to both Customer and Driver apps for two-way communication
- **Help screen fixes:**
  - Fix phone number: Replace placeholder `+18001234567` with `+18003655671` (1-800-DOLLOR)
  - Wire Live Chat: Connect to AI text agent (same backend as voice agent, text interface)
- **Pattern:** Follow existing DriverChatView.swift as template for order chat UI

### Escalation & Fallback
- **Escalation path:** AI collects details and emails summary to support@dollor.ai — user calls back later
- **Call recording:** Record with consent — standard "This call may be recorded" disclosure at start
- **Call duration limit:** Claude's discretion (pick a reasonable limit)

### Claude's Discretion
- OpenAI Realtime voice selection (best for customer support)
- Call duration limit before suggesting the caller leave a message
- Order chat UI layout details (follow existing DriverChatView patterns)
- AI agent greeting script and conversation flow structure
- Text chat UI for Live Chat feature

</decisions>

<specifics>
## Specific Ideas

- Rideshare DriverChatView.swift (318 lines) is the proven template for chat — same quick-action messages, polling pattern, UI layout
- Order chat backend already complete: `GET/POST /api/customer/orders/{order_id}/chat` with conversation tracking and unread counts
- WebSocketManager.swift already has `onChatMessage` handler (line 342) — could upgrade from REST polling to WebSocket later
- HelpSupportView.swift has Live Chat button at line 89 with empty action (`// Open chat`)
- AI agent needs access to: order lookup, ride lookup, account lookup, driver/restaurant status — all existing backend endpoints

</specifics>

<deferred>
## Deferred Ideas

- WebSocket upgrade for chat (currently REST polling every 3s) — performance improvement for future phase
- Restaurant chat (customer <-> restaurant) — could be added later
- AI agent issuing direct refunds via Stripe — currently escalate-only, could automate later with safeguards
- Call analytics dashboard — track call volume, resolution rate, escalation rate

</deferred>

---

*Phase: 10-automated-support-system*
*Context gathered: 2026-03-02*
