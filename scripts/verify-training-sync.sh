#!/bin/bash
# verify-training-sync.sh - Verify build numbers are synced across all training/doc files
#
# Source of truth: CURRENT_PROJECT_VERSION in each app's project.pbxproj
# Downstream files checked:
#   1. .claude/training/Modelfile (Rule 16)
#   2. .claude/training/ground-truth-verified.jsonl (entry #40)
#   3. .claude/docs/GROUND_TRUTH.md (header + Section 13 table)
#   4. .claude/agents/QA_KNOWLEDGE_BASE.md (header + Section 7 table + QA Gate)
#   5. ~/.claude/projects/.../memory/MEMORY.md (training verification line)

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FIX_MODE=false
MISMATCHES=0
FIXES=0
TRAINING_CHANGED=false

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

if [[ "${1:-}" == "--fix" ]]; then
    FIX_MODE=true
fi

# --- File paths ---
CUSTOMER_PBXPROJ="$REPO_ROOT/apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj"
DRIVER_PBXPROJ="$REPO_ROOT/apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj"
RESTAURANT_PBXPROJ="$REPO_ROOT/apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj"

MODELFILE="$REPO_ROOT/.claude/training/Modelfile"
JSONL="$REPO_ROOT/.claude/training/ground-truth-verified.jsonl"
GROUND_TRUTH="$REPO_ROOT/.claude/docs/GROUND_TRUTH.md"
QA_KB="$REPO_ROOT/.claude/agents/QA_KNOWLEDGE_BASE.md"
MEMORY_MD="$HOME/.claude/projects/-Users-jeet-doordash-p2p/memory/MEMORY.md"

# --- Extract source-of-truth build numbers ---
extract_build() {
    local pbxproj="$1"
    grep "CURRENT_PROJECT_VERSION" "$pbxproj" | head -1 | sed 's/.*= //' | sed 's/;.*//' | tr -d ' '
}

CUSTOMER_BUILD=$(extract_build "$CUSTOMER_PBXPROJ")
DRIVER_BUILD=$(extract_build "$DRIVER_PBXPROJ")
RESTAURANT_BUILD=$(extract_build "$RESTAURANT_PBXPROJ")

echo -e "${CYAN}=== Training Data Sync Check ===${NC}"
echo -e "Source of truth: Customer=${GREEN}${CUSTOMER_BUILD}${NC}, Driver=${GREEN}${DRIVER_BUILD}${NC}, Restaurant=${GREEN}${RESTAURANT_BUILD}${NC}"
echo ""

# --- Helper: report pass/fail ---
report() {
    local file_label="$1"
    local status="$2"  # PASS, FAIL, FIXED, SKIP
    local detail="$3"

    case "$status" in
        PASS)  echo -e "  [${GREEN}PASS${NC}]  $file_label" ;;
        FAIL)  echo -e "  [${RED}FAIL${NC}]  $file_label: $detail"
               MISMATCHES=$((MISMATCHES + 1)) ;;
        FIXED) echo -e "  [${YELLOW}FIXED${NC}] $file_label: $detail"
               FIXES=$((FIXES + 1)) ;;
        SKIP)  echo -e "  [${YELLOW}SKIP${NC}]  $file_label: $detail" ;;
    esac
}

# ============================================================
# CHECK 1: Modelfile - Rule 16
# Pattern: "Customer 1073, Driver 183, Restaurant 156"
# ============================================================
echo -e "${CYAN}--- Modelfile (Rule 16) ---${NC}"

if [[ ! -f "$MODELFILE" ]]; then
    report "Modelfile" "SKIP" "file not found"
else
    MODELFILE_LINE=$(grep -n "Latest builds" "$MODELFILE" | head -1 || true)
    MODELFILE_LINENUM=$(echo "$MODELFILE_LINE" | cut -d: -f1)
    MODELFILE_MATCH=$(echo "$MODELFILE_LINE" | grep -oE "Customer [0-9]+, Driver [0-9]+, Restaurant [0-9]+" || true)

    if [[ -z "$MODELFILE_MATCH" ]]; then
        report "Modelfile line $MODELFILE_LINENUM" "SKIP" "pattern not found"
    else
        EXPECTED="Customer ${CUSTOMER_BUILD}, Driver ${DRIVER_BUILD}, Restaurant ${RESTAURANT_BUILD}"
        if [[ "$MODELFILE_MATCH" == "$EXPECTED" ]]; then
            report "Modelfile line $MODELFILE_LINENUM" "PASS" ""
        elif $FIX_MODE; then
            sed -i '' "s/Customer [0-9]*, Driver [0-9]*, Restaurant [0-9]*/${EXPECTED}/" "$MODELFILE"
            report "Modelfile line $MODELFILE_LINENUM" "FIXED" "$MODELFILE_MATCH → $EXPECTED"
            TRAINING_CHANGED=true
        else
            report "Modelfile line $MODELFILE_LINENUM" "FAIL" "found '$MODELFILE_MATCH', expected '$EXPECTED'"
        fi
    fi
fi

# ============================================================
# CHECK 2: JSONL - Build numbers entry
# Pattern: "Customer Build 1073 (v1.0), Driver Build 183 (v1.0), Restaurant Build 156 (v1.0)"
# ============================================================
echo -e "${CYAN}--- ground-truth-verified.jsonl ---${NC}"

if [[ ! -f "$JSONL" ]]; then
    report "JSONL" "SKIP" "file not found"
else
    JSONL_LINE=$(grep -n "latest iOS build numbers" "$JSONL" | head -1 || true)
    JSONL_LINENUM=$(echo "$JSONL_LINE" | cut -d: -f1)

    if [[ -z "$JSONL_LINE" ]]; then
        report "JSONL" "SKIP" "build number entry not found"
    else
        # Extract each build number from the response
        JSONL_C=$(echo "$JSONL_LINE" | grep -oE "Customer Build [0-9]+" | grep -oE "[0-9]+" || true)
        JSONL_D=$(echo "$JSONL_LINE" | grep -oE "Driver Build [0-9]+" | grep -oE "[0-9]+" || true)
        JSONL_R=$(echo "$JSONL_LINE" | grep -oE "Restaurant Build [0-9]+" | grep -oE "[0-9]+" || true)

        FOUND="${JSONL_C}/${JSONL_D}/${JSONL_R}"
        EXPECTED="${CUSTOMER_BUILD}/${DRIVER_BUILD}/${RESTAURANT_BUILD}"

        if [[ "$FOUND" == "$EXPECTED" ]]; then
            report "JSONL line $JSONL_LINENUM" "PASS" ""
        elif $FIX_MODE; then
            sed -i '' "s/Customer Build [0-9]*/Customer Build ${CUSTOMER_BUILD}/g; s/Driver Build [0-9]*/Driver Build ${DRIVER_BUILD}/g; s/Restaurant Build [0-9]*/Restaurant Build ${RESTAURANT_BUILD}/g" "$JSONL"
            report "JSONL line $JSONL_LINENUM" "FIXED" "$FOUND → $EXPECTED"
            TRAINING_CHANGED=true
        else
            report "JSONL line $JSONL_LINENUM" "FAIL" "found $FOUND, expected $EXPECTED"
        fi
    fi
fi

# ============================================================
# CHECK 3: GROUND_TRUTH.md - Header line + Section 13 table
# Header pattern: "Build 1073/183/156"
# Table pattern: "| Customer | 1073 | 1.0 |"
# ============================================================
echo -e "${CYAN}--- GROUND_TRUTH.md ---${NC}"

if [[ ! -f "$GROUND_TRUTH" ]]; then
    report "GROUND_TRUTH.md" "SKIP" "file not found"
else
    # Header line
    GT_HEADER=$(grep -n "Last verified.*Build " "$GROUND_TRUTH" | head -1 || true)
    GT_HEADER_LINENUM=$(echo "$GT_HEADER" | cut -d: -f1)
    GT_HEADER_BUILDS=$(echo "$GT_HEADER" | grep -oE "Build [0-9]+/[0-9]+/[0-9]+" | sed 's/Build //' || true)

    EXPECTED_SLASH="${CUSTOMER_BUILD}/${DRIVER_BUILD}/${RESTAURANT_BUILD}"

    if [[ -z "$GT_HEADER_BUILDS" ]]; then
        report "GROUND_TRUTH.md header" "SKIP" "pattern not found"
    elif [[ "$GT_HEADER_BUILDS" == "$EXPECTED_SLASH" ]]; then
        report "GROUND_TRUTH.md header (line $GT_HEADER_LINENUM)" "PASS" ""
    elif $FIX_MODE; then
        sed -i '' "s|Build [0-9]*/[0-9]*/[0-9]*|Build ${EXPECTED_SLASH}|" "$GROUND_TRUTH"
        report "GROUND_TRUTH.md header (line $GT_HEADER_LINENUM)" "FIXED" "Build $GT_HEADER_BUILDS → Build $EXPECTED_SLASH"
    else
        report "GROUND_TRUTH.md header (line $GT_HEADER_LINENUM)" "FAIL" "found Build $GT_HEADER_BUILDS, expected Build $EXPECTED_SLASH"
    fi

    # Section 13 table - Customer row (pattern: "| Customer | 1073 | 1.0 |")
    GT_C_LINE=$(grep -nE '\| Customer \| [0-9]+ \|' "$GROUND_TRUTH" | head -1 || true)
    GT_C_LINENUM=$(echo "$GT_C_LINE" | cut -d: -f1)
    GT_C_BUILD=$(echo "$GT_C_LINE" | grep -oE '\| [0-9]+ \|' | head -1 | grep -oE '[0-9]+' || true)

    if [[ -z "$GT_C_BUILD" ]]; then
        report "GROUND_TRUTH.md Section 13 Customer" "SKIP" "pattern not found"
    elif [[ "$GT_C_BUILD" == "$CUSTOMER_BUILD" ]]; then
        report "GROUND_TRUTH.md Section 13 Customer (line $GT_C_LINENUM)" "PASS" ""
    elif $FIX_MODE; then
        sed -i '' "${GT_C_LINENUM}s/| Customer | [0-9]* |/| Customer | ${CUSTOMER_BUILD} |/" "$GROUND_TRUTH"
        report "GROUND_TRUTH.md Section 13 Customer (line $GT_C_LINENUM)" "FIXED" "$GT_C_BUILD → $CUSTOMER_BUILD"
    else
        report "GROUND_TRUTH.md Section 13 Customer (line $GT_C_LINENUM)" "FAIL" "found $GT_C_BUILD, expected $CUSTOMER_BUILD"
    fi

    # Section 13 table - Driver row
    GT_D_LINE=$(grep -nE '\| Driver \| [0-9]+ \|' "$GROUND_TRUTH" | head -1 || true)
    GT_D_LINENUM=$(echo "$GT_D_LINE" | cut -d: -f1)
    GT_D_BUILD=$(echo "$GT_D_LINE" | grep -oE '\| [0-9]+ \|' | head -1 | grep -oE '[0-9]+' || true)

    if [[ -z "$GT_D_BUILD" ]]; then
        report "GROUND_TRUTH.md Section 13 Driver" "SKIP" "pattern not found"
    elif [[ "$GT_D_BUILD" == "$DRIVER_BUILD" ]]; then
        report "GROUND_TRUTH.md Section 13 Driver (line $GT_D_LINENUM)" "PASS" ""
    elif $FIX_MODE; then
        sed -i '' "${GT_D_LINENUM}s/| Driver | [0-9]* |/| Driver | ${DRIVER_BUILD} |/" "$GROUND_TRUTH"
        report "GROUND_TRUTH.md Section 13 Driver (line $GT_D_LINENUM)" "FIXED" "$GT_D_BUILD → $DRIVER_BUILD"
    else
        report "GROUND_TRUTH.md Section 13 Driver (line $GT_D_LINENUM)" "FAIL" "found $GT_D_BUILD, expected $DRIVER_BUILD"
    fi

    # Section 13 table - Restaurant row
    GT_R_LINE=$(grep -nE '\| Restaurant \| [0-9]+ \|' "$GROUND_TRUTH" | head -1 || true)
    GT_R_LINENUM=$(echo "$GT_R_LINE" | cut -d: -f1)
    GT_R_BUILD=$(echo "$GT_R_LINE" | grep -oE '\| [0-9]+ \|' | head -1 | grep -oE '[0-9]+' || true)

    if [[ -z "$GT_R_BUILD" ]]; then
        report "GROUND_TRUTH.md Section 13 Restaurant" "SKIP" "pattern not found"
    elif [[ "$GT_R_BUILD" == "$RESTAURANT_BUILD" ]]; then
        report "GROUND_TRUTH.md Section 13 Restaurant (line $GT_R_LINENUM)" "PASS" ""
    elif $FIX_MODE; then
        sed -i '' "${GT_R_LINENUM}s/| Restaurant | [0-9]* |/| Restaurant | ${RESTAURANT_BUILD} |/" "$GROUND_TRUTH"
        report "GROUND_TRUTH.md Section 13 Restaurant (line $GT_R_LINENUM)" "FIXED" "$GT_R_BUILD → $RESTAURANT_BUILD"
    else
        report "GROUND_TRUTH.md Section 13 Restaurant (line $GT_R_LINENUM)" "FAIL" "found $GT_R_BUILD, expected $RESTAURANT_BUILD"
    fi
fi

# ============================================================
# CHECK 4: QA_KNOWLEDGE_BASE.md - Header + Section 7 table + QA Gate
# Header: "Customer 1073 | Driver 183 | Restaurant 156"
# Section 7: "| Customer | com.dollorai.customer | **1073** | 1.0 |"
# QA Gate: "Build 1073/183/156 includes:"
# ============================================================
echo -e "${CYAN}--- QA_KNOWLEDGE_BASE.md ---${NC}"

if [[ ! -f "$QA_KB" ]]; then
    report "QA_KNOWLEDGE_BASE.md" "SKIP" "file not found"
else
    # Header line (pipe-separated)
    QA_HEADER=$(grep -n "iOS Builds:" "$QA_KB" | head -1 || true)
    QA_HEADER_LINENUM=$(echo "$QA_HEADER" | cut -d: -f1)
    QA_HEADER_MATCH=$(echo "$QA_HEADER" | grep -oE "Customer [0-9]+ \| Driver [0-9]+ \| Restaurant [0-9]+" || true)
    EXPECTED_PIPE="Customer ${CUSTOMER_BUILD} | Driver ${DRIVER_BUILD} | Restaurant ${RESTAURANT_BUILD}"

    if [[ -z "$QA_HEADER_MATCH" ]]; then
        report "QA_KB header" "SKIP" "pattern not found"
    elif [[ "$QA_HEADER_MATCH" == "$EXPECTED_PIPE" ]]; then
        report "QA_KB header (line $QA_HEADER_LINENUM)" "PASS" ""
    elif $FIX_MODE; then
        sed -i '' "s/Customer [0-9]* | Driver [0-9]* | Restaurant [0-9]*/${EXPECTED_PIPE}/" "$QA_KB"
        report "QA_KB header (line $QA_HEADER_LINENUM)" "FIXED" "$QA_HEADER_MATCH → $EXPECTED_PIPE"
    else
        report "QA_KB header (line $QA_HEADER_LINENUM)" "FAIL" "found '$QA_HEADER_MATCH', expected '$EXPECTED_PIPE'"
    fi

    # Section 7 table - Customer row (bold markdown: "com.dollorai.customer | **1072**")
    QA_C_LINE=$(grep -n 'com\.dollorai\.customer.*\*\*' "$QA_KB" | head -1 || true)
    QA_C_LINENUM=$(echo "$QA_C_LINE" | cut -d: -f1)
    QA_C_BUILD=$(echo "$QA_C_LINE" | grep -oE '\*\*[0-9]+\*\*' | tr -d '*' || true)

    if [[ -z "$QA_C_BUILD" ]]; then
        report "QA_KB Section 7 Customer" "SKIP" "pattern not found"
    elif [[ "$QA_C_BUILD" == "$CUSTOMER_BUILD" ]]; then
        report "QA_KB Section 7 Customer (line $QA_C_LINENUM)" "PASS" ""
    elif $FIX_MODE; then
        sed -i '' "${QA_C_LINENUM}s/\*\*[0-9]*\*\*/**${CUSTOMER_BUILD}**/" "$QA_KB"
        report "QA_KB Section 7 Customer (line $QA_C_LINENUM)" "FIXED" "$QA_C_BUILD → $CUSTOMER_BUILD"
    else
        report "QA_KB Section 7 Customer (line $QA_C_LINENUM)" "FAIL" "found $QA_C_BUILD, expected $CUSTOMER_BUILD"
    fi

    # Section 7 table - Driver row
    QA_D_LINE=$(grep -n 'com\.dollorai\.delivery.*\*\*' "$QA_KB" | head -1 || true)
    QA_D_LINENUM=$(echo "$QA_D_LINE" | cut -d: -f1)
    QA_D_BUILD=$(echo "$QA_D_LINE" | grep -oE '\*\*[0-9]+\*\*' | tr -d '*' || true)

    if [[ -z "$QA_D_BUILD" ]]; then
        report "QA_KB Section 7 Driver" "SKIP" "pattern not found"
    elif [[ "$QA_D_BUILD" == "$DRIVER_BUILD" ]]; then
        report "QA_KB Section 7 Driver (line $QA_D_LINENUM)" "PASS" ""
    elif $FIX_MODE; then
        sed -i '' "${QA_D_LINENUM}s/\*\*[0-9]*\*\*/**${DRIVER_BUILD}**/" "$QA_KB"
        report "QA_KB Section 7 Driver (line $QA_D_LINENUM)" "FIXED" "$QA_D_BUILD → $DRIVER_BUILD"
    else
        report "QA_KB Section 7 Driver (line $QA_D_LINENUM)" "FAIL" "found $QA_D_BUILD, expected $DRIVER_BUILD"
    fi

    # Section 7 table - Restaurant row
    QA_R_LINE=$(grep -n 'com\.dollorai\.restaurant.*\*\*' "$QA_KB" | head -1 || true)
    QA_R_LINENUM=$(echo "$QA_R_LINE" | cut -d: -f1)
    QA_R_BUILD=$(echo "$QA_R_LINE" | grep -oE '\*\*[0-9]+\*\*' | tr -d '*' || true)

    if [[ -z "$QA_R_BUILD" ]]; then
        report "QA_KB Section 7 Restaurant" "SKIP" "pattern not found"
    elif [[ "$QA_R_BUILD" == "$RESTAURANT_BUILD" ]]; then
        report "QA_KB Section 7 Restaurant (line $QA_R_LINENUM)" "PASS" ""
    elif $FIX_MODE; then
        sed -i '' "${QA_R_LINENUM}s/\*\*[0-9]*\*\*/**${RESTAURANT_BUILD}**/" "$QA_KB"
        report "QA_KB Section 7 Restaurant (line $QA_R_LINENUM)" "FIXED" "$QA_R_BUILD → $RESTAURANT_BUILD"
    else
        report "QA_KB Section 7 Restaurant (line $QA_R_LINENUM)" "FAIL" "found $QA_R_BUILD, expected $RESTAURANT_BUILD"
    fi

    # QA Gate line - "Build 1073/183/156 includes:"
    QA_GATE=$(grep -n "QA Gate.*Build " "$QA_KB" | head -1 || true)
    QA_GATE_LINENUM=$(echo "$QA_GATE" | cut -d: -f1)
    QA_GATE_BUILDS=$(echo "$QA_GATE" | grep -oE "Build [0-9]+/[0-9]+/[0-9]+" | sed 's/Build //' || true)

    if [[ -z "$QA_GATE_BUILDS" ]]; then
        report "QA_KB QA Gate" "SKIP" "pattern not found"
    elif [[ "$QA_GATE_BUILDS" == "$EXPECTED_SLASH" ]]; then
        report "QA_KB QA Gate (line $QA_GATE_LINENUM)" "PASS" ""
    elif $FIX_MODE; then
        sed -i '' "${QA_GATE_LINENUM}s|Build [0-9]*/[0-9]*/[0-9]*|Build ${EXPECTED_SLASH}|" "$QA_KB"
        report "QA_KB QA Gate (line $QA_GATE_LINENUM)" "FIXED" "Build $QA_GATE_BUILDS → Build $EXPECTED_SLASH"
    else
        report "QA_KB QA Gate (line $QA_GATE_LINENUM)" "FAIL" "found Build $QA_GATE_BUILDS, expected Build $EXPECTED_SLASH"
    fi
fi

# ============================================================
# CHECK 5: MEMORY.md - Training verification line
# Pattern: "Build 1073/183/156"
# ============================================================
echo -e "${CYAN}--- MEMORY.md ---${NC}"

if [[ ! -f "$MEMORY_MD" ]]; then
    report "MEMORY.md" "SKIP" "file not found"
else
    MEM_LINE=$(grep -n "verified against Build " "$MEMORY_MD" | head -1 || true)
    MEM_LINENUM=$(echo "$MEM_LINE" | cut -d: -f1)
    MEM_BUILDS=$(echo "$MEM_LINE" | grep -oE "Build [0-9]+/[0-9]+/[0-9]+" | sed 's/Build //' || true)

    if [[ -z "$MEM_BUILDS" ]]; then
        report "MEMORY.md" "SKIP" "pattern not found"
    elif [[ "$MEM_BUILDS" == "$EXPECTED_SLASH" ]]; then
        report "MEMORY.md (line $MEM_LINENUM)" "PASS" ""
    elif $FIX_MODE; then
        sed -i '' "s|verified against Build [0-9]*/[0-9]*/[0-9]*|verified against Build ${EXPECTED_SLASH}|" "$MEMORY_MD"
        report "MEMORY.md (line $MEM_LINENUM)" "FIXED" "Build $MEM_BUILDS → Build $EXPECTED_SLASH"
    else
        report "MEMORY.md (line $MEM_LINENUM)" "FAIL" "found Build $MEM_BUILDS, expected Build $EXPECTED_SLASH"
    fi
fi

# ============================================================
# SUMMARY + OLLAMA REBUILD
# ============================================================
echo ""
echo -e "${CYAN}=== Summary ===${NC}"

TOTAL_CHECKS=$((MISMATCHES + FIXES))

if $FIX_MODE && [[ $FIXES -gt 0 ]]; then
    echo -e "${YELLOW}$FIXES file(s) fixed.${NC}"

    if $TRAINING_CHANGED; then
        echo ""
        echo -e "${CYAN}Rebuilding Ollama model (training files changed)...${NC}"
        if command -v ollama &>/dev/null; then
            (cd "$REPO_ROOT/.claude/training" && ollama create dollor-customer -f Modelfile 2>&1) || {
                echo -e "${RED}Ollama rebuild failed!${NC}"
            }

            echo -e "${CYAN}Verifying Ollama returns correct build numbers...${NC}"
            OLLAMA_RESPONSE=$(echo "What are the latest iOS build numbers?" | ollama run dollor-customer 2>/dev/null || true)

            if echo "$OLLAMA_RESPONSE" | grep -q "$CUSTOMER_BUILD"; then
                echo -e "  Ollama check: ${GREEN}Customer Build $CUSTOMER_BUILD found${NC}"
            else
                echo -e "  Ollama check: ${RED}Customer Build $CUSTOMER_BUILD NOT found in response${NC}"
            fi
        else
            echo -e "${YELLOW}Ollama not installed, skipping rebuild.${NC}"
        fi
    fi
elif [[ $MISMATCHES -gt 0 ]]; then
    echo -e "${RED}$MISMATCHES mismatch(es) found.${NC} Run with ${YELLOW}--fix${NC} to auto-update."
else
    echo -e "${GREEN}All checks passed! Build numbers are in sync.${NC}"
fi

exit $MISMATCHES
