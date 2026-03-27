# DB Password Rotation Runbook

## 1. Overview

### What Rotates

| Secret | Environment | Secret ID |
|--------|------------|-----------|
| Production DATABASE_URL | Production | `dollor/production/database-v2-gd1oKf` |
| Staging DATABASE_URL | Staging | `dollor/staging/database-url` |

**Schedule:** Every 30 days (automatic via Secrets Manager rotation schedule).

**Next rotation:** Check with `aws secretsmanager describe-secret --secret-id <secret-id> --query LastRotatedDate` and add 30 days.

### What Happens During Rotation

1. Secrets Manager invokes the rotation Lambda with 4 sequential steps:
   - **createSecret** -- generates a 32-char password, stores new DATABASE_URL as AWSPENDING
   - **setSecret** -- connects to RDS with current credentials, runs `ALTER USER dolloradmin WITH PASSWORD '<new>'`
   - **testSecret** -- connects with AWSPENDING credentials, runs `SELECT 1` to verify
   - **finishSecret** -- atomically promotes AWSPENDING to AWSCURRENT
2. EventBridge detects the `EndRotation` event and triggers the ECS redeployment Lambda.
3. ECS force-redeploys the appropriate service; new tasks pick up the rotated DATABASE_URL from AWSCURRENT.

**Zero-downtime:** ECS rolling update keeps old tasks alive until new tasks pass health checks.

### CRITICAL WARNING: Shared RDS User

**Staging and production share the same RDS instance and the same database user (`dolloradmin`) on host `dollor-db.c23qcukqe810.us-east-1.rds.amazonaws.com`.**

This means:

- **Rotating EITHER secret changes the RDS password for BOTH environments.** The `ALTER USER` in `setSecret` changes the password at the RDS level, which is shared.
- **After any rotation, you MUST immediately sync the other environment's secret** with the new password. Otherwise the other environment's ECS tasks will fail to connect on next redeploy.
- **Recommended future fix:** Create separate RDS users per environment (e.g., `dolloradmin_staging` and `dolloradmin_prod`) so rotations are fully independent.

**Immediate post-rotation steps (until separate users exist):**

```bash
# After staging rotation completes, get the new password:
STAGING_URL=$(aws secretsmanager get-secret-value \
  --secret-id "dollor/staging/database-url" \
  --region us-east-1 \
  --query SecretString --output text | python3 -c "import sys,json; print(json.load(sys.stdin)['DATABASE_URL'])")

# Extract just the password:
echo "$STAGING_URL" | python3 -c "import sys,re; m=re.match(r'postgresql://[^:]+:([^@]+)@', sys.stdin.read()); print(m.group(1))"

# Update the OTHER environment's secret with the same password:
# (Build the new URL with the extracted password and put it into the other secret)
aws secretsmanager put-secret-value \
  --secret-id "dollor/production/database-v2-gd1oKf" \
  --secret-string '{"DATABASE_URL": "postgresql://dolloradmin:<NEW_PASSWORD>@dollor-db.c23qcukqe810.us-east-1.rds.amazonaws.com:5432/dollor_production"}' \
  --region us-east-1

# Force redeploy the other environment's ECS service:
aws ecs update-service \
  --cluster dollor-production \
  --service dollor-api-service \
  --force-new-deployment \
  --region us-east-1
```

Repeat in the opposite direction if production rotates first.

## 2. Monitoring Checks

### Check Rotation Status

```bash
# Production
aws secretsmanager describe-secret \
  --secret-id dollor/production/database-v2-gd1oKf \
  --region us-east-1 \
  --query '{LastRotatedDate:LastRotatedDate,RotationEnabled:RotationEnabled,RotationRules:RotationRules}'

# Staging
aws secretsmanager describe-secret \
  --secret-id dollor/staging/database-url \
  --region us-east-1 \
  --query '{LastRotatedDate:LastRotatedDate,RotationEnabled:RotationEnabled,RotationRules:RotationRules}'
```

### Check Rotation Lambda Logs

```bash
# Production rotation Lambda
aws logs tail /aws/lambda/dollor-db-rotation --since 1h --region us-east-1

# Staging rotation Lambda
aws logs tail /aws/lambda/dollor-db-rotation-staging --since 1h --region us-east-1

# ECS redeployment Lambda
aws logs tail /aws/lambda/dollor-ecs-redeployment --since 1h --region us-east-1
```

### Check CloudWatch Alarm

```bash
aws cloudwatch describe-alarms \
  --alarm-names dollor-db-rotation-failure \
  --region us-east-1 \
  --query 'MetricAlarms[0].{State:StateValue,Threshold:Threshold}'
```

### Check ECS Service Health After Rotation

```bash
# Production
aws ecs describe-services \
  --cluster dollor-production \
  --services dollor-api-service \
  --region us-east-1 \
  --query 'services[0].deployments[*].{status:status,runningCount:runningCount,desiredCount:desiredCount,createdAt:createdAt}'

# Staging
aws ecs describe-services \
  --cluster dollor-production \
  --services dollor-api-staging-service \
  --region us-east-1 \
  --query 'services[0].deployments[*].{status:status,runningCount:runningCount,desiredCount:desiredCount,createdAt:createdAt}'
```

### Check API Health

```bash
# Production
curl -s https://api.dollor.ai/health | jq .

# Staging
curl -s https://d34u5ixl0bulv4.cloudfront.net/health | jq .
```

## 3. Responding to Alarm (dollor-db-rotation-failure)

The CloudWatch alarm `dollor-db-rotation-failure` fires when the `dollor-db-rotation` Lambda has >= 1 error in a 5-minute window.

### Step 1: Identify the Failed Step

```bash
aws logs tail /aws/lambda/dollor-db-rotation --since 30m --region us-east-1
```

Look for which step failed: `createSecret`, `setSecret`, `testSecret`, or `finishSecret`.

### Step 2: If setSecret Failed

- **Connection error:** Confirm Lambda VPC config matches RDS subnet. Check security group allows port 5432 from Lambda's security group.
- **Auth error:** The AWSCURRENT credentials may already have been changed (e.g., by staging rotation -- see shared user warning above). Get the actual RDS password from whichever secret last rotated.
- Rotation will auto-retry up to 3 times. Wait 10 minutes before manual intervention.
- **Library note:** The Lambda uses `pg8000` (pure Python), NOT `psycopg2`. No native Lambda layer is needed.

### Step 3: If finishSecret Failed

- Check if AWSPENDING version exists: `aws secretsmanager list-secret-version-ids --secret-id dollor/production/database-v2-gd1oKf --region us-east-1`
- If AWSPENDING exists and testSecret passed, manually promote:

```bash
aws secretsmanager update-secret-version-stage \
  --secret-id dollor/production/database-v2-gd1oKf \
  --version-stage AWSCURRENT \
  --move-to-version-id <AWSPENDING-version-id> \
  --remove-from-version-id <current-AWSCURRENT-version-id> \
  --region us-east-1
```

### Step 4: If ECS Redeployment Did Not Trigger

EventBridge auto-redeployment may not fire reliably in all cases. Manual ECS force-redeploy is the proven recovery path:

```bash
# Production
aws ecs update-service \
  --cluster dollor-production \
  --service dollor-api-service \
  --force-new-deployment \
  --region us-east-1

# Staging
aws ecs update-service \
  --cluster dollor-production \
  --service dollor-api-staging-service \
  --force-new-deployment \
  --region us-east-1
```

### Step 5: Confirm Health After Resolution

```bash
curl -s https://api.dollor.ai/health | jq .
curl -s https://d34u5ixl0bulv4.cloudfront.net/health | jq .
```

### Step 6: Sync the Other Environment (CRITICAL)

After any rotation completes (even after manual fix), sync the other environment's secret with the same password. See the "Shared RDS User" warning in Section 1.

## 4. Rollback Procedure

### Rotation Failed Before finishSecret

Old password is still in AWSCURRENT. No DB access is disrupted. No rollback needed. Fix the Lambda issue and re-trigger rotation.

### Rotation Completed But ECS Not Redeployed

Tasks still hold the old DATABASE_URL (now AWSPREVIOUS). RDS still accepts the old password temporarily. Manually trigger redeployment:

```bash
aws ecs update-service \
  --cluster dollor-production \
  --service dollor-api-service \
  --force-new-deployment \
  --region us-east-1
```

### Emergency Rollback (Restore Old Password)

**Use only if rotation completed but new password is broken (should not happen if testSecret passed).**

1. Get the AWSPREVIOUS version ID:

```bash
aws secretsmanager list-secret-version-ids \
  --secret-id dollor/production/database-v2-gd1oKf \
  --region us-east-1
```

2. Promote AWSPREVIOUS back to AWSCURRENT:

```bash
aws secretsmanager update-secret-version-stage \
  --secret-id dollor/production/database-v2-gd1oKf \
  --version-stage AWSCURRENT \
  --move-to-version-id <AWSPREVIOUS-version-id> \
  --remove-from-version-id <current-AWSCURRENT-version-id> \
  --region us-east-1
```

3. Reset the RDS password to match the restored secret:

```bash
# Get the restored password from the secret
aws secretsmanager get-secret-value \
  --secret-id dollor/production/database-v2-gd1oKf \
  --region us-east-1

# Connect to RDS and reset password (use psql or pg8000)
```

4. Force redeploy ECS.

### Disable Rotation Temporarily

```bash
aws secretsmanager cancel-rotate-secret \
  --secret-id dollor/production/database-v2-gd1oKf \
  --region us-east-1
```

To re-enable:

```bash
aws secretsmanager rotate-secret \
  --secret-id dollor/production/database-v2-gd1oKf \
  --rotation-lambda-arn arn:aws:lambda:us-east-1:134607809447:function:dollor-db-rotation \
  --rotation-rules '{"ScheduleExpression": "rate(30 days)"}' \
  --region us-east-1
```

## 5. Manual Rotation (On-Demand)

**Before triggering:** Read the "Shared RDS User" warning in Section 1. You will need to sync the other environment afterward.

```bash
# Production
aws secretsmanager rotate-secret \
  --secret-id "dollor/production/database-v2-gd1oKf" \
  --rotate-immediately \
  --region us-east-1

# Staging
aws secretsmanager rotate-secret \
  --secret-id "dollor/staging/database-url" \
  --rotate-immediately \
  --region us-east-1
```

Monitor progress:

```bash
aws logs tail /aws/lambda/dollor-db-rotation --since 5m --region us-east-1 --follow
```

After rotation completes, sync the other environment's secret and force-redeploy its ECS service.

## 6. Lambda Function Reference

| Resource | Name | Purpose |
|----------|------|---------|
| Rotation Lambda (prod) | `dollor-db-rotation` | 4-step password rotation for production secret |
| Rotation Lambda (staging) | `dollor-db-rotation-staging` | 4-step password rotation for staging secret |
| Redeployment Lambda | `dollor-ecs-redeployment` | Force-redeploys ECS after rotation completes |
| EventBridge (prod) | `dollor-db-rotation-prod-redeployment` | Triggers redeployment on production EndRotation |
| EventBridge (staging) | `dollor-db-rotation-staging-redeployment` | Triggers redeployment on staging EndRotation |
| CloudWatch Alarm | `dollor-db-rotation-failure` | Fires on >= 1 Lambda error in 5-min window |
| Log Group (rotation) | `/aws/lambda/dollor-db-rotation` | Production rotation Lambda logs |
| Log Group (staging) | `/aws/lambda/dollor-db-rotation-staging` | Staging rotation Lambda logs |
| Log Group (redeploy) | `/aws/lambda/dollor-ecs-redeployment` | Redeployment Lambda logs |

### Lambda Implementation Notes

- **Library:** `pg8000` (pure Python PostgreSQL driver). No native C extensions, no Lambda layer needed.
- **Password charset:** `ascii_letters + digits + !#$%&()*+,-.;<=>?[]^_{}|~` -- excludes `:/@"\` to prevent URL parsing failures.
- **Secret format:** `{"DATABASE_URL": "postgresql://dolloradmin:<password>@dollor-db.c23qcukqe810.us-east-1.rds.amazonaws.com:5432/<dbname>"}`
- **RDS host:** `dollor-db.c23qcukqe810.us-east-1.rds.amazonaws.com`
- **RDS user:** `dolloradmin` (shared across staging and production -- see Section 1 warning)

---

*Last updated: 2026-03-27*
*Created during: Phase 08 Plan 02 (DB Password Rotation - Production)*
