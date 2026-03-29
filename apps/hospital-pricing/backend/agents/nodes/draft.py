# apps/hospital-pricing/backend/agents/nodes/draft.py
"""
DRAFT node: LangChain GPT-4o drafting agent for wholesale agreements.
Fills 4 GPO category templates (pharma/devices/supplies/general).
"""
import os
from pathlib import Path
from typing import Any
from agents.state import ContractState

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"


def load_template(category: str) -> str:
    """
    Load template text for the given GPO category.
    Falls back to general.txt if category-specific template not found.
    """
    template_path = TEMPLATES_DIR / f"{category.lower()}.txt"
    fallback_path = TEMPLATES_DIR / "general.txt"

    if template_path.exists():
        return template_path.read_text()
    return fallback_path.read_text()


def _generate_mfn_clause(mfn_present: bool, trigger_type: str = "automatic") -> str:
    """Generate MFN clause text when mfn_present=True."""
    if not mfn_present:
        return "No Most Favored Nation clause applies to this Agreement."

    return (
        f"MOST FAVORED NATION: Supplier warrants that the prices provided herein are no less favorable "
        f"than the prices offered to any other customer for the same goods under similar conditions. "
        f"MFN trigger: {trigger_type}. Cure period: 30 days. True-up: retroactive."
    )


def draft_agreement(
    hospital_entity_name: str,
    supplier_name: str,
    effective_date: str,
    expiration_date: str,
    gpo_contract_number: str,
    admin_fee_pct: float,
    price_escalation_cap_pct: float,
    mfn_present: bool,
    baa_required: bool,
    category: str = "general",
) -> str:
    """
    Use LangChain GPT-4o to fill the appropriate GPO template.
    Returns the drafted agreement text.
    """
    from langchain_openai import ChatOpenAI
    from langchain_core.prompts import ChatPromptTemplate

    template_text = load_template(category)

    mfn_clause_text = _generate_mfn_clause(mfn_present)
    baa_status = (
        "BAA required — must be executed before contract activation"
        if baa_required
        else "BAA not required"
    )

    # Fill basic template variables (non-LLM substitution)
    filled_template = template_text.format(
        hospital_entity_name=hospital_entity_name,
        supplier_name=supplier_name,
        effective_date=effective_date,
        expiration_date=expiration_date,
        gpo_contract_number=gpo_contract_number or "N/A",
        admin_fee_pct=f"{admin_fee_pct * 100:.2f}",
        price_escalation_cap_pct=f"{price_escalation_cap_pct * 100:.2f}",
        mfn_clause_text=mfn_clause_text,
        baa_status=baa_status,
    )

    # Use GPT-4o to review and refine the filled template
    model = ChatOpenAI(model="gpt-4o", temperature=0.3)
    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            (
                "You are a healthcare contracting expert. Review and refine this wholesale agreement draft. "
                "Ensure legal clauses are properly worded and AKS/HIPAA compliance language is correct. "
                "Keep all variable substitutions. Return only the final agreement text, no commentary."
            ),
        ),
        ("human", "Draft agreement:\n\n{draft}"),
    ])

    chain = prompt | model
    response = chain.invoke({"draft": filled_template})
    return response.content


def draft_node(state: ContractState) -> ContractState:
    """DRAFT node: Generate wholesale agreement draft from contract terms."""
    try:
        contract_terms = state.get("contract_terms") or {}

        agreement_text = draft_agreement(
            hospital_entity_name=contract_terms.get("hospital_entity_name", "Hospital Entity"),
            supplier_name=contract_terms.get("supplier_name", "Supplier"),
            effective_date=str(contract_terms.get("effective_date", "TBD")),
            expiration_date=str(contract_terms.get("expiration_date", "TBD")),
            gpo_contract_number=contract_terms.get("gpo_contract_number", ""),
            admin_fee_pct=float(contract_terms.get("admin_fee_pct") or 0.02),
            price_escalation_cap_pct=0.03,
            mfn_present=contract_terms.get("mfn_present", False),
            baa_required=contract_terms.get("baa_required", False),
            category=contract_terms.get("category", "general"),
        )

        return {
            **state,
            "status": "drafted",
            "contract_terms": {
                **(state.get("contract_terms") or {}),
                "agreement_draft": agreement_text,
            },
        }
    except Exception as exc:
        return {**state, "status": "error", "error": f"Draft failed: {exc}"}
