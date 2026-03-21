"""Add missing ride_requests accessibility and access_for_all columns

Revision ID: 20260321_ride_request_accessibility
Revises: 20260321_driver_missing_columns
Create Date: 2026-03-21

Adds columns that were added to the RideRequest model but never had
corresponding Alembic migrations. Uses ADD COLUMN IF NOT EXISTS for idempotency.
"""
from alembic import op

revision = "20260321_ride_request_accessibility"
down_revision = "20260321_driver_missing_columns"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS accessibility_requested BOOLEAN DEFAULT FALSE")
    op.execute("ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS accessibility_notes TEXT")
    op.execute("ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS access_for_all_fee FLOAT DEFAULT 0.10")


def downgrade():
    pass
