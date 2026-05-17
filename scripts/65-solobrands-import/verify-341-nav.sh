#!/usr/bin/env bash
# scripts/65-solobrands-import/verify-341-nav.sh
#
# Runs the 8 must_haves.truths assertions from Quick 341 over the dual
# post-deploy snapshots. Exits 0 iff all 8 pass.
#
# Assertions (against bodyText of every page in each snapshot):
#   Solo Brands:
#     1. NO page contains "Turion Satellite PLM"
#     2. ALL pages contain "ASC 606 Revenue Recognition"
#     3. NO page contains the 11-entry dashboard block
#        ("All dashboards\nExecutive cockpit\nCEO\nCFO\nCIO")
#     4. ALL pages contain the collapsed shape "Dashboards\nPitch"
#        (single Dashboards link immediately followed by Pitch bottom-nav)
#   Turion:
#     5. ALL pages contain "Turion Satellite PLM"
#     6. ALL pages contain "EVMS Watchdog"
#     7. NO page contains the 11-entry dashboard block
#     8. /dashboards landing page returns HTTP 200

set -uo pipefail

SB="/Users/jeet/doordash-p2p/.planning/quick/341-fix-navigation-bar-gate-turion-satellite/341-SOLOBRANDS-NAV-POST.json"
TR="/Users/jeet/doordash-p2p/.planning/quick/341-fix-navigation-bar-gate-turion-satellite/341-TURION-NAV-POST.json"

if [ ! -f "$SB" ]; then echo "FATAL: missing $SB" >&2; exit 2; fi
if [ ! -f "$TR" ]; then echo "FATAL: missing $TR" >&2; exit 2; fi

PASS=0
FAIL=0

check() {
  local NAME="$1"; local OUT="$2"; local EXPECTED_EMPTY="$3"
  if [ "$EXPECTED_EMPTY" = "empty" ]; then
    if [ -z "$OUT" ]; then
      echo "PASS  [$NAME]"
      PASS=$((PASS+1))
    else
      echo "FAIL  [$NAME] — non-empty output (first 5 keys):"
      echo "$OUT" | head -5 | sed 's/^/        /'
      FAIL=$((FAIL+1))
    fi
  else
    if [ -n "$OUT" ]; then
      echo "PASS  [$NAME]"
      PASS=$((PASS+1))
    else
      echo "FAIL  [$NAME] — expected non-empty output, got empty"
      FAIL=$((FAIL+1))
    fi
  fi
}

# Solo Brands assertions
OUT=$(jq -r '.pages | to_entries[] | select(.value.bodyText | contains("Turion Satellite PLM")) | .key' < "$SB")
check "SB-1 no Turion Satellite PLM" "$OUT" "empty"

OUT=$(jq -r '.pages | to_entries[] | select(.value.bodyText | contains("ASC 606 Revenue Recognition") | not) | .key' < "$SB")
check "SB-2 all pages contain ASC 606 Revenue Recognition" "$OUT" "empty"

OUT=$(jq -r '.pages | to_entries[] | select(.value.bodyText | test("All dashboards\\nExecutive cockpit\\nCEO\\nCFO\\nCIO")) | .key' < "$SB")
check "SB-3 no 11-entry dashboard block" "$OUT" "empty"

OUT=$(jq -r '.pages | to_entries[] | select(.value.bodyText | contains("Dashboards\nPitch") | not) | .key' < "$SB")
check "SB-4 all pages contain collapsed Dashboards->Pitch" "$OUT" "empty"

# Turion assertions
OUT=$(jq -r '.pages | to_entries[] | select(.value.bodyText | contains("Turion Satellite PLM") | not) | .key' < "$TR")
check "TR-5 all pages contain Turion Satellite PLM" "$OUT" "empty"

OUT=$(jq -r '.pages | to_entries[] | select(.value.bodyText | contains("EVMS Watchdog") | not) | .key' < "$TR")
check "TR-6 all pages contain EVMS Watchdog" "$OUT" "empty"

OUT=$(jq -r '.pages | to_entries[] | select(.value.bodyText | test("All dashboards\\nExecutive cockpit\\nCEO\\nCFO\\nCIO")) | .key' < "$TR")
check "TR-7 no 11-entry dashboard block" "$OUT" "empty"

# /dashboards landing live probe (Turion subdomain — Phase 62 page must still 200)
HTTP=$(curl -sI -o /dev/null -w "%{http_code}" https://turion.zietra.com/dashboards)
if [ "$HTTP" = "200" ]; then
  echo "PASS  [TR-8 /dashboards landing HTTP=$HTTP]"
  PASS=$((PASS+1))
else
  echo "FAIL  [TR-8 /dashboards landing HTTP=$HTTP, expected 200]"
  FAIL=$((FAIL+1))
fi

echo
echo "=== verify-341-nav.sh: $PASS PASS / $FAIL FAIL ==="
test "$FAIL" -eq 0
