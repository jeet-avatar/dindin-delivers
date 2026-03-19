"""add has_unpaid_balance to customers

Revision ID: 20260318_unpaid_balance
Revises: 20260318_add_unique_constraint_ride_bid
Create Date: 2026-03-18

"""
from alembic import op
import sqlalchemy as sa

revision = '20260318_unpaid_balance'
down_revision = '20260318_payment_retry_count'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('customers', sa.Column('has_unpaid_balance', sa.Boolean(), nullable=True, server_default='false'))


def downgrade():
    op.drop_column('customers', 'has_unpaid_balance')
