# Next Session Prompt

Copy and paste this to start your next Claude Code session:

---

## Session Context

Continue from the previous session where we completed:

1. **Ollama Enterprise Training** - `dollor-customer` model trained with:
   - 35+ Kotlin data classes with @SerializedName
   - 45+ API endpoints with Retrofit annotations
   - Business model (matchmaking, pricing)
   - Build commands for all variants
   - App Store requirements

2. **Production APK Built** - Customer app successfully built:
   - Location: `/Users/jeet/StudioProjects/eatfair-android/app/build/outputs/apk/production/release/app-production-release.apk`
   - Size: 23MB
   - ProGuard enabled (logs stripped)

3. **Documentation Updated**:
   - `CLAUDE.md` - Updated with correct build commands and Ollama workflow
   - `.claude/training/README.md` - Complete training documentation
   - `.claude/training/Modelfile` - Enterprise training (240 lines)

## What's Left to Do

### Immediate (Before Play Store Submission)
- [ ] Sign the APK with release keystore
- [ ] Test demo login on production API (`demo.customer@dollor.ai`)
- [ ] Build AAB for Play Store: `./gradlew :app:bundleProductionRelease`
- [ ] Upload to Google Play Console

### Optional Improvements
- [ ] Create production network_security_config.xml (HTTPS only)
- [ ] Train Ollama for Driver and Restaurant apps
- [ ] Build iOS customer app for App Store

## Anti-Hallucination Workflow

Before any code changes, verify with Ollama:
```bash
ollama run dollor-customer "YOUR QUESTION HERE"
```

Key questions to ask:
- "What is the production API URL?" → https://api.dollor.ai
- "What gradle command builds production APK?" → ./gradlew :app:assembleProductionRelease
- "What is the customer demo account?" → demo.customer@dollor.ai / DemoCustomer2025!

## Quick Commands

```bash
# Verify Ollama is working
ollama run dollor-customer "What is Dollor.ai?"

# Build production APK
cd /Users/jeet/StudioProjects/eatfair-android
./gradlew :app:assembleProductionRelease

# Build production AAB (Play Store)
./gradlew :app:bundleProductionRelease

# Test demo account on production
curl -X POST https://api.dollor.ai/api/auth/customer/login \
  -d "username=demo.customer@dollor.ai&password=DemoCustomer2025!"
```

---

## Start Next Session With

```
Continue from previous session. The customer Android app production APK is built (23MB).
Ollama model `dollor-customer` is trained with enterprise-level knowledge.

Next steps:
1. Sign APK with release keystore
2. Build AAB for Play Store
3. Upload to Google Play Console

Use `ollama run dollor-customer "question"` before any code changes to prevent hallucination.
```
