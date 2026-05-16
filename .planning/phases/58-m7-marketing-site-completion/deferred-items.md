# Deferred items (Phase 58 / M7)

## 58-03 — SES outbound from turion-demo-api Lambda hangs (VPC has no NAT or SES VPCE)
- Discovered during Wave 3 backend smoke test on 2026-05-16.
- Lambda `turion-demo-api` runs in vpc-012ab4500dcd4ee41 with VPC endpoints for
  Secrets Manager / KMS / Cognito only. No NAT gateway, no SES VPC endpoint.
- The contact form's `ses.send(SendEmailCommand)` call hung the entire
  Lambda invocation until the 30-second function timeout, causing every
  valid POST to return HTTP 503 to the user.
- Mitigated by wrapping `ses.send` in an AbortController with a 4-second
  timeout, so the DB row (source of truth) is persisted and the user gets
  `{ok:true,id}` immediately. Each failure logs `[contact] SES send failed`
  with the submission ID for manual replay.
- To actually deliver the email, M8 needs one of:
  (a) attach a NAT gateway to vpc-012ab4500dcd4ee41 (recurring cost ~$32/mo),
  (b) add an SES VPC endpoint (cheaper, recurring cost ~$7/mo per AZ), or
  (c) move turion-demo-api out of the VPC and use the bypass DB pool only
      for routes that need RDS proxy access.
- Until then, support team should poll `SELECT * FROM
  public.contact_submissions WHERE processed_at IS NULL ORDER BY created_at`
  for new submissions. Or build a tiny scheduled-EventBridge Lambda outside
  the VPC that does the same poll-and-SES every 5 minutes.

