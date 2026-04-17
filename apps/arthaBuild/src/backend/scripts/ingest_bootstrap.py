#!/usr/bin/env python3
"""
Rebuild bootstrap FAISS vectorstore from knowledge/bootstrap/*.md files.

Run automatically on docker-compose startup before uvicorn.
Also runnable manually: python scripts/ingest_bootstrap.py

Ollama must be running with nomic-embed-text pulled.
Script polls until model is available (max 10 min) before starting.
"""
import os
import sys
import time
import logging
import shutil
import requests
from datetime import datetime
from pathlib import Path

# Ensure we can import from parent (backend root)
sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

KNOWLEDGE_DIR = Path(os.getenv("KNOWLEDGE_PATH", "/app/knowledge/bootstrap"))
FAISS_PATH    = Path(os.getenv("FAISS_PATH", "/app/data/vectorstore_ollama"))
OLLAMA_URL    = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
EMBED_MODEL   = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")

# Chunking: RecursiveCharacterTextSplitter measures CHARACTERS (not tokens).
# nomic-embed-text handles ~8192 tokens. 3200 chars ≈ 800 tokens for English+code.
CHUNK_SIZE    = 3200   # characters
CHUNK_OVERLAP = 600    # characters


def wait_for_model(max_wait_seconds: int = 600) -> None:
    """Poll Ollama until nomic-embed-text is available. Raises RuntimeError on timeout."""
    logger.info(f"Waiting for {EMBED_MODEL} to be available at {OLLAMA_URL}...")
    deadline = time.time() + max_wait_seconds
    while time.time() < deadline:
        try:
            resp = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
            if resp.status_code == 200:
                models = [m["name"] for m in resp.json().get("models", [])]
                if any(EMBED_MODEL in m for m in models):
                    logger.info(f"{EMBED_MODEL} is ready.")
                    return
        except Exception:
            pass
        logger.info(f"  {EMBED_MODEL} not ready yet, retrying in 10s...")
        time.sleep(10)
    raise RuntimeError(
        f"Timeout: {EMBED_MODEL} not available after {max_wait_seconds}s. "
        f"Run: ollama pull {EMBED_MODEL}"
    )


def load_documents(knowledge_dir: Path) -> list:
    """Load all .md files from bootstrap directory as LangChain Documents."""
    from langchain.schema import Document

    docs = []
    md_files = sorted(knowledge_dir.glob("*.md"))

    if not md_files:
        raise FileNotFoundError(
            f"No .md files found in {knowledge_dir}. "
            f"Run plan 19-01 and 19-02 first to create bootstrap knowledge files."
        )

    for filepath in md_files:
        content = filepath.read_text(encoding="utf-8")
        # Determine category from filename prefix
        name = filepath.stem
        if name.startswith("module-"):
            category = "module"
        elif name.startswith("script-"):
            category = "script"
        elif name.startswith("record-"):
            category = "record"
        elif name.startswith("feature-"):
            category = "feature"
        elif name.startswith("process-"):
            category = "process"
        elif name.startswith("pattern-"):
            category = "pattern"
        elif name in ("navigation-paths", "errors-troubleshooting"):
            category = "reference"
        else:
            category = "general"

        # Extract topic from filename (e.g. module-record → N/record)
        topic = name.replace("module-", "N/").replace("script-", "").replace(
            "record-", "").replace("feature-", "").replace(
            "process-", "").replace("pattern-", "")

        docs.append(Document(
            page_content=content,
            metadata={
                "source": filepath.name,
                "category": category,
                "topic": topic,
                "netsuite_version": "2024.2+",
                "customer_id": None,
            }
        ))

    logger.info(f"Loaded {len(docs)} documents from {knowledge_dir}")
    return docs


def split_documents(docs: list) -> list:
    """
    Split with MarkdownHeaderTextSplitter first (respects ## / ### boundaries),
    then RecursiveCharacterTextSplitter for oversized sections.
    Attaches chunk_index and total_chunks metadata.
    """
    from langchain.text_splitter import (
        MarkdownHeaderTextSplitter,
        RecursiveCharacterTextSplitter,
    )
    from langchain.schema import Document as D

    headers_to_split = [("##", "section"), ("###", "subsection")]
    md_splitter = MarkdownHeaderTextSplitter(
        headers_to_split_on=headers_to_split,
        strip_headers=False,
    )
    char_splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", " ", ""],
    )

    all_chunks = []
    for doc in docs:
        # Phase 1: split on markdown headers
        header_splits = md_splitter.split_text(doc.page_content)

        # Phase 2: further split oversized sections
        sub_chunks = []
        for split in header_splits:
            if len(split.page_content) > CHUNK_SIZE:
                sub = char_splitter.split_text(split.page_content)
                for s in sub:
                    sub_chunks.append(D(page_content=s, metadata={**doc.metadata, **split.metadata}))
            else:
                sub_chunks.append(D(page_content=split.page_content, metadata={**doc.metadata, **split.metadata}))

        # Attach chunk index
        for i, chunk in enumerate(sub_chunks):
            chunk.metadata["chunk_index"] = i
            chunk.metadata["total_chunks"] = len(sub_chunks)

        all_chunks.extend(sub_chunks)

    logger.info(f"Split into {len(all_chunks)} chunks")
    return all_chunks


def build_vectorstore(chunks: list) -> None:
    """Embed chunks with nomic-embed-text and save FAISS index atomically."""
    from langchain_ollama import OllamaEmbeddings
    from langchain_community.vectorstores import FAISS

    embeddings = OllamaEmbeddings(model=EMBED_MODEL, base_url=OLLAMA_URL)

    # Write to _new path first (atomic swap)
    new_path = str(FAISS_PATH) + "_new"
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = str(FAISS_PATH) + f"_{timestamp}"

    logger.info(f"Embedding {len(chunks)} chunks with {EMBED_MODEL}...")
    BATCH_SIZE = int(os.getenv("INGEST_BATCH_SIZE", "50"))
    batches = [chunks[i:i+BATCH_SIZE] for i in range(0, len(chunks), BATCH_SIZE)]

    vs = None
    MAX_RETRIES = 3
    for i, batch in enumerate(batches):
        if i % 10 == 0:
            logger.info(f"  Batch {i}/{len(batches)} ({i * BATCH_SIZE}/{len(chunks)} chunks)")
        success = False
        for attempt in range(MAX_RETRIES):
            try:
                if vs is None:
                    vs = FAISS.from_documents(batch, embeddings)
                else:
                    vs.merge_from(FAISS.from_documents(batch, embeddings))
                success = True
                break
            except Exception as e:
                wait = 2 ** attempt  # 1s, 2s, 4s
                logger.warning(f"  Batch {i} attempt {attempt + 1}/{MAX_RETRIES} failed: {e} — retrying in {wait}s")
                time.sleep(wait)
        if not success:
            logger.error(f"  Batch {i} permanently failed after {MAX_RETRIES} attempts — skipping")

    if vs is None:
        raise RuntimeError("All embedding batches failed. Check Ollama is running.")

    os.makedirs(new_path, exist_ok=True)
    vs.save_local(new_path)
    logger.info(f"Saved new index to {new_path}")

    # Atomic swap: backup existing → rename new → done
    if FAISS_PATH.exists():
        shutil.move(str(FAISS_PATH), backup_path)
        logger.info(f"Backed up existing index to {backup_path}")
        # Keep only last 2 backups
        backups = sorted(FAISS_PATH.parent.glob(f"{FAISS_PATH.name}_2*"))
        for old in backups[:-2]:
            shutil.rmtree(old)
            logger.info(f"Removed old backup: {old}")

    shutil.move(new_path, str(FAISS_PATH))
    logger.info(f"Bootstrap index live at {FAISS_PATH}")
    logger.info(f"Bootstrap index built: {len(chunks)} chunks from {len(set(c.metadata['source'] for c in chunks))} files")


def main():
    logger.info("=== ArthaBuild Bootstrap Ingest ===")
    wait_for_model()
    docs = load_documents(KNOWLEDGE_DIR)
    chunks = split_documents(docs)
    build_vectorstore(chunks)
    logger.info("=== Ingest complete ===")


if __name__ == "__main__":
    main()
