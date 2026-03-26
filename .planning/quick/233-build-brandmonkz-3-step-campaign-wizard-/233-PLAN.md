---
phase: quick-233
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/Documents/production-crm-backup/backend/src/routes/campaigns.ts
  - /Users/jeet/Documents/production-crm-backup/frontend/src/components/CampaignWizard.tsx
  - /Users/jeet/Documents/production-crm-backup/frontend/src/components/AIChat.tsx
  - /Users/jeet/Documents/production-crm-backup/frontend/src/pages/Campaigns/CampaignsPage.tsx
autonomous: true
requirements:
  - build-campaign-wizard
  - fix-aichat-dark-theme
  - fix-generate-basics-backend

must_haves:
  truths:
    - "Campaign wizard opens when user clicks New Campaign"
    - "Step 1 right panel appears after clicking Write my email"
    - "Subject and body are editable before moving to Step 2"
    - "Step 2 shows company tiles with correct contact counts"
    - "Step 3 shows campaign summary with editable name and FROM address"
    - "Send button creates campaign and links selected companies"
    - "AIChat sidebar shows no white or light panels in dark mode"
    - "generate-basics returns name/goal based on user's description text"
  artifacts:
    - path: "/Users/jeet/Documents/production-crm-backup/frontend/src/components/CampaignWizard.tsx"
      provides: "3-step campaign wizard component"
    - path: "/Users/jeet/Documents/production-crm-backup/backend/src/routes/campaigns.ts"
      provides: "generate-basics route with description interpolation"
  key_links:
    - from: "CampaignsPage.tsx"
      to: "CampaignWizard.tsx"
      via: "import swap replacing CreateCampaignModal"
    - from: "CampaignWizard Step 1"
      to: "/api/campaigns/ai/generate-basics"
      via: "fetch with { tone, description } body"
    - from: "CampaignWizard Step 3 send button"
      to: "POST /api/campaigns then POST /api/campaigns/:id/companies/:companyId"
      via: "sequential fetch calls"
---

<objective>
Build the BrandMonkz 3-step campaign wizard (CampaignWizard.tsx) replacing the existing 5-step CreateCampaignModal, fix the AIChat dark theme, and fix the generate-basics backend endpoint to use the user's description.

Purpose: Simplify campaign creation to a 3-interaction flow — describe → group → send — with AI at the center.
Output: New CampaignWizard.tsx component, updated CampaignsPage.tsx, fixed AIChat.tsx dark styles, fixed campaigns.ts generate-basics route.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/doordash-p2p/docs/superpowers/specs/2026-03-26-brandmonkz-campaign-wizard-design.md

Key facts:
- Frontend root: /Users/jeet/Documents/production-crm-backup/frontend/src/
- Backend: /Users/jeet/Documents/production-crm-backup/backend/src/routes/campaigns.ts
- Token: localStorage 'crmToken', user: localStorage 'crmUser' (has .email field)
- API base: import.meta.env.VITE_API_URL
- Companies API: GET /api/companies — returns array with .id, .name, ._count.contacts
- Campaign create: POST /api/campaigns — body { name, subject, status: 'SENDING', htmlContent }
- Link company: POST /api/campaigns/:id/companies/:companyId (one per company)
- CreateCampaignModal is used in CampaignsPage.tsx line 468 — simple drop-in swap
- generate-basics route is at campaigns.ts line 260 — reads only `tone`, ignores `description`
- AIChat outer container uses backgroundColor: 'white' at line 203 (hardcoded, needs inline replacement)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix generate-basics backend — interpolate description into AI prompt</name>
  <files>/Users/jeet/Documents/production-crm-backup/backend/src/routes/campaigns.ts</files>
  <action>
    At line 262 (the generate-basics route handler), destructure `description` from req.body alongside `tone`:
    ```
    const { tone, description } = req.body;
    ```
    Then update the prompt string (currently at line 264) to interpolate the description so the AI generates a name and goal specific to what the user typed. Replace the static generic prompt with:
    ```
    const prompt = `You are an expert email marketer. Generate a creative campaign name and compelling goal for an email marketing campaign.

Tone: ${tone || 'professional'}
Campaign Brief: ${description || 'a general marketing campaign'}

Generate a campaign name and goal that is directly relevant to the campaign brief above.

Return ONLY valid JSON with this structure:
{"name": "Campaign Name Here", "goal": "Detailed campaign goal describing what you want to achieve with this campaign..."}`;
    ```
    No other changes to this file. This is a 2-line change: add `description` to destructure, update the prompt template.
  </action>
  <verify>
    Read the updated lines 262-272 to confirm `description` is destructured and appears in the prompt template.
  </verify>
  <done>generate-basics prompt includes `${description}` interpolation. Any call with `{ tone: "professional", description: "20% off cyber security training" }` will produce a name/goal relevant to cyber security training, not generic B2B output.</done>
</task>

<task type="auto">
  <name>Task 2: Build CampaignWizard.tsx — 3-step campaign creation wizard</name>
  <files>/Users/jeet/Documents/production-crm-backup/frontend/src/components/CampaignWizard.tsx</files>
  <action>
    Create a new file `CampaignWizard.tsx`. Use the same Props interface as the old modal:
    ```typescript
    interface Props {
      isOpen: boolean;
      onClose: () => void;
      onSuccess?: () => void;
    }
    ```

    State shape:
    - `step: 1 | 2 | 3` — current wizard step
    - `prompt: string` — user's free text description (textarea in Step 1 left panel)
    - `tone: 'professional' | 'friendly' | 'persuasive'` — default 'professional'
    - `generating: boolean` — while AI endpoints are running
    - `subject: string` — filled from generate-subject variants[0]
    - `emailBody: string` — filled from generate-content .content
    - `campaignName: string` — internal, from generate-basics .name; also editable in Step 3
    - `campaignGoal: string` — internal, from generate-basics .goal
    - `companies: Array<{id: string, name: string, _count: {contacts: number}}>` — loaded from GET /api/companies
    - `selectedCompanyIds: string[]` — toggled in Step 2
    - `fromAddress: string` — pre-filled from JSON.parse(localStorage.getItem('crmUser')).email
    - `editingFrom: boolean` — toggles inline edit in Step 3
    - `sending: boolean` — while campaign create + link requests run
    - `error: string` — inline error display
    - `generateError: string` — error shown below the generate button

    Load companies on mount (or when step becomes 2) via GET /api/companies with Authorization header from localStorage crmToken.

    **Step 1 layout (split 50/50):**
    Left panel:
    - Label: "Tell the AI what you want to say"
    - `<textarea>` bound to `prompt`, height 100px, placeholder "e.g. We are offering 20% off our cyber security training for NetSuite customers this month only"
    - Tone pills row: Professional / Friendly / Urgent (maps to 'professional'/'friendly'/'persuasive'). Selected pill: indigo bg + white text. Unselected: glass-style transparent with indigo border.
    - "✨ Write my email" button — on click, runs AI generation sequence. While `generating`: show spinner + "Generating..." text. Button disabled when `generating`.
    - `generateError` displayed below button in red if non-empty.

    Right panel (only visible when `subject !== '' && emailBody !== ''`):
    - Section label: "AI Draft — edit anything"
    - "🔄 Regenerate" link (top right) — re-runs same generation sequence
    - Subject `<input>` pre-filled with `subject`, fully editable
    - Email body `<textarea>` pre-filled with `emailBody`, fully editable, height ~130px

    Progress bar: 3 segments at top. Segment 1 active (indigo), 2+3 inactive glass.

    Footer: "Next: Pick your group →" button. Disabled until `subject !== '' && emailBody !== ''`.

    AI generation sequence (runs on "Write my email" click):
    ```
    setGenerating(true); setGenerateError('');
    // Step A
    res = await fetch(`${VITE_API_URL}/api/campaigns/ai/generate-basics`, POST, body: { tone, description: prompt })
    data = await res.json()
    setCampaignName(data.name); setCampaignGoal(data.goal)
    // Step B
    res = await fetch(`${VITE_API_URL}/api/campaigns/ai/generate-subject`, POST, body: { goal: data.goal, tone, campaignName: data.name })
    subjectData = await res.json()
    setSubject(subjectData.variants[0])
    // Step C
    res = await fetch(`${VITE_API_URL}/api/campaigns/ai/generate-content`, POST, body: { goal: data.goal, subject: subjectData.variants[0], tone, personalization: true })
    contentData = await res.json()
    setEmailBody(contentData.content)
    setGenerating(false)
    ```
    Each fetch includes `Authorization: Bearer ${token}` header. On any error: `setGenerateError(err.message)`, `setGenerating(false)`.

    **Step 2 layout:**
    - "Who Gets It?" heading
    - Company tiles grid (3 columns): each tile shows emoji (pick by index: ['🏢','🏬','🏭','🏪','🏫'][i % 5]) + company name + "{n} contacts". Click toggles in `selectedCompanyIds`. Selected: 2px indigo border + `rgba(99,102,241,0.12)` background tint.
    - Last tile: dashed border "+ Custom filter" (disabled, `pointer-events: none`, tooltip "Coming soon" via `title` attr).
    - Empty state (companies.length === 0): "No groups yet — add contacts first" with `<a href="/contacts">`.
    - Summary bar below grid: "✅ {selectedCompanyIds.length} groups selected — {total contacts} contacts will receive this email". Total = sum of ._count.contacts across selected companies.
    - Progress bar: segment 2 active.
    - Footer: "← Back" button + "Next: Review & Send →" button disabled until selectedCompanyIds.length >= 1.

    **Step 3 layout:**
    - "Review & Send" heading
    - 2x2 grid of summary cards:
      1. Campaign name — inline `<input>` bound to `campaignName`
      2. Sending to — comma-joined names of selected companies + total contact count
      3. Subject line — `<p>` displaying `subject` (read-only)
      4. From address — display `fromAddress`. "✏️ edit" link toggles `editingFrom`. When `editingFrom`: show `<input>` bound to `fromAddress`. Note: fromAddress is UI-only in this version — backend does not accept `from_email`.
    - Full-width green gradient send button (`background: linear-gradient(to right, #10B981, #059669)`): "🚀 Send Campaign to {total contacts} People"
    - `error` displayed inline below send button in red if non-empty.
    - Progress bar: segment 3 active.
    - Footer: "← Back" button only.

    Send sequence (on "🚀 Send Campaign" click):
    ```
    setSending(true); setError('');
    // Create campaign
    res = await fetch(`${VITE_API_URL}/api/campaigns`, POST, body: { name: campaignName, subject, status: 'SENDING', htmlContent: emailBody })
    campaign = (await res.json()).campaign
    // Link companies
    for (const companyId of selectedCompanyIds) {
      await fetch(`${VITE_API_URL}/api/campaigns/${campaign.id}/companies/${companyId}`, POST)
    }
    setSending(false);
    onSuccess?.();
    onClose();
    ```
    On error: `setError(err.message)`, `setSending(false)` (keep wizard open).

    Modal wrapper: fixed overlay, white/glass background (use `background: rgba(22,22,37,0.95)` with `backdropFilter: blur(20px)` for the modal body to match the Indigo Noir dark theme). Modal width 860px, centered. XMarkIcon close button in top-right corner.

    Export: `export default CampaignWizard;` and named `export function CampaignWizard`.
  </action>
  <verify>
    Run: `grep -n "generate-basics\|generate-subject\|generate-content\|selectedCompanyIds\|campaignGoal\|CampaignWizard" /Users/jeet/Documents/production-crm-backup/frontend/src/components/CampaignWizard.tsx | head -30`
    Confirm all 3 AI endpoints referenced, selectedCompanyIds state present, default export exists.
  </verify>
  <done>CampaignWizard.tsx exists, renders 3 conditional step views, calls all 3 AI endpoints sequentially on generate, creates campaign + links companies on send, Props interface matches { isOpen, onClose, onSuccess }.</done>
</task>

<task type="auto">
  <name>Task 3: Wire CampaignWizard into CampaignsPage + fix AIChat dark theme + deploy</name>
  <files>
    /Users/jeet/Documents/production-crm-backup/frontend/src/pages/Campaigns/CampaignsPage.tsx
    /Users/jeet/Documents/production-crm-backup/frontend/src/components/AIChat.tsx
  </files>
  <action>
    **CampaignsPage.tsx (2 edits):**
    1. Line 19: Replace `import CreateCampaignModal from '../../components/CreateCampaignModal';` with `import CampaignWizard from '../../components/CampaignWizard';`
    2. Lines 468-474: Replace `<CreateCampaignModal` ... `/>` with `<CampaignWizard` using the same props (isOpen, onClose, onSuccess). The prop values stay identical — only the component name changes.

    Do NOT delete CreateCampaignModal.tsx in this pass — leave it in place so there's a rollback option.

    **AIChat.tsx dark theme (inline style replacements — use exact line numbers from the file):**

    The outer container div (line ~197, style: `backgroundColor: 'white'`):
    - Replace `backgroundColor: 'white'` with `background: 'rgba(22,22,37,0.95)'`
    - Replace `border: '1px solid #e5e7eb'` with `border: '1px solid rgba(255,255,255,0.1)'`
    - Add `backdropFilter: 'blur(20px)'`

    The messages area (find `bg-gray-50` className — it's a div wrapping the messages list):
    - Remove Tailwind class `bg-gray-50`
    - Add inline style: `background: 'rgba(255,255,255,0.02)'`

    Assistant message bubble (find className containing `bg-white text-gray-800 border-gray-200`):
    - Remove those Tailwind classes
    - Add inline style: `background: 'rgba(255,255,255,0.06)', color: '#CBD5E1', border: '1px solid rgba(255,255,255,0.1)'`

    Input field (find `bg-white border-gray-300` on the textarea/input):
    - Remove those Tailwind classes
    - Add inline style: `background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#F1F5F9'`

    Approval card (find `bg-gradient-to-r from-green-50 to-orange-50 border-green-300`):
    - Remove those Tailwind classes
    - Add inline style: `background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)'`

    Loading dots (find `bg-orange-600` on the typing indicator dots):
    - Replace with inline style: `background: '#6366F1'`

    Quick action buttons (find `bg-orange-50 text-orange-700 border-orange-200`):
    - Remove those Tailwind classes
    - Add inline style: `background: 'rgba(99,102,241,0.15)', color: '#A5B4FC', border: '1px solid rgba(99,102,241,0.3)'`

    User message bubbles (find `bg-gradient-to-r from-indigo-600 to-purple-600 text-white`): leave unchanged.
    Panel header gradient (`bg-gradient-to-r from-indigo-600 to-purple-600 text-white`): leave unchanged.

    **Deploy to production:**
    After all file edits are complete:
    ```bash
    cd /Users/jeet/Documents/production-crm-backup/frontend
    npm run build
    tar -czf /tmp/dist.tar.gz -C dist .
    scp -i ~/.ssh/brandmonkz-crm.pem /tmp/dist.tar.gz ec2-user@100.24.213.224:/tmp/
    ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 "sudo rm -rf /var/www/brandmonkz/* && sudo tar -xzf /tmp/dist.tar.gz -C /var/www/brandmonkz && sudo nginx -s reload"
    ```

    Also restart/rebuild backend to pick up generate-basics fix:
    ```bash
    ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 "cd /home/ec2-user/brandmonkz-backend && npm run build && pm2 restart brandmonkz-backend"
    ```
    (If pm2 process name differs, check with `pm2 list` first.)
  </action>
  <verify>
    1. `grep -n "CampaignWizard\|CreateCampaignModal" /Users/jeet/Documents/production-crm-backup/frontend/src/pages/Campaigns/CampaignsPage.tsx` — confirm CampaignWizard appears, CreateCampaignModal import is gone.
    2. `grep -n "rgba(22,22,37\|rgba(255,255,255,0.06\|rgba(99,102,241" /Users/jeet/Documents/production-crm-backup/frontend/src/components/AIChat.tsx` — confirm dark theme styles are present.
    3. After deploy: `curl -s https://brandmonkz.com` returns 200 (or check via SSH that nginx reload succeeded with exit 0).
  </verify>
  <done>CampaignsPage.tsx imports CampaignWizard (not CreateCampaignModal). AIChat.tsx has zero hardcoded white/light backgrounds. Frontend is deployed to production via scp+nginx. Backend is restarted to pick up generate-basics fix.</done>
</task>

</tasks>

<verification>
End-to-end checks:
1. Open Campaigns page → click "New Campaign" → wizard opens (not the old 5-step modal)
2. Step 1: type a description → click "Write my email" → spinner appears → right panel fills with subject + body
3. Both subject and body are editable
4. Click "Next: Pick your group" → Step 2 shows company tiles
5. Click a company tile → it gets highlighted, summary bar updates contact count
6. Click "Next: Review & Send" → Step 3 shows 4 summary cards
7. Click "🚀 Send Campaign" → campaign created, wizard closes, campaigns list refreshes
8. Open AIChat panel → no white backgrounds visible anywhere in dark mode
9. Backend: generate-basics with `description: "20% off cyber security training"` returns a name/goal about cyber security (not generic "B2B SaaS")
</verification>

<success_criteria>
- Wizard opens from CampaignsPage "New Campaign" button
- All 3 AI endpoints called sequentially in Step 1 using user's description
- Campaign created via POST /api/campaigns and companies linked via POST /api/campaigns/:id/companies/:companyId
- AIChat sidebar: no white/light-colored panels visible
- generate-basics prompt includes the user's description text
- Production frontend + backend deployed and live
</success_criteria>

<output>
After completion, create `.planning/quick/233-build-brandmonkz-3-step-campaign-wizard-/233-SUMMARY.md`
</output>
