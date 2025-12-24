# WYOMING TNC COMPLIANCE RISKS
## What Could Go Wrong If Incorrectly Implemented

**Document Version:** 1.0
**Date:** December 24, 2024
**Jurisdiction:** Wyoming Statutes Title 31, Chapter 20

---

## EXECUTIVE SUMMARY

Failure to properly implement Wyoming TNC compliance can result in:
- **Legal liability** for the platform and drivers
- **Insurance coverage gaps** leaving parties unprotected
- **Consumer protection violations** with state AG enforcement
- **App store rejection** for non-compliant apps
- **Loss of user trust** and reputation damage

---

## 1. ZIP CODE / STATE DETECTION ISSUES

### 1.1 Problem: Wrong State Detection

**Current Issue:** Staging uses California ZIP codes (94xxx) instead of Wyoming (82xxx, 83xxx).

**What Could Go Wrong:**
- System applies California TNC rules instead of Wyoming
- Incorrect insurance requirements displayed
- Wrong platform fees charged
- State-specific disclosures not shown

**Legal Risk:**
- W.S. 31-20-103 violation: Wrong fare disclosure
- W.S. 31-20-105 violation: Incorrect receipt information
- Consumer Protection Act violation: Misleading information

**Fix Required:**
```python
# Wyoming ZIP code ranges
WYOMING_ZIP_RANGES = [
    (82001, 82099),  # Southeast Wyoming (Cheyenne, etc.)
    (82201, 82299),  # Central-east Wyoming
    (82301, 82399),  # South-central Wyoming
    (82401, 82499),  # Northwest Wyoming (Cody, etc.)
    (82501, 82599),  # Central Wyoming
    (82601, 82699),  # Central Wyoming (Casper, etc.)
    (82701, 82799),  # Northeast Wyoming (Gillette, etc.)
    (82801, 82899),  # North Wyoming (Sheridan, etc.)
    (82901, 82999),  # Southwest Wyoming (Rock Springs, etc.)
    (83001, 83099),  # Northwest Wyoming (Jackson, etc.)
]
```

### 1.2 Problem: Cross-Border Rides

**Scenario:** Ride starts in Wyoming, ends in Colorado or Montana.

**What Could Go Wrong:**
- Unclear which state's regulations apply
- Insurance coverage questions
- Different platform fee calculations mid-ride

**Legal Risk:**
- Jurisdictional confusion
- Potential dual-state compliance issues
- Insurance claim disputes

**Fix Required:**
- Use **pickup location** to determine governing law
- Disclose multi-state nature before ride confirmation
- Ensure insurance covers cross-border rides

---

## 2. PLATFORM FEE CALCULATION ERRORS

### 2.1 Problem: Distance Calculation Errors

**What Could Go Wrong:**
- GPS drift causes incorrect distance
- Route changes mid-ride not accounted for
- Straight-line vs. road distance confusion

**Impact:**
- Customer charged wrong tier ($1 vs $2 vs $3)
- Disputes and refund requests
- W.S. 31-20-103 violation (incorrect fare)

**Example Error:**
```
Actual Route: 24.8 miles (should be Tier 2: $2.00)
GPS Error: 25.1 miles (incorrectly charges Tier 3: $3.00)
Customer Overcharged: $1.00
```

**Fix Required:**
- Use road distance API (Google Maps Distance Matrix)
- Round DOWN at tier boundaries (favor customer)
- Log distance calculation for dispute resolution

### 2.2 Problem: Fare-Based vs Distance-Based Confusion

**Current Risk:** Some code paths still use fare-based pricing instead of distance-based.

**Affected Files:**
- `rideshare_payments.py:27` - Uses fare tiers ($35/$70)
- `pricing_config.py:217` - Uses subtotal for tier calculation

**What Could Go Wrong:**
- Inconsistent fees between rideshare and matchmaking routes
- Customer confusion about pricing
- Legal vulnerability (inconsistent disclosures)

**Fix Required:**
- Standardize ALL Wyoming rides to distance-based tiers
- Update `rideshare_payments.py` to match `state_config.py`
- Audit all pricing code paths

---

## 3. INSURANCE COMPLIANCE FAILURES

### 3.1 Problem: Unverified Driver Insurance

**Wyoming Requirement (W.S. 31-20-107):**
- Period 1: $50k/$100k/$25k
- Period 2-3: $1,000,000 combined single limit

**What Could Go Wrong:**
- Driver drives without valid insurance
- Insurance lapses between verification and ride
- Inadequate coverage amounts

**Legal Risk:**
- Platform liability for uninsured accidents
- Customer lawsuits
- Criminal liability in severe cases

**Real-World Scenario:**
```
Driver insurance expires: January 1, 2025
System last verified: December 1, 2024
Accident occurs: January 5, 2025
Result: NO COVERAGE - Platform liable
```

**Fix Required:**
- Real-time insurance verification API (CARFAX, etc.)
- Daily expiration checks
- Automatic driver deactivation on policy lapse
- Platform contingent coverage

### 3.2 Problem: Insurance Period Gaps

**W.S. 31-20-107 defines THREE periods:**

| Period | When | Required Coverage |
|--------|------|-------------------|
| Period 1 | App on, no ride | $50k/$100k/$25k |
| Period 2 | Ride accepted, en route | $1,000,000 |
| Period 3 | Passenger in vehicle | $1,000,000 |

**What Could Go Wrong:**
- System doesn't track which period driver is in
- Accident during Period 1 claims $1M coverage
- Coverage disputes with insurers

**Fix Required:**
- Track driver status: OFFLINE / AVAILABLE / EN_ROUTE / IN_RIDE
- Log period transitions with timestamps
- Ensure correct coverage tier applies

---

## 4. BACKGROUND CHECK FAILURES

### 4.1 Problem: Incomplete Checks

**W.S. 31-20-106 requires:**
- Local criminal background check
- National criminal background check
- Multistate criminal records database
- Sex offender registry (DOJ)
- Driving history review

**What Could Go Wrong:**
- Missing one or more check types
- Using non-compliant third-party service
- Not checking all required databases

**Legal Risk:**
- Driver with criminal history causes incident
- Negligent hiring lawsuit
- State enforcement action

**Fix Required:**
- Use comprehensive service (Checkr, etc.)
- Verify all 5 check types are performed
- Document compliance in driver record

### 4.2 Problem: Disqualifying Offense Missed

**W.S. 31-20-106(b) disqualifies drivers with:**
- Violent felony conviction (ever)
- Sexual offense conviction (ever)
- DUI/DWI within 7 years
- More than 3 moving violations in 3 years

**What Could Go Wrong:**
- Offense in another state not detected
- Pending charges not flagged
- Lookback period calculated incorrectly

**Example Error:**
```
DUI Conviction: December 1, 2018
Check Date: January 1, 2025
Lookback: 7 years = December 1, 2017
Result: SHOULD BE DISQUALIFIED (within 7 years)
System Error: Calculated from January 2018, approved driver
```

**Fix Required:**
- Use conviction date, not check date for lookback
- Check all states, not just current residence
- Implement continuous monitoring

---

## 5. RECEIPT AND DISCLOSURE FAILURES

### 5.1 Problem: Missing Receipt Elements

**W.S. 31-20-105 requires electronic receipt with:**
- Origin of trip
- Destination of trip
- Total time of trip
- Total distance of trip
- Itemized fare charged

**What Could Go Wrong:**
- Receipt missing required field
- Incorrect values displayed
- Receipt not delivered to customer

**Legal Risk:**
- Consumer Protection Act violation
- Customer disputes
- State AG investigation

**Current Check:**
```python
required_fields = [
    "origin_address",
    "destination_address",
    "total_time_minutes",
    "total_distance_miles",
    "fare_breakdown"  # Must be itemized
]
```

### 5.2 Problem: Pre-Ride Disclosure Missing

**W.S. 31-20-103 requires fare disclosure BEFORE ride.**

**What Could Go Wrong:**
- Fare shown after ride starts
- Fare not itemized (just total)
- Platform fee hidden in total

**App Store Risk:**
- Apple/Google reject for non-transparent pricing
- User reviews cite hidden fees
- App suspended from stores

**Fix Required:**
- Show itemized fare BEFORE "Confirm Ride" button
- Require explicit acceptance of fare
- Log user acceptance with timestamp

---

## 6. INDEPENDENT CONTRACTOR MISCLASSIFICATION

### 6.1 Problem: IC Status Violated

**W.S. 31-20-110 requires drivers be ICs if:**
1. TNC doesn't prescribe specific hours
2. TNC doesn't restrict use of other platforms
3. TNC doesn't restrict other commercial activities
4. Written IC agreement exists

**What Could Go Wrong:**
- Platform sends "you must be online 9-5" notifications
- Platform penalizes drivers using Uber/Lyft
- No written IC agreement on file

**Legal Risk:**
- Driver reclassified as employee
- Employment tax liability (FICA, unemployment)
- Benefits liability (health insurance, workers comp)
- Class action lawsuits

**Real-World Example:**
```
Platform Action: "Drivers online less than 20 hours/week
                 will be deactivated"
Result: W.S. 31-20-110(b)(i) violated - prescribing hours
Consequence: Drivers may be deemed employees
```

**Fix Required:**
- Never mandate hours or availability
- Never penalize multi-platform driving
- Maintain signed IC agreements
- Audit all communications to drivers

---

## 7. DATA BREACH AND PRIVACY FAILURES

### 7.1 Problem: Data Breach Without Notification

**W.S. 40-12-502 requires:**
- Prompt investigation of breaches
- Notification "as soon as possible" if misuse likely
- Attorney General notification if 500+ residents affected

**What Could Go Wrong:**
- Breach detected but not reported
- Slow notification (weeks instead of days)
- Missing AG notification

**Legal Risk:**
- State AG enforcement action
- Civil liability to affected users
- Reputation damage

**Required Data to Protect (W.S. 40-12-502):**
- Social Security numbers
- Driver's license numbers
- Financial account numbers
- Credit/debit card numbers
- Username + password combinations

### 7.2 Problem: Inadequate Security

**What Could Go Wrong:**
- Database exposed without encryption
- API endpoints without authentication
- Driver SSNs stored in plain text

**Fix Required:**
- Encrypt data at rest (AES-256)
- Encrypt data in transit (TLS 1.3)
- Hash passwords (bcrypt)
- Audit access logs

---

## 8. PAYMENT PROCESSING FAILURES

### 8.1 Problem: Stripe Integration Errors

**What Could Go Wrong:**
- Payment fails but ride proceeds
- Driver paid for cancelled ride
- Platform fee not collected

**Impact:**
- Revenue loss
- Driver payment disputes
- Accounting discrepancies

**Fix Required:**
- Verify payment BEFORE ride starts
- Implement payment holds/authorizations
- Reconcile payments daily

### 8.2 Problem: Incorrect Revenue Split

**Expected Split:**
| Party | Receives |
|-------|----------|
| Driver | 100% of fare |
| Platform | $1-$3 (distance tier) |
| Customer | Pays fare + platform fee |

**What Could Go Wrong:**
- Platform takes percentage instead of flat fee
- Driver charged platform fee from fare
- Incorrect tier fee applied

**Example Error:**
```
Customer Fare: $50.00
Distance: 15 miles (Tier 2: $2.00)

CORRECT:
  Customer pays: $52.00 ($50 + $2)
  Driver receives: $50.00 (100% of fare)
  Platform receives: $2.00

WRONG:
  Customer pays: $52.00
  Driver receives: $48.00 (fare - fee)
  Platform receives: $4.00 (took from both sides!)
```

---

## 9. APP STORE REJECTION RISKS

### 9.1 Apple App Store

**Rejection Reasons:**
- Guideline 3.0: Business - Hidden fees not disclosed
- Guideline 5.1: Privacy - Inadequate data handling
- Guideline 5.3: Gaming - Misleading pricing

**Fix Required:**
- Clear pricing before purchase
- Complete privacy policy
- Accurate app description

### 9.2 Google Play Store

**Rejection Reasons:**
- Payments Policy: Undisclosed fees
- Privacy Policy: Missing required disclosures
- Deceptive Behavior: Misleading users

**Fix Required:**
- Transparent pricing display
- Privacy policy link in app
- Accurate service description

---

## 10. REMEDIATION CHECKLIST

### Immediate Actions (Before Launch)

- [ ] Update all ZIP codes to Wyoming (82xxx, 83xxx)
- [ ] Verify distance-based fee calculation in all code paths
- [ ] Test electronic receipt generation
- [ ] Verify background check integration
- [ ] Confirm insurance verification system
- [ ] Review all driver communications for IC compliance
- [ ] Test Stripe integration end-to-end
- [ ] Review Terms of Service with Wyoming attorney
- [ ] Review Privacy Policy for W.S. 40-12-502 compliance
- [ ] Test data breach notification workflow

### Ongoing Compliance

- [ ] Daily insurance expiration checks
- [ ] Weekly background check monitoring
- [ ] Monthly compliance audit
- [ ] Quarterly Terms of Service review
- [ ] Annual attorney review of all legal documents

---

## 11. CONTACTS FOR WYOMING COMPLIANCE

**Wyoming Attorney General**
Consumer Protection Unit
2320 Capitol Avenue
Cheyenne, WY 82002
Phone: (307) 777-7841

**Wyoming Department of Transportation**
5300 Bishop Blvd
Cheyenne, WY 82009
Phone: (307) 777-4375

**Legal Counsel (Recommended)**
- Consult Wyoming-licensed transportation attorney
- Consult Wyoming-licensed privacy attorney

---

**Document Classification:** Internal Use Only
**Next Review Date:** March 24, 2025
**Owner:** Legal & Compliance Team
