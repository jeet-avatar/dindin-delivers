"""Add missing driver columns that were added to model without migrations

Revision ID: 20260321_driver_missing_columns
Revises: 20260321_insurance_session_id
Create Date: 2026-03-21

Adds all driver columns that were added to the Driver model in code but never
had corresponding Alembic migrations. Uses ALTER TABLE ... ADD COLUMN IF NOT EXISTS
to be idempotent (PostgreSQL 9.6+).
"""
from alembic import op

revision = "20260321_driver_missing_columns"
down_revision = "20260321_insurance_session_id"
branch_labels = None
depends_on = None


def upgrade():
    """Add missing driver columns using IF NOT EXISTS for idempotency."""
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255)")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS bank_last4 VARCHAR(4)")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS bank_routing_number VARCHAR(20)")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS bank_account_holder VARCHAR(255)")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS bank_verified BOOLEAN DEFAULT FALSE")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS bank_verified_at TIMESTAMP")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS bank_verified_by INTEGER")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255)")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS stripe_onboarded BOOLEAN DEFAULT FALSE")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS went_online_at TIMESTAMP")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS went_offline_at TIMESTAMP")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS accessibility_capable BOOLEAN DEFAULT FALSE")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS accessibility_features TEXT")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS verification_id VARCHAR(255)")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50)")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS documents_verified BOOLEAN DEFAULT FALSE")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS documents_verified_at TIMESTAMP")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS verification_notes TEXT")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS verification_reviewer_id INTEGER")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS persona_inquiry_id VARCHAR(255)")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS onfido_applicant_id VARCHAR(255)")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS veriff_session_id VARCHAR(255)")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS verification_provider VARCHAR(50)")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS push_token VARCHAR(255)")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS platform VARCHAR(20)")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS fcm_token VARCHAR(255)")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS device_type VARCHAR(20)")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS fcm_token_updated_at TIMESTAMP")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500)")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS vehicle_photo_url VARCHAR(500)")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS drivers_license_url VARCHAR(500)")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS drivers_license_expiry TIMESTAMP")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS insurance_url VARCHAR(500)")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS insurance_expiry TIMESTAMP")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS background_check BOOLEAN DEFAULT FALSE")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS background_check_date TIMESTAMP")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS apple_id VARCHAR(255)")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS date_of_birth DATE")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS license_number VARCHAR(255)")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS activation_token VARCHAR(255)")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP")
    op.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP")


def downgrade():
    # Intentionally left empty — these are core columns
    pass
