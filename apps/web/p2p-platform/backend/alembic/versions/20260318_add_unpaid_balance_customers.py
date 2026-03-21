"""add has_unpaid_balance to customers

Revision ID: 20260318_unpaid_balance
Revises: 20260318_payment_retry_count
Create Date: 2026-03-18

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.exc import ProgrammingError

revision = '20260318_unpaid_balance'
down_revision = '20260318_payment_retry_count'
branch_labels = None
depends_on = None


def upgrade():
    try:
        op.add_column('customers', sa.Column('has_unpaid_balance', sa.Boolean(), nullable=True, server_default='false'))
    except ProgrammingError as e:
        if 'already exists' in str(e):
            pass  # Column already exists — idempotent
        else:
            raise


def downgrade():
    op.drop_column('customers', 'has_unpaid_balance')
