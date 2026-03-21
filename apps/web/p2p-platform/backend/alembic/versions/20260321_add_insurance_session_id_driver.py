"""Add insurance_session_id to drivers table

Revision ID: 20260321_insurance_session_id
Revises: 20260320_driver_cancel_tracking
Create Date: 2026-03-21
"""
from alembic import op

revision = "20260321_insurance_session_id"
down_revision = "20260320_driver_cancel_tracking"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS insurance_session_id VARCHAR(36)")


def downgrade():
    op.execute("ALTER TABLE drivers DROP COLUMN IF EXISTS insurance_session_id")
