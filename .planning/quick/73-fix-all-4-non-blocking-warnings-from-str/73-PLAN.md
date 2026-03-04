---
phase: quick-73
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/main_new.py
  - apps/web/p2p-platform/backend/bid_routes.py
autonomous: true
requirements: [WARN-1, WARN-2, WARN-3, WARN-4]

must_haves:
  truths:
    - "App Store Connect appInfoLocalizations has supportUrl set to https://www.dollor.ai/support"
    - "POST /api/rides/estimate rejects coordinates outside [-90,90] lat and [-180,180] lng with 400"
    - "GET /api/vendors/published?search=zzz returns 0 vendors (not all 16)"
    - "demo.customer@dollor.ai login is never blocked by rate limiter"
  artifacts:
    - path: "apps/web/p2p-platform/backend/main_new.py"
      provides: "Coordinate validation, vendor search filter, demo rate limit exemption"
    - path: "apps/web/p2p-platform/backend/bid_routes.py"
      provides: "Coordinate validation on Pydantic FareEstimateInput"
  key_links:
    - from: "main_new.py:customer_auth_login"
      to: "check_rate_limit"
      via: "Skip for demo email before calling rate limiter"
      pattern: "demo\\.customer@dollor\\.ai"
    - from: "main_new.py:get_published_vendors"
      to: "Vendor.restaurant_name"
      via: "ilike search filter on restaurant_name and cuisine_type"
      pattern: "ilike.*search"
---

<objective>
Fix all 4 non-blocking warnings from quick-72 stress test, then deploy backend to staging and production.

Purpose: Clear remaining warnings so the App Store submission is clean with zero known issues.
Output: Backend code fixes deployed + ASC metadata updated.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/72-final-stress-test-for-customer-app-build/72-SUMMARY.md
@.planning/quick/70-fix-4-app-store-blockers-for-customer-ap/70-SUMMARY.md
@apps/web/p2p-platform/backend/main_new.py
@apps/web/p2p-platform/backend/bid_routes.py
@apps/web/p2p-platform/backend/cache.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix all 4 backend warnings + ASC supportUrl metadata</name>
  <files>
    apps/web/p2p-platform/backend/main_new.py
    apps/web/p2p-platform/backend/bid_routes.py
  </files>
  <action>
**WARNING 1 -- ASC supportUrl (API call, no code change):**

Quick-70 set supportUrl on `appStoreVersionLocalizations/b43df02d-dbe1-4a41-8841-1489202a10c4` but the stress test found `supportUrl` is null on `appInfoLocalizations`. These are DIFFERENT ASC resources.

Fix: Generate App Store Connect JWT (ES256, kid=9K626GB728, iss=80d10e49-f379-462f-9668-5ea53016812e, key at ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8). Then:
1. GET `https://api.appstoreconnect.apple.com/v1/apps/{appId}/appInfos` to find appInfo IDs
2. For each appInfo, GET `https://api.appstoreconnect.apple.com/v1/appInfos/{id}/appInfoLocalizations` to find localization IDs
3. PATCH `https://api.appstoreconnect.apple.com/v1/appInfoLocalizations/{localization_id}` with body:
   ```json
   {"data":{"type":"appInfoLocalizations","id":"{localization_id}","attributes":{"supportUrl":"https://www.dollor.ai/support"}}}
   ```
4. Verify the PATCH returns 200 and the supportUrl is set.

App ID for customer app: use `com.dollorai.customer` bundle ID to find app. The app ID from quick-70 context is the one used for version queries.

**WARNING 2 -- Coordinate validation (code change):**

A. In `apps/web/p2p-platform/backend/main_new.py`, function `get_fare_estimate_android` (line ~19156):
   - After extracting pickup_lat/pickup_lng/dropoff_lat/dropoff_lng, ADD validation:
   ```python
   # Validate coordinate ranges
   if not (-90 <= pickup_lat <= 90) or not (-90 <= dropoff_lat <= 90):
       raise HTTPException(status_code=400, detail="Invalid coordinates: latitude must be between -90 and 90")
   if not (-180 <= pickup_lng <= 180) or not (-180 <= dropoff_lng <= 180):
       raise HTTPException(status_code=400, detail="Invalid coordinates: longitude must be between -180 and 180")
   ```
   Place this AFTER the coordinate extraction (lines 19158-19161) and BEFORE the Haversine calculation.

B. In `apps/web/p2p-platform/backend/bid_routes.py`, class `FareEstimateInput` (line ~2136):
   - Add Pydantic `Field` validators to constrain coordinate ranges:
   ```python
   from pydantic import Field

   class FareEstimateInput(BaseModel):
       pickup_latitude: float = Field(..., ge=-90, le=90)
       pickup_longitude: float = Field(..., ge=-180, le=180)
       dropoff_latitude: float = Field(..., ge=-90, le=90)
       dropoff_longitude: float = Field(..., ge=-180, le=180)
       ride_type: str = "standard"
   ```
   Pydantic will automatically return 422 for out-of-range values. This is acceptable (422 is validation error).

C. In `apps/web/p2p-platform/backend/main_new.py`, function `estimate_fare_frontend` (line ~3794):
   - After the `if not all([...])` check (line 3811), add the same coordinate validation:
   ```python
   if not (-90 <= pickup_lat <= 90) or not (-90 <= dropoff_lat <= 90):
       raise HTTPException(status_code=400, detail="Invalid coordinates: latitude must be between -90 and 90")
   if not (-180 <= pickup_lng <= 180) or not (-180 <= dropoff_lng <= 180):
       raise HTTPException(status_code=400, detail="Invalid coordinates: longitude must be between -180 and 180")
   ```

**WARNING 3 -- Vendor search filter (code change):**

In `apps/web/p2p-platform/backend/main_new.py`, function `get_published_vendors` (line ~10029):
- Add `search` query parameter to the function signature:
  ```python
  def get_published_vendors(
      platform: str = Query("all", description="Platform filter"),
      search: Optional[str] = Query(None, description="Search by restaurant name or cuisine"),
      limit: int = Query(100, le=500),
      offset: int = Query(0),
      db: Session = Depends(get_db)
  ):
  ```
  Ensure `Optional` is imported (it should already be from typing).

- After the platform filter block (after line ~10067), add search filter:
  ```python
  # Optional search filter on restaurant name or cuisine
  if search:
      search_term = f"%{search}%"
      from sqlalchemy import or_
      query = query.filter(
          or_(
              Vendor.restaurant_name.ilike(search_term),
              Vendor.cuisine_type.ilike(search_term)
          )
      )
  ```
  Note: `or_` is already imported from sqlalchemy inside the platform filter block. Move the `from sqlalchemy import or_` to BEFORE both blocks, or use the existing import.

- Also update the cache key to include search param so cached results don't ignore the filter:
  ```python
  cache_key = f"vendors:published:{platform}:{search or ''}:{limit}:{offset}"
  ```
  And only cache when search is None (no point caching search queries):
  ```python
  if platform == "all" and offset == 0 and not search:
  ```

**WARNING 4 -- Demo rate limit exemption (code change):**

In `apps/web/p2p-platform/backend/main_new.py`, function `customer_auth_login` (line ~3056):
- Move the rate limit check AFTER reading `form_data.username`, and skip for demo accounts:
  ```python
  # SECURITY: Rate limit login attempts to prevent brute force
  # Exempt demo accounts to prevent Apple reviewers from being blocked during rapid testing
  DEMO_EMAILS = {"demo.customer@dollor.ai", "demo.driver@dollor.ai", "demo.restaurant@dollor.ai"}
  if form_data.username not in DEMO_EMAILS:
      check_rate_limit(request, auth_rate_limiter, "customer_login")
  ```

- Apply the same pattern to the OTHER login endpoints that use `check_rate_limit`:
  - `vendor_login` (line ~1761): Skip for `demo.restaurant@dollor.ai`
  - `login` (admin login, line ~1735): Skip for `support@dollor.ai` demo admin
  - `driver_login`: Find and apply same pattern for `demo.driver@dollor.ai`

  For consistency, define `DEMO_EMAILS` as a module-level constant near the other rate limiter definitions (around line 448):
  ```python
  # Demo accounts exempt from auth rate limiting (Apple App Store reviewers)
  DEMO_EMAILS = frozenset({
      "demo.customer@dollor.ai",
      "demo.driver@dollor.ai",
      "demo.restaurant@dollor.ai",
      "support@dollor.ai"
  })
  ```
  Then in each login function, replace `check_rate_limit(request, auth_rate_limiter, ...)` with:
  ```python
  if form_data.username not in DEMO_EMAILS:
      check_rate_limit(request, auth_rate_limiter, "customer_login")
  ```
  </action>
  <verify>
1. Run backend tests: `cd apps/web/p2p-platform/backend && python -m pytest tests/ -x -q` -- all must pass
2. Verify coordinate validation: Start local server, `curl -X POST http://localhost:8080/api/rides/estimate -H 'Content-Type: application/json' -d '{"pickup_latitude":91,"pickup_longitude":0,"dropoff_latitude":0,"dropoff_longitude":0}'` should return 400
3. Verify vendor search: `curl http://localhost:8080/api/vendors/published?search=zzz` should return `"total": 0`
4. Verify ASC supportUrl: GET appInfoLocalizations and confirm supportUrl is set
  </verify>
  <done>
- ASC appInfoLocalizations supportUrl = "https://www.dollor.ai/support"
- Extreme coordinates (91, 181) return 400/422 on all 3 fare estimate endpoints
- Vendor search filtering works (search=zzz returns 0 results, search with valid name returns matching results)
- Demo email logins skip rate limiter (no 429 during rapid testing)
- All backend tests pass with zero regressions
  </done>
</task>

<task type="auto">
  <name>Task 2: Deploy backend to staging and production</name>
  <files></files>
  <action>
1. Push code to remote: `git push origin main`
2. Deploy to staging: `gh workflow run deploy-staging.yml --ref main`
3. Monitor staging deploy: `gh run list --workflow=deploy-staging.yml --limit 3` then `gh run watch <run-id>`
4. Smoke test staging:
   - `curl -s https://d34u5ixl0bulv4.cloudfront.net/api/health` -- expect 200
   - `curl -s -X POST https://d34u5ixl0bulv4.cloudfront.net/api/rides/estimate -H 'Content-Type: application/json' -d '{"pickup_latitude":91,"pickup_longitude":0,"dropoff_latitude":0,"dropoff_longitude":0}'` -- expect 400
   - `curl -s 'https://d34u5ixl0bulv4.cloudfront.net/api/vendors/published?search=zzzznonexistent'` -- expect total=0
5. Deploy to production: `gh workflow run deploy-dollar-ai.yml`
6. Monitor production deploy: `gh run list --workflow=deploy-dollar-ai.yml --limit 3` then `gh run watch <run-id>`
7. Smoke test production:
   - `curl -s https://api.dollor.ai/api/health` -- expect 200
   - `curl -s -X POST https://api.dollor.ai/api/rides/estimate -H 'Content-Type: application/json' -d '{"pickup_latitude":91,"pickup_longitude":0,"dropoff_latitude":0,"dropoff_longitude":0}'` -- expect 400
   - `curl -s 'https://api.dollor.ai/api/vendors/published?search=zzzznonexistent'` -- expect total=0
   - Rapid demo login test (5x in 10 seconds): all should return 200, not 429
  </action>
  <verify>
- Staging health returns 200
- Production health returns 200
- Coordinate validation works on production (400 for lat=91)
- Vendor search works on production (total=0 for nonsense search)
- Demo login not rate-limited on production (5 rapid attempts all succeed)
  </verify>
  <done>
- Backend deployed to staging and production via CI/CD
- All 3 backend fixes verified on production (coordinates, search, rate limit)
- ASC metadata fix verified separately (API call in Task 1)
  </done>
</task>

</tasks>

<verification>
All 4 stress test warnings resolved:
1. ASC supportUrl set via API PATCH
2. Coordinate validation rejects impossible values
3. Vendor search filters results server-side
4. Demo accounts exempt from auth rate limiter
Backend deployed to production with zero test regressions.
</verification>

<success_criteria>
- All 4 warnings from quick-72 stress test resolved
- Backend tests pass (zero regressions)
- Production deployment successful via CI/CD
- Production smoke tests confirm all 3 code fixes working
- ASC metadata confirmed via API query
</success_criteria>

<output>
After completion, create `.planning/quick/73-fix-all-4-non-blocking-warnings-from-str/73-SUMMARY.md`
</output>
