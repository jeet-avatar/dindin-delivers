#!/bin/bash

# Deploy P2P EatFair Platform to STAGING
# Frontend: AWS S3 + CloudFront (staging bucket)
# Backend: Already running on AWS EKS ELB

set -e

echo "========================================"
echo "Deploying EatFair P2P to STAGING"
echo "========================================"

# Configuration
S3_BUCKET="dollar-ai-frontend"  # CloudFront origin bucket
CLOUDFRONT_DIST_ID="E1TL8YTTU1SF3A"  # Can use same or create separate staging distribution
CLOUDFRONT_DOMAIN="d3pus2gxlb5cer.cloudfront.net"
FRONTEND_DIR="/Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/frontend"

# Backend is already running at:
STAGING_API="http://a25a4d0c5877a4a5898ab0352303effe-578011169.us-east-1.elb.amazonaws.com:8080"

echo ""
echo "=== Staging Environment ==="
echo "Frontend will be deployed to: https://${CLOUDFRONT_DOMAIN}"
echo "Backend API: ${STAGING_API}"
echo ""

# Navigate to frontend
cd $FRONTEND_DIR

# Use staging environment
echo "=== Setting up staging environment ==="
cp .env.staging .env

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "=== Installing dependencies ==="
    npm install
fi

# Build for staging
echo ""
echo "=== Building Frontend for Staging ==="
npm run build

# Check if S3 bucket exists, create if not
echo ""
echo "=== Checking S3 Bucket ==="
if ! aws s3 ls "s3://${S3_BUCKET}" 2>&1 | grep -q 'NoSuchBucket'; then
    echo "Bucket ${S3_BUCKET} exists"
else
    echo "Creating bucket ${S3_BUCKET}..."
    aws s3 mb "s3://${S3_BUCKET}" --region us-east-1

    # Enable static website hosting
    aws s3 website "s3://${S3_BUCKET}/" --index-document index.html --error-document index.html
fi

# Deploy to S3
echo ""
echo "=== Deploying to S3 ==="
aws s3 sync dist/ s3://${S3_BUCKET}/ --delete

# Invalidate CloudFront cache
echo ""
echo "=== Invalidating CloudFront Cache ==="
aws cloudfront create-invalidation --distribution-id ${CLOUDFRONT_DIST_ID} --paths "/*"

echo ""
echo "========================================"
echo "STAGING Deployment Complete!"
echo "========================================"
echo ""
echo "🌐 Frontend URL: https://${CLOUDFRONT_DOMAIN}"
echo "🔌 Backend API:  ${STAGING_API}"
echo ""
echo "Test Credentials:"
echo "  Email: admin@invoice.com"
echo "  Password: admin123"
echo ""
