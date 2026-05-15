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

(GuardDuty + Security Hub + Config sections appended by subsequent tasks below.)
