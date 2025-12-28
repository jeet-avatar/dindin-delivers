"""
State-Specific Configuration for Dollor.ai
==========================================
Defines operating rules for each state based on TNC regulations.

LEGAL MODEL: TRANSPORTATION NETWORK COMPANY (TNC)
Operating under Wyoming Statutes Title 31, Chapter 20

KEY WYOMING TNC REQUIREMENTS (W.S. 31-20-101 et seq.):
1. No state TNC permit required (W.S. 31-20-111)
2. No local licensing allowed (state preemption)
3. Background checks required (W.S. 31-20-106)
4. Insurance requirements (W.S. 31-20-107):
   - While available: $50k/$100k/$25k
   - While engaged: $1,000,000 combined single limit
5. Drivers are independent contractors (W.S. 31-20-110)

COMPLIANCE NOTES:
- Wyoming does NOT require a state TNC permit
- Wyoming preempts all local TNC regulation
- Platform must verify driver insurance and background checks
- Electronic receipts required after each ride
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Dict
from datetime import datetime


class OperatingModel(Enum):
    """Platform operating models by state"""
    TNC_COMPLIANT = "tnc_compliant"      # Full TNC compliance with state law
    TNC_LIGHT = "tnc_light"              # TNC with minimal state requirements
    FULL_TNC = "full_tnc"                # Heavy TNC regulation (permit required)
    NOT_AVAILABLE = "not_available"       # Not operating in this state


class RiskLevel(Enum):
    """Regulatory risk level"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"


@dataclass
class PlatformFeeTier:
    """Distance-based platform fee tier"""
    min_miles: float
    max_miles: Optional[float]  # None = unlimited
    fee: float
    label: str


@dataclass
class InsuranceRequirement:
    """State-mandated insurance requirements"""
    # Period 1: App on, waiting for ride request
    period1_per_person: float = 50000.0
    period1_per_incident: float = 100000.0
    period1_property: float = 25000.0

    # Period 2 & 3: Ride accepted through dropoff
    period2_3_combined: float = 1000000.0

    # Whether uninsured/underinsured motorist coverage is required
    um_uim_required: bool = True


@dataclass
class BackgroundCheckRequirement:
    """State-mandated background check requirements"""
    criminal_check_required: bool = True
    multistate_database: bool = True
    sex_offender_registry: bool = True
    driving_history: bool = True
    # Disqualifying offenses
    violent_felony_disqualifies: bool = True
    sexual_offense_disqualifies: bool = True
    dui_lookback_years: int = 7
    max_moving_violations_3_years: int = 3


@dataclass
class StateConfig:
    """Configuration for a specific state"""
    state_code: str
    state_name: str
    operating_model: OperatingModel
    risk_level: RiskLevel

    # Platform fee structure (distance-based)
    platform_fee_tiers: List[PlatformFeeTier] = field(default_factory=list)

    # State-specific fees
    state_access_fee: float = 0.0
    airport_fees: Dict[str, float] = field(default_factory=dict)

    # Regulatory requirements
    requires_tnc_permit: bool = False
    state_preempts_local: bool = True
    insurance_requirements: InsuranceRequirement = field(default_factory=InsuranceRequirement)
    background_check_requirements: BackgroundCheckRequirement = field(default_factory=BackgroundCheckRequirement)

    # Independent contractor provisions
    drivers_are_independent_contractors: bool = True
    ic_requirements: List[str] = field(default_factory=list)

    # Operating requirements
    electronic_receipt_required: bool = True
    fare_disclosure_required: bool = True
    vehicle_inspection_required: bool = False
    trade_dress_required: bool = True

    # Legal documents
    terms_of_service_version: str = "1.0"
    privacy_policy_version: str = "1.0"

    # Governing law references
    governing_statute: str = ""
    statute_sections: List[str] = field(default_factory=list)

    # Launch status
    is_live: bool = False
    launch_date: Optional[datetime] = None

    # Notes
    regulatory_notes: str = ""
    compliance_checklist: List[str] = field(default_factory=list)


# =============================================================================
# WYOMING CONFIGURATION - FIRST STATE LAUNCH
# Wyoming Statutes Title 31, Chapter 20 (Transportation Network Companies)
# =============================================================================

WYOMING_INSURANCE = InsuranceRequirement(
    # W.S. 31-20-107(a)(i) - While available
    period1_per_person=50000.0,
    period1_per_incident=100000.0,
    period1_property=25000.0,
    # W.S. 31-20-107(a)(ii) - While engaged
    period2_3_combined=1000000.0,
    # W.S. 31-20-107(a)(ii)(B) - UM/UIM required
    um_uim_required=True
)

WYOMING_BACKGROUND_CHECK = BackgroundCheckRequirement(
    # W.S. 31-20-106(a)
    criminal_check_required=True,
    multistate_database=True,
    sex_offender_registry=True,  # DOJ national registry
    driving_history=True,
    # W.S. 31-20-106(b) - Disqualifying offenses
    violent_felony_disqualifies=True,
    sexual_offense_disqualifies=True,
    dui_lookback_years=7,
    max_moving_violations_3_years=3
)

WYOMING_CONFIG = StateConfig(
    state_code="WY",
    state_name="Wyoming",
    operating_model=OperatingModel.TNC_LIGHT,  # TNC with light regulation
    risk_level=RiskLevel.LOW,

    # Distance-based platform fees
    platform_fee_tiers=[
        PlatformFeeTier(min_miles=0, max_miles=10, fee=1.00, label="Local (<10 mi)"),
        PlatformFeeTier(min_miles=10, max_miles=25, fee=2.00, label="Regional (10-25 mi)"),
        PlatformFeeTier(min_miles=25, max_miles=None, fee=3.00, label="Long Distance (>25 mi)"),
    ],

    # No state-specific TNC fees in Wyoming
    state_access_fee=0.0,
    airport_fees={
        "JAC": 2.00,   # Jackson Hole Airport
        "CYS": 1.50,   # Cheyenne Regional
        "CPR": 1.50,   # Casper-Natrona County
        "RIW": 1.00,   # Riverton Regional
        "SHR": 1.00,   # Sheridan County
        "OTHER": 0.0
    },

    # Regulatory requirements
    requires_tnc_permit=False,  # W.S. 31-20-111 - no state permit
    state_preempts_local=True,  # W.S. 31-20-111 - preempts local regulation
    insurance_requirements=WYOMING_INSURANCE,
    background_check_requirements=WYOMING_BACKGROUND_CHECK,

    # Independent contractor status - W.S. 31-20-110
    drivers_are_independent_contractors=True,
    ic_requirements=[
        "TNC does not unilaterally prescribe hours",
        "TNC does not restrict use of other TNC platforms",
        "TNC does not restrict other commercial activities",
        "Driver and TNC agree in writing to IC status"
    ],

    # Operating requirements
    electronic_receipt_required=True,   # W.S. 31-20-105
    fare_disclosure_required=True,      # W.S. 31-20-103
    vehicle_inspection_required=False,  # Not required by WY law
    trade_dress_required=True,          # W.S. 31-20-104

    # Legal documents
    terms_of_service_version="1.0-WY",
    privacy_policy_version="1.0-WY",

    # Governing law
    governing_statute="Wyoming Statutes Title 31, Chapter 20",
    statute_sections=[
        "31-20-101 (Definitions)",
        "31-20-102 (Agent)",
        "31-20-103 (Fare Collected for Services)",
        "31-20-104 (Identification of TNC Vehicles and Drivers)",
        "31-20-105 (Electronic Receipt)",
        "31-20-106 (Driver Requirements)",
        "31-20-107 (Financial Responsibilities)",
        "31-20-108 (Automobile Insurance Provisions)",
        "31-20-109 (Required Disclosures)",
        "31-20-110 (TNC and Driver Exclusions)",
        "31-20-111 (Controlling Authority)"
    ],

    # Launch status
    is_live=True,
    launch_date=datetime(2024, 12, 24),

    regulatory_notes="""
    WYOMING TNC COMPLIANCE (Title 31, Chapter 20)

    ADVANTAGES:
    - No state TNC permit required
    - No state TNC access fees
    - State preempts all local regulation
    - Clear independent contractor provisions
    - No state vehicle inspection requirements

    REQUIREMENTS:
    1. INSURANCE (W.S. 31-20-107):
       - Period 1 (available): $50k/$100k/$25k
       - Period 2-3 (engaged): $1M combined single limit
       - UM/UIM coverage required

    2. BACKGROUND CHECKS (W.S. 31-20-106):
       - Criminal (local + national + multistate)
       - Sex offender registry (DOJ)
       - Driving history review

    3. DRIVER DISCLOSURES (W.S. 31-20-109):
       - Notify personal insurer of TNC activity
       - Personal policy may not cover TNC activities

    4. RECEIPTS (W.S. 31-20-105):
       - Electronic receipt after each ride
       - Include: origin, destination, time, distance, fare

    5. TRADE DRESS (W.S. 31-20-104):
       - Display TNC identifier on vehicle
    """,

    compliance_checklist=[
        "Background check system integrated (Checkr or equivalent)",
        "Insurance verification process in place",
        "Electronic receipt system functional",
        "Trade dress/decals available for drivers",
        "Independent contractor agreement prepared",
        "Driver insurance disclosure notification ready",
        "Terms of Service compliant with W.S. 31-20",
        "Privacy Policy compliant with W.S. 40-12-502"
    ]
)


# =============================================================================
# OTHER STATES (Future Expansion)
# =============================================================================

CALIFORNIA_CONFIG = StateConfig(
    state_code="CA",
    state_name="California",
    operating_model=OperatingModel.NOT_AVAILABLE,
    risk_level=RiskLevel.VERY_HIGH,
    platform_fee_tiers=[],
    state_access_fee=0.10,  # CPUC TNC Access Fee
    requires_tnc_permit=True,
    state_preempts_local=False,
    is_live=False,
    governing_statute="California Public Utilities Code",
    regulatory_notes="CPUC permit required. $1M insurance. High compliance burden."
)

NEW_YORK_CONFIG = StateConfig(
    state_code="NY",
    state_name="New York",
    operating_model=OperatingModel.NOT_AVAILABLE,
    risk_level=RiskLevel.VERY_HIGH,
    platform_fee_tiers=[],
    requires_tnc_permit=True,
    state_preempts_local=False,
    is_live=False,
    governing_statute="NY Vehicle and Traffic Law Article 44-B",
    regulatory_notes="NYC requires TLC licensing. Separate regulations by region."
)


# =============================================================================
# STATE REGISTRY
# =============================================================================

STATE_CONFIGS: Dict[str, StateConfig] = {
    "WY": WYOMING_CONFIG,
    "CA": CALIFORNIA_CONFIG,
    "NY": NEW_YORK_CONFIG,
}


def get_state_config(state_code: str) -> Optional[StateConfig]:
    """Get configuration for a specific state."""
    return STATE_CONFIGS.get(state_code.upper())


def is_state_live(state_code: str) -> bool:
    """Check if a state is live for operations."""
    config = get_state_config(state_code)
    return config is not None and config.is_live


def get_live_states() -> List[StateConfig]:
    """Get all states that are currently live."""
    return [config for config in STATE_CONFIGS.values() if config.is_live]


def get_platform_fee(state_code: str, distance_miles: float) -> float:
    """Get platform fee for a ride based on state and distance."""
    config = get_state_config(state_code)
    if not config or not config.platform_fee_tiers:
        return 0.0

    for tier in config.platform_fee_tiers:
        if tier.max_miles is None:
            if distance_miles >= tier.min_miles:
                return tier.fee
        elif tier.min_miles <= distance_miles < tier.max_miles:
            return tier.fee

    return config.platform_fee_tiers[0].fee if config.platform_fee_tiers else 0.0


def get_platform_fee_tier(state_code: str, distance_miles: float) -> Optional[PlatformFeeTier]:
    """Get the platform fee tier for a given distance."""
    config = get_state_config(state_code)
    if not config or not config.platform_fee_tiers:
        return None

    for tier in config.platform_fee_tiers:
        if tier.max_miles is None:
            if distance_miles >= tier.min_miles:
                return tier
        elif tier.min_miles <= distance_miles < tier.max_miles:
            return tier

    return config.platform_fee_tiers[0] if config.platform_fee_tiers else None


# Legacy aliases for backward compatibility
get_connection_fee = get_platform_fee
get_connection_fee_tier = get_platform_fee_tier


def validate_driver_for_state(
    state_code: str,
    has_insurance: bool,
    insurance_verified: bool,
    background_check_passed: bool,
    has_driving_history: bool
) -> Dict[str, any]:
    """Validate if a driver meets Wyoming TNC requirements (W.S. 31-20-106, 31-20-107)."""
    config = get_state_config(state_code)
    if not config:
        return {"valid": False, "errors": ["State not configured"]}

    errors = []
    bc = config.background_check_requirements
    ins = config.insurance_requirements

    # Insurance check
    if not has_insurance:
        errors.append(f"Insurance required: ${ins.period2_3_combined:,.0f} while engaged in ride")

    if not insurance_verified:
        errors.append("Insurance must be verified before driving")

    # Background check
    if not background_check_passed:
        errors.append("Background check required (criminal, sex offender registry, driving history)")

    if not has_driving_history:
        errors.append("Driving history review required")

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "state": state_code,
        "requirements": {
            "insurance": {
                "period1": f"${ins.period1_per_person:,.0f}/${ins.period1_per_incident:,.0f}/${ins.period1_property:,.0f}",
                "period2_3": f"${ins.period2_3_combined:,.0f} combined",
                "um_uim": ins.um_uim_required
            },
            "background_check": {
                "criminal": bc.criminal_check_required,
                "multistate": bc.multistate_database,
                "sex_offender": bc.sex_offender_registry,
                "driving_history": bc.driving_history
            }
        },
        "statute": config.governing_statute
    }


def get_terms_of_service(state_code: str) -> Dict[str, any]:
    """Get state-specific terms of service summary."""
    config = get_state_config(state_code)
    if not config:
        return {"error": "State not configured"}

    return {
        "state": config.state_name,
        "state_code": config.state_code,
        "version": config.terms_of_service_version,
        "operating_model": config.operating_model.value,
        "governing_law": config.governing_statute,
        "statute_sections": config.statute_sections,
        "platform_role": (
            "Dollor.ai operates as a Transportation Network Company (TNC) under "
            f"{config.governing_statute}, connecting riders with independent driver-contractors."
        ),
        "driver_status": {
            "classification": "Independent Contractor" if config.drivers_are_independent_contractors else "Employee",
            "requirements": config.ic_requirements
        },
        "insurance_requirements": {
            "period1_available": (
                f"${config.insurance_requirements.period1_per_person:,.0f}/"
                f"${config.insurance_requirements.period1_per_incident:,.0f}/"
                f"${config.insurance_requirements.period1_property:,.0f}"
            ),
            "period2_3_engaged": f"${config.insurance_requirements.period2_3_combined:,.0f} combined single limit",
            "um_uim_required": config.insurance_requirements.um_uim_required
        },
        "platform_fees": [
            {
                "label": tier.label,
                "distance_range": f"{tier.min_miles}-{tier.max_miles if tier.max_miles else '+'} miles",
                "fee": f"${tier.fee:.2f}"
            }
            for tier in config.platform_fee_tiers
        ],
        "compliance_notes": config.compliance_checklist,
        "effective_date": config.launch_date.isoformat() if config.launch_date else None
    }


def get_privacy_policy_requirements(state_code: str) -> Dict[str, any]:
    """Get state-specific privacy policy requirements."""
    config = get_state_config(state_code)
    if not config:
        return {"error": "State not configured"}

    # Wyoming-specific privacy requirements
    if state_code == "WY":
        return {
            "state": "Wyoming",
            "version": config.privacy_policy_version,
            "data_breach_notification": {
                "statute": "W.S. 40-12-502",
                "requirement": "Notify affected residents as soon as possible",
                "attorney_general_notification": "Required if 500+ residents affected"
            },
            "consumer_protection": {
                "statute": "W.S. 40-12-101 et seq.",
                "enforcement": "Wyoming Attorney General"
            },
            "personal_identifying_information": [
                "Social Security number",
                "Driver's license number",
                "State ID number",
                "Financial account numbers",
                "Credit/debit card numbers",
                "Username + password",
                "Medical information",
                "Health insurance ID",
                "Passport number",
                "Biometric data"
            ],
            "required_disclosures": [
                "What data is collected",
                "How data is used",
                "With whom data is shared",
                "How data is protected",
                "User rights regarding their data",
                "Data breach notification procedures"
            ]
        }

    return {"state": state_code, "requirements": "Consult state law"}
