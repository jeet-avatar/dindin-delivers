#!/bin/bash
# Test runner script for promotion unit tests

cd "$(dirname "$0")"

echo "Running promotion utility function unit tests..."
echo "=============================================="
echo ""

# Run with pytest if available
if command -v pytest &> /dev/null; then
    echo "Using pytest..."
    python -m pytest tests/unit/test_promotions.py -v --tb=short
    exit_code=$?
else
    echo "pytest not found, using unittest..."
    python -m unittest tests.unit.test_promotions -v
    exit_code=$?
fi

echo ""
echo "=============================================="
if [ $exit_code -eq 0 ]; then
    echo "All tests passed!"
else
    echo "Some tests failed. Exit code: $exit_code"
fi

exit $exit_code
