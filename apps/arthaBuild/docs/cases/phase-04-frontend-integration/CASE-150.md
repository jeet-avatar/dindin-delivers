---
id: CASE-150
title: "Frontend admin team management page shows members from GET /api/admin/team"
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
feature: "Frontend admin UI"
test_ref: ""
files:
  - path: src/frontend/src/components/ChatMessage.tsx
    lines: ""
---

## Why This Case Was Created
The admin team management page must load and display team members from `GET /api/admin/team`. This page is only accessible to users with the admin role. If the page doesn't load team data or fails to apply role-based access, non-admin users could see admin UI or admins could see an empty team list. No E2E test verifies this page.

## What Is Wrong
No test exists for this behavior. Team management is a critical admin feature with no automated coverage.

## Why It Was Done This Way (Root Cause)
Phase 04 implemented the admin UI pages. Team management was included as a page component but E2E testing was deferred. The backend `/api/admin/team` endpoint may be part of Phase 10 (Admin Panel) and may not yet exist.

## What Is Done Right
The admin role check exists in the backend auth middleware. The frontend routing supports protected admin routes. The team management page component exists as a planned feature.

## How To Fix It
Write the following test in `tests/e2e/test_admin_team.py`:

```python
@pytest.mark.asyncio
async def test_admin_team_page_shows_members(page, mock_api, admin_auth_headers):
    """
    Verify that the admin team management page loads team members
    from GET /api/admin/team and renders them in a list.
    """
    mock_members = [
        {"id": "user-1", "email": "alice@corp.com", "role": "admin", "team": "NetSuite Team"},
        {"id": "user-2", "email": "bob@corp.com", "role": "user", "team": "NetSuite Team"},
    ]

    await mock_api.route(
        "**/api/admin/team",
        lambda route: route.fulfill(status=200, json=mock_members)
    )

    await page.goto("http://localhost:5173/admin/team")

    member_rows = page.locator('[data-testid="team-member-row"]')
    count = await member_rows.count()
    assert count == 2, f"Expected 2 team members, got {count}"

    emails = [await member_rows.nth(i).get_attribute("data-email") for i in range(count)]
    assert "alice@corp.com" in emails
    assert "bob@corp.com" in emails


@pytest.mark.asyncio
async def test_non_admin_cannot_access_team_management_page(page, mock_api):
    """
    Verify that a non-admin user is redirected away from /admin/team.
    """
    await page.goto("http://localhost:5173/admin/team")
    # Should redirect to login or show 403 UI
    assert "/admin/team" not in page.url or await page.locator('[data-testid="forbidden"]').is_visible()
```

## Architecture Mapping

**Layer:** Frontend → Backend Admin API (E2E)

**Flow:**
    GET /admin/team (admin-only route) → fetch GET /api/admin/team → render member list ← NO TEST EXISTS HERE

**Upstream:** Admin user opens team management page
**Downstream:** If broken, admin cannot manage team membership — cannot invite or remove users

## Verification
- [ ] Write test: `pytest tests/e2e/test_admin_team.py::test_admin_team_page_shows_members -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for admin team UI. A route guard bug could expose admin UI to non-admin users.

## Links
- Phase SUMMARY: `.planning/phases/04-frontend-integration/04-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-173, CASE-174, CASE-175
