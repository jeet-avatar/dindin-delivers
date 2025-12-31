# Promotion Utility Functions - Unit Tests

Comprehensive unit tests for the promotion utility functions in `promotions.py`.

## Test File Location

```
/Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend/tests/unit/test_promotions.py
```

## Test Coverage

### 1. `get_promotion_message()` Function
Tests for generating human-readable promotion messages:

- **test_percentage_promotion_message**: Basic percentage discount (20% off)
- **test_percentage_promotion_with_decimal**: Handles decimal percentages (15.5%)
- **test_flat_amount_promotion_message**: Flat dollar amount ($5.00 off)
- **test_flat_amount_with_cents**: Flat amount with cents ($7.50)
- **test_free_delivery_message**: Free delivery promotion
- **test_bogo_message**: Buy One Get One Free
- **test_unknown_promotion_type_message**: Custom/unknown types
- **test_free_item_promotion_message**: Free item promotions
- **test_bundle_promotion_message**: Bundle deal promotions

### 2. `calculate_discount()` Function
Tests for discount calculation logic:

#### Percentage Discounts
- **test_percentage_discount_calculation**: Basic percentage (20% of $100)
- **test_percentage_discount_with_decimal_total**: Decimal order totals
- **test_percentage_discount_with_max_cap**: Max discount cap applied
- **test_percentage_discount_under_max_cap**: Under max cap
- **test_percentage_discount_exactly_at_cap**: Exactly at cap boundary
- **test_zero_order_total_percentage**: Zero order total
- **test_large_order_total_percentage**: Large order totals
- **test_calculate_discount_very_large_percentage**: Over 100% discount

#### Flat Amount Discounts
- **test_flat_amount_discount**: Basic flat amount
- **test_flat_amount_discount_with_decimal**: Decimal values
- **test_flat_amount_independent_of_order_total**: Independent of total

#### Free Delivery
- **test_free_delivery_discount**: Standard delivery fee (4.99)
- **test_free_delivery_independent_of_order_total**: Independent of total

#### BOGO (Buy One Get One)
- **test_bogo_with_items_list**: Discounts cheapest item
- **test_bogo_with_single_item**: Single item edge case
- **test_bogo_with_no_items**: No items provided
- **test_bogo_with_empty_items_list**: Empty items list
- **test_bogo_with_items_missing_price**: Items with missing price
- **test_bogo_finds_cheapest_item**: Correctly identifies cheapest
- **test_bogo_with_zero_price_items**: Zero price items

#### Rounding & Edge Cases
- **test_discount_rounding**: Proper 2 decimal place rounding

### 3. `generate_promotion_insights()` Function
Tests for AI-generated insights:

- **test_insights_with_empty_stats**: No promotions case
- **test_insights_with_no_redemptions**: Promotions with zero usage
- **test_insights_best_performer**: Identifies highest ROI
- **test_insights_most_popular**: Identifies most redemptions
- **test_insights_no_active_promotions**: Warning for no active promos
- **test_insights_too_many_active_promotions**: Warning for >5 active
- **test_insights_exactly_five_active_promotions**: Boundary case (5)
- **test_insights_exactly_six_active_promotions**: Boundary case (6)
- **test_insights_with_mixed_status**: Mixed active/expired/paused
- **test_insights_formatting_includes_emojis**: Emoji indicators present
- **test_insights_roi_formatting**: ROI formatted to 1 decimal
- **test_insights_returns_list**: Always returns list type
- **test_generate_insights_with_zero_roi**: Zero ROI handling
- **test_generate_insights_with_negative_roi**: Negative ROI (losses)

### 4. `AI_EMPLOYEES` Constant
Tests for AI employee configuration:

- **test_ai_employees_exists**: Constant exists and is dict
- **test_marketing_maestro_exists**: Sierra (Marketing Maestro)
- **test_notification_ninja_exists**: Phoenix (Notification Ninja)
- **test_analytics_advisor_exists**: Sage (Analytics Advisor)
- **test_all_employees_have_required_fields**: All have id/name/role/description
- **test_unique_employee_ids**: No duplicate IDs
- **test_unique_employee_names**: No duplicate names

### 5. Pydantic Request Models
Tests for API request validation models:

#### CreatePromotionRequest
- **test_create_promotion_request_minimal**: Required fields only
- **test_create_promotion_request_full**: All fields populated
- **test_create_promotion_request_dict_fields**: Dict fields (schedule, applies_to)
- **test_pydantic_validation_types**: Type coercion (int to float)

#### UpdatePromotionRequest
- **test_update_promotion_request_minimal**: All fields optional
- **test_update_promotion_request_partial**: Some fields updated
- **test_update_promotion_request_full**: All fields updated

#### ApplyPromotionRequest
- **test_apply_promotion_request_minimal**: Required fields only
- **test_apply_promotion_request_full**: With customer_id and items

### 6. Edge Cases & Error Handling
Tests for unusual scenarios:

- **test_get_promotion_message_with_none_values**: None values handling
- **test_calculate_discount_with_negative_values**: Negative amounts
- **test_calculate_discount_very_large_percentage**: >100% discounts

## Running the Tests

### Option 1: Using pytest (recommended)
```bash
cd /Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend
python -m pytest tests/unit/test_promotions.py -v
```

### Option 2: Using unittest
```bash
cd /Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend
python -m unittest tests.unit.test_promotions -v
```

### Option 3: Using the test runner script
```bash
cd /Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend
chmod +x run_promotion_tests.sh
./run_promotion_tests.sh
```

### Option 4: Run directly
```bash
cd /Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend
python tests/unit/test_promotions.py
```

## Test Statistics

- **Total Test Cases**: 70+
- **Test Classes**: 6
- **Functions Tested**: 3 utility functions + 1 constant + 3 models
- **Coverage Areas**:
  - Message generation
  - Discount calculation
  - AI insights generation
  - Data structure validation
  - Edge case handling

## Key Features

### No Database Required
- All tests use mocked objects
- No SQLAlchemy database connection needed
- Fast execution (runs in seconds)
- Can run in CI/CD environments

### Comprehensive Mocking
- Mock `Promotion` objects with proper type comparison
- Enum types handled correctly (percentage, flat_amount, etc.)
- Flexible mock creation helper function

### Clear Test Structure
- Descriptive test names
- Detailed docstrings
- Organized into logical test classes
- Easy to understand and maintain

## Implementation Details

### Mock Promotion Helper
```python
def create_mock_promotion(
    promotion_type: str,
    value: float,
    name: str = "Test Promotion",
    promotion_code: str = "TESTCODE",
    max_discount: Optional[float] = None,
    description: Optional[str] = None
) -> Mock
```

Creates a mock Promotion object with:
- Proper enum type comparison behavior
- All required attributes
- Configurable values for testing

### Enum Handling
The tests import actual enum types from `models_extended.py`:
- `PromotionType`: PERCENTAGE, FLAT_AMOUNT, FREE_DELIVERY, BOGO, etc.
- `PromotionStatus`: ACTIVE, EXPIRED, PAUSED, etc.
- `PromotionTargetAudience`: ALL, NEW_CUSTOMERS, RETURNING, etc.

With fallback mock enums if imports fail.

## Dependencies

- Python 3.8+
- `unittest` (built-in)
- `unittest.mock` (built-in)
- Optional: `pytest` (for better output)

## Maintenance

To add new tests:
1. Add test method to appropriate test class
2. Follow naming convention: `test_<function>_<scenario>`
3. Use descriptive docstrings
4. Use `create_mock_promotion()` helper for consistency

## CI/CD Integration

These tests are designed for CI/CD pipelines:
```yaml
# Example GitHub Actions
- name: Run Promotion Unit Tests
  run: |
    cd apps/web/p2p-platform/backend
    python -m pytest tests/unit/test_promotions.py -v --junitxml=test-results.xml
```

## Test Output Example

```
test_percentage_promotion_message PASSED                        [ 1%]
test_percentage_discount_calculation PASSED                     [ 2%]
test_bogo_finds_cheapest_item PASSED                           [ 3%]
test_insights_best_performer PASSED                            [ 4%]
test_ai_employees_exists PASSED                                [ 5%]
...
=============================== 70 passed in 0.15s ===============================
```

## Future Enhancements

Potential additions:
- Performance benchmarks
- Property-based testing (hypothesis)
- Mock database integration tests
- API endpoint integration tests
- Load testing for promotion calculations
