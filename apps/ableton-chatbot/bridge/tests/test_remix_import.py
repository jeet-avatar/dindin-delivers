import hashlib
import io
import json
import os
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch
import wave

from abletonosc import beatmind_remix, beatmind_automation
import remix_import


class NativeRemixTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        patcher = patch.dict(os.environ, {'BEATMIND_STEMS_DIR': str(self.root)})
        patcher.start()
        self.addCleanup(patcher.stop)
        self.job = 'a' * 32
        self.set_id = 'b' * 32
        directory = self.root / self.job
        directory.mkdir()
        for name in ('drums', 'bass'):
            with wave.open(str(directory / f'{name}.wav'), 'wb') as audio:
                audio.setnchannels(2); audio.setsampwidth(3); audio.setframerate(44100)
                audio.writeframes(bytes(44100 * 5 * 6))
        self.song = SimpleNamespace(tracks=[], is_playing=False, record_mode=False, session_record=False,
            master_track=SimpleNamespace(devices=[]), tempo=120, signature_numerator=4, signature_denominator=4)
        def create_track(index):
            track = SimpleNamespace(name='', arrangement_clips=[], clip_slots=[], solo=False)
            def create_clip(path, start):
                track.arrangement_clips.append(SimpleNamespace(file_path=path, start_time=start,
                    end_time=5 * self.song.tempo / 60, warping=True, pitch_coarse=0, pitch_fine=0, muted=False))
            track.create_audio_clip = create_clip
            self.song.tracks.append(track)
        self.song.create_audio_track = create_track
        self.data = {'action': 'remix_import', 'job_id': self.job, 'set_id': self.set_id,
            'bpm': 125, 'numerator': 4, 'denominator': 4, 'sample_rate': 44100, 'frames': 44100 * 5,
            'files': [{'name': name, 'path': str(directory / f'{name}.wav')} for name in ('drums', 'bass')]}
        self.receipts = {}

    def test_verified_files_and_timing_with_once_only_placement(self):
        result = beatmind_remix.execute(self.song, self.data, self.set_id, self.receipts)
        self.assertEqual(result['status'], 'verified', result)
        self.assertEqual(len(self.song.tracks), 2)
        self.assertEqual(self.song.tempo, 125)
        self.assertEqual(beatmind_remix.execute(self.song, self.data, self.set_id, self.receipts), result)
        self.assertEqual(len(self.song.tracks), 2)

    def test_registered_route_binds_destination_to_set_and_track_identity(self):
        callbacks = {}
        handler = SimpleNamespace(song=self.song, osc_server=SimpleNamespace(
            add_handler=lambda name, callback: callbacks.update({name: callback})))
        beatmind_automation.register(handler, SimpleNamespace())
        def call(data):
            return json.loads(callbacks['/live/beatmind/arrangement']([json.dumps(data)])[0])
        first = call({'action': 'remix_target'})
        self.assertTrue(first['ready'], first)
        self.assertEqual(call({'action': 'remix_target'})['set_id'], first['set_id'])
        self.song.create_audio_track(-1)
        changed = call({'action': 'remix_target'})
        self.assertNotEqual(first['set_id'], changed['set_id'])
        rejected = call({**self.data, 'set_id': first['set_id']})
        self.assertEqual(rejected['status'], 'failed')
        self.assertEqual(len(self.song.tracks), 1)
        result = call({**self.data, 'set_id': changed['set_id']})
        self.assertEqual(result['status'], 'verified', result)
        self.assertEqual(len(self.song.tracks), 3)

    def test_changed_set_occupied_set_and_master_effects_reject_without_writes(self):
        with self.assertRaisesRegex(ValueError, 'changed'):
            beatmind_remix.execute(self.song, self.data, 'c' * 32, self.receipts)
        self.song.master_track.devices = [SimpleNamespace(name='Limiter')]
        with self.assertRaisesRegex(ValueError, 'master'):
            beatmind_remix.execute(self.song, self.data, self.set_id, self.receipts)
        self.song.master_track.devices = []
        self.song.tracks = [SimpleNamespace(arrangement_clips=[object()], clip_slots=[])]
        with self.assertRaisesRegex(ValueError, 'empty'):
            beatmind_remix.execute(self.song, self.data, self.set_id, self.receipts)
        self.assertEqual(self.song.tempo, 120)
        self.assertEqual(self.receipts, {})

    def test_metadata_failure_precedes_tempo_change_and_partial_import_never_repeats(self):
        bad = {**self.data, 'frames': 44100 * 6}
        with self.assertRaisesRegex(ValueError, 'metadata'):
            beatmind_remix.execute(self.song, bad, self.set_id, self.receipts)
        self.assertEqual(self.song.tempo, 120)
        create = self.song.create_audio_track
        def failing(index):
            create(index)
            raise RuntimeError('Disconnected during creation')
        self.song.create_audio_track = failing
        result = beatmind_remix.execute(self.song, self.data, self.set_id, self.receipts)
        self.assertEqual(result['status'], 'needs_inspection')
        self.assertEqual(beatmind_remix.execute(self.song, self.data, self.set_id, self.receipts), result)
        self.assertEqual(len(self.song.tracks), 1)


class BridgeRemixTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        patcher = patch.object(remix_import, 'STEM_ROOT', Path(self.temp.name))
        patcher.start()
        self.addCleanup(patcher.stop)
        self.audio = b'RIFF' + bytes(128)
        self.set_id = 'a' * 32
        self.bridge = SimpleNamespace(server_url='wss://api.beatmind.io/ws/bridge', _query_osc=AsyncMock(side_effect=[
            {'status': 'ok', 'args': [json.dumps({'status': 'observed', 'ready': True, 'set_id': self.set_id})]},
            {'status': 'ok', 'args': [json.dumps({'status': 'verified', 'set_id': self.set_id})]},
        ]))
        self.data = {'job_id': 'b' * 32, 'set_id': self.set_id, 'bpm': 125, 'numerator': 4, 'denominator': 4,
            'frames': 44100 * 5, 'sample_rate': 44100, 'base_url': 'https://api.beatmind.io/stems', 'token': 'fixture',
            'files': {'drums': {'bytes': len(self.audio), 'sha256': hashlib.sha256(self.audio).hexdigest()}}}

    async def test_hash_verified_before_native_write(self):
        with patch.object(remix_import, 'urlopen', return_value=io.BytesIO(self.audio)):
            result = await remix_import.import_preview(self.bridge, self.data)
        self.assertEqual(result['status'], 'verified')
        payload = json.loads(self.bridge._query_osc.call_args.args[2][0])
        self.assertEqual(payload['action'], 'remix_import')
        self.assertEqual(Path(payload['files'][0]['path']).read_bytes(), self.audio)

    async def test_corrupt_download_and_foreign_server_never_send_music_write(self):
        with patch.object(remix_import, 'urlopen', return_value=io.BytesIO(b'wrong')):
            result = await remix_import.import_preview(self.bridge, self.data)
        self.assertFalse(result['changes_started'])
        self.assertEqual(self.bridge._query_osc.await_count, 1)
        self.assertFalse(list(Path(self.temp.name).rglob('*.wav')))
        self.bridge._query_osc.reset_mock()
        result = await remix_import.import_preview(self.bridge, {**self.data, 'base_url': 'https://other.example/stems'})
        self.assertFalse(result['changes_started'])
        self.bridge._query_osc.assert_not_awaited()
