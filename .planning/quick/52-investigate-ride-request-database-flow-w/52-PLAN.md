---
phase: quick-52
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/52-investigate-ride-request-database-flow-w/RIDE_DB_FLOW_REPORT.md
autonomous: true
requirements: [QUICK-52]

must_haves:
  truths:
    - "Report documents every SQL query in the ride request creation path with line references"
    - "Report documents the nearby driver query and explains why it is a full table scan"
    - "Report documents the push notification fan-out loop and its N+1 characteristics"
    - "Report documents bid submission, bid listing, and bid acceptance DB operations"
    - "Report identifies concrete bottlenecks with 20 drivers in 15-mile radius"
  artifacts:
    - path: ".planning/quick/52-investigate-ride-request-database-flow-w/RIDE_DB_FLOW_REPORT.md"
      provides: "Complete database flow trace for ride request lifecycle"
      min_lines: 200
  key_links: []
---

<objective>
Trace the full database flow when a customer requests a ride with 20 online drivers within 15 miles. Document every SQL query, index usage, and bottleneck from ride creation through driver assignment.

Purpose: Understand the exact database behavior of the rideshare bidding system to identify performance bottlenecks and missing indexes before scaling.
Output: RIDE_DB_FLOW_REPORT.md with annotated SQL traces, index analysis, and bottleneck assessment.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/p2p-platform/backend/bid_routes.py (3147 lines — primary rideshare bidding logic)
@apps/web/p2p-platform/backend/models.py (RideRequest line 1281, RideBid line 1368, Driver line 712)
@apps/web/p2p-platform/backend/main_new.py (haversine at line 3576, /api/erp/rides/request at line 3679, get_available_ride_requests at line 15663)
@apps/web/p2p-platform/backend/rideshare_payments.py (fare calculation)
@apps/web/p2p-platform/backend/order_flow.py (send_push_notification, DriverLocationUpdate)
@apps/web/p2p-platform/backend/database.py (SQLAlchemy session setup)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Trace ride request creation and driver notification DB flow</name>
  <files>.planning/quick/52-investigate-ride-request-database-flow-w/RIDE_DB_FLOW_REPORT.md</files>
  <action>
READ-ONLY code research. Do NOT modify any source files.

Read and trace these specific code paths, documenting the exact SQL each ORM call generates:

**Step A — Ride Request Creation** (bid_routes.py:301-374, `create_ride_request`):
1. Concurrent request check: `db.query(RideRequest).filter(customer_id == X, status.in_([OPEN, BIDDING])).count()` — document the SQL, note which columns have indexes (customer_id: YES index=True, status: NO index)
2. Demand multiplier calculation: `calculate_demand_multiplier(db)` at bid_routes.py:146 — read what queries it runs (likely counts recent ride requests)
3. INSERT into ride_requests — document all columns written
4. Second COMMIT to update request_id — document the UPDATE query

**Step B — Nearby Driver Query** (bid_routes.py:388-392):
1. The query is `db.query(Driver).filter(Driver.is_online == True, Driver.fcm_token.isnot(None)).all()` — THIS IS A FULL TABLE SCAN of ALL online drivers, NOT a geolocation-filtered query
2. Document that there is NO haversine filtering at ride creation time — ALL online drivers get notified regardless of distance
3. Note: The haversine functions at bid_routes.py:131 and main_new.py:3576 are used elsewhere (fare estimation, distance calc) but NOT for driver filtering during ride creation
4. Check if `get_available_ride_requests` (bid_routes.py:976) does geolocation filtering from the DRIVER side (driver polls for nearby rides)

**Step C — Push Notification Fan-Out** (bid_routes.py:394-412):
1. Document the Python for-loop: iterates ALL online drivers and calls `send_push_notification` individually
2. Read `send_push_notification` in order_flow.py — trace whether it does additional DB queries per driver (e.g., looking up FCM token, which is already loaded)
3. Document this as an N+1 pattern if each push triggers additional DB reads
4. Note the `asyncio.create_task(broadcast_new_ride_request(...))` WebSocket broadcast at line 378

**Step D — Bid Submission** (bid_routes.py:1049, `submit_bid`):
1. Read the function and document: lookup ride_request by ID, verify driver eligibility, INSERT into ride_bids
2. Check for self-bidding prevention (NSA-007 security control)
3. Document all DB queries in the bid submission path

**Step E — Bid Listing and Acceptance** (bid_routes.py:521 `get_bids_for_request`, and bid response/acceptance endpoints):
1. Read `get_bids_for_request` — document the query (likely JOIN ride_bids with ride_requests)
2. Find the bid acceptance/respond endpoint — trace the UPDATE queries (ride_request.status, ride_bid.status, matched_driver_id assignment)
3. Document the driver assignment transaction (matched_bid_id, matched_driver_id, final_price, status change to MATCHED)

**Step F — Index Analysis**:
For each table involved, list:
- Columns with `index=True` from models.py
- Columns frequently filtered but WITHOUT indexes
- Missing composite indexes (e.g., `(customer_id, status)` on ride_requests, `(is_online, fcm_token)` on drivers)

**Step G — Bottleneck Assessment** (20 drivers, 15-mile radius scenario):
- Quantify: How many queries total for a single ride request?
- What is the worst-case DB load? (sequential push notification loop)
- What scales linearly with driver count?
- What is the actual geolocation gap? (no spatial filtering = all online drivers notified, not just nearby ones)

Write the complete report to RIDE_DB_FLOW_REPORT.md with these sections:
1. Executive Summary (key findings in 5 bullets)
2. Flow Diagram (ASCII: Customer Request -> DB Insert -> Driver Query -> Push Loop -> Bid -> Accept)
3. Step-by-Step SQL Trace (with file:line references and the actual ORM code translated to SQL)
4. Index Inventory (table, column, has_index, used_in_query)
5. Bottleneck Analysis (ranked by severity)
6. Recommendations (specific index additions, query optimizations, batch notification)
  </action>
  <verify>
The report file exists and contains:
- `grep -c "file:line\|line [0-9]\|bid_routes.py:[0-9]\|models.py:[0-9]" RIDE_DB_FLOW_REPORT.md` shows 20+ source references
- `grep -c "SELECT\|INSERT\|UPDATE\|INDEX" RIDE_DB_FLOW_REPORT.md` shows 15+ SQL-related entries
- `grep "full table scan\|FULL TABLE SCAN\|no geolocation\|no spatial" RIDE_DB_FLOW_REPORT.md` confirms the key finding about unfiltered driver queries
- `wc -l RIDE_DB_FLOW_REPORT.md` shows 200+ lines
  </verify>
  <done>
RIDE_DB_FLOW_REPORT.md exists with complete database flow trace covering all 5 stages (request creation, driver query, notification fan-out, bid submission, bid acceptance), includes file:line references for every SQL operation, documents the full-table-scan driver query as the primary bottleneck, and lists specific index and query optimization recommendations.
  </done>
</task>

</tasks>

<verification>
- Report covers the complete lifecycle: request -> notify -> bid -> accept
- Every SQL operation has a file:line citation from the actual codebase
- Bottleneck analysis is quantitative (query counts, O(n) characteristics)
- No code was modified — this is purely a read-only research report
</verification>

<success_criteria>
- RIDE_DB_FLOW_REPORT.md is 200+ lines with structured sections
- All SQL operations traced with source references
- Index inventory covers ride_requests, ride_bids, and drivers tables
- At least 3 concrete bottlenecks identified with severity ranking
- At least 3 actionable optimization recommendations
</success_criteria>

<output>
After completion, create `.planning/quick/52-investigate-ride-request-database-flow-w/52-SUMMARY.md`
</output>
