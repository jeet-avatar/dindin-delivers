"""Add early driver notification fields to orders

Revision ID: add_early_driver_notification
Revises:
Create Date: 2026-02-03

Adds fields for early driver notification feature to orders table.
"""
from alembic import op

revision = "add_early_driver_notification"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    """Add early driver notification columns to orders table (idempotent)."""
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_prep_minutes INTEGER")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_ready_at TIMESTAMP")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_en_route BOOLEAN DEFAULT FALSE")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_accepted_at TIMESTAMP")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_eta_to_restaurant INTEGER")


def downgrade():
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS driver_eta_to_restaurant")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS driver_accepted_at")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS driver_en_route")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS estimated_ready_at")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS estimated_prep_minutes")
