from types import SimpleNamespace
import asyncio
from unittest.mock import AsyncMock, patch

import pytest
import main


@pytest.mark.parametrize('capabilities', [None, set(), {'arrangement_audition_v1'}, {'scene_audition_v1'}])
def test_older_bridges_keep_regular_tools_without_new_arrangement_tools(capabilities):
    bridge = None if capabilities is None else SimpleNamespace(capabilities=capabilities)
    names = {tool['name'] for tool in main._build_tools(bridge)}
    assert not names.intersection(main.arrangement_plan.NAMES)
    assert {'create_midi_track', 'set_track_name'}.issubset(names)


def test_explicit_capability_enables_arrangement_tools():
    bridge = SimpleNamespace(capabilities={'staged_arrangement_v1'})
    names = {tool['name'] for tool in main._build_tools(bridge)}
    assert main.arrangement_plan.NAMES.issubset(names)


def test_model_cannot_bypass_missing_capability():
    bridge = SimpleNamespace(capabilities={'scene_audition_v1'})
    session = main.ChatSession('capability-fixture', 1)
    session.messages = [{'role': 'user', 'content': 'Inspect the arrangement'}]
    responses = [
        SimpleNamespace(content=[SimpleNamespace(type='tool_use', name='get_arrangement_state', input={}, id='tool1')], stop_reason='tool_use'),
        SimpleNamespace(content=[SimpleNamespace(type='text', text='Arrangement tools are unavailable.')], stop_reason='end_turn'),
    ]
    client = SimpleNamespace(messages=SimpleNamespace(create=AsyncMock(side_effect=responses)))
    with patch.object(main, 'claude_client', client), patch.object(main.arrangement_plan, 'execute', AsyncMock()) as execute:
        _, actions = asyncio.run(main._run_claude_loop(session, bridge))
    execute.assert_not_awaited()
    assert actions[0]['result']['status'] == 'failed'
    assert 'Nothing was changed' in actions[0]['result']['summary']
