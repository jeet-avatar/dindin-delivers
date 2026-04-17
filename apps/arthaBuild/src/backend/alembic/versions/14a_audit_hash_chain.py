"""Phase 14: Add prev_hash + row_hash to audit_logs, erased_at to users (GDPR + SOC2).

Revision ID: 14a_audit_hash_chain
Revises: 13a_identity_access
Create Date: 2026-04-13

Uses batch_alter_table (SQLite mandatory for column changes).
render_as_batch=True is set in env.py.
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '14a_audit_hash_chain'
down_revision = '13a_identity_access'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add prev_hash + row_hash to audit_logs
    with op.batch_alter_table("audit_logs") as batch_op:
        batch_op.add_column(sa.Column("prev_hash", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("row_hash", sa.String(), nullable=True))

    # Add erased_at to users (GDPR erasure timestamp)
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("erased_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("erased_at")

    with op.batch_alter_table("audit_logs") as batch_op:
        batch_op.drop_column("row_hash")
        batch_op.drop_column("prev_hash")
