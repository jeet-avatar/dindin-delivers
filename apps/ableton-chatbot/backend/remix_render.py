"""Deterministic stem-arrangement preview. Never edits source files or Ableton.

All stems share one multichannel time-stretch pass and one sample-based timeline.
This is an arrangement remix, not generated instrumentation or recovered effects.
"""

from contextlib import ExitStack
import hashlib
import json
import math
from pathlib import Path
import shutil
import subprocess

from pydantic import BaseModel, ConfigDict, Field

import mastering

RATE = 44100
BLOCK = 65536


class Segment(BaseModel):
    model_config = ConfigDict(extra='forbid')
    section: int = Field(ge=0, le=31)
    repeats: int = Field(default=1, ge=1, le=4)
    levels: dict[str, float] = Field(min_length=1, max_length=8)


class Recipe(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    analysis_id: str = Field(pattern=r'^[a-f0-9]{64}$')
    timing_revision: int = Field(ge=1)
    target_bpm: float = Field(ge=20, le=300, allow_inf_nan=False)
    segments: list[Segment] = Field(min_length=1, max_length=32)


def compile_recipe(recipe, timing, names):
    if (timing.get('status') != 'confirmed' or recipe.analysis_id != timing['analysis_id']
            or recipe.timing_revision != timing['revision']):
        raise ValueError('Confirm the current tempo and section timing in the Timing tab first.')
    ratio = recipe.target_bpm / timing['bpm']
    if not 0.8 <= ratio <= 1.25:
        raise ValueError('This preview supports tempo changes between 80% and 125% of the confirmed source tempo.')
    rows, cursor = [], 0
    for segment in recipe.segments:
        if segment.section >= len(timing['sections']):
            raise ValueError('A selected source section no longer exists.')
        if not set(segment.levels) <= set(names):
            raise ValueError('Choose available stems, without the parent drums and their children together.')
        if any(not math.isfinite(db) or not -24 <= db <= 0 for db in segment.levels.values()):
            raise ValueError('Stem levels must be finite and between -24 and 0 dB.')
        boundary = timing['sections'][segment.section]
        first = round(boundary['start_seconds'] / ratio * RATE)
        last = round(boundary['end_seconds'] / ratio * RATE)
        length = last - first
        if length < RATE:
            raise ValueError('Each output section must contain at least one second of source audio.')
        for _ in range(segment.repeats):
            rows.append({'name': boundary['name'], 'source_start_frame': first,
                         'source_end_frame': last, 'start_frame': cursor,
                         'end_frame': cursor + length, 'levels': segment.levels})
            cursor += length
    if not 5 * RATE <= cursor <= 600 * RATE:
        raise ValueError('Choose an arrangement between 5 seconds and 10 minutes.')
    return {'sample_rate': RATE, 'frames': cursor, 'duration_seconds': cursor / RATE,
            'numerator': timing.get('numerator', 4), 'denominator': timing.get('denominator', 4),
            'source_bpm': timing['bpm'], 'target_bpm': recipe.target_bpm, 'tempo_ratio': ratio,
            'stems': [name for name in names if any(name in row['levels'] for row in rows)],
            'sections': rows, 'pitch_shift_semitones': 0}


def digest(path):
    with Path(path).open('rb') as handle:
        return hashlib.file_digest(handle, 'sha256').hexdigest()


def ffmpeg(args):
    result = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-threads', '1', *args],
                            capture_output=True, timeout=240)
    if result.returncode:
        raise ValueError('Audio processing failed. The original stems are unchanged.')


def render(source, output, plan, progress=lambda stage: None):
    import numpy as np
    import soundfile as sf

    source, output = Path(source), Path(output)
    names = plan['stems']
    paths = [source / (name + '.wav') for name in names]
    identities = {name: digest(path) for name, path in zip(names, paths)}
    infos = [sf.info(path) for path in paths]
    first = infos[0]
    if (first.channels != 2 or first.duration > 600.01 or first.duration < 5
            or any((info.frames, info.samplerate, info.channels) !=
                   (first.frames, first.samplerate, 2) for info in infos)):
        raise ValueError('Source stems must have identical stereo frame counts and sample rates before remixing.')
    expected = round(first.duration / plan['tempo_ratio'] * RATE)
    if any(row['source_end_frame'] > expected for row in plan['sections']):
        raise ValueError('The timing map extends beyond the source stems.')
    estimated = first.frames * len(names) * 8 + expected * len(names) * 8 + plan['frames'] * (len(names) + 1) * 16
    if shutil.disk_usage(output).free < estimated + 512 * 1024 ** 2:
        raise ValueError('Not enough temporary storage for a safe remix preview. Try a shorter arrangement.')
    with ExitStack() as stack:
        scratch = output / 'scratch'
        scratch.mkdir()
        stack.callback(shutil.rmtree, scratch, True)
        progress('Aligning selected stems')
        readers = [stack.enter_context(sf.SoundFile(path)) for path in paths]
        merged = scratch / 'multichannel.wav'
        with sf.SoundFile(merged, 'w', samplerate=first.samplerate, channels=2 * len(names), subtype='FLOAT') as writer:
            for _ in range(0, first.frames, BLOCK):
                audio = np.concatenate([reader.read(BLOCK, dtype='float32', always_2d=True) for reader in readers], axis=1)
                if not np.isfinite(audio).all():
                    raise ValueError('A source stem contains invalid audio samples.')
                writer.write(audio)
        progress('Applying shared tempo map')
        stretched = scratch / 'stretched.wav'
        filters = f'aresample={RATE}'
        if abs(plan['tempo_ratio'] - 1) > 1e-9:
            # One WSOLA pass uses the same waveform splice positions for every stem.
            filters += f",atempo={plan['tempo_ratio']}"
        ffmpeg(['-i', str(merged), '-af', filters, '-c:a', 'pcm_f32le', str(stretched)])
        info = sf.info(stretched)
        if info.channels != len(names) * 2 or abs(info.frames - expected) > RATE // 20:
            raise ValueError('Shared time-stretch duration or channel count did not pass verification.')
        progress('Building section arrangement')
        arranged = scratch / 'arranged.wav'
        raw_mix = scratch / 'mix.wav'
        with sf.SoundFile(stretched) as reader, \
                sf.SoundFile(arranged, 'w', samplerate=RATE, channels=len(names) * 2, subtype='FLOAT') as writer, \
                sf.SoundFile(raw_mix, 'w', samplerate=RATE, channels=2, subtype='FLOAT') as mix:
            for row in plan['sections']:
                reader.seek(row['source_start_frame'])
                length = row['end_frame'] - row['start_frame']
                gains = np.repeat([10 ** (row['levels'][name] / 20) if name in row['levels'] else 0 for name in names], 2)
                fade = min(round(0.005 * RATE), length // 2)
                energy = 0.0
                for offset in range(0, length, BLOCK):
                    count = min(BLOCK, length - offset)
                    samples = reader.read(count, dtype='float64', always_2d=True)
                    if len(samples) < count:
                        # Stretching can differ by a few end samples; never shift later boundaries.
                        samples = np.pad(samples, ((0, count - len(samples)), (0, 0)))
                    positions = np.arange(offset, offset + count)
                    envelope = np.minimum(1, np.minimum(positions / fade, (length - 1 - positions) / fade))
                    samples *= gains * envelope[:, None]
                    combined = samples.reshape(count, len(names), 2).sum(axis=1)
                    energy += float(np.sum(combined ** 2))
                    writer.write(samples)
                    mix.write(combined)
                if 10 * math.log10(max(energy / (length * 2), 1e-20)) < -60:
                    raise ValueError(f"{row['name']} is silent or too quiet with the selected layers. Change its stem choices.")
        progress('Measuring mix and preparing preview')
        lufs, true_peak = mastering.loudness(raw_mix)
        if not all(math.isfinite(value) for value in (lufs, true_peak)):
            raise ValueError('The remix has no measurable audio. Change the selected layers.')
        gain_db = min(-16 - lufs, -1.5 - true_peak, 12)
        gain = 10 ** (gain_db / 20)
        with ExitStack() as outputs, sf.SoundFile(arranged) as reader:
            stems = [outputs.enter_context(sf.SoundFile(output / f'{name}.wav', 'w', samplerate=RATE,
                     channels=2, subtype='PCM_24')) for name in names]
            mix = outputs.enter_context(sf.SoundFile(output / 'mix.wav', 'w', samplerate=RATE, channels=2, subtype='PCM_24'))
            while True:
                samples = reader.read(BLOCK, dtype='float64', always_2d=True)
                if not len(samples):
                    break
                samples *= gain
                for i, writer in enumerate(stems):
                    part = samples[:, i * 2:i * 2 + 2]
                    if np.max(np.abs(part)) >= 1:
                        raise ValueError('A separated layer would clip. Lower its level and render again.')
                    writer.write(part)
                mix.write(samples.reshape(-1, len(names), 2).sum(axis=1))
        measured_lufs, measured_peak = mastering.loudness(output / 'mix.wav')
        if not math.isfinite(measured_peak) or measured_peak > -1:
            raise ValueError('The final preview did not pass true-peak verification.')
        if any(digest(path) != identities[name] for name, path in zip(names, paths)):
            raise ValueError('A source stem changed during rendering. This preview cannot be approved.')
        files = {}
        for name in ['mix', *names]:
            path = output / f'{name}.wav'
            info = sf.info(path)
            if (info.frames, info.samplerate, info.channels) != (plan['frames'], RATE, 2):
                raise ValueError('A rendered file failed frame-alignment verification.')
            files[name] = {'sha256': digest(path), 'frames': info.frames, 'bytes': path.stat().st_size}
        return {**plan, 'files': files, 'source_sha256': identities, 'gain_db': gain_db,
                'lufs': measured_lufs, 'true_peak_dbtp': measured_peak,
                'limitations': ['This rearranges existing stems; it does not generate replacement instruments or recover original effects.',
                               'Time-stretching and estimated separation can create audible artifacts. Listen before approving.',
                               'Section edits use 5 ms boundary fades without moving the confirmed timeline.',
                               'Measured checks are not proof of musical quality or legal clearance.']}
