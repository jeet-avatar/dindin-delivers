# Testing Documentation

This document outlines the testing infrastructure, frameworks, and practices used in the eatfair-ios codebase.

## Overview

The project employs a multi-layered testing strategy covering:
- **iOS Apps**: Unit tests and UI tests using Swift Testing framework and XCTest
- **Backend (P2P Platform)**: Comprehensive pytest-based testing with unit, integration, e2e, and contract tests

---

## iOS Testing

### Test Frameworks

| Framework | Purpose | Location |
|-----------|---------|----------|
| Swift Testing (`Testing`) | Modern unit testing (iOS 17+) | Customer app unit tests |
| XCTest | UI testing and launch tests | All iOS apps |
| XCUITest | UI automation testing | `*UITests` targets |

### Test File Locations

```
apps/ios/
├── customer/
│   ├── eatfaircustomerTests/
│   │   └── eatfaircustomerTests.swift      # Unit tests (Swift Testing)
│   └── eatfaircustomerUITests/
│       └── eatfaircustomerUITestsLaunchTests.swift  # UI launch tests
├── delivery/
│   ├── eatffairdeliveryTests/
│   │   └── eatffairdeliveryTests.swift
│   └── eatffairdeliveryUITests/
│       └── eatffairdeliveryUITestsLaunchTests.swift
└── restaurant/
    ├── eatffairrestaurantTests/
    │   └── eatffairrestaurantTests.swift
    └── eatffairrestaurantUITests/
        └── eatffairrestaurantUITestsLaunchTests.swift
```

### Unit Test Patterns (Customer App)

The customer app uses the modern **Swift Testing** framework with `@Suite` and `@Test` macros:

```swift
import Testing
@testable import eatfaircustomer

@Suite("Cart Calculations")
struct CartCalculationTests {
    @Test("Subtotal calculation with single item")
    func testSubtotalSingleItem() {
        let cart = TestableCartViewModel()
        let item = createMenuItem(price: 10.00)
        cart.addToCart(item: item, from: restaurant)
        #expect(cart.subtotal == 10.00)
    }
}
```

#### Test Suites in Customer App:
1. **CartCalculationTests** - Cart pricing, tax, fees, clearing behavior
2. **AuthValidationTests** - Email, password, phone validation
3. **OrderNumberFormatTests** - Order number generation format

### Mock/Stub Patterns

**Testable View Models:**
```swift
class TestableCartViewModel {
    var items: [TestMenuItem] = []
    var restaurant: TestRestaurant?

    private let taxRate = 0.08        // Fixed for testing
    private let baseDeliveryFee = 2.99
    private let platformFee = 1.0

    var subtotal: Double { items.reduce(0) { $0 + $1.price } }
    var tax: Double { subtotal * taxRate }
}
```

**Test Data Factories:**
```swift
func createMenuItem(id: String = UUID().uuidString, name: String = "Test Item", price: Double) -> TestMenuItem
func createRestaurant(id: String = "test-restaurant", name: String = "Test Restaurant") -> TestRestaurant
```

### UI Tests

UI tests use XCTest with screenshot capture for App Store submission:

```swift
@MainActor
func testLaunch() throws {
    let app = XCUIApplication()
    app.launch()

    let attachment = XCTAttachment(screenshot: app.screenshot())
    attachment.name = "Launch Screen"
    attachment.lifetime = .keepAlways
    add(attachment)
}
```

### Running iOS Tests

```bash
# Run all unit tests for Customer app
xcodebuild test \
  -workspace apps/ios/customer/eatfaircustomer.xcworkspace \
  -scheme eatfaircustomer \
  -destination 'platform=iOS Simulator,name=iPhone 15'

# Run UI tests
xcodebuild test \
  -workspace apps/ios/customer/eatfaircustomer.xcworkspace \
  -scheme eatfaircustomerUITests \
  -destination 'platform=iOS Simulator,name=iPhone 15'
```

---

## Backend Testing (P2P Platform)

### Test Framework

- **pytest** (v7+) - Main testing framework
- **pytest-asyncio** - Async test support
- **FastAPI TestClient** - API endpoint testing
- **unittest.mock** - Mocking external services

### Configuration

**pytest.ini:**
```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = -v --tb=short --strict-markers -ra

markers =
    unit: Unit tests
    integration: Integration tests requiring running services
    e2e: End-to-end tests for complete user flows
    contract: API contract tests for iOS compatibility
    slow: Tests that take longer than 5 seconds
    smoke: Quick smoke tests for CI
    security: Security-related tests
    asyncio: Async tests

asyncio_mode = auto
asyncio_default_fixture_loop_scope = function
```

### Test File Structure

```
apps/web/p2p-platform/backend/tests/
├── conftest.py                    # Shared fixtures
├── unit/
│   ├── test_auth_endpoints.py
│   ├── test_driver_endpoints.py
│   ├── test_vendor_endpoints.py
│   ├── test_stripe_integration.py
│   ├── test_dollor_pricing_model.py
│   ├── test_email_service.py
│   ├── test_security_helpers.py
│   ├── test_file_upload_security.py
│   ├── test_document_verification.py
│   ├── test_image_service.py
│   ├── test_promotions.py
│   ├── test_realtime_events.py
│   ├── test_api_config.py
│   ├── test_models.py
│   └── test_order_flow.py
├── integration/
│   ├── test_android_restaurant_e2e_workflow.py
│   ├── test_approval_to_publish_flow.py
│   ├── test_document_save_flow.py
│   └── test_ios_api_contracts.py
└── e2e/
    ├── test_rideshare_cross_platform.py
    └── test_critical_flows.py
```

### Test Types

#### 1. Unit Tests
Test individual functions and classes in isolation with mocked dependencies.

```python
@pytest.fixture
def mock_vendor(db_session):
    vendor = Vendor(
        restaurant_name="Test Restaurant",
        company_name="Test Company",
        onboarding_status=VendorStatus.APPROVED,
    )
    db_session.add(vendor)
    db_session.commit()
    return vendor

@patch('stripe_integration.stripe.PaymentIntent.create')
def test_create_order_success(mock_stripe_create, db_session, mock_vendor):
    mock_stripe_create.return_value = type('obj', (object,), {
        'id': 'pi_test123',
        'client_secret': 'secret'
    })()
    # Test logic...
```

#### 2. Integration Tests
Test API endpoints with real database (SQLite in-memory or PostgreSQL test database).

```python
class TestDriverAPIContracts:
    def test_driver_registration_response_format(self, client, db_session):
        driver_data = {
            "email": f"driver_ios_{datetime.now().timestamp()}@test.com",
            "password": "TestPassword123!",
            "name": "iOS Test Driver",
            "phone": "+14155551234"
        }
        response = client.post("/api/auth/driver/register", json=driver_data)
        assert response.status_code in [200, 201]
```

#### 3. API Contract Tests
Ensure backend responses match iOS app expectations.

```python
def test_menu_response_format(self, client):
    response = client.get("/api/restaurants/1/menu")
    if response.status_code == 200:
        data = response.json()
        item = data[0]
        assert "name" in item, "Menu item must have name"
        assert "price" in item, "Menu item must have price"
```

#### 4. E2E Tests
Test complete user flows across multiple services.

```python
class TestOrderLifecycle:
    @patch('stripe_integration.stripe.PaymentIntent.create')
    @patch('stripe_integration.stripe.Webhook.construct_event')
    def test_complete_order_flow(self, mock_webhook, mock_stripe):
        # Create order -> Payment -> Webhook -> Invoice
```

### Shared Fixtures (conftest.py)

**Database Fixtures:**
```python
@pytest.fixture(scope="session")
def test_db():
    """Create test database tables"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session(test_db):
    """Get a test database session with transaction rollback"""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="function")
def client(db_session):
    """Get a TestClient with test database"""
    def override_get_db_fixture():
        yield db_session
    app.dependency_overrides[get_db] = override_get_db_fixture
    with TestClient(app) as c:
        yield c
```

**Entity Factories:**
```python
class UserFactory:
    @classmethod
    def create(cls, db_session, **kwargs) -> User:
        defaults = {
            "email": f"user_{datetime.now().timestamp()}@test.com",
            "password_hash": get_password_hash("Password123!"),
            "full_name": "Test User",
            "role": UserRole.USER,
        }
        defaults.update(kwargs)
        user = User(**defaults)
        db_session.add(user)
        db_session.commit()
        return user

class VendorFactory:
    # Similar pattern for vendors

class DriverFactory:
    # Similar pattern for drivers
```

**Authentication Fixtures:**
```python
@pytest.fixture
def auth_headers(test_user) -> Dict[str, str]:
    token = create_access_token(data={"sub": test_user.email})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def vendor_auth_headers(test_vendor) -> Dict[str, str]:
    token = create_access_token(data={"sub": test_vendor.contact_email})
    return {"Authorization": f"Bearer {token}"}
```

### Running Backend Tests

```bash
cd apps/web/p2p-platform/backend

# Activate virtual environment
source venv/bin/activate

# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test category
pytest -m unit
pytest -m integration
pytest -m e2e

# Run specific test file
pytest tests/unit/test_stripe_integration.py

# Run with coverage
pytest --cov=. --cov-report=html

# Run only fast tests (exclude slow)
pytest -m "not slow"

# Run smoke tests (for CI)
pytest -m smoke
```

---

## Microservices Testing

Each microservice has its own test suite:

```
services/core/
├── auth-service/tests/test_auth_service.py
├── driver-service/tests/test_driver_service.py
├── restaurant-service/tests/test_restaurant_service.py
├── order-service/tests/test_order_service.py
├── payment-service/tests/test_payment_service.py
├── location-service/tests/test_location_service.py
├── menu-service/tests/test_menu_service.py
├── notification-service/tests/test_notification_service.py
├── rating-service/tests/test_rating_service.py
├── ride-service/tests/test_ride_service.py
├── pricing-service/tests/test_pricing_service.py
├── analytics-service/tests/test_analytics_service.py
├── negotiation-service/tests/test_negotiation_service.py
├── chat-service/tests/test_chat_service.py
└── call-service/tests/test_call_service.py
```

---

## Test Coverage

### Current Coverage Areas

| Component | Coverage Focus |
|-----------|---------------|
| Cart Calculations | Subtotal, tax, fees, totals |
| Authentication | Email/password validation, login flows |
| Order Flow | Creation, payment, status updates |
| Stripe Integration | Payment intents, webhooks, invoice generation |
| Vendor Operations | Menu items, order management |
| Driver Operations | Registration, location updates |
| API Contracts | iOS-compatible response formats |

### Gaps and Recommendations

1. **iOS Apps**: Currently have basic unit tests; could benefit from more comprehensive ViewModel testing
2. **UI Tests**: Launch tests exist but could be expanded for critical user flows
3. **Performance Tests**: Not currently implemented
4. **Security Tests**: Partially covered via `test_security_helpers.py` and `test_file_upload_security.py`

---

## CI/CD Integration

Tests are run automatically in the CI/CD pipeline:

1. **Pull Request**: Unit tests + smoke tests
2. **Merge to Main**: Full test suite
3. **Staging Deploy**: Integration tests + contract tests
4. **Production Deploy**: E2E tests + smoke tests

---

## Best Practices

1. **Isolation**: Each test uses transaction rollback for database cleanup
2. **Factories**: Use factories for consistent test data creation
3. **Mocking**: External services (Stripe, email) are always mocked
4. **Markers**: Use pytest markers to categorize and selectively run tests
5. **Contract Testing**: Ensure API responses match iOS model expectations
6. **Idempotency**: Tests should be runnable in any order
