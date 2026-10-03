import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
import uuid
import os

import pytest
from fastapi import HTTPException

import database
import main
import song_usage


def subscriber(limit=10, trial=False):
    expires = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat() if trial else None
    user = database.create_user(f'{uuid.uuid4().hex}@example.com', 'test-only', 'Song test', expires)
    if not trial:
        with database.db() as conn:
            conn.execute("UPDATE users SET subscription_status='active', plan='starter', plan_tier='starter', included_tracks=? WHERE id=?", (limit, user['id']))
    return database.get_user_by_id(user['id'])


def begin(user, song):
    song_usage.authorize(user['id'], song, 'My Song', consent=True)
    return song_usage.start(user['id'], song, 'My Song')


def test_ten_songs_eleventh_blocked_retries_and_old_song_edits_allowed():
    user = subscriber()
    for i in range(10):
        assert begin(user, str(i))['used'] == i + 1
    with pytest.raises(HTTPException) as error:
        begin(user, 'eleven')
    assert error.value.status_code == 402
    assert song_usage.start(user['id'], '0', 'My Song')['used'] == 10
    assert song_usage.authorize(user['id'], '0', 'My Song')['started']


def test_authorization_does_not_charge_but_start_needs_consent_and_correct_set():
    user = subscriber()
    with pytest.raises(HTTPException):
        song_usage.authorize(user['id'], 'song', 'Set')
    with pytest.raises(HTTPException):
        song_usage.start(user['id'], 'song', 'Set')
    assert song_usage.authorize(user['id'], 'song', 'Set', consent=True)['used'] == 0
    with pytest.raises(HTTPException):
        song_usage.start(user['id'], 'song', 'Different')
    assert song_usage.summary(user)['used'] == 0


def test_authorized_drafts_cannot_overbook_and_concurrent_last_slot_is_atomic():
    user = subscriber(limit=1)
    for song in ('a', 'b'):
        song_usage.authorize(user['id'], song, 'Set', consent=True)
    def start(song):
        try:
            return song_usage.start(user['id'], song, 'Set')['started']
        except HTTPException as error:
            return error.status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(start, ['a', 'b']))
    assert sorted(results) == [True, 402]
    assert song_usage.summary(user)['used'] == 1


def test_repeated_concurrent_same_song_counts_once():
    user = subscriber()
    song_usage.authorize(user['id'], 'same', 'Set', consent=True)
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(lambda _: song_usage.start(user['id'], 'same', 'Set'), range(4)))
    assert all(result['used'] == 1 for result in results)


def test_ledger_survives_chat_deletion_rename_and_separation_refunds(tmp_path):
    user = subscriber()
    begin(user, 'song')
    with patch.object(main.chat_store, 'ROOT', tmp_path):
        session = main.ChatSession('song', user['id'])
        session.project = {'title': 'Renamed'}
        main.chat_store.save(session, 'complete')
        import shutil
        shutil.rmtree(main.chat_store.directory(user['id'], 'song'))
    import billing
    billing.refund('song')
    assert song_usage.summary(user)['used'] == 1


def test_new_month_resets_only_new_song_allowance_and_trial_is_separate():
    user = subscriber(limit=1)
    with patch.object(song_usage, 'month', return_value='2026-01'):
        begin(user, 'old')
    with patch.object(song_usage, 'month', return_value='2026-02'):
        assert song_usage.start(user['id'], 'old', 'My Song')['used'] == 0
        assert begin(user, 'new')['used'] == 1
    trial = subscriber(trial=True)
    assert begin(trial, 'trial')['period'] == 'trial'
    with database.db() as conn:
        conn.execute("UPDATE users SET subscription_status='active', included_tracks=10 WHERE id=?", (trial['id'],))
    assert song_usage.summary(database.get_user_by_id(trial['id']))['used'] == 0


def test_ownership_and_saved_as_explicit_attestation():
    first, other = subscriber(), subscriber()
    begin(first, 'song')
    with pytest.raises(HTTPException):
        song_usage.start(other['id'], 'song', 'My Song')
    with pytest.raises(HTTPException):
        song_usage.authorize(first['id'], 'song', 'Renamed')
    assert song_usage.authorize(first['id'], 'song', 'Renamed', same_song=True)['used'] == 1


def test_paid_separation_packs_cannot_add_songs():
    user = subscriber(limit=0)
    with database.db() as conn:
        conn.execute("INSERT INTO credit_ledger (user_id, kind, delta, reason) VALUES (?, 'track', 100, 'fixture')", (user['id'],))
    with pytest.raises(HTTPException) as error:
        begin(user, 'song')
    assert error.value.status_code == 402


def test_dispatch_prevents_writes_without_consent_and_preserves_count_on_interruption():
    async def run():
        user = subscriber()
        session = main.ChatSession('song', user['id'])
        session.project = {'live_set': {'title': 'Set'}}
        bridge = SimpleNamespace(user_id=user['id'])
        with patch.object(main, '_execute_tool', AsyncMock(return_value={'status': 'verified'})) as execute:
            for name, data in [('invented_tool', {}), ('set_tempo', {'bpm': -4})]:
                assert (await main._execute_song_tool(session, name, data, bridge))['status'] == 'failed'
            assert song_usage.summary(user)['used'] == 0
            result = await main._execute_song_tool(session, 'set_tempo', {'bpm': 124}, bridge)
            assert result['status'] == 'failed'
            execute.assert_not_awaited()
            for name, data in [('get_tempo', {}), ('read_track_mixer', {'track': 0}), ('groove', {'action': 'pool'})]:
                await main._execute_song_tool(session, name, data, bridge)
            assert song_usage.summary(user)['used'] == 0
            song_usage.authorize(user['id'], 'song', 'Set', consent=True)
            execute.side_effect = asyncio.CancelledError
            with pytest.raises(asyncio.CancelledError):
                await main._execute_song_tool(session, 'set_tempo', {'bpm': 124}, bridge)
            assert song_usage.summary(user)['used'] == 1
    asyncio.run(run())


def test_explicit_restart_not_normal_edits_or_negated_request():
    for text in ('Start a new song', 'Please start over', "Let's build a new project", 'Replace the entire composition'):
        assert song_usage.explicit_restart(text)
    for text in ('Do not start over', 'Change the kick', 'Make this 126 BPM', 'Can you explain what start over means?'):
        assert not song_usage.explicit_restart(text)


def test_new_set_confirmation_cannot_recycle_a_started_song(tmp_path):
    async def run():
        user = subscriber()
        with patch.object(main.chat_store, 'ROOT', tmp_path), patch.object(main, 'bridges', {}):
            created = await main.create_song_project(user)
            sid = created['sessionId']
            bridge = SimpleNamespace(user_id=user['id'], lock=asyncio.Lock(),
                local_operation=AsyncMock(return_value={'status': 'observed', 'title': 'My Song', 'new_set_ready': True}),
                send_command=AsyncMock())
            main.bridges['test'] = bridge
            with pytest.raises(HTTPException):
                await main.live_set_action(main.LiveSetRequest(operation='confirm_current', session_id=sid), user)
            await main.live_set_action(main.LiveSetRequest(operation='confirm_current', session_id=sid, authorize_song=True), user)
            assert song_usage.summary(user)['used'] == 0
            song_usage.start(user['id'], sid, 'My Song')
            with pytest.raises(HTTPException) as error:
                await main.live_set_action(main.LiveSetRequest(operation='confirm_new', session_id=sid, authorize_song=True, same_song=True), user)
            assert error.value.status_code == 409
            assert song_usage.summary(user)['used'] == 1
            song_usage.record_music(user['id'], sid)
            with pytest.raises(HTTPException) as error:
                await main.live_set_action(main.LiveSetRequest(operation='confirm_current', session_id=sid, same_song=True), user)
            assert 'empty Live Set' in error.value.detail
            bridge.send_command.assert_not_awaited()
    asyncio.run(run())


def test_empty_set_guard_does_not_block_initial_tempo_and_setup():
    user = subscriber()
    begin(user, 'song')
    song_usage.check_empty_replacement(song_usage.summary(user, 'song'), {'new_set_ready': True})
    song_usage.record_music(user['id'], 'song')
    song_usage.check_empty_replacement(song_usage.summary(user, 'song'), {'new_set_ready': False})
    with pytest.raises(HTTPException):
        song_usage.check_empty_replacement(song_usage.summary(user, 'song'), {'new_set_ready': True})


def test_paid_ai_limit_checked_between_model_rounds():
    import ai_usage
    async def run():
        user = subscriber()
        session = main.ChatSession('cap-check', user['id'])
        session.messages = [{'role': 'user', 'content': 'Inspect the set'}]
        call = SimpleNamespace(type='tool_use', name='get_tempo', id='tempo', input={})
        response = SimpleNamespace(stop_reason='tool_use', content=[call])
        with patch.object(ai_usage, 'enforce', side_effect=[None, HTTPException(429, ai_usage.FAIR_USE_MESSAGE)]) as enforce, \
             patch.object(main, 'request_message', AsyncMock(return_value=(response, main.MODEL))) as request, \
             patch.object(main, '_execute_tool', AsyncMock(return_value={'status': 'observed'})), \
             patch.object(ai_usage, 'record'):
            with pytest.raises(HTTPException) as error:
                await main._run_claude_loop(session, None)
            assert error.value.status_code == 429
            assert enforce.call_count == 2
            request.assert_awaited_once()
    asyncio.run(run())


def test_ai_limit_counts_only_usage_since_activation():
    import ai_usage
    user = subscriber()
    current_month = datetime.now(timezone.utc).strftime('%Y-%m')
    ai_usage.record(user['id'], 'chat', 'anthropic', 'claude-opus-5-5', {'output_tokens': 1000000}, 'old')
    with database.db() as conn:
        conn.execute('UPDATE ai_usage SET created_at=? WHERE user_id=?', (current_month + '-01 00:00:00', user['id']))
    with patch.dict(os.environ, {'AI_FAIR_USE_ENFORCED': 'true', 'AI_FAIR_USE_START_AT': current_month + '-01T00:00:01+00:00'}):
        assert not ai_usage.over_cap(user['id'], 'starter')
        ai_usage.record(user['id'], 'chat', 'anthropic', 'claude-opus-5-5', {'output_tokens': 1000000}, 'new')
        with database.db() as conn:
            conn.execute('UPDATE ai_usage SET created_at=? WHERE user_id=? AND request_id=?', (current_month + '-01 00:00:02', user['id'], 'new'))
        assert ai_usage.over_cap(user['id'], 'starter')
