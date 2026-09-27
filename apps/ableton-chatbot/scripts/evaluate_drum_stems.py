"""Local, opt-in evaluation of the four-source DrumSep model; never writes to Ableton."""

import argparse
import hashlib
import json
from pathlib import Path
import time


MODEL_SHA256 = 'aefaa8543c9b9c75e22f5f32b53ab86dfe416457849af1383ff1aef83401423f'
SOURCE_NAMES = {'bombo': 'kick', 'redoblante': 'snare', 'platillos': 'cymbals-and-hi-hat', 'toms': 'toms'}


def sha256(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def evaluate(source, model_path, destination, seconds=None):
    import numpy as np
    import soundfile as sf
    import torch
    from demucs.apply import apply_model
    from demucs.hdemucs import HDemucs
    from demucs.states import load_model

    if destination.exists():
        raise ValueError('The output folder already exists. Existing stems are never overwritten.')
    if sha256(model_path) != MODEL_SHA256:
        raise ValueError('Checkpoint differs from the reviewed DrumSep download.')
    torch.set_num_threads(2)
    # Restrict deserialization to tensors and the inspected model class, not arbitrary pickle globals.
    with torch.serialization.safe_globals([HDemucs]):
        package = torch.load(model_path, map_location='cpu', weights_only=True)
    if package.get('klass') is not HDemucs:
        raise ValueError('Unexpected model class.')
    model = load_model(package).cpu().eval()
    if set(model.sources) != set(SOURCE_NAMES):
        raise ValueError('Unexpected source taxonomy.')
    info = sf.info(source)
    if info.samplerate != model.samplerate or info.channels != model.audio_channels:
        raise ValueError('Input must be 44.1 kHz stereo audio; use the saved drums WAV.')
    if not 5 <= info.duration <= 600:
        raise ValueError('Input must contain 5-600 seconds of audio.')
    frames = min(info.frames, round(seconds * info.samplerate)) if seconds else info.frames
    audio, sr = sf.read(source, frames=frames, dtype='float32', always_2d=True)
    if not np.isfinite(audio).all():
        raise ValueError('Non-finite audio is not supported.')
    tensor = torch.from_numpy(audio.T.copy())
    mono = tensor.mean(0)
    mean, std = mono.mean(), mono.std()
    if std < 1e-7:
        raise ValueError('Input is silent or has insufficient signal.')
    started = time.monotonic()
    with torch.inference_mode():
        estimates = apply_model(model, ((tensor - mean) / std)[None], device='cpu',
                                shifts=0, split=True, overlap=0.25, segment=7,
                                progress=True, num_workers=0)[0] * std + mean
    output = estimates.cpu().numpy()
    if output.shape != (4, 2, frames) or not np.isfinite(output).all():
        raise ValueError('Model output is incomplete, non-finite or misaligned.')
    peak = float(np.max(np.abs(output)))
    gain = min(1.0, 0.98 / peak) if peak else 1.0
    destination.mkdir(parents=True)
    manifest = {'status': 'files_saved', 'quality_status': 'needs_audition',
                'source_file': source.name, 'source_sha256': sha256(source),
                'model': 'inagoy/drumsep 49469ca8', 'model_sha256': MODEL_SHA256,
                'model_source': 'https://github.com/inagoy/drumsep',
                'sample_rate': sr, 'frames': frames, 'duration_seconds': frames / sr,
                'excerpt_only': frames != info.frames, 'elapsed_seconds': round(time.monotonic() - started, 2),
                'common_output_gain_db': round(float(20 * np.log10(gain)), 3), 'stems': [],
                'limitations': ['Estimated drum components, not original multitracks.',
                                'Hi-hat and cymbals remain combined; no separate hi-hat file is claimed.',
                                'Bleed, synthetic-drum mismatch and separation artifacts require listening review.',
                                'No creative approval, server attachment or Ableton import has occurred.']}
    for index, label in enumerate(model.sources):
        stem = SOURCE_NAMES[label]
        samples = output[index].T * gain
        path = destination / f'{stem}.wav'
        sf.write(path, samples, sr, subtype='PCM_24')
        saved = sf.info(path)
        if saved.frames != frames or saved.samplerate != sr or saved.channels != 2:
            raise ValueError(f'{stem} failed file readback.')
        manifest['stems'].append({'name': stem, 'file': path.name, 'sha256': sha256(path),
                                  'peak_dbfs': round(float(20 * np.log10(max(float(np.max(np.abs(samples))), 1e-9))), 2),
                                  'rms_dbfs': round(float(20 * np.log10(max(float(np.sqrt(np.mean(samples ** 2))), 1e-9))), 2),
                                  'aligned': True, 'estimated': True})
    if len({stem['sha256'] for stem in manifest['stems']}) != len(manifest['stems']):
        raise ValueError('Duplicate audio outputs require investigation.')
    (destination / 'manifest.json').write_text(json.dumps(manifest, indent=2))
    print(json.dumps(manifest, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--model', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--seconds', type=float)
    args = parser.parse_args()
    if args.seconds is not None and not 5 <= args.seconds <= 600:
        parser.error('--seconds must be between 5 and 600')
    evaluate(args.input, args.model, args.output, args.seconds)
