#!/usr/bin/env python3
"""
Ground-truth retrieval tests for the bootstrap vectorstore.
Run after ingest_bootstrap.py. Must pass >= 18/20 to proceed to deploy.

Usage: python scripts/test_retrieval.py
Exit code 0 = pass (>= 18/20), 1 = fail
"""
import os
import sys
import logging
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
logging.basicConfig(level=logging.WARNING)

FAISS_PATH  = os.getenv("FAISS_PATH", "./data/vectorstore_ollama")
OLLAMA_URL  = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")
PASS_THRESHOLD = 18

TEST_CASES = [
    # N/ Modules
    {
        "id": "TC-01",
        "query": "how do I load a sales order record in SuiteScript",
        "must_contain": ["record.load", "record.Type.SALES_ORDER", "N/record"],
        "must_not_contain": ["nlapiLoadRecord"],  # old 1.0 API
    },
    {
        "id": "TC-02",
        "query": "create a search to find all open invoices",
        "must_contain": ["search.create", "INVOICE", "search.operator"],
    },
    {
        "id": "TC-03",
        "query": "send an email from a SuiteScript with an attachment",
        "must_contain": ["email.send", "N/email", "attachments"],
    },
    {
        "id": "TC-04",
        "query": "how to get the current user's role in SuiteScript",
        "must_contain": ["runtime.getCurrentUser", "role"],
    },
    {
        "id": "TC-05",
        "query": "what is the governance limit for a scheduled script",
        "must_contain": ["SSS_REQUEST_LIMIT_EXCEEDED", "governance"],
    },
    # Script Types
    {
        "id": "TC-06",
        "query": "what are the entry points for a user event script",
        "must_contain": ["beforeLoad", "context.type", "User Event"],
    },
    {
        "id": "TC-07",
        "query": "how does MapReduce script work in NetSuite",
        "must_contain": ["getInputData", "map", "reduce", "summarize"],
    },
    {
        "id": "TC-08",
        "query": "create a RESTlet that accepts POST requests",
        "must_contain": ["post", "RESTlet", "json.stringify"],
    },
    # Record Schemas
    {
        "id": "TC-09",
        "query": "what fields are on a NetSuite sales order record",
        "must_contain": ["SALES_ORDER", "salesorder", "fulfillment"],
    },
    {
        "id": "TC-10",
        "query": "how to transform a purchase order to vendor bill",
        "must_contain": ["record.transform", "record.type.vendor_bill", "Bill"],
    },
    # Business Processes
    {
        "id": "TC-11",
        "query": "what is the order to cash process in NetSuite",
        "must_contain": ["Invoice", "Payment", "order to cash"],
    },
    {
        "id": "TC-12",
        "query": "procure to pay process steps",
        "must_contain": ["Purchase Order", "Item Receipt", "Vendor Bill"],
    },
    {
        "id": "TC-13",
        "query": "how to create an item fulfillment from a sales order",
        "must_contain": ["transform", "ITEM_FULFILLMENT", "record.type.item_fulfillment"],
    },
    {
        "id": "TC-14",
        "query": "what is the 3-way match in NetSuite purchasing",
        "must_contain": ["PO", "receipt", "bill"],
    },
    # Platform Features
    {
        "id": "TC-15",
        "query": "how to set up a workflow in NetSuite SuiteFlow",
        "must_contain": ["states", "transitions", "actions"],
    },
    {
        "id": "TC-16",
        "query": "what is SuiteQL and how to query custom fields",
        "must_contain": ["SELECT", "FROM", "custbody_"],
    },
    {
        "id": "TC-17",
        "query": "where do I find script deployments in NetSuite",
        "must_contain": ["deployment", "script", "released"],
    },
    {
        "id": "TC-18",
        "query": "custom field internal ID naming conventions",
        "must_contain": ["custbody_", "customrecord_", "scriptid"],
    },
    # SuiteScript patterns
    {
        "id": "TC-19",
        "query": "how to handle errors in SuiteScript",
        "must_contain": ["error.create", "SuiteScriptError", "message"],
    },
    {
        "id": "TC-20",
        "query": "MapReduce for processing large number of records",
        "must_contain": ["getInputData", "map/reduce", "parallel"],
    },
]


def run_tests() -> tuple:
    """Returns (passed, total)."""
    from langchain_ollama import OllamaEmbeddings
    from langchain_community.vectorstores import FAISS

    print(f"\n{'='*60}")
    print(f"ArthaBuild Bootstrap Retrieval Test Suite — {len(TEST_CASES)} cases")
    print(f"{'='*60}\n")

    embeddings = OllamaEmbeddings(model=EMBED_MODEL, base_url=OLLAMA_URL)
    vs = FAISS.load_local(FAISS_PATH, embeddings, allow_dangerous_deserialization=True)

    passed = 0
    for tc in TEST_CASES:
        results = vs.similarity_search(tc["query"], k=5)
        combined = " ".join(r.page_content for r in results).lower()

        must_have_ok = all(m.lower() in combined for m in tc["must_contain"])
        must_not_ok  = all(m.lower() not in combined for m in tc.get("must_not_contain", []))

        status = "PASS" if (must_have_ok and must_not_ok) else "FAIL"
        if status == "PASS":
            passed += 1

        icon = "+" if status == "PASS" else "x"
        print(f"[{icon}] {tc['id']}: {tc['query'][:55]}")
        if status == "FAIL":
            missing = [m for m in tc["must_contain"] if m.lower() not in combined]
            if missing:
                print(f"  Missing: {missing}")
            present_bad = [m for m in tc.get("must_not_contain", []) if m.lower() in combined]
            if present_bad:
                print(f"  Should not contain: {present_bad}")

    print(f"\n{'='*60}")
    print(f"Result: {passed}/{len(TEST_CASES)} passed (threshold: {PASS_THRESHOLD})")
    verdict = "PASS" if passed >= PASS_THRESHOLD else "FAIL"
    print(f"Verdict: {verdict}")
    print(f"{'='*60}\n")
    return passed, len(TEST_CASES)


if __name__ == "__main__":
    passed, total = run_tests()
    sys.exit(0 if passed >= PASS_THRESHOLD else 1)
