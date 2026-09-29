import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from main import _mix_tool


def target_lufs_passed(call_args):
    """The `target_lufs` value main.py handed to mix_check.run(), whether passed positionally or by keyword."""
    if "target_lufs" in call_args.kwargs:
        return call_args.kwargs["target_lufs"]
    return call_args.args[3] if len(call_args.args) > 3 else "MISSING"


class MixToolDispatchTests(unittest.IsolatedAsyncioTestCase):
    async def test_no_explicit_target_lufs_reaches_mix_check_as_none(self):
        bridge = MagicMock(user_id=1)
        bridge.send_command = AsyncMock(return_value={"status": "ok", "args": []})
        with patch("mix_check.run", new=AsyncMock(return_value={"status": "observed"})) as run:
            await _mix_tool("mix_check", {"recording_id": "a" * 32}, bridge)
        self.assertIsNone(target_lufs_passed(run.call_args))

    async def test_reference_id_is_passed_through_to_mix_check(self):
        bridge = MagicMock(user_id=1)
        bridge.send_command = AsyncMock(return_value={"status": "ok", "args": []})
        reference_id = "b" * 32
        with patch("mix_check.run", new=AsyncMock(return_value={"status": "observed"})) as run:
            await _mix_tool("mix_check", {"recording_id": "a" * 32, "reference_id": reference_id}, bridge)
        self.assertEqual(run.call_args.kwargs.get("reference_id"), reference_id)


if __name__ == "__main__":
    unittest.main()
