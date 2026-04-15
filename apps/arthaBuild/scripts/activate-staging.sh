#!/bin/bash
# activate-staging.sh — run after placing origin.crt + origin.key in nginx/ssl/
# Usage: bash scripts/activate-staging.sh
set -e

EC2="ubuntu@44.194.34.223"
KEY="~/.ssh/techcloudpro-key-1764031372.pem"
REMOTE="/home/ubuntu/arthaBuild"

echo "=== Uploading CF origin cert ==="
scp -i $KEY nginx/ssl/origin.crt $EC2:$REMOTE/nginx/ssl/origin.crt
scp -i $KEY nginx/ssl/origin.key $EC2:$REMOTE/nginx/ssl/origin.key

echo "=== Uploading nginx.conf ==="
scp -i $KEY nginx/nginx.conf $EC2:$REMOTE/nginx/nginx.conf

echo "=== Adding staging.artha.build to ALLOWED_ORIGINS ==="
ssh -i $KEY $EC2 "
  cd $REMOTE
  # Add staging URL to ALLOWED_ORIGINS if not already there
  if ! grep -q 'staging.artha.build' .env; then
    sed -i 's|ALLOWED_ORIGINS=.*|&,https://staging.artha.build|' .env
    echo 'ALLOWED_ORIGINS updated'
  else
    echo 'ALLOWED_ORIGINS already includes staging'
  fi
"

echo "=== Reloading nginx container ==="
ssh -i $KEY $EC2 "
  cd $REMOTE
  # Recreate nginx only (no backend rebuild needed)
  docker compose up -d --no-deps --force-recreate nginx
  sleep 3
  docker ps | grep nginx
"

echo ""
echo "=== Done. Verify: ==="
echo "  curl -I https://staging.artha.build/"
echo "  curl -I https://artha.build/"
