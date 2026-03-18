---
phase: quick-189
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/models.py
  - apps/web/p2p-platform/backend/bid_routes.py
  - apps/web/p2p-platform/backend/alembic/versions/20260318_add_unique_constraint_ride_bid.py
autonomous: true
requirements: [QUICK-189]
must_haves:
  truths:
    - "A driver cannot submit two bids on the same ride request, even under concurrent load"
    - "Concurrent duplicate INSERT attempts are rejected at the database level with HTTP 400"
    - "The duplicate check in bid_routes.py uses SELECT FOR UPDATE to prevent TOCTOU race"
    - "An Alembic migration adds the constraint to the live database"
  artifacts:
    - path: "apps/web/p2p-platform/backend/models.py"
      provides: "UniqueConstraint on (ride_request_id, driver_id) in RideBid.__table_args__"
      contains: "uq_bid_per_driver_per_request"
    - path: "apps/web/p2p-platform/backend/bid_routes.py"
      provides: "SELECT FOR UPDATE duplicate check + IntegrityError handler"
      exports: []
    - path: "apps/web/p2p-platform/backend/alembic/versions/20260318_add_unique_constraint_ride_bid.py"
      provides: "Alembic migration that adds the constraint to ride_bids table"
  key_links:
    - from: "bid_routes.py duplicate check"
      to: "ride_bids table"
      via: "SELECT FOR UPDATE before INSERT"
      pattern: "with_for_update"
    - from: "IntegrityError handler"
      to: "HTTP 400 response"
      via: "except IntegrityError"
      pattern: "IntegrityError"
---

<objective>
Fix the race condition in rideshare bid submission that allows a driver to insert duplicate bids on the same ride request when two requests arrive concurrently.

Purpose: The current `existing_bid` check (lines 1372-1382 of bid_routes.py) is a plain SELECT with no lock. Two concurrent requests both read NULL and both INSERT, producing duplicate rows. This corrupts the bidding state and can cause accept/counter flows to behave unpredictably.

Output: UniqueConstraint in model + SELECT FOR UPDATE duplicate check + IntegrityError fallback + Alembic migration applied.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add UniqueConstraint to RideBid model and create Alembic migration</name>
  <files>
    apps/web/p2p-platform/backend/models.py
    apps/web/p2p-platform/backend/alembic/versions/20260318_add_unique_constraint_ride_bid.py
  </files>
  <action>
    In models.py, the RideBid class (line 1403) currently has NO `__table_args__`. Add it after the `counter_to` relationship (line 1455):

    ```python
    # Table constraints
    __table_args__ = (
        UniqueConstraint('ride_request_id', 'driver_id', name='uq_bid_per_driver_per_request'),
    )
    ```

    Also add `UniqueConstraint` to the SQLAlchemy import at the top of models.py. Check the existing import line (search for `from sqlalchemy import`) and add `UniqueConstraint` to it.

    Then create the Alembic migration file manually (do NOT run autogenerate — the DB is live and autogenerate may pick up unrelated changes):

    File: `apps/web/p2p-platform/backend/alembic/versions/20260318_add_unique_constraint_ride_bid.py`

    ```python
    """add unique constraint ride_bid

    Revision ID: 20260318_ride_bid_unique
    Revises: 20260203_add_early_driver_notification_fields
    Create Date: 2026-03-18

    """
    from alembic import op

    # revision identifiers
    revision = '20260318_ride_bid_unique'
    down_revision = '20260203_add_early_driver_notification_fields'
    branch_labels = None
    depends_on = None


    def upgrade():
        # Delete duplicate bids first (keep the earliest bid per driver+request pair)
        op.execute("""
            DELETE FROM ride_bids
            WHERE id NOT IN (
                SELECT MIN(id)
                FROM ride_bids
                GROUP BY ride_request_id, driver_id
            )
        """)
        op.create_unique_constraint(
            'uq_bid_per_driver_per_request',
            'ride_bids',
            ['ride_request_id', 'driver_id']
        )


    def downgrade():
        op.drop_constraint('uq_bid_per_driver_per_request', 'ride_bids', type_='unique')
    ```

    IMPORTANT: Check the actual down_revision value by running:
    `grep "^revision" apps/web/p2p-platform/backend/alembic/versions/20260203_add_early_driver_notification_fields.py`
    Use whatever that file's `revision` value is as the `down_revision` in the new migration.
  </action>
  <verify>
    grep -n "UniqueConstraint" apps/web/p2p-platform/backend/models.py
    grep -n "uq_bid_per_driver_per_request" apps/web/p2p-platform/backend/models.py
    ls apps/web/p2p-platform/backend/alembic/versions/20260318_add_unique_constraint_ride_bid.py
  </verify>
  <done>models.py contains UniqueConstraint on (ride_request_id, driver_id) in RideBid.__table_args__, and the Alembic migration file exists with correct upgrade/downgrade.</done>
</task>

<task type="auto">
  <name>Task 2: Fix bid_routes.py duplicate check with SELECT FOR UPDATE + IntegrityError handler</name>
  <files>
    apps/web/p2p-platform/backend/bid_routes.py
  </files>
  <action>
    Two changes to bid_routes.py:

    **1. Add imports at the top of bid_routes.py** (after the existing `from sqlalchemy import and_, or_` line):
    ```python
    from sqlalchemy import and_, or_, select
    from sqlalchemy.exc import IntegrityError
    ```
    (Replace the existing `from sqlalchemy import and_, or_` line — add `select` and add the IntegrityError import from sqlalchemy.exc)

    **2. Replace the existing duplicate-bid check** (lines 1372-1382) with a SELECT FOR UPDATE pattern:

    Current code (lines 1372-1382):
    ```python
    # Check if driver already has a pending bid
    existing_bid = db.query(RideBid).filter(
        and_(
            RideBid.ride_request_id == request_id,
            RideBid.driver_id == data.driver_id,
            RideBid.status == BidStatus.PENDING
        )
    ).first()

    if existing_bid:
        raise HTTPException(status_code=400, detail="You already have a pending bid on this request. Update or withdraw it first.")
    ```

    Replace with:
    ```python
    # Check if driver already has any bid (PENDING or otherwise) using SELECT FOR UPDATE
    # to prevent race conditions where two concurrent requests both see NULL and both INSERT.
    existing_bid = db.execute(
        select(RideBid).where(
            and_(
                RideBid.ride_request_id == request_id,
                RideBid.driver_id == data.driver_id,
            )
        ).with_for_update()
    ).scalars().first()

    if existing_bid:
        raise HTTPException(status_code=400, detail="You already have a bid on this request. Update or withdraw it first.")
    ```

    **3. Wrap the bid INSERT (the db.add + db.commit block that follows) in a try/except IntegrityError** to catch the rare case where the DB constraint fires despite the SELECT FOR UPDATE (e.g., different transactions or serialization anomalies). Find the `db.add(new_bid)` and `db.commit()` lines and wrap them:

    ```python
    try:
        db.add(new_bid)
        db.commit()
        db.refresh(new_bid)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Bid already submitted. Please refresh and try again.")
    ```

    Do NOT wrap the entire endpoint — only the INSERT block. The `db.refresh(new_bid)` call that follows the commit should be inside the try block.
  </action>
  <verify>
    grep -n "with_for_update" apps/web/p2p-platform/backend/bid_routes.py
    grep -n "IntegrityError" apps/web/p2p-platform/backend/bid_routes.py
    grep -n "from sqlalchemy" apps/web/p2p-platform/backend/bid_routes.py
  </verify>
  <done>
    bid_routes.py has: (1) IntegrityError import, (2) SELECT FOR UPDATE duplicate check replacing the plain SELECT, (3) try/except IntegrityError around the db.add/commit block returning HTTP 400.
  </done>
</task>

<task type="auto">
  <name>Task 3: Run Alembic migration, backend tests, commit and deploy</name>
  <files></files>
  <action>
    Step 1 — Run the Alembic migration on the local/staging DB to verify it applies cleanly:
    ```bash
    cd apps/web/p2p-platform/backend
    source venv/bin/activate
    alembic upgrade head
    ```
    Confirm output shows "Running upgrade ... -> 20260318_ride_bid_unique, add unique constraint ride_bid".

    Step 2 — Run the backend test suite to confirm no regressions:
    ```bash
    cd apps/web/p2p-platform/backend
    source venv/bin/activate
    pytest tests/ -v -x -q 2>&1 | tail -20
    ```
    All tests must pass (previous baseline: 1490 passed, 0 failed).

    Step 3 — Commit:
    ```bash
    git add apps/web/p2p-platform/backend/models.py \
            apps/web/p2p-platform/backend/bid_routes.py \
            apps/web/p2p-platform/backend/alembic/versions/20260318_add_unique_constraint_ride_bid.py
    git commit -m "fix(quick-189): prevent duplicate bids — UniqueConstraint + SELECT FOR UPDATE + IntegrityError handler"
    ```

    Step 4 — Push and deploy to staging first, then production:
    ```bash
    git push origin main
    gh workflow run deploy-staging.yml --ref main
    ```
    Wait for staging deploy to complete, then smoke test the bid endpoint:
    ```bash
    # Verify constraint applies on staging (expect 400 on second bid from same driver)
    curl -s -X POST https://d34u5ixl0bulv4.cloudfront.net/api/rides/bid/1 \
      -H "Authorization: Bearer $DRIVER_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"driver_id":1,"proposed_price":15,"estimated_arrival_minutes":5}' | python3 -m json.tool
    ```
    Then deploy production:
    ```bash
    gh workflow run deploy-dollar-ai.yml
    gh run list --workflow=deploy-dollar-ai.yml --limit 3
    ```
  </action>
  <verify>
    gh run view $(gh run list --workflow=deploy-dollar-ai.yml --limit 1 --json databaseId -q '.[0].databaseId') --json conclusion -q '.conclusion'
    # Should return "success"
  </verify>
  <done>
    Alembic migration applied cleanly, all backend tests pass, code committed, staging and production deployed via CI/CD with "success" conclusion.
  </done>
</task>

</tasks>

<verification>
- grep -n "uq_bid_per_driver_per_request" apps/web/p2p-platform/backend/models.py confirms constraint name
- grep -n "with_for_update" apps/web/p2p-platform/backend/bid_routes.py confirms lock
- grep -n "IntegrityError" apps/web/p2p-platform/backend/bid_routes.py confirms fallback handler
- pytest tests/ passes with 0 failures
- CI/CD deploy to production shows "success"
</verification>

<success_criteria>
- RideBid has UniqueConstraint('ride_request_id', 'driver_id') in __table_args__
- bid_routes.py duplicate check uses SELECT FOR UPDATE instead of plain SELECT
- IntegrityError is caught and returns HTTP 400 "Bid already submitted"
- Alembic migration file exists and runs cleanly (upgrade + downgrade)
- All backend tests pass
- Deployed to production via CI/CD
</success_criteria>

<output>
After completion, create `.planning/quick/189-fix-race-condition-duplicate-bids-in-rid/189-SUMMARY.md`
</output>
