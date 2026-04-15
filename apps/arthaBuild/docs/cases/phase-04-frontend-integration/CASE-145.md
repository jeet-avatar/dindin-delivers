---
id: CASE-145
title: "Frontend deploy button sends POST /api/deploy/suitescript with correct payload"
phase: "04"
phase_name: "Frontend Integration"
category: FEATURE_TEST
severity: LOW
status: DEFERRED
deferred_reason: "Playwright browser testing infrastructure required — deferred to M2 staging validation phase"
created: 2026-04-10
updated: 2026-04-11
assignee: "Priya"
agent: "gsd-executor"
blocks: []
blocked_by: []
feature: "Frontend SuiteScript deploy"
test_ref: ""
files:
  - path: src/frontend/src/components/ChatMessage.tsx
    lines: ""
---

## Why This Case Was Created
The frontend deploy button must send a POST request to `/api/deploy/suitescript` with the correct payload and then display the `deploy_log` from the response. If the endpoint or payload schema is wrong, SuiteScript deployment silently fails from the UI. No E2E test verifies the deploy button → API call → response display flow.

## What Is Wrong
No test exists for this behavior. A payload structure change or endpoint URL change breaks deployment without any automated detection.

## Why It Was Done This Way (Root Cause)
Phase 04 implemented the deploy UI button. The backend endpoint exists and was tested independently. The frontend integration was manually verified. No automated test captures the end-to-end deploy button interaction.

## What Is Done Right
The backend `POST /api/deploy/suitescript` endpoint exists and returns `{status, deploy_log, script_id}`. The frontend deploy button component exists. The response display (deploy log panel) was implemented.

## How To Fix It
Write the following test in `tests/e2e/test_deploy_ui.py`:

```python
@pytest.mark.asyncio
async def test_deploy_button_calls_correct_endpoint_and_shows_log(page, mock_api):
    """
    Verify the deploy button:
    1. POSTs to /api/deploy/suitescript with script_content and script_name
    2. Displays the deploy_log from the response
    """
    captured = {}

    async def handle_deploy(route):
        captured["body"] = await route.request.json()
        await route.fulfill(
            status=200,
            json={"status": "deployed", "deploy_log": "Script deployed at 12:00", "script_id": "customscript_1"}
        )

    await mock_api.route("**/api/deploy/suitescript", handle_deploy)

    await page.goto("http://localhost:5173/deploy")
    await page.fill('[data-testid="script-content"]', "define(['N/record'], function() {});")
    await page.fill('[data-testid="script-name"]', "my_script")
    await page.click('[data-testid="deploy-button"]')

    # Assert correct payload sent
    assert "script_content" in captured.get("body", {}), "Missing script_content in payload"
    assert "script_name" in captured.get("body", {}), "Missing script_name in payload"

    # Assert deploy_log displayed
    log_panel = page.locator('[data-testid="deploy-log"]')
    await log_panel.wait_for()
    assert "Script deployed at 12:00" in await log_panel.text_content()
```

## Architecture Mapping

**Layer:** Frontend → Backend Deploy Pipeline (E2E)

**Flow:**
    Deploy button click → POST /api/deploy/suitescript {script_content, script_name} → response.deploy_log → display in UI ← NO TEST EXISTS HERE

**Upstream:** User uploads SuiteScript from the deploy panel
**Downstream:** If broken, deploy appears to succeed in UI but nothing is actually deployed

## Verification
- [ ] Write test: `pytest tests/e2e/test_deploy_ui.py::test_deploy_button_calls_correct_endpoint_and_shows_log -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for deploy button flow. A payload field rename silently breaks all SuiteScript deployments.

## Links
- Phase SUMMARY: `.planning/phases/04-frontend-integration/04-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-133, CASE-143
