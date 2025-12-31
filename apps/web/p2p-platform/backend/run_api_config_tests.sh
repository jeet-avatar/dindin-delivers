#!/bin/bash
# Script to run API config unit tests

cd "$(dirname "$0")"

echo "Running API Configuration Unit Tests..."
echo "========================================"
echo ""

python -m pytest tests/unit/test_api_config.py -v --tb=short

echo ""
echo "Test run complete!"
