# Dollor.ai AWS WAF Bot Control - CloudFront Protection
# ======================================================
# NOTE: CloudFront WAF ACLs must be in us-east-1 (global scope).
# CloudFront is provisioned manually; this creates the WAF ACL only.
# After applying, associate via: AWS Console → CloudFront → distribution → Security → WAF
# OR run: aws cloudfront update-distribution (see runbook)
#
# Apply: terraform apply -target=aws_wafv2_web_acl.dollor_bot_protection
# Runbook: .planning/runbooks/aws-waf-bot-control-activation.md

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

resource "aws_wafv2_web_acl" "dollor_bot_protection" {
  provider    = aws.us_east_1
  name        = "dollor-api-bot-protection"
  description = "Bot protection for api.dollor.ai CloudFront distribution"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # AWS IP Reputation List — block known bad IPs immediately (low false-positive risk)
  rule {
    name     = "AWSManagedRulesAmazonIpReputationList"
    priority = 5

    override_action {
      none {} # Block mode — safe to enable immediately
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesAmazonIpReputationList"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "DollorIPReputationMetric"
      sampled_requests_enabled   = true
    }
  }

  # Bot Control — start in Count mode for 24-48h review, then switch to Block
  # To switch to Block: change override_action to none {} and re-apply
  rule {
    name     = "AWSManagedRulesBotControlRuleSet"
    priority = 10

    override_action {
      count {} # COUNT mode — monitor for false positives before blocking
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesBotControlRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "DollorBotControlMetric"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "DollorWebACLMetric"
    sampled_requests_enabled   = true
  }

  tags = {
    Project     = "dollor"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

output "waf_web_acl_arn" {
  value       = aws_wafv2_web_acl.dollor_bot_protection.arn
  description = "Paste this ARN into CloudFront distribution → Security → WAF Web ACL"
}
