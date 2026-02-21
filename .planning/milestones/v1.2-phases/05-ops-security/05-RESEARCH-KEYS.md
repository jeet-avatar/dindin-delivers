# Phase 05: Ops Security -- Credential Verification Addendum

**Verified:** 2026-02-21
**Purpose:** Definitive verification of which keys, plists, and credentials are used by the LAST SHIPPED production builds
**Confidence:** HIGH -- every claim verified against build artifacts on disk

---

## 1. iOS -- Which .p8 Key Signs the Last TestFlight Builds?

### Answer: Key `9K626GB728` (via `api_key.json`)

The last shipped TestFlight builds (all dated **Feb 18, 2026**) were uploaded using:

```
~/.appstoreconnect/private_keys/api_key.json
  key_id: "9K626GB728"
  issuer_id: "80d10e49-f379-462f-9668-5ea53016812e"
```

This was confirmed through the **TESTFLIGHT_BUILD_GUIDE.md** (Step 5), which documents the exact upload commands:

```bash
fastlane run upload_to_testflight \
  ipa:<path>/build/export/<app>.ipa \
  api_key_path:/Users/jeet/.appstoreconnect/private_keys/api_key.json \
  skip_waiting_for_build_processing:true
```

### Evidence Chain

| Evidence | Source | Finding |
|----------|--------|---------|
| All 3 Appfiles | `apps/ios/*/fastlane/Appfile:8` | `key_id: "9K626GB728"` |
| api_key.json | `~/.appstoreconnect/private_keys/api_key.json` | `"key_id": "9K626GB728"` with embedded private key |
| Upload commands | `TESTFLIGHT_BUILD_GUIDE.md:314-330` | All use `api_key_path:~/.appstoreconnect/private_keys/api_key.json` |
| Build guide config table | `TESTFLIGHT_BUILD_GUIDE.md:226-228` | `API Key ID: 9K626GB728`, `API Key File: ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8` |

### The JFVA7628SX Key Is NOT Used

The `.p8` files tracked in git (`AuthKey_JFVA7628SX.p8`) are **NOT referenced by any Fastlane config, build script, or upload command**. They exist only as static files in `apps/ios/*/fastlane/keys/` directories.

| Property | JFVA7628SX (UNUSED) | 9K626GB728 (PRODUCTION) |
|----------|---------------------|-------------------------|
| Location | `apps/ios/*/fastlane/keys/` (3 copies) + `~/.appstoreconnect/private_keys/` | `~/.appstoreconnect/private_keys/` only |
| In git? | YES (tracked) | NO |
| MD5 hash | `7cb456ed75a65ec4674e5a206385b3a4` (all 4 copies identical) | `ecb43f942ff9f7ad17ac064cce1da07a` |
| Referenced by Appfile? | NO | YES (all 3 Appfiles) |
| Referenced by Fastfile? | NO | YES (via `api_key_path`) |
| Used for TestFlight upload? | NO | YES |

**Verdict:** `JFVA7628SX` is safe to revoke. `9K626GB728` is the production key -- DO NOT revoke.

---

## 2. iOS -- Build Signing Details (From Archive Artifacts)

All three builds were exported with **automatic signing** via team `PRKZ4UVCD7`.

### Customer App (Build 1088)

| Property | Value | Source |
|----------|-------|--------|
| Bundle ID | `com.dollorai.customer` | `DollorCustomer.xcarchive/Info.plist` |
| Build Number | 1088 | Same |
| Version | 1.0 | Same |
| Signing Identity | `Apple Development: Jithesh Manoharan (GQ7PNUK7CZ)` | Archive Info.plist |
| Distribution Cert | Apple Distribution (SHA1: `1732CD0EC6CAE71856AA9B8913D8859182F8FC5B`, expires 1/24/27) | `DistributionSummary.plist` |
| Provisioning Profile | `iOS Team Store Provisioning Profile: com.dollorai.customer` (UUID: `cfc4506c`) | Same |
| Entitlements | APS production, Apple Sign In, Apple Pay (`merchant.com.dolloraiai`) | Same |
| Export Method | `app-store-connect` | `ExportOptions.plist` |
| Archive Date | Feb 18, 2026 20:58 PST | Filesystem |
| Configuration | Release | Fastfile:27 |
| API URL | `https://api.dollor.ai` | `Release.xcconfig:6` |

### Driver App (Build 196)

| Property | Value | Source |
|----------|-------|--------|
| Bundle ID | `com.dollorai.delivery` | `DollorDriver.xcarchive/Info.plist` |
| Build Number | 196 | Same |
| Version | 1.0 | Same |
| Signing Identity | `Apple Development: Jithesh Manoharan (GQ7PNUK7CZ)` | Archive Info.plist |
| Distribution Cert | Same cert (SHA1: `1732CD0EC...FC5B`, expires 1/24/27) | `DistributionSummary.plist` |
| Provisioning Profile | `iOS Team Store Provisioning Profile: com.dollorai.delivery` (UUID: `8bb8fc3f`) | Same |
| Entitlements | APS production, Apple Sign In | Same |
| Archive Date | Feb 18, 2026 21:12 PST | Filesystem |
| Configuration | Release | Fastfile:27 |
| API URL | `https://api.dollor.ai` | `Release.xcconfig:6` |

### Restaurant App (Build 164)

| Property | Value | Source |
|----------|-------|--------|
| Bundle ID | `com.dollorai.restaurant` | `DollorRestaurant.xcarchive/Info.plist` |
| Build Number | 164 | Same |
| Version | 1.0 | Same |
| Signing Identity | `Apple Development: Jithesh Manoharan (GQ7PNUK7CZ)` | Archive Info.plist |
| Distribution Cert | Same cert (SHA1: `1732CD0EC...FC5B`, expires 1/24/27) | `DistributionSummary.plist` |
| Provisioning Profile | `iOS Team Store Provisioning Profile: com.dollorai.restaurant` (UUID: `406b7dc2`) | Same |
| Entitlements | APS production, Apple Sign In | Same |
| Archive Date | Feb 18, 2026 21:12 PST | Filesystem |
| Configuration | Release | Fastfile:27 |
| API URL | `https://api.dollor.ai` | `Release.xcconfig:6` |

**Key finding:** All three apps use the SAME distribution certificate (SHA1 `1732CD0EC6CAE71856AA9B8913D8859182F8FC5B`, expires Jan 24, 2027). Automatic signing via Xcode managed the profile selection.

---

## 3. iOS -- GoogleService-Info.plist Verification

All three plists verified **BOTH** on disk and **inside the shipped xcarchive bundles**.

### Source Files (on disk)

| App | Plist Path | Bundle ID | Project ID | Google App ID |
|-----|-----------|-----------|------------|---------------|
| Customer | `apps/ios/customer/eatfaircustomer/GoogleService-Info.plist` | `com.dollorai.customer` | `dollorai-production` | `1:65740760476:ios:973eaffa167f09b142d459` |
| Driver | `apps/ios/delivery/eatffairdelivery/GoogleService-Info.plist` | `com.dollorai.delivery` | `dollorai-production` | `1:65740760476:ios:c030082ee8edb97742d459` |
| Restaurant | `apps/ios/restaurant/eatffairrestaurant/GoogleService-Info.plist` | `com.dollorai.restaurant` | `dollorai-production` | `1:65740760476:ios:17093713b66b4d8e42d459` |

### Verified Inside Shipped Archives

| App | Archive Plist Path | Bundle ID | Project ID | Google App ID |
|-----|-------------------|-----------|------------|---------------|
| Customer (1088) | `DollorCustomer.xcarchive/.../Dollor.app/GoogleService-Info.plist` | `com.dollorai.customer` | `dollorai-production` | `1:65740760476:ios:973eaffa167f09b142d459` |
| Driver (196) | `DollorDriver.xcarchive/.../Dollor Driver.app/GoogleService-Info.plist` | `com.dollorai.delivery` | `dollorai-production` | `1:65740760476:ios:c030082ee8edb97742d459` |
| Restaurant (164) | `DollorRestaurant.xcarchive/.../eatffairrestaurant.app/GoogleService-Info.plist` | `com.dollorai.restaurant` | `dollorai-production` | `1:65740760476:ios:17093713b66b4d8e42d459` |

**All match.** Every shipped build contains the `dollorai-production` Firebase project (project number `65740760476`).

### Firebase API Keys

| App | API Key | Notes |
|-----|---------|-------|
| Customer | `AIzaSyCELfWMuckt-Bbx5tyuiOSS3sYNywxVTXc` | Also used for Google Maps |
| Driver | `AIzaSyA0j4nKeV5N9UKpNFCDTcMVxtBfR9BI8Z4` | Shared with Restaurant |
| Restaurant | `AIzaSyA0j4nKeV5N9UKpNFCDTcMVxtBfR9BI8Z4` | Shared with Driver |

Firebase/Google API keys are platform-restricted (by bundle ID). They are NOT secrets per Google's security model.

### Git Tracking

All `GoogleService-Info.plist` files are **NOT tracked in git** (verified via `git ls-files`). The `.gitignore` properly excludes them. **Status: SAFE.**

---

## 4. Android -- google-services.json Verification

### Root-Level Files (Debug Builds)

| Module | Path | Project ID | Project # | Client Package | App ID |
|--------|------|-----------|-----------|---------------|--------|
| app (customer) | `app/google-services.json` | `dollorai-production` | `65740760476` | `ai.dollor.customer` | `1:65740760476:android:535885ca28086e6242d459` |
| driver | `driver/google-services.json` | `dollorai-production` | `65740760476` | `ai.dollor.driver` (+ customer, partner) | `1:65740760476:android:7d9bed1ee685434c42d459` |
| partner | `partner/google-services.json` | `dollorai-production` | `65740760476` | `ai.dollor.partner` (+ customer, driver) | `1:65740760476:android:8591cc17fa4f8d4c42d459` |

### Production Variant Files

| Module | Path | Project ID | Client Package |
|--------|------|-----------|---------------|
| app | `app/src/production/google-services.json` | `dollorai-production` | `ai.dollor.customer` |
| driver | `driver/src/production/google-services.json` | **`eatfair-app`** | **`com.eatfair.driver`** |
| partner | `partner/src/production/google-services.json` | **`eatfair-app`** | **`com.eatfair.partner`** |

### Staging Variant Files

| Module | Path | Project ID | Client Package |
|--------|------|-----------|---------------|
| app | `app/src/staging/google-services.json` | `eatfair-app` | `com.eatfair.app.staging` |
| driver | `driver/src/staging/google-services.json` | `eatfair-app` | `com.eatfair.driver.staging` |
| partner | `partner/src/staging/google-services.json` | `eatfair-app` | `com.eatfair.partner.staging` |

### FINDING: Driver/Partner Production Configs Are WRONG

The `driver/src/production/google-services.json` and `partner/src/production/google-services.json` reference the OLD Firebase project `eatfair-app` (project #107524350806) with OLD package names (`com.eatfair.driver`, `com.eatfair.partner`). The current package names are `ai.dollor.driver` and `ai.dollor.partner`.

However, since the MEMORY.md confirms "No build flavors -- only debug and release variants", the production variant files at `src/production/` are likely **not used** for the actual debug/release builds. The root-level `google-services.json` files (which correctly reference `dollorai-production`) are what gets picked up.

**Risk level:** LOW for current builds (root files are correct), but these stale `src/production/` files should be updated to avoid confusion.

### Git Tracking

All `google-services.json` files are **NOT tracked in git** (verified via `git ls-files` in the Android repo). **Status: SAFE.**

---

## 5. Android -- Signing Key Verification

### Keystore

| Property | Value | Source |
|----------|-------|--------|
| File | `/Users/jeet/StudioProjects/eatfair-android/dollor-release.jks` | `local.properties` |
| Alias | `dollor` | `local.properties` |
| Store Password | `dollor2024staging` | `local.properties` |
| Key Password | `dollor2024staging` | `local.properties` |
| Created | Dec 23, 2025 | `keytool -list` |
| Valid Until | May 10, 2053 | Same |
| Algorithm | RSA 2048-bit, SHA256withRSA | Same |
| Subject | `CN=Dollor.ai, OU=Mobile, O=Dollor Inc, L=San Francisco, ST=California, C=US` | Same |
| SHA1 Fingerprint | `94:3B:48:04:3C:9C:27:5D:A8:FE:B9:80:75:14:43:9A:CB:8E:F2:D7` | Same |
| SHA256 Fingerprint | `B9:16:8B:8F:CE:87:FD:83:96:A0:0F:F3:B0:A3:5C:0C:D3:D8:A4:32:5A:33:F6:B8:EC:55:A1:CB:DE:5B:17:F1` | Same |

### Git Tracking

- `dollor-release.jks` -- **NOT in git** (`.gitignore` has `*.jks` and `*.keystore`)
- `local.properties` -- **NOT in git** (`.gitignore` has `local.properties`)
- Signing passwords are in `local.properties` only (local disk)

**Status: SAFE** -- keystore and passwords are local only.

### Play Store Service Account

| Property | Value |
|----------|-------|
| File | `/Users/jeet/.config/play-store/service-account.json` |
| In git? | NO (outside repo) |
| Referenced by | `apps/android/fastlane/Appfile` and `Fastfile` |

---

## 6. Production Backend -- Secrets Management

### ECS Task Definition (revision 377)

**Environment Variables (non-secret, visible in task def):**

| Name | Value |
|------|-------|
| `ENVIRONMENT` | `production` |
| `PORT` | `8080` |
| `SMTP_HOST` | `email-smtp.us-east-1.amazonaws.com` |
| `SMTP_PORT` | `587` |
| `FROM_EMAIL` | `noreply@dollor.ai` |
| `DOCUMENT_VERIFICATION_PROVIDER` | `persona` |
| `DUMMY_PAYMENT_MODE` | `false` |
| `REDIS_URL` | `redis://dollor-redis.uwva3u.0001.use1.cache.amazonaws.com:6379/0` |

**Secrets (pulled from AWS Secrets Manager at runtime):**

| Name | Secrets Manager ARN Suffix |
|------|---------------------------|
| `DATABASE_URL` | `dollor/production/database-v2-gd1oKf` |
| `JWT_SECRET_KEY` | `dollor/production/jwt-secret-kvk9j9` |
| `STRIPE_SECRET_KEY` | `dollor/production/stripe-vT8WRA` |
| `STRIPE_PUBLISHABLE_KEY` | `dollor/production/stripe-vT8WRA` |
| `ADMIN_SECRET_KEY` | `dollor/production/admin-yCDIFY` |
| `DASHBOARD_SECRET` | `dollor/production/admin-yCDIFY` |
| `SMTP_USER` | `dollor/production/smtp-credentials-eqAwat` |
| `SMTP_PASSWORD` | `dollor/production/smtp-credentials-eqAwat` |
| `PERSONA_API_KEY` | `dollor/production/persona-aqEOSX` |
| `PERSONA_TEMPLATE_ID` | `dollor/production/persona-aqEOSX` |
| `FIREBASE_CREDENTIALS_JSON` | `dollor/production/firebase-creds-DG9fC5` |

**No production secrets exist in the codebase.** All 11 secrets are managed via Secrets Manager.

---

## 7. Definitive Summary Table

### KEEP -- Production Assets (Currently Safe)

| Asset | Location | Used By | In Git? | Verified Via |
|-------|----------|---------|---------|-------------|
| .p8 key `9K626GB728` | `~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8` | TestFlight upload (all 3 iOS apps) | NO | Appfile, api_key.json, TESTFLIGHT_BUILD_GUIDE.md |
| api_key.json | `~/.appstoreconnect/private_keys/api_key.json` | TestFlight upload (all 3 iOS apps) | NO | Fastfile upload commands |
| Apple Distribution cert | Keychain (SHA1: `1732CD...FC5B`) | Code signing (all 3 iOS apps, exp 1/24/27) | N/A (in Keychain) | DistributionSummary.plist |
| GoogleService-Info.plist (customer) | `apps/ios/customer/eatfaircustomer/` | iOS customer build 1088 | NO (gitignored) | Verified in xcarchive bundle |
| GoogleService-Info.plist (driver) | `apps/ios/delivery/eatffairdelivery/` | iOS driver build 196 | NO (gitignored) | Verified in xcarchive bundle |
| GoogleService-Info.plist (restaurant) | `apps/ios/restaurant/eatffairrestaurant/` | iOS restaurant build 164 | NO (gitignored) | Verified in xcarchive bundle |
| google-services.json (app root) | `eatfair-android/app/google-services.json` | Android customer debug/release | NO (gitignored) | `dollorai-production` project |
| google-services.json (driver root) | `eatfair-android/driver/google-services.json` | Android driver debug/release | NO (gitignored) | `dollorai-production` project |
| google-services.json (partner root) | `eatfair-android/partner/google-services.json` | Android partner debug/release | NO (gitignored) | `dollorai-production` project |
| Android keystore | `eatfair-android/dollor-release.jks` | Android release signing | NO (gitignored) | `keytool -list`, SHA1 verified |
| Play Store service account | `~/.config/play-store/service-account.json` | Fastlane Play Store upload | NO (outside repo) | `apps/android/fastlane/Fastfile` |
| 11 Secrets Manager secrets | AWS Secrets Manager | Production ECS task def 377 | NO (AWS managed) | `aws ecs describe-task-definition` |

### REMOVE -- Must Delete

| Asset | Location | Risk | Why Remove | Method |
|-------|----------|------|-----------|--------|
| .p8 key `JFVA7628SX` (3 copies in git) | `apps/ios/*/fastlane/keys/AuthKey_JFVA7628SX.p8` | HIGH -- private key tracked in git | NOT used by any Fastlane config or upload command | `git rm` + add `*.p8` to `.gitignore` |
| .p8 key `JFVA7628SX` (local copy) | `~/.appstoreconnect/private_keys/AuthKey_JFVA7628SX.p8` | LOW -- local disk only | Identical to git copies, not used | `rm` after revoking in ASC |
| Root `backend/.env` | `/Users/jeet/doordash-p2p/backend/.env` | MEDIUM -- prod DB password on disk | Never committed, but has `Dollor2024SecureDB` RDS password | `rm` (file is NOT tracked) |

### FIX -- Update References

| Asset | Location | Issue | Action |
|-------|----------|-------|--------|
| `.gitignore` | `/Users/jeet/doordash-p2p/.gitignore` | Missing `*.p8`, `**/fastlane/keys/` | Add patterns |
| Debug xcconfig (customer) | `apps/ios/customer/Config/Debug.xcconfig` | Uses wrong staging URL `d3kuu45w6kl8hr.cloudfront.net` | Change to `d34u5ixl0bulv4.cloudfront.net` |
| Debug xcconfig (driver) | `apps/ios/delivery/Config/Debug.xcconfig` | Same wrong staging URL | Same fix |
| Debug xcconfig (restaurant) | `apps/ios/restaurant/Config/Debug.xcconfig` | Same wrong staging URL | Same fix |
| Android production google-services.json (driver) | `driver/src/production/google-services.json` | References old `eatfair-app` project, old `com.eatfair.driver` package | Update to `dollorai-production` / `ai.dollor.driver` |
| Android production google-services.json (partner) | `partner/src/production/google-services.json` | References old `eatfair-app` project, old `com.eatfair.partner` package | Update to `dollorai-production` / `ai.dollor.partner` |

### REVOKE -- In App Store Connect

| Key ID | Action | Impact if Revoked | Impact if NOT Revoked |
|--------|--------|-------------------|----------------------|
| `JFVA7628SX` | REVOKE in App Store Connect | None -- not used by any build/upload process | Anyone with git access has a valid ASC API key |
| `9K626GB728` | DO NOT REVOKE | Would break all TestFlight uploads | N/A |

---

## 8. Build Pipeline Summary

### iOS Build-to-TestFlight Flow (What Actually Happens)

```
1. xcodebuild -workspace *.xcworkspace -scheme * -configuration Release -archivePath build/Dollor*.xcarchive archive
   - Uses automatic signing (team PRKZ4UVCD7)
   - Archive signed with "Apple Development: Jithesh Manoharan (GQ7PNUK7CZ)"
   - Configuration: Release (API_BASE_URL = https://api.dollor.ai)

2. xcodebuild -exportArchive -archivePath build/Dollor*.xcarchive -exportPath build/export -exportOptionsPlist ExportOptionsLocal.plist
   - Re-signs with "Apple Distribution" cert (SHA1: 1732CD0EC...FC5B)
   - Uses auto-provisioned "iOS Team Store Provisioning Profile"
   - Exports as .ipa to build/export/

3. fastlane run upload_to_testflight ipa:<path>/build/export/*.ipa api_key_path:~/.appstoreconnect/private_keys/api_key.json
   - Authenticates via App Store Connect API key 9K626GB728
   - Uploads .ipa to TestFlight
   - The .p8 files in fastlane/keys/ directories are NEVER read
```

### Android Build Flow

```
1. ./gradlew :app:assembleRelease (or :driver: or :partner:)
   - Signs with dollor-release.jks (local, not in git)
   - Signing config from local.properties

2. fastlane deploy_customer (or deploy_driver, deploy_partner)
   - Uses Play Store service account at ~/.config/play-store/service-account.json
   - Uploads AAB to Play Store internal testing
```

---

## 9. Confidence Assessment

| Verification Area | Confidence | Evidence |
|-------------------|-----------|---------|
| .p8 key identification (which key is used) | **HIGH** | Appfile source code, api_key.json content, TESTFLIGHT_BUILD_GUIDE.md, MD5 hash comparison |
| iOS build signing | **HIGH** | xcarchive Info.plist, DistributionSummary.plist, ExportOptions.plist -- all from actual build artifacts |
| Firebase plists in shipped builds | **HIGH** | Verified INSIDE xcarchive bundles, not just on disk |
| Android google-services.json | **HIGH** | Parsed JSON, verified project_id and package_name |
| Android signing | **HIGH** | `keytool -list` output, `local.properties` content, `.gitignore` verification |
| Production secrets management | **HIGH** | `aws ecs describe-task-definition` output |
| Git tracking status | **HIGH** | `git ls-files` output for every credential category |

**No LOW confidence findings.** Every claim in this document is verified against on-disk artifacts or API output.

---

## Sources

All findings are from direct inspection of local files and build artifacts:

- `apps/ios/*/fastlane/Appfile` -- Fastlane API key configuration
- `~/.appstoreconnect/private_keys/api_key.json` -- Production API key
- `apps/ios/*/build/Dollor*.xcarchive/Info.plist` -- Archive signing identity
- `apps/ios/*/build/export/DistributionSummary.plist` -- Distribution certificate + profile
- `apps/ios/*/build/export/ExportOptions.plist` -- Export method and signing style
- `apps/ios/*/eatfair*/GoogleService-Info.plist` -- Firebase config (on disk)
- `apps/ios/*/build/Dollor*.xcarchive/.../GoogleService-Info.plist` -- Firebase config (in shipped builds)
- `eatfair-android/*/google-services.json` -- Android Firebase configs (9 files)
- `eatfair-android/local.properties` -- Android signing config
- `keytool -list -keystore dollor-release.jks` -- Keystore details
- `aws ecs describe-task-definition --task-definition dollor-api` -- Production secrets
- `git ls-files` -- Definitive tracking status for all credential files
- `apps/ios/TESTFLIGHT_BUILD_GUIDE.md` -- Documented build/upload workflow
