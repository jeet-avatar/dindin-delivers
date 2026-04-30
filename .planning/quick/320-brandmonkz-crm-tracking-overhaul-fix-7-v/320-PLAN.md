---
phase: 320-brandmonkz-crm-tracking-overhaul
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /var/www/crm-backend/.env
  - /var/www/crm-backend/dist/routes/followUps.js
  - /var/www/crm-backend/dist/routes/campaigns.js
  - /opt/tcp-daily-report/daily-tcp-report.js
autonomous: true
requirements:
  - GAP-01-messageId-not-saved
  - GAP-02-resend-webhook-secret-missing
  - GAP-03-daily-report-scope-hardcoded
  - GAP-04-daily-report-no-bounce-columns
  - GAP-05-daily-report-pixel-bot-metrics
  - GAP-06-no-bounced-filter-pre-send
  - GAP-07-no-email-to-visit-attribution

must_haves:
  truths:
    - "Production-impacting: live edits to BrandMonkz EC2 send code + tcp-daily-report (rajesh + jm read it daily 8 AM IST)"
    - "Rajesh login is the canary — pre/post HTTP 401 + 'Invalid credentials' body MUST be byte-identical at every phase boundary"
    - "Daily report systemd timer is STOPPED before any code edit, RE-ENABLED only after dry-render inspection passes"
    - "RESEND_WEBHOOK_SECRET (whsec_rB4WBIbo5HcOx1qT0+CF28dAb34U3V0s) lives in /var/www/crm-backend/.env only — never in git, never in commit messages, never in pm2 logs"
    - "All 4 file edits backed up with .bak.q320-${TS} suffix BEFORE any change"
    - "pm2 reload (NOT restart) is used — preserves Rajesh's active sessions"
    - "Memory rules respected: NEVER surface totalOpens/suspectedForwards/uniqueIPs/wasForwarded as engagement (pixel-bot metrics)"
    - "Bot filter v3 at ingest layer (emailTracking.js + tracking.js) is UNTOUCHED — only the report consumer changes"
    - "Cloudflare WAF blocks default curl on brandmonkz.com — every external curl uses Safari UA + Origin header"
    - "Daily report dry-render writes to /tmp/daily-report-dry-${TS}.html — does NOT email rajesh/jm during deploy"
    - "Real-deliverable test mailbox (jeetnair.in+320-...@gmail.com) used for synthetic send — never fabricated domains"
  artifacts:
    - path: /var/www/crm-backend/.env
      provides: "RESEND_WEBHOOK_SECRET appended (single new line)"
      contains: "RESEND_WEBHOOK_SECRET="
    - path: /var/www/crm-backend/dist/routes/followUps.js
      provides: "messageId capture from Resend send response + BOUNCED filter pre-send"
      contains: "messageId"
    - path: /var/www/crm-backend/dist/routes/campaigns.js
      provides: "BOUNCED filter pre-send (matches followUps.js pattern)"
      contains: "BOUNCED"
    - path: /opt/tcp-daily-report/daily-tcp-report.js
      provides: "Generalized peter@ scope + Deliverability section + Prospect Journey section + ZERO pixel-bot fields"
      contains: "Deliverability"
    - path: /var/www/crm-backend/dist/routes/followUps.js.bak.q320-${TS}
      provides: "Pre-edit backup"
    - path: /var/www/crm-backend/dist/routes/campaigns.js.bak.q320-${TS}
      provides: "Pre-edit backup"
    - path: /opt/tcp-daily-report/daily-tcp-report.js.bak.q320-${TS}
      provides: "Pre-edit backup"
    - path: /var/www/crm-backend/.env.bak.q320-${TS}
      provides: "Pre-edit backup"
  key_links:
    - from: "Resend dashboard webhook (peter@ account)"
      to: "/api/webhooks/resend on brandmonkz.com"
      via: "svix signature header gated by RESEND_WEBHOOK_SECRET in .env"
      pattern: "RESEND_WEBHOOK_SECRET"
    - from: "followUps.js send-video handler"
      to: "email_logs.messageId column"
      via: "Resend SDK response.id captured into emailLog row insert"
      pattern: "messageId.*resend|resend.*messageId|response\\.id|response\\.data\\.id"
    - from: "followUps.js + campaigns.js send paths"
      to: "email_logs WHERE status='BOUNCED' check"
      via: "pre-send query filter (alongside existing email_unsubscribes filter)"
      pattern: "status.*BOUNCED|BOUNCED.*status"
    - from: "daily-tcp-report.js Prospect Journey section"
      to: "JOIN email_logs ↔ website_visits"
      via: "lower(toEmail) = lower(visitor_email) within 7-day window (UTM hint as tiebreaker)"
      pattern: "JOIN.*website_visits|website_visits.*JOIN"
---

<objective>
Close 7 verified gaps in BrandMonkz CRM email tracking so peter@techcloudpro.com campaign emails are FULLY tracked end-to-end (sends → bounces → opens → clicks → on-site visits) and surface in the 02:30 UTC daily report consumed by rajesh@ + jm@.

Purpose:
- Today's daily report omits bounces entirely, hardcodes scope to TCP_V6 + STAFF_AUG campaigns only, and still presents pixel-based opens (which are 60-90% bot/proxy noise per memory rule).
- Resend webhook is deployed but dormant (RESEND_WEBHOOK_SECRET missing from .env → 401 to all callers).
- messageId is dropped on every send, so we can NEVER correlate a Resend bounce/complaint event back to our email_logs row.
- BrandMonkz keeps re-sending to BOUNCED addresses, which is sender-reputation suicide.
- No JOIN exists between email_logs and website_visits — we can't tell when a recipient clicked through and watched a video.

Output:
- Patched .env (1 new line) + 3 patched JS files + 1 rewritten daily report + 4 backup files
- 10 verification batteries (A-J) all PASS before timer is re-armed
- Memory rules respected: bot-filter-v3 at ingest layer untouched; pixel-bot fields removed from report consumer
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/doordash-p2p/CLAUDE.md
@/Users/jeet/doordash-p2p/.planning/STATE.md
@/Users/jeet/.claude/handoffs/2026-04-29-tcp-v6-retargeting-bot-filter-v3-and-cf-watch-broken.md
@/Users/jeet/.claude/projects/-Users-jeet-doordash-p2p/memory/feedback_no_pixel_based_engagement_metrics.md
@/Users/jeet/.claude/projects/-Users-jeet-doordash-p2p/memory/reference_brandmonkz_bot_filter_at_ingest.md
@/Users/jeet/.claude/projects/-Users-jeet-doordash-p2p/memory/feedback_smoke_test_real_mailbox.md
</context>

<production_constraints>

## NON-NEGOTIABLE rules — violating any of these = STOP-and-ASK

1. **Rajesh login is the canary.** Run BEFORE every phase, AFTER every pm2 reload:
   ```bash
   TS=$(date +%s)
   curl -s -A 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15' \
     -X POST https://brandmonkz.com/api/auth/login \
     -H 'Content-Type: application/json' \
     -H 'Origin: https://brandmonkz.com' \
     -d "{\"email\":\"rajesh@techcloudpro.com\",\"password\":\"PROBE_${TS}\"}" \
     -o /tmp/q320-login-${TS}.body -w '%{http_code}'
   ```
   - Expected: HTTP 401 + body contains literal string "Invalid credentials"
   - If response code != 401 OR body doesn't contain "Invalid credentials" → **GATE κ FIRES — STOP, rollback last edit, do NOT continue**

2. **pm2 reload (NOT restart).** `pm2 reload crm-backend` graceful-restarts workers without dropping in-flight requests; `pm2 restart` kills sessions. NEVER use restart in this plan.

3. **Cron stop is mandatory before phase 2.** `sudo systemctl stop tcp-daily-report.timer` BEFORE any .env or code edit. The 02:30 UTC fire window must NOT hit a half-deployed state. Cron re-arm is the LAST step (Phase 6).

4. **All edits backed up first.** For every file you touch:
   ```bash
   TS=$(date +%s)
   sudo cp <FILE> <FILE>.bak.q320-${TS}
   ```
   Verify backup exists with `ls -la <FILE>.bak.q320-*` before editing.

5. **RESEND_WEBHOOK_SECRET hygiene.** The user-provided value `whsec_rB4WBIbo5HcOx1qT0+CF28dAb34U3V0s`:
   - Goes into `/var/www/crm-backend/.env` ONLY (one line: `RESEND_WEBHOOK_SECRET=whsec_...`)
   - NEVER appears in commit messages
   - NEVER appears in pm2 logs (set via `echo "RESEND_WEBHOOK_SECRET=$VAL" | sudo tee -a .env` where $VAL is a shell var, then `unset VAL`)
   - NEVER appears in this plan's output, summary, or chat verbatim — when proving it's set, use `grep -c '^RESEND_WEBHOOK_SECRET=' .env` (returns count, not value)

6. **Cloudflare WAF rule.** Every external curl to brandmonkz.com MUST include:
   - `-A 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15'`
   - `-H 'Origin: https://brandmonkz.com'`
   Default curl UA → 403 from CF, NOT from app.

7. **Real-deliverable test mailbox.** Synthetic send tests use `jeetnair.in+320-msgid-${TS}@gmail.com` ONLY. NEVER fabricated domains (per memory rule — they bounce, hurt sender reputation, leave orphan rows).

8. **Memory rules — pixel-bot metrics.** The daily report rewrite MUST NOT emit any of: `totalOpens`, `uniqueOpens`, `suspectedForwards`, `wasForwarded`, `uniqueIPs`. These are bot noise. Use only:
   - `email_logs.status` (SENT / DELIVERED / BOUNCED / COMPLAINED — driven by Resend webhook)
   - `email_tracking_events WHERE eventType='CLICK'` (link-wrap clicks — bot-filter-v3 at ingest)
   - `website_visits` (JS-fired — bot-filter-v3 at ingest)

9. **Bot filter v3 is UNTOUCHED.** emailTracking.js + tracking.js were modified Apr 29 19:07 UTC (per memory `reference_brandmonkz_bot_filter_at_ingest.md`). This plan does NOT touch them. Only `/api/webhooks/resend` ingest path and report consumer change.

10. **SSH security group.** Open SG → do work → close SG. Always.
    ```bash
    aws ec2 authorize-security-group-ingress --group-id sg-03f88e30ec99c3b26 --protocol tcp --port 22 --cidr $(curl -s ifconfig.me)/32 --region us-east-1
    # ... work ...
    aws ec2 revoke-security-group-ingress --group-id sg-03f88e30ec99c3b26 --protocol tcp --port 22 --cidr $(curl -s ifconfig.me)/32 --region us-east-1
    ```

</production_constraints>

<stop_and_ask_gates>

5 explicit STOP-ask gates. If ANY fires, halt immediately, capture state, surface to user — do NOT continue.

- **Gate ι (pm2 reload error).** `pm2 reload crm-backend` exits non-zero or shows "errored" status post-reload → STOP, restore most recent backup, surface pm2 logs.
- **Gate κ (Rajesh login regression).** Post-reload login probe returns code != 401, OR body missing "Invalid credentials" → STOP, restore backup, restart pm2, re-probe. If still broken → escalate.
- **Gate λ (daily report dry-render SQL error).** `node daily-tcp-report.js --dry-run > /tmp/daily-report-dry-${TS}.html 2>&1` exits non-zero or output contains SQL syntax errors / Postgres errors → STOP, do NOT re-arm cron until fixed. Restore backup if needed.
- **Gate μ (webhook smoke unexpected 500).** `curl -X POST https://brandmonkz.com/api/webhooks/resend -H 'svix-signature: v1,invalid' ...` returns 500 (server error) instead of 401 (invalid signature) → STOP, code path broken, restore .env to pre-secret state, reload pm2.
- **Gate ν (synthetic send fails entirely).** Synthetic POST to /api/follow-ups/send-video returns 500 / Resend rejection / unhandled exception (NOT just messageId null) → STOP, regression in send code, restore followUps.js backup, reload pm2.

If ANY gate fires:
1. Capture: `pm2 logs crm-backend --lines 200 > /tmp/q320-pm2-gate-${GATE}.log`
2. Restore most recent backup (cp .bak.q320-${TS} → original)
3. `pm2 reload crm-backend`
4. Re-probe Rajesh login
5. Surface to user with gate name + pm2 log + state of cron timer

</stop_and_ask_gates>

<tasks>

<task type="auto">
  <name>Task 1: Pre-flight + cron stop + .env update + webhook smoke (Phases 1-2)</name>
  <files>
    /var/www/crm-backend/.env
    /var/www/crm-backend/.env.bak.q320-${TS}
  </files>
  <action>
**Phase 0 — Pre-flight baseline (LOCAL):**
1. Open SG for SSH: `aws ec2 authorize-security-group-ingress ...` (see production_constraints rule 10).
2. Run Rajesh login probe (production_constraints rule 1) — record HTTP code + body. Save to `/tmp/q320-baseline-login.txt`. **MUST be HTTP 401 + body contains "Invalid credentials"**. If not → halt, do NOT proceed.
3. Confirm cron timer is currently active: `ssh ec2-user@100.24.213.224 'sudo systemctl status tcp-daily-report.timer'`. Record state.

**Phase 1 — Stop cron (EC2):**
4. SSH in. Run `sudo systemctl stop tcp-daily-report.timer`.
5. Verify stopped: `sudo systemctl status tcp-daily-report.timer` should show `Active: inactive (dead)` or `loaded` without `active`.
6. Confirm next fire is gone: `systemctl list-timers | grep tcp-daily-report` should be empty or show no upcoming run.

**Phase 2a — Backup .env:**
7. `TS=$(date +%s); sudo cp /var/www/crm-backend/.env /var/www/crm-backend/.env.bak.q320-${TS}`
8. Verify backup: `sudo ls -la /var/www/crm-backend/.env.bak.q320-*` — must exist with non-zero size.

**Phase 2b — Read .env and confirm RESEND_WEBHOOK_SECRET is NOT set:**
9. `sudo grep -c '^RESEND_WEBHOOK_SECRET=' /var/www/crm-backend/.env` — MUST return 0 (gap verified). If returns ≥1, the secret is somehow already there → STOP, surface to user, do not append.

**Phase 2c — Append secret WITHOUT echoing it to logs:**
10. Use shell variable from user-provided memory (NOT typed in script visible to logs):
    ```bash
    # User-provided value lives in shell var only, never written to disk other than .env
    SECRET='whsec_rB4WBIbo5HcOx1qT0+CF28dAb34U3V0s'
    echo "RESEND_WEBHOOK_SECRET=${SECRET}" | sudo tee -a /var/www/crm-backend/.env > /dev/null
    unset SECRET
    ```
11. Verify presence WITHOUT printing value: `sudo grep -c '^RESEND_WEBHOOK_SECRET=' /var/www/crm-backend/.env` → MUST return 1.
12. Verify length is plausible (whsec_ prefix + ~40 chars): `sudo awk -F= '/^RESEND_WEBHOOK_SECRET=/{print length($2)}' /var/www/crm-backend/.env` → expect ~45-50.
13. **DO NOT cat or print the value.**

**Phase 2d — pm2 reload + post-reload login probe:**
14. `pm2 reload crm-backend` (NOT restart). Wait for "online" status.
15. **GATE ι check:** `pm2 list | grep crm-backend` — status MUST be "online", NOT "errored" / "stopped".
16. Run Rajesh login probe again. **GATE κ check:** HTTP 401 + body "Invalid credentials" — MUST match baseline byte-for-byte. Diff against `/tmp/q320-baseline-login.txt`.

**Phase 2e — Webhook smoke (proves signature gate is now active):**
17. From local machine:
    ```bash
    curl -s -X POST https://brandmonkz.com/api/webhooks/resend \
      -A 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15' \
      -H 'Origin: https://brandmonkz.com' \
      -H 'Content-Type: application/json' \
      -H 'svix-signature: v1,deadbeef' \
      -H 'svix-id: msg_q320_test' \
      -H 'svix-timestamp: 0' \
      -d '{"type":"email.bounced","data":{}}' \
      -o /tmp/q320-webhook-smoke.body -w '%{http_code}\n'
    ```
18. Expected: HTTP 401 + body containing "invalid signature" or similar (NOT 500, NOT 200).
19. **GATE μ check:** if HTTP 500 → STOP, restore .env backup, reload pm2, re-probe Rajesh.
20. If HTTP 200 → bug: signature gate is bypassed → STOP, surface, do not continue.
21. **Optional but recommended:** in Resend dashboard → Webhooks → "Send test event" for `email.bounced` → tail `pm2 logs crm-backend --lines 50` → look for successful 200 + log line showing event received. Document outcome (test events may use stub messageId — that's expected).

**Phase 2f — Final pre-Task-2 baseline:**
22. Re-probe Rajesh login one more time. Confirm 401 + "Invalid credentials".
23. Save state checkpoint: `/tmp/q320-task1-complete.txt` with timestamp + last login probe code.
  </action>
  <verify>
- Battery A (Pre-flight Rajesh): `cat /tmp/q320-baseline-login.txt` shows HTTP 401 + body containing "Invalid credentials"
- Battery B (Cron stopped): `ssh ec2 'sudo systemctl status tcp-daily-report.timer'` shows inactive
- Battery C (Secret in .env): `ssh ec2 'sudo grep -c ^RESEND_WEBHOOK_SECRET= /var/www/crm-backend/.env'` returns 1; awk length probe returns plausible length (~45-50). VALUE NOT echoed.
- Battery D (Webhook smoke): `cat /tmp/q320-webhook-smoke.body` shows HTTP 401 + "invalid signature" body
- Battery E (Optional Resend dashboard test): pm2 logs show event received (capture log snippet)
- Post-Task-1 Rajesh login still HTTP 401 + "Invalid credentials" (byte-identical to baseline)
  </verify>
  <done>
- /var/www/crm-backend/.env has exactly 1 line matching `^RESEND_WEBHOOK_SECRET=whsec_` (count=1)
- /var/www/crm-backend/.env.bak.q320-${TS} exists with non-zero size
- tcp-daily-report.timer is `inactive (dead)`
- pm2 crm-backend status = `online`
- /api/webhooks/resend returns 401 to invalid-signature requests (was 401 due to missing secret before, now 401 due to signature mismatch — semantically different but same code preserves Rajesh login)
- Rajesh login probe returns HTTP 401 + "Invalid credentials" — byte-identical to pre-Task-1 baseline
  </done>
</task>

<task type="auto">
  <name>Task 2: Send-code patches (messageId capture + BOUNCED filter pre-send) (Phases 3-4)</name>
  <files>
    /var/www/crm-backend/dist/routes/followUps.js
    /var/www/crm-backend/dist/routes/followUps.js.bak.q320-${TS}
    /var/www/crm-backend/dist/routes/campaigns.js
    /var/www/crm-backend/dist/routes/campaigns.js.bak.q320-${TS}
  </files>
  <action>
**Phase 3 — Patch followUps.js to capture Resend messageId:**

3a. Backup BEFORE reading: `TS=$(date +%s); sudo cp /var/www/crm-backend/dist/routes/followUps.js /var/www/crm-backend/dist/routes/followUps.js.bak.q320-${TS}`. Verify with `ls -la *.bak.q320-*`.

3b. **READ THE FILE IN FULL FIRST.** `sudo cat /var/www/crm-backend/dist/routes/followUps.js | head -300` then page through. Do NOT guess Resend SDK shape. Specifically locate:
   - The `/send-video` POST handler (referenced in handoff as the active endpoint)
   - The `resend.emails.send(...)` (or equivalent SDK call) line — capture EXACTLY what it returns: response.id? response.data.id? response.data?.id?
   - The `email_logs` INSERT or Prisma `create` block — note its current field shape (toEmail, status, sentAt, campaignId, etc.) and whether `messageId` field exists in schema.

3c. **Verify schema:** `PGPASSWORD=BrandMonkz2024SecureDB psql ... -c "\d email_logs"` — confirm a `messageId` column EXISTS (it does per gap-1 verification). If missing → STOP, surface (need migration first).

3d. **Patch points (apply minimally, byte-precise):**
   - Capture the SDK return value: `const resendResponse = await resend.emails.send({...})` (or equivalent). The current code probably does `await resend.emails.send(...)` and discards the return — we need to assign + extract `.id` (or `.data.id` per Resend Node SDK v2+).
   - Add `messageId: resendResponse?.data?.id || resendResponse?.id || null` to the email_logs row create/insert.
   - Also add **BOUNCED filter pre-send** (Phase 4 in same file): BEFORE calling `resend.emails.send`, query `email_logs` for the recipient — if any prior row has `status='BOUNCED'`, REFUSE to send and return `{ skipped: 'recipient previously bounced' }` with HTTP 200 (don't 4xx — the caller is internal). Place this filter ALONGSIDE the existing `email_unsubscribes` check, NOT replacing it.
   - Use `sudo nano` or `sed` for minimal in-place edit. NO formatting changes elsewhere.

3e. **Patch campaigns.js with BOUNCED filter only** (no messageId — that handler may already capture it, or be out of scope for today's peter@ campaigns):
   - Backup: `TS=$(date +%s); sudo cp /var/www/crm-backend/dist/routes/campaigns.js /var/www/crm-backend/dist/routes/campaigns.js.bak.q320-${TS}`
   - Read full file, locate bulk send loop where `email_unsubscribes` is checked.
   - Add BOUNCED filter alongside: skip recipients with prior `email_logs.status='BOUNCED'`. Increment a `skippedBounced` counter for the response.
   - Same minimal-edit discipline.

3f. **Reload + login probe:**
   - `pm2 reload crm-backend`
   - **GATE ι:** verify pm2 status = online
   - **GATE κ:** Rajesh login probe → HTTP 401 + "Invalid credentials" byte-identical

**Phase 4 — Smoke tests:**

4a. **Synthetic send test (messageId capture proof) — GATE F:**
   ```bash
   TS=$(date +%s)
   curl -s -X POST https://brandmonkz.com/api/follow-ups/send-video \
     -A 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15' \
     -H 'Origin: https://brandmonkz.com' \
     -H 'Content-Type: application/json' \
     -H 'Authorization: Bearer <peter@ JWT — fetch from existing valid session or skip auth body if endpoint allows internal>' \
     -d "{\"toEmail\":\"jeetnair.in+320-msgid-${TS}@gmail.com\",\"prospectSlug\":\"<pick-an-existing-slug-from-tcp-v6-prospects.json>\",\"confirmed\":true}" \
     -o /tmp/q320-send-test.body -w '%{http_code}\n'
   ```
   Expected: HTTP 200 + body has `{ success: true, ... }`.

4b. **GATE ν:** if synthetic send returns 500 / unhandled exception → STOP, restore followUps.js backup, reload, re-probe Rajesh.

4c. **Verify messageId persisted:**
   ```bash
   ssh ec2 "PGPASSWORD=BrandMonkz2024SecureDB psql ... -c \"SELECT id, \\\"toEmail\\\", \\\"messageId\\\", \\\"sentAt\\\" FROM email_logs WHERE \\\"toEmail\\\" LIKE 'jeetnair.in+320-msgid-%' ORDER BY \\\"sentAt\\\" DESC LIMIT 1;\""
   ```
   Expected: 1 row with `messageId` NON-NULL (starts with `<` or alphanumeric Resend ID format).
   If `messageId IS NULL` → patch didn't capture properly → STOP, re-read followUps.js, fix patch, re-test.

4d. **BOUNCED filter test — GATE G:**
   ```bash
   TS=$(date +%s)
   FAKE_BOUNCE="fake-bounce-${TS}@example.com"
   # Insert a BOUNCED row
   ssh ec2 "PGPASSWORD=... psql ... -c \"INSERT INTO email_logs (id, \\\"toEmail\\\", status, \\\"sentAt\\\", \\\"campaignId\\\") VALUES ('q320-bounce-${TS}', '${FAKE_BOUNCE}', 'BOUNCED', NOW(), 'q320-test');\""
   # Try to send
   curl -s -X POST https://brandmonkz.com/api/follow-ups/send-video \
     -A '...' -H 'Origin: https://brandmonkz.com' -H 'Content-Type: application/json' \
     -d "{\"toEmail\":\"${FAKE_BOUNCE}\",\"prospectSlug\":\"<existing-slug>\",\"confirmed\":true}" \
     -o /tmp/q320-bounce-block.body -w '%{http_code}\n'
   ```
   Expected: HTTP 200 + body indicates skipped/refused (e.g., `{ skipped: 'recipient previously bounced' }`). NEW email_logs row for ${FAKE_BOUNCE} should NOT be created (only the synthetic BOUNCED seed row should exist).
   Cleanup: `DELETE FROM email_logs WHERE id = 'q320-bounce-${TS}'`

4e. **Final Rajesh login probe** — HTTP 401 + "Invalid credentials" byte-identical.

4f. **Cleanup synthetic test row** (Task 1 messageId test): leave the synthetic Gmail+alias row in email_logs as evidence; soft-delete possible later if needed. Do NOT cleanup until Task 3 verifies daily report scope picks it up.
  </action>
  <verify>
- Battery F (messageId saved): SQL query shows `messageId` NON-NULL on synthetic send row created in 4a
- Battery G (BOUNCED filter live): synthetic BOUNCED seed → second send returns 200 + skipped, no new email_logs INSERT for the bounced address (verify via `SELECT count(*) WHERE toEmail = '${FAKE_BOUNCE}'` → returns 1, matching the seed)
- pm2 crm-backend status = online (GATE ι passes)
- Rajesh login probe HTTP 401 + "Invalid credentials" byte-identical to Task 1 baseline (GATE κ passes)
- Backups exist: `ls /var/www/crm-backend/dist/routes/{followUps,campaigns}.js.bak.q320-*` shows 2 files
  </verify>
  <done>
- followUps.js has new `messageId: resendResponse?.data?.id || ...` field in email_logs insert
- followUps.js has new BOUNCED-filter alongside email_unsubscribes check
- campaigns.js has new BOUNCED-filter alongside email_unsubscribes check
- Real synthetic send (jeetnair.in+320-msgid-...) lands in email_logs with messageId populated
- Synthetic BOUNCED seed → second send refused without creating new row
- Rajesh login byte-identical to baseline
- 2 backup files exist with .bak.q320-${TS} suffix
  </done>
</task>

<task type="auto">
  <name>Task 3: Daily report overhaul + dry-render + cron re-arm + final regression (Phases 5-6)</name>
  <files>
    /opt/tcp-daily-report/daily-tcp-report.js
    /opt/tcp-daily-report/daily-tcp-report.js.bak.q320-${TS}
    /tmp/daily-report-dry-${TS}.html (dry-render output)
  </files>
  <action>
**Phase 5a — Backup + capture existing structure block-by-block:**

5a-1. `TS=$(date +%s); sudo cp /opt/tcp-daily-report/daily-tcp-report.js /opt/tcp-daily-report/daily-tcp-report.js.bak.q320-${TS}`. Verify backup exists.

5a-2. **READ THE FULL FILE.** `sudo wc -l /opt/tcp-daily-report/daily-tcp-report.js`, then `sudo cat` the file in pages. Capture every distinct SECTION (e.g., `// Section 1: Sends Summary`, `// Section 7: Gap Analysis`). For each section, note:
   - The SQL query block
   - The HTML render block
   - Whether it currently uses TCP_V6_CAMP_ID or STAFF_AUG_IDS hardcoded variable
   - Whether it touches `totalOpens`, `uniqueOpens`, `suspectedForwards`, `wasForwarded`, `uniqueIPs`, `wasForwardedAt` (pixel-bot fields — to be REMOVED)

5a-3. **Inventory must-keep sections** (sections we want to KEEP intact even after the rewrite):
   - Section header / banner
   - Sends summary (count, recipients, campaign name)
   - Click summary (from email_tracking_events WHERE eventType='CLICK')
   - Strict score formula gap analysis (clicks × 20 only — per memory rule, deployed Apr 29 ~07:25 UTC)
   - Existing layout / styling
   - Email-from / send mechanism

5a-4. **Inventory must-change sections:**
   - Section that hardcodes `TCP_V6_CAMP_ID` + `STAFF_AUG_IDS` → generalize to "ALL campaigns where senderEmail = 'peter@techcloudpro.com' AND createdAt > NOW() - INTERVAL '30 days'"
   - Any section using totalOpens/uniqueOpens/suspectedForwards/wasForwarded/uniqueIPs → DELETE. Replace with strict-source equivalents (clicks via email_tracking_events; visits via website_visits).

5a-5. **Inventory must-add sections:**
   - **Deliverability section** (new): Per peter@ campaign in last 24h — counts of SENT / DELIVERED / BOUNCED / COMPLAINED with bounce rate %. Source: `email_logs` GROUP BY status. Bounce rate red if >2%, yellow if 1-2%, green if <1%.
   - **Prospect Journey section** (new): Email → Click → Visit attribution. JOIN strategy:
     - Primary key: `lower(email_logs.toEmail) = lower(website_visits.identifiedEmail)` where website_visits.identifiedEmail is populated.
     - Fallback: temporal proximity — `email_logs.sentAt` within 7 days BEFORE `website_visits.visitedAt` AND IP+UA match a click event for that email_log.
     - Hybrid: prefer email-match, fall back to UTM param (`?_tcp_uid=<emailLogId>` or similar — check if BrandMonkz click handler injects it; if not, file Phase X follow-up).
     - **Implementation:** SELECT FROM email_logs e LEFT JOIN email_tracking_events tev ON tev.emailLogId = e.id AND tev.eventType='CLICK' LEFT JOIN website_visits wv ON lower(wv.identifiedEmail) = lower(e.toEmail) AND wv.visitedAt BETWEEN e.sentAt AND e.sentAt + INTERVAL '7 days' WHERE e.senderEmail = 'peter@techcloudpro.com' AND e.sentAt > NOW() - INTERVAL '24 hours'.
     - Render as table: Recipient | Campaign | Sent | Clicked | Visited | Time-on-site
     - Document the JOIN strategy in code comment so future maintainers understand.

**Phase 5b — Edit daily-tcp-report.js:**

5b-1. Open editor (sudo nano or vim). Apply 4 changes:

   **Change 1 — Generalize campaign scope:**
   - REMOVE hardcoded `const TCP_V6_CAMP_ID = '...'` and `const STAFF_AUG_IDS = [...]`.
   - REPLACE with dynamic query: `SELECT id, name, "senderEmail" FROM campaigns WHERE "senderEmail" = 'peter@techcloudpro.com' AND "createdAt" > NOW() - INTERVAL '30 days' ORDER BY "createdAt" DESC`.
   - All downstream queries that filtered by `campaignId IN (TCP_V6_CAMP_ID, ...)` now use this list.

   **Change 2 — Add Deliverability section:**
   - Insert NEW section near top (before existing Sends Summary or right after).
   - SQL: `SELECT "campaignId", status, count(*) FROM email_logs WHERE "campaignId" IN (...peterCampaigns...) AND "sentAt" > NOW() - INTERVAL '24 hours' GROUP BY "campaignId", status`
   - HTML: per-campaign row with SENT / DELIVERED / BOUNCED / COMPLAINED counts + computed bounce rate % with color coding.

   **Change 3 — Add Prospect Journey section:**
   - Insert NEW section near end (before gap analysis).
   - SQL: as designed in 5a-5 (3-way LEFT JOIN).
   - HTML: per-recipient row with click + visit indicators. NULL visit cells render as "—".

   **Change 4 — Strip pixel-bot fields:**
   - grep for `totalOpens|uniqueOpens|suspectedForwards|wasForwarded|uniqueIPs|wasForwardedAt` in the file. EXPECT 6 matches per gap-5.
   - DELETE every occurrence. The columns referenced should also be removed from any HTML render block.
   - REPLACE with strict equivalents where the section meaning makes sense (e.g., a section titled "Engagement" might still exist but show ONLY click counts and visits, not opens).

5b-2. Save file. Verify grep for forbidden fields: `sudo grep -E 'totalOpens|uniqueOpens|suspectedForwards|wasForwarded|uniqueIPs|wasForwardedAt' /opt/tcp-daily-report/daily-tcp-report.js` MUST return 0 matches (or only matches inside comments documenting why they're removed, which is acceptable if comment is `// REMOVED per memory rule feedback_no_pixel_based_engagement_metrics.md`).

**Phase 5c — Dry-render to file (NOT email):**

5c-1. Run with --dry-run flag (or whichever flag the script supports — read help if unsure):
   ```bash
   TS=$(date +%s)
   ssh ec2 "cd /opt/tcp-daily-report && sudo node daily-tcp-report.js --dry-run > /tmp/daily-report-dry-${TS}.html 2> /tmp/daily-report-dry-${TS}.err"
   ```
   If `--dry-run` flag doesn't exist, the script likely sends emails by default. In that case:
   - Add a `--dry-run` flag (or `DRY_RUN=1` env var) that, when set, writes HTML to stdout and SKIPS the SMTP send call.
   - Include this flag-add as part of the same edit.

5c-2. **GATE λ check:**
   - Exit code MUST be 0
   - `cat /tmp/daily-report-dry-${TS}.err` MUST be empty or only contain INFO/notice logs (no SQL syntax errors, no Postgres errors, no JS exceptions)
   - If errors → STOP, restore daily-tcp-report.js backup, do NOT re-arm cron.

5c-3. **Inspect dry-render HTML:**
   - File size: should be > 5KB (i.e., it actually produced content). `wc -c /tmp/daily-report-dry-${TS}.html` > 5000.
   - Section presence: `grep -c "Deliverability" /tmp/daily-report-dry-${TS}.html` returns ≥ 1.
   - Section presence: `grep -c "Prospect Journey" /tmp/daily-report-dry-${TS}.html` returns ≥ 1.
   - Pixel-bot absence: `grep -E -c 'totalOpens|suspectedForwards|wasForwarded|uniqueOpens|uniqueIPs' /tmp/daily-report-dry-${TS}.html` returns 0.
   - Scope check: dry-render should reference at least 1 peter@ campaign that is NOT TCP_V6_CAMP_ID or any STAFF_AUG_ID (proves generalization works). If user has only run those 2 campaigns lately, document this as expected.
   - **Pull the file locally for visual inspection:** `scp ec2-user@100.24.213.224:/tmp/daily-report-dry-${TS}.html /tmp/q320-dry-render-local.html` and open in browser. Confirm rendering is sane.

5c-4. **scp the dry-render to local /tmp** for evidence in summary.

**Phase 6 — Re-arm cron + final verification:**

6-1. `ssh ec2 'sudo systemctl start tcp-daily-report.timer'`
6-2. Verify active: `sudo systemctl status tcp-daily-report.timer` shows `active (waiting)`.
6-3. Verify next fire scheduled: `systemctl list-timers | grep tcp-daily-report` shows `next: <tomorrow> 02:30 UTC`.

6-4. **Final full Rajesh login probe** (Battery J): HTTP 401 + "Invalid credentials" byte-identical to Task 1 baseline. **GATE κ — last chance.** If not byte-identical → STOP, escalate.

6-5. **Cleanup test data:**
   - Delete synthetic BOUNCED seed row from Task 2: `DELETE FROM email_logs WHERE id = 'q320-bounce-...';`
   - Leave the messageId-capture synthetic row (jeetnair.in+320-msgid-...) — it's evidence the patch worked and will appear in tomorrow's daily report.

6-6. **Close SSH security group:**
   ```bash
   aws ec2 revoke-security-group-ingress --group-id sg-03f88e30ec99c3b26 --protocol tcp --port 22 --cidr $(curl -s ifconfig.me)/32 --region us-east-1
   ```

6-7. **Capture state for SUMMARY:**
   - List of 4 backup files with timestamps
   - Dry-render HTML path (local)
   - Webhook smoke result
   - messageId test result
   - BOUNCED filter test result
   - Rajesh login byte-identical proof (baseline + final diff = empty)
   - Cron timer status (active, next fire scheduled)
  </action>
  <verify>
- Battery H (Daily report dry-render):
  - Exit code 0
  - File > 5KB
  - `grep -c "Deliverability" dry.html` ≥ 1
  - `grep -c "Prospect Journey" dry.html` ≥ 1
  - `grep -Ec 'totalOpens|suspectedForwards|wasForwarded|uniqueOpens|uniqueIPs' dry.html` = 0
  - Visual browser inspection PASS (no broken HTML, sections render, data populates)
- Battery I (Cron re-armed): `systemctl status tcp-daily-report.timer` shows `active (waiting)`; `systemctl list-timers | grep tcp-daily-report` shows next fire at 02:30 UTC tomorrow
- Battery J (Final Rajesh login): HTTP 401 + "Invalid credentials" — diff against Task 1 baseline = empty
- pm2 crm-backend status = online
- All 4 backups exist
- SSH security group closed
  </verify>
  <done>
- /opt/tcp-daily-report/daily-tcp-report.js rewritten with 4 changes applied (scope generalized, Deliverability added, Prospect Journey added, pixel-bot fields removed)
- /tmp/daily-report-dry-${TS}.html renders cleanly with new sections, no pixel-bot data
- tcp-daily-report.timer active (waiting), next fire 02:30 UTC tomorrow
- Rajesh login byte-identical from start to finish
- All 4 backup files exist (.env, followUps.js, campaigns.js, daily-tcp-report.js)
- Synthetic test cleanup done (BOUNCED seed deleted)
- SSH SG closed
- Memory rules respected: pixel-bot fields purged from report consumer, bot-filter-v3 ingest layer untouched
  </done>
</task>

</tasks>

<verification>

## All 10 Verification Batteries (must ALL pass before declaring complete)

| Battery | Description | Where verified |
|---|---|---|
| A | Pre-flight Rajesh login HTTP 401 + "Invalid credentials" | Task 1 step 2 |
| B | Cron timer stopped before edits | Task 1 step 5 |
| C | RESEND_WEBHOOK_SECRET in .env (count=1, value not echoed) | Task 1 step 11-13 |
| D | Webhook smoke returns 401 invalid signature (NOT 500) | Task 1 step 17-20 |
| E | (Optional) Resend dashboard test event delivers + processes | Task 1 step 21 |
| F | messageId saved on new send (synthetic via jeetnair.in+alias) | Task 2 step 4c |
| G | BOUNCED filter blocks send to seeded BOUNCED address | Task 2 step 4d |
| H | Daily report dry-render: new sections present, pixel-bot fields absent | Task 3 step 5c-3 |
| I | Cron re-armed (active waiting, next fire 02:30 UTC) | Task 3 step 6-2/6-3 |
| J | Final Rajesh login byte-identical to baseline | Task 3 step 6-4 |

## Memory rule compliance checklist

- [ ] feedback_no_pixel_based_engagement_metrics.md: zero references to totalOpens/uniqueOpens/suspectedForwards/wasForwarded/uniqueIPs in daily-tcp-report.js or its HTML output
- [ ] reference_brandmonkz_bot_filter_at_ingest.md: emailTracking.js + tracking.js NOT modified by this plan (verify with `ls -la *.bak.q320-*` — only 4 files should have backups, those 2 should NOT)
- [ ] feedback_smoke_test_real_mailbox.md: synthetic send used `jeetnair.in+320-msgid-...@gmail.com` — never a fabricated domain
- [ ] CLAUDE.md (project): all backend changes via GSD plan (this file), no manual deploys, pm2 reload not restart, SG opened+closed cleanly

</verification>

<success_criteria>

**Production canary (mandatory):** Rajesh login probe returns HTTP 401 + body containing literal "Invalid credentials" — byte-identical between pre-flight (Battery A) and final (Battery J).

**Functional:**
- New send via /api/follow-ups/send-video persists `email_logs.messageId` non-null (proven by direct SQL query post-send)
- Existing BOUNCED row in email_logs blocks subsequent send to same recipient (no new INSERT for that toEmail)
- Resend webhook endpoint returns 401 to invalid signatures (NOT 500 — proves signature verification works without crashing)
- Dry-render of daily report contains new "Deliverability" + "Prospect Journey" section headers AND zero references to pixel-bot fields
- tcp-daily-report.timer active waiting, next fire 02:30 UTC tomorrow

**Operational hygiene:**
- 4 backup files (.env, followUps.js, campaigns.js, daily-tcp-report.js) all exist with .bak.q320-${TS} suffix
- pm2 crm-backend status = online throughout
- SSH security group opened only for the work, closed after
- RESEND_WEBHOOK_SECRET value never appears in any output, log, commit message, or summary file (only proven present via `grep -c` count)
- bot filter v3 ingest layer (emailTracking.js + tracking.js) untouched
- 0 git commits to BrandMonkz repo (this is direct EC2 file editing, deploy artifacts only — per CLAUDE.md "code on remote before deploy" rule does not apply since these are dist/* compiled artifacts and the daily report is server-only)

**Acceptable deviations (document in SUMMARY, don't block):**
- If campaigns.js bulk-send loop has its own messageId capture gap, that's a Phase X follow-up (not in scope here per constraints — Task 2 only adds BOUNCED filter to campaigns.js, not messageId).
- If --dry-run flag doesn't exist on daily-tcp-report.js, it's added as part of the rewrite. Document.
- If Resend dashboard "Send test event" produces stub messageId that doesn't match any email_logs row, that's expected (test events use synthetic IDs). Document — does not fail Battery E.

</success_criteria>

<phase_x_followups>

(For SUMMARY.md after completion — NOT in scope for this plan)

1. **Move RESEND_WEBHOOK_SECRET to AWS Secrets Manager** (`brandmonkz/production/resend-webhook-secret`). Currently lives only in /var/www/crm-backend/.env on one EC2 host. If host dies / is rebuilt, secret is lost.
2. **Auto-flag chronic bouncers**: scheduled job to mark contacts with ≥3 BOUNCED rows as `DO_NOT_SEND` status; surface in BrandMonkz UI.
3. **messageId capture gap audit**: campaigns.js bulk send may also drop messageId. Audit all email-sending code paths (transactional emails, password reset, MFA, etc.) for the same gap.
4. **UTM-based email→visit attribution improvement**: have BrandMonkz click handler always inject `?_tcp_uid=<emailLogId>` so daily report Prospect Journey JOIN can use UTM as primary key (more reliable than identifiedEmail which requires user form-submit on TCP site).
5. **Backfill historical messageId**: for existing email_logs rows where messageId IS NULL, query Resend API to retrieve message ID by recipient + sentAt (if Resend exposes this — likely not, document as known data gap).
6. **Move daily-tcp-report.js into repo**: currently lives at /opt/tcp-daily-report/ on EC2 only. Should be in version control.
7. **Bounce rate alerting**: if 24h bounce rate exceeds 5%, fire PagerDuty / Slack alert (sender reputation protection).

</phase_x_followups>

<output>
After completion, create `.planning/quick/320-brandmonkz-crm-tracking-overhaul-fix-7-v/320-SUMMARY.md` with:
- All 10 verification batteries pasted with actual results (HTTP codes, SQL row counts, grep counts — NOT the secret value)
- 4 backup file paths
- Diff (or sed-applied patch) for each of the 4 patched files
- Dry-render HTML local path + screenshot or `head -50` of HTML
- pm2 status post-deploy
- Rajesh login byte-identical proof
- 7 Phase X follow-ups
- Cleanup confirmation (BOUNCED seed deleted, SSH SG closed)
</output>
