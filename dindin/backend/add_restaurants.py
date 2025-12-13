"""
Add restaurants to production database
"""
import json
import subprocess
import uuid
from datetime import datetime
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

# Get required columns for vendors table
with engine.connect() as conn:
    result = conn.execute(text("""
        SELECT column_name, is_nullable, data_type
        FROM information_schema.columns
        WHERE table_name = 'vendors'
        ORDER BY ordinal_position
    """))
    print("\n=== VENDORS TABLE SCHEMA ===")
    for row in result:
        print(f"  {row[0]}: {row[2]} (nullable: {row[1]})")

# Restaurants to add
NEW_RESTAURANTS = [
    {
        "vendor_id": str(uuid.uuid4()),
        "restaurant_name": "Tute Fresca",
        "company_name": "Tute Fresca LLC",
        "cuisine_type": "Italian",
        "business_type": "restaurant",
        "industry": "food_service",
    },
    {
        "vendor_id": str(uuid.uuid4()),
        "restaurant_name": "Natraj Indian Bistro",
        "company_name": "Natraj Indian Bistro LLC",
        "cuisine_type": "Indian",
        "business_type": "restaurant",
        "industry": "food_service",
    }
]

print("\n=== ADDING RESTAURANTS ===")

with engine.connect() as conn:
    for restaurant in NEW_RESTAURANTS:
        # Check if restaurant already exists
        check = conn.execute(text("SELECT id FROM vendors WHERE restaurant_name = :name"), {"name": restaurant["restaurant_name"]})
        if check.fetchone():
            print(f"  [SKIP] {restaurant['restaurant_name']} already exists")
            continue

        # Insert restaurant
        sql = text("""
            INSERT INTO vendors (vendor_id, restaurant_name, company_name, cuisine_type, business_type, industry, created_at, updated_at)
            VALUES (:vendor_id, :restaurant_name, :company_name, :cuisine_type, :business_type, :industry, :created_at, :updated_at)
        """)

        conn.execute(sql, {
            **restaurant,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        })
        print(f"  [OK] Added {restaurant['restaurant_name']}")

    conn.commit()

# Verify
print("\n=== CURRENT RESTAURANTS ===")
with engine.connect() as conn:
    result = conn.execute(text("SELECT id, restaurant_name, cuisine_type FROM vendors ORDER BY id"))
    for row in result:
        print(f"  ID {row[0]}: {row[1]} ({row[2]})")
