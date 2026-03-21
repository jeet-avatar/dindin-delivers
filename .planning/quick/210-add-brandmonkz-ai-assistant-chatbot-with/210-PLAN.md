---
phase: quick-210
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/Documents/production-crm-backup/backend/src/services/ai-orchestrator.service.ts
  - /Users/jeet/Documents/production-crm-backup/frontend/src/components/AIChat.tsx
autonomous: true
requirements: [BRANDMONKZ-AI-001]
must_haves:
  truths:
    - "Rajesh can ask 'how do I set up on a new computer' and get the correct answer (go to brandmonkz.com, log in, done)"
    - "Rajesh can ask 'how do I import contacts' and get CSV import instructions"
    - "Rajesh can ask 'how do I create a campaign' and get step-by-step guidance"
    - "The chatbot header says 'BrandMonkz AI Assistant' not 'AI Assistant'"
    - "Quick action buttons include BrandMonkz-specific prompts (setup guide, import contacts)"
    - "The chatbot responds correctly to 'what are my login credentials'"
  artifacts:
    - path: /Users/jeet/Documents/production-crm-backup/backend/src/services/ai-orchestrator.service.ts
      provides: "System prompt with BrandMonkz knowledge"
      contains: "buildSystemPrompt"
    - path: /Users/jeet/Documents/production-crm-backup/frontend/src/components/AIChat.tsx
      provides: "BrandMonkz-branded chat UI with relevant quick actions"
  key_links:
    - from: "AIChat.tsx"
      to: "/api/ai-chat/message"
      via: "axios.post"
      pattern: "api/ai-chat/message"
    - from: "/api/ai-chat/message"
      to: "aiOrchestrator.processRequest"
      via: "ai-orchestrator.service"
      pattern: "aiOrchestrator.processRequest"
    - from: "processRequest"
      to: "buildSystemPrompt"
      via: "getCRMContext + buildSystemPrompt"
      pattern: "buildSystemPrompt"
---

<objective>
Upgrade the existing BrandMonkz AI chatbot to have full system knowledge — new computer setup guide, CRM feature guidance, NetSuite contact import help, and Rajesh's account details. Rebrand the UI to "BrandMonkz AI Assistant."

Purpose: Rajesh (rajesh@techcloudpro.com) is a new user with 18,373 NetSuite contacts imported. He needs an AI assistant that can answer questions about the CRM without needing to read documentation.

Output: Updated system prompt in ai-orchestrator.service.ts with BrandMonkz-specific knowledge, rebranded AIChat.tsx frontend with relevant quick actions, deployed to production.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/Documents/production-crm-backup/backend/src/services/ai-orchestrator.service.ts
@/Users/jeet/Documents/production-crm-backup/frontend/src/components/AIChat.tsx

## Architecture

- Backend: Node.js/Express at /var/www/crm-backend/backend, PM2 process "crm-backend"
- Frontend: React/Vite, built and scp'd to /var/www/brandmonkz/ on EC2 100.24.213.224
- SSH key: ~/.ssh/brandmonkz-crm.pem
- The AI Chat backend route is at /api/ai-chat/message (src/routes/ai-chat.ts)
- The route calls aiOrchestrator.processRequest() from ai-orchestrator.service.ts
- buildSystemPrompt() in the service is where Claude gets its knowledge
- The Anthropic SDK is already installed (@anthropic-ai/sdk)

## What Rajesh Needs to Know (inject into system prompt)

1. New computer setup: BrandMonkz is web-based. Go to https://brandmonkz.com → Log In → done. No install.
2. Login: rajesh@techcloudpro.com / TechCloud@2025!
3. 18,373 contacts already imported from NetSuite
4. Import more contacts: Contacts page → CRM Import (left sidebar) → Upload CSV
5. Create campaign: Campaigns → Create Campaign → choose contacts → write email → schedule/send
6. Lead discovery: Enrichment tab or Lead Discovery button on Contacts page
7. Features: Dashboard, Contacts, Companies, Deals, Quotes, Contracts, Activities, Analytics, Tags, Campaigns, Video Campaigns, Email Templates, Team, Settings
</context>

<tasks>

<task type="auto">
  <name>Task 1: Inject BrandMonkz knowledge into the AI system prompt</name>
  <files>/Users/jeet/Documents/production-crm-backup/backend/src/services/ai-orchestrator.service.ts</files>
  <action>
Read the full file first. Then modify the `buildSystemPrompt()` method to prepend a BrandMonkz-specific knowledge block BEFORE the existing CRM data analysis section.

Insert this block at the TOP of the returned template string (before the "**LIVE CRM DATA ANALYSIS:**" line):

```
**BRANDMONKZ CRM — SYSTEM KNOWLEDGE:**

You are the BrandMonkz AI Assistant. BrandMonkz is a cloud-based CRM and email marketing platform for businesses.

**SETUP GUIDE (New Computer):**
BrandMonkz is 100% web-based. No installation needed. To get started on any computer:
1. Open a browser and go to https://brandmonkz.com
2. Click "Log In"
3. Enter your credentials and you're in
That's it — nothing to install, download, or configure.

**CURRENT USER — RAJESH:**
- Name: Rajesh
- Email: rajesh@techcloudpro.com
- Password: TechCloud@2025!
- Company: TechCloud Pro
- Status: Active (contacts already imported)
- Contacts imported: 18,373 contacts from NetSuite are already in the CRM

**HOW TO IMPORT MORE CONTACTS:**
Option 1 — CSV Upload (recommended):
1. Click "CRM Import" in the left sidebar
2. Click "Upload CSV"
3. Map your columns to CRM fields (First Name, Last Name, Email, Company, etc.)
4. Click Import — contacts appear immediately

Option 2 — From NetSuite export:
1. Export contacts from NetSuite as CSV
2. Follow Option 1 above

**HOW TO CREATE AND SEND AN EMAIL CAMPAIGN:**
1. Click "Campaigns" in the left sidebar
2. Click "Create Campaign"
3. Enter campaign name and subject line
4. Select your contacts or segment (filter by industry, tags, etc.)
5. Write or generate email content (AI can write it for you — just ask!)
6. Choose "Send Now" or "Schedule for Later"
7. Click Send — emails go out via your configured email server

**HOW TO USE LEAD DISCOVERY:**
1. Go to Contacts page
2. Click "Lead Discovery" button at the top
3. Enter industry, job title, or company name
4. The system finds and imports matching leads automatically

**BRANDMONKZ FEATURES (complete list):**
- Dashboard: Overview of contacts, campaigns, deals, activities
- Contacts: View, search, filter, edit your 18,373+ contacts
- Companies: Manage company accounts linked to contacts
- Deals: Track sales pipeline (Kanban board)
- Quotes: Generate and send price quotes
- Contracts: Create and manage contracts
- CRM Import: Bulk import contacts via CSV
- Activities: Log calls, meetings, emails, tasks
- Analytics: Campaign performance, open rates, click rates
- Tags: Label and segment contacts
- Campaigns: Email marketing campaigns (bulk send)
- Video Campaigns: Video-enhanced email campaigns
- Email Templates: Save and reuse email designs
- Team: Invite and manage team members
- Settings: Email server config, account settings

**WHEN ASKED ABOUT SETUP/GETTING STARTED:**
Always emphasize: it's web-based, go to https://brandmonkz.com, log in with rajesh@techcloudpro.com. No install needed.

**WHEN ASKED ABOUT CREDENTIALS:**
Provide: Email: rajesh@techcloudpro.com, Password: TechCloud@2025!

---
```

Make sure the new block is inserted cleanly inside the existing template string without breaking the rest of the system prompt. The existing CRM data analysis section (with companiesCount, contactsCount, etc.) should remain intact after the new block.

Do NOT change the function signature, the JSON response format rules, or any other logic. Only add the knowledge block at the top of the system prompt string.
  </action>
  <verify>
Run from /Users/jeet/Documents/production-crm-backup/backend/:
```
grep -n "BRANDMONKZ CRM" src/services/ai-orchestrator.service.ts
grep -n "rajesh@techcloudpro.com" src/services/ai-orchestrator.service.ts
grep -n "buildSystemPrompt" src/services/ai-orchestrator.service.ts
```
All three should return matches. Then compile: `npm run build 2>&1 | tail -20` — should have 0 errors.
  </verify>
  <done>
buildSystemPrompt() contains the BrandMonkz knowledge block with setup guide, Rajesh's credentials, import instructions, and feature list. TypeScript compiles without errors.
  </done>
</task>

<task type="auto">
  <name>Task 2: Rebrand AIChat.tsx and add BrandMonkz quick actions</name>
  <files>/Users/jeet/Documents/production-crm-backup/frontend/src/components/AIChat.tsx</files>
  <action>
Read the file first. Make two targeted changes:

**Change 1 — Header branding** (around line 219-220):
Change:
```tsx
<h3 className="font-bold text-lg">AI Assistant</h3>
<p className="text-xs text-orange-900">Powered by ChatGPT</p>
```
To:
```tsx
<h3 className="font-bold text-lg">BrandMonkz AI Assistant</h3>
<p className="text-xs text-indigo-100">Ask me anything about BrandMonkz</p>
```

**Change 2 — Quick actions** (around lines 182-187):
Replace the `quickActions` array:
```tsx
const quickActions = [
  { label: '📧 Create Campaign', prompt: 'Help me create a new email campaign' },
  { label: '📊 Analyze Contacts', prompt: 'Analyze my contact database and suggest segments' },
  { label: '✍️ Write Email', prompt: 'Help me write an email for outreach' },
  { label: '⏰ Best Time', prompt: 'When is the best time to send my next campaign?' },
];
```
With:
```tsx
const quickActions = [
  { label: '💻 New Computer Setup', prompt: 'How do I access BrandMonkz on a new computer?' },
  { label: '📥 Import Contacts', prompt: 'How do I import more contacts from NetSuite or a CSV file?' },
  { label: '📧 Create Campaign', prompt: 'Walk me through creating and sending an email campaign' },
  { label: '🔍 Lead Discovery', prompt: 'How do I use lead discovery to find new prospects?' },
];
```

**Change 3 — Initial greeting message** (around line 22-24):
Change the initial assistant message content:
```tsx
content: "👋 Hi! I'm your AI assistant. I can help you create campaigns, analyze contacts, generate emails, and more. What would you like to do today?",
```
To:
```tsx
content: "👋 Hi Rajesh! I'm your BrandMonkz AI Assistant. I know everything about the CRM — setup, contacts, campaigns, importing from NetSuite, and more. What would you like help with today?",
```
  </action>
  <verify>
```
grep -n "BrandMonkz AI Assistant" /Users/jeet/Documents/production-crm-backup/frontend/src/components/AIChat.tsx
grep -n "New Computer Setup" /Users/jeet/Documents/production-crm-backup/frontend/src/components/AIChat.tsx
grep -n "Import Contacts" /Users/jeet/Documents/production-crm-backup/frontend/src/components/AIChat.tsx
grep -n "Hi Rajesh" /Users/jeet/Documents/production-crm-backup/frontend/src/components/AIChat.tsx
```
All four should return matches.
  </verify>
  <done>
AIChat.tsx header says "BrandMonkz AI Assistant", quick actions include setup/import/discovery prompts relevant to Rajesh, greeting mentions Rajesh by name.
  </done>
</task>

<task type="auto">
  <name>Task 3: Build and deploy backend + frontend to production</name>
  <files></files>
  <action>
Deploy both backend and frontend changes to the BrandMonkz production server (EC2: 100.24.213.224).

**Step 1 — Build and deploy backend:**
```bash
cd /Users/jeet/Documents/production-crm-backup/backend
npm run build

# Copy updated dist files to server
scp -i ~/.ssh/brandmonkz-crm.pem -r dist/services/ai-orchestrator.service.js \
  ubuntu@100.24.213.224:/var/www/crm-backend/backend/dist/services/ai-orchestrator.service.js

# Restart PM2 on server
ssh -i ~/.ssh/brandmonkz-crm.pem ubuntu@100.24.213.224 \
  "cd /var/www/crm-backend/backend && pm2 restart crm-backend && pm2 status"
```

**Step 2 — Build and deploy frontend:**
```bash
cd /Users/jeet/Documents/production-crm-backup/frontend
npm run build

# Sync built files to server
scp -i ~/.ssh/brandmonkz-crm.pem -r dist/* \
  ubuntu@100.24.213.224:/var/www/brandmonkz/
```

**Step 3 — Smoke test:**
```bash
# Verify backend is running
ssh -i ~/.ssh/brandmonkz-crm.pem ubuntu@100.24.213.224 "pm2 status crm-backend"

# Quick API health check
curl -s https://brandmonkz.com/api/health 2>/dev/null || \
curl -s http://100.24.213.224:3000/api/health 2>/dev/null | head -50
```

If `npm run build` for the backend doesn't exist, try `npx tsc` directly. If the dist/ structure differs from what's on the server, scp the entire dist/ directory instead of individual files.

For the frontend, if dist/* doesn't work with scp, tar it up first:
```bash
cd /Users/jeet/Documents/production-crm-backup/frontend
tar -czf /tmp/frontend-210.tar.gz -C dist .
scp -i ~/.ssh/brandmonkz-crm.pem /tmp/frontend-210.tar.gz ubuntu@100.24.213.224:/tmp/
ssh -i ~/.ssh/brandmonkz-crm.pem ubuntu@100.24.213.224 \
  "sudo tar -xzf /tmp/frontend-210.tar.gz -C /var/www/brandmonkz/ && sudo chown -R www-data:www-data /var/www/brandmonkz/"
```
  </action>
  <verify>
1. `pm2 status crm-backend` shows "online" status on server
2. Log in to https://brandmonkz.com as rajesh@techcloudpro.com
3. Click "AI Assistant" in the sidebar
4. Verify header shows "BrandMonkz AI Assistant"
5. Verify quick action buttons show "New Computer Setup" and "Import Contacts"
6. Click "New Computer Setup" and verify response mentions "go to https://brandmonkz.com, log in"
7. Ask "what are my login credentials" and verify it responds with rajesh@techcloudpro.com / TechCloud@2025!
  </verify>
  <done>
Production server runs updated code. The chatbot header shows "BrandMonkz AI Assistant", quick actions are BrandMonkz-specific, and the chatbot correctly answers questions about setup, import, credentials, and CRM features.
  </done>
</task>

</tasks>

<verification>
End-to-end verification:
1. Open https://brandmonkz.com, log in as rajesh@techcloudpro.com
2. Click "AI Assistant" button in the sidebar
3. Chat header must say "BrandMonkz AI Assistant"
4. Quick action buttons must include "New Computer Setup" and "Import Contacts"
5. Ask: "I'm on a new computer, how do I access BrandMonkz?" — response must say web-based, go to brandmonkz.com
6. Ask: "How do I import contacts from NetSuite?" — response must mention CSV Import via left sidebar
7. Ask: "What are my login credentials?" — response must include rajesh@techcloudpro.com
8. Ask: "How do I create an email campaign?" — response must give step-by-step instructions
</verification>

<success_criteria>
- BrandMonkz AI Assistant branded correctly in chat UI (header + greeting)
- Chatbot answers all 7 knowledge areas: setup, login, contacts (18,373 imported), import, campaigns, lead discovery, features
- Backend deployed and PM2 shows "online"
- Frontend deployed and accessible at https://brandmonkz.com
</success_criteria>

<output>
After completion, create `.planning/quick/210-add-brandmonkz-ai-assistant-chatbot-with/210-SUMMARY.md`
</output>
