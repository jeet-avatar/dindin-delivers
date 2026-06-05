#!/usr/bin/env bash
# Extract XCTAttachment screenshots from a test .xcresult bundle and drop them
# into .planning/insurance/2026-06-05/<flow>/.
#
# Usage:
#   ./extract-screenshots.sh /path/to/Test.xcresult
#
# Filename convention from the screenshot helper:
#   customer__01_login        → .planning/insurance/2026-06-05/food-customer/01_login.png   etc
#   driver__01_driver_login   → .planning/insurance/2026-06-05/food-driver/01_driver_login.png
#   restaurant__03_orders_list → .planning/insurance/2026-06-05/food-restaurant/03_orders_list.png
set -euo pipefail

XCRESULT="${1:?usage: $0 path/to/Test.xcresult}"
OUT_BASE="$(cd "$(dirname "$0")" && pwd)"

if [[ ! -d "$XCRESULT" ]]; then
  echo "error: $XCRESULT not found"
  exit 1
fi

# Two flow buckets per app — food-customer / rideshare-rider for customer;
# food-driver / rideshare-driver for driver; food-restaurant for restaurant.
# Heuristic on the screenshot name:
#   contains "ride"  → rideshare-*
#   else             → food-* (the default)
route_to_folder() {
  local app="$1" name="$2"
  case "$app" in
    customer)
      if [[ "$name" =~ ride ]]; then echo "rideshare-rider"; else echo "food-customer"; fi
      ;;
    driver)
      if [[ "$name" =~ ride ]]; then echo "rideshare-driver"; else echo "food-driver"; fi
      ;;
    restaurant)
      echo "food-restaurant"
      ;;
    *) echo "raw-existing" ;;
  esac
}

# Try modern command (Xcode 16+); fall back to legacy if needed.
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Modern path: extract via test-results
if xcrun xcresulttool get test-results tests --path "$XCRESULT" --format json > "$TMP/tests.json" 2>/dev/null; then
  MODE="modern"
else
  xcrun xcresulttool get --legacy --path "$XCRESULT" --format json > "$TMP/results.json"
  MODE="legacy"
fi

count=0
case "$MODE" in
  modern)
    # The modern format includes attachment IDs nested under each test.
    # We use jq to walk the tree and emit one record per attachment.
    jq -c '
      .. | objects | select(.attachments?) |
      .attachments[]? |
      select(.name != null) |
      {name: .name, id: .uuid}
    ' "$TMP/tests.json" |
      while read -r record; do
        name="$(jq -r .name <<<"$record")"
        id="$(jq -r .id <<<"$record")"
        [[ -z "$name" || "$name" == "null" ]] && continue
        [[ -z "$id"   || "$id"   == "null" ]] && continue

        # Expect format: <app>__<num_label>
        app="${name%%__*}"
        rest="${name#*__}"
        [[ "$app" == "$name" ]] && continue  # no double-underscore — skip

        folder="$(route_to_folder "$app" "$rest")"
        mkdir -p "$OUT_BASE/$folder"
        out="$OUT_BASE/$folder/iostour_${rest}.png"
        if xcrun xcresulttool export object --legacy --path "$XCRESULT" --id "$id" --type file --output-path "$out" 2>/dev/null; then
          count=$((count + 1))
          echo "  ✓ $folder/$(basename "$out")"
        fi
      done
    ;;
  legacy)
    # Old format: walk activities recursively for ActivitySummary entries
    # whose attachments[*].filename ends with .png.
    jq -c '[.. | objects | select(.attachments?) | . as $a | $a.attachments[]? | {name: (.name // ($a.activityType // "shot")), id: (.payloadRef.id._value // .filename)}] | unique_by(.name)' "$TMP/results.json" > "$TMP/atts.json" || true
    jq -c '.[]' "$TMP/atts.json" 2>/dev/null | while read -r record; do
      name="$(jq -r .name <<<"$record")"
      id="$(jq -r .id <<<"$record")"
      [[ -z "$name" || "$name" == "null" ]] && continue
      [[ -z "$id"   || "$id"   == "null" ]] && continue

      app="${name%%__*}"
      rest="${name#*__}"
      [[ "$app" == "$name" ]] && continue
      folder="$(route_to_folder "$app" "$rest")"
      mkdir -p "$OUT_BASE/$folder"
      out="$OUT_BASE/$folder/iostour_${rest}.png"
      if xcrun xcresulttool get --legacy --path "$XCRESULT" --id "$id" > "$out" 2>/dev/null; then
        count=$((count + 1))
        echo "  ✓ $folder/$(basename "$out")"
      fi
    done
    ;;
esac

echo ""
echo "Extracted $count screenshots."
