# Dollar.ai Deployment Guide

## Infrastructure Summary

### Frontend (AWS CloudFront + S3)
- **S3 Bucket**: `dollar-ai-frontend`
- **CloudFront Distribution ID**: `E1TL8YTTU1SF3A`
- **CloudFront Domain**: `d3pus2gxlb5cer.cloudfront.net`

### Backend (AWS EC2)
- **Instance ID**: `i-07685c4bd6604b369`
- **Public IP**: `44.192.34.143`
- **Port**: 3000
- **Security Group**: `sg-01392ecadf8604171` (dollar-ai-backend)

---

## GoDaddy DNS Configuration

Log into GoDaddy and navigate to DNS Management for `dollar.ai` domain.

### Required DNS Records

#### 1. Root Domain (dollar.ai)
```
Type: A
Name: @
Value: 44.192.34.143 (or use forwarding to www.dollar.ai)
TTL: 1 Hour
```

#### 2. WWW Subdomain (www.dollar.ai)
```
Type: CNAME
Name: www
Value: d3pus2gxlb5cer.cloudfront.net
TTL: 1 Hour
```

#### 3. API Subdomain (api.dollar.ai)
```
Type: A
Name: api
Value: 44.192.34.143
TTL: 1 Hour
```

---

## SSL Certificate Setup

### For CloudFront (Frontend)
1. Go to AWS Certificate Manager (ACM) in us-east-1 region
2. Request a public certificate for:
   - `dollar.ai`
   - `www.dollar.ai`
3. Validate using DNS (add CNAME records GoDaddy)
4. Update CloudFront distribution:
   - Add alternate domain names: `dollar.ai`, `www.dollar.ai`
   - Select the ACM certificate

### For EC2 Backend (api.dollar.ai)
Option 1: Use Let's Encrypt with Certbot
```bash
sudo yum install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.dollar.ai
```

Option 2: Use AWS ALB with ACM certificate

---

## URLs After Configuration

| Service | URL |
|---------|-----|
| Frontend (CloudFront) | https://d3pus2gxlb5cer.cloudfront.net |
| Frontend (Custom) | https://dollar.ai |
| Backend API | http://44.192.34.143:3000 |
| Backend API (Custom) | https://api.dollar.ai |

---

## Deployment Commands

### Deploy Frontend
```bash
cd /Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/frontend
npm run build
aws s3 sync dist/ s3://dollar-ai-frontend/ --delete
aws cloudfront create-invalidation --distribution-id E1TL8YTTU1SF3A --paths "/*"
```

### Deploy Backend to EC2
```bash
# SSH into EC2
ssh -i ~/.ssh/workflowai-backend-key.pem ec2-user@44.192.34.143

# Or use rsync to copy files
rsync -avz --exclude 'venv' --exclude '__pycache__' \
  /Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend/ \
  ec2-user@44.192.34.143:/opt/eatfair-backend/
```

---

## CORS Configuration

Update `main_new.py` to allow dollar.ai origins:
```python
allow_origins=[
    "http://localhost:5173",
    "http://localhost:3000",
    "https://d3pus2gxlb5cer.cloudfront.net",
    "https://dollar.ai",
    "https://www.dollar.ai",
    "http://dollar.ai",
    "http://www.dollar.ai",
]
```

---

## Mobile App Configuration

Update iOS apps to use the new API endpoint:
- Customer App: `https://api.dollar.ai`
- Restaurant App: `https://api.dollar.ai`
- Delivery App: `https://api.dollar.ai`

---

## Monitoring

- CloudWatch for EC2 metrics
- CloudFront access logs in S3
- Application logs via PM2 or systemd

---

## Costs Estimate

| Service | Monthly Cost |
|---------|--------------|
| EC2 t3.small | ~$15/month |
| S3 Storage | ~$1/month |
| CloudFront | ~$5-10/month |
| Route 53 (if used) | ~$0.50/month |
| **Total** | **~$20-30/month** |
