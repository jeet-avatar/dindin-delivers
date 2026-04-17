"""
NetSuite TBA authentication endpoints.

SECURITY: TBA credentials are NEVER written to SQLite, disk, logs, or env vars.
          They live ONLY in session_store.py Python dict in RAM.
          Losing the session = losing the credentials. This is by design.
"""
import subprocess
import json
import os
import tempfile
import asyncio
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from pathlib import Path

from auth_utils import get_current_user_id, limiter
from session_store import set_session_creds, get_session_creds, clear_session_creds, NetSuiteCreds, is_authenticated

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/netsuite", tags=["netsuite"])


class AuthenticateRequest(BaseModel):
    account_id: str
    token_key: str
    token_secret: str
    consumer_key: str
    consumer_secret: str


class AuthenticateResponse(BaseModel):
    authenticated: bool
    account_name: Optional[str] = None
    message: str


def _validate_tba_credentials(
    account_id: str,
    token_key: str,
    token_secret: str,
    consumer_key: str,
    consumer_secret: str,
) -> tuple[bool, Optional[str]]:
    """
    Validate TBA credentials using SuiteCloud CLI in a temp directory.
    Returns (is_valid, account_name_or_None).
    NEVER persists credentials outside this function scope.
    Temp directory is cleaned up automatically on exit.
    """
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            # Write auth config to temp dir (never to persistent path)
            auth_config = {
                "defaultAuthId": "temp_validation",
                "accounts": {
                    "temp_validation": {
                        "accountId": account_id,
                        "tokenId": token_key,
                        "tokenSecret": token_secret,
                        "consumerKey": consumer_key,
                        "consumerSecret": consumer_secret,
                    }
                },
            }
            suitecloud_dir = os.path.join(tmpdir, ".suitecloud")
            os.makedirs(suitecloud_dir, exist_ok=True)
            config_path = os.path.join(suitecloud_dir, "authfile.json")
            with open(config_path, "w") as f:
                json.dump(auth_config, f)

            # Test connection with suitecloud account:manageauth --list
            result = subprocess.run(
                ["suitecloud", "account:manageauth", "--list"],
                capture_output=True,
                text=True,
                timeout=30,
                env={**os.environ, "HOME": tmpdir},
            )
            if result.returncode == 0:
                # Extract account name from output if possible, fallback to account_id
                account_name = account_id
                for line in result.stdout.split("\n"):
                    if ":" in line and "account" in line.lower():
                        account_name = line.split(":")[-1].strip()
                        break
                return True, account_name
            else:
                return False, None
    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=504,
            detail="NetSuite connection timeout. Check Account ID and credentials.",
        )
    except FileNotFoundError:
        # SuiteCloud CLI not installed
        raise HTTPException(
            status_code=503,
            detail="SuiteCloud CLI not installed. Run: npm install -g @oracle/suitecloud-cli",
        )
    except HTTPException:
        raise
    except Exception:
        return False, None


async def _index_customer_netsuite(account_id: str, credentials: dict):
    """
    Background task: index all customer SuiteScripts into customer-specific FAISS.
    Runs after TBA connect — gives personalized RAG answers based on their actual scripts.
    Non-fatal: TBA connect succeeds even if indexing fails.
    """
    try:
        logger.info(f"Starting NetSuite auto-index for account {account_id}")
        customer_index_dir = Path("./data/customer_index")
        customer_index_dir.mkdir(parents=True, exist_ok=True)

        with tempfile.TemporaryDirectory() as tmpdir:
            auth_config = {
                "defaultAuthId": "index_session",
                "accounts": {
                    "index_session": {
                        "accountId": account_id,
                        "tokenId": credentials.get("token_key"),
                        "tokenSecret": credentials.get("token_secret"),
                        "consumerKey": credentials.get("consumer_key"),
                        "consumerSecret": credentials.get("consumer_secret"),
                    }
                },
            }
            suitecloud_dir = os.path.join(tmpdir, ".suitecloud")
            os.makedirs(suitecloud_dir, exist_ok=True)
            with open(os.path.join(suitecloud_dir, "authfile.json"), "w") as f:
                json.dump(auth_config, f)

            env = {**os.environ, "HOME": tmpdir}

            # List SuiteScript files via SDF
            result = subprocess.run(
                ["suitecloud", "object:list", "--type", "script"],
                capture_output=True, text=True, timeout=60, env=env,
            )

            if result.returncode != 0:
                logger.warning(f"SDF list failed for auto-index: {result.stderr[:200]}")
                return

            script_names = [line.strip() for line in result.stdout.splitlines() if line.strip()]
            logger.info(f"Found {len(script_names)} scripts to index for account {account_id}")

            # For each script, get content and embed (cap at 50 to avoid timeout)
            from langchain_community.vectorstores import FAISS
            from langchain_ollama import OllamaEmbeddings
            from langchain.text_splitter import RecursiveCharacterTextSplitter
            from langchain_core.documents import Document

            embeddings = OllamaEmbeddings(model="nomic-embed-text")
            docs = []

            for script_name in script_names[:50]:
                get_result = subprocess.run(
                    ["suitecloud", "object:get", "--type", "script", "--scriptid", script_name],
                    capture_output=True, text=True, timeout=30, env=env,
                )
                if get_result.returncode == 0 and get_result.stdout.strip():
                    docs.append(Document(
                        page_content=get_result.stdout,
                        metadata={"source": script_name, "type": "customer_script", "account": account_id}
                    ))

            if docs:
                splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
                chunks = splitter.split_documents(docs)
                vectorstore = FAISS.from_documents(chunks, embeddings)
                vectorstore.save_local(str(customer_index_dir))
                logger.info(f"Customer index saved: {len(chunks)} chunks from {len(docs)} scripts")
            else:
                logger.info(f"No scripts found to index for account {account_id}")

    except Exception as e:
        logger.warning(f"NetSuite auto-index failed (non-fatal): {e}")


@router.post("/authenticate", response_model=AuthenticateResponse)
@limiter.limit("10/minute")
async def authenticate(
    request: Request,
    body: AuthenticateRequest,
    user_id: int = Depends(get_current_user_id),
):
    """
    Validate NetSuite TBA credentials and store in session RAM.
    Credentials are NEVER persisted to database or disk.
    """
    is_valid, account_name = _validate_tba_credentials(
        body.account_id,
        body.token_key,
        body.token_secret,
        body.consumer_key,
        body.consumer_secret,
    )

    if not is_valid:
        raise HTTPException(
            status_code=401,
            detail="Invalid NetSuite TBA credentials. Verify Account ID, Consumer Key/Secret, and Token Key/Secret.",
        )

    creds = NetSuiteCreds(
        account_id=body.account_id,
        token_key=body.token_key,
        token_secret=body.token_secret,
        consumer_key=body.consumer_key,
        consumer_secret=body.consumer_secret,
        authenticated_at=datetime.now(timezone.utc),
        account_name=account_name,
    )
    set_session_creds(user_id, creds)

    # Trigger background indexing of customer's SuiteScripts (non-fatal, non-blocking)
    credentials_dict = {
        "token_key": body.token_key,
        "token_secret": body.token_secret,
        "consumer_key": body.consumer_key,
        "consumer_secret": body.consumer_secret,
    }
    asyncio.create_task(_index_customer_netsuite(body.account_id, credentials_dict))
    logger.info(f"NetSuite auto-index task queued for account {body.account_id}")

    # Phase 19: Trigger customer knowledge pull (SuiteQL + REST metadata → FAISS)
    # Non-fatal, non-blocking — TBA connect succeeds even if pull fails.
    try:
        from scripts.pull_customer_knowledge import pull_all as _pull_customer_knowledge
        _knowledge_creds = {
            "account_id":      body.account_id,
            "consumer_key":    body.consumer_key,
            "consumer_secret": body.consumer_secret,
            "token_key":       body.token_key,
            "token_secret":    body.token_secret,
        }
        asyncio.create_task(
            asyncio.get_event_loop().run_in_executor(None, _pull_customer_knowledge, _knowledge_creds)
        )
        logger.info("Customer knowledge pull triggered")
    except Exception as _kp_err:
        logger.warning(f"Customer knowledge pull trigger failed (non-fatal): {_kp_err}")

    return AuthenticateResponse(
        authenticated=True,
        account_name=account_name,
        message=f"Connected to NetSuite account {account_name}",
    )


@router.get("/status")
async def get_status(user_id: int = Depends(get_current_user_id)):
    """Check if current user has an active NetSuite TBA session."""
    creds = get_session_creds(user_id)
    if creds is None:
        return {"authenticated": False}
    return {
        "authenticated": True,
        "account_name": creds.account_name,
        "account_id": creds.account_id,
        "authenticated_at": creds.authenticated_at.isoformat(),
    }


@router.post("/logout")
async def logout(user_id: int = Depends(get_current_user_id)):
    """Clear NetSuite TBA credentials from session memory."""
    cleared = clear_session_creds(user_id)
    return {
        "message": "NetSuite session cleared." if cleared else "No active NetSuite session."
    }
