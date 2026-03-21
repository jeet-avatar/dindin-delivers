"""add has_unpaid_balance to customers

Revision ID: 20260318_unpaid_balance
Revises: 20260318_payment_retry_count
Create Date: 2026-03-18
"""
from alembic import op

revision = "20260318_unpaid_balance"
down_revision = "20260318_payment_retry_count"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE customers ADD COLUMN IF NOT EXISTS has_unpaid_balance BOOLEAN DEFAULT FALSE")


def downgrade():
    op.execute("ALTER TABLE customers DROP COLUMN IF EXISTS has_unpaid_balance")
