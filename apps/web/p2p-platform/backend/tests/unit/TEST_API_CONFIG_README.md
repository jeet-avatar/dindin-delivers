# API Configuration Unit Tests

## Overview

This test suite provides comprehensive unit tests for API configuration, Pydantic models, and utility functions in the P2P platform backend.

**Test File**: `/Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend/tests/unit/test_api_config.py`

## Test Coverage

### 1. App Configuration Tests (`TestAppConfig`)

Tests the `/api/config` endpoint that provides configuration to iOS apps.

**Tests Include:**
- ✓ Configuration structure validation
- ✓ Tax rate (9% validation)
- ✓ Service fee ($0 for Dollar Store model)
- ✓ Delivery fee ($4.99)
- ✓ Restaurant platform fee ($1 flat fee)
- ✓ Default tip rate (15%)
- ✓ Feature flags (boolean types and values)
- ✓ Busy level thresholds (structure and ordering)
- ✓ Support information (types validation)
- ✓ Distance configurations
- ✓ Preparation time settings

### 2. Pydantic Model Validation Tests

#### UserCreate Model (`TestUserCreateModel`)
- ✓ Valid user creation
- ✓ Default role assignment
- ✓ Invalid email rejection
- ✓ Missing required fields
- ✓ Empty email validation

#### UserResponse Model (`TestUserResponseModel`)
- ✓ Valid user response
- ✓ User with vendor_id
- ✓ Missing required fields

#### Token Model (`TestTokenModel`)
- ✓ Valid token structure
- ✓ Android compatibility fields (vendor_id, business_name, email)

#### Client Models (`TestClientModels`)
- ✓ Valid client creation with all fields
- ✓ Minimal required fields
- ✓ Missing required field validation
- ✓ Valid client response

#### InvoiceItem Models (`TestInvoiceItemModels`)
- ✓ Valid invoice item creation
- ✓ Missing required fields validation
- ✓ Invoice item response with calculated amount

#### Invoice Models (`TestInvoiceModels`)
- ✓ Valid invoice with multiple items
- ✓ Default values (tax_rate, discount_amount)
- ✓ Invoice response with all calculations

#### Payment Models (`TestPaymentModels`)
- ✓ Valid payment creation with all fields
- ✓ Minimal payment fields
- ✓ Payment response structure

#### Vendor Models (`TestVendorModels`)
- ✓ Valid vendor registration
- ✓ Invalid email rejection
- ✓ Missing required fields
- ✓ Password reset request validation
- ✓ Google OAuth authentication request
- ✓ Apple OAuth authentication request

### 3. Helper Function Tests

#### Invoice Number Generation (`TestGenerateInvoiceNumber`)
- ✓ Correct format (INV-YYYYMM-####)
- ✓ Proper incrementing
- ✓ Current year/month usage
- ✓ Number padding (4 digits)

### 4. Health Check Tests (`TestHealthCheck`)
- ✓ Response structure (status, service, timestamp)
- ✓ "healthy" status
- ✓ Service name "p2p-backend"
- ✓ Valid ISO timestamp format

### 5. Edge Cases and Validation

#### Model Edge Cases (`TestModelEdgeCases`)
- ✓ Email whitespace trimming
- ✓ Optional fields (None vs missing)
- ✓ Float fields accepting integers
- ✓ Negative amounts (refunds/credits)

#### Type Validation (`TestTypeValidation`)
- ✓ String vs email field validation
- ✓ Integer to string coercion
- ✓ Invalid string for numeric field
- ✓ Numeric string coercion

## Running the Tests

### Run all API config tests:
```bash
pytest tests/unit/test_api_config.py -v
```

### Run specific test class:
```bash
pytest tests/unit/test_api_config.py::TestAppConfig -v
```

### Run specific test:
```bash
pytest tests/unit/test_api_config.py::TestAppConfig::test_config_tax_rate -v
```

### Run with coverage:
```bash
pytest tests/unit/test_api_config.py --cov=main_new --cov-report=html
```

### Use the helper script:
```bash
./run_api_config_tests.sh
```

## Test Statistics

- **Total Test Classes**: 14
- **Total Test Methods**: 80+
- **No Database Required**: Tests use mocks for database operations
- **Async Tests**: Health check endpoint tests use pytest asyncio

## Test Features

### Mocking Strategy
- Database sessions are mocked using `unittest.mock.Mock`
- No actual database connection required
- Fast execution time
- Isolated unit tests

### Validation Testing
- Pydantic ValidationError catching
- Email format validation
- Required field validation
- Type coercion testing
- Edge case handling

### Business Logic Testing
- Dollar Store pricing model ($1 flat fee)
- Tax calculations (9%)
- Invoice number format and incrementing
- Configuration value constraints

## Configuration Values Tested

### Dollar Store Fee Structure
```python
serviceFee: 0.00              # NO service fee to customer
deliveryFee: 4.99             # Customer pays delivery fee
restaurantPlatformFee: 1.00   # Restaurant pays $1 flat fee
```

### Other Config
```python
taxRate: 0.09                 # 9% tax
defaultTipRate: 0.15          # 15% default tip
isDummyPaymentMode: True      # Development mode
isAIFeaturesEnabled: True     # AI features on
isDynamicPricingEnabled: False # Dynamic pricing off
```

## Dependencies

- pytest
- pydantic
- unittest.mock
- datetime
- FastAPI (for models)

## Integration with CI/CD

These tests can be run in CI/CD pipelines:

```yaml
- name: Run API Config Unit Tests
  run: |
    cd apps/web/p2p-platform/backend
    pytest tests/unit/test_api_config.py -v --junitxml=test-results.xml
```

## Expected Test Results

All tests should pass with:
- **Status**: PASSED
- **Warnings**: None expected
- **Execution Time**: < 5 seconds total

## Troubleshooting

### ImportError
If you get import errors, ensure you're in the correct directory:
```bash
cd /Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend
```

### Pydantic Validation Errors
Tests expect specific Pydantic v2 behavior. Ensure you have the correct version:
```bash
pip install "pydantic>=2.0"
```

### Async Test Issues
If async tests fail, ensure pytest-asyncio is installed:
```bash
pip install pytest-asyncio
```

## Future Enhancements

Potential additions to the test suite:
- [ ] More edge cases for invoice calculations
- [ ] Boundary testing for numeric fields
- [ ] More comprehensive OAuth flow testing
- [ ] Performance benchmarking
- [ ] Mock external service calls (email, document verification)

## Related Files

- **Main Application**: `/Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend/main_new.py`
- **Test Config**: `/Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend/pytest.ini`
- **Shared Fixtures**: `/Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend/tests/conftest.py`
- **Other Unit Tests**: `/Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend/tests/unit/`

## Notes

- All tests are designed to run standalone without database setup
- Tests follow pytest conventions and naming patterns
- Each test is independent and can run in isolation
- Comprehensive docstrings explain what each test validates
- Tests cover both happy paths and error cases
