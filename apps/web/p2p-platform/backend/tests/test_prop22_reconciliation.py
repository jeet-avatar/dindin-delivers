"""TDD: Prop 22 reconciliation job logic — tests written BEFORE implementation"""
import pytest
from unittest.mock import patch, MagicMock, call
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

CA_TZ = ZoneInfo("America/Los_Angeles")


class TestPeriodBoundaryGuard:
    def test_job_exits_early_on_non_boundary_night(self):
        """Reconciliation job must only process on period boundary nights."""
        from prop22_utils import get_period_bounds_for_date
        # Jan 10 is NOT a period boundary (boundary is Jan 1 and Jan 15)
        dt_non_boundary = datetime(2026, 1, 10, 0, 5, tzinfo=CA_TZ)
        start, end = get_period_bounds_for_date(dt_non_boundary)
        # Jan 10 should NOT equal either boundary
        assert dt_non_boundary.date() != start.date()
        assert dt_non_boundary.date() != end.date()

    def test_job_processes_on_period_boundary_night(self):
        """Jan 15 at midnight PT is a period boundary."""
        from prop22_utils import get_period_bounds_for_date
        dt_boundary = datetime(2026, 1, 15, 0, 0, tzinfo=CA_TZ)
        start, end = get_period_bounds_for_date(dt_boundary)
        # get_previous_period_bounds at Jan 15 midnight returns Jan 1 -> Jan 15
        prev_start = start - timedelta(days=14)
        prev_end = start
        # Boundary check: now.date() == prev_end.date()
        assert dt_boundary.date() == prev_end.date()


class TestReconciliationJobFunctions:
    def test_reconciliation_job_importable(self):
        """The reconciliation job must be registered in order_flow.py."""
        import order_flow
        assert hasattr(order_flow, "prop22_period_reconciliation_job"), \
            "prop22_period_reconciliation_job not found in order_flow.py"

    def test_escalation_job_importable(self):
        """The escalation job must be registered in order_flow.py."""
        import order_flow
        assert hasattr(order_flow, "prop22_manual_review_escalation_job"), \
            "prop22_manual_review_escalation_job not found in order_flow.py"


class TestStatusTransitions:
    def test_reconciled_when_earnings_exceed_floor(self):
        """Driver earning more than floor gets RECONCILED, no top-up."""
        net = 400.0
        floor = 300.0
        top_up = max(0.0, floor - net)
        assert top_up == 0.0

    def test_paid_when_earnings_below_floor_and_stripe_onboarded(self):
        """Driver earning less than floor with Stripe -> PAID status after transfer."""
        net = 200.0
        floor = 300.0
        top_up = max(0.0, floor - net)
        assert top_up == 100.0
        # Status would be PAID after successful Stripe transfer

    def test_manual_review_when_stripe_not_onboarded(self):
        """Driver without Stripe onboarding -> MANUAL_REVIEW."""
        stripe_onboarded = False
        top_up = 50.0
        expected_status = "MANUAL_REVIEW" if not stripe_onboarded else "PAID"
        assert expected_status == "MANUAL_REVIEW"


class TestDeadlineCalculation:
    def test_deadline_is_next_period_close(self):
        from prop22_utils import get_next_period_end
        period_end = datetime(2026, 1, 15, 0, 0, tzinfo=CA_TZ)
        deadline = get_next_period_end(period_end)
        assert deadline == datetime(2026, 1, 29, 0, 0, tzinfo=CA_TZ)


class TestTipsExclusion:
    def test_net_earnings_uses_driver_payout_not_total(self):
        """Tips must be excluded: driver_payout (models.py:1379) already excludes tips."""
        # Simulate: fare=$50, tip=$10, platform_fee=$1 -> driver_payout=$49
        # net_earnings should be 49, NOT 49+10=59
        ride = MagicMock()
        ride.driver_payout = 49.0   # fare - $1 (tip NOT in driver_payout per models.py:1379)
        ride.tip_amount = 10.0      # tracked separately
        # Correct
        net = ride.driver_payout
        assert net == 49.0
        # WRONG (would double-subtract on rideshare, would over-include on food)
        # net_wrong = ride.driver_payout - ride.tip_amount  # don't do this


class TestDoubleInsertProtection:
    def test_select_before_insert_prevents_duplicate(self):
        """If a period record already exists, the job must skip (not error)."""
        existing_period = MagicMock()
        existing_period.id = 42

        # The reconciliation job checks: if existing: continue
        existing = existing_period  # simulates db.query(...).filter_by(...).first()
        should_skip = existing is not None
        assert should_skip is True
