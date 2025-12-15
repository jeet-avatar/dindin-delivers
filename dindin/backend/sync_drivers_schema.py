"""
Comprehensive Database Migration Script for Drivers Table
Syncs all missing columns from the Driver model to the production database.
This script is idempotent - safe to run multiple times.
"""

import os
import sys
from sqlalchemy import create_engine, text, inspect
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set")
    sys.exit(1)

engine = create_engine(DATABASE_URL)

# All columns that should exist in the drivers table based on the model
# Format: (column_name, postgres_type, default_value)
ALL_DRIVER_COLUMNS = [
    # Personal Info
    ("password_reset_token", "VARCHAR(100)", "NULL"),
    ("password_reset_expiry", "TIMESTAMP", "NULL"),
    ("date_of_birth", "TIMESTAMP", "NULL"),
    ("ssn_last_four", "VARCHAR(4)", "NULL"),

    # Address
    ("street", "TEXT", "NULL"),
    ("city", "VARCHAR(100)", "NULL"),
    ("state", "VARCHAR(100)", "NULL"),
    ("zip_code", "VARCHAR(20)", "NULL"),
    ("country", "VARCHAR(100)", "'US'"),

    # Driver License
    ("drivers_license", "BOOLEAN", "FALSE"),
    ("drivers_license_url", "VARCHAR(500)", "NULL"),
    ("drivers_license_number", "VARCHAR(50)", "NULL"),
    ("drivers_license_state", "VARCHAR(10)", "NULL"),
    ("drivers_license_expiry", "TIMESTAMP", "NULL"),
    ("drivers_license_verified", "BOOLEAN", "FALSE"),
    ("drivers_license_verified_at", "TIMESTAMP", "NULL"),
    ("drivers_license_status", "VARCHAR(20)", "'pending'"),
    ("drivers_license_rejection_reason", "TEXT", "NULL"),

    # Background Check
    ("background_check", "BOOLEAN", "FALSE"),
    ("background_check_status", "VARCHAR(20)", "'not_started'"),
    ("background_check_provider", "VARCHAR(100)", "NULL"),
    ("background_check_report_id", "VARCHAR(255)", "NULL"),
    ("background_check_requested_at", "TIMESTAMP", "NULL"),
    ("background_check_completed_at", "TIMESTAMP", "NULL"),
    ("background_check_expiry", "TIMESTAMP", "NULL"),
    ("background_check_clear", "BOOLEAN", "FALSE"),
    ("background_check_notes", "TEXT", "NULL"),
    ("criminal_record_check", "BOOLEAN", "FALSE"),
    ("dmv_record_check", "BOOLEAN", "FALSE"),
    ("sex_offender_check", "BOOLEAN", "FALSE"),

    # Insurance
    ("insurance", "BOOLEAN", "FALSE"),
    ("insurance_url", "VARCHAR(500)", "NULL"),
    ("insurance_type", "VARCHAR(20)", "'personal'"),
    ("insurance_provider", "VARCHAR(100)", "NULL"),
    ("insurance_policy_number", "VARCHAR(100)", "NULL"),
    ("insurance_expiry", "TIMESTAMP", "NULL"),
    ("insurance_verified", "BOOLEAN", "FALSE"),
    ("insurance_verified_at", "TIMESTAMP", "NULL"),
    ("insurance_status", "VARCHAR(20)", "'pending'"),
    ("insurance_rejection_reason", "TEXT", "NULL"),
    ("insurance_liability_amount", "FLOAT", "NULL"),
    ("insurance_has_rideshare_coverage", "BOOLEAN", "FALSE"),

    # Vehicle
    ("vehicle_type", "VARCHAR(50)", "NULL"),
    ("vehicle_make", "VARCHAR(100)", "NULL"),
    ("vehicle_model", "VARCHAR(100)", "NULL"),
    ("vehicle_year", "INTEGER", "NULL"),
    ("vehicle_color", "VARCHAR(50)", "NULL"),
    ("license_plate", "VARCHAR(20)", "NULL"),
    ("license_plate_state", "VARCHAR(10)", "NULL"),
    ("vehicle_vin", "VARCHAR(50)", "NULL"),
    ("vehicle_registration_url", "VARCHAR(500)", "NULL"),
    ("vehicle_registration_expiry", "TIMESTAMP", "NULL"),
    ("vehicle_registration_verified", "BOOLEAN", "FALSE"),
    ("vehicle_registration_status", "VARCHAR(20)", "'pending'"),
    ("vehicle_doors", "INTEGER", "4"),
    ("vehicle_seats", "INTEGER", "5"),
    ("vehicle_meets_requirements", "BOOLEAN", "FALSE"),

    # Vehicle Inspection
    ("vehicle_inspection_required", "BOOLEAN", "TRUE"),
    ("vehicle_inspection_date", "TIMESTAMP", "NULL"),
    ("vehicle_inspection_expiry", "TIMESTAMP", "NULL"),
    ("vehicle_inspection_passed", "BOOLEAN", "FALSE"),
    ("vehicle_inspection_url", "VARCHAR(500)", "NULL"),
    ("vehicle_inspection_notes", "TEXT", "NULL"),

    # Profile Photo
    ("profile_photo_url", "VARCHAR(500)", "NULL"),
    ("profile_photo_verified", "BOOLEAN", "FALSE"),
    ("profile_photo_status", "VARCHAR(20)", "'pending'"),

    # Verification Status
    ("verification_complete", "BOOLEAN", "FALSE"),
    ("verification_completed_at", "TIMESTAMP", "NULL"),
    ("onboarding_step", "INTEGER", "1"),
    ("can_accept_rides", "BOOLEAN", "FALSE"),

    # Status and Ratings
    ("status", "VARCHAR(20)", "'pending'"),
    ("status_reason", "TEXT", "NULL"),
    ("rating", "FLOAT", "5.0"),
    ("total_deliveries", "INTEGER", "0"),
    ("total_rides", "INTEGER", "0"),
    ("acceptance_rate", "FLOAT", "100.0"),
    ("cancellation_rate", "FLOAT", "0.0"),

    # Real-time tracking
    ("current_latitude", "FLOAT", "NULL"),
    ("current_longitude", "FLOAT", "NULL"),
    ("is_online", "BOOLEAN", "FALSE"),
    ("last_location_update", "TIMESTAMP", "NULL"),

    # Mobile App
    ("device_id", "VARCHAR(255)", "NULL"),
    ("push_token", "VARCHAR(500)", "NULL"),
    ("platform", "VARCHAR(20)", "NULL"),

    # Stripe
    ("stripe_account_id", "VARCHAR(255)", "NULL"),
    ("stripe_onboarded", "BOOLEAN", "FALSE"),

    # Consent Tracking
    ("tos_accepted", "BOOLEAN", "FALSE"),
    ("tos_accepted_at", "TIMESTAMP", "NULL"),
    ("tos_version", "VARCHAR(20)", "NULL"),
    ("privacy_policy_accepted", "BOOLEAN", "FALSE"),
    ("privacy_policy_accepted_at", "TIMESTAMP", "NULL"),
    ("privacy_policy_version", "VARCHAR(20)", "NULL"),
    ("driver_agreement_accepted", "BOOLEAN", "FALSE"),
    ("driver_agreement_accepted_at", "TIMESTAMP", "NULL"),
    ("driver_agreement_version", "VARCHAR(20)", "NULL"),
    ("background_check_consent", "BOOLEAN", "FALSE"),
    ("background_check_consent_at", "TIMESTAMP", "NULL"),
    ("insurance_disclosure_accepted", "BOOLEAN", "FALSE"),
    ("insurance_disclosure_accepted_at", "TIMESTAMP", "NULL"),
    ("safety_guidelines_accepted", "BOOLEAN", "FALSE"),
    ("safety_guidelines_accepted_at", "TIMESTAMP", "NULL"),

    # Timestamps
    ("created_at", "TIMESTAMP", "NOW()"),
    ("updated_at", "TIMESTAMP", "NOW()"),
    ("approved_at", "TIMESTAMP", "NULL"),
    ("last_active", "TIMESTAMP", "NULL"),
    ("deactivated_at", "TIMESTAMP", "NULL"),

    # Admin Notes
    ("admin_notes", "TEXT", "NULL"),
    ("reviewed_by", "VARCHAR(100)", "NULL"),
    ("reviewed_at", "TIMESTAMP", "NULL"),
]

def get_existing_columns(table_name):
    """Get list of existing columns in a table"""
    inspector = inspect(engine)
    try:
        columns = inspector.get_columns(table_name)
        return [col['name'] for col in columns]
    except:
        return []

def add_column_if_not_exists(table_name, column_name, column_type, default):
    """Add a column to a table if it doesn't already exist"""
    existing_columns = get_existing_columns(table_name)

    if column_name in existing_columns:
        return False

    if default == "NULL":
        sql = f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"
    else:
        sql = f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type} DEFAULT {default}"

    try:
        with engine.connect() as conn:
            conn.execute(text(sql))
            conn.commit()
        print(f"  [ADDED] {column_name} ({column_type})")
        return True
    except Exception as e:
        print(f"  [ERROR] {column_name}: {e}")
        return False

def main():
    print("=" * 60)
    print("  DOLLOR DATABASE SCHEMA SYNC")
    print("  Syncing drivers table with model definition")
    print("=" * 60)
    print()

    # Check connection
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("[OK] Database connection successful")
    except Exception as e:
        print(f"[ERROR] Database connection failed: {e}")
        sys.exit(1)

    print()

    # Get existing columns
    existing_columns = get_existing_columns("drivers")
    print(f"Found {len(existing_columns)} existing columns in drivers table")

    # Find missing columns
    missing = [col for col in ALL_DRIVER_COLUMNS if col[0] not in existing_columns]
    print(f"Found {len(missing)} missing columns")
    print()

    if not missing:
        print("All columns already exist! No migration needed.")
        return

    print("Adding missing columns:")
    added_count = 0
    for column_name, column_type, default in missing:
        if add_column_if_not_exists("drivers", column_name, column_type, default):
            added_count += 1

    print()
    print("=" * 60)
    print(f"  MIGRATION COMPLETE - {added_count}/{len(missing)} columns added")
    print("=" * 60)

    # Final verification
    final_columns = get_existing_columns("drivers")
    still_missing = [col[0] for col in ALL_DRIVER_COLUMNS if col[0] not in final_columns]

    if still_missing:
        print()
        print(f"WARNING: {len(still_missing)} columns still missing:")
        for col in still_missing[:10]:
            print(f"  - {col}")
        if len(still_missing) > 10:
            print(f"  ... and {len(still_missing) - 10} more")
    else:
        print()
        print("All driver columns are now in sync!")

if __name__ == "__main__":
    main()
