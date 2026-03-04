---
phase: quick-85
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - scripts/validate-api-contracts.py
  - .github/workflows/ci-complete.yml
autonomous: true
requirements: [QUICK-85]
must_haves:
  truths:
    - "Script extracts all OpenAPI paths from FastAPI app without running a server"
    - "Script extracts all iOS API paths from P2PAPIService.swift"
    - "Script extracts all Android Retrofit paths from DollorApiService.kt"
    - "Script extracts all Android OkHttp paths from CustomerRideshareApiService.kt and dead-code services"
    - "Dead-code service endpoints (ChatService, NegotiationService, CallService) are excluded from failure"
    - "Path params are normalized so {ride_id}, {rideId}, {id} all match {}"
    - "Script exits 0 when all real endpoints match, exits 1 on real mismatches"
    - "CI job runs on PRs and pushes without needing a real database"
  artifacts:
    - path: "scripts/validate-api-contracts.py"
      provides: "OpenAPI contract validator"
      min_lines: 150
    - path: ".github/workflows/ci-complete.yml"
      provides: "CI job for api-contracts validation"
      contains: "api-contracts"
  key_links:
    - from: "scripts/validate-api-contracts.py"
      to: "apps/web/p2p-platform/backend/main_new.py"
      via: "import main_new:app then app.openapi()"
      pattern: "from main_new import app"
    - from: "scripts/validate-api-contracts.py"
      to: "apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift"
      via: "regex extraction of URL paths"
      pattern: "P2PAPIService"
    - from: ".github/workflows/ci-complete.yml"
      to: "scripts/validate-api-contracts.py"
      via: "python scripts/validate-api-contracts.py"
      pattern: "validate-api-contracts"
---

<objective>
Build an OpenAPI-based CI contract validator that ensures iOS and Android API calls always match backend routes.

Purpose: Prevent API drift between clients and backend — any PR that adds a client call to a nonexistent endpoint fails CI automatically.
Output: `scripts/validate-api-contracts.py` + CI job in `ci-complete.yml` + local run output proving it works.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/quick/84-research-api-alignment-guarantee-strateg/API_ALIGNMENT_STRATEGY.md
@scripts/extract-api-endpoints.py
@.github/workflows/ci-complete.yml
</context>

<tasks>

<task type="auto">
  <name>Task 1: Build validate-api-contracts.py script</name>
  <files>scripts/validate-api-contracts.py</files>
  <action>
Create `scripts/validate-api-contracts.py` that does the following:

**1. OpenAPI spec extraction (no server needed):**
- Set env vars BEFORE importing: `DATABASE_URL=sqlite:///tmp/test.db`, `JWT_SECRET_KEY=ci-test-key`, `ENVIRONMENT=development` (so openapi_url is not None)
- `sys.path.insert(0, "apps/web/p2p-platform/backend")` then `from main_new import app`
- Call `app.openapi()` to get the spec dict
- Extract all path keys from `spec["paths"]`
- Normalize path params: regex replace `{anything}` with `{}` (e.g., `/api/rides/{ride_id}/track` -> `/api/rides/{}/track`)

**2. iOS path extraction from P2PAPIService.swift:**
- Read file at `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift`
- The file uses TWO URL patterns:
  - `\(baseURL)/path/to/endpoint` where baseURL = `{p2pAPIBaseURL}/api` (line 15). These paths need `/api/` prepended. Regex: `\(baseURL\)/([^"\\)]+)` — captures the relative path after baseURL
  - `\(AppConfig.shared.p2pAPIBaseURL)/api/path` for a few direct URLs (lines 13802+). Regex: `p2pAPIBaseURL\)/api/([^"\\)]+)` — captures path after /api/
- Both patterns produce paths like `/api/vendors/published`, `/api/rides/estimate`, etc.
- Replace Swift string interpolation `\(variableName)` in the captured path with `{}` for path param normalization (e.g., `\(orderId)` -> `{}`, `\(vendorId)` -> `{}`)
- Deduplicate extracted paths

**3. Android Retrofit path extraction from DollorApiService.kt:**
- Read file at relative path resolved from script location OR accept `--android-repo` arg (default: `/Users/jeet/StudioProjects/eatfair-android`)
- Regex: `@(GET|POST|PUT|DELETE|PATCH|PUT)\("([^"]+)"\)` from `shared/src/main/java/ai/dollor/shared/data/remote/DollorApiService.kt`
- Prepend `/api/` to each captured path (Retrofit base URL is `{baseUrl}/api/`)
- Normalize `{paramName}` -> `{}`

**4. Android OkHttp path extraction from CustomerRideshareApiService.kt:**
- Read `app/src/main/java/ai/dollor/customer/data/CustomerRideshareApiService.kt`
- Regex: `\.url\("?\$(?:BASE_URL|baseUrl)/api/([^"]+)"` — captures path after /api/
- Prepend `/api/` to captured path
- Replace `\$variableName` and `\${...}` kotlin interpolations with `{}`

**5. Android dead-code OkHttp services (ChatService.kt, NegotiationService.kt, CallService.kt):**
- Extract from `shared/src/main/java/ai/dollor/shared/data/remote/{ChatService,NegotiationService,CallService}.kt`
- Same OkHttp regex as step 4
- These are extracted but marked as EXCLUDED (dead code) — they do NOT cause exit 1

**6. Comparison logic:**
- For each iOS path and each Android path (non-excluded): check if the normalized path exists in the normalized OpenAPI paths set
- Print a report table: `Source | Path | Status` with PASS/FAIL/EXCLUDED
- Summary: total per source, pass count, fail count, excluded count
- `--skip-android` flag: skip all Android extraction (for CI when android repo not available)
- `--android-repo PATH` flag: override android repo root (default: `/Users/jeet/StudioProjects/eatfair-android`)
- Exit 0 if zero FAILs among non-excluded paths, exit 1 otherwise

**7. Additional exclusion list (hardcoded, with comments):**
- `/api/chat/*` paths from ChatService.kt — aspirational live chat, not implemented
- `/api/negotiations/*` paths from NegotiationService.kt — aspirational price negotiation
- `/api/call/*` paths from CallService.kt — aspirational voice call service
- Any path matching these prefixes from ANY source should be EXCLUDED, not FAIL

**Important implementation details:**
- Use `argparse` for CLI flags
- Script must work from repo root (`python scripts/validate-api-contracts.py`)
- Print to stdout, use stderr for errors only
- Use `pathlib.Path` for all file paths, resolve relative to script location
- Add shebang `#!/usr/bin/env python3`
- No external dependencies beyond what FastAPI's requirements.txt provides (the script imports main_new which needs its deps)
  </action>
  <verify>
Run locally from repo root:
```
cd /Users/jeet/doordash-p2p
python scripts/validate-api-contracts.py 2>&1 | head -50
echo "Exit code: $?"
```
Should show report with PASS/EXCLUDED entries and exit 0.

Also test --skip-android:
```
python scripts/validate-api-contracts.py --skip-android 2>&1 | tail -10
```
  </verify>
  <done>Script runs successfully, extracts paths from all 3 sources (OpenAPI, iOS, Android), normalizes path params, reports PASS for all real endpoints, EXCLUDED for dead-code services, and exits 0.</done>
</task>

<task type="auto">
  <name>Task 2: Add CI job and run local validation</name>
  <files>.github/workflows/ci-complete.yml</files>
  <action>
**CI job addition to `.github/workflows/ci-complete.yml`:**

Add a new job `api-contracts` after the `lint` job (same stage — no dependencies needed, runs in parallel with lint/semgrep/test):

```yaml
  api-contracts:
    name: API Contract Validation
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install backend dependencies
        working-directory: apps/web/p2p-platform/backend
        run: pip install -r requirements.txt

      - name: Validate API contracts
        run: python scripts/validate-api-contracts.py --skip-android
        env:
          DATABASE_URL: sqlite:///tmp/test.db
          JWT_SECRET_KEY: ci-test-key
          ENVIRONMENT: development
```

Key decisions:
- Uses `--skip-android` because the Android repo is separate and not checked out in this workflow
- iOS file IS in this repo so iOS validation runs in CI
- Installs full backend requirements.txt (needed to import main_new successfully)
- Sets env vars for sqlite (no postgres service needed for this job)
- Runs in parallel with lint/semgrep/test (no `needs:` dependency)
- Does NOT add to `quality-gate` `needs:` list — keep it non-blocking initially. Add to quality-gate once proven stable.

**Then run the full script locally** (with Android) and capture the output to `.planning/quick/85-implement-openapi-ci-contract-validator-/VALIDATION_REPORT.md`:
```bash
cd /Users/jeet/doordash-p2p
python scripts/validate-api-contracts.py 2>&1 | tee .planning/quick/85-implement-openapi-ci-contract-validator-/VALIDATION_REPORT.md
```
  </action>
  <verify>
1. Verify CI YAML is valid: `python -c "import yaml; yaml.safe_load(open('.github/workflows/ci-complete.yml'))"` (install pyyaml if needed, or use `python -c "import json"` — actually just check the job appears)
2. Grep for the new job: `grep -A 20 'api-contracts:' .github/workflows/ci-complete.yml`
3. Verify local run produced VALIDATION_REPORT.md: `cat .planning/quick/85-implement-openapi-ci-contract-validator-/VALIDATION_REPORT.md | tail -20`
4. Confirm exit code 0 from local run
  </verify>
  <done>CI workflow has api-contracts job that validates iOS endpoints against OpenAPI spec on every PR/push. Local validation report captured showing full results. Script exits 0 with all real endpoints matching.</done>
</task>

</tasks>

<verification>
1. `python scripts/validate-api-contracts.py` exits 0 (all real endpoints match)
2. `python scripts/validate-api-contracts.py --skip-android` exits 0 (iOS-only mode for CI)
3. `.github/workflows/ci-complete.yml` contains `api-contracts` job
4. VALIDATION_REPORT.md exists with full output
5. Dead-code services (chat, negotiations, call) are marked EXCLUDED, not FAIL
</verification>

<success_criteria>
- validate-api-contracts.py extracts 500+ OpenAPI paths, ~180+ iOS paths, ~190 Android paths (166 Retrofit + 24 OkHttp)
- All non-excluded client paths match an OpenAPI path
- Dead-code services (ChatService, NegotiationService, CallService ~16 endpoints) are excluded
- CI job added and will run on next PR/push to main
- Script has --skip-android and --android-repo flags for flexibility
</success_criteria>

<output>
After completion, create `.planning/quick/85-implement-openapi-ci-contract-validator-/85-SUMMARY.md`
</output>
