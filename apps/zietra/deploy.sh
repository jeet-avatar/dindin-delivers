#!/bin/bash
set -euo pipefail

# Zietra marketing site deploy — S3 + CloudFront.
# Run from apps/zietra/ with AWS credentials for account 134607809447.

BUCKET="zietra-marketing"
DIST_ID="E1X82T89JWL8CA"
REGION="us-east-1"

echo "==> Building Zietra..."
npm run build

echo "==> Syncing hashed assets (1y immutable)..."
aws s3 sync dist/ "s3://${BUCKET}/" \
  --delete \
  --region "${REGION}" \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "*.html"

echo "==> Uploading index.html (no-cache)..."
aws s3 cp dist/index.html "s3://${BUCKET}/index.html" \
  --region "${REGION}" \
  --cache-control "public, max-age=0, must-revalidate"

echo "==> Invalidating CloudFront..."
aws cloudfront create-invalidation \
  --distribution-id "${DIST_ID}" \
  --paths "/" "/index.html" \
  --query 'Invalidation.Id' \
  --output text

echo "==> Deployed. → https://zietra.com (once cert validates) + https://dlzyv23o98bvo.cloudfront.net"
