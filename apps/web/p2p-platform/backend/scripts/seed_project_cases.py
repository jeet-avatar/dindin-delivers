#!/usr/bin/env python3
"""
Seed project_cases table from pytest --collect-only output.

Usage:
  cd apps/web/p2p-platform/backend
  python scripts/seed_project_cases.py
"""

import sys
import os

# Add backend root to path so imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, init_db
from project_tracker import seed_project_cases, ProjectCase


def main():
    # Ensure tables exist
    init_db()

    db = SessionLocal()
    try:
        result = seed_project_cases(db)
        total = db.query(ProjectCase).count()
        print(f"Seeded {result['seeded']} new cases, skipped {result['skipped']} existing")
        print(f"Total cases in DB: {total}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
