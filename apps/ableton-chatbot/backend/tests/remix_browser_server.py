"""Disposable local browser fixture: real renderer, synthetic audio, no Ableton or accounts."""

import json
import os
from pathlib import Path
import socket
import sys
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import numpy as np
import soundfile as sf
import uvicorn
from fastapi import FastAPI

import billing
import references
import reference_timing
import remix_jobs


async def user():
    return {'id': 987996}


async def project(req, owner, session_id=None):
    return {'sessionId': session_id or 'remix_' + req.request_id, 'referenceId': req.reference_id,
            'project': {'title': req.title, 'starting_point': 'reference', 'mode': 'remix', 'live_set': None,
                        'remix': {'source_name': 'Synthetic.wav', 'style': req.style, 'target_bpm': req.target_bpm,
                                  'layers': req.layers, 'execution_status': 'unavailable'}}}


if __name__ == '__main__':
    os.environ.setdefault('BEATMIND_AUTOMATIC_REMIX_IMPORT_ENABLED', '1')
    with tempfile.TemporaryDirectory(prefix='beatmind-remix-browser-') as temporary:
        references.ROOT = Path(temporary)
        directory = references.ROOT / ('e' * 32)
        directory.mkdir()
        t = np.arange(44100 * 8) / 44100
        for name, hz in [('drums', 60), ('bass', 110)]:
            sound = .08 * np.sin(2 * np.pi * hz * t) * np.exp(-(t % .5) * 8)
            sf.write(directory / f'{name}.wav', np.column_stack([sound, sound]), 44100, subtype='PCM_24')
        references.write_json(directory / 'meta.json', {'id': directory.name, 'user_id': 987996,
            'name': 'Synthetic.wav', 'created_at': '2026-10-13', 'status': 'ready'})
        references.write_json(directory / 'report.json', {'duration_seconds': 8, 'tempo': {'bpm': 120},
            'stems': [{'name': 'drums'}, {'name': 'bass'}]})
        references.write_json(directory / 'timing.json', {'analysis_id': reference_timing.fingerprint(directory),
            'status': 'confirmed', 'revision': 1, 'bpm': 120,
            'sections': [{'name': 'Intro', 'start_seconds': 0, 'end_seconds': 4},
                         {'name': 'Groove', 'start_seconds': 4, 'end_seconds': 8}]})
        billing.require_reference_access = lambda *args, **kwargs: None
        app = FastAPI()
        app.include_router(remix_jobs.router_for(user, project))
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            print(json.dumps({'port': sock.getsockname()[1]}), flush=True)
            uvicorn.Server(uvicorn.Config(app, log_level='error')).run(sockets=[sock])
