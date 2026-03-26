# apps/hospital-pricing/backend/agents/nodes/extract.py
from agents.state import ContractState


def extract_node(state: ContractState) -> ContractState:
    """EXTRACT: GPT-4o extraction stub — full impl in Task 9."""
    return {**state, "status": "extracted", "contract_terms": {"stub": True}}
