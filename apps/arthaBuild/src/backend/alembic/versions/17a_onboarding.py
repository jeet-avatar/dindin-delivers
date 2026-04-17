"""Phase 17: Add onboarding_completed to users table.

Revision ID: 17a_onboarding
Revises: 16a_api_key_model
Create Date: 2026-04-13

Uses render_as_batch=True (SQLite mandatory for ALTER TABLE operations).
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '17a_onboarding'
down_revision = '16a_api_key_model'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "onboarding_completed",
                sa.Boolean(),
                nullable=False,
                server_default="0",
            )
        )


def downgrade():
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_column("onboarding_completed")
