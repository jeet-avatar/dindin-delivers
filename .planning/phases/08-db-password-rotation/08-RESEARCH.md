# Phase 08: DB Password Rotation - Research

**Researched:** 2026-03-26
**Domain:** AWS Secrets Manager automatic rotation, RDS PostgreSQL, ECS Fargate credential refresh
**Confidence:** HIGH (verified against live AWS resources + official AWS documentation)

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DBROT-01 | AWS Secrets Manager rotation Lambda enabled for RDS PostgreSQL (30-day cycle) | Covered: single-user rotation strategy using AWS managed Lambda via console/CLI; `rate(30 days)` schedule expression |
| DBROT-02 | ECS force-redeployment triggered after each rotation to refresh credentials | Covered: EventBridge rule on `AWS API Call via CloudTrail` / RotateSecret event → Lambda → `ecs:UpdateService(forceNewDeployment=True)` |
| DBROT-03 | Full rotation cycle validated on staging environment before production | Covered: staging secret `dollor/staging/database-url` exists; manual rotation test via `rotate-secret --rotate-immediately` |
| DBROT-04 | Production rotation enabled after staging validation passes | Covered: same steps applied to `dollor/production/database-v2-gd1oKf` after DBROT-03 passes |
| DBROT-05 | Rotation runbook documented with monitoring and rollback procedures | Covered: runbook sections and CloudWatch alarm patterns for rotation monitoring |
</phase_requirements>

---

## Summary

Phase 08 adds automatic 30-day password rotation for the production RDS PostgreSQL database. The
current production secret (`dollor/production/database-v2-gd1oKf`) has no rotation enabled—the
`RotationEnabled` field is absent from the secret metadata. The staging equivalent
(`dollor/staging/database-url`) is also unrotated.

**Critical architectural finding:** The ECS task definition reads `DATABASE_URL` as a single
connection string from the secret (`valueFrom: ...database-v2-gd1oKf:DATABASE_URL::`). AWS's
built-in rotation Lambdas expect the secret to contain separate `username`, `password`, `host`,
`engine`, `dbname` fields—not a `DATABASE_URL` key. This mismatch means the rotation approach
must either: (a) use a custom rotation Lambda that reconstructs the `DATABASE_URL` after rotating
the password, or (b) restructure the secret to use the AWS standard schema and update the ECS
task definition to construct the URL at container start. Option (a) is the minimum-change path.

ECS containers do NOT automatically pick up rotated secrets. A separate mechanism is required:
an EventBridge rule detecting the RotateSecret completion event triggers a Lambda that calls
`ecs:UpdateService(forceNewDeployment=True)` for both `dollor-api-service` and
`dollor-api-staging-service`.

**Primary recommendation:** Implement a custom rotation Lambda (Python, ~60 lines) that: (1) changes
the RDS password, (2) reconstructs the `DATABASE_URL` string in the secret, and (3) triggers an
ECS force-redeployment via `update_service`. This keeps the ECS task definition unchanged and
avoids the `DATABASE_URL` schema mismatch.

---

## Live Infrastructure Findings (VERIFIED)

### Secrets (confirmed via `aws secretsmanager list-secrets`)

| Secret Name | ARN Suffix | Rotation | Used By |
|-------------|-----------|---------|---------|
| `dollor/production/database-v2` | `-gd1oKf` | **NONE** | `dollor-api-service` (ECS), notification-service |
| `dollor/staging/database-url` | `-QrJCDo` | **NONE** | `dollor-api-staging-service` (ECS) |
| `dollor/staging/rds/master-password` | `-ut7g3C` | **NONE** | Terraform-managed RDS master password |

### ECS Task Definition (confirmed from `infrastructure/ecs/task-definition.json`)

The production container injects `DATABASE_URL` as:
```json
{
  "name": "DATABASE_URL",
  "valueFrom": "arn:aws:secretsmanager:us-east-1:134607809447:secret:dollor/production/database-v2-gd1oKf:DATABASE_URL::"
}
```

The `:DATABASE_URL::` suffix means ECS extracts the `DATABASE_URL` key from a JSON secret. This
confirms the secret is stored as `{"DATABASE_URL": "postgresql://..."}`, NOT the AWS standard
rotation format (`{"username":..., "password":..., "host":...}`).

### ECS Services

| Service | Cluster | Task Definition |
|---------|---------|----------------|
| `dollor-api-service` (production) | `dollor-production` | `dollor-api:370` |
| `dollor-api-staging-service` (staging) | `dollor-production` | `dollor-api-staging:29` |

### Staging Secret Mismatch

Staging uses a completely separate secret (`dollor/staging/database-url`) with a different ARN
than the production secret. The staging ECS task definition is managed live (downloaded at deploy
time from the ECS API by the staging CI workflow), so its exact `valueFrom` must be confirmed
when implementing.

---

## Standard Stack

### Core
| Component | Version/Type | Purpose | Why Standard |
|-----------|-------------|---------|--------------|
| AWS Secrets Manager | Managed service | Secret storage, rotation trigger | Already in use; contains the DB credentials |
| AWS Lambda (Python 3.12) | Managed runtime | Custom rotation function | Required for custom secret schema; AWS-managed option doesn't support `DATABASE_URL` format |
| AWS EventBridge | Managed service | Route rotation events → ECS redeployment trigger | Native event routing; no polling required |
| `boto3` | AWS SDK (bundled in Lambda) | ECS `update_service` call | Standard Python AWS SDK |
| AWS CloudWatch Logs | Managed service | Lambda execution logs | Auto-configured by Lambda |
| CloudWatch Alarms | Managed service | Monitor rotation failures | Standard ops pattern |

### Supporting
| Component | Purpose | When to Use |
|-----------|---------|-------------|
| `psycopg2-binary` Lambda Layer | Connect to RDS from rotation Lambda | Required for rotation Lambda to execute `ALTER USER SET PASSWORD` |
| AWS CloudTrail | Capture `RotateSecret` completion events for EventBridge | Only needed if using EventBridge on management events |

---

## Architecture Patterns

### Recommended Design: Custom Rotation Lambda + EventBridge Redeployment

```
AWS Secrets Manager (30-day schedule)
    → triggers Rotation Lambda (Python)
        → connects to RDS via psycopg2
        → ALTER USER dollor_admin PASSWORD 'new_password'
        → updates secret: {"DATABASE_URL": "postgresql://dollor_admin:new_password@host/db"}
        → marks secret version AWSCURRENT
    → emits RotateSecret CloudTrail event
    → EventBridge Rule matches event
        → triggers Redeployment Lambda
            → ecs.update_service(cluster='dollor-production',
                                  service='dollor-api-service',
                                  forceNewDeployment=True)
            → ecs.update_service(cluster='dollor-production',
                                  service='dollor-api-staging-service',
                                  forceNewDeployment=True)
```

### Rotation Lambda: 4-Step AWS Protocol

AWS Secrets Manager calls the rotation Lambda with `step` parameter. The Lambda MUST handle all 4 steps:

```python
# Source: https://github.com/aws-samples/aws-secrets-manager-rotation-lambdas
def lambda_handler(event, context):
    secret_id = event['SecretId']
    step = event['Step']
    client = boto3.client('secretsmanager')

    if step == 'createSecret':
        # Generate new password, store as AWSPENDING version
        create_secret(client, secret_id)
    elif step == 'setSecret':
        # Apply new password to the database
        set_secret(client, secret_id)
    elif step == 'testSecret':
        # Verify AWSPENDING credentials work
        test_secret(client, secret_id)
    elif step == 'finishSecret':
        # Promote AWSPENDING → AWSCURRENT
        finish_secret(client, secret_id)
```

### Pattern 1: createSecret Step
```python
def create_secret(client, secret_id):
    # Get current secret value
    current = json.loads(
        client.get_secret_value(SecretId=secret_id, VersionStage='AWSCURRENT')['SecretString']
    )
    # Parse the DATABASE_URL to extract components
    # Format: postgresql://user:pass@host:port/db
    import re
    match = re.match(r'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)', current['DATABASE_URL'])
    username, _, host, port, dbname = match.groups()

    # Generate new password (exclude PostgreSQL-unsafe chars)
    import secrets, string
    safe_chars = string.ascii_letters + string.digits + "!#$%&()*+,-.;<=>?[]^_{}|~"
    new_password = ''.join(secrets.choice(safe_chars) for _ in range(32))

    new_url = f"postgresql://{username}:{new_password}@{host}:{port}/{dbname}"
    client.put_secret_value(
        SecretId=secret_id,
        ClientRequestToken=event['ClientRequestToken'],  # version token
        SecretString=json.dumps({'DATABASE_URL': new_url}),
        VersionStages=['AWSPENDING']
    )
```

### Pattern 2: Redeployment Lambda (EventBridge Trigger)
```python
import boto3

def lambda_handler(event, context):
    ecs = boto3.client('ecs', region_name='us-east-1')

    # Trigger force redeployment for all services using this secret
    services = [
        ('dollor-production', 'dollor-api-service'),
        ('dollor-production', 'dollor-api-staging-service'),
    ]
    for cluster, service in services:
        ecs.update_service(
            cluster=cluster,
            service=service,
            forceNewDeployment=True
        )
        print(f"Triggered redeployment: {cluster}/{service}")
```

### Pattern 3: EventBridge Rule
Target the `finishSecret` step completion (the only step that changes `AWSCURRENT`):

```json
{
  "source": ["aws.secretsmanager"],
  "detail-type": ["AWS API Call via CloudTrail"],
  "detail": {
    "eventSource": ["secretsmanager.amazonaws.com"],
    "eventName": ["RotateSecret"],
    "requestParameters": {
      "secretId": ["arn:aws:secretsmanager:us-east-1:134607809447:secret:dollor/production/database-v2-gd1oKf"]
    }
  }
}
```

**Alternative (simpler, no CloudTrail required):**
```json
{
  "source": ["aws.secretsmanager"],
  "detail-type": ["Secrets Manager Secret Rotation Notification"],
  "detail": {
    "eventName": ["EndRotation"],
    "secretId": ["dollor/production/database-v2"]
  }
}
```

### Recommended Project Structure (new files only)

```
infrastructure/
├── lambda/
│   ├── db-rotation/
│   │   ├── rotation_function.py    # 4-step rotation Lambda
│   │   └── requirements.txt        # psycopg2-binary
│   └── ecs-redeployment/
│       └── redeployment_function.py  # EventBridge → ECS update_service
└── ecs/
    └── task-definition.json        # NO CHANGES NEEDED (DATABASE_URL key stays)
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password generation | Custom random string logic | `secrets.choice()` with safe charset | Handles entropy correctly; excludes PostgreSQL-unsafe chars (`:/@"\`) |
| Secret versioning | Custom version tracking | Secrets Manager AWSPENDING/AWSCURRENT/AWSPREVIOUS | AWS manages atomic promotion; prevents partial-rotation failures |
| Network connectivity for Lambda | Custom NAT/VPC setup | Attach rotation Lambda to the same VPC/subnet/SG as RDS | Secrets Manager console recommends existing Lambda with matching VPC config |
| Rotation retry logic | Custom retry wrapper | Secrets Manager built-in retry on Lambda failure | Retries up to 3 times before marking rotation failed |
| Secret encryption | Custom KMS handling | Secrets Manager uses existing KMS key automatically | RDS module already has `enable_key_rotation = true` in Terraform |

**Key insight:** The only custom code needed is the `DATABASE_URL` format adapter in `createSecret` and `setSecret` steps. Everything else (schedule, versioning, retry, encryption, Lambda IAM role) is managed by Secrets Manager.

---

## Common Pitfalls

### Pitfall 1: AWS Standard Rotation Lambda Won't Work With This Secret
**What goes wrong:** The AWS-managed rotation Lambda (SecretsManagerRDSPostgreSQLRotationSingleUser)
expects keys `username`, `password`, `host`, `engine`, `dbname`—not `DATABASE_URL`. Enabling
managed rotation without a custom Lambda will fail immediately on the first rotation with a
`KeyError` in the Lambda.
**Why it happens:** The production secret was created with a `DATABASE_URL` string rather than
the AWS canonical JSON format.
**How to avoid:** Use a custom rotation Lambda that parses `DATABASE_URL` to extract credentials,
rotates the password in RDS, then reconstructs the updated `DATABASE_URL` string.
**Warning signs:** `RotationFailed` status in Secrets Manager console; Lambda error logs showing
`KeyError: 'username'`.

### Pitfall 2: ECS Won't Auto-Refresh Credentials Without Force Redeployment
**What goes wrong:** After rotation, running ECS tasks still hold the old `DATABASE_URL` in their
environment. The old password becomes invalid when RDS applies the new one. Connections
established before rotation continue working (existing TCP connections stay open), but new
connections (new requests, reconnects after pool timeout) fail with `auth failed`.
**Why it happens:** ECS injects secrets at task launch time from Secrets Manager. Running tasks
cache the injected value; they don't watch for secret updates.
**How to avoid:** EventBridge → Lambda → `ecs:UpdateService(forceNewDeployment=True)`. This rolls
out new tasks that fetch the updated `AWSCURRENT` secret at launch.
**Warning signs:** HTTP 500s from the API starting 30 minutes after rotation (after
`pool_recycle=1800` forces connection renewal).

### Pitfall 3: Downtime Window During Force Redeployment
**What goes wrong:** `forceNewDeployment=True` follows ECS rolling update behavior. If `minimumHealthyPercent=100`, ECS launches new tasks before stopping old ones—zero downtime. If `minimumHealthyPercent=0` or tasks fail health checks, brief downtime is possible.
**Why it happens:** Default ECS service configuration may not protect against this.
**How to avoid:** Confirm `dollor-api-service` has `minimumHealthyPercent=100` and `maximumPercent=200`.
The existing `deploy-dollar-ai.yml` uses `wait-for-service-stability: true`, which confirms rolling
deployment works correctly—the same mechanism applies here.
**Warning signs:** API health check failures during the rotation redeployment window.

### Pitfall 4: Rotation Lambda VPC/Network Access
**What goes wrong:** If the rotation Lambda is not in the same VPC as RDS, it cannot connect to
PostgreSQL on port 5432. The `setSecret` step will fail with a connection timeout.
**Why it happens:** Lambda functions are public by default; RDS is in a private subnet.
**How to avoid:** Deploy the rotation Lambda into the same VPC, private subnet, and attach the
RDS security group (or a security group with ingress rule on 5432 from the Lambda SG).
Also ensure Lambda has outbound access to the Secrets Manager endpoint (either via VPC endpoint
or NAT gateway—NAT is already configured per `infrastructure/terraform/environments/production/main.tf`).
**Warning signs:** `createSecret` succeeds, `setSecret` times out after 30 seconds.

### Pitfall 5: Staging Secret Has Different Key Name Than Production
**What goes wrong:** The staging secret is `dollor/staging/database-url` (a different name and
schema than production `dollor/production/database-v2`). The staging task definition uses a
different ARN. Implementing rotation on the wrong secret in staging doesn't test the production
rotation Lambda.
**Why it happens:** Staging was provisioned with a different naming convention.
**How to avoid:** Verify the staging ECS task definition's `DATABASE_URL` `valueFrom` ARN before
wiring up the rotation Lambda. Test rotation against the secret that staging actually reads.

### Pitfall 6: Rotation on Staging Breaks Staging CI Deploys
**What goes wrong:** If staging rotation triggers ECS redeployment at the same time as a CI
deploy, the two deployments conflict. ECS can only stabilize one deployment at a time.
**Why it happens:** Rotation schedules don't know about CI deploy timing.
**How to avoid:** Run the staging rotation test manually (not on a schedule) for validation.
Only enable the automatic 30-day schedule on staging after testing the manual cycle first.

---

## Code Examples

### Enable Rotation via AWS CLI (after Lambda is deployed)
```bash
# Source: https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_turn-on-for-db.html
aws secretsmanager rotate-secret \
  --secret-id "dollor/production/database-v2-gd1oKf" \
  --rotation-lambda-arn "arn:aws:lambda:us-east-1:134607809447:function:dollor-db-rotation" \
  --rotation-rules '{"ScheduleExpression": "rate(30 days)"}' \
  --region us-east-1

# Force immediate rotation for testing
aws secretsmanager rotate-secret \
  --secret-id "dollor/staging/database-url-QrJCDo" \
  --rotation-lambda-arn "arn:aws:lambda:us-east-1:134607809447:function:dollor-db-rotation-staging" \
  --rotate-immediately \
  --region us-east-1
```

### Validate Rotation Completed Successfully
```bash
# Check current rotation status
aws secretsmanager describe-secret \
  --secret-id "dollor/staging/database-url" \
  --region us-east-1 \
  --query '{RotationEnabled:RotationEnabled, LastRotatedDate:LastRotatedDate, RotationRules:RotationRules}'

# Check Lambda execution logs after rotation
aws logs tail /aws/lambda/dollor-db-rotation-staging \
  --since 10m --region us-east-1

# Verify ECS tasks redeployed after rotation
aws ecs describe-services \
  --cluster dollor-production \
  --services dollor-api-staging-service \
  --region us-east-1 \
  --query 'services[0].deployments[*].{status:status,runningCount:runningCount,desiredCount:desiredCount,createdAt:createdAt}'
```

### IAM Policy for Rotation Lambda
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:PutSecretValue",
        "secretsmanager:DescribeSecret",
        "secretsmanager:UpdateSecretVersionStage"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:134607809447:secret:dollor/production/database-v2-*"
    },
    {
      "Effect": "Allow",
      "Action": ["kms:Decrypt", "kms:GenerateDataKey"],
      "Resource": "*",
      "Condition": {"StringEquals": {"kms:ViaService": "secretsmanager.us-east-1.amazonaws.com"}}
    }
  ]
}
```

### IAM Policy for ECS Redeployment Lambda
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ecs:UpdateService", "ecs:DescribeServices"],
      "Resource": "arn:aws:ecs:us-east-1:134607809447:service/dollor-production/*"
    }
  ]
}
```

### CloudWatch Alarm for Rotation Failures
```bash
# Create alarm for rotation failures (Lambda error rate)
aws cloudwatch put-metric-alarm \
  --alarm-name "dollor-db-rotation-failure" \
  --alarm-description "DB rotation Lambda error detected" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --dimensions Name=FunctionName,Value=dollor-db-rotation \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --region us-east-1
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Cron job + shell script to rotate password | AWS Secrets Manager built-in rotation with Lambda | 2018 (SM launch) | Atomic versioning, no plaintext credential in logs |
| Container restart via `ecs:StopTask` sequentially | `forceNewDeployment=True` rolling update | 2019 (ECS rolling deploy) | Zero downtime vs brief task gap with stop approach |
| Alternating-users rotation | Single-user rotation (for db.t3.micro scale) | Current recommendation for simple setups | Avoids need for second DB user; fewer moving parts |
| Client-side secret SDK refresh | Force-redeployment | n/a | Requires boto3 SDK in app; adds latency. Not worth it for 30-day rotation |

**Deprecated/outdated:**
- `SecretsManagerRDSPostgreSQLRotationSingleUser` SAR app: Still works but requires the AWS canonical JSON schema. Not usable here without secret restructuring.
- `ecs:StopTask` loop approach: Creates rolling downtime window. Use `forceNewDeployment` instead.

---

## Open Questions

1. **Staging secret schema**
   - What we know: `dollor/staging/database-url` exists at ARN `...database-url-QrJCDo`; it has an `AWSCURRENT` version
   - What's unclear: Is the value stored as `{"DATABASE_URL": "postgresql://..."}` or as a plain string?
   - Recommendation: Before implementation, run `aws secretsmanager get-secret-value --secret-id dollor/staging/database-url` to confirm structure; the rotation Lambda's `createSecret` step must parse this correctly

2. **Staging task definition DATABASE_URL valueFrom ARN**
   - What we know: The staging task definition is downloaded live from ECS at deploy time by `deploy-staging.yml`; the source of truth is the live ECS task definition revision `dollor-api-staging:29`
   - What's unclear: The staging task def may reference `dollor/staging/database-url-QrJCDo` or may share the production secret
   - Recommendation: `aws ecs describe-task-definition --task-definition dollor-api-staging:29 --query taskDefinition.containerDefinitions[0].secrets` to confirm the ARN before wiring up staging rotation

3. **RDS instance ID for rotation Lambda configuration**
   - What we know: DB is `db.t3.micro` PostgreSQL 15, in `us-east-1`; username is `dollor_admin` (from Terraform module)
   - What's unclear: Actual RDS instance identifier string needed for the Lambda to construct the DB connection
   - Recommendation: `aws rds describe-db-instances --region us-east-1 --query 'DBInstances[*].{id:DBInstanceIdentifier,endpoint:Endpoint.Address}'` to get the hostname before writing the Lambda

---

## Sources

### Primary (HIGH confidence)
- AWS Official Docs: [Set up automatic rotation for RDS secrets](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_turn-on-for-db.html) - rotation steps, schedule format, IAM requirements
- AWS Official Docs: [JSON structure of Secrets Manager secrets](https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_secret_json_structure.html) - RDS PostgreSQL expected schema
- AWS Official Docs: [Managed rotation](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_managed.html) - why managed rotation doesn't apply here (requires standard schema)
- Live AWS resources: `aws secretsmanager list-secrets` output confirming secret names, ARNs, rotation status
- Project files: `infrastructure/ecs/task-definition.json` (DATABASE_URL injection pattern), `infrastructure/terraform/modules/rds/main.tf` (RDS config), `infrastructure/terraform/modules/secrets/main.tf` (secret naming convention)
- Project files: `.github/workflows/deploy-dollar-ai.yml` + `deploy-staging.yml` (ECS deployment mechanism confirmed)

### Secondary (MEDIUM confidence)
- AWS re:Post: [Automatically restart ECS service tasks after secret rotation](https://repost.aws/questions/QUYHw--TXvTTewJeVsT2T5QA/) - EventBridge + Lambda pattern confirmed by multiple community answers
- DNX Solutions: [RDS Secrets Rotation and ECS Update](https://dnx.solutions/rds-secrets-rotation-and-ecs-update/) - custom Lambda pattern with IAM policy example, verified against official docs

### Tertiary (LOW confidence - for reference only)
- GitHub: [aws-samples/aws-secrets-manager-rotation-lambdas](https://github.com/aws-samples/aws-secrets-manager-rotation-lambdas) - reference implementation showing 4-step protocol; NOT directly usable due to DATABASE_URL schema mismatch

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - verified via live AWS describe-secret output and official docs
- Architecture: HIGH - 4-step Lambda protocol is official AWS pattern; DATABASE_URL mismatch confirmed by reading actual task definition JSON
- Pitfalls: HIGH - pitfalls 1, 2, 3 confirmed by checking actual secret schema and ECS task definition; pitfalls 4-6 confirmed by official docs and infrastructure files
- Open questions: MEDIUM - questions are scoped to values not visible without `get-secret-value` permission or live task definition query

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (30 days; Secrets Manager rotation API is stable)
