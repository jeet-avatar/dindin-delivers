# apps/hospital-pricing/backend/agents/nodes/extract.py
from typing import Any
from agents.state import ContractState
from agents.schemas import ContractTerms


def extract_contract_terms(document_text: str) -> dict[str, Any]:
    """
    Use LangChain + GPT-4o structured output to extract ContractTerms from PDF text.
    Returns a dict serializable from ContractTerms.
    """
    from langchain_openai import ChatOpenAI
    from langchain_core.output_parsers import PydanticOutputParser
    from langchain_core.prompts import ChatPromptTemplate

    model = ChatOpenAI(model="gpt-4o", temperature=0)
    parser = PydanticOutputParser(pydantic_object=ContractTerms)

    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "You are a contract analysis expert. Extract structured pricing terms from the wholesale contract text below. "
            "Return ONLY the structured data. If a field is not present in the contract, use null. "
            "CRITICAL: admin_fee_pct must be ≤ 0.03 (3%) per AKS safe harbor 42 CFR §1001.952(j). "
            "For NDC codes: use 11-digit format (5-4-2). "
            "{format_instructions}"
        )),
        ("human", "Contract text:\n\n{document_text}"),
    ])

    chain = prompt | model | parser
    result: ContractTerms = chain.invoke({
        "document_text": document_text,
        "format_instructions": parser.get_format_instructions(),
    })
    return result.model_dump()


def extract_node(state: ContractState) -> ContractState:
    """EXTRACT node: Call GPT-4o to extract contract terms from document text."""
    try:
        terms = extract_contract_terms(state["document_text"])
        return {**state, "status": "extracted", "contract_terms": terms}
    except Exception as exc:
        return {**state, "status": "error", "error": f"Extraction failed: {exc}"}
