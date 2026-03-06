---
phase: quick-106
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/project_tracker.py
  - apps/web/p2p-platform/backend/scripts/seed_project_cases.py
  - apps/web/p2p-platform/frontend/src/app/screens/projectTracker/Main.tsx
  - apps/web/p2p-platform/frontend/src/App.tsx
  - apps/web/p2p-platform/frontend/src/app/components/layout/MainLayout.tsx
autonomous: true
requirements: [QUICK-106]

must_haves:
  truths:
    - "Admin can view all ~1495 test cases as individually tracked tickets in a table"
    - "Admin can filter cases by category, status, priority, and search by name"
    - "Admin can inline-update status, priority, version, build number, and release notes per case"
    - "Test cases are auto-seeded from pytest collection with proper categorization"
  artifacts:
    - path: "apps/web/p2p-platform/backend/project_tracker.py"
      provides: "SQLAlchemy model + CRUD API endpoints for project cases"
      exports: ["project_tracker_router"]
    - path: "apps/web/p2p-platform/backend/scripts/seed_project_cases.py"
      provides: "Pytest collection parser that seeds DB with all test cases"
    - path: "apps/web/p2p-platform/frontend/src/app/screens/projectTracker/Main.tsx"
      provides: "Jira-style table board with filters, inline editing, status badges"
  key_links:
    - from: "frontend/src/app/screens/projectTracker/Main.tsx"
      to: "/api/admin/project-cases"
      via: "axios api client"
      pattern: "api\\.(get|put|post).*project-cases"
    - from: "project_tracker.py router"
      to: "main_new.py app"
      via: "app.include_router"
      pattern: "include_router.*project_tracker"
---

<objective>
Build a production-grade project tracking board in the admin panel that treats all ~1495 backend test cases as individually tracked tickets with status, priority, version, build, and release history.

Purpose: Give the admin a Jira-style view of every test case in the system so each can be tracked through its lifecycle (Open -> In Progress -> Verified -> Released) with version/build metadata.

Output: Backend CRUD API, seeder script, and React table UI wired into admin panel sidebar.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/p2p-platform/backend/models.py (SQLAlchemy Base, declarative_base pattern)
@apps/web/p2p-platform/backend/main_new.py (app instance, router inclusion, admin_auth_middleware)
@apps/web/p2p-platform/frontend/src/App.tsx (React Router routes)
@apps/web/p2p-platform/frontend/src/app/components/layout/MainLayout.tsx (sidebar navigation)
@apps/web/p2p-platform/frontend/src/app/screens/jiraDashboard/Main.tsx (existing Jira dashboard pattern - Tailwind + Ant Design + lucide-react)
@apps/web/p2p-platform/frontend/src/app/api/api.ts (axios client, baseURL is /api)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Backend — project_tracker.py with SQLAlchemy model + CRUD API + seeder script</name>
  <files>
    apps/web/p2p-platform/backend/project_tracker.py
    apps/web/p2p-platform/backend/scripts/seed_project_cases.py
    apps/web/p2p-platform/backend/main_new.py
  </files>
  <action>
Create `project_tracker.py` in the backend root with:

1. **SQLAlchemy Model `ProjectCase`** using existing `Base` from `models.py`:
   - `id` Integer primary key autoincrement
   - `case_id` String unique (format: "TC-0001" through "TC-1495")
   - `name` String — the test function name (e.g., "test_health_check")
   - `full_path` String — full pytest nodeid (e.g., "tests/api/test_endpoints.py::TestHealthEndpoints::test_health_check")
   - `category` String — the test file stem (e.g., "test_endpoints")
   - `subcategory` String nullable — the test class name if any (e.g., "TestHealthEndpoints")
   - `test_type` String — derived from directory: "unit", "integration", "e2e", "smoke", "api", or "other"
   - `status` String default "Open" — enum values: Open, In Progress, Verified, Released
   - `priority` String default "Medium" — enum values: Critical, High, Medium, Low
   - `version_introduced` String nullable — e.g., "v1.0"
   - `build_number` String nullable — e.g., "1110"
   - `release_notes` Text nullable
   - `created_at` DateTime default utcnow
   - `updated_at` DateTime default utcnow, onupdate utcnow

2. **APIRouter** with prefix `/api/admin/project-cases`, all protected by admin auth:
   - `GET /` — List all cases with query params: `status`, `priority`, `category`, `test_type`, `search` (ILIKE on name/full_path), `page` (default 1), `page_size` (default 50). Returns `{items: [...], total: int, page: int, page_size: int, categories: [...], test_types: [...]}`.
   - `GET /stats` — Return aggregate counts: total, by_status (dict), by_priority (dict), by_category (dict), by_test_type (dict).
   - `PUT /{case_id}` — Update any mutable field (status, priority, version_introduced, build_number, release_notes). Returns updated case.
   - `PUT /bulk-update` — Accept `{case_ids: [...], updates: {status?, priority?}}` for bulk status/priority changes.
   - `POST /seed` — Trigger seeding (runs the seed logic). Returns `{seeded: N, skipped: M}`.

3. **Admin auth**: Use the same pattern as other admin endpoints — the router is under `/api/admin/` so `admin_auth_middleware` in `main_new.py` handles auth automatically. No additional auth decorators needed.

4. **Register router** in `main_new.py`: Add `from project_tracker import project_tracker_router` and `app.include_router(project_tracker_router)` near the other router includes. Also run `ProjectCase.metadata.create_all(bind=engine)` (or use the existing Base.metadata pattern) to auto-create the table.

5. **Seeder script** `scripts/seed_project_cases.py`:
   - Run `subprocess.run(["python", "-m", "pytest", "tests/", "--collect-only", "-q"], capture_output=True)` to get all test nodeids
   - Parse each line (format: `tests/path/file.py::ClassName::test_name` or `tests/path/file.py::test_name`)
   - For each, extract: name (function), full_path (nodeid), category (file stem), subcategory (class or None), test_type (from directory name)
   - Generate case_id as "TC-NNNN" (zero-padded sequential)
   - Insert into DB using SQLAlchemy session, skip if `full_path` already exists (upsert logic)
   - Print summary: "Seeded N new cases, skipped M existing"
   - The POST /seed endpoint should call the same core logic (not subprocess — import the function directly)

NOTE: For the POST /seed endpoint, instead of subprocess, use pytest's `--collect-only` programmatically or replicate the subprocess approach within the endpoint. The seeder script should be importable as a module.
  </action>
  <verify>
    1. `grep -n "project_tracker_router" apps/web/p2p-platform/backend/main_new.py` shows router registered
    2. `python -c "from project_tracker import ProjectCase, project_tracker_router; print('OK')"` succeeds
    3. `JWT_SECRET_KEY=test python scripts/seed_project_cases.py` seeds ~1495 cases
    4. `curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:8080/api/admin/project-cases/?page=1&page_size=5` returns JSON with items
  </verify>
  <done>
    - ProjectCase table exists with all fields
    - CRUD API returns paginated, filterable results
    - Seed script populates ~1495 cases from pytest collection
    - All endpoints protected by admin_auth_middleware
  </done>
</task>

<task type="auto">
  <name>Task 2: Frontend — Project Tracker screen with table, filters, inline editing + sidebar nav</name>
  <files>
    apps/web/p2p-platform/frontend/src/app/screens/projectTracker/Main.tsx
    apps/web/p2p-platform/frontend/src/App.tsx
    apps/web/p2p-platform/frontend/src/app/components/layout/MainLayout.tsx
  </files>
  <action>
Create `apps/web/p2p-platform/frontend/src/app/screens/projectTracker/Main.tsx`:

Follow the existing pattern from `jiraDashboard/Main.tsx` — use Tailwind classes, `api` from `../../api/api`, `Spin`/`message`/`Select`/`Input`/`Tag`/`Table`/`Pagination` from `antd`, and `lucide-react` icons.

**Layout:**
1. **Header row**: Title "Project Tracker" with subtitle showing total count, plus a "Seed from Tests" button (calls POST /admin/project-cases/seed, shows loading, then refetches).

2. **Stats cards row** (4 cards): Total Cases, Open, In Progress, Verified/Released. Fetch from `GET /admin/project-cases/stats`. Use same card style as jiraDashboard (white bg, rounded-lg, shadow-card, icon with colored bg circle).

3. **Filters row**:
   - Search input (Input.Search from antd, debounced 300ms)
   - Status dropdown (Select from antd): All, Open, In Progress, Verified, Released
   - Priority dropdown: All, Critical, High, Medium, Low
   - Category dropdown: populated from stats.categories
   - Test Type dropdown: populated from stats.test_types
   - "Clear Filters" button

4. **Main table** (Ant Design Table component):
   - Columns: Case ID (TC-NNNN, primary-600 colored), Name, Category (Tag), Subcategory, Test Type (Tag with color by type), Status (Tag with color: Open=warning, In Progress=blue, Verified=success, Released=purple), Priority (Tag: Critical=red, High=orange, Medium=blue, Low=green), Version, Build, Release Notes (truncated), Updated
   - **Inline editing**: Clicking Status or Priority cell shows a Select dropdown inline (use Ant Design's editable pattern or a simple onClick toggle to show Select). On change, call `PUT /admin/project-cases/{case_id}` and update local state.
   - **Expandable row**: Click row to expand showing full_path, release_notes textarea (editable), version_introduced input, build_number input, with a "Save" button that calls PUT.
   - Server-side pagination: use `page` and `page_size` params, show Ant Design Pagination below table.

5. **Bulk actions bar**: When rows are selected (checkbox column), show a floating bar with "Set Status" and "Set Priority" dropdowns that call PUT /bulk-update.

**State management:**
- `useState` for: cases[], stats, loading, filters (search, status, priority, category, test_type), pagination (page, pageSize, total), selectedRowKeys[]
- `useEffect` to fetch cases when filters or pagination change
- `useCallback` for fetch functions

**Wire into app:**
1. In `App.tsx`: Import `ProjectTracker` from `./app/screens/projectTracker/Main` and add route: `<Route path="project-tracker" element={<ProjectTracker />} />` near the jira-dashboard route.

2. In `MainLayout.tsx`: Add a new top-level nav item (NOT inside ERP children) above or below "Invoices":
   ```
   { name: 'Project Tracker', href: '/admin/project-tracker', icon: ClipboardList },
   ```
   Import `ClipboardList` from `lucide-react` (already used in the file or add to imports).

**Style notes:**
- Match existing admin panel look: white cards, neutral-50 bg rows, shadow-card, Tailwind utility classes
- Status colors: Open = `bg-warning-100 text-warning-700`, In Progress = `bg-primary-100 text-primary-700`, Verified = `bg-success-100 text-success-700`, Released = `bg-purple-100 text-purple-700`
- Priority colors: Critical = `bg-red-100 text-red-700`, High = `bg-orange-100 text-orange-700`, Medium = `bg-blue-100 text-blue-700`, Low = `bg-green-100 text-green-700`
  </action>
  <verify>
    1. `grep -rn "project-tracker" apps/web/p2p-platform/frontend/src/App.tsx` shows route
    2. `grep -rn "Project Tracker" apps/web/p2p-platform/frontend/src/app/components/layout/MainLayout.tsx` shows nav entry
    3. `ls apps/web/p2p-platform/frontend/src/app/screens/projectTracker/Main.tsx` exists
    4. `cd apps/web/p2p-platform/frontend && npx tsc --noEmit 2>&1 | head -20` shows no type errors in new files (or at least no errors in projectTracker/)
  </verify>
  <done>
    - Project Tracker screen renders table with 1495 cases (paginated)
    - Filters work: search, status, priority, category, test_type
    - Inline status/priority editing updates backend
    - Expandable rows allow editing version/build/release notes
    - Bulk update works for selected rows
    - Sidebar nav has "Project Tracker" entry linking to /admin/project-tracker
    - Route registered in App.tsx
  </done>
</task>

</tasks>

<verification>
1. Backend: `JWT_SECRET_KEY=test python -c "from project_tracker import ProjectCase; print('Model OK')"`
2. Seed: Run seed script, verify ~1495 cases in DB
3. API: Curl GET /stats returns correct totals
4. Frontend: `cd apps/web/p2p-platform/frontend && npm run build` succeeds
5. Integration: Start backend + frontend, navigate to /admin/project-tracker, see paginated table with seeded data
</verification>

<success_criteria>
- ~1495 test cases seeded as tracked tickets with TC-NNNN IDs
- Admin can view, filter, search, and paginate all cases
- Admin can inline-update status and priority
- Admin can expand rows to edit version, build, release notes
- Admin can bulk-update selected cases
- Project Tracker accessible from admin sidebar
- All endpoints protected by admin auth
</success_criteria>

<output>
After completion, create `.planning/quick/106-jira-style-project-tracking-in-admin-pan/106-SUMMARY.md`
</output>
