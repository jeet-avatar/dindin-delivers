"""Owner-scoped, immutable audio samples. Never accepts paths, URLs or plugin code."""

import asyncio
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
from urllib.parse import unquote
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse

import billing
from file_lock import Busy
import reference_imports
import references

MAX_BYTES = 12 * 1024 * 1024
MAX_SAMPLES = 16


def sha256(path):
    with path.open('rb') as handle:
        return hashlib.file_digest(handle, 'sha256').hexdigest()


def asset(directory, sample_id, expected=None):
    if not re.fullmatch(r'[a-f0-9]{32}', sample_id):
        raise ValueError('Invalid sample identifier.')
    target = directory / 'remix-samples' / sample_id
    try:
        meta = json.loads((target / 'sample.json').read_text())
        path = target / 'audio.wav'
        if meta['id'] != sample_id or sha256(path) != (expected or meta['sha256']):
            raise ValueError('The sample has changed. Upload it again and review the new sound.')
        return path, meta
    except (OSError, KeyError, json.JSONDecodeError):
        raise ValueError('A selected sample is unavailable. Upload it again before rendering.')


def catalog(directory):
    return {path.parent.name: json.loads(path.read_text())
            for path in sorted((directory / 'remix-samples').glob('*/sample.json'))}


def decode(target, suffix):
    import numpy as np
    import soundfile as sf
    source = target / 'upload'
    formats = {'.wav': 'wav', '.aif': 'aiff', '.aiff': 'aiff', '.mp3': 'mp3', '.flac': 'flac', '.ogg': 'ogg', '.m4a': 'mov'}
    try:
        result = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-threads', '1',
            '-protocol_whitelist', 'file,pipe', '-f', formats[suffix], '-i', str(source), '-map', '0:a:0', '-vn',
            '-t', '10.1', '-ar', '44100', '-ac', '2', '-c:a', 'pcm_f32le', str(target / 'audio.wav')],
            capture_output=True, timeout=30)
        if result.returncode:
            raise ValueError('This sample could not be decoded. Choose a valid audio file.')
        audio, rate = sf.read(target / 'audio.wav', always_2d=True)
        if not .02 <= len(audio) / rate <= 10:
            raise ValueError('Choose a one-shot or instrument sample between 0.02 and 10 seconds.')
        if not np.isfinite(audio).all() or np.max(np.abs(audio)) > 1:
            raise ValueError('The sample contains invalid or out-of-range audio.')
        peak = float(np.max(np.abs(audio)))
        if peak < .0001:
            raise ValueError('The sample is silent or too quiet to use reliably.')
        return {'duration_seconds': len(audio) / rate, 'sample_rate': rate,
                'peak_dbfs': round(20 * float(np.log10(peak)), 2), 'sha256': sha256(target / 'audio.wav')}
    except subprocess.TimeoutExpired:
        raise ValueError('Sample decoding timed out. Try a smaller audio file.')
    finally:
        source.unlink(missing_ok=True)


def router_for(get_user):
    router = APIRouter(prefix='/api/references/{reference_id}/remix-samples')

    @router.get('')
    async def listing(reference_id: str, user=Depends(get_user)):
        directory, _ = references.owned(reference_id, user['id'])
        return {'samples': list(catalog(directory).values()), 'max_samples': MAX_SAMPLES,
                'max_bytes': MAX_BYTES, 'max_seconds': 10}

    @router.post('', status_code=201)
    async def upload(reference_id: str, request: Request, user=Depends(get_user)):
        from security import rate_limit
        billing.require_reference_access(user)
        directory, _ = references.owned(reference_id, user['id'])
        rate_limit(f"remix-sample:{user['id']}", max_requests=20, window_seconds=3600)
        if request.headers.get('X-Rights-Confirmed') != 'true':
            raise HTTPException(400, 'Confirm permission to upload and reuse this sample.')
        name = Path(unquote(request.headers.get('X-Sample-Name', ''))).name
        if not name or len(name) > 150 or Path(name).suffix.lower() not in {'.wav', '.aif', '.aiff', '.mp3', '.flac', '.ogg', '.m4a'}:
            raise HTTPException(400, 'Choose a WAV, AIFF, MP3, FLAC, OGG or M4A sample.')
        target = directory / 'remix-samples' / uuid.uuid4().hex
        complete = False
        try:
            with references.operation_lease(), reference_imports.lease(directory):
                if len(catalog(directory)) >= MAX_SAMPLES:
                    raise HTTPException(409, 'This reference already has 16 uploaded samples.')
                target.mkdir(parents=True, mode=0o700)
                size = 0
                async with asyncio.timeout(60):
                    with (target / 'upload').open('xb') as handle:
                        async for chunk in request.stream():
                            size += len(chunk)
                            if size > MAX_BYTES:
                                raise HTTPException(413, 'Samples must be no larger than 12 MB.')
                            handle.write(chunk)
                info = await asyncio.to_thread(decode, target, Path(name).suffix.lower())
                meta = {**info, 'id': target.name, 'name': name, 'rights_confirmed': True,
                        'uploaded_by': user['id'], 'created_at': datetime.now(timezone.utc).isoformat()}
                references.write_json(target / 'sample.json', meta)
                complete = True
                return meta
        except Busy:
            raise HTTPException(409, 'A reference operation is running. The sample was not uploaded; retry when it finishes.')
        except TimeoutError:
            raise HTTPException(408, 'Sample upload timed out.')
        except ValueError as error:
            raise HTTPException(422, str(error))
        finally:
            if not complete:
                shutil.rmtree(target, ignore_errors=True)

    @router.get('/{sample_id}/audio')
    async def audio(reference_id: str, sample_id: str, user=Depends(get_user)):
        directory, _ = references.owned(reference_id, user['id'])
        try:
            path, _ = asset(directory, sample_id)
        except ValueError as error:
            raise HTTPException(404, str(error))
        return FileResponse(path, media_type='audio/wav', headers={'Cache-Control': 'private, no-store'})

    return router
