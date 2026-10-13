import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import cloud_stem_import


class CloudStemImportTests(unittest.IsolatedAsyncioTestCase):
    async def run_import(self, after=None, receipt=None, download_error=None, stems=None):
        sent = []

        class Bridge:
            async def _query_osc(self, request_id, address, args, timeout):
                sent.append((address, args))
                if address.endswith('beatmind_stem_capabilities'):
                    result = ['stem_import_v1']
                elif address.endswith('beatmind_import_stems'):
                    result = receipt or ['imported', 1, 2]
                else:
                    result = ['Existing'] if sum(a == address for a, _ in sent) == 1 else after
                return {'status': 'ok', 'args': result}

        def download(base, name, token, destination):
            if download_error:
                raise OSError(download_error)
            destination.write_bytes(b'fixture')

        with tempfile.TemporaryDirectory() as temp, \
                patch.object(cloud_stem_import, 'STEM_ROOT', Path(temp)), \
                patch.object(cloud_stem_import, '_download_stem', download):
            result = await cloud_stem_import.import_cloud_stems(Bridge(), 'a' * 32,
                ['vocals', 'bass'] if stems is None else stems, 'https://example.invalid/stems', 'fixture-token')
        return result, sent

    async def test_selected_tracks_and_count_must_match(self):
        result, sent = await self.run_import(after=['Existing', 'Ref vocals', 'Ref bass'])
        self.assertEqual(result['status'], 'verified')
        self.assertEqual(result['tracks'], ['Ref vocals', 'Ref bass'])
        args = dict(sent)['/live/song/beatmind_import_stems']
        self.assertEqual(args[2::2], ['vocals', 'bass'])

    async def test_wrong_tracks_are_not_verified(self):
        result, _ = await self.run_import(after=['Existing', 'Ref vocals'])
        self.assertEqual(result['status'], 'failed')
        self.assertTrue(result['changes_started'])

    async def test_wrong_count_is_not_verified(self):
        result, _ = await self.run_import(receipt=['imported', 1, 1])
        self.assertEqual(result['status'], 'failed')
        self.assertTrue(result['changes_started'])

    async def test_download_failure_is_known_to_precede_music_writes(self):
        result, sent = await self.run_import(download_error='Download interrupted')
        self.assertFalse(result['changes_started'])
        self.assertEqual(sent, [])

    async def test_empty_selection_never_writes(self):
        result, sent = await self.run_import(stems=[])
        self.assertFalse(result['changes_started'])
        self.assertEqual(sent, [])
