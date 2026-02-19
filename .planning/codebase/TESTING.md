# Testing Patterns

**Analysis Date:** 2026-02-18

---

## Python Backend Tests

### Test Framework

**Runner:**
- pytest 9.0.2
- Config: `apps/web/p2p-platform/backend/pyproject.toml`

**Assertion Library:**
- pytest built-in `assert`
- `pytest.approx()` for floating point comparisons

**Run Commands:**
```bash
cd apps/web/p2p-platform/backend
source venv/bin/activate

pytest tests/ -v                          # Run all tests
pytest tests/unit/ -v                     # Unit tests only
pytest tests/integration/ -v              # Integration tests only
pytest tests/e2e/ -v                      # E2E tests only
pytest tests/ -v --tb=short -ra           # Default (from pyproject.toml)
pytest tests/ --cov=. --cov-report=html   # Coverage (outputs to htmlcov/)
pytest tests/ --cov=. --cov-report=xml    # Coverage XML (outputs coverage.xml)
pytest tests/ -m unit                     # Run by marker
pytest tests/ -m "not slow"               # Exclude slow tests
```

**Pytest Markers (defined in `pyproject.toml`):**
- `unit` — Unit tests (no DB, pure logic)
- `integration` — Integration tests (DB + TestClient)
- `e2e` — End-to-end flows
- `slow` — Slow-running tests
- `security` — Security-related tests

### Test File Organization

```
apps/web/p2p-platform/backend/
├── tests/
│   ├── conftest.py              # Shared fixtures, factories, DB setup
│   ├── __init__.py
│   ├── unit/
│   │   ├── test_api_config.py           # Config/Pydantic model validation
│   │   ├── test_auth_endpoints.py       # Authentication endpoint tests
│   │   ├── test_document_verification.py # Enum + service unit tests
│   │   ├── test_dollor_pricing_model.py  # 100 pricing logic tests
│   │   └── test_stripe_integration.py   # Stripe with mocked API
│   ├── integration/
│   │   ├── test_ios_api_contracts.py    # iOS/Android contract tests
│   │   ├── test_android_restaurant_e2e_workflow.py
│   │   ├── test_approval_to_publish_flow.py
│   │   └── test_document_save_flow.py
│   ├── e2e/
│   │   ├── test_rideshare_e2e_flow.py   # 17-step rideshare lifecycle
│   │   ├── test_rideshare_cross_platform.py  # Staging-targeted tests
│   │   └── test_critical_flows.py
│   └── api/
│       └── test_endpoints.py            # HTTP contract tests (all endpoints)
├── test_negotiation_flow.py     # Standalone test (root, not in tests/)
├── test_order_flow.py           # Standalone test (root, not in tests/)
└── test_ride_checkout.py        # Standalone test (root, not in tests/)
```

**Naming Patterns:**
- Files: `test_{domain}.py` or `test_{domain}_{type}.py`
- Classes: `TestDomainAction` (e.g. `TestUserRegistration`, `TestRideshareFareCalculation`)
- Functions: `test_{scenario}` with plain English docstring

### Test Database Setup (`tests/conftest.py`)

**Session-scoped DB fixture** — tables created once per test session:

```python
@pytest.fixture(scope="session")
def test_db():
    """Create test database tables"""
    # Uses SQLite in-memory for local runs
    # Uses PostgreSQL _test DB in CI (if DATABASE_URL is set)
    ...
    Base.metadata.create_all(bind=engine, checkfirst=True)
    yield
    Base.metadata.drop_all(bind=engine)
```

**Function-scoped DB session** — each test gets a rollback-on-teardown transaction:

```python
@pytest.fixture(scope="function")
def db_session(test_db) -> Generator:
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()  # Clean state for next test
    connection.close()
```

**TestClient fixture** — overrides DB dependency:

```python
@pytest.fixture(scope="function")
def client(db_session) -> Generator:
    def override_get_db_fixture():
        yield db_session
    app.dependency_overrides[get_db] = override_get_db_fixture
    app.router.on_startup.clear()  # Prevent init_db from running
    with TestClient(app) as c:
        yield c
    app.router.on_startup = original_startup_handlers
    app.dependency_overrides.clear()
```

### Auth Fixtures

All auth header fixtures in `conftest.py`. Use `create_access_token` from `main_new`:

```python
@pytest.fixture(scope="function")
def auth_headers(test_user) -> Dict[str, str]:
    token = create_access_token(data={"sub": test_user.email})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="function")
def driver_auth_headers(test_driver) -> Dict[str, str]:
    token = create_access_token(data={"sub": test_driver.email, "driver_id": test_driver.id})
    return {"Authorization": f"Bearer {token}"}
```

Available fixtures: `auth_headers`, `admin_auth_headers`, `vendor_auth_headers`, `driver_auth_headers`

### Test Suite Structure

```python
class TestUserRegistration:
    """Tests for user registration endpoint"""

    def test_register_success(self, client: TestClient, sample_user_data):
        """Should successfully register a new user"""
        response = client.post("/register", json=sample_user_data)
        assert response.status_code in [200, 201, 409]
        if response.status_code in [200, 201]:
            data = response.json()
            assert "access_token" in data or "message" in data

    def test_register_invalid_email(self, client: TestClient):
        """Should reject invalid email format"""
        response = client.post("/register", json={"email": "not-valid"})
        assert response.status_code == 422
```

- Class per endpoint group or feature area
- Each method tests exactly one scenario
- Docstring starts with "Should ..." describing expected behavior

### Mocking

**Framework:** `unittest.mock` (`MagicMock`, `patch`, `AsyncMock`, `Mock`)

**Stripe mocking pattern:**

```python
@pytest.fixture
def mock_stripe():
    with patch("rideshare_payments.stripe.PaymentIntent.create") as mock_pi, \
         patch("rideshare_payments.stripe.Transfer.create") as mock_transfer:
        mock_pi.return_value = MagicMock(
            id="pi_test_123", client_secret="pi_test_secret"
        )
        mock_transfer.return_value = MagicMock(id="tr_test_456")
        yield {"payment_intent": mock_pi, "transfer": mock_transfer}
```

**Notification mocking pattern (suppress all side effects):**

```python
@pytest.fixture
def mock_notifications():
    """Suppress all async broadcasts, push notifications, and emails."""
    with patch("bid_routes.send_push_notification"), \
         patch("bid_routes.send_ride_request_confirmation_email"), \
         patch("bid_routes.asyncio.create_task"):
        yield
```

**What to mock:**
- All Stripe API calls (`stripe.PaymentIntent.create`, `stripe.Transfer.create`)
- Push notification calls (`send_push_notification`, `broadcast_*` WebSocket functions)
- Email functions (`send_ride_*_email`, `send_order_*_email`)
- External HTTP calls (Google Maps, Firebase)
- `asyncio.create_task` for background tasks

**What NOT to mock:**
- Database operations (use test DB with rollback)
- FastAPI routing / validation
- SQLAlchemy ORM queries
- Business logic (pricing calculations, fee tiers)

### Fixtures and Factories

**Data factories in `conftest.py`:**

```python
class UserFactory:
    counter = 0

    @classmethod
    def create(cls, db_session, **kwargs) -> User:
        cls.counter += 1
        defaults = {
            "email": f"user_{cls.counter}_{datetime.now().timestamp()}@test.com",
            "password_hash": get_password_hash("Password123!"),
            "full_name": f"Test User {cls.counter}",
            "role": UserRole.USER,
        }
        defaults.update(kwargs)
        user = User(**defaults)
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
```

Available factories: `UserFactory`, `VendorFactory`, `DriverFactory`
Used via fixtures: `user_factory`, `vendor_factory`, `driver_factory`

**Pre-built entity fixtures** (function-scoped, already committed to DB):
- `test_user` — approved User (role=USER)
- `test_admin` — admin User (role=ADMIN)
- `test_vendor` — approved Vendor
- `test_driver` — approved Driver

**Sample data fixtures** (dicts, no DB write):
- `sample_user_data` — registration payload dict
- `sample_vendor_data` — vendor registration payload
- `sample_driver_data` — driver registration payload

**Email uniqueness:** All fixtures and factories append `datetime.now().timestamp()` to email addresses to prevent conflicts across test runs.

### Coverage

**Configuration in `pyproject.toml`:**

```toml
[tool.coverage.run]
source = ["."]
branch = true
omit = ["*/tests/*", "main_new.py", "order_flow.py", "stripe_integration.py", ...]
```

**Excluded from coverage** (too large / require DB integration):
- `main_new.py` (main FastAPI app)
- `auto_onboarding.py`, `order_flow.py`, `stripe_integration.py`, `database.py`
- All migration scripts (`add_*.py`, `migrate_*.py`, `create_*.py`)
- Non-core: `websocket_server.py`, `image_service.py`, `realtime_events.py`

**View Coverage:**
```bash
pytest tests/ --cov=. --cov-report=html
open htmlcov/index.html
```

### Test Types

**Unit Tests (`tests/unit/`):**
- No FastAPI TestClient — test pure functions and constants
- Test pricing constants (`CUSTOMER_SERVICE_FEE == 1.00`)
- Test Pydantic models with `ValidationError`
- Test enum values (`VerificationStatus.PENDING == "pending"`)
- Test calculation functions (`calculate_delivery_fee()`, `calculate_ride_fare()`)
- Mock all external dependencies

**Integration Tests (`tests/integration/`):**
- Use FastAPI `TestClient` with test database
- Test endpoint contracts (status codes, response fields, types)
- Verify iOS/Android JSON field names exist: `assert_response_structure(data, ["access_token", "token_type"])`
- Test full auth flows (register → login → protected endpoint)

**E2E Tests (`tests/e2e/`):**
- Multi-step sequential flows using `client` fixture
- `test_rideshare_e2e_flow.py`: 17-step rideshare lifecycle (fare estimate → tip)
- `test_rideshare_cross_platform.py`: Targets **staging URL** (`https://d3kuu45w6kl8hr.cloudfront.net`) — NOT TestClient
- Steps commented inline: `# ── Step 1: Fare Estimate ────────────`

**Cross-Platform Tests (`tests/test_cross_platform.py`):**
- Verify same endpoint works identically for iOS and Android clients
- Checks JSON field names expected by each platform

### Common Patterns

**Async Testing:**
```python
# pyproject.toml sets asyncio_mode = "auto"
# Async test functions work without @pytest.mark.asyncio decorator
async def test_async_endpoint(client):
    ...
```

**Multiple valid status codes (lenient assertions):**
```python
assert response.status_code in [200, 201, 409]  # 409 if already exists
assert response.status_code in [400, 401, 403]  # Multiple error paths
```

**Conditional assertions (when endpoint may not exist):**
```python
if response.status_code == 200:
    data = response.json()
    assert "access_token" in data
```

**DB state inspection after API call:**
```python
db_session.expire_all()  # Force reload from DB
ride_obj = db_session.query(RideRequest).get(ride_id)
assert ride_obj.status == RideRequestStatus.BIDDING
```

**Floating point assertions:**
```python
assert fare_with_tip["driver_earnings"] - fare_no_tip["driver_earnings"] == pytest.approx(5.00, rel=0.01)
```

**Error response format assertion:**
```python
data = response.json()
assert "detail" in data, "Error response must contain 'detail' field"
```

---

## iOS Swift Tests

### Test Framework

- **Unit/Integration:** Swift Testing (`import Testing`) — newer API using `@Suite` and `@Test`
- **UI Tests:** XCTest (`import XCTest`)
- File locations:
  - Unit tests: `apps/ios/customer/eatfaircustomerTests/eatfaircustomerTests.swift`
  - UI tests: `apps/ios/customer/eatfaircustomerUITests/eatfaircustomerUITests.swift`

**Run Commands:**
```bash
# Run from Xcode or:
xcodebuild test -scheme eatfaircustomer -destination 'platform=iOS Simulator,name=iPhone 16'
```

### Test Structure (Swift Testing)

```swift
@Suite("Cart Calculations")
struct CartCalculationTests {

    let taxRate = 0.08
    let deliveryFee = 2.99
    let platformFee = 1.0

    @Test("Subtotal calculation with single item")
    func testSubtotalSingleItem() {
        let cart = TestableCartViewModel()
        let item = createMenuItem(price: 10.00)
        cart.addToCart(item: item, from: createRestaurant())
        #expect(cart.subtotal == 10.00)
    }
}
```

- Suites organized by feature area using `@Suite("name")`
- Tests use `@Test("description")` annotation
- Assertions use `#expect(condition)` (Swift Testing) or `XCTAssert*` (XCTest)
- Test helpers are `private func create*()` at the bottom of the test file

### UI Test Structure (XCTest)

```swift
class eatfaircustomerUITests: XCTestCase {
    // MARK: - WELCOME SCREEN TESTS
    func testWelcomeScreenElements() { ... }

    // MARK: - LOGIN SCREEN TESTS
    func testLoginScreenElements() { ... }

    // MARK: - ACCESSIBILITY TESTS
    func testAccessibilityIdentifiers() { ... }

    // MARK: - PERFORMANCE TESTS
    func testLaunchPerformance() { ... }

    // MARK: - HELPER METHODS
    private func helper() { ... }
}
```

- `// MARK:` sections separate test groups within a class
- Performance tests use `measure { }` blocks

### Staging Integration Tests

`apps/ios/customer/run_staging_tests.swift` — standalone Swift script that hits the live staging URL:
- Tests against `https://d3kuu45w6kl8hr.cloudfront.net`
- Not part of Xcode test target — run manually or in CI
- Organized with `// MARK: - Tests` sections

---

## QA Scripts

**Location:** `scripts/qa-runner.sh`, `.claude/agents/qa-challenger-agent.sh`

- Bash-based QA runners that issue HTTP requests against staging/production
- `qa-runner.sh` runs a series of curl-based endpoint checks and writes reports to `.planning/qa-reports/`
- Report format: `YYYY-MM-DD_HH-MM-SS_pre-deploy/QA_VALIDATION_REPORT.md`
- These scripts do NOT use any test framework — they are shell-level smoke tests

---

*Testing analysis: 2026-02-18*
