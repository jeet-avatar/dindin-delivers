---
phase: quick-107
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/project_tracker.py
  - apps/web/p2p-platform/backend/scripts/seed_project_cases.py
  - apps/web/p2p-platform/frontend/src/app/screens/projectTracker/Main.tsx
autonomous: true
requirements: [QUICK-107]
must_haves:
  truths:
    - "Each project case has rich metadata: reason/context for why it was built, commit reference, dependencies list, and impact analysis"
    - "Seeder populates cases with current build versions (iOS Customer 1113, iOS Driver 215, iOS Restaurant 185, Android Customer vC=37, Android Driver vC=33, Android Partner vC=29)"
    - "Seeder script runs without -qq flag errors"
    - "Expanded row in React UI shows all new rich fields with editable inputs"
    - "API accepts and returns all new fields on GET and PUT"
  artifacts:
    - path: "apps/web/p2p-platform/backend/project_tracker.py"
      provides: "Enhanced ProjectCase model with rich case fields, updated API serialization and update logic"
    - path: "apps/web/p2p-platform/backend/scripts/seed_project_cases.py"
      provides: "Fixed seeder with -qq flag fix and build version seeding"
    - path: "apps/web/p2p-platform/frontend/src/app/screens/projectTracker/Main.tsx"
      provides: "Enhanced UI with rich case detail display in expanded rows"
  key_links:
    - from: "project_tracker.py (model columns)"
      to: "Main.tsx (ProjectCase interface)"
      via: "API JSON response shape"
      pattern: "reason|commit_ref|dependencies|impact_analysis"
---

<objective>
Rebuild the Project Tracker admin panel with rich case metadata. Each test case gets: reason/context (why it was built), commit reference, dependencies, and impact analysis (what breaks if changed). Fix the seeder -qq flag issue, enhance the SQLAlchemy model + API, and update the React UI to display/edit all new fields.

Purpose: Transform the project tracker from a simple test case list into a knowledge base that documents WHY each test exists and what depends on it.
Output: Enhanced backend model, fixed seeder with build version data, rich expanded-row UI.
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
  <name>Task 1: Enhance ProjectCase model with rich fields and update API</name>
  <files>apps/web/p2p-platform/backend/project_tracker.py</files>
  <action>
Add 4 new columns to the ProjectCase SQLAlchemy model:

1. `reason` — Text, nullable. Why this test/feature was built (context/motivation).
2. `commit_ref` — String(200), nullable. The git commit hash or tag where this was introduced.
3. `dependencies` — Text, nullable. Comma-separated or JSON list of what this case depends on (other test IDs, modules, services).
4. `impact_analysis` — Text, nullable. What breaks if this code/feature is changed.

Update `ProjectCaseUpdate` Pydantic schema to include all 4 new optional fields:
- `reason: Optional[str] = None`
- `commit_ref: Optional[str] = None`
- `dependencies: Optional[str] = None`
- `impact_analysis: Optional[str] = None`

Update the `list_project_cases` endpoint response serialization (the dict comprehension around line 299-315) to include all 4 new fields in each item.

Update the `update_project_case` PUT endpoint (line 356-401) to handle the 4 new fields — same pattern as existing fields (check `is not None`, then assign).

Update the return dict in `update_project_case` to include the 4 new fields.

Do NOT change the seed_project_cases function here — that is handled in Task 2.
  </action>
  <verify>
Run: `cd apps/web/p2p-platform/backend && python -c "from project_tracker import ProjectCase, ProjectCaseUpdate; print('Model fields:', [c.name for c in ProjectCase.__table__.columns]); print('Update fields:', ProjectCaseUpdate.model_fields.keys())"`
Confirm output includes reason, commit_ref, dependencies, impact_analysis in both model columns and update fields.
  </verify>
  <done>ProjectCase model has 4 new columns, Pydantic schema accepts them, GET list and PUT update endpoints serialize/handle all new fields.</done>
</task>

<task type="auto">
  <name>Task 2: Fix seeder -qq flag and add build version seeding</name>
  <files>apps/web/p2p-platform/backend/scripts/seed_project_cases.py, apps/web/p2p-platform/backend/project_tracker.py</files>
  <action>
**Fix the -qq flag issue in seed_project_cases():**
The `seed_project_cases` function in `project_tracker.py` (line 130) uses `--collect-only -q --no-header`. The issue is that `-qq` (double quiet) is needed to suppress warnings and get clean nodeid output. Change the pytest args from `["python", "-m", "pytest", test_dir, "--collect-only", "-q", "--no-header"]` to `["python", "-m", "pytest", test_dir, "--collect-only", "-qq"]`. The `-qq` flag produces one nodeid per line with no header/footer, making `--no-header` unnecessary.

**Update the seeder script** (`scripts/seed_project_cases.py`) to:
1. Accept an optional `--build` argument (e.g. `--build "iOS-Customer:1113,iOS-Driver:215,iOS-Restaurant:185,Android-Customer:vC=37,Android-Driver:vC=33,Android-Partner:vC=29"`)
2. When `--build` is provided, parse it into a dict and set `build_number` on ALL newly seeded cases to a formatted string of all build versions (e.g. "iOS-Cust:1113 / iOS-Drv:215 / iOS-Rest:185 / And-Cust:vC=37 / And-Drv:vC=33 / And-Part:vC=29")
3. Also set `version_introduced` to "1.0" (current version) on newly seeded cases when `--build` is provided
4. Add a `--reason` argument (optional, default: "Automated test seeded from pytest collection") that sets the `reason` field on newly seeded cases

Update the `seed_project_cases` function signature to accept optional `build_label: str = None` and `default_reason: str = None` parameters, and apply them to each new ProjectCase during seeding.

Update the `/seed` POST endpoint to accept optional query params `build_label` and `reason` and pass them through.

Print usage example in the script's `--help` or at the top as a comment:
```
python scripts/seed_project_cases.py --build "iOS-Customer:1113,iOS-Driver:215,iOS-Restaurant:185,Android-Customer:vC=37,Android-Driver:vC=33,Android-Partner:vC=29"
```
  </action>
  <verify>
Run: `cd apps/web/p2p-platform/backend && python scripts/seed_project_cases.py --help 2>&1 | head -5` — should show --build and --reason options without crashing.
Run: `cd apps/web/p2p-platform/backend && python -c "from project_tracker import seed_project_cases; import inspect; sig = inspect.signature(seed_project_cases); print(sig)"` — should show build_label and default_reason params.
  </verify>
  <done>Seeder uses -qq flag (no parse errors), accepts --build and --reason CLI args, passes build_label/default_reason to seed function which applies them to new cases.</done>
</task>

<task type="auto">
  <name>Task 3: Update React UI with rich case detail expanded rows</name>
  <files>apps/web/p2p-platform/frontend/src/app/screens/projectTracker/Main.tsx</files>
  <action>
**Update the ProjectCase TypeScript interface** (line 20-35) to add:
- `reason: string | null`
- `commit_ref: string | null`
- `dependencies: string | null`
- `impact_analysis: string | null`

**Update the editForm state** (line 114-118) to include the 4 new fields with empty string defaults.

**Update toggleExpanded** (line 268-282) to populate all new fields from the case when expanding.

**Update handleExpandedSave** (line 217-232) to send all fields in editForm (already sends full editForm, so just adding to state is enough).

**Redesign the expanded row section** (line 574-650) with a richer layout:

Replace the current expanded row with a 2-section layout:

Section 1 — "Context & Lineage" (full width):
- **Reason/Context**: textarea, 2 rows, placeholder "Why was this test/feature built?"
- **Commit Reference**: text input, placeholder "e.g. abc123 or v1.0.5", with monospace font
- **Full Path**: read-only monospace display (keep existing)

Section 2 — "Dependencies & Impact" (full width):
- **Dependencies**: textarea, 2 rows, placeholder "What does this depend on? (other tests, modules, services)"
- **Impact Analysis**: textarea, 3 rows, placeholder "What breaks if this code/feature is changed?"

Section 3 — "Release Info" (3-column grid, keep existing):
- Version, Build Number, Save button

Keep the existing Release Notes textarea below.

Add Lucide icons for visual clarity: `GitCommit` for commit_ref, `Link` for dependencies, `AlertTriangle` for impact_analysis, `FileText` for reason.

Import `GitCommit, Link, AlertTriangle, FileText` from lucide-react (add to existing import on line 2-14).

Style all new sections with the same pattern: `text-xs font-medium text-neutral-500 uppercase` labels, consistent input classes.
  </action>
  <verify>
Run: `cd apps/web/p2p-platform/frontend && npx tsc --noEmit 2>&1 | grep -i "projectTracker\|error" | head -20` — should show no TypeScript errors in the ProjectTracker file.
  </verify>
  <done>Expanded row shows reason, commit_ref, dependencies, impact_analysis fields with editable inputs. All 4 new fields are saved via the existing PUT endpoint. UI uses consistent styling with Lucide icons.</done>
</task>

</tasks>

<verification>
1. Backend model has 4 new columns: `python -c "from project_tracker import ProjectCase; print([c.name for c in ProjectCase.__table__.columns])"`
2. API returns new fields: `curl -s http://localhost:8080/api/admin/project-cases/?page_size=1 | python -m json.tool | grep -E "reason|commit_ref|dependencies|impact_analysis"`
3. Seeder runs clean: `cd apps/web/p2p-platform/backend && python scripts/seed_project_cases.py --build "iOS-Customer:1113" 2>&1`
4. Frontend compiles: `cd apps/web/p2p-platform/frontend && npx tsc --noEmit`
5. Expanded row in UI shows all new fields when clicking chevron on any case row
</verification>

<success_criteria>
- ProjectCase model has reason, commit_ref, dependencies, impact_analysis columns
- Seeder uses -qq flag and accepts --build / --reason CLI args
- React UI expanded row displays and edits all 4 new rich fields
- No TypeScript compilation errors
- API GET and PUT handle all new fields
</success_criteria>

<output>
After completion, create `.planning/quick/107-rebuild-project-tracker-with-rich-case-d/107-SUMMARY.md`
</output>
