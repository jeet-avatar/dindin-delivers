"""feat: Add vendor publishing fields for ZIP Dashboard

Revision ID: 001_vendor_publishing
Revises: None (Initial migration)
Create Date: 2025-12-29 06:00:00 UTC

Migration Type: schema
Author: Dollor.ai Engineering
Reviewed By: [APPROVED]

Description:
Adds publishing status fields to vendors table to support:
- Multi-platform publishing (iOS, Android, Web)
- ZIP Dashboard vendor approval workflow
- Delivery settings configuration
- Publishing audit trail

Impact Analysis:
- Tables Affected: vendors
- Estimated Downtime: None (online migration - ADD COLUMN is non-blocking)
- Rollback Risk: Low (no data loss on rollback)

Business Context:
These fields enable the ZIP Vendor Approval dashboard to:
1. Track which vendors are published to which platforms
2. Store delivery settings (fees, minimums)
3. Maintain audit trail of publishing timestamps
"""
from typing import Sequence, Union
from datetime import datetime

from alembic import op
import sqlalchemy as sa


# Revision identifiers
revision: str = '001_vendor_publishing'
down_revision: Union[str, None] = '000_migration_audit'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add vendor publishing and delivery fields.

    Fields Added:
    - is_published: Boolean flag for publish status
    - published_at: Timestamp when vendor went live
    - published_platforms: JSON array of platforms ["ios", "android", "web"]
    - delivery_enabled: Whether vendor accepts delivery orders
    - minimum_order: Minimum order amount for delivery
    - delivery_fee: Flat delivery fee charged to customer
    - ein_number: Employer Identification Number for tax purposes
    - description: Vendor description for customer-facing display
    - address: Full street address (some vendors only have street field)
    """
    from sqlalchemy import inspect
    from alembic import op

    # Get current connection and check existing columns
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_columns = [col['name'] for col in inspector.get_columns('vendors')]

    # Helper function to add column if not exists
    def add_column_if_not_exists(table, column):
        if column.name not in existing_columns:
            op.add_column(table, column)
            print(f"  Added column: {column.name}")
        else:
            print(f"  Column already exists: {column.name}")

    print(f"[{datetime.utcnow().isoformat()}] Checking vendor columns...")

    # Publishing Status Fields
    add_column_if_not_exists('vendors',
        sa.Column('is_published', sa.Boolean(), nullable=True, server_default='false',
                  comment='True when vendor is live on all published platforms')
    )

    add_column_if_not_exists('vendors',
        sa.Column('published_at', sa.DateTime(), nullable=True,
                  comment='Timestamp when vendor was first published')
    )

    add_column_if_not_exists('vendors',
        sa.Column('published_platforms', sa.Text(), nullable=True,
                  comment='JSON array of platforms: ["ios", "android", "web"]')
    )

    # Delivery Settings Fields
    add_column_if_not_exists('vendors',
        sa.Column('delivery_enabled', sa.Boolean(), nullable=True, server_default='true',
                  comment='Whether vendor accepts delivery orders')
    )

    add_column_if_not_exists('vendors',
        sa.Column('minimum_order', sa.Float(), nullable=True, server_default='0.0',
                  comment='Minimum order amount for delivery in USD')
    )

    add_column_if_not_exists('vendors',
        sa.Column('delivery_fee', sa.Float(), nullable=True, server_default='0.0',
                  comment='Flat delivery fee charged to customer in USD')
    )

    # Business Information Fields
    add_column_if_not_exists('vendors',
        sa.Column('ein_number', sa.String(50), nullable=True,
                  comment='Employer Identification Number for tax/1099 purposes')
    )

    add_column_if_not_exists('vendors',
        sa.Column('description', sa.Text(), nullable=True,
                  comment='Vendor description shown to customers')
    )

    add_column_if_not_exists('vendors',
        sa.Column('address', sa.Text(), nullable=True,
                  comment='Full formatted address for display')
    )

    # Create indexes if not exist
    existing_indexes = [idx['name'] for idx in inspector.get_indexes('vendors')]

    if 'ix_vendors_is_published' not in existing_indexes:
        op.create_index(
            'ix_vendors_is_published',
            'vendors',
            ['is_published'],
            unique=False,
            postgresql_where=sa.text('is_published = true')
        )
        print("  Created index: ix_vendors_is_published")

    if 'ix_vendors_onboarding_status' not in existing_indexes:
        op.create_index(
            'ix_vendors_onboarding_status',
            'vendors',
            ['onboarding_status'],
            unique=False
        )
        print("  Created index: ix_vendors_onboarding_status")

    # Log migration completion
    print(f"[{datetime.utcnow().isoformat()}] Migration 001_vendor_publishing: Upgrade completed")


def downgrade() -> None:
    """
    Remove vendor publishing and delivery fields.

    WARNING: This will remove all publishing data.
    Ensure backup exists before executing.
    """

    # Drop indexes first
    op.drop_index('ix_vendors_onboarding_status', table_name='vendors')
    op.drop_index('ix_vendors_is_published', table_name='vendors')

    # Remove columns (reverse order of creation)
    op.drop_column('vendors', 'address')
    op.drop_column('vendors', 'description')
    op.drop_column('vendors', 'ein_number')
    op.drop_column('vendors', 'delivery_fee')
    op.drop_column('vendors', 'minimum_order')
    op.drop_column('vendors', 'delivery_enabled')
    op.drop_column('vendors', 'published_platforms')
    op.drop_column('vendors', 'published_at')
    op.drop_column('vendors', 'is_published')

    print(f"[{datetime.utcnow().isoformat()}] Migration 001_vendor_publishing: Downgrade completed")
