"""Bounded sampled-instrument sequencing and native DSP for offline remix previews."""

from fractions import Fraction
from functools import lru_cache
import math
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)


class Reverb(StrictModel):
    kind: Literal['reverb']
    room_size: float = Field(default=.3, ge=0, le=1)
    damping: float = Field(default=.5, ge=0, le=1)
    mix: float = Field(default=.15, ge=0, le=.75)


class Delay(StrictModel):
    kind: Literal['delay']
    beats: float = Field(default=.75, ge=.0625, le=4)
    feedback: float = Field(default=.25, ge=0, le=.7)
    mix: float = Field(default=.15, ge=0, le=.75)


class Equalizer(StrictModel):
    kind: Literal['eq']
    frequency_hz: float = Field(ge=20, le=20000)
    gain_db: float = Field(ge=-18, le=12)
    q: float = Field(default=.707, ge=.1, le=10)


class Filter(StrictModel):
    kind: Literal['highpass', 'lowpass']
    frequency_hz: float = Field(ge=20, le=20000)


class Compressor(StrictModel):
    kind: Literal['compressor']
    threshold_db: float = Field(default=-18, ge=-48, le=0)
    ratio: float = Field(default=3, ge=1, le=12)
    attack_ms: float = Field(default=10, ge=.1, le=100)
    release_ms: float = Field(default=100, ge=10, le=1000)


Effect = Annotated[Reverb | Delay | Equalizer | Filter | Compressor, Field(discriminator='kind')]
Chain = Annotated[list[Effect], Field(max_length=4)]


class Note(StrictModel):
    beat: float = Field(ge=0, lt=32)
    duration_beats: float = Field(ge=.0625, le=16)
    note: int = Field(ge=0, le=127)
    velocity: int = Field(default=100, ge=1, le=127)


class Part(StrictModel):
    id: str = Field(pattern=r'^part_[a-z0-9_]{1,24}$')
    name: str = Field(min_length=1, max_length=60)
    sample_id: str = Field(pattern=r'^[a-f0-9]{32}$')
    root_note: int = Field(ge=0, le=127)
    gain_db: float = Field(default=-9, ge=-36, le=0)
    loop_beats: float = Field(ge=1, le=32)
    notes: list[Note] = Field(min_length=1, max_length=64)
    replaces: str | None = None
    effects: Chain = Field(default_factory=list)

    @model_validator(mode='after')
    def check_pattern(self):
        if any(note.beat >= self.loop_beats or abs(note.note - self.root_note) > 12 for note in self.notes):
            raise ValueError('Notes must start within the pattern and within one octave of the sample root note.')
        if len({(note.beat, note.note) for note in self.notes}) != len(self.notes):
            raise ValueError('Duplicate notes at the same beat are not allowed.')
        return self


def compile_layers(recipe, names, catalog, rows):
    parts = sorted({part.id for segment in recipe.segments for part in segment.parts})
    if len(parts) > 4:
        raise ValueError('Use at most four sampled-instrument layers per remix.')
    pitches = {(part.sample_id, note.note - part.root_note) for segment in recipe.segments
               for part in segment.parts for note in part.notes}
    if len(pitches) > 16:
        raise ValueError('Use at most 16 distinct sample/pitch combinations in a preview.')
    used = {}
    for segment in recipe.segments:
        replaced = set()
        if not set(segment.effects) <= set(segment.levels):
            raise ValueError('Effects must target a selected source stem.')
        if len({part.id for part in segment.parts}) != len(segment.parts):
            raise ValueError('Each instrument needs a unique layer ID in a section.')
        for part in segment.parts:
            asset = catalog.get(part.sample_id)
            if not asset:
                raise ValueError('Choose an uploaded sample from this reference. Unknown sample IDs cannot be rendered.')
            used[part.sample_id] = asset['sha256']
            if part.replaces is not None:
                if part.replaces not in segment.levels or part.replaces in replaced:
                    raise ValueError('Replace one selected, available stem per part. A combined drums stem is not an isolated kick.')
                if part.replaces in segment.effects:
                    raise ValueError('Move effects from the replaced source stem to the replacement part.')
                replaced.add(part.replaces)
    events = sum(math.ceil((row['end_frame'] - row['start_frame']) / 44100 * recipe.target_bpm / 60 / part['loop_beats'])
                 * len(part['notes']) for row in rows for part in row.get('parts', []))
    if events > 20000:
        raise ValueError('This arrangement exceeds the 20,000 sampled-note preview limit.')
    return parts, used


def board(chain, bpm):
    import pedalboard as dsp
    plugins = []
    for effect in chain:
        kind = effect['kind']
        if kind == 'reverb':
            plugins.append(dsp.Reverb(room_size=effect['room_size'], damping=effect['damping'],
                                      wet_level=effect['mix'], dry_level=1 - effect['mix']))
        elif kind == 'delay':
            plugins.append(dsp.Delay(delay_seconds=effect['beats'] * 60 / bpm,
                                     feedback=effect['feedback'], mix=effect['mix']))
        elif kind == 'eq':
            plugins.append(dsp.PeakFilter(cutoff_frequency_hz=effect['frequency_hz'],
                                          gain_db=effect['gain_db'], q=effect['q']))
        elif kind in {'highpass', 'lowpass'}:
            cls = dsp.HighpassFilter if kind == 'highpass' else dsp.LowpassFilter
            plugins.append(cls(cutoff_frequency_hz=effect['frequency_hz']))
        elif kind == 'compressor':
            plugins.append(dsp.Compressor(**{key: value for key, value in effect.items() if key != 'kind'}))
        else:
            raise ValueError('Unsupported preview effect.')
    return dsp.Pedalboard(plugins)


def process(source, scratch, arranged, plan):
    import numpy as np
    import soundfile as sf
    from scipy.signal import resample_poly
    import remix_assets
    from remix_render import BLOCK, RATE

    source_names, names = plan['source_stems'], plan['stems']
    out, mix_path = scratch / 'processed.wav', scratch / 'processed-mix.wav'
    samples = {}
    for sample_id, expected in plan['sample_sha256'].items():
        path, _ = remix_assets.asset(source, sample_id, expected)
        audio, rate = sf.read(path, dtype='float32', always_2d=True)
        if rate != RATE or not np.isfinite(audio).all():
            raise ValueError('A saved sample failed audio verification.')
        samples[sample_id] = audio

    @lru_cache(maxsize=16)
    def pitched(sample_id, semitones):
        ratio = Fraction(2 ** (-semitones / 12)).limit_denominator(1000)
        return resample_poly(samples[sample_id], ratio.numerator, ratio.denominator, axis=0).astype('float32')

    with sf.SoundFile(arranged) as reader, sf.SoundFile(out, 'w', samplerate=RATE,
            channels=len(names) * 2, subtype='FLOAT') as writer, sf.SoundFile(mix_path, 'w',
            samplerate=RATE, channels=2, subtype='FLOAT') as mix:
        for row in plan['sections']:
            length = row['end_frame'] - row['start_frame']
            processors = {name: board(chain, plan['target_bpm']) for name, chain in row.get('effects', {}).items()}
            events = []
            for part in row.get('parts', []):
                processors[part['id']] = board(part['effects'], plan['target_bpm'])
                period = part['loop_beats'] * 60 / plan['target_bpm'] * RATE
                for repetition in range(math.ceil(length / period)):
                    for note in part['notes']:
                        start = round((repetition * part['loop_beats'] + note['beat']) * 60 / plan['target_bpm'] * RATE)
                        if start >= length:
                            continue
                        # Sampler transposition changes playback speed; the note gate bounds its duration.
                        sound = pitched(part['sample_id'], note['note'] - part['root_note'])
                        duration = min(len(sound), round(note['duration_beats'] * 60 / plan['target_bpm'] * RATE), length - start)
                        events.append((start, duration, part, note))
            energy = 0.0
            for offset in range(0, length, BLOCK):
                count = min(BLOCK, length - offset)
                buffer = np.zeros((count, len(names) * 2), dtype='float32')
                buffer[:, :len(source_names) * 2] = reader.read(count, dtype='float32', always_2d=True)
                for part in row.get('parts', []):
                    if part['replaces']:
                        index = names.index(part['replaces']) * 2
                        buffer[:, index:index + 2] = 0
                for start, duration, part, note in events:
                    first, last = max(offset, start), min(offset + count, start + duration)
                    if first >= last:
                        continue
                    sound = pitched(part['sample_id'], note['note'] - part['root_note'])
                    position = np.arange(first - start, last - start)
                    fade = min(round(.003 * RATE), max(1, duration // 2))
                    envelope = np.clip(np.minimum(position / fade, (duration - 1 - position) / fade), 0, 1)
                    gain = 10 ** (part['gain_db'] / 20) * note['velocity'] / 127
                    index = names.index(part['id']) * 2
                    buffer[first - offset:last - offset, index:index + 2] += sound[first - start:last - start] * (envelope * gain)[:, None]
                for name, chain in processors.items():
                    index = names.index(name) * 2
                    buffer[:, index:index + 2] = chain(buffer[:, index:index + 2].T.copy(), RATE, reset=False).T
                # Effects reset at section boundaries; fade tails without extending the approved timing.
                positions = np.arange(offset, offset + count)
                fade = min(round(.005 * RATE), length // 2)
                envelope = np.clip(np.minimum(1, np.minimum(positions / fade, (length - 1 - positions) / fade)), 0, 1)
                for name in processors:
                    index = names.index(name) * 2
                    buffer[:, index:index + 2] *= envelope[:, None]
                if not np.isfinite(buffer).all():
                    raise ValueError('An instrument or effect produced invalid audio.')
                combined = buffer.reshape(count, len(names), 2).sum(axis=1)
                energy += float(np.sum(combined.astype('float64') ** 2))
                writer.write(buffer)
                mix.write(combined)
            if 10 * math.log10(max(energy / (length * 2), 1e-20)) < -60:
                raise ValueError(f"{row['name']} is silent or too quiet after processing. Review the parts and effects.")
    for sample_id, expected in plan['sample_sha256'].items():
        remix_assets.asset(source, sample_id, expected)
    return out, mix_path
