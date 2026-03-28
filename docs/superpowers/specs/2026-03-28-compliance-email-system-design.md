# Compliance Email System — Design Spec

**Date:** 2026-03-28
**Status:** Approved
**Scope:** Layer compliance emails onto existing Prop 22 infrastructure

## Goal

Add compliance email notifications to the existing Prop 22 backend so that:
- Drivers receive earnings statements and monthly summaries via email
- Admin receives quarterly compliance reports at `jeetnair.in@gmail.com`
- 1099-NEC threshold alerts fire when drivers cross $600 YTD
- All emails are verifiable via E2E testing with demo accounts

## Architecture

All new code lives in existing files — no new services or tables.

### Files Modified

| File | Changes |
|------|---------|
| `email_service.py` | 4 new email template functions |
| `order_flow.py` | Hook into existing reconciliation job + 2 new scheduler jobs |
| `bid_routes.py` | 1099 threshold check at ride completion |
| `main_new.py` | 2 admin trigger endpoints for manual testing |

### No New Tables

- Prop 22 data: already in `prop22_earning_periods` + `prop22_earnings_statement`
- 1099 YTD: computed via `SUM(driver_payout)` from `ride_requests` + `orders` for current year
- Email audit trail: existing `Communication` table in `models_extended.py`

## Email Templates

### 1. Prop 22 Earnings Statement Email

**Function:** `send_prop22_earnings_statement_email(driver, period)`
**Trigger:** Called from `prop22_period_reconciliation_job` after each 14-day period closes
**Recipient:** Driver's registered email
**Subject:** "Dollor — Prop 22 Earnings Statement (Period {start} – {end})"

**Content (BPC §7454(b)(2) compliant):**
- Period dates (start – end)
- Engaged hours (hours:minutes)
- Engaged miles
- Minimum floor amount = (engaged_hours × 1.20 × city_min_wage) + (engaged_miles × $0.37)
- Actual net earnings (excluding tips)
- Top-up amount (if floor > earnings)
- QTD engaged hours (calendar quarter running total)
- Healthcare stipend eligibility note (if engaged_hours >= 15 hrs/week average)

### 2. Monthly Earnings Summary Email

**Function:** `send_monthly_earnings_summary_email(driver, year, month)`
**Trigger:** `monthly_earnings_summary_job` — CronTrigger(day=1, hour=9, timezone='America/Los_Angeles')
**Recipient:** Driver's registered email
**Subject:** "Dollor — Your {Month} {Year} Earnings Summary"

**Content:**
- Food delivery: order count, total delivery fees, total tips
- Rideshare: ride count, total fares, total tips
- Platform fees paid (food: $0, rideshare: $1-$3 tiered)
- Prop 22 top-ups received (if any)
- Net payout total
- YTD earnings running total

### 3. Quarterly Compliance Report Email

**Function:** `send_quarterly_compliance_report_email(admin_email, year, quarter)`
**Trigger:** `quarterly_compliance_report_job` — CronTrigger(month='1,4,7,10', day=1, hour=9, timezone='America/Los_Angeles')
**Recipient:** `jeetnair.in@gmail.com` (configurable)
**Subject:** "Dollor — Q{N} {Year} Compliance Report"

**Content:**
- Total active drivers in period
- Prop 22 summary: total engaged hours, total floor amount, total top-ups paid, drivers receiving top-ups
- Per-driver breakdown table: name, engaged hours, floor, earned, top-up, status
- 1099-NEC section: drivers who crossed $600 YTD, drivers approaching (>$500)
- Platform revenue: total customer fees, total driver fees, net platform revenue
- Regulatory notes: next quarter deadlines, any manual review items pending

### 4. 1099-NEC Threshold Alert Email

**Function:** `send_1099_threshold_alert_email(driver)`
**Trigger:** Inline check at ride/order completion when driver YTD earnings first cross $600
**Recipient:** Driver's registered email + push notification
**Subject:** "Dollor — Important Tax Information"

**Content:**
- "Your year-to-date earnings on Dollor have exceeded $600"
- "You will receive a 1099-NEC tax form for this calendar year"
- "Please ensure your tax information is up to date in the app"
- Link to tax FAQ (placeholder)

**Guard:** Only sends once per calendar year per driver — tracked via a flag on the `Communication` table (check for existing 1099 alert in current year before sending).

## Scheduler Jobs

All jobs use existing APScheduler instance and file-lock guard pattern from `order_flow.py:2881`.

| Job | Schedule | Function |
|-----|----------|----------|
| Prop 22 reconciliation (EXISTS) | Every 14 days at midnight PT | `prop22_period_reconciliation_job` — add email call at end |
| Monthly earnings summary (NEW) | 1st of month, 9 AM PT | `monthly_earnings_summary_job` |
| Quarterly compliance report (NEW) | Jan/Apr/Jul/Oct 1st, 9 AM PT | `quarterly_compliance_report_job` |
| 1099 threshold check | Inline at completion | No scheduler — runs in bid_routes.py and order_flow.py |

## Admin Testing Endpoints

For manual E2E testing without waiting for schedulers:

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/admin/compliance/trigger-monthly-report` | POST | require_admin | Trigger monthly earnings email for specified driver + month |
| `/api/admin/compliance/trigger-quarterly-report` | POST | require_admin | Trigger quarterly compliance email for specified quarter |

Request body: `{"driver_email": "demo.driver@dollor.ai", "year": 2026, "month": 3}` or `{"year": 2026, "quarter": 1}`

## Demo/Testing Configuration

- Add `jeetnair.in@gmail.com` to email allowlist in `email_service.py`
- Demo E2E flow:
  1. Login as demo customer → place food order → verify order confirmation + receipt emails
  2. Login as demo customer → request rideshare → complete ride → verify ride receipt + Prop 22 disclosure
  3. Trigger manual monthly report → verify earnings summary email arrives
  4. Trigger manual quarterly report → verify compliance report arrives at jeetnair.in@gmail.com
  5. Check Prop 22 calculation accuracy against known test values

## 1099-NEC YTD Tracking

Lightweight approach — no new tables:

```python
def get_driver_ytd_earnings(db, driver_id, year):
    """Sum all completed ride + order payouts for current year."""
    ride_total = db.query(func.sum(RideRequest.driver_payout)).filter(
        RideRequest.driver_id == driver_id,
        extract('year', RideRequest.completed_at) == year,
        RideRequest.status == 'COMPLETED'
    ).scalar() or 0

    order_total = db.query(func.sum(Order.delivery_fee)).filter(
        Order.driver_id == driver_id,
        extract('year', Order.delivered_at) == year,
        Order.status == 'DELIVERED'
    ).scalar() or 0

    return ride_total + order_total
```

Check at ride/order completion. If YTD crosses $600 and no 1099 alert sent this year → send alert.

## What's NOT In Scope

- 50-state compliance engine (Phase 14)
- W-9 gate / TIN validation (Phase 14)
- TaxJar integration (Phase 14)
- 1099-NEC form PDF generation (Phase 14)
- State-specific compliance rules (Phase 14)
- SMS notifications
- In-app notification center

## Success Criteria

1. All 4 email templates send correctly with accurate data
2. Prop 22 earnings statement matches database values exactly
3. Monthly summary totals match actual ride/order payouts
4. Quarterly report includes all active drivers with correct Prop 22 status
5. 1099 threshold alert fires exactly once per driver per year at $600
6. All emails arrive at jeetnair.in@gmail.com for demo flows
7. Admin trigger endpoints work for manual testing
8. Existing Prop 22 reconciliation job continues working (no regression)
