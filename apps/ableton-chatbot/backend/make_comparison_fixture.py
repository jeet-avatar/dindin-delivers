"""Generate the sound-comparison browser-test fixture with the real comparison engine.

Usage: python make_comparison_fixture.py OUTPUT_DIR
Writes two synthetic bass lines (no real recordings) and the engine's own report.json.
"""

import sys
from pathlib import Path

import numpy as np
from scipy.io import wavfile

from sound_comparison import RATE, ComparisonRequest, render_comparison


def bass(frequency, level):
    time = np.arange(3 * RATE) / RATE
    envelope = np.exp(-(time % 0.5) * 6)  # one note every half beat at 120 BPM
    tone = level * envelope * np.sin(2 * np.pi * frequency * time)
    return np.stack([tone, tone], axis=1)


def main(directory):
    directory.mkdir(parents=True, exist_ok=True)
    sources = directory / 'sources'
    sources.mkdir(exist_ok=True)
    for name, samples in (('reference', bass(55, 0.5)), ('candidate', bass(58, 0.35))):
        wavfile.write(str(sources / f'{name}.wav'), RATE, (samples * 32767).astype('<i2'))
    request = ComparisonRequest(recording_id='b' * 32, layer='bass', duration_seconds=2)
    render_comparison(sources / 'reference.wav', sources / 'candidate.wav', directory, request)
    print(f'Fixture written to {directory}')


if __name__ == '__main__':
    main(Path(sys.argv[1]))
