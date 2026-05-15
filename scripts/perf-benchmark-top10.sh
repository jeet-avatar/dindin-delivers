#!/usr/bin/env bash
# scripts/perf-benchmark-top10.sh — Phase 55-04 perf benchmark
#
# Runs `hey` (or `ab` as fallback) against the top-10 hottest API endpoints
# and captures p50/p99 latency + the RDS Proxy pinning metric (RESEARCH §G.3).
#
# The top-10 list was chosen by inspection of the route registry + which
# endpoints the frontends call most (per RESEARCH §L.1). These are the
# endpoints that, if any regress >10% under RLS, MUST get a composite
# (tenant_id, ...) index in 55-05 BEFORE rolling out RLS on their tables.
#
# Required env:
#   ZIETRA_TURION_JWT — valid Cognito ID token for the Turion tenant
#
# Output:
#   /tmp/55-04-perf/{endpoint}.hey.txt  — raw tool output per endpoint
#   /tmp/55-04-perf/pinning-metric.txt  — CloudWatch DatabaseConnectionsCurrentlySessionPinned max
#   /tmp/55-04-perf/summary.txt         — extracted p50/p99 per endpoint
#
# Usage:
#   ZIETRA_TURION_JWT="eyJ..." bash scripts/perf-benchmark-top10.sh
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
OUT="${OUT:-/tmp/55-04-perf}"
mkdir -p "$OUT"

# Detect benchmark tool — prefer hey, fall back to ab
if command -v hey >/dev/null 2>&1; then
  TOOL="hey"
elif command -v ab >/dev/null 2>&1; then
  TOOL="ab"
else
  echo "ERROR: neither 'hey' nor 'ab' found in PATH" >&2
  echo "Install: brew install hey  OR  brew install httpd" >&2
  exit 1
fi
echo "[perf-benchmark] Using tool: $TOOL"

# Validate JWT
JWT="${ZIETRA_TURION_JWT:?ZIETRA_TURION_JWT env var required — get a valid Turion Cognito ID token from the browser localStorage}"

# Top-10 endpoints (per RESEARCH §L.1)
# Format: "METHOD URL"
ENDPOINTS=(
  "GET https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/data/all"
  "GET https://rjydekliee.execute-api.us-east-1.amazonaws.com/api/satellites"
  "GET https://rjydekliee.execute-api.us-east-1.amazonaws.com/api/parts"
  "GET https://rjydekliee.execute-api.us-east-1.amazonaws.com/api/work-orders"
  "GET https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/salesforce/customers"
  "GET https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/mes/stages"
  "GET https://rjydekliee.execute-api.us-east-1.amazonaws.com/api/lookups/subsystems"
  "GET https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/tenants/current"
  "GET https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/arena/ncrs"
  "GET https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/activity"
)

START_TS=$(date -u +%s)
echo "[perf-benchmark] Started at $(date -u -r "$START_TS" +%Y-%m-%dT%H:%M:%SZ)"

# Clear summary
SUMMARY="$OUT/summary.txt"
: > "$SUMMARY"

for E in "${ENDPOINTS[@]}"; do
  METHOD=$(echo "$E" | awk '{print $1}')
  URL=$(echo "$E" | awk '{print $2}')
  SAFE_NAME=$(echo "$URL" | sed 's|.*://||; s|/|_|g; s|[?:&=]|_|g')
  OUT_FILE="$OUT/${SAFE_NAME}.${TOOL}.txt"

  echo ""
  echo "=== $METHOD $URL ==="

  if [[ "$TOOL" == "hey" ]]; then
    hey -n 1000 -c 50 -m "$METHOD" \
      -H "Authorization: Bearer $JWT" \
      -H "X-Tenant-Slug: turion" \
      "$URL" > "$OUT_FILE" 2>&1 || true
    P50=$(grep -E "^  50%" "$OUT_FILE" | head -1 | awk '{print $2}')
    P99=$(grep -E "^  99%" "$OUT_FILE" | head -1 | awk '{print $2}')
    RPS=$(grep -E "Requests/sec" "$OUT_FILE" | awk '{print $2}')
  else
    # ab outputs: 50%, 99%, etc.
    # Note: ab doesn't accept custom HTTP method in same flag style as hey for GET
    ab -n 1000 -c 50 \
      -H "Authorization: Bearer $JWT" \
      -H "X-Tenant-Slug: turion" \
      "$URL" > "$OUT_FILE" 2>&1 || true
    # ab "Percentage of the requests served within a certain time (ms)"
    P50=$(grep -E "^  50%" "$OUT_FILE" | head -1 | awk '{print $2}')"ms"
    P99=$(grep -E "^  99%" "$OUT_FILE" | head -1 | awk '{print $2}')"ms"
    RPS=$(grep -E "Requests per second:" "$OUT_FILE" | awk '{print $4}')
  fi
  echo "p50=$P50  p99=$P99  rps=$RPS"
  printf "%-80s  p50=%-8s  p99=%-8s  rps=%s\n" "$METHOD $URL" "$P50" "$P99" "$RPS" >> "$SUMMARY"
done

END_TS=$(date -u +%s)
DURATION=$((END_TS - START_TS))
echo ""
echo "[perf-benchmark] Completed at $(date -u -r "$END_TS" +%Y-%m-%dT%H:%M:%SZ) (${DURATION}s)"

# === Pinning metric — CloudWatch ===
START_ISO=$(date -u -r "$START_TS" +%Y-%m-%dT%H:%M:%SZ)
END_ISO=$(date -u -r "$END_TS" +%Y-%m-%dT%H:%M:%SZ)
PINNING_FILE="$OUT/pinning-metric.txt"
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnectionsCurrentlySessionPinned \
  --dimensions Name=ProxyName,Value=zietra-aurora-proxy \
  --start-time "$START_ISO" \
  --end-time "$END_ISO" \
  --period 60 \
  --statistics Maximum \
  --region "$REGION" \
  --query 'Datapoints[].Maximum' \
  --output text > "$PINNING_FILE" 2>&1 || echo "(metric query failed)" > "$PINNING_FILE"

MAX_PIN=$(tr '\t' '\n' < "$PINNING_FILE" | grep -E "^[0-9.]+$" | sort -rn | head -1)
echo ""
echo "[perf-benchmark] Pinning metric (Max over run): ${MAX_PIN:-0}"
echo "[perf-benchmark] Outputs in: $OUT"
echo "[perf-benchmark] Summary: $SUMMARY"
