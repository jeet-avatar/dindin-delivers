import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np
from scipy.io import wavfile

import mastering
import mix_check
import producer_profile
import recordings


def tone(frequency=110, gain=0.2, seconds=3, rate=44100):
    times = np.arange(round(seconds * rate)) / rate
    audio = gain * np.sin(2 * np.pi * frequency * times)
    return np.column_stack((audio, audio)).astype('float32')


class FakeAbleton:
    """Canned OSC replies for a 3-track session: Kick, Bass, Lead. Override .mute/.solo/.arm/.volume to change state."""
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


class PrecedenceTests(MixCheckTests):
    """Subclasses MixCheckTests to reuse its setUp() (patches recordings.ROOT to a temp dir) and
    _save_full_mix_recording() fixture helper — not a fresh unittest.IsolatedAsyncioTestCase."""

    async def test_explicit_target_wins_over_everything(self):
        # A conflicting producer profile is saved too, so this actually proves explicit beats profile
        # (not just that explicit flows through when nothing else is set).
        producer_profile.update(user_id=1, changes={'loudness_target_lufs': -10.0})
        recording_id = self._save_full_mix_recording(gain=0.1)
        report = await mix_check.run(user_id=1, recording_id=recording_id, query=FakeAbleton().query,
                                     target_lufs=-8.0)
        self.assertEqual(report['measurements']['target_lufs'], -8.0)

    async def test_producer_profile_wins_when_no_explicit_target(self):
        # setUp() (inherited from MixCheckTests) already patches producer_profile.ROOT to an isolated
        # temp dir, so this only needs to write into it — no separate patch needed here.
        # A valid, conflicting reference_id is also supplied, so this proves profile beats reference
        # (not just that profile flows through when no reference is offered).
        producer_profile.update(user_id=1, changes={'loudness_target_lufs': -10.0})
        with tempfile.TemporaryDirectory() as refs_dir:
            with patch.object(mastering, 'REFERENCES_ROOT', Path(refs_dir)):
                reference_id = 'd' * 32
                (Path(refs_dir) / reference_id).mkdir()
                wavfile.write(Path(refs_dir) / reference_id / 'mix.wav', 44100, tone(gain=0.5))
                recording_id = self._save_full_mix_recording(gain=0.1)
                report = await mix_check.run(user_id=1, recording_id=recording_id, query=FakeAbleton().query,
                                             reference_id=reference_id)
                self.assertEqual(report['measurements']['target_lufs'], -10.0)

    async def test_reference_wins_when_no_explicit_or_profile_target(self):
        # producer_profile.ROOT isolation comes from the inherited setUp() (no preference saved there,
        # so producer_profile.stored(1) returns {} and .get("loudness_target_lufs") is None).
        # mastering.REFERENCES_ROOT is a separate module-level constant read once at import time
        # (a previous task) — patching the env var after import has no effect, so it needs its own
        # patch.object here.
        with tempfile.TemporaryDirectory() as refs_dir:
            with patch.object(mastering, 'REFERENCES_ROOT', Path(refs_dir)):
                reference_id = 'c' * 32
                (Path(refs_dir) / reference_id).mkdir()
                wavfile.write(Path(refs_dir) / reference_id / 'mix.wav', 44100, tone(gain=0.5))
                recording_id = self._save_full_mix_recording(gain=0.1)
                report = await mix_check.run(user_id=1, recording_id=recording_id, query=FakeAbleton().query,
                                             reference_id=reference_id)
                # Exact value, not just "not the constant" — FFmpeg's ebur128 measurement is
                # deterministic on identical input, so this isn't flaky.
                expected = mastering.reference_targets(reference_id)['target_lufs']
                self.assertEqual(report['measurements']['target_lufs'], expected)

    async def test_constant_default_when_nothing_else_set(self):
        # No preference saved (inherited setUp()'s isolated producer_profile.ROOT is empty) and no
        # reference_id passed, so this must fall all the way through to the TARGET_LUFS constant.
        recording_id = self._save_full_mix_recording(gain=0.1)
        report = await mix_check.run(user_id=1, recording_id=recording_id, query=FakeAbleton().query)
        self.assertEqual(report['measurements']['target_lufs'], mix_check.TARGET_LUFS)

    async def test_reference_failure_returns_failed_status(self):
        # Covers the try/except ValueError path in run(): a reference_id with no saved reference audio
        # must surface reference_targets()'s specific message via a normal failed-status response,
        # not propagate the ValueError.
        with tempfile.TemporaryDirectory() as refs_dir:
            with patch.object(mastering, 'REFERENCES_ROOT', Path(refs_dir)):
                recording_id = self._save_full_mix_recording(gain=0.1)
                report = await mix_check.run(user_id=1, recording_id=recording_id, query=FakeAbleton().query,
                                             reference_id='f' * 32)
                self.assertEqual(report, {"status": "failed",
                                          "summary": "That reference has no saved mix audio to measure.",
                                          "steps": []})


if __name__ == '__main__':
    unittest.main()
