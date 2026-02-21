#!/bin/bash
# Build Config Validator - Ensures correct app configuration (READ-ONLY)
# Validates iOS (Customer, Driver, Restaurant) and Android builds
#
# Usage:
#   ./build-config-validator.sh              # Validate all
#   ./build-config-validator.sh --ios        # iOS only
#   ./build-config-validator.sh --android    # Android only
#   ./build-config-validator.sh --env prod   # Check production config
#   ./build-config-validator.sh --env staging # Check staging config

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

IOS_PATH="/Users/jeet/StudioProjects/eatfair-ios/apps/ios"
ANDROID_PATH="/Users/jeet/StudioProjects/eatfair-android"
IOS_CONFIG_PATH="$IOS_PATH/Config"
IOS_SHARED_PATH="$IOS_PATH/eatfair-ios-shared/Sources/EatFairShared"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║      🔧 BUILD CONFIG VALIDATOR (READ-ONLY)                     ║"
echo "║      Ensures correct app configuration for all environments    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Validation Started: $(date)"
echo ""

# Track issues
CRITICAL_COUNT=0
ERROR_COUNT=0
WARNING_COUNT=0

# Parse arguments
SCAN_IOS=true
SCAN_ANDROID=true
CHECK_ENV=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --ios) SCAN_ANDROID=false; shift ;;
        --android) SCAN_IOS=false; shift ;;
        --env) CHECK_ENV="$2"; shift 2 ;;
        *) shift ;;
    esac
done

# ============================================
# SECTION 1: iOS CONFIG FILE VALIDATION
# ============================================
if [ "$SCAN_IOS" = true ]; then
    echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${MAGENTA}  iOS BUILD CONFIGURATION VALIDATION                           ${NC}"
    echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
    echo ""

    # 1.1 Check xcconfig files exist
    echo -e "${YELLOW}[1.1] Configuration Files Existence${NC}"

    MISSING_CONFIG=""
    for config in "Development.xcconfig" "Staging.xcconfig" "Production.xcconfig"; do
        if [ -f "$IOS_CONFIG_PATH/$config" ]; then
            echo -e "${GREEN}   ✅ $config exists${NC}"
        else
            echo -e "${RED}   ❌ MISSING: $config${NC}"
            MISSING_CONFIG="$MISSING_CONFIG $config"
            ((CRITICAL_COUNT++))
        fi
    done

    # 1.2 Validate Production Config
    echo ""
    echo -e "${YELLOW}[1.2] Production Configuration Validation${NC}"

    if [ -f "$IOS_CONFIG_PATH/Production.xcconfig" ]; then
        # Check API URL is production
        PROD_API=$(grep "API_BASE_URL" "$IOS_CONFIG_PATH/Production.xcconfig" | grep -v "//" || true)
        if echo "$PROD_API" | grep -q "api.dollor.ai"; then
            echo -e "${GREEN}   ✅ API_BASE_URL points to production (api.dollor.ai)${NC}"
        else
            echo -e "${RED}   ❌ CRITICAL: Production API_BASE_URL may be wrong${NC}"
            echo "      Found: $PROD_API"
            ((CRITICAL_COUNT++))
        fi

        # Check debug logging is OFF
        DEBUG_LOG=$(grep "ENABLE_DEBUG_LOGGING" "$IOS_CONFIG_PATH/Production.xcconfig" || true)
        if echo "$DEBUG_LOG" | grep -q "NO"; then
            echo -e "${GREEN}   ✅ Debug logging disabled in production${NC}"
        else
            echo -e "${RED}   ❌ CRITICAL: Debug logging should be NO in production${NC}"
            ((CRITICAL_COUNT++))
        fi

        # Check mock data is OFF
        MOCK_DATA=$(grep "ENABLE_MOCK_DATA" "$IOS_CONFIG_PATH/Production.xcconfig" || true)
        if echo "$MOCK_DATA" | grep -q "NO"; then
            echo -e "${GREEN}   ✅ Mock data disabled in production${NC}"
        else
            echo -e "${RED}   ❌ CRITICAL: Mock data should be NO in production${NC}"
            ((CRITICAL_COUNT++))
        fi

        # Check dummy payment is OFF
        DUMMY_PAY=$(grep "IS_DUMMY_PAYMENT_MODE" "$IOS_CONFIG_PATH/Production.xcconfig" || true)
        if echo "$DUMMY_PAY" | grep -q "NO"; then
            echo -e "${GREEN}   ✅ Dummy payment mode disabled in production${NC}"
        else
            echo -e "${RED}   ❌ CRITICAL: Dummy payment should be NO in production${NC}"
            ((CRITICAL_COUNT++))
        fi

        # Check bundle ID has no suffix
        BUNDLE_SUFFIX=$(grep "BUNDLE_ID_SUFFIX" "$IOS_CONFIG_PATH/Production.xcconfig" || true)
        if echo "$BUNDLE_SUFFIX" | grep -qE "BUNDLE_ID_SUFFIX\s*=\s*$"; then
            echo -e "${GREEN}   ✅ No bundle ID suffix in production${NC}"
        else
            echo -e "${YELLOW}   ⚠️ WARNING: Bundle ID suffix should be empty in production${NC}"
            echo "      Found: $BUNDLE_SUFFIX"
            ((WARNING_COUNT++))
        fi
    fi

    # 1.3 Validate Staging Config
    echo ""
    echo -e "${YELLOW}[1.3] Staging Configuration Validation${NC}"

    if [ -f "$IOS_CONFIG_PATH/Staging.xcconfig" ]; then
        # Check API URL is staging
        STAGING_API=$(grep "API_BASE_URL" "$IOS_CONFIG_PATH/Staging.xcconfig" | grep -v "//" || true)
        if echo "$STAGING_API" | grep -q "cloudfront.net\|staging"; then
            echo -e "${GREEN}   ✅ API_BASE_URL points to staging${NC}"
        else
            echo -e "${RED}   ❌ ERROR: Staging API_BASE_URL may be wrong${NC}"
            echo "      Found: $STAGING_API"
            ((ERROR_COUNT++))
        fi

        # Check bundle suffix is .staging
        STAGING_SUFFIX=$(grep "BUNDLE_ID_SUFFIX" "$IOS_CONFIG_PATH/Staging.xcconfig" || true)
        if echo "$STAGING_SUFFIX" | grep -q ".staging"; then
            echo -e "${GREEN}   ✅ Bundle ID suffix is .staging${NC}"
        else
            echo -e "${RED}   ❌ ERROR: Staging should have .staging bundle suffix${NC}"
            ((ERROR_COUNT++))
        fi
    fi

    # 1.4 Check for hardcoded URLs in AppConfig.swift
    echo ""
    echo -e "${YELLOW}[1.4] AppConfig.swift Hardcoded URL Check${NC}"

    if [ -f "$IOS_SHARED_PATH/AppConfig.swift" ]; then
        # Check for hardcoded production URL outside of config
        HARDCODED=$(grep -n "https://api.dollor.ai\|https://d34u5ixl0bulv4" "$IOS_SHARED_PATH/AppConfig.swift" | grep -v "//" | head -5 || true)
        if [ -n "$HARDCODED" ]; then
            echo -e "${YELLOW}   ⚠️ WARNING: Hardcoded URLs in AppConfig.swift:${NC}"
            echo "$HARDCODED" | while read line; do echo "      $line"; done
            ((WARNING_COUNT++))
        else
            echo -e "${GREEN}   ✅ No unexpected hardcoded URLs${NC}"
        fi
    fi

    # 1.5 Check each app's project for correct config reference
    echo ""
    echo -e "${YELLOW}[1.5] App Project Configuration References${NC}"

    for app in "customer/eatfaircustomer" "delivery/eatffairdelivery" "restaurant/eatffairrestaurant"; do
        APP_NAME=$(echo "$app" | cut -d'/' -f1)
        PROJECT_PATH="$IOS_PATH/$app.xcodeproj/project.pbxproj"

        if [ -f "$PROJECT_PATH" ]; then
            # Check if project references the config files
            if grep -q "xcconfig" "$PROJECT_PATH" 2>/dev/null; then
                echo -e "${GREEN}   ✅ $APP_NAME: References xcconfig files${NC}"
            else
                echo -e "${YELLOW}   ⚠️ $APP_NAME: May not use xcconfig files${NC}"
                ((WARNING_COUNT++))
            fi
        else
            echo -e "${BLUE}   ℹ️ $APP_NAME: Project file not found at expected path${NC}"
        fi
    done

    # 1.6 Check for environment mixing in code
    echo ""
    echo -e "${YELLOW}[1.6] Environment Mixing Detection${NC}"

    # Look for files that reference both staging and production URLs
    MIXED_FILES=""
    for swift_file in $(find "$IOS_PATH" -name "*.swift" -type f 2>/dev/null | grep -v "build/" | grep -v "Pods" | grep -v "SourcePackages" | grep -v "Config"); do
        HAS_PROD=$(grep -l "api.dollor.ai" "$swift_file" 2>/dev/null || true)
        HAS_STAGING=$(grep -l "cloudfront.net\|staging" "$swift_file" 2>/dev/null || true)
        if [ -n "$HAS_PROD" ] && [ -n "$HAS_STAGING" ]; then
            MIXED_FILES="$MIXED_FILES\n   $(basename $swift_file)"
        fi
    done

    if [ -n "$MIXED_FILES" ]; then
        echo -e "${YELLOW}   ⚠️ WARNING: Files with both staging AND production URLs:${NC}"
        echo -e "$MIXED_FILES"
        ((WARNING_COUNT++))
    else
        echo -e "${GREEN}   ✅ No environment mixing detected${NC}"
    fi

    # 1.7 Bundle ID Consistency Check
    echo ""
    echo -e "${YELLOW}[1.7] Bundle ID Consistency${NC}"

    echo "   Expected Bundle IDs:"
    echo "   ├── Customer:   com.dollorai.customer[.staging|.dev]"
    echo "   ├── Restaurant: com.dollorai.restaurant[.staging|.dev]"
    echo "   └── Driver:     com.dollorai.delivery[.staging|.dev]"

    # Check Appfile
    if [ -f "$IOS_PATH/fastlane/Appfile" ]; then
        CUSTOMER_ID=$(grep "com.dollorai.customer" "$IOS_PATH/fastlane/Appfile" || true)
        RESTAURANT_ID=$(grep "com.dollorai.restaurant" "$IOS_PATH/fastlane/Appfile" || true)
        DRIVER_ID=$(grep "com.dollorai.delivery" "$IOS_PATH/fastlane/Appfile" || true)

        if [ -n "$CUSTOMER_ID" ] && [ -n "$RESTAURANT_ID" ] && [ -n "$DRIVER_ID" ]; then
            echo -e "${GREEN}   ✅ All bundle IDs configured in Fastlane${NC}"
        else
            echo -e "${YELLOW}   ⚠️ Some bundle IDs may be missing in Fastlane${NC}"
            ((WARNING_COUNT++))
        fi
    fi

    # 1.8 Firebase Configuration Check
    echo ""
    echo -e "${YELLOW}[1.8] Firebase Configuration${NC}"

    for app in "customer" "delivery" "restaurant"; do
        GOOGLE_PLIST=$(find "$IOS_PATH/$app" -name "GoogleService-Info.plist" 2>/dev/null | grep -v "build/" | grep -v "Pods" | head -1)
        if [ -n "$GOOGLE_PLIST" ]; then
            echo -e "${GREEN}   ✅ $app: GoogleService-Info.plist found${NC}"

            # Check if it's production or staging
            if grep -q "dollor-production\|dollor-prod" "$GOOGLE_PLIST" 2>/dev/null; then
                echo -e "${BLUE}      → Points to PRODUCTION Firebase${NC}"
            elif grep -q "dollor-staging\|dollor-stag" "$GOOGLE_PLIST" 2>/dev/null; then
                echo -e "${BLUE}      → Points to STAGING Firebase${NC}"
            fi
        else
            echo -e "${YELLOW}   ⚠️ $app: GoogleService-Info.plist not found${NC}"
            ((WARNING_COUNT++))
        fi
    done
fi

# ============================================
# SECTION 2: ANDROID CONFIG VALIDATION
# ============================================
if [ "$SCAN_ANDROID" = true ] && [ -d "$ANDROID_PATH" ]; then
    echo ""
    echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${MAGENTA}  ANDROID BUILD CONFIGURATION VALIDATION                       ${NC}"
    echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
    echo ""

    # 2.1 Check AppConfig
    echo -e "${YELLOW}[2.1] AppConfig.kt Validation${NC}"

    ANDROID_CONFIG="$ANDROID_PATH/shared/src/main/java/ai/dollor/shared/config/AppConfig.kt"
    if [ -f "$ANDROID_CONFIG" ]; then
        # Check production URL
        PROD_URL=$(grep "PRODUCTION_API_URL\|PRODUCTION_BASE" "$ANDROID_CONFIG" | head -2 || true)
        if echo "$PROD_URL" | grep -q "api.dollor.ai"; then
            echo -e "${GREEN}   ✅ Production URL is api.dollor.ai${NC}"
        else
            echo -e "${RED}   ❌ CRITICAL: Production URL may be wrong${NC}"
            ((CRITICAL_COUNT++))
        fi

        # Check default initialization
        DEFAULT_INIT=$(grep "initialize.*PRODUCTION" "$ANDROID_CONFIG" || true)
        if [ -n "$DEFAULT_INIT" ]; then
            echo -e "${GREEN}   ✅ Default initialization uses production${NC}"
        fi
    else
        echo -e "${RED}   ❌ AppConfig.kt not found${NC}"
        ((ERROR_COUNT++))
    fi

    # 2.2 Check build.gradle for flavors
    echo ""
    echo -e "${YELLOW}[2.2] Build Flavors Check${NC}"

    for app in "app" "orderapp" "partner"; do
        GRADLE_FILE="$ANDROID_PATH/$app/build.gradle.kts"
        if [ ! -f "$GRADLE_FILE" ]; then
            GRADLE_FILE="$ANDROID_PATH/$app/build.gradle"
        fi

        if [ -f "$GRADLE_FILE" ]; then
            APP_NAME=$app
            if [ "$app" = "app" ]; then APP_NAME="customer"; fi
            if [ "$app" = "orderapp" ]; then APP_NAME="driver"; fi
            if [ "$app" = "partner" ]; then APP_NAME="restaurant"; fi

            # Check for staging/production flavors
            if grep -q "staging\|production" "$GRADLE_FILE" 2>/dev/null; then
                echo -e "${GREEN}   ✅ $APP_NAME: Has staging/production flavors${NC}"
            else
                echo -e "${YELLOW}   ⚠️ $APP_NAME: No build flavors detected${NC}"
                ((WARNING_COUNT++))
            fi
        fi
    done

    # 2.3 Check for hardcoded URLs in Android code
    echo ""
    echo -e "${YELLOW}[2.3] Hardcoded URL Detection${NC}"

    ANDROID_HARDCODED=$(grep -rn "https://api.dollor.ai\|https://d34u5ixl0bulv4" "$ANDROID_PATH" --include="*.kt" 2>/dev/null | grep -v "build/" | grep -v "AppConfig" | grep -v "test" | grep -v "//" | head -10 || true)

    if [ -n "$ANDROID_HARDCODED" ]; then
        echo -e "${YELLOW}   ⚠️ WARNING: Hardcoded URLs outside AppConfig:${NC}"
        echo "$ANDROID_HARDCODED" | head -5 | while read line; do echo "      $line"; done
        ((WARNING_COUNT++))
    else
        echo -e "${GREEN}   ✅ No hardcoded URLs outside AppConfig${NC}"
    fi

    # 2.4 Firebase Configuration
    echo ""
    echo -e "${YELLOW}[2.4] Firebase Configuration${NC}"

    for app in "app" "orderapp" "partner"; do
        GOOGLE_JSON=$(find "$ANDROID_PATH/$app/src" -name "google-services.json" 2>/dev/null | head -1)
        if [ -n "$GOOGLE_JSON" ]; then
            APP_NAME=$app
            if [ "$app" = "app" ]; then APP_NAME="customer"; fi
            if [ "$app" = "orderapp" ]; then APP_NAME="driver"; fi
            if [ "$app" = "partner" ]; then APP_NAME="restaurant"; fi

            echo -e "${GREEN}   ✅ $APP_NAME: google-services.json found${NC}"
        else
            APP_NAME=$app
            echo -e "${YELLOW}   ⚠️ $APP_NAME: google-services.json not found${NC}"
            ((WARNING_COUNT++))
        fi
    done

    # 2.5 Signing Configuration
    echo ""
    echo -e "${YELLOW}[2.5] Signing Configuration${NC}"

    if [ -f "$ANDROID_PATH/keystore.properties" ] || [ -f "$ANDROID_PATH/local.properties" ]; then
        echo -e "${GREEN}   ✅ Keystore properties file exists${NC}"
    else
        echo -e "${YELLOW}   ⚠️ keystore.properties not found (may use CI/CD secrets)${NC}"
    fi
fi

# ============================================
# SECTION 3: CROSS-PLATFORM CONSISTENCY
# ============================================
echo ""
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}  CROSS-PLATFORM CONFIGURATION CONSISTENCY                     ${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}[3.1] API URL Consistency${NC}"

# Get iOS production URL
IOS_PROD_URL=""
if [ -f "$IOS_CONFIG_PATH/Production.xcconfig" ]; then
    IOS_PROD_URL=$(grep "API_BASE_URL" "$IOS_CONFIG_PATH/Production.xcconfig" | grep -v "//" | sed 's/.*= *//' | tr -d ' ' || true)
fi

# Get Android production URL
ANDROID_PROD_URL=""
if [ -f "$ANDROID_PATH/shared/src/main/java/ai/dollor/shared/config/AppConfig.kt" ]; then
    ANDROID_PROD_URL=$(grep "PRODUCTION_API_URL\|PRODUCTION_BASE" "$ANDROID_PATH/shared/src/main/java/ai/dollor/shared/config/AppConfig.kt" | grep "https://" | head -1 | sed 's/.*"\(https:\/\/[^"]*\)".*/\1/' || true)
fi

echo "   iOS Production URL:     ${IOS_PROD_URL:-Not found}"
echo "   Android Production URL: ${ANDROID_PROD_URL:-Not found}"

if [ -n "$IOS_PROD_URL" ] && [ -n "$ANDROID_PROD_URL" ]; then
    # Normalize URLs for comparison (remove trailing slashes, /api suffix)
    IOS_NORMALIZED=$(echo "$IOS_PROD_URL" | sed 's/\/api$//' | sed 's/\/$//')
    ANDROID_NORMALIZED=$(echo "$ANDROID_PROD_URL" | sed 's/\/api$//' | sed 's/\/$//')

    if [ "$IOS_NORMALIZED" = "$ANDROID_NORMALIZED" ] || echo "$IOS_NORMALIZED $ANDROID_NORMALIZED" | grep -q "api.dollor.ai.*api.dollor.ai"; then
        echo -e "${GREEN}   ✅ Production URLs are consistent${NC}"
    else
        echo -e "${YELLOW}   ⚠️ WARNING: Production URLs may differ${NC}"
        ((WARNING_COUNT++))
    fi
fi

echo ""
echo -e "${YELLOW}[3.2] Feature Flag Consistency${NC}"

echo "   Checking key feature flags across platforms..."

# This is informational - just display what's configured
echo ""
echo "   ┌────────────────────┬─────────────────┬─────────────────┐"
echo "   │ Feature            │ iOS (Prod)      │ Android         │"
echo "   ├────────────────────┼─────────────────┼─────────────────┤"

if [ -f "$IOS_CONFIG_PATH/Production.xcconfig" ]; then
    IOS_ANALYTICS=$(grep "ENABLE_ANALYTICS" "$IOS_CONFIG_PATH/Production.xcconfig" | grep -o "YES\|NO" || echo "N/A")
    IOS_CRASH=$(grep "ENABLE_CRASH_REPORTING" "$IOS_CONFIG_PATH/Production.xcconfig" | grep -o "YES\|NO" || echo "N/A")
    IOS_DEBUG=$(grep "ENABLE_DEBUG_LOGGING" "$IOS_CONFIG_PATH/Production.xcconfig" | grep -o "YES\|NO" || echo "N/A")
else
    IOS_ANALYTICS="N/A"
    IOS_CRASH="N/A"
    IOS_DEBUG="N/A"
fi

printf "   │ %-18s │ %-15s │ %-15s │\n" "Analytics" "$IOS_ANALYTICS" "Check gradle"
printf "   │ %-18s │ %-15s │ %-15s │\n" "Crash Reporting" "$IOS_CRASH" "Check gradle"
printf "   │ %-18s │ %-15s │ %-15s │\n" "Debug Logging" "$IOS_DEBUG" "Check gradle"
echo "   └────────────────────┴─────────────────┴─────────────────┘"

# ============================================
# SECTION 4: COMMON CONFIGURATION MISTAKES
# ============================================
echo ""
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}  COMMON CONFIGURATION MISTAKES CHECK                          ${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}[4.1] Staging URL in Production Code${NC}"

# Check if any production config accidentally has staging URLs
if [ -f "$IOS_CONFIG_PATH/Production.xcconfig" ]; then
    STAGING_IN_PROD=$(grep "cloudfront.net\|staging\|-stag\|-dev" "$IOS_CONFIG_PATH/Production.xcconfig" | grep -v "//" || true)
    if [ -n "$STAGING_IN_PROD" ]; then
        echo -e "${RED}   ❌ CRITICAL: Staging/dev URLs found in Production.xcconfig:${NC}"
        echo "$STAGING_IN_PROD"
        ((CRITICAL_COUNT++))
    else
        echo -e "${GREEN}   ✅ No staging URLs in production config${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}[4.2] Production URL in Staging Code${NC}"

if [ -f "$IOS_CONFIG_PATH/Staging.xcconfig" ]; then
    PROD_IN_STAGING=$(grep "API_BASE_URL.*api.dollor.ai" "$IOS_CONFIG_PATH/Staging.xcconfig" | grep -v "//" || true)
    if [ -n "$PROD_IN_STAGING" ]; then
        echo -e "${RED}   ❌ CRITICAL: Production URL found in Staging.xcconfig:${NC}"
        echo "$PROD_IN_STAGING"
        ((CRITICAL_COUNT++))
    else
        echo -e "${GREEN}   ✅ No production URLs in staging config${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}[4.3] Test/Dummy Mode in Production${NC}"

if [ -f "$IOS_CONFIG_PATH/Production.xcconfig" ]; then
    TEST_MODE=$(grep -E "TEST|DUMMY|MOCK|DEBUG" "$IOS_CONFIG_PATH/Production.xcconfig" | grep "YES" | grep -v "//" || true)
    if [ -n "$TEST_MODE" ]; then
        echo -e "${RED}   ❌ CRITICAL: Test/debug modes enabled in production:${NC}"
        echo "$TEST_MODE"
        ((CRITICAL_COUNT++))
    else
        echo -e "${GREEN}   ✅ No test/debug modes in production${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}[4.4] Stripe Key Environment Check${NC}"

# Check for Stripe test keys in production contexts
STRIPE_TEST_IN_PROD=$(grep -rn "pk_test_\|sk_test_" "$IOS_PATH" --include="*.swift" 2>/dev/null | grep -v "build/" | grep -v "Pods" | grep -vi "staging\|dev\|test" | head -5 || true)
if [ -n "$STRIPE_TEST_IN_PROD" ]; then
    echo -e "${YELLOW}   ⚠️ WARNING: Stripe test keys found (verify they're not in production):${NC}"
    echo "$STRIPE_TEST_IN_PROD" | head -3
    ((WARNING_COUNT++))
else
    echo -e "${GREEN}   ✅ No obvious Stripe key issues${NC}"
fi

# ============================================
# SUMMARY
# ============================================
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "                 BUILD CONFIG VALIDATION SUMMARY"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Validation Completed: $(date)"
echo ""

if [ $CRITICAL_COUNT -gt 0 ]; then
    echo -e "${RED}🔴 CRITICAL: $CRITICAL_COUNT issues${NC}"
fi
if [ $ERROR_COUNT -gt 0 ]; then
    echo -e "${RED}🟠 ERRORS:   $ERROR_COUNT issues${NC}"
fi
if [ $WARNING_COUNT -gt 0 ]; then
    echo -e "${YELLOW}🟡 WARNINGS: $WARNING_COUNT issues${NC}"
fi

TOTAL=$((CRITICAL_COUNT + ERROR_COUNT + WARNING_COUNT))

echo ""
echo "───────────────────────────────────────────────────────────────"

if [ $CRITICAL_COUNT -gt 0 ]; then
    echo -e "${RED}❌ BUILD CONFIG VALIDATION FAILED${NC}"
    echo ""
    echo "CRITICAL issues that MUST be fixed:"
    echo "  • Production config must point to api.dollor.ai"
    echo "  • Debug/mock/test modes must be OFF in production"
    echo "  • No staging URLs in production config"
    echo ""
    exit 1
elif [ $ERROR_COUNT -gt 0 ]; then
    echo -e "${YELLOW}⚠️ BUILD CONFIG HAS ERRORS${NC}"
    echo ""
    echo "Please review and fix the errors above."
    exit 0
elif [ $WARNING_COUNT -gt 0 ]; then
    echo -e "${YELLOW}⚠️ BUILD CONFIG PASSED WITH WARNINGS${NC}"
    echo ""
    echo "Consider reviewing the warnings for best practices."
    exit 0
else
    echo -e "${GREEN}✅ BUILD CONFIG VALIDATION PASSED${NC}"
    echo ""
    echo "All configurations are correct!"
    exit 0
fi
