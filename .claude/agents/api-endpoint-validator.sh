#!/bin/bash
# API Endpoint Validator - Checks for localhost vs production issues and duplicate APIs
#
# Usage:
#   ./api-endpoint-validator.sh                    # Validate all code
#   ./api-endpoint-validator.sh --ios              # iOS only
#   ./api-endpoint-validator.sh --android          # Android only
#   ./api-endpoint-validator.sh --backend          # Backend only

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

IOS_PATH="/Users/jeet/StudioProjects/eatfair-ios/apps/ios"
ANDROID_PATH="/Users/jeet/StudioProjects/eatfair-android"
BACKEND_PATH="/Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║     🔍 API ENDPOINT VALIDATOR (READ-ONLY)                 ║"
echo "║     Checks: Localhost vs Production, Duplicate APIs       ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Track issues
CRITICAL_COUNT=0
ERROR_COUNT=0
WARNING_COUNT=0

# Determine what to scan
SCAN_IOS=true
SCAN_ANDROID=true
SCAN_BACKEND=true

if [ "$1" == "--ios" ]; then
    SCAN_ANDROID=false
    SCAN_BACKEND=false
elif [ "$1" == "--android" ]; then
    SCAN_IOS=false
    SCAN_BACKEND=false
elif [ "$1" == "--backend" ]; then
    SCAN_IOS=false
    SCAN_ANDROID=false
fi

# ============================================
# CHECK 1: LOCALHOST URLs IN CODE
# ============================================
echo -e "${YELLOW}[1/6] Localhost URLs Detection${NC}"
echo "    Scanning for hardcoded localhost/127.0.0.1 URLs..."

LOCALHOST_ISSUES=""

if [ "$SCAN_IOS" = true ] && [ -d "$IOS_PATH" ]; then
    IOS_LOCALHOST=$(grep -rn "localhost\|127\.0\.0\.1\|0\.0\.0\.0" "$IOS_PATH" --include="*.swift" \
        | grep -v "// " \
        | grep -v "xcconfig" \
        | grep -v ".md" \
        | grep -v "Pods" || true)
    if [ -n "$IOS_LOCALHOST" ]; then
        LOCALHOST_ISSUES="$LOCALHOST_ISSUES\n${CYAN}[iOS]${NC}\n$IOS_LOCALHOST"
    fi
fi

if [ "$SCAN_ANDROID" = true ] && [ -d "$ANDROID_PATH" ]; then
    ANDROID_LOCALHOST=$(grep -rn "localhost\|127\.0\.0\.1\|10\.0\.2\.2" "$ANDROID_PATH" --include="*.kt" --include="*.java" \
        | grep -v "// " \
        | grep -v "build/" \
        | grep -v ".gradle" \
        | grep -v "test" || true)
    if [ -n "$ANDROID_LOCALHOST" ]; then
        LOCALHOST_ISSUES="$LOCALHOST_ISSUES\n${CYAN}[Android]${NC}\n$ANDROID_LOCALHOST"
    fi
fi

if [ "$SCAN_BACKEND" = true ] && [ -d "$BACKEND_PATH" ]; then
    BACKEND_LOCALHOST=$(grep -rn "localhost\|127\.0\.0\.1" "$BACKEND_PATH" --include="*.py" \
        | grep -v "# " \
        | grep -v "__pycache__" \
        | grep -v "venv" \
        | grep -v "test" \
        | grep -v "0.0.0.0" || true)
    if [ -n "$BACKEND_LOCALHOST" ]; then
        LOCALHOST_ISSUES="$LOCALHOST_ISSUES\n${CYAN}[Backend]${NC}\n$BACKEND_LOCALHOST"
    fi
fi

if [ -n "$LOCALHOST_ISSUES" ]; then
    echo -e "${RED}   ❌ CRITICAL: Localhost URLs found in code:${NC}"
    echo -e "$LOCALHOST_ISSUES" | head -20
    ((CRITICAL_COUNT++))
else
    echo -e "${GREEN}   ✅ No localhost URLs found${NC}"
fi

# ============================================
# CHECK 2: HARDCODED PRODUCTION URLs
# ============================================
echo ""
echo -e "${YELLOW}[2/6] Hardcoded Production URLs${NC}"
echo "    URLs should use config, not hardcoded values..."

HARDCODED_PROD=""

if [ "$SCAN_IOS" = true ] && [ -d "$IOS_PATH" ]; then
    IOS_HARDCODED=$(grep -rn "https://api\.dollor\.ai\|https://d3kuu45w6kl8hr\.cloudfront\.net" "$IOS_PATH" --include="*.swift" \
        | grep -v "AppConfig" \
        | grep -v "xcconfig" \
        | grep -v "// " \
        | grep -v ".md" || true)
    if [ -n "$IOS_HARDCODED" ]; then
        HARDCODED_PROD="$HARDCODED_PROD\n${CYAN}[iOS]${NC}\n$IOS_HARDCODED"
    fi
fi

if [ "$SCAN_ANDROID" = true ] && [ -d "$ANDROID_PATH" ]; then
    ANDROID_HARDCODED=$(grep -rn "https://api\.dollor\.ai\|https://d3kuu45w6kl8hr\.cloudfront\.net" "$ANDROID_PATH" --include="*.kt" --include="*.java" \
        | grep -v "BuildConfig" \
        | grep -v "build\.gradle" \
        | grep -v "// " \
        | grep -v "build/" || true)
    if [ -n "$ANDROID_HARDCODED" ]; then
        HARDCODED_PROD="$HARDCODED_PROD\n${CYAN}[Android]${NC}\n$ANDROID_HARDCODED"
    fi
fi

if [ -n "$HARDCODED_PROD" ]; then
    echo -e "${RED}   ❌ CRITICAL: Hardcoded production URLs (should use config):${NC}"
    echo -e "$HARDCODED_PROD" | head -15
    ((CRITICAL_COUNT++))
else
    echo -e "${GREEN}   ✅ No hardcoded production URLs${NC}"
fi

# ============================================
# CHECK 3: MIXED ENVIRONMENT URLs
# ============================================
echo ""
echo -e "${YELLOW}[3/6] Mixed Environment Detection${NC}"
echo "    Checking for staging URLs in production code paths..."

MIXED_ENV=""

if [ "$SCAN_IOS" = true ] && [ -d "$IOS_PATH" ]; then
    # Check if both staging and production URLs exist in same file
    for file in $(find "$IOS_PATH" -name "*.swift" -type f | grep -v "Pods" | grep -v "Config"); do
        HAS_STAGING=$(grep -l "cloudfront\|staging" "$file" 2>/dev/null || true)
        HAS_PROD=$(grep -l "api\.dollor\.ai" "$file" 2>/dev/null || true)
        if [ -n "$HAS_STAGING" ] && [ -n "$HAS_PROD" ]; then
            MIXED_ENV="$MIXED_ENV\n   $file - has BOTH staging and production URLs"
        fi
    done
fi

if [ "$SCAN_ANDROID" = true ] && [ -d "$ANDROID_PATH" ]; then
    for file in $(find "$ANDROID_PATH" -name "*.kt" -type f | grep -v "build/" | grep -v "BuildConfig"); do
        HAS_STAGING=$(grep -l "cloudfront\|staging" "$file" 2>/dev/null || true)
        HAS_PROD=$(grep -l "api\.dollor\.ai" "$file" 2>/dev/null || true)
        if [ -n "$HAS_STAGING" ] && [ -n "$HAS_PROD" ]; then
            MIXED_ENV="$MIXED_ENV\n   $file - has BOTH staging and production URLs"
        fi
    done
fi

if [ -n "$MIXED_ENV" ]; then
    echo -e "${YELLOW}   ⚠️ WARNING: Files with mixed environment URLs:${NC}"
    echo -e "$MIXED_ENV" | head -10
    ((WARNING_COUNT++))
else
    echo -e "${GREEN}   ✅ No mixed environment URLs${NC}"
fi

# ============================================
# CHECK 4: DUPLICATE API ENDPOINTS
# ============================================
echo ""
echo -e "${YELLOW}[4/6] Duplicate API Endpoint Detection${NC}"
echo "    Scanning for duplicate endpoint definitions..."

# Create temp files for endpoint analysis
TEMP_ENDPOINTS="/tmp/api_endpoints_$$"

if [ "$SCAN_IOS" = true ] && [ -d "$IOS_PATH" ]; then
    # Extract endpoint patterns from iOS
    grep -roh '"/api/[^"]*"' "$IOS_PATH" --include="*.swift" 2>/dev/null | sort >> "$TEMP_ENDPOINTS" || true
fi

if [ "$SCAN_ANDROID" = true ] && [ -d "$ANDROID_PATH" ]; then
    # Extract endpoint patterns from Android
    grep -roh '"/api/[^"]*"' "$ANDROID_PATH" --include="*.kt" 2>/dev/null | sort >> "$TEMP_ENDPOINTS" || true
fi

if [ -f "$TEMP_ENDPOINTS" ]; then
    DUPLICATES=$(sort "$TEMP_ENDPOINTS" | uniq -d)
    DUPLICATE_COUNT=$(echo "$DUPLICATES" | grep -c "." || echo "0")

    if [ "$DUPLICATE_COUNT" -gt 0 ] && [ -n "$DUPLICATES" ]; then
        echo -e "${BLUE}   ℹ️ INFO: Found $DUPLICATE_COUNT endpoints used in multiple places:${NC}"
        echo "$DUPLICATES" | head -10
        echo ""
        echo "    (This may be intentional - same endpoint in iOS and Android)"
    else
        echo -e "${GREEN}   ✅ No unexpected duplicate endpoints${NC}"
    fi
    rm -f "$TEMP_ENDPOINTS"
fi

# ============================================
# CHECK 5: CONFLICTING API VERSIONS
# ============================================
echo ""
echo -e "${YELLOW}[5/6] API Version Consistency${NC}"
echo "    Checking for /api/v1 vs /api/v2 conflicts..."

API_V1_COUNT=0
API_V2_COUNT=0

if [ "$SCAN_IOS" = true ] && [ -d "$IOS_PATH" ]; then
    V1=$(grep -roh '"/api/v1/' "$IOS_PATH" --include="*.swift" 2>/dev/null | wc -l || echo "0")
    V2=$(grep -roh '"/api/v2/' "$IOS_PATH" --include="*.swift" 2>/dev/null | wc -l || echo "0")
    API_V1_COUNT=$((API_V1_COUNT + V1))
    API_V2_COUNT=$((API_V2_COUNT + V2))
fi

if [ "$SCAN_ANDROID" = true ] && [ -d "$ANDROID_PATH" ]; then
    V1=$(grep -roh '"/api/v1/' "$ANDROID_PATH" --include="*.kt" 2>/dev/null | wc -l || echo "0")
    V2=$(grep -roh '"/api/v2/' "$ANDROID_PATH" --include="*.kt" 2>/dev/null | wc -l || echo "0")
    API_V1_COUNT=$((API_V1_COUNT + V1))
    API_V2_COUNT=$((API_V2_COUNT + V2))
fi

if [ "$API_V1_COUNT" -gt 0 ] && [ "$API_V2_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}   ⚠️ WARNING: Mixed API versions detected:${NC}"
    echo "      /api/v1 endpoints: $API_V1_COUNT"
    echo "      /api/v2 endpoints: $API_V2_COUNT"
    ((WARNING_COUNT++))
else
    echo -e "${GREEN}   ✅ API versions consistent${NC}"
fi

# ============================================
# CHECK 6: PROBLEMATIC API PATTERNS
# ============================================
echo ""
echo -e "${YELLOW}[6/6] Problematic API Patterns${NC}"
echo "    Scanning for common API anti-patterns..."

PROBLEMS=""

# Check for double slashes in URLs
if [ "$SCAN_IOS" = true ] && [ -d "$IOS_PATH" ]; then
    DOUBLE_SLASH=$(grep -rn '"//' "$IOS_PATH" --include="*.swift" | grep -v "https://" | grep -v "http://" | grep -v "// " || true)
    if [ -n "$DOUBLE_SLASH" ]; then
        PROBLEMS="$PROBLEMS\n${CYAN}[iOS Double Slash]${NC}\n$DOUBLE_SLASH"
    fi
fi

if [ "$SCAN_ANDROID" = true ] && [ -d "$ANDROID_PATH" ]; then
    DOUBLE_SLASH=$(grep -rn '"//' "$ANDROID_PATH" --include="*.kt" | grep -v "https://" | grep -v "http://" | grep -v "// " | grep -v "build/" || true)
    if [ -n "$DOUBLE_SLASH" ]; then
        PROBLEMS="$PROBLEMS\n${CYAN}[Android Double Slash]${NC}\n$DOUBLE_SLASH"
    fi
fi

# Check for trailing slashes inconsistency
TRAILING_SLASH_ISSUES=""
if [ "$SCAN_IOS" = true ] && [ -d "$IOS_PATH" ]; then
    # Count endpoints with and without trailing slashes
    WITH_SLASH=$(grep -roh '"/api/[^"]*/"' "$IOS_PATH" --include="*.swift" 2>/dev/null | wc -l || echo "0")
    WITHOUT_SLASH=$(grep -roh '"/api/[^"]*[^/]"' "$IOS_PATH" --include="*.swift" 2>/dev/null | wc -l || echo "0")
    if [ "$WITH_SLASH" -gt 5 ] && [ "$WITHOUT_SLASH" -gt 5 ]; then
        TRAILING_SLASH_ISSUES="$TRAILING_SLASH_ISSUES\n   iOS: $WITH_SLASH with trailing slash, $WITHOUT_SLASH without"
    fi
fi

# Check for URL string concatenation (potential bugs)
URL_CONCAT=""
if [ "$SCAN_IOS" = true ] && [ -d "$IOS_PATH" ]; then
    CONCAT=$(grep -rn 'baseURL + "' "$IOS_PATH" --include="*.swift" | head -5 || true)
    if [ -n "$CONCAT" ]; then
        URL_CONCAT="$URL_CONCAT\n${CYAN}[iOS URL Concatenation]${NC}\n$CONCAT"
    fi
fi

if [ "$SCAN_ANDROID" = true ] && [ -d "$ANDROID_PATH" ]; then
    CONCAT=$(grep -rn 'baseUrl + "' "$ANDROID_PATH" --include="*.kt" | grep -v "build/" | head -5 || true)
    if [ -n "$CONCAT" ]; then
        URL_CONCAT="$URL_CONCAT\n${CYAN}[Android URL Concatenation]${NC}\n$CONCAT"
    fi
fi

if [ -n "$PROBLEMS" ]; then
    echo -e "${RED}   ❌ ERROR: Problematic URL patterns:${NC}"
    echo -e "$PROBLEMS" | head -10
    ((ERROR_COUNT++))
fi

if [ -n "$TRAILING_SLASH_ISSUES" ]; then
    echo -e "${YELLOW}   ⚠️ WARNING: Inconsistent trailing slashes:${NC}"
    echo -e "$TRAILING_SLASH_ISSUES"
    ((WARNING_COUNT++))
fi

if [ -n "$URL_CONCAT" ]; then
    echo -e "${BLUE}   ℹ️ INFO: String concatenation for URLs (check for missing slashes):${NC}"
    echo -e "$URL_CONCAT" | head -10
fi

if [ -z "$PROBLEMS" ] && [ -z "$TRAILING_SLASH_ISSUES" ]; then
    echo -e "${GREEN}   ✅ No problematic API patterns${NC}"
fi

# ============================================
# ENDPOINT INVENTORY
# ============================================
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "                    ENDPOINT INVENTORY"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Count unique endpoints per platform
if [ "$SCAN_IOS" = true ] && [ -d "$IOS_PATH" ]; then
    IOS_ENDPOINTS=$(grep -roh '"/api/[^"]*"' "$IOS_PATH" --include="*.swift" 2>/dev/null | sort -u | wc -l || echo "0")
    echo -e "${CYAN}iOS unique endpoints:${NC} $IOS_ENDPOINTS"
fi

if [ "$SCAN_ANDROID" = true ] && [ -d "$ANDROID_PATH" ]; then
    ANDROID_ENDPOINTS=$(grep -roh '"/api/[^"]*"' "$ANDROID_PATH" --include="*.kt" 2>/dev/null | sort -u | wc -l || echo "0")
    echo -e "${CYAN}Android unique endpoints:${NC} $ANDROID_ENDPOINTS"
fi

if [ "$SCAN_BACKEND" = true ] && [ -d "$BACKEND_PATH" ]; then
    BACKEND_ENDPOINTS=$(grep -roh '@app\.\(get\|post\|put\|delete\|patch\).*"/api/[^"]*"' "$BACKEND_PATH" --include="*.py" 2>/dev/null | wc -l || echo "0")
    echo -e "${CYAN}Backend defined endpoints:${NC} $BACKEND_ENDPOINTS"
fi

# ============================================
# SUMMARY
# ============================================
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "                    VALIDATION SUMMARY"
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
    echo "Issues to fix:"
    if [ $CRITICAL_COUNT -gt 0 ]; then
        echo "  - Remove localhost URLs from code"
        echo "  - Move hardcoded URLs to config files"
    fi
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
