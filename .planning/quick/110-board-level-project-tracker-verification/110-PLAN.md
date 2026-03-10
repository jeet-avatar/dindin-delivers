---
phase: quick-110
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - scripts/populate_case_reasons.py
autonomous: true
requirements: [TRACKER-POPULATE, TRACKER-VERIFY]

must_haves:
  truths:
    - "All 2,512 project cases have a non-empty reason field"
    - "All 2,512 project cases have commit_ref set to current git HEAD short hash"
    - "All 2,512 project cases have dependencies populated based on category"
    - "All 2,512 project cases have impact_analysis populated based on test type"
    - "Reason text is deterministic and human-readable, derived from test name parsing"
    - "Backend test suite passes with zero failures"
    - "API endpoints return populated fields in responses and CSV export"
  artifacts:
    - path: "scripts/populate_case_reasons.py"
      provides: "Standalone CLI script to populate reason, commit_ref, dependencies, impact_analysis for all cases"
      min_lines: 150
  key_links:
    - from: "scripts/populate_case_reasons.py"
      to: "project_tracker.py"
      via: "imports ProjectCase model, uses SessionLocal from database.py"
      pattern: "from project_tracker import ProjectCase"
    - from: "scripts/populate_case_reasons.py"
      to: "database (PostgreSQL)"
      via: "batch UPDATE queries via SQLAlchemy"
      pattern: "db\\.query\\(ProjectCase\\)"
---

<objective>
Populate all 2,512 project cases with intelligent reason, commit_ref, dependencies, and impact_analysis fields, then verify the entire Project Tracker system end-to-end.

Purpose: Transform the Project Tracker from a bare case list into a fully-documented board with every field populated -- ready for production use as a Jira-quality tracking system.
Output: A populate script and verified system with all fields populated across 5 platforms.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/p2p-platform/backend/project_tracker.py
@apps/web/p2p-platform/backend/scripts/seed_project_cases.py
@apps/web/p2p-platform/backend/database.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create reason auto-populator script and run it</name>
  <files>scripts/populate_case_reasons.py</files>
  <action>
Create `scripts/populate_case_reasons.py` -- a standalone CLI script that connects to the DB via DATABASE_URL and populates reason, commit_ref, dependencies, and impact_analysis for ALL project cases.

**Script structure:**
1. Imports: sys, os, re, subprocess; add backend root to sys.path; import SessionLocal, init_db from database; import ProjectCase from project_tracker; import func from sqlalchemy.
2. Get git HEAD short hash via `subprocess.run(["git", "rev-parse", "--short", "HEAD"])`.
3. Query ALL ProjectCase rows from DB.
4. For each case, generate fields:

**Reason generation (deterministic, from test name parsing):**
- Split `case.name` on `_` and camelCase boundaries (use regex `r'(?<=[a-z])(?=[A-Z])|_'`)
- Remove leading "test" / "Test" prefix
- Apply word mappings: `auth` -> "authentication", `api` -> "API", `e2e` -> "end-to-end", `ws` -> "WebSocket", `db` -> "database", `cfg` -> "configuration", `btn` -> "button", `msg` -> "message", `err` -> "error", `req` -> "request", `res` -> "response", `usr` -> "user", `pwd` -> "password", `txn` -> "transaction", `fmt` -> "format", `init` -> "initialization", `calc` -> "calculation", `val` -> "validation", `nav` -> "navigation", `img` -> "image", `del` -> "delete", `upd` -> "update", `str` -> "string" (only if standalone word, not substring)
- Capitalize first word, lowercase rest
- Map platform to label: backend -> "Backend", ios -> "iOS", android -> "Android", microservice -> "Microservice", frontend -> "Frontend"
- Map test_type to label: unit -> "Unit", e2e -> "E2E", integration -> "Integration", smoke -> "Smoke", api -> "API", other -> "Test"
- Format: `"{PlatformLabel} {TestTypeLabel}: {Readable description} ({category})"`
- Examples:
  - `test_health_check`, backend, other, test_endpoints -> "Backend Test: Health check (test_endpoints)"
  - `testLoginView_brandLogo_isDisplayed`, ios, e2e, restaurant -> "iOS E2E: Login view brand logo is displayed (restaurant)"
  - `testEmailVerification_continueOrSkip_exists`, android, e2e, customer -> "Android E2E: Email verification continue or skip exists (customer)"
  - `test_stripe_payment_intent_creation`, backend, unit, test_stripe_integration -> "Backend Unit: Stripe payment intent creation (test_stripe_integration)"

**Dependencies generation (by category relationships):**
- Build a mapping dict of category -> dependencies list:
  - Payment-related categories (containing "payment", "stripe", "billing", "invoice", "payout") -> "auth, user-management"
  - Order-related categories (containing "order", "delivery", "food") -> "auth, vendor-management, payment"
  - Ride-related categories (containing "ride", "rideshare", "fare", "bid") -> "auth, driver-management, payment"
  - Auth-related categories (containing "auth", "login", "register", "jwt") -> "database, user-model"
  - Driver categories (containing "driver") -> "auth, vehicle-management"
  - Vendor categories (containing "vendor", "restaurant", "menu") -> "auth, restaurant-management"
  - Admin categories (containing "admin", "dashboard") -> "auth, all-models"
  - For ios/android platform: prepend "backend-api, " to whatever dependency
  - Default for unmatched: "core-api"

**Impact analysis generation:**
- Based on test_type and category:
  - e2e tests: "Breaking this test indicates regression in the {category} user flow. Affects end-to-end functionality."
  - unit tests: "Breaking this test indicates a code-level regression in {category}. Isolated impact."
  - integration tests: "Breaking this test indicates integration failure between {category} components. May cascade."
  - smoke tests: "Breaking this test indicates critical system failure in {category}. Immediate attention required."
  - api tests: "Breaking this test indicates API contract violation in {category}. Client apps may break."
  - other: "Breaking this test indicates regression in {category}. Investigate scope of change."

5. **Batch update using SQLAlchemy** -- do NOT update one-by-one. Group cases and use `db.query(ProjectCase).filter(ProjectCase.id == case.id).update(...)` in batches of 500, calling `db.commit()` after each batch.

6. Print summary: total updated, sample reasons from each platform, and counts of populated fields.

**After creating the script, RUN IT against the production database:**
```bash
cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend
source venv/bin/activate
DATABASE_URL=$(python -c "import os; print(os.environ.get('DATABASE_URL', ''))") python scripts/populate_case_reasons.py
```

If DATABASE_URL is not in env, check `.env` file or use the staging/production URL from AWS Secrets Manager. The script MUST actually run and populate all 2,512 cases.
  </action>
  <verify>
After running the script, verify in Python:
```python
# Quick DB check
from database import SessionLocal
from project_tracker import ProjectCase
from sqlalchemy import func

db = SessionLocal()
total = db.query(ProjectCase).count()
with_reason = db.query(ProjectCase).filter(ProjectCase.reason.isnot(None), ProjectCase.reason != '').count()
with_commit = db.query(ProjectCase).filter(ProjectCase.commit_ref.isnot(None)).count()
with_deps = db.query(ProjectCase).filter(ProjectCase.dependencies.isnot(None)).count()
with_impact = db.query(ProjectCase).filter(ProjectCase.impact_analysis.isnot(None)).count()
print(f"Total: {total}, Reason: {with_reason}, Commit: {with_commit}, Deps: {with_deps}, Impact: {with_impact}")
assert with_reason == total, f"Reason not populated for all: {with_reason}/{total}"
assert with_commit == total, f"Commit not populated for all: {with_commit}/{total}"
assert with_deps == total, f"Deps not populated for all: {with_deps}/{total}"
assert with_impact == total, f"Impact not populated for all: {with_impact}/{total}"
db.close()
```
  </verify>
  <done>All 2,512 cases have non-empty reason, commit_ref, dependencies, and impact_analysis fields. The populate script exists at scripts/populate_case_reasons.py and is reusable.</done>
</task>

<task type="auto">
  <name>Task 2: Full system verification -- test suite + API endpoints + CSV export</name>
  <files>scripts/populate_case_reasons.py</files>
  <action>
Run the full verification suite:

1. **Backend test suite**: `cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && source venv/bin/activate && pytest tests/ -v --tb=short 2>&1 | tail -30` -- must pass with zero failures. If any test fails, investigate and fix (the populate script should not break any existing tests).

2. **API endpoint verification using a quick Python script** (run inline, not a file):
```python
import os, sys
sys.path.insert(0, '.')
os.environ.setdefault('TESTING', '1')

from fastapi.testclient import TestClient
from main_new import app

client = TestClient(app)

# Need admin auth header
ADMIN_SECRET = os.environ.get('ADMIN_SECRET_KEY', 'test-admin-secret')
headers = {"X-Admin-Secret": ADMIN_SECRET}

# Test 1: Stats endpoint
r = client.get("/api/admin/project-cases/stats", headers=headers)
assert r.status_code == 200, f"Stats failed: {r.status_code}"
stats = r.json()
print(f"Stats: total={stats['total']}, platforms={stats.get('by_platform', {})}")

# Test 2: List with platform filter, verify reason populated
r = client.get("/api/admin/project-cases/?platform=ios&page_size=5", headers=headers)
assert r.status_code == 200, f"List failed: {r.status_code}"
items = r.json()["items"]
for item in items:
    assert item.get("reason"), f"Case {item['case_id']} missing reason"
    assert item.get("commit_ref"), f"Case {item['case_id']} missing commit_ref"
print(f"iOS cases sample: {len(items)} items, all have reason+commit_ref")

# Test 3: CSV export has populated columns
r = client.get("/api/admin/project-cases/export", headers=headers)
assert r.status_code == 200, f"Export failed: {r.status_code}"
lines = r.text.strip().split('\n')
print(f"CSV export: {len(lines)} lines (including header)")
# Check header has reason column
header = lines[0]
assert 'reason' in header, "CSV missing reason column"

# Test 4: Sorting
r = client.get("/api/admin/project-cases/?sort_by=platform&sort_order=asc&page_size=5", headers=headers)
assert r.status_code == 200, f"Sort failed: {r.status_code}"
platforms = [item["platform"] for item in r.json()["items"]]
print(f"Sorted by platform asc: {platforms}")

print("\n=== ALL API CHECKS PASSED ===")
```

3. **Print final verification report** summarizing:
   - Total cases: 2,512
   - Fields populated: reason, commit_ref, dependencies, impact_analysis (all 2,512)
   - Test suite: X passed, 0 failed
   - API endpoints: stats, list, export, sort all working
   - Admin portal credentials: `support@dollor.ai / AdminTest123` at `http://localhost:5173/admin`
  </action>
  <verify>
- `pytest tests/ -v` shows 0 failures
- All 4 API endpoint checks pass (stats, list with filter, export, sort)
- Printed verification report confirms all 2,512 cases populated
  </verify>
  <done>Full backend test suite passes. All 4 API endpoints verified working with populated fields. CSV export includes all columns. Verification report printed with login credentials.</done>
</task>

</tasks>

<verification>
- [ ] scripts/populate_case_reasons.py exists and runs successfully
- [ ] All 2,512 cases have reason field populated with deterministic, human-readable text
- [ ] All 2,512 cases have commit_ref set to git HEAD short hash
- [ ] All 2,512 cases have dependencies populated
- [ ] All 2,512 cases have impact_analysis populated
- [ ] pytest tests/ -v passes with 0 failures
- [ ] GET /api/admin/project-cases/stats returns total and by_platform
- [ ] GET /api/admin/project-cases/?platform=ios returns items with reason populated
- [ ] GET /api/admin/project-cases/export returns CSV with all columns
- [ ] GET /api/admin/project-cases/?sort_by=platform&sort_order=asc works correctly
</verification>

<success_criteria>
All 2,512 project cases across 5 platforms have reason, commit_ref, dependencies, and impact_analysis populated with meaningful, deterministic content. Backend test suite green. All API endpoints verified. System ready for production use as a Jira-quality project tracker.
</success_criteria>

<output>
After completion, create `.planning/quick/110-board-level-project-tracker-verification/110-SUMMARY.md`
</output>
