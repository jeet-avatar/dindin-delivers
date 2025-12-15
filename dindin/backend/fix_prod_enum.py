"""
Fix Enum Case Mismatch in Production Database
The database has lowercase enum values (e.g., 'pending') but SQLAlchemy expects uppercase ('PENDING').
"""
import json
import subprocess
from sqlalchemy import create_engine, text

# Get production DATABASE_URL from AWS Secrets Manager
result = subprocess.run(
    ['aws', 'secretsmanager', 'get-secret-value', '--secret-id', 'dollor/production/database-v2', '--query', 'SecretString', '--output', 'text'],
    capture_output=True, text=True
)
secrets = json.loads(result.stdout)
DATABASE_URL = secrets.get('DATABASE_URL')

print("Connecting to production database...")
engine = create_engine(DATABASE_URL)

# Enum columns that need fixing (column_name, valid_values)
ENUM_FIXES = [
    # DocumentStatus columns
    ("drivers_license_status", ["PENDING", "APPROVED", "REJECTED", "EXPIRED"]),
    ("insurance_status", ["PENDING", "APPROVED", "REJECTED", "EXPIRED"]),
    ("vehicle_registration_status", ["PENDING", "APPROVED", "REJECTED", "EXPIRED"]),
    ("profile_photo_status", ["PENDING", "APPROVED", "REJECTED", "EXPIRED"]),

    # BackgroundCheckStatus columns
    ("background_check_status", ["NOT_STARTED", "PENDING", "IN_PROGRESS", "CLEAR", "CONSIDER", "FAILED", "EXPIRED"]),

    # InsuranceType columns
    ("insurance_type", ["PERSONAL", "COMMERCIAL", "RIDESHARE"]),

    # DriverStatus columns
    ("status", ["PENDING", "DOCUMENTS_REQUIRED", "BACKGROUND_CHECK_PENDING", "UNDER_REVIEW", "APPROVED", "ACTIVE", "INACTIVE", "SUSPENDED", "DEACTIVATED"]),
]

def fix_enum_column(conn, table, column, valid_values):
    """Convert lowercase enum values to uppercase"""
    print(f"\n  Fixing {table}.{column}...")

    # First, check current values
    result = conn.execute(text(f"SELECT DISTINCT {column} FROM {table} WHERE {column} IS NOT NULL"))
    current_values = [row[0] for row in result]

    if not current_values:
        print(f"    No values found in {column}")
        return 0

    print(f"    Current values: {current_values}")

    fixed_count = 0
    for val in current_values:
        if val is None:
            continue

        # Check if it's lowercase and needs fixing
        upper_val = val.upper()
        if val != upper_val and upper_val in valid_values:
            # Update lowercase to uppercase
            sql = text(f"UPDATE {table} SET {column} = :new_val WHERE {column} = :old_val")
            result = conn.execute(sql, {"new_val": upper_val, "old_val": val})
            fixed_count += result.rowcount
            print(f"    Fixed: '{val}' -> '{upper_val}' ({result.rowcount} rows)")

    return fixed_count

def main():
    print("=" * 60)
    print("  FIXING ENUM CASE MISMATCH IN PRODUCTION DATABASE")
    print("=" * 60)

    # Test connection
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("\n[OK] Database connection successful")
    except Exception as e:
        print(f"\n[ERROR] Database connection failed: {e}")
        return

    total_fixed = 0

    with engine.connect() as conn:
        print("\n[1/2] Fixing drivers table enum columns...")
        for column, valid_values in ENUM_FIXES:
            try:
                fixed = fix_enum_column(conn, "drivers", column, valid_values)
                total_fixed += fixed
            except Exception as e:
                print(f"    [ERROR] {column}: {e}")

        print("\n[2/2] Fixing rides table enum columns...")
        try:
            # RideStatus enum
            ride_statuses = ["WAITING_FOR_DRIVER", "DRIVER_ASSIGNED", "DRIVER_EN_ROUTE", "PICKED_UP", "IN_PROGRESS", "COMPLETED", "CANCELLED"]
            fixed = fix_enum_column(conn, "rides", "status", ride_statuses)
            total_fixed += fixed
        except Exception as e:
            print(f"    [ERROR] rides.status: {e}")

        conn.commit()

    print("\n" + "=" * 60)
    print(f"  COMPLETE - {total_fixed} values fixed")
    print("=" * 60)

if __name__ == "__main__":
    main()
