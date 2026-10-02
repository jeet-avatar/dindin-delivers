import asyncio
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import AsyncMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import live_set
from live_window import WindowCheckError, select_document


class FakeBridge:
    def __init__(self, clips=(), arranged=()):
        self.clips, self.arranged = set(clips), set(arranged)

    async def _query_osc(self, request, address, args, timeout):
        replies = {"/live/song/get/track_names": lambda: ["Kick", "Bass"],
                   "/live/song/get/num_scenes": lambda: [3],
                   "/live/clip_slot/get/has_clip": lambda: [*args, tuple(args) in self.clips],
                   "/live/track/get/arrangement_clips/name": lambda: [args[0], *(["take"] if args[0] in self.arranged else [])]}
        return {"status": "ok", "args": replies[address]()}


def inspect(title, bridge):
    with patch.object(live_set.sys, "platform", "darwin"), patch.object(live_set, "window_title", AsyncMock(return_value=title)):
        return asyncio.run(live_set.live_set_operation(bridge, "inspect"))


def test_locked_screen_is_reported_plainly():
    with patch.object(live_set.sys, "platform", "darwin"), patch.object(live_set, "screen_locked", AsyncMock(return_value=True)):
        result = asyncio.run(live_set.live_set_operation(FakeBridge(), "inspect"))
    assert result["status"] == "failed" and "Your Mac is locked" in result["summary"]


class LiveSetTests(unittest.TestCase):
    def test_document_identity_ignores_recorder_auxiliary_window(self):
        snapshot = {'process_count': 1, 'new_enabled': True, 'windows': [
            {'title': 'Recorder', 'subrole': 'AXFloatingWindow'},
            {'title': 'Fixture Set', 'document': 'file:///tmp/Fixture.als'}]}
        with patch.object(live_set, "screen_locked", AsyncMock(return_value=False)), \
             patch.object(live_set, "applescript", AsyncMock(return_value=json.dumps(snapshot))) as script:
            self.assertEqual(asyncio.run(live_set.window_title()), "Fixture Set")
        source = script.call_args.args[0]
        self.assertEqual(script.call_args.kwargs['language'], 'JavaScript')
        self.assertIn('AXDocument', source)
        self.assertIn('window.sheets()', source)
        self.assertIn("menuItems.byName('New Live Set').enabled()", source)

    def test_ambiguous_document_prevents_file_actions(self):
        for operation in ("inspect", "save", "new"):
            with self.subTest(operation=operation), \
                 patch.object(live_set.sys, "platform", "darwin"), \
                 patch.object(live_set, "window_title", AsyncMock(side_effect=RuntimeError("Ambiguous document"))), \
                 patch.object(live_set, "applescript", AsyncMock()) as script:
                result = asyncio.run(live_set.live_set_operation(FakeBridge(), operation))
                self.assertEqual(result["status"], "failed")
                script.assert_not_awaited()

    def test_window_failure_returns_in_app_diagnostics_without_file_paths(self):
        snapshot = {'process_count': 1, 'new_enabled': True,
                    'windows': [{'title': 'Fixture', 'subrole': 'AXUnknown', 'main': False,
                                 'document': 'file:///private/not-a-set.wav'}]}
        with patch.object(live_set.sys, 'platform', 'darwin'), \
             patch.object(live_set, 'screen_locked', AsyncMock(return_value=False)), \
             patch.object(live_set, 'applescript', AsyncMock(return_value=json.dumps(snapshot))):
            result = asyncio.run(live_set.live_set_operation(FakeBridge(), 'inspect'))
        self.assertEqual(result['error_code'], 'ambiguous_window')
        self.assertEqual(result['diagnostics']['windows'][0]['subrole'], 'AXUnknown')
        self.assertNotIn('/private/', json.dumps(result))

    def test_empty_untitled_set_is_ready_even_right_after_launch(self):
        result = inspect("Untitled", FakeBridge())
        self.assertTrue(result["new_set_ready"])

    def test_untitled_set_with_clips_or_arrangement_is_not_new(self):
        self.assertFalse(inspect("Untitled", FakeBridge(clips=[(1, 2)]))["new_set_ready"])
        self.assertFalse(inspect("Untitled", FakeBridge(arranged=[0]))["new_set_ready"])

    def test_saved_set_is_never_treated_as_new(self):
        self.assertFalse(inspect("Undertow", FakeBridge())["new_set_ready"])

    def test_new_set_is_requested_even_when_the_current_set_is_untitled(self):
        with patch.object(live_set.sys, "platform", "darwin"), \
             patch.object(live_set, "window_title", AsyncMock(return_value="Untitled")), \
             patch.object(live_set, "applescript", AsyncMock(return_value="")) as script:
            result = asyncio.run(live_set.live_set_operation(FakeBridge(), "new"))
        self.assertEqual(result["status"], "awaiting_user")
        self.assertIn("New Live Set", script.call_args.args[0])


class WindowSelectionTests(unittest.TestCase):
    def select(self, *windows, count=1, enabled=True):
        return select_document({'process_count': count, 'new_enabled': enabled, 'windows': windows})

    def test_saved_set_without_standard_subrole(self):
        self.assertEqual(self.select({'title': 'Saved', 'subrole': 'AXUnknown',
                                      'document': 'file:///Users/test/My%20Set.als'}), 'Saved')

    def test_single_unsaved_main_window_without_standard_subrole(self):
        for subrole in ('AXUnknown', '', 'AXStandardWindow'):
            self.assertEqual(self.select({'title': 'Untitled', 'main': True, 'subrole': subrole}), 'Untitled')

    def test_saved_set_and_plugin_both_standard(self):
        self.assertEqual(self.select({'title': 'Plugin', 'subrole': 'AXStandardWindow'},
            {'title': 'Saved', 'subrole': 'AXStandardWindow', 'document': 'file:///tmp/Saved.als'}), 'Saved')

    def test_second_view_of_same_saved_document(self):
        self.assertEqual(self.select({'title': 'Second View', 'document': 'file:///tmp/Saved.als'},
            {'title': 'Saved', 'document': 'file:///tmp/Saved.als', 'main': True}), 'Saved')

    def test_unknown_window_without_document_or_main_evidence_is_not_guessed(self):
        with self.assertRaises(WindowCheckError):
            self.select({'title': 'Plugin', 'subrole': 'AXUnknown'})

    def test_dialog_and_sheets_block_even_with_valid_document(self):
        for dialog in ({'title': 'Save', 'modal': True}, {'title': 'Settings', 'sheets': 1}):
            with self.assertRaises(WindowCheckError) as raised:
                self.select({'title': 'Saved', 'document': 'file:///tmp/Saved.als'}, dialog)
            self.assertEqual(raised.exception.code, 'live_dialog')

    def test_disabled_new_menu_blocks(self):
        with self.assertRaises(WindowCheckError) as raised:
            self.select({'title': 'Saved', 'document': 'file:///tmp/Saved.als'}, enabled=False)
        self.assertEqual(raised.exception.code, 'live_dialog')

    def test_two_distinct_documents_are_never_guessed(self):
        with self.assertRaises(WindowCheckError):
            self.select({'title': 'A', 'document': 'file:///tmp/A.als'},
                        {'title': 'B', 'document': 'file:///tmp/B.als', 'main': True})

    def test_minimized_document_requires_bringing_forward(self):
        with self.assertRaises(WindowCheckError) as raised:
            self.select({'title': 'Saved', 'document': 'file:///tmp/Saved.als', 'minimized': True})
        self.assertEqual(raised.exception.code, 'window_minimized')

    def test_no_window_and_multiple_apps_have_distinct_codes(self):
        for count, code in ((0, 'live_not_open'), (1, 'window_unavailable'), (2, 'multiple_live_apps')):
            with self.assertRaises(WindowCheckError) as raised:
                self.select(count=count)
            self.assertEqual(raised.exception.code, code)
