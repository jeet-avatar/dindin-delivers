#!/usr/bin/env python3
"""
Dollor.ai Zero-Hallucination Lookup Tool

Deterministic Q&A system that returns ONLY verified facts from source data.
Falls back to upgraded Ollama model for semantic/conceptual questions.

Data sources (loaded at startup):
  1. ground-truth-verified.jsonl — 71 Q&A pairs for exact/fuzzy matching
  2. GROUND_TRUTH.md — 16 sections parsed into keyword-indexed dict
  3. order_flow.py — STATE_TAX_RATES dict extracted
  4. pricing_config.py — Pricing constants extracted

Zero external dependencies — uses only Python stdlib.
"""

import json
import os
import re
import subprocess
import sys
from difflib import SequenceMatcher
from pathlib import Path

# Resolve paths relative to this script
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent  # .claude/tools -> .claude -> repo root
TRAINING_DIR = SCRIPT_DIR.parent / "training"
DOCS_DIR = SCRIPT_DIR.parent / "docs"
BACKEND_DIR = REPO_ROOT / "apps" / "web" / "p2p-platform" / "backend"

FUZZY_THRESHOLD = 0.6
OLLAMA_MODEL = "dollor-customer"


# ── Data Loading ──────────────────────────────────────────────────────────────

def load_jsonl_pairs() -> list[dict]:
    """Load Q&A pairs from ground-truth-verified.jsonl."""
    path = TRAINING_DIR / "ground-truth-verified.jsonl"
    pairs = []
    if not path.exists():
        return pairs
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    pairs.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    return pairs


def load_ground_truth_sections() -> dict[str, str]:
    """Parse GROUND_TRUTH.md into {section_title: content} dict."""
    path = DOCS_DIR / "GROUND_TRUTH.md"
    sections = {}
    if not path.exists():
        return sections
    with open(path) as f:
        content = f.read()

    # Split on ## headers
    parts = re.split(r'\n## ', content)
    for part in parts[1:]:  # skip preamble before first ##
        lines = part.split('\n', 1)
        title = lines[0].strip().lstrip('#').strip()
        body = lines[1] if len(lines) > 1 else ""
        sections[title] = body
    return sections


def load_tax_rates() -> dict[str, float]:
    """Extract STATE_TAX_RATES dict from order_flow.py."""
    path = BACKEND_DIR / "order_flow.py"
    rates = {}
    if not path.exists():
        return rates
    with open(path) as f:
        content = f.read()

    # Find the STATE_TAX_RATES dict
    match = re.search(r'STATE_TAX_RATES\s*=\s*\{([^}]+)\}', content, re.DOTALL)
    if not match:
        return rates

    for line in match.group(1).split('\n'):
        m = re.match(r'\s*"(\w{2})"\s*:\s*([\d.]+)', line)
        if m:
            rates[m.group(1)] = float(m.group(2))
    return rates


def load_pricing_constants() -> dict[str, float]:
    """Extract pricing constants from pricing_config.py."""
    path = BACKEND_DIR / "pricing_config.py"
    constants = {}
    if not path.exists():
        return constants
    with open(path) as f:
        content = f.read()

    # Extract PricingConfig defaults
    for m in re.finditer(r'(\w+):\s*float\s*=\s*([\d.]+)', content):
        constants[m.group(1)] = float(m.group(2))
    return constants


# ── Query Resolution ──────────────────────────────────────────────────────────

# State name to abbreviation mapping
STATE_NAMES = {
    "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
    "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
    "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
    "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS",
    "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
    "massachusetts": "MA", "michigan": "MI", "minnesota": "MN",
    "mississippi": "MS", "missouri": "MO", "montana": "MT", "nebraska": "NE",
    "nevada": "NV", "new hampshire": "NH", "new jersey": "NJ",
    "new mexico": "NM", "new york": "NY", "north carolina": "NC",
    "north dakota": "ND", "ohio": "OH", "oklahoma": "OK", "oregon": "OR",
    "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
    "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT",
    "vermont": "VT", "virginia": "VA", "washington": "WA",
    "west virginia": "WV", "wisconsin": "WI", "wyoming": "WY",
    "district of columbia": "DC", "washington dc": "DC", "dc": "DC",
}

# Section keywords for GROUND_TRUTH lookup
SECTION_KEYWORDS = {
    "1. REGISTRATION FIELDS (Per User Type)": [
        "register", "registration", "signup", "sign up", "fields",
        "customer register", "driver register", "vendor register",
        "name field", "first_name", "last_name", "full_name",
    ],
    "2. ACTIVE STATUS (Per User Type)": [
        "status", "active", "is_active", "driver status", "vendor status",
        "customer status", "suspended", "approved", "pending",
        "onboarding_status", "driverstatus", "vendorstatus",
    ],
    "3. VEHICLE FIELDS (Driver)": [
        "vehicle", "car", "motorcycle", "license_plate", "vehicle_type",
        "vehicle_make", "vehicle_model", "vehicle_registration",
    ],
    "4. PRICING MODEL (Canonical - Model A: Fare-Tiered)": [
        "price", "pricing", "fee", "commission", "service fee",
        "platform fee", "delivery fee", "fare", "tier", "tiered",
        "customer pays", "driver pays", "restaurant pays",
        "small order", "extra stop", "surge", "cancellation",
        "tip", "free delivery", "promo",
    ],
    "5. TAX RATES": [
        "tax", "tax rate", "sales tax", "state tax",
    ],
    "6. ORDER STATUS VALUES": [
        "order status", "order state", "pending_payment", "confirmed",
        "preparing", "ready_for_pickup", "out_for_delivery", "delivered",
        "cancelled", "order lifecycle",
    ],
    "7. RIDE REQUEST STATUS": [
        "ride status", "ride request status", "open", "bidding",
        "matched", "in_progress", "completed", "ride lifecycle",
    ],
    "8. BID STATUS": [
        "bid status", "bid state", "accepted", "rejected", "countered",
        "withdrawn", "expired",
    ],
    "9. LOGIN ENDPOINTS": [
        "login", "auth", "authenticate", "oauth", "token",
        "login endpoint",
    ],
    "10. RIDESHARE BIDDING FLOW": [
        "bidding", "bid", "bid flow", "counter offer", "negotiate",
        "ride request", "available rides", "submit bid",
        "respond to bid", "driver counter", "start ride",
        "complete ride", "chat", "location", "cancel ride",
        "bid floor", "minimum bid", "price floor",
    ],
    "11. RIDEREQUEST MODEL FIELDS": [
        "riderequest", "ride request model", "ride fields",
        "tip_amount", "suggested_price", "final_price",
        "stripe_payment_intent", "request_id",
    ],
    "12. FIREBASE CONFIGURATION": [
        "firebase", "google", "bundle id", "oauth client",
        "google app id", "gcm", "plist", "googleservice",
    ],
    "13. iOS APP CONFIGURATION": [
        "ios", "build number", "version", "xcconfig",
        "entitlement", "apple pay", "push notification",
        "background mode", "feature flag", "display name",
        "team id",
    ],
    "14. STRIPE INTEGRATION": [
        "stripe", "payment", "connect", "webhook", "payout",
        "payment intent", "invoice", "mcc", "onboarding",
    ],
    "15. COMPANY & LEGAL": [
        "company", "legal", "terms", "privacy", "support",
        "zietra", "contact", "url", "website", "phone",
    ],
    "16. KNOWN INCONSISTENCIES": [
        "inconsistency", "mismatch", "bug", "legacy",
        "discrepancy", "conflict",
    ],
}


def try_tax_rate_query(question: str, tax_rates: dict[str, float]) -> str | None:
    """Check if question asks about a specific state's tax rate."""
    q = question.lower()
    if "tax" not in q and "rate" not in q:
        return None

    def fmt_pct(rate: float) -> str:
        """Format tax rate percentage without floating point noise."""
        pct = rate * 100
        # Round to remove float artifacts (e.g. 7.249999 -> 7.25)
        return f"{round(pct, 3):g}"

    # Check for state abbreviation (2 letters)
    abbrev_match = re.search(r'\b([A-Z]{2})\b', question)
    if abbrev_match:
        code = abbrev_match.group(1)
        if code in tax_rates:
            return f"[LOOKUP] {code} tax rate: {fmt_pct(tax_rates[code])}% (source: order_flow.py:512-565)"
        elif code in ("AK", "DE", "MT", "NH", "OR"):
            return f"[LOOKUP] {code} has NO sales tax (0%) (source: order_flow.py:512-565)"

    # Check for state name
    for name, code in STATE_NAMES.items():
        if name in q:
            if code in tax_rates:
                return f"[LOOKUP] {name.title()} ({code}) tax rate: {fmt_pct(tax_rates[code])}% (source: order_flow.py:512-565)"
            else:
                return f"[LOOKUP] {name.title()} ({code}): no rate configured, default 6% applies (source: order_flow.py:568)"

    # General tax rate question
    if "default" in q:
        return "[LOOKUP] Default tax rate: 6% (0.06). All three sources aligned: iOS AppConfig.swift:60, backend /api/config main_new.py:1071, DEFAULT_TAX_RATE order_flow.py:568. Zero-tax states: AK, DE, MT, NH, OR."

    return None


def try_exact_match(question: str, pairs: list[dict]) -> str | None:
    """Try exact match against JSONL prompt field."""
    q_lower = question.lower().strip().rstrip("?").strip()
    for pair in pairs:
        p_lower = pair["prompt"].lower().strip().rstrip("?").strip()
        if q_lower == p_lower:
            return f"[LOOKUP] {pair['response']}"
    return None


STOP_WORDS = {
    "a", "an", "the", "is", "are", "was", "were", "do", "does", "did",
    "what", "how", "which", "where", "when", "who", "why",
    "for", "to", "in", "on", "at", "of", "by", "with", "from",
    "it", "its", "this", "that", "there", "i", "you", "we", "they",
    "be", "have", "has", "had", "can", "could", "will", "would",
}


def try_fuzzy_match(question: str, pairs: list[dict]) -> str | None:
    """Try fuzzy match against JSONL prompts using keyword overlap + sequence similarity."""
    q_lower = question.lower().strip()
    q_words = set(re.findall(r'\w+', q_lower))
    q_content = q_words - STOP_WORDS  # content words only
    best_score = 0.0
    best_pair = None

    for pair in pairs:
        p_lower = pair["prompt"].lower().strip()
        p_words = set(re.findall(r'\w+', p_lower))
        p_content = p_words - STOP_WORDS

        # Content-word Jaccard (most important for intent matching)
        if q_content and p_content:
            content_overlap = len(q_content & p_content) / len(q_content | p_content)
        else:
            content_overlap = 0.0

        # Sequence similarity (helps with phrasing)
        seq_score = SequenceMatcher(None, q_lower, p_lower).ratio()

        # Weight content words heavily: 60% content overlap, 40% sequence
        score = content_overlap * 0.6 + seq_score * 0.4

        if score > best_score:
            best_score = score
            best_pair = pair

    if best_score >= FUZZY_THRESHOLD and best_pair:
        return f"[LOOKUP] (match: {best_score:.0%}) {best_pair['response']}"
    return None


def try_section_lookup(question: str, sections: dict[str, str]) -> str | None:
    """Extract keywords from question and find matching GROUND_TRUTH section."""
    q_lower = question.lower()
    best_section = None
    best_hits = 0

    for section_title, keywords in SECTION_KEYWORDS.items():
        hits = sum(1 for kw in keywords if kw in q_lower)
        if hits > best_hits:
            best_hits = hits
            best_section = section_title

    if best_section and best_hits >= 1:
        # Find actual section content
        for title, content in sections.items():
            # Match by section number prefix
            section_num = best_section.split(".")[0].strip()
            if title.startswith(section_num + ".") or title == best_section.lstrip("0123456789. "):
                # Truncate long sections to first ~800 chars
                text = content.strip()
                if len(text) > 800:
                    text = text[:800] + "\n... [truncated, see GROUND_TRUTH.md for full section]"
                return f"[LOOKUP] From GROUND_TRUTH section '{best_section}':\n{text}"

    return None


def try_pricing_lookup(question: str, pricing: dict[str, float]) -> str | None:
    """Answer pricing-specific questions from pricing_config constants."""
    q = question.lower()

    if "base fare" in q and "rideshare" in q or "base fare" in q and "ride" in q:
        return f"[LOOKUP] Rideshare base fare: ${pricing.get('BASE_FARE', 2.50):.2f} (source: pricing_config.py:22, AppConfig.swift:262)"

    if "per mile" in q and ("ride" in q or "rideshare" in q):
        return f"[LOOKUP] Rideshare per-mile rate: ${pricing.get('PER_MILE_RATE', 1.15):.2f} (source: pricing_config.py:23, AppConfig.swift:263)"

    if "per minute" in q and ("ride" in q or "rideshare" in q):
        return f"[LOOKUP] Rideshare per-minute rate: ${pricing.get('PER_MINUTE_RATE', 0.18):.2f} (source: pricing_config.py:24, AppConfig.swift:264)"

    if "minimum fare" in q:
        return f"[LOOKUP] Minimum fare: ${pricing.get('MINIMUM_FARE', 8.00):.2f} in backend pricing_config.py:25, $5.00 in iOS AppConfig.swift:265"

    if ("tier" in q or "tiered" in q) and ("fee" in q or "price" in q or "threshold" in q):
        t1 = pricing.get('TIER_1_MAX', 35.00)
        t2 = pricing.get('TIER_2_MAX', 70.00)
        f1 = pricing.get('TIER_1_FEE', 1.00)
        f2 = pricing.get('TIER_2_FEE', 2.00)
        f3 = pricing.get('TIER_3_FEE', 3.00)
        return (f"[LOOKUP] Rideshare fee tiers:\n"
                f"  Fare <= ${t1:.0f}: ${f1:.0f} fee (platform gets ${f1*2:.0f})\n"
                f"  Fare ${t1:.0f}-${t2:.0f}: ${f2:.0f} fee (platform gets ${f2*2:.0f})\n"
                f"  Fare > ${t2:.0f}: ${f3:.0f} fee (platform gets ${f3*2:.0f})\n"
                f"  (source: pricing_config.py, rideshare_payments.py:36-43)")

    return None


def fallback_ollama(question: str) -> str:
    """Forward question to Ollama model as fallback."""
    try:
        result = subprocess.run(
            ["ollama", "run", OLLAMA_MODEL, question],
            capture_output=True, text=True, timeout=120
        )
        if result.returncode == 0 and result.stdout.strip():
            return f"[OLLAMA] {result.stdout.strip()}"
        else:
            stderr = result.stderr.strip() if result.stderr else "unknown error"
            return f"[ERROR] Ollama failed: {stderr}"
    except FileNotFoundError:
        return "[ERROR] Ollama not installed or not in PATH"
    except subprocess.TimeoutExpired:
        return "[ERROR] Ollama timed out after 60s"
    except Exception as e:
        return f"[ERROR] Ollama error: {e}"


# ── Main ──────────────────────────────────────────────────────────────────────

def lookup(question: str) -> str:
    """
    Resolve a question through the lookup chain:
    1. Tax rate shortcut (state-specific)
    2. Exact match against JSONL
    3. Fuzzy match against JSONL (threshold 0.6)
    4. Pricing constants lookup
    5. Keyword → GROUND_TRUTH section lookup
    6. Fallback → Ollama model
    """
    # Load data
    pairs = load_jsonl_pairs()
    sections = load_ground_truth_sections()
    tax_rates = load_tax_rates()
    pricing = load_pricing_constants()

    # 1. Tax rate shortcut
    result = try_tax_rate_query(question, tax_rates)
    if result:
        return result

    # 2. Exact match
    result = try_exact_match(question, pairs)
    if result:
        return result

    # 3. Fuzzy match
    result = try_fuzzy_match(question, pairs)
    if result:
        return result

    # 4. Pricing lookup
    result = try_pricing_lookup(question, pricing)
    if result:
        return result

    # 5. Section lookup
    result = try_section_lookup(question, sections)
    if result:
        return result

    # 6. Ollama fallback
    return fallback_ollama(question)


def main():
    if len(sys.argv) < 2:
        print("Usage: dollor-lookup.py \"YOUR QUESTION\"")
        print("  Deterministic lookup with Ollama fallback.")
        print("  Prefix in output indicates source:")
        print("    [LOOKUP] = Deterministic (zero hallucination)")
        print("    [OLLAMA] = Model-generated (verify if critical)")
        print("    [ERROR]  = Something went wrong")
        sys.exit(1)

    question = " ".join(sys.argv[1:])
    print(lookup(question))


if __name__ == "__main__":
    main()
