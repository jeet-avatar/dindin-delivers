"""Add driver cancel rate tracking columns

Revision ID: 20260320_driver_cancel_tracking
Revises: 20260318_unpaid_balance
Create Date: 2026-03-20
"""
from alembic import op

revision = "20260320_driver_cancel_tracking"
down_revision = "20260318_unpaid_balance"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS ride_accept_count INTEGER DEFAULT 0")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS ride_cancel_count INTEGER DEFAULT 0")


def downgrade():
    op.execute("ALTER TABLE drivers DROP COLUMN IF EXISTS ride_cancel_count")
    op.execute("ALTER TABLE drivers DROP COLUMN IF EXISTS ride_accept_count")
