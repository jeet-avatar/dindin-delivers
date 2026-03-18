"""add unique constraint ride_bid

Revision ID: 20260318_ride_bid_unique
Revises: add_early_driver_notification
Create Date: 2026-03-18

"""
from alembic import op

# revision identifiers
revision = '20260318_ride_bid_unique'
down_revision = 'add_early_driver_notification'
branch_labels = None
depends_on = None


def upgrade():
    # Delete duplicate bids first (keep the earliest bid per driver+request pair)
    op.execute("""
        DELETE FROM ride_bids
        WHERE id NOT IN (
            SELECT MIN(id)
            FROM ride_bids
            GROUP BY ride_request_id, driver_id
        )
    """)
    op.create_unique_constraint(
        'uq_bid_per_driver_per_request',
        'ride_bids',
        ['ride_request_id', 'driver_id']
    )


def downgrade():
    op.drop_constraint('uq_bid_per_driver_per_request', 'ride_bids', type_='unique')
