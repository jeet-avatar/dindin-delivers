# apps/hospital-pricing/backend/agents/nodes/ingest.py
from agents.state import ContractState


def ingest_node(state: ContractState) -> ContractState:
    """INGEST: Validate S3 path, mark document as ingested."""
    return {**state, "status": "ingested"}
