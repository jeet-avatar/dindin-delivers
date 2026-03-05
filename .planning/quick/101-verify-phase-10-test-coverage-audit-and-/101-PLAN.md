---
phase: quick-101
plan: 101
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/tests/unit/test_order_chat.py
  - apps/web/p2p-platform/backend/tests/unit/test_support_chat.py
  - apps/web/p2p-platform/backend/tests/unit/test_voice_agent.py
autonomous: true
requirements: [PHASE10-COVERAGE]
must_haves:
  truths:
    - "Order chat GET/POST endpoints have dedicated test coverage"
    - "Support chat endpoint has dedicated test coverage with intent classification"
    - "Voice agent incoming-call endpoint has dedicated test coverage"
    - "All new tests pass alongside existing test suite"
  artifacts:
    - path: "apps/web/p2p-platform/backend/tests/unit/test_order_chat.py"
      provides: "Order chat endpoint tests"
      min_lines: 80
    - path: "apps/web/p2p-platform/backend/tests/unit/test_support_chat.py"
      provides: "Support chat + intent classification tests"
      min_lines: 100
    - path: "apps/web/p2p-platform/backend/tests/unit/test_voice_agent.py"
      provides: "Voice agent TwiML webhook tests"
      min_lines: 40
  key_links:
    - from: "tests/unit/test_order_chat.py"
      to: "/api/customer/orders/{id}/chat"
      via: "TestClient GET/POST"
      pattern: "client\\.(get|post).*orders.*chat"
    - from: "tests/unit/test_support_chat.py"
      to: "/api/support/chat"
      via: "TestClient POST"
      pattern: "client\\.post.*support/chat"
    - from: "tests/unit/test_voice_agent.py"
      to: "/api/voice/incoming-call"
      via: "TestClient POST"
      pattern: "client\\.post.*voice/incoming-call"
---

<objective>
Add dedicated backend test coverage for all Phase 10 features: Order Chat, Support Chat (deterministic rule-based), and Voice Agent endpoints. Currently these endpoints only have contract-level status-code checks in test_ios_api_contracts.py but no functional tests verifying behavior (message creation, intent classification, TwiML response format).

Purpose: Close the Phase 10 test coverage gap before marking the phase fully verified.
Output: 3 new test files covering all Phase 10 backend endpoints with behavioral assertions.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/p2p-platform/backend/tests/conftest.py
@apps/web/p2p-platform/backend/main_new.py (lines 16690-16800 — order chat endpoints)
@apps/web/p2p-platform/backend/voice_agent.py (lines 85-100 — incoming-call, lines 309-330 — support/chat)
@apps/web/p2p-platform/backend/support_agent.py (intent classification + handlers)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Order Chat endpoint tests</name>
  <files>apps/web/p2p-platform/backend/tests/unit/test_order_chat.py</files>
  <action>
Create test file for order chat endpoints using conftest fixtures (client, test_customer, customer_auth_headers, db_session).

Tests to write:
1. `test_get_order_chat_no_order` — GET `/api/customer/orders/99999/chat` with customer auth returns 404
2. `test_get_order_chat_empty` — Create an Order in db_session (customer_email=test_customer.email), GET the chat, expect empty list `[]`
3. `test_send_order_chat_message` — Create an Order, POST `/api/customer/orders/{id}/chat` with `{"message": "Hello", "sender_type": "customer"}`, expect 200 with success response
4. `test_get_order_chat_after_send` — After sending a message, GET returns list with 1 message containing correct fields (id, order_id, sender_type, message, created_at)
5. `test_order_chat_wrong_customer` — Create order with different customer_email, verify 403 access denied
6. `test_order_chat_alias_routes` — Verify `/api/orders/{id}/chat` alias works same as `/api/customer/orders/{id}/chat`

For creating Order records, import Order from models and create with minimal fields: `Order(customer_email=test_customer.email, status=OrderStatus.CONFIRMED, total_amount=10.0)`. Check which fields are required by looking at existing test files for patterns — may need `restaurant_name`, `items`, etc. Use db_session.add + commit + refresh.

Do NOT define a local `client` fixture — always use the conftest `client` fixture.
  </action>
  <verify>
cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && python -m pytest tests/unit/test_order_chat.py -v
  </verify>
  <done>All 6 order chat tests pass. GET returns empty list for new orders, POST creates messages, wrong customer gets 403, alias routes work.</done>
</task>

<task type="auto">
  <name>Task 2: Support Chat and Voice Agent tests</name>
  <files>
    apps/web/p2p-platform/backend/tests/unit/test_support_chat.py
    apps/web/p2p-platform/backend/tests/unit/test_voice_agent.py
  </files>
  <action>
**test_support_chat.py** — Tests for POST `/api/support/chat` and the deterministic intent classifier in support_agent.py.

Endpoint tests (using client fixture):
1. `test_support_chat_empty_message` — POST with `{"message": ""}` returns 400
2. `test_support_chat_invalid_json` — POST with invalid body returns 400
3. `test_support_chat_hello` — POST with `{"message": "hello"}` returns 200 with `success=True` and non-empty `response` string
4. `test_support_chat_pricing_intent` — POST with `{"message": "how much does delivery cost?"}` returns 200 with response mentioning pricing/fee info
5. `test_support_chat_order_status_no_auth` — POST with `{"message": "where is my order"}` returns 200 (public endpoint, no auth needed) with a response about logging in or providing order details
6. `test_support_chat_escalate` — POST with `{"message": "talk to human"}` returns 200 with escalation response

Unit tests for intent classification (direct function calls, no HTTP):
7. `test_classify_intent_cancel` — `_classify_intent("I want to cancel my order")` returns `"_handle_cancel"`
8. `test_classify_intent_refund` — `_classify_intent("I want a refund")` returns `"_handle_refund"`
9. `test_classify_intent_ride` — `_classify_intent("where is my ride")` returns `"_handle_ride_status"`
10. `test_classify_intent_general_fallback` — `_classify_intent("asdfghjkl")` returns `"_handle_general"`

Import `_classify_intent` from `support_agent` for unit tests.

**test_voice_agent.py** — Tests for POST `/api/voice/incoming-call`.

1. `test_incoming_call_returns_twiml` — POST `/api/voice/incoming-call` returns 200 with XML content type containing `<Response>` and `<Connect>` and `<Stream>` TwiML elements. Mock `twilio.twiml.voice_response.VoiceResponse` if twilio import fails — but try without mocking first since twilio is in requirements.txt.
2. `test_incoming_call_get_method` — GET `/api/voice/incoming-call` also returns 200 (route accepts both GET and POST via api_route)
3. `test_incoming_call_twiml_has_stream_url` — Response body contains a WebSocket stream URL pattern (`wss://` or `/api/voice/media-stream`)

Note: The voice endpoint uses `@router.api_route` with `methods=["GET", "POST"]` and the router is included in main_new.py. The endpoint does NOT require authentication (it's in the auth allowlist).

Do NOT define a local `client` fixture — always use the conftest `client` fixture.
  </action>
  <verify>
cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && python -m pytest tests/unit/test_support_chat.py tests/unit/test_voice_agent.py -v
  </verify>
  <done>All support chat tests pass (6 endpoint + 4 intent classification). All 3 voice agent tests pass. Intent classifier correctly maps keywords to handlers.</done>
</task>

<task type="auto">
  <name>Task 3: Full test suite regression check</name>
  <files></files>
  <action>
Run the complete test suite to verify no regressions from the new test files. Run:
```
cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend
python -m pytest tests/unit/ -v --tb=short
```

If any pre-existing tests fail, do NOT modify them — note failures in the summary as pre-existing. If new tests fail, fix them.

Also verify test count increased by the expected number (~19 new tests).
  </action>
  <verify>
cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && python -m pytest tests/unit/ -v --tb=short 2>&1 | tail -5
  </verify>
  <done>Full unit test suite passes with no regressions. New test count matches expected additions (~19 new tests across 3 files).</done>
</task>

</tasks>

<verification>
- All 3 new test files exist and contain meaningful behavioral tests (not just status code checks)
- `pytest tests/unit/test_order_chat.py tests/unit/test_support_chat.py tests/unit/test_voice_agent.py -v` passes
- No regressions in existing test suite
- Phase 10 endpoints covered: `/api/customer/orders/{id}/chat` (GET+POST), `/api/support/chat` (POST), `/api/voice/incoming-call` (GET+POST)
</verification>

<success_criteria>
- 3 new test files with ~19 tests total
- Order chat: CRUD operations, auth enforcement, alias routes
- Support chat: intent classification, endpoint responses, edge cases
- Voice agent: TwiML format, multi-method support
- Zero test regressions
</success_criteria>

<output>
After completion, create `.planning/quick/101-verify-phase-10-test-coverage-audit-and-/101-SUMMARY.md`
</output>
