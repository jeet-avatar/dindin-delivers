#!/bin/bash
# Cybersecurity Validator - Deep Security Analysis (READ-ONLY)
# Scans for security vulnerabilities across iOS, Android, and Backend
#
# Usage:
#   ./security-validator.sh              # Full scan
#   ./security-validator.sh --ios        # iOS only
#   ./security-validator.sh --android    # Android only
#   ./security-validator.sh --backend    # Backend only

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
BACKEND_PATH="/Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║      🔒 CYBERSECURITY VALIDATOR (READ-ONLY)                    ║"
echo "║      Deep Security Threat Analysis                             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Scan Started: $(date)"
echo ""

# Track issues by severity
CRITICAL_COUNT=0
HIGH_COUNT=0
MEDIUM_COUNT=0
LOW_COUNT=0

# Determine scan scope
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
# SECTION 1: SECRETS & CREDENTIALS
# ============================================
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}  SECTION 1: SECRETS & CREDENTIALS EXPOSURE                    ${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# 1.1 API Keys in Code
echo -e "${YELLOW}[1.1] Hardcoded API Keys${NC}"
API_KEYS=""

if [ "$SCAN_IOS" = true ] && [ -d "$IOS_PATH" ]; then
    FOUND=$(grep -rn "AIza[0-9A-Za-z_-]\{35\}\|sk-[a-zA-Z0-9]\{20,\}\|pk_live_\|sk_live_\|pk_test_\|sk_test_" "$IOS_PATH" --include="*.swift" 2>/dev/null | grep -v "build/" | grep -v "Pods" || true)
    if [ -n "$FOUND" ]; then
        API_KEYS="$API_KEYS\n${CYAN}[iOS]${NC}\n$FOUND"
    fi
fi

if [ "$SCAN_ANDROID" = true ] && [ -d "$ANDROID_PATH" ]; then
    FOUND=$(grep -rn "AIza[0-9A-Za-z_-]\{35\}\|sk-[a-zA-Z0-9]\{20,\}\|pk_live_\|sk_live_\|pk_test_\|sk_test_" "$ANDROID_PATH" --include="*.kt" --include="*.java" 2>/dev/null | grep -v "build/" || true)
    if [ -n "$FOUND" ]; then
        API_KEYS="$API_KEYS\n${CYAN}[Android]${NC}\n$FOUND"
    fi
fi

if [ "$SCAN_BACKEND" = true ] && [ -d "$BACKEND_PATH" ]; then
    FOUND=$(grep -rn "AIza[0-9A-Za-z_-]\{35\}\|sk-[a-zA-Z0-9]\{20,\}\|pk_live_\|sk_live_" "$BACKEND_PATH" --include="*.py" 2>/dev/null | grep -v "venv" | grep -v "__pycache__" || true)
    if [ -n "$FOUND" ]; then
        API_KEYS="$API_KEYS\n${CYAN}[Backend]${NC}\n$FOUND"
    fi
fi

if [ -n "$API_KEYS" ]; then
    echo -e "${RED}   🔴 CRITICAL: Hardcoded API keys found:${NC}"
    echo -e "$API_KEYS" | head -15
    ((CRITICAL_COUNT++))
else
    echo -e "${GREEN}   ✅ No hardcoded API keys detected${NC}"
fi

# 1.2 Passwords in Code
echo ""
echo -e "${YELLOW}[1.2] Hardcoded Passwords/Secrets${NC}"
PASSWORDS=""

if [ "$SCAN_IOS" = true ] && [ -d "$IOS_PATH" ]; then
    FOUND=$(grep -rn "password\s*=\s*[\"'][^\"']\+[\"']\|secret\s*=\s*[\"'][^\"']\+[\"']" "$IOS_PATH" --include="*.swift" 2>/dev/null | grep -v "build/" | grep -v "Pods" | grep -v "// " | grep -v "Test" || true)
    if [ -n "$FOUND" ]; then
        PASSWORDS="$PASSWORDS\n${CYAN}[iOS]${NC}\n$FOUND"
    fi
fi

if [ "$SCAN_ANDROID" = true ] && [ -d "$ANDROID_PATH" ]; then
    FOUND=$(grep -rn "password\s*=\s*[\"'][^\"']\+[\"']\|secret\s*=\s*[\"'][^\"']\+[\"']" "$ANDROID_PATH" --include="*.kt" 2>/dev/null | grep -v "build/" | grep -v "// " | grep -v "Test" || true)
    if [ -n "$FOUND" ]; then
        PASSWORDS="$PASSWORDS\n${CYAN}[Android]${NC}\n$FOUND"
    fi
fi

if [ -n "$PASSWORDS" ]; then
    echo -e "${RED}   🔴 CRITICAL: Hardcoded passwords found:${NC}"
    echo -e "$PASSWORDS" | head -10
    ((CRITICAL_COUNT++))
else
    echo -e "${GREEN}   ✅ No hardcoded passwords detected${NC}"
fi

# 1.3 Token/Credential Logging
echo ""
echo -e "${YELLOW}[1.3] Sensitive Data Logging${NC}"
LOGGING=""

if [ "$SCAN_IOS" = true ] && [ -d "$IOS_PATH" ]; then
    FOUND=$(grep -rn "print.*[Tt]oken\|print.*[Pp]assword\|print.*[Ss]ecret\|print.*[Cc]redential\|NSLog.*[Tt]oken\|debugPrint.*[Tt]oken" "$IOS_PATH" --include="*.swift" 2>/dev/null | grep -v "build/" | grep -v "Pods" || true)
    if [ -n "$FOUND" ]; then
        LOGGING="$LOGGING\n${CYAN}[iOS]${NC}\n$FOUND"
    fi
fi

if [ "$SCAN_ANDROID" = true ] && [ -d "$ANDROID_PATH" ]; then
    FOUND=$(grep -rn "Log\.[dievw].*[Tt]oken\|Log\.[dievw].*[Pp]assword\|println.*[Tt]oken" "$ANDROID_PATH" --include="*.kt" 2>/dev/null | grep -v "build/" || true)
    if [ -n "$FOUND" ]; then
        LOGGING="$LOGGING\n${CYAN}[Android]${NC}\n$FOUND"
    fi
fi

if [ "$SCAN_BACKEND" = true ] && [ -d "$BACKEND_PATH" ]; then
    FOUND=$(grep -rn "print.*token\|logging.*token\|logger.*token" "$BACKEND_PATH" --include="*.py" 2>/dev/null | grep -v "venv" | grep -v "__pycache__" | grep -v "# " || true)
    if [ -n "$FOUND" ]; then
        LOGGING="$LOGGING\n${CYAN}[Backend]${NC}\n$FOUND"
    fi
fi

if [ -n "$LOGGING" ]; then
    echo -e "${RED}   🔴 CRITICAL: Sensitive data being logged:${NC}"
    echo -e "$LOGGING" | head -15
    ((CRITICAL_COUNT++))
else
    echo -e "${GREEN}   ✅ No sensitive data logging detected${NC}"
fi

# 1.4 Private Keys in Repo
echo ""
echo -e "${YELLOW}[1.4] Private Keys in Repository${NC}"
PRIVATE_KEYS=""

FOUND=$(find "$IOS_PATH" "$ANDROID_PATH" "$BACKEND_PATH" -name "*.pem" -o -name "*.key" -o -name "*.p12" -o -name "*.pfx" 2>/dev/null | grep -v "build/" | grep -v "Pods" | grep -v "venv" || true)
if [ -n "$FOUND" ]; then
    echo -e "${RED}   🔴 CRITICAL: Private key files found:${NC}"
    echo "$FOUND" | head -10
    ((CRITICAL_COUNT++))
else
    echo -e "${GREEN}   ✅ No private key files in repository${NC}"
fi

# ============================================
# SECTION 2: AUTHENTICATION & AUTHORIZATION
# ============================================
echo ""
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}  SECTION 2: AUTHENTICATION & AUTHORIZATION                    ${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# 2.1 Insecure Token Storage
echo -e "${YELLOW}[2.1] Insecure Token Storage${NC}"
INSECURE_STORAGE=""

if [ "$SCAN_IOS" = true ] && [ -d "$IOS_PATH" ]; then
    FOUND=$(grep -rn "UserDefaults.*[Tt]oken\|UserDefaults.*[Pp]assword\|UserDefaults.*[Ss]ecret" "$IOS_PATH" --include="*.swift" 2>/dev/null | grep -v "build/" | grep -v "Pods" || true)
    if [ -n "$FOUND" ]; then
        INSECURE_STORAGE="$INSECURE_STORAGE\n${CYAN}[iOS - UserDefaults for tokens]${NC}\n$FOUND"
    fi
fi

if [ "$SCAN_ANDROID" = true ] && [ -d "$ANDROID_PATH" ]; then
    FOUND=$(grep -rn "SharedPreferences.*[Tt]oken\|getSharedPreferences.*[Tt]oken\|putString.*token" "$ANDROID_PATH" --include="*.kt" 2>/dev/null | grep -v "build/" | grep -v "EncryptedSharedPreferences" || true)
    if [ -n "$FOUND" ]; then
        INSECURE_STORAGE="$INSECURE_STORAGE\n${CYAN}[Android - SharedPreferences for tokens]${NC}\n$FOUND"
    fi
fi

if [ -n "$INSECURE_STORAGE" ]; then
    echo -e "${RED}   🟠 HIGH: Insecure token storage:${NC}"
    echo -e "$INSECURE_STORAGE" | head -10
    ((HIGH_COUNT++))
else
    echo -e "${GREEN}   ✅ No insecure token storage detected${NC}"
fi

# 2.2 Missing Auth Checks
echo ""
echo -e "${YELLOW}[2.2] Endpoints Without Auth (Backend)${NC}"
if [ "$SCAN_BACKEND" = true ] && [ -d "$BACKEND_PATH" ]; then
    # Count endpoints with and without Depends(get_current_user) or similar
    TOTAL_ENDPOINTS=$(grep -c "@app\.\(get\|post\|put\|delete\|patch\)" "$BACKEND_PATH/main_new.py" 2>/dev/null || echo "0")
    AUTH_ENDPOINTS=$(grep -c "Depends(get_current\|Depends(oauth2_scheme" "$BACKEND_PATH/main_new.py" 2>/dev/null || echo "0")

    echo "   Total endpoints: $TOTAL_ENDPOINTS"
    echo "   Endpoints with auth: $AUTH_ENDPOINTS"

    # Find public endpoints (might be intentional)
    PUBLIC=$(grep -B2 "@app\.\(get\|post\|put\|delete\)" "$BACKEND_PATH/main_new.py" 2>/dev/null | grep -A2 "public\|health\|config\|legal" | head -10 || true)
    echo -e "${BLUE}   ℹ️ Review public endpoints for intended exposure${NC}"
fi

# 2.3 JWT/Token Validation
echo ""
echo -e "${YELLOW}[2.3] JWT Security Configuration${NC}"
if [ "$SCAN_BACKEND" = true ] && [ -d "$BACKEND_PATH" ]; then
    # Check for weak JWT settings
    WEAK_JWT=$(grep -rn "algorithm.*HS256\|verify=False\|options.*verify" "$BACKEND_PATH" --include="*.py" 2>/dev/null | grep -v "venv" || true)
    if [ -n "$WEAK_JWT" ]; then
        echo -e "${YELLOW}   ⚠️ MEDIUM: Review JWT configuration:${NC}"
        echo "$WEAK_JWT" | head -5
        ((MEDIUM_COUNT++))
    else
        echo -e "${GREEN}   ✅ No obvious JWT weaknesses${NC}"
    fi
fi

# ============================================
# SECTION 3: DATA PROTECTION
# ============================================
echo ""
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}  SECTION 3: DATA PROTECTION                                   ${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# 3.1 HTTP vs HTTPS
echo -e "${YELLOW}[3.1] Insecure HTTP URLs${NC}"
HTTP_URLS=""

if [ "$SCAN_IOS" = true ] && [ -d "$IOS_PATH" ]; then
    FOUND=$(grep -rn "http://" "$IOS_PATH" --include="*.swift" 2>/dev/null | grep -v "https://" | grep -v "build/" | grep -v "Pods" | grep -v "// " | grep -v "localhost" || true)
    if [ -n "$FOUND" ]; then
        HTTP_URLS="$HTTP_URLS\n${CYAN}[iOS]${NC}\n$FOUND"
    fi
fi

if [ "$SCAN_ANDROID" = true ] && [ -d "$ANDROID_PATH" ]; then
    FOUND=$(grep -rn "http://" "$ANDROID_PATH" --include="*.kt" 2>/dev/null | grep -v "https://" | grep -v "build/" | grep -v "// " | grep -v "localhost" || true)
    if [ -n "$FOUND" ]; then
        HTTP_URLS="$HTTP_URLS\n${CYAN}[Android]${NC}\n$FOUND"
    fi
fi

if [ -n "$HTTP_URLS" ]; then
    echo -e "${RED}   🟠 HIGH: Insecure HTTP URLs found:${NC}"
    echo -e "$HTTP_URLS" | head -10
    ((HIGH_COUNT++))
else
    echo -e "${GREEN}   ✅ No insecure HTTP URLs${NC}"
fi

# 3.2 Certificate Pinning
echo ""
echo -e "${YELLOW}[3.2] SSL/TLS Certificate Pinning${NC}"
if [ "$SCAN_IOS" = true ] && [ -d "$IOS_PATH" ]; then
    PINNING=$(grep -rn "pinnedCertificates\|SSLPinning\|TrustKit\|certificatePinning" "$IOS_PATH" --include="*.swift" 2>/dev/null | grep -v "build/" || true)
    if [ -n "$PINNING" ]; then
        echo -e "${GREEN}   ✅ iOS: Certificate pinning detected${NC}"
    else
        echo -e "${YELLOW}   ⚠️ MEDIUM: iOS - No certificate pinning found${NC}"
        ((MEDIUM_COUNT++))
    fi
fi

if [ "$SCAN_ANDROID" = true ] && [ -d "$ANDROID_PATH" ]; then
    PINNING=$(grep -rn "CertificatePinner\|network-security-config\|ssl-pinning" "$ANDROID_PATH" --include="*.kt" --include="*.xml" 2>/dev/null | grep -v "build/" || true)
    if [ -n "$PINNING" ]; then
        echo -e "${GREEN}   ✅ Android: Certificate pinning detected${NC}"
    else
        echo -e "${YELLOW}   ⚠️ MEDIUM: Android - No certificate pinning found${NC}"
        ((MEDIUM_COUNT++))
    fi
fi

# 3.3 Data Encryption
echo ""
echo -e "${YELLOW}[3.3] Sensitive Data Encryption${NC}"
if [ "$SCAN_IOS" = true ] && [ -d "$IOS_PATH" ]; then
    KEYCHAIN=$(grep -rn "SecureStorage\|Keychain\|kSecClass" "$IOS_PATH" --include="*.swift" 2>/dev/null | grep -v "build/" | wc -l || echo "0")
    echo "   iOS Keychain usage: $KEYCHAIN references"
fi

if [ "$SCAN_ANDROID" = true ] && [ -d "$ANDROID_PATH" ]; then
    ENCRYPTED=$(grep -rn "EncryptedSharedPreferences\|KeyStore\|Cipher" "$ANDROID_PATH" --include="*.kt" 2>/dev/null | grep -v "build/" | wc -l || echo "0")
    echo "   Android encryption usage: $ENCRYPTED references"
fi

# ============================================
# SECTION 4: INJECTION VULNERABILITIES
# ============================================
echo ""
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}  SECTION 4: INJECTION VULNERABILITIES                         ${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# 4.1 SQL Injection
echo -e "${YELLOW}[4.1] SQL Injection Risks${NC}"
if [ "$SCAN_BACKEND" = true ] && [ -d "$BACKEND_PATH" ]; then
    SQL_INJECTION=$(grep -rn "execute.*f\"\|execute.*%\|raw.*sql\|text(" "$BACKEND_PATH" --include="*.py" 2>/dev/null | grep -v "venv" | grep -v "__pycache__" || true)
    if [ -n "$SQL_INJECTION" ]; then
        echo -e "${RED}   🟠 HIGH: Potential SQL injection vectors:${NC}"
        echo "$SQL_INJECTION" | head -10
        ((HIGH_COUNT++))
    else
        echo -e "${GREEN}   ✅ No obvious SQL injection risks (using ORM)${NC}"
    fi
fi

# 4.2 Command Injection
echo ""
echo -e "${YELLOW}[4.2] Command Injection Risks${NC}"
if [ "$SCAN_BACKEND" = true ] && [ -d "$BACKEND_PATH" ]; then
    CMD_INJECTION=$(grep -rn "os.system\|subprocess.*shell=True\|eval(\|exec(" "$BACKEND_PATH" --include="*.py" 2>/dev/null | grep -v "venv" | grep -v "__pycache__" || true)
    if [ -n "$CMD_INJECTION" ]; then
        echo -e "${RED}   🔴 CRITICAL: Potential command injection:${NC}"
        echo "$CMD_INJECTION" | head -10
        ((CRITICAL_COUNT++))
    else
        echo -e "${GREEN}   ✅ No command injection risks detected${NC}"
    fi
fi

# 4.3 XSS in WebViews
echo ""
echo -e "${YELLOW}[4.3] WebView Security${NC}"
if [ "$SCAN_IOS" = true ] && [ -d "$IOS_PATH" ]; then
    WEBVIEW=$(grep -rn "WKWebView\|UIWebView\|loadHTMLString\|evaluateJavaScript" "$IOS_PATH" --include="*.swift" 2>/dev/null | grep -v "build/" | grep -v "Pods" || true)
    if [ -n "$WEBVIEW" ]; then
        echo -e "${YELLOW}   ⚠️ MEDIUM: iOS WebView usage found - review for XSS:${NC}"
        echo "$WEBVIEW" | head -5
        ((MEDIUM_COUNT++))
    fi
fi

if [ "$SCAN_ANDROID" = true ] && [ -d "$ANDROID_PATH" ]; then
    WEBVIEW=$(grep -rn "WebView\|loadUrl\|loadData\|setJavaScriptEnabled" "$ANDROID_PATH" --include="*.kt" 2>/dev/null | grep -v "build/" || true)
    if [ -n "$WEBVIEW" ]; then
        echo -e "${YELLOW}   ⚠️ MEDIUM: Android WebView usage found - review for XSS:${NC}"
        echo "$WEBVIEW" | head -5
        ((MEDIUM_COUNT++))
    fi
fi

# ============================================
# SECTION 5: PAYMENT SECURITY
# ============================================
echo ""
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}  SECTION 5: PAYMENT & FINANCIAL SECURITY                      ${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# 5.1 Payment Card Data
echo -e "${YELLOW}[5.1] Payment Card Data Handling${NC}"
CARD_DATA=""

if [ "$SCAN_IOS" = true ] && [ -d "$IOS_PATH" ]; then
    FOUND=$(grep -rn "cardNumber\|cvv\|cvc\|creditCard\|debitCard" "$IOS_PATH" --include="*.swift" 2>/dev/null | grep -v "build/" | grep -v "Pods" | grep -v "Stripe" || true)
    if [ -n "$FOUND" ]; then
        CARD_DATA="$CARD_DATA\n${CYAN}[iOS]${NC}\n$FOUND"
    fi
fi

if [ "$SCAN_ANDROID" = true ] && [ -d "$ANDROID_PATH" ]; then
    FOUND=$(grep -rn "cardNumber\|cvv\|cvc\|creditCard" "$ANDROID_PATH" --include="*.kt" 2>/dev/null | grep -v "build/" | grep -v "stripe" || true)
    if [ -n "$FOUND" ]; then
        CARD_DATA="$CARD_DATA\n${CYAN}[Android]${NC}\n$FOUND"
    fi
fi

if [ -n "$CARD_DATA" ]; then
    echo -e "${RED}   🔴 CRITICAL: Direct card data handling (PCI compliance risk):${NC}"
    echo -e "$CARD_DATA" | head -10
    ((CRITICAL_COUNT++))
else
    echo -e "${GREEN}   ✅ Using payment processor (Stripe) - no direct card handling${NC}"
fi

# 5.2 Stripe Key Exposure
echo ""
echo -e "${YELLOW}[5.2] Stripe API Key Security${NC}"
STRIPE_KEYS=""

# Check for live keys in code
FOUND=$(grep -rn "sk_live_\|rk_live_" "$IOS_PATH" "$ANDROID_PATH" "$BACKEND_PATH" --include="*.swift" --include="*.kt" --include="*.py" 2>/dev/null | grep -v "build/" | grep -v "venv" || true)
if [ -n "$FOUND" ]; then
    echo -e "${RED}   🔴 CRITICAL: Stripe LIVE secret keys in code:${NC}"
    echo "$FOUND" | head -5
    ((CRITICAL_COUNT++))
else
    echo -e "${GREEN}   ✅ No Stripe live secret keys exposed${NC}"
fi

# ============================================
# SECTION 6: MOBILE-SPECIFIC SECURITY
# ============================================
echo ""
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}  SECTION 6: MOBILE-SPECIFIC SECURITY                          ${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# 6.1 Debug/Dev Code in Production
echo -e "${YELLOW}[6.1] Debug Code in Production${NC}"
DEBUG_CODE=""

if [ "$SCAN_IOS" = true ] && [ -d "$IOS_PATH" ]; then
    FOUND=$(grep -rn "#if DEBUG\|isDebug\|debugMode = true" "$IOS_PATH" --include="*.swift" 2>/dev/null | grep -v "build/" | grep -v "Pods" || true)
    DEBUG_COUNT=$(echo "$FOUND" | grep -c "." || echo "0")
    echo "   iOS debug flags: $DEBUG_COUNT"
fi

if [ "$SCAN_ANDROID" = true ] && [ -d "$ANDROID_PATH" ]; then
    FOUND=$(grep -rn "BuildConfig.DEBUG\|isDebugMode\|debuggable" "$ANDROID_PATH" --include="*.kt" 2>/dev/null | grep -v "build/" || true)
    DEBUG_COUNT=$(echo "$FOUND" | grep -c "." || echo "0")
    echo "   Android debug flags: $DEBUG_COUNT"
fi

# 6.2 Jailbreak/Root Detection
echo ""
echo -e "${YELLOW}[6.2] Jailbreak/Root Detection${NC}"
if [ "$SCAN_IOS" = true ] && [ -d "$IOS_PATH" ]; then
    JB=$(grep -rn "isJailbroken\|cydia\|/Applications/Cydia\|/bin/bash" "$IOS_PATH" --include="*.swift" 2>/dev/null | grep -v "build/" || true)
    if [ -n "$JB" ]; then
        echo -e "${GREEN}   ✅ iOS: Jailbreak detection present${NC}"
    else
        echo -e "${YELLOW}   ⚠️ LOW: iOS - No jailbreak detection found${NC}"
        ((LOW_COUNT++))
    fi
fi

if [ "$SCAN_ANDROID" = true ] && [ -d "$ANDROID_PATH" ]; then
    ROOT=$(grep -rn "isRooted\|RootBeer\|/system/app/Superuser\|/system/xbin/su" "$ANDROID_PATH" --include="*.kt" 2>/dev/null | grep -v "build/" || true)
    if [ -n "$ROOT" ]; then
        echo -e "${GREEN}   ✅ Android: Root detection present${NC}"
    else
        echo -e "${YELLOW}   ⚠️ LOW: Android - No root detection found${NC}"
        ((LOW_COUNT++))
    fi
fi

# 6.3 Clipboard Security
echo ""
echo -e "${YELLOW}[6.3] Clipboard Data Exposure${NC}"
CLIPBOARD=""

if [ "$SCAN_IOS" = true ] && [ -d "$IOS_PATH" ]; then
    FOUND=$(grep -rn "UIPasteboard\|pasteboard" "$IOS_PATH" --include="*.swift" 2>/dev/null | grep -v "build/" || true)
    if [ -n "$FOUND" ]; then
        echo -e "${YELLOW}   ⚠️ LOW: iOS clipboard usage - ensure no sensitive data:${NC}"
        echo "$FOUND" | head -3
        ((LOW_COUNT++))
    fi
fi

# 6.4 Screenshot Prevention
echo ""
echo -e "${YELLOW}[6.4] Screenshot/Screen Recording Prevention${NC}"
if [ "$SCAN_IOS" = true ] && [ -d "$IOS_PATH" ]; then
    SCREENSHOT=$(grep -rn "isSecureTextEntry\|UITextField.*secureTextEntry\|capturedDidChange" "$IOS_PATH" --include="*.swift" 2>/dev/null | grep -v "build/" || true)
    if [ -n "$SCREENSHOT" ]; then
        echo -e "${GREEN}   ✅ iOS: Some screenshot protection present${NC}"
    else
        echo -e "${YELLOW}   ⚠️ LOW: iOS - Limited screenshot protection${NC}"
        ((LOW_COUNT++))
    fi
fi

# ============================================
# SECTION 7: BACKEND SECURITY
# ============================================
echo ""
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}  SECTION 7: BACKEND SECURITY                                  ${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo ""

if [ "$SCAN_BACKEND" = true ] && [ -d "$BACKEND_PATH" ]; then
    # 7.1 CORS Configuration
    echo -e "${YELLOW}[7.1] CORS Configuration${NC}"
    CORS=$(grep -rn "CORSMiddleware\|allow_origins\|Access-Control" "$BACKEND_PATH" --include="*.py" 2>/dev/null | grep -v "venv" || true)
    if [ -n "$CORS" ]; then
        WILDCARD=$(echo "$CORS" | grep "\*" || true)
        if [ -n "$WILDCARD" ]; then
            echo -e "${YELLOW}   ⚠️ MEDIUM: CORS allows wildcard origins:${NC}"
            echo "$WILDCARD" | head -3
            ((MEDIUM_COUNT++))
        else
            echo -e "${GREEN}   ✅ CORS configured with specific origins${NC}"
        fi
    fi

    # 7.2 Rate Limiting
    echo ""
    echo -e "${YELLOW}[7.2] Rate Limiting${NC}"
    RATE_LIMIT=$(grep -rn "RateLimiter\|slowapi\|rate_limit\|throttle" "$BACKEND_PATH" --include="*.py" 2>/dev/null | grep -v "venv" || true)
    if [ -n "$RATE_LIMIT" ]; then
        echo -e "${GREEN}   ✅ Rate limiting implemented${NC}"
    else
        echo -e "${YELLOW}   ⚠️ MEDIUM: No rate limiting detected${NC}"
        ((MEDIUM_COUNT++))
    fi

    # 7.3 Input Validation
    echo ""
    echo -e "${YELLOW}[7.3] Input Validation (Pydantic)${NC}"
    PYDANTIC=$(grep -rn "BaseModel\|validator\|Field(" "$BACKEND_PATH" --include="*.py" 2>/dev/null | grep -v "venv" | wc -l || echo "0")
    echo "   Pydantic model usage: $PYDANTIC references"
    if [ "$PYDANTIC" -gt 50 ]; then
        echo -e "${GREEN}   ✅ Strong input validation with Pydantic${NC}"
    else
        echo -e "${YELLOW}   ⚠️ Review input validation coverage${NC}"
    fi

    # 7.4 Security Headers
    echo ""
    echo -e "${YELLOW}[7.4] Security Headers${NC}"
    HEADERS=$(grep -rn "X-Content-Type-Options\|X-Frame-Options\|Strict-Transport-Security\|Content-Security-Policy" "$BACKEND_PATH" --include="*.py" 2>/dev/null | grep -v "venv" || true)
    if [ -n "$HEADERS" ]; then
        echo -e "${GREEN}   ✅ Security headers configured${NC}"
    else
        echo -e "${YELLOW}   ⚠️ MEDIUM: Security headers not detected${NC}"
        ((MEDIUM_COUNT++))
    fi
fi

# ============================================
# SECTION 8: DEPENDENCY VULNERABILITIES
# ============================================
echo ""
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}  SECTION 8: DEPENDENCY SECURITY                               ${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}[8.1] Dependency Files Found${NC}"
if [ -f "$BACKEND_PATH/requirements.txt" ]; then
    echo "   ✓ Backend: requirements.txt"
    # Check for known vulnerable versions (basic check)
    VULNERABLE=$(grep -i "django==1\.\|flask==0\.\|requests==2\.2[0-4]\." "$BACKEND_PATH/requirements.txt" 2>/dev/null || true)
    if [ -n "$VULNERABLE" ]; then
        echo -e "${RED}   🟠 HIGH: Potentially outdated dependencies:${NC}"
        echo "$VULNERABLE"
        ((HIGH_COUNT++))
    fi
fi

if [ -f "$IOS_PATH/customer/eatfaircustomer.xcworkspace/xcshareddata/swiftpm/Package.resolved" ]; then
    echo "   ✓ iOS: Package.resolved"
fi

if [ -f "$ANDROID_PATH/gradle/libs.versions.toml" ]; then
    echo "   ✓ Android: libs.versions.toml"
fi

echo -e "${BLUE}   ℹ️ Run 'pip-audit' or 'snyk' for full vulnerability scan${NC}"

# ============================================
# SUMMARY
# ============================================
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "                 SECURITY VALIDATION SUMMARY"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Scan Completed: $(date)"
echo ""

if [ $CRITICAL_COUNT -gt 0 ]; then
    echo -e "${RED}🔴 CRITICAL: $CRITICAL_COUNT issues${NC}"
fi
if [ $HIGH_COUNT -gt 0 ]; then
    echo -e "${RED}🟠 HIGH:     $HIGH_COUNT issues${NC}"
fi
if [ $MEDIUM_COUNT -gt 0 ]; then
    echo -e "${YELLOW}🟡 MEDIUM:   $MEDIUM_COUNT issues${NC}"
fi
if [ $LOW_COUNT -gt 0 ]; then
    echo -e "${BLUE}🔵 LOW:      $LOW_COUNT issues${NC}"
fi

TOTAL=$((CRITICAL_COUNT + HIGH_COUNT + MEDIUM_COUNT + LOW_COUNT))

echo ""
echo "───────────────────────────────────────────────────────────────"

if [ $CRITICAL_COUNT -gt 0 ]; then
    echo -e "${RED}❌ SECURITY AUDIT FAILED - CRITICAL ISSUES FOUND${NC}"
    echo ""
    echo "Immediate actions required:"
    echo "  1. Remove any hardcoded secrets/API keys"
    echo "  2. Stop logging sensitive data"
    echo "  3. Review command injection risks"
    echo "  4. Verify payment security compliance"
    exit 1
elif [ $HIGH_COUNT -gt 0 ]; then
    echo -e "${YELLOW}⚠️ SECURITY AUDIT: HIGH RISK ISSUES${NC}"
    echo ""
    echo "Recommended actions:"
    echo "  1. Implement secure token storage"
    echo "  2. Enable HTTPS everywhere"
    echo "  3. Add certificate pinning"
    exit 0
else
    echo -e "${GREEN}✅ SECURITY AUDIT PASSED${NC}"
    echo ""
    echo "Continue monitoring and consider:"
    echo "  - Regular dependency updates"
    echo "  - Penetration testing"
    echo "  - Security code reviews"
    exit 0
fi
