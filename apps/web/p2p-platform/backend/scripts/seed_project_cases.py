#!/usr/bin/env python3
"""
Seed project_cases table from test collection across all platforms.

Usage:
  cd apps/web/p2p-platform/backend
  python scripts/seed_project_cases.py

  # Seed all platforms:
  python scripts/seed_project_cases.py --platform all

  # Seed specific platform:
  python scripts/seed_project_cases.py --platform ios
  python scripts/seed_project_cases.py --platform android
  python scripts/seed_project_cases.py --platform microservice
  python scripts/seed_project_cases.py --platform frontend

  # With build versions:
  python scripts/seed_project_cases.py --build "iOS-Customer:1113,iOS-Driver:215,iOS-Restaurant:185"

  # With custom reason:
  python scripts/seed_project_cases.py --reason "Seeded for v1.0 release validation"
"""

import sys
import os
import argparse

# Add backend root to path so imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import func
from database import SessionLocal, init_db
from project_tracker import (
    ProjectCase,
    seed_project_cases,
    seed_ios_cases,
    seed_android_cases,
    seed_microservice_cases,
    seed_frontend_cases,
    seed_all_platforms,
)


def main():
    parser = argparse.ArgumentParser(
        description="Seed project_cases table from test collection across all platforms."
    )
    parser.add_argument(
        "--build",
        type=str,
        default=None,
        help='Build versions, e.g. "iOS-Customer:1113,iOS-Driver:215"',
    )
    parser.add_argument(
        "--reason",
        type=str,
        default=None,
        help="Default reason/context for newly seeded cases (default: None)",
    )
    parser.add_argument(
        "--platform",
        type=str,
        default=None,
        choices=["backend", "ios", "android", "microservice", "frontend", "all"],
        help="Platform to seed (default: all). Options: backend, ios, android, microservice, frontend, all",
    )
    args = parser.parse_args()

    # Ensure tables exist
    init_db()

    db = SessionLocal()
    try:
        platform = args.platform or "all"

        platform_seed_map = {
            "backend": lambda: {"backend": seed_project_cases(db, build_label=args.build, default_reason=args.reason)},
            "ios": lambda: {"ios": seed_ios_cases(db, build_label=args.build, default_reason=args.reason)},
            "android": lambda: {"android": seed_android_cases(db, build_label=args.build, default_reason=args.reason)},
            "microservice": lambda: {"microservice": seed_microservice_cases(db, build_label=args.build, default_reason=args.reason)},
            "frontend": lambda: {"frontend": seed_frontend_cases(db, build_label=args.build, default_reason=args.reason)},
            "all": lambda: seed_all_platforms(db, build_label=args.build, default_reason=args.reason),
        }

        print(f"Seeding platform: {platform}")
        print("-" * 50)

        results = platform_seed_map[platform]()

        # Print per-platform results
        total_seeded = 0
        total_skipped = 0
        for plat, result in results.items():
            if plat == "total":
                continue
            seeded = result.get("seeded", 0)
            skipped = result.get("skipped", 0)
            error = result.get("error", "")
            warnings = result.get("warnings", [])
            total_seeded += seeded
            total_skipped += skipped
            status = f"seeded={seeded}, skipped={skipped}"
            if error:
                status += f", ERROR: {error}"
            if warnings:
                status += f", warnings: {len(warnings)}"
            print(f"  {plat:15s}: {status}")

        print("-" * 50)
        print(f"Total seeded: {total_seeded}, skipped: {total_skipped}")

        # Print DB breakdown by platform
        print("\nDB breakdown by platform:")
        platform_counts = (
            db.query(ProjectCase.platform, func.count(ProjectCase.id))
            .group_by(ProjectCase.platform)
            .all()
        )
        grand_total = 0
        for plat_name, count in sorted(platform_counts, key=lambda x: x[0] or ""):
            print(f"  {(plat_name or 'backend'):15s}: {count}")
            grand_total += count
        print(f"  {'TOTAL':15s}: {grand_total}")

        if args.build:
            print(f"\nBuild label applied: {args.build}")
        if args.reason:
            print(f"Reason applied: {args.reason}")

    finally:
        db.close()


if __name__ == "__main__":
    main()
