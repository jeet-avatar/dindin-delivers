"""
Dollor.ai Project Tracker — Jira-style test case tracking for admin panel.

Provides:
- ProjectCase SQLAlchemy model (stored in same DB as all other models)
- CRUD API endpoints under /api/admin/project-cases (protected by admin_auth_middleware)
- Seed logic to populate cases from pytest --collect-only output
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Text, DateTime, func
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
import subprocess
import os
import re

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
    build_number = Column(String(50), nullable=True)
    release_notes = Column(Text, nullable=True)
    reason = Column(Text, nullable=True)  # Why this test/feature was built
    commit_ref = Column(String(200), nullable=True)  # Git commit hash or tag
    dependencies = Column(Text, nullable=True)  # What this case depends on
    impact_analysis = Column(Text, nullable=True)  # What breaks if changed
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


def seed_project_cases(db: Session, test_dir: str = "tests/") -> dict:
    """Collect pytest tests and seed them into the project_cases table.

    Returns dict with {seeded: N, skipped: M}.
    """
    # Run pytest --collect-only to get all test nodeids
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    result = subprocess.run(
        ["python", "-m", "pytest", test_dir, "--collect-only", "-q", "--no-header"],
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
        case = ProjectCase(
            case_id=f"TC-{current_num:04d}",
            name=parsed["name"],
            full_path=parsed["full_path"],
            category=parsed["category"],
            subcategory=parsed["subcategory"],
            test_type=parsed["test_type"],
            status="Open",
            priority="Medium",
        )
        db.add(case)
        seeded += 1

    db.commit()
    return {"seeded": seeded, "skipped": skipped}


# ==================== API Router ====================

project_tracker_router = APIRouter(
    prefix="/api/admin/project-cases",
    tags=["project-tracker"],
)


@project_tracker_router.get("/stats")
def get_project_case_stats(db: Session = Depends(get_db)):
    """Aggregate stats for the project tracker dashboard."""
    total = db.query(func.count(ProjectCase.id)).scalar() or 0

    # By status
    status_rows = (
        db.query(ProjectCase.status, func.count(ProjectCase.id))
        .group_by(ProjectCase.status)
        .all()
    )
    by_status = {row[0]: row[1] for row in status_rows}

    # By priority
    priority_rows = (
        db.query(ProjectCase.priority, func.count(ProjectCase.id))
        .group_by(ProjectCase.priority)
        .all()
    )
    by_priority = {row[0]: row[1] for row in priority_rows}

    # By category (top 20)
    category_rows = (
        db.query(ProjectCase.category, func.count(ProjectCase.id))
        .group_by(ProjectCase.category)
        .order_by(func.count(ProjectCase.id).desc())
        .limit(20)
        .all()
    )
    by_category = {row[0]: row[1] for row in category_rows}

    # By test_type
    type_rows = (
        db.query(ProjectCase.test_type, func.count(ProjectCase.id))
        .group_by(ProjectCase.test_type)
        .all()
    )
    by_test_type = {row[0]: row[1] for row in type_rows}

    # Distinct values for filter dropdowns
    categories = sorted([row[0] for row in db.query(ProjectCase.category).distinct().all()])
    test_types = sorted([row[0] for row in db.query(ProjectCase.test_type).distinct().all()])

    return {
        "total": total,
        "by_status": by_status,
        "by_priority": by_priority,
        "by_category": by_category,
        "by_test_type": by_test_type,
        "categories": categories,
        "test_types": test_types,
    }


@project_tracker_router.get("/")
def list_project_cases(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    test_type: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """List all project cases with filtering and pagination."""
    query = db.query(ProjectCase)

    if status:
        query = query.filter(ProjectCase.status == status)
    if priority:
        query = query.filter(ProjectCase.priority == priority)
    if category:
        query = query.filter(ProjectCase.category == category)
    if test_type:
        query = query.filter(ProjectCase.test_type == test_type)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (ProjectCase.name.ilike(search_term))
            | (ProjectCase.full_path.ilike(search_term))
            | (ProjectCase.case_id.ilike(search_term))
        )

    total = query.count()
    items = (
        query.order_by(ProjectCase.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    # Distinct values for filter dropdowns
    categories = sorted([row[0] for row in db.query(ProjectCase.category).distinct().all()])
    test_types = sorted([row[0] for row in db.query(ProjectCase.test_type).distinct().all()])

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
                "version_introduced": c.version_introduced,
                "build_number": c.build_number,
                "release_notes": c.release_notes,
                "reason": c.reason,
                "commit_ref": c.commit_ref,
                "dependencies": c.dependencies,
                "impact_analysis": c.impact_analysis,
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
    }


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
        "version_introduced": case.version_introduced,
        "build_number": case.build_number,
        "release_notes": case.release_notes,
        "reason": case.reason,
        "commit_ref": case.commit_ref,
        "dependencies": case.dependencies,
        "impact_analysis": case.impact_analysis,
        "created_at": case.created_at.isoformat() if case.created_at else None,
        "updated_at": case.updated_at.isoformat() if case.updated_at else None,
    }


@project_tracker_router.post("/seed")
def seed_cases_endpoint(db: Session = Depends(get_db)):
    """Trigger seeding of project cases from pytest collection."""
    result = seed_project_cases(db)
    return result
