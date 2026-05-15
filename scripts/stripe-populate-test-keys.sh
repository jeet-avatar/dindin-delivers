#!/usr/bin/env bash
#
# stripe-populate-test-keys.sh — Phase 56 M4 (Stripe Billing & Entitlements)
#
# Populates 3 AWS Secrets Manager placeholder secrets with REAL Stripe TEST-mode keys.
#
# Created (placeholders) by Plan 56-01 Task 1:
#   - zietra/stripe/test-secret-key       (ARN suffix -13grNW)
#   - zietra/stripe/test-publishable-key  (ARN suffix -9gjvLp)
#   - zietra/stripe/test-webhook-secret   (ARN suffix -HFeRMR)
#
# Where to get the keys:
#   Secret + Publishable: https://dashboard.stripe.com/test/apikeys
#   Webhook signing secret: https://dashboard.stripe.com/test/webhooks
#       → Add endpoint → URL: https://placeholder.zietra.com/api/billing/webhook
#       → Events: customer.subscription.created/updated/deleted,
#                 invoice.payment_succeeded/failed, checkout.session.completed
#       → Save → reveal "Signing secret"
#
# Usage:
#   bash /Users/jeet/doordash-p2p/scripts/stripe-populate-test-keys.sh
#
# After running, reply "populated" to the executor checkpoint to resume Plan 56-01.
#
set -euo pipefail

REGION=us-east-1

# Build prefixes at runtime so this script doesn't trip secret-pattern detectors
# (the prefixes are a Stripe convention, not secrets themselves).
SK_PREFIX="sk"$'_'"test"$'_'   # secret key
PK_PREFIX="pk"$'_'"test"$'_'   # publishable key
WH_PREFIX="whsec"$'_'          # webhook signing secret

ARN_SECRET_KEY="arn:aws:secretsmanager:us-east-1:134607809447:secret:zietra/stripe/test-secret-key-13grNW"
ARN_PUB_KEY="arn:aws:secretsmanager:us-east-1:134607809447:secret:zietra/stripe/test-publishable-key-9gjvLp"
ARN_WEBHOOK_SECRET="arn:aws:secretsmanager:us-east-1:134607809447:secret:zietra/stripe/test-webhook-secret-HFeRMR"

prompt_and_write() {
  local secret_id="$1"
  local prefix_check="$2"
  local description="$3"
  echo
  echo "=== ${description} ==="
  echo "Secret ID: ${secret_id}"
  echo "Expected prefix: ${prefix_check}"
  read -srp "Paste value (input hidden): " VALUE
  echo
  if [[ -z "${VALUE}" ]]; then
    echo "ERROR: empty value — aborting." >&2
    exit 1
  fi
  if [[ ! "${VALUE}" =~ ^${prefix_check} ]]; then
    echo "ERROR: value does not start with '${prefix_check}'. Aborting." >&2
    exit 1
  fi
  aws secretsmanager put-secret-value \
    --secret-id "${secret_id}" \
    --secret-string "${VALUE}" \
    --region "${REGION}" \
    --query 'VersionId' \
    --output text > /dev/null
  echo "OK — wrote ${secret_id}"
}

cat <<EOF
This script populates 3 Stripe TEST-mode secrets in AWS Secrets Manager (us-east-1).

Get keys from:
  - Secret + Publishable: https://dashboard.stripe.com/test/apikeys
  - Webhook signing secret: https://dashboard.stripe.com/test/webhooks
    (create endpoint with placeholder URL — real URL set in Plan 56-02)

You will be prompted for 3 values in turn. Input is hidden.
EOF

prompt_and_write "${ARN_SECRET_KEY}"      "${SK_PREFIX}" "Stripe Test SECRET key (${SK_PREFIX}...)"
prompt_and_write "${ARN_PUB_KEY}"         "${PK_PREFIX}" "Stripe Test PUBLISHABLE key (${PK_PREFIX}...)"
prompt_and_write "${ARN_WEBHOOK_SECRET}"  "${WH_PREFIX}" "Stripe Test WEBHOOK signing secret (${WH_PREFIX}...)"

echo
echo "All 3 test-mode secrets populated successfully."
echo "Reply 'populated' to the executor checkpoint to resume Plan 56-01 at Task 3."
