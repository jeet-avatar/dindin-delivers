"""Add insurance_session_id to drivers table

Revision ID: 20260321_insurance_session_id
Revises: 20260320_driver_cancel_tracking
Create Date: 2026-03-21

Adds insurance_session_id column to drivers table for UBI (Usage-Based Insurance)
session tracking. Added to Driver model in feat(insurance) commit on 2026-03-15
but was never migrated to the database.
"""
from alembic import op
import sqlalchemy as sa

revision = '20260321_insurance_session_id'
down_revision = '20260320_driver_cancel_tracking'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('drivers', sa.Column(
        'insurance_session_id',
        sa.String(36),
        nullable=True,
        comment='Current insurance session UUID for UBI mileage tracking'
    ))


def downgrade():
    op.drop_column('drivers', 'insurance_session_id')
