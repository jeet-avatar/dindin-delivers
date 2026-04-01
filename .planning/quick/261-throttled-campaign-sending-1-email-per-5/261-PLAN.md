---
phase: quick-261
plan: 01
type: execute
wave: 1
autonomous: true
files_modified:
  - /Users/jeet/Documents/production-crm-backup/backend/src/routes/campaigns.ts
---

<objective>
Add throttled campaign sending — 1 email every 5 minutes via in-memory queue with setInterval. Email validation before send. Progress tracking via DB + live status endpoint.
</objective>

<tasks>

<task type="auto">
  <name>Task 1: Add throttled send + progress endpoint to campaigns.ts</name>
  <files>/Users/jeet/Documents/production-crm-backup/backend/src/routes/campaigns.ts</files>
  <action>
  Add to campaigns.ts (BEFORE the /:id route to avoid route shadowing):

  1. **In-memory send queue** at module level:
     ```
     const activeSendJobs = new Map<string, { timer: NodeJS.Timeout; queue: any[]; sent: number; failed: number; total: number; status: string }>()
     ```

  2. **Email validator** helper:
     ```
     function isValidEmail(email: string): boolean {
       return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
     }
     ```

  3. **POST /api/campaigns/:id/send-throttled** endpoint:
     - Takes optional `intervalMinutes` from body (default 5, min 1, max 30)
     - Gets campaign with companies + contacts (same as existing :id/send)
     - Validates each email, skips invalid
     - Sets campaign status to 'SENDING'
     - Creates a sendJob in activeSendJobs Map
     - Starts setInterval that:
       - Pops next contact from queue
       - Calls sendEmail(to, subject, html, userId) with template var replacement
       - Creates emailLog entry
       - Updates campaign.totalSent in DB every 5 sends
       - When queue empty: clears interval, sets status to 'SENT', removes from Map
     - Returns immediately: { campaignId, total, invalid, intervalMinutes, message }

  4. **GET /api/campaigns/:id/send-progress** endpoint:
     - Checks activeSendJobs Map for live job
     - If found: returns { status: 'sending', sent, failed, total, remaining, nextSendIn }
     - If not found: reads from DB (campaign.totalSent, emailLog counts)
     - Returns { status, sent, failed, total }

  5. **Update quick-send** to use throttled send:
     - Instead of sending in a loop, create the campaign + link companies
     - Then call the same throttled queue logic (reuse startThrottledSend helper)
     - Return immediately with { campaignId, total, intervalMinutes, message: "Campaign queued. Sending 1 email every X minutes." }

  IMPORTANT: Place send-throttled and send-progress routes BEFORE the /:id route.
  </action>
  <verify>
    grep -n "send-throttled\|send-progress\|activeSendJobs\|isValidEmail\|setInterval" /Users/jeet/Documents/production-crm-backup/backend/src/routes/campaigns.ts | head -10
  </verify>
  <done>Throttled send endpoint, progress endpoint, email validation, and updated quick-send all working</done>
</task>

</tasks>
