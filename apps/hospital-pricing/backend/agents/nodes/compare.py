# apps/hospital-pricing/backend/agents/nodes/compare.py
from agents.state import ContractState


def compare_node(state: ContractState) -> ContractState:
    """COMPARE: Invoice vs contract comparison stub."""
    return {**state, "status": "compared"}
