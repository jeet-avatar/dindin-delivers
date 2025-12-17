# Email Service Unit Tests

Comprehensive unit tests for `email_service.py` module.

## Test Coverage

The test suite covers all email service functions:

### 1. `send_email()` Tests
- **Successful email sending** - Mocks SMTP server and verifies email is sent
- **Dev mode (no SMTP credentials)** - Verifies logging behavior when credentials not configured
- **SMTP connection errors** - Tests handling of connection failures
- **SMTP authentication errors** - Tests handling of authentication failures
- **Email sending errors** - Tests handling of sendmail failures
- **Generic exceptions** - Tests handling of unexpected errors
- **Email headers** - Verifies correct From, To, Subject headers
- **Special characters** - Tests handling of emojis and special chars in subjects
- **Empty subjects** - Tests edge case with empty subject line
- **HTML-only emails** - Tests sending emails without text body

### 2. `send_vendor_approval_email()` Tests
- Email content validation (restaurant name, contact name)
- Login link inclusion
- Special characters in names
- Empty names handling
- Send failure handling

### 3. `send_vendor_registration_confirmation()` Tests
- Email content validation (vendor ID, restaurant info)
- Vendor ID display
- Timeline/process information inclusion
- Special characters in vendor ID
- Send failure handling

### 4. `send_driver_approval_email()` Tests
- Email content validation (driver name, driver code)
- Driver code display
- Login link inclusion
- App download links (iOS/Android)
- Special characters in names
- Empty names handling

### 5. `send_driver_registration_confirmation()` Tests
- Email content validation (driver code, application ID)
- Application ID display
- Timeline/process information
- Send failure handling
- Long name handling

### 6. Edge Cases Tests
- Unicode characters (emojis, international chars)
- Very long restaurant/driver names
- Multiline HTML content
- Both text and HTML parts preservation
- Boolean return value validation

## Running the Tests

### Run all email service tests:
```bash
cd /Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend
pytest tests/unit/test_email_service.py -v
```

### Run specific test class:
```bash
pytest tests/unit/test_email_service.py::TestSendEmail -v
pytest tests/unit/test_email_service.py::TestSendVendorApprovalEmail -v
pytest tests/unit/test_email_service.py::TestSendDriverApprovalEmail -v
```

### Run specific test:
```bash
pytest tests/unit/test_email_service.py::TestSendEmail::test_send_email_success -v
```

### Run with coverage:
```bash
pytest tests/unit/test_email_service.py --cov=email_service --cov-report=html
```

### Run with detailed output:
```bash
pytest tests/unit/test_email_service.py -v --tb=short
```

## Test Structure

All tests use `unittest.mock` to mock the SMTP server, so no actual emails are sent during testing. This means:

- **No SMTP server required** - All SMTP operations are mocked
- **No database required** - Tests are completely isolated
- **Fast execution** - Tests run in milliseconds
- **Deterministic** - No external dependencies mean consistent results

## Mocking Strategy

The tests use different mocking approaches:

1. **SMTP mocking** - `smtplib.SMTP` is mocked to simulate email server
2. **Environment variable mocking** - `@patch` decorators mock SMTP credentials
3. **Function mocking** - Higher-level email functions mock `send_email()` to test composition

## Test Assertions

Tests verify:
- Return values (True/False)
- Function call counts (called once, not called, etc.)
- Function arguments (email addresses, subject lines, content)
- Email content (HTML and text bodies contain expected information)
- Error handling (proper handling of SMTP exceptions)
- Logging output (using pytest's `capsys` fixture)

## Example Test Output

```
tests/unit/test_email_service.py::TestSendEmail::test_send_email_success PASSED
tests/unit/test_email_service.py::TestSendEmail::test_send_email_html_only PASSED
tests/unit/test_email_service.py::TestSendEmail::test_send_email_dev_mode_no_credentials PASSED
tests/unit/test_email_service.py::TestSendEmail::test_send_email_smtp_connection_error PASSED
...

========================= 40 passed in 0.25s =========================
```

## Dependencies

Required packages (already in project):
- `pytest` - Test framework
- `unittest.mock` - Mocking library (built-in)
- `smtplib` - SMTP library (built-in)

No additional dependencies needed!

## Notes

- Tests are completely isolated and don't require any external services
- All SMTP operations are mocked using `unittest.mock.MagicMock`
- Tests can run in any order (no dependencies between tests)
- Tests automatically clean up after themselves
- No environment variables need to be set for tests to run
