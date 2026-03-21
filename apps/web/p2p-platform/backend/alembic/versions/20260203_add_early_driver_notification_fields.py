"""Add early driver notification fields to orders

Revision ID: add_early_driver_notification
Revises:
Create Date: 2026-02-03

This migration adds fields for early driver notification feature:
- estimated_prep_minutes: Prep time in minutes (e.g., 15)
- estimated_ready_at: Timestamp when food will be ready
- driver_en_route: True when driver accepted but food not ready
- driver_accepted_at: When driver accepted the order
- driver_eta_to_restaurant: Driver ETA to restaurant in minutes
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.exc import ProgrammingError


# revision identifiers, used by Alembic.
revision = "add_early_driver_notification"
down_revision = None
branch_labels = None
depends_on = None


def _add_column_if_not_exists(table, column):
    """Add a column only if it does not already exist (idempotent)."""
    try:
        op.add_column(table, column)
    except ProgrammingError as e:
        if "already exists" in str(e):
            pass  # Column already exists — safe to skip
        else:
            raise


def upgrade():
    """Add early driver notification columns to orders table (idempotent)."""
    _add_column_if_not_exists("orders", sa.Column("estimated_prep_minutes", sa.Integer(), nullable=True,
                              comment="Estimated prep time in minutes (e.g., 15)"))
    _add_column_if_not_exists("orders", sa.Column("estimated_ready_at", sa.DateTime(), nullable=True,
                              comment="Calculated timestamp when food will be ready"))
    _add_column_if_not_exists("orders", sa.Column("driver_en_route", sa.Boolean(), server_default="false",
                              comment="True when driver accepted but food not ready yet"))
    _add_column_if_not_exists("orders", sa.Column("driver_accepted_at", sa.DateTime(), nullable=True,
                              comment="Timestamp when driver accepted the order"))
    _add_column_if_not_exists("orders", sa.Column("driver_eta_to_restaurant", sa.Integer(), nullable=True,
                              comment="Driver ETA to restaurant in minutes"))


def downgrade():
    """Remove early driver notification columns from orders table."""
    op.drop_column("orders", "driver_eta_to_restaurant")
    op.drop_column("orders", "driver_accepted_at")
    op.drop_column("orders", "driver_en_route")
    op.drop_column("orders", "estimated_ready_at")
    op.drop_column("orders", "estimated_prep_minutes")
