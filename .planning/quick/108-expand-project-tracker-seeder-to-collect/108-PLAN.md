---
phase: quick-108
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/project_tracker.py
  - apps/web/p2p-platform/backend/scripts/seed_project_cases.py
  - apps/web/p2p-platform/frontend/src/app/screens/projectTracker/Main.tsx
autonomous: true
requirements: [Q108-01]
must_haves:
  truths:
    - "ProjectCase model has a platform column distinguishing backend/ios/android/microservice/frontend"
    - "Seeder collects iOS XCTest functions from apps/ios/ via regex parsing"
    - "Seeder collects Android JUnit functions from /Users/jeet/StudioProjects/eatfair-android/ via regex parsing"
    - "Seeder collects microservice pytest tests from services/core/*/tests/"
    - "Seeder collects frontend tests from apps/web/p2p-platform/frontend/"
    - "CLI script supports --platform flag to seed specific platform or all"
    - "Stats and list endpoints support platform filter"
    - "Frontend UI has platform filter dropdown and shows platform column"
    - "Total seeded cases is ~2,795 (up from 1,495)"
  artifacts:
    - path: "apps/web/p2p-platform/backend/project_tracker.py"
      provides: "ProjectCase model with platform column, multi-platform seed functions, platform filter on API"
    - path: "apps/web/p2p-platform/backend/scripts/seed_project_cases.py"
      provides: "CLI with --platform flag"
    - path: "apps/web/p2p-platform/frontend/src/app/screens/projectTracker/Main.tsx"
      provides: "Platform filter dropdown and platform column in table"
  key_links:
    - from: "scripts/seed_project_cases.py"
      to: "project_tracker.py seed functions"
      via: "import and call"
      pattern: "seed_.*_cases"
---

<objective>
Expand the project tracker seeder to collect ALL test cases across iOS, Android, microservices, and frontend platforms. Add a `platform` column to ProjectCase and update the full stack (model, seeder, API, frontend) to support it.

Purpose: Give the admin panel visibility into the full ~2,795 test cases across all platforms, not just the 1,495 backend pytest tests.
Output: Updated model with platform column, multi-platform seeder functions, platform filter on API and frontend.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/p2p-platform/backend/project_tracker.py
@apps/web/p2p-platform/backend/scripts/seed_project_cases.py
@apps/web/p2p-platform/frontend/src/app/screens/projectTracker/Main.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add platform column and multi-platform seed functions to project_tracker.py</name>
  <files>apps/web/p2p-platform/backend/project_tracker.py</files>
  <action>
1. Add `platform` column to ProjectCase model:
   ```python
   platform = Column(String(50), nullable=True, default="backend", index=True)
   ```

2. Add Alembic-free migration: In `seed_project_cases()`, before seeding, check if platform column exists and add it via raw SQL if not:
   ```python
   from sqlalchemy import inspect, text
   inspector = inspect(db.bind)
   columns = [c['name'] for c in inspector.get_columns('project_cases')]
   if 'platform' not in columns:
       db.execute(text("ALTER TABLE project_cases ADD COLUMN platform VARCHAR(50) DEFAULT 'backend'"))
       db.execute(text("UPDATE project_cases SET platform = 'backend' WHERE platform IS NULL"))
       db.commit()
   ```

3. Update existing `seed_project_cases()` to set `platform="backend"` on all cases it creates.

4. Add `seed_ios_cases(db, build_label, default_reason)` function:
   - Walk `apps/ios/` directory (relative to repo root, compute from backend_dir: `os.path.join(backend_dir, '..', '..', '..', 'ios')`)
   - EXCLUDE paths containing: `Pods/`, `DerivedData/`, `build/`, `.build/`
   - Find all `.swift` files
   - Regex parse for `func test\w+\(` — each match is a test function
   - Also detect XCTestCase class names via `class (\w+)\s*:\s*XCTestCase`
   - Determine category from app folder: if path contains `/customer/` → "customer", `/delivery/` → "driver", `/restaurant/` → "restaurant", else folder name
   - full_path format: `ios::{relative_path_from_repo_root}::{ClassName}::{func_name}` (class may be None if not inside a class)
   - test_type detection: if path contains "UITest" → "e2e", if path contains "Flow" → "integration", else "unit"
   - Set `platform="ios"` on all created cases

5. Add `seed_android_cases(db, build_label, default_reason)` function:
   - Walk `/Users/jeet/StudioProjects/eatfair-android/` directory
   - EXCLUDE paths containing: `build/`, `.gradle/`, `.idea/`
   - Find all `.kt` files in test directories (path should contain `/test/` or `/androidTest/`)
   - Regex parse for `fun test\w+\(` AND `@Test` annotation (line before a `fun ` line)
   - Detect class names via `class (\w+)`
   - Category from module: `app/` → "customer", `driver/` → "driver", `partner/` → "partner"
   - full_path format: `android::{relative_path_from_android_root}::{ClassName}::{func_name}`
   - test_type: if path contains "androidTest" → "e2e", if "integration" in path → "integration", else "unit"
   - Set `platform="android"` on all created cases

6. Add `seed_microservice_cases(db, build_label, default_reason)` function:
   - For each directory in `services/core/*/tests/`:
     - Run `python -m pytest {test_dir} --collect-only -qq` with cwd set to the service directory
     - Parse output same as existing `seed_project_cases` logic
     - Prefix full_path with `microservice::` to ensure uniqueness
     - Category = service name (parent of tests/)
     - Set `platform="microservice"`

7. Add `seed_frontend_cases(db, build_label, default_reason)` function:
   - Walk `apps/web/p2p-platform/frontend/src/` for files matching `*.test.*` or `*.spec.*`
   - Regex parse for `(it|test|describe)\s*\(["'](.+?)["']` to extract test names
   - full_path: `frontend::{relative_path}::{test_name}`
   - Category = "admin-portal"
   - Set `platform="frontend"`, test_type = "unit"

8. Add `seed_all_platforms(db, build_label, default_reason)` function that calls all 5 seed functions (backend, ios, android, microservice, frontend) and returns combined results dict with per-platform counts.

9. Update API endpoints:
   - `list_project_cases`: Add `platform: Optional[str] = None` query param, filter by `ProjectCase.platform == platform` when set. Include `platforms` list in response (distinct platform values).
   - `get_project_case_stats`: Add `by_platform` dict to response (group by platform, count). Add `platforms` list.
   - `seed_cases_endpoint`: Add `platform: Optional[str] = Query(default=None)` param. If platform specified, call only that platform's seed function. If None, call `seed_all_platforms()`. Return per-platform results.

10. Update list endpoint response to include `platform` field in each item dict.
  </action>
  <verify>
    cd apps/web/p2p-platform/backend && python -c "from project_tracker import ProjectCase, seed_ios_cases, seed_android_cases, seed_microservice_cases, seed_frontend_cases, seed_all_platforms; print('All imports OK')"
  </verify>
  <done>
    ProjectCase has platform column. Five platform-specific seed functions exist and are importable. API endpoints accept platform filter. Stats endpoint returns by_platform breakdown.
  </done>
</task>

<task type="auto">
  <name>Task 2: Update CLI script with --platform flag and run full seed</name>
  <files>apps/web/p2p-platform/backend/scripts/seed_project_cases.py</files>
  <action>
1. Add `--platform` argument to argparse:
   ```python
   parser.add_argument(
       "--platform",
       type=str,
       default=None,
       choices=["backend", "ios", "android", "microservice", "frontend", "all"],
       help='Platform to seed (default: all). Options: backend, ios, android, microservice, frontend, all',
   )
   ```

2. Update main() logic:
   - Import all new seed functions from project_tracker
   - If `--platform` is None or "all": call `seed_all_platforms(db, build_label, default_reason)` and print per-platform results
   - If specific platform: call only that platform's seed function
   - Print total cases in DB after seeding
   - Print per-platform breakdown: `db.query(ProjectCase.platform, func.count(ProjectCase.id)).group_by(ProjectCase.platform).all()`

3. Run the seeder to verify it works:
   ```bash
   cd apps/web/p2p-platform/backend
   python scripts/seed_project_cases.py --platform all
   ```
   Expect output showing ~1,300 new cases seeded (existing 1,495 backend skipped + ~255 iOS + ~699 Android + ~306 microservice + ~40 frontend = ~1,300 new).

4. If any platform's seeder hits errors (e.g., missing venv for microservices), add try/except with warning print and continue to next platform — never fail the whole seed for one platform's issue.
  </action>
  <verify>
    cd apps/web/p2p-platform/backend && python scripts/seed_project_cases.py --platform ios 2>&1 | head -5
  </verify>
  <done>
    CLI supports `--platform` flag. Running `--platform all` seeds cases from all platforms. Per-platform counts printed. Total approaches ~2,795.
  </done>
</task>

<task type="auto">
  <name>Task 3: Add platform filter to frontend Project Tracker UI</name>
  <files>apps/web/p2p-platform/frontend/src/app/screens/projectTracker/Main.tsx</files>
  <action>
1. Add `platform` to the ProjectCase interface:
   ```typescript
   platform: string | null;
   ```

2. Add `platform` to the Filters interface and initial state:
   ```typescript
   platform: string;
   // initial: ''
   ```

3. Add `platforms` state: `const [platforms, setPlatforms] = useState<string[]>([]);`

4. Update `fetchCases` to send `platform` filter param and read `platforms` from response:
   ```typescript
   if (filters.platform) params.platform = filters.platform;
   // after response:
   setPlatforms(response.data.platforms || []);
   ```

5. Update `fetchStats` to handle `by_platform` from response.

6. Add Platform filter dropdown in the filter bar (after Test Type select):
   ```tsx
   <Select
     placeholder="Platform"
     allowClear
     value={filters.platform || undefined}
     onChange={(val) => handleFilterChange('platform', val || '')}
     style={{ width: 140 }}
     options={platforms.map((p) => ({ label: p.charAt(0).toUpperCase() + p.slice(1), value: p }))}
   />
   ```

7. Update `clearFilters` to include `platform: ''`.

8. Update `hasActiveFilters` to include `filters.platform`.

9. Add Platform column to table header (after Case ID, before Name):
   ```tsx
   <th className="px-3 py-3 text-left font-medium text-neutral-600 w-24">Platform</th>
   ```

10. Add Platform cell in table body row (after case_id cell, before name cell):
    ```tsx
    <td className="px-3 py-2.5">
      <Tag color={PLATFORM_COLORS[c.platform || 'backend'] || 'default'} className="m-0">
        {c.platform || 'backend'}
      </Tag>
    </td>
    ```

11. Add PLATFORM_COLORS constant:
    ```typescript
    const PLATFORM_COLORS: Record<string, string> = {
      'backend': 'blue',
      'ios': 'geekblue',
      'android': 'green',
      'microservice': 'purple',
      'frontend': 'orange',
    };
    ```

12. Update colSpan on expanded row and empty state from 11 to 12 (for the new column).

13. Add a platform breakdown row in the stats cards section — replace single "Total Cases" card with a row that shows total + per-platform mini-counts:
    Update the stats section to show `by_platform` data if available. Keep the 4 stat cards but add a small line under "Total Cases" showing platform breakdown like "Backend: 1495 | iOS: 255 | Android: 699 | ...".
  </action>
  <verify>
    cd apps/web/p2p-platform/frontend && npx tsc --noEmit --pretty 2>&1 | tail -5
  </verify>
  <done>
    Frontend shows Platform column in table, Platform filter dropdown works, stats show per-platform breakdown. All TypeScript compiles without errors.
  </done>
</task>

</tasks>

<verification>
1. `python scripts/seed_project_cases.py --platform all` completes without errors and reports ~2,795 total cases
2. `python -c "from project_tracker import ProjectCase; print(ProjectCase.platform)"` confirms column exists
3. Frontend TypeScript compiles: `cd frontend && npx tsc --noEmit`
4. Backend imports clean: `python -c "from project_tracker import seed_all_platforms"`
5. Stats endpoint includes by_platform: `curl localhost:8080/api/admin/project-cases/stats | python -m json.tool | grep by_platform`
</verification>

<success_criteria>
- ProjectCase model has `platform` column with values: backend, ios, android, microservice, frontend
- Seeder collects tests from all 5 platforms via regex parsing (iOS/Android) or pytest collection (backend/microservices)
- Total case count is ~2,795 (up from 1,495)
- API supports `?platform=ios` filtering on list and stats endpoints
- Frontend has working Platform filter dropdown and Platform column in table
- CLI `--platform` flag works for selective or full seeding
</success_criteria>

<output>
After completion, create `.planning/quick/108-expand-project-tracker-seeder-to-collect/108-SUMMARY.md`
</output>
