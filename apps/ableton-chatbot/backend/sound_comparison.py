"""Bounded, local audio measurements, not a learned perceptual match score."""

import asyncio
import importlib.util
import json
import os
from pathlib import Path
import shutil
import signal
import sys
from typing import Literal

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field

RATE = 44100
BANDS = ((25, 80), (80, 200), (200, 800), (800, 2500), (2500, 8000), (8000, 20000))


class ComparisonRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    recording_id: str = Field(pattern=r'^[a-f0-9]{32}$')
    layer: Literal['mix', 'drums', 'bass', 'vocals', 'other', 'kick', 'snare', 'toms', 'cymbals'] = 'bass'
    reference_start_seconds: float = Field(default=0, ge=0, le=600, allow_inf_nan=False)
    recording_start_seconds: float = Field(default=0, ge=0, le=30, allow_inf_nan=False)
    duration_seconds: float = Field(default=8, ge=2, le=16, allow_inf_nan=False)


def capability():
    available = bool(shutil.which('ffmpeg') and all(importlib.util.find_spec(module)
                     for module in ('numpy', 'scipy')))
    return {'available': available, 'reason': None if available else
            'Sound comparison requires FFmpeg, NumPy and SciPy on the server.'}


def measure(samples):
    import numpy as np
    from scipy.signal import stft

    if samples.ndim != 2 or samples.shape[1] != 2 or len(samples) < 2 * RATE or not np.isfinite(samples).all():
        raise ValueError('Select at least two seconds of valid audio for both sounds.')
    power = float(np.mean(samples ** 2))
    rms_db = float(10 * np.log10(max(power, 1e-12)))
    if rms_db < -60:
        raise ValueError('One selected excerpt is silent or too quiet to compare. Choose another interval or capture a louder audition.')
    peak = float(np.max(np.abs(samples)))
    if peak >= 0.999:
        raise ValueError('One selected excerpt reaches digital full scale. Lower its source level and capture again before comparing.')
    # Average channel power, not a mono sum: anti-phase stereo must not disappear.
    frequencies, _, spectrum = stft(samples.T, RATE, nperseg=4096, noverlap=2048, boundary=None, padded=False)
    energy = np.mean(np.abs(spectrum) ** 2, axis=(0, 2))
    total = max(float(energy.sum()), 1e-20)
    mid = (samples[:, 0] + samples[:, 1]) / 2
    side = (samples[:, 0] - samples[:, 1]) / 2
    side_fraction = float(np.mean(side ** 2) / max(float(np.mean(mid ** 2) + np.mean(side ** 2)), 1e-20))
    return {'rms_dbfs': round(rms_db, 3), 'peak_dbfs': round(float(20 * np.log10(peak)), 3),
            'crest_db': round(float(20 * np.log10(peak) - rms_db), 3),
            'spectral_centroid_hz': round(float(np.sum(frequencies * energy) / total), 2),
            'side_energy_percent': round(100 * side_fraction, 3),
            'bands_percent': {f'{low}-{high} Hz': round(100 * float(energy[(frequencies >= low) & (frequencies < high)].sum()) / total, 3)
                              for low, high in BANDS}}


def compare_arrays(reference, candidate):
    import numpy as np

    a, b = measure(reference), measure(candidate)
    # Equal RMS is an audition aid, not equal perceived loudness. Attenuation only.
    target = min(-20.0, a['rms_dbfs'], b['rms_dbfs'], -3 - a['crest_db'], -3 - b['crest_db'])
    gains = {'reference': round(target - a['rms_dbfs'], 3), 'candidate': round(target - b['rms_dbfs'], 3)}
    deltas = {key: round(b[key] - a[key], 3) for key in
              ('rms_dbfs', 'crest_db', 'spectral_centroid_hz', 'side_energy_percent')}
    band_deltas = {key: round(b['bands_percent'][key] - a['bands_percent'][key], 3) for key in a['bands_percent']}
    notes = []
    if abs(deltas['rms_dbfs']) >= 6:
        notes.append('The recorded levels differ substantially. Judge the RMS-matched previews before changing tone.')
    if abs(deltas['spectral_centroid_hz']) >= 200:
        direction = 'higher' if deltas['spectral_centroid_hz'] > 0 else 'lower'
        notes.append(f'The candidate spectral centroid is {direction}. Different notes or instruments can cause this; compare register before proposing a filter or EQ change.')
    if abs(deltas['crest_db']) >= 3:
        notes.append('Peak-to-average dynamics differ. Listen to attack and decay before proposing envelope or compression changes.')
    if abs(deltas['side_energy_percent']) >= 10:
        notes.append('Stereo side energy differs. Check the source and phase before considering width, reverb or delay.')
    if not notes:
        notes.append('No large difference on these coarse measures. This does not prove a timbral, melodic or perceptual match.')
    report = {'method': 'dsp-comparison-v1', 'status': 'measured', 'sample_rate': RATE,
              'duration_seconds': len(reference) / RATE, 'reference': a, 'candidate': b,
              'candidate_minus_reference': deltas, 'band_delta_percentage_points': band_deltas,
              'preview_gain_db': gains, 'next_checks': notes,
              'limitations': ['No perceptual match percentage, recovered MIDI, instrument identity or original effect settings are inferred.',
                              'Selected excerpts are not beat-aligned or pitch-aligned. Different notes, phrases and separation artifacts affect measurements.',
                              'RMS-matched previews use attenuation only; RMS matching is not perceptual loudness matching.',
                              'This is a saved recording comparison, not proof of the current Live Set state. No Ableton changes or approvals were made.']}
    return report, reference * np.power(10, gains['reference'] / 20), candidate * np.power(10, gains['candidate'] / 20)


def render_comparison(reference_path, candidate_path, directory, request):
    import hashlib
    import subprocess
    import numpy as np
    from scipy.io import wavfile

    length = round(request.duration_seconds * RATE)
    arrays = []
    hashes = {}
    for side, path, start in (('reference', reference_path, request.reference_start_seconds),
                              ('candidate', candidate_path, request.recording_start_seconds)):
        decoded = subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-threads', '1', '-i', str(path),
                                  '-ss', str(start), '-t', str(request.duration_seconds), '-map', '0:a:0',
                                  '-ac', '2', '-ar', str(RATE), '-f', 'f32le', 'pipe:1'],
                                 capture_output=True, timeout=20)
        if decoded.returncode:
            raise ValueError('Audio decoding failed. Choose a playable reference and audition.')
        samples = np.frombuffer(decoded.stdout, dtype='<f4').reshape(-1, 2).astype(float)
        if len(samples) < length:
            raise ValueError('The selected interval extends past the audio. Reduce the length or start earlier.')
        arrays.append(samples[:length])
        hashes[side] = hashlib.sha256(samples[:length].astype('<f4').tobytes()).hexdigest()
    report, a, b = compare_arrays(*arrays)
    report['excerpt_pcm_sha256'] = hashes
    for side, samples in (('reference', a), ('candidate', b)):
        wavfile.write(str(directory / f'{side}.wav'), RATE, (samples * 32767).round().astype('<i2'))
    (directory / 'report.json').write_text(json.dumps(report, allow_nan=False))


async def run(reference_path, candidate_path, directory, request):
    child = await asyncio.create_subprocess_exec(sys.executable, str(Path(__file__).resolve()),
        str(reference_path), str(candidate_path), str(directory), request.model_dump_json(),
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL, start_new_session=True,
        env={**os.environ, 'OMP_NUM_THREADS': '1', 'OPENBLAS_NUM_THREADS': '1'})
    try:
        output, _ = await asyncio.wait_for(child.communicate(), timeout=60)
        if child.returncode:
            raise HTTPException(422, output.decode().strip() or 'Sound comparison failed. No Ableton changes were made.')
        return json.loads((directory / 'report.json').read_text())
    except asyncio.TimeoutError:
        raise HTTPException(504, 'Sound comparison timed out. Try a shorter excerpt.')
    finally:
        if child.returncode is None:
            try:
                os.killpg(child.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            await child.wait()


if __name__ == '__main__':
    try:
        render_comparison(Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]),
                          ComparisonRequest.model_validate_json(sys.argv[4]))
    except ValueError as error:
        print(str(error))
        sys.exit(1)
    except Exception:
        print('Sound comparison failed. No Ableton changes were made.')
        sys.exit(1)
