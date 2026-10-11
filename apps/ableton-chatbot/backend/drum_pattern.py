"""Read a drum part's hits out of a reference stem and place them on the reference's beat grid.

The result is written into Ableton by the model with add_notes, so the copy keeps the reference's
exact rhythm and accents. Sounds are not recovered: only where each hit falls and how hard it is.
"""

from collections import Counter

import json

import numpy as np

import reference_timing

PARTS = ('kick', 'snare')
STEPS_PER_BEAT = 4          # Hits are placed on 16th notes.
BLEED_RATIO = 0.2           # Quieter hits than this (vs the loud ones) are spill from other drums.
SR = 22050
HOP = 128


def _audio(directory, part):
    import librosa
    own = directory / f'{part}.wav'
    if own.is_file():
        y, _ = librosa.load(own, sr=SR, mono=True)
        return y, part
    drums = directory / 'drums.wav'
    if part == 'kick' and drums.is_file():
        # Without a separate kick stem, the kick is the low end of the drums stem.
        from scipy.signal import butter, sosfiltfilt
        y, _ = librosa.load(drums, sr=SR, mono=True)
        return sosfiltfilt(butter(4, 150, 'lowpass', fs=SR, output='sos'), y), 'drums (below 150 Hz)'
    return None, None


def _hits(y):
    import librosa
    envelope = librosa.onset.onset_strength(y=y, sr=SR, hop_length=HOP)
    frames = librosa.onset.onset_detect(onset_envelope=envelope, sr=SR, hop_length=HOP, units='frames')
    times = librosa.frames_to_time(frames, sr=SR, hop_length=HOP)
    window = int(0.05 * SR)
    peaks = np.array([float(np.max(np.abs(y[int(t * SR):int(t * SR) + window]))) if int(t * SR) < len(y) else 0.0
                      for t in times])
    if not len(peaks):
        return [], []
    loud = np.percentile(peaks, 95)
    keep = peaks >= BLEED_RATIO * loud
    return times[keep], peaks[keep] / max(loud, 1e-9)


def _beat_phase(beat_times, period, hits):
    """Where beats fall within one beat period, from the analysed beats (or the hits when there are none)."""
    source = np.asarray(beat_times if len(beat_times) >= 8 else hits, dtype=float)
    angles = 2 * np.pi * (source % period) / period
    return (np.angle(np.mean(np.exp(1j * angles))) % (2 * np.pi)) / (2 * np.pi) * period


def _bar_patterns(steps, steps_per_bar):
    bars = {}
    for step in steps:
        bars.setdefault(int(step) // steps_per_bar, set()).add(int(step) % steps_per_bar)
    return len({tuple(sorted(hits)) for hits in bars.values()})


def _downbeat(steps, steps_per_bar, beats_per_bar):
    """Which beat starts the bar: the one where changes land on bar lines (fewest different bars),
    then the one the first hit falls on, since songs usually start on bar 1."""
    first_beat = (int(steps.min()) // STEPS_PER_BEAT) % beats_per_bar
    def score(beat):
        shifted = steps - beat * STEPS_PER_BEAT
        return (_bar_patterns(shifted - shifted.min() // steps_per_bar * steps_per_bar, steps_per_bar), beat != first_beat)
    return min(range(beats_per_bar), key=score)


def _velocity(level):
    return int(np.clip(round(50 + 77 * min(level, 1.0)), 1, 127))


def extract(directory, part='kick'):
    if part not in PARTS:
        return {'status': 'failed', 'summary': f'Only {", ".join(PARTS)} patterns can be read.'}
    y, source = _audio(directory, part)
    if y is None:
        return {'status': 'failed', 'summary': (
            f"This reference has no {part} audio on BeatMind's server. References separated on the Mac keep their "
            "audio there; separate it with Cloud HQ to copy its drum pattern.")}
    report = json.loads((directory / 'report.json').read_text())
    timing = reference_timing.read(directory)
    bpm = float(timing['bpm'])
    period = 60.0 / bpm
    beats_per_bar = timing['numerator'] * 4 / timing['denominator']
    times, levels = _hits(y)
    if len(times) < 4:
        return {'status': 'failed', 'summary': f'Too few {part} hits were found to read a pattern.'}

    phase = _beat_phase(report.get('beat_times_seconds') or [], period, times)
    positions = (times - phase) / period                          # In beats from the first grid beat.
    steps = np.round(positions * STEPS_PER_BEAT).astype(int)
    off_ms = (positions - steps / STEPS_PER_BEAT) * period * 1000
    steps_per_bar = int(round(beats_per_bar * STEPS_PER_BEAT))
    downbeat = _downbeat(steps, steps_per_bar, int(beats_per_bar))
    steps = steps - downbeat * STEPS_PER_BEAT
    start_seconds = phase + downbeat * period
    if steps.min() < 0:
        shift = -(steps.min() // steps_per_bar) * steps_per_bar
        steps += shift
        start_seconds -= shift / STEPS_PER_BEAT * period

    bars = {}
    for step, level in zip(steps, levels):
        bar, within = divmod(int(step), steps_per_bar)
        notes = bars.setdefault(bar, {})
        notes[within] = max(notes.get(within, 0), _velocity(level))
    signature = {bar: tuple(sorted(notes)) for bar, notes in bars.items()}
    ranked = [pattern for pattern, _ in Counter(signature.values()).most_common()]
    names = {pattern: chr(ord('A') + i) if i < 26 else f'P{i}' for i, pattern in enumerate(ranked)}

    patterns = {}
    for pattern in ranked[:8]:
        members = [bar for bar, sig in signature.items() if sig == pattern]
        notes = [{'start': step / STEPS_PER_BEAT, 'duration': 0.25,
                  'velocity': int(round(np.median([bars[bar][step] for bar in members])))} for step in pattern]
        patterns[names[pattern]] = {'bars_using_it': len(members), 'notes': notes}

    last_bar = max(bars)
    timeline, run = [], None
    for bar in range(last_bar + 1):
        name = names.get(signature.get(bar), None) if bar in signature else 'silent'
        if run and run['pattern'] == name:
            run['to_bar'] = bar + 1
        else:
            run = {'from_bar': bar + 1, 'to_bar': bar + 1, 'pattern': name}
            timeline.append(run)
    on_grid = float(np.mean(np.abs(off_ms) <= 20))
    main = names[ranked[0]]
    return {
        'status': 'observed', 'part': part, 'source': source, 'bpm': round(bpm, 2),
        'time_signature': f"{timing['numerator']}/{timing['denominator']}", 'beats_per_bar': beats_per_bar,
        'timing_reviewed': timing.get('status') == 'confirmed',
        'bar_1_starts_at_seconds': round(float(start_seconds), 3),
        'hits': int(len(times)), 'hits_on_16th_grid': round(on_grid, 2),
        'main_pattern': main, 'patterns': patterns, 'timeline': timeline[:64],
        'summary': (f"Read {len(times)} {part} hits at {bpm:g} BPM. Pattern {main} is used in "
                    f"{patterns[main]['bars_using_it']} bars; positions are in beats from the start of the bar."),
        'limitations': [
            'Hit positions are snapped to 16th notes; velocities come from how loud each hit is.',
            'Bar 1 is placed on the beat with the strongest kick; check it against the reference.',
            'This copies rhythm and accents only, not the kick sound itself.',
            *([] if timing.get('status') == 'confirmed' else ['The tempo is an estimate until the timing map is reviewed.']),
        ],
    }
