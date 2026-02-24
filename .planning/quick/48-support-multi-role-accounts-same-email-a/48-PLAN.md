---
phase: quick-48
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/main_new.py
  - apps/web/p2p-platform/backend/tests/unit/test_auth_endpoints.py
autonomous: true
requirements: [MULTI-ROLE-01]

must_haves:
  truths:
    - "Same email can sign in via Apple Sign-In on all 3 apps (customer, driver, vendor) without 'Registration failed' error"
    - "Vendor Apple auth creates a vendor record and links it when user exists from another role"
    - "Driver Apple auth creates a driver record and links it when user exists from another role"
    - "Existing single-role users are not broken -- login still works for their original role"
    - "Suspended driver accounts are still blocked from Apple Sign-In"
  artifacts:
    - path: "apps/web/p2p-platform/backend/main_new.py"
      provides: "Fixed vendor_apple_auth and driver_apple_auth endpoints"
      contains: "user.vendor_id"
    - path: "apps/web/p2p-platform/backend/tests/unit/test_auth_endpoints.py"
      provides: "Multi-role Apple auth test coverage"
      contains: "test_apple_auth_multi_role"
  key_links:
    - from: "vendor_apple_auth (main_new.py:2346)"
      to: "User table + Vendor table"
      via: "Check user.vendor_id instead of user.role == VENDOR"
      pattern: "user\\.vendor_id"
    - from: "driver_apple_auth (main_new.py:2943)"
      to: "User table + Driver table"
      via: "Query User by email without role filter, check user.driver_id"
      pattern: "User\\.email == email"
---

<objective>
Fix 2 Apple Sign-In OAuth endpoints that block multi-role accounts. Currently, vendor Apple auth rejects users whose role != VENDOR, and driver Apple auth filters by User.role == DRIVER (missing multi-role users entirely, causing IntegrityError on User creation). The Google OAuth endpoints for all 3 roles and customer Apple auth already handle multi-role correctly.

Purpose: Users should be able to sign in with the same Apple ID / email across all 3 apps (customer, driver, vendor) simultaneously, just like Google Sign-In already supports.
Output: Fixed `vendor_apple_auth` and `driver_apple_auth` in main_new.py, plus multi-role test coverage.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/p2p-platform/backend/main_new.py (lines 2208-2340 for vendor Google pattern, lines 2346-2484 for vendor Apple, lines 2802-2933 for driver Google pattern, lines 2943-3063 for driver Apple)
@apps/web/p2p-platform/backend/models.py (User model lines 47-61, UserRole enum lines 9-14)
@apps/web/p2p-platform/backend/tests/unit/test_auth_endpoints.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix vendor_apple_auth to support multi-role accounts</name>
  <files>apps/web/p2p-platform/backend/main_new.py</files>
  <action>
Fix `vendor_apple_auth` (line 2346) to match the multi-role pattern already used by `vendor_google_auth` (line 2208).

**Current broken logic (lines 2391-2406):**
```python
if existing_user:
    if existing_user.role == UserRole.VENDOR:
        # Existing vendor - allow login
        user = existing_user
        ...
    else:
        # Email already registered with different role
        raise HTTPException(status_code=400, detail="Registration failed...")
```

**Replace with multi-role logic (mirroring vendor_google_auth lines 2239-2264):**
```python
if existing_user:
    user = existing_user
    if user.vendor_id:
        # User already has a vendor account -- allow login
        print(f"Existing user {email} (role={user.role.value}) logging in as vendor via Apple")
        # Store apple_id on vendor if not already set
        if not vendor and user.vendor_id:
            vendor = db.query(Vendor).filter(Vendor.id == user.vendor_id).first()
        if vendor and not vendor.apple_id:
            vendor.apple_id = request.apple_id
            db.commit()
    else:
        # User exists but has no vendor account -- create one and link it
        new_vendor = Vendor(
            company_name=name,
            contact_name=name,
            contact_email=email,
            apple_id=request.apple_id,
            onboarding_status=VendorStatus.APPROVED,
            street="",
            city="",
            state="",
            zip_code="",
            country="US"
        )
        db.add(new_vendor)
        db.commit()
        db.refresh(new_vendor)
        vendor = new_vendor

        user.vendor_id = new_vendor.id
        db.commit()
        db.refresh(user)
        print(f"Added vendor role to existing {user.role.value} user via Apple: {email}")

        # Send registration confirmation for new vendor
        try:
            send_vendor_registration_confirmation(
                to_email=email,
                restaurant_name=name,
                contact_name=name,
                vendor_id=new_vendor.vendor_id
            )
        except Exception as e:
            print(f"Failed to send vendor registration email: {str(e)}")
```

Key changes:
- Remove `existing_user.role == UserRole.VENDOR` check
- Check `user.vendor_id` instead (like vendor_google_auth does)
- If no vendor_id, create Vendor record with `apple_id` and link to existing user
- Store apple_id on existing vendor if not set
- Send registration email for new vendor role addition
  </action>
  <verify>
Run: `cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && python -c "import main_new; print('Import OK')"`
Grep verify: `grep -n "user.vendor_id" apps/web/p2p-platform/backend/main_new.py | grep -i apple` should show the new vendor_id check in vendor_apple_auth
Grep verify: `grep -n "role == UserRole.VENDOR" apps/web/p2p-platform/backend/main_new.py` should NOT appear in vendor_apple_auth function (line ~2392 range)
  </verify>
  <done>vendor_apple_auth no longer rejects users with a different role -- checks vendor_id link instead, creates vendor and links if missing</done>
</task>

<task type="auto">
  <name>Task 2: Fix driver_apple_auth to support multi-role accounts</name>
  <files>apps/web/p2p-platform/backend/main_new.py</files>
  <action>
Fix `driver_apple_auth` (line 2943) to match the multi-role pattern already used by `driver_google_auth` (line 2802).

**Current broken logic (lines 2972-2982):**
```python
# First: Try to find existing driver by apple_id
driver = db.query(Driver).filter(Driver.apple_id == request.apple_id).first()
if driver:
    email = driver.email
    user = db.query(User).filter(User.email == email, User.role == UserRole.DRIVER).first()

# Second: Try to find by email if we have one
if not user and email:
    user = db.query(User).filter(User.email == email, User.role == UserRole.DRIVER).first()
    if user and user.driver_id:
        driver = db.query(Driver).filter(Driver.id == user.driver_id).first()
```

The `User.role == UserRole.DRIVER` filter causes the query to miss multi-role users. If a customer/vendor user tries driver Apple auth, `user` stays None, then the code at line 3002 tries to create a NEW User with the same email, hitting a unique constraint IntegrityError.

**Replace with multi-role logic (mirroring driver_google_auth lines 2828-2866):**
```python
# First: Try to find existing driver by apple_id
driver = db.query(Driver).filter(Driver.apple_id == request.apple_id).first()
if driver:
    email = driver.email
    user = db.query(User).filter(User.email == email).first()

# Second: Try to find by email if we have one
if not user and email:
    user = db.query(User).filter(User.email == email).first()
    if user and user.driver_id:
        driver = db.query(Driver).filter(Driver.id == user.driver_id).first()
```

Then update the `if user:` block (lines 2988-3001) to handle multi-role:
```python
if user:
    if user.driver_id:
        # User already has a driver account
        if not driver:
            driver = db.query(Driver).filter(Driver.id == user.driver_id).first()
        if driver and driver.status == DriverStatus.SUSPENDED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Driver account is suspended. Please contact support@dollor.ai"
            )
        # Store apple_id on driver if not already set
        if driver and not driver.apple_id:
            driver.apple_id = request.apple_id
            db.commit()
        print(f"Existing user {email} (role={user.role.value}) logging in as driver via Apple")
    else:
        # User exists but has no driver account -- create one and link it
        name_parts = name.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        driver_count = db.query(Driver).count()
        driver_code = f"DRV-{driver_count + 1:05d}"

        new_driver = Driver(
            driver_id=driver_code,
            first_name=first_name,
            last_name=last_name,
            email=email,
            apple_id=request.apple_id,
            status=DriverStatus.PENDING
        )
        db.add(new_driver)
        db.commit()
        db.refresh(new_driver)
        driver = new_driver

        user.driver_id = new_driver.id
        db.commit()
        db.refresh(user)
        print(f"Added driver role to existing {user.role.value} user via Apple: {email}")

        try:
            send_driver_registration_confirmation(
                to_email=email,
                driver_name=name,
                driver_code=driver_code
            )
        except Exception as e:
            print(f"Failed to send driver registration email: {str(e)}")
```

Key changes:
- Remove `User.role == UserRole.DRIVER` filter from BOTH User queries (lines 2976, 2980)
- In the `if user:` block, check `user.driver_id` instead of assuming driver role
- If no driver_id, create Driver record with `apple_id` and link to existing user (mirroring driver_google_auth)
- Keep suspended driver check
  </action>
  <verify>
Run: `cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && python -c "import main_new; print('Import OK')"`
Grep verify: `grep -n "UserRole.DRIVER" apps/web/p2p-platform/backend/main_new.py` should NOT appear in the driver_apple_auth function (around lines 2976, 2980)
Grep verify: `grep -n "user.driver_id" apps/web/p2p-platform/backend/main_new.py | head -20` should show driver_id check in driver_apple_auth
  </verify>
  <done>driver_apple_auth removes role filter from User queries and checks driver_id link instead; creates driver and links if user exists from another role</done>
</task>

<task type="auto">
  <name>Task 3: Add multi-role Apple auth tests and run full test suite</name>
  <files>apps/web/p2p-platform/backend/tests/unit/test_auth_endpoints.py</files>
  <action>
**Step 1: Verify customer endpoints are already multi-role safe (requirement coverage)**

Before writing tests, verify that `customer_apple_auth` (main_new.py:6143) and `customer_google_auth` (main_new.py:3359) do NOT have the same role-filter bug:

```bash
# customer_apple_auth should query User.email WITHOUT role filter (confirmed at lines 6177, 6181)
grep -n "User.role" apps/web/p2p-platform/backend/main_new.py | grep -A2 -B2 "6177\|6181"
# Expected: NO hits -- customer_apple_auth uses `User.email == email` only

# customer_google_auth doesn't even query the User table -- it only uses Customer table
grep -n "User\." apps/web/p2p-platform/backend/main_new.py | awk -F: '$2 >= 3359 && $2 <= 3436'
# Expected: NO User table queries in customer_google_auth range
```

If either check shows a role filter, fix it the same way as Tasks 1-2. (Based on code review: both are already correct -- customer_apple_auth queries `User.email == email` without role filter at lines 6177/6181, and customer_google_auth doesn't query the User table at all.)

**Step 2: Add test class with proper fixture setup**

Add a new test class `TestMultiRoleAppleAuth` to `tests/unit/test_auth_endpoints.py`. IMPORTANT: The `test_driver` and `test_vendor` fixtures do NOT create linked User rows, so each test must create the proper User row in its setup to exercise the cross-role code path.

```python
class TestMultiRoleAppleAuth:
    """Tests that Apple Sign-In supports multi-role accounts (same email across customer/driver/vendor)"""

    def test_vendor_apple_auth_existing_driver_user(self, client: TestClient, db_session, test_driver):
        """Vendor Apple auth should work when email is already registered as a driver user"""
        # Create a User row linked to this driver (test_driver fixture doesn't create one)
        from models import User, UserRole
        from main_new import get_password_hash
        user = User(
            email=test_driver.email,
            password_hash=get_password_hash("TestPassword123!"),
            full_name=f"{test_driver.first_name} {test_driver.last_name}",
            role=UserRole.USER,
            driver_id=test_driver.id,
        )
        db_session.add(user)
        db_session.commit()

        response = client.post("/api/auth/vendor/apple-auth", json={
            "apple_id": f"apple_vendor_test_{test_driver.email}",
            "email": test_driver.email,
            "name": f"{test_driver.first_name} {test_driver.last_name}",
        })
        # Must NOT return 400 "Registration failed" or 500 IntegrityError
        assert response.status_code in [200, 201], f"Expected multi-role support, got {response.status_code}: {response.text}"
        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data
            assert data.get("vendor_id") is not None

    def test_driver_apple_auth_existing_customer_user(self, client: TestClient, test_user):
        """Driver Apple auth should work when email is already registered as a customer/user"""
        # test_user fixture already creates a real User row with role=USER -- perfect for cross-role test
        response = client.post("/api/auth/driver/apple-auth", json={
            "apple_id": f"apple_driver_test_{test_user.email}",
            "email": test_user.email,
            "name": test_user.full_name,
        })
        # Must NOT cause IntegrityError (500) -- should create driver and link to existing user
        assert response.status_code in [200, 201], f"Expected multi-role support, got {response.status_code}: {response.text}"
        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data
            assert data.get("driver_id") is not None

    def test_vendor_apple_auth_still_works_for_existing_vendor(self, client: TestClient, db_session, test_vendor):
        """Existing vendor Apple auth should still work after multi-role fix"""
        # Create a User row linked to this vendor (test_vendor fixture doesn't create one)
        from models import User, UserRole
        from main_new import get_password_hash
        user = User(
            email=test_vendor.contact_email,
            password_hash=get_password_hash("TestPassword123!"),
            full_name=test_vendor.contact_name or "Test Vendor",
            role=UserRole.USER,
            vendor_id=test_vendor.id,
        )
        db_session.add(user)
        db_session.commit()

        response = client.post("/api/auth/vendor/apple-auth", json={
            "apple_id": f"apple_existing_vendor_{test_vendor.contact_email}",
            "email": test_vendor.contact_email,
            "name": test_vendor.contact_name or "Test Vendor",
        })
        # Must succeed for existing vendor login path
        assert response.status_code in [200, 201], f"Expected existing vendor login, got {response.status_code}: {response.text}"
        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data
            assert data.get("vendor_id") is not None
```

**Step 3: Run the full backend test suite**
```bash
cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend
python -m pytest tests/unit/test_auth_endpoints.py -v --tb=short 2>&1 | tail -30
python -m pytest tests/ -v --tb=short 2>&1 | tail -50
```

Fix any regressions. The key assertions:
- `test_vendor_apple_auth_existing_driver_user` must NOT get 400 or 500 (exercises cross-role User with driver_id, no vendor_id)
- `test_driver_apple_auth_existing_customer_user` must NOT get 500 IntegrityError (exercises cross-role User with no driver_id)
- `test_vendor_apple_auth_still_works_for_existing_vendor` must NOT get 500 (exercises existing User with vendor_id -- the happy-path login)
  </action>
  <verify>
Run: `cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && python -m pytest tests/unit/test_auth_endpoints.py -v --tb=short`
All auth tests pass, including new multi-role tests.
Run: `cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && python -m pytest tests/ -v --tb=short 2>&1 | tail -10`
No regressions in full test suite.
  </verify>
  <done>Multi-role Apple auth tests added and passing; full test suite has no regressions from the 2 endpoint fixes</done>
</task>

</tasks>

<verification>
1. `grep -n "role == UserRole.VENDOR" apps/web/p2p-platform/backend/main_new.py` -- should NOT appear in vendor_apple_auth (was line 2392)
2. `grep -n "User.role == UserRole.DRIVER" apps/web/p2p-platform/backend/main_new.py` -- should NOT appear in driver_apple_auth (were lines 2976, 2980)
3. `grep -n "user.vendor_id" apps/web/p2p-platform/backend/main_new.py` -- should appear in BOTH vendor_google_auth AND vendor_apple_auth
4. `grep -n "user.driver_id" apps/web/p2p-platform/backend/main_new.py` -- should appear in BOTH driver_google_auth AND driver_apple_auth
5. **customer_apple_auth (line 6143)**: `grep -n "User.role" main_new.py` should NOT appear in lines 6143-6262 (customer_apple_auth already queries User by email without role filter)
6. **customer_google_auth (line 3359)**: Confirm it does NOT query the User table at all (only Customer table) -- no role filter possible
7. `python -m pytest tests/unit/test_auth_endpoints.py -v` -- all tests pass including multi-role
8. `python -m pytest tests/ -v` -- no regressions
</verification>

<success_criteria>
- Vendor Apple auth allows login when email exists with a different role (creates vendor + links)
- Driver Apple auth allows login when email exists with a different role (creates driver + links)
- Customer Apple auth (already working) continues to work
- All 3 Google auth endpoints (already working) continue to work
- Suspended driver accounts remain blocked
- Full test suite passes with zero regressions
- New multi-role test cases verify the fix
</success_criteria>

<output>
After completion, create `.planning/quick/48-support-multi-role-accounts-same-email-a/48-SUMMARY.md`
</output>
