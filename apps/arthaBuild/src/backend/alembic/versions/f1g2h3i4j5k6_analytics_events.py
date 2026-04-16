"""analytics_events table

Revision ID: f1g2h3i4j5k6
Revises: e1f2g3h4i5j6
Create Date: 2026-04-16
"""
from alembic import op
import sqlalchemy as sa

revision = 'f1g2h3i4j5k6'
down_revision = '22a_free_tier_script_counter'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('analytics_events',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('type', sa.Text, nullable=False),
        sa.Column('session_id', sa.Text, nullable=False),
        sa.Column('page', sa.Text, nullable=False),
        sa.Column('referrer', sa.Text),
        sa.Column('scroll_depth', sa.Integer, default=0),
        sa.Column('time_on_page', sa.Integer, default=0),
        sa.Column('utm_source', sa.Text),
        sa.Column('utm_medium', sa.Text),
        sa.Column('utm_campaign', sa.Text),
        sa.Column('utm_term', sa.Text),
        sa.Column('utm_content', sa.Text),
        sa.Column('event_type', sa.Text),
        sa.Column('element', sa.Text),
        sa.Column('value', sa.Text),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('analytics_events')
