import base64
import io
import json
import tempfile
import unittest
import wave
from pathlib import Path
from unittest.mock import AsyncMock, patch

import httpx
from fastapi import HTTPException
from pydantic import ValidationError

import audio_listener as audio

OBSERVATIONS = {**{key: 'This musical feature cannot be identified with certainty.'
                   for key in ('rhythm', 'bass', 'texture', 'changes', 'uncertainty')}, 'energy_trend': 'steady'}


class ListeningTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / 'mix.wav'
        with wave.open(str(self.path), 'wb') as out:
            out.setparams((1, 2, 8000, 0, 'NONE', 'not compressed'))
            out.writeframes(b'\x00\x00' * 80000)

    def test_excerpt_contains_real_wav_and_clips_to_end(self):
        data, seconds = audio.excerpt(self.path, audio.ListeningRequest(intent='groove', start_seconds=2))
        self.assertEqual(seconds, 8)
        with wave.open(io.BytesIO(base64.b64decode(data))) as source:
            self.assertEqual(source.getnframes(), 64000)

    def test_invalid_ranges(self):
        with self.assertRaises(ValidationError):
            audio.ListeningRequest(intent='groove', start_seconds=float('nan'))
        with self.assertRaises(HTTPException):
            audio.excerpt(self.path, audio.ListeningRequest(intent='groove', start_seconds=9))

    async def test_provider_receives_audio_not_just_measurements(self):
        response = httpx.Response(200, request=httpx.Request('POST', 'https://api.openai.com'),
            json={'choices': [{'finish_reason': 'stop', 'message': {'content': json.dumps(OBSERVATIONS)}}]})
        with patch.object(httpx.AsyncClient, 'post', AsyncMock(return_value=response)) as post:
            result = await audio.listen(self.path, audio.ListeningRequest(intent='minimal groove'))
        body = post.call_args.kwargs['json']
        self.assertFalse(body['store'])
        self.assertEqual(body['messages'][1]['content'][1]['type'], 'input_audio')
        self.assertEqual(result['end_seconds'], 10)
        self.assertEqual(result['validation'], 'checks_passed')
        self.assertNotIn('{', result['notes'])

    def test_timestamp_only_response_is_rejected(self):
        with self.assertRaises(HTTPException):
            audio.parse_observations('{"analysis start":"25.72","analysis end":"51.44"}',
                                     {'large_fall': False, 'large_rise': False})

    def test_measured_fade_cannot_be_called_steady(self):
        with self.assertRaises(HTTPException):
            audio.parse_observations(json.dumps(OBSERVATIONS), {'large_fall': True, 'large_rise': False})
        result = audio.parse_observations(json.dumps({**OBSERVATIONS, 'energy_trend': 'falling'}),
                                          {'large_fall': True, 'large_rise': False})
        self.assertEqual(result['energy_trend'], 'falling')

    async def test_incomplete_result_is_not_success(self):
        response = httpx.Response(200, request=httpx.Request('POST', 'https://api.openai.com'),
            json={'choices': [{'finish_reason': 'length', 'message': {'content': 'Partial'}}]})
        with patch.object(httpx.AsyncClient, 'post', AsyncMock(return_value=response)):
            with self.assertRaises(HTTPException):
                await audio.listen(self.path, audio.ListeningRequest(intent='groove'))

    def test_missing_key_disables_listening(self):
        with patch.dict('os.environ', {'BEATMIND_AUDIO_LISTENING_ENABLED': '1'}, clear=True):
            self.assertFalse(audio.capability()['available'])

    def test_production_requires_rotation_and_explicit_enablement(self):
        for rotated, enabled, expected in [('0', '1', False), ('1', '0', False), ('1', '1', True)]:
            with self.subTest(rotated=rotated, enabled=enabled), patch.dict('os.environ', {
                'ENV': 'production', 'BEATMIND_AUDIO_API_KEY': 'fixture-not-a-key',
                'BEATMIND_AUDIO_KEY_ROTATION_CONFIRMED': rotated,
                'BEATMIND_AUDIO_LISTENING_ENABLED': enabled,
            }, clear=True):
                self.assertEqual(audio.capability()['available'], expected)

    async def test_disabled_production_never_contacts_provider(self):
        with patch.dict('os.environ', {'ENV': 'production'}, clear=True), \
                patch.object(httpx.AsyncClient, 'post', AsyncMock()) as post:
            with self.assertRaises(HTTPException) as caught:
                await audio.listen(self.path, audio.ListeningRequest(intent='groove'))
            self.assertEqual(caught.exception.status_code, 503)
            post.assert_not_awaited()

    async def test_provider_rejection_has_actionable_redacted_error(self):
        for status, phrase in [(401, 'credentials'), (403, 'permissions'), (429, 'quota')]:
            response = httpx.Response(status, request=httpx.Request('POST', 'https://api.openai.com'),
                                      json={'error': {'message': 'fixture-private-value'}})
            with self.subTest(status=status), patch.object(httpx.AsyncClient, 'post', AsyncMock(return_value=response)):
                with self.assertRaises(HTTPException) as caught:
                    await audio.listen(self.path, audio.ListeningRequest(intent='groove'))
                self.assertEqual(caught.exception.status_code, 503)
                self.assertIn(phrase, caught.exception.detail)
                self.assertNotIn('fixture-private-value', caught.exception.detail)


class TwentyFourBitExcerptTests(unittest.TestCase):
    def test_24_bit_mix_yields_a_16_bit_excerpt_the_listener_accepts(self):
        import tempfile, numpy as np, soundfile as sf
        from pathlib import Path
        import audio_listener
        with tempfile.TemporaryDirectory() as folder:
            mix = Path(folder) / 'mix.wav'
            t = np.arange(44100 * 12) / 44100
            sf.write(mix, np.stack([0.5 * np.sin(2 * np.pi * 110 * t)] * 2, axis=1), 44100, subtype='PCM_24')
            request = audio_listener.ListeningRequest(consent=True, intent='Check the groove', start_seconds=2, duration_seconds=6)
            encoded, seconds = audio_listener.excerpt(mix, request)
            self.assertAlmostEqual(seconds, 6, places=3)
            evidence = audio_listener.energy_evidence(encoded)
            self.assertAlmostEqual(evidence['start_rms_dbfs'], -9.03, delta=0.1)
