# AWS WAF Bot Control Activation Runbook

## Overview

WAF Web ACL `dollor-api-bot-protection` is defined in `infrastructure/terraform/waf.tf`.

- **IP Reputation List**: Block mode (safe immediately — very low false positives)
- **Bot Control rule group**: Count mode initially → switch to Block after 24-48h review

## Step 1 — Apply Terraform

```bash
cd infrastructure/terraform
terraform init
terraform plan -target=aws_wafv2_web_acl.dollor_bot_protection
terraform apply -target=aws_wafv2_web_acl.dollor_bot_protection
```

Note the `waf_web_acl_arn` output.

## Step 2 — Associate with CloudFront

CloudFront is manually managed (not in Terraform). Associate via AWS Console:

1. AWS Console → CloudFront → Distributions → select `api.dollor.ai` (ID: `E3LB9SMG1YD9ZL`)
2. **Security** tab → Web Application Firewall (WAF)
3. Click **Edit** → paste the `waf_web_acl_arn` output
4. Save changes (takes ~5 min to propagate)

## Step 3 — Monitor Count mode (24-48 hours)

Check sampled requests for false positives on mobile app traffic:

```
AWS Console → WAF & Shield → Web ACLs → dollor-api-bot-protection
→ Sampled requests tab
→ Filter by: AWSManagedRulesBotControlRuleSet / Action: Count
```

CloudWatch metrics to watch:
- `AWS/WAFV2 CountedRequests` metric, dimension `Rule=AWSManagedRulesBotControlRuleSet`
- `AWS/WAFV2 BlockedRequests` metric (IP reputation blocks)

**What to look for**: Mobile app requests (iOS/Android) should NOT appear in counted requests. If they do, investigate the User-Agent pattern before switching to Block.

## Step 4 — Switch to Block mode

After confirming no legitimate traffic is counted, edit `infrastructure/terraform/waf.tf`:

```hcl
# Change this:
override_action {
  count {}
}

# To this:
override_action {
  none {}
}
```

Re-apply:
```bash
terraform apply -target=aws_wafv2_web_acl.dollor_bot_protection
```

## Cost Estimate

| Component | Monthly Cost |
|-----------|-------------|
| WAF Web ACL | ~$5 |
| Bot Control rule group | ~$10 + $1/million requests |
| IP Reputation list | Included in WAF base |
| **Total** | **~$15-20/month** |

## Rollback

Remove WAF association from CloudFront distribution in AWS Console (Security tab → remove WAF). No Terraform change needed for rollback.

## Related

- Application-layer bot protection: `main_new.py` `bot_blocklist_middleware` (UA blocklist)
- robots.txt: `main_new.py` `GET /robots.txt`
- Public endpoint rate limits: `main_new.py` `public_listings_rate_limiter` (30/min), `public_estimate_rate_limiter` (20/min)
