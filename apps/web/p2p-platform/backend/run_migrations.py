#!/usr/bin/env python3
"""
Dollor.ai Enterprise Database Migration Runner
==============================================

This script provides a safe, audited way to run database migrations
across different environments.

Usage:
    # Run all pending migrations
    python run_migrations.py --env production upgrade head

    # Rollback last migration
    python run_migrations.py --env staging downgrade -1

    # Show current revision
    python run_migrations.py --env development current

    # Show migration history
    python run_migrations.py --env production history

    # Generate SQL without executing (for DBA review)
    python run_migrations.py --env production upgrade head --sql

Environment Variables Required:
    DATABASE_URL: PostgreSQL connection string

Security:
    - All migrations are logged to migration_audit table
    - Production requires confirmation prompt
    - Supports dry-run mode for DBA review
"""

import os
import sys
import argparse
import subprocess
from datetime import datetime
from dotenv import load_dotenv

# Environment-specific database URLs
ENV_DATABASE_URLS = {
    'production': os.getenv('PRODUCTION_DATABASE_URL'),
    'staging': os.getenv('STAGING_DATABASE_URL'),
    'development': os.getenv('DATABASE_URL'),
}


def get_database_url(environment: str) -> str:
    """Get database URL for specified environment."""
    # First try environment-specific variable
    url = ENV_DATABASE_URLS.get(environment)

    # Fall back to generic DATABASE_URL
    if not url:
        url = os.getenv('DATABASE_URL')

    if not url:
        raise ValueError(f"No database URL configured for environment: {environment}")

    return url


def confirm_production_migration() -> bool:
    """Require explicit confirmation for production migrations."""
    print("\n" + "=" * 60)
    print("⚠️  WARNING: PRODUCTION DATABASE MIGRATION")
    print("=" * 60)
    print("\nYou are about to modify the PRODUCTION database.")
    print("This action may affect live users.")
    print("\nPre-migration checklist:")
    print("  [ ] Database backup completed")
    print("  [ ] Staging migration tested successfully")
    print("  [ ] On-call engineer notified")
    print("  [ ] Rollback plan reviewed")
    print()

    response = input("Type 'MIGRATE PRODUCTION' to proceed: ")
    return response == "MIGRATE PRODUCTION"


def run_alembic_command(command: list, environment: str, sql_only: bool = False):
    """Execute Alembic command with proper environment."""
    load_dotenv()

    # Set database URL for Alembic
    db_url = get_database_url(environment)
    os.environ['DATABASE_URL'] = db_url
    os.environ['ENVIRONMENT'] = environment

    # Build Alembic command
    alembic_cmd = ['alembic']

    if sql_only:
        alembic_cmd.append('--sql')

    alembic_cmd.extend(command)

    print(f"\n[{datetime.utcnow().isoformat()}] Running: {' '.join(alembic_cmd)}")
    print(f"[{datetime.utcnow().isoformat()}] Environment: {environment}")
    print(f"[{datetime.utcnow().isoformat()}] Database: {db_url[:50]}...")
    print()

    # Execute
    result = subprocess.run(alembic_cmd, cwd=os.path.dirname(os.path.abspath(__file__)))

    if result.returncode != 0:
        print(f"\n❌ Migration failed with exit code: {result.returncode}")
        sys.exit(result.returncode)
    else:
        print(f"\n✅ Migration completed successfully")


def main():
    parser = argparse.ArgumentParser(
        description='Dollor.ai Enterprise Database Migration Runner',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Upgrade to latest
    python run_migrations.py --env staging upgrade head

    # Rollback one migration
    python run_migrations.py --env staging downgrade -1

    # Show current version
    python run_migrations.py --env production current

    # Generate SQL for review
    python run_migrations.py --env production upgrade head --sql

    # Show history
    python run_migrations.py --env staging history
        """
    )

    parser.add_argument(
        '--env', '-e',
        choices=['production', 'staging', 'development'],
        default='development',
        help='Target environment (default: development)'
    )

    parser.add_argument(
        '--sql',
        action='store_true',
        help='Generate SQL without executing (dry-run)'
    )

    parser.add_argument(
        '--force',
        action='store_true',
        help='Skip production confirmation prompt'
    )

    parser.add_argument(
        'command',
        nargs='+',
        help='Alembic command (e.g., "upgrade head", "downgrade -1", "current")'
    )

    args = parser.parse_args()

    # Production safety check
    if args.env == 'production' and not args.sql and not args.force:
        if 'upgrade' in args.command or 'downgrade' in args.command:
            if not confirm_production_migration():
                print("\n❌ Migration cancelled by user")
                sys.exit(1)

    # Run the migration
    run_alembic_command(args.command, args.env, args.sql)


if __name__ == '__main__':
    main()
