"""add license_cache and script_deployments tables

Revision ID: 12fa982ac6c3
Revises: a1b2c3d4e5f6
Create Date: 2026-04-09 18:16:24.650242

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '12fa982ac6c3'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'license_cache',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('license_key', sa.String(), nullable=False),
        sa.Column('instance_id', sa.String(), nullable=False),
        sa.Column('plan', sa.String(), nullable=True),
        sa.Column('valid_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_checked', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)')),
    )
    with op.batch_alter_table('license_cache') as batch_op:
        batch_op.create_index('ix_license_cache_license_key', ['license_key'], unique=False)

    op.create_table(
        'script_deployments',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('script_name', sa.String(), nullable=False),
        sa.Column('target', sa.String(), nullable=False),
        sa.Column('deployed_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)')),
        sa.Column('license_key', sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('script_deployments')
    with op.batch_alter_table('license_cache') as batch_op:
        batch_op.drop_index('ix_license_cache_license_key')
    op.drop_table('license_cache')
