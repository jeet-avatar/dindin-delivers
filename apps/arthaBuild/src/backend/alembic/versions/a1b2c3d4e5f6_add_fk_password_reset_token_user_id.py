"""add_fk_password_reset_token_user_id

Adds a CASCADE foreign key from password_reset_tokens.user_id → users.id.
SQLite requires batch mode to add FK constraints on existing tables.

Revision ID: a1b2c3d4e5f6
Revises: 55f7c14b391d
Create Date: 2026-04-08

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '55f7c14b391d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # SQLite does not support ADD CONSTRAINT — batch mode rebuilds the table with the FK.
    with op.batch_alter_table('password_reset_tokens', schema=None) as batch_op:
        batch_op.alter_column(
            'user_id',
            existing_type=sa.Integer(),
            nullable=False,
            new_column_name='user_id',
        )
        # Drop the plain index and recreate it (batch recreates the table anyway)
        batch_op.drop_index('ix_password_reset_tokens_user_id')
        batch_op.create_foreign_key(
            'fk_prt_user_id',
            'users',
            ['user_id'],
            ['id'],
            ondelete='CASCADE',
        )
        batch_op.create_index('ix_password_reset_tokens_user_id', ['user_id'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('password_reset_tokens', schema=None) as batch_op:
        batch_op.drop_index('ix_password_reset_tokens_user_id')
        batch_op.drop_constraint('fk_prt_user_id', type_='foreignkey')
        batch_op.create_index('ix_password_reset_tokens_user_id', ['user_id'], unique=False)
