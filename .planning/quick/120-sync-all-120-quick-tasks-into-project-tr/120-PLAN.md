---
phase: quick-120
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - scripts/sync-quick-tasks-to-tracker.py
  - apps/web/p2p-platform/backend/project_tracker.py
autonomous: true
requirements: [TRACK-01]
---

<objective>
Create a script that reads all quick tasks from STATE.md, maps each to a ProjectCase with
correct department, status=Released/Verified, resolution details, commit hash, and date.
Run it against production to seed the cases. Ensure full traceability.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<tasks>

<task type="auto">
  <name>Task 1: Add quick task seeder endpoint to project tracker</name>
  <files>apps/web/p2p-platform/backend/project_tracker.py</files>
  <action>
Add a new endpoint POST /api/admin/project-cases/seed-quick-tasks that:

1. Accepts a JSON array of quick task objects:
   ```json
   [{
     "quick_num": 55,
     "description": "Fix broken links in Restaurant iOS app",
     "date": "2026-03-02",
     "commit": "1682b609",
     "category": "bug-fix",
     "platform": "ios",
     "department_code": "ENG",
     "priority": "High"
   }]
   ```

2. For each quick task:
   - Creates a ProjectCase with:
     - case_id: next available TC-XXXX
     - name: "QT-{quick_num}: {description}"
     - full_path: "quick-tasks/QT-{quick_num}"
     - category: from input (bug-fix, feature, deploy, audit, security, etc.)
     - test_type: "operational"
     - status: "Released"
     - priority: from input
     - platform: from input
     - commit_ref: commit hash
     - reason: "Quick task {quick_num} — {description}"
     - version_introduced: "v1.5"
     - release_notes: "Resolved on {date} via quick task {quick_num}"
     - department_id: looked up from department_code
     - last_activity: "Completed {date}"
   - Skips if full_path already exists (idempotent)

3. Returns count of created vs skipped cases.

Use require_admin auth.
  </action>
  <verify>grep -n "seed-quick-tasks" project_tracker.py confirms endpoint exists</verify>
  <done>Endpoint ready to accept quick task data and create project cases</done>
</task>

<task type="auto">
  <name>Task 2: Create sync script with all 120 quick tasks mapped</name>
  <files>scripts/sync-quick-tasks-to-tracker.py</files>
  <action>
Create a Python script that:

1. Parses the quick tasks table from STATE.md (lines with | # | Description | Date | Commit | Directory |)
2. Maps each quick task to a category and department:
   - Security fixes → category=security, dept=SEC
   - iOS fixes → platform=ios, dept=ENG
   - Android fixes → platform=android, dept=ENG
   - Backend fixes → platform=backend, dept=ENG
   - Deploy tasks → category=deploy, dept=OPS
   - UI audit → category=audit, dept=QA
   - Frontend/admin → platform=frontend, dept=ENG
   - Project tracker → category=feature, dept=PMO
   - Documentation → category=docs, dept=PMO

3. Auto-classifies based on description keywords:
   - "fix" / "bug" / "hotfix" → category=bug-fix, priority=High
   - "audit" / "verify" / "check" → category=audit, priority=Medium
   - "deploy" / "rebuild" / "distribute" → category=deploy, priority=Medium
   - "security" / "VAPT" / "SSL" → category=security, priority=Critical
   - "feature" / "add" / "implement" / "build" → category=feature, priority=Medium
   - "research" / "gap analysis" → category=research, priority=Low

4. Auto-classifies platform from description:
   - "iOS" / "TestFlight" / "xcarchive" → ios
   - "Android" / "Firebase" / "APK" / "Play Store" → android
   - "backend" / "API" / "endpoint" / "deploy" → backend
   - "admin" / "frontend" / "portal" → frontend
   - Multiple platforms → "cross-platform"

5. Calls POST /api/admin/project-cases/seed-quick-tasks with the mapped data
6. Accepts --env arg (staging/production, default production)
7. Prints summary: X created, Y skipped (already exist)

The script should handle the admin login automatically (POST /api/admin/login).
  </action>
  <verify>python scripts/sync-quick-tasks-to-tracker.py --env staging runs without error</verify>
  <done>Script syncs all quick tasks to project tracker</done>
</task>

<task type="auto">
  <name>Task 3: Deploy backend, run sync on staging + production</name>
  <files></files>
  <action>
1. Push code to main
2. Deploy staging: gh workflow run deploy-staging.yml --ref main
3. Wait for deploy, then run: python scripts/sync-quick-tasks-to-tracker.py --env staging
4. Deploy production: gh workflow run deploy-dollar-ai.yml
5. Wait for deploy, then run: python scripts/sync-quick-tasks-to-tracker.py --env production
6. Verify: curl production /api/admin/project-cases/?search=QT- to confirm cases exist
  </action>
  <verify>Production project tracker has QT- prefixed cases for all quick tasks</verify>
  <done>All quick tasks synced to project tracker on both staging and production</done>
</task>

</tasks>

<success_criteria>
- All ~120 quick tasks exist as Released cases in the project tracker
- Each case has correct department, platform, category, commit hash, date
- Cases are searchable by "QT-" prefix
- Sync is idempotent (running again creates 0 duplicates)
</success_criteria>

<output>
After completion, create `.planning/quick/120-sync-all-120-quick-tasks-into-project-tr/120-SUMMARY.md`
</output>
