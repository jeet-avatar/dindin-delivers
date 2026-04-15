"""
Knowledge Base management endpoints.

POST /api/admin/knowledge/refresh  — trigger re-pull from NetSuite instance
GET  /api/admin/knowledge/status   — current index status
"""
import asyncio
import logging
from datetime import datetime, timezone
from pathlib import Path
import os

from fastapi import APIRouter, Depends, HTTPException

from auth_utils import require_admin

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin/knowledge", tags=["knowledge"])

CUSTOMER_KNOWLEDGE_PATH = Path(os.getenv("CUSTOMER_KNOWLEDGE_PATH", "./data/customer_knowledge"))
CUSTOMER_INDEX_PATH     = Path(os.getenv("CUSTOMER_INDEX_PATH", "./data/customer_index"))

# In-memory build status (resets on container restart)
_build_status = {
    "status": "unknown",
    "last_built": None,
    "doc_count": 0,
    "custom_fields": 0,
    "custom_records": 0,
    "deployed_scripts": 0,
    "workflows": 0,
}


async def _run_pull_background(user_id: int):
    """Run pull_all in a thread (blocking I/O — Ollama + NetSuite calls)."""
    global _build_status
    _build_status["status"] = "building"
    try:
        from session_store import get_session_creds
        ns_creds = get_session_creds(user_id)
        if ns_creds is None:
            raise ValueError("No active NetSuite session. Connect TBA first.")

        # Convert NetSuiteCreds dataclass → plain dict expected by pull_all
        creds = {
            "account_id":      ns_creds.account_id,
            "consumer_key":    ns_creds.consumer_key,
            "consumer_secret": ns_creds.consumer_secret,
            "token_key":       ns_creds.token_key,
            "token_secret":    ns_creds.token_secret,
        }

        from scripts.pull_customer_knowledge import pull_all
        result = await asyncio.get_event_loop().run_in_executor(None, pull_all, creds)
        _build_status = result
        logger.info(f"Knowledge refresh complete: {result}")
    except Exception as e:
        _build_status["status"] = "error"
        _build_status["error"] = str(e)
        logger.error(f"Knowledge refresh failed: {e}")


@router.post("/refresh")
async def refresh_knowledge(current_user=Depends(require_admin)):
    """Trigger background re-pull from NetSuite instance."""
    if _build_status.get("status") == "building":
        return {"status": "already_building", "message": "Refresh already in progress"}
    asyncio.create_task(_run_pull_background(current_user.id))
    return {"status": "building", "message": "Knowledge refresh started"}


@router.get("/status")
async def knowledge_status(current_user=Depends(require_admin)):
    """Get current knowledge index status."""
    # Enrich with live file counts if status is unknown (first request after restart)
    if _build_status["status"] == "unknown":
        md_files = list(CUSTOMER_KNOWLEDGE_PATH.glob("*.md")) if CUSTOMER_KNOWLEDGE_PATH.exists() else []
        faiss_exists = (CUSTOMER_INDEX_PATH / "index.faiss").exists()
        return {
            "status":           "ready" if faiss_exists else "not_built",
            "last_built":       None,
            "doc_count":        0,
            "custom_fields":    len([f for f in md_files if f.name.startswith("custom-fields-")]),
            "custom_records":   len([f for f in md_files if f.name.startswith("custom-record-")]),
            "deployed_scripts": 1 if any(f.name == "deployed-scripts.md" for f in md_files) else 0,
            "workflows":        1 if any(f.name == "active-workflows.md" for f in md_files) else 0,
            "bootstrap_docs":   95,
        }
    return {**_build_status, "bootstrap_docs": 95}
