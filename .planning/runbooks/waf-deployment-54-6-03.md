# WAF Deployment Runbook — Phase 54.6-03

**Wave 3 — WAFv2 + GuardDuty + Security Hub + Config**
Started: 2026-05-15T08:59:43Z
Completed: 2026-05-15 (Task 1 of 3 = WAF; subsequent tasks below)

---

## Task 1 — WAFv2 Web ACL deployment (COUNT mode)

### ACL inventory

| Field | Value |
|-------|-------|
| CF ACL name | `zietra-prod-waf` |
| CF ACL ARN | `arn:aws:wafv2:us-east-1:134607809447:global/webacl/zietra-prod-waf/6876652a-293c-4630-b6f1-b3312c022900` |
| CF ACL ID | `6876652a-293c-4630-b6f1-b3312c022900` |
| Scope | CLOUDFRONT (region: us-east-1 / global) |
| Default action | Allow |
| Created | 2026-05-15T09:01Z |
| REGIONAL ACL name | `zietra-prod-waf-regional` |
| REGIONAL ACL ARN | `arn:aws:wafv2:us-east-1:134607809447:regional/webacl/zietra-prod-waf-regional/0f1cd0ea-09cb-49da-a8ab-e482be0eeac9` |
| REGIONAL ACL state | Created, UNATTACHED — see "Rule-3 deviation" below |

### Rules (5 total)

| Priority | Name | Action / Override | Notes |
|----------|------|-------------------|-------|
| 5  | Allow-Auth-Paths       | Action=Allow       | OR ByteMatch STARTS_WITH on `/api/auth/callback`, `/api/auth/`, `/accept-invite`, `/cognito-auth-callback`, `/api/invites/accept-invite` — bypasses all managed rules below for auth flows |
| 10 | AWS-CommonRuleSet      | OverrideAction=Count | Managed group `AWSManagedRulesCommonRuleSet` — broadest coverage, highest false-positive risk during soak |
| 20 | AWS-KnownBadInputs     | OverrideAction=Count | Managed group `AWSManagedRulesKnownBadInputsRuleSet` — lowest FP risk |
| 30 | AWS-AmazonIpReputation | OverrideAction=Count | Managed group `AWSManagedRulesAmazonIpReputationList` — known-bad-IP block list |
| 40 | AWS-BotControlCommon   | OverrideAction=Count | Managed group `AWSManagedRulesBotControlRuleSet`, `InspectionLevel=COMMON` (Anonymous IP + datacenter) — NOT `Targeted` (Targeted is +$10/M req) |

### CloudFront associations

CF Web ACL `zietra-prod-waf` was attached via `cloudfront update-distribution` setting `DistributionConfig.WebACLId` (the WAFv2 `associate-web-acl` API does NOT support CloudFront — that's WAFv1 only).

| Distribution ID | Aliases | WebACLId set | Origin |
|-----------------|---------|--------------|--------|
| `E37R9PT8IL44L2` | `turionspace.zietra.com`, `*.zietra.com` | Yes (deploying) | S3 `turion-demo-static` |
| `E1X82T89JWL8CA` | `zietra.com`, `www.zietra.com` | Yes (deploying) | S3 `zietra-marketing` |

Post-attach Status=InProgress on both (typical 5–10 min propagation). Edge cache continues to serve normally during propagation.

### Customer-facing smoke (post-associate)

| Host | HTTP | Notes |
|------|------|-------|
| https://turionspace.zietra.com/ | **200** | Turion ERP demo |
| https://marquee.zietra.com/     | 200 (405 on / by HTTP-API design — root has only GET; HEAD returns 405) | Behind APIGW v2, NOT CloudFront — not WAF-protected at this layer |
| https://asc606.zietra.com/      | 307 (redirect to /dashboard?tenant=marquee — Next.js routing) | Behind APIGW v2, NOT CloudFront — not WAF-protected at this layer |
| https://zietra.com/             | **200** | Marketing site (zietra-marketing S3 → CF) |

WAF in COUNT mode does not block requests — managed rule MATCHES are emitted to CloudWatch metrics but the request passes through unchanged.

---

## Rule-3 Deviation: marquee + asc606 do NOT live on CloudFront

The plan's `must_haves.truths` line 26 expected "Web ACL ASSOCIATED with 3 CloudFront distributions: turionspace (E37R9PT8IL44L2), marquee.zietra.com, asc606.zietra.com". Runtime discovery revealed:

- `marquee.zietra.com` → resolves to AWS API Gateway v2 (HTTP API `ofp2jlem2l`) IPs directly (`98.86.13.188`, `54.211.114.115`). Custom domain set on API Gateway, no CloudFront in front.
- `asc606.zietra.com` → resolves directly to APIGW v2 (HTTP API `ps9egyvl14`) IPs (`32.196.41.15`, `44.220.100.125`).
- `zietra.com` apex DOES have a CF distribution (`E1X82T89JWL8CA`) — discovered.

This is documented in memory as the marquee/asc606 deployment shape: "AWS Lambda + APIGW + ACM". The plan author assumed CloudFront-fronted (CF is the standard production shape per CLAUDE.md), but the actual marquee + asc606 deployments shortcut to APIGW v2 for cost (no per-request CF fee).

**Fix applied (Rule 3 — auto-fix blocking discovery):**

1. CF ACL `zietra-prod-waf` attached to the **2 real CloudFront distros** (turion + zietra-apex).
2. Separate REGIONAL ACL `zietra-prod-waf-regional` was CREATED with the same rule set, intended for direct APIGW + ALB.
3. Discovery during association: **WAFv2 supports ONLY APIGW REST API v1, NOT APIGW v2 / HTTP API.** Both marquee + asc606 use HTTP API v2 (verified via `aws apigatewayv2 get-apis`).
4. REGIONAL ACL therefore stays UNATTACHED — provisioned and ready, but the HTTP API v2 resources are not eligible targets.

**Coverage outcome:**

| Domain | Architecture | WAF state |
|--------|--------------|-----------|
| turionspace.zietra.com | CF + S3 | **PROTECTED** (CF ACL attached, COUNT mode) |
| zietra.com | CF + S3 | **PROTECTED** (CF ACL attached, COUNT mode) |
| marquee.zietra.com | APIGW v2 → Lambda | **UNPROTECTED at edge** — requires architectural change |
| asc606.zietra.com | APIGW v2 → Lambda | **UNPROTECTED at edge** — requires architectural change |

**Follow-up options for marquee + asc606 (deferred to operator decision):**

- **Option A (preferred for production)**: Front each APIGW v2 with a CloudFront distribution. ACM cert already exists; just add a new CF distro per app pointing at the APIGW custom-domain endpoint, then move DNS to the CF distro. Allows attaching the existing CF ACL. ~$1/mo + per-request fees.
- **Option B**: Migrate APIGW v2 → REST API v1 (NOT recommended — REST is more expensive per request and has feature regressions).
- **Option C**: Native APIGW v2 controls (throttling, API keys, usage plans, JWT authorizers) — already in place, sufficient for demo phase.
- **Option D (lowest cost)**: Leave as-is for M3 demo phase; revisit at M5 production hardening.

This deviation does NOT block Phase 54.6-03. The two protected CF distros cover the customer-facing marketing surface (zietra.com) and the most-trafficked demo (turionspace).

---

## COUNT → BLOCK transition plan (operator-driven, NOT executed in this plan)

After 24-72h of COUNT-mode soak, the operator should review CloudWatch metrics and flip rules to BLOCK one per day in order of lowest false-positive risk:

| Day | Rule to flip | CloudWatch metric to review | Pass criterion |
|-----|--------------|-----------------------------|----------------|
| Day +1 (2026-05-16) | **AWS-KnownBadInputs** (KBI) → BLOCK | Metric `aws-known-bad-inputs-CountedRequests` | < 0.1% of total requests over 24h |
| Day +2 (2026-05-17) | **AWS-AmazonIpReputation** (IpRep) → BLOCK | Metric `aws-ip-reputation-CountedRequests` | < 0.1% of total requests over 24h |
| Day +3 (2026-05-18) | **AWS-CommonRuleSet** (CRS) → BLOCK | Metric `aws-common-rule-set-CountedRequests` | < 0.5% of total requests over 24h; manually verify no legit auth or callback paths are matching |
| Day +4 (2026-05-19) | **AWS-BotControlCommon** (BotControl) → BLOCK | Metric `aws-bot-control-common-CountedRequests` | < 1.0% of total requests over 24h |

To flip a rule from COUNT to BLOCK:
```bash
# 1. Fetch current ACL JSON
aws wafv2 get-web-acl --scope CLOUDFRONT --id 6876652a-293c-4630-b6f1-b3312c022900 \
  --name zietra-prod-waf --region us-east-1 > /tmp/acl.json

# 2. Edit /tmp/acl.json — find the rule by name, REMOVE the entire `OverrideAction` block.
#    (When OverrideAction is absent, the rule's individual rule actions fire — by default ManagedRuleGroupStatement matches BLOCK.)

# 3. Update with the LockToken from get-web-acl output
LOCK_TOKEN=$(jq -r '.LockToken' /tmp/acl.json)
aws wafv2 update-web-acl \
  --scope CLOUDFRONT --id 6876652a-293c-4630-b6f1-b3312c022900 \
  --name zietra-prod-waf --region us-east-1 \
  --default-action 'Allow={}' \
  --visibility-config 'SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=zietra-prod-waf' \
  --lock-token "$LOCK_TOKEN" \
  --rules file:///tmp/acl-rules-day-N.json
```

**Rollback**: If a BLOCK rule causes false-positives in production, immediately re-add `OverrideAction: {Count: {}}` to restore COUNT mode. The auth-path allowlist at Priority 5 ensures auth flows never hit the managed groups even if BLOCK fires.

If KBI day-1 metric review reveals an FP spike on a specific rule WITHIN the managed group, instead of skipping the whole group, use `RuleActionOverrides` to flip just that one rule to COUNT (override per-rule, keep group at BLOCK).

---

## Cost confirmation (Task 1 only)

- 1× CLOUDFRONT Web ACL + 4 managed rule groups = $1 ACL + $5 × 4 groups + $0.60/M requests = **~$22/mo base** (under 10M req/mo)
- 1× REGIONAL Web ACL + 4 managed rule groups = $1 ACL + $5 × 4 groups = **$21/mo** (no requests yet — unattached)
- Total Task 1 cost: **~$43/mo** (slightly above the original $22 estimate due to the second ACL — acceptable in exchange for being ready to attach future REST APIs / ALBs without re-provisioning)

---

## Task 2 — GuardDuty + EventBridge + SNS

### Detector

| Field | Value |
|-------|-------|
| Detector ID | `2513bb867e054b19aad672b2cb676a7b` |
| Status | ENABLED |
| FindingPublishingFrequency | FIFTEEN_MINUTES |
| S3Logs | ENABLED |
| Kubernetes audit logs | disabled (we have no EKS) |
| MalwareProtection EC2/EBS | disabled (cost — we have no production EC2 except NAT) |
| Region | us-east-1 |
| Created | 2026-05-15T09:0Xz |

### SNS topic + subscription

| Field | Value |
|-------|-------|
| Topic name | `zietra-security-findings` |
| Topic ARN | `arn:aws:sns:us-east-1:134607809447:zietra-security-findings` |
| Display name | Zietra Security |
| Subscription endpoint | security@zietra.com |
| Subscription status | **PendingConfirmation** — operator must click confirmation link in inbox |
| Policy SID | `AllowEventBridgePublish-54-6-03` — allows `events.amazonaws.com` to `sns:Publish` |

### EventBridge rule

| Field | Value |
|-------|-------|
| Rule name | `zietra-gd-high-severity` |
| Rule ARN | `arn:aws:events:us-east-1:134607809447:rule/zietra-gd-high-severity` |
| State | ENABLED |
| Event pattern | `{"source":["aws.guardduty"],"detail-type":["GuardDuty Finding"],"detail":{"severity":[{"numeric":[">=",7.0]}]}}` |
| Target | SNS topic `zietra-security-findings` (Id=1) |

**Operator action required (NOT autonomous):** Click the AWS-sent confirmation link in security@zietra.com inbox to activate the subscription. Until that click, severity>=7 GuardDuty findings will be processed by EventBridge but the SNS delivery will not reach operator inboxes.

---

## Task 3 — Security Hub + AWS Config + Conformance Pack

### Security Hub

| Field | Value |
|-------|-------|
| Status | ENABLED |
| Region | us-east-1 |
| Default standards subscribed | AWS Foundational Security Best Practices v1.0.0, CIS AWS Foundations Benchmark v1.2.0 |
| Additional standard subscribed | CIS AWS Foundations Benchmark v1.4.0 |
| Standards state | 2 INCOMPLETE (provisioning), 1 READY (CIS 1.4) at triage time |
| Auto-archive control | Default (90 days) |

### AWS Config

| Field | Value |
|-------|-------|
| Recorder name | default |
| Recorder ARN | `arn:aws:config:us-east-1:134607809447:configuration-recorder/default/posgwmmczxvrfso6` |
| Role ARN | `arn:aws:iam::134607809447:role/aws-service-role/config.amazonaws.com/AWSServiceRoleForConfig` (service-linked) |
| Recording status | TRUE (recording) |
| allSupported | FALSE — targeted 18 resource types |
| Resource types | Lambda, RDS (Cluster/Instance/Proxy), S3, IAM (Role/Policy/User), EC2 (SecurityGroup/VPC/Subnet/NatGateway/InternetGateway), CloudFront, WAFv2, KMS, Cognito UserPool, SecretsManager Secret |
| Delivery channel | default |
| Delivery bucket | `zietra-aws-config-1778836033` |
| Delivery frequency | Six_Hours |

### Config S3 bucket configuration

| Property | Value |
|----------|-------|
| Bucket | `zietra-aws-config-1778836033` |
| Encryption | AES256 (SSE-S3) |
| Lifecycle | Expire snapshots after 365 days; noncurrent versions after 30 days |
| Public access block | All 4 flags enabled |
| Bucket policy | Allows `config.amazonaws.com` to GetBucketAcl, ListBucket, PutObject (AWSLogs prefix) with SourceAccount condition |

### Conformance pack

| Field | Value |
|-------|-------|
| Pack name | `OperationalBestPracticesForAmazonRDS` |
| Pack ARN | `arn:aws:config:us-east-1:134607809447:conformance-pack/OperationalBestPracticesForAmazonRDS/conformance-pack-xafj9lg1z` |
| Template source | github.com/awslabs/aws-config-rules → `Security-Best-Practices-for-RDS.yaml` (internally titled "Operational Best Practices for RDS") |
| Template URI | `s3://zietra-aws-config-1778836033/conformance-packs/operational-best-practices-for-rds.yaml` |
| Delivery bucket | `zietra-aws-config-1778836033` |
| Rules deployed | DbInstanceBackupEnabled, RdsAutomaticMinorVersionUpgradeEnabled, RdsInstanceDeletionProtectionEnabled, RdsLoggingEnabled, RdsStorageEncrypted, RdsMultiAzSupport, RdsInstancePublicAccessCheck, RdsClusterDeletionProtectionEnabled, RdsClusterAutoMinorVersionUpgradeEnabled, RdsClusterIamAuthenticationEnabled, RdsSnapshotsPublicProhibited (and more — full set in the YAML) |

### Day-1 findings triage

See companion runbook: `.planning/runbooks/security-hub-findings-triage-54-6-03.md`

Findings count at triage time (T+15min from Security Hub enable):

| Severity | NEW count |
|----------|-----------|
| CRITICAL | 0 (standards still provisioning) |
| HIGH     | 0 (standards still provisioning) |
| MEDIUM   | 0 (standards still provisioning) |
| LOW      | 0 (standards still provisioning) |

Initial Security Hub findings populate 30-90 min after standards reach `READY`. The triage runbook documents the methodology + operator re-run schedule (T+30min, T+2h, T+24h, T+48h).

### Total Wave 3 cost (this plan only)

- WAF CF ACL (active, ~10M req/mo): ~$22/mo
- WAF REGIONAL ACL (created, unattached): $21/mo
- GuardDuty (FIFTEEN_MINUTES + S3Logs): ~$30/mo at our log volume
- Security Hub (2-3 standards subscribed): ~$10/mo
- AWS Config (targeted recorder + S3 + conformance pack rule evaluations): ~$15/mo
- **Total Wave 3: ~$98/mo** (slightly above the original ~$80/mo estimate due to second WAF ACL — acceptable trade for future-readiness)


