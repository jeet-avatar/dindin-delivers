"""Add driver cancel rate tracking columns

Revision ID: 20260320_driver_cancel_tracking
Revises: 20260318_unpaid_balance
Create Date: 2026-03-20
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.exc import ProgrammingError

revision = '20260320_driver_cancel_tracking'
down_revision = '20260318_unpaid_balance'
branch_labels = None
depends_on = None


def upgrade():
    try:
        op.add_column('drivers', sa.Column('ride_accept_count', sa.Integer(), nullable=True, server_default='0'))
    except ProgrammingError as e:
        if 'already exists' in str(e):
            pass
        else:
            raise
    try:
        op.add_column('drivers', sa.Column('ride_cancel_count', sa.Integer(), nullable=True, server_default='0'))
    except ProgrammingError as e:
        if 'already exists' in str(e):
            pass
        else:
            raise


def downgrade():
    op.drop_column('drivers', 'ride_cancel_count')
    op.drop_column('drivers', 'ride_accept_count')
