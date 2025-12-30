"""Add restaurant acceptance window fields to orders table

Revision ID: 003_restaurant_acceptance
Revises: 002_vendor_publishing
Create Date: 2025-12-29 12:00:00 UTC

Migration Type: schema
Author: Dollor.ai Engineering

Description:
Adds fields to support the 3-minute restaurant acceptance window feature:
- sent_to_restaurant_at: When order was sent to restaurant
- restaurant_accepted_at: When restaurant accepted the order
- restaurant_declined_at: When restaurant declined
- restaurant_decline_reason: Reason for decline
- restaurant_timeout_at: When 3-minute timeout occurred
- ready_for_pickup_at: When order is ready for driver pickup

New Order Statuses:
- pending_restaurant: Waiting for restaurant to accept (3-min window)
- declined_by_restaurant: Restaurant declined the order
- restaurant_timeout: Restaurant didn't respond in 3 minutes

Flow:
1. Customer places order -> Payment captured
2. Payment confirmed -> PENDING_RESTAURANT (3-min timer starts)
3. Restaurant ACCEPTS -> PREPARING (drivers notified)
   OR Restaurant DECLINES -> Customer refunded
   OR 3-min TIMEOUT -> Auto-cancel, customer refunded
"""
from typing import Sequence, Union
from datetime import datetime

from alembic import op
import sqlalchemy as sa


revision: str = '002_restaurant_acceptance'
down_revision: Union[str, None] = '001_vendor_publishing'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add restaurant acceptance window fields to orders table."""

    # Add restaurant acceptance timestamp fields
    op.add_column('orders', sa.Column('sent_to_restaurant_at', sa.DateTime(), nullable=True,
                  comment='When order was sent to restaurant for acceptance'))

    op.add_column('orders', sa.Column('restaurant_accepted_at', sa.DateTime(), nullable=True,
                  comment='When restaurant accepted the order'))

    op.add_column('orders', sa.Column('restaurant_declined_at', sa.DateTime(), nullable=True,
                  comment='When restaurant declined the order'))

    op.add_column('orders', sa.Column('restaurant_decline_reason', sa.String(500), nullable=True,
                  comment='Reason for restaurant decline'))

    op.add_column('orders', sa.Column('restaurant_timeout_at', sa.DateTime(), nullable=True,
                  comment='When 3-minute timeout occurred'))

    op.add_column('orders', sa.Column('ready_for_pickup_at', sa.DateTime(), nullable=True,
                  comment='When order is ready for driver pickup'))

    # Create index for querying pending restaurant orders
    op.create_index(
        'ix_orders_pending_restaurant',
        'orders',
        ['status', 'sent_to_restaurant_at'],
        postgresql_where=sa.text("status = 'pending_restaurant'")
    )

    print(f"[{datetime.utcnow().isoformat()}] Migration 003_restaurant_acceptance: Added restaurant acceptance fields")


def downgrade() -> None:
    """Remove restaurant acceptance window fields from orders table."""

    # Drop index
    op.drop_index('ix_orders_pending_restaurant', table_name='orders')

    # Drop columns
    op.drop_column('orders', 'ready_for_pickup_at')
    op.drop_column('orders', 'restaurant_timeout_at')
    op.drop_column('orders', 'restaurant_decline_reason')
    op.drop_column('orders', 'restaurant_declined_at')
    op.drop_column('orders', 'restaurant_accepted_at')
    op.drop_column('orders', 'sent_to_restaurant_at')

    print(f"[{datetime.utcnow().isoformat()}] Migration 003_restaurant_acceptance: Removed restaurant acceptance fields")
