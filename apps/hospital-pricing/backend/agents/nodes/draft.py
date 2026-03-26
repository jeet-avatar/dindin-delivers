# apps/hospital-pricing/backend/agents/nodes/draft.py
from agents.state import ContractState


def draft_node(state: ContractState) -> ContractState:
    """DRAFT: Contract generation stub — full impl in Task 12."""
    return {**state, "status": "drafted"}
