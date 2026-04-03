---
phase: quick
plan: 266
type: execute
wave: 1
depends_on: []
files_modified:
  - /var/www/crm-backend/dist/routes/campaigns.js
  - /Users/jeet/Documents/CRM Frontend/crm-app/src/pages/Campaigns/CampaignsPage.tsx
autonomous: true
requirements: [Q-266]
must_haves:
  truths:
    - "Companies Reached stat shows the real sum of campaign company counts, not a fake multiplier"
    - "Campaign rows show real creator name (Peter or Rajesh) instead of 'Current User'"
  artifacts:
    - path: "/Users/jeet/Documents/CRM Frontend/crm-app/src/pages/Campaigns/CampaignsPage.tsx"
      provides: "Fixed totalCompanies formula + real createdBy mapping"
    - path: "/var/www/crm-backend/dist/routes/campaigns.js"
      provides: "GET /api/campaigns includes user firstName/lastName in response"
  key_links:
    - from: "CampaignsPage.tsx mapping (~line 78)"
      to: "c.user.firstName + c.user.lastName"
      via: "API response after backend change"
      pattern: "user.*firstName"
    - from: "totalCompanies (line 140)"
      to: "campaigns.reduce"
      via: "c.companiesCount summed from real _count.companies"
      pattern: "reduce.*companiesCount"
---

<objective>
Fix two hardcoded/fake values on the BrandMonkz campaigns page:
1. "Companies Reached" stat uses a fake formula (`campaigns.length * 1.5`) instead of summing real company counts
2. Campaign rows show "Current User" instead of the actual creator's name

Purpose: Stats and attribution must reflect real data for CRM credibility.
Output: Backend returns user info per campaign, frontend maps it correctly and sums real company counts.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

BrandMonkz CRM:
- Backend TypeScript at `/var/www/crm-backend/` on EC2 `ec2-user@100.24.213.224`
- SSH key: `~/.ssh/brandmonkz-crm.pem`
- Backend managed by pm2 process `crm-backend`
- Frontend source: `/Users/jeet/Documents/CRM Frontend/crm-app/`
- Frontend deployed to `/var/www/crm-frontend/` on same EC2 via scp
- Deploy order: backend first, then frontend
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add user include to backend GET /api/campaigns</name>
  <files>/var/www/crm-backend/src/routes/campaigns.ts (read + patch on EC2), /var/www/crm-backend/dist/routes/campaigns.js (deployed output)</files>
  <action>
SSH into EC2 and patch the campaigns route to include user data:

```bash
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224
```

Read the current GET handler:
```bash
sed -n '1,80p' /var/www/crm-backend/src/routes/campaigns.ts
```

In the Prisma `findMany` call's `include` block, add the user relation. The existing include likely has `emailLogs`, `companies`, `_count`. Add:
```ts
user: {
  select: { firstName: true, lastName: true }
}
```

After editing the TypeScript source, transpile just this file:
```bash
cd /var/www/crm-backend
npx tsc --noEmitOnError false --skipLibCheck --esModuleInterop --module commonjs --target es2017 --outDir /tmp/compiled/ src/routes/campaigns.ts
cp /tmp/compiled/campaigns.js dist/routes/campaigns.js
pm2 restart crm-backend
sleep 3
pm2 logs crm-backend --lines 20 --nostream
```

Verify the response includes user data:
```bash
# Get a valid token first (use any stored admin token or login endpoint)
curl -s https://brandmonkz.com/api/campaigns \
  -H "Authorization: Bearer <TOKEN>" | python3 -c "import sys,json; data=json.load(sys.stdin); c=data[0] if isinstance(data,list) else data['campaigns'][0]; print('user field:', c.get('user'))"
```
  </action>
  <verify>
`pm2 logs crm-backend --lines 20 --nostream` shows no crash.
`curl` response for GET /api/campaigns shows `"user": {"firstName": "...", "lastName": "..."}` on at least one campaign.
  </verify>
  <done>Backend GET /api/campaigns returns `user.firstName` and `user.lastName` per campaign without errors.</done>
</task>

<task type="auto">
  <name>Task 2: Fix frontend mapping and totalCompanies formula, build and deploy</name>
  <files>/Users/jeet/Documents/CRM Frontend/crm-app/src/pages/Campaigns/CampaignsPage.tsx</files>
  <action>
Read the file first to confirm exact line numbers:
```bash
grep -n "totalCompanies\|createdBy\|companiesCount\|interface Campaign\|_count" \
  "/Users/jeet/Documents/CRM Frontend/crm-app/src/pages/Campaigns/CampaignsPage.tsx" | head -30
```

Make three targeted changes:

**1. Add `companiesCount` to the Campaign interface** (after the existing fields, around line 31):
```ts
companiesCount: number;
```

**2. Fix the mapping block (~line 78)** — two changes in the same mapping object:
```ts
// BEFORE:
companiesCount: c._count?.companies || 0,   // (may not exist yet — add it)
createdBy: 'Current User',

// AFTER:
companiesCount: c._count?.companies || 0,
createdBy: c.user
  ? `${c.user.firstName || ''} ${c.user.lastName || ''}`.trim() || 'Team Member'
  : 'Team Member',
```

**3. Fix `totalCompanies` formula (~line 140)**:
```ts
// BEFORE:
const totalCompanies = campaigns.length > 0 ? Math.ceil(campaigns.length * 1.5) : 0;

// AFTER:
const totalCompanies = campaigns.reduce((acc, c) => acc + c.companiesCount, 0);
```

After saving, build and deploy:
```bash
cd "/Users/jeet/Documents/CRM Frontend/crm-app"
npm run build

# Clear old assets on server and upload new build
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 \
  "rm -rf /var/www/crm-frontend/assets && mkdir -p /var/www/crm-frontend"

scp -i ~/.ssh/brandmonkz-crm.pem -r build/* \
  ec2-user@100.24.213.224:/var/www/crm-frontend/
```
  </action>
  <verify>
Build completes without TypeScript errors.
`grep -n "totalCompanies\|createdBy" "/Users/jeet/Documents/CRM Frontend/crm-app/src/pages/Campaigns/CampaignsPage.tsx"` shows the fixed formula and no `'Current User'` string.
scp exits 0.
  </verify>
  <done>
Frontend build succeeds, deployed to EC2.
Visiting https://brandmonkz.com/campaigns after login shows:
- "Companies Reached" = real sum (not a 1.5x fake), likely 0 or a real count per campaign
- Campaign rows show "Peter" or "Rajesh" (or full name) instead of "Current User"
  </done>
</task>

</tasks>

<verification>
```bash
# 1. Backend includes user
curl -s https://brandmonkz.com/api/campaigns \
  -H "Authorization: Bearer <TOKEN>" | python3 -c "
import sys, json
data = json.load(sys.stdin)
campaigns = data if isinstance(data, list) else data.get('campaigns', [])
print('Total campaigns:', len(campaigns))
print('First user field:', campaigns[0].get('user') if campaigns else 'no campaigns')
print('First companiesCount:', campaigns[0].get('_count', {}).get('companies') if campaigns else 'N/A')
"

# 2. No hardcoded 'Current User' in built JS
grep -r "Current User" "/Users/jeet/Documents/CRM Frontend/crm-app/build/" | wc -l
# Should be 0

# 3. No fake formula in source
grep "campaigns.length \* 1.5" "/Users/jeet/Documents/CRM Frontend/crm-app/src/pages/Campaigns/CampaignsPage.tsx"
# Should return nothing
```
</verification>

<success_criteria>
- GET /api/campaigns returns `user: { firstName, lastName }` per campaign
- CampaignsPage.tsx has no `Math.ceil(campaigns.length * 1.5)` formula
- CampaignsPage.tsx has no `'Current User'` string
- Frontend build deployed to `/var/www/crm-frontend/` on EC2
- Live site shows real creator names and real company count sum
</success_criteria>

<output>
After completion, create `.planning/quick/266-fix-hardcoded-values-on-brandmonkz-campa/266-SUMMARY.md` with what was changed, verification output, and any notes.
</output>
