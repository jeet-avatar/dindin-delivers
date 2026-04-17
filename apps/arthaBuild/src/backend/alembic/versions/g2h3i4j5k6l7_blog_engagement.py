"""blog_reactions and blog_comments tables

Revision ID: g2h3i4j5k6l7
Revises: f1g2h3i4j5k6
Create Date: 2026-04-16
"""
from alembic import op
import sqlalchemy as sa

revision = 'g2h3i4j5k6l7'
down_revision = 'f1g2h3i4j5k6'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('blog_reactions',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('post_slug', sa.Text, nullable=False),
        sa.Column('reaction', sa.Text, nullable=False),      # insightful | hot | saved
        sa.Column('ip_hash', sa.Text, nullable=False),       # SHA-256 of client IP
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.UniqueConstraint('post_slug', 'reaction', 'ip_hash', name='uq_blog_reaction'),
    )
    op.create_table('blog_comments',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('post_slug', sa.Text, nullable=False),
        sa.Column('parent_id', sa.Integer, sa.ForeignKey('blog_comments.id'), nullable=True),
        sa.Column('name', sa.Text, nullable=False),
        sa.Column('email', sa.Text, nullable=True),
        sa.Column('body', sa.Text, nullable=False),
        sa.Column('status', sa.Text, nullable=False, server_default='pending'),
        sa.Column('is_team_reply', sa.Integer, nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('blog_comments')
    op.drop_table('blog_reactions')
