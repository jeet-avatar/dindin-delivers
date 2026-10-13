"""Download hash-bound approved audio before an identity-checked native import."""

import asyncio
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from bridge_network import tls_context
from cloud_stem_import import STEM_ROOT


def download(base_url, name, token, expected, directory):
    path = directory / (name + '.wav')
    temporary = directory / (name + '.part')
    try:
        digest, size = hashlib.sha256(), 0
        with urlopen(Request(f'{base_url}/{name}?token={token}', headers={'User-Agent': 'BeatMind-Bridge'}),
                     timeout=120, context=tls_context()) as response, temporary.open('wb') as output:
            while block := response.read(1024 * 1024):
                size += len(block)
                if size > expected['bytes']:
                    raise ValueError('Downloaded audio exceeds the approved size.')
                digest.update(block)
                output.write(block)
        if size != expected['bytes'] or digest.hexdigest() != expected['sha256']:
            raise ValueError('Downloaded audio does not match the approved preview. Nothing was imported.')
        temporary.replace(path)
        return path
    finally:
        temporary.unlink(missing_ok=True)


async def import_preview(bridge, data):
    changes_started = False
    try:
        job_id = data['job_id']
        if not re.fullmatch(r'[a-f0-9]{32}', job_id) or not re.fullmatch(r'[a-f0-9]{32}', data['set_id']):
            raise ValueError('Invalid remix or destination identifier.')
        server, base = urlparse(bridge.server_url), urlparse(data['base_url'])
        if base.scheme != 'https' or base.netloc != server.netloc or base.username or base.password:
            raise ValueError('Remix files must come from the connected BeatMind server.')
        manifests = data['files']
        if not isinstance(manifests, dict) or not 1 <= len(manifests) <= 8:
            raise ValueError('Invalid remix file manifest.')
        for name, info in manifests.items():
            if (name not in {'drums', 'bass', 'vocals', 'other', 'kick', 'snare', 'toms', 'cymbals'}
                    or type(info['bytes']) is not int or not 44 < info['bytes'] <= 200 * 1024 ** 2
                    or not re.fullmatch(r'[a-f0-9]{64}', info['sha256'])):
                raise ValueError('Invalid remix file identity.')
        async def native(payload):
            response = await bridge._query_osc('approved-remix', '/live/beatmind/arrangement', [json.dumps(payload)], timeout=60)
            if response.get('status') != 'ok' or not response.get('args'):
                raise ValueError('Ableton did not confirm the remix operation. Inspect before retrying.')
            return json.loads(response['args'][0])
        state = await native({'action': 'remix_target'})
        if not state.get('ready') or state.get('set_id') != data['set_id']:
            raise ValueError(state.get('reason') or 'The destination changed or needs an updated Ableton integration.')
        directory = STEM_ROOT / job_id
        directory.mkdir(parents=True, exist_ok=True)
        files = []
        for name, expected in manifests.items():
            path = await asyncio.to_thread(download, data['base_url'], name, data['token'], expected, directory)
            files.append({'name': name, 'path': str(path.resolve())})
        changes_started = True
        result = await native({'action': 'remix_import', 'job_id': job_id, 'set_id': data['set_id'],
                               'bpm': data['bpm'], 'numerator': data['numerator'], 'denominator': data['denominator'],
                               'frames': data['frames'], 'sample_rate': data['sample_rate'], 'files': files})
        return {**result, 'changes_started': True}
    except Exception as error:
        return {'status': 'failed', 'changes_started': changes_started, 'summary': str(error), 'error': str(error)}
