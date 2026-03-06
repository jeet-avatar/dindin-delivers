---
phase: quick-109
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/project_tracker.py
  - apps/web/p2p-platform/backend/tests/test_project_tracker.py
  - apps/web/p2p-platform/frontend/src/app/screens/projectTracker/Main.tsx
autonomous: true
requirements: [PT-BACKEND-FIX, PT-SORT, PT-EXPORT, PT-ACTIVITY, PT-VERIFY]

must_haves:
  truths:
    - "seed_project_cases.py --platform all succeeds without StringDataRightTruncation or PendingRollbackError"
    - "Stats endpoint returns JSON with 'total', 'by_platform', 'platforms' keys when called with admin auth"
    - "List endpoint returns all 18 fields per case including platform, reason, commit_ref, dependencies, impact_analysis"
    - "List endpoint accepts sort_by and sort_order params and returns sorted results"
    - "Export endpoint returns CSV with all filtered cases"
    - "PUT update works for all editable fields including reason, commit_ref, dependencies, impact_analysis"
    - "Frontend table headers are clickable for column sorting"
    - "Frontend has Export CSV button that downloads filtered cases"
    - "Last activity field tracks what was changed on each update"
  artifacts:
    - path: "apps/web/p2p-platform/backend/project_tracker.py"
      provides: "Sort, export CSV, last_activity field, all CRUD endpoints"
      contains: "sort_by"
    - path: "apps/web/p2p-platform/backend/tests/test_project_tracker.py"
      provides: "API tests with admin auth headers for stats, list, update, sort, export"
      min_lines: 80
    - path: "apps/web/p2p-platform/frontend/src/app/screens/projectTracker/Main.tsx"
      provides: "Sortable headers, Export CSV button, last_activity display"
      contains: "sort_by"
  key_links:
    - from: "apps/web/p2p-platform/frontend/src/app/screens/projectTracker/Main.tsx"
      to: "/api/admin/project-cases/"
      via: "api.get with sort_by, sort_order params"
      pattern: "sort_by"
    - from: "apps/web/p2p-platform/frontend/src/app/screens/projectTracker/Main.tsx"
      to: "/api/admin/project-cases/export"
      via: "api.get for CSV download"
      pattern: "export"
    - from: "apps/web/p2p-platform/backend/project_tracker.py"
      to: "database project_cases table"
      via: "SQLAlchemy ORM with _ensure_new_columns migration"
      pattern: "_ensure_new_columns"
---

<objective>
Audit and fix the Project Tracker admin panel to Jira-level quality. Fix all backend bugs (build_number truncation, PendingRollbackError), add sorting/export/activity-log Jira features, and verify all 2,507 cases across 5 platforms are tracked correctly.

Purpose: The Project Tracker is the single source of truth for all test cases across backend, iOS, Android, microservices, and frontend. It must be reliable and feature-complete for production use.
Output: Bug-free backend with sort/export/activity endpoints, sortable+exportable frontend, passing test suite.
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
  <name>Task 1: Fix backend bugs and add sort/export/activity endpoints</name>
  <files>
    apps/web/p2p-platform/backend/project_tracker.py
    apps/web/p2p-platform/backend/tests/test_project_tracker.py
  </files>
  <action>
**In project_tracker.py:**

1. **Add `last_activity` column** to ProjectCase model: `last_activity = Column(Text, nullable=True)`. Add `last_activity: Optional[str] = None` to ProjectCaseUpdate schema. Add `"last_activity"` to `_ensure_new_columns` NEW_COLUMNS dict: `"last_activity": "ALTER TABLE project_cases ADD COLUMN last_activity TEXT"`.

2. **Add `sort_by` and `sort_order` query params** to `list_project_cases`:
   - Add params: `sort_by: Optional[str] = Query(default=None)`, `sort_order: Optional[str] = Query(default="asc")`
   - Validate `sort_by` against allowed columns: `{"case_id", "name", "category", "platform", "status", "priority", "test_type", "updated_at", "created_at"}`
   - If valid sort_by, apply: `order_col = getattr(ProjectCase, sort_by)` then `query = query.order_by(order_col.desc() if sort_order == "desc" else order_col.asc())`
   - Keep existing `query.order_by(ProjectCase.id)` as fallback when sort_by is None

3. **Add CSV export endpoint** at `@project_tracker_router.get("/export")`:
   - Accept same filter params as list_project_cases (status, priority, category, test_type, platform, search) but NO pagination
   - Build same filtered query
   - Return `Response(content=csv_string, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=project-cases.csv"})`
   - CSV columns: case_id, name, category, subcategory, test_type, status, priority, platform, version_introduced, build_number, reason, commit_ref, dependencies, impact_analysis, full_path, created_at, updated_at, last_activity
   - Import `from fastapi.responses import Response` and `import csv, io`
   - IMPORTANT: Place the `/export` route BEFORE the `/{case_id}` route so FastAPI doesn't match "export" as a case_id

4. **Track last_activity on updates**: In `update_project_case`, before committing, build a change description string listing which fields changed (e.g., "Updated status, priority"). Set `case.last_activity = f"{change_desc} at {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"`. Also add `last_activity` to the response dict.

5. **Verify `_ensure_new_columns`**: The build_number widening logic uses string matching on `'50' in col_type` which could false-positive on other types. Make it more precise: check `'VARCHAR(50)' in col_type.upper()` only (remove the `or '50' in col_type` fallback). This is already mostly correct but remove the loose `'50' in col_type` check.

**In tests/test_project_tracker.py (NEW FILE):**

Create a test file that uses FastAPI TestClient. Tests MUST pass `X-Admin-Secret` header (the admin auth middleware checks this). Use `os.environ.get("ADMIN_SECRET_KEY", "test-admin-secret")` and set `os.environ["ADMIN_SECRET_KEY"] = "test-admin-secret"` at module level before imports.

Tests to write:
- `test_stats_endpoint`: GET `/api/admin/project-cases/stats` with admin header, assert response has `total`, `by_status`, `by_platform`, `platforms` keys
- `test_list_endpoint_fields`: GET `/api/admin/project-cases/` with admin header, assert response has `items`, `total`, `page`, `platforms` keys. If items exist, verify each item has all 18+ fields including `platform`, `reason`, `commit_ref`, `dependencies`, `impact_analysis`, `last_activity`
- `test_list_sorting`: GET `/api/admin/project-cases/?sort_by=case_id&sort_order=desc` with admin header, assert 200
- `test_export_csv`: GET `/api/admin/project-cases/export` with admin header, assert 200 and content-type is text/csv
- `test_update_case`: If cases exist, PUT `/api/admin/project-cases/TC-0001` with `{"status": "Verified"}`, assert 200 and response includes `last_activity`

Use the app from `main_new` — `from main_new import app` then `client = TestClient(app)`.
  </action>
  <verify>
    cd apps/web/p2p-platform/backend && python -m pytest tests/test_project_tracker.py -v 2>&1 | tail -20
  </verify>
  <done>All 5 test cases pass. Stats returns full JSON with by_platform. List accepts sort_by/sort_order. Export returns CSV. Update records last_activity.</done>
</task>

<task type="auto">
  <name>Task 2: Add sortable headers, CSV export button, and activity display to frontend</name>
  <files>
    apps/web/p2p-platform/frontend/src/app/screens/projectTracker/Main.tsx
  </files>
  <action>
**Add sorting state and logic:**
1. Add state: `const [sortBy, setSortBy] = useState<string>('');` and `const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');`
2. In `fetchCases`, pass `sort_by` and `sort_order` params to the API call when sortBy is set: `if (sortBy) { params.sort_by = sortBy; params.sort_order = sortOrder; }`
3. Add `sortBy` and `sortOrder` to the `useCallback` dependency array for `fetchCases`
4. Create a `handleSort` function: if clicking same column, toggle order (asc->desc->clear). If clicking different column, set asc. Update state accordingly.

**Make table headers clickable for sorting:**
5. Replace static `<th>` elements for Case ID, Platform, Name, Category, Type, Status, Priority, Updated columns with clickable elements:
   ```tsx
   <th className="px-3 py-3 text-left font-medium text-neutral-600 cursor-pointer select-none hover:text-neutral-900" onClick={() => handleSort('case_id')}>
     <span className="inline-flex items-center gap-1">
       Case ID {sortBy === 'case_id' && (sortOrder === 'asc' ? '\u2191' : '\u2193')}
     </span>
   </th>
   ```
   Apply this pattern to: case_id, platform, name, category, test_type, status, priority, updated_at

**Add CSV Export button:**
6. Add an "Export CSV" button next to the "Seed from Tests" button in the header:
   ```tsx
   <button onClick={handleExport} className="flex items-center space-x-2 px-4 py-2 bg-white border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors text-sm font-medium">
     <Download className="h-4 w-4" />
     <span>Export CSV</span>
   </button>
   ```
7. Import `Download` from lucide-react
8. Create `handleExport` async function:
   - Build params object same as fetchCases (applying current filters but no pagination)
   - Call `api.get('/admin/project-cases/export', { params, responseType: 'blob' })`
   - Create a Blob URL and trigger download: `const url = URL.createObjectURL(new Blob([response.data])); const a = document.createElement('a'); a.href = url; a.download = 'project-cases.csv'; a.click(); URL.revokeObjectURL(url);`
   - Wrap in try/catch with `message.error` on failure

**Display last_activity in expanded row:**
9. Add `last_activity` to the ProjectCase interface: `last_activity: string | null;`
10. In the expanded row section (after "Release Info"), add a "Last Activity" display:
    ```tsx
    {c.last_activity && (
      <div className="mt-3 pt-3 border-t border-neutral-200">
        <p className="text-xs text-neutral-400">
          <Clock className="h-3 w-3 inline mr-1" />
          Last Activity: {c.last_activity}
        </p>
      </div>
    )}
    ```
  </action>
  <verify>
    cd apps/web/p2p-platform/frontend && npx tsc --noEmit 2>&1 | tail -10
  </verify>
  <done>TypeScript compiles clean. Table headers show sort indicators. Export CSV button present. Last activity displays in expanded row.</done>
</task>

<task type="auto">
  <name>Task 3: Run full seed, verify counts, run all backend tests</name>
  <files>
    apps/web/p2p-platform/backend/scripts/seed_project_cases.py
  </files>
  <action>
1. Verify the `_ensure_new_columns` migration handles the `last_activity` column addition.

2. Run the full seed to verify no StringDataRightTruncation or PendingRollbackError:
   ```bash
   cd apps/web/p2p-platform/backend
   source venv/bin/activate
   python scripts/seed_project_cases.py --platform all
   ```

3. Verify DB counts match expected:
   - backend: ~1492
   - ios: ~257
   - android: ~424
   - microservice: ~306
   - frontend: ~28
   - total: ~2507
   The seed script prints DB breakdown by platform. Verify all platforms appear and total is approximately 2507 (exact count may vary slightly if tests were added/removed).

4. Run the project tracker tests:
   ```bash
   python -m pytest tests/test_project_tracker.py -v
   ```

5. Run the full backend test suite to confirm no regressions:
   ```bash
   python -m pytest tests/ -v --timeout=120 2>&1 | tail -30
   ```

If seed fails with build_number truncation, the _ensure_new_columns fix from Task 1 didn't apply to the live DB. In that case, manually run: `ALTER TABLE project_cases ALTER COLUMN build_number TYPE VARCHAR(200);` via psql or the seed will need to drop and recreate the table.

If tests fail due to import errors or DB issues, fix the test file to ensure proper ADMIN_SECRET_KEY env var setup and TestClient configuration.
  </action>
  <verify>
    cd apps/web/p2p-platform/backend && python scripts/seed_project_cases.py --platform all 2>&1 | tail -15 && python -m pytest tests/test_project_tracker.py -v 2>&1 | tail -10
  </verify>
  <done>Seed completes with ~2507 total cases across 5 platforms. All project tracker tests pass. No backend test regressions.</done>
</task>

</tasks>

<verification>
1. `python -m pytest tests/test_project_tracker.py -v` -- all tests pass
2. `python scripts/seed_project_cases.py --platform all` -- completes without errors, shows ~2507 total
3. `cd frontend && npx tsc --noEmit` -- TypeScript compiles clean
4. `python -m pytest tests/ -v` -- no regressions in full suite
</verification>

<success_criteria>
- All backend bugs fixed (build_number width, PendingRollbackError, stats auth)
- sort_by/sort_order params work on list endpoint
- CSV export endpoint returns valid CSV
- last_activity tracked on updates
- Frontend has sortable headers, Export CSV button, last_activity display
- ~2507 cases seeded across 5 platforms
- All tests pass
</success_criteria>

<output>
After completion, create `.planning/quick/109-audit-fix-project-tracker-jira-quality/109-SUMMARY.md`
</output>
