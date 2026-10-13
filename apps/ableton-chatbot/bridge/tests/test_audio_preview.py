from pathlib import Path
import unittest
from unittest.mock import AsyncMock, patch

import audio_preview


class Bridge:
    def __init__(self, playing_after=1):
        self.playing_after = playing_after
        self.reads = 0
        self.writes = []
        self.state = {
            '/live/song/get/is_playing': False,
            '/live/song/get/record_mode': False,
            '/live/song/get/session_record': False,
            '/live/song/get/track_names': 'Kick',
            '/live/clip_slot/get/has_clip': True,
            '/live/song/get/current_song_time': 16,
            '/live/song/get/clip_trigger_quantization': 4,
            '/live/track/get/solo': False,
            '/live/track/get/mute': False,
        }

    async def _query_osc(self, request_id, address, args, timeout):
        if address == '/live/clip/get/is_playing':
            self.reads += 1
            value = self.reads >= self.playing_after
        else:
            value = self.state[address]
        return {'status': 'ok', 'args': [value]}

    def _send_osc(self, address, args):
        self.writes.append((address, args))
        if '/set/' in address:
            self.state[address.replace('/set/', '/get/')] = args[-1]


class ClipPreviewTests(unittest.IsolatedAsyncioTestCase):
    async def capture(self, bridge):
        async def record(helper, seconds, start):
            await start()
            return {'has_signal': True}, b'preview audio'
        with patch.object(audio_preview, 'helper_path', return_value=Path(__file__).parent), \
                patch.object(audio_preview, 'record_with_helper', side_effect=record), \
                patch.object(audio_preview.asyncio, 'sleep', AsyncMock()):
            return await audio_preview.capture_part(bridge, 0, 0, 8)

    async def test_asynchronous_clip_launch_is_read_back_without_refiring(self):
        bridge = Bridge(playing_after=4)
        result = await self.capture(bridge)
        self.assertEqual(result['status'], 'verified', result)
        self.assertEqual(bridge.reads, 4)
        self.assertEqual(sum(address == '/live/clip/fire' for address, _ in bridge.writes), 1)
        self.assertEqual(bridge.state['/live/song/get/current_song_time'], 16)
        self.assertEqual(bridge.state['/live/song/get/clip_trigger_quantization'], 4)
        self.assertFalse(bridge.state['/live/track/get/solo'])

    async def test_clip_that_never_starts_is_not_approved_or_relaunched(self):
        bridge = Bridge(playing_after=100)
        result = await self.capture(bridge)
        self.assertEqual(result['status'], 'failed')
        self.assertNotIn('audio_base64', result)
        self.assertIn('retry its preview', result['summary'])
        self.assertEqual(bridge.reads, 10)
        self.assertEqual(sum(address == '/live/clip/fire' for address, _ in bridge.writes), 1)
        self.assertIn(('/live/song/stop_playing', []), bridge.writes)
        self.assertEqual(bridge.state['/live/song/get/current_song_time'], 16)
