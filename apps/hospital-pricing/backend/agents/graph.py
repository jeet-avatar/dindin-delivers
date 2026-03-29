# apps/hospital-pricing/backend/agents/graph.py
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.base import BaseCheckpointSaver
from agents.state import ContractState
from agents.nodes.ingest import ingest_node
from agents.nodes.extract import extract_node
from agents.nodes.compare import compare_node
from agents.nodes.classify import classify_node
from agents.nodes.draft import draft_node


def _verify_stub(state: ContractState) -> ContractState:
    """VERIFY: Human-in-the-loop review gate (interrupt_before pauses here)."""
    return {**state, "status": "verified"}


def _resolve_stub(state: ContractState) -> ContractState:
    """RESOLVE: Human resolution gate (interrupt_before pauses here)."""
    return {**state, "status": "resolved"}


def build_graph_with_checkpointer(checkpointer: BaseCheckpointSaver):
    """
    Build and compile the contract lifecycle StateGraph.

    Nodes: INGEST → EXTRACT → VERIFY → COMPARE → FLAG → RESOLVE
    interrupt_before: ["verify", "resolve"] — human-in-the-loop gates
    """
    builder = StateGraph(ContractState)

    builder.add_node("ingest", ingest_node)
    builder.add_node("extract", extract_node)
    builder.add_node("verify", _verify_stub)
    builder.add_node("compare", compare_node)
    builder.add_node("flag", classify_node)
    builder.add_node("resolve", _resolve_stub)
    builder.add_node("draft", draft_node)

    builder.set_entry_point("ingest")
    builder.add_edge("ingest", "extract")
    builder.add_edge("extract", "verify")
    builder.add_edge("verify", "compare")
    builder.add_edge("compare", "flag")
    builder.add_edge("flag", "resolve")
    builder.add_edge("resolve", END)

    return builder.compile(
        checkpointer=checkpointer,
        interrupt_before=["verify", "resolve"],
    )
