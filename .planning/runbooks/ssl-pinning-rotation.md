# SSL Pinning Rotation Runbook

**Last updated:** 2026-02-26
**Audience:** Jeet (sole operator)
**File:** `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Security/NetworkSecurity.swift`

---

## Current Pin Hashes (Root CAs Only)

All 5 Amazon Trust Services root CA SPKI SHA-256 hashes. These are permanent -- root CA keys never change.

| Root CA | Key Type | SPKI SHA-256 (base64) |
|---------|----------|----------------------|
| Amazon Root CA 1 | RSA 2048 | `++MBgDH5WGvL9Bcn5Be30cRcL0f5O+NyoXuWtQdX1aI=` |
| Amazon Root CA 2 | RSA 4096 | `f0KW/FtqTjs108NpYj42SrGvOB2PpxIVM8nWxjPqJGE=` |
| Amazon Root CA 3 | EC P-256 | `NqvDJlas/GRcYbcWE8S/IceH9cq77kg0jVhZeAPXq8k=` |
| Amazon Root CA 4 | EC P-384 | `9+ze1cZgR9KO1kZrVDxA4HQ6voHRCSVNz4RdTCx4U8U=` |
| Starfield Services Root CA G2 | RSA 2048 | `KwccWaCgrnaw6tsrrSO61FgLacNgG2MMLq8GE6+oP5I=` |

Source: Downloaded from `https://www.amazontrust.com/repository/` on 2026-02-26.

---

## Pin Extraction Commands

### Extract SPKI hash from a PEM certificate file

```bash
openssl x509 -in AmazonRootCA1.pem -pubkey -noout \
  | openssl pkey -pubin -outform DER \
  | openssl dgst -sha256 -binary \
  | base64
```

### Extract full chain from live server

```bash
# Dump the entire certificate chain to a file
echo | openssl s_client -connect api.dollor.ai:443 \
  -servername api.dollor.ai -showcerts 2>/dev/null > /tmp/chain.pem

# View the chain (shows subject/issuer for each cert)
openssl s_client -connect api.dollor.ai:443 \
  -servername api.dollor.ai -showcerts 2>/dev/null \
  | grep -E "s:|i:"
```

### Extract SPKI hash from each certificate in the chain

```bash
# Split /tmp/chain.pem into individual certs, then hash each:
csplit -f /tmp/cert- -b '%02d.pem' /tmp/chain.pem \
  '/-----BEGIN CERTIFICATE-----/' '{*}' 2>/dev/null

for f in /tmp/cert-*.pem; do
  [ -s "$f" ] || continue
  echo "=== $f ==="
  openssl x509 -in "$f" -subject -issuer -noout 2>/dev/null
  openssl x509 -in "$f" -pubkey -noout 2>/dev/null \
    | openssl pkey -pubin -outform DER 2>/dev/null \
    | openssl dgst -sha256 -binary \
    | base64
  echo ""
done
```

### Download fresh root CA PEMs from Amazon

```bash
curl -sO https://www.amazontrust.com/repository/AmazonRootCA1.pem
curl -sO https://www.amazontrust.com/repository/AmazonRootCA2.pem
curl -sO https://www.amazontrust.com/repository/AmazonRootCA3.pem
curl -sO https://www.amazontrust.com/repository/AmazonRootCA4.pem
curl -sO https://www.amazontrust.com/repository/SFSRootCAG2.pem
```

---

## Happy Path: Proactive Pin Update

This should never be needed with root-only pinning. Root CA keys are permanent. However, if Amazon Trust Services ever retires a root CA or adds a new one (multi-year notice), follow these steps.

### 1. Download new root CA certificates

```bash
curl -sO https://www.amazontrust.com/repository/{NewRootCA}.pem
```

### 2. Compute SPKI hash

```bash
openssl x509 -in {NewRootCA}.pem -pubkey -noout \
  | openssl pkey -pubin -outform DER \
  | openssl dgst -sha256 -binary \
  | base64
```

### 3. Update NetworkSecurity.swift

Edit the `pinnedDomains` dictionary in:
```
apps/ios/eatfair-ios-shared/Sources/EatFairShared/Security/NetworkSecurity.swift
```

Add the new hash to both `dollor.ai` and `api.dollor.ai` pin sets. Add a comment with the root CA name and key type.

### 4. Build and test locally

```bash
cd /Users/jeet/doordash-p2p

# Build customer app (all 3 share the same NetworkSecurity.swift via EatFairShared SPM)
xcodebuild -workspace apps/ios/EatFair.xcworkspace \
  -scheme eatfaircustomer -configuration Release \
  -destination 'generic/platform=iOS' build
```

### 5. Archive and upload to TestFlight

```bash
# Customer
xcodebuild archive \
  -workspace apps/ios/customer/eatfaircustomer.xcworkspace \
  -scheme eatfaircustomer -configuration Release \
  -archivePath /tmp/dollor-archives/customer.xcarchive \
  -destination 'generic/platform=iOS' -allowProvisioningUpdates

xcodebuild -exportArchive \
  -archivePath /tmp/dollor-archives/customer.xcarchive \
  -exportOptionsPlist apps/ios/customer/ExportOptions.plist \
  -exportPath /tmp/dollor-ipas/customer \
  -allowProvisioningUpdates \
  -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8 \
  -authenticationKeyID 9K626GB728 \
  -authenticationKeyIssuerID 80d10e49-f379-462f-9668-5ea53016812e

# Repeat for driver and restaurant apps
```

### 6. Verify on TestFlight

Install the updated app from TestFlight. Make an API call (e.g., login). Confirm the call succeeds. Check Xcode console for absence of "SSL pinning FAILED" log messages.

### 7. Update this runbook

Add the new hash to the "Current Pin Hashes" table above. Update the "Last updated" date.

---

## Emergency: Pins Broken, App Is Down

**Symptom:** All API calls fail. App shows connectivity errors. Backend is healthy (curl from terminal works). Xcode logs show "SSL pinning FAILED for {domain}" from `networkSecurityLogger`.

### 1. Confirm it is a pin mismatch (not a backend outage)

```bash
# This should succeed (no pinning)
curl -s https://api.dollor.ai/health

# Check the current live certificate chain
openssl s_client -connect api.dollor.ai:443 \
  -servername api.dollor.ai -showcerts 2>/dev/null \
  | grep -E "s:|i:"
```

If curl works but the app does not, it is a pin mismatch.

### 2. Extract the new chain hashes

```bash
echo | openssl s_client -connect api.dollor.ai:443 \
  -servername api.dollor.ai -showcerts 2>/dev/null > /tmp/chain.pem

# Hash each cert in the chain
csplit -f /tmp/cert- -b '%02d.pem' /tmp/chain.pem \
  '/-----BEGIN CERTIFICATE-----/' '{*}' 2>/dev/null

for f in /tmp/cert-*.pem; do
  [ -s "$f" ] || continue
  echo "=== $f ==="
  openssl x509 -in "$f" -subject -issuer -noout 2>/dev/null
  openssl x509 -in "$f" -pubkey -noout 2>/dev/null \
    | openssl pkey -pubin -outform DER 2>/dev/null \
    | openssl dgst -sha256 -binary \
    | base64
  echo ""
done
```

### 3. Compare with current pins

Cross-reference the extracted hashes against the "Current Pin Hashes" table above. If the root CA hash in the chain does NOT match any of the 5 hashes, Amazon has changed root CAs (extremely unlikely but possible).

### 4. Update pins and emergency build

Edit `NetworkSecurity.swift` `pinnedDomains` with the new root CA hash(es). Build, archive, and upload to TestFlight immediately (follow steps 3-5 from Happy Path above).

### 5. Investigate root cause

- Check if ACM renewed the certificate: `aws acm describe-certificate --certificate-arn arn:aws:acm:us-east-1:134607809447:certificate/936e9b80-245b-4832-9e90-90404bfd1033 --query 'Certificate.{NotBefore:NotBefore,NotAfter:NotAfter,Issuer:Issuer}'`
- Check if the root CA changed (compare issuer in chain vs expected)
- Check Amazon Trust Services announcements: `https://www.amazontrust.com/repository/`

---

## CloudWatch Alarm Response

### When the 30-day warning alarm fires

**Alarm:** `dollor-production-acm-cert-expiry-warning`
**Meaning:** ACM certificate expires in less than 30 days. ACM should auto-renew ~60 days before expiry, so this alarm firing means auto-renewal may have failed.

**Steps:**
1. Check ACM console for renewal status:
   ```bash
   aws acm describe-certificate \
     --certificate-arn arn:aws:acm:us-east-1:134607809447:certificate/936e9b80-245b-4832-9e90-90404bfd1033 \
     --query 'Certificate.{Status:Status,RenewalSummary:RenewalSummary,NotAfter:NotAfter}'
   ```
2. If `RenewalSummary.RenewalStatus` is `PENDING_VALIDATION` -- DNS validation may have failed. Check Route 53 CNAME records.
3. If `RenewalSummary.RenewalStatus` is `SUCCESS` -- the alarm will auto-clear as the new cert's DaysToExpiry resets.
4. **No app update needed** with root-only pinning. ACM renewal changes the leaf cert but the root CA stays the same.

### When the 7-day critical alarm fires

**Alarm:** `dollor-production-acm-cert-expiry-critical`
**Meaning:** ACM certificate expires in less than 7 days. This is an emergency -- if it expires, HTTPS will break.

**Steps:**
1. Run the same `aws acm describe-certificate` command above.
2. If renewal is stuck, manually request a new certificate or fix DNS validation.
3. The app itself does NOT need updating (root CA pins survive renewal). The concern is HTTPS service continuity.
4. This alarm has `ok_actions` -- you will get a second notification when the alarm clears after successful renewal.

---

## Key Facts

- **Root CA pins are permanent.** Amazon Trust Services root CA keys never change. Only leaf and intermediate certs change on renewal.
- **ACM auto-renews ~60 days before expiry.** Current cert expires Dec 31, 2026. Auto-renewal expected ~Nov 1, 2026.
- **New ACM validity is 198 days** (CA/Browser Forum SC-081v3, Feb 2026). Renewals happen ~2x per year.
- **All 3 iOS apps share pins** via the `EatFairShared` SPM package. One code change updates all apps.
- **Validation logic checks ANY cert in chain.** The root cert (position 2 in chain) matches our pins. Leaf and intermediate do not need to match.
- **`getPublicKeyHash()` handles all key types:** RSA 2048, RSA 3072, RSA 4096, EC P-256, EC P-384. All 5 root CAs covered.
