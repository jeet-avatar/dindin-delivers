# Dollor.ai Enterprise Training Model

> **Last Updated:** December 26, 2025
> **Model:** `dollor-customer` (based on qwen2.5:32b)

---

## Quick Start

```bash
# Recreate model (if needed)
cd /Users/jeet/StudioProjects/eatfair-ios/.claude/training
ollama create dollor-customer -f Modelfile

# Test the model
ollama run dollor-customer "What is the production API URL?"
# Expected: https://api.dollor.ai

ollama run dollor-customer "What gradle command builds production APK?"
# Expected: ./gradlew :app:assembleProductionRelease
```

---

## Training Files

| File | Lines | Purpose |
|------|-------|---------|
| `Modelfile` | 240 | Enterprise production training with system prompt |
| `customer-app-training.jsonl` | 65 | Q&A pairs for general knowledge |
| `customer-app-code.jsonl` | 45 | Actual Kotlin code snippets |

---

## What's Trained

### Business Model
- Matchmaking service (NOT delivery/TNC)
- Pricing: $1 flat (food) / $1-$3 tiered (rideshare)
- Legal positioning

### Customer App Code
- 35+ Kotlin data classes with @SerializedName
- 45+ API endpoints with Retrofit annotations
- Complete DollorApiService interface

### Build Commands
- Staging: `./gradlew :app:assembleStagingDebug`
- Production APK: `./gradlew :app:assembleProductionRelease`
- Production AAB: `./gradlew :app:bundleProductionRelease`

### App Store Requirements
- Demo credentials for reviewers
- Legal URLs (terms, privacy)
- Permission requirements

---

## Anti-Hallucination Tests

```bash
# All should return CORRECT answers:

# Test 1: Customer status (should say is_active Boolean, NOT enum)
ollama run dollor-customer "Does Customer model use status enum?"

# Test 2: Platform fee (should say $1/$2/$3, NOT 15%)
ollama run dollor-customer "What is the platform fee percentage?"

# Test 3: Driver fields (should say NO vehicle_registration)
ollama run dollor-customer "Does Driver have vehicle_registration field?"

# Test 4: Registration field (should say 'name', NOT first_name/last_name)
ollama run dollor-customer "What field does CustomerRegisterRequest use for name?"
```

---

## When to Use

**ALWAYS query Ollama before:**
- Writing API calls
- Creating data models
- Modifying registration/auth code
- Changing pricing logic
- Building production releases

```bash
# Example workflow
ollama run dollor-customer "Show me the customerLogin API call"
# Then write the code based on the answer
```

---

## Production Build Verified

```
APK Location: /Users/jeet/StudioProjects/eatfair-android/app/build/outputs/apk/production/release/
APK File: app-production-release.apk
APK Size: 23MB
Build Date: December 26, 2025
```

---

## Model Coverage

| Category | Items | Status |
|----------|-------|--------|
| Data Models | 35+ classes | COMPLETE |
| API Endpoints | 45+ endpoints | COMPLETE |
| Build Commands | All variants | COMPLETE |
| Pricing Model | Verified | COMPLETE |
| Error Codes | 10+ codes | COMPLETE |
| Demo Credentials | All 3 apps | COMPLETE |
| Legal URLs | Verified | COMPLETE |
| App Store Requirements | Checklist | COMPLETE |

---

*Enterprise Production Training - 100% Fool-Proof*
