"""
Dollor.ai Project Tracker — Jira-style test case tracking for admin panel.

Provides:
- ProjectCase SQLAlchemy model (stored in same DB as all other models)
- CRUD API endpoints under /api/admin/project-cases (protected by admin_auth_middleware)
- Seed logic to populate cases from pytest --collect-only output
- Multi-platform seeding: backend, iOS, Android, microservices, frontend
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Text, DateTime, func, inspect, text
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
import subprocess
import os
import re
import csv
import io
import glob as glob_mod

from models import Base
from database import get_db


# ==================== SQLAlchemy Model ====================

class ProjectCase(Base):
    __tablename__ = "project_cases"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(String(10), unique=True, nullable=False, index=True)  # TC-0001
    name = Column(String(500), nullable=False)  # test function name
    full_path = Column(String(1000), unique=True, nullable=False)  # full pytest nodeid
    category = Column(String(200), nullable=False)  # test file stem
    subcategory = Column(String(200), nullable=True)  # test class name
    test_type = Column(String(50), nullable=False, default="other")  # unit/integration/e2e/smoke/api/other
    status = Column(String(20), nullable=False, default="Open")  # Open/In Progress/Verified/Released
    priority = Column(String(20), nullable=False, default="Medium")  # Critical/High/Medium/Low
    version_introduced = Column(String(50), nullable=True)
    build_number = Column(String(200), nullable=True)
    release_notes = Column(Text, nullable=True)
    reason = Column(Text, nullable=True)  # Why this test/feature was built
    commit_ref = Column(String(200), nullable=True)  # Git commit hash or tag
    dependencies = Column(Text, nullable=True)  # What this case depends on
    platform = Column(String(50), nullable=True, default="backend", index=True)  # backend/ios/android/microservice/frontend
    impact_analysis = Column(Text, nullable=True)  # What breaks if changed
    last_activity = Column(Text, nullable=True)  # Tracks what changed on last update
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ==================== Pydantic Schemas ====================

class ProjectCaseUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    version_introduced: Optional[str] = None
    build_number: Optional[str] = None
    release_notes: Optional[str] = None
    reason: Optional[str] = None
    commit_ref: Optional[str] = None
    dependencies: Optional[str] = None
    impact_analysis: Optional[str] = None
    last_activity: Optional[str] = None


class BulkUpdateRequest(BaseModel):
    case_ids: List[str]
    updates: ProjectCaseUpdate


# ==================== Seed Logic ====================

VALID_STATUSES = {"Open", "In Progress", "Verified", "Released"}
VALID_PRIORITIES = {"Critical", "High", "Medium", "Low"}

# Map directory names to test types
TEST_TYPE_MAP = {
    "unit": "unit",
    "integration": "integration",
    "e2e": "e2e",
    "smoke": "smoke",
    "api": "api",
}


def _detect_test_type(nodeid: str) -> str:
    """Derive test_type from the test path directory structure."""
    parts = nodeid.lower().split("/")
    for part in parts:
        for key, val in TEST_TYPE_MAP.items():
            if key in part:
                return val
    return "other"


def _parse_nodeid(nodeid: str):
    """Parse a pytest nodeid into components.

    Formats:
      tests/path/file.py::ClassName::test_name
      tests/path/file.py::test_name
    """
    # Split file path from test identifiers
    if "::" not in nodeid:
        return None

    file_part, *rest = nodeid.split("::")
    if not rest:
        return None

    # Extract file stem (category)
    file_stem = os.path.splitext(os.path.basename(file_part))[0]

    if len(rest) == 2:
        subcategory = rest[0]
        name = rest[1]
    elif len(rest) == 1:
        subcategory = None
        name = rest[0]
    else:
        subcategory = rest[0] if rest else None
        name = rest[-1] if rest else "unknown"

    return {
        "name": name,
        "full_path": nodeid,
        "category": file_stem,
        "subcategory": subcategory,
        "test_type": _detect_test_type(nodeid),
    }


def seed_project_cases(
    db: Session,
    test_dir: str = "tests/",
    build_label: str = None,
    default_reason: str = None,
) -> dict:
    """Collect pytest tests and seed them into the project_cases table.

    Args:
        db: Database session.
        test_dir: Directory to collect tests from.
        build_label: Optional build version string to set on new cases
            (e.g. "iOS-Customer:1113,iOS-Driver:215").
        default_reason: Optional reason/context to set on new cases.

    Returns dict with {seeded: N, skipped: M}.
    """
    backend_dir = os.path.dirname(os.path.abspath(__file__))

    # Alembic-free migration: add platform column if missing
    _ensure_new_columns(db)

    # Run pytest --collect-only to get all test nodeids
    result = subprocess.run(
        ["python", "-m", "pytest", test_dir, "--collect-only", "-qq"],
        capture_output=True,
        text=True,
        cwd=backend_dir,
        timeout=120,
    )

    # Parse output lines
    lines = []
    for line in result.stdout.strip().split("\n"):
        line = line.strip()
        # Skip empty lines, summary lines, warnings
        if not line or line.startswith("=") or line.startswith("-") or line.startswith("no tests") or "warning" in line.lower():
            continue
        # Valid test nodeid contains ::
        if "::" in line:
            # Remove any trailing markers like " PASSED" or parametrize IDs
            # Clean line: take only the part before any spaces (nodeid is first token)
            nodeid = line.split(" ")[0].strip()
            if nodeid:
                lines.append(nodeid)

    # Get existing full_paths to skip
    existing_paths = set(
        row[0] for row in db.query(ProjectCase.full_path).all()
    )

    # Get current max case_id number
    max_case = db.query(func.max(ProjectCase.case_id)).scalar()
    if max_case:
        current_num = int(max_case.replace("TC-", ""))
    else:
        current_num = 0

    seeded = 0
    skipped = 0

    for nodeid in lines:
        if nodeid in existing_paths:
            skipped += 1
            continue

        parsed = _parse_nodeid(nodeid)
        if not parsed:
            continue

        current_num += 1
        # Parse build_label into formatted string if provided
        build_str = None
        version_str = None
        if build_label:
            parts = [p.strip() for p in build_label.split(",") if p.strip()]
            formatted = []
            for part in parts:
                if ":" in part:
                    app, ver = part.split(":", 1)
                    # Shorten common prefixes for display
                    short = app.replace("Customer", "Cust").replace("Driver", "Drv").replace("Restaurant", "Rest").replace("Partner", "Part")
                    formatted.append(f"{short}:{ver}")
                else:
                    formatted.append(part)
            build_str = " / ".join(formatted)
            version_str = "1.0"

        case = ProjectCase(
            case_id=f"TC-{current_num:04d}",
            name=parsed["name"],
            full_path=parsed["full_path"],
            category=parsed["category"],
            subcategory=parsed["subcategory"],
            test_type=parsed["test_type"],
            status="Open",
            priority="Medium",
            platform="backend",
            build_number=build_str,
            version_introduced=version_str,
            reason=default_reason or None,
        )
        db.add(case)
        seeded += 1

    db.commit()
    return {"seeded": seeded, "skipped": skipped}


# ==================== Platform Column Migration ====================

def _ensure_new_columns(db: Session):
    """Add any missing columns to project_cases table (Alembic-free migration)."""
    NEW_COLUMNS = {
        "platform": "ALTER TABLE project_cases ADD COLUMN platform VARCHAR(50) DEFAULT 'backend'",
        "reason": "ALTER TABLE project_cases ADD COLUMN reason TEXT",
        "commit_ref": "ALTER TABLE project_cases ADD COLUMN commit_ref VARCHAR(200)",
        "dependencies": "ALTER TABLE project_cases ADD COLUMN dependencies TEXT",
        "impact_analysis": "ALTER TABLE project_cases ADD COLUMN impact_analysis TEXT",
        "last_activity": "ALTER TABLE project_cases ADD COLUMN last_activity TEXT",
    }
    try:
        inspector = inspect(db.bind)
        columns = {c['name']: c for c in inspector.get_columns('project_cases')}
        added = []
        for col_name, ddl in NEW_COLUMNS.items():
            if col_name not in columns:
                db.execute(text(ddl))
                added.append(col_name)
        # Widen build_number if it's too small (was VARCHAR(50), need 200)
        if 'build_number' in columns:
            col_type = str(columns['build_number'].get('type', ''))
            if 'VARCHAR(50)' in col_type.upper():
                db.execute(text("ALTER TABLE project_cases ALTER COLUMN build_number TYPE VARCHAR(200)"))
                added.append('build_number_widened')
        if added:
            if 'platform' in added:
                db.execute(text("UPDATE project_cases SET platform = 'backend' WHERE platform IS NULL"))
            db.commit()
    except Exception:
        # Table may not exist yet — that's OK, ORM will create it with all columns
        db.rollback()


# ==================== Helper: Get next case_id number ====================

def _get_next_case_num(db: Session) -> int:
    """Get the current max case_id number from DB."""
    max_case = db.query(func.max(ProjectCase.case_id)).scalar()
    if max_case:
        return int(max_case.replace("TC-", ""))
    return 0


def _get_existing_paths(db: Session) -> set:
    """Get all existing full_paths."""
    return set(row[0] for row in db.query(ProjectCase.full_path).all())


def _format_build_label(build_label: str):
    """Format build label into build_str and version_str."""
    if not build_label:
        return None, None
    parts = [p.strip() for p in build_label.split(",") if p.strip()]
    formatted = []
    for part in parts:
        if ":" in part:
            app, ver = part.split(":", 1)
            short = app.replace("Customer", "Cust").replace("Driver", "Drv").replace("Restaurant", "Rest").replace("Partner", "Part")
            formatted.append(f"{short}:{ver}")
        else:
            formatted.append(part)
    return " / ".join(formatted), "1.0"


# ==================== iOS Seed ====================

def seed_ios_cases(
    db: Session,
    build_label: str = None,
    default_reason: str = None,
) -> dict:
    """Collect iOS XCTest functions and seed them into project_cases.

    Walks apps/ios/ directory, parses .swift files for test functions.
    """
    _ensure_new_columns(db)
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    ios_dir = os.path.normpath(os.path.join(backend_dir, '..', '..', '..', 'ios'))
    repo_root = os.path.normpath(os.path.join(backend_dir, '..', '..', '..', '..'))

    if not os.path.isdir(ios_dir):
        return {"seeded": 0, "skipped": 0, "error": f"iOS dir not found: {ios_dir}"}

    exclude_dirs = {'Pods', 'DerivedData', 'build', '.build'}
    existing_paths = _get_existing_paths(db)
    current_num = _get_next_case_num(db)
    build_str, version_str = _format_build_label(build_label)

    seeded = 0
    skipped = 0

    func_re = re.compile(r'func\s+(test\w+)\s*\(')
    class_re = re.compile(r'class\s+(\w+)\s*:\s*XCTestCase')

    for root, dirs, files in os.walk(ios_dir):
        # Exclude unwanted directories
        dirs[:] = [d for d in dirs if d not in exclude_dirs]

        for fname in files:
            if not fname.endswith('.swift'):
                continue

            filepath = os.path.join(root, fname)
            rel_path = os.path.relpath(filepath, repo_root)

            try:
                with open(filepath, 'r', errors='ignore') as f:
                    content = f.read()
            except Exception:
                continue

            # Detect class name
            class_match = class_re.search(content)
            class_name = class_match.group(1) if class_match else None

            # Detect category from app folder
            path_lower = rel_path.lower()
            if '/customer/' in path_lower:
                category = 'customer'
            elif '/delivery/' in path_lower:
                category = 'driver'
            elif '/restaurant/' in path_lower:
                category = 'restaurant'
            else:
                # Use the first meaningful folder name
                parts = rel_path.split(os.sep)
                category = parts[2] if len(parts) > 2 else 'ios'

            # Detect test type
            if 'UITest' in rel_path or 'uitest' in path_lower:
                test_type = 'e2e'
            elif 'Flow' in rel_path:
                test_type = 'integration'
            else:
                test_type = 'unit'

            # Find test functions
            for match in func_re.finditer(content):
                func_name = match.group(1)
                full_path = f"ios::{rel_path}::{class_name or 'unknown'}::{func_name}"

                if full_path in existing_paths:
                    skipped += 1
                    continue

                current_num += 1
                case = ProjectCase(
                    case_id=f"TC-{current_num:04d}",
                    name=func_name,
                    full_path=full_path,
                    category=category,
                    subcategory=class_name,
                    test_type=test_type,
                    status="Open",
                    priority="Medium",
                    platform="ios",
                    build_number=build_str,
                    version_introduced=version_str,
                    reason=default_reason or None,
                )
                db.add(case)
                existing_paths.add(full_path)
                seeded += 1

    db.commit()
    return {"seeded": seeded, "skipped": skipped}


# ==================== Android Seed ====================

ANDROID_ROOT = "/Users/jeet/StudioProjects/eatfair-android"

def seed_android_cases(
    db: Session,
    build_label: str = None,
    default_reason: str = None,
) -> dict:
    """Collect Android JUnit/Kotlin test functions and seed them into project_cases.

    Walks the eatfair-android directory for test files.
    """
    _ensure_new_columns(db)
    android_root = ANDROID_ROOT

    if not os.path.isdir(android_root):
        return {"seeded": 0, "skipped": 0, "error": f"Android dir not found: {android_root}"}

    exclude_dirs = {'build', '.gradle', '.idea'}
    existing_paths = _get_existing_paths(db)
    current_num = _get_next_case_num(db)
    build_str, version_str = _format_build_label(build_label)

    seeded = 0
    skipped = 0

    func_re = re.compile(r'fun\s+(test\w+)\s*\(')
    class_re = re.compile(r'class\s+(\w+)')
    test_annotation_re = re.compile(r'@Test')

    for root, dirs, files in os.walk(android_root):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]

        # Only process test directories
        if '/test/' not in root and '/androidTest/' not in root:
            continue

        for fname in files:
            if not fname.endswith('.kt'):
                continue

            filepath = os.path.join(root, fname)
            rel_path = os.path.relpath(filepath, android_root)

            try:
                with open(filepath, 'r', errors='ignore') as f:
                    lines = f.readlines()
            except Exception:
                continue

            # Detect class name from file content
            content = ''.join(lines)
            class_match = class_re.search(content)
            class_name = class_match.group(1) if class_match else None

            # Category from module
            if rel_path.startswith('app/'):
                category = 'customer'
            elif rel_path.startswith('driver/'):
                category = 'driver'
            elif rel_path.startswith('partner/'):
                category = 'partner'
            else:
                parts = rel_path.split(os.sep)
                category = parts[0] if parts else 'android'

            # Test type
            if '/androidTest/' in rel_path:
                test_type = 'e2e'
            elif 'integration' in rel_path.lower():
                test_type = 'integration'
            else:
                test_type = 'unit'

            # Find test functions: both `fun testXxx` and `@Test` annotated
            test_funcs = set()

            # Method 1: func testXxx pattern
            for match in func_re.finditer(content):
                test_funcs.add(match.group(1))

            # Method 2: @Test annotation followed by fun
            for i, line in enumerate(lines):
                if test_annotation_re.search(line):
                    # Look at next non-empty lines for fun declaration
                    for j in range(i + 1, min(i + 5, len(lines))):
                        fun_match = re.search(r'fun\s+(\w+)\s*\(', lines[j])
                        if fun_match:
                            test_funcs.add(fun_match.group(1))
                            break

            for func_name in sorted(test_funcs):
                full_path = f"android::{rel_path}::{class_name or 'unknown'}::{func_name}"

                if full_path in existing_paths:
                    skipped += 1
                    continue

                current_num += 1
                case = ProjectCase(
                    case_id=f"TC-{current_num:04d}",
                    name=func_name,
                    full_path=full_path,
                    category=category,
                    subcategory=class_name,
                    test_type=test_type,
                    status="Open",
                    priority="Medium",
                    platform="android",
                    build_number=build_str,
                    version_introduced=version_str,
                    reason=default_reason or None,
                )
                db.add(case)
                existing_paths.add(full_path)
                seeded += 1

    db.commit()
    return {"seeded": seeded, "skipped": skipped}


# ==================== Microservice Seed ====================

def seed_microservice_cases(
    db: Session,
    build_label: str = None,
    default_reason: str = None,
) -> dict:
    """Collect microservice pytest tests and seed them into project_cases.

    Runs pytest --collect-only for each service in services/core/*/tests/.
    """
    _ensure_new_columns(db)
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    services_dir = os.path.normpath(os.path.join(backend_dir, '..', '..', '..', '..', 'services', 'core'))

    if not os.path.isdir(services_dir):
        return {"seeded": 0, "skipped": 0, "error": f"Services dir not found: {services_dir}"}

    existing_paths = _get_existing_paths(db)
    current_num = _get_next_case_num(db)
    build_str, version_str = _format_build_label(build_label)

    seeded = 0
    skipped = 0
    errors = []

    for service_name in sorted(os.listdir(services_dir)):
        service_dir = os.path.join(services_dir, service_name)
        tests_dir = os.path.join(service_dir, 'tests')
        if not os.path.isdir(tests_dir):
            continue

        try:
            result = subprocess.run(
                ["python", "-m", "pytest", "tests/", "--collect-only", "-qq"],
                capture_output=True,
                text=True,
                cwd=service_dir,
                timeout=60,
            )

            for line in result.stdout.strip().split("\n"):
                line = line.strip()
                if not line or line.startswith("=") or line.startswith("-") or line.startswith("no tests") or "warning" in line.lower():
                    continue
                if "::" not in line:
                    continue

                nodeid = line.split(" ")[0].strip()
                if not nodeid:
                    continue

                full_path = f"microservice::{service_name}::{nodeid}"

                if full_path in existing_paths:
                    skipped += 1
                    continue

                parsed = _parse_nodeid(nodeid)
                if not parsed:
                    continue

                current_num += 1
                case = ProjectCase(
                    case_id=f"TC-{current_num:04d}",
                    name=parsed["name"],
                    full_path=full_path,
                    category=service_name,
                    subcategory=parsed["subcategory"],
                    test_type=parsed["test_type"],
                    status="Open",
                    priority="Medium",
                    platform="microservice",
                    build_number=build_str,
                    version_introduced=version_str,
                    reason=default_reason or None,
                )
                db.add(case)
                existing_paths.add(full_path)
                seeded += 1

        except Exception as e:
            errors.append(f"{service_name}: {str(e)}")
            continue

    db.commit()
    result = {"seeded": seeded, "skipped": skipped}
    if errors:
        result["warnings"] = errors
    return result


# ==================== Frontend Seed ====================

def seed_frontend_cases(
    db: Session,
    build_label: str = None,
    default_reason: str = None,
) -> dict:
    """Collect frontend test cases from *.test.* and *.spec.* files.

    Parses it/test/describe blocks from React/TypeScript test files.
    """
    _ensure_new_columns(db)
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_src = os.path.normpath(os.path.join(backend_dir, '..', 'frontend', 'src'))
    repo_root = os.path.normpath(os.path.join(backend_dir, '..', '..', '..', '..'))

    if not os.path.isdir(frontend_src):
        return {"seeded": 0, "skipped": 0, "error": f"Frontend src not found: {frontend_src}"}

    existing_paths = _get_existing_paths(db)
    current_num = _get_next_case_num(db)
    build_str, version_str = _format_build_label(build_label)

    seeded = 0
    skipped = 0

    test_name_re = re.compile(r'(?:it|test|describe)\s*\(["\'](.+?)["\']')

    for root, dirs, files in os.walk(frontend_src):
        for fname in files:
            if not ('.test.' in fname or '.spec.' in fname):
                continue

            filepath = os.path.join(root, fname)
            rel_path = os.path.relpath(filepath, repo_root)

            try:
                with open(filepath, 'r', errors='ignore') as f:
                    content = f.read()
            except Exception:
                continue

            for match in test_name_re.finditer(content):
                test_name = match.group(1)
                full_path = f"frontend::{rel_path}::{test_name}"

                if full_path in existing_paths:
                    skipped += 1
                    continue

                current_num += 1
                case = ProjectCase(
                    case_id=f"TC-{current_num:04d}",
                    name=test_name,
                    full_path=full_path,
                    category="admin-portal",
                    subcategory=fname,
                    test_type="unit",
                    status="Open",
                    priority="Medium",
                    platform="frontend",
                    build_number=build_str,
                    version_introduced=version_str,
                    reason=default_reason or None,
                )
                db.add(case)
                existing_paths.add(full_path)
                seeded += 1

    db.commit()
    return {"seeded": seeded, "skipped": skipped}


# ==================== Seed All Platforms ====================

def seed_all_platforms(
    db: Session,
    build_label: str = None,
    default_reason: str = None,
) -> dict:
    """Seed test cases from all platforms: backend, iOS, Android, microservices, frontend.

    Returns combined results dict with per-platform counts.
    """
    results = {}

    platform_seeders = [
        ("backend", seed_project_cases),
        ("ios", seed_ios_cases),
        ("android", seed_android_cases),
        ("microservice", seed_microservice_cases),
        ("frontend", seed_frontend_cases),
    ]
    for name, seeder_fn in platform_seeders:
        try:
            results[name] = seeder_fn(db, build_label=build_label, default_reason=default_reason)
        except Exception as e:
            db.rollback()
            results[name] = {"seeded": 0, "skipped": 0, "error": str(e)}

    total_seeded = sum(r.get("seeded", 0) for r in results.values())
    total_skipped = sum(r.get("skipped", 0) for r in results.values())
    results["total"] = {"seeded": total_seeded, "skipped": total_skipped}

    return results


# ==================== API Router ====================

project_tracker_router = APIRouter(
    prefix="/api/admin/project-cases",
    tags=["project-tracker"],
)


@project_tracker_router.get("/stats")
def get_project_case_stats(
    platform: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Aggregate stats for the project tracker dashboard."""
    base_query = db.query(ProjectCase)
    if platform:
        base_query = base_query.filter(ProjectCase.platform == platform)

    total = base_query.count()

    # By status
    status_q = db.query(ProjectCase.status, func.count(ProjectCase.id)).group_by(ProjectCase.status)
    if platform:
        status_q = status_q.filter(ProjectCase.platform == platform)
    by_status = {row[0]: row[1] for row in status_q.all()}

    # By priority
    priority_q = db.query(ProjectCase.priority, func.count(ProjectCase.id)).group_by(ProjectCase.priority)
    if platform:
        priority_q = priority_q.filter(ProjectCase.platform == platform)
    by_priority = {row[0]: row[1] for row in priority_q.all()}

    # By category (top 20)
    category_q = (
        db.query(ProjectCase.category, func.count(ProjectCase.id))
        .group_by(ProjectCase.category)
        .order_by(func.count(ProjectCase.id).desc())
        .limit(20)
    )
    if platform:
        category_q = category_q.filter(ProjectCase.platform == platform)
    by_category = {row[0]: row[1] for row in category_q.all()}

    # By test_type
    type_q = db.query(ProjectCase.test_type, func.count(ProjectCase.id)).group_by(ProjectCase.test_type)
    if platform:
        type_q = type_q.filter(ProjectCase.platform == platform)
    by_test_type = {row[0]: row[1] for row in type_q.all()}

    # By platform
    platform_rows = (
        db.query(ProjectCase.platform, func.count(ProjectCase.id))
        .group_by(ProjectCase.platform)
        .all()
    )
    by_platform = {(row[0] or "backend"): row[1] for row in platform_rows}

    # Distinct values for filter dropdowns
    categories = sorted([row[0] for row in db.query(ProjectCase.category).distinct().all()])
    test_types = sorted([row[0] for row in db.query(ProjectCase.test_type).distinct().all()])
    platforms = sorted([row[0] or "backend" for row in db.query(ProjectCase.platform).distinct().all()])

    return {
        "total": total,
        "by_status": by_status,
        "by_priority": by_priority,
        "by_category": by_category,
        "by_test_type": by_test_type,
        "by_platform": by_platform,
        "categories": categories,
        "test_types": test_types,
        "platforms": platforms,
    }


SORTABLE_COLUMNS = {"case_id", "name", "category", "platform", "status", "priority", "test_type", "updated_at", "created_at"}


def _build_filtered_query(db: Session, status=None, priority=None, category=None, test_type=None, platform=None, search=None):
    """Build a filtered query for ProjectCase. Shared by list and export."""
    query = db.query(ProjectCase)
    if status:
        query = query.filter(ProjectCase.status == status)
    if priority:
        query = query.filter(ProjectCase.priority == priority)
    if category:
        query = query.filter(ProjectCase.category == category)
    if test_type:
        query = query.filter(ProjectCase.test_type == test_type)
    if platform:
        query = query.filter(ProjectCase.platform == platform)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (ProjectCase.name.ilike(search_term))
            | (ProjectCase.full_path.ilike(search_term))
            | (ProjectCase.case_id.ilike(search_term))
        )
    return query


@project_tracker_router.get("/")
def list_project_cases(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    test_type: Optional[str] = None,
    platform: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = Query(default=None),
    sort_order: Optional[str] = Query(default="asc"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """List all project cases with filtering, sorting, and pagination."""
    query = _build_filtered_query(db, status, priority, category, test_type, platform, search)

    total = query.count()

    # Apply sorting
    if sort_by and sort_by in SORTABLE_COLUMNS:
        order_col = getattr(ProjectCase, sort_by)
        query = query.order_by(order_col.desc() if sort_order == "desc" else order_col.asc())
    else:
        query = query.order_by(ProjectCase.id)

    items = (
        query.offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    # Distinct values for filter dropdowns
    categories = sorted([row[0] for row in db.query(ProjectCase.category).distinct().all()])
    test_types = sorted([row[0] for row in db.query(ProjectCase.test_type).distinct().all()])
    platforms = sorted([row[0] or "backend" for row in db.query(ProjectCase.platform).distinct().all()])

    return {
        "items": [
            {
                "id": c.id,
                "case_id": c.case_id,
                "name": c.name,
                "full_path": c.full_path,
                "category": c.category,
                "subcategory": c.subcategory,
                "test_type": c.test_type,
                "status": c.status,
                "priority": c.priority,
                "platform": c.platform or "backend",
                "version_introduced": c.version_introduced,
                "build_number": c.build_number,
                "release_notes": c.release_notes,
                "reason": c.reason,
                "commit_ref": c.commit_ref,
                "dependencies": c.dependencies,
                "impact_analysis": c.impact_analysis,
                "last_activity": c.last_activity,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            }
            for c in items
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "categories": categories,
        "test_types": test_types,
        "platforms": platforms,
    }


@project_tracker_router.get("/export")
def export_project_cases(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    test_type: Optional[str] = None,
    platform: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Export filtered project cases as CSV."""
    query = _build_filtered_query(db, status, priority, category, test_type, platform, search)
    cases = query.order_by(ProjectCase.id).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Header row
    headers = [
        "case_id", "name", "category", "subcategory", "test_type", "status",
        "priority", "platform", "version_introduced", "build_number", "reason",
        "commit_ref", "dependencies", "impact_analysis", "full_path",
        "created_at", "updated_at", "last_activity",
    ]
    writer.writerow(headers)

    for c in cases:
        writer.writerow([
            c.case_id, c.name, c.category, c.subcategory, c.test_type, c.status,
            c.priority, c.platform or "backend", c.version_introduced, c.build_number,
            c.reason, c.commit_ref, c.dependencies, c.impact_analysis, c.full_path,
            c.created_at.isoformat() if c.created_at else "",
            c.updated_at.isoformat() if c.updated_at else "",
            c.last_activity or "",
        ])

    csv_string = output.getvalue()
    return Response(
        content=csv_string,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=project-cases.csv"},
    )


@project_tracker_router.put("/bulk-update")
def bulk_update_cases(
    req: BulkUpdateRequest,
    db: Session = Depends(get_db),
):
    """Bulk update status/priority for multiple cases."""
    updates = {}
    if req.updates.status:
        if req.updates.status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status: {req.updates.status}")
        updates["status"] = req.updates.status
    if req.updates.priority:
        if req.updates.priority not in VALID_PRIORITIES:
            raise HTTPException(status_code=400, detail=f"Invalid priority: {req.updates.priority}")
        updates["priority"] = req.updates.priority

    if not updates:
        raise HTTPException(status_code=400, detail="No valid updates provided")

    updates["updated_at"] = datetime.utcnow()

    count = (
        db.query(ProjectCase)
        .filter(ProjectCase.case_id.in_(req.case_ids))
        .update(updates, synchronize_session="fetch")
    )
    db.commit()
    return {"updated": count}


@project_tracker_router.put("/{case_id}")
def update_project_case(
    case_id: str,
    updates: ProjectCaseUpdate,
    db: Session = Depends(get_db),
):
    """Update a single project case by case_id (e.g., TC-0001)."""
    case = db.query(ProjectCase).filter(ProjectCase.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

    if updates.status is not None:
        if updates.status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status: {updates.status}")
        case.status = updates.status
    if updates.priority is not None:
        if updates.priority not in VALID_PRIORITIES:
            raise HTTPException(status_code=400, detail=f"Invalid priority: {updates.priority}")
        case.priority = updates.priority
    if updates.version_introduced is not None:
        case.version_introduced = updates.version_introduced
    if updates.build_number is not None:
        case.build_number = updates.build_number
    if updates.release_notes is not None:
        case.release_notes = updates.release_notes
    if updates.reason is not None:
        case.reason = updates.reason
    if updates.commit_ref is not None:
        case.commit_ref = updates.commit_ref
    if updates.dependencies is not None:
        case.dependencies = updates.dependencies
    if updates.impact_analysis is not None:
        case.impact_analysis = updates.impact_analysis

    # Track what changed for last_activity
    changed_fields = []
    update_dict = updates.dict(exclude_unset=True)
    for field_name in update_dict:
        if field_name != "last_activity":
            changed_fields.append(field_name)
    if changed_fields:
        change_desc = "Updated " + ", ".join(changed_fields)
        case.last_activity = f"{change_desc} at {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"

    case.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(case)

    return {
        "id": case.id,
        "case_id": case.case_id,
        "name": case.name,
        "full_path": case.full_path,
        "category": case.category,
        "subcategory": case.subcategory,
        "test_type": case.test_type,
        "status": case.status,
        "priority": case.priority,
        "platform": case.platform or "backend",
        "version_introduced": case.version_introduced,
        "build_number": case.build_number,
        "release_notes": case.release_notes,
        "reason": case.reason,
        "commit_ref": case.commit_ref,
        "dependencies": case.dependencies,
        "impact_analysis": case.impact_analysis,
        "last_activity": case.last_activity,
        "created_at": case.created_at.isoformat() if case.created_at else None,
        "updated_at": case.updated_at.isoformat() if case.updated_at else None,
    }


@project_tracker_router.post("/seed")
def seed_cases_endpoint(
    build_label: Optional[str] = Query(default=None, description="Build versions, e.g. iOS-Customer:1113,iOS-Driver:215"),
    reason: Optional[str] = Query(default=None, description="Default reason/context for new cases"),
    platform: Optional[str] = Query(default=None, description="Platform to seed: backend, ios, android, microservice, frontend, or None for all"),
    db: Session = Depends(get_db),
):
    """Trigger seeding of project cases from test collection.

    If platform specified, only seeds that platform. If None, seeds all platforms.
    """
    platform_seed_map = {
        "backend": lambda: seed_project_cases(db, build_label=build_label, default_reason=reason),
        "ios": lambda: seed_ios_cases(db, build_label=build_label, default_reason=reason),
        "android": lambda: seed_android_cases(db, build_label=build_label, default_reason=reason),
        "microservice": lambda: seed_microservice_cases(db, build_label=build_label, default_reason=reason),
        "frontend": lambda: seed_frontend_cases(db, build_label=build_label, default_reason=reason),
    }

    if platform and platform in platform_seed_map:
        result = platform_seed_map[platform]()
        return {platform: result}
    else:
        return seed_all_platforms(db, build_label=build_label, default_reason=reason)
