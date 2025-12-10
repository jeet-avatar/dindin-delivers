# EatFair App Runner Deployment Guide

## Quick Deploy (10 minutes)

### Step 1: Push to GitHub (if not already)
```bash
cd /Users/jeet/StudioProjects/eatfair-ios/dindin/backend
git add .
git commit -m "Add App Runner configuration"
git push origin main
```

### Step 2: Create App Runner Service via AWS Console

1. Go to AWS Console > App Runner
2. Click "Create service"
3. Configure:
   - **Source**: GitHub repository
   - **Repository**: your-repo/dindin/backend
   - **Branch**: main
   - **Build settings**: Use `apprunner.yaml`

4. Service settings:
   - **Service name**: eatfair-api
   - **CPU**: 1 vCPU
   - **Memory**: 2 GB
   - **Auto-scaling**:
     - Min instances: 1
     - Max instances: 25
     - Max concurrency: 100

5. Environment variables:
   ```
   ENVIRONMENT=production
   DATABASE_URL=postgresql://...
   JWT_SECRET_KEY=your-secret
   AWS_REGION=us-east-1
   ```

6. Click "Create & Deploy"

### Step 3: Update iOS App Base URL

After deployment, you'll get a URL like:
`https://abc123xyz.us-east-1.awsapprunner.com`

Update the iOS app:
```swift
// AppConfig.swift
static let p2pBaseURL = "https://abc123xyz.us-east-1.awsapprunner.com"
```

---

## CLI Deployment (Alternative)

```bash
# Install AWS CLI if needed
brew install awscli

# Configure AWS
aws configure

# Create App Runner service
aws apprunner create-service \
  --service-name eatfair-api \
  --source-configuration '{
    "CodeRepository": {
      "RepositoryUrl": "https://github.com/YOUR_REPO",
      "SourceCodeVersion": {
        "Type": "BRANCH",
        "Value": "main"
      },
      "CodeConfiguration": {
        "ConfigurationSource": "REPOSITORY"
      }
    },
    "AutoDeploymentsEnabled": true
  }' \
  --instance-configuration '{
    "Cpu": "1024",
    "Memory": "2048"
  }' \
  --auto-scaling-configuration-arn "arn:aws:apprunner:us-east-1:YOUR_ACCOUNT:autoscalingconfiguration/default"
```

---

## Scaling Configuration

### Default Auto-Scaling (Recommended for Launch)
```json
{
  "MinSize": 1,
  "MaxSize": 25,
  "MaxConcurrency": 100
}
```

### High-Traffic Auto-Scaling (Post 10K users)
```json
{
  "MinSize": 3,
  "MaxSize": 100,
  "MaxConcurrency": 200
}
```

---

## Cost Breakdown

| Traffic | Instances | Monthly Cost |
|---------|-----------|--------------|
| 0-1K users | 1 | ~$25 |
| 1K-10K users | 1-3 | ~$50-75 |
| 10K-100K users | 3-10 | ~$150-250 |
| 100K-1M users | 10-25 | ~$500-1,000 |

**Key advantage**: If no traffic, minimum cost. If traffic spikes, auto-scales.

---

## Health Check Endpoint

App Runner uses `/health` by default. The backend already has this:
```
GET https://your-app.awsapprunner.com/health
```

---

## Monitoring

1. **CloudWatch Metrics** (automatic):
   - Request count
   - Latency (P50, P95, P99)
   - Active instances
   - CPU/Memory utilization

2. **CloudWatch Logs** (automatic):
   - All stdout/stderr captured
   - Searchable and filterable

---

## Rollback

If something goes wrong:
```bash
# List deployments
aws apprunner list-operations --service-arn YOUR_SERVICE_ARN

# Rollback to previous version (automatic on failure)
# App Runner auto-rolls back if health check fails
```

---

## Migration Path from EC2

### Phase 1: Keep Both Running (1 week)
- EC2: Production traffic
- App Runner: Testing

### Phase 2: Gradual Migration
- Update iOS app to point to App Runner
- Monitor for 24-48 hours

### Phase 3: Shutdown EC2
```bash
# Once App Runner is stable
aws ec2 terminate-instances --instance-ids i-xxx
```

---

## Summary

| Feature | EC2 (Current) | App Runner |
|---------|--------------|------------|
| Scaling | Manual | Automatic |
| Cost at 0 traffic | $50/mo | ~$5/mo |
| Deploy time | 5-10 min | 3-5 min |
| Rollback | Manual | Automatic |
| SSL/HTTPS | Manual | Automatic |
| Load balancing | None | Built-in |
| Monitoring | Manual | Built-in |

**Recommendation**: Deploy to App Runner after App Store approval. Keep EC2 as backup for 1 week, then terminate.
