import asyncio
from pathlib import Path
import sys
import unittest
from unittest.mock import AsyncMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import live_set


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


class LiveSetTests(unittest.TestCase):
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
