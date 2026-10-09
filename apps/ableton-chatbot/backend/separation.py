"""Stem separation engine shared by the server worker, the local Bridge and the cloud job.

Imports only audio libraries, never the web API, so it can run on a user's computer.
"""

import hashlib
import os
from pathlib import Path
import shutil

from stems import CORE_STEMS, DRUM_PARTS

DRUMSEP_SHA256 = 'aefaa8543c9b9c75e22f5f32b53ab86dfe416457849af1383ff1aef83401423f'
DRUMSEP_SOURCES = {'bombo': 'kick', 'redoblante': 'snare', 'toms': 'toms', 'platillos': 'cymbals'}
_verified_checkpoints = {}


def sha256(path):
    with Path(path).open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def demucs_model_cached(model_name):
    """True when every checkpoint of the named Demucs model is already in TORCH_HOME."""
    cache = Path(os.getenv('TORCH_HOME', '/opt/beatmind-models')) / 'hub' / 'checkpoints'
    # The installed Demucs manifest, not a guessed model filename, defines the cache.
    try:
        import yaml
        from demucs.pretrained import REMOTE_ROOT, _parse_remote_files
        from urllib.parse import urlparse
        names = yaml.safe_load((REMOTE_ROOT / f'{model_name}.yaml').read_text())['models']
        urls = _parse_remote_files(REMOTE_ROOT / 'files.txt')
        return all((cache / Path(urlparse(urls[str(name)]).path).name).is_file() for name in names)
    except (ImportError, OSError, KeyError, ValueError):
        return False


def drumsep_ready(checkpoint):
    """True when the drum model file is the reviewed checkpoint. Hashes once per file version."""
    try:
        stat = Path(checkpoint).stat()
    except (OSError, TypeError):
        return False
    key = (str(checkpoint), stat.st_size, stat.st_mtime_ns)
    if key not in _verified_checkpoints:
        _verified_checkpoints[key] = sha256(checkpoint) == DRUMSEP_SHA256
    return _verified_checkpoints[key]


def pick_device(requested='auto'):
    if requested != 'auto':
        return requested
    import torch
    if torch.cuda.is_available():
        return 'cuda'
    if torch.backends.mps.is_available():
        return 'mps'
    return 'cpu'


def run_demucs(mix, workdir, model, device, shifts, overlap, segment):
    """Four-source Demucs estimates as 24-bit WAVs in workdir; returns name -> path."""
    from demucs.separate import main as separate
    output = Path(workdir) / 'separated'
    separate(['-n', model, '-d', device, '--shifts', str(shifts), '--overlap', str(overlap),
              '-j', '0', '--segment', str(segment), '--int24', '--clip-mode', 'clamp',
              '-o', str(output), str(mix)])
    paths = {}
    for stem in CORE_STEMS:
        target = Path(workdir) / f'{stem}.wav'
        shutil.move(str(output / model / Path(mix).stem / f'{stem}.wav'), str(target))
        paths[stem] = target
    shutil.rmtree(output)
    return paths


def split_drums(drums, workdir, checkpoint, device, shifts, overlap):
    """Split a drums stem into kick, snare, toms and cymbals with the reviewed drumsep model.

    Returns (name -> path, common gain in dB). One shared gain prevents clipping while
    keeping the balance between drum parts.
    """
    import numpy as np
    import soundfile as sf
    import torch
    from demucs.apply import apply_model
    from demucs.hdemucs import HDemucs
    from demucs.states import load_model

    if not drumsep_ready(checkpoint):
        raise RuntimeError('The drum separation model differs from the reviewed checkpoint.')
    # Restrict deserialization to tensors and the inspected model class, not arbitrary pickle globals.
    with torch.serialization.safe_globals([HDemucs]):
        package = torch.load(checkpoint, map_location='cpu', weights_only=True)
    if package.get('klass') is not HDemucs:
        raise RuntimeError('Unexpected drum model class.')
    model = load_model(package).eval()
    if set(model.sources) != set(DRUMSEP_SOURCES):
        raise RuntimeError('Unexpected drum model taxonomy.')
    audio, rate = sf.read(drums, dtype='float32', always_2d=True)
    if rate != model.samplerate or audio.shape[1] != model.audio_channels:
        raise RuntimeError('The drums stem must be 44.1 kHz stereo.')
    tensor = torch.from_numpy(audio.T.copy())
    mono = tensor.mean(0)
    mean, std = mono.mean(), mono.std()
    if std < 1e-7:
        # A silent drums stem has no parts to split; keep aligned silent files.
        output = np.zeros((len(model.sources), 2, audio.shape[0]), dtype='float32')
    else:
        with torch.inference_mode():
            output = (apply_model(model, ((tensor - mean) / std)[None], device=device, shifts=int(shifts),
                                  split=True, overlap=float(overlap), progress=False, num_workers=0)[0]
                      * std + mean).cpu().numpy()
    if output.shape != (len(model.sources), 2, audio.shape[0]) or not np.isfinite(output).all():
        raise RuntimeError('Drum separation output is incomplete, non-finite or misaligned.')
    peak = float(np.max(np.abs(output)))
    gain = min(1.0, 0.98 / peak) if peak else 1.0
    paths = {}
    for index, label in enumerate(model.sources):
        name = DRUMSEP_SOURCES[label]
        target = Path(workdir) / f'{name}.wav'
        sf.write(target, output[index].T * gain, rate, subtype='PCM_24')
        paths[name] = target
    return {name: paths[name] for name in DRUM_PARTS}, round(float(20 * np.log10(gain)), 3)


def separate(mix, workdir, model='htdemucs', device='cpu', shifts=0, overlap=0.25, segment=7,
             drumsep_checkpoint=None, progress=lambda stage: None):
    """Write stems beside the mix. Returns (ordered stem names, separation provenance)."""
    device = pick_device(device)
    progress('Estimating drums, bass, vocals and other stems')
    run_demucs(mix, workdir, model, device, shifts, overlap, segment)
    names = list(CORE_STEMS)
    provenance = {'model': model, 'device': device, 'shifts': int(shifts), 'overlap': float(overlap),
                  'segment': int(segment), 'bit_depth': 24, 'stem_set': 'core'}
    if drumsep_checkpoint:
        progress('Splitting drums into kick, snare, toms and cymbals')
        _, gain_db = split_drums(Path(workdir) / 'drums.wav', workdir, drumsep_checkpoint, device, shifts, overlap)
        names += list(DRUM_PARTS)
        provenance.update(stem_set='detailed', drum_model='inagoy/drumsep 49469ca8',
                          drum_model_sha256=DRUMSEP_SHA256, drum_parts_gain_db=gain_db)
    return names, provenance
