---
phase: quick-302
plan: 302
type: execute
wave: 1
depends_on: []
files_modified:
  - /var/www/crm-backend/dist/routes/videoCampaigns.js
  - /var/www/crm-backend/dist/utils/companyResearch.js  # NEW helper file (created on EC2)
autonomous: false  # Task 3 has STOP-FOR-REVIEW gate
requirements:
  - quick-302-grounded-script-generation
user_setup: []

must_haves:
  truths:
    - "When a user runs the BrandMonkz video wizard against a company name, the backend fetches that company's actual website (homepage + /about + /services where present) and uses ONLY the scraped text as source material for script generation."
    - "Every generated script response includes a `groundedness` field with value 'high', 'medium', or 'low' that honestly reflects how much real source text the LLM had to work with."
    - "When a website is unreachable, has an SSL error, or returns an empty body, the system still returns a script BUT marks `groundedness: 'low'` and falls back to a generic, non-fabricated script — it never invents products, leaders, customer names, or news."
    - "Both the /preview-script and /regenerate-script endpoints share the same grounded research pipeline (same helper function), so behavior is consistent."
    - "No frontend file is modified. No other backend route is modified. The wizard UI continues to call the same endpoints with the same shape and receives a backwards-compatible response."

  artifacts:
    - path: "/var/www/crm-backend/dist/utils/companyResearch.js"
      provides: "researchCompany(companyName) helper — domain derivation, multi-page fetch, HTML→text strip, truncation, groundedness classification"
      exports: ["researchCompany"]
      min_lines: 80
    - path: "/var/www/crm-backend/dist/routes/videoCampaigns.js"
      provides: "Modified /preview-script (~line 1934) and /regenerate-script handlers using researchCompany() output as the LLM prompt's source-of-truth block"
      contains: "researchCompany"

  key_links:
    - from: "/var/www/crm-backend/dist/routes/videoCampaigns.js (/preview-script handler)"
      to: "/var/www/crm-backend/dist/utils/companyResearch.js (researchCompany)"
      via: "require('../utils/companyResearch')"
      pattern: "require.*companyResearch"
    - from: "/var/www/crm-backend/dist/routes/videoCampaigns.js (/preview-script handler)"
      to: "Anthropic API via ai_1.AI_CONFIG"
      via: "messages.create() with strict anti-hallucination system+user prompts including the scraped sourceText block"
      pattern: "ai_1\\.AI_CONFIG"
    - from: "Response payload (both endpoints)"
      to: "Frontend wizard"
      via: "groundedness field added to existing JSON shape (additive, non-breaking)"
      pattern: "groundedness"
---

<objective>
Replace the BrandMonkz video-wizard's LLM-from-name-only script generation with website-grounded research.

Purpose: The current /preview-script handler hands Anthropic just the company name and a vague "generate a marketing script" prompt — Claude hallucinates products, leadership, and customer wins. We need to fetch the company's actual public website, strip it to clean text, feed THAT to the LLM with strict anti-hallucination rules, and surface a `groundedness` signal so the operator can spot weakly-sourced scripts.

Output: One new helper file (companyResearch.js) and modifications to /preview-script and /regenerate-script handlers in videoCampaigns.js. NO frontend changes. Smoke test against 5 real companies, then STOP for user review of the actual scripts.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/doordash-p2p/.planning/STATE.md
@/Users/jeet/doordash-p2p/CLAUDE.md
@/Users/jeet/doordash-p2p/.agents/skills/ticketed-task/SKILL.md

**Verified facts (from earlier verification this session):**
- Backend file `/var/www/crm-backend/dist/routes/videoCampaigns.js` exists, 129KB, 2881 lines.
- `/preview-script` handler is at **line 1934**.
- Current LLM prompt: `"Analyze the company name '${companyName}' and any additional context provided, then generate a compelling marketing video script."` — no real research, no anti-hallucination rules.
- Anthropic key already wired at `ai_1.AI_CONFIG.apiKey` (env var `ANTHROPIC_API_KEY`). Model + maxTokens.campaign + temperature already configured at `ai_1.AI_CONFIG`.
- Backend runs under PM2 process name `crm-backend` on EC2 `100.24.213.224`, SSH user `ec2-user`, key `~/.ssh/brandmonkz-crm.pem`.
- Security group `sg-03f88e30ec99c3b26` is locked — open SSH for the IP, do work, revoke.

**UNVERIFIED (executor MUST grep before reuse):**
- Memory says job-leads agent has `extractDomainFromUrl`, `companyToDomain`, `hasMxRecords`, `findVerifiedDomain` helpers — likely in `dist/routes/jobLeadsAgent.js` or `dist/routes/job-leads.routes.js`. Run `grep -rn "companyToDomain\|hasMxRecords\|findVerifiedDomain" /var/www/crm-backend/dist/` before reusing or duplicating logic.

**Live evidence from B-path manual fetches this session:**
- 5 target companies: REAL Solutions Group, AMI Graphics, Versova, Garyline, Corpac Steel
- 4 of 5 had reachable websites; Garyline had expired SSL cert; Corpac Steel had cert mismatch
- Homepage HTML sizes ranged 16KB → 1MB → MUST strip to text and truncate before LLM
- Fetcher must handle SSL errors gracefully (proceed-on-error and flag groundedness:'low'; do NOT trust insecure-by-default — strict TLS first, fall through to a single permissive retry only when explicitly classifying as low-groundedness)

**Defensive scope — MUST NOT modify:**
- Any frontend file (`~/Documents/Max 8/CRM Frontend/crm-app/`)
- VideoCampaign UI components (`AutoGenerateVideoModal.tsx`, etc.)
- Any other backend route besides `videoCampaigns.js` + the new `companyResearch.js` helper
- Email send pipeline
- Auth middleware
- Follow-Ups tab from quick-301
- Video generator service (Python at localhost:5002)
- `companies` or `email_logs` DB tables — this is a pure compute change, no schema work

**Anti-hallucination rules (MUST be in the new prompt verbatim):**
- "Use ONLY the provided source text. If a fact is not in the source, do not claim it."
- "Never invent products, leadership names, customers, or news."
- "If source text is empty/sparse, write a generic script and flag it: groundedness='low'."
- "If source contains 1-2 specific items: groundedness='medium'."
- "If 3+ specific items referenced: groundedness='high'."
- "Industry must be derivable from source text or 'unknown' — no guessing from name."
</context>

<tasks>

<task type="auto">
  <name>Task 1: Pre-flight verification + CR ticket + open SSH + build research helper</name>
  <files>
    /var/www/crm-backend/dist/utils/companyResearch.js  (NEW, on EC2)
  </files>
  <action>
    **Step 1.1 — CR ticket (per ticketed-task skill):**
    ```bash
    if [ -n "$ADMIN_SECRET_KEY" ]; then
      CR_RESP=$(curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/?secret_key=$ADMIN_SECRET_KEY" \
        -H "Content-Type: application/json" \
        -d '{
          "title": "quick-302: BrandMonkz video wizard — website-grounded script generation",
          "description": "Replace LLM-from-name with website-grounded research. Modifies /preview-script + /regenerate-script in videoCampaigns.js + new companyResearch.js helper. Backend-only, no frontend changes, no other routes touched.",
          "change_type": "code",
          "priority": "Medium",
          "requested_by": "support@dollor.ai"
        }')
      CR_ID=$(echo "$CR_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('cr_id',''))")
      [ -n "$CR_ID" ] && curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/$CR_ID/submit?secret_key=$ADMIN_SECRET_KEY" >/dev/null
      echo "CR_ID=$CR_ID"
    else
      echo "WARN: ADMIN_SECRET_KEY not set — continuing without CR ticket per skill rule"
      CR_ID=""
    fi
    ```
    Save `CR_ID` for use in commit messages and final transitions.

    **Step 1.2 — Open SSH:**
    ```bash
    MY_IP=$(curl -s https://checkip.amazonaws.com)
    aws ec2 authorize-security-group-ingress --group-id sg-03f88e30ec99c3b26 \
      --protocol tcp --port 22 --cidr ${MY_IP}/32 || echo "rule may already exist"
    ```
    Set a trap or note to revoke at end of Task 3.

    **Step 1.3 — Verify backend file + line number BEFORE editing:**
    ```bash
    ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 \
      "grep -n 'preview-script\|regenerate-script' /var/www/crm-backend/dist/routes/videoCampaigns.js | head -20"
    ```
    Expected: `/preview-script` route registration on or near line 1934. If not found at expected line, STOP and re-grep `router\.(post|get).*preview-script` to find the actual handler before proceeding. Record the actual line numbers in the executor SUMMARY.

    **Step 1.4 — Verify Anthropic config + helper reuse:**
    ```bash
    ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 \
      "grep -n 'AI_CONFIG\|companyToDomain\|extractDomainFromUrl\|hasMxRecords\|findVerifiedDomain' /var/www/crm-backend/dist/routes/videoCampaigns.js /var/www/crm-backend/dist/routes/jobLeadsAgent.js /var/www/crm-backend/dist/routes/job-leads.routes.js 2>/dev/null | head -40"
    ```
    Confirm `ai_1.AI_CONFIG.apiKey` / `ai_1.AI_CONFIG.model` / `ai_1.AI_CONFIG.maxTokens.campaign` / `ai_1.AI_CONFIG.temperature` exist. Find which file (if any) defines `companyToDomain` etc. — if found, REUSE; if absent, write minimal local versions in companyResearch.js.

    **Step 1.5 — Write companyResearch.js helper directly on EC2.** SCP a local file to EC2 at `/var/www/crm-backend/dist/utils/companyResearch.js`. Module exports `async function researchCompany(companyName)`. Implementation requirements:

    1. **Derive domain candidates** from companyName:
       - Lowercase, strip punctuation, strip suffixes (`inc`, `llc`, `corp`, `ltd`, `co`, `group`, `solutions` last-word only, `the` first-word).
       - Generate candidates: `{slug}.com`, `{slug}.net`, `{slug}.io`, `{slug}.ai`, `{slug}.co` plus `www.` variants. Cap at 8 candidates.
       - If a `companyToDomain` helper exists in jobLeadsAgent (verified in Step 1.4), require + reuse it; do NOT duplicate.

    2. **Probe each candidate** with HEAD then GET on `https://{domain}/`:
       - Timeout 5s per request, follow up to 2 redirects.
       - First domain that returns 200 OR 301/302 with a Location header pointing to a 200 response wins.
       - On SSL error (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`, `CERT_HAS_EXPIRED`, `ERR_TLS_CERT_ALTNAME_INVALID`): retry ONCE with `rejectUnauthorized: false` AND record `sslError: true` in result. Mark groundedness as 'low' regardless of body content if sslError=true.
       - Use Node built-in `https` or `node-fetch` (whichever is already in `package.json` — grep `package.json` to confirm; do NOT add a new dep).

    3. **Fetch homepage + /about + /services** in parallel for the winning domain. /about and /services are best-effort — 200 = include, anything else = skip silently.

    4. **HTML → text:**
       - Strip `<script>...</script>` and `<style>...</style>` blocks (regex with `[\s\S]*?` non-greedy).
       - Strip remaining tags (`<[^>]+>`).
       - Decode `&amp; &lt; &gt; &quot; &nbsp; &#39;` (minimum set).
       - Collapse whitespace runs to single spaces.
       - Concatenate pages: `[homepage_text]\n\n=== /about ===\n[about_text]\n\n=== /services ===\n[services_text]`.
       - Truncate to **3000 chars** total (hard cap; if homepage already ≥3000, drop /about and /services).

    5. **Classify groundedness** based on extracted text length and specificity heuristics:
       - `text.length === 0` → 'low' (no source).
       - `sslError === true` → 'low' (untrustworthy source).
       - `text.length < 300` → 'low' (sparse).
       - `text.length 300..1500` → 'medium'.
       - `text.length >= 1500` → 'high'.
       - This is a coarse heuristic — the LLM will further self-classify in its response, but `researchCompany` returns its OWN heuristic so the route handler can compare/override.

    6. **Return shape:**
       ```js
       {
         companyName: string,
         domain: string | null,        // null if no candidate worked
         sourceText: string,            // empty string if domain null
         pagesScraped: string[],        // e.g. ['/', '/about']
         sslError: boolean,
         heuristicGroundedness: 'high' | 'medium' | 'low',
         fetchErrors: string[]          // optional debug
       }
       ```

    7. **No external HTTP libraries beyond what's already in package.json.** No cheerio (regex strip is sufficient and avoids adding a dep).

    8. **Defensive: every fetch wrapped in try/catch.** Function MUST NOT throw — always returns the shape above, with `domain: null` and `heuristicGroundedness: 'low'` on total failure.

    **Step 1.6 — SCP to EC2 + lint check:**
    ```bash
    scp -i ~/.ssh/brandmonkz-crm.pem /tmp/companyResearch.js \
        ec2-user@100.24.213.224:/var/www/crm-backend/dist/utils/companyResearch.js
    ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 \
      "node -c /var/www/crm-backend/dist/utils/companyResearch.js && echo SYNTAX_OK"
    ```
    Expected: `SYNTAX_OK`. If syntax error, fix and re-scp.

    **Step 1.7 — Smoke test the helper standalone (no LLM yet):**
    ```bash
    ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 \
      "cd /var/www/crm-backend && node -e \"const {researchCompany} = require('./dist/utils/companyResearch'); (async () => { for (const n of ['REAL Solutions Group','AMI Graphics','Versova','Garyline','Corpac Steel']) { const r = await researchCompany(n); console.log(JSON.stringify({name:n, domain:r.domain, ground:r.heuristicGroundedness, len:r.sourceText.length, ssl:r.sslError, pages:r.pagesScraped})); } })().catch(e=>console.error(e));\""
    ```
    Capture the JSON output for the SUMMARY. Expect at least 3 of 5 to resolve a domain. If 0/5 resolve, STOP — domain derivation is broken.
  </action>
  <verify>
    - SSH grep returned exact line numbers for both /preview-script and /regenerate-script handlers.
    - `node -c companyResearch.js` prints `SYNTAX_OK`.
    - Standalone smoke run prints 5 JSON lines, ≥3 with non-null `domain` and ≥3 with `len > 300`.
    - `grep -n require\\(.*companyResearch /var/www/crm-backend/dist/routes/videoCampaigns.js` returns NOTHING (handler not yet wired — that's Task 2).
    - CR_ID captured (or warning logged if ADMIN_SECRET_KEY missing).
  </verify>
  <done>
    Helper file deployed to EC2, syntactically valid, returns the documented shape for all 5 smoke companies, and standalone fetch behavior is sane. Handler wiring deferred to Task 2.
  </done>
</task>

<task type="auto">
  <name>Task 2: Wire researchCompany into /preview-script + /regenerate-script with anti-hallucination prompt</name>
  <files>
    /var/www/crm-backend/dist/routes/videoCampaigns.js  (modified on EC2)
  </files>
  <action>
    **Step 2.1 — Pull the current handler bodies down for safe local editing:**
    ```bash
    scp -i ~/.ssh/brandmonkz-crm.pem \
      ec2-user@100.24.213.224:/var/www/crm-backend/dist/routes/videoCampaigns.js \
      /tmp/videoCampaigns.js.before
    cp /tmp/videoCampaigns.js.before /tmp/videoCampaigns.js.after
    ```
    Always edit `/tmp/videoCampaigns.js.after`, never the live file. Diff before SCP back.

    **Step 2.2 — Add require at top of file** (after the existing requires; grep `^const.*require` to find the require block):
    ```js
    const { researchCompany } = require('../utils/companyResearch');
    ```

    **Step 2.3 — Replace the /preview-script handler body** (around line 1934, exact line confirmed in Task 1.3). The new flow:

    1. Extract `companyName` (and any other existing inputs — email, recipientName, productCategory, etc.) from `req.body` exactly as the existing handler does. DO NOT change request schema.
    2. Validate `companyName` is non-empty string; existing 400-on-missing logic stays.
    3. Call `const research = await researchCompany(companyName);`
    4. Build the LLM prompt with this EXACT structure (system message + user message):

       **System message (verbatim, all 6 anti-hallucination rules):**
       ```
       You are a marketing copywriter. You generate short, authentic video scripts grounded in a company's real public website content. You follow these rules WITHOUT EXCEPTION:

       1. Use ONLY the provided source text. If a fact is not in the source, do not claim it.
       2. Never invent products, leadership names, customers, or news.
       3. If source text is empty/sparse, write a generic script and flag it: groundedness="low".
       4. If source contains 1-2 specific items: groundedness="medium".
       5. If 3+ specific items referenced: groundedness="high".
       6. Industry must be derivable from source text or "unknown" — no guessing from name.

       Output strict JSON ONLY (no prose, no markdown fences):
       {
         "script": "<60-90 second spoken script>",
         "groundedness": "high"|"medium"|"low",
         "industry": "<derived from source or 'unknown'>",
         "specificItemsReferenced": ["<item1>", "<item2>", ...]
       }
       ```

       **User message:**
       ```
       Company name: {companyName}
       Domain found: {research.domain ?? 'NONE'}
       Pages scraped: {research.pagesScraped.join(', ') || 'NONE'}
       SSL error: {research.sslError ? 'YES — treat source as untrustworthy' : 'no'}

       === SOURCE TEXT (use ONLY this; max 3000 chars) ===
       {research.sourceText || '(no source text available — write a generic, non-fabricated script and mark groundedness="low")'}
       === END SOURCE TEXT ===

       Generate the JSON now.
       ```

    5. Call Anthropic via `ai_1.AI_CONFIG` (use exact same SDK invocation pattern already used elsewhere in this file — grep `ai_1.AI_CONFIG.model\|messages.create` to find the canonical call site and copy its shape, including `max_tokens: ai_1.AI_CONFIG.maxTokens.campaign` and `temperature: ai_1.AI_CONFIG.temperature`).

    6. Parse the LLM response as JSON. If parse fails, fall back to:
       ```js
       { script: rawText, groundedness: research.heuristicGroundedness, industry: 'unknown', specificItemsReferenced: [] }
       ```
       Log the parse failure with `console.warn`.

    7. Compute final `groundedness`:
       ```js
       const finalGroundedness = research.heuristicGroundedness === 'low'
         ? 'low'  // helper override always wins on the downside
         : (parsed.groundedness || research.heuristicGroundedness);
       ```
       Rationale: the LLM might claim "high" even when sourceText was empty — the helper's heuristic is the floor.

    8. Return the response in a backwards-compatible shape — KEEP all existing top-level fields the wizard expects (likely `script`, possibly `metadata` or similar — match the existing handler's exact return shape) and ADD new fields:
       ```js
       res.json({
         ...existingShape,
         script: parsed.script,
         groundedness: finalGroundedness,
         industry: parsed.industry,
         sourceMeta: {
           domain: research.domain,
           pagesScraped: research.pagesScraped,
           sourceTextLength: research.sourceText.length,
           sslError: research.sslError,
           specificItemsReferenced: parsed.specificItemsReferenced || []
         }
       });
       ```

    **Step 2.4 — /regenerate-script handler:** Apply IDENTICAL pipeline. Find the handler with `grep -n regenerate-script /tmp/videoCampaigns.js.after`. The pipeline is the same — call researchCompany, build the same system+user prompts, return the same shape. Refactor: extract a local `async function generateGroundedScript(companyName, extraContext)` inside the file (above both route definitions) so the two handlers share one body. extraContext is passed through unchanged from the request (e.g. tone/length flags).

    **Step 2.5 — Diff + lint + SCP back:**
    ```bash
    diff /tmp/videoCampaigns.js.before /tmp/videoCampaigns.js.after | head -200
    node -c /tmp/videoCampaigns.js.after && echo SYNTAX_OK
    ```
    Visually confirm: only the require, the new helper function, and the two handler bodies changed. If any other section diffs, REVERT and re-do — keep blast radius surgical.

    ```bash
    scp -i ~/.ssh/brandmonkz-crm.pem /tmp/videoCampaigns.js.after \
      ec2-user@100.24.213.224:/var/www/crm-backend/dist/routes/videoCampaigns.js
    ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 \
      "node -c /var/www/crm-backend/dist/routes/videoCampaigns.js && echo PROD_SYNTAX_OK"
    ```

    **Step 2.6 — Restart PM2 + tail logs to confirm clean boot:**
    ```bash
    ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 \
      "pm2 restart crm-backend && sleep 3 && pm2 logs crm-backend --lines 30 --nostream"
    ```
    Expected: server restart, no syntax/require errors. If the log shows `Cannot find module '../utils/companyResearch'`, re-verify the path in Task 1.6 SCP target.

    **Step 2.7 — CR transition to In Progress** (if CR_ID set):
    ```bash
    [ -n "$CR_ID" ] && curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/$CR_ID/transition?secret_key=$ADMIN_SECRET_KEY" \
      -H "Content-Type: application/json" \
      -d '{"new_status":"In Progress","actor_email":"system@dollor.ai","role":"system"}'
    ```
  </action>
  <verify>
    - `diff` output shows changes ONLY in: 1 require line, 1 new helper function, 2 handler bodies. No drift in unrelated sections.
    - `node -c` returns `PROD_SYNTAX_OK` on the live file post-SCP.
    - PM2 logs after restart show "server listening" / equivalent boot success message and zero require errors.
    - `grep -n researchCompany /var/www/crm-backend/dist/routes/videoCampaigns.js` returns ≥3 hits (1 require + 2+ handler usages, or 1 require + 1 shared helper called twice).
  </verify>
  <done>
    Both endpoints now route through researchCompany → grounded prompt → JSON parse → backwards-compatible response with new groundedness + sourceMeta fields. Backend restarted clean.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Smoke test 5 companies, surface scripts, STOP for user review</name>
  <what-built>
    /preview-script and /regenerate-script in BrandMonkz video wizard now do real website research and use anti-hallucination prompts. Helper companyResearch.js fetches homepage + /about + /services, strips to 3000 chars, classifies groundedness. Anthropic prompt forbids inventing products/leaders/customers and requires JSON with a groundedness field.
  </what-built>
  <how-to-verify>
    **Step 3.1 — Get a valid JWT for the BrandMonkz API.** Use Peter or Rajesh's credentials (the same accounts that drive the video wizard in production). The login endpoint is `POST https://brandmonkz.com/api/auth/login` (verify with `grep -rn "auth/login" /var/www/crm-backend/dist/`). Save token as `$JWT`.

    **Step 3.2 — Call /preview-script via curl for each of the 5 smoke companies:**
    ```bash
    for COMPANY in "REAL Solutions Group" "AMI Graphics" "Versova" "Garyline" "Corpac Steel"; do
      echo "=== $COMPANY ==="
      curl -s -X POST "https://brandmonkz.com/api/video-campaigns/preview-script" \
        -H "Authorization: Bearer $JWT" \
        -H "Content-Type: application/json" \
        -d "$(jq -n --arg c "$COMPANY" '{companyName:$c}')" \
        | jq '{groundedness, industry, domain: .sourceMeta.domain, sslError: .sourceMeta.sslError, pagesScraped: .sourceMeta.pagesScraped, sourceTextLength: .sourceMeta.sourceTextLength, specificItemsReferenced: .sourceMeta.specificItemsReferenced, script}'
      echo ""
    done | tee /tmp/302-smoke-output.txt
    ```
    NOTE: confirm the actual route path with `grep -n "preview-script" /var/www/crm-backend/dist/routes/videoCampaigns.js` — it may be mounted under a prefix like `/api/video-campaigns/preview-script` or a different one. If different, use the verified path.

    **Step 3.3 — Manual review checklist for each script:**
    1. Does the script mention any product, customer, leader, or news that you CANNOT find in the company's actual website? If yes — anti-hallucination FAILED, do NOT proceed.
    2. Does `groundedness` honestly reflect the situation? (high = obviously specific to the company; low = clearly generic.)
    3. For the 2 SSL-error companies (Garyline, Corpac Steel), is `sslError: true` and `groundedness: "low"`?
    4. Are scripts 60-90 seconds of spoken material (roughly 150-250 words)?
    5. Is `specificItemsReferenced` non-empty for the high-groundedness scripts?

    **Step 3.4 — STOP. Surface the full /tmp/302-smoke-output.txt to the user.** Do NOT proceed to deploy further changes, do NOT mark complete, do NOT auto-advance to a next task. Print:
    ```
    ## QUICK-302 SMOKE TEST RESULTS — STOP FOR REVIEW

    {paste full output here}

    ## Reviewer checklist:
    - [ ] No fabricated products/leaders/customers/news
    - [ ] Groundedness signal is honest
    - [ ] SSL-error companies marked low
    - [ ] Scripts are 60-90s spoken length
    - [ ] specificItemsReferenced non-empty for high-groundedness

    Approve, request changes, or list specific scripts that look hallucinated.
    ```

    **Step 3.5 — Wait for user response.** Only after explicit user approval:
    - Revoke the SSH ingress: `aws ec2 revoke-security-group-ingress --group-id sg-03f88e30ec99c3b26 --protocol tcp --port 22 --cidr ${MY_IP}/32`
    - Transition CR to Verified: `curl -s -X POST ".../change-requests/$CR_ID/transition..." -d '{"new_status":"Verified",...}'` (if CR_ID set)
    - Write the SUMMARY.

    If user requests changes, do NOT loop back into another full plan iteration here — exit cleanly, let the user open a new quick task.
  </how-to-verify>
  <resume-signal>Type "approved" to revoke SSH + finalize CR + write SUMMARY. Type "changes: ..." to exit cleanly without finalizing. Type "rollback" to revert videoCampaigns.js + companyResearch.js on EC2 and PM2-restart.</resume-signal>
</task>

</tasks>

<verification>
**Cross-task verification (executor confirms BEFORE marking quick-302 done):**

1. `ssh ec2 "ls -la /var/www/crm-backend/dist/utils/companyResearch.js"` returns a file ≥80 lines.
2. `ssh ec2 "grep -c researchCompany /var/www/crm-backend/dist/routes/videoCampaigns.js"` returns ≥3.
3. `ssh ec2 "pm2 status crm-backend"` shows process online with no recent restarts beyond the one in Task 2.6.
4. /tmp/302-smoke-output.txt exists locally with 5 company sections.
5. User has explicitly approved the script outputs.
6. SSH ingress on sg-03f88e30ec99c3b26 has been revoked.
7. No file under `~/Documents/Max 8/CRM Frontend/crm-app/` was modified (run `cd ~/Documents/Max\ 8/CRM\ Frontend/crm-app/ && git status` — must be clean or unrelated).
8. No backend route file other than videoCampaigns.js was modified (`ssh ec2 "find /var/www/crm-backend/dist/routes -newer /var/www/crm-backend/dist/utils/companyResearch.js -type f"` returns ONLY videoCampaigns.js).
</verification>

<success_criteria>
- Helper companyResearch.js deployed and exports researchCompany() with the documented return shape.
- /preview-script + /regenerate-script both call researchCompany and build prompts with all 6 anti-hallucination rules verbatim.
- groundedness floor: helper's `heuristicGroundedness === 'low'` overrides any LLM upgrade.
- Response is backwards-compatible: existing wizard fields preserved; groundedness + sourceMeta added.
- Smoke test against 5 real companies: ≥3 resolve domains; SSL-error companies marked low; no script invents facts the website doesn't show.
- User has reviewed the 5 actual scripts and explicitly approved.
- Zero changes outside videoCampaigns.js and the new utils/companyResearch.js. No frontend changes. No DB changes. No new dependencies.
- CR ticket created + transitioned to Verified (or warning logged if ADMIN_SECRET_KEY missing).
- SSH ingress revoked.
</success_criteria>

<output>
After completion, create `.planning/quick/302-brandmonkz-video-wizard-replace-llm-from/302-SUMMARY.md` containing:
- Verified line numbers (preview-script handler, regenerate-script handler, AI_CONFIG location)
- Whether companyToDomain/hasMxRecords helpers were reused or written fresh, with file:line citations
- Diff stats (lines added/removed in videoCampaigns.js, new helper line count)
- Standalone helper smoke output (Task 1.7) verbatim
- End-to-end smoke output (Task 3.2) verbatim
- User's review verdict
- CR_ID and final transition status
- SSH revoke confirmation
</output>
