"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}

Migration Type: ${message.split(':')[0] if ':' in message else 'schema'}
Author: ${config.get_main_option('author', 'Dollor.ai Engineering')}
Reviewed By: [PENDING REVIEW]

Description:
${message}

Impact Analysis:
- Tables Affected: [TO BE FILLED]
- Estimated Downtime: None (online migration)
- Rollback Risk: Low

Pre-Migration Checklist:
[ ] Database backup completed
[ ] Staging environment tested
[ ] DBA review completed
[ ] Rollback script verified
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

# Revision identifiers, used by Alembic
revision: str = ${repr(up_revision)}
down_revision: Union[str, None] = ${repr(down_revision)}
branch_labels: Union[str, Sequence[str], None] = ${repr(branch_labels)}
depends_on: Union[str, Sequence[str], None] = ${repr(depends_on)}


def upgrade() -> None:
    """
    Upgrade database schema.

    IMPORTANT: All operations should be idempotent where possible.
    Use batch operations for large tables to minimize lock time.
    """
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    """
    Downgrade database schema (rollback).

    WARNING: Data loss may occur during downgrade.
    Ensure backup exists before executing rollback.
    """
    ${downgrades if downgrades else "pass"}
