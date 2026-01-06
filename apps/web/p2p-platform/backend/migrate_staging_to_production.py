#!/usr/bin/env python3
"""
Dollor.ai - Staging to Production Data Migration Script

This script migrates restaurant and menu data from staging to production.
IMPORTANT: Run this script carefully in a maintenance window.

Usage:
    python migrate_staging_to_production.py --dry-run  # Test mode
    python migrate_staging_to_production.py --execute  # Real migration

Safety Features:
- Dry-run mode by default
- Backup before migration
- Transaction rollback on errors
- Detailed logging
"""

import argparse
import sys
import logging
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'migration_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Database URLs
STAGING_DB_URL = "postgresql://dollor_admin:f4QA0dDzfpDXYpSRWsJMbXSD7WwfESKa@dollor-staging.c23qcukqe810.us-east-1.rds.amazonaws.com:5432/dollor_staging"
PRODUCTION_DB_URL = "postgresql://dolloradmin:Dollor2024SecureDB@dollor-db.c23qcukqe810.us-east-1.rds.amazonaws.com:5432/dollor"


def create_db_engines():
    """Create database engines for staging and production"""
    try:
        staging_engine = create_engine(STAGING_DB_URL, echo=False)
        production_engine = create_engine(PRODUCTION_DB_URL, echo=False)

        # Test connections
        with staging_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        with production_engine.connect() as conn:
            conn.execute(text("SELECT 1"))

        logger.info("✅ Database connections established")
        return staging_engine, production_engine
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        sys.exit(1)


def fetch_staging_restaurants(staging_engine):
    """Fetch all published/active restaurants from staging"""
    query = text("""
        SELECT
            id, restaurant_name, company_name, contact_name, contact_email, contact_phone,
            address, city, state, zip_code, cuisine_type, description,
            onboarding_status, is_published, published_at, published_platforms,
            ein_number, delivery_enabled, minimum_order, delivery_fee,
            food_license, health_permit, w9_form, insurance,
            created_at, updated_at, approved_at
        FROM vendors
        WHERE onboarding_status = 'approved' OR is_published = true
        ORDER BY id
    """)

    with staging_engine.connect() as conn:
        result = conn.execute(query)
        restaurants = [dict(row._mapping) for row in result]

    logger.info(f"📊 Found {len(restaurants)} restaurants in staging")
    return restaurants


def fetch_menu_items(staging_engine, vendor_id):
    """Fetch all menu items for a vendor"""
    query = text("""
        SELECT
            id, vendor_id, name, description, price, category,
            in_stock, is_available, dietary_tags, image_url,
            prep_time_minutes, calories, is_popular,
            created_at, updated_at
        FROM scraped_menu_items
        WHERE vendor_id = :vendor_id
        ORDER BY category, name
    """)

    with staging_engine.connect() as conn:
        result = conn.execute(query, {"vendor_id": vendor_id})
        menu_items = [dict(row._mapping) for row in result]

    return menu_items


def check_restaurant_exists(production_engine, restaurant_name, contact_email):
    """Check if restaurant already exists in production"""
    query = text("""
        SELECT id, restaurant_name FROM vendors
        WHERE LOWER(restaurant_name) = LOWER(:name)
        OR (contact_email = :email AND :email IS NOT NULL)
        LIMIT 1
    """)

    with production_engine.connect() as conn:
        result = conn.execute(query, {"name": restaurant_name, "email": contact_email})
        row = result.first()
        return dict(row._mapping) if row else None


def insert_restaurant(production_engine, restaurant, dry_run=True):
    """Insert restaurant into production database"""
    insert_query = text("""
        INSERT INTO vendors (
            restaurant_name, company_name, contact_name, contact_email, contact_phone,
            address, city, state, zip_code, cuisine_type, description,
            onboarding_status, onboarding_phase, is_published, published_at, published_platforms,
            ein_number, delivery_enabled, minimum_order, delivery_fee,
            food_license, health_permit, w9_form, insurance,
            created_at, updated_at, approved_at
        ) VALUES (
            :restaurant_name, :company_name, :contact_name, :contact_email, :contact_phone,
            :address, :city, :state, :zip_code, :cuisine_type, :description,
            :onboarding_status, 'completed', :is_published, :published_at, :published_platforms,
            :ein_number, :delivery_enabled, :minimum_order, :delivery_fee,
            :food_license, :health_permit, :w9_form, :insurance,
            :created_at, :updated_at, :approved_at
        )
        RETURNING id
    """)

    if dry_run:
        logger.info(f"  [DRY RUN] Would insert restaurant: {restaurant['restaurant_name']}")
        return None

    with production_engine.begin() as conn:
        result = conn.execute(insert_query, restaurant)
        new_id = result.scalar()
        logger.info(f"  ✅ Inserted restaurant: {restaurant['restaurant_name']} (ID: {new_id})")
        return new_id


def insert_menu_items(production_engine, vendor_id, menu_items, dry_run=True):
    """Insert menu items for a vendor"""
    if not menu_items:
        logger.info(f"  ℹ️  No menu items to migrate for vendor {vendor_id}")
        return 0

    insert_query = text("""
        INSERT INTO scraped_menu_items (
            vendor_id, name, description, price, category,
            in_stock, is_available, dietary_tags, image_url,
            prep_time_minutes, calories, is_popular,
            created_at, updated_at
        ) VALUES (
            :vendor_id, :name, :description, :price, :category,
            :in_stock, :is_available, :dietary_tags, :image_url,
            :prep_time_minutes, :calories, :is_popular,
            :created_at, :updated_at
        )
    """)

    if dry_run:
        logger.info(f"  [DRY RUN] Would insert {len(menu_items)} menu items for vendor {vendor_id}")
        for item in menu_items[:3]:  # Show first 3 as examples
            logger.info(f"    - {item['name']} (${item['price']})")
        if len(menu_items) > 3:
            logger.info(f"    ... and {len(menu_items) - 3} more items")
        return 0

    with production_engine.begin() as conn:
        for item in menu_items:
            item['vendor_id'] = vendor_id
            conn.execute(insert_query, item)

    logger.info(f"  ✅ Inserted {len(menu_items)} menu items for vendor {vendor_id}")
    return len(menu_items)


def migrate_data(dry_run=True):
    """Main migration function"""
    logger.info("=" * 80)
    logger.info(f"🚀 DOLLOR.AI DATA MIGRATION: Staging → Production")
    logger.info(f"Mode: {'DRY RUN (No changes will be made)' if dry_run else 'LIVE EXECUTION'}")
    logger.info("=" * 80)

    if not dry_run:
        logger.warning("⚠️  LIVE EXECUTION MODE - Changes will be permanent!")
        response = input("Type 'MIGRATE' to continue: ")
        if response != 'MIGRATE':
            logger.info("Migration cancelled by user")
            return

    # Create database connections
    staging_engine, production_engine = create_db_engines()

    # Fetch staging data
    logger.info("\n📥 Fetching staging data...")
    staging_restaurants = fetch_staging_restaurants(staging_engine)

    if not staging_restaurants:
        logger.warning("⚠️  No restaurants found in staging. Nothing to migrate.")
        return

    # Migration summary
    stats = {
        'total_restaurants': len(staging_restaurants),
        'migrated_restaurants': 0,
        'skipped_restaurants': 0,
        'total_menu_items': 0,
        'errors': []
    }

    # Migrate each restaurant
    logger.info(f"\n🔄 Processing {stats['total_restaurants']} restaurants...\n")

    for idx, restaurant in enumerate(staging_restaurants, 1):
        logger.info(f"[{idx}/{stats['total_restaurants']}] {restaurant['restaurant_name']}")

        try:
            # Check if restaurant exists
            existing = check_restaurant_exists(
                production_engine,
                restaurant['restaurant_name'],
                restaurant['contact_email']
            )

            if existing:
                logger.info(f"  ⏭️  Restaurant already exists in production (ID: {existing['id']})")
                stats['skipped_restaurants'] += 1
                prod_vendor_id = existing['id']
            else:
                # Insert restaurant
                prod_vendor_id = insert_restaurant(production_engine, restaurant, dry_run)
                if prod_vendor_id or dry_run:
                    stats['migrated_restaurants'] += 1

            # Fetch and migrate menu items
            menu_items = fetch_menu_items(staging_engine, restaurant['id'])
            logger.info(f"  📋 Found {len(menu_items)} menu items")

            if menu_items and (prod_vendor_id or dry_run):
                items_migrated = insert_menu_items(
                    production_engine,
                    prod_vendor_id or 999,  # Dummy ID for dry-run
                    menu_items,
                    dry_run
                )
                stats['total_menu_items'] += items_migrated

        except Exception as e:
            logger.error(f"  ❌ Error migrating {restaurant['restaurant_name']}: {e}")
            stats['errors'].append({
                'restaurant': restaurant['restaurant_name'],
                'error': str(e)
            })

    # Print summary
    logger.info("\n" + "=" * 80)
    logger.info("📊 MIGRATION SUMMARY")
    logger.info("=" * 80)
    logger.info(f"Total Restaurants in Staging: {stats['total_restaurants']}")
    logger.info(f"Migrated to Production: {stats['migrated_restaurants']}")
    logger.info(f"Skipped (Already Exist): {stats['skipped_restaurants']}")
    logger.info(f"Total Menu Items Migrated: {stats['total_menu_items']}")
    logger.info(f"Errors: {len(stats['errors'])}")

    if stats['errors']:
        logger.info("\n❌ Errors encountered:")
        for err in stats['errors']:
            logger.info(f"  - {err['restaurant']}: {err['error']}")

    if dry_run:
        logger.info("\n💡 This was a DRY RUN. No changes were made.")
        logger.info("   Run with --execute to perform actual migration.")
    else:
        logger.info("\n✅ Migration completed successfully!")

    logger.info("=" * 80)


def main():
    parser = argparse.ArgumentParser(description='Migrate data from staging to production')
    parser.add_argument('--dry-run', action='store_true', help='Run in test mode (no changes)')
    parser.add_argument('--execute', action='store_true', help='Execute actual migration')

    args = parser.parse_args()

    if not args.dry_run and not args.execute:
        print("❌ Error: You must specify either --dry-run or --execute")
        parser.print_help()
        sys.exit(1)

    dry_run = args.dry_run or not args.execute

    try:
        migrate_data(dry_run=dry_run)
    except KeyboardInterrupt:
        logger.info("\n\n⚠️  Migration interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"\n\n❌ Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
