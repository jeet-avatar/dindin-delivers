---
phase: quick-301
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - "src/pages/Reports/ReportingPage.tsx"
  - "src/pages/Reports/FollowUpsTab.tsx"
  - "dist/routes/followUps.js"
  - "dist/app.js"
autonomous: false
requirements:
  - FU-301-01
  - FU-301-02
  - FU-301-03
  - FU-301-04

must_haves:
  truths:
    - "User opens https://brandmonkz.com/reports and sees two tabs: 'Campaign Reports' (default, existing master-detail) and 'Follow-Ups' (new)"
    - "Switching to 'Follow-Ups' tab renders a table of up to 50 contacts ranked by score = (suspectedForwards*100 + uniqueOpens*10 + uniqueClicks*20)"
    - "Unsubscribed contacts (email_unsubscribes.email match), hard-bounced contacts, and scanner-pattern contacts (totalClicks>=3 AND uniqueOpens=1 AND uniqueIPs<=2) are EXCLUDED from the table"
    - "Each row shows: Company (companies.name via contacts.companyId, or '—'), Contact (firstName lastName / email), Score, Forwards, Opens, Clicks, Source Campaign, [Follow Up] button"
    - "Clicking [Follow Up] on row stores sessionStorage['followUpCampaign'] with shape {isFollowUp:true, originalCampaignId, originalName, originalSubject, recipients:[{contactId, name, email, company}]} (single recipient) and navigates to /campaigns?followup=true"
    - "CampaignWizard auto-opens with the single contact pre-loaded (exact same code path as existing CampaignDetail.tsx:63-78 button)"
    - "Sidebar, CampaignWizard, CampaignDetail, CampaignList, CampaignReportWidget, auth middleware, and email send pipeline are byte-identical to before this change"
  artifacts:
    - path: "src/pages/Reports/FollowUpsTab.tsx"
      provides: "Follow-Ups tab body — fetches /api/follow-ups/top, renders table, fires Follow Up handler"
      min_lines: 80
    - path: "src/pages/Reports/ReportingPage.tsx"
      provides: "Reports page wrapped in 2-tab switcher (Campaign Reports default, Follow-Ups new)"
      contains: "useState"
    - path: "dist/routes/followUps.js"
      provides: "Compiled Express router exposing GET /api/follow-ups/top with auth middleware and Prisma query joining email_logs + contacts + companies + email_unsubscribes"
      min_lines: 60
    - path: "dist/app.js"
      provides: "Backend router mount: app.use('/api/follow-ups', followUpsRouter)"
      contains: "follow-ups"
  key_links:
    - from: "src/pages/Reports/ReportingPage.tsx"
      to: "src/pages/Reports/FollowUpsTab.tsx"
      via: "tab switcher renders <FollowUpsTab /> when activeTab==='followups'"
      pattern: "FollowUpsTab"
    - from: "src/pages/Reports/FollowUpsTab.tsx"
      to: "/api/follow-ups/top"
      via: "fetch with Authorization: Bearer ${token} (same pattern as useReportsData.ts)"
      pattern: "/api/follow-ups/top"
    - from: "src/pages/Reports/FollowUpsTab.tsx (handleFollowUp)"
      to: "sessionStorage['followUpCampaign']"
      via: "JSON.stringify({isFollowUp:true, ..., recipients:[singleRecipient]}) then navigate('/campaigns?followup=true')"
      pattern: "followUpCampaign"
    - from: "dist/routes/followUps.js"
      to: "Prisma client (email_logs, contacts, companies, email_unsubscribes)"
      via: "raw SQL or Prisma query — read-only, no new tables"
      pattern: "email_logs|emailLog"
---

<objective>
Add a "Follow-Ups" tab to the existing BrandMonkz `/reports` page that surfaces the top ~50 most-engaged contacts from `email_logs` and lets the user fire a single-contact follow-up campaign through the existing CampaignWizard handoff.

**Purpose:** Promote the ad-hoc Apr 26 retargeting analysis into a self-serve, persistent view inside the Reports surface, without touching the larger Phase-N follow-up architecture (drafts/brandmonkz-follow-up-reports/PLAN-DRAFT.md). This is a minimal-scope, ship-today shim — no new DB tables, no LLM, no video, no nightly cron, no schema changes.

**Output:**
- One new backend route `GET /api/follow-ups/top` (read-only, joins existing tables)
- One new frontend tab component `FollowUpsTab.tsx`
- One frontend modification: `ReportingPage.tsx` wrapped in 2-tab switcher
- Frontend deployed via `bash deploy-frontend.sh`
- Live verified at https://brandmonkz.com/reports
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/doordash-p2p/CLAUDE.md
@/Users/jeet/doordash-p2p/.planning/STATE.md
@/Users/jeet/doordash-p2p/.agents/skills/ticketed-task/SKILL.md
@/Users/jeet/doordash-p2p/.planning/drafts/brandmonkz-follow-up-reports/PLAN-DRAFT.md
</context>

<defensive_scope>
**Files / surfaces this plan MUST NOT modify** (touching any of these = scope creep, abort and ask):

| Surface | File / location | Why off-limits |
|---|---|---|
| Sidebar nav | `~/Documents/Max 8/CRM Frontend/crm-app/src/components/Sidebar.tsx` | User explicitly said: no sidebar change |
| CampaignWizard | `~/Documents/Max 8/CRM Frontend/crm-app/src/components/CampaignWizard.tsx` | Reuse sessionStorage handoff at lines 231-261 byte-identical |
| CampaignDetail | `~/Documents/Max 8/CRM Frontend/crm-app/src/pages/Reports/CampaignDetail.tsx` | Existing follow-up button at 63-78 stays intact; we copy its shape, not replace it |
| CampaignList | `~/Documents/Max 8/CRM Frontend/crm-app/src/pages/Reports/CampaignList.tsx` | Lives only inside the "Campaign Reports" tab; tab switcher wraps but does not modify |
| CampaignReportWidget | `~/Documents/Max 8/CRM Frontend/crm-app/src/pages/Reports/CampaignReportWidget.tsx` | Same as CampaignList |
| CampaignsPage / `?followup=true` | `~/Documents/Max 8/CRM Frontend/crm-app/src/pages/Campaigns/CampaignsPage.tsx` | Reuse query-param trigger at lines 66-68 byte-identical |
| Auth middleware | `/var/www/crm-backend/dist/middleware/*` | Mount router with same auth pattern as existing routes; do not alter middleware |
| Email send pipeline | `/var/www/crm-backend/dist/routes/campaigns.js` | This plan is READ-ONLY backend — no send code touched |
| `email_unsubscribes` table | RDS | Read-only join only; no INSERT/UPDATE/DELETE |
| Any other backend route file | `/var/www/crm-backend/dist/routes/*.js` (other than the new `followUps.js` + the one-line mount in `app.js`) | Out of scope |
| Files with uncommitted local edits in CRM Frontend | `src/pages/Campaigns/CampaignAnalytics.tsx`, `src/pages/DashboardPage.tsx` | User has WIP — DO NOT touch |

**File-ownership claim:** This plan owns exactly 4 files (2 frontend, 2 backend including the one-line app.js mount). Any other file edit aborts the task.
</defensive_scope>

<environment_facts>
**Cross-repo execution context** (re-stated for the executor):

- **Planning artifacts:** dindin (`/Users/jeet/doordash-p2p/.planning/quick/301-...`)
- **Frontend code:** `~/Documents/Max 8/CRM Frontend/crm-app/` — has its own git, no remote, latest commit `a9e7199`. Vite + TS + React. Deploy via `bash deploy-frontend.sh` (target IP `100.24.213.224`, APP_DIR `/var/www/brandmonkz`).
- **Backend code:** `/var/www/crm-backend` on EC2 `100.24.213.224`. NO local git. SSH key `~/.ssh/brandmonkz-crm.pem`, user `ec2-user`. Backend dist files edited directly on box (compiled JS) and `pm2 restart crm-backend` after.
- **Security group:** `sg-03f88e30ec99c3b26` is locked. Open just before SSH, revoke immediately after. Use a single timeboxed window per task.
- **DB:** Prisma + PostgreSQL on shared RDS (already in use by the running backend — do NOT spin up local DB).

**Verified frontend facts** (from planning context, source: read of `~/Documents/Max 8/CRM Frontend/crm-app/`):
- `[VERIFIED src/App.tsx:152]` `<Route path="reports" element={<ReportingPage />} />`
- `[VERIFIED src/pages/Reports/ReportingPage.tsx]` 63-line master-detail layout, NO existing tabs
- `[VERIFIED src/pages/Reports/CampaignDetail.tsx:63-78]` `handleFollowUp` shape — copy this verbatim with single-element recipients array
- `[VERIFIED src/components/CampaignWizard.tsx:231-261]` reads sessionStorage, removes it — REUSE untouched
- `[VERIFIED src/pages/Campaigns/CampaignsPage.tsx:66-68]` `?followup=true` auto-opens wizard — REUSE untouched

**Verified DB schema** (from Apr 26 read-only psql sweep, see PLAN-DRAFT.md §2.6):
- `email_logs` columns: `firstOpenedAt`, `firstClickedAt`, `totalOpens`, `uniqueOpens`, `uniqueClicks`, `wasForwarded`, `suspectedForwards`, `uniqueIPs`, `engagementScore`, `bouncedAt`, `errorMessage`, `campaignId`, `contactId`, `status` (PENDING/SENT/FAILED/etc.)
- `contacts`: `id`, `firstName`, `lastName`, `email`, `companyId` (FK), NO `company` text column
- `companies`: `id`, `name`
- `email_unsubscribes`: joins on `email` (NOT `emailAddress`)
- `campaigns`: `id`, `name`, `subject`, `status` enum (DRAFT|SCHEDULED|SENDING|SENT|PAUSED|CANCELLED)

**Anti-hallucination rule** (mandatory per `/Users/jeet/doordash-p2p/CLAUDE.md`): Every claim about backend code MUST be verified by `grep`/`cat` BEFORE writing the new route. The backend file structure (auth middleware path, app.js mount pattern, Prisma client import path, conventional route file shape) is `[UNVERIFIED]` and must be confirmed in Task 1's verification sweep before any code is written.

**CR Ticket** (per `.agents/skills/ticketed-task/SKILL.md`): Create CR with `change_type=code, priority=Medium` BEFORE Task 1 starts. Include `[CR-XXXX]` in commit messages. Transition: Draft → Submitted → In Progress → Production → Verified.
</environment_facts>

<tasks>

<task type="auto">
  <name>Task 1: Backend — verify file layout, build /api/follow-ups/top route, smoke test, mount</name>
  <files>
    /var/www/crm-backend/dist/routes/followUps.js
    /var/www/crm-backend/dist/app.js
  </files>
  <action>
**Step 0 — Create CR ticket** (per ticketed-task skill):
```bash
curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/?secret_key=$ADMIN_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"BrandMonkz Reports → Follow-Ups tab (quick-301)","description":"Add new GET /api/follow-ups/top backend route + Follow-Ups tab in /reports page. Read-only join over email_logs+contacts+companies+email_unsubscribes. No new tables. No changes to send pipeline.","change_type":"code","priority":"Medium","requested_by":"support@dollor.ai"}'
```
Extract `cr_id`, then submit:
```bash
curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/$CR_ID/submit?secret_key=$ADMIN_SECRET_KEY"
```
If `ADMIN_SECRET_KEY` not in env, log warning and continue (per skill).

**Step 1 — Open SG for SSH** (timeboxed verification window):
```bash
MY_IP=$(curl -s https://checkip.amazonaws.com)/32
aws ec2 authorize-security-group-ingress --group-id sg-03f88e30ec99c3b26 --protocol tcp --port 22 --cidr $MY_IP
```

**Step 2 — Read-only sweep (anti-hallucination MANDATORY before writing code).** SSH in and run these commands. Capture the EXACT outputs into the task's working notes BEFORE writing followUps.js:
```bash
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 << 'EOF'
cd /var/www/crm-backend

# Confirm dist layout
ls dist/routes/ | head -40
ls dist/middleware/ 2>/dev/null

# Find auth middleware pattern — what does an existing protected route look like?
grep -n "require.*authenticateToken\|require.*authMiddleware\|require.*auth" dist/routes/contacts.js dist/routes/campaigns.js | head -20

# Find Prisma import pattern
grep -n "PrismaClient\|require.*prisma\|require.*db" dist/routes/contacts.js | head -5

# Find router mount pattern in app.js
grep -n "app.use.*api" dist/app.js | head -30

# Confirm email_logs prisma model name (camelCase vs snake_case)
grep -n "emailLog\|email_log" dist/routes/campaigns.js | head -10

# Confirm email_unsubscribes model name
grep -n "emailUnsubscribe\|email_unsubscribe" dist/routes/*.js 2>/dev/null | head -5

# Confirm contact + company model names + relationships
grep -n "prisma.contact\|prisma.company" dist/routes/contacts.js | head -10
EOF
```

Record findings inline in the task notes as `[VERIFIED <command output>]` tags. If any expected file is missing or any pattern differs from assumption, STOP and surface to user — do not invent.

**Step 3 — Write `dist/routes/followUps.js` LOCALLY** (in `/tmp/followUps.js`) using the verified patterns from Step 2. Use Prisma `$queryRaw` (preferred) or whichever pattern Step 2 confirms is canonical. The route MUST:

- Match the auth middleware pattern from existing routes (e.g. if `contacts.js` does `router.use(authenticateToken)`, do the same)
- Export an Express Router
- Implement `GET /top` (mounted at `/api/follow-ups/top` via app.js mount)
- Query shape (Prisma raw SQL — adjust column names / casing per Step 2 verification):
  ```sql
  SELECT
    el."contactId",
    el."campaignId",
    SUM(COALESCE(el."suspectedForwards", 0)) AS forwards,
    SUM(COALESCE(el."uniqueOpens", 0))       AS opens,
    SUM(COALESCE(el."uniqueClicks", 0))      AS clicks,
    SUM(COALESCE(el."totalClicks", 0))       AS total_clicks,
    MAX(COALESCE(el."uniqueIPs", 0))         AS max_unique_ips,
    (SUM(COALESCE(el."suspectedForwards",0)) * 100
     + SUM(COALESCE(el."uniqueOpens",0)) * 10
     + SUM(COALESCE(el."uniqueClicks",0)) * 20) AS score,
    c."firstName", c."lastName", c."email", c."companyId",
    co."name" AS "companyName",
    cmp."id" AS "sourceCampaignId", cmp."name" AS "sourceCampaignName", cmp."subject" AS "sourceCampaignSubject"
  FROM "email_logs" el
  JOIN "contacts" c ON c."id" = el."contactId"
  LEFT JOIN "companies" co ON co."id" = c."companyId"
  JOIN "campaigns" cmp ON cmp."id" = el."campaignId"
  WHERE el."contactId" IS NOT NULL
    AND el."status" <> 'FAILED'
    AND NOT EXISTS (SELECT 1 FROM "email_unsubscribes" eu WHERE eu."email" = c."email")
  GROUP BY el."contactId", el."campaignId", c."firstName", c."lastName", c."email", c."companyId", co."name", cmp."id", cmp."name", cmp."subject"
  HAVING NOT (
    SUM(COALESCE(el."totalClicks",0)) >= 3
    AND SUM(COALESCE(el."uniqueOpens",0)) = 1
    AND MAX(COALESCE(el."uniqueIPs",0)) <= 2
  )
  ORDER BY score DESC
  LIMIT 50;
  ```
  **NOTE:** Exact column casing must come from Step 2's grep output. If Prisma uses camelCase JS-side and snake_case in SQL, use raw SQL with the actual DB column names. If a column from the schema (e.g. `totalClicks`) doesn't exist in `email_logs`, derive it from `(uniqueClicks + extraClicks)` or whatever Step 2 confirms — do NOT invent columns.
- Returns JSON: `{rows: [{contactId, firstName, lastName, email, companyId, companyName, score, forwards, opens, clicks, sourceCampaignId, sourceCampaignName, sourceCampaignSubject}]}`
- Wraps query in try/catch and returns `{error: string}` with 500 on failure

**Step 4 — Modify `dist/app.js`** to add ONE line router mount:
```js
const followUpsRouter = require('./routes/followUps');
// ...
app.use('/api/follow-ups', followUpsRouter);
```
Place near the other `app.use('/api/...')` calls — exact placement follows pattern verified in Step 2. Use `sed` or surgical edit on EC2; back up app.js first to `/tmp/app.js.bak.301`.

**Step 5 — Deploy**:
```bash
scp -i ~/.ssh/brandmonkz-crm.pem /tmp/followUps.js ec2-user@100.24.213.224:/var/www/crm-backend/dist/routes/followUps.js
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 "cp /var/www/crm-backend/dist/app.js /tmp/app.js.bak.301 && <surgical edit to add mount line> && pm2 restart crm-backend"
```

**Step 6 — Smoke test**:
```bash
# Get a valid JWT first (use admin login or existing test user)
TOKEN="<grab from existing browser session via curl POST /api/auth/login>"
curl -s -H "Authorization: Bearer $TOKEN" https://brandmonkz.com/api/follow-ups/top | jq '.rows | length, .rows[0]'
```
Expected: `length` between 1 and 50, first row has all 13 fields, `score` is the highest, `email` does NOT match any row in `email_unsubscribes`.

Negative checks:
- `curl https://brandmonkz.com/api/follow-ups/top` (no auth) returns 401 — confirms middleware applied
- Pick an unsubscribed email from `email_unsubscribes` and confirm it does NOT appear in response

**Step 7 — Close SG**:
```bash
aws ec2 revoke-security-group-ingress --group-id sg-03f88e30ec99c3b26 --protocol tcp --port 22 --cidr $MY_IP
```

**STOP-FOR-REVIEW GATE:** Print the curl smoke-test output (rows count + first row sample + 401 unauth result) and wait for user "ok" before proceeding to Task 2. Per user request, do not auto-advance.
  </action>
  <verify>
1. `curl -s -H "Authorization: Bearer $TOKEN" https://brandmonkz.com/api/follow-ups/top | jq '.rows | length'` returns integer 1-50
2. `curl -s https://brandmonkz.com/api/follow-ups/top` (no auth) returns HTTP 401
3. `ssh ... "grep follow-ups /var/www/crm-backend/dist/app.js"` returns 1 line confirming mount
4. `ssh ... "ls -la /var/www/crm-backend/dist/routes/followUps.js"` shows file exists
5. `ssh ... "pm2 list | grep crm-backend"` shows STATUS=online (post-restart)
6. SG `sg-03f88e30ec99c3b26` has NO ingress rule for `:22` after task ends
7. Sample row from response has email that does NOT appear in `SELECT email FROM email_unsubscribes`
8. Sample row score is correctly computed: `score == suspectedForwards*100 + uniqueOpens*10 + uniqueClicks*20`
  </verify>
  <done>
- `dist/routes/followUps.js` exists on EC2 and exports a working Express router under `/api/follow-ups/top`
- `dist/app.js` mounts the router at `/api/follow-ups`
- Auth middleware enforced (401 without Bearer token)
- Unsubscribed contacts and scanner-pattern contacts are EXCLUDED from results
- Smoke-test curl output captured in task notes with `[VERIFIED]` tag
- SG closed; pm2 process online
- User has reviewed smoke-test output and approved before Task 2 starts
- CR-XXXX transitioned to "In Progress" (or "Production" if quick-task auto-promote)
  </done>
</task>

<task type="auto">
  <name>Task 2: Frontend — build FollowUpsTab.tsx + wrap ReportingPage in 2-tab switcher</name>
  <files>
    ~/Documents/Max 8/CRM Frontend/crm-app/src/pages/Reports/FollowUpsTab.tsx
    ~/Documents/Max 8/CRM Frontend/crm-app/src/pages/Reports/ReportingPage.tsx
  </files>
  <action>
**Pre-flight check:** Confirm in `~/Documents/Max 8/CRM Frontend/crm-app/`:
```bash
git status  # Confirm only CampaignAnalytics.tsx + DashboardPage.tsx are dirty (DO NOT TOUCH)
git log -1 --oneline  # Should be a9e7199
```
If anything else is dirty, stop and surface to user.

**Step 1 — Read the verified files** (do NOT modify these, just understand):
- `src/pages/Reports/ReportingPage.tsx` (63 lines — full master-detail layout)
- `src/pages/Reports/CampaignDetail.tsx` lines 63-78 — copy `handleFollowUp` shape
- `src/pages/Reports/useReportsData.ts` — copy auth-token + fetch pattern
- `src/pages/Reports/types.ts` — see if `EmailLog`/`Campaign` types are already exported (reuse if so)

**Step 2 — Create `src/pages/Reports/FollowUpsTab.tsx`.** Component contract:

```typescript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface FollowUpRow {
  contactId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  companyId: string | null;
  companyName: string | null;
  score: number;
  forwards: number;
  opens: number;
  clicks: number;
  sourceCampaignId: string;
  sourceCampaignName: string;
  sourceCampaignSubject: string;
}

export default function FollowUpsTab() {
  const [rows, setRows] = useState<FollowUpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');  // confirm key from useReportsData.ts pattern
    fetch('/api/follow-ups/top', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(d => { setRows(d.rows || []); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, []);

  const handleFollowUp = (row: FollowUpRow) => {
    // EXACT shape copied from CampaignDetail.tsx:63-78 — single-recipient version
    const payload = {
      isFollowUp: true,
      originalCampaignId: row.sourceCampaignId,
      originalName: row.sourceCampaignName,
      originalSubject: row.sourceCampaignSubject,
      recipients: [{
        contactId: row.contactId,
        name: [row.firstName, row.lastName].filter(Boolean).join(' ') || row.email,
        email: row.email,
        company: row.companyName || ''
      }]
    };
    sessionStorage.setItem('followUpCampaign', JSON.stringify(payload));
    navigate('/campaigns?followup=true');
  };

  if (loading) return <div className="p-6 text-gray-500">Loading top contacts…</div>;
  if (error)   return <div className="p-6 text-red-600">Error: {error}</div>;
  if (rows.length === 0) return <div className="p-6 text-gray-500">No eligible contacts. Once campaigns ship, top engagers will appear here.</div>;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Top {rows.length} contacts to follow up</h2>
        <p className="text-sm text-gray-500">
          Ranked by score = forwards×100 + opens×10 + clicks×20. Excludes unsubscribes, hard bounces, and scanner-pattern clicks.
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Company</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Contact</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Score</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Forwards</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Opens</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Clicks</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Source Campaign</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map(r => (
              <tr key={`${r.contactId}-${r.sourceCampaignId}`} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-900">{r.companyName || '—'}</td>
                <td className="px-4 py-3">
                  <div className="text-gray-900">{[r.firstName, r.lastName].filter(Boolean).join(' ') || '—'}</div>
                  <div className="text-xs text-gray-500">{r.email}</div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-900">{r.score}</td>
                <td className="px-4 py-3 text-right text-gray-700">{r.forwards}</td>
                <td className="px-4 py-3 text-right text-gray-700">{r.opens}</td>
                <td className="px-4 py-3 text-right text-gray-700">{r.clicks}</td>
                <td className="px-4 py-3 text-gray-700 truncate max-w-xs" title={r.sourceCampaignName}>{r.sourceCampaignName}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleFollowUp(r)}
                    className="rounded-md bg-gradient-to-r from-orange-500 to-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:from-orange-600 hover:to-orange-700"
                  >
                    Follow Up
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

Adjust:
- `localStorage.getItem('token')` — replace with whatever key `useReportsData.ts` uses
- Imports / types — reuse from `types.ts` if `EmailLog`-shape types are already exported
- Tailwind class palette — match the existing brand orange (per Apr 15 memory, no `from-[#FF6B35]` arbitrary values; use named classes only)

**Step 3 — Modify `src/pages/Reports/ReportingPage.tsx`** to wrap in tab switcher. The existing 63-line layout becomes the body of the "Campaign Reports" tab (default). Add tab nav at top:

```typescript
import { useState } from 'react';
import FollowUpsTab from './FollowUpsTab';
// ...existing imports

type Tab = 'campaigns' | 'followups';

export default function ReportingPage() {
  const [activeTab, setActiveTab] = useState<Tab>('campaigns');
  // ...existing hooks (useReportsData etc.) — leave untouched

  return (
    <div className="flex h-full flex-col">
      {/* Tab nav */}
      <nav className="border-b border-gray-200 bg-white px-6">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`-mb-px border-b-2 py-3 text-sm font-medium ${
              activeTab === 'campaigns'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Campaign Reports
          </button>
          <button
            onClick={() => setActiveTab('followups')}
            className={`-mb-px border-b-2 py-3 text-sm font-medium ${
              activeTab === 'followups'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Follow-Ups
          </button>
        </div>
      </nav>

      {/* Tab body */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'campaigns' ? (
          /* EXISTING master-detail layout — copy verbatim from current ReportingPage.tsx body */
          <ExistingMasterDetailBody />
        ) : (
          <FollowUpsTab />
        )}
      </div>
    </div>
  );
}
```

The existing master-detail JSX moves into the `'campaigns'` branch verbatim — extract to `<ExistingMasterDetailBody />` inline component or keep inline. Default tab = `'campaigns'` (preserves existing UX).

**Step 4 — Build & local sanity check**:
```bash
cd "~/Documents/Max 8/CRM Frontend/crm-app"
npm run build  # Vite build — must succeed with zero TS errors
```
If build fails on type errors, fix BEFORE proceeding (do not deploy broken bundle).

**Step 5 — Commit locally** (frontend repo has its own git):
```bash
cd "~/Documents/Max 8/CRM Frontend/crm-app"
git add src/pages/Reports/FollowUpsTab.tsx src/pages/Reports/ReportingPage.tsx
git commit -m "feat(quick-301): [CR-XXXX] add Follow-Ups tab to Reports page

- New FollowUpsTab.tsx fetches /api/follow-ups/top and renders top-50 contacts
- ReportingPage.tsx wrapped in 2-tab switcher (Campaign Reports default + Follow-Ups)
- [Follow Up] button reuses existing sessionStorage + /campaigns?followup=true handoff
- No changes to Sidebar, CampaignWizard, CampaignDetail, CampaignList, send pipeline"
```
DO NOT touch the dirty `CampaignAnalytics.tsx` / `DashboardPage.tsx` files.

**STOP-FOR-REVIEW GATE:** Print `git log -1 --stat`, screenshot or describe local-dev `npm run dev` rendering both tabs, and wait for user "ok" before Task 3 (deploy). Per user request, do not auto-advance.
  </action>
  <verify>
1. `npm run build` exits 0 with no TS errors
2. `git diff --stat HEAD~1` shows exactly 2 files changed: `FollowUpsTab.tsx` (added), `ReportingPage.tsx` (modified)
3. `git status` shows `CampaignAnalytics.tsx` and `DashboardPage.tsx` STILL DIRTY (untouched by us)
4. `wc -l src/pages/Reports/FollowUpsTab.tsx` ≥ 80 lines
5. `grep -c "FollowUpsTab" src/pages/Reports/ReportingPage.tsx` ≥ 2 (import + render)
6. `grep "activeTab" src/pages/Reports/ReportingPage.tsx` shows useState hook
7. `grep "followUpCampaign" src/pages/Reports/FollowUpsTab.tsx` confirms sessionStorage handoff present
8. Local dev (`npm run dev`) — visit `/reports`, confirm:
   - Both tabs visible, "Campaign Reports" active by default
   - Switching to "Follow-Ups" fetches `/api/follow-ups/top` (devtools network tab)
   - Table renders rows
   - Clicking [Follow Up] on a row populates `sessionStorage['followUpCampaign']` and navigates to `/campaigns?followup=true`
   - CampaignWizard opens auto-populated with that one contact
9. NO modifications to `Sidebar.tsx`, `CampaignWizard.tsx`, `CampaignDetail.tsx`, `CampaignList.tsx`, `CampaignReportWidget.tsx`, `CampaignsPage.tsx`
  </verify>
  <done>
- `FollowUpsTab.tsx` exists, builds clean, renders the top-50 table with all 8 columns
- `ReportingPage.tsx` wraps content in 2-tab switcher; "Campaign Reports" is default; existing master-detail layout is byte-equivalent inside the campaigns tab
- [Follow Up] button stores correct sessionStorage shape and navigates to `/campaigns?followup=true`
- Local commit created with [CR-XXXX] in message; only the 2 owned files changed
- User has reviewed local-dev render of both tabs + Follow Up flow end-to-end and approved before Task 3
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Deploy frontend + live verify on https://brandmonkz.com/reports</name>
  <files>
    /var/www/brandmonkz/index.html (deployed bundle, no source edits — produced by deploy-frontend.sh)
  </files>
  <action>
**Step 1 — Pre-deploy** (Claude does this autonomously):
```bash
cd "~/Documents/Max 8/CRM Frontend/crm-app"
npm run build  # Re-verify build still clean
bash deploy-frontend.sh  # Memory: IP 100.24.213.224, APP_DIR /var/www/brandmonkz
```
Confirm script output ends with success message + new bundle hash visible in `/var/www/brandmonkz/index.html`.

**Step 2 — Smoke test from CLI** (Claude does this autonomously):
```bash
# Hard-reload bundle
curl -sI https://brandmonkz.com/ | grep -i etag
# Confirm bundle JS ref includes new hash
curl -s https://brandmonkz.com/ | grep -oE 'index-[A-Za-z0-9_-]+\.js'
```

**Step 3 — Hand to user for browser verification.** Print the smoke-test output, then surface the human-verify checklist (see <what-built> + <how-to-verify> below) and STOP — do not auto-advance.

**Step 4 — Final transition** (Claude does this autonomously AFTER user approves):
```bash
curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/$CR_ID/transition?secret_key=$ADMIN_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"new_status":"Production","metadata":{"deploy_method":"deploy-frontend.sh","bundle":"<new hash>"},"actor_email":"system@dollor.ai","role":"system"}'

curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/$CR_ID/transition?secret_key=$ADMIN_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"new_status":"Verified","actor_email":"system@dollor.ai","role":"system"}'
```
  </action>
  <what-built>
Complete Follow-Ups tab feature:
- Backend route `GET /api/follow-ups/top` live on `/var/www/crm-backend` (Task 1)
- Frontend `FollowUpsTab.tsx` + `ReportingPage.tsx` 2-tab switcher built (Task 2)
- This task DEPLOYS the frontend bundle to production via `bash deploy-frontend.sh` and verifies live behavior in the browser
  </what-built>
  <how-to-verify>
**User browser verification (this is the human gate):**

Open https://brandmonkz.com/reports in an incognito/private window (avoids stale cache). Log in. Verify ALL of:

1. [ ] Two tabs visible at top of Reports page: "Campaign Reports" (active/orange) + "Follow-Ups"
2. [ ] "Campaign Reports" tab content is BYTE-IDENTICAL to before this change (existing master-detail layout — campaign list left, detail right)
3. [ ] Click "Follow-Ups" tab — top-50 contacts table renders
4. [ ] Each row shows: Company, Contact (name + email), Score, Forwards, Opens, Clicks, Source Campaign, [Follow Up] button
5. [ ] Verify NO unsubscribed email is in the list (cross-check against any known unsubscribe)
6. [ ] Score values look reasonable (highest at top, formula = forwards*100 + opens*10 + clicks*20)
7. [ ] Click [Follow Up] on the first row — page navigates to `/campaigns` and the CampaignWizard auto-opens with ONE contact pre-loaded (that row's contact)
8. [ ] CampaignWizard's recipient list shows exactly that one contact (firstName lastName, email, company)
9. [ ] Sidebar nav is unchanged (Reports nav entry still appears once, no new sub-items)
10. [ ] Open `/reports` again, click into a campaign on "Campaign Reports" tab → existing CampaignDetail "Send Follow-up" button STILL works (sends ALL recipients, not just one) — confirms we didn't break the existing path
  </how-to-verify>
  <verify>
1. `npm run build` succeeds with new bundle hash
2. `bash deploy-frontend.sh` exits 0 with success message
3. `curl -s https://brandmonkz.com/ | grep -oE 'index-[A-Za-z0-9_-]+\.js'` shows NEW bundle hash (not the pre-deploy one)
4. `curl -sI https://brandmonkz.com/reports` returns HTTP 200
5. User reports all 10 browser verification checkboxes pass
6. CR-XXXX transitions to Production then Verified
  </verify>
  <done>
- Frontend bundle deployed to `/var/www/brandmonkz/` with new hash visible in served HTML
- All 10 user browser-verification checkboxes pass
- CR-XXXX status = Verified
- No regressions reported in existing Campaign Reports tab or any other CRM surface
  </done>
  <resume-signal>
Reply "approved" once all 10 verification checkboxes pass in the live browser, OR describe any issue (e.g. "Follow Up button on row 3 broke", "tab switcher layout off on mobile", "401 on /api/follow-ups/top in browser") and Claude will diagnose + fix.
  </resume-signal>
</task>

</tasks>

<verification>
**Phase-level proof checklist** (all must hold AFTER Task 3 user-approved):

- [ ] `curl -s -H "Authorization: Bearer $TOKEN" https://brandmonkz.com/api/follow-ups/top | jq '.rows | length'` returns 1-50
- [ ] `curl -sI https://brandmonkz.com/reports` returns 200 (route still works)
- [ ] In browser at `https://brandmonkz.com/reports`: 2 tabs render, switching works, table populates, [Follow Up] navigates correctly
- [ ] `git log -1 --oneline` in `~/Documents/Max 8/CRM Frontend/crm-app/` shows the quick-301 commit
- [ ] `ssh ... "ls /var/www/crm-backend/dist/routes/followUps.js"` exists
- [ ] `ssh ... "grep follow-ups /var/www/crm-backend/dist/app.js"` returns 1 line
- [ ] CR-XXXX status = Verified (or Production if Verified gate not yet open)
- [ ] SG `sg-03f88e30ec99c3b26` has NO open `:22` ingress rule
- [ ] Sidebar (`Sidebar.tsx`) and CampaignWizard (`CampaignWizard.tsx`) and CampaignDetail (`CampaignDetail.tsx`) and CampaignList (`CampaignList.tsx`) and CampaignReportWidget (`CampaignReportWidget.tsx`) and CampaignsPage (`CampaignsPage.tsx`) — unchanged (`git diff HEAD~1 -- <file>` shows no diff for each)
- [ ] `CampaignAnalytics.tsx` and `DashboardPage.tsx` still dirty (user's WIP preserved untouched)

**Anti-hallucination self-check**:
- Every backend file:line claim in the new `followUps.js` is grounded in Step 2's verification grep output, not an assumption.
- Every frontend file:line claim is grounded in the verified facts from `<environment_facts>` (App.tsx:152, CampaignDetail.tsx:63-78, CampaignWizard.tsx:231-261, CampaignsPage.tsx:66-68).
- Column casing in the SQL query was confirmed against the live RDS schema in Step 2 — NOT inferred from PLAN-DRAFT.md prose.
</verification>

<success_criteria>
**Measurable end state:**

1. https://brandmonkz.com/reports renders 2 tabs; "Campaign Reports" default + "Follow-Ups" new
2. "Follow-Ups" tab fetches `/api/follow-ups/top`, displays a table of up to 50 contacts ranked by `score = suspectedForwards*100 + uniqueOpens*10 + uniqueClicks*20`, with unsubscribes / hard-bounces / scanner-pattern excluded
3. [Follow Up] button on any row stores `sessionStorage['followUpCampaign']` with shape `{isFollowUp:true, originalCampaignId, originalName, originalSubject, recipients:[ONE contact]}` and navigates to `/campaigns?followup=true`, where the CampaignWizard auto-opens with that one contact pre-loaded
4. Existing CampaignDetail "Send Follow-up" button (sends all recipients) still works — proven in user verification step 10
5. Sidebar nav, CampaignWizard, CampaignDetail, CampaignList, CampaignReportWidget, CampaignsPage, auth middleware, email send pipeline — all byte-identical to pre-change state
6. CR-XXXX created, transitioned through full lifecycle, marked Verified
7. Each step (Task 1, Task 2, Task 3) had its own user-review gate before the next started — no auto-advance
</success_criteria>

<output>
After completion, create `.planning/quick/301-brandmonkz-reports-add-follow-ups-tab-re/301-SUMMARY.md` with:

- Backend: route SQL (final, with verified column casing), curl smoke-test output, file path on EC2, commit-equivalent (no git on backend, so capture `md5sum dist/routes/followUps.js` + `pm2 jlist` snapshot)
- Frontend: commit hash in `~/Documents/Max 8/CRM Frontend/crm-app`, `git diff --stat`, deployed bundle hash, screenshot or text-trace of live behavior
- CR ticket ID + final status
- 10/10 user-verification checkboxes confirmed by user
- File ownership receipt: list of files actually modified vs declared in `files_modified` — must match exactly
- Any deviation from plan (e.g. Step 2 verification surfaced a different auth pattern, schema column actually named differently) flagged with `[DEVIATION]` and reason
</output>
