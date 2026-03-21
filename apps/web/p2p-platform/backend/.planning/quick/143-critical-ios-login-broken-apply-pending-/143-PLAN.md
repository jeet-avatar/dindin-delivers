---
phase: quick-143
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/entrypoint.sh
  - apps/web/p2p-platform/backend/Dockerfile.optimized
autonomous: true
requirements: [Q-143]

must_haves:
  truths:
    - "Customer login returns 200 or 401 (not 500) on production"
    - "Driver login returns 200 or 401 (not 500) on production"
    - "Alembic migrations run automatically on every container start"
    - "Vendor login (unaffected) continues to return 200"
  artifacts:
    - path: "apps/web/p2p-platform/backend/entrypoint.sh"
      provides: "Shell script that runs alembic upgrade head then exec uvicorn"
      contains: "alembic upgrade head"
    - path: "apps/web/p2p-platform/backend/Dockerfile.optimized"
      provides: "Updated production stage using ENTRYPOINT instead of CMD"
      contains: "entrypoint.sh"
  key_links:
    - from: "Dockerfile.optimized production stage"
      to: "entrypoint.sh"
      via: "COPY + ENTRYPOINT directive"
      pattern: "ENTRYPOINT.*entrypoint\\.sh"
    - from: "entrypoint.sh"
      to: "alembic upgrade head"
      via: "shell exec before uvicorn start"
      pattern: "alembic upgrade head"
---

<objective>
Fix production 500 errors on customer and driver login by ensuring pending Alembic migrations run automatically on container startup.

Purpose: Three pending migrations added columns that SQLAlchemy models now reference. Any query on Customer or Driver tables fails with ProgrammingError until migrations are applied. Login is completely broken for customers and drivers.

Output: entrypoint.sh + updated Dockerfile.optimized production stage + deployed to staging and production via CI/CD.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/p2p-platform/backend/.planning/PROJECT.md
@apps/web/p2p-platform/backend/.planning/STATE.md

Ticketed task skill: Every task must create a CR ticket via the admin API before code changes.
Skill: .agents/skills/ticketed-task/SKILL.md

Pending migrations (never applied to staging or production DB):
  - apps/web/p2p-platform/backend/alembic/versions/20260318_add_unpaid_balance_customers.py
  - apps/web/p2p-platform/backend/alembic/versions/20260320_add_driver_cancel_tracking.py

Current Dockerfile.optimized production stage CMD (lines 141-149):
  CMD ["uvicorn", "main_new:app",
       "--host", "0.0.0.0",
       "--port", "8080",
       "--workers", "4",
       "--loop", "uvloop",
       "--http", "httptools",
       "--no-access-log",
       "--proxy-headers",
       "--forwarded-allow-ips", "*"]
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create Change Request ticket and implement entrypoint + Dockerfile fix</name>
  <files>
    apps/web/p2p-platform/backend/entrypoint.sh
    apps/web/p2p-platform/backend/Dockerfile.optimized
  </files>
  <action>
    Step 0 — Create CR ticket (REQUIRED before code changes):
    ```bash
    CR_RESPONSE=$(curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/?secret_key=$ADMIN_SECRET_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "title": "CRITICAL: Apply pending Alembic migrations via Docker entrypoint",
        "description": "Customer and driver login return 500 because 2 pending Alembic migrations were never applied to production DB. Fix: add entrypoint.sh that runs alembic upgrade head before uvicorn, update Dockerfile.optimized production stage to use ENTRYPOINT.",
        "change_type": "infrastructure",
        "priority": "Critical",
        "requested_by": "support@dollor.ai"
      }')
    echo $CR_RESPONSE
    CR_ID=$(echo $CR_RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['cr_id'])")

    curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/$CR_ID/submit?secret_key=$ADMIN_SECRET_KEY"
    ```
    Save $CR_ID for use in commit message.

    Step 1 — Create apps/web/p2p-platform/backend/entrypoint.sh:
    ```bash
    #!/bin/sh
    set -e

    echo "[entrypoint] Running Alembic migrations..."
    alembic upgrade head
    echo "[entrypoint] Migrations complete. Starting uvicorn..."

    exec uvicorn main_new:app \
      --host 0.0.0.0 \
      --port 8080 \
      --workers 4 \
      --loop uvloop \
      --http httptools \
      --no-access-log \
      --proxy-headers \
      --forwarded-allow-ips "*"
    ```
    Use `exec` so uvicorn replaces the shell process (receives signals correctly).

    Step 2 — Update Dockerfile.optimized production stage (around lines 141-149):
    - BEFORE the existing CMD line, add these two lines:
      ```dockerfile
      COPY entrypoint.sh /app/entrypoint.sh
      RUN chmod +x /app/entrypoint.sh
      ```
    - Replace the CMD line:
      ```dockerfile
      ENTRYPOINT ["/app/entrypoint.sh"]
      ```
    IMPORTANT: The COPY must happen BEFORE the `USER appuser` line if the chmod requires root, OR after USER appuser if the file is already executable. Check: the production stage switches to non-root at line 131. Place the COPY + chmod BEFORE the USER appuser line (or use `RUN chmod` as the appuser since she owns /app).

    Looking at Dockerfile structure: USER appuser is at line 131, CMD is at lines 141-149. Insert COPY + RUN chmod between line 138 (EXPOSE) and old CMD lines. The appuser owns /app (per chown at line 125), so chmod +x will work as appuser.

    Step 3 — Commit:
    ```bash
    cd /Users/jeet/doordash-p2p
    git add apps/web/p2p-platform/backend/entrypoint.sh apps/web/p2p-platform/backend/Dockerfile.optimized
    git commit -m "fix(quick-143): [$CR_ID] add entrypoint.sh to run alembic migrations on container start — fixes customer/driver 500 login"
    ```
  </action>
  <verify>
    ```bash
    # Verify entrypoint.sh exists and contains the key lines
    grep -n "alembic upgrade head" apps/web/p2p-platform/backend/entrypoint.sh
    grep -n "exec uvicorn" apps/web/p2p-platform/backend/entrypoint.sh

    # Verify Dockerfile.optimized has entrypoint wired
    grep -n "entrypoint.sh" apps/web/p2p-platform/backend/Dockerfile.optimized
    grep -n "ENTRYPOINT" apps/web/p2p-platform/backend/Dockerfile.optimized

    # Confirm old CMD is gone from production stage (lines before STAGE 5)
    head -155 apps/web/p2p-platform/backend/Dockerfile.optimized | tail -20
    ```
  </verify>
  <done>entrypoint.sh exists with alembic upgrade head + exec uvicorn using exact same args as old CMD. Dockerfile.optimized production stage has ENTRYPOINT ["/app/entrypoint.sh"] instead of CMD. Committed to main with CR-ID in message.</done>
</task>

<task type="auto">
  <name>Task 2: Deploy to staging, smoke test login, deploy to production, verify</name>
  <files></files>
  <action>
    Step 1 — Push to remote and trigger staging deploy:
    ```bash
    cd /Users/jeet/doordash-p2p
    git push origin main
    gh workflow run deploy-staging.yml --ref main
    ```

    Step 2 — Monitor staging deploy (wait for completion):
    ```bash
    gh run list --workflow=deploy-staging.yml --limit 3
    # Get the run ID, then:
    gh run watch <run-id>
    ```

    Step 3 — Smoke test staging customer login (CRITICAL — must return 200 or 401, NOT 500):
    ```bash
    # Test customer login
    curl -s -o /dev/null -w "%{http_code}" \
      -H "Content-Type: application/json" \
      -H "User-Agent: Dollor/1.1 CFNetwork/1568 Darwin/24" \
      -X POST "https://d34u5ixl0bulv4.cloudfront.net/api/auth/customer/login" \
      -d '{"email": "demo.customer@dollor.ai", "password": "DemoCustomer2025!"}'

    # Test driver login
    curl -s -o /dev/null -w "%{http_code}" \
      -H "Content-Type: application/json" \
      -X POST "https://d34u5ixl0bulv4.cloudfront.net/api/auth/driver/login" \
      -d '{"email": "demo.driver@dollor.ai", "password": "DemoDriver2025!"}'
    ```
    Both must return 200. If either returns 500, stop — do not deploy to production.

    Step 4 — If staging smoke test passes, deploy to production:
    ```bash
    gh workflow run deploy-dollar-ai.yml
    gh run list --workflow=deploy-dollar-ai.yml --limit 3
    gh run watch <run-id>
    ```

    Step 5 — Verify production login (must return 200 or 401, NOT 500):
    ```bash
    # Customer login production
    curl -s -o /dev/null -w "%{http_code}" \
      -H "Content-Type: application/json" \
      -H "User-Agent: Dollor/1.1 CFNetwork/1568 Darwin/24" \
      -X POST "https://api.dollor.ai/api/auth/customer/login" \
      -d '{"email": "demo.customer@dollor.ai", "password": "DemoCustomer2025!"}'

    # Driver login production
    curl -s -o /dev/null -w "%{http_code}" \
      -H "Content-Type: application/json" \
      -X POST "https://api.dollor.ai/api/auth/driver/login" \
      -d '{"email": "demo.driver@dollor.ai", "password": "DemoDriver2025!"}'
    ```
    Both must return 200.

    Step 6 — Transition CR to Verified:
    ```bash
    curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/$CR_ID/transition?secret_key=$ADMIN_SECRET_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "new_status": "Verified",
        "metadata": {"smoke_test": "customer 200, driver 200 on production"},
        "actor_email": "system@dollor.ai",
        "role": "system"
      }'
    ```
  </action>
  <verify>
    Show actual curl output from production:
    - Customer login: HTTP 200
    - Driver login: HTTP 200
    - gh run view output showing all CI jobs PASSED
  </verify>
  <done>Production customer login returns 200. Production driver login returns 200. CI/CD run shows all jobs PASSED. CR transitioned to Verified.</done>
</task>

</tasks>

<verification>
End-to-end proof required before declaring complete:

```bash
# 1. File proof
grep -n "alembic upgrade head" apps/web/p2p-platform/backend/entrypoint.sh
grep -n "ENTRYPOINT" apps/web/p2p-platform/backend/Dockerfile.optimized

# 2. Production login proof (show actual HTTP codes)
curl -s -o /dev/null -w "Customer login: %{http_code}\n" \
  -H "Content-Type: application/json" \
  -X POST "https://api.dollor.ai/api/auth/customer/login" \
  -d '{"email": "demo.customer@dollor.ai", "password": "DemoCustomer2025!"}'

curl -s -o /dev/null -w "Driver login: %{http_code}\n" \
  -H "Content-Type: application/json" \
  -X POST "https://api.dollor.ai/api/auth/driver/login" \
  -d '{"email": "demo.driver@dollor.ai", "password": "DemoDriver2025!"}'

# 3. CI/CD run proof
gh run view <production-run-id>
```

Expected: Customer login 200, Driver login 200, all CI jobs PASSED.
</verification>

<success_criteria>
- entrypoint.sh exists with `alembic upgrade head` + `exec uvicorn` (same args as old CMD)
- Dockerfile.optimized production stage uses `ENTRYPOINT ["/app/entrypoint.sh"]` instead of CMD
- Staging smoke test: customer login 200, driver login 200
- Production smoke test: customer login 200, driver login 200
- CI/CD production run shows all jobs PASSED
- CR ticket transitioned to Verified
</success_criteria>

<output>
After completion, create .planning/quick/143-critical-ios-login-broken-apply-pending-/143-SUMMARY.md
</output>
