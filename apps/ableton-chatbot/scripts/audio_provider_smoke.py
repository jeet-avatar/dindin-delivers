"""Explicit paid provider test using generated audio, never a user's recording."""

import argparse
import asyncio
import json
import os
import re
from pathlib import Path
import sys
import tempfile
import wave
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
import audio_listener
import httpx


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run', action='store_true', help='Make one billed OpenAI audio request.')
    args = parser.parse_args()
    if not args.run:
        parser.error('--run is required; this test makes one billed provider request')
    import boto3
    import numpy as np
    account = boto3.client('sts', region_name='us-east-1').get_caller_identity()['Account']
    if account != '134607809447':
        raise RuntimeError('Unexpected AWS account')
    secret = boto3.client('secretsmanager', region_name='us-east-1').get_secret_value(
        SecretId='beatmind/production/audio-provider')
    key = json.loads(secret['SecretString'])['BEATMIND_AUDIO_API_KEY']
    original_post = httpx.AsyncClient.post

    async def inspected_post(client, *args, **kwargs):
        response = await original_post(client, *args, **kwargs)
        try:
            body = response.json()
        except ValueError:
            body = {}
        def label(value):
            return value if isinstance(value, str) and re.fullmatch(r'[A-Za-z0-9_]{1,80}', value) else None
        error = body.get('error') or {}
        choices = body.get('choices') or [{}]
        print(json.dumps({'http_status': response.status_code,
                          'error_type': label(error.get('type')),
                          'error_code': label(error.get('code')),
                          'finish_reason': label(choices[0].get('finish_reason'))}), flush=True)
        return response
    with tempfile.TemporaryDirectory(prefix='beatmind-provider-smoke-') as directory:
        path = Path(directory) / 'synthetic.wav'
        rate = 24000
        t = np.arange(rate * 6) / rate
        beat = t % 0.5
        samples = 0.2 * np.sin(2 * np.pi * 60 * t) * np.exp(-beat * 24) + 0.08 * np.sin(2 * np.pi * 110 * t)
        with wave.open(str(path), 'wb') as source:
            source.setparams((1, 2, rate, 0, 'NONE', 'not compressed'))
            source.writeframes((samples * 32767).round().astype('<i2').tobytes())
        with patch.dict(os.environ, {'ENV': 'production', 'BEATMIND_AUDIO_API_KEY': key,
                                    'BEATMIND_AUDIO_LISTENING_ENABLED': '1',
                                    'BEATMIND_AUDIO_KEY_ROTATION_CONFIRMED': '1'}), \
                patch.object(httpx.AsyncClient, 'post', inspected_post):
            result = await audio_listener.listen(path, audio_listener.ListeningRequest(
                consent=True, intent='Describe this short synthetic sound as heard; do not infer a song or genre.',
                duration_seconds=6))
        print(json.dumps({'provider_test': 'passed', 'model': result['model'],
                          'seconds': result['end_seconds'], 'validation': result['validation'],
                          'observations': result['observations'], 'production_changed': False}))


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except Exception as error:
        # Do not print HTTP requests, credentials, or AWS secret response bodies.
        print(json.dumps({'provider_test': 'failed', 'error_type': type(error).__name__,
                          'status': getattr(error, 'status_code', None)}))
        sys.exit(1)
