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


def upgrade():
    """Add KOT integration columns to vendors table"""

    # Add KOT integration fields
    op.add_column('vendors', sa.Column('kot_integration_type', sa.String(50), server_default='none'))
    op.add_column('vendors', sa.Column('kot_enabled', sa.Boolean(), server_default='false'))
    op.add_column('vendors', sa.Column('kot_api_key', sa.String(500), nullable=True))
    op.add_column('vendors', sa.Column('kot_api_secret', sa.String(500), nullable=True))
    op.add_column('vendors', sa.Column('kot_location_id', sa.String(255), nullable=True))
    op.add_column('vendors', sa.Column('kot_merchant_id', sa.String(255), nullable=True))
    op.add_column('vendors', sa.Column('kot_restaurant_guid', sa.String(255), nullable=True))
    op.add_column('vendors', sa.Column('kot_printer_id', sa.String(255), nullable=True))
    op.add_column('vendors', sa.Column('kot_webhook_url', sa.String(500), nullable=True))
    op.add_column('vendors', sa.Column('kot_auto_print', sa.Boolean(), server_default='true'))

    print("✅ KOT integration fields added to vendors table")
    print("   - kot_integration_type: 'none', 'square', 'clover', 'toast'")
    print("   - kot_enabled: Enable/disable KOT printing")
    print("   - kot_api_key: POS API key (encrypted)")
    print("   - kot_location_id: Square Location ID")
    print("   - kot_merchant_id: Clover Merchant ID")
    print("   - kot_restaurant_guid: Toast Restaurant GUID")
    print("   - kot_auto_print: Auto-print on order accept")


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
