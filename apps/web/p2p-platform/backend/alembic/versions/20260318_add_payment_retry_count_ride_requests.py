"""add payment_retry_count to ride_requests

Revision ID: 20260318_payment_retry_count
Revises: 20260318_ride_bid_unique
Create Date: 2026-03-18

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '20260318_payment_retry_count'
down_revision = '20260318_ride_bid_unique'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('ride_requests', sa.Column('payment_retry_count', sa.Integer(), nullable=True))


def downgrade():
    op.drop_column('ride_requests', 'payment_retry_count')
