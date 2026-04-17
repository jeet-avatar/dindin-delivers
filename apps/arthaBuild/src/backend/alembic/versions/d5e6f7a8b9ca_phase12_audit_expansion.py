"""phase12 audit expansion

Revision ID: d5e6f7a8b9ca
Revises: c4d5e6f7a8b9
Create Date: 2026-04-11

Adds 5 new columns to audit_logs for SOC2 CC7.2 compliance:
  actor_email, actor_role, result, ip_address, target

Also alters admin_id from NOT NULL to nullable (Phase 12 auth events
do not have an admin_id — they have actor_email instead).

Creates composite index ix_audit_logs_ts_actor on (created_at, actor_email)
for efficient time-range queries in the audit viewer.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'd5e6f7a8b9ca'
down_revision = 'c4d5e6f7a8b9'
branch_labels = None
depends_on = None


def upgrade():
    # Step 1: Add 5 new Phase 12 columns (all nullable for migration safety)
    with op.batch_alter_table("audit_logs") as batch_op:
        batch_op.add_column(sa.Column("actor_email", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("actor_role", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("result", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("ip_address", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("target", sa.String(), nullable=True))

    # Step 2: Alter admin_id from NOT NULL to nullable
    # (auth events have no admin_id — they use actor_email instead)
    with op.batch_alter_table("audit_logs") as batch_op:
        batch_op.alter_column(
            "admin_id",
            existing_type=sa.Integer(),
            nullable=True,
        )

    # Step 3: Create composite index for time-range + actor queries
    op.create_index(
        "ix_audit_logs_ts_actor",
        "audit_logs",
        ["created_at", "actor_email"],
    )


def downgrade():
    op.drop_index("ix_audit_logs_ts_actor", table_name="audit_logs")

    with op.batch_alter_table("audit_logs") as batch_op:
        batch_op.alter_column(
            "admin_id",
            existing_type=sa.Integer(),
            nullable=False,
        )

    with op.batch_alter_table("audit_logs") as batch_op:
        batch_op.drop_column("target")
        batch_op.drop_column("ip_address")
        batch_op.drop_column("result")
        batch_op.drop_column("actor_role")
        batch_op.drop_column("actor_email")
