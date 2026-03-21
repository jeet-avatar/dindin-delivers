"""Add delivery decision window fields to orders table

Revision ID: 004_delivery_decision
Revises: 003_restaurant_acceptance
Create Date: 2026-01-01 12:00:00 UTC

Migration Type: schema
Author: Dollor.ai Engineering

Description:
Adds fields to support the 3-minute delivery decision window feature:
- delivery_decision_sent_at: When restaurant was asked about delivery
- restaurant_will_deliver: True if restaurant self-delivers, False for driver
- delivery_decision_at: When restaurant made the decision
- delivery_decision_timeout_at: When 3-minute timeout occurred

New Order Statuses:
- pending_delivery_decision: Waiting for restaurant to decide on delivery (3-min window)
- restaurant_will_deliver: Restaurant chose to self-deliver
- delivery_decision_timeout: Restaurant didn't respond - sent to drivers

Flow:
1. Order PREPARING -> Restaurant marks READY
2. READY -> PENDING_DELIVERY_DECISION (3-min timer starts)
3. Restaurant ACCEPTS delivery -> RESTAURANT_WILL_DELIVER (self-deliver)
   OR Restaurant DECLINES delivery -> READY_FOR_PICKUP (goes to drivers)
   OR 3-min TIMEOUT -> READY_FOR_PICKUP (auto-send to drivers)
"""
from typing import Sequence, Union
from datetime import datetime

from alembic import op
import sqlalchemy as sa


revision: str = '004_delivery_decision'
down_revision: Union[str, None] = '002_restaurant_acceptance'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add delivery decision window fields to orders table."""

    # Add delivery decision timestamp fields
    op.add_column('orders', sa.Column('delivery_decision_sent_at', sa.DateTime(), nullable=True,
                  comment='When restaurant was asked about delivery decision'))

    op.add_column('orders', sa.Column('restaurant_will_deliver', sa.Boolean(), nullable=True,
                  comment='True if restaurant self-delivers, False if using driver'))

    op.add_column('orders', sa.Column('delivery_decision_at', sa.DateTime(), nullable=True,
                  comment='When restaurant made the delivery decision'))

    op.add_column('orders', sa.Column('delivery_decision_timeout_at', sa.DateTime(), nullable=True,
                  comment='When 3-minute delivery decision timeout occurred'))

    # Create index for querying pending delivery decision orders
    op.create_index(
        'ix_orders_pending_delivery_decision',
        'orders',
        ['status', 'delivery_decision_sent_at'],
        postgresql_where=sa.text("status = 'pending_delivery_decision'")
    )

    print(f"[{datetime.utcnow().isoformat()}] Migration 004_delivery_decision: Added delivery decision fields")


def downgrade() -> None:
    """Remove delivery decision window fields from orders table."""

    # Drop index
    op.drop_index('ix_orders_pending_delivery_decision', table_name='orders')

    # Drop columns
    op.drop_column('orders', 'delivery_decision_timeout_at')
    op.drop_column('orders', 'delivery_decision_at')
    op.drop_column('orders', 'restaurant_will_deliver')
    op.drop_column('orders', 'delivery_decision_sent_at')

    print(f"[{datetime.utcnow().isoformat()}] Migration 004_delivery_decision: Removed delivery decision fields")
