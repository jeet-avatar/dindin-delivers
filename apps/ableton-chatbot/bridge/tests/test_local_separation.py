import asyncio
import hashlib
import io
import json
from pathlib import Path
import sys
import tempfile
import types
import unittest
from unittest.mock import AsyncMock, patch
from urllib.error import URLError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import local_separation  # noqa: E402
import stem_import  # noqa: E402

REFERENCE_ID = 'a' * 32
REPORT = {'stems': [{'name': n} for n in ('drums', 'bass', 'vocals', 'other', 'kick', 'snare', 'toms', 'cymbals')],
          'duration_seconds': 40.0}
FAKE_WORKER = '''
import json, sys, time
from pathlib import Path
d = Path(sys.argv[1])
meta = json.loads((d / 'meta.json').read_text())
assert Path(meta['source_file']).is_file()
for stage in ('Decoding audio', 'Splitting drums into kick, snare, toms and cymbals'):
    (d / 'progress.json').write_text(json.dumps({'stage': stage})); time.sleep(2.5)
(d / 'report.json').write_text(json.dumps(%s))
''' % json.dumps(REPORT)


class ModelDownloadTests(unittest.TestCase):
    def test_download_uses_bundled_trust_and_validates_file(self):
        content = b'model fixture'
        response = io.BytesIO(content)
        response.headers = {'Content-Type': 'application/octet-stream'}
        with tempfile.TemporaryDirectory() as temp, \
                patch.object(local_separation, 'MODELS', Path(temp)), \
                patch.object(local_separation, 'DRUMSEP_SHA256', hashlib.sha256(content).hexdigest()), \
                patch.object(local_separation, 'tls_context', return_value='trusted-context'), \
                patch.object(local_separation.urllib.request, 'urlopen', return_value=response) as fetch:
            result = local_separation.download_drum_model()
            self.assertEqual(result.read_bytes(), content)
            self.assertEqual(fetch.call_args.kwargs['context'], 'trusted-context')
            self.assertEqual(local_separation.download_drum_model(), result)
            fetch.assert_called_once()

    def test_website_fallback_is_not_treated_as_a_model(self):
        response = io.BytesIO(b'<html>fallback</html>')
        response.headers = {'Content-Type': 'text/html'}
        with tempfile.TemporaryDirectory() as temp, patch.object(local_separation, 'MODELS', Path(temp)), \
                patch.object(local_separation.urllib.request, 'urlopen', return_value=response):
            with self.assertRaisesRegex(RuntimeError, 'model is unavailable'):
                local_separation.download_drum_model()
            self.assertFalse((Path(temp) / local_separation.DRUMSEP_FILE).exists())

    def test_secure_download_failure_is_actionable(self):
        with tempfile.TemporaryDirectory() as temp, patch.object(local_separation, 'MODELS', Path(temp)), \
                patch.object(local_separation.urllib.request, 'urlopen', side_effect=URLError('certificate error')):
            with self.assertRaisesRegex(RuntimeError, 'download the separation model securely'):
                local_separation.download_drum_model()


class FilePickerTests(unittest.IsolatedAsyncioTestCase):
    async def test_only_user_cancellation_is_a_cancelled_choice(self):
        for code, expected in [('-128', None), ('-1743', 'Automation'), ('-2700', 'could not open')]:
            process = types.SimpleNamespace(returncode=1, communicate=AsyncMock(return_value=(b'', f'error ({code})'.encode())))
            with patch.object(local_separation.asyncio, 'create_subprocess_exec', AsyncMock(return_value=process)):
                if expected:
                    with self.assertRaisesRegex(RuntimeError, expected):
                        await local_separation.choose_file()
                else:
                    self.assertIsNone(await local_separation.choose_file())


class LocalSeparationTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / 'My Track.mp3'
        self.source.write_bytes(b'audio')
        patches = [patch.object(local_separation, 'OUTPUT', self.root / 'BeatMind Stems'),
                   patch.object(local_separation, 'available', return_value=True),
                   patch.object(local_separation, 'download_drum_model', return_value=self.root / 'drumsep.th')]
        for item in patches:
            item.start()
            self.addCleanup(item.stop)
        self.events = []

        async def send(event):
            self.events.append(event)
        self.local = local_separation.LocalReferences(send)

    async def choose(self):
        return self.source

    async def test_file_choice_outcomes(self):
        async def cancel():
            return None
        self.assertEqual((await self.local.start('bad-id', self.choose))['status'], 'failed')
        self.assertEqual(await self.local.start(REFERENCE_ID, cancel), {'status': 'cancelled'})
        text = self.root / 'notes.txt'
        text.write_text('x')

        async def wrong():
            return text
        self.assertIn('Choose a WAV', (await self.local.start(REFERENCE_ID, wrong))['error'])
        with patch.object(local_separation, 'available', return_value=False):
            self.assertEqual((await self.local.start(REFERENCE_ID, self.choose))['status'], 'failed')

    async def test_separation_runs_on_this_computer_and_reports_without_audio(self):
        worker = self.root / 'fake_worker.py'
        worker.write_text(FAKE_WORKER)
        with patch.object(local_separation, 'worker_command', lambda d: [sys.executable, str(worker), str(d)]):
            started = await self.local.start(REFERENCE_ID, self.choose)
            self.assertEqual(started['status'], 'started')
            folder = Path(started['folder'])
            self.assertEqual(folder.name, 'My Track - aaaaaaaa')
            self.assertEqual((await self.local.start('b' * 32, self.choose))['status'], 'busy')
            await asyncio.wait_for(asyncio.gather(*self.local.jobs.values()), 30)
        stages = [e['stage'] for e in self.events if e['status'] == 'processing']
        self.assertIn('Splitting drums into kick, snare, toms and cymbals', stages)
        final = self.events[-1]
        self.assertEqual((final['type'], final['status'], final['report']), ('local_reference_event', 'ready', REPORT))
        self.assertNotIn('audio', json.dumps(final).lower().replace('audio file', ''))
        self.assertTrue((folder / 'README.txt').is_file())
        self.assertFalse((folder / 'progress.json').exists())
        self.assertEqual(local_separation.find_folder(REFERENCE_ID), folder)
        self.assertFalse(self.local.jobs)

    async def test_failed_worker_reports_failure(self):
        worker = self.root / 'broken.py'
        worker.write_text('raise SystemExit(3)')
        with patch.object(local_separation, 'worker_command', lambda d: [sys.executable, str(worker), str(d)]):
            await self.local.start(REFERENCE_ID, self.choose)
            await asyncio.wait_for(asyncio.gather(*self.local.jobs.values()), 30)
        self.assertEqual(self.events[-1]['status'], 'failed')
        self.assertIn('worker.log', self.events[-1]['error'])

    async def test_file_picker_failure_is_returned_to_browser(self):
        result = await self.local.start(REFERENCE_ID, AsyncMock(side_effect=RuntimeError('Allow Finder in Automation')))
        self.assertEqual(result, {'status': 'failed', 'error': 'Allow Finder in Automation'})
        self.assertFalse(self.local.jobs)

    async def test_results_wait_in_the_outbox_until_reconnected(self):
        delivered, online = [], False

        async def send(event):
            if not online:
                raise ConnectionError('offline')
            delivered.append(event)
        local = local_separation.LocalReferences(send)
        await local.emit({'reference_id': REFERENCE_ID, 'status': 'ready', 'report': REPORT})
        self.assertEqual((delivered, len(local.outbox)), ([], 1))
        online = True
        await local.flush()
        self.assertEqual([e['status'] for e in delivered], ['ready'])
        self.assertEqual(local.outbox, [])


class StemImportTests(unittest.IsolatedAsyncioTestCase):
    def test_parent_drums_are_not_imported_beside_their_parts(self):
        self.assertEqual(stem_import.import_names(REPORT), ['bass', 'vocals', 'other', 'kick', 'snare', 'toms', 'cymbals'])
        four = {'stems': [{'name': n} for n in ('drums', 'bass', 'vocals', 'other')]}
        self.assertEqual(stem_import.import_names(four), ['drums', 'bass', 'vocals', 'other'])

    async def run_import(self, after_names, selected=None):
        folder = Path(self.temp.name)
        (folder / 'report.json').write_text(json.dumps(REPORT))
        for name in stem_import.import_names(REPORT):
            (folder / f'{name}.wav').write_bytes(b'wav')
        sent = []

        class Bridge:
            async def _query_osc(self, request_id, address, args, timeout):
                sent.append((address, args))
                replies = {'/live/song/beatmind_stem_capabilities': ['stem_import_v1'],
                           '/live/song/beatmind_import_stems': ['imported', 2, (len(args) - 1) // 2]}
                if address == '/live/song/get/track_names':
                    names = ['Drums', 'Bass'] if len([a for a, _ in sent if a == address]) == 1 else after_names
                    return {'status': 'ok', 'args': names}
                return {'status': 'ok', 'args': replies[address]}
        with patch.object(stem_import, 'find_folder', return_value=folder):
            return await stem_import.import_stems(Bridge(), REFERENCE_ID, selected), sent

    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)

    async def test_import_is_verified_by_reading_back_track_names(self):
        expected = ['Ref ' + n for n in stem_import.import_names(REPORT)]
        result, sent = await self.run_import(['Drums', 'Bass', *expected])
        self.assertEqual(result['status'], 'verified')
        self.assertEqual(result['tracks'], expected)
        args = dict(sent)['/live/song/beatmind_import_stems']
        self.assertEqual(args[0], 'Ref')
        self.assertTrue(all(Path(p).suffix == '.wav' for p in args[1::2]))

    async def test_mismatched_tracks_are_reported_not_accepted(self):
        result, _ = await self.run_import(['Drums', 'Bass', 'Ref bass'])
        self.assertEqual(result['status'], 'failed')
        self.assertIn('do not match', result['error'])
        self.assertTrue(result['changes_started'])

    async def test_only_selected_stems_are_imported(self):
        result, sent = await self.run_import(['Drums', 'Bass', 'Ref vocals', 'Ref kick'], ['kick', 'vocals'])
        self.assertEqual(result['status'], 'verified')
        args = dict(sent)['/live/song/beatmind_import_stems']
        self.assertEqual(args[2::2], ['vocals', 'kick'])

    async def test_invalid_selection_never_writes(self):
        for selected in ([], ['vocals', 'vocals'], ['absent'], ['drums', 'kick'], [None], 'vocals'):
            result, sent = await self.run_import([], selected)
            self.assertEqual(result['status'], 'failed', selected)
            self.assertFalse(result['changes_started'])
            self.assertEqual(sent, [])


class ExtensionTests(unittest.TestCase):
    def load(self, home):
        import importlib.util
        path = Path(__file__).resolve().parents[1] / 'abletonosc/beatmind_stems.py'
        spec = importlib.util.spec_from_file_location('beatmind_stems_test', path)
        module = importlib.util.module_from_spec(spec)
        with patch.object(Path, 'home', return_value=home):
            spec.loader.exec_module(module)
            handlers = {}

            class Clip:
                warping = True

            class Track:
                def __init__(self):
                    self.name, self.arrangement_clips, self.files = '', [], []

                def create_audio_clip(self, path, time):
                    self.files.append((path, time))
                    self.arrangement_clips.append(Clip())

            class Song:
                tracks = []

                def create_audio_track(self, index):
                    self.tracks.append(Track())
            song = Song()
            handler = types.SimpleNamespace(song=song, osc_server=types.SimpleNamespace(
                add_handler=lambda address, fn: handlers.__setitem__(address, fn)))
            module.register(handler, None)
        return handlers, song

    def test_places_only_beatmind_stems_unwarped_at_the_start(self):
        with tempfile.TemporaryDirectory() as temp:
            home = Path(temp)
            stems = home / 'Music/BeatMind Stems/Track - aaaaaaaa'
            stems.mkdir(parents=True)
            kick = stems / 'kick.wav'
            kick.write_bytes(b'wav')
            outside = home / 'secret.wav'
            outside.write_bytes(b'wav')
            handlers, song = self.load(home)
            imported = handlers['/live/song/beatmind_import_stems']
            self.assertEqual(imported(('Ref', str(outside), 'x'))[0], 'error')
            self.assertEqual(imported(('Ref', str(stems / 'missing.wav'), 'x'))[0], 'error')
            self.assertEqual(imported(('Ref',))[0], 'error')
            self.assertEqual(song.tracks, [])
            self.assertEqual(imported(('Ref', str(kick), 'kick')), ('imported', 0, 1))
            track = song.tracks[0]
            self.assertEqual((track.name, track.files, track.arrangement_clips[0].warping),
                             ('Ref kick', [(str(kick.resolve()), 0.0)], False))


if __name__ == '__main__':
    unittest.main()
