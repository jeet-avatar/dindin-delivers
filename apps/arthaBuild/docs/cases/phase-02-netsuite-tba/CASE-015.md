---
id: CASE-015
title: "Commented-out credential blocks in sdf_utils.py"
phase: "02"
phase_name: "NetSuite TBA Session"
category: DEAD_CODE
severity: LOW
status: DONE
created: 2026-04-10
updated: 2026-04-11
assignee: "Kavya"
agent: "gsd-executor"
blocks: []
blocked_by: []
files:
  - path: src/backend/sdf_utils.py
    lines: "52-61"
---

## Why This Case Was Created
Triggered by the DEAD_CODE audit dimension. Commented-out credential values in source code are a security anti-pattern, even if the values appear to be test/sandbox credentials. The CLAUDE.md rule states credentials must NEVER appear in code, log output, environment variables, or disk files. Commented-out credential placeholders increase the risk that a developer will uncomment them and commit real credentials in the same pattern.

## What Is Wrong
`src/backend/sdf_utils.py` lines 52–61 contain a commented-out block with real-looking TBA credential fields inside the `setup_account_ci()` function:

```python
def setup_account_ci(project_name="TestSDFProject"):
    ORIGINAL_DIR, PROJECT_DIR = get_project_dirs(project_name)
    ...
    try:
        os.chdir(PROJECT_DIR)
        run_command([
            "suitecloud", "account:setup",
            # "--account", "7220160_SB2",
            # "--authid", "ci_auth",
            # "--tokenid", "f031aaec6baa2f58cb2c03529018bd008ffec525756564fcc897fe9ec1c8c365",
            # "--tokensecret", "60d3660c33c61f6a4f50c1fa70d9c2e0d63a4ce2c1354f3113132cf3fc40b36e",
            # "--consumerkey", "5518df2f82dd6fe7610e5d8f323cb5f42f27a638f86eff897716446cad6f021c",
            # "--consumersecret", "69a0483de4e5e4347d0b04d921ddd0a7c38aa0cd90f8550a56c3d9dd7e32294"
        ])
    finally:
        os.chdir(ORIGINAL_DIR)
```

The commented-out values are hexadecimal strings of length 64 (SHA-256 hashes or token values). The account `"7220160_SB2"` matches the sandbox account ID used in test fixtures (`test_netsuite.py:46`). While these appear to be development/sandbox credentials, they represent real NetSuite TBA token material from a development account. Leaving them in version control violates the credential handling rules and could confuse developers about the intended authentication flow (credentials should come from `session_store.py`, not hardcoded CLI flags).

## Why It Was Done This Way (Root Cause)
During initial development, the developer ran `suitecloud account:setup` manually with these values to test the SDF project deployment flow. The values were commented out rather than deleted when the TBA session system was built — preserved as reference documentation for what the CLI flags should look like. This is a common developer habit ("let me keep these for reference") that creates a security anti-pattern.

## What Is Done Right
The active `run_command()` call (without the credential arguments) is correct — it invokes `suitecloud account:setup` interactively, which is the right behavior for a user-facing setup flow. The credentials are correctly not hardcoded in the active call path. The session_store.py architecture correctly handles runtime credentials via JWT-authenticated API endpoints.

## How To Fix It
**Step 1:** Remove the commented-out credential lines from `sdf_utils.py` lines 55–61:

```python
# Before (sdf_utils.py:53-62)
run_command([
    "suitecloud", "account:setup",
    # "--account", "7220160_SB2",
    # "--authid", "ci_auth",
    # "--tokenid", "f031aaec6baa2f58cb2c03529018bd008ffec525756564fcc897fe9ec1c8c365",
    # "--tokensecret", "60d3660c33c61f6a4f50c1fa70d9c2e0d63a4ce2c1354f3113132cf3fc40b36e",
    # "--consumerkey", "5518df2f82dd6fe7610e5d8f323cb5f42f27a638f86eff897716446cad6f021c",
    # "--consumersecret", "69a0483de4e5e4347d0b04d921ddd0a7c38aa0cd90f8550a56c3d9dd7e32294"
])

# After
run_command([
    "suitecloud", "account:setup",
    # Credentials are supplied interactively via the SuiteCloud CLI prompt.
    # DO NOT hardcode TBA credentials here — use session_store.py via /api/netsuite/authenticate.
])
```

**Step 2:** If the sandbox account `7220160_SB2` was a real development account, rotate the token credentials for that account in the NetSuite developer portal as a precaution.

**Step 3:** Add the pattern to the pre-commit hook to block future credential leakage:
```bash
grep -rn "tokenid\|tokensecret\|consumerkey\|consumersecret" src/ --include="*.py"
```

## Architecture Mapping

**Layer:** Backend Utility — SuiteCloud CLI Integration

**Flow:**

    /api/netsuite/authenticate (routers/netsuite.py)
      → session_store.set_session_creds(user_id, creds)   ← runtime credentials (correct)

    sdf_utils.setup_account_ci()   ← THIS CASE LIVES HERE (dead credential placeholders)
      → suitecloud account:setup (interactive — no credentials in code)

**Upstream:** `rawapi.py:74` calls `setup_account_ci()` during startup (inside a try/except block)

**Downstream:** `suitecloud account:setup` prompts user interactively for credentials — the commented-out values were from a prior manual approach

## Verification
- [ ] Grep proof: `grep -n "tokenid\|tokensecret\|consumerkey\|consumersecret\|7220160" src/backend/sdf_utils.py` → shows lines 55-61 (commented-out credential block)
- [ ] Fix proof: after removing lines, `grep -n "tokenid\|tokensecret" src/backend/sdf_utils.py` → empty
- [ ] Security scan: `grep -rn "tokenid\|tokensecret" src/backend/` → empty across all files

## Downstream Impact
**Impact if unfixed:** Security Risk (low — sandbox credentials)

If the hexadecimal values are from a real (even sandbox) NetSuite account that is still active, an attacker who reads the git history could use them. The risk is low if: (a) the sandbox account has been deleted, or (b) these are dummy/placeholder values that were never used for a real account. In either case, the CLAUDE.md credential handling rule requires their removal.

## Links
- Phase SUMMARY: `.planning/phases/02-netsuite-tba/02-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-014 (adjacent credential handling in session_store.py)
