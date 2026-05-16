#!/usr/bin/env bash
# scripts/65-solobrands-import/run-sql.sh
#
# Executes a .sql file (one statement per line, terminated with `;`)
# against the zietra-rls-runner-55-05 Lambda. Each statement is sent in its
# own invocation — fewer surprises around runner-Lambda SQL parsing.
#
# Usage:   ./run-sql.sh <path/to/file.sql>
# Exits 1 if any statement returns ok:false.

set -uo pipefail

SQL_FILE="${1:-}"
if [ -z "$SQL_FILE" ] || [ ! -f "$SQL_FILE" ]; then
  echo "Usage: $0 <path/to/file.sql>" >&2
  exit 2
fi

LRUN_FN="zietra-rls-runner-55-05"
REGION="us-east-1"
RPASS='S/UipAK3Gf5+eahfD+wJpWiPDFsbw7H7'
AWS="/opt/homebrew/bin/aws"

TOTAL=0
OK=0
FAIL=0
PAYLOAD_FILE=$(mktemp -t solobrands-runsql.XXXXXX)
OUT_FILE=$(mktemp -t solobrands-runsql-out.XXXXXX)
trap 'rm -f "$PAYLOAD_FILE" "$OUT_FILE"' EXIT

# Runner Lambda invocations don't share session state, so RLS-protected
# statements need the SET app.tenant_id prepended to every payload.
# We track the last SET we saw and prefix it to subsequent statements.
SESSION_SET=""

# Read the whole file, split on `;` line endings (one stmt per line).
# Statements that contain literal `;` inside quotes would break this, but
# build-import-sql.py emits one stmt per line and never embeds `;` in literals.
while IFS= read -r line; do
  # strip trailing semicolon + whitespace
  stmt="${line%;}"
  stmt="${stmt%"${stmt##*[![:space:]]}"}"
  [ -z "$stmt" ] && continue

  # If this is itself a SET app.tenant_id=..., capture it for replay on
  # subsequent statements and skip the no-op invocation.
  if [[ "$stmt" =~ ^SET[[:space:]]+app\.tenant_id ]]; then
    SESSION_SET="$stmt"
    continue
  fi

  TOTAL=$((TOTAL+1))

  if [ -n "$SESSION_SET" ]; then
    payload_sql="$SESSION_SET; $stmt"
  else
    payload_sql="$stmt"
  fi

  python3 -c "
import json, sys
print(json.dumps({'sql': sys.argv[1], 'password': sys.argv[2], 'user': 'zietra_app'}))
" "$payload_sql" "$RPASS" > "$PAYLOAD_FILE"

  $AWS lambda invoke \
    --function-name "$LRUN_FN" \
    --region "$REGION" \
    --payload "fileb://$PAYLOAD_FILE" \
    --cli-binary-format raw-in-base64-out \
    "$OUT_FILE" >/dev/null 2>&1
  rc=$?
  if [ $rc -ne 0 ]; then
    echo "  [stmt $TOTAL] LAMBDA invoke failed (rc=$rc)" >&2
    FAIL=$((FAIL+1))
    continue
  fi

  status=$(python3 -c "
import json, sys
d = json.load(open(sys.argv[1]))
print('ok' if d.get('ok') else 'FAIL:'+str(d.get('error','?'))[:200])
" "$OUT_FILE")

  if [ "$status" = "ok" ]; then
    OK=$((OK+1))
    # Print SELECT row outputs (count summaries, etc)
    summary=$(python3 -c "
import json, sys
d = json.load(open(sys.argv[1]))
r = d.get('result')
rs = []
if isinstance(r, list):
    for step in r:
        if step.get('command') == 'SELECT' and step.get('rows'):
            rs.extend(step['rows'])
elif isinstance(r, dict):
    if r.get('command') == 'SELECT' and r.get('rows'):
        rs.extend(r['rows'])
if rs:
    print(' | '.join(json.dumps(row) for row in rs))
" "$OUT_FILE")
    if [ -n "$summary" ]; then
      echo "  [stmt $TOTAL] OK: $summary"
    fi
  else
    echo "  [stmt $TOTAL] $status" >&2
    echo "      SQL: ${stmt:0:200}" >&2
    FAIL=$((FAIL+1))
  fi
done < "$SQL_FILE"

echo
echo "=== Total: $TOTAL · OK: $OK · FAIL: $FAIL ==="
test "$FAIL" -eq 0
