#!/usr/bin/env bash
# Phase 54.5 Aurora cutover smoke matrix — aggregate driver
# Runs all 4 per-Lambda smoke scripts in sequence; exits 1 on first failure.
#
# Modes:
#   SMOKE_SCHEMA_PREFIX=         (production: hits real schemas; default for 54.5-03)
#   SMOKE_SCHEMA_PREFIX=_dryrun_ (dry-run: hits _dryrun_* schemas; for 54.5-02 rehearsal)
#   SMOKE_WRITE=0                (read-only smoke; skip INSERT-then-DELETE sentinels)
#   SMOKE_WRITE=1                (full smoke: read + write+delete sentinels)
#
# Pre-req: source /tmp/aurora-cutover.env must work (operator-only env file from Wave 1).
set -euo pipefail

source /tmp/aurora-cutover.env

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==========================================="
echo "Phase 54.5 Aurora Cutover Smoke Matrix"
echo "==========================================="
echo "Started:   $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "Mode:      SCHEMA_PREFIX='${SMOKE_SCHEMA_PREFIX:-<production>}'  SMOKE_WRITE=${SMOKE_WRITE:-0}"
echo "Cluster:   $WRITER"
echo "==========================================="
echo ""

bash "$SCRIPT_DIR/smoke-turion-demo.sh"
echo ""
bash "$SCRIPT_DIR/smoke-turion-satellite.sh"
echo ""
bash "$SCRIPT_DIR/smoke-zietra-crm.sh"
echo ""
bash "$SCRIPT_DIR/smoke-zietra-api.sh"
echo ""

echo "==========================================="
echo "ALL 4 LAMBDAS PASS"
echo "==========================================="
echo "Finished:  $(date -u +%Y-%m-%dT%H:%M:%SZ)"
