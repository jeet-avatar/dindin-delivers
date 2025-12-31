# Promotion Tests - Quick Reference

## Run All Tests
```bash
cd /Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend

# Pytest (recommended)
python -m pytest tests/unit/test_promotions.py -v

# Unittest
python -m unittest tests.unit.test_promotions -v

# Direct
python tests/unit/test_promotions.py
```

## Run Specific Test Class
```bash
# Test only message generation
python -m pytest tests/unit/test_promotions.py::TestGetPromotionMessage -v

# Test only discount calculation
python -m pytest tests/unit/test_promotions.py::TestCalculateDiscount -v

# Test only insights generation
python -m pytest tests/unit/test_promotions.py::TestGeneratePromotionInsights -v

# Test only AI employees constant
python -m pytest tests/unit/test_promotions.py::TestAIEmployeesConstant -v

# Test only Pydantic models
python -m pytest tests/unit/test_promotions.py::TestPydanticModels -v
```

## Run Specific Test Method
```bash
# Test percentage discount
python -m pytest tests/unit/test_promotions.py::TestCalculateDiscount::test_percentage_discount_calculation -v

# Test BOGO logic
python -m pytest tests/unit/test_promotions.py::TestCalculateDiscount::test_bogo_finds_cheapest_item -v

# Test insights
python -m pytest tests/unit/test_promotions.py::TestGeneratePromotionInsights::test_insights_best_performer -v
```

## Run Tests by Pattern
```bash
# All percentage tests
python -m pytest tests/unit/test_promotions.py -k "percentage" -v

# All BOGO tests
python -m pytest tests/unit/test_promotions.py -k "bogo" -v

# All insight tests
python -m pytest tests/unit/test_promotions.py -k "insights" -v

# All edge case tests
python -m pytest tests/unit/test_promotions.py -k "edge" -v
```

## Useful Pytest Options
```bash
# Show test coverage
python -m pytest tests/unit/test_promotions.py --cov=promotions --cov-report=html

# Stop on first failure
python -m pytest tests/unit/test_promotions.py -x

# Show local variables on failure
python -m pytest tests/unit/test_promotions.py -l

# Very verbose (show full diff)
python -m pytest tests/unit/test_promotions.py -vv

# Show print statements
python -m pytest tests/unit/test_promotions.py -s

# Generate JUnit XML report
python -m pytest tests/unit/test_promotions.py --junitxml=results.xml
```

## Debug Failing Tests
```bash
# Drop into debugger on failure
python -m pytest tests/unit/test_promotions.py --pdb

# Show full traceback
python -m pytest tests/unit/test_promotions.py --tb=long

# Show only summary (no traceback)
python -m pytest tests/unit/test_promotions.py --tb=no
```

## Test Statistics
```bash
# Show test durations
python -m pytest tests/unit/test_promotions.py --durations=10

# Dry run (collect tests without running)
python -m pytest tests/unit/test_promotions.py --collect-only
```

## Common Test Scenarios

### Testing Discount Calculations
```bash
# All discount calculation tests
python -m pytest tests/unit/test_promotions.py::TestCalculateDiscount -v

# Just percentage discounts
python -m pytest tests/unit/test_promotions.py -k "percentage_discount" -v

# Just BOGO tests
python -m pytest tests/unit/test_promotions.py -k "bogo" -v
```

### Testing Message Generation
```bash
# All message tests
python -m pytest tests/unit/test_promotions.py::TestGetPromotionMessage -v

# Specific promotion type message
python -m pytest tests/unit/test_promotions.py -k "percentage_promotion_message" -v
```

### Testing AI Insights
```bash
# All insights tests
python -m pytest tests/unit/test_promotions.py::TestGeneratePromotionInsights -v

# Performance insights
python -m pytest tests/unit/test_promotions.py -k "best_performer or most_popular" -v

# Warning insights
python -m pytest tests/unit/test_promotions.py -k "no_active or too_many" -v
```

### Testing Pydantic Models
```bash
# All model validation tests
python -m pytest tests/unit/test_promotions.py::TestPydanticModels -v

# Just CreatePromotionRequest
python -m pytest tests/unit/test_promotions.py -k "create_promotion_request" -v

# Just UpdatePromotionRequest
python -m pytest tests/unit/test_promotions.py -k "update_promotion_request" -v
```

## Quick Test Counts

| Category | Count |
|----------|-------|
| Message Generation Tests | 10 |
| Discount Calculation Tests | 30 |
| Insights Generation Tests | 15 |
| AI Employees Tests | 6 |
| Pydantic Model Tests | 9 |
| Edge Case Tests | 6 |
| **Total** | **70+** |

## Expected Execution Time
- All tests: ~0.15 seconds
- Single test class: ~0.03 seconds
- Single test: <0.01 seconds

## Quick Validation
```bash
# Run a quick smoke test
python -m pytest tests/unit/test_promotions.py -k "percentage_promotion_message or flat_amount" -v

# Verify all tests pass
python -m pytest tests/unit/test_promotions.py --tb=no -q

# Count total tests
python -m pytest tests/unit/test_promotions.py --collect-only
```

## Files Created

```
/Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend/
├── tests/unit/test_promotions.py              # Main test file (1,006 lines)
├── tests/unit/TEST_PROMOTIONS_README.md       # Full documentation
├── tests/unit/PROMOTIONS_TEST_SUMMARY.md      # Summary and stats
├── tests/unit/PROMOTIONS_QUICK_REFERENCE.md   # This file
└── run_promotion_tests.sh                     # Test runner script
```
