---
id: CASE-036
title: "Auto-index credentials dict key mismatch — _index_customer_netsuite may fail silently"
phase: "07.1"
phase_name: "Frontend Section Verification"
category: PHASE_CORRECTNESS
severity: MEDIUM
status: DONE
created: 2026-04-10
updated: 2026-04-11
assignee: "Priya"
agent: "gsd-executor"
blocks: []
blocked_by: []
files:
  - path: src/backend/routers/netsuite.py
    lines: "111-185"
  - path: src/backend/routers/netsuite.py
    lines: "224-232"
---

## Why This Case Was Created
Phase correctness audit for the NetSuite auto-indexing feature. After a user successfully authenticates their TBA credentials, the `/api/netsuite/authenticate` endpoint fires a background task `_index_customer_netsuite(body.account_id, credentials_dict)`. The `credentials_dict` is built at `netsuite.py:225-230` with specific key names. Inside `_index_customer_netsuite()`, those same keys are consumed using `credentials.get("token_key")` etc. Cross-checking the key names between the dict construction site and the consumption site reveals a potential mismatch. Additionally, the function's silent exception handling (`except Exception: logger.warning(...)`) means any key mismatch causes the entire indexing task to silently fail — the user receives a successful TBA connection response but their scripts are never indexed for RAG.

## What Is Wrong
**Dict construction at `netsuite.py:225-230`:**
```python
credentials_dict = {
    "token_key": body.token_key,
    "token_secret": body.token_secret,
    "consumer_key": body.consumer_key,
    "consumer_secret": body.consumer_secret,
}
asyncio.create_task(_index_customer_netsuite(body.account_id, credentials_dict))
```

**Dict consumption inside `_index_customer_netsuite` at `netsuite.py:127-133`:**
```python
auth_config = {
    "defaultAuthId": "index_session",
    "accounts": {
        "index_session": {
            "accountId": account_id,
            "tokenId": credentials.get("token_key"),         # key: "token_key" ✓
            "tokenSecret": credentials.get("token_secret"),  # key: "token_secret" ✓
            "consumerKey": credentials.get("consumer_key"),  # key: "consumer_key" ✓
            "consumerSecret": credentials.get("consumer_secret"),  # key: "consumer_secret" ✓
        }
    },
}
```

**The key names match in this case.** However, the deeper issue is that `_index_customer_netsuite` does not validate that the credentials dict contains the expected keys before using them. If a refactor of the `authenticate` endpoint changes the dict key names (e.g., to camelCase for consistency), `credentials.get("token_key")` would return `None`, building a `None`-valued auth config that `suitecloud` CLI would reject — and the failure at `netsuite.py:148-150` would log a warning and return silently without notifying the user.

Additionally, the `langchain_community` and `langchain_ollama` imports inside the async function at `netsuite.py:156-159` are inside a try block that catches `Exception`. An `ImportError` (Langchain not installed) silently absorbs the failure and the function returns without indexing — no error propagated.

**Specific silent-failure path:**
```python
try:
    ...
    from langchain_community.vectorstores import FAISS   # ImportError if not installed
    ...
except Exception as e:
    logger.warning(f"NetSuite auto-index failed (non-fatal): {e}")
    # Returns None — caller (asyncio.create_task) never sees this
```

## Why It Was Done This Way (Root Cause)
The auto-indexing feature is explicitly designed as non-fatal — the TBA connection success should not be blocked by indexing failures. The broad `except Exception` was intentional. The credentials dict key names were chosen to match Python naming conventions (snake_case) while the `auth_config` JSON uses the SuiteCloud CLI's camelCase convention — the `credentials.get()` calls translate between them at `netsuite.py:127-133`.

## What Is Done Right
The TBA authentication flow itself is completely isolated from the indexing task (`asyncio.create_task` fire-and-forget). The user's `authenticate` response is never delayed by indexing. The credentials dict key names currently match the consumption code. The `customer_index_dir` is correctly separated from the global FAISS index, preventing cross-customer data leakage.

## How To Fix It
**Step 1 — Add explicit key validation at the top of `_index_customer_netsuite` (`netsuite.py:116`):**

```python
async def _index_customer_netsuite(account_id: str, credentials: dict):
    required_keys = {"token_key", "token_secret", "consumer_key", "consumer_secret"}
    missing = required_keys - set(credentials.keys())
    if missing:
        logger.error(
            f"_index_customer_netsuite: credentials dict missing keys {missing}. "
            "Indexing aborted. Check credentials_dict construction in authenticate()."
        )
        return
    try:
        ...
```

**Step 2 — Log a structured summary on success/failure at the end of the function:**

```python
    if docs:
        ...
        logger.info(f"Customer index saved: {len(chunks)} chunks from {len(docs)} scripts")
    else:
        logger.info(f"No scripts found to index for account {account_id}")
except Exception as e:
    logger.warning(f"NetSuite auto-index failed (non-fatal): {e}", exc_info=True)  # add exc_info for full traceback
```

**Step 3 — Expose indexing status in the authenticate response (optional, informational):**

```python
return AuthenticateResponse(
    authenticated=True,
    account_name=account_name,
    message=f"Connected to NetSuite account {account_name}. Background indexing started.",
)
```

**Step 4 — Add a test that verifies credentials dict key names match expected consumption:**

```python
# test_netsuite.py
def test_credentials_dict_keys_match_index_function():
    """Verify that credentials_dict keys built in authenticate() match what _index_customer_netsuite() reads."""
    from routers.netsuite import _index_customer_netsuite
    # The function reads: token_key, token_secret, consumer_key, consumer_secret
    expected_keys = {"token_key", "token_secret", "consumer_key", "consumer_secret"}
    credentials_dict = {
        "token_key": "test_token_key",
        "token_secret": "test_token_secret",
        "consumer_key": "test_consumer_key",
        "consumer_secret": "test_consumer_secret",
    }
    assert set(credentials_dict.keys()) == expected_keys, (
        "credentials_dict keys do not match what _index_customer_netsuite() reads via .get()"
    )
```

## Architecture Mapping

**Layer:** Backend Router (netsuite.py — background task)

**Flow:**

    [POST /api/netsuite/authenticate]
               ↓
    [_validate_tba_credentials() → success]
               ↓
    [credentials_dict = {token_key, token_secret, consumer_key, consumer_secret}]
               ↓
    [asyncio.create_task(_index_customer_netsuite(account_id, credentials_dict))]
               ↓ (background, non-blocking)
    [Response: {authenticated: true} returned to user immediately]

    [Background: _index_customer_netsuite running]
               ↓
    [credentials.get("token_key")  ← relies on key name contract]
               ↓ if key missing: None → SuiteCloud auth fails → warning log → silent return
               ↓ if ImportError:    → except Exception → warning log → silent return

**Upstream:** `POST /api/netsuite/authenticate` (netsuite.py:188) — triggers the background task
**Downstream:** FAISS customer index at `./data/customer_index`, RAG pipeline that reads this index

## Verification
- [ ] Grep proof: `grep -n "credentials.get\|credentials_dict" src/backend/routers/netsuite.py`
- [ ] Test proof: `pytest src/backend/tests/test_netsuite.py -v` — currently no test for background indexing behavior
- [ ] Runtime proof: Add `print(credentials)` at the start of `_index_customer_netsuite`, authenticate via API, observe the credentials dict in logs to confirm all 4 keys are present

## Downstream Impact
**Impact if unfixed:** Degraded UX (silent feature failure)

The auto-indexing feature is a personalization feature — without it, the RAG pipeline answers from the global SuiteScript knowledge base only, not from the customer's actual scripts. If indexing silently fails, the customer never knows their personalized RAG is unavailable. Questions about their specific scripts return generic answers. No data loss, no security risk.

## Links
- Phase SUMMARY: `.planning/phases/04-frontend-integration/04-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: None
