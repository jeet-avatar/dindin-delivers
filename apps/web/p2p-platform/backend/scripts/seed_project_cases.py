#!/usr/bin/env python3
"""
Seed project_cases table from pytest --collect-only output.

Usage:
  cd apps/web/p2p-platform/backend
  python scripts/seed_project_cases.py

  # With build versions:
  python scripts/seed_project_cases.py --build "iOS-Customer:1113,iOS-Driver:215,iOS-Restaurant:185,Android-Customer:vC=37,Android-Driver:vC=33,Android-Partner:vC=29"

  # With custom reason:
  python scripts/seed_project_cases.py --reason "Seeded for v1.0 release validation"

  # Both:
  python scripts/seed_project_cases.py --build "iOS-Customer:1113" --reason "Sprint 5 regression suite"
"""

import sys
import os
import argparse

# Add backend root to path so imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, init_db
from project_tracker import seed_project_cases, ProjectCase


def main():
    parser = argparse.ArgumentParser(
        description="Seed project_cases table from pytest --collect-only output."
    )
    parser.add_argument(
        "--build",
        type=str,
        default=None,
        help='Build versions, e.g. "iOS-Customer:1113,iOS-Driver:215,iOS-Restaurant:185,Android-Customer:vC=37,Android-Driver:vC=33,Android-Partner:vC=29"',
    )
    parser.add_argument(
        "--reason",
        type=str,
        default=None,
        help='Default reason/context for newly seeded cases (default: None)',
    )
    args = parser.parse_args()

    # Ensure tables exist
    init_db()

    db = SessionLocal()
    try:
        result = seed_project_cases(
            db,
            build_label=args.build,
            default_reason=args.reason,
        )
        total = db.query(ProjectCase).count()
        print(f"Seeded {result['seeded']} new cases, skipped {result['skipped']} existing")
        print(f"Total cases in DB: {total}")
        if args.build:
            print(f"Build label applied: {args.build}")
        if args.reason:
            print(f"Reason applied: {args.reason}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
