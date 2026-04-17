"""Intent classifier coverage — locks in the production-ready behaviour
that the RAG launch test surfaced. Each row is a real message we've seen
(or are likely to see) and the intent it MUST produce."""
import pytest
from model_utils import infer_intent


KNOWLEDGE_QUESTIONS = [
    "What entry points does the UserEventScript type define in SuiteScript 2.1?",
    "What governance unit cost does a record.save call incur?",
    "What is the internal ID of the Sales Order record type?",
    "How do I navigate to create a new Saved Search in NetSuite UI?",
    "Explain the difference between Client Script and User Event Script.",
    "Describe the N/action module entry points.",
    "Does NetSuite support a BlockchainLedger module in SuiteScript 2.1?",
    "Is there a rate limit on record.save calls?",
    "Can a Client Script call record.load?",
    "Should I use a Map/Reduce script or a Scheduled script for bulk updates?",
    "Compare Suitelet and RESTlet deployment.",
    "List the governance units per SuiteScript API call.",
    "Define the term 'saved search' in NetSuite.",
    "Tell me about the N/email module.",
    "How does SuiteFlow differ from workflow action scripts?",
    "what's the difference between beforeSubmit and afterSubmit?",
    "Why is my scheduled script not triggering?",
    "How many script parameters can a Map/Reduce deployment have?",
]


GENERATION_REQUESTS = [
    "Write a SuiteScript 2.1 User Event script that sets the memo field.",
    "Create a scheduled script that emails managers at month end.",
    "Build a RESTlet that exposes customer records.",
    "Generate a Client Script that validates the total field before save.",
    "Make a Suitelet that lists open sales orders.",
    "Code a Map/Reduce script that closes stale opportunities.",
    "Give me a user event script that stamps memos.",
    "Scaffold a RESTlet for inventory lookup.",
]


FETCH_REQUESTS = [
    "Fetch records of type customer.",
    "Pull from NetSuite the latest 50 sales orders.",
    "Retrieve records for last week.",
    "Download records of vendors.",
    "Export data from the item table.",
]


SDF_REQUESTS = [
    "Deploy to NetSuite this script.",
    "Push to NetSuite the current project.",
    "Upload to NetSuite the SDF bundle.",
]


IMPL_GUIDE_REQUESTS = [
    "Give me an implementation guide for approval workflows.",
    "Help me implement a lead-to-cash process.",
    "What scripts do I need to track customer refunds?",
]


@pytest.mark.parametrize("msg", KNOWLEDGE_QUESTIONS)
def test_knowledge_questions_are_general_chat(msg):
    assert infer_intent(msg) == "general_chat", f"failed for: {msg!r}"


@pytest.mark.parametrize("msg", GENERATION_REQUESTS)
def test_generation_imperatives_are_script(msg):
    assert infer_intent(msg) == "generate_suitescript", f"failed for: {msg!r}"


@pytest.mark.parametrize("msg", FETCH_REQUESTS)
def test_fetch_phrases_are_fetch(msg):
    assert infer_intent(msg) == "fetch_netsuite_data", f"failed for: {msg!r}"


@pytest.mark.parametrize("msg", SDF_REQUESTS)
def test_sdf_phrases_are_sdf(msg):
    assert infer_intent(msg) == "manage_sdf_project", f"failed for: {msg!r}"


@pytest.mark.parametrize("msg", IMPL_GUIDE_REQUESTS)
def test_impl_guide_phrases(msg):
    assert infer_intent(msg) == "generate_implementation_guide", f"failed for: {msg!r}"


def test_ambiguous_defaults_to_chat():
    assert infer_intent("hello there") == "general_chat"
    assert infer_intent("thanks!") == "general_chat"
    assert infer_intent("") == "general_chat"


def test_question_trumps_script_keyword():
    # "suitescript" in the message must NOT force generate intent
    # when the sentence is clearly a question.
    assert infer_intent("Is SuiteScript 2.1 backward compatible?") == "general_chat"
    assert infer_intent("Can a Suitelet redirect to a Suitelet?") == "general_chat"


def test_can_you_write_stays_generative():
    # Soft-imperative phrased as a question should still generate code
    assert infer_intent(
        "Can you write a user event script that logs every save?"
    ) == "generate_suitescript"
