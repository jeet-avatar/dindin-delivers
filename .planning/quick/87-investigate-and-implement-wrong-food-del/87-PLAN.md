---
phase: quick-87
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/models.py
  - apps/web/p2p-platform/backend/main_new.py
  - apps/web/p2p-platform/backend/order_flow.py
autonomous: true
requirements: [FOOD-DISPUTE-01]
must_haves:
  truths:
    - "Customer can file a dispute on a delivered food order with reason and description"
    - "Admin can resolve a food order dispute with refund, partial refund, or no refund"
    - "Customer can view their food order dispute status"
    - "Dispute creation is blocked for non-delivered orders and duplicate disputes"
  artifacts:
    - path: "apps/web/p2p-platform/backend/models.py"
      provides: "OrderDispute model + OrderDisputeReason enum"
      contains: "class OrderDispute"
    - path: "apps/web/p2p-platform/backend/main_new.py"
      provides: "Food order dispute endpoints (create, get, list, resolve)"
      contains: "/api/orders/{order_id}/dispute"
  key_links:
    - from: "main_new.py OrderDispute endpoints"
      to: "models.py OrderDispute"
      via: "SQLAlchemy ORM query"
      pattern: "db\\.query\\(OrderDispute\\)"
    - from: "resolve endpoint"
      to: "Stripe refund"
      via: "stripe.Refund.create using order.stripe_payment_intent_id"
      pattern: "stripe\\.Refund\\.create"
---

<objective>
Implement food order dispute flow for wrong food / missing items / quality issues.

Purpose: Rideshare has a full dispute system (RideDispute in bid_routes.py:2587) but food delivery has ZERO post-delivery dispute capability. Customers who receive wrong food currently have no recourse in the app. This adds parity with the rideshare dispute system.

Output: OrderDispute model, 4 new endpoints, order_disputes DB table creation
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/p2p-platform/backend/models.py (RideDispute at line 1762, DisputeStatus at 1746, Order at ~386)
@apps/web/p2p-platform/backend/bid_routes.py (Rideshare dispute reference: lines 2578-2783)
@apps/web/p2p-platform/backend/main_new.py (ride_disputes table creation at 1403, cancel_order at 14902)
@apps/web/p2p-platform/backend/order_flow.py (trigger_refund at line 128)
</context>

<research_findings>
## Current State (verified via grep)

**Rideshare dispute system EXISTS (bid_routes.py:2578-2783):**
- RideDispute model (models.py:1762) with DisputeStatus + DisputeReason enums
- POST /api/rides/dispute -- customer creates dispute
- GET /api/rides/dispute/{dispute_id} -- get dispute status
- GET /api/rides/customer/{customer_id}/disputes -- list customer disputes
- POST /api/rides/dispute/{dispute_id}/resolve -- admin resolves with optional Stripe refund

**Food order dispute system DOES NOT EXIST:**
- No OrderDispute model (grep confirmed: zero matches for "OrderDispute")
- No /api/orders/*/dispute endpoints
- No order_disputes table
- trigger_refund() exists in order_flow.py:128 but only used for automated timeouts, NOT customer-initiated

**Food order has automated refunds ONLY for:**
- Restaurant timeout (order_flow.py:1970)
- Delivery timeout 120min (order_flow.py:2151)
- Stale order cleanup 24hr (order_flow.py:2282)
- Manual cancel (main_new.py:14902) -- but only pre-delivery statuses

**Order model has stripe_payment_intent_id (models.py:449)** -- needed for Stripe refunds.
</research_findings>

<tasks>

<task type="auto">
  <name>Task 1: Add OrderDispute model and DB table creation</name>
  <files>
    apps/web/p2p-platform/backend/models.py
    apps/web/p2p-platform/backend/main_new.py
  </files>
  <action>
1. In models.py, AFTER the RideDispute class (after line ~1782), add:

- `OrderDisputeReason` enum with values: WRONG_ITEMS, MISSING_ITEMS, QUALITY_ISSUE, NEVER_DELIVERED, OTHER
  (Do NOT reuse DisputeReason -- that's rideshare-specific with WRONG_ROUTE, OVERCHARGED etc.)

- `OrderDispute` model mirroring RideDispute pattern but for food orders:
  - __tablename__ = "order_disputes"
  - id (Integer, primary key, index)
  - order_id (Integer, ForeignKey("orders.id"), nullable=False, index)
  - customer_id (Integer, ForeignKey("customers.id"), nullable=False, index)
  - reason (SQLEnum(OrderDisputeReason, native_enum=False), nullable=False)
  - description (Text) -- customer's free-text explanation
  - affected_items (Text) -- JSON array of item names/ids that were wrong/missing (for partial refund)
  - status (SQLEnum(DisputeStatus, native_enum=False), default=DisputeStatus.SUBMITTED)
    REUSE the existing DisputeStatus enum (SUBMITTED, UNDER_REVIEW, RESOLVED_REFUND, RESOLVED_NO_REFUND, CLOSED) -- same lifecycle
  - refund_amount (Float)
  - stripe_refund_id (String(255))
  - admin_notes (Text)
  - resolved_at (DateTime)
  - created_at (DateTime, default=datetime.utcnow)
  - updated_at (DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
  - Relationships: order = relationship("Order"), customer = relationship("Customer")

2. In main_new.py, in the table creation section (around line 1416, after ride_disputes table), add:
  - CREATE TABLE IF NOT EXISTS order_disputes with matching columns
  - CREATE INDEX IF NOT EXISTS idx_order_disputes_order_id ON order_disputes(order_id)
  - CREATE INDEX IF NOT EXISTS idx_order_disputes_customer_id ON order_disputes(customer_id)

Important: Follow the EXACT same pattern as ride_disputes table creation at line 1403-1416. Use raw SQL in the table_creates list, same style.
  </action>
  <verify>
    grep -n "class OrderDispute" apps/web/p2p-platform/backend/models.py
    grep -n "order_disputes" apps/web/p2p-platform/backend/main_new.py
    cd apps/web/p2p-platform/backend && python -c "from models import OrderDispute, OrderDisputeReason; print('Model imports OK')"
  </verify>
  <done>OrderDispute model exists in models.py, order_disputes table creation SQL exists in main_new.py, model imports without errors</done>
</task>

<task type="auto">
  <name>Task 2: Implement food order dispute endpoints</name>
  <files>
    apps/web/p2p-platform/backend/main_new.py
  </files>
  <action>
Add 4 endpoints in main_new.py near the existing order endpoints (after cancel_order at line ~14947). Import OrderDispute and OrderDisputeReason from models at the top of the file.

Mirror the rideshare dispute pattern from bid_routes.py:2578-2783 but adapted for food orders:

**Endpoint 1: POST /api/orders/{order_id}/dispute**
- Auth: require_customer (from auth_utils.py)
- Pydantic input: reason (str), description (str, optional), affected_items (list[str], optional)
- Validate: order exists, order.status == OrderStatus.DELIVERED (only delivered orders can be disputed)
- Validate: customer owns the order (order.customer_id == customer.id)
- Validate: no existing dispute for this order (query OrderDispute where order_id matches)
- Validate: reason is valid OrderDisputeReason value
- Create OrderDispute record with status=SUBMITTED
- Store affected_items as JSON string if provided
- Return {"success": true, "message": "Dispute submitted...", "dispute": {...}}

**Endpoint 2: GET /api/orders/{order_id}/dispute**
- Auth: require_any_auth
- Get dispute for this order
- If JWT role != admin, verify customer_id matches
- Return dispute details (same shape as rideshare: id, order_id, reason, description, status, refund_amount, resolved_at, created_at, updated_at)
- Include admin_notes only if role == admin

**Endpoint 3: GET /api/orders/customer/{customer_id}/disputes**
- Auth: require_customer
- Verify customer.id == customer_id (ownership check)
- Return list of all OrderDispute records for customer, ordered by created_at desc
- Return {"success": true, "count": N, "disputes": [...]}

**Endpoint 4: POST /api/orders/dispute/{dispute_id}/resolve**
- Auth: require_any_auth, verify role == admin
- Pydantic input: resolution (str: "refund", "partial_refund", "no_refund"), refund_amount (float, optional), admin_notes (str, optional)
- Validate dispute exists, status is submitted or under_review
- If resolution is "refund" or "partial_refund":
  - Look up the order via dispute.order_id
  - Use order.stripe_payment_intent_id to create Stripe refund (same pattern as bid_routes.py:2722-2742)
  - For "refund": refund_amount = order.total_amount (full refund)
  - For "partial_refund": use the provided refund_amount (must be > 0 and <= order.total_amount)
  - Set dispute.status = DisputeStatus.RESOLVED_REFUND
- If "no_refund": set dispute.status = DisputeStatus.RESOLVED_NO_REFUND
- Set admin_notes, resolved_at = datetime.utcnow()
- Send in-app notification to customer (same pattern as bid_routes.py:2758-2770)
- Return {"success": true, "message": "...", "dispute": {...}}

IMPORTANT patterns to follow:
- Use `from auth_utils import require_any_auth, require_customer` (already imported in main_new.py)
- Use `get_db` dependency for database sessions
- Use `import json` for affected_items serialization
- Error responses: HTTPException with appropriate status codes (400, 403, 404)
- Log important actions with logger
- Stripe import: `import stripe` (already available in main_new.py)
  </action>
  <verify>
    grep -n "/api/orders.*dispute" apps/web/p2p-platform/backend/main_new.py
    cd apps/web/p2p-platform/backend && python -c "from main_new import app; routes = [r.path for r in app.routes]; assert '/api/orders/{order_id}/dispute' in routes, f'Missing dispute route. Routes with dispute: {[r for r in routes if \"dispute\" in r]}'; print('Dispute routes registered')"
  </verify>
  <done>4 food order dispute endpoints exist and are registered in the FastAPI app: POST create, GET status, GET list, POST resolve</done>
</task>

<task type="auto">
  <name>Task 3: Add unit tests for food order dispute flow</name>
  <files>
    apps/web/p2p-platform/backend/tests/test_order_disputes.py
  </files>
  <action>
Create a new test file for the food order dispute flow. Use the existing test patterns from the codebase (check apps/web/p2p-platform/backend/tests/ for fixture patterns).

Tests to write:

1. **test_create_dispute_success** -- customer creates dispute on delivered order, verify 200 + dispute object returned
2. **test_create_dispute_not_delivered** -- attempt dispute on non-delivered order, expect 400
3. **test_create_dispute_not_owner** -- customer tries to dispute another customer's order, expect 403
4. **test_create_dispute_duplicate** -- second dispute on same order, expect 400
5. **test_create_dispute_invalid_reason** -- invalid reason string, expect 400/422
6. **test_get_dispute_status** -- retrieve dispute by order_id, verify shape
7. **test_get_customer_disputes** -- list all disputes for customer
8. **test_resolve_dispute_refund** -- admin resolves with full refund (mock Stripe)
9. **test_resolve_dispute_partial_refund** -- admin resolves with partial refund
10. **test_resolve_dispute_no_refund** -- admin resolves with no refund
11. **test_resolve_dispute_not_admin** -- non-admin tries to resolve, expect 403

Use pytest fixtures. Mock Stripe calls with unittest.mock.patch. Use the TestClient from FastAPI (from starlette.testclient import TestClient).

Follow the pattern in existing test files for creating test customers, orders, and auth tokens. Check `tests/conftest.py` or similar for shared fixtures.

Run: `cd apps/web/p2p-platform/backend && python -m pytest tests/test_order_disputes.py -v`
  </action>
  <verify>
    cd apps/web/p2p-platform/backend && python -m pytest tests/test_order_disputes.py -v --tb=short 2>&1 | tail -20
  </verify>
  <done>All 11 tests pass. Dispute creation, validation, retrieval, and admin resolution all work correctly.</done>
</task>

</tasks>

<verification>
1. Models: `python -c "from models import OrderDispute, OrderDisputeReason, DisputeStatus"` succeeds
2. Endpoints: All 4 routes registered in FastAPI app
3. Tests: `pytest tests/test_order_disputes.py -v` -- all pass
4. Existing tests: `pytest tests/ -v --tb=short` -- no regressions (existing 356+ tests still pass)
5. Anti-hallucination: All endpoints verified to exist via grep after implementation
</verification>

<success_criteria>
- OrderDispute model with OrderDisputeReason enum exists in models.py
- order_disputes table creation SQL in main_new.py startup
- POST /api/orders/{order_id}/dispute creates dispute (delivered orders only, customer auth)
- GET /api/orders/{order_id}/dispute returns dispute status
- GET /api/orders/customer/{customer_id}/disputes lists all customer disputes
- POST /api/orders/dispute/{dispute_id}/resolve lets admin resolve with refund/partial/no-refund
- Stripe refund integration for full and partial refunds
- In-app notification sent on resolution
- 11 unit tests passing
- No regression in existing test suite
</success_criteria>

<output>
After completion, create `.planning/quick/87-investigate-and-implement-wrong-food-del/87-SUMMARY.md`
</output>
