---
phase: quick-303
plan: 01
type: execute
wave: 1
depends_on: [quick-302]
files_modified:
  - /var/www/crm-backend/dist/utils/companyResearch.js
  - /var/www/crm-backend/dist/routes/videoCampaigns.js
autonomous: false
requirements:
  - Q303-R1-tighten-domain-candidates
  - Q303-R2-clearbit-logo
  - Q303-R3-problem-statement-narration
  - Q303-R4-email-pitch-tcp-catalog
  - Q303-R5-smoke-test-with-real-render
ticketed_task: required
must_haves:
  truths:
    - "/preview-script narration is problem-statement framing (not sales pitch), grounded in source text only"
    - "/preview-script and /regenerate-script return new emailPitch field mapped to AWS/NetSuite/ArthaBuild AI catalog"
    - "/preview-script returns logoUrl (Clearbit) when domain resolves and logo HEAD returns 200, else null"
    - "deriveDomainCandidates no longer maps 'REAL Solutions Group' to real.com (DEVIATION-2 closed)"
    - "deriveDomainCandidates extends TLD walk to include .co .us .biz .ai .io"
    - "Smoke test produces an actual playable MP4 URL via localhost:5002 video-generator for at least Versova"
    - "Response shape stays backwards-compatible: existing fields preserved, only adds logoUrl + emailPitch"
  artifacts:
    - path: "/var/www/crm-backend/dist/utils/companyResearch.js"
      provides: "Tightened deriveDomainCandidates + Clearbit logoUrl on researchCompany output"
      contains: "logoUrl"
    - path: "/var/www/crm-backend/dist/routes/videoCampaigns.js"
      provides: "Problem-statement narration prompt + emailPitch generation in /preview-script and /regenerate-script"
      contains: "emailPitch"
  key_links:
    - from: "videoCampaigns.js /preview-script handler (line 1934)"
      to: "companyResearch.js researchCompany()"
      via: "narrationScript prompt now consumes researchCompany.text + outputs problemStatements + emailPitch"
      pattern: "researchCompany\\(.*\\)"
    - from: "companyResearch.js researchCompany"
      to: "https://logo.clearbit.com/{domain}"
      via: "HEAD request gated logoUrl injection"
      pattern: "logo\\.clearbit\\.com"
---

<objective>
Layer 5 surgical changes on top of quick-302 to convert the BrandMonkz video wizard from "marketing pitch generator" to "problem-statement empathy demonstrator", add a Clearbit company logo, ship a separate `emailPitch` mapped only to TCP's verified 3-service catalog (AWS / NetSuite / ArthaBuild AI), tighten domain resolution to close DEVIATION-2 (REAL Solutions → real.com false-high), and prove the full pipeline works by actually rendering a video MP4 through the existing localhost:5002 video-generator service.

Purpose: quick-302 proved we can ground the LLM in real website text. quick-303 takes that grounded text and reframes it from "sell the customer" to "show we understand the customer", separates video voiceover from email body, and adds the visual asset (logo) so the wizard output is feed-ready. The smoke test is upgraded from "preview a script" to "render an actual MP4" because the only proof the pipeline works end-to-end is an MP4 URL the user can play.

Output:
- Modified `/var/www/crm-backend/dist/utils/companyResearch.js` (tighter candidates + Clearbit logoUrl)
- Modified `/var/www/crm-backend/dist/routes/videoCampaigns.js` (problem-statement prompt + emailPitch field, in BOTH `/preview-script` and `/regenerate-script` handlers)
- A real MP4 URL from localhost:5002 for at least Versova, ideally also AMI Graphics
- Confirmation that "REAL Solutions Group" no longer falsely high-grounds onto real.com
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/302-brandmonkz-video-wizard-replace-llm-from/302-SUMMARY.md
@.agents/skills/ticketed-task/SKILL.md

# Predecessor verified state (from quick-302 SUMMARY, do NOT re-verify):
# - /var/www/crm-backend/dist/utils/companyResearch.js exists, md5 2f7b4a5827923d9c7bf8d39f5944a42b
# - /var/www/crm-backend/dist/routes/videoCampaigns.js md5 aa38ef4506540b87faf51a41390a51eb
# - /preview-script handler at line 1934 [VERIFIED .planning/quick/302-.../302-SUMMARY.md]
# - /regenerate-script handler at line 2026 [VERIFIED .planning/quick/302-.../302-SUMMARY.md]
# - .env has ANTHROPIC_MODEL=claude-haiku-4-5 — DO NOT modify .env
# - video-generator pm2 service ONLINE on localhost:5002 — DO NOT modify it, only consume it
# - DEVIATION-2 open: "REAL Solutions Group" → real.com (RealNetworks) false-high. Must close in this task.
</context>

<defensive_scope>
**MUST NOT modify:**
- Any frontend file (`~/Documents/Max 8/CRM Frontend/crm-app/` and similar)
- Any other backend route (`/var/www/crm-backend/dist/routes/*.js` except `videoCampaigns.js`)
- The video-generator Python service on localhost:5002 (only POST to its API)
- `/var/www/crm-backend/.env` (has all required keys from quick-302)
- Auth middleware, send pipeline, DB schema/tables, Follow-Ups tab from quick-301
- Any companies/contacts/email_logs DB rows

**MUST modify (only these):**
- `/var/www/crm-backend/dist/utils/companyResearch.js`
- `/var/www/crm-backend/dist/routes/videoCampaigns.js`
</defensive_scope>

<anti_hallucination_rules>
Every code/file claim in this plan is tagged:
- `[VERIFIED <source>]` = confirmed in quick-302 SUMMARY or earlier verified state, executor MAY trust without re-grep
- `[UNVERIFIED — confirm in pre-flight]` = must be re-grep'd in Task 1 before any modification

If a `[VERIFIED]` claim turns out to be wrong during pre-flight (e.g., file md5 has drifted because someone else touched the box), executor MUST stop and surface the drift before continuing.
</anti_hallucination_rules>

<tasks>

<task type="auto">
  <name>Task 1: Pre-flight read-only verification + CR ticket creation</name>
  <files>
    (read-only over SSH on EC2 box where /var/www/crm-backend lives — no edits this task)
  </files>
  <action>
    **Step A — Create Change Request ticket** (per .agents/skills/ticketed-task/SKILL.md):
    ```bash
    curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/?secret_key=$ADMIN_SECRET_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "title": "quick-303: BrandMonkz video wizard v2 — problem-statement narration + Clearbit logo + emailPitch + real video render smoke",
        "description": "Layered on quick-302. Tighten deriveDomainCandidates (close REAL Solutions / real.com DEVIATION-2), add Clearbit logoUrl, rewrite narration prompt to problem-statement framing, add emailPitch mapped to AWS/NetSuite/ArthaBuild AI only, run real video render through localhost:5002 in smoke test.",
        "change_type": "code",
        "priority": "Medium",
        "requested_by": "support@dollor.ai"
      }'
    ```
    Extract `cr_id` (e.g., `CR-XXXX`). Submit:
    ```bash
    curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/<cr_id>/submit?secret_key=$ADMIN_SECRET_KEY"
    ```
    If `ADMIN_SECRET_KEY` not available, log warning and continue (per skill).

    **Step B — SSH read-only sweep** to confirm quick-302 verified state still holds. SSH into the BrandMonkz EC2 box (same one quick-302 used). Run ONLY these read-only commands:

    1. `md5sum /var/www/crm-backend/dist/utils/companyResearch.js`
       Expected `2f7b4a5827923d9c7bf8d39f5944a42b` [VERIFIED .planning/quick/302-.../302-SUMMARY.md]. If mismatch → STOP, report drift.
    2. `md5sum /var/www/crm-backend/dist/routes/videoCampaigns.js`
       Expected `aa38ef4506540b87faf51a41390a51eb` [VERIFIED .planning/quick/302-.../302-SUMMARY.md]. If mismatch → STOP, report drift.
    3. `grep -n "router.post.*preview-script" /var/www/crm-backend/dist/routes/videoCampaigns.js`
       Expected handler at line 1934 [VERIFIED]. Capture actual line.
    4. `grep -n "router.post.*regenerate-script" /var/www/crm-backend/dist/routes/videoCampaigns.js`
       Expected handler at line 2026 [VERIFIED]. Capture actual line.
    5. `grep -n "deriveDomainCandidates\|researchCompany" /var/www/crm-backend/dist/utils/companyResearch.js`
       Expected both exported. Capture line numbers.
    6. `grep -n "ANTHROPIC_MODEL" /var/www/crm-backend/.env`
       Expected `ANTHROPIC_MODEL=claude-haiku-4-5` [VERIFIED]. If missing → STOP, do not proceed.
    7. `pm2 list | grep -E "video-generator|crm-backend"`
       Expected: both `online`. Capture PM2 ids + restart counts as baseline.
    8. `curl -s http://localhost:5002/health || curl -s http://localhost:5002/`
       Confirm video-generator is responding. Capture response.
    9. `grep -n "Create a personalized, compelling 30-45 second" /var/www/crm-backend/dist/routes/videoCampaigns.js`
       This is the OLD prompt string from quick-302 [UNVERIFIED — confirm in pre-flight]. Capture exact line(s) — there should be ONE in `/preview-script` block and ONE in `/regenerate-script` block (2 total). If count != 2, STOP and surface.
    10. `grep -n "narrationScript\|groundedness" /var/www/crm-backend/dist/routes/videoCampaigns.js | head -40`
        To map response shape — capture so executor knows where to inject `logoUrl` + `emailPitch` in res.json() calls.
    11. `aws s3 ls s3://brandmonkz-video-campaigns/video-templates/cmgla99e20000u0yuebp3yg2p/ --region us-east-1 | grep critcal_demo_2.mp4`
        Confirm the template MP4 used in the smoke test still exists [UNVERIFIED — confirm in pre-flight]. Expected: returns 1761842768129-critcal_demo_2.mp4.

    **Step C — Surface results** in a single structured block:
    ```
    PRE-FLIGHT RESULTS
    ==================
    CR ticket: CR-XXXX (or "skipped — no admin key")
    companyResearch.js md5: <actual> (expected 2f7b4a5827923d9c7bf8d39f5944a42b) [PASS|DRIFT]
    videoCampaigns.js md5: <actual> (expected aa38ef4506540b87faf51a41390a51eb) [PASS|DRIFT]
    /preview-script line: <actual> (expected ~1934)
    /regenerate-script line: <actual> (expected ~2026)
    OLD prompt occurrences: <count> (expected 2)
    .env ANTHROPIC_MODEL: <PRESENT|MISSING>
    pm2 crm-backend: <online|offline> restarts=<n>
    pm2 video-generator: <online|offline> restarts=<n>
    video-generator localhost:5002: <reachable|unreachable>
    s3 template MP4: <PRESENT|MISSING>
    ```
    If ANY [DRIFT] or [MISSING] is present, STOP. Do not proceed to Task 2 without surfacing the drift to the user.
  </action>
  <verify>
    All 11 verification points executed and surfaced. CR ticket id captured (or skip-reason logged). No file modified.
  </verify>
  <done>
    Pre-flight block surfaced with all expected values matching, OR drift surfaced and execution paused.
  </done>
</task>

<task type="auto">
  <name>Task 2: Implement code changes — tighter candidates, Clearbit logoUrl, problem-statement prompt, emailPitch</name>
  <files>
    /var/www/crm-backend/dist/utils/companyResearch.js
    /var/www/crm-backend/dist/routes/videoCampaigns.js
  </files>
  <action>
    Make a backup of each file BEFORE editing:
    ```bash
    cp /var/www/crm-backend/dist/utils/companyResearch.js /var/www/crm-backend/dist/utils/companyResearch.js.bak.q303
    cp /var/www/crm-backend/dist/routes/videoCampaigns.js /var/www/crm-backend/dist/routes/videoCampaigns.js.bak.q303
    ```

    ---

    **Change 1 — Tighten `deriveDomainCandidates` in `/var/www/crm-backend/dist/utils/companyResearch.js`** [VERIFIED file path from quick-302]

    Current behavior (per quick-302 DEVIATION-2): "REAL Solutions Group" → falls through firstword fragment "real" → tries `real.com` → 200 OK (RealNetworks) → false-high groundedness.

    Edit `deriveDomainCandidates` so it:
    1. **Removes** the firstword/single-fragment fallback. Only emit candidates derived from the FULL company name (after stripping legal suffixes Inc/LLC/Corp/Ltd/Group/Co/Solutions if and only if the remaining slug is still ≥ 2 words OR ≥ 8 chars — otherwise keep them in).
    2. **Preferred slug variants (in this order):**
       - `<full-slug-with-hyphens>` (e.g., `real-solutions-group`)
       - `<full-slug-no-spaces>` (e.g., `realsolutionsgroup`)
       - `<full-slug-with-hyphens-minus-trailing-Group/Inc/LLC>` (e.g., `real-solutions`)
       - `<full-slug-no-spaces-minus-trailing-suffix>` (e.g., `realsolutions`)
       - DO NOT emit just the first word ("real").
    3. **TLD walk list (extend):** existing list + `.co .us .biz .ai .io`. Final list: `.com .net .org .co .us .biz .ai .io` (deduped, in this order).
    4. **Cross-product:** each slug variant × each TLD = candidate. Cap at the existing maxCandidates (preserve quick-302 cap; if there isn't one, cap at 32 to keep the request volume sane).
    5. Preserve every existing exported function signature — `deriveDomainCandidates(companyName)` still returns `string[]`.

    **Acceptance for Change 1:**
    - `deriveDomainCandidates("REAL Solutions Group")` MUST NOT contain `"real.com"`.
    - It SHOULD contain `"realsolutionsgroup.com"`, `"real-solutions-group.com"`, `"realsolutions.co"` (or similar multi-word variants across the new TLDs).
    - `deriveDomainCandidates("AMI Graphics")` MUST still produce `"amigraphics.com"` as a top candidate (regression check — quick-302 PASS-case).
    - `deriveDomainCandidates("Versova")` MUST still produce `"versova.com"` (single-word company → still works).

    Add a small inline comment header: `// quick-303: DEVIATION-2 fix — drop firstword fallback, prefer multi-word slugs, extend TLDs`.

    ---

    **Change 2 — Add `logoUrl` to `researchCompany` output in same file**

    After `researchCompany` resolves a domain (i.e., AFTER the candidate that returns 200 is picked), perform ONE additional HEAD request:
    ```js
    const logoCandidate = `https://logo.clearbit.com/${resolvedDomain}`;
    let logoUrl = null;
    try {
      const headRes = await fetch(logoCandidate, { method: 'HEAD', timeout: 4000 });
      if (headRes.ok) logoUrl = logoCandidate;
    } catch (e) { logoUrl = null; }
    ```
    (Use whatever `fetch` / http client `companyResearch.js` already uses — match existing style. If it uses `axios`, mirror that. If `node-fetch`, mirror that. DO NOT add new dependencies — only what's already imported in this file.)

    Inject `logoUrl` into the existing return object as a sibling of `text`, `domain`, `groundedness`, `sourceMeta`. Existing fields untouched.

    If domain resolution failed (groundedness `low`), `logoUrl` MUST be `null` and no Clearbit call should be made.

    **Acceptance for Change 2:**
    - `researchCompany("Versova")` returns `{ ..., logoUrl: "https://logo.clearbit.com/versova.com" }` (or null if Clearbit 404s).
    - `researchCompany("REAL Solutions Group")` (after Change 1 takes effect) returns either a non-real.com logoUrl, or null, but never `https://logo.clearbit.com/real.com`.
    - No new npm packages installed.

    ---

    **Change 3 — Rewrite narration prompt in BOTH handlers in `/var/www/crm-backend/dist/routes/videoCampaigns.js`**

    Locate the OLD prompt string (Task 1 confirmed 2 occurrences):
    `"Create a personalized, compelling 30-45 second marketing message"` [VERIFIED in pre-flight]

    Replace BOTH occurrences with the new narration system prompt:
    ```
    You are writing a 30-45 second video voiceover script that demonstrates DEEP UNDERSTANDING of this company's operations — NOT a sales pitch.

    Your task: Identify 2-3 specific business problems or operational challenges this company likely faces, grounded ONLY in the source text below.

    STRICT RULES:
    1. Problem statements must trace to specific source text. If you cannot ground a problem in something the website says, OMIT it.
    2. NO generic phrases like "you might be struggling with..." or "businesses like yours often face..." — those are unfounded.
    3. NO sales language. NO "we can help", "our solution", "let us show you". This is empathy + insight, not promotion.
    4. NO invented metrics ("80% of companies in your space...") unless those numbers appear in the source.
    5. NO invented customer references or case studies.
    6. The script should sound like a peer who actually read their website and gets what they do — then names the friction points the work itself implies.
    7. Length: 80-120 words target (≈30-45 sec at conversational pace).

    Source text (truncated to ≤3000 chars from <domain>):
    <SOURCE_TEXT>

    Output ONLY the voiceover script. No preamble, no headings, no bullet points — just spoken-form prose.
    ```

    **Preserve every existing anti-hallucination rule from quick-302** (the rules around "do not invent metrics", "do not name customers" etc. — if they were in the OLD prompt as separate text, KEEP them additionally; do not just delete the old block — merge any unique constraints into the rule list above).

    Apply this change in BOTH `/preview-script` (line ~1934) AND `/regenerate-script` (line ~2026) handlers.

    ---

    **Change 4 — Add `emailPitch` field to BOTH handler responses**

    After the narration LLM call completes, make a SECOND, smaller LLM call (same Anthropic client, same `claude-haiku-4-5` model) with this prompt:
    ```
    You are writing a 2-3 sentence email body that follows up the video voiceover above. Your job: take the problems identified in the narration and connect them to TechCloudPro's services.

    TechCloudPro delivers EXACTLY THREE services. You may name only these:
    1. AWS — cloud infrastructure, migration, cost optimization, well-architected reviews
    2. NetSuite — ERP implementation, customization, migration from QuickBooks/Sage/Dynamics
    3. ArthaBuild AI (artha.build) — agentic AI for engineering teams, anti-hallucination LLM tooling

    STRICT RULES:
    1. Map to ONE primary service unless 2+ are clearly relevant.
    2. NEVER claim TechCloudPro delivers anything beyond these three.
    3. NO invented customer names, NO invented case studies, NO invented quantitative claims (no "80% of clients see X").
    4. NO sales-y phrases like "Don't miss out" or "Schedule a call today" — keep it consultative.
    5. Length: 2-3 sentences, ≤80 words.
    6. The email opens by acknowledging ONE specific problem from the narration, then names ONE relevant TCP service and what it does for that problem.
    7. End with a soft offer to discuss further (e.g., "Happy to compare notes if useful.") — NO hard CTA.

    Narration just generated:
    <NARRATION>

    Source text excerpt (for grounding):
    <SOURCE_TEXT (first 1500 chars)>

    Output ONLY the email body. No subject line, no signature, no preamble.
    ```

    Inject the result as `emailPitch` (string) in the JSON response from BOTH handlers. The existing response shape (`narrationScript`, `groundedness`, `sourceMeta`, etc.) MUST be preserved — `emailPitch` and `logoUrl` are PURE ADDITIONS.

    Final response shape (additive):
    ```json
    {
      "narrationScript": "...",
      "groundedness": "high|medium|low",
      "sourceMeta": { "domain": "...", "...": "..." },
      "logoUrl": "https://logo.clearbit.com/<domain>" | null,   // NEW
      "emailPitch": "..."                                        // NEW
    }
    ```

    Wrap the second LLM call in try/catch — if it fails, set `emailPitch: null` and log the error; do NOT fail the whole endpoint.

    ---

    **Verify file syntax + reload:**
    ```bash
    node -c /var/www/crm-backend/dist/utils/companyResearch.js
    node -c /var/www/crm-backend/dist/routes/videoCampaigns.js
    pm2 restart crm-backend
    pm2 logs crm-backend --lines 30 --nostream
    ```
    If syntax fails OR pm2 restart loops (status `errored`), STOP — restore from `.bak.q303` files and surface error.

    Capture new md5sums and pm2 restart counts for the SUMMARY.
  </action>
  <verify>
    1. `node -c` passes on both files.
    2. `pm2 list` shows `crm-backend: online` (not errored). Restart count incremented by exactly 1.
    3. `grep -c "logo.clearbit.com" /var/www/crm-backend/dist/utils/companyResearch.js` returns ≥1.
    4. `grep -c "emailPitch" /var/www/crm-backend/dist/routes/videoCampaigns.js` returns ≥2 (one per handler).
    5. `grep -c "Create a personalized, compelling 30-45 second" /var/www/crm-backend/dist/routes/videoCampaigns.js` returns 0 (old prompt fully replaced).
    6. `grep -c "demonstrates DEEP UNDERSTANDING" /var/www/crm-backend/dist/routes/videoCampaigns.js` returns ≥2 (new prompt in both handlers).
  </verify>
  <done>
    Both files modified, pm2 reloaded cleanly, all 6 verify checks pass, .bak.q303 backups exist.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Smoke test with REAL video render + STOP-FOR-REVIEW</name>
  <what-built>
    quick-303 changes are live on the BrandMonkz EC2 box. Now we exercise the full pipeline: `/preview-script` → real video-generator on localhost:5002 → playable MP4 URL.
  </what-built>
  <how-to-verify>
    Executor MUST run these in order (auto, no human in the loop until the final STOP block):

    **Smoke A — DEVIATION-2 closed (regression check):**
    SSH to box. Run a quick node REPL or `curl` to invoke `deriveDomainCandidates("REAL Solutions Group")` and `researchCompany("REAL Solutions Group")` directly:
    ```bash
    cd /var/www/crm-backend
    node -e "const r = require('./dist/utils/companyResearch.js'); console.log(JSON.stringify(r.deriveDomainCandidates('REAL Solutions Group'), null, 2));"
    node -e "const r = require('./dist/utils/companyResearch.js'); r.researchCompany('REAL Solutions Group').then(x => console.log(JSON.stringify({domain: x.domain, groundedness: x.groundedness, logoUrl: x.logoUrl, sourceLen: (x.text || '').length}, null, 2)));"
    ```
    Capture output. Expected:
    - candidates list does NOT contain `"real.com"`
    - resolved domain is either `realsolutionsgroup.co`, a different correct domain, or null/`groundedness: low` — but NOT `real.com`
    - logoUrl is NOT `https://logo.clearbit.com/real.com`

    **Smoke B — Versova /preview-script (high-grounded case):**
    ```bash
    curl -s -X POST http://localhost:<crm-backend-port>/api/video-campaigns/preview-script \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer <admin-jwt>" \
      -d '{"companyName": "Versova"}' | tee /tmp/q303-versova-preview.json
    ```
    (Use the same auth pattern quick-302 used. If quick-302 used a specific Authorization scheme, mirror it. If unsure, grep for an existing preview-script smoke command in quick-302 SUMMARY's command history first.)
    Expected response keys: `narrationScript`, `groundedness: "high"`, `sourceMeta.domain: "versova.com"`, `logoUrl: "https://logo.clearbit.com/versova.com"` (or null if Clearbit lacks it), `emailPitch` (string, ≤80 words).

    **Smoke C — Versova actual video render through localhost:5002:**
    Take the `narrationScript` from Smoke B and POST to video-generator:
    ```bash
    NARRATION=$(jq -r .narrationScript /tmp/q303-versova-preview.json)
    curl -s -X POST http://localhost:5002/api/video/generate \
      -H "Content-Type: application/json" \
      -d "{
        \"script\": $(jq -Rs . <<< "$NARRATION"),
        \"voiceId\": \"cjVigY5qzO86Huf0OWal\",
        \"templateUrl\": \"https://brandmonkz-video-campaigns.s3.us-east-1.amazonaws.com/video-templates/cmgla99e20000u0yuebp3yg2p/1761842768129-critcal_demo_2.mp4\"
      }" | tee /tmp/q303-versova-render-start.json
    ```
    Extract the job id (response should contain something like `jobId` or `id`). Poll status every 5 sec for up to 90 sec:
    ```bash
    JOB_ID=$(jq -r '.jobId // .id // .job_id' /tmp/q303-versova-render-start.json)
    for i in $(seq 1 18); do
      curl -s http://localhost:5002/api/video/status/$JOB_ID | tee /tmp/q303-versova-status.json
      STATUS=$(jq -r '.status' /tmp/q303-versova-status.json)
      echo "Attempt $i: $STATUS"
      if [ "$STATUS" = "completed" ] || [ "$STATUS" = "COMPLETED" ]; then break; fi
      sleep 5
    done
    ```
    On `completed`, capture the output MP4 URL (likely `outputUrl`, `mp4Url`, or `videoUrl` field).

    **Smoke D — AMI Graphics same flow (only if Smoke B+C succeed AND time < 5 min spent on Smoke B+C):**
    Repeat Smoke B+C with `companyName: "AMI Graphics"`. If anything fails, capture and continue — don't loop forever.

    **STOP-FOR-REVIEW — surface this exact block to the user, then STOP:**
    ```
    ====================================================================
    QUICK-303 SMOKE TEST RESULTS — USER REVIEW REQUIRED BEFORE SUMMARY.md
    ====================================================================

    DEVIATION-2 status: [CLOSED | STILL-OPEN]
    REAL Solutions Group resolved domain: <actual>
    REAL Solutions Group candidates contain real.com: [YES (FAIL) | NO (PASS)]

    --- Versova ---
    domain:          <actual>
    groundedness:    <high|medium|low>
    logoUrl:         <url or null>
    narrationScript: <full text>
    emailPitch:      <full text>
    Rendered MP4 URL: <url>
    Render time:     <Xs>

    --- AMI Graphics (if attempted) ---
    domain:          <actual>
    groundedness:    <high|medium|low>
    logoUrl:         <url or null>
    narrationScript: <full text>
    emailPitch:      <full text>
    Rendered MP4 URL: <url or "skipped/failed: <reason>">

    --- Manual judgment (executor's call) ---
    Narration avoids sales-pitch language: [YES | NO — explain]
    emailPitch limited to AWS/NetSuite/ArthaBuild AI only: [YES | NO — explain]
    emailPitch invents customers/metrics: [NO | YES — explain]

    --- Files modified (md5 before → after) ---
    companyResearch.js: 2f7b4a5827923d9c7bf8d39f5944a42b → <new>
    videoCampaigns.js:  aa38ef4506540b87faf51a41390a51eb → <new>
    pm2 crm-backend restart count: <before> → <after>

    --- CR ticket ---
    cr_id: <CR-XXXX or "skipped">

    USER: please play the MP4 URL(s) above, read the narration + emailPitch,
    and confirm one of:
      (a) APPROVE — proceed to write 303-SUMMARY.md, transition CR to Verified, clean up SG
      (b) ITERATE — request specific changes (e.g., "narration still sells too much, retry with stricter prompt")
      (c) ROLLBACK — restore .bak.q303 files
    ```

    Then STOP. Do NOT write SUMMARY.md. Do NOT clean up Security Groups. Do NOT transition CR to Verified. Wait for user signal.
  </how-to-verify>
  <resume-signal>Reply with "approve" / "iterate: <details>" / "rollback"</resume-signal>
</task>

</tasks>

<verification>
Plan complete when:
1. Pre-flight verified all md5s + line numbers + pm2 state, OR drift surfaced.
2. Both files modified per the 4 changes, pm2 reload clean, syntax valid.
3. Smoke test produced an actual playable MP4 URL for Versova (and ideally AMI Graphics).
4. STOP-FOR-REVIEW block surfaced with all required data.
5. User has NOT approved yet — executor is paused.

Out of scope until user approval:
- Writing 303-SUMMARY.md (post-approval task)
- Closing CR ticket / transitioning to Verified
- Any SG cleanup
- Touching frontend, .env, other routes, video-generator service code
</verification>

<success_criteria>
- `deriveDomainCandidates("REAL Solutions Group")` does NOT contain `real.com` (DEVIATION-2 fixed)
- `deriveDomainCandidates` walks `.com .net .org .co .us .biz .ai .io` (≥8 TLDs in cross-product)
- `researchCompany` output gains `logoUrl` (string or null) — additive, non-breaking
- `/preview-script` AND `/regenerate-script` both:
  - Use new problem-statement prompt (old "marketing message" string fully gone)
  - Return `emailPitch` field grounded in AWS/NetSuite/ArthaBuild AI only
  - Preserve existing fields (`narrationScript`, `groundedness`, `sourceMeta`)
- At least one company (Versova) produces a playable MP4 URL via localhost:5002 in the smoke test
- Executor stops at STOP-FOR-REVIEW gate, does NOT auto-write SUMMARY.md
- Defensive scope held: zero changes to frontend, .env, other routes, video-generator service, auth, DB, send pipeline
</success_criteria>

<output>
After user approval (response to STOP-FOR-REVIEW), executor will:
1. Write `.planning/quick/303-brandmonkz-video-wizard-v2-problem-state/303-SUMMARY.md` containing:
   - Files modified (path, action, before/after md5)
   - Smoke test results table (Versova, AMI Graphics, REAL Solutions regression)
   - The actual MP4 URLs rendered
   - Confirmation DEVIATION-2 closed
   - Any new deviations discovered (e.g., DEVIATION-5/6...)
   - PM2 + SG state
   - "What's next" pointer if applicable
2. Transition CR ticket through `In Progress → Staging → Production → Verified` per ticketed-task skill
3. Clean up any temporary SG ingress (none expected — quick-302 already cleaned its own)

DO NOT perform any of these until the user replies to the STOP-FOR-REVIEW gate.
</output>
