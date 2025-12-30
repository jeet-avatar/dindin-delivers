"""infra: Create migration audit table for compliance tracking

Revision ID: 000_migration_audit
Revises: None
Create Date: 2025-12-29 05:59:00 UTC

Migration Type: infrastructure
Author: Dollor.ai Engineering

Description:
Creates migration_audit table to track all database migrations for:
- SOC 2 compliance audit trail
- Change management documentation
- Rollback tracking
- Environment-specific migration history
"""
from typing import Sequence, Union
from datetime import datetime

from alembic import op
import sqlalchemy as sa


revision: str = '000_migration_audit'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create migration audit table for compliance tracking."""

    op.create_table(
        'migration_audit',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('revision', sa.String(100), nullable=False, index=True),
        sa.Column('direction', sa.String(20), nullable=False),  # 'upgrade' or 'downgrade'
        sa.Column('executed_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('executed_by', sa.String(100), nullable=True),
        sa.Column('environment', sa.String(50), nullable=True),  # 'production', 'staging', 'development'
        sa.Column('duration_ms', sa.Integer(), nullable=True),
        sa.Column('success', sa.Boolean(), server_default='true'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
    )

    # Create index for querying by environment
    op.create_index('ix_migration_audit_environment', 'migration_audit', ['environment'])

    print(f"[{datetime.utcnow().isoformat()}] Migration 000_migration_audit: Created audit table")


def downgrade() -> None:
    """Remove migration audit table."""
    op.drop_index('ix_migration_audit_environment', table_name='migration_audit')
    op.drop_table('migration_audit')
    print(f"[{datetime.utcnow().isoformat()}] Migration 000_migration_audit: Dropped audit table")
