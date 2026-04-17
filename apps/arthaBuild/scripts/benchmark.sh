#!/bin/bash
# ArthaBuild Performance Benchmark
# Measures response times against NFR-PERF-01 targets from REQUIREMENTS.md
#
# Usage:
#   ./scripts/benchmark.sh [BASE_URL] [TOKEN]
#
# Arguments:
#   BASE_URL  - Base URL of the deployment (default: http://localhost)
#   TOKEN     - JWT access token (required for AI chat benchmarks)
#
# NFR-PERF-01 Targets:
#   /health                         < 200ms
#   /api/auth/login                 < 500ms
#   /api/chatbot/process (cold)     < 30s
#   /api/chatbot/process (warm)     < 15s on g4dn.xlarge

set -euo pipefail

BASE_URL=${1:-http://localhost}
TOKEN=${2:-""}

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

check_target() {
  local label="$1"
  local time_s="$2"
  local target_s="$3"
  local time_ms
  local target_ms
  time_ms=$(echo "$time_s * 1000" | bc | cut -d. -f1)
  target_ms=$(echo "$target_s * 1000" | bc | cut -d. -f1)

  if [ "$time_ms" -le "$target_ms" ]; then
    echo -e "   ${GREEN}PASS${NC} ${time_ms}ms (target: <${target_ms}ms)"
    PASS_COUNT=$((PASS_COUNT+1))
  else
    echo -e "   ${RED}FAIL${NC} ${time_ms}ms (target: <${target_ms}ms — exceeded by $((time_ms - target_ms))ms)"
    FAIL_COUNT=$((FAIL_COUNT+1))
  fi
}

echo "============================================"
echo " ArthaBuild Performance Benchmark"
echo " Target: $BASE_URL"
echo " Date:   $(date)"
echo "============================================"
echo ""

# ── Check 1: Health endpoint ──────────────────────────────────────────────────
echo "1. GET /health  (NFR target: < 200ms)"
for i in 1 2 3; do
  T=$(curl -o /dev/null -s -w "%{time_total}" "${BASE_URL}/health" 2>/dev/null || echo "9999")
  printf "   Run %d: " "$i"
  check_target "/health run $i" "$T" "0.200"
done

echo ""

# ── Check 2: Login endpoint ───────────────────────────────────────────────────
echo "2. POST /api/auth/login  (NFR target: < 500ms)"
for i in 1 2 3; do
  T=$(curl -o /dev/null -s -w "%{time_total}" \
    -X POST "${BASE_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"perf@test.com","password":"PerfTest123!"}' \
    2>/dev/null || echo "9999")
  printf "   Run %d: " "$i"
  check_target "/api/auth/login run $i" "$T" "0.500"
done

echo ""

# ── Check 3 & 4: AI chat (requires token) ────────────────────────────────────
if [ -z "$TOKEN" ]; then
  echo "3. /api/chatbot/process — SKIPPED (no TOKEN provided)"
  echo "   To benchmark AI endpoints, pass a valid JWT as the second argument:"
  echo "   ./scripts/benchmark.sh ${BASE_URL} <your_jwt_token>"
  echo ""
  echo "   Obtain a token via:"
  echo "   TOKEN=\$(curl -s -X POST ${BASE_URL}/api/auth/login \\"
  echo "     -H 'Content-Type: application/json' \\"
  echo "     -d '{\"username\":\"you@example.com\",\"password\":\"YourPassword1!\"}' \\"
  echo "     | python3 -c \"import json,sys; print(json.load(sys.stdin)['access_token'])\")"
else
  echo "3. POST /api/chatbot/process — cold start  (NFR target: < 30s)"
  echo "   (First query loads the model into GPU VRAM — expected 10-25s on g4dn.xlarge)"
  T=$(curl -o /dev/null -s -w "%{time_total}" \
    -X POST "${BASE_URL}/api/chatbot/process" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"message":"What is SuiteScript 2.x and how does it differ from SuiteScript 1.0?"}' \
    2>/dev/null || echo "9999")
  printf "   Cold start: "
  check_target "cold start" "$T" "30.000"

  echo ""
  echo "4. POST /api/chatbot/process — warm query  (NFR target: < 15s on g4dn.xlarge)"
  T=$(curl -o /dev/null -s -w "%{time_total}" \
    -X POST "${BASE_URL}/api/chatbot/process" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"message":"How do I create a customer record using SuiteScript?"}' \
    2>/dev/null || echo "9999")
  printf "   Warm query: "
  check_target "warm query" "$T" "15.000"

  echo ""
  echo "5. POST /api/chatbot/process — second warm query"
  T=$(curl -o /dev/null -s -w "%{time_total}" \
    -X POST "${BASE_URL}/api/chatbot/process" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"message":"What are the best practices for error handling in SuiteScript?"}' \
    2>/dev/null || echo "9999")
  printf "   Second warm: "
  check_target "second warm" "$T" "15.000"
fi

echo ""
echo "============================================"
echo " Results: ${PASS_COUNT} passed · ${WARN_COUNT} warnings · ${FAIL_COUNT} failed"
echo "============================================"
echo ""
echo "Reference — NFR-PERF-01 targets:"
echo "  /health:                 < 200ms"
echo "  /api/auth/login:         < 500ms"
echo "  /api/chatbot (cold):     < 30s  (GPU model warm-up)"
echo "  /api/chatbot (warm):     < 15s  (on g4dn.xlarge with GPU)"
echo ""
echo "Note: AI response times depend on:"
echo "  - GPU availability (g4dn.xlarge = NVIDIA T4, 16GB VRAM)"
echo "  - Ollama model status (first query is cold — model loads into VRAM)"
echo "  - FAISS vectorstore (pre-built 203K chunks, < 1s lookup)"
echo "  - LangGraph RAG pipeline: retrieve → grade → [rewrite] → generate"
echo ""

if [ "$FAIL_COUNT" -gt 0 ]; then
  exit 1
fi
exit 0
