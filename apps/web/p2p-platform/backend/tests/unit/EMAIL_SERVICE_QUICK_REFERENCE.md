# Email Service Tests - Quick Reference

## Files Created

| File | Size | Purpose |
|------|------|---------|
| `test_email_service.py` | 28 KB | Main test file with 37 tests |
| `README_EMAIL_SERVICE_TESTS.md` | 4.7 KB | Overview and running instructions |
| `EMAIL_SERVICE_TEST_MATRIX.md` | 9.1 KB | Detailed test coverage matrix |
| `EMAIL_SERVICE_EXAMPLES.md` | 15 KB | Code examples and patterns |
| `EMAIL_SERVICE_QUICK_REFERENCE.md` | This file | Quick command reference |

## Quick Commands

### Run All Email Service Tests
```bash
cd /Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend
pytest tests/unit/test_email_service.py -v
```

### Run Specific Test Class
```bash
# Test send_email() function
pytest tests/unit/test_email_service.py::TestSendEmail -v

# Test vendor emails
pytest tests/unit/test_email_service.py::TestSendVendorApprovalEmail -v
pytest tests/unit/test_email_service.py::TestSendVendorRegistrationConfirmation -v

# Test driver emails
pytest tests/unit/test_email_service.py::TestSendDriverApprovalEmail -v
pytest tests/unit/test_email_service.py::TestSendDriverRegistrationConfirmation -v

# Test edge cases
pytest tests/unit/test_email_service.py::TestEmailEdgeCases -v
```

### Run Specific Test
```bash
pytest tests/unit/test_email_service.py::TestSendEmail::test_send_email_success -v
```

### Run with Coverage
```bash
pytest tests/unit/test_email_service.py --cov=email_service --cov-report=term-missing
```

### Run with HTML Coverage Report
```bash
pytest tests/unit/test_email_service.py --cov=email_service --cov-report=html
open htmlcov/index.html
```

## Test Statistics

- **Total Tests**: 37
- **Test Classes**: 6
- **Lines of Code**: 815
- **Functions Tested**: 5
- **Coverage**: ~95-100%

## Test Classes

1. **TestSendEmail** (12 tests) - Core email sending functionality
2. **TestSendVendorApprovalEmail** (5 tests) - Vendor approval emails
3. **TestSendVendorRegistrationConfirmation** (4 tests) - Vendor registration emails
4. **TestSendDriverApprovalEmail** (6 tests) - Driver approval emails
5. **TestSendDriverRegistrationConfirmation** (5 tests) - Driver registration emails
6. **TestEmailEdgeCases** (5 tests) - Edge cases and boundary conditions

## Key Test Scenarios

### Success Paths
- Send email with valid SMTP config
- Send vendor approval email
- Send driver approval email
- Send registration confirmations

### Error Handling
- No SMTP credentials (dev mode)
- SMTP connection error
- SMTP authentication error
- Email sending error
- Generic exceptions

### Edge Cases
- Empty strings
- Special characters (emojis, accents)
- Very long strings (500+ chars)
- Unicode characters
- Multiline HTML

### Content Validation
- Email headers (From, To, Subject)
- HTML body content
- Text body content
- Login links
- App download links
- Vendor/Driver IDs

## Mocking Strategy

### SMTP Server Mocking
```python
@patch('smtplib.SMTP')
```

### Environment Variables
```python
@patch('email_service.SMTP_USER', 'test@example.com')
@patch('email_service.SMTP_PASSWORD', 'test_password')
```

### Function Composition
```python
@patch('email_service.send_email')
```

## Common Assertions

```python
# Return value
assert result is True
assert result is False

# Function calls
mock_func.assert_called_once()
mock_func.assert_called_with(arg1, arg2)

# Content validation
assert "text" in html_body
assert email in message

# Type checking
assert isinstance(result, bool)
```

## Debugging Failed Tests

```bash
# Show local variables
pytest tests/unit/test_email_service.py -l

# Show print statements
pytest tests/unit/test_email_service.py -s

# Drop into debugger
pytest tests/unit/test_email_service.py --pdb

# Full traceback
pytest tests/unit/test_email_service.py --tb=long
```

## Test Dependencies

### Required
- `pytest` - Test framework
- `unittest.mock` - Mocking (built-in)
- `smtplib` - SMTP client (built-in)

### Not Required
- No actual SMTP server
- No database
- No environment variables
- No external services

## Expected Test Output

```
tests/unit/test_email_service.py::TestSendEmail::test_send_email_success PASSED [ 2%]
tests/unit/test_email_service.py::TestSendEmail::test_send_email_html_only PASSED [ 5%]
tests/unit/test_email_service.py::TestSendEmail::test_send_email_dev_mode_no_credentials PASSED [ 8%]
...
========================= 37 passed in 0.3s =========================
```

## Documentation Files

1. **README_EMAIL_SERVICE_TESTS.md**
   - Overview of test coverage
   - Running instructions
   - Test structure explanation

2. **EMAIL_SERVICE_TEST_MATRIX.md**
   - Detailed test breakdown by class
   - Coverage metrics
   - Maintenance notes

3. **EMAIL_SERVICE_EXAMPLES.md**
   - 10 detailed code examples
   - Common testing patterns
   - Tips for writing tests

4. **EMAIL_SERVICE_QUICK_REFERENCE.md** (this file)
   - Quick command reference
   - At-a-glance statistics
   - Common tasks

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Import errors | Ensure you're in the backend directory |
| Tests not found | Run from backend dir, not tests dir |
| Module not found | Check sys.path in test file |
| SMTP errors | Verify mocks are in place |
| Assertion errors | Check mock return values |

## CI/CD Integration

Add to your CI pipeline:
```yaml
- name: Run email service tests
  run: |
    cd apps/web/p2p-platform/backend
    pytest tests/unit/test_email_service.py -v --cov=email_service
```

## Next Steps

After running tests:

1. ✅ Verify all 37 tests pass
2. ✅ Check coverage report
3. ✅ Review any failures
4. ✅ Add to CI/CD pipeline
5. ✅ Update tests when email_service.py changes

## Support

For detailed examples, see:
- `EMAIL_SERVICE_EXAMPLES.md` - Code examples
- `EMAIL_SERVICE_TEST_MATRIX.md` - Full coverage matrix
- `README_EMAIL_SERVICE_TESTS.md` - Complete documentation

## Test File Location

```
/Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend/
└── tests/
    └── unit/
        ├── test_email_service.py                    # Main test file
        ├── README_EMAIL_SERVICE_TESTS.md            # Documentation
        ├── EMAIL_SERVICE_TEST_MATRIX.md             # Coverage matrix
        ├── EMAIL_SERVICE_EXAMPLES.md                # Code examples
        └── EMAIL_SERVICE_QUICK_REFERENCE.md         # This file
```

## One-Line Test Command

```bash
cd /Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend && pytest tests/unit/test_email_service.py -v
```
