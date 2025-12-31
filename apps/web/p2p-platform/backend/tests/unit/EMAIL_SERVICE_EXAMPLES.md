# Email Service Test Examples

This document provides example test code to understand the testing patterns used in `test_email_service.py`.

## Example 1: Testing Successful Email Send with SMTP

This test mocks the SMTP server and verifies that an email is sent successfully.

```python
@patch('email_service.SMTP_USER', 'test@example.com')
@patch('email_service.SMTP_PASSWORD', 'test_password')
@patch('email_service.SMTP_HOST', 'smtp.gmail.com')
@patch('email_service.SMTP_PORT', 587)
@patch('email_service.FROM_EMAIL', 'noreply@dollor.ai')
@patch('email_service.FROM_NAME', 'Dollor.ai')
@patch('smtplib.SMTP')
def test_send_email_success(self, mock_smtp_class):
    """Should successfully send email with valid SMTP configuration"""
    # Arrange - Set up the mock SMTP server
    mock_server = MagicMock()
    mock_smtp_class.return_value.__enter__.return_value = mock_server

    to_email = "recipient@example.com"
    subject = "Test Subject"
    html_body = "<h1>Test HTML</h1>"
    text_body = "Test plain text"

    # Act - Call the function we're testing
    result = email_service.send_email(to_email, subject, html_body, text_body)

    # Assert - Verify the behavior
    assert result is True
    mock_smtp_class.assert_called_once_with('smtp.gmail.com', 587)
    mock_server.starttls.assert_called_once()
    mock_server.login.assert_called_once_with('test@example.com', 'test_password')
    mock_server.sendmail.assert_called_once()
```

**Key Points:**
- Uses `@patch` decorators to mock environment variables
- Mocks `smtplib.SMTP` to avoid real SMTP calls
- Verifies function return value is `True`
- Verifies SMTP methods are called with correct arguments

---

## Example 2: Testing Dev Mode (No SMTP Credentials)

This test verifies that when SMTP credentials are not configured, the email is logged instead of sent.

```python
@patch('email_service.SMTP_USER', '')
@patch('email_service.SMTP_PASSWORD', '')
def test_send_email_dev_mode_no_credentials(self, capsys):
    """Should log email and return True when SMTP credentials not configured"""
    # Arrange
    to_email = "recipient@example.com"
    subject = "Test Subject"
    html_body = "<h1>Test HTML</h1>"

    # Act
    result = email_service.send_email(to_email, subject, html_body)

    # Assert
    assert result is True
    captured = capsys.readouterr()  # Capture stdout
    assert to_email in captured.out
    assert subject in captured.out
    assert "SMTP not configured" in captured.out
```

**Key Points:**
- Mocks empty SMTP credentials to trigger dev mode
- Uses `capsys` fixture to capture console output
- Verifies email details are logged to stdout
- Confirms function still returns `True` (dev mode success)

---

## Example 3: Testing SMTP Connection Error

This test verifies proper error handling when SMTP connection fails.

```python
@patch('email_service.SMTP_USER', 'test@example.com')
@patch('email_service.SMTP_PASSWORD', 'test_password')
@patch('smtplib.SMTP')
def test_send_email_smtp_connection_error(self, mock_smtp_class, capsys):
    """Should return False when SMTP connection fails"""
    # Arrange - Make SMTP connection throw an error
    mock_smtp_class.side_effect = smtplib.SMTPConnectError(421, "Connection refused")

    to_email = "recipient@example.com"
    subject = "Test Subject"
    html_body = "<h1>Test HTML</h1>"

    # Act
    result = email_service.send_email(to_email, subject, html_body)

    # Assert
    assert result is False
    captured = capsys.readouterr()
    assert "Failed to send email" in captured.out
    assert to_email in captured.out
```

**Key Points:**
- Uses `side_effect` to make the mock throw an exception
- Verifies function returns `False` on error
- Confirms error message is logged
- Tests exception handling path

---

## Example 4: Testing Vendor Approval Email

This test verifies the vendor approval email contains correct content.

```python
@patch('email_service.send_email')
def test_vendor_approval_email_success(self, mock_send_email):
    """Should call send_email with correct vendor approval content"""
    # Arrange
    mock_send_email.return_value = True
    to_email = "vendor@restaurant.com"
    restaurant_name = "Joe's Pizza"
    contact_name = "Joe Smith"

    # Act
    result = email_service.send_vendor_approval_email(
        to_email, restaurant_name, contact_name
    )

    # Assert
    assert result is True
    mock_send_email.assert_called_once()

    # Verify call arguments
    call_args = mock_send_email.call_args[0]
    assert call_args[0] == to_email
    assert restaurant_name in call_args[1]  # Subject
    assert contact_name in call_args[2]     # HTML body
    assert restaurant_name in call_args[2]  # HTML body
    assert contact_name in call_args[3]     # Text body
```

**Key Points:**
- Mocks the lower-level `send_email()` function
- Tests the composition/wrapper function
- Verifies correct arguments are passed to `send_email()`
- Checks that email content includes expected information

---

## Example 5: Testing Email Headers

This test verifies that email headers (From, To, Subject) are set correctly.

```python
@patch('email_service.SMTP_USER', 'test@example.com')
@patch('email_service.SMTP_PASSWORD', 'test_password')
@patch('email_service.FROM_EMAIL', 'noreply@dollor.ai')
@patch('email_service.FROM_NAME', 'Dollor.ai')
@patch('smtplib.SMTP')
def test_send_email_correct_headers(self, mock_smtp_class):
    """Should set correct email headers (From, To, Subject)"""
    # Arrange
    mock_server = MagicMock()
    mock_smtp_class.return_value.__enter__.return_value = mock_server

    to_email = "recipient@example.com"
    subject = "Test Subject Line"
    html_body = "<h1>Test</h1>"

    # Act
    result = email_service.send_email(to_email, subject, html_body)

    # Assert
    assert result is True

    # Get the message that was sent
    call_args = mock_server.sendmail.call_args[0]
    message_str = call_args[2]  # Third argument is the message

    # Verify headers are in the message
    assert "Subject: Test Subject Line" in message_str
    assert f"To: {to_email}" in message_str
    assert "From: Dollor.ai <noreply@dollor.ai>" in message_str
```

**Key Points:**
- Inspects the actual message string sent via SMTP
- Verifies email headers are properly formatted
- Checks From name and email are combined correctly
- Validates Subject line is included

---

## Example 6: Testing Special Characters

This test ensures special characters and emojis are handled properly.

```python
@patch('email_service.SMTP_USER', 'test@example.com')
@patch('email_service.SMTP_PASSWORD', 'test_password')
@patch('smtplib.SMTP')
def test_send_email_special_characters_in_subject(self, mock_smtp_class):
    """Should handle special characters in subject line"""
    # Arrange
    mock_server = MagicMock()
    mock_smtp_class.return_value.__enter__.return_value = mock_server

    to_email = "recipient@example.com"
    subject = "🎉 Congratulations! Special chars: <>&\""
    html_body = "<h1>Test</h1>"

    # Act
    result = email_service.send_email(to_email, subject, html_body)

    # Assert
    assert result is True
    mock_server.sendmail.assert_called_once()
```

**Key Points:**
- Tests with emojis, HTML chars, quotes
- Verifies no exceptions are thrown
- Ensures email still sends successfully
- Tests edge case of special character handling

---

## Example 7: Testing Email Content for Links

This test verifies specific content like login links are included in the email.

```python
@patch('email_service.send_email')
def test_vendor_approval_email_contains_login_link(self, mock_send_email):
    """Should include vendor login link in email"""
    # Arrange
    mock_send_email.return_value = True

    # Act
    result = email_service.send_vendor_approval_email(
        "vendor@example.com", "Test Restaurant", "John Doe"
    )

    # Assert
    assert result is True
    call_args = mock_send_email.call_args[0]
    html_body = call_args[2]  # Third argument is HTML body
    assert "https://dollor.ai/vendor/login" in html_body
```

**Key Points:**
- Extracts the HTML body from the function call
- Searches for specific URL in the content
- Ensures important links are not forgotten
- Tests content accuracy

---

## Example 8: Testing Authentication Error

This test verifies proper handling when SMTP authentication fails.

```python
@patch('email_service.SMTP_USER', 'test@example.com')
@patch('email_service.SMTP_PASSWORD', 'test_password')
@patch('smtplib.SMTP')
def test_send_email_authentication_error(self, mock_smtp_class, capsys):
    """Should return False when SMTP authentication fails"""
    # Arrange
    mock_server = MagicMock()
    # Make login throw an authentication error
    mock_server.login.side_effect = smtplib.SMTPAuthenticationError(
        535, "Authentication failed"
    )
    mock_smtp_class.return_value.__enter__.return_value = mock_server

    to_email = "recipient@example.com"
    subject = "Test Subject"
    html_body = "<h1>Test HTML</h1>"

    # Act
    result = email_service.send_email(to_email, subject, html_body)

    # Assert
    assert result is False
    captured = capsys.readouterr()
    assert "Failed to send email" in captured.out
```

**Key Points:**
- Mocks authentication failure at login step
- Tests exception handling for auth errors
- Verifies function returns `False`
- Ensures error is logged appropriately

---

## Example 9: Testing Empty Input Edge Case

This test verifies the function handles empty strings gracefully.

```python
@patch('email_service.send_email')
def test_vendor_approval_email_empty_names(self, mock_send_email):
    """Should handle empty restaurant and contact names"""
    # Arrange
    mock_send_email.return_value = True

    # Act
    result = email_service.send_vendor_approval_email(
        "vendor@example.com", "", ""  # Empty names
    )

    # Assert
    assert result is True
    mock_send_email.assert_called_once()
```

**Key Points:**
- Tests boundary condition with empty strings
- Verifies no exceptions are thrown
- Ensures function is defensive against bad input
- Tests edge case handling

---

## Example 10: Testing Return Type

This test ensures all email functions return boolean values.

```python
@patch('email_service.send_email')
def test_all_email_functions_return_boolean(self, mock_send_email):
    """All email functions should return boolean values"""
    # Arrange
    mock_send_email.return_value = True

    # Act & Assert - Test each function
    result1 = email_service.send_vendor_approval_email(
        "test@example.com", "Restaurant", "Contact"
    )
    assert isinstance(result1, bool)

    result2 = email_service.send_vendor_registration_confirmation(
        "test@example.com", "Restaurant", "Contact", "VEN-123"
    )
    assert isinstance(result2, bool)

    result3 = email_service.send_driver_approval_email(
        "test@example.com", "Driver", "DRV-123"
    )
    assert isinstance(result3, bool)

    result4 = email_service.send_driver_registration_confirmation(
        "test@example.com", "Driver", "DRV-123"
    )
    assert isinstance(result4, bool)
```

**Key Points:**
- Tests contract/interface consistency
- Verifies all functions have same return type
- Ensures API consistency across module
- Tests type safety

---

## Common Testing Patterns

### Pattern 1: Arrange-Act-Assert (AAA)
```python
def test_something(self):
    # Arrange - Set up test data and mocks
    mock_obj = MagicMock()
    input_data = "test"

    # Act - Call the function under test
    result = function_under_test(input_data)

    # Assert - Verify the results
    assert result == expected_value
    mock_obj.method.assert_called_once()
```

### Pattern 2: Mocking with @patch
```python
@patch('module.ClassName')
def test_with_patch(self, mock_class):
    # mock_class is automatically injected
    mock_class.return_value = "mocked"
    result = function_that_uses_ClassName()
    assert result == "mocked"
```

### Pattern 3: Using side_effect for Exceptions
```python
@patch('module.function')
def test_exception_handling(self, mock_func):
    mock_func.side_effect = Exception("Error!")
    result = function_that_calls_function()
    assert result is False  # Verify exception was handled
```

### Pattern 4: Capturing Console Output
```python
def test_logging(self, capsys):
    function_that_prints("Hello")
    captured = capsys.readouterr()
    assert "Hello" in captured.out
```

### Pattern 5: Inspecting Mock Call Arguments
```python
@patch('module.function')
def test_call_arguments(self, mock_func):
    function_that_calls_function("arg1", "arg2")

    # Check it was called
    mock_func.assert_called_once()

    # Inspect arguments
    call_args = mock_func.call_args[0]
    assert call_args[0] == "arg1"
    assert call_args[1] == "arg2"
```

---

## Running Individual Examples

You can run these examples individually:

```bash
# Run a specific test class
pytest tests/unit/test_email_service.py::TestSendEmail -v

# Run a specific test
pytest tests/unit/test_email_service.py::TestSendEmail::test_send_email_success -v

# Run with more verbose output
pytest tests/unit/test_email_service.py::TestSendEmail::test_send_email_success -vv

# Run and show print statements
pytest tests/unit/test_email_service.py::TestSendEmail -v -s
```

---

## Tips for Writing Similar Tests

1. **Use descriptive test names** - Name should explain what's being tested
2. **One assertion per concept** - Test one thing at a time
3. **Mock external dependencies** - Don't rely on real SMTP, databases, etc.
4. **Test happy path first** - Then add error cases
5. **Test edge cases** - Empty strings, special chars, very long input
6. **Use AAA pattern** - Arrange, Act, Assert for clarity
7. **Verify both success and failure** - Test both return values
8. **Check side effects** - Verify logging, function calls, etc.
9. **Keep tests independent** - Each test should work in isolation
10. **Document why, not what** - Use docstrings to explain the test purpose

---

## Common Assertions

```python
# Boolean assertions
assert result is True
assert result is False

# Equality assertions
assert value == expected
assert value != unexpected

# Membership assertions
assert "text" in string
assert item not in list

# Type assertions
assert isinstance(result, bool)
assert isinstance(result, str)

# Mock assertions
mock_func.assert_called_once()
mock_func.assert_called_with(arg1, arg2)
mock_func.assert_not_called()
assert mock_func.call_count == 3
```

---

## Debugging Tests

If a test fails, use these techniques:

```bash
# Show local variables on failure
pytest tests/unit/test_email_service.py -l

# Show full diff for assertions
pytest tests/unit/test_email_service.py -vv

# Drop into debugger on failure
pytest tests/unit/test_email_service.py --pdb

# Show print statements
pytest tests/unit/test_email_service.py -s

# Run with more verbose traceback
pytest tests/unit/test_email_service.py --tb=long
```
