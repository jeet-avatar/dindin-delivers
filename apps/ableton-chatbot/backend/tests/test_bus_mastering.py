import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np
from scipy.io import wavfile

import bus_mastering
import mastering
import recordings
import references


def tone(frequency=110, gain=0.2, seconds=3, rate=44100):
    times = np.arange(round(seconds * rate)) / rate
    audio = gain * np.sin(2 * np.pi * frequency * times)
    return np.column_stack((audio, audio)).astype('float32')


def own_reference(refs_dir, reference_id, user_id):
    """Write the meta.json references.owned() reads, so a reference_id in refs_dir passes ownership
    for user_id. Matches the shape references.owned() actually checks: {directory}/meta.json with a
    'user_id' field (confirmed by reading references.py:150 before writing this)."""
    (Path(refs_dir) / reference_id).mkdir(exist_ok=True)
    (Path(refs_dir) / reference_id / 'meta.json').write_text(json.dumps({'id': reference_id, 'user_id': user_id}))


class ClassificationTests(unittest.TestCase):
    def test_classifies_common_track_names(self):
        names = ['Kick', 'Snare', 'Hats', 'Sub Bass', 'Lead Vocal', 'Pad', 'FX Riser']
        result = bus_mastering.classify_tracks(names)
        self.assertEqual(result[0], 'drums')   # Kick
        self.assertEqual(result[1], 'drums')   # Snare
        self.assertEqual(result[2], 'drums')   # Hats
        self.assertEqual(result[3], 'bass')    # Sub Bass
        self.assertEqual(result[4], 'vocals')  # Lead Vocal
        self.assertEqual(result[5], 'other')   # Pad
        self.assertIsNone(result[6])           # FX Riser — unclassified, never guessed

    def test_classifies_literal_drums(self):
        self.assertEqual(bus_mastering.classify('Drums'), 'drums')

    def test_classifies_descriptive_other_names(self):
        self.assertEqual(bus_mastering.classify('Warm Pad'), 'other')
        self.assertEqual(bus_mastering.classify('Analog Synth Lead'), 'other')
        self.assertEqual(bus_mastering.classify('Rhodes Keys'), 'other')
        self.assertEqual(bus_mastering.classify('Nylon Guitar'), 'other')

    def test_classifies_bare_808_as_bass(self):
        self.assertEqual(bus_mastering.classify('808'), 'bass')

    def test_classifies_case_and_whitespace_variants(self):
        self.assertEqual(bus_mastering.classify('KICK'), 'drums')
        self.assertEqual(bus_mastering.classify('Kick '), 'drums')


class BusComparisonTests(unittest.IsolatedAsyncioTestCase):
    async def test_mutes_non_bus_tracks_bounces_measures_and_restores(self):
        with tempfile.TemporaryDirectory() as refs_dir:
            reference_id = 'd' * 32
            with patch.object(references, 'ROOT', Path(refs_dir)):
                own_reference(refs_dir, reference_id, user_id=1)
                wavfile.write(Path(refs_dir) / reference_id / 'bass.wav', 44100, tone(gain=0.4))
                mute_calls = []

                async def send(address, args):
                    if address == '/live/track/set/mute':
                        mute_calls.append(tuple(args))

                async def query(address, args):
                    if address == '/live/song/get/track_names':
                        return ['Kick', 'Sub Bass', 'Lead']
                    if address == '/live/track/get/mute':
                        return [args[0], False]
                    raise AssertionError(address)

                captured = {}
                recording_id_holder = {}

                async def capture_scene(request):
                    # Mirrors what _bus_tool's real capture_scene closure does (capture, then save) —
                    # see the production version of this composition in main.py (a later task).
                    captured.update(request)
                    recording_id_holder['id'] = 'z' * 32
                    wavfile.write(recordings.ROOT / f"{recording_id_holder['id']}.m4a", 44100, tone(gain=0.4))
                    return {'status': 'verified', 'recording': {'id': recording_id_holder['id']}}

                with tempfile.TemporaryDirectory() as recordings_dir:
                    # mastering.REFERENCES_ROOT is read once at import time — patch the attribute
                    # directly, not the env var (see prior tasks' notes on the same gotcha).
                    with patch.object(recordings, 'ROOT', Path(recordings_dir)), \
                         patch.object(mastering, 'REFERENCES_ROOT', Path(refs_dir)):
                        result = await bus_mastering.compare_bus(
                            user_id=1, reference_id=reference_id, bus='bass', scene=0,
                            query=query, send=send, capture_scene=capture_scene)

                self.assertEqual(result['status'], 'measured')
                # Kick (track 0) and Lead (track 2) should be muted; Sub Bass (track 1) left alone
                self.assertIn((0, 1), mute_calls)
                self.assertIn((2, 1), mute_calls)
                self.assertNotIn((1, 1), mute_calls)
                # and every mute should be restored to its original (False) state afterward
                self.assertIn((0, 0), mute_calls)
                self.assertIn((2, 0), mute_calls)

    async def test_restores_mutes_even_when_capture_fails(self):
        mute_calls = []

        async def send(address, args):
            if address == '/live/track/set/mute':
                mute_calls.append(tuple(args))

        async def query(address, args):
            if address == '/live/song/get/track_names':
                return ['Kick', 'Sub Bass']
            if address == '/live/track/get/mute':
                return [args[0], False]
            raise AssertionError(address)

        async def capture_scene(request):
            return {'status': 'failed', 'summary': 'silent recording'}

        with tempfile.TemporaryDirectory() as refs_dir:
            reference_id = 'e' * 32
            with patch.object(references, 'ROOT', Path(refs_dir)):
                own_reference(refs_dir, reference_id, user_id=1)
                wavfile.write(Path(refs_dir) / reference_id / 'bass.wav', 44100, tone(gain=0.4))
                with patch.object(mastering, 'REFERENCES_ROOT', Path(refs_dir)):
                    result = await bus_mastering.compare_bus(
                        user_id=1, reference_id=reference_id, bus='bass', scene=0,
                        query=query, send=send, capture_scene=capture_scene)
        self.assertEqual(result['status'], 'failed')
        self.assertIn((0, 1), mute_calls)
        self.assertIn((0, 0), mute_calls)  # restored even though capture failed

    async def test_detailed_drum_parts_are_summed_when_no_merged_drums_wav(self):
        async def send(address, args):
            pass

        async def query(address, args):
            if address == '/live/song/get/track_names':
                return ['Kick', 'Bass']
            if address == '/live/track/get/mute':
                return [args[0], False]
            raise AssertionError(address)

        async def capture_scene(request):
            recording_id = 'y' * 32
            wavfile.write(recordings.ROOT / f'{recording_id}.m4a', 44100, tone(gain=0.4))
            return {'status': 'verified', 'recording': {'id': recording_id}}

        with tempfile.TemporaryDirectory() as refs_dir:
            reference_id = 'f' * 32
            with patch.object(references, 'ROOT', Path(refs_dir)):
                own_reference(refs_dir, reference_id, user_id=1)
                for part in ('kick', 'snare', 'toms', 'cymbals'):
                    wavfile.write(Path(refs_dir) / reference_id / f'{part}.wav', 44100, tone(gain=0.1))
                with tempfile.TemporaryDirectory() as recordings_dir:
                    with patch.object(recordings, 'ROOT', Path(recordings_dir)), \
                         patch.object(mastering, 'REFERENCES_ROOT', Path(refs_dir)):
                        result = await bus_mastering.compare_bus(
                            user_id=1, reference_id=reference_id, bus='drums', scene=0,
                            query=query, send=send, capture_scene=capture_scene)
        self.assertEqual(result['status'], 'measured')

    async def test_reference_owned_by_another_user_returns_generic_not_found(self):
        # IDOR guard: a well-formed reference_id (32 hex chars) that belongs to a DIFFERENT user must
        # never have its stem audio read, and must not leak whether it exists via a different error
        # message than a genuinely missing reference — both must collapse to references.owned()'s
        # generic "Reference not found".
        async def send(address, args):
            raise AssertionError('should not reach Ableton once ownership fails')

        async def query(address, args):
            raise AssertionError('should not reach Ableton once ownership fails')

        async def capture_scene(request):
            raise AssertionError('should not capture once ownership fails')

        with tempfile.TemporaryDirectory() as refs_dir:
            reference_id = 'a' * 32
            with patch.object(references, 'ROOT', Path(refs_dir)):
                own_reference(refs_dir, reference_id, user_id=2)  # owned by a DIFFERENT user
                wavfile.write(Path(refs_dir) / reference_id / 'bass.wav', 44100, tone(gain=0.4))
                with patch.object(mastering, 'REFERENCES_ROOT', Path(refs_dir)):
                    result = await bus_mastering.compare_bus(
                        user_id=1, reference_id=reference_id, bus='bass', scene=0,
                        query=query, send=send, capture_scene=capture_scene)
        self.assertEqual(result, {'status': 'failed', 'summary': 'Reference not found', 'steps': []})

    async def test_reference_that_does_not_exist_returns_generic_not_found(self):
        # Same generic message for a reference_id that was never created at all (no directory, no
        # meta.json) — this must look identical to the "owned by someone else" case above, closing the
        # cross-tenant existence oracle (a guesser can't distinguish "not yours" from "doesn't exist").
        async def send(address, args):
            raise AssertionError('should not reach Ableton once ownership fails')

        async def query(address, args):
            raise AssertionError('should not reach Ableton once ownership fails')

        async def capture_scene(request):
            raise AssertionError('should not capture once ownership fails')

        with tempfile.TemporaryDirectory() as refs_dir:
            with patch.object(references, 'ROOT', Path(refs_dir)), \
                 patch.object(mastering, 'REFERENCES_ROOT', Path(refs_dir)):
                result = await bus_mastering.compare_bus(
                    user_id=1, reference_id='b' * 32, bus='bass', scene=0,
                    query=query, send=send, capture_scene=capture_scene)
        self.assertEqual(result, {'status': 'failed', 'summary': 'Reference not found', 'steps': []})

    async def test_no_track_classified_for_the_bus_fails(self):
        # A valid bus with nothing in the Live set classified into it — distinct from the ownership
        # and missing-stem failure paths already covered above, and previously untested: every other
        # test happens to pick a bus that some fake track name classifies into.
        async def send(address, args):
            raise AssertionError('should not mute anything when no track matches the bus')

        async def query(address, args):
            if address == '/live/song/get/track_names':
                return ['FX Riser']  # unclassifiable by bus_mastering.classify()
            raise AssertionError(address)

        async def capture_scene(request):
            raise AssertionError('should not capture when no track matches the bus')

        with tempfile.TemporaryDirectory() as refs_dir:
            reference_id = 'c' * 32
            with patch.object(references, 'ROOT', Path(refs_dir)):
                own_reference(refs_dir, reference_id, user_id=1)
                wavfile.write(Path(refs_dir) / reference_id / 'vocals.wav', 44100, tone(gain=0.4))
                with patch.object(mastering, 'REFERENCES_ROOT', Path(refs_dir)):
                    result = await bus_mastering.compare_bus(
                        user_id=1, reference_id=reference_id, bus='vocals', scene=0,
                        query=query, send=send, capture_scene=capture_scene)
        self.assertEqual(result, {'status': 'failed', 'summary': 'No track classified as vocals to compare.', 'steps': []})

    async def test_invalid_bus_name_fails_before_touching_the_filesystem(self):
        # Defense in depth: _reference_bus_samples() builds `directory / f'{bus}.wav'` from `bus`
        # unchecked. Without this guard, a bus like '../other_reference_id/mix' could walk out of this
        # reference's own directory and read a different (possibly not-owned) reference's audio. This
        # must fail closed even though nothing calls compare_bus() with an attacker-controlled bus in
        # production today (the dispatcher's JSON-schema enum is a separate, later-task guard) — this
        # module's own safety must not depend on that caller.
        async def send(address, args):
            raise AssertionError('should not reach Ableton for an invalid bus')

        async def query(address, args):
            raise AssertionError('should not reach Ableton for an invalid bus')

        async def capture_scene(request):
            raise AssertionError('should not capture for an invalid bus')

        with tempfile.TemporaryDirectory() as refs_dir:
            reference_id = 'c' * 32
            with patch.object(references, 'ROOT', Path(refs_dir)):
                own_reference(refs_dir, reference_id, user_id=1)
                with patch.object(mastering, 'REFERENCES_ROOT', Path(refs_dir)):
                    result = await bus_mastering.compare_bus(
                        user_id=1, reference_id=reference_id, bus='../etc/passwd', scene=0,
                        query=query, send=send, capture_scene=capture_scene)
        self.assertEqual(result, {'status': 'failed', 'summary': '"../etc/passwd" is not a bus.', 'steps': []})


if __name__ == '__main__':
    unittest.main()
