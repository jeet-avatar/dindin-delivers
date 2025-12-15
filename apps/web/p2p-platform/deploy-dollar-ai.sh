#!/bin/bash

# Deploy P2P EatFair Platform to dollar.ai
# Frontend: AWS S3 + CloudFront
# Backend: AWS EC2

set -e

echo "========================================"
echo "Deploying EatFair P2P to dollar.ai"
echo "========================================"

# Configuration
S3_BUCKET="dollar-ai-frontend"
CLOUDFRONT_DIST_ID="E1TL8YTTU1SF3A"
CLOUDFRONT_DOMAIN="d3pus2gxlb5cer.cloudfront.net"
FRONTEND_DIR="/Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/frontend"
BACKEND_DIR="/Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend"

# Deploy Frontend
echo ""
echo "=== Building Frontend ==="
cd $FRONTEND_DIR
npm run build

echo ""
echo "=== Deploying to S3 ==="
aws s3 sync dist/ s3://${S3_BUCKET}/ --delete

echo ""
echo "=== Invalidating CloudFront Cache ==="
aws cloudfront create-invalidation --distribution-id ${CLOUDFRONT_DIST_ID} --paths "/*"

echo ""
echo "========================================"
echo "Deployment Complete!"
echo "========================================"
echo ""
echo "Frontend URL: https://${CLOUDFRONT_DOMAIN}"
echo ""
echo "Next Steps:"
echo "1. Configure GoDaddy DNS to point dollar.ai to CloudFront"
echo "2. Add SSL certificate for dollar.ai domain"
echo "3. Deploy backend to EC2"
echo ""
