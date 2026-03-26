# apps/hospital-pricing/backend/agents/state.py
from typing import Any, Optional
from typing_extensions import TypedDict


class ContractState(TypedDict):
    contract_id: str
    document_text: str
    contract_terms: Optional[dict[str, Any]]
    discrepancies: list[dict[str, Any]]
    status: str   # "pending" | "ingested" | "extracted" | "verified" | "compared" | "flagged" | "resolved"
    error: Optional[str]
