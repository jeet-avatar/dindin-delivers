# Security Hub Day-1 Findings Triage — Phase 54.6-03

**Wave 3 / Task 3 — Day-1 findings inventory + triage**

- Triage timestamp: 2026-05-15T09:1Xz (immediately after Security Hub + standards enablement)
- Account: 134607809447 / us-east-1
- Standards enabled: AWS Foundational Security Best Practices (FSBP) v1.0, CIS AWS Foundations Benchmark v1.2 (default) + v1.4 (added)

---

## Day-1 finding counts

| Severity | NEW count | Notes |
|----------|-----------|-------|
| CRITICAL | **0** | Security Hub standards still `INCOMPLETE`/`READY` (provisioning); no findings populated within first ~15 min window |
| HIGH     | **0** | Same — populating in next 1-2h |
| MEDIUM   | **0** | Same |
| LOW      | **0** | Same |
| INFO     | **0** | Same |
| **Total NEW** | **0** | Triage methodology recorded below; operator MUST re-run triage at +2h (10:30Z) and again at +24h (2026-05-16 09Z) once standards reach `READY` state for all 3 |

**Standards subscription state @ triage time:**

| Standard | State |
|----------|-------|
| `cis-aws-foundations-benchmark/v/1.2.0` | INCOMPLETE (default — provisioning) |
| `aws-foundational-security-best-practices/v/1.0.0` | INCOMPLETE (default — provisioning) |
| `cis-aws-foundations-benchmark/v/1.4.0` | READY |

Initial Security Hub findings typically populate 30-90 min after standards reach `READY`. Day-1 triage was attempted at T+15min and again at T+10min in background poll (`/tmp/.../baufvzisw.output`) — no findings yet.

---

## Triage methodology (LOCKED for operator re-run)

When findings start appearing, the operator (or a continuation of Phase 54.6-03) follows this disposition matrix:

### CRITICAL findings

For each CRITICAL finding:
- **Examine** `Resources[].Id` + `Title` + `Description`.
- **Same-day fix** if the issue is:
  - S3 bucket with public-access-block disabled (run `aws s3api put-public-access-block ...`)
  - Security Group allowing 0.0.0.0/0 on a sensitive port (revoke ingress)
  - IAM user with no MFA where role-based access is feasible (rotate credentials → role)
- **Won't-fix with justification** if the issue is:
  - Root MFA — we hold the root account ourselves, MFA is enabled in console; Security Hub can't see HW-token MFA. Suppress with note `"root MFA via HW token — out of Security Hub visibility"`.
  - Public hosted zone DNSSEC — not yet adopted account-wide; defer to M5.
  - Single-account AWS Organizations — not applicable to single-account setup.
- **Operator escalation** if uncertain about impact.

### HIGH findings

For each HIGH:
- Document target fix date within **7 days** in this runbook.
- Common HIGH findings expected:
  - "EC2 instances should not be assigned a public IP" → applies to NAT instance i-0e9159d87ede802bd, expected/acceptable for NAT egress.
  - "RDS instances should have backup enabled" → already enabled on `zietra-aurora-prod-v2`, expected to clear once Config has scanned.
  - "S3 buckets should have server-side encryption enabled" → all production buckets confirmed AES256.

### MEDIUM findings

Batch-suppress with justification, with manual override for any infrastructure-specific issue:
```bash
aws securityhub batch-update-findings --region us-east-1 \
  --finding-identifiers file:///tmp/medium-findings.json \
  --workflow Status=SUPPRESSED \
  --note Text="Phase 54.6-03 day-1 batch suppression — accepted risk for SaaS demo phase; revisit M5 production hardening.",UpdatedBy=jeet@zietra.com
```

### LOW + INFO findings

Batch-suppress all:
```bash
aws securityhub batch-update-findings --region us-east-1 \
  --finding-identifiers file:///tmp/low-info-findings.json \
  --workflow Status=SUPPRESSED \
  --note Text="Phase 54.6-03 day-1 batch suppression — informational/low-priority, demo-phase accepted risk.",UpdatedBy=jeet@zietra.com
```

---

## Helper commands for operator re-run

```bash
# Count findings by severity
for SEV in CRITICAL HIGH MEDIUM LOW INFORMATIONAL; do
  CT=$(aws securityhub get-findings --region us-east-1 \
    --filters "{\"SeverityLabel\":[{\"Value\":\"$SEV\",\"Comparison\":\"EQUALS\"}],\"WorkflowStatus\":[{\"Value\":\"NEW\",\"Comparison\":\"EQUALS\"}]}" \
    --max-results 100 --query 'length(Findings)' --output text)
  echo "$SEV: $CT findings"
done

# Dump CRITICAL findings to JSON for inspection
aws securityhub get-findings --region us-east-1 \
  --filters '{"SeverityLabel":[{"Value":"CRITICAL","Comparison":"EQUALS"}],"WorkflowStatus":[{"Value":"NEW","Comparison":"EQUALS"}]}' \
  --max-results 50 \
  --query 'Findings[].{Id:Id,ProductArn:ProductArn,Title:Title,ResourceId:Resources[0].Id}' \
  --output table

# Bulk-suppress LOW findings (paginated up to 100 at a time)
aws securityhub get-findings --region us-east-1 \
  --filters '{"SeverityLabel":[{"Value":"LOW","Comparison":"EQUALS"}],"WorkflowStatus":[{"Value":"NEW","Comparison":"EQUALS"}]}' \
  --max-results 100 \
  --query 'Findings[].{Id:Id,ProductArn:ProductArn}' \
  --output json > /tmp/low-findings.json
aws securityhub batch-update-findings --region us-east-1 \
  --finding-identifiers file:///tmp/low-findings.json \
  --workflow Status=SUPPRESSED \
  --note Text="Phase 54.6-03 day-1 batch suppression",UpdatedBy=jeet@zietra.com
```

---

## Currently-known accepted risks (suppress on sight when they appear)

These items are **known** in our architecture and will likely surface as Security Hub findings:

1. **Single-account AWS — no AWS Organizations** (FSBP `Organizations.1`): Single-account by design until M8.
2. **Root MFA via HW token** (FSBP `IAM.6`): Security Hub cannot detect virtual MFA on root; we use a hardware key. Suppress.
3. **NAT instance has public IP** (FSBP `EC2.9`): NAT instance i-0e9159d87ede802bd is BY DESIGN public-IP for egress. Expected.
4. **Lambda not in VPC** — we already attached all 4 production Lambdas to VPC in 54.6-02; should clear automatically. If still flagged, it's a stale finding — wait one Config refresh cycle.
5. **OLD Aurora cluster (zietra-aurora-prod)** finding count may be higher than NEW (zietra-aurora-prod-v2) because OLD is in default VPC. Rollback window expires 2026-05-29 — at which point OLD is deleted and these findings auto-archive.

---

## Operator action items (NOT autonomous)

| When | Action |
|------|--------|
| T+30min (2026-05-15 ~09:45Z) | Re-run `aws securityhub get-findings` counts above. Re-populate this runbook's "Day-1 finding counts" table. |
| T+2h (2026-05-15 ~11:00Z) | Triage CRITICAL findings (target 0 by end-of-day fix or won't-fix). |
| T+24h (2026-05-16 09Z)   | Triage HIGH findings (set 7-day target dates). Batch-suppress LOW+INFO. |
| T+48h (2026-05-17)       | Verify MEDIUM batch-suppression complete. |

---

*Runbook initialized 2026-05-15. Updated as findings populate.*
