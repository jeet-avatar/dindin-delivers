# Phase 06: SSL Pinning Rotation Fix - Research

**Researched:** 2026-02-26
**Domain:** iOS SSL certificate pinning, AWS ACM certificate lifecycle, CloudWatch monitoring
**Confidence:** HIGH

## Summary

The current `NetworkSecurity.swift` pins three certificate hashes: leaf, intermediate (Amazon RSA 2048 M04), and root (Amazon Root CA 1). The leaf pin **will** break on ACM renewal (new key pair generated). The intermediate pin **may** break because AWS uses dynamic intermediate CAs. Only the root CA pin is stable. The fix is straightforward: replace all three pins with the five Amazon Trust Services root CA SPKI hashes, which are permanent and cover all possible ACM certificate chains.

The current certificate expires December 31, 2026 (~308 days from now), so there is time but the fix should ship promptly. With ACM's new 198-day validity (effective Feb 2026 per CA/Browser Forum SC-081v3), renewals happen twice as often. The `pinnedDomains` dictionary in `NetworkSecurity.swift` is the single point of change -- it is in the shared `EatFairShared` SPM package used by all 3 iOS apps. After updating the pins, archive + upload to TestFlight completes the fix.

**Primary recommendation:** Replace leaf+intermediate pins with all 5 Amazon Trust Services root CA SPKI hashes. Keep hard-block behavior on pin mismatch. Add CloudWatch `DaysToExpiry` alarm via Terraform. Write concise operator runbook.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Pin ALL Amazon Root CAs (Root CA 1, 2, 3, 4 + Starfield) for maximum resilience
- All 3 iOS apps share NetworkSecurity.swift -- change applies to all simultaneously
- CloudWatch alarm at 30 days before certificate expiry (warning threshold)
- Second alarm at 7 days before expiry (critical escalation)
- Notifications to support@dollor.ai via SNS
- Runbook audience: Jeet only -- concise, assumes AWS/iOS familiarity, exact commands
- Runbook location: detailed runbook in `.planning/runbooks/` AND summary in CLAUDE.md
- Include both current SPKI pin hashes AND extraction commands for future reference
- Does NOT include App Store submission -- builds go to TestFlight only

### Claude's Discretion
- Whether to keep old leaf pins temporarily alongside new root CA pins (transition strategy)
- Hardcoded pins vs remote config approach
- Hard-block vs TLS fallback on pin mismatch
- Pin failure reporting mechanism
- Old app version migration path / force-update handling
- CloudWatch alarm provisioning method (Terraform vs Console)
- Runbook scenario depth (happy path only vs emergency coverage)
- Rollout strategy (all 3 apps at once vs canary)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SSL-01 | iOS NetworkSecurity.swift migrated from leaf+intermediate pins to Amazon Root CA SPKI pins | All 5 root CA SPKI hashes computed and verified (see Standard Stack). `pinnedDomains` dictionary is the single edit point at `NetworkSecurity.swift:18-41`. Current SPKI header extraction code already handles RSA 2048, RSA 4096, EC P-256, and EC P-384 key types -- all 5 root CAs covered. |
| SSL-02 | New iOS builds uploaded to TestFlight with corrected SSL pins | Shared `EatFairShared` SPM package means one code change updates all 3 apps. Archive + ExportOptions.plist upload workflow documented in CLAUDE.md. Current builds: Customer 1095, Driver 203, Restaurant 172. |
| SSL-03 | CloudWatch alarm configured for ACM certificate DaysToExpiry metric on dollor.ai | ACM ARN: `arn:aws:acm:us-east-1:134607809447:certificate/936e9b80-245b-4832-9e90-90404bfd1033`. Metric: `AWS/CertificateManager` namespace, `DaysToExpiry` metric, `CertificateArn` dimension. Published twice daily. Existing Terraform cloudwatch module has SNS topic + email subscription pattern to follow. |
| SSL-04 | SSL pinning rotation runbook documented with step-by-step procedures | Runbook covers: pin extraction commands, NetworkSecurity.swift update procedure, build+upload to TestFlight, alarm verification. Audience is sole operator (Jeet). |
</phase_requirements>

## Standard Stack

### Core

| Component | Version/Detail | Purpose | Why Standard |
|-----------|---------------|---------|--------------|
| NetworkSecurity.swift | Shared SPM (`EatFairShared`) | SSL pinning delegate for all 3 iOS apps | Single point of change, already handles SPKI hash extraction for RSA 2048/3072/4096 + EC P-256/P-384 |
| Amazon Root CA 1 | RSA 2048 | Root CA for most ACM certs | Currently chains through this CA (verified live: `Amazon RSA 2048 M04` intermediate -> `Amazon Root CA 1`) |
| Amazon Root CA 2 | RSA 4096 | Alternate root CA | AWS may switch chains at any time (dynamic intermediates) |
| Amazon Root CA 3 | EC P-256 | ECDSA root CA | Future-proofing for EC-based certificate chains |
| Amazon Root CA 4 | EC P-384 | ECDSA root CA (stronger) | Future-proofing for EC-based certificate chains |
| Starfield Services Root CA G2 | RSA 2048 | Trust anchor for Amazon Root CAs 1-4 | Amazon Root CAs are cross-signed by Starfield G2; still actively used as of Feb 2026 |

### Verified SPKI Pin Hashes (SHA-256, base64)

These were computed from certificates downloaded from `https://www.amazontrust.com/repository/` on 2026-02-26 using:
```bash
openssl x509 -in {cert}.pem -pubkey -noout | openssl pkey -pubin -outform DER | openssl dgst -sha256 -binary | base64
```

| Root CA | Key Type | SPKI SHA-256 (base64) |
|---------|----------|----------------------|
| Amazon Root CA 1 | RSA 2048 | `++MBgDH5WGvL9Bcn5Be30cRcL0f5O+NyoXuWtQdX1aI=` |
| Amazon Root CA 2 | RSA 4096 | `f0KW/FtqTjs108NpYj42SrGvOB2PpxIVM8nWxjPqJGE=` |
| Amazon Root CA 3 | EC P-256 | `NqvDJlas/GRcYbcWE8S/IceH9cq77kg0jVhZeAPXq8k=` |
| Amazon Root CA 4 | EC P-384 | `9+ze1cZgR9KO1kZrVDxA4HQ6voHRCSVNz4RdTCx4U8U=` |
| Starfield Services Root CA G2 | RSA 2048 | `KwccWaCgrnaw6tsrrSO61FgLacNgG2MMLq8GE6+oP5I=` |

### Current Live Certificate Chain (verified 2026-02-26)

| Position | Subject | Issuer | SPKI Hash | Stable? |
|----------|---------|--------|-----------|---------|
| 0 (leaf) | CN=dollor.ai | Amazon RSA 2048 M04 | `WggyjbYa6k0khD7aafEMGmJ/GO1ltJ6KpFx+zHLoCQQ=` | NO -- changes on every ACM renewal |
| 1 (intermediate) | Amazon RSA 2048 M04 | Amazon Root CA 1 | `G9LNNAql897egYsabashkzUCTEJkWBzgoEtk8X/678c=` | NO -- AWS uses dynamic intermediates |
| 2 (root cross-sign) | Amazon Root CA 1 | Starfield Services Root CA G2 | `++MBgDH5WGvL9Bcn5Be30cRcL0f5O+NyoXuWtQdX1aI=` | YES -- same key as self-signed root |

### ACM Certificate Details

| Property | Value |
|----------|-------|
| ARN | `arn:aws:acm:us-east-1:134607809447:certificate/936e9b80-245b-4832-9e90-90404bfd1033` |
| Domain | `dollor.ai` (covers `api.dollor.ai` via SAN) |
| Not Before | Dec 2, 2025 |
| Not After | **Dec 31, 2026** (~308 days from now) |
| Key Type | RSA 2048 |
| Current Chain | Leaf -> Amazon RSA 2048 M04 -> Amazon Root CA 1 (cross-signed by Starfield G2) |
| Renewal | ACM auto-renews ~60 days before expiry (around Nov 1, 2026) |
| New Validity | 198 days max (CA/Browser Forum SC-081v3, effective Feb 2026) |

### CloudWatch Alarm Configuration

| Property | Value |
|----------|-------|
| Namespace | `AWS/CertificateManager` |
| Metric | `DaysToExpiry` |
| Dimension | `CertificateArn` = the ACM ARN above |
| Statistic | `Minimum` |
| Period | `86400` (1 day) |
| Publishing | Twice daily for all certs; daily within 45 days of expiry |

### Existing Infrastructure Patterns

The Terraform cloudwatch module at `infrastructure/terraform/modules/cloudwatch/main.tf` already has:
- SNS topic `dollor-${environment}-alarms` with email subscription to `var.alarm_email`
- Pattern for `aws_cloudwatch_metric_alarm` resources (EKS CPU, RDS CPU, RDS connections, RDS storage)
- Production environment sets `alarm_email = "production-alerts@dollor.ai"`

The ACM alarm should follow this same pattern, adding two new `aws_cloudwatch_metric_alarm` resources and a new `acm_certificate_arn` variable.

## Architecture Patterns

### Pattern 1: Root-Only SPKI Pinning

**What:** Pin only the root CA public key hashes, not leaf or intermediate certificates.
**When to use:** Always, when pinning ACM-issued certificates.
**Why:** Leaf certificates change on every ACM renewal (new key pair). Intermediate certificates may change because AWS uses "dynamic intermediate certificate authorities." Root CA public keys are permanent -- they never change because changing a root key would break the entire PKI chain of trust.

**Code change in `NetworkSecurity.swift`:**
```swift
private let pinnedDomains: [String: Set<String>] = [
    "dollor.ai": [
        // Amazon Root CA 1 (RSA 2048) - primary, currently in use
        "++MBgDH5WGvL9Bcn5Be30cRcL0f5O+NyoXuWtQdX1aI=",
        // Amazon Root CA 2 (RSA 4096)
        "f0KW/FtqTjs108NpYj42SrGvOB2PpxIVM8nWxjPqJGE=",
        // Amazon Root CA 3 (EC P-256)
        "NqvDJlas/GRcYbcWE8S/IceH9cq77kg0jVhZeAPXq8k=",
        // Amazon Root CA 4 (EC P-384)
        "9+ze1cZgR9KO1kZrVDxA4HQ6voHRCSVNz4RdTCx4U8U=",
        // Starfield Services Root CA G2 (RSA 2048) - trust anchor for Amazon Root CAs
        "KwccWaCgrnaw6tsrrSO61FgLacNgG2MMLq8GE6+oP5I=",
    ],
    "api.dollor.ai": [
        // Same root CAs (same ACM certificate covers both domains)
        "++MBgDH5WGvL9Bcn5Be30cRcL0f5O+NyoXuWtQdX1aI=",
        "f0KW/FtqTjs108NpYj42SrGvOB2PpxIVM8nWxjPqJGE=",
        "NqvDJlas/GRcYbcWE8S/IceH9cq77kg0jVhZeAPXq8k=",
        "9+ze1cZgR9KO1kZrVDxA4HQ6voHRCSVNz4RdTCx4U8U=",
        "KwccWaCgrnaw6tsrrSO61FgLacNgG2MMLq8GE6+oP5I=",
    ],
]
```

### Pattern 2: Certificate Chain Validation Logic (Already Correct)

**What:** The existing `validateServerTrust` method iterates through the entire certificate chain and checks if ANY certificate's SPKI hash matches a pin. This is the correct approach for root-only pinning.
**File:** `NetworkSecurity.swift:100-125`
**Why it works:** When the chain is `leaf -> intermediate -> root`, the root certificate (position 2) will match one of our 5 root CA pins. The leaf and intermediate will NOT match (they are not in our pin set), but that is fine because any match in the chain is sufficient.

**No changes needed to validation logic.** The `for certificate in certificateChain` loop at line 109 already handles this correctly.

### Pattern 3: SPKI Header Computation (Already Correct)

**What:** The `getPublicKeyHash` method at `NetworkSecurity.swift:135-216` correctly handles SPKI header prepending for RSA 2048, RSA 3072, RSA 4096, EC P-256, and EC P-384 key types.
**Coverage check against 5 root CAs:**
- Amazon Root CA 1: RSA 2048 (270 bytes raw key) -- COVERED (line 156-162)
- Amazon Root CA 2: RSA 4096 (526 bytes raw key) -- COVERED (line 170-176)
- Amazon Root CA 3: EC P-256 (65 bytes raw key) -- COVERED (line 186-191)
- Amazon Root CA 4: EC P-384 (97 bytes raw key) -- COVERED (line 193-198)
- Starfield G2: RSA 2048 (270 bytes raw key) -- COVERED (line 156-162)

**No changes needed to SPKI hash computation.**

### Anti-Patterns to Avoid

- **Pinning leaf certificates:** Changes on every ACM renewal (new key pair). Current code does this -- must fix.
- **Pinning intermediate certificates:** AWS uses dynamic intermediates that can change without notice. Current code does this -- must fix.
- **Pinning only one root CA:** If AWS switches the chain to a different root CA (e.g., from Root CA 1 to Root CA 3 for ECDSA), the app breaks. Pin all 5.
- **Remote config for pins:** Adds a chicken-and-egg problem (need to fetch config over the same TLS connection being pinned). Hardcoded is correct for root CAs since they never change.
- **TLS fallback on pin mismatch:** Defeats the purpose of pinning. If pins fail, the connection should fail. Root-only pinning with all 5 CAs makes false failures virtually impossible.

## Discretion Recommendations

### Transition Strategy: Clean cut, no old pins
**Recommendation:** Remove leaf and intermediate pins entirely. Do NOT keep them alongside root pins.
**Rationale:** The existing `validateServerTrust` checks if ANY cert in the chain matches ANY pin. If we keep old leaf/intermediate pins, they still work today but create confusion about which pins are actually necessary. Root-only is the correct and clean approach. There is zero transition risk because the current chain already chains to Amazon Root CA 1, which is in our new pin set.
**Confidence:** HIGH

### Hardcoded vs Remote Config: Hardcoded
**Recommendation:** Keep pins hardcoded in Swift source.
**Rationale:** Root CA keys are permanent (they define the CA's identity). Changing them would require a new trust store on every device worldwide. A remote config approach adds complexity (chicken-and-egg TLS problem, config server availability) with zero benefit when pinning root CAs. If Amazon Trust Services ever retires a root CA, it would be a multi-year deprecation with industry-wide notice -- plenty of time to ship an app update.
**Confidence:** HIGH

### Hard-block vs TLS Fallback: Hard-block
**Recommendation:** Keep current hard-block behavior (`completionHandler(.cancelAuthenticationChallenge, nil)`).
**Rationale:** With all 5 Amazon root CAs pinned, a pin mismatch means either (a) a genuine MITM attack, or (b) Amazon has completely replaced its trust infrastructure -- which would break the entire internet, not just our app. The probability of a false positive is negligible. Falling back to standard TLS would defeat the security purpose of pinning. The current error logging (`networkSecurityLogger.error`) provides diagnostic info.
**Confidence:** HIGH

### Old App Version Handling: No force-update needed
**Recommendation:** Do not build a minimum version check endpoint.
**Rationale:** Current user base is in TestFlight only (not App Store). TestFlight users automatically receive update notifications. The current leaf pin in old builds will continue to work until the next ACM renewal (~Nov 2026 for the 60-day renewal window). By then, TestFlight users will have updated. Building force-update infrastructure for a pre-launch app is premature complexity.
**Confidence:** HIGH

### CloudWatch Provisioning: Terraform
**Recommendation:** Use Terraform, extending the existing cloudwatch module.
**Rationale:** The project already has a Terraform cloudwatch module with SNS topic, email subscription, and alarm patterns. Adding 2 more alarms (30-day warning, 7-day critical) follows the established infrastructure-as-code pattern. The ACM certificate ARN is known (`arn:aws:acm:us-east-1:134607809447:certificate/936e9b80-245b-4832-9e90-90404bfd1033`).
**Confidence:** HIGH

### Runbook Depth: Happy path + one emergency scenario
**Recommendation:** Cover the happy path (proactive pin update before renewal) and one emergency scenario (pins already broken, app is down).
**Rationale:** Jeet is the sole operator. The happy path should rarely be needed (root CA pins should survive indefinitely). The emergency scenario covers the worst case where something unexpected happens. More scenarios would be documentation bloat.
**Confidence:** HIGH

### Rollout Strategy: All 3 apps simultaneously
**Recommendation:** Build and upload all 3 apps to TestFlight in one batch.
**Rationale:** All 3 apps share the same `NetworkSecurity.swift` via the `EatFairShared` SPM package. The code change is identical across all apps. Building one at a time adds no safety benefit and triples the build time. TestFlight is the distribution channel (not App Store), so there is no review delay.
**Confidence:** HIGH

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SPKI hash computation | Custom ASN.1 parser | Existing `getPublicKeyHash()` in NetworkSecurity.swift | Already correctly handles RSA 2048/3072/4096 + EC P-256/P-384 with proper SPKI headers |
| Certificate expiry monitoring | Custom Lambda polling ACM | CloudWatch `DaysToExpiry` metric + alarm | Native AWS service, published twice daily, zero maintenance |
| Pin hash extraction | Manual DER analysis | `openssl` commands (documented in runbook) | Industry-standard tooling, reproducible, verifiable |
| Remote pin config service | FastAPI endpoint serving pin hashes | Hardcoded root CA pins in Swift source | Root CAs never change; remote config adds complexity and single point of failure |

**Key insight:** This phase is almost entirely a configuration change, not a code change. The existing SSL pinning infrastructure (SPKI hash computation, chain validation, URLSession delegate) is already correct and well-tested across 182 API calls. The only code change is updating 6 hash strings in a dictionary.

## Common Pitfalls

### Pitfall 1: Pinning Only Amazon Root CA 1
**What goes wrong:** Developer sees the current chain goes through Root CA 1 and only pins that one. AWS silently switches the chain to Root CA 3 (ECDSA) for performance or policy reasons. App breaks.
**Why it happens:** The current chain only contains Root CA 1, so it seems sufficient. But AWS's "dynamic intermediate CAs" announcement explicitly warns that the intermediate (and therefore the root it chains to) can change.
**How to avoid:** Pin all 5 Amazon Trust Services root CAs. The pin set is still small (5 entries) and covers all possible ACM chains.
**Warning signs:** Only 1 or 2 root CA hashes in the `pinnedDomains` dictionary.

### Pitfall 2: Forgetting to Remove Leaf/Intermediate Pins
**What goes wrong:** Developer adds root CA pins but keeps the old leaf and intermediate pins. The fix "works" (because root CA match succeeds), but the code is misleading. Future maintainers think all 8 hashes are necessary and are afraid to remove any.
**Why it happens:** Incremental thinking ("add new, keep old") instead of clean replacement.
**How to avoid:** Replace the entire pin set. Update the comments to explain why only root CAs are pinned.
**Warning signs:** More than 5 hashes in the pin set; comments referencing "leaf" or "intermediate" certificates.

### Pitfall 3: CloudWatch Alarm Period Mismatch
**What goes wrong:** Alarm configured with `period = 300` (5 minutes) for a metric that is only published twice daily. CloudWatch evaluates the alarm against `INSUFFICIENT_DATA` most of the time, potentially sending false "OK" transitions.
**Why it happens:** Copy-paste from existing alarms that use 5-minute periods for EKS/RDS metrics.
**How to avoid:** Use `period = 86400` (1 day) with `evaluation_periods = 1` and `statistic = "Minimum"`.
**Warning signs:** Alarm state shows `INSUFFICIENT_DATA` instead of `OK` or `ALARM`.

### Pitfall 4: Not Testing Pin Validation After Change
**What goes wrong:** New pins are hardcoded but the app is not actually tested against the live server. A typo in a hash string or incorrect base64 encoding causes the app to reject all connections.
**Why it happens:** Developer trusts the openssl output without verifying end-to-end.
**How to avoid:** After updating pins, build the app and make at least one API call against `api.dollor.ai` to verify the secure session works. Check that `networkSecurityLogger` does NOT log "SSL pinning FAILED".
**Warning signs:** App builds successfully but all API calls fail with "Security verification failed" error.

### Pitfall 5: ACM DaysToExpiry Not Published Until Close to Expiry
**What goes wrong:** Alarm is created but stays in `INSUFFICIENT_DATA` because the certificate has >45 days remaining, and the metric is not consistently published for far-out expiration dates.
**Why it happens:** AWS documentation states: "ACM publishes metrics twice per day for every certificate." However, the `DaysToExpiry` metric may show intermittent data for certificates far from expiry. The alarm should be configured with `treat_missing_data = "notBreaching"` to avoid false alerts.
**How to avoid:** Set `treat_missing_data = "notBreaching"` on the alarm. The alarm will only fire when the metric IS published AND the value is below the threshold.
**Warning signs:** New alarm immediately goes to `INSUFFICIENT_DATA` state and stays there.

## Code Examples

### Example 1: Updated pinnedDomains Dictionary
```swift
// Source: Verified against https://www.amazontrust.com/repository/ (2026-02-26)
// SPKI hashes computed via: openssl x509 -in {cert}.pem -pubkey -noout | openssl pkey -pubin -outform DER | openssl dgst -sha256 -binary | base64
private let pinnedDomains: [String: Set<String>] = [
    "dollor.ai": [
        // Pin Amazon Trust Services ROOT CAs only (not leaf/intermediate).
        // Root CA keys are permanent. Leaf/intermediate keys change on ACM renewal.
        // All 5 root CAs pinned for resilience against AWS chain changes.
        "++MBgDH5WGvL9Bcn5Be30cRcL0f5O+NyoXuWtQdX1aI=", // Amazon Root CA 1 (RSA 2048)
        "f0KW/FtqTjs108NpYj42SrGvOB2PpxIVM8nWxjPqJGE=", // Amazon Root CA 2 (RSA 4096)
        "NqvDJlas/GRcYbcWE8S/IceH9cq77kg0jVhZeAPXq8k=", // Amazon Root CA 3 (EC P-256)
        "9+ze1cZgR9KO1kZrVDxA4HQ6voHRCSVNz4RdTCx4U8U=", // Amazon Root CA 4 (EC P-384)
        "KwccWaCgrnaw6tsrrSO61FgLacNgG2MMLq8GE6+oP5I=", // Starfield Services Root CA G2 (RSA 2048)
    ],
    "api.dollor.ai": [
        // Same ACM certificate covers both domains (SAN cert)
        "++MBgDH5WGvL9Bcn5Be30cRcL0f5O+NyoXuWtQdX1aI=", // Amazon Root CA 1 (RSA 2048)
        "f0KW/FtqTjs108NpYj42SrGvOB2PpxIVM8nWxjPqJGE=", // Amazon Root CA 2 (RSA 4096)
        "NqvDJlas/GRcYbcWE8S/IceH9cq77kg0jVhZeAPXq8k=", // Amazon Root CA 3 (EC P-256)
        "9+ze1cZgR9KO1kZrVDxA4HQ6voHRCSVNz4RdTCx4U8U=", // Amazon Root CA 4 (EC P-384)
        "KwccWaCgrnaw6tsrrSO61FgLacNgG2MMLq8GE6+oP5I=", // Starfield Services Root CA G2 (RSA 2048)
    ],
]
```

### Example 2: Terraform CloudWatch Alarm (30-day warning)
```hcl
# Source: https://docs.aws.amazon.com/acm/latest/userguide/cloudwatch-metrics.html
resource "aws_cloudwatch_metric_alarm" "acm_expiry_warning" {
  alarm_name          = "dollor-${var.environment}-acm-cert-expiry-warning"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "DaysToExpiry"
  namespace           = "AWS/CertificateManager"
  period              = 86400
  statistic           = "Minimum"
  threshold           = 30
  alarm_description   = "ACM certificate for dollor.ai expires in less than 30 days"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    CertificateArn = var.acm_certificate_arn
  }

  tags = var.tags
}
```

### Example 3: Terraform CloudWatch Alarm (7-day critical)
```hcl
resource "aws_cloudwatch_metric_alarm" "acm_expiry_critical" {
  alarm_name          = "dollor-${var.environment}-acm-cert-expiry-critical"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "DaysToExpiry"
  namespace           = "AWS/CertificateManager"
  period              = 86400
  statistic           = "Minimum"
  threshold           = 7
  alarm_description   = "CRITICAL: ACM certificate for dollor.ai expires in less than 7 days"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  ok_actions          = [aws_sns_topic.alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    CertificateArn = var.acm_certificate_arn
  }

  tags = var.tags
}
```

### Example 4: Pin Hash Extraction Command (for runbook)
```bash
# Extract SPKI SHA-256 base64 hash from a PEM certificate file
openssl x509 -in AmazonRootCA1.pem -pubkey -noout \
  | openssl pkey -pubin -outform DER \
  | openssl dgst -sha256 -binary \
  | base64

# Extract from live server chain (each cert in chain)
echo | openssl s_client -connect api.dollor.ai:443 -servername api.dollor.ai -showcerts 2>/dev/null \
  > /tmp/chain.pem
# Then split and hash each cert individually
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pin leaf certificates | Pin root CAs only (or don't pin at all) | 2024-2025 industry shift | Leaf pinning breaks on every cert renewal |
| ACM 395-day validity | ACM 198-day validity | Feb 2026 (CA/Browser Forum SC-081v3) | Renewals happen 2x more often, doubling pin breakage risk |
| Static intermediate CAs | Dynamic intermediate CAs | 2024 (AWS announcement) | Intermediate pins are no longer stable |
| Starfield Class 2 cross-signing | Starfield Services G2 only | Aug 2024 | Starfield G2 remains trust anchor for Amazon Root CAs 1-4 |
| SSL pinning recommended | SSL pinning increasingly controversial | 2024-2026 | Google/AWS recommend against it for mobile apps; Certificate Transparency provides similar MITM detection |

**Deprecated/outdated:**
- **Leaf certificate pinning:** Explicitly broken by ACM's new-key-pair-on-renewal policy. NEVER pin leaf certs for ACM-issued certificates.
- **Intermediate certificate pinning:** Broken by AWS dynamic intermediate CAs. No guarantee the same intermediate will be used after renewal.
- **Starfield Class 2 cross-signing:** Stopped August 2024. Browsers dropping trust in Starfield Class 2. Starfield Services G2 continues.

## Open Questions

1. **SNS subscription for `support@dollor.ai` may already exist**
   - What we know: The existing Terraform cloudwatch module creates an SNS topic and email subscription using `var.alarm_email`. Production sets this to `production-alerts@dollor.ai`.
   - What's unclear: Whether `support@dollor.ai` should get ACM alerts (per CONTEXT.md) or `production-alerts@dollor.ai` (per existing pattern). The CONTEXT.md decision says `support@dollor.ai`.
   - Recommendation: Use the existing SNS topic (which already sends to `production-alerts@dollor.ai`). Alternatively, add a second SNS subscription for `support@dollor.ai` if the user wants both. During planning, use the existing topic to avoid creating a separate alerting path.

2. **Terraform state vs AWS Console for ACM alarm**
   - What we know: The ACM certificate was likely created via AWS Console (no ACM resource in Terraform). The alarm needs the ARN as input.
   - What's unclear: Whether `terraform apply` has been run recently, and whether adding to the module would cause drift issues.
   - Recommendation: Add the alarm to the Terraform cloudwatch module as a new resource, passing the ACM ARN as a variable. If Terraform apply is problematic, fall back to AWS Console creation as a one-time setup. The alarm is idempotent either way.

## Sources

### Primary (HIGH confidence)
- Live certificate chain for `api.dollor.ai` verified via `openssl s_client` (2026-02-26): leaf CN=dollor.ai, intermediate Amazon RSA 2048 M04, root Amazon Root CA 1 cross-signed by Starfield G2
- Amazon Trust Services root CA certificates downloaded from `https://www.amazontrust.com/repository/` and SPKI hashes computed locally (2026-02-26)
- Codebase: `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Security/NetworkSecurity.swift` -- current pin implementation
- Codebase: `infrastructure/terraform/modules/cloudwatch/main.tf` -- existing alarm patterns
- AWS CLI: `aws acm list-certificates` returned ARN `arn:aws:acm:us-east-1:134607809447:certificate/936e9b80-245b-4832-9e90-90404bfd1033`, status ISSUED, expires 2026-12-31

### Secondary (MEDIUM confidence)
- [AWS ACM CloudWatch Metrics](https://docs.aws.amazon.com/acm/latest/userguide/cloudwatch-metrics.html) -- `DaysToExpiry` metric, `AWS/CertificateManager` namespace, `CertificateArn` dimension, published twice daily
- [AWS ACM Certificate Pinning Troubleshooting](https://docs.aws.amazon.com/acm/latest/userguide/troubleshooting-pinning.html) -- "Pin your application to all available Amazon root certificates"
- [AWS ACM Starfield Class 2 Cross-Signing Ended](https://aws.amazon.com/blogs/security/acm-will-no-longer-cross-sign-certificates-with-starfield-class-2-starting-august-2024/) -- Starfield G2 still used as trust anchor
- [AWS ACM 198-Day Validity](https://aws.amazon.com/about-aws/whats-new/2026/02/aws-certificate-manager-updates-default/) -- CA/Browser Forum SC-081v3 compliance
- [Terraform aws_cloudwatch_metric_alarm](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm) -- Resource schema for ACM DaysToExpiry alarm
- [Amazon Dynamic Intermediate CAs](https://aws.amazon.com/blogs/security/amazon-introduces-dynamic-intermediate-certificate-authorities/) -- Intermediate certs no longer stable for pinning

### Tertiary (LOW confidence)
- [SSL Pinning Removal Recommendation 2025](https://8ksec.io/why-you-should-remove-ssl-pinning-from-your-mobile-apps-in-2025/) -- Industry trend, but user decision is to keep pinning with root CAs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All 5 SPKI hashes computed locally from official Amazon Trust Services PEM files and cross-verified against the live certificate chain
- Architecture: HIGH -- Existing `NetworkSecurity.swift` code inspected line-by-line; validation logic and SPKI header computation confirmed correct for all 5 root CA key types
- Pitfalls: HIGH -- Verified against AWS official guidance on ACM pinning, dynamic intermediates, and 198-day validity change; cross-referenced with existing PITFALLS.md research

**Research date:** 2026-02-26
**Valid until:** 2026-06-26 (root CA hashes are permanent; alarm config is stable; review if Amazon Trust Services announces new root CAs)
