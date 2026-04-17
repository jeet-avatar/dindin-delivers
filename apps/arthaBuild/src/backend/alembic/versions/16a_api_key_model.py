"""Phase 16: Add api_keys and webhook_endpoints tables.

Revision ID: 16a_api_key_model
Revises: 14a_audit_hash_chain
Create Date: 2026-04-13

Uses render_as_batch=True (SQLite mandatory for ALTER TABLE operations).
Creates two new tables — no existing table modifications.
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '16a_api_key_model'
down_revision = '14a_audit_hash_chain'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'api_keys',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('key_hash', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('1')),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE', name='fk_api_keys_user_id'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key_hash', name='uq_api_keys_key_hash'),
    )
    op.create_index('ix_api_keys_user_id', 'api_keys', ['user_id'], unique=False)

    op.create_table(
        'webhook_endpoints',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('event', sa.String(), nullable=False),
        sa.Column('url', sa.String(), nullable=False),
        sa.Column('secret', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('1')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE', name='fk_webhook_endpoints_user_id'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_webhook_endpoints_user_id', 'webhook_endpoints', ['user_id'], unique=False)


def downgrade():
    op.drop_index('ix_webhook_endpoints_user_id', table_name='webhook_endpoints')
    op.drop_table('webhook_endpoints')
    op.drop_index('ix_api_keys_user_id', table_name='api_keys')
    op.drop_table('api_keys')
