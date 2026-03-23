---
phase: quick
plan: 218
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/Documents/production-crm-backup/frontend/src/components/AICampaignGenerator.tsx
  - /Users/jeet/Documents/production-crm-backup/frontend/src/components/CreateCampaignModal.tsx
autonomous: true
requirements: [Q-218]
must_haves:
  truths:
    - "All text in AICampaignGenerator is readable against its background"
    - "All text in CreateCampaignModal review and basics steps is readable"
    - "AI generate-content response populates emailContent state and is included in campaign save payload"
  artifacts:
    - path: "/Users/jeet/Documents/production-crm-backup/frontend/src/components/AICampaignGenerator.tsx"
      provides: "Fixed outer container — dark background, readable text"
    - path: "/Users/jeet/Documents/production-crm-backup/frontend/src/components/CreateCampaignModal.tsx"
      provides: "Fixed review step and basics AI panel — dark-safe containers"
  key_links:
    - from: "AICampaignGenerator.tsx:133"
      to: "index.css gradient stop overrides"
      via: "inline style replacing Tailwind gradient classes"
    - from: "CreateCampaignModal generateAIContent"
      to: "handleCreateCampaign body.htmlContent"
      via: "emailContent state (already wired — no change needed)"
---

<objective>
Fix invisible text in BrandMonkz campaign UI caused by the Indigo Noir theme remapping
gray/orange text colors to near-white but NOT overriding Tailwind gradient-stop utility classes
(from-gray-50, via-orange-50, to-rose-50, from-orange-50, to-orange-100). These gradient
containers stay light while text inside is remapped to near-white = invisible on light.

Purpose: Campaign creation flow is unusable — users cannot read labels, headings, or example
prompts in AICampaignGenerator and cannot read the review step summary in CreateCampaignModal.

Output: Both components updated with dark-safe backgrounds. Frontend built and deployed to EC2.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
Project: /Users/jeet/Documents/production-crm-backup/
Frontend: /Users/jeet/Documents/production-crm-backup/frontend/src/
Theme: index.css Indigo Noir — overrides bg-white → #161625, text-gray-900 → #F1F5F9 BUT
       does NOT override Tailwind gradient stop classes (from-*, via-*, to-*).
       This means any div using `from-gray-50 via-orange-50 to-rose-50` retains a light
       gradient background from Tailwind's default values.

Root cause (verified in source):
- AICampaignGenerator.tsx:133 → `bg-gradient-to-br from-gray-50 via-orange-50 to-rose-50`
  Text inside: text-gray-900 (remapped → #F1F5F9 near-white) = invisible on light bg.
- CreateCampaignModal.tsx:737 → `bg-gradient-to-br from-orange-50 to-orange-100`
  Text inside: text-gray-900, text-gray-600 (both near-white on light bg) = invisible.
- CreateCampaignModal.tsx:360 → `bg-gradient-to-r ${gradients.brand.primary.gradient} bg-opacity-10`
  This uses brand indigo gradient = dark ok. Text is text-gray-900 (near-white on dark) = readable.

AI content save — ALREADY CORRECT (no fix needed):
- generateAIContent() at line 151 → calls /api/campaigns/ai/generate-content → sets emailContent state
- handleCreateCampaign() at line 252 → sends htmlContent: emailContent to POST /api/campaigns
- Backend campaigns.ts:53 stores htmlContent. Flow is complete and correct.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix AICampaignGenerator outer container and CreateCampaignModal review/orange panels</name>
  <files>
    /Users/jeet/Documents/production-crm-backup/frontend/src/components/AICampaignGenerator.tsx
    /Users/jeet/Documents/production-crm-backup/frontend/src/components/CreateCampaignModal.tsx
  </files>
  <action>
    Fix 1 — AICampaignGenerator.tsx line 133:
    Replace the outer wrapper div's className from:
      `className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50 to-rose-50 flex items-center justify-center p-6"`
    To use an inline style for the background instead:
      `className="min-h-screen flex items-center justify-center p-6"`
      `style={{ background: 'linear-gradient(135deg, var(--bg-base) 0%, var(--bg-deep) 100%)' }}`

    Also fix any child elements that use hardcoded light colors NOT going through Tailwind class remapping.
    Scan lines 133-273 for:
    - `bg-white` → already remapped in index.css to var(--bg-elevated) = OK
    - `text-gray-900` → remapped to #F1F5F9 = OK (near-white readable on dark)
    - `text-gray-600` → remapped to var(--color-gray-600) = #94A3B8 = OK
    - `border-gray-100` / `border-gray-200` → these are fine since bg is now dark
    - Line 161: `className="...border-2 border-gray-200 rounded-2xl ... text-gray-900 placeholder-gray-400 text-lg"` — textarea background defaults to bg-white (remapped dark) — OK
    - Line 203: `className="...bg-gradient-to-r from-orange-50 to-rose-50 ..."` — example prompt buttons. Replace with:
      `className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all border hover:border-opacity-60"` with inline style `style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}`

    Fix 2 — CreateCampaignModal.tsx line 737 (review step):
    Replace:
      `className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border-2 border-orange-200"`
    With:
      `className="rounded-xl p-6 border-2"` + inline style:
      `style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-accent)' }}`
    Text inside uses text-gray-900 (remapped = near-white) and text-gray-600 (remapped = slate) — both readable on dark bg after this change.

    Fix 3 — CreateCampaignModal.tsx line 466 (A/B test bg-gray-50 section):
    `className="border-b-2 border-gray-100 py-6 bg-gray-50"` — bg-gray-50 IS overridden in index.css
    (--color-gray-50: #161625) so this is actually fine (dark). Leave it.

    Fix 4 — CreateCampaignModal.tsx line 635 (personalization checkbox row):
    `className="flex items-center gap-3 p-4 bg-orange-50 rounded-xl"` — bg-orange-50 is NOT in
    index.css overrides. Replace with:
    `className="flex items-center gap-3 p-4 rounded-xl"` + inline style:
    `style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-default)' }}`

    Fix 5 — CreateCampaignModal.tsx line 781 (footer):
    `className="... bg-gray-50 ..."` — bg-gray-50 IS overridden → dark. Leave it.

    Fix 6 — CreateCampaignModal.tsx line 490 (AI variants panel inside A/B):
    `className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg"` — bg-orange-50 not
    overridden = light. Replace with:
    `className="mb-4 p-3 rounded-lg"` + inline style:
    `style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-accent)' }}`
    Inner text uses `text-orange-700` which is remapped to `#818CF8` (indigo) — readable on dark.

    No changes needed to backend (AI save flow is correct).
  </action>
  <verify>
    Run frontend build to confirm no TypeScript errors:
    cd /Users/jeet/Documents/production-crm-backup/frontend && VITE_API_URL=https://brandmonkz.com npm run build 2>&1 | tail -20
    Expected: "built in X.Xs" with no errors.
  </verify>
  <done>
    Build succeeds. AICampaignGenerator outer container is dark-themed. Example prompt buttons use
    glass style. CreateCampaignModal review summary, personalization row, and A/B variant panel
    all use dark-safe backgrounds. All text is readable (near-white on dark bg).
  </done>
</task>

<task type="auto">
  <name>Task 2: Deploy fixed frontend to EC2</name>
  <files>EC2 /var/www/brandmonkz</files>
  <action>
    Run full build + deploy sequence:

    cd /Users/jeet/Documents/production-crm-backup/frontend && \
    VITE_API_URL=https://brandmonkz.com npm run build && \
    tar -czf /tmp/bm-front.tar.gz -C dist . && \
    scp -i ~/.ssh/brandmonkz-crm.pem /tmp/bm-front.tar.gz ec2-user@100.24.213.224:/tmp/ && \
    ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 "sudo rm -rf /var/www/brandmonkz && sudo mkdir -p /var/www/brandmonkz && sudo tar -xzf /tmp/bm-front.tar.gz -C /var/www/brandmonkz && sudo restorecon -Rv /var/www/brandmonkz && sudo chown -R nginx:nginx /var/www/brandmonkz"
  </action>
  <verify>
    curl -s -o /dev/null -w "%{http_code}" https://brandmonkz.com/
    Expected: 200
  </verify>
  <done>
    Deploy completes without error. brandmonkz.com returns HTTP 200.
  </done>
</task>

</tasks>

<verification>
1. Build succeeds: `npm run build` exits 0 with no TypeScript errors
2. AICampaignGenerator outer div has dark background (var(--bg-base)/var(--bg-deep) gradient)
3. Example prompt buttons use var(--glass-bg) not orange-50/rose-50 Tailwind defaults
4. CreateCampaignModal review step uses var(--bg-elevated) not from-orange-50/to-orange-100
5. CreateCampaignModal personalization row uses var(--glass-bg)
6. EC2 deploy returns HTTP 200 from https://brandmonkz.com/
7. AI email content save path confirmed unchanged: generateAIContent → setEmailContent → handleCreateCampaign → POST /api/campaigns body.htmlContent
</verification>

<success_criteria>
- brandmonkz.com campaign creator page shows readable text (dark background with near-white text)
- Example prompts, headings, labels, and review summary all visible
- AI Generate button creates full email body that is saved with campaign on form submit
- No regression: build passes, HTTP 200 on production URL
</success_criteria>

<output>
No SUMMARY.md needed for quick tasks. Commit with message:
fix(brandmonkz): fix campaign text visibility — replace light gradient containers with dark theme vars
</output>
