"""Separate a reference on this computer.

The audio file and its stems never leave the machine. Only the analysis report
(tempo, key, energy and stem measurements, no audio) is sent to BeatMind.
"""

import asyncio
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import sys
import urllib.request

SUPPORT = Path.home() / 'Library/Application Support/BeatMind'
MODELS = Path(os.getenv('BEATMIND_MODELS_DIR', str(SUPPORT / 'models')))
OUTPUT = Path(os.getenv('BEATMIND_STEMS_DIR', str(Path.home() / 'Music/BeatMind Stems')))
DRUMSEP_FILE = 'drumsep-49469ca8.th'
DRUMSEP_URL = os.getenv('BEATMIND_DRUMSEP_URL', 'https://www.beatmind.io/models/drumsep-49469ca8.th')
DRUMSEP_SHA256 = 'aefaa8543c9b9c75e22f5f32b53ab86dfe416457849af1383ff1aef83401423f'
EXTENSIONS = {'.wav', '.aif', '.aiff', '.mp3', '.m4a', '.flac', '.ogg'}
MAX_SOURCE_BYTES = 2 * 1024 ** 3
MAX_REPORT_BYTES = 4 * 1024 ** 2
# Highest quality: fine-tuned Demucs with shifts, then the reviewed drum split.
QUALITY_ENV = {'DEMUCS_MODEL': 'htdemucs_ft', 'DEMUCS_DEVICE': 'auto', 'DEMUCS_SHIFTS': '2',
               'DEMUCS_OVERLAP': '0.5', 'DEMUCS_SEGMENT': '7', 'BEATMIND_DECODER': 'afconvert'}
REFERENCE_ID = re.compile(r'[a-f0-9]{32}')


def available():
    if sys.platform != 'darwin':
        return False
    if getattr(sys, 'frozen', False):
        return True
    return all(importlib.util.find_spec(name) for name in ('torch', 'demucs', 'librosa', 'soundfile'))


def sha256(path):
    with Path(path).open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def folder_for(name, reference_id):
    safe = re.sub(r'[^\w\-. ]+', ' ', Path(name).stem).strip()[:80] or 'Reference'
    return OUTPUT / f'{safe} - {reference_id[:8]}'


def find_folder(reference_id):
    for meta in OUTPUT.glob(f'* - {reference_id[:8]}/meta.json'):
        try:
            if json.loads(meta.read_text()).get('id') == reference_id:
                return meta.parent
        except (OSError, ValueError):
            continue
    return None


def worker_command(directory):
    if getattr(sys, 'frozen', False):
        return [sys.executable, '--separate', str(directory)]
    backend = Path(__file__).resolve().parents[1] / 'backend'
    return [sys.executable, str(backend / 'reference_worker.py'), str(directory)]


def download_drum_model():
    target = MODELS / DRUMSEP_FILE
    if target.is_file() and sha256(target) == DRUMSEP_SHA256:
        return target
    MODELS.mkdir(parents=True, exist_ok=True)
    partial = target.with_suffix('.part')
    with urllib.request.urlopen(DRUMSEP_URL, timeout=60) as response, partial.open('wb') as out:
        shutil.copyfileobj(response, out, 1024 * 1024)
    if sha256(partial) != DRUMSEP_SHA256:
        partial.unlink(missing_ok=True)
        raise RuntimeError('The downloaded drum model failed its integrity check. Nothing was separated.')
    partial.replace(target)
    return target


async def choose_file():
    # Finder hosts the dialog: macOS lets it come to the front even while the browser has focus,
    # whereas a dialog owned by a background process can open hidden behind the browser.
    lines = ['tell application "Finder"', 'activate',
             'set chosen to POSIX path of (choose file with prompt "Choose a reference track for BeatMind. '
             'It stays on this computer." of type {"public.audio"})', 'end tell', 'return chosen']
    process = await asyncio.create_subprocess_exec(
        '/usr/bin/osascript', *[arg for line in lines for arg in ('-e', line)],
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    out, _ = await process.communicate()
    # A cancelled dialog exits non-zero; that is a normal choice, not an error.
    return Path(out.decode().strip()) if process.returncode == 0 and out.strip() else None


class LocalReferences:
    """One on-device separation at a time. Results are queued until the backend receives them."""

    def __init__(self, send):
        self.send = send
        self.jobs = {}
        self.outbox = []

    async def emit(self, event):
        self.outbox.append({'type': 'local_reference_event', **event})
        await self.flush()

    async def flush(self):
        while self.outbox:
            try:
                await self.send(self.outbox[0])
            except Exception:
                return  # Retried after the bridge reconnects.
            self.outbox.pop(0)

    async def start(self, reference_id, choose=choose_file):
        if not REFERENCE_ID.fullmatch(str(reference_id)):
            return {'status': 'failed', 'error': 'Invalid reference.'}
        if not available():
            return {'status': 'failed', 'error': 'Local separation is not available in this Bridge version.'}
        if self.jobs:
            return {'status': 'busy', 'error': 'Another track is separating on this computer. Wait for it to finish.'}
        path = await choose()
        if path is None:
            return {'status': 'cancelled'}
        if path.suffix.lower() not in EXTENSIONS or not path.is_file():
            return {'status': 'failed', 'error': 'Choose a WAV, AIFF, MP3, M4A, FLAC or OGG file.'}
        size = path.stat().st_size
        if not size or size > MAX_SOURCE_BYTES:
            return {'status': 'failed', 'error': 'Choose an audio file between 1 byte and 2 GB.'}
        directory = folder_for(path.name, reference_id)
        directory.mkdir(parents=True, exist_ok=False)
        meta = {'id': reference_id, 'name': path.name, 'source_file': str(path.resolve()), 'bytes': size,
                'status': 'processing', 'created_at': datetime.now(timezone.utc).isoformat()}
        (directory / 'meta.json').write_text(json.dumps(meta))
        self.jobs[reference_id] = asyncio.create_task(self._run(reference_id, directory))
        return {'status': 'started', 'name': path.name, 'bytes': size, 'folder': str(directory)}

    async def _run(self, reference_id, directory):
        process = None
        try:
            await self.emit({'reference_id': reference_id, 'status': 'processing', 'stage': 'Preparing separation models'})
            checkpoint = await asyncio.to_thread(download_drum_model)
            # Demucs 4.1 fetches its weights from its author's Hugging Face repository; keep them with BeatMind's models.
            env = {**os.environ, **QUALITY_ENV, 'TORCH_HOME': str(MODELS), 'HF_HOME': str(MODELS / 'huggingface'),
                   'BEATMIND_DRUMSEP_CHECKPOINT': str(checkpoint),
                   'BEATMIND_TORCH_THREADS': str(os.cpu_count() or 4)}
            with (directory / 'worker.log').open('wb') as log:
                process = await asyncio.create_subprocess_exec(*worker_command(directory), stdout=log, stderr=log, env=env)
                stage = None
                while process.returncode is None:
                    try:
                        await asyncio.wait_for(process.wait(), timeout=2)
                    except asyncio.TimeoutError:
                        pass
                    try:
                        current = json.loads((directory / 'progress.json').read_text())['stage']
                    except (OSError, ValueError, KeyError):
                        current = None
                    if current and current != stage:
                        stage = current
                        await self.emit({'reference_id': reference_id, 'status': 'processing', 'stage': stage})
            report_path = directory / 'report.json'
            if process.returncode or not report_path.is_file():
                raise RuntimeError('Separation failed on this computer. See worker.log in the stems folder.')
            if report_path.stat().st_size > MAX_REPORT_BYTES:
                raise RuntimeError('The analysis report is unexpectedly large.')
            report = json.loads(report_path.read_text())
            for name in ('progress.json', 'worker.log'):
                (directory / name).unlink(missing_ok=True)
            (directory / 'README.txt').write_text(
                'BeatMind stems, separated on this computer. Nothing here was uploaded.\n\n'
                'Stems are estimates, not original multitracks; bleed and artifacts are possible.\n'
                'Kick, snare, toms and cymbals are split from the drums stem. Hi-hat stays with cymbals.\n'
                'mix.wav is the decoded original. report.json holds the measurements shared with BeatMind.\n')
            await self.emit({'reference_id': reference_id, 'status': 'ready', 'report': report, 'folder': str(directory)})
        except asyncio.CancelledError:
            await self.emit({'reference_id': reference_id, 'status': 'failed', 'error': 'Separation was cancelled.'})
            raise
        except Exception as error:
            message = str(error) if isinstance(error, RuntimeError) else 'Separation failed on this computer.'
            await self.emit({'reference_id': reference_id, 'status': 'failed', 'error': message})
        finally:
            if process and process.returncode is None:
                process.kill()
                await process.wait()
            self.jobs.pop(reference_id, None)

    async def cancel(self, reference_id):
        task = self.jobs.get(reference_id)
        if not task:
            return {'status': 'not_running'}
        task.cancel()
        await asyncio.gather(task, return_exceptions=True)
        return {'status': 'cancelled'}

    async def reveal(self, reference_id):
        directory = find_folder(reference_id) if REFERENCE_ID.fullmatch(str(reference_id)) else None
        if not directory:
            return {'status': 'failed', 'error': 'The stems folder is not on this computer.'}
        await (await asyncio.create_subprocess_exec('/usr/bin/open', str(directory))).wait()
        return {'status': 'opened', 'folder': str(directory)}
