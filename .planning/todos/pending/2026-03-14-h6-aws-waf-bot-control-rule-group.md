---
created: 2026-03-14T00:00:00Z
title: Enable AWS WAF Bot Control rule group on CloudFront distribution
area: security/infra
severity: MEDIUM
files:
  - infrastructure/terraform/
---

## Problem

Bot/crawler protection is currently only at the application layer (UA blocklist in `main_new.py:262`). Infrastructure-level bot protection via AWS WAF is missing. CloudFront is in front of all traffic but has no WAF rule groups attached.

AWS WAF Bot Control can detect headless browsers, known bot ASNs, credential stuffing patterns, and scrapers that rotate user-agents (bypassing the application-layer blocklist).

## Solution

Manual setup (no Terraform module exists in current repo — add Terraform later):

1. **AWS Console** → WAF & Shield → Create Web ACL
   - Name: `dollor-api-bot-protection`
   - Resource type: CloudFront distribution
   - Region: Global (us-east-1 for CloudFront)

2. **Add Bot Control managed rule group**:
   - AWS Managed Rules → `AWSManagedRulesBotControlRuleSet`
   - Start in **Count mode** (not Block) for 24–48h to review false positives

3. **Associate with CloudFront distribution**:
   - Attach to `api.dollor.ai` CloudFront distribution

4. **Monitor in Count mode**:
   - Review CloudWatch `AWS/WAFV2` metrics for 24–48h
   - Check sampled requests for false positives on mobile app traffic

5. **Switch to Block mode** after verifying no legitimate traffic blocked

6. **Cost**: ~$10/month base + $1/million requests for Bot Control

7. **Future**: Add Terraform `aws_wafv2_web_acl` resource to `infrastructure/terraform/`

See: `.planning/quick/173-implement-bot-crawler-protection-robots-/173-SUMMARY.md` for context.

## Implemented

- Created `infrastructure/terraform/waf.tf`:
  - `aws_wafv2_web_acl.dollor_bot_protection` (CLOUDFRONT scope, us-east-1 provider alias)
  - IP Reputation List rule in **Block** mode (safe immediately)
  - Bot Control rule in **Count** mode (switch to `none {}` after 24-48h review)
  - `waf_web_acl_arn` output for CloudFront association
- Created `.planning/runbooks/aws-waf-bot-control-activation.md` with:
  - Terraform apply steps
  - CloudFront manual association steps (CF not in Terraform)
  - Count → Block switchover procedure
  - Cost estimate (~$15-20/month)
- **Manual step required**: `terraform apply -target=aws_wafv2_web_acl.dollor_bot_protection` then associate with CloudFront via AWS Console
