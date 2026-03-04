---
phase: quick-61
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/support_agent.py
  - apps/web/p2p-platform/backend/voice_agent.py
  - apps/web/p2p-platform/backend/legal/terms.html
  - apps/web/p2p-platform/backend/legal/refund.html
  - apps/web/p2p-platform/backend/main_new.py
  - apps/ios/customer/eatfaircustomer/Views/LiveChatView.swift
  - /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/help/LiveChatScreen.kt
autonomous: true
requirements: [QUICK-61]
must_haves:
  truths:
    - "POST /api/support/chat returns deterministic responses from DB lookups and predefined text, never LLM output"
    - "Authenticated customers can check order status, cancel pre-acceptance orders, and get refund eligibility info"
    - "Unauthenticated users get general info and are prompted to log in for account-specific actions"
    - "Complex issues (payment disputes, complaints) are escalated via email to support@dollor.ai"
    - "T&C and refund pages clearly state cancellation cutoff and refund eligibility rules"
    - "iOS and Android suggestion buttons match the agent's actual capabilities"
  artifacts:
    - path: "apps/web/p2p-platform/backend/support_agent.py"
      provides: "Deterministic rule-based support agent with intent classification and DB-backed handlers"
      min_lines: 200
    - path: "apps/web/p2p-platform/backend/voice_agent.py"
      provides: "Modified /api/support/chat endpoint calling support_agent instead of OpenAI"
    - path: "apps/web/p2p-platform/backend/legal/terms.html"
      provides: "Updated T&C section 7.2 with specific cancellation/refund rules"
    - path: "apps/web/p2p-platform/backend/legal/refund.html"
      provides: "Updated refund policy with explicit cancellation cutoff language"
  key_links:
    - from: "apps/web/p2p-platform/backend/voice_agent.py"
      to: "apps/web/p2p-platform/backend/support_agent.py"
      via: "import and function call"
      pattern: "from support_agent import handle_support_message"
    - from: "apps/web/p2p-platform/backend/support_agent.py"
      to: "models.py"
      via: "SQLAlchemy queries"
      pattern: "db\\.query\\(Order\\)|db\\.query\\(Customer\\)"
    - from: "apps/web/p2p-platform/backend/support_agent.py"
      to: "email_service.py"
      via: "escalation email"
      pattern: "send_email.*support@dollor\\.ai"
---

<objective>
Replace the OpenAI-powered /api/support/chat endpoint with a deterministic, rule-based support agent that provides zero-hallucination customer support through keyword-based intent classification and direct database lookups.

Purpose: Eliminate LLM dependency and cost for text chat support while providing accurate, DB-backed responses. The agent can look up orders, cancel pre-acceptance orders, check refund eligibility, and escalate complex issues via email. Also update T&C/refund legal pages and mobile suggestion buttons to match agent capabilities.

Output: New `support_agent.py` module, modified chat endpoint, updated legal pages, updated iOS/Android suggestion buttons.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/p2p-platform/backend/voice_agent.py (lines 310-378: current OpenAI chat endpoint; lines 270-306: _lookup_caller helper)
@apps/web/p2p-platform/backend/voice_agent_tools.py (existing tool implementations: lookup_order, lookup_ride, lookup_account, log_escalation — reuse _format_order and _format_ride patterns)
@apps/web/p2p-platform/backend/models.py (OrderStatus enum at line 386, Order model at line 409, Customer at line 579)
@apps/web/p2p-platform/backend/main_new.py (line 343: /api/support/chat in auth allowlist — KEEP it there; lines 8567-8581: _VALID_ORDER_TRANSITIONS)
@apps/web/p2p-platform/backend/auth_utils.py (JWT decode pattern, _SECRET_KEY, _ALGORITHM)
@apps/web/p2p-platform/backend/email_service.py (send_email signature at line 360: to_email, subject, html_body, text_body, skip_validation)
@apps/web/p2p-platform/backend/legal/terms.html (section 7.2 at line 425: current cancellation language)
@apps/web/p2p-platform/backend/legal/refund.html (lines 98-124: current food delivery refund scenarios)
@apps/ios/customer/eatfaircustomer/Views/LiveChatView.swift (line 14-19: current suggestions array)
@/Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/help/LiveChatScreen.kt (line 116: current suggestions list)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create support_agent.py and rewire /api/support/chat</name>
  <files>
    apps/web/p2p-platform/backend/support_agent.py
    apps/web/p2p-platform/backend/voice_agent.py
  </files>
  <action>
Create `apps/web/p2p-platform/backend/support_agent.py` — a fully deterministic, rule-based support agent with ZERO LLM dependency.

**Architecture:**

1. **`handle_support_message(message: str, customer: Optional[Customer], db: Session) -> dict`** — Main entry point. Returns `{"response": str, "action": Optional[str], "data": Optional[dict]}`.

2. **Intent classification** via keyword matching (NO ML). Define a dict mapping keyword sets to intent handlers:
   - `{"cancel", "cancel order", "cancel my order"}` -> `_handle_cancel`
   - `{"status", "where is", "where's my", "track", "order status", "my order"}` -> `_handle_order_status`
   - `{"refund", "money back", "get refund", "refund eligible"}` -> `_handle_refund`
   - `{"help", "support", "contact", "talk to human", "agent", "speak to someone", "escalate"}` -> `_handle_escalate`
   - `{"delivery", "driver", "late", "delayed", "taking long"}` -> `_handle_delivery_issue`
   - `{"ride", "ride status", "my ride", "rideshare"}` -> `_handle_ride_status`
   - `{"account", "login", "password", "reset password"}` -> `_handle_account`
   - `{"pricing", "fee", "how much", "cost", "charge"}` -> `_handle_pricing`
   - `{"hours", "open", "restaurant hours"}` -> `_handle_general`
   - Default/no match -> `_handle_general`

   Intent matching: lowercase the message, check if any keyword set has a substring match. Priority order matters — check "cancel" before general "order" keywords. Use a list of `(keywords, handler)` tuples checked in order so first match wins.

3. **Intent handlers** (each is a standalone function taking `message: str, customer: Optional[Customer], db: Session`):

   **`_handle_order_status`**: If no customer, return "Please log in to check your order status." If customer, query `db.query(Order).filter(Order.customer_id == customer.id).order_by(Order.created_at.desc()).limit(3).all()`. Format each order as: "Order #{order_number} — {_friendly_status(status)} (placed {relative_time})". If no orders found: "You don't have any recent orders."

   **`_handle_cancel`**: If no customer, return "Please log in to cancel an order." If customer, find their most recent non-terminal order. Check if `order.status` is in `{OrderStatus.PENDING_PAYMENT, OrderStatus.CONFIRMED, OrderStatus.PENDING_RESTAURANT}` — these are cancellable (restaurant has NOT yet accepted). If cancellable: set `order.status = OrderStatus.CANCELLED`, set `order.cancelled_at = datetime.utcnow()`, `db.commit()`, return "Your order #{order_number} has been cancelled. If you were charged, a refund will be processed within 1-3 business days." If NOT cancellable (status is PREPARING or later): return "Sorry, order #{order_number} cannot be cancelled because the restaurant has already started preparing it. You can request a refund by saying 'refund'." If no active orders: "You don't have any active orders to cancel."

   **`_handle_refund`**: If no customer, return "Please log in to check refund eligibility." If customer, find most recent order. Determine eligibility: FULL refund if status in `{PENDING_PAYMENT, CONFIRMED, PENDING_RESTAURANT, DECLINED_BY_RESTAURANT, RESTAURANT_TIMEOUT, CANCELLED}`. POSSIBLE refund if `DELIVERED` and `order.delivered_at` was less than 48 hours ago. NOT eligible if `DELIVERED` and over 48 hours. For POSSIBLE/NOT eligible, instruct: "For refund requests on delivered orders, please email support@dollor.ai with your order number and reason. Our team will review within 24 hours." For any order with driver delivery failure (status stuck at OUT_FOR_DELIVERY for >2 hours): "Your order appears to have a delivery issue. You're eligible for a full refund. We've escalated this to our team." — and call `_send_escalation_email(...)`.

   **`_handle_delivery_issue`**: If no customer, return "Please log in to check your delivery." If customer, find most recent active order (not DELIVERED/CANCELLED). If status is `OUT_FOR_DELIVERY`: return "Your order #{order_number} is out for delivery" + driver name if available. If `PREPARING` or `READY_FOR_PICKUP`: return "Your order is being prepared by the restaurant. The driver will be assigned once it's ready." If no active order: "You don't have any active deliveries right now."

   **`_handle_ride_status`**: If no customer, return "Please log in to check your ride." If customer, query `db.query(RideRequest).filter(RideRequest.customer_id == customer.id).order_by(RideRequest.created_at.desc()).limit(3).all()`. Format similarly to orders. Import `RideRequest` from `models`.

   **`_handle_account`**: Return predefined text: "For password reset, use the 'Forgot Password' option in the app. For other account issues, email support@dollor.ai."

   **`_handle_pricing`**: Return predefined pricing text from CLAUDE.md ground truth: "Dollor.ai charges a flat matchmaking fee:\n- Food delivery: $1 service fee for customers, $1 per order for restaurants. Drivers keep 100% of delivery fees and tips.\n- Rideshare: $1 fee for fares up to $35, $2 for $35-70, $3 for over $70. Drivers keep the rest plus 100% of tips.\n\nWe never take a percentage commission."

   **`_handle_escalate`**: Send escalation email to support@dollor.ai using `send_email(to_email="support@dollor.ai", subject=..., html_body=..., skip_validation=True)`. Include customer info if authenticated. Return "I've escalated your request to our support team at support@dollor.ai. They'll follow up within 24 hours. You can also email them directly."

   **`_handle_general`**: Return "I can help you with:\n- Check order status\n- Cancel an order\n- Refund eligibility\n- Delivery updates\n- Ride status\n- Pricing info\n\nWhat would you like help with? For complex issues, I can connect you with our support team."

4. **Helper functions:**
   - `_friendly_status(status: OrderStatus) -> str`: Map enum values to human-readable text. E.g., `PENDING_PAYMENT` -> "Awaiting payment", `CONFIRMED` -> "Confirmed", `PENDING_RESTAURANT` -> "Waiting for restaurant", `PREPARING` -> "Being prepared", `READY_FOR_PICKUP` -> "Ready for pickup", `OUT_FOR_DELIVERY` -> "Out for delivery", `DELIVERED` -> "Delivered", `CANCELLED` -> "Cancelled", `DECLINED_BY_RESTAURANT` -> "Declined by restaurant", `RESTAURANT_TIMEOUT` -> "Restaurant didn't respond".
   - `_relative_time(dt: datetime) -> str`: Return "X minutes ago", "X hours ago", "yesterday", "X days ago".
   - `_send_escalation_email(issue_type: str, summary: str, customer: Optional[Customer], db: Session)`: Use same pattern as `voice_agent_tools.log_escalation` — call `send_email` with `skip_validation=True`.
   - `_try_extract_customer(request: Request, db: Session) -> Optional[Customer]`: Extract JWT from Authorization header (if present), decode with `_SECRET_KEY`/`_ALGORITHM` from `auth_utils.py` pattern, look up Customer. Return None on any failure (no exception — endpoint stays public).

**Modify `voice_agent.py`** (lines 310-378):
- Replace the `support_text_chat` function body. Keep the same `@router.post("/api/support/chat", tags=["Support"])` decorator and `async def support_text_chat(request: Request, db: Session = Depends(get_db))` signature.
- New body: parse JSON body for "message" field. Call `_try_extract_customer(request, db)` to optionally get customer. Call `handle_support_message(message, customer, db)`. Return `{"success": True, "response": result["response"]}`.
- Remove the `import httpx` inside the function, remove `OPENAI_API_KEY` check for chat (keep it for voice), remove the httpx call to OpenAI.
- Add import at top of file: `from support_agent import handle_support_message, try_extract_customer`.
- Keep ALL other code in voice_agent.py unchanged (Twilio voice, media stream, _lookup_caller, session init).

**Critical rules:**
- NEVER generate free-form text — every response string is a hardcoded template with DB field interpolation only.
- Keep `/api/support/chat` in the auth allowlist at `main_new.py:343` — it must work WITHOUT auth (unauthenticated gets general info).
- Import Order, Customer, RideRequest, OrderStatus, Driver from models.
- Import send_email from email_service.
- Use `jose.jwt.decode` for optional JWT extraction (same pattern as auth_utils.py).
  </action>
  <verify>
1. `cd apps/web/p2p-platform/backend && python -c "from support_agent import handle_support_message; print('import OK')"`
2. `grep -c "openai" apps/web/p2p-platform/backend/voice_agent.py` — the text chat section should NOT reference openai (voice section still will).
3. `grep "handle_support_message" apps/web/p2p-platform/backend/voice_agent.py` confirms the wiring.
4. `python -c "from voice_agent import router; print('router OK')"` confirms voice_agent.py still imports cleanly.
5. `cd apps/web/p2p-platform/backend && pytest tests/ -v -x --timeout=30 2>&1 | tail -20` — no regressions.
  </verify>
  <done>
- `support_agent.py` exists with handle_support_message function, 8+ intent handlers, keyword-based classification, all using DB queries or predefined text only.
- `/api/support/chat` endpoint in voice_agent.py calls support_agent instead of OpenAI.
- No OpenAI/httpx dependency in the chat path. Voice path remains unchanged.
- Same API contract preserved: `{"message": "..."}` in, `{"success": true, "response": "..."}` out.
- Authenticated requests can do order lookup, cancel, refund check. Unauthenticated get general info.
  </done>
</task>

<task type="auto">
  <name>Task 2: Update T&C and refund policy with cancellation/refund rules</name>
  <files>
    apps/web/p2p-platform/backend/legal/terms.html
    apps/web/p2p-platform/backend/legal/refund.html
    apps/web/p2p-platform/backend/main_new.py
  </files>
  <action>
**Update `legal/terms.html`** section 7.2 (line 425-431). Replace the existing vague cancellation bullet points with specific, enforceable language:

```html
<h3>7.2 Refunds and Cancellations</h3>
<p><strong>Food Delivery Orders:</strong></p>
<ul>
    <li><strong>Before restaurant acceptance:</strong> Orders can be cancelled for a full refund at any time before the restaurant accepts and begins preparation.</li>
    <li><strong>After restaurant acceptance:</strong> Once a restaurant has accepted your order and begun preparation, the order cannot be cancelled through the app. You may request a refund by contacting support@dollor.ai.</li>
    <li><strong>Restaurant cancellation or timeout:</strong> If the restaurant declines your order or fails to respond within the acceptance window, your payment is automatically refunded in full.</li>
    <li><strong>Delivery failure:</strong> If your order is not delivered due to driver issues, you are eligible for a full refund.</li>
    <li><strong>Quality or accuracy issues:</strong> Report through the app or contact support@dollor.ai within 48 hours of delivery for review.</li>
</ul>
<p><strong>Rideshare:</strong></p>
<ul>
    <li>Cancellation before driver assignment: No charge.</li>
    <li>Cancellation after driver assignment and en route: A cancellation fee may apply.</li>
    <li>Driver cancellation or no-show: No charge to rider.</li>
</ul>
<p>All refunds are processed within 1-5 business days to the original payment method. For refund requests, email <a href="mailto:support@dollor.ai">support@dollor.ai</a> with your order/ride number.</p>
```

**Update `legal/refund.html`** (lines 98-124). Update the "Full Refund Scenarios" section to explicitly mention the restaurant acceptance cutoff:

In the "Full Refund Scenarios" `<ul>` (line 101-107), update the second bullet:
- Change: `<li><strong>Cancellation before preparation:</strong> If you cancel before the restaurant begins preparing your order</li>`
- To: `<li><strong>Cancellation before restaurant acceptance:</strong> If you cancel before the restaurant has accepted your order. Once accepted, the order cannot be cancelled through the app.</li>`

Add a new bullet after "Restaurant cancellation":
- `<li><strong>Delivery failure:</strong> If your order was not delivered due to a driver issue and delivery cannot be completed</li>`

In the "Non-Refundable Situations" `<ul>` (line 117-124), add:
- `<li>Orders cancelled after the restaurant has accepted and begun preparation (partial refund may be available upon review)</li>`

**Update T&C API** in `main_new.py`: Find the `get_terms_of_service()` function at line 17959. Add a `"cancellation_policy"` key to the returned JSON summary:

```python
"cancellation_policy": {
    "food_delivery": {
        "cancellable_statuses": ["pending_payment", "confirmed", "pending_restaurant"],
        "non_cancellable_after": "Restaurant has accepted the order",
        "refund_timeline": "1-3 business days"
    },
    "rideshare": {
        "free_cancellation": "Before driver assignment",
        "cancellation_fee": "After driver assigned and en route"
    }
},
```

Add this inside the `"summary"` dict, after `"key_points"`.
  </action>
  <verify>
1. `grep -A5 "7.2 Refunds" apps/web/p2p-platform/backend/legal/terms.html` — shows updated section.
2. `grep "restaurant acceptance" apps/web/p2p-platform/backend/legal/refund.html` — confirms new language.
3. `grep "cancellation_policy" apps/web/p2p-platform/backend/main_new.py` — confirms API update.
4. `cd apps/web/p2p-platform/backend && python -c "from main_new import app; print('app OK')"` — no syntax errors.
  </verify>
  <done>
- terms.html section 7.2 explicitly states: orders cannot be cancelled once restaurant has accepted; refunds available if restaurant hasn't accepted or driver failed to deliver.
- refund.html updated with restaurant acceptance cutoff language and delivery failure scenario.
- /api/legal/terms JSON includes cancellation_policy with specific cancellable statuses.
  </done>
</task>

<task type="auto">
  <name>Task 3: Update iOS and Android suggestion buttons to match agent capabilities</name>
  <files>
    apps/ios/customer/eatfaircustomer/Views/LiveChatView.swift
    /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/help/LiveChatScreen.kt
  </files>
  <action>
**iOS — `LiveChatView.swift`** (line 14-19):
Replace the `suggestions` array:
```swift
private let suggestions = [
    "Where is my order?",
    "Cancel my order",
    "Refund request",
    "Delivery issue",
    "Ride status",
    "Pricing info"
]
```

These map directly to the support_agent intent handlers:
- "Where is my order?" -> `_handle_order_status` (keywords: "where is", "order")
- "Cancel my order" -> `_handle_cancel` (keyword: "cancel")
- "Refund request" -> `_handle_refund` (keyword: "refund")
- "Delivery issue" -> `_handle_delivery_issue` (keyword: "delivery")
- "Ride status" -> `_handle_ride_status` (keyword: "ride status")
- "Pricing info" -> `_handle_pricing` (keyword: "pricing")

Also update the initial greeting message (line 44) to be more specific:
```swift
text: "Hi! I'm Dollor Support. I can help you check order status, cancel orders, check refund eligibility, and more. What do you need help with?",
```

Remove "AI" from the greeting — this is no longer an AI agent, it's a deterministic rule engine. Also update the ChatBubble label "Dollor AI" (line 206) to just "Dollor Support". And the sparkles icon (line 203-204) can stay — it's decorative.

**Android — `LiveChatScreen.kt`** (line 116):
Replace the suggestions list:
```kotlin
val suggestions = listOf(
    "Where is my order?",
    "Cancel my order",
    "Refund request",
    "Delivery issue",
    "Ride status",
    "Pricing info"
)
```

Update the greeting message in the ViewModel (line 51):
```kotlin
text = "Hi! I'm Dollor Support. I can help you check order status, cancel orders, check refund eligibility, and more. What do you need help with?",
```

Update the TopAppBar title "Dollor AI Support" (line 149) to "Dollor Support".

Update the ChatBubble label "Dollor AI" (line 319) to "Dollor Support".

Ensure both platforms have IDENTICAL suggestion text and greeting for cross-platform parity.
  </action>
  <verify>
1. `grep -A8 "suggestions" apps/ios/customer/eatfaircustomer/Views/LiveChatView.swift | head -10` — shows 6 new suggestions.
2. `grep -A8 "suggestions" /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/help/LiveChatScreen.kt | head -10` — shows matching 6 suggestions.
3. `grep "Dollor AI" apps/ios/customer/eatfaircustomer/Views/LiveChatView.swift` — should return NO matches (all replaced with "Dollor Support").
4. `grep "Dollor AI" /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/help/LiveChatScreen.kt` — should return NO matches.
5. iOS build check: `cd /Users/jeet/doordash-p2p && xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatfaircustomer -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | tail -5` — BUILD SUCCEEDED.
  </verify>
  <done>
- iOS and Android both show 6 suggestion buttons: "Where is my order?", "Cancel my order", "Refund request", "Delivery issue", "Ride status", "Pricing info".
- Both platforms show "Dollor Support" branding instead of "Dollor AI Support".
- Greeting message updated on both platforms to describe actual capabilities.
- Suggestion text is identical across iOS and Android.
  </done>
</task>

</tasks>

<verification>
1. **Zero hallucination check**: `grep -rn "openai\|gpt\|llm\|language.model" apps/web/p2p-platform/backend/support_agent.py` — must return NO matches.
2. **API contract preserved**: `curl -X POST http://localhost:8080/api/support/chat -H "Content-Type: application/json" -d '{"message": "order status"}' | python -m json.tool` returns `{"success": true, "response": "Please log in to check your order status..."}`.
3. **Auth optional**: Same curl without token works (general info). With valid customer Bearer token, returns actual order data.
4. **Voice unaffected**: `grep "OPENAI_API_KEY\|openai_ws\|Realtime" apps/web/p2p-platform/backend/voice_agent.py` still returns matches (voice path preserved).
5. **Legal pages serve**: `curl http://localhost:8080/terms | grep "restaurant acceptance"` returns updated T&C.
6. **Tests pass**: `cd apps/web/p2p-platform/backend && pytest tests/ -v --timeout=60` — no regressions.
</verification>

<success_criteria>
- POST /api/support/chat works with deterministic responses (no LLM dependency)
- Authenticated users can: check order status, cancel pre-acceptance orders, check refund eligibility, get delivery updates, check ride status
- Unauthenticated users: get general info, pricing, and are prompted to log in for account-specific queries
- Complex issues escalated via email to support@dollor.ai
- T&C section 7.2 and refund.html clearly state: orders cannot be cancelled once restaurant has accepted; refunds available if restaurant hasn't accepted or driver failed to deliver
- iOS and Android suggestion buttons show 6 capability-aligned options, identical text on both platforms
- No regressions in existing test suite
</success_criteria>

<output>
After completion, create `.planning/quick/61-replace-openai-chat-with-deterministic-s/61-SUMMARY.md`
</output>
