---
phase: quick-259
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/Documents/production-crm-backup/backend/src/routes/campaigns.ts
autonomous: true
requirements: [MULTI-TENANT-EMAIL]
must_haves:
  truths:
    - "Campaign send uses ONLY the sending user's verified EmailServerConfig from DB"
    - "If user has no verified EmailServerConfig, campaign send returns an error — never falls back to env SMTP or SES"
    - "Env var SMTP and SES functions still exist in file but are NOT called from campaign send paths"
  artifacts:
    - path: "/Users/jeet/Documents/production-crm-backup/backend/src/routes/campaigns.ts"
      provides: "Multi-tenant campaign email sending"
      contains: "No verified email server configured"
  key_links:
    - from: "sendEmail()"
      to: "getUserEmailServer()"
      via: "DB lookup of user's verified EmailServerConfig"
      pattern: "getUserEmailServer"
---

<objective>
Make campaign email sending fully multi-tenant by removing env var SMTP and SES fallbacks from the campaign send path. Each tenant must configure their own EmailServerConfig via the DB. If no verified server is found for the sending user, return an error instead of silently falling back.

Purpose: Prevent tenant A's campaigns from sending through tenant B's (or the system's) SMTP credentials.
Output: Modified campaigns.ts deployed to EC2, PM2 restarted.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/Documents/production-crm-backup/backend/src/routes/campaigns.ts
@/Users/jeet/Documents/production-crm-backup/backend/src/routes/emailServers.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Modify sendEmail() to require per-user EmailServerConfig for campaigns</name>
  <files>/Users/jeet/Documents/production-crm-backup/backend/src/routes/campaigns.ts</files>
  <action>
  READ the current campaigns.ts first (it has been modified multiple times today — do NOT assume contents match planning context).

  Then make these specific changes:

  1. **Modify `sendEmail()` function (currently ~line 552):**
     - Remove the fallback to `sendEmailViaEnvSMTP()`. Instead, if no user's verified EmailServerConfig is found, THROW an error: `throw new Error('No verified email server configured. Please add and verify an email server in Settings.')`.
     - If `userId` is not provided, also throw: `throw new Error('userId is required for campaign sends')`.
     - Keep the call to `getUserEmailServer()` and `sendEmailViaSMTP()` — that path is correct.

  2. **Keep `sendEmailViaEnvSMTP()` and `sendEmailViaSES()` functions intact** — they stay in the file for potential system email use, but they are NOT called from `sendEmail()` anymore.

  3. **Update the `/:id/send` route (currently ~line 565):**
     - Before the contact send loop, add an early check: call `getUserEmailServer(userId!)` and if null, return `res.status(400).json({ error: 'No verified email server configured. Please add and verify an email server in Settings before sending campaigns.' })` immediately — do NOT enter the loop.
     - The `fromEmail` variable (currently ~line 616) should ONLY use `userServer?.fromEmail` — remove the fallback chain `|| process.env.SMTP_USER || 'noreply@brandmonkz.com'`. If `userServer` is null, we already returned 400 above, so `userServer!.fromEmail` is safe.

  4. **Update the `/quick-send` route (currently ~line 812):**
     - Same early check: after getting `userId`, call `getUserEmailServer(userId)` and if null, return 400 with same error message.
     - The `bulkFromEmail` variable (currently ~line 891) should ONLY use `bulkUserServer?.fromEmail` — remove the `|| SES_FROM_EMAIL` fallback. Since we checked above, `bulkUserServer!.fromEmail` is safe.

  5. **Do NOT modify:** `getUserEmailServer()`, `sendEmailViaSMTP()`, AI generation routes, mock-send route, campaign CRUD routes.
  </action>
  <verify>
  Run TypeScript transpile check:
  ```bash
  cd /Users/jeet/Documents/production-crm-backup/backend
  npx ts-node -e "const ts = require('typescript'); const result = ts.transpileModule(require('fs').readFileSync('src/routes/campaigns.ts', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.CommonJS, esModuleInterop: true, strict: false } }); console.log('Transpile OK, output length:', result.outputText.length)"
  ```
  Then grep to confirm:
  - `grep -n "sendEmailViaEnvSMTP" src/routes/campaigns.ts` — should NOT appear inside `sendEmail()` body, should still exist as a standalone function
  - `grep -n "No verified email server" src/routes/campaigns.ts` — should appear in sendEmail(), /:id/send route, and /quick-send route (3 occurrences)
  </verify>
  <done>
  - `sendEmail()` only uses per-user EmailServerConfig, throws if none found
  - `/:id/send` returns 400 early if no verified server
  - `/quick-send` returns 400 early if no verified server
  - File transpiles without errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Deploy to EC2 and verify via PM2 logs</name>
  <files>/Users/jeet/Documents/production-crm-backup/backend/src/routes/campaigns.ts</files>
  <action>
  1. **Backup current production file on EC2:**
     ```bash
     ssh -i ~/.ssh/techcloudpro-key.pem ubuntu@ec2-IP "cp /home/ubuntu/production-crm/backend/src/routes/campaigns.ts /home/ubuntu/production-crm/backend/src/routes/campaigns.ts.bak.$(date +%Y%m%d_%H%M%S)"
     ```

  2. **Copy modified file to EC2:**
     ```bash
     scp -i ~/.ssh/techcloudpro-key.pem /Users/jeet/Documents/production-crm-backup/backend/src/routes/campaigns.ts ubuntu@ec2-IP:/home/ubuntu/production-crm/backend/src/routes/campaigns.ts
     ```

  3. **Restart PM2 on EC2:**
     ```bash
     ssh -i ~/.ssh/techcloudpro-key.pem ubuntu@ec2-IP "cd /home/ubuntu/production-crm/backend && pm2 restart all"
     ```

  4. **Check PM2 logs for startup errors:**
     ```bash
     ssh -i ~/.ssh/techcloudpro-key.pem ubuntu@ec2-IP "pm2 logs --lines 30 --nostream"
     ```

  NOTE: Find the actual EC2 IP and SSH key path by checking:
  - `~/.ssh/config` for host aliases
  - Or ask the user for the EC2 connection details
  - Or check `.planning/` for prior deployment notes with the connection info
  </action>
  <verify>
  - PM2 shows "online" status after restart
  - PM2 logs show no startup errors
  - `pm2 status` shows the backend process running
  </verify>
  <done>
  - Modified campaigns.ts deployed to production EC2
  - PM2 restarted successfully with no errors
  - Old file backed up with timestamp
  </done>
</task>

</tasks>

<verification>
- `sendEmail()` in campaigns.ts no longer calls `sendEmailViaEnvSMTP()` or `sendEmailViaSES()`
- Both campaign send routes (`/:id/send` and `/quick-send`) return 400 if user has no verified EmailServerConfig
- PM2 running without errors on EC2
</verification>

<success_criteria>
- Campaign sends use ONLY the authenticated user's verified EmailServerConfig from DB
- No silent fallback to env var SMTP or SES for campaign paths
- Users without a configured email server get a clear 400 error message
- Production server running without errors
</success_criteria>

<output>
After completion, create `.planning/quick/259-fix-brandmonkz-campaign-email-to-be-full/259-SUMMARY.md`
</output>
