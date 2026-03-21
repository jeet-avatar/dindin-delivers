"""Add missing driver columns that were added to model without migrations

Revision ID: 20260321_driver_missing_columns
Revises: 20260321_insurance_session_id
Create Date: 2026-03-21

Adds all driver columns that were added to the Driver model in code but never
had corresponding Alembic migrations:
- bank_name, bank_last4, bank_routing_number, bank_account_holder (from bank account feature)
- bank_verified, bank_verified_at, bank_verified_by (from bank verification)
- accessibility_capable, accessibility_features (from TNC accessibility feature)
- stripe_account_id, stripe_onboarded (from Stripe Connect)
- went_online_at, went_offline_at (from driver online/offline hooks)

All add_column calls are idempotent (skip if column already exists).
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.exc import ProgrammingError

revision = "20260321_driver_missing_columns"
down_revision = "20260321_insurance_session_id"
branch_labels = None
depends_on = None


def _col(table, column):
    """Add column if not exists (idempotent)."""
    try:
        op.add_column(table, column)
    except ProgrammingError as e:
        if "already exists" in str(e):
            pass
        else:
            raise


def upgrade():
    """Add missing driver columns (idempotent)."""

    # Bank account columns (added Feb 17, 2026)
    _col("drivers", sa.Column("bank_name", sa.String(255), nullable=True))
    _col("drivers", sa.Column("bank_last4", sa.String(4), nullable=True))
    _col("drivers", sa.Column("bank_routing_number", sa.String(20), nullable=True))
    _col("drivers", sa.Column("bank_account_holder", sa.String(255), nullable=True))
    _col("drivers", sa.Column("bank_verified", sa.Boolean(), server_default="false"))
    _col("drivers", sa.Column("bank_verified_at", sa.DateTime(), nullable=True))
    _col("drivers", sa.Column("bank_verified_by", sa.Integer(), nullable=True))

    # Stripe Connect columns
    _col("drivers", sa.Column("stripe_account_id", sa.String(255), nullable=True))
    _col("drivers", sa.Column("stripe_onboarded", sa.Boolean(), server_default="false"))

    # Online/offline tracking
    _col("drivers", sa.Column("went_online_at", sa.DateTime(), nullable=True))
    _col("drivers", sa.Column("went_offline_at", sa.DateTime(), nullable=True))

    # TNC accessibility columns (added March 16, 2026)
    _col("drivers", sa.Column("accessibility_capable", sa.Boolean(), server_default="false"))
    _col("drivers", sa.Column("accessibility_features", sa.Text(), nullable=True))

    # Verification fields
    _col("drivers", sa.Column("verification_id", sa.String(255), nullable=True))
    _col("drivers", sa.Column("verification_status", sa.String(50), nullable=True))
    _col("drivers", sa.Column("documents_verified", sa.Boolean(), server_default="false"))
    _col("drivers", sa.Column("documents_verified_at", sa.DateTime(), nullable=True))
    _col("drivers", sa.Column("verification_notes", sa.Text(), nullable=True))
    _col("drivers", sa.Column("verification_reviewer_id", sa.Integer(), nullable=True))
    _col("drivers", sa.Column("persona_inquiry_id", sa.String(255), nullable=True))
    _col("drivers", sa.Column("onfido_applicant_id", sa.String(255), nullable=True))
    _col("drivers", sa.Column("veriff_session_id", sa.String(255), nullable=True))
    _col("drivers", sa.Column("verification_provider", sa.String(50), nullable=True))

    # Push notification
    _col("drivers", sa.Column("push_token", sa.String(255), nullable=True))
    _col("drivers", sa.Column("platform", sa.String(20), nullable=True))
    _col("drivers", sa.Column("fcm_token", sa.String(255), nullable=True))
    _col("drivers", sa.Column("device_type", sa.String(20), nullable=True))
    _col("drivers", sa.Column("fcm_token_updated_at", sa.DateTime(), nullable=True))

    # Photo/document URLs
    _col("drivers", sa.Column("photo_url", sa.String(500), nullable=True))
    _col("drivers", sa.Column("vehicle_photo_url", sa.String(500), nullable=True))
    _col("drivers", sa.Column("drivers_license_url", sa.String(500), nullable=True))
    _col("drivers", sa.Column("drivers_license_expiry", sa.DateTime(), nullable=True))
    _col("drivers", sa.Column("insurance_url", sa.String(500), nullable=True))
    _col("drivers", sa.Column("insurance_expiry", sa.DateTime(), nullable=True))
    _col("drivers", sa.Column("background_check", sa.Boolean(), server_default="false"))
    _col("drivers", sa.Column("background_check_date", sa.DateTime(), nullable=True))

    # Other fields
    _col("drivers", sa.Column("apple_id", sa.String(255), nullable=True))
    _col("drivers", sa.Column("date_of_birth", sa.Date(), nullable=True))
    _col("drivers", sa.Column("license_number", sa.String(255), nullable=True))
    _col("drivers", sa.Column("activation_token", sa.String(255), nullable=True))
    _col("drivers", sa.Column("terms_accepted_at", sa.DateTime(), nullable=True))
    _col("drivers", sa.Column("approved_at", sa.DateTime(), nullable=True))


def downgrade():
    # Intentionally left empty — these columns are part of core functionality
    pass
