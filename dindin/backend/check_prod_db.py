"""
Check production database data
"""
import os
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

print(f"Connecting to production database...")
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("\n=== PRODUCTION DATABASE ===\n")

    print("=== VENDORS/RESTAURANTS ===")
    result = conn.execute(text("SELECT id, restaurant_name FROM vendors ORDER BY id"))
    restaurants = list(result)
    print(f"  Total restaurants: {len(restaurants)}")
    for row in restaurants:
        print(f"    ID {row[0]}: {row[1]}")

    print("\n=== DRIVERS ===")
    result = conn.execute(text("SELECT id, first_name, last_name, email, status FROM drivers ORDER BY id"))
    drivers = list(result)
    print(f"  Total drivers: {len(drivers)}")
    for row in drivers:
        print(f"    ID {row[0]}: {row[1]} {row[2]} ({row[3]}) - Status: {row[4]}")

    print("\n=== ENUM VALUES (drivers_license_status) ===")
    result = conn.execute(text("SELECT DISTINCT drivers_license_status FROM drivers WHERE drivers_license_status IS NOT NULL"))
    for row in result:
        print(f"    {row[0]}")
