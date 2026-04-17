"""Add NOCASE collation to User.email

Revision ID: e1f2g3h4i5j6
Revises: d5e6f7a8b9ca
Create Date: 2026-04-11

CASE-006: Login normalizes email to lowercase but the column had no case-insensitive
collation. Mixed-case emails stored by other tools could fail lookups. NOCASE ensures
SQLite comparisons are case-insensitive at the DB level.
"""
from alembic import op
import sqlalchemy as sa

revision = 'e1f2g3h4i5j6'
down_revision = 'd5e6f7a8b9ca'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column(
            'email',
            type_=sa.String(collation='NOCASE'),
            existing_nullable=False,
        )


def downgrade():
    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column(
            'email',
            type_=sa.String(),
            existing_nullable=False,
        )
