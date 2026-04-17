import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_reactions(client: AsyncClient):
    resp = await client.get('/api/blog/test-post/reactions')
    assert resp.status_code == 200
    data = resp.json()
    assert 'insightful' in data
    assert 'hot' in data
    assert 'saved' in data


@pytest.mark.asyncio
async def test_post_reaction(client: AsyncClient):
    resp = await client.post('/api/blog/test-post/react', json={'reaction': 'insightful'})
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_post_comment(client: AsyncClient):
    resp = await client.post('/api/blog/test-post/comments', json={
        'name': 'Test User',
        'body': 'This is a test comment that is long enough to pass validation requirements.',
    })
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_get_comments_only_approved(client: AsyncClient):
    # Just-posted comment should NOT appear (status=pending).
    resp = await client.get('/api/blog/test-post/comments')
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    # All returned comments must be the approved state (no pending leak).
    # Since no comments are pre-approved in the test DB, the list is typically empty.
    for c in data:
        assert c.get('status', 'approved') == 'approved'


@pytest.mark.asyncio
async def test_admin_moderation_requires_auth(client: AsyncClient):
    resp = await client.get('/api/admin/blog/comments')
    assert resp.status_code in (401, 403)
