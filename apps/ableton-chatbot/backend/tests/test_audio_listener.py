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
