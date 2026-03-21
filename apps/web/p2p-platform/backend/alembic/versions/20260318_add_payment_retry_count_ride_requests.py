"""add payment_retry_count to ride_requests

Revision ID: 20260318_payment_retry_count
Revises: 20260318_ride_bid_unique
Create Date: 2026-03-18
"""
from alembic import op

revision = "20260318_payment_retry_count"
down_revision = "20260318_ride_bid_unique"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS payment_retry_count INTEGER")


def downgrade():
    op.execute("ALTER TABLE ride_requests DROP COLUMN IF EXISTS payment_retry_count")
