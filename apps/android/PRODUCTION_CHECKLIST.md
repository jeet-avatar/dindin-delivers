# Dollor.ai Production Checklist

## App Identity
| Item | Value | Status |
|------|-------|--------|
| App Name | Dollor.ai | ✅ |
| Company | Vibing World Inc | ✅ |
| Package ID | ai.dollor.customer | ✅ |
| Tagline | No Commission. Just $1. | ✅ |

---

## ✅ COMPLETED (Automated)

### Code & Configuration
- [x] Theme renamed: EatFair → Dollor
- [x] App class renamed: EatFairApp → DollorApp
- [x] AndroidManifest updated with DollorApp
- [x] Provider authority uses ${applicationId}
- [x] AppConfig supports staging/production URLs
- [x] Build flavors configured (staging/production)
- [x] ProGuard rules configured
- [x] Signing config ready (needs keystore)

### Play Store Content
- [x] Title: `app/src/main/play/listings/en-US/title.txt`
- [x] Short description: `app/src/main/play/listings/en-US/short-description.txt`
- [x] Full description: `app/src/main/play/listings/en-US/full-description.txt`
- [x] Release notes: `app/src/main/play/release-notes/en-US/default.txt`
- [x] Contact email: `app/src/main/play/contact-email.txt`
- [x] Contact website: `app/src/main/play/contact-website.txt`

### Legal Documents (Ready to host)
- [x] Privacy Policy: `docs/legal/PRIVACY_POLICY.md`
- [x] Terms of Service: `docs/legal/TERMS_OF_SERVICE.md`

### Documentation
- [x] Production Release Guide: `PRODUCTION_RELEASE_GUIDE.md`
- [x] Graphics Guide: `app/src/main/play/listings/en-US/graphics/README.md`

---

## ⏳ MANUAL STEPS REQUIRED

### Step 1: Firebase Configuration (5 min)
```
1. Go to Firebase Console → eatfair-app project
2. Project Settings → Add app → Android
3. Package name: ai.dollor.customer
4. Download google-services.json
5. Copy to: app/src/production/google-services.json
```

### Step 2: Generate Keystore (5 min)
```bash
cd /Users/jeet/StudioProjects/eatfair-android

keytool -genkey -v \
  -keystore dollor-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias dollor-customer \
  -dname "CN=Dollor.ai, OU=Mobile, O=Vibing World Inc, L=City, ST=State, C=US"
```

Then add to `local.properties`:
```properties
RELEASE_KEYSTORE_PATH=/Users/jeet/StudioProjects/eatfair-android/dollor-release.jks
RELEASE_KEYSTORE_PASSWORD=your_password
RELEASE_KEY_ALIAS=dollor-customer
RELEASE_KEY_PASSWORD=your_password
```

### Step 3: Host Legal Pages
Upload content from `docs/legal/` to:
- https://dollor.ai/privacy
- https://dollor.ai/terms
- https://dollor.ai/support (create FAQ page)

### Step 4: Create Graphics
Using Figma or Canva:
- [ ] Feature graphic (1024x500)
- [ ] Phone screenshots (min 2)
- [ ] Export app icon to 512x512 PNG

Save to: `app/src/main/play/listings/en-US/graphics/`

### Step 5: Build Release
```bash
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
./gradlew clean
./gradlew :app:bundleProductionRelease
```

Output: `app/build/outputs/bundle/productionRelease/app-production-release.aab`

### Step 6: Submit to Play Store
1. Create app in Play Console
2. Complete all required sections
3. Upload AAB
4. Submit for review

---

## Quick Reference

| Resource | Location |
|----------|----------|
| Production Guide | `PRODUCTION_RELEASE_GUIDE.md` |
| Play Store Content | `app/src/main/play/` |
| Legal Documents | `docs/legal/` |
| App Icons | `app/src/main/res/mipmap-*/` |
| Logo Vector | `app/src/main/res/drawable/ic_logo.xml` |

---

## Support Contacts

| Role | Email |
|------|-------|
| General Support | support@dollor.ai |
| Privacy | privacy@dollor.ai |
| Legal | legal@dollor.ai |

---

**Ready for Production!** Complete the 6 manual steps above.
