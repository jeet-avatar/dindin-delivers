"""
Rebuild FAISS vectorstore from OpenAI 1536-dim to nomic-embed-text 768-dim.
Run once after Phase 3 setup:
  python scripts/rebuild_vectorstore.py

Prerequisites:
  - Ollama running with nomic-embed-text pulled
  - Old FAISS index at FAISS_PATH (or set via env var)
  - langchain-ollama installed

Usage:
  cd src/backend
  python scripts/rebuild_vectorstore.py
"""
import os
import sys
import logging
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

FAISS_PATH = os.getenv("FAISS_PATH", "./data/vectorstore")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")
NEW_FAISS_PATH = FAISS_PATH + "_ollama"


def main():
    from langchain_ollama import OllamaEmbeddings
    from langchain_community.vectorstores import FAISS
    from langchain.schema import Document

    logger.info(f"Loading existing FAISS index from {FAISS_PATH}")

    # Load old index -- use old embeddings just to access docstore
    # We extract page_content from docstore directly without vector math
    try:
        import pickle
        pkl_path = os.path.join(FAISS_PATH, "index.pkl")
        with open(pkl_path, "rb") as f:
            docstore_data = pickle.load(f)

        # docstore_data is (InMemoryDocstore, index_to_docstore_id)
        docstore, index_map = docstore_data
        docs = []
        for idx, doc_id in index_map.items():
            doc = docstore.search(doc_id)
            if doc and hasattr(doc, "page_content"):
                docs.append(Document(
                    page_content=doc.page_content,
                    metadata=doc.metadata if hasattr(doc, "metadata") else {}
                ))

        logger.info(f"Extracted {len(docs)} documents from existing FAISS index")

    except Exception as e:
        logger.error(f"Failed to load existing vectorstore: {e}")
        logger.error("If vectorstore path is wrong, set FAISS_PATH env var")
        sys.exit(1)

    if len(docs) == 0:
        logger.error("No documents extracted. Cannot rebuild vectorstore.")
        sys.exit(1)

    # Re-embed with nomic-embed-text in batches
    embeddings = OllamaEmbeddings(
        model=OLLAMA_EMBED_MODEL,
        base_url=OLLAMA_BASE_URL,
    )

    logger.info(f"Re-embedding {len(docs)} docs with {OLLAMA_EMBED_MODEL}...")
    logger.info("This will take 30-90 minutes depending on hardware.")

    BATCH_SIZE = 100
    all_batches = [docs[i:i+BATCH_SIZE] for i in range(0, len(docs), BATCH_SIZE)]

    new_vs = None
    for i, batch in enumerate(all_batches):
        if i % 10 == 0:
            logger.info(f"  Progress: {i}/{len(all_batches)} batches ({i*BATCH_SIZE}/{len(docs)} docs)")
        try:
            if new_vs is None:
                new_vs = FAISS.from_documents(batch, embeddings)
            else:
                batch_vs = FAISS.from_documents(batch, embeddings)
                new_vs.merge_from(batch_vs)
        except Exception as e:
            logger.warning(f"Batch {i} failed: {e}. Skipping.")
            continue

    if new_vs is None:
        logger.error("All batches failed. Check Ollama is running.")
        sys.exit(1)

    os.makedirs(NEW_FAISS_PATH, exist_ok=True)
    new_vs.save_local(NEW_FAISS_PATH)
    logger.info(f"New vectorstore saved to {NEW_FAISS_PATH}")
    logger.info(f"Update FAISS_PATH in .env to: {NEW_FAISS_PATH}")
    logger.info("Rebuild complete!")


if __name__ == "__main__":
    main()
