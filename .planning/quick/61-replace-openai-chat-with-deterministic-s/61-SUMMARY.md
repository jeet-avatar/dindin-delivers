---
phase: quick-61
plan: 01
subsystem: api
tags: [support-chat, deterministic, rule-engine, intent-classification, legal]

# Dependency graph
requires:
  - phase: 10-02
    provides: "/api/support/chat endpoint and LiveChatView/LiveChatScreen UI"
provides:
  - "Deterministic rule-based support agent (support_agent.py) with 9 intent handlers"
  - "Zero-LLM text chat endpoint preserving same API contract"
  - "Updated T&C section 7.2 and refund policy with cancellation cutoff rules"
  - "iOS and Android suggestion buttons aligned with agent capabilities"
affects: [10-automated-support, legal, mobile-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: [keyword-based-intent-classification, db-backed-deterministic-responses, optional-jwt-extraction]

key-files:
  created:
    - apps/web/p2p-platform/backend/support_agent.py
  modified:
    - apps/web/p2p-platform/backend/voice_agent.py
    - apps/web/p2p-platform/backend/legal/terms.html
    - apps/web/p2p-platform/backend/legal/refund.html
    - apps/web/p2p-platform/backend/main_new.py
    - apps/ios/customer/eatfaircustomer/Views/LiveChatView.swift

key-decisions:
  - "Keyword-based intent classification with ordered priority (cancel before general order keywords)"
  - "Optional JWT extraction for public endpoint -- unauthenticated users get general info only"
  - "Direct order cancellation for pre-acceptance statuses; escalation email for complex issues"
  - "Removed all AI/LLM branding from mobile apps -- now Dollor Support"

patterns-established:
  - "Deterministic support pattern: keyword -> handler -> DB query or template string -> response"
  - "try_extract_customer: optional auth on public endpoints via JWT decode with silent failure"

requirements-completed: [QUICK-61]

# Metrics
duration: 9min
completed: 2026-03-04
---

# Quick Task 61: Replace OpenAI Chat with Deterministic Support Agent Summary

**Zero-LLM rule-based support agent with keyword intent classification, DB-backed order/ride lookups, order cancellation, refund eligibility checks, and escalation to support@dollor.ai**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-04T03:58:01Z
- **Completed:** 2026-03-04T04:07:37Z
- **Tasks:** 3
- **Files modified:** 7 (across 2 repos)

## Accomplishments
- Created `support_agent.py` with 9 intent handlers covering order status, cancel, refund, delivery, ride, account, pricing, escalation, and general help
- Replaced OpenAI Chat Completions call with deterministic rule engine -- zero LLM cost, zero hallucination
- Updated T&C section 7.2 and refund policy with explicit cancellation cutoff (before restaurant acceptance) and delivery failure scenarios
- Aligned iOS and Android suggestion buttons (6 options) with actual agent capabilities; removed "AI" branding

## Task Commits

Each task was committed atomically:

1. **Task 1: Create support_agent.py and rewire /api/support/chat** - `55c0d994` (feat)
2. **Task 2: Update T&C and refund policy with cancellation/refund rules** - `81771a6c` (feat)
3. **Task 3: Update iOS and Android suggestion buttons** - `56127182` (feat, iOS) + `a6a228d3` (feat, Android repo)

## Files Created/Modified
- `apps/web/p2p-platform/backend/support_agent.py` - New deterministic support agent with 9 intent handlers, keyword classification, DB queries, escalation email
- `apps/web/p2p-platform/backend/voice_agent.py` - Replaced OpenAI chat body with support_agent call; voice path unchanged
- `apps/web/p2p-platform/backend/legal/terms.html` - Section 7.2 rewritten with specific food delivery and rideshare cancellation/refund rules
- `apps/web/p2p-platform/backend/legal/refund.html` - Updated with restaurant acceptance cutoff, delivery failure, and post-acceptance non-refundable language
- `apps/web/p2p-platform/backend/main_new.py` - Added cancellation_policy to /api/legal/terms JSON response
- `apps/ios/customer/eatfaircustomer/Views/LiveChatView.swift` - 6 new suggestion buttons, updated greeting, "Dollor Support" branding
- `(android) app/src/main/java/ai/dollor/customer/ui/help/LiveChatScreen.kt` - Matching 6 suggestions, greeting, "Dollor Support" branding

## Decisions Made
- Used ordered list of (keywords, handler) tuples for intent classification -- first match wins, so "cancel" is checked before "order" to prevent mis-routing
- Optional JWT extraction via try_extract_customer returns None on failure (never throws) since endpoint must stay public
- Direct order cancellation only for pre-acceptance statuses (PENDING_PAYMENT, CONFIRMED, PENDING_RESTAURANT); anything post-acceptance returns guidance
- Delivery failure detection: orders stuck at OUT_FOR_DELIVERY for >2 hours trigger automatic escalation email
- Removed "AI" from all user-facing branding since this is no longer an AI agent

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing test failure in `test_rideshare_cross_platform.py::test_ios_customer_android_driver_accept` (auth requirement for fare estimate endpoint) -- unrelated to this task, not caused by changes

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Support chat endpoint is fully deterministic and ready for production deployment
- Voice path (Twilio + OpenAI Realtime) remains unchanged and functional
- Mobile apps need rebuild and redistribution for updated suggestions/branding

---
*Phase: quick-61*
*Completed: 2026-03-04*
