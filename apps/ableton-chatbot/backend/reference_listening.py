"""Durable coverage accounting. Passing checks does not establish musical truth."""

import json
import math
import wave


def read(directory):
    path = directory / 'listening.json'
    if not path.exists():
        return {'excerpts': [], 'job': None}
    data = json.loads(path.read_text())
    if 'excerpts' not in data:
        data = {'excerpts': [{**data, 'validation': 'legacy_unchecked'}], 'job': None}
    return data


def windows(directory):
    with wave.open(str(directory / 'mix.wav'), 'rb') as source:
        duration = source.getnframes() / source.getframerate()
    count = math.ceil(duration / 30)
    if not 5 <= duration <= 600:
        raise ValueError('Reference must be 5-600 seconds.')
    return [(i * duration / count, duration / count) for i in range(count)]


def coverage(data, duration):
    intervals = sorted((max(0, e['start_seconds']), min(duration, e['end_seconds']))
                       for e in data['excerpts'] if e.get('validation') == 'checks_passed' and e.get('layer') == 'mix')
    covered, end = 0.0, 0.0
    for start, stop in intervals:
        covered += max(0, stop - max(start, end))
        end = max(end, stop)
    return {'covered_seconds': round(covered, 2), 'duration_seconds': duration,
            'coverage_percent': round(100 * covered / duration, 1) if duration else 0,
            'full_coverage': duration > 0 and duration - covered < 0.05}


def context(data):
    # Bounded, chronological evidence rather than an ever-growing chat transcript.
    excerpts = [e for e in data['excerpts'] if e.get('validation') == 'checks_passed'][-20:]
    return {'coverage': data.get('coverage'), 'job': data.get('job'),
            'excerpts': [{'start': e['start_seconds'], 'end': e['end_seconds'], 'layer': e['layer'],
                          'observations': {k: v[:350] for k, v in e.get('observations', {}).items()},
                          'evidence': e.get('evidence')} for e in excerpts]}
