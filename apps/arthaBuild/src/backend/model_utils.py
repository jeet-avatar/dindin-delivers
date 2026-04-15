"""
AI/LLM pipeline -- Ollama-backed (local, no external API calls).
Uses llama3.1:8b for generation + intent classification.
Uses nomic-embed-text for FAISS vector search (768-dim).
"""
import os
import logging
from typing import TypedDict, List
from dotenv import load_dotenv

from langchain_ollama import OllamaEmbeddings, ChatOllama
from langchain_community.vectorstores import FAISS
from langchain.schema import Document
from langgraph.graph import StateGraph, END

load_dotenv()
logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")
FAISS_PATH = os.getenv("FAISS_PATH", "./data/vectorstore_ollama")

INTENTS = ["general_chat", "generate_suitescript", "fetch_netsuite_data", "manage_sdf_project", "generate_implementation_guide"]


def get_llm():
    return ChatOllama(
        model=OLLAMA_MODEL,
        base_url=OLLAMA_BASE_URL,
        temperature=0.1,
    )


def get_embeddings():
    return OllamaEmbeddings(
        model=OLLAMA_EMBED_MODEL,
        base_url=OLLAMA_BASE_URL,
    )


# ── Intent classification ─────────────────────────────────────────────────────
# Question framing overrides all other signals — "What is a User Event Script?"
# is a conceptual question, not a generation request.

# These prefixes indicate the user is asking FOR INFORMATION, not asking to generate
_QUESTION_PREFIXES = (
    "what is", "what are", "what does", "what's", "whats",
    "how does", "how do", "how is", "how are", "how can",
    "explain", "describe", "tell me about", "can you explain",
    "why does", "why is", "why are", "when should", "when do",
    "what's the difference", "what is the difference", "compare",
    "difference between", "how would", "should i use",
    "where is", "where do", "where can", "where in",
    "which", "who is", "who are",
)

# These verbs signal the user wants something CREATED
_GENERATION_VERBS = (
    "write", "create", "build", "generate", "give me a", "give me an",
    "make a", "make me", "code a", "implement", "develop",
    "produce", "draft", "output",
)

_GUIDE_KEYWORDS = (
    "implementation guide", "impl guide", "implementation plan",
    "project plan", "how do i implement", "help me implement",
    "what do i need to implement", "steps to implement",
    "guide for implementing", "plan to implement", "roadmap for",
    "how would i build", "what scripts do i need",
)

_SCRIPT_TYPE_KEYWORDS = (
    "suitescript", "user event script", "scheduled script", "map/reduce",
    "map reduce", "client script", "restlet", "suitelet", "massupdate",
    "mass update", "portlet", "workflow action script", "beforesubmit",
    "aftersubmit", "pageinit", "saverecord",
)

_FETCH_KEYWORDS = (
    "fetch records", "retrieve records", "get records", "list records",
    "search records", "download records", "pull from netsuite", "export data",
)

_SDF_KEYWORDS = (
    "deploy to netsuite", "upload to netsuite", "sdf project", "file cabinet",
    "suitecloud", "push to netsuite", "sdf bundle",
)


def infer_intent(message: str) -> str:
    """
    Classify user message into one of 4 intents.
    Logic (in priority order):
      1. Question framing detected → general_chat (even if script names appear)
      2. Generation verb + script type → generate_suitescript
      3. Fetch / SDF keywords → respective intents
      4. LLM fallback for genuinely ambiguous messages
    """
    m = message.lower().strip()

    # 0. Implementation guide — check before question framing
    if any(k in m for k in _GUIDE_KEYWORDS):
        return "generate_implementation_guide"

    # 1. Question framing wins — "What is a user event script?" is NOT a code request
    if any(m.startswith(p) or (f" {p} " in f" {m} ") for p in _QUESTION_PREFIXES):
        return "general_chat"

    # 2. Generation verb + script-type keyword → code generation
    has_gen_verb = any(v in m for v in _GENERATION_VERBS)
    has_script_type = any(k in m for k in _SCRIPT_TYPE_KEYWORDS)
    if has_gen_verb and has_script_type:
        return "generate_suitescript"

    # 3. Explicit fetch / SDF keywords (specific phrasing to avoid false positives)
    if any(k in m for k in _FETCH_KEYWORDS):
        return "fetch_netsuite_data"
    if any(k in m for k in _SDF_KEYWORDS):
        return "manage_sdf_project"

    # 4. Generation verb alone with "suitescript" in message → likely code request
    if has_gen_verb and "suitescript" in m:
        return "generate_suitescript"

    # 5. LLM fallback for genuinely ambiguous messages
    try:
        llm = get_llm()
        prompt = (
            "Classify this message into EXACTLY one label:\n"
            "- general_chat\n"
            "- generate_suitescript\n"
            "- fetch_netsuite_data\n"
            "- manage_sdf_project\n\n"
            f'Message: "{message}"\n\n'
            "Reply with ONLY the label."
        )
        result = llm.invoke(prompt)
        label = result.content.strip().lower().replace("-", "_")
        for intent in INTENTS:
            if intent in label:
                return intent
    except Exception as e:
        logger.warning(f"Intent LLM fallback failed: {e}")

    return "general_chat"


# ── LangGraph RAG State ───────────────────────────────────────────────────────

class RAGState(TypedDict):
    question: str
    documents: List[Document]
    generation: str
    rewrite_count: int
    intent: str                  # passed in from rawapi — drives system prompt
    history: List[dict]          # last N messages for follow-up awareness


CUSTOMER_INDEX_PATH = os.getenv("CUSTOMER_INDEX_PATH", "./data/customer_index")


def _load_vectorstore():
    embeddings = get_embeddings()
    return FAISS.load_local(
        FAISS_PATH,
        embeddings,
        allow_dangerous_deserialization=True
    )


def retrieve_node(state: RAGState) -> RAGState:
    """
    Retrieve documents using customer-specific index first,
    falling back to bootstrap index.
    """
    embeddings = get_embeddings()
    question = state["question"]

    try:
        faiss_file = os.path.join(CUSTOMER_INDEX_PATH, "index.faiss")
        if os.path.exists(faiss_file):
            customer_vs = FAISS.load_local(
                CUSTOMER_INDEX_PATH, embeddings, allow_dangerous_deserialization=True
            )
            customer_docs = customer_vs.similarity_search(question, k=3)
            if customer_docs:
                logger.info(f"Customer index: {len(customer_docs)} docs retrieved")
                return {**state, "documents": customer_docs}
    except Exception as e:
        logger.warning(f"Customer index failed, using bootstrap: {e}")

    vs = _load_vectorstore()
    docs = vs.similarity_search(question, k=5)
    return {**state, "documents": docs}


def grade_node(state: RAGState) -> RAGState:
    """
    Grade all retrieved documents for relevance in a SINGLE LLM call
    (previously was N calls — one per doc).
    """
    if not state["documents"]:
        return state

    llm = get_llm()
    docs_text = "\n\n".join(
        f"[Doc {i + 1}]: {doc.page_content[:400]}"
        for i, doc in enumerate(state["documents"])
    )
    prompt = (
        f"Question: {state['question']}\n\n"
        f"Documents:\n{docs_text}\n\n"
        "For each document number, is it relevant to the question?\n"
        "Reply on ONE line, format: 1:YES 2:NO 3:YES (space-separated)"
    )
    try:
        result = llm.invoke(prompt)
        text = result.content.strip().lower()
        relevant = [
            doc for i, doc in enumerate(state["documents"])
            if f"{i + 1}:yes" in text
        ]
        # Keep all docs if grading returns nothing (defensive fallback)
        return {**state, "documents": relevant if relevant else state["documents"]}
    except Exception:
        return state


def rewrite_node(state: RAGState) -> RAGState:
    """Rewrite query to improve retrieval. Runs at most once."""
    if state.get("rewrite_count", 0) >= 1:
        return state
    llm = get_llm()
    prompt = (
        f"Rewrite this query to be more specific for searching NetSuite documentation:\n"
        f"{state['question']}\nRewritten query:"
    )
    try:
        result = llm.invoke(prompt)
        return {**state, "question": result.content.strip(),
                "rewrite_count": state.get("rewrite_count", 0) + 1}
    except Exception:
        return state


# ── Intent-aware system prompts ───────────────────────────────────────────────

_SYSTEM_SUITESCRIPT = """\
You are ArthaBuild — a NetSuite SuiteScript expert. Generate working code immediately.

Rules:
- Start with the complete script — no preamble
- Use SuiteScript 2.x define()/require() module syntax
- Include /** @NApiVersion 2.x @NScriptType <Type> */ JSDoc header
- Import only the N/ modules you actually use (N/record, N/search, N/log, N/runtime, etc.)
- Use the correct entry point functions for the script type
- Add inline comments only for non-obvious logic — skip obvious ones
- After the code block, write one short paragraph describing what the script does
- Include the deployment .xml in SDF format when the user asks for it
- If the user's prior messages describe specific fields, records, or logic — use those exact names"""

_SYSTEM_GUIDE = """\
You are ArthaBuild — a NetSuite implementation expert. Generate a complete, structured implementation guide.

Output EXACTLY this structure using markdown headers — no deviation:

## 1. Business Overview
One paragraph summarising what this implementation does and the business problem it solves.

## 2. Technical Approach
How NetSuite will be configured/customised to achieve the goal. Mention specific NetSuite modules, record types, and features involved.

## 3. Scripts Required
For each script needed:
- **Script Name**: descriptive name
- **Type**: UserEventScript / ScheduledScript / ClientScript / Suitelet / RESTlet / MapReduce
- **Trigger / Entry Point**: e.g. beforeSubmit on Sales Order
- **Purpose**: what it does in one sentence

## 4. Custom Fields & Records
List any custom fields, custom records, or custom lists needed. For each: field ID suggestion, type, record it lives on.

## 5. NetSuite Configuration Steps
Numbered steps for any non-script configuration (workflow setup, saved search, role permission changes, email template, etc.).

## 6. Test Cases
5–8 test cases covering the happy path and key edge cases. Format: | Test | Steps | Expected Result |

## 7. Deployment Plan
1. Sandbox testing steps
2. UAT checklist
3. Production go-live steps
4. Rollback procedure

## 8. Estimated Effort
Brief table: | Component | Effort |

Rules:
- Use specific NetSuite terminology (SuiteScript 2.x, SDF, TBA, saved search, workflow, etc.)
- Be concrete — use realistic field IDs like `custbody_approval_status`
- If the requirement is vague, make reasonable assumptions and state them clearly
- Do NOT skip any section"""

_SYSTEM_GENERAL = """\
You are ArthaBuild — a NetSuite AI assistant. Match EXACTLY how the user framed their question:

- "What is X?" → One crisp definition sentence first, then expand with context
- "How do I X?" → Numbered steps, concrete, use actual UI/API names
- "Why does X happen?" → State the root cause first, then the fix
- "Explain X" → Start with the simplest mental model, build up
- "Can I X?" → Direct yes/no first, then the details
- "Write/Create/Generate X" → Give the artifact immediately, explanation after
- Short question → Short answer first, elaboration only if needed
- Follow-up question (user says "make it async", "add error handling") → modify what was discussed, don't restart

Rules:
- Never open with "Great question!", "Of course!", or any filler
- Use actual names: SuiteScript, SuiteFlow, SDF, SuiteAnalytics, NetSuite UI module names
- If the retrieved context doesn't answer the question, say so clearly — don't invent details
- Format code in markdown code blocks with the correct language tag
- NAVIGATION PATHS: When explaining where to find something in the NetSuite UI, use ONLY the exact menu path from the retrieved context. Never invent or guess a path. If the context says "Lists > Accounting > Price Levels", write exactly that — not "Setup > Company > Pricing". If no path is in context, say "navigate to [feature] in your NetSuite account" without guessing the exact path.
- FIELD INTERNAL IDs: When referencing NetSuite field internal IDs in SuiteScript or saved searches, only use IDs confirmed in the retrieved context. If the context doesn't confirm a specific field ID, say "verify the field internal ID in your NetSuite account under Customization > Lists, Records & Fields".
- RECORD TYPE CONSTANTS: Always use the correct SuiteScript 2.x constant format: record.Type.SALES_ORDER (not 'salesorder' as a raw string, not record.type.salesOrder). If unsure of the exact constant, state it explicitly rather than guessing.
- SUITESCRIPT MODULES: Use only correct module names — N/record, N/search, N/log, N/email, N/runtime, N/url, N/https, N/file, N/redirect, N/ui/serverWidget. The correct method is email.send() not email.create(). The correct log syntax is log.debug({ title, details }) not log.debug('title', 'value').
- UNCERTAINTY: When you are not confident about a specific value (field ID, navigation path, API method), explicitly say so and tell the user to verify in their NetSuite account or the SuiteScript 2.x documentation."""


def generate_node(state: RAGState) -> RAGState:
    """Generate final answer using retrieved context, intent, and conversation history."""
    llm = get_llm()

    context = "\n\n".join(doc.page_content for doc in state["documents"])
    if not context:
        context = "No specific documentation found for this query in the knowledge base."

    intent = state.get("intent", "general_chat")
    history = state.get("history", [])
    question = state["question"]

    if intent == "generate_suitescript":
        system = _SYSTEM_SUITESCRIPT
    elif intent == "generate_implementation_guide":
        system = _SYSTEM_GUIDE
    else:
        system = _SYSTEM_GENERAL

    # Include last few exchanges so follow-ups ("make it async") work
    history_section = ""
    if history:
        lines = []
        for m in history[-6:]:  # last 3 exchanges
            role = "User" if m["role"] == "user" else "Assistant"
            lines.append(f"{role}: {m['content'][:400]}")
        history_section = "Previous conversation:\n" + "\n".join(lines) + "\n\n"

    prompt = (
        f"{system}\n\n"
        f"{history_section}"
        f"Knowledge base context:\n{context}\n\n"
        f"User: {question}\n\n"
        f"Answer:"
    )

    try:
        result = llm.invoke(prompt)
        generation = result.content

        # Confidence signal: ask model to self-rate 1-5 (only for general/suitescript intents)
        # Low confidence (1-2) prepends a warning so users know to verify
        if intent in ("general_chat", "generate_suitescript"):
            try:
                confidence_prompt = (
                    f"Rate your confidence in this answer on a scale of 1 to 5, "
                    f"where 5 means you are certain every detail is correct and 1 means you are guessing.\n"
                    f"Answer to rate:\n{generation[:800]}\n\n"
                    f"Reply with ONLY a single digit (1, 2, 3, 4, or 5). Nothing else."
                )
                conf_result = llm.invoke(confidence_prompt)
                conf_str = conf_result.content.strip()[:3]
                conf_digit = next((c for c in conf_str if c.isdigit()), None)
                if conf_digit and int(conf_digit) <= 2:
                    generation = (
                        "> ⚠️ **Low confidence** — some details in this answer may not be accurate. "
                        "Please verify navigation paths, field IDs, and API syntax against your "
                        "NetSuite account or the official SuiteScript 2.x documentation.\n\n"
                        + generation
                    )
            except Exception:
                pass  # confidence check is best-effort, never block the main response

        return {**state, "generation": generation}
    except Exception as e:
        return {**state, "generation": f"LLM generation failed: {e}"}


def _should_rewrite(state: RAGState) -> str:
    if len(state["documents"]) == 0 and state.get("rewrite_count", 0) == 0:
        return "rewrite"
    return "generate"


def build_graph():
    """Build and compile the LangGraph RAG pipeline."""
    workflow = StateGraph(RAGState)
    workflow.add_node("retrieve", retrieve_node)
    workflow.add_node("grade", grade_node)
    workflow.add_node("rewrite", rewrite_node)
    workflow.add_node("generate", generate_node)

    workflow.set_entry_point("retrieve")
    workflow.add_edge("retrieve", "grade")
    workflow.add_conditional_edges(
        "grade", _should_rewrite,
        {"rewrite": "rewrite", "generate": "generate"}
    )
    workflow.add_edge("rewrite", "retrieve")
    workflow.add_edge("generate", END)

    return workflow.compile()
