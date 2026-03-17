---
phase: quick-182
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/ableton-chatbot/backend/stripe_routes.py
  - apps/ableton-chatbot/backend/main.py
  - apps/ableton-chatbot/backend/musai_auth.py
  - apps/ableton-chatbot/backend/database.py
  - apps/ableton-chatbot/backend/.env.example
  - apps/ableton-chatbot/backend/Dockerfile
  - apps/ableton-chatbot/bridge/build_app.sh
  - "apps/ableton-chatbot/bridge/Musai Bridge.spec"
  - apps/ableton-chatbot/frontend/public/install-musai-bridge.command
  - apps/ableton-chatbot/.github/workflows/deploy.yml
  - .github/workflows/deploy-beatmind.yml
autonomous: false
requirements: [BEATMIND-LIVE]

must_haves:
  truths:
    - "All user-visible Musai references are replaced with BeatMind across backend, bridge, and installer"
    - "CI/CD workflow at .github/workflows/deploy-beatmind.yml deploys backend to ECS and optionally frontend to S3/CloudFront"
    - "User has clear checklist of Stripe dashboard actions needed to go live"
  artifacts:
    - path: ".github/workflows/deploy-beatmind.yml"
      provides: "CI/CD workflow for BeatMind backend + frontend deployment"
    - path: "apps/ableton-chatbot/bridge/build_app.sh"
      provides: "Bridge build script with BeatMind branding"
  key_links:
    - from: ".github/workflows/deploy-beatmind.yml"
      to: "ECS beatmind-api-service"
      via: "aws ecs update-service"
      pattern: "beatmind-api-service"
---

<objective>
Take BeatMind.io fully live by updating all remaining Musai branding to BeatMind in backend/bridge code, verifying the CI/CD workflow, and providing the user with the exact Stripe dashboard steps needed to switch from test to live keys.

Purpose: BeatMind frontend and backend are deployed but still have internal Musai references and Stripe is in test mode. This task cleans up branding and prepares for live payments.
Output: Rebranded codebase, working CI/CD, Stripe go-live checklist
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/ableton-chatbot/backend/main.py
@apps/ableton-chatbot/backend/stripe_routes.py
@apps/ableton-chatbot/backend/musai_auth.py
@apps/ableton-chatbot/backend/database.py
@apps/ableton-chatbot/backend/Dockerfile
@apps/ableton-chatbot/backend/.env.example
@apps/ableton-chatbot/bridge/build_app.sh
@apps/ableton-chatbot/bridge/Musai Bridge.spec
@apps/ableton-chatbot/frontend/public/install-musai-bridge.command
@apps/ableton-chatbot/.github/workflows/deploy.yml
@.github/workflows/deploy-beatmind.yml
</context>

<tasks>

<task type="auto">
  <name>Task 1: Rebrand all Musai references to BeatMind in backend, bridge, and installer</name>
  <files>
    apps/ableton-chatbot/backend/stripe_routes.py
    apps/ableton-chatbot/backend/main.py
    apps/ableton-chatbot/backend/musai_auth.py
    apps/ableton-chatbot/backend/database.py
    apps/ableton-chatbot/backend/.env.example
    apps/ableton-chatbot/backend/Dockerfile
    apps/ableton-chatbot/bridge/build_app.sh
    apps/ableton-chatbot/bridge/Musai Bridge.spec
    apps/ableton-chatbot/frontend/public/install-musai-bridge.command
    apps/ableton-chatbot/.github/workflows/deploy.yml
  </files>
  <action>
    Update all remaining Musai/musai references to BeatMind/beatmind across the codebase. Specific changes:

    **Backend comments/strings (update text only, NOT import paths or filenames):**
    - `stripe_routes.py:2` — docstring "Musai subscriptions" -> "BeatMind subscriptions"
    - `musai_auth.py:2` — docstring "Musai" -> "BeatMind"
    - `database.py:2` — docstring "Musai" -> "BeatMind"
    - `main.py:34` — logger name `logging.getLogger("musai")` -> `logging.getLogger("beatmind")`
    - `database.py:9` — default DB_PATH fallback `"musai.db"` -> `"beatmind.db"` (ECS uses env var `/data/musai.db` so this only affects local dev)
    - `.env.example:14` — `DB_PATH=musai.db` -> `DB_PATH=beatmind.db`
    - `.env.example:15` — `FRONTEND_URL=https://musai.io` -> `FRONTEND_URL=https://www.beatmind.io`
    - `Dockerfile:20` — `ENV DB_PATH=/data/musai.db` -> `ENV DB_PATH=/data/beatmind.db`

    **IMPORTANT: Do NOT rename the file `musai_auth.py` itself** — that would break imports in `main.py` and `stripe_routes.py` without renaming the file and all import references. The file can be renamed in a follow-up if desired, but the import `from musai_auth import ...` in main.py and stripe_routes.py must stay consistent with the actual filename. Just update the docstring inside it.

    **Bridge build script + spec:**
    - `build_app.sh` — Replace all "Musai Bridge" with "BeatMind Bridge", "com.zietra.musai-bridge" with "com.zietra.beatmind-bridge"
    - `Musai Bridge.spec` — Replace all "Musai Bridge" with "BeatMind Bridge", "com.zietra.musai-bridge" with "com.zietra.beatmind-bridge"
    - Rename `apps/ableton-chatbot/bridge/Musai Bridge.spec` to `apps/ableton-chatbot/bridge/BeatMind Bridge.spec` (use `git mv`)

    **Frontend installer:**
    - `install-musai-bridge.command` — Replace all "Musai" with "BeatMind", `$HOME/.musai` with `$HOME/.beatmind`
    - Rename to `install-beatmind-bridge.command` (use `git mv`)

    **Old deploy workflow (inside ableton-chatbot):**
    - `apps/ableton-chatbot/.github/workflows/deploy.yml` — Update name to "Deploy BeatMind", replace `musai-production` with `dollor-production`, `musai-api-service` with `beatmind-api-service`. NOTE: This file is the OLD workflow that is NOT used (the real one is at `.github/workflows/deploy-beatmind.yml`). Update it for consistency or delete it since the real workflow is at the repo root.

    **NOTE on DB_PATH in ECS**: The ECS task definition currently has `DB_PATH=/data/musai.db`. After this code change, the Dockerfile default changes to `/data/beatmind.db`. The ECS task def env var will override the Dockerfile default, so existing data at `/data/musai.db` on EFS will still be used. When the user is ready, they can update the ECS task def env var and rename/symlink the file on EFS. For now, add a comment in the Dockerfile: `# NOTE: ECS task def may override to /data/musai.db for backward compat with existing EFS data`
  </action>
  <verify>
    Run: `grep -rn "[Mm]usai" apps/ableton-chatbot/ --include="*.py" --include="*.sh" --include="*.spec" --include="*.command" --include="*.yml" --include="*.example" | grep -v "musai_auth" | grep -v "from musai_auth" | grep -v "import musai_auth" | grep -v "node_modules" | grep -v ".next"`
    Expected: Zero matches (only musai_auth filename references remain, which are import paths matching the actual filename).
  </verify>
  <done>All user-visible and internal Musai branding replaced with BeatMind. File `musai_auth.py` keeps its name but docstring is updated. Bridge spec and installer renamed.</done>
</task>

<task type="auto">
  <name>Task 2: Verify and finalize CI/CD workflow + deploy rebranded backend</name>
  <files>
    .github/workflows/deploy-beatmind.yml
  </files>
  <action>
    The CI/CD workflow already exists at `.github/workflows/deploy-beatmind.yml`. Verify it is correct and complete:

    1. **Review the existing workflow** — it already has:
       - Trigger on push to `apps/ableton-chatbot/**` paths on main
       - `workflow_dispatch` for manual triggers
       - Backend job: ECR login, docker build, push, ECS update-service, wait for stability, health check
       - Frontend job: npm ci, build, S3 sync, CloudFront invalidation (conditional on `[frontend]` in commit message or workflow_dispatch)

    2. **Verify env vars are correct:**
       - ECR_REPOSITORY: `musai-api` (this is the actual ECR repo name — do NOT change, it matches AWS)
       - ECS_CLUSTER: `dollor-production`
       - ECS_SERVICE: `beatmind-api-service`
       - S3_BUCKET: `beatmind-frontend`
       - CLOUDFRONT_DISTRIBUTION_ID: `E3F24X4TEVJ9X2`

    3. **If any issues found**, fix them. The workflow looks complete. No changes expected unless review reveals issues.

    4. **Deploy the rebranded backend** using CI/CD:
       - Commit branding changes from Task 1
       - Push to main: `git push origin main`
       - The workflow will auto-trigger (path filter matches `apps/ableton-chatbot/**`)
       - If auto-trigger doesn't fire, manually trigger: `gh workflow run deploy-beatmind.yml --ref main`
       - Monitor: `gh run list --workflow=deploy-beatmind.yml --limit 3`
       - Wait for completion: `gh run watch <run-id>`
       - Verify: `curl -s https://api.beatmind.io/api/health` returns `{"status": "ok"}`

    **IMPORTANT**: Per CLAUDE.md rules, use CI/CD only. Never run manual docker/aws commands.

    **NOTE on DB_PATH**: The Dockerfile default changed to `/data/beatmind.db` but ECS task def still has `DB_PATH=/data/musai.db` as an environment variable override. This means the deployed container will STILL use `/data/musai.db` on EFS — no data migration needed now. The user can update the ECS task def env var later if they want to rename the DB file.
  </action>
  <verify>
    1. `gh run list --workflow=deploy-beatmind.yml --limit 1` shows a successful run
    2. `curl -s https://api.beatmind.io/api/health` returns `{"status": "ok"}`
  </verify>
  <done>Rebranded backend deployed to production via CI/CD. Health check passes.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Rebranded all Musai references to BeatMind and deployed via CI/CD. The backend is live at api.beatmind.io with updated branding.

    **Stripe live switch — COMPLETED via CLI:**
    - Live product, price ($19/mo), and webhook all created
    - ECS task def updated with live keys (revision 5)
    - Backend redeployed and stable

    **Optional (can do later):**
    - Add 7-day free trial to Stripe price
    - Rename EFS DB file from `musai.db` to `beatmind.db` and update ECS `DB_PATH` env var
    - Rename `musai_auth.py` to `beatmind_auth.py` and update all imports
    - Clean up test accounts
  </what-built>
  <how-to-verify>
    1. Visit https://api.beatmind.io/api/health — should return {"status": "ok"}
    2. Visit https://www.beatmind.io — landing page renders correctly
    3. Complete the Stripe dashboard steps above
    4. After updating ECS env vars and redeploying, test a subscription flow at https://www.beatmind.io/signup
  </how-to-verify>
  <resume-signal>Type "approved" when Stripe live keys are configured, or describe any issues</resume-signal>
</task>

</tasks>

<verification>
- `grep -rn "[Mm]usai" apps/ableton-chatbot/ | grep -v musai_auth | grep -v node_modules | grep -v .next` returns zero matches
- `curl -s https://api.beatmind.io/api/health` returns ok
- CI/CD workflow successfully deploys on push to main
</verification>

<success_criteria>
- All Musai branding replaced with BeatMind (except musai_auth.py filename)
- Backend deployed to production via CI/CD with health check passing
- User has clear Stripe dashboard checklist for live key switch
- CI/CD workflow verified and operational for future deployments
</success_criteria>

<output>
After completion, create `.planning/quick/182-take-beatmind-io-fully-live-switch-strip/182-SUMMARY.md`
</output>
