---
phase: quick-280
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .env (EC2 production — SMTP vars + FRONTEND_BASE_URL)
autonomous: false
requirements: [Q284, Q285, Q286, Q287, Q288]
must_haves:
  truths:
    - "https://artha.build returns HTTP 200"
    - "Free email providers (gmail.com, yahoo.com) are rejected at signup with 400"
    - "Login for unverified email returns 403 with verification message"
    - "Alembic migration 22a_free_tier_script_counter applied (script_generations table exists)"
    - "Email is delivered via Google Workspace SMTP (smtp.gmail.com:587)"
  artifacts:
    - path: "src/backend/alembic/versions/22a_free_tier_script_counter.py"
      provides: "ScriptGeneration table migration"
    - path: "src/backend/email_utils.py"
      provides: "HTML email functions (welcome, password changed, script deployed, quota warning, invite upgrade)"
  key_links:
    - from: "EC2 .env"
      to: "email_utils.py"
      via: "SMTP_HOST=smtp.gmail.com, SMTP_USER, SMTP_PASSWORD"
      pattern: "SMTP_HOST.*smtp\\.gmail\\.com"
---

<objective>
Deploy commits from branch `gsd/phase-22-launchos-smb-platform` (Q284-Q288) to EC2 production at 44.194.34.223 (https://artha.build).

Purpose: Launch-prep features — download button, free-tier quota, landing comparison, email notifications, and email verification gate — are committed but not yet live.
Output: All Q284-Q288 features running in production Docker Compose with Google Workspace SMTP configured.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/doordash-p2p/apps/arthaBuild/.planning/STATE.md
@/Users/jeet/doordash-p2p/apps/arthaBuild/CLAUDE.md
@/Users/jeet/doordash-p2p/apps/arthaBuild/docker-compose.yml
@/Users/jeet/doordash-p2p/apps/arthaBuild/docker-compose.prod.yml
</context>

<tasks>

<task type="checkpoint:human-action">
  <name>Task 1: Generate Google App Password for artha.build@artha.build</name>
  <action>
    Before any deploy steps can succeed, Google Workspace SMTP requires an app-specific password (not the account login password). This requires 2-Step Verification to be active on the artha.build@artha.build Google account.

    Steps:
    1. Sign in to https://myaccount.google.com with artha.build@artha.build
    2. Go to Security → 2-Step Verification → confirm it is ON. If not, enable it first.
    3. Go to Security → App passwords (URL: https://myaccount.google.com/apppasswords)
    4. Select app: "Mail" (or type a custom name like "ArthaBuild SMTP")
    5. Select device: "Other" → type "EC2 ArthaBuild"
    6. Click Generate
    7. Copy the 16-character app password (shown once — save it now)

    Note: If "App passwords" is not visible, 2-Step Verification is not active. Enable it first, then return to App passwords.
  </action>
  <verify>You have a 16-character app password in the format: xxxx xxxx xxxx xxxx</verify>
  <done>Google App Password generated and saved. Ready to set in EC2 .env file.</done>
</task>

<task type="auto">
  <name>Task 2: Push branch, SSH to EC2, update .env, pull code, rebuild frontend, run migration, restart services</name>
  <files>
    apps/arthaBuild/src/frontend/dist/ (rebuilt on EC2)
    apps/arthaBuild/.env (updated on EC2 — SMTP vars + FRONTEND_BASE_URL)
  </files>
  <action>
    Run each step below in sequence. Replace GOOGLE_APP_PASSWORD with the 16-char password from Task 1 (no spaces).

    **Step 1 — Push branch to remote:**
    ```bash
    cd /Users/jeet/doordash-p2p
    git push origin gsd/phase-22-launchos-smb-platform
    ```
    Expected: "Branch 'gsd/phase-22-launchos-smb-platform' set up to track remote branch" or "Everything up-to-date"

    **Step 2 — SSH and update .env on EC2:**
    ```bash
    ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223
    ```
    Once connected, find the ArthaBuild directory (likely ~/arthaBuild or ~/apps/arthaBuild):
    ```bash
    ls ~/arthaBuild 2>/dev/null || ls ~/apps/arthaBuild 2>/dev/null || find /home/ubuntu -name "docker-compose.yml" -maxdepth 4 2>/dev/null | head -3
    cd <ARTHABUILD_DIR>
    ```

    Add/update these .env entries (use nano or echo >> .env):
    ```
    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=587
    SMTP_USER=artha.build@artha.build
    SMTP_PASSWORD=<GOOGLE_APP_PASSWORD_NO_SPACES>
    SMTP_FROM=noreply@artha.build
    FRONTEND_BASE_URL=https://artha.build
    ```
    Command to set each (replace existing line if present, add if missing):
    ```bash
    # For each var, use sed to update or append:
    grep -q "^SMTP_HOST=" .env && sed -i 's|^SMTP_HOST=.*|SMTP_HOST=smtp.gmail.com|' .env || echo "SMTP_HOST=smtp.gmail.com" >> .env
    grep -q "^SMTP_PORT=" .env && sed -i 's|^SMTP_PORT=.*|SMTP_PORT=587|' .env || echo "SMTP_PORT=587" >> .env
    grep -q "^SMTP_USER=" .env && sed -i 's|^SMTP_USER=.*|SMTP_USER=artha.build@artha.build|' .env || echo "SMTP_USER=artha.build@artha.build" >> .env
    grep -q "^SMTP_FROM=" .env && sed -i 's|^SMTP_FROM=.*|SMTP_FROM=noreply@artha.build|' .env || echo "SMTP_FROM=noreply@artha.build" >> .env
    grep -q "^FRONTEND_BASE_URL=" .env && sed -i 's|^FRONTEND_BASE_URL=.*|FRONTEND_BASE_URL=https://artha.build|' .env || echo "FRONTEND_BASE_URL=https://artha.build" >> .env
    # SMTP_PASSWORD must be set manually (contains spaces in raw form — use no-spaces version):
    grep -q "^SMTP_PASSWORD=" .env && sed -i "s|^SMTP_PASSWORD=.*|SMTP_PASSWORD=<GOOGLE_APP_PASSWORD>|" .env || echo "SMTP_PASSWORD=<GOOGLE_APP_PASSWORD>" >> .env
    ```
    Verify: `grep -E "^SMTP_|^FRONTEND_BASE_URL=" .env`
    Expected output shows all 5 vars with correct values.

    **Step 3 — Pull latest code:**
    ```bash
    git fetch origin
    git checkout gsd/phase-22-launchos-smb-platform
    git pull origin gsd/phase-22-launchos-smb-platform
    ```
    Expected: "Already up to date" or file list showing Q284-Q288 files.

    **Step 4 — Rebuild frontend:**
    ```bash
    cd src/frontend
    npm install
    npm run build
    cd ../..
    ```
    Expected: `dist/index.html` created. No TypeScript errors.

    **Step 5 — Run Alembic migration (creates script_generations table for Q285):**
    ```bash
    docker-compose exec backend alembic upgrade head
    ```
    Expected output includes: `Running upgrade ... -> 22a_free_tier_script_counter` (or "No migrations to run" if already applied).
    If backend container is not yet running (first deploy), run migration after Step 6.

    **Step 6 — Rebuild backend image and restart all services:**
    Determine which compose files are used in production. Check with:
    ```bash
    ls *.env *.yml 2>/dev/null
    ```
    Then run (use prod override if SSL certs are mounted):
    ```bash
    # Standard prod restart:
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build backend
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d nginx
    ```
    Or if only base compose is used:
    ```bash
    docker-compose up -d --build backend
    ```
    Expected: "arthaBuild-backend ... Started"

    **Step 7 — Run migration if skipped in Step 5:**
    ```bash
    docker-compose exec backend alembic upgrade head
    ```

    **Step 8 — Verify health:**
    ```bash
    curl -s https://artha.build/health | python3 -m json.tool
    ```
    Expected: `{"status": "ok"}`
  </action>
  <verify>
    All four checks must pass:
    1. `curl -s https://artha.build/health` → `{"status": "ok"}`
    2. `curl -s -X POST https://artha.build/api/auth/register -H "Content-Type: application/json" -d '{"email":"test@gmail.com","password":"Test1234!","name":"Test"}' | python3 -m json.tool` → HTTP 400 with message about company email required
    3. `docker-compose exec backend alembic current` → shows `22a_free_tier_script_counter (head)` or current head includes it
    4. `grep "SMTP_HOST=smtp.gmail.com" .env` → returns the line
  </verify>
  <done>
    - https://artha.build returns HTTP 200
    - Free email block active (gmail.com rejected at /api/auth/register)
    - Alembic migration 22a applied (script_generations table exists)
    - SMTP env vars point to smtp.gmail.com with app password
  </done>
</task>

<task type="checkpoint:human-verify">
  <name>Task 3: Browser verification of visual features (Q284 + Q286)</name>
  <what-built>
    Q284: Download .js button appears in chat when ArthaBuild generates a SuiteScript (intent=generate_suitescript).
    Q286: "ChatGPT vs ArthaBuild" hallucination comparison section visible on the landing page (https://artha.build).
    Q288: Login attempt with unverified email returns a verification message instead of a token.
  </what-built>
  <how-to-verify>
    1. Visit https://artha.build — confirm the page loads and the hallucination comparison section is visible (three side-by-side examples: ChatGPT wrong / ArthaBuild correct).

    2. Register a new account with a company email (non-Gmail/Yahoo/Outlook domain), verify email, then log in. In chat, ask: "Write a SuiteScript to get all open sales orders." When the response appears, confirm a "Download .js" button is visible below the code block.

    3. Test login gate: register a new company-email account but do NOT click the verification link. Attempt to log in → should receive a 403 or error message saying "verify your email first" (not a JWT token).

    Type "approved" if all three work, or describe which checks failed.
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues found</resume-signal>
</task>

</tasks>

<verification>
- curl https://artha.build/health → {"status": "ok"}
- Free email block: POST /api/auth/register with gmail.com email → 400
- Login gate: unverified account login → 403 (not a token)
- Alembic: `docker-compose exec backend alembic current` includes 22a_free_tier_script_counter
- SMTP: .env has SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, SMTP_USER=artha.build@artha.build
- Visual: Download .js button appears for generate_suitescript intent
- Visual: Hallucination comparison section visible on landing page
</verification>

<success_criteria>
- https://artha.build live and healthy (HTTP 200)
- All Q284-Q288 features active in production
- Google Workspace SMTP configured (smtp.gmail.com:587 with app password)
- Alembic migration 22a applied (free-tier script quota table exists)
- Free email block and login verification gate enforced
- User has confirmed visual features (Download .js + landing comparison) via browser
</success_criteria>

<output>
After completion, create `/Users/jeet/doordash-p2p/apps/arthaBuild/.planning/quick/280-deploy-q284-q288-to-ec2-production-with-/280-SUMMARY.md`
</output>
