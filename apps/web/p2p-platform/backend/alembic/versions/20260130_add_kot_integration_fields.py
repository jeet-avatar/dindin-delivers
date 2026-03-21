"""Add KOT (Kitchen Order Ticket) / POS integration fields to vendors

Revision ID: add_kot_integration
Revises:
Create Date: 2026-01-30

This migration adds fields for Square, Clover, and Toast POS integrations
to enable automatic kitchen order ticket printing when orders are accepted.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_kot_integration'
down_revision = None
branch_labels = None
depends_on = None


def _col(table, col):
    try:
        op.add_column(table, col)
    except ProgrammingError as e:
        if "already exists" in str(e):
            pass
        else:
            raise


def upgrade():
    """Add KOT integration columns to vendors table (idempotent)."""
    op.execute("ALTER TABLE vendors ADD COLUMN IF NOT EXISTS kot_integration_type VARCHAR(50) DEFAULT 'none'")
    op.execute("ALTER TABLE vendors ADD COLUMN IF NOT EXISTS kot_enabled BOOLEAN DEFAULT FALSE")
    op.execute("ALTER TABLE vendors ADD COLUMN IF NOT EXISTS kot_api_key VARCHAR(500)")
    op.execute("ALTER TABLE vendors ADD COLUMN IF NOT EXISTS kot_api_secret VARCHAR(500)")
    op.execute("ALTER TABLE vendors ADD COLUMN IF NOT EXISTS kot_location_id VARCHAR(255)")
    op.execute("ALTER TABLE vendors ADD COLUMN IF NOT EXISTS kot_merchant_id VARCHAR(255)")
    op.execute("ALTER TABLE vendors ADD COLUMN IF NOT EXISTS kot_restaurant_guid VARCHAR(255)")
    op.execute("ALTER TABLE vendors ADD COLUMN IF NOT EXISTS kot_printer_id VARCHAR(255)")
    op.execute("ALTER TABLE vendors ADD COLUMN IF NOT EXISTS kot_webhook_url VARCHAR(500)")
    op.execute("ALTER TABLE vendors ADD COLUMN IF NOT EXISTS kot_auto_print BOOLEAN DEFAULT TRUE")


def downgrade():
    """Remove KOT integration columns from vendors table"""

    op.drop_column('vendors', 'kot_auto_print')
    op.drop_column('vendors', 'kot_webhook_url')
    op.drop_column('vendors', 'kot_printer_id')
    op.drop_column('vendors', 'kot_restaurant_guid')
    op.drop_column('vendors', 'kot_merchant_id')
    op.drop_column('vendors', 'kot_location_id')
    op.drop_column('vendors', 'kot_api_secret')
    op.drop_column('vendors', 'kot_api_key')
    op.drop_column('vendors', 'kot_enabled')
    op.drop_column('vendors', 'kot_integration_type')

    print("❌ KOT integration fields removed from vendors table")
