---
phase: quick-258
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/Documents/production-crm-backup/backend/src/routes/campaigns.ts
  - /Users/jeet/Documents/production-crm-backup/frontend/src/pages/Campaigns/CampaignsPage.tsx
autonomous: true
requirements: [Q258]
must_haves:
  truths:
    - "User clicks 'Send NetSuite Campaign' button on CampaignsPage and a campaign is created, linked to all NetSuite companies, and sent via real AWS SES in one action"
    - "Email content is the perfected $2/hr staff augmentation template targeting NetSuite companies specifically, signed by Peter Samuel"
    - "All companies with dataSource='csv_import' are auto-linked to the campaign"
    - "Real emails are sent via existing SES sendEmail function (not mock-send)"
  artifacts:
    - path: "backend/src/routes/campaigns.ts"
      provides: "POST /api/campaigns/quick-send endpoint"
      contains: "quick-send"
    - path: "frontend/src/pages/Campaigns/CampaignsPage.tsx"
      provides: "Send NetSuite Campaign one-click button"
      contains: "Send NetSuite Campaign"
  key_links:
    - from: "CampaignsPage.tsx"
      to: "/api/campaigns/quick-send"
      via: "fetch POST on button click"
      pattern: "api/campaigns/quick-send"
    - from: "campaigns.ts quick-send"
      to: "prisma.company.findMany"
      via: "dataSource filter"
      pattern: "dataSource.*csv_import"
---

<objective>
Build a one-click "Send NetSuite Campaign" feature: a new backend endpoint POST /api/campaigns/quick-send that creates a campaign with the perfected $2/hr staff augmentation email for NetSuite companies, auto-links all NetSuite-imported companies, and sends real emails via AWS SES signed by Peter Samuel. Frontend adds a prominent one-click button on CampaignsPage.

Purpose: Enable instant campaign sends to all NetSuite-imported companies without going through the multi-step campaign wizard.
Output: Working one-click campaign send with real SES delivery.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/Documents/production-crm-backup/backend/src/routes/campaigns.ts
@/Users/jeet/Documents/production-crm-backup/frontend/src/pages/Campaigns/CampaignsPage.tsx
@/Users/jeet/Documents/production-crm-backup/frontend/src/components/LeadDiscoveryModal.tsx (lines 107-127 for staff-aug template pattern)
@/Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/email-template.html (for pricing card HTML pattern)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Backend POST /api/campaigns/quick-send endpoint</name>
  <files>/Users/jeet/Documents/production-crm-backup/backend/src/routes/campaigns.ts</files>
  <action>
Add a new endpoint `POST /api/campaigns/quick-send` in campaigns.ts (before the `export default router` line). This endpoint does everything in one shot:

1. **Find all NetSuite companies** belonging to the authenticated user:
   ```
   prisma.company.findMany({ where: { userId: req.user.id, dataSource: 'csv_import' }, include: { contacts: { where: { isActive: true }, select: { id, email, firstName, lastName } } } })
   ```
   If zero companies found, return 400: `{ error: 'No NetSuite companies found. Import companies first.' }`

2. **Create the campaign** with hardcoded perfected content:
   - `name`: `'NetSuite Staff Augmentation — $2/hr'`
   - `subject`: `'Scale {{companyName}}\'s Team — Pre-Vetted Engineers at $2/hr'`
   - `status`: `'SENDING'`
   - `userId`: `req.user!.id`
   - `htmlContent`: The perfected NetSuite-specific email HTML (see below)

3. **Link all NetSuite companies** via `prisma.campaignCompany.createMany` with `skipDuplicates: true`.

4. **Send real emails** using the existing `sendEmail()` function (SES, line 479-488). For each active contact in each company:
   - Replace `{{firstName}}`, `{{lastName}}`, `{{companyName}}` in both subject and HTML
   - Create `emailLog` with status `'SENT'` before sending (same pattern as existing `:id/send` endpoint, lines 562-577)
   - Inject tracking pixel (same pattern as lines 579-589)
   - Call `sendEmail(contact.email, subjectLine, html)`
   - Track sent/failed counts

5. **Update campaign** status to `'SENT'`, set `sentAt` and `totalSent`.

6. **Return** `{ success: true, campaignId, sent, total, failed, companyCount }`.

**The perfected NetSuite-targeted email HTML content** (hardcode as a const `NETSUITE_CAMPAIGN_HTML`):

```html
<div style='font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
<div style='background: linear-gradient(135deg, #FF6B35 0%, #e85d26 100%); padding: 30px; text-align: center;'>
<h1 style='color: #fff; margin: 0; font-size: 22px;'>NetSuite Engineers at $2/hr Staffing Fee</h1>
<p style='color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 13px;'>TechCloudPro — Pre-Vetted NetSuite Talent</p>
</div>
<div style='padding: 24px; background: #ffffff; color: #333;'>
<p style='font-size: 15px; line-height: 1.6;'>Hi {{firstName}},</p>
<p style='font-size: 15px; line-height: 1.6;'>I noticed {{companyName}} runs on NetSuite — and finding quality NetSuite developers is brutal right now. Most staffing firms charge 15-20% markup on contractor rates. We charge a flat <strong>$2/hr</strong>.</p>
<p style='font-size: 15px; line-height: 1.6;'><strong>What we deliver for {{companyName}}:</strong></p>
<ul style='font-size: 14px; line-height: 1.8; color: #333; padding-left: 20px;'>
<li>NetSuite developers, admins, and consultants — SuiteScript, SuiteFlow, SuiteAnalytics</li>
<li>Pre-vetted through 3-stage technical screening (code + system design + culture fit)</li>
<li>48-hour candidate delivery — profiles in your inbox within 2 business days</li>
<li>$2/hr flat staffing fee — no percentage markups, no hidden costs</li>
<li>30-day replacement guarantee if the fit isn't right</li>
</ul>
<p style='font-size: 15px; line-height: 1.6;'>Full-time placements also available at 15% of first-year salary (industry average is 20-25%).</p>
<p style='font-size: 15px; line-height: 1.6;'>Would a 15-minute call this week work to discuss {{companyName}}'s NetSuite staffing needs?</p>
<div style='text-align: center; margin: 24px 0;'><a href='https://brandmonkz.com/schedule?stream=netsuite' style='background: linear-gradient(135deg, #FF6B35 0%, #e85d26 100%); color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block;'>Book a 15-Min Call</a></div>
<div style='border-top: 1px solid #eee; padding-top: 16px; margin-top: 24px;'>
<p style='font-size: 14px; color: #333; margin: 0 0 4px;'><strong>Peter Samuel</strong></p>
<p style='font-size: 13px; color: #666; margin: 0;'>Director of Staffing — TechCloudPro / BrandMonkz</p>
</div>
</div>
<div style='background: #1a1a2e; padding: 16px; text-align: center; border-radius: 0 0 8px 8px;'>
<p style='font-size: 11px; color: #b0b0c3; margin: 0;'>TechCloudPro | BrandMonkz</p>
</div>
</div>
```

Use single quotes for all HTML attributes (consistent with existing templates in LeadDiscoveryModal.tsx).

The FROM email uses the existing `FROM_EMAIL` and `FROM_NAME` constants (line 476-477), which default to `support@brandmonkz.com` / `BrandMonkz`. Do NOT change these.
  </action>
  <verify>
    grep -n "quick-send" /Users/jeet/Documents/production-crm-backup/backend/src/routes/campaigns.ts | head -5
    grep -n "csv_import" /Users/jeet/Documents/production-crm-backup/backend/src/routes/campaigns.ts | head -5
    grep -n "Peter Samuel" /Users/jeet/Documents/production-crm-backup/backend/src/routes/campaigns.ts | head -3
    # Verify TypeScript compiles:
    cd /Users/jeet/Documents/production-crm-backup/backend && npx tsc --noEmit src/routes/campaigns.ts 2>&1 | head -20
  </verify>
  <done>POST /api/campaigns/quick-send endpoint exists, finds all csv_import companies, creates campaign with NetSuite-specific $2/hr email signed by Peter Samuel, links companies, sends real emails via SES, returns success with counts.</done>
</task>

<task type="auto">
  <name>Task 2: Frontend "Send NetSuite Campaign" one-click button</name>
  <files>/Users/jeet/Documents/production-crm-backup/frontend/src/pages/Campaigns/CampaignsPage.tsx</files>
  <action>
Add a "Send NetSuite Campaign" one-click button to the CampaignsPage header area (next to existing "Create Campaign" and "Help" buttons, line ~234-252).

1. **Add state variables** at the top of the CampaignsPage component (near line 56-57):
   - `const [sendingNetSuite, setSendingNetSuite] = useState(false);`
   - `const [netSuiteResult, setNetSuiteResult] = useState<{ sent: number; total: number; failed: number; companyCount: number } | null>(null);`

2. **Add handler function** `handleNetSuiteCampaign`:
   ```tsx
   const handleNetSuiteCampaign = async () => {
     if (!window.confirm('Send the $2/hr staff augmentation campaign to ALL NetSuite companies now?\n\nThis will send real emails via AWS SES.')) return;
     setSendingNetSuite(true);
     setNetSuiteResult(null);
     try {
       const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
       const token = localStorage.getItem('crmToken');
       const response = await fetch(`${apiUrl}/api/campaigns/quick-send`, {
         method: 'POST',
         headers: { 'Authorization': `Bearer ${token}` },
       });
       const data = await response.json();
       if (response.ok) {
         setNetSuiteResult({ sent: data.sent, total: data.total, failed: data.failed, companyCount: data.companyCount });
         loadCampaigns(); // Refresh list to show new campaign
       } else {
         alert(data.error || 'Failed to send NetSuite campaign');
       }
     } catch {
       alert('Failed to send NetSuite campaign');
     } finally {
       setSendingNetSuite(false);
     }
   };
   ```

3. **Add the button** in the header div (line ~234, inside the `flex items-center gap-3` div), BEFORE the Help button:
   ```tsx
   <button
     type="button"
     onClick={handleNetSuiteCampaign}
     disabled={sendingNetSuite}
     className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95 tracking-wide border border-orange-400/30 disabled:opacity-60"
   >
     {sendingNetSuite ? (
       <>
         <ArrowPathIcon className="h-5 w-5 animate-spin" />
         Sending...
       </>
     ) : (
       <>
         <PaperAirplaneIcon className="h-5 w-5" />
         Send NetSuite Campaign
       </>
     )}
   </button>
   ```

   Use orange gradient (`from-orange-500 to-orange-600`) to visually distinguish from the purple/indigo "Create Campaign" button and to match the BrandMonkz orange (#FF6B35) brand color.

4. **Add success banner** — right after the Stats Overview section (after line ~299), show a dismissible success banner when `netSuiteResult` is set:
   ```tsx
   {netSuiteResult && (
     <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center justify-between">
       <div className="flex items-center gap-3">
         <PaperAirplaneIcon className="h-6 w-6 text-green-400" />
         <span className="text-green-400 font-bold">
           NetSuite Campaign Sent! {netSuiteResult.sent}/{netSuiteResult.total} emails delivered to {netSuiteResult.companyCount} companies.
           {netSuiteResult.failed > 0 && ` (${netSuiteResult.failed} failed)`}
         </span>
       </div>
       <button onClick={() => setNetSuiteResult(null)} className="text-green-400 hover:text-green-300">
         <XMarkIcon className="h-5 w-5" />
       </button>
     </div>
   )}
   ```

Icons `ArrowPathIcon`, `PaperAirplaneIcon`, and `XMarkIcon` are already imported at the top of the file (line 13, 17, 14).
  </action>
  <verify>
    grep -n "quick-send\|Send NetSuite\|netSuiteResult\|handleNetSuiteCampaign" /Users/jeet/Documents/production-crm-backup/frontend/src/pages/Campaigns/CampaignsPage.tsx | head -10
    # Verify frontend builds:
    cd /Users/jeet/Documents/production-crm-backup/frontend && npx tsc --noEmit 2>&1 | tail -5
  </verify>
  <done>"Send NetSuite Campaign" orange button visible in CampaignsPage header. Clicking it triggers confirmation dialog, calls POST /api/campaigns/quick-send, shows success banner with sent/total/company counts, refreshes campaign list.</done>
</task>

</tasks>

<verification>
1. Backend: `grep -n "quick-send" backend/src/routes/campaigns.ts` shows the endpoint
2. Backend: `grep -n "Peter Samuel" backend/src/routes/campaigns.ts` shows the signature in email HTML
3. Backend: `grep -n "csv_import" backend/src/routes/campaigns.ts` shows NetSuite company filtering
4. Frontend: `grep -n "Send NetSuite Campaign" frontend/src/pages/Campaigns/CampaignsPage.tsx` shows the button
5. Frontend: `grep -n "quick-send" frontend/src/pages/Campaigns/CampaignsPage.tsx` shows the API call
6. TypeScript compiles without errors in both backend and frontend
</verification>

<success_criteria>
- POST /api/campaigns/quick-send creates campaign, links all csv_import companies, sends real emails via SES
- Email content is the NetSuite-specific $2/hr staff augmentation pitch signed by Peter Samuel
- CampaignsPage has orange "Send NetSuite Campaign" button with confirmation dialog
- Success banner shows sent/total/failed/company counts after send
- Campaign list refreshes to show the newly created campaign
</success_criteria>

<output>
After completion, create `.planning/quick/258-build-one-click-campaign-send-for-brandm/258-SUMMARY.md`
</output>
