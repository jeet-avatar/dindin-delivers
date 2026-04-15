"""phase13 identity access — MFA secrets + team ip_allowlist

Revision ID: 13a_identity_access
Revises: d5e6f7a8b9ca
Create Date: 2026-04-13

Creates mfa_secrets table and adds ip_allowlist column to teams.
Uses batch_alter_table (SQLite mandatory for ALTER TABLE — CLAUDE.md rule).
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '13a_identity_access'
down_revision = 'e1f2g3h4i5j6'
branch_labels = None
depends_on = None


def upgrade():
    # Create mfa_secrets table
    op.create_table(
        "mfa_secrets",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("secret", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=True, default=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_mfa_secrets_user_id", "mfa_secrets", ["user_id"])

    # Add ip_allowlist column to teams (batch_alter_table for SQLite compatibility)
    with op.batch_alter_table("teams") as batch_op:
        batch_op.add_column(sa.Column("ip_allowlist", sa.String(), nullable=True))


def downgrade():
    with op.batch_alter_table("teams") as batch_op:
        batch_op.drop_column("ip_allowlist")

    op.drop_index("ix_mfa_secrets_user_id", table_name="mfa_secrets")
    op.drop_table("mfa_secrets")
