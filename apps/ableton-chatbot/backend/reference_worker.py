"""CPU worker: bounded decoding, Demucs estimated stems, librosa measurements."""

import json
import hashlib
import math
import os
from pathlib import Path
import shutil
import subprocess
import sys

# Separation quality knobs. Defaults preserve the original CPU behaviour; a GPU
# deployment raises quality by overriding these (e.g. htdemucs_ft / cuda / shifts).
DEMUCS_MODEL = os.getenv('DEMUCS_MODEL', 'htdemucs')
DEMUCS_DEVICE = os.getenv('DEMUCS_DEVICE', 'cpu')
DEMUCS_SHIFTS = os.getenv('DEMUCS_SHIFTS', '0')
DEMUCS_OVERLAP = os.getenv('DEMUCS_OVERLAP', '0.25')
DEMUCS_SEGMENT = os.getenv('DEMUCS_SEGMENT', '7')
MAX_SECONDS = int(os.getenv('REFERENCE_MAX_SECONDS', '600'))


def has_tonal_evidence(stems):
    energy = {s['name']: 10 ** (s['rms_dbfs'] / 10) for s in stems}
    harmonic = sum(energy.get(name, 0) for name in ('bass', 'vocals', 'other'))
    return harmonic > max(sum(energy.values()) * 0.1, 1e-8)


def structure_candidates(y, sr, beat_seconds, duration):
    import librosa
    import numpy as np
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=12, hop_length=2048)
    stride = max(1, math.ceil(mfcc.shape[1] / 1200))
    features = mfcc[:, ::stride]
    features = (features - features.mean(axis=1, keepdims=True)) / np.maximum(features.std(axis=1, keepdims=True), 1e-6)
    count = min(16, max(1, math.ceil(duration / 40)), features.shape[1])
    bounds = librosa.segment.agglomerative(features, count) if count > 1 else [0]
    candidates = []
    for frame in bounds:
        timestamp = float(frame * stride * 2048 / sr)
        if beat_seconds and timestamp > 0:
            closest = min(beat_seconds, key=lambda b: abs(b - timestamp))
            if abs(closest - timestamp) < 0.3:
                timestamp = closest
        if 2 < timestamp < duration - 2 and (not candidates or timestamp - candidates[-1] >= 2):
            candidates.append(round(timestamp, 6))
    return {'method': 'librosa temporal MFCC clustering; nearby beat alignment',
            'boundary_seconds': [0.0, *candidates], 'estimated': True,
            'labels_verified': False, 'downbeats_verified': False}


def stem_health(directory):
    import numpy as np
    import soundfile as sf
    original = sf.info(directory / 'mix.wav')
    result = {}
    for stem in ('drums', 'bass', 'vocals', 'other'):
        path = directory / (stem + '.wav')
        info = sf.info(path)
        count, clipped, square, peak, finite = 0, 0, 0.0, 0.0, True
        for block in sf.blocks(path, blocksize=65536, always_2d=True):
            finite = finite and bool(np.isfinite(block).all())
            count += block.size
            square += float(np.sum(block ** 2))
            peak = max(peak, float(np.max(np.abs(block))))
            clipped += int(np.sum(np.abs(block) >= 0.9999))
        aligned = info.frames == original.frames and info.samplerate == original.samplerate and info.channels == original.channels
        rms = float(20 * np.log10(max(math.sqrt(square / max(count, 1)), 1e-9)))
        with path.open('rb') as source:
            identity = hashlib.file_digest(source, 'sha256').hexdigest()
        result[stem] = {'aligned': aligned, 'finite': finite, 'frames': info.frames,
                        'sample_rate': info.samplerate, 'peak_dbfs': round(20 * math.log10(max(peak, 1e-9)), 2),
                        'rms_dbfs': round(rms, 2), 'quiet': rms < -60,
                        'clipped_sample_fraction': clipped / max(count, 1), 'sha256': identity}
    return {'checks_passed': all(s['aligned'] and s['finite'] and s['frames'] > 0 for s in result.values()),
            'stems': result, 'separation_quality_verified': False}


def analyze(directory, measure_only=False):
    import librosa
    import numpy as np
    import soundfile as sf
    import torch
    from demucs.separate import main as separate

    def progress(stage):
        path = directory / 'progress.tmp'
        path.write_text(json.dumps({'stage': stage}))
        path.replace(directory / 'progress.json')

    torch.set_num_threads(2)
    meta = json.loads((directory / 'meta.json').read_text())
    source = directory / meta['source_file']
    audio_format = {'.wav': 'wav', '.aif': 'aiff', '.aiff': 'aiff', '.mp3': 'mp3',
                    '.m4a': 'mov', '.flac': 'flac', '.ogg': 'ogg'}[source.suffix.lower()]
    if not measure_only:
        progress('Decoding audio')
        subprocess.run([
        'ffmpeg', '-nostdin', '-v', 'error', '-y', '-protocol_whitelist', 'file,pipe',
        '-f', audio_format, '-i', str(source), '-t', str(MAX_SECONDS + 1), '-vn', '-ac', '2', '-ar', '44100',
        '-c:a', 'pcm_s24le', str(directory / 'mix.wav'),
        ], check=True, timeout=60)
    info = sf.info(directory / 'mix.wav')
    if not 5 <= info.duration <= MAX_SECONDS:
        raise ValueError('Reference must be between 5 seconds and 10 minutes.')
    if not measure_only:
        progress('Estimating drums, bass, vocals and other stems')
        from references import cached_model_ready
        if not cached_model_ready():
            raise RuntimeError('The packaged separation model is unavailable. No runtime download is permitted.')
        separate(['-n', DEMUCS_MODEL, '-d', DEMUCS_DEVICE, '--shifts', DEMUCS_SHIFTS,
              '--overlap', DEMUCS_OVERLAP, '-j', '0', '--segment', DEMUCS_SEGMENT,
              '--int24', '--clip-mode', 'clamp',
              '-o', str(directory / 'separated'), str(directory / 'mix.wav')])
        for stem in ('drums', 'bass', 'vocals', 'other'):
            shutil.move(str(directory / 'separated' / DEMUCS_MODEL / 'mix' / (stem + '.wav')), str(directory / (stem + '.wav')))
        shutil.rmtree(directory / 'separated')
    progress('Measuring tempo, tonal centre and energy changes')
    y, sr = librosa.load(directory / 'mix.wav', sr=22050)
    if np.max(np.abs(y)) < 0.0001:
        raise ValueError('The reference has no usable signal.')
    onset = librosa.onset.onset_strength(y=y, sr=sr)
    tempo, beats = librosa.beat.beat_track(onset_envelope=onset, sr=sr)
    bpm = float(np.asarray(tempo).reshape(-1)[0])
    chroma = librosa.feature.chroma_stft(y=y, sr=sr).mean(axis=1)
    profiles = {
        'major': np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]),
        'minor': np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]),
    }
    notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    candidates = []
    for mode, profile in profiles.items():
        for root in range(12):
            score = float(np.corrcoef(chroma, np.roll(profile, root))[0, 1]) if np.std(chroma) > 1e-8 else 0.0
            candidates.append({'key': notes[root] + ' ' + mode, 'correlation': round(score, 3)})
    candidates.sort(key=lambda item: item['correlation'], reverse=True)
    window = 8
    energy = []
    for start in range(0, int(np.ceil(info.duration)), window):
        chunk = y[start * sr:(start + window) * sr]
        energy.append({'start': start, 'end': round(min(start + window, info.duration), 2),
                       'rms_dbfs': round(float(20 * np.log10(max(float(np.sqrt(np.mean(chunk ** 2))), 1e-9))), 2)})
    boundaries = [energy[i]['start'] for i in range(1, len(energy))
                  if abs(energy[i]['rms_dbfs'] - energy[i-1]['rms_dbfs']) >= 4]
    stems = []
    for name in ('drums', 'bass', 'vocals', 'other'):
        stem_y, _ = librosa.load(directory / (name + '.wav'), sr=sr)
        rms = float(np.sqrt(np.mean(stem_y ** 2)))
        onsets = librosa.onset.onset_detect(y=stem_y, sr=sr)
        stems.append({'name': name, 'rms_dbfs': round(float(20 * np.log10(max(rms, 1e-9))), 2),
                      'onset_events_per_second': round(len(onsets) / info.duration, 2),
                      'activity': [round(float(np.sqrt(np.mean(stem_y[start * sr:(start + window) * sr] ** 2))), 5)
                                   for start in range(0, int(np.ceil(info.duration)), window)]})
    waveform = [round(float(np.max(np.abs(chunk))), 4) for chunk in np.array_split(y, 160)]
    beat_seconds = [float(t) for t in librosa.frames_to_time(beats, sr=sr)]
    report = {
        'duration_seconds': info.duration, 'model': DEMUCS_MODEL,
        'tempo': {'bpm': round(bpm, 1) if bpm > 0 else None, 'estimated': True,
                  'half_double_ambiguity': True},
        'key_candidates': candidates[:3], 'stems': stems, 'energy_windows': energy,
        'possible_change_points_seconds': boundaries, 'waveform': waveform,
        'beat_times_seconds': [round(t, 6) for t in beat_seconds],
        'structure': structure_candidates(y, sr, beat_seconds, info.duration),
        'stem_health': stem_health(directory),
        'limitations': [
            'Separated stems are estimates, not original multitracks; bleed and artifacts are possible.',
            'Other combines instruments. Drums does not isolate individual kicks, snares or hats.',
            'Tempo may be half or double time. Key candidates are correlations, not confidence probabilities.',
            'Energy change points do not identify intro, build, drop or chorus without listening.',
            'Exact instruments, presets, effects, genre and original MIDI cannot be recovered from these measurements.',
        ],
    }
    if not has_tonal_evidence(stems):
        report['key_candidates'] = []
        report['limitations'].append('Not enough separated tonal energy for a useful key estimate.')
    temporary = directory / 'report.tmp'
    temporary.write_text(json.dumps(report, allow_nan=False))
    temporary.replace(directory / 'report.json')


if __name__ == '__main__':
    analyze(Path(sys.argv[1]), measure_only='--measure-only' in sys.argv)
