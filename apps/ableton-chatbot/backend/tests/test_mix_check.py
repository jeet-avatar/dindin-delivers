import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np
from scipy.io import wavfile

import mix_check
import producer_profile
import recordings


def tone(frequency=110, gain=0.2, seconds=3, rate=44100):
    times = np.arange(round(seconds * rate)) / rate
    audio = gain * np.sin(2 * np.pi * frequency * times)
    return np.column_stack((audio, audio)).astype('float32')


class FakeAbleton:
    """Canned OSC replies for a 3-track session: Kick, Bass, Lead. Override .replies to change state."""
    def __init__(self, track_names=('Kick', 'Bass', 'Lead'), scene=0, num_scenes=1):
        self.track_names, self.scene, self.num_scenes = track_names, scene, num_scenes
        self.mute = {i: False for i in range(len(track_names))}
        self.solo = {i: False for i in range(len(track_names))}
        self.arm = {i: False for i in range(len(track_names))}
        self.volume = {i: 0.85 for i in range(len(track_names))}

    async def query(self, address, args):
        if address == '/live/song/get/track_names':
            return list(self.track_names)
        if address == '/live/song/get/num_scenes':
            return [self.num_scenes]
        if address == '/live/track/get/mute':
            return [args[0], self.mute[args[0]]]
        if address == '/live/track/get/solo':
            return [args[0], self.solo[args[0]]]
        if address == '/live/track/get/arm':
            return [args[0], self.arm[args[0]]]
        if address == '/live/track/get/can_be_armed':
            return [args[0], True]
        if address == '/live/track/get/volume':
            return [args[0], self.volume[args[0]]]
        if address == '/live/clip_slot/get/has_clip':
            return [args[0], args[1], True]
        if address == '/live/track/get/arrangement_clips/name':
            return [args[0]]
        if address == '/live/scene/get/name':
            return [args[0], f'Scene {args[0] + 1}']
        raise AssertionError(f'FakeAbleton has no canned reply for {address}')


class MixCheckTests(unittest.IsolatedAsyncioTestCase):
    """`recordings.save_recording()` validates real M4A magic bytes (`data[4:8] == b"ftyp"`), so it
    can't take a WAV fixture directly. `mix_check.run()` only needs `owned_recording()` (reads the
    JSON sidecar) and a file at `ROOT/{id}.m4a` (read by FFmpeg, which sniffs real content and doesn't
    care that the extension says m4a) — write both directly, bypassing save_recording()'s M4A check,
    which exists for the real upload path, not for test fixtures.

    Also patches producer_profile.ROOT to an empty temp dir for every test in this class (and any
    future subclass) — without this, mix_check.run()'s new default path (a later task) calls
    producer_profile.stored(user_id=1) against whichever real path BEATMIND_PROFILES_DIR resolves to,
    so a stale local run or shared cache with a saved preference for that user id would silently
    change these tests' expected values."""

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self._root_patch = patch.object(recordings, 'ROOT', Path(self._tmp.name))
        self._root_patch.start()
        self.addCleanup(self._root_patch.stop)
        self._profiles_tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._profiles_tmp.cleanup)
        self._profile_patch = patch.object(producer_profile, 'ROOT', Path(self._profiles_tmp.name))
        self._profile_patch.start()
        self.addCleanup(self._profile_patch.stop)

    def _save_full_mix_recording(self, gain=0.5, user_id=1):
        import json, uuid
        recording_id = uuid.uuid4().hex
        wavfile.write(recordings.ROOT / f'{recording_id}.m4a', 44100, tone(gain=gain))
        (recordings.ROOT / f'{recording_id}.json').write_text(json.dumps({
            'id': recording_id, 'user_id': user_id, 'kind': 'scene', 'scene': 0, 'scene_name': 'Drop',
            'created_at': '2026-09-29T00:00:00+00:00', 'track_name': '', 'track': None, 'metrics': {}}))
        return recording_id

    async def test_true_peak_over_ceiling_fails(self):
        recording_id = self._save_full_mix_recording(gain=0.99)  # near-clipping
        report = await mix_check.run(user_id=1, recording_id=recording_id, query=FakeAbleton().query)
        headroom = next(c for c in report['checks'] if c['id'] == 'headroom')
        self.assertIn(headroom['status'], ('warn', 'fail'))

    async def test_quiet_mix_warns_below_target(self):
        recording_id = self._save_full_mix_recording(gain=0.02)
        report = await mix_check.run(user_id=1, recording_id=recording_id, query=FakeAbleton().query)
        loudness_check = next(c for c in report['checks'] if c['id'] == 'loudness')
        self.assertEqual(loudness_check['status'], 'warn')


if __name__ == '__main__':
    unittest.main()
