import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_collect_pageview(client: AsyncClient):
    resp = await client.post('/api/analytics/collect', json={
        'type': 'pageview',
        'session_id': 'test-session-1',
        'page': '/blog',
        'referrer': 'https://google.com',
    })
    assert resp.status_code == 200

@pytest.mark.asyncio
async def test_collect_update(client: AsyncClient):
    resp = await client.post('/api/analytics/collect', json={
        'type': 'update',
        'session_id': 'test-session-1',
        'page': '/blog',
        'scroll_depth': 75,
        'time_on_page': 120,
    })
    assert resp.status_code == 200

@pytest.mark.asyncio
async def test_admin_summary_requires_auth(client: AsyncClient):
    resp = await client.get('/api/admin/analytics/summary')
    assert resp.status_code in (401, 403)
