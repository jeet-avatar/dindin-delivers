"""Phase 22: Add script_generations table for free-tier quota tracking.

Revision ID: 22a_free_tier_script_counter
Revises: 17a_onboarding
Create Date: 2026-04-14

Uses render_as_batch=True (SQLite mandatory).
"""
from alembic import op
import sqlalchemy as sa

revision = '22a_free_tier_script_counter'
down_revision = '17a_onboarding'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "script_generations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(datetime('now'))")),
    )
    op.create_index("ix_script_generations_user_id", "script_generations", ["user_id"])


def downgrade():
    op.drop_index("ix_script_generations_user_id", table_name="script_generations")
    op.drop_table("script_generations")
