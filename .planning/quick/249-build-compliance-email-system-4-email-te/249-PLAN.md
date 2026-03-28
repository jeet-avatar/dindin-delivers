---
phase: quick-249
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/email_service.py
  - apps/web/p2p-platform/backend/order_flow.py
  - apps/web/p2p-platform/backend/bid_routes.py
  - apps/web/p2p-platform/backend/main_new.py
autonomous: true
requirements: [COMP-EMAIL-01, COMP-EMAIL-02, COMP-EMAIL-03, COMP-EMAIL-04]
must_haves:
  truths:
    - "Drivers receive Prop 22 earnings statement email after each 14-day period closes"
    - "Drivers receive monthly earnings summary email on 1st of each month"
    - "Admin receives quarterly compliance report email at jeetnair.in@gmail.com"
    - "Drivers receive 1099-NEC threshold alert when YTD earnings cross $600, exactly once per year"
    - "Admin can manually trigger monthly and quarterly reports via API endpoints"
  artifacts:
    - path: "apps/web/p2p-platform/backend/email_service.py"
      provides: "4 new email template functions + jeetnair.in@gmail.com in allowlist + get_driver_ytd_earnings helper"
      contains: "send_prop22_earnings_statement_email"
    - path: "apps/web/p2p-platform/backend/order_flow.py"
      provides: "2 new scheduler jobs + email hook in existing reconciliation job"
      contains: "monthly_earnings_summary_job"
    - path: "apps/web/p2p-platform/backend/bid_routes.py"
      provides: "1099 threshold check at ride completion"
      contains: "get_driver_ytd_earnings"
    - path: "apps/web/p2p-platform/backend/main_new.py"
      provides: "2 admin trigger endpoints for manual testing"
      contains: "/api/admin/compliance/trigger-monthly-report"
  key_links:
    - from: "order_flow.py prop22_period_reconciliation_job"
      to: "email_service.py send_prop22_earnings_statement_email"
      via: "function call after period db.commit()"
      pattern: "send_prop22_earnings_statement_email"
    - from: "bid_routes.py complete_ride"
      to: "email_service.py send_1099_threshold_alert_email"
      via: "inline check after Prop 22 calculation"
      pattern: "get_driver_ytd_earnings.*1099"
    - from: "order_flow.py monthly_earnings_summary_job"
      to: "email_service.py send_monthly_earnings_summary_email"
      via: "scheduler CronTrigger(day=1, hour=9)"
      pattern: "send_monthly_earnings_summary_email"
---

<objective>
Build compliance email system with 4 email templates, scheduler hooks, admin trigger endpoints, and 1099-NEC threshold detection.

Purpose: Enable automated compliance communications for Prop 22 earnings statements, monthly summaries, quarterly reports, and 1099-NEC threshold alerts. All emails use existing infrastructure (SMTP, Communication table, APScheduler).

Output: 4 working email template functions, 2 new scheduler jobs, 1099 inline check at ride/order completion, 2 admin test endpoints, jeetnair.in@gmail.com allowlisted.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@docs/superpowers/specs/2026-03-28-compliance-email-system-design.md
@apps/web/p2p-platform/backend/email_service.py
@apps/web/p2p-platform/backend/order_flow.py (lines 2881-3260 for scheduler pattern + reconciliation job)
@apps/web/p2p-platform/backend/bid_routes.py (lines 2512-2720 for complete_ride)
@apps/web/p2p-platform/backend/prop22_utils.py
@apps/web/p2p-platform/backend/models.py (lines 1955-2029 for Prop 22 models)
@apps/web/p2p-platform/backend/models_extended.py (Communication model, lines 351-390)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add 4 email templates + allowlist + YTD helper to email_service.py</name>
  <files>apps/web/p2p-platform/backend/email_service.py</files>
  <action>
Add `jeetnair.in@gmail.com` to the `DEMO_EMAILS_ALLOWLIST` set in `_validate_recipient_in_db()` (line ~197). This allows admin compliance emails to pass production validation.

Add `get_driver_ytd_earnings(db, driver_id, year)` helper function near the bottom of the file (before the CI/CD email functions). This queries `RideRequest.driver_payout` (status='COMPLETED', completed_at year match) + `Order.delivery_fee` (status='DELIVERED', delivered_at year match) and returns the sum. Import `func, extract` from sqlalchemy, `RideRequest` and `Order` from models. Follow the exact implementation from the spec (lines 135-149).

Add 4 new email template functions at the bottom of the file (before the CI/CD email section starting at `send_approval_needed_email`, line ~2926). Each follows the existing pattern: build html_body + text_body, call `send_email(to_email, subject, html_body, text_body, template_name="...")`.

1. `send_prop22_earnings_statement_email(driver_email, driver_name, period_start, period_end, engaged_hours, engaged_miles, floor_amount, net_earnings, top_up_amount, qtd_hours, healthcare_eligible)` — Subject: "Dollor -- Prop 22 Earnings Statement (Period {start} - {end})". HTML table with period dates, engaged hours (format as Xh Ym), engaged miles, floor amount, net earnings, top-up, QTD hours, healthcare stipend note if eligible (engaged_hours >= 15 avg/week). Use same CSS style pattern as existing ride emails (indigo gradient header, white container, #f8fafc boxes). template_name="prop22_earnings_statement".

2. `send_monthly_earnings_summary_email(driver_email, driver_name, year, month, food_orders, food_delivery_fees, food_tips, ride_count, ride_fares, ride_tips, platform_fees_paid, prop22_topups, net_payout, ytd_total)` — Subject: "Dollor -- Your {Month} {Year} Earnings Summary". Sections for food delivery, rideshare, platform fees ($0 food, $1-$3 rideshare), Prop 22 top-ups, net total, YTD running total. template_name="monthly_earnings_summary".

3. `send_quarterly_compliance_report_email(admin_email, year, quarter, total_drivers, prop22_summary, driver_breakdown, threshold_drivers, approaching_drivers, revenue_summary)` — Subject: "Dollor -- Q{N} {Year} Compliance Report". This is an admin-facing report so make it data-dense: prop22_summary dict has total_hours/total_floor/total_topups/drivers_with_topups. driver_breakdown is a list of dicts. threshold_drivers = list of drivers who crossed $600 YTD. approaching_drivers = list > $500. revenue_summary dict has customer_fees/driver_fees/net_revenue. Use skip_validation=True since admin email may not be in users table. template_name="quarterly_compliance_report".

4. `send_1099_threshold_alert_email(driver_email, driver_name, ytd_earnings)` — Subject: "Dollor -- Important Tax Information". Content per spec: YTD exceeded $600, will receive 1099-NEC, ensure tax info up to date, link placeholder. Short and clear. template_name="1099_threshold_alert".

Copyright in all templates: "2026 Zietra Technologies inc" (per Apple Developer account conversion).
  </action>
  <verify>
    grep -n "jeetnair.in@gmail.com" apps/web/p2p-platform/backend/email_service.py
    grep -n "def send_prop22_earnings_statement_email\|def send_monthly_earnings_summary_email\|def send_quarterly_compliance_report_email\|def send_1099_threshold_alert_email\|def get_driver_ytd_earnings" apps/web/p2p-platform/backend/email_service.py
    python -c "import sys; sys.path.insert(0, 'apps/web/p2p-platform/backend'); from email_service import send_prop22_earnings_statement_email, send_monthly_earnings_summary_email, send_quarterly_compliance_report_email, send_1099_threshold_alert_email, get_driver_ytd_earnings; print('All 5 functions import OK')"
  </verify>
  <done>
    - 4 email template functions exist and are importable
    - get_driver_ytd_earnings helper exists and is importable
    - jeetnair.in@gmail.com is in the DEMO_EMAILS_ALLOWLIST
    - All templates follow existing HTML/CSS pattern with indigo gradient headers
    - All templates include text_body fallback
    - Quarterly report uses skip_validation=True
  </done>
</task>

<task type="auto">
  <name>Task 2: Add scheduler hooks + 1099 inline check + admin endpoints</name>
  <files>
    apps/web/p2p-platform/backend/order_flow.py
    apps/web/p2p-platform/backend/bid_routes.py
    apps/web/p2p-platform/backend/main_new.py
  </files>
  <action>
**order_flow.py — Hook into existing reconciliation job:**

In `prop22_period_reconciliation_job()`, after each successful `db.commit()` per driver (line ~3121), add a non-blocking email call:
```python
# Send Prop 22 earnings statement email (non-blocking)
try:
    from email_service import send_prop22_earnings_statement_email
    healthcare_eligible = (qtd_hours / max(1, (prev_end - prev_start).days / 7)) >= 15
    send_prop22_earnings_statement_email(
        driver_email=driver.email,
        driver_name=f"{driver.first_name} {driver.last_name}".strip(),
        period_start=prev_start.strftime("%b %d, %Y"),
        period_end=prev_end.strftime("%b %d, %Y"),
        engaged_hours=engaged_hours,
        engaged_miles=engaged_miles,
        floor_amount=prop22_floor,
        net_earnings=net_earnings,
        top_up_amount=top_up,
        qtd_hours=qtd_hours,
        healthcare_eligible=healthcare_eligible,
    )
except Exception as email_err:
    logger.error(f"Prop 22 earnings statement email failed for driver {driver_id}: {email_err}")
```

**order_flow.py — Add 2 new scheduler jobs** (after `prop22_manual_review_escalation_job`, around line 3180):

1. `monthly_earnings_summary_job()` — Uses same file-lock guard pattern as prop22 reconciliation (fcntl). Gets previous month (use `from dateutil.relativedelta import relativedelta` — already available, or compute manually). Queries all active drivers. For each driver: count food orders + sum delivery_fee + sum tip WHERE delivered_at in prev month; count rides + sum driver_payout + sum tip_amount WHERE completed_at in prev month; sum platform fees (rideshare only: $1/$2/$3 tiered from `rideshare_payments.py`); sum prop22 top-ups from `prop22_earning_periods` for that month; compute net = food_fees + ride_payouts + tips + topups; call `get_driver_ytd_earnings` for YTD; call `send_monthly_earnings_summary_email`. All in try/except per driver so one failure doesn't block others.

2. `quarterly_compliance_report_job()` — Same lock pattern. Computes previous quarter (Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec). Queries all drivers with rides/orders in that quarter. Builds prop22_summary from `prop22_earning_periods`. Builds driver_breakdown list. Uses `get_driver_ytd_earnings` to find threshold ($600+) and approaching ($500+) drivers. Computes revenue_summary from customer service fees + driver platform fees. Calls `send_quarterly_compliance_report_email(admin_email="jeetnair.in@gmail.com", ...)`.

**order_flow.py — Register new scheduler jobs** in the scheduler setup block (after the prop22_escalation job registration, around line 3254):

```python
restaurant_timeout_scheduler.add_job(
    monthly_earnings_summary_job,
    CronTrigger(day=1, hour=9, minute=0, timezone="America/Los_Angeles"),
    id="monthly_earnings_summary",
    name="Monthly driver earnings summary email (1st of month 9 AM PT)",
    replace_existing=True
)
restaurant_timeout_scheduler.add_job(
    quarterly_compliance_report_job,
    CronTrigger(month="1,4,7,10", day=1, hour=9, minute=0, timezone="America/Los_Angeles"),
    id="quarterly_compliance_report",
    name="Quarterly compliance report email (Q start 9 AM PT)",
    replace_existing=True
)
```

**bid_routes.py — Add 1099 threshold check at ride completion:**

After the Prop 22 calculation block (line ~2561, after `except Exception as _e: logger.error(...)`) and before the in-app notification (line ~2563), add:

```python
# 1099-NEC threshold check (non-blocking)
try:
    from email_service import get_driver_ytd_earnings, send_1099_threshold_alert_email
    _ytd = get_driver_ytd_earnings(db, ride_request.matched_driver_id, datetime.utcnow().year)
    if _ytd >= 600:
        # Dedup: check if 1099 alert already sent this year
        from models_extended import Communication, CommunicationChannel
        _existing_1099 = db.query(Communication).filter(
            Communication.recipient_id == ride_request.matched_driver_id,
            Communication.template_name == "1099_threshold_alert",
            Communication.channel == CommunicationChannel.EMAIL,
            extract('year', Communication.sent_at) == datetime.utcnow().year,
        ).first()
        if not _existing_1099:
            _driver_1099 = db.query(Driver).filter(Driver.id == ride_request.matched_driver_id).first()
            if _driver_1099 and _driver_1099.email:
                send_1099_threshold_alert_email(
                    driver_email=_driver_1099.email,
                    driver_name=f"{_driver_1099.first_name} {_driver_1099.last_name}".strip(),
                    ytd_earnings=_ytd,
                )
                logger.info(f"1099 threshold alert sent to driver {ride_request.matched_driver_id} (YTD=${_ytd:.2f})")
except Exception as _e:
    logger.error(f"1099 threshold check failed (non-blocking): {_e}")
```

Add `from sqlalchemy import extract` to bid_routes.py imports if not already present.

**order_flow.py — Add same 1099 check at food delivery completion:**

In the delivery completion handler, after the Prop 22 order calculation block (line ~4255, after `logger.error(f"Prop 22 order calculation failed...")`), add the same 1099 check pattern but using `order.driver_id` instead of `ride_request.matched_driver_id`.

**main_new.py — Add 2 admin trigger endpoints:**

Add near other admin endpoints (after the Prop 22 admin endpoints, around line 8240):

```python
@app.post("/api/admin/compliance/trigger-monthly-report")
async def trigger_monthly_report(
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Manually trigger monthly earnings summary for a specific driver + month."""
    body = await request.json()
    driver_email = body.get("driver_email")
    year = body.get("year", datetime.utcnow().year)
    month = body.get("month", datetime.utcnow().month)
    # Look up driver, compute stats, call send_monthly_earnings_summary_email
    # Return {"status": "sent", "driver_email": ..., "year": ..., "month": ...}
```

```python
@app.post("/api/admin/compliance/trigger-quarterly-report")
async def trigger_quarterly_report(
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Manually trigger quarterly compliance report."""
    body = await request.json()
    year = body.get("year", datetime.utcnow().year)
    quarter = body.get("quarter", ((datetime.utcnow().month - 1) // 3) + 1)
    # Call quarterly_compliance_report_job logic for specific quarter
    # Return {"status": "sent", "admin_email": "jeetnair.in@gmail.com", ...}
```

Both endpoints require `require_admin` auth. The monthly endpoint looks up the driver by email, computes their stats for that month (same queries as the scheduler job), and sends. The quarterly endpoint calls the same logic as the scheduler job but for the specified quarter. Both return JSON with status.

Add `/api/admin/compliance/` to the auth allowlist if admin routes are already covered by admin middleware (check — they likely are since they use `Depends(require_admin)`).
  </action>
  <verify>
    grep -n "monthly_earnings_summary_job\|quarterly_compliance_report_job" apps/web/p2p-platform/backend/order_flow.py
    grep -n "1099_threshold_alert\|get_driver_ytd_earnings" apps/web/p2p-platform/backend/bid_routes.py
    grep -n "trigger-monthly-report\|trigger-quarterly-report" apps/web/p2p-platform/backend/main_new.py
    grep -n "send_prop22_earnings_statement_email" apps/web/p2p-platform/backend/order_flow.py
    cd apps/web/p2p-platform/backend && python -c "from order_flow import monthly_earnings_summary_job, quarterly_compliance_report_job; print('Scheduler jobs import OK')"
  </verify>
  <done>
    - Prop 22 reconciliation job sends earnings statement email after each driver commit
    - monthly_earnings_summary_job exists and is registered with CronTrigger(day=1, hour=9)
    - quarterly_compliance_report_job exists and is registered with CronTrigger(month='1,4,7,10', day=1, hour=9)
    - 1099 threshold check runs at ride completion (bid_routes.py) and order completion (order_flow.py)
    - 1099 alert deduplicates via Communication table template_name + year check
    - 2 admin trigger endpoints exist at /api/admin/compliance/trigger-monthly-report and /api/admin/compliance/trigger-quarterly-report
    - All new code uses non-blocking try/except pattern consistent with existing codebase
  </done>
</task>

<task type="auto">
  <name>Task 3: E2E test — trigger all 4 email types with demo accounts</name>
  <files>
    apps/web/p2p-platform/backend/email_service.py
    apps/web/p2p-platform/backend/order_flow.py
    apps/web/p2p-platform/backend/bid_routes.py
    apps/web/p2p-platform/backend/main_new.py
  </files>
  <action>
Run the backend locally and verify all 4 email types work end-to-end.

**Step 1: Start backend**
```bash
cd apps/web/p2p-platform/backend
source venv/bin/activate
uvicorn main_new:app --reload --port 8080
```

**Step 2: Verify imports work**
```python
python -c "
from email_service import (
    send_prop22_earnings_statement_email,
    send_monthly_earnings_summary_email,
    send_quarterly_compliance_report_email,
    send_1099_threshold_alert_email,
    get_driver_ytd_earnings,
)
from order_flow import monthly_earnings_summary_job, quarterly_compliance_report_job
print('All imports OK')
"
```

**Step 3: Test admin trigger endpoints with curl**

Get admin JWT first:
```bash
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"support@dollor.ai","password":"AdminTest123"}' | jq .token
```

Trigger monthly report for demo driver:
```bash
curl -s -X POST http://localhost:8080/api/admin/compliance/trigger-monthly-report \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"driver_email":"demo.driver@dollor.ai","year":2026,"month":3}' | jq .
```

Trigger quarterly report:
```bash
curl -s -X POST http://localhost:8080/api/admin/compliance/trigger-quarterly-report \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"year":2026,"quarter":1}' | jq .
```

**Step 4: Verify email function calls directly (if staging)**
Call each email function directly with test data to verify HTML renders:
```python
from email_service import send_prop22_earnings_statement_email
send_prop22_earnings_statement_email(
    driver_email="demo.driver@dollor.ai",
    driver_name="Demo Driver",
    period_start="Mar 1, 2026",
    period_end="Mar 14, 2026",
    engaged_hours=12.5,
    engaged_miles=187.3,
    floor_amount=342.50,
    net_earnings=425.00,
    top_up_amount=0.0,
    qtd_hours=38.2,
    healthcare_eligible=True,
)
```

**Step 5: Verify 1099 dedup logic**
```python
# After sending 1099 alert, verify Communication table has the record
from models_extended import Communication, CommunicationChannel
from sqlalchemy import extract
result = db.query(Communication).filter(
    Communication.template_name == "1099_threshold_alert",
    extract('year', Communication.sent_at) == 2026,
).all()
print(f"1099 alerts sent: {len(result)}")
```

**Step 6: Run existing test suite to verify no regressions**
```bash
cd apps/web/p2p-platform/backend
pytest tests/ -v --tb=short -x 2>&1 | tail -20
```

If any test fails due to new imports, fix the import (likely need to handle cases where models aren't available in test context with try/except).
  </action>
  <verify>
    - curl output shows 200 for both admin trigger endpoints
    - grep -c "send_prop22_earnings_statement_email\|send_monthly_earnings_summary_email\|send_quarterly_compliance_report_email\|send_1099_threshold_alert_email" apps/web/p2p-platform/backend/email_service.py shows 4+ matches (definitions + any internal calls)
    - pytest tests/ passes with no new failures
  </verify>
  <done>
    - All 4 email template functions send correctly
    - Admin trigger endpoints return 200 with correct response body
    - 1099 dedup logic prevents duplicate alerts in same calendar year
    - Existing test suite passes with no regressions
    - All emails arrive at jeetnair.in@gmail.com for demo flows (verify in staging)
  </done>
</task>

</tasks>

<verification>
1. `grep -n "def send_prop22_earnings_statement_email\|def send_monthly_earnings_summary_email\|def send_quarterly_compliance_report_email\|def send_1099_threshold_alert_email\|def get_driver_ytd_earnings" apps/web/p2p-platform/backend/email_service.py` — all 5 functions exist
2. `grep -n "jeetnair.in@gmail.com" apps/web/p2p-platform/backend/email_service.py` — allowlisted
3. `grep -n "monthly_earnings_summary_job\|quarterly_compliance_report_job" apps/web/p2p-platform/backend/order_flow.py` — scheduler jobs registered
4. `grep -n "1099_threshold_alert" apps/web/p2p-platform/backend/bid_routes.py apps/web/p2p-platform/backend/order_flow.py` — inline checks exist
5. `grep -n "trigger-monthly-report\|trigger-quarterly-report" apps/web/p2p-platform/backend/main_new.py` — admin endpoints exist
6. `pytest tests/ -v --tb=short` — no regressions
</verification>

<success_criteria>
- 4 email templates send with accurate data matching database values
- Prop 22 earnings statement fires automatically after reconciliation job
- Monthly summary fires on 1st of month at 9 AM PT
- Quarterly report fires on Q1/Q2/Q3/Q4 start at 9 AM PT
- 1099 alert fires exactly once per driver per year at $600 threshold
- Admin can manually trigger monthly and quarterly reports via API
- jeetnair.in@gmail.com receives all compliance emails
- Existing test suite passes with zero regressions
</success_criteria>

<output>
After completion, create `.planning/quick/249-build-compliance-email-system-4-email-te/249-SUMMARY.md`
</output>
