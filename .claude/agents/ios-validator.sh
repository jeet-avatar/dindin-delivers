#!/bin/bash
# iOS Validator Agent - Automated validation script
# Run this after any iOS code changes
#
# Usage:
#   ./ios-validator.sh                    # Validate all iOS code
#   ./ios-validator.sh --changed          # Only changed files
#   ./ios-validator.sh path/to/file.swift # Specific file

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

IOS_PATH="/Users/jeet/StudioProjects/eatfair-ios/apps/ios"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║        🔍 iOS VALIDATOR AGENT (READ-ONLY)                 ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Track issues
CRITICAL_COUNT=0
ERROR_COUNT=0
WARNING_COUNT=0

# Get files to check
if [ "$1" == "--changed" ]; then
    FILES=$(git diff --name-only HEAD~1 | grep "apps/ios/.*\.swift$" | grep -v "Pods" | grep -v ".build" || true)
elif [ -n "$1" ]; then
    FILES="$1"
else
    # Exclude third-party code: Pods (CocoaPods), .build (SPM), Tests, _dead_code_backup
    FILES=$(find "$IOS_PATH" -name "*.swift" -type f \
        | grep -v "/Pods/" \
        | grep -v "/.build/" \
        | grep -v "/Tests/" \
        | grep -v "/_dead_code_backup/")
fi

if [ -z "$FILES" ]; then
    echo -e "${GREEN}✅ No Swift files to validate${NC}"
    exit 0
fi

FILE_COUNT=$(echo "$FILES" | wc -l | tr -d ' ')
echo -e "${BLUE}📁 Scanning $FILE_COUNT Swift file(s)...${NC}"
echo ""

# ============================================
# CHECK 1: HARDCODED URLS
# ============================================
echo -e "${YELLOW}[1/14] Configuration Check: Hardcoded URLs${NC}"

# Allow: Config files, ViewModels, test files, external links (terms, privacy, app store)
HARDCODED_URLS=$(grep -rn "https://.*dollor\|https://.*cloudfront\|http://" $IOS_PATH --include="*.swift" \
    | grep -v "/Pods/" \
    | grep -v "/.build/" \
    | grep -v "/Tests/" \
    | grep -v "Tests.swift" \
    | grep -v "_tests.swift" \
    | grep -v "AppConfig" \
    | grep -v "EnterpriseNetworkLayer" \
    | grep -v "ViewModel" \
    | grep -v "ViralFeatures" \
    | grep -v "ReferAndEarn" \
    | grep -v "// External link" \
    | grep -v "Link(" \
    | grep -v "webVerificationURL" \
    | grep -v "xcconfig" \
    | grep -v ".md" \
    | grep -v "replacingOccurrences" \
    | grep -v "/terms" \
    | grep -v "/privacy" \
    | grep -v "/app\"" \
    | grep -v "// Sample" \
    | grep -v "// Placeholder" \
    | grep -v "// Default" \
    | grep -v "// Example" \
    | grep -v "// STAGING" \
    | grep -v "static let baseURL" \
    | grep -v "stagingBaseURL" || true)

if [ -n "$HARDCODED_URLS" ]; then
    echo -e "${RED}   ❌ CRITICAL: Hardcoded URLs found:${NC}"
    echo "$HARDCODED_URLS" | head -5
    ((CRITICAL_COUNT++))
else
    echo -e "${GREEN}   ✅ No hardcoded URLs${NC}"
fi

# ============================================
# CHECK 2: HARDCODED API KEYS
# ============================================
echo -e "${YELLOW}[2/14] Security Check: Hardcoded API Keys${NC}"

API_KEYS=$(grep -rn "AIza\|sk-\|pk_\|sk_live\|pk_live" $IOS_PATH --include="*.swift" \
    | grep -v "/Pods/" \
    | grep -v "/.build/" \
    | grep -v "// " \
    | grep -v "starts(with:" \
    | grep -v "hasPrefix" \
    | grep -v "\.plist" || true)

if [ -n "$API_KEYS" ]; then
    echo -e "${RED}   ❌ CRITICAL: Potential API keys found:${NC}"
    echo "$API_KEYS" | head -5
    ((CRITICAL_COUNT++))
else
    echo -e "${GREEN}   ✅ No hardcoded API keys${NC}"
fi

# ============================================
# CHECK 3: MISSING WEAK SELF
# ============================================
echo -e "${YELLOW}[3/14] Memory Safety: Weak Self in Closures${NC}"

# Look for closures that capture self without [weak self]
# Focus on common patterns where memory leaks occur:
# 1. DispatchQueue closures using self
MISSING_WEAK_SELF=$(grep -rn "DispatchQueue.*{" $IOS_PATH --include="*.swift" -A 3 \
    | grep -v "/Pods/" \
    | grep -v "/.build/" \
    | grep "self\." \
    | grep -v "\[weak self\]" \
    | head -5 || true)

# 2. Timer closures using self
MISSING_WEAK_SELF2=$(grep -rn "Timer\." $IOS_PATH --include="*.swift" -A 3 \
    | grep -v "/Pods/" \
    | grep -v "/.build/" \
    | grep "self\." \
    | grep -v "\[weak self\]" \
    | head -5 || true)

if [ -n "$MISSING_WEAK_SELF" ] || [ -n "$MISSING_WEAK_SELF2" ]; then
    # Downgraded to warning - grep can't detect nested [weak self] patterns
    echo -e "${YELLOW}   ⚠️ WARNING: Review these closures for [weak self]:${NC}"
    echo "$MISSING_WEAK_SELF" | head -3
    echo "$MISSING_WEAK_SELF2" | head -3
    ((WARNING_COUNT++))
else
    echo -e "${GREEN}   ✅ No obvious [weak self] issues${NC}"
fi

# ============================================
# CHECK 4: MAIN THREAD UI UPDATES
# ============================================
echo -e "${YELLOW}[4/14] Memory Safety: Main Thread UI Updates${NC}"

# Look for @Published updates outside main thread
UI_THREAD_ISSUES=$(grep -rn "self\.\(isLoading\|error\|data\|items\|orders\)" $IOS_PATH --include="*.swift" \
    | grep -v "/Pods/" \
    | grep -v "/.build/" \
    | grep "dataTask\|completion\|result in" \
    | grep -v "DispatchQueue.main" \
    | grep -v "MainActor" || true)

if [ -n "$UI_THREAD_ISSUES" ]; then
    echo -e "${YELLOW}   ⚠️ WARNING: Possible UI updates off main thread:${NC}"
    echo "$UI_THREAD_ISSUES" | head -3
    ((WARNING_COUNT++))
else
    echo -e "${GREEN}   ✅ UI updates appear to be on main thread${NC}"
fi

# ============================================
# CHECK 5: EMPTY CATCH BLOCKS
# ============================================
echo -e "${YELLOW}[5/14] Error Handling: Empty Catch Blocks${NC}"

EMPTY_CATCH=$(grep -rn "catch {" $IOS_PATH --include="*.swift" -A 1 \
    | grep -v "/Pods/" \
    | grep -v "/.build/" \
    | grep -B 1 "^--$\|^ *}$" || true)

PRINT_ONLY_CATCH=$(grep -rn "catch.*{.*print" $IOS_PATH --include="*.swift" \
    | grep -v "/Pods/" \
    | grep -v "/.build/" \
    | grep -v "ErrorHandler" || true)

if [ -n "$EMPTY_CATCH" ] || [ -n "$PRINT_ONLY_CATCH" ]; then
    echo -e "${RED}   ❌ ERROR: Errors not properly handled:${NC}"
    echo "$PRINT_ONLY_CATCH" | head -3
    ((ERROR_COUNT++))
else
    echo -e "${GREEN}   ✅ Errors handled properly${NC}"
fi

# ============================================
# CHECK 6: TOKEN/PASSWORD LOGGING
# ============================================
echo -e "${YELLOW}[6/14] Security Check: Sensitive Data Logging${NC}"

# Look for actual sensitive data being interpolated/printed
# Match patterns like: print("...\(token)...") or print(token)
SENSITIVE_LOGS=$(grep -rn 'print.*\\(token\|print.*\\(password\|print.*\\(secret\|print.*\\(apiKey' $IOS_PATH --include="*.swift" \
    | grep -v "/Pods/" \
    | grep -v "/.build/" \
    | grep -v "\.count)" \
    | grep -v "token:" \
    | grep -v "tokenString" || true)

# Check for NSLog with sensitive data
SENSITIVE_LOGS2=$(grep -rn 'NSLog.*token\|NSLog.*password\|NSLog.*secret' $IOS_PATH --include="*.swift" \
    | grep -v "/Pods/" \
    | grep -v "/.build/" || true)

if [ -n "$SENSITIVE_LOGS" ] || [ -n "$SENSITIVE_LOGS2" ]; then
    echo -e "${RED}   ❌ CRITICAL: Sensitive data being logged:${NC}"
    echo "$SENSITIVE_LOGS" | head -3
    echo "$SENSITIVE_LOGS2" | head -3
    ((CRITICAL_COUNT++))
else
    echo -e "${GREEN}   ✅ No sensitive data logging${NC}"
fi

# ============================================
# CHECK 7: LARGE FILES
# ============================================
echo -e "${YELLOW}[7/14] Code Quality: File Size${NC}"

LARGE_FILES=""
for file in $(find "$IOS_PATH" -name "*.swift" -type f | grep -v "/Pods/" | grep -v "/.build/" | grep -v "/_dead_code_backup/" | grep -v "/Tests/"); do
    LINES=$(wc -l < "$file" | tr -d ' ')
    if [ "$LINES" -gt 500 ]; then
        LARGE_FILES="$LARGE_FILES\n   $file: $LINES lines"
        ((WARNING_COUNT++))
    fi
done

if [ -n "$LARGE_FILES" ]; then
    echo -e "${YELLOW}   ⚠️ WARNING: Files over 500 lines:${NC}"
    echo -e "$LARGE_FILES"
else
    echo -e "${GREEN}   ✅ All files under 500 lines${NC}"
fi

# ============================================
# CHECK 8: TODO/FIXME TRACKING
# ============================================
echo -e "${YELLOW}[8/14] Technical Debt: TODO/FIXME Comments${NC}"

TODO_COUNT=$(grep -rn "TODO\|FIXME\|HACK\|XXX" $IOS_PATH --include="*.swift" | grep -v "/Pods/" | grep -v "/.build/" | wc -l | tr -d ' ')

if [ "$TODO_COUNT" -gt 0 ]; then
    echo -e "${BLUE}   ℹ️ INFO: $TODO_COUNT TODO/FIXME comments found${NC}"
    grep -rn "TODO\|FIXME" $IOS_PATH --include="*.swift" | grep -v "/Pods/" | grep -v "/.build/" | head -5
else
    echo -e "${GREEN}   ✅ No TODO/FIXME comments${NC}"
fi

# ============================================
# CHECK 9: APP STORE DEMO PAYMENT FLOW (CRITICAL)
# ============================================
echo -e "${YELLOW}[9/14] App Store Review: Demo Payment Flow${NC}"

CUSTOMER_APP="$IOS_PATH/customer/eatfaircustomer"
PAYMENT_SERVICE="$CUSTOMER_APP/Services/PaymentService.swift"
CHECKOUT_VIEW="$CUSTOMER_APP/Views/MultiRestaurantCheckoutView.swift"
LOGIN_VIEW="$CUSTOMER_APP/Views/LoginView.swift"

DEMO_ISSUES=0

# Check 9a: PaymentService has demo: Bool? field
if [ -f "$PAYMENT_SERVICE" ]; then
    if grep -q "let demo: Bool?" "$PAYMENT_SERVICE"; then
        echo -e "${GREEN}   ✅ PaymentService.swift: demo field exists${NC}"
    else
        echo -e "${RED}   ❌ CRITICAL: PaymentService.swift missing 'let demo: Bool?' field${NC}"
        ((DEMO_ISSUES++))
        ((CRITICAL_COUNT++))
    fi

    # Check 9b: isDemoPayment computed property
    if grep -q "isDemoPayment" "$PAYMENT_SERVICE"; then
        echo -e "${GREEN}   ✅ PaymentService.swift: isDemoPayment property exists${NC}"
    else
        echo -e "${RED}   ❌ CRITICAL: PaymentService.swift missing 'isDemoPayment' property${NC}"
        ((DEMO_ISSUES++))
        ((CRITICAL_COUNT++))
    fi
else
    echo -e "${RED}   ❌ CRITICAL: PaymentService.swift not found${NC}"
    ((DEMO_ISSUES++))
    ((CRITICAL_COUNT++))
fi

# Check 9c: Checkout view checks isDemoPayment
if [ -f "$CHECKOUT_VIEW" ]; then
    if grep -q "isDemoPayment" "$CHECKOUT_VIEW"; then
        echo -e "${GREEN}   ✅ MultiRestaurantCheckoutView.swift: isDemoPayment check exists${NC}"

        # Check 9d: placeOrder() called in demo branch
        if grep -A 10 "isDemoPayment" "$CHECKOUT_VIEW" | grep -q "placeOrder"; then
            echo -e "${GREEN}   ✅ MultiRestaurantCheckoutView.swift: placeOrder() in demo branch${NC}"
        else
            echo -e "${RED}   ❌ CRITICAL: placeOrder() not called when isDemoPayment is true${NC}"
            ((DEMO_ISSUES++))
            ((CRITICAL_COUNT++))
        fi
    else
        echo -e "${RED}   ❌ CRITICAL: MultiRestaurantCheckoutView.swift missing isDemoPayment check${NC}"
        ((DEMO_ISSUES++))
        ((CRITICAL_COUNT++))
    fi
else
    echo -e "${RED}   ❌ CRITICAL: MultiRestaurantCheckoutView.swift not found${NC}"
    ((DEMO_ISSUES++))
    ((CRITICAL_COUNT++))
fi

# Check 9e: Demo credentials accessible
if [ -f "$LOGIN_VIEW" ]; then
    if grep -q "demo.customer@dollor.ai\|demo\.customer" "$LOGIN_VIEW"; then
        echo -e "${GREEN}   ✅ LoginView.swift: Demo credentials accessible${NC}"
    else
        echo -e "${YELLOW}   ⚠️ WARNING: demo.customer@dollor.ai not found in LoginView${NC}"
        ((WARNING_COUNT++))
    fi
fi

if [ $DEMO_ISSUES -gt 0 ]; then
    echo -e "${RED}   ⚠️ $DEMO_ISSUES demo payment issues found - App Store review will FAIL${NC}"
fi

# ============================================
# CHECK 10: ENVIRONMENT CONFIGURATION
# ============================================
echo -e "${YELLOW}[10/14] Environment: Config Consistency${NC}"

PROD_CONFIG="$IOS_PATH/Config/Production.xcconfig"
STAGING_CONFIG="$IOS_PATH/Config/Staging.xcconfig"

# Check production URL is correct
if [ -f "$PROD_CONFIG" ]; then
    if grep -q "api.dollor.ai" "$PROD_CONFIG"; then
        echo -e "${GREEN}   ✅ Production.xcconfig: Correct API URL${NC}"
    else
        echo -e "${RED}   ❌ ERROR: Production.xcconfig missing api.dollor.ai${NC}"
        ((ERROR_COUNT++))
    fi

    # Check no staging URL in production
    if grep -q "cloudfront" "$PROD_CONFIG"; then
        echo -e "${RED}   ❌ CRITICAL: Production.xcconfig contains staging URL (cloudfront)${NC}"
        ((CRITICAL_COUNT++))
    else
        echo -e "${GREEN}   ✅ Production.xcconfig: No staging URLs${NC}"
    fi
fi

# Check staging URL is correct
if [ -f "$STAGING_CONFIG" ]; then
    if grep -q "cloudfront\|staging" "$STAGING_CONFIG"; then
        echo -e "${GREEN}   ✅ Staging.xcconfig: Contains staging URL${NC}"
    else
        echo -e "${YELLOW}   ⚠️ WARNING: Staging.xcconfig may not point to staging${NC}"
        ((WARNING_COUNT++))
    fi
fi

# ============================================
# CHECK 11: BUNDLE ID CONSISTENCY
# ============================================
echo -e "${YELLOW}[11/14] Build: Bundle ID Verification${NC}"

FASTLANE_APPFILE="$IOS_PATH/fastlane/Appfile"

if [ -f "$FASTLANE_APPFILE" ]; then
    if grep -q "com.dollorai.customer" "$FASTLANE_APPFILE"; then
        echo -e "${GREEN}   ✅ Customer Bundle ID: com.dollorai.customer${NC}"
    else
        echo -e "${RED}   ❌ ERROR: Customer bundle ID not configured${NC}"
        ((ERROR_COUNT++))
    fi

    if grep -q "com.dollorai.delivery" "$FASTLANE_APPFILE"; then
        echo -e "${GREEN}   ✅ Driver Bundle ID: com.dollorai.delivery${NC}"
    else
        echo -e "${YELLOW}   ⚠️ WARNING: Driver bundle ID not in Appfile${NC}"
        ((WARNING_COUNT++))
    fi

    if grep -q "com.dollorai.restaurant" "$FASTLANE_APPFILE"; then
        echo -e "${GREEN}   ✅ Restaurant Bundle ID: com.dollorai.restaurant${NC}"
    else
        echo -e "${YELLOW}   ⚠️ WARNING: Restaurant bundle ID not in Appfile${NC}"
        ((WARNING_COUNT++))
    fi
else
    echo -e "${YELLOW}   ⚠️ WARNING: Fastlane Appfile not found${NC}"
    ((WARNING_COUNT++))
fi

# ============================================
# CHECK 12: FIREBASE CONFIGURATION
# ============================================
echo -e "${YELLOW}[12/14] Firebase: GoogleService-Info.plist${NC}"

for app in "customer/eatfaircustomer" "delivery/eatffairdelivery" "restaurant/eatffairrestaurant"; do
    APP_NAME=$(echo "$app" | cut -d'/' -f1)
    FIREBASE_PLIST="$IOS_PATH/$app/GoogleService-Info.plist"

    if [ -f "$FIREBASE_PLIST" ]; then
        echo -e "${GREEN}   ✅ $APP_NAME: GoogleService-Info.plist present${NC}"
    else
        echo -e "${YELLOW}   ⚠️ WARNING: $APP_NAME missing GoogleService-Info.plist${NC}"
        ((WARNING_COUNT++))
    fi
done

# ============================================
# CHECK 13: STRIPE CONFIGURATION
# ============================================
echo -e "${YELLOW}[13/14] Payments: Stripe Configuration${NC}"

# Check for Apple Pay merchant ID
ENTITLEMENTS=$(find "$IOS_PATH/customer" -name "*.entitlements" 2>/dev/null | head -1)

if [ -n "$ENTITLEMENTS" ] && [ -f "$ENTITLEMENTS" ]; then
    if grep -q "merchant.com.dollorai" "$ENTITLEMENTS"; then
        echo -e "${GREEN}   ✅ Apple Pay merchant ID configured${NC}"
    else
        echo -e "${YELLOW}   ⚠️ WARNING: Apple Pay merchant ID may not be configured${NC}"
        ((WARNING_COUNT++))
    fi
else
    echo -e "${YELLOW}   ⚠️ WARNING: Entitlements file not found${NC}"
    ((WARNING_COUNT++))
fi

# Check PaymentService imports Stripe
if [ -f "$PAYMENT_SERVICE" ]; then
    if grep -q "import Stripe\|import StripePaymentSheet" "$PAYMENT_SERVICE"; then
        echo -e "${GREEN}   ✅ Stripe SDK imported in PaymentService${NC}"
    else
        echo -e "${YELLOW}   ⚠️ WARNING: Stripe import not found in PaymentService${NC}"
        ((WARNING_COUNT++))
    fi
fi

# ============================================
# CHECK 14: BREAKING CHANGE DETECTION
# ============================================
echo -e "${YELLOW}[14/14] Regression: Breaking Change Detection${NC}"

# Critical patterns that MUST exist (from previous App Store approvals)
CRITICAL_PATTERNS=(
    "PaymentService.swift:let demo:"
    "PaymentService.swift:isDemoPayment"
    "MultiRestaurantCheckoutView.swift:isDemoPayment"
)

BREAKING_CHANGES=0

for pattern in "${CRITICAL_PATTERNS[@]}"; do
    FILE=$(echo "$pattern" | cut -d':' -f1)
    SEARCH=$(echo "$pattern" | cut -d':' -f2)

    FULL_PATH=$(find "$IOS_PATH/customer" -name "$FILE" 2>/dev/null | head -1)

    if [ -n "$FULL_PATH" ] && [ -f "$FULL_PATH" ]; then
        if ! grep -q "$SEARCH" "$FULL_PATH"; then
            echo -e "${RED}   ❌ BREAKING: '$SEARCH' removed from $FILE${NC}"
            ((BREAKING_CHANGES++))
            ((CRITICAL_COUNT++))
        fi
    fi
done

# Anti-patterns that MUST NOT exist
ANTI_PATTERNS=(
    "return.*before.*isDemoPayment"
    "guard.*!isDemoPayment"
)

for anti in "${ANTI_PATTERNS[@]}"; do
    if grep -rn "$anti" "$IOS_PATH/customer" --include="*.swift" 2>/dev/null | grep -v "Pods" | grep -v ".build"; then
        echo -e "${RED}   ❌ BREAKING: Anti-pattern found: $anti${NC}"
        ((BREAKING_CHANGES++))
        ((CRITICAL_COUNT++))
    fi
done

if [ $BREAKING_CHANGES -eq 0 ]; then
    echo -e "${GREEN}   ✅ No breaking changes detected${NC}"
else
    echo -e "${RED}   ⚠️ $BREAKING_CHANGES breaking change(s) found - review before release${NC}"
fi

# ============================================
# SUMMARY
# ============================================
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "                     VALIDATION SUMMARY"
echo "═══════════════════════════════════════════════════════════"
echo ""

if [ $CRITICAL_COUNT -gt 0 ]; then
    echo -e "${RED}🔴 CRITICAL: $CRITICAL_COUNT${NC}"
fi
if [ $ERROR_COUNT -gt 0 ]; then
    echo -e "${RED}🟠 ERRORS:   $ERROR_COUNT${NC}"
fi
if [ $WARNING_COUNT -gt 0 ]; then
    echo -e "${YELLOW}🟡 WARNINGS: $WARNING_COUNT${NC}"
fi

echo ""

if [ $CRITICAL_COUNT -gt 0 ] || [ $ERROR_COUNT -gt 0 ]; then
    echo -e "${RED}❌ VALIDATION FAILED${NC}"
    echo ""
    echo "Fix critical and error issues before merging."
    exit 1
else
    if [ $WARNING_COUNT -gt 0 ]; then
        echo -e "${YELLOW}⚠️ VALIDATION PASSED WITH WARNINGS${NC}"
        echo ""
        echo "Consider fixing warnings when possible."
        exit 0
    else
        echo -e "${GREEN}✅ VALIDATION PASSED${NC}"
        exit 0
    fi
fi
