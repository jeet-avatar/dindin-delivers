#!/usr/bin/env bash
# =============================================================================
# Dollor.ai Smoke Test Runner
# =============================================================================
# Usage:
#   scripts/smoke-test.sh staging      # Run all tests against staging
#   scripts/smoke-test.sh production   # Run safe tests against production
#   scripts/smoke-test.sh              # Defaults to staging
#
# Exit code: 0 = all pass, 1 = failures
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/apps/web/p2p-platform/backend"

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
ENV="${1:-staging}"

if [[ "$ENV" != "staging" && "$ENV" != "production" ]]; then
    echo "ERROR: Invalid environment '$ENV'. Use 'staging' or 'production'."
    echo "Usage: $0 [staging|production]"
    exit 1
fi

# ---------------------------------------------------------------------------
# Environment URLs for display
# ---------------------------------------------------------------------------
declare -A ENV_URLS=(
    ["staging"]="https://d34u5ixl0bulv4.cloudfront.net"
    ["production"]="https://api.dollor.ai"
)

echo "============================================="
echo " Dollor.ai Smoke Tests"
echo "============================================="
echo " Environment: $ENV"
echo " Target URL:  ${ENV_URLS[$ENV]}"
echo " Time:        $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo "============================================="
echo ""

# ---------------------------------------------------------------------------
# Build pytest command
# ---------------------------------------------------------------------------
PYTEST_ARGS=(
    -v
    --tb=short
    --no-header
    "--env=$ENV"
    "$BACKEND_DIR/tests/smoke/"
)

if [[ "$ENV" == "production" ]]; then
    echo "[INFO] Production mode -- staging_only tests will be auto-skipped."
    echo ""
fi

# ---------------------------------------------------------------------------
# Run tests
# ---------------------------------------------------------------------------
cd "$BACKEND_DIR"

# Activate venv if present
if [[ -f "venv/bin/activate" ]]; then
    source venv/bin/activate
fi

START_TIME=$(date +%s)

set +e
python -m pytest "${PYTEST_ARGS[@]}" 2>&1
EXIT_CODE=$?
set -e

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "============================================="
echo " Smoke Test Summary"
echo "============================================="
echo " Environment: $ENV"
echo " Target URL:  ${ENV_URLS[$ENV]}"
echo " Duration:    ${DURATION}s"
if [[ $EXIT_CODE -eq 0 ]]; then
    echo " Result:      PASS"
else
    echo " Result:      FAIL (exit code $EXIT_CODE)"
fi
echo "============================================="

exit $EXIT_CODE
