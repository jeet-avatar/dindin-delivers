#!/usr/bin/env python3
"""
Pull customer NetSuite instance knowledge into a per-deployment FAISS index.
Triggered automatically on TBA connect. Also runnable manually.

Reads TBA credentials from session_store (in-memory).
Writes markdown files to CUSTOMER_KNOWLEDGE_PATH.
Builds FAISS index at CUSTOMER_INDEX_PATH.

SECURITY: TBA credentials are received as a dict argument only.
          They are NEVER written to disk, DB, logs, or env vars.
"""
import os
import json
import time
import logging
import hmac
import hashlib
import binascii
import random
import string
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import quote

import requests

logger = logging.getLogger(__name__)

CUSTOMER_KNOWLEDGE_PATH = Path(os.getenv("CUSTOMER_KNOWLEDGE_PATH", "./data/customer_knowledge"))
CUSTOMER_INDEX_PATH     = Path(os.getenv("CUSTOMER_INDEX_PATH", "./data/customer_index"))
OLLAMA_URL  = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")

# Chunking for customer docs — smaller than bootstrap, one field = one chunk
CHUNK_SIZE    = 2400  # characters
CHUNK_OVERLAP = 400   # characters


# ── TBA Auth helper ────────────────────────────────────────────────────────────

def _tba_auth_header(
    method: str,
    url: str,
    account_id: str,
    consumer_key: str,
    consumer_secret: str,
    token_key: str,
    token_secret: str,
) -> str:
    """Generate OAuth 1.0a Authorization header for NetSuite TBA."""
    ts    = str(int(time.time()))
    nonce = "".join(random.choices(string.ascii_letters + string.digits, k=16))

    params = {
        "oauth_consumer_key":     consumer_key,
        "oauth_nonce":            nonce,
        "oauth_signature_method": "HMAC-SHA256",
        "oauth_timestamp":        ts,
        "oauth_token":            token_key,
        "oauth_version":          "1.0",
    }

    # Build signature base string
    sorted_params = "&".join(
        f"{quote(k, safe='')}={quote(v, safe='')}" for k, v in sorted(params.items())
    )
    base = f"{method.upper()}&{quote(url, safe='')}&{quote(sorted_params, safe='')}"
    signing_key = f"{quote(consumer_secret, safe='')}&{quote(token_secret, safe='')}"
    sig = binascii.b2a_base64(
        hmac.new(signing_key.encode(), base.encode(), hashlib.sha256).digest()
    ).decode().strip()

    auth_params = {**params, "oauth_signature": sig, "realm": account_id}
    header_parts = ", ".join(f'{k}="{v}"' for k, v in auth_params.items())
    return f"OAuth {header_parts}"


def _suiteql(
    account_id: str, consumer_key: str, consumer_secret: str,
    token_key: str, token_secret: str, query: str
) -> list:
    """Execute a SuiteQL query. Returns list of row dicts."""
    url = f"https://{account_id.lower()}.suiteql.api.netsuite.com/query/v1/suiteql"
    auth = _tba_auth_header(
        "POST", url, account_id, consumer_key, consumer_secret, token_key, token_secret
    )
    resp = requests.post(
        url,
        headers={
            "Authorization": auth,
            "Content-Type":  "application/json",
            "Prefer":        "transient",
        },
        json={"q": query},
        timeout=30,
    )
    if resp.status_code != 200:
        raise ValueError(f"SuiteQL error {resp.status_code}: {resp.text[:200]}")
    return resp.json().get("items", [])


def _rest_get(
    account_id: str, consumer_key: str, consumer_secret: str,
    token_key: str, token_secret: str, path: str
) -> dict:
    """GET request to NetSuite REST API."""
    url = f"https://{account_id.lower()}.suiteql.api.netsuite.com{path}"
    auth = _tba_auth_header(
        "GET", url, account_id, consumer_key, consumer_secret, token_key, token_secret
    )
    resp = requests.get(
        url,
        headers={"Authorization": auth, "Content-Type": "application/json"},
        timeout=30,
    )
    if resp.status_code not in (200, 404):
        raise ValueError(f"REST GET error {resp.status_code} for {path}: {resp.text[:200]}")
    return resp.json() if resp.status_code == 200 else {}


# ── Pull functions ─────────────────────────────────────────────────────────────

def pull_account_metadata(creds: dict, out_dir: Path) -> str:
    """Pull 1: Account metadata — company name from companyPreferences."""
    logger.info("Pull 1: Account metadata")
    try:
        rows = _suiteql(**creds, query="SELECT companyName FROM companyPreferences LIMIT 1")
        company_name = rows[0].get("companyname", "Unknown") if rows else "Unknown"
    except Exception as e:
        logger.warning(f"  Pull 1 failed: {e}")
        company_name = "Unknown"

    account_id = creds["account_id"]
    content = f"""---
source: NetSuite Account — pulled live on TBA connect
pulled_at: {datetime.now(timezone.utc).isoformat()}
---

# Account Metadata

- **Company Name:** {company_name}
- **Account ID:** {account_id}
- **Knowledge pulled:** {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}
"""
    path = out_dir / "account-metadata.md"
    path.write_text(content)
    logger.info(f"  Wrote {path}")
    return content


def pull_custom_fields(creds: dict, out_dir: Path) -> dict:
    """Pull 2: Custom fields on standard record types."""
    logger.info("Pull 2: Custom fields")
    try:
        rows = _suiteql(
            **creds,
            query="""
            SELECT id, label, fieldtype, appliesto, ismandatory, defaultvalue
            FROM customfield
            WHERE isInactive = 'F'
            ORDER BY appliesto, id
            """
        )
    except Exception as e:
        logger.warning(f"  Pull 2 failed: {e}")
        return {}

    # Group by appliesTo record type
    by_record = {}
    for row in rows:
        rt = (row.get("appliesto") or "other").lower().replace(" ", "_")
        by_record.setdefault(rt, []).append(row)

    written = {}
    for record_type, fields in by_record.items():
        lines = [
            f"---\nsource: NetSuite Account — Custom Fields on {record_type}\n"
            f"pulled_at: {datetime.now(timezone.utc).isoformat()}\n---\n\n",
            f"# Custom Fields — {record_type}\n\n",
            "| Internal ID | Label | Type | Mandatory | Default |\n",
            "|---|---|---|---|---|\n",
        ]
        for f in fields:
            lines.append(
                f"| `{f.get('id', '')}` | {f.get('label', '')} | {f.get('fieldtype', '')} "
                f"| {f.get('ismandatory', '')} | {f.get('defaultvalue', '') or ''} |\n"
            )
        content = "".join(lines)
        filename = f"custom-fields-{record_type[:50]}.md"
        path = out_dir / filename
        path.write_text(content)
        written[filename] = content

    logger.info(f"  Wrote {len(written)} custom field files")
    return written


def pull_custom_records(creds: dict, out_dir: Path) -> dict:
    """Pull 3+4: Custom record types + their fields via REST metadata endpoint."""
    logger.info("Pull 3: Custom record types")
    try:
        rows = _suiteql(
            **creds,
            query="SELECT scriptid, name, description FROM customrecordtype WHERE isInactive = 'F'"
        )
    except Exception as e:
        logger.warning(f"  Pull 3 failed: {e}")
        return {}

    written = {}
    for row in rows:
        script_id = row.get("scriptid", "")
        name      = row.get("name", "")
        desc      = row.get("description", "")

        # Pull 4: fields via REST metadata catalog
        logger.info(f"  Pull 4: fields for {script_id}")
        fields_md = ""
        try:
            meta = _rest_get(**creds, path=f"/record/v1/metadata-catalog/{script_id}")
            fields = meta.get("fields", {})
            if fields:
                rows_f = [
                    "| Field ID | Type | Label | Mandatory |\n",
                    "|---|---|---|---|\n",
                ]
                for field_id, field_def in fields.items():
                    rows_f.append(
                        f"| `{field_id}` | {field_def.get('type', '')} "
                        f"| {field_def.get('label', '')} "
                        f"| {field_def.get('isMandatory', False)} |\n"
                    )
                fields_md = "## Fields\n\n" + "".join(rows_f)
        except Exception as e:
            logger.warning(f"    Field pull failed for {script_id}: {e}")

        content = (
            f"---\nsource: NetSuite Account — Custom Record {script_id}\n"
            f"pulled_at: {datetime.now(timezone.utc).isoformat()}\n---\n\n"
            f"# Custom Record: {name}\n\n"
            f"- **Script ID:** `{script_id}`\n"
            f"- **Description:** {desc}\n\n"
            f"## Usage in SuiteScript\n\n"
            f"```javascript\n"
            f"// Load a {name} record\n"
            f"record.load({{type: '{script_id}', id: internalId}});\n\n"
            f"// Search {name} records\n"
            f"search.create({{type: '{script_id}', filters: [], columns: []}});\n\n"
            f"// SuiteQL\n"
            f"query.runSuiteQL({{query: 'SELECT * FROM {script_id} WHERE id = 1'}});\n"
            f"```\n\n"
            f"{fields_md}\n"
        )
        filename = f"custom-record-{script_id[:50]}.md"
        path = out_dir / filename
        path.write_text(content)
        written[filename] = content

    logger.info(f"  Wrote {len(written)} custom record files")
    return written


def pull_deployed_scripts(creds: dict, out_dir: Path) -> str:
    """Pull 5: Deployed SuiteScripts."""
    logger.info("Pull 5: Deployed scripts")
    try:
        rows = _suiteql(
            **creds,
            query="""
            SELECT name, scripttype, description
            FROM script
            WHERE isInactive = 'F'
            ORDER BY scripttype, name
            """
        )
    except Exception as e:
        logger.warning(f"  Pull 5 failed: {e}")
        rows = []

    lines = [
        f"---\nsource: NetSuite Account — Deployed SuiteScripts\n"
        f"pulled_at: {datetime.now(timezone.utc).isoformat()}\n---\n\n",
        "# Deployed SuiteScripts\n\n",
        "| Script Name | Type | Description |\n",
        "|---|---|---|\n",
    ]
    for row in rows:
        lines.append(
            f"| {row.get('name', '')} | {row.get('scripttype', '')} "
            f"| {(row.get('description') or '')[:100]} |\n"
        )
    content = "".join(lines)
    path = out_dir / "deployed-scripts.md"
    path.write_text(content)
    logger.info(f"  Wrote {path} ({len(rows)} scripts)")
    return content


def pull_workflows(creds: dict, out_dir: Path) -> str:
    """Pull 6: Active Workflows."""
    logger.info("Pull 6: Active workflows")
    try:
        rows = _suiteql(
            **creds,
            query="""
            SELECT name, recordtype, description
            FROM workflow
            WHERE isInactive = 'F'
            """
        )
    except Exception as e:
        logger.warning(f"  Pull 6 failed: {e}")
        rows = []

    lines = [
        f"---\nsource: NetSuite Account — Active Workflows\n"
        f"pulled_at: {datetime.now(timezone.utc).isoformat()}\n---\n\n",
        "# Active Workflows\n\n",
        "| Workflow Name | Record Type | Description |\n",
        "|---|---|---|\n",
    ]
    for row in rows:
        lines.append(
            f"| {row.get('name', '')} | {row.get('recordtype', '')} "
            f"| {(row.get('description') or '')[:100]} |\n"
        )
    content = "".join(lines)
    path = out_dir / "active-workflows.md"
    path.write_text(content)
    logger.info(f"  Wrote {path} ({len(rows)} workflows)")
    return content


# ── Index builder ──────────────────────────────────────────────────────────────

def build_customer_index(knowledge_dir: Path) -> int:
    """Chunk + embed all markdown in knowledge_dir → FAISS at CUSTOMER_INDEX_PATH."""
    from langchain.schema import Document
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    from langchain_ollama import OllamaEmbeddings
    from langchain_community.vectorstores import FAISS

    md_files = list(knowledge_dir.glob("*.md"))
    if not md_files:
        logger.warning("No markdown files to index")
        return 0

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
    )

    docs = []
    for filepath in md_files:
        content = filepath.read_text(encoding="utf-8")
        chunks = splitter.split_text(content)
        for i, chunk in enumerate(chunks):
            docs.append(Document(
                page_content=chunk,
                metadata={
                    "source": filepath.name,
                    "category": "customer",
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                }
            ))

    embeddings = OllamaEmbeddings(model=EMBED_MODEL, base_url=OLLAMA_URL)
    vs = FAISS.from_documents(docs, embeddings)
    CUSTOMER_INDEX_PATH.mkdir(parents=True, exist_ok=True)
    vs.save_local(str(CUSTOMER_INDEX_PATH))
    logger.info(f"Customer index built: {len(docs)} chunks at {CUSTOMER_INDEX_PATH}")
    return len(docs)


# ── Main entry point ───────────────────────────────────────────────────────────

def pull_all(session_creds: dict) -> dict:
    """
    Main entry point. Called from netsuite.py after TBA auth succeeds,
    and from knowledge.py router on refresh.

    session_creds = {
        "account_id": str,
        "consumer_key": str, "consumer_secret": str,
        "token_key": str, "token_secret": str,
    }

    Returns {status, doc_count, custom_fields, custom_records, deployed_scripts, workflows}
    """
    start = datetime.now(timezone.utc)
    CUSTOMER_KNOWLEDGE_PATH.mkdir(parents=True, exist_ok=True)

    creds = session_creds

    # Run all 6 pulls — skip failures, continue
    pull_account_metadata(creds, CUSTOMER_KNOWLEDGE_PATH)
    pull_custom_fields(creds, CUSTOMER_KNOWLEDGE_PATH)
    pull_custom_records(creds, CUSTOMER_KNOWLEDGE_PATH)
    pull_deployed_scripts(creds, CUSTOMER_KNOWLEDGE_PATH)
    pull_workflows(creds, CUSTOMER_KNOWLEDGE_PATH)

    doc_count = build_customer_index(CUSTOMER_KNOWLEDGE_PATH)

    # Count by type
    md_files = list(CUSTOMER_KNOWLEDGE_PATH.glob("*.md"))
    custom_fields  = len([f for f in md_files if f.name.startswith("custom-fields-")])
    custom_records = len([f for f in md_files if f.name.startswith("custom-record-")])

    return {
        "status":           "ready",
        "last_built":       start.isoformat(),
        "doc_count":        doc_count,
        "custom_fields":    custom_fields,
        "custom_records":   custom_records,
        "deployed_scripts": 1 if (CUSTOMER_KNOWLEDGE_PATH / "deployed-scripts.md").exists() else 0,
        "workflows":        1 if (CUSTOMER_KNOWLEDGE_PATH / "active-workflows.md").exists() else 0,
    }
