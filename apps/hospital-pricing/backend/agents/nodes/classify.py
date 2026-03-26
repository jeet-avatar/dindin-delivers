# apps/hospital-pricing/backend/agents/nodes/classify.py
from agents.state import ContractState


def classify_node(state: ContractState) -> ContractState:
    """FLAG: Discrepancy classifier stub — full impl in Task 11."""
    return {**state, "status": "flagged"}
