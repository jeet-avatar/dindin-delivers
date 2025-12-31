# Document Verification Tests - Verification Checklist

## Pre-Run Checklist

Before running the tests, verify:

- [ ] You are in the backend directory
  ```bash
  cd /Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend
  ```

- [ ] Required packages are installed
  ```bash
  pip install pytest pytest-asyncio pydantic httpx python-dotenv
  ```

- [ ] Test file exists at correct location
  ```bash
  ls -la tests/unit/test_document_verification.py
  # Should show: -rw-r--r-- ... test_document_verification.py
  ```

## Test Execution

### Step 1: Run All Tests
```bash
pytest tests/unit/test_document_verification.py -v
```

**Expected Output:**
- All tests should pass
- Should see "85 passed" (or more)
- Execution time < 5 seconds

### Step 2: Verify Test Discovery
```bash
pytest tests/unit/test_document_verification.py --collect-only
```

**Expected Output:**
Should discover 13 test classes:
- [ ] TestEnums (4 tests)
- [ ] TestModels (6 tests)
- [ ] TestServiceInitialization (11 tests)
- [ ] TestStatusMapping (10 tests)
- [ ] TestDocumentTypeMapping (10 tests)
- [ ] TestPersonaIssuesExtraction (6 tests)
- [ ] TestWebhookVerification (5 tests)
- [ ] TestManualReview (4 tests)
- [ ] TestDocumentExpiryValidation (7 tests)
- [ ] TestRequiredDocuments (8 tests)
- [ ] TestFactoryFunction (7 tests)
- [ ] TestErrorHandling (2 tests)
- [ ] TestIntegrationScenarios (4 tests)

### Step 3: Run Individual Test Classes
```bash
# Test enums
pytest tests/unit/test_document_verification.py::TestEnums -v
# Expected: 4 passed

# Test models
pytest tests/unit/test_document_verification.py::TestModels -v
# Expected: 6 passed

# Test webhook verification (security critical)
pytest tests/unit/test_document_verification.py::TestWebhookVerification -v
# Expected: 5 passed
```

### Step 4: Run Specific Critical Tests
```bash
# Test webhook security
pytest tests/unit/test_document_verification.py::TestWebhookVerification::test_verify_persona_webhook_valid_signature -v

# Test expiry validation
pytest tests/unit/test_document_verification.py::TestDocumentExpiryValidation::test_validate_expired_document -v

# Test required documents
pytest tests/unit/test_document_verification.py::TestRequiredDocuments::test_get_required_documents_vendor -v
```

## Component Coverage Verification

### Enums
- [ ] VerificationProvider (4 values)
  - [ ] PERSONA = "persona"
  - [ ] ONFIDO = "onfido"
  - [ ] VERIFF = "veriff"
  - [ ] MANUAL = "manual"

- [ ] VerificationStatus (6 values)
  - [ ] PENDING = "pending"
  - [ ] IN_REVIEW = "in_review"
  - [ ] VERIFIED = "verified"
  - [ ] REJECTED = "rejected"
  - [ ] NEEDS_REVIEW = "needs_review"
  - [ ] EXPIRED = "expired"

- [ ] DocumentType (9 values)
  - [ ] FOOD_LICENSE
  - [ ] HEALTH_PERMIT
  - [ ] BUSINESS_LICENSE
  - [ ] LIABILITY_INSURANCE
  - [ ] W9_FORM
  - [ ] DRIVERS_LICENSE
  - [ ] VEHICLE_INSURANCE
  - [ ] VEHICLE_REGISTRATION
  - [ ] PROFILE_PHOTO

### Models
- [ ] VerificationResult
  - [ ] All required fields
  - [ ] All optional fields
  - [ ] Field validation

- [ ] DocumentVerificationRecord
  - [ ] All required fields
  - [ ] All optional fields
  - [ ] Default values

### Service Methods
- [ ] `__init__(provider)`
  - [ ] Default provider
  - [ ] All 4 providers
  - [ ] Invalid provider error

- [ ] `_load_credentials()`
  - [ ] Persona credentials
  - [ ] Onfido credentials
  - [ ] Veriff credentials
  - [ ] Missing credentials
  - [ ] Default URLs

- [ ] `_map_persona_status(status)`
  - [ ] All 8 status mappings
  - [ ] Unknown status default

- [ ] `_map_to_persona_types(doc_types)`
  - [ ] All 9 document types
  - [ ] Multiple documents
  - [ ] Batch processing

- [ ] `_extract_persona_issues(data)`
  - [ ] Empty data
  - [ ] Passed checks
  - [ ] Failed checks
  - [ ] Multiple failures

- [ ] `verify_persona_webhook(payload, signature)`
  - [ ] Valid signature
  - [ ] Invalid signature
  - [ ] Tampered payload
  - [ ] Missing secret

- [ ] `create_manual_review_task()`
  - [ ] Vendor tasks
  - [ ] Driver tasks
  - [ ] Unique IDs
  - [ ] Timestamps

- [ ] `validate_document_expiry(expiry_date)`
  - [ ] Expired documents
  - [ ] Expiring soon (< 30 days)
  - [ ] Valid documents
  - [ ] Boundary conditions

- [ ] `get_required_documents(entity_type)`
  - [ ] Vendor documents (4)
  - [ ] Driver documents (3)
  - [ ] Invalid entity
  - [ ] Document metadata

- [ ] `get_verification_service(provider)`
  - [ ] All 4 providers
  - [ ] Environment default
  - [ ] Fallback to Persona

## Security Tests Verification

### Webhook HMAC Verification (Critical)
- [ ] Valid HMAC-SHA256 signatures accepted
- [ ] Invalid signatures rejected
- [ ] Tampered payloads detected
- [ ] Missing secrets handled safely
- [ ] Constant-time comparison used

**Test Command:**
```bash
pytest tests/unit/test_document_verification.py::TestWebhookVerification -v
```

**Expected Result:** All 5 tests pass

## Integration Scenarios Verification

- [ ] Complete verification workflow
  - [ ] Get required documents
  - [ ] Map document types
  - [ ] Validate expiry
  - [ ] Verify webhook

- [ ] Vendor onboarding scenario
  - [ ] 4 vendor documents
  - [ ] Map to Persona types
  - [ ] Validate license expiry

- [ ] Manual review workflow
  - [ ] Create review task
  - [ ] Verify task structure

- [ ] Expiry warning scenario
  - [ ] Document expiring in 15 days
  - [ ] Warning message generated

**Test Command:**
```bash
pytest tests/unit/test_document_verification.py::TestIntegrationScenarios -v
```

**Expected Result:** All 4 scenarios pass

## Error Handling Verification

- [ ] Missing Persona API key raises ValueError
- [ ] Missing Onfido API key raises ValueError
- [ ] Invalid provider raises ValueError
- [ ] Invalid enum values raise ValidationError

**Test Command:**
```bash
pytest tests/unit/test_document_verification.py::TestErrorHandling -v
```

**Expected Result:** All error tests pass

## Performance Verification

- [ ] All tests complete in < 5 seconds
- [ ] No network calls made
- [ ] No external services contacted
- [ ] Tests can run offline

**Test Command:**
```bash
time pytest tests/unit/test_document_verification.py -v
```

**Expected Result:** real < 5.0s

## Code Quality Verification

### Test File Quality
- [ ] Clear, descriptive test names
- [ ] Proper test organization (AAA pattern)
- [ ] Comprehensive docstrings
- [ ] No code duplication
- [ ] Proper use of fixtures and mocks

### Documentation Quality
- [ ] README exists and is clear
- [ ] Full documentation available
- [ ] Examples provided
- [ ] Troubleshooting section included

## Final Verification Steps

### 1. Run Full Test Suite
```bash
pytest tests/unit/test_document_verification.py -v --tb=short
```

**Success Criteria:**
- [ ] 85+ tests pass
- [ ] 0 failures
- [ ] 0 errors
- [ ] < 5 seconds execution

### 2. Run with Coverage
```bash
pytest tests/unit/test_document_verification.py --cov=document_verification_service
```

**Success Criteria:**
- [ ] High coverage percentage
- [ ] No missing critical code paths

### 3. Run in Verbose Mode
```bash
pytest tests/unit/test_document_verification.py -vv
```

**Success Criteria:**
- [ ] All test names display correctly
- [ ] Clear pass/fail indicators
- [ ] Helpful output on any failures

### 4. Test Individual Components
```bash
# Enums
pytest tests/unit/test_document_verification.py::TestEnums -v

# Models
pytest tests/unit/test_document_verification.py::TestModels -v

# Security
pytest tests/unit/test_document_verification.py::TestWebhookVerification -v
```

**Success Criteria:**
- [ ] Each component passes independently
- [ ] No interdependencies
- [ ] Consistent results

## Post-Verification

### If All Tests Pass ✓
- [ ] Document test results
- [ ] Commit test files
- [ ] Update project documentation
- [ ] Integrate into CI/CD pipeline

### If Tests Fail ✗
1. Check error messages
2. Review failed test code
3. Verify service implementation
4. Check dependencies installed
5. Run single failed test in verbose mode:
   ```bash
   pytest tests/unit/test_document_verification.py::TestClass::test_name -vv
   ```

## Troubleshooting Common Issues

### Issue: No tests collected
**Solution:**
```bash
# Check test file exists
ls -la tests/unit/test_document_verification.py

# Check pytest can find it
pytest --collect-only tests/unit/test_document_verification.py
```

### Issue: Import errors
**Solution:**
```bash
# Check you're in backend directory
pwd
# Should show: .../backend

# Check Python path
python -c "import sys; print(sys.path)"
```

### Issue: Missing dependencies
**Solution:**
```bash
pip install pytest pytest-asyncio pydantic httpx python-dotenv
```

### Issue: Async test failures
**Solution:**
```bash
pip install pytest-asyncio
# Ensure pytest.ini has: asyncio_mode = auto
```

## Success Indicators

When all checks pass, you should see:

```
======================== 85 passed in 2.34s ========================
```

All checkboxes above should be marked ✓

## Files to Review

- [ ] `/tests/unit/test_document_verification.py` - Main test file
- [ ] `/tests/unit/README_document_verification_tests.md` - Quick reference
- [ ] `/tests/unit/TEST_DOCUMENTATION_document_verification.md` - Full docs
- [ ] `/DOCUMENT_VERIFICATION_TEST_SUMMARY.md` - Summary

---

**Last Updated:** 2025-12-16
**Total Checks:** 80+
**Expected Duration:** 5 minutes
