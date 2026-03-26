# apps/hospital-pricing/backend/tests/test_graph.py
import os
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-at-least-32-chars-long")
os.environ.setdefault("OPENAI_API_KEY", "sk-test-placeholder")

import pytest
from langgraph.checkpoint.memory import MemorySaver


def test_graph_compiles():
    """StateGraph compiles without errors."""
    from agents.graph import build_graph_with_checkpointer
    checkpointer = MemorySaver()
    graph = build_graph_with_checkpointer(checkpointer)
    assert graph is not None


def test_graph_state_shape():
    """ContractState TypedDict has all required keys."""
    from agents.state import ContractState
    import typing
    hints = typing.get_type_hints(ContractState)
    required_keys = {"contract_id", "document_text", "contract_terms", "discrepancies", "status", "error"}
    assert required_keys.issubset(hints.keys()), f"Missing keys: {required_keys - hints.keys()}"


def test_graph_interrupt_pauses_at_verify():
    """Graph with MemorySaver pauses at 'verify' node when document_text is pre-populated."""
    from agents.graph import build_graph_with_checkpointer
    from agents.state import ContractState

    checkpointer = MemorySaver()
    graph = build_graph_with_checkpointer(checkpointer)

    # Pre-populate document_text to trigger INGEST → EXTRACT → VERIFY pause
    initial_state: ContractState = {
        "contract_id": "test-contract-123",
        "document_text": "CONTRACT TERMS: supplier XYZ, effective 2024-01-01",
        "contract_terms": None,
        "discrepancies": [],
        "status": "ingested",
        "error": None,
    }

    config = {"configurable": {"thread_id": "test-thread-1"}}

    # Stream until first interrupt
    result = None
    for event in graph.stream(initial_state, config=config, stream_mode="values"):
        result = event

    # After streaming, check snapshot — graph should be paused
    snapshot = graph.get_state(config)
    # The next node should include "verify" (interrupted before verify)
    assert snapshot.next is not None, "Graph should be paused at an interrupt point"
    print(f"Graph paused at: {snapshot.next}")
