"""Run inside the release image with networking disabled and no credentials."""

import json
import os
from pathlib import Path
import tempfile
from types import SimpleNamespace

import numpy as np
import soundfile as sf

import chat_store
import references
from reference_worker import analyze
from sound_comparison import ComparisonRequest, render_comparison, capability


def main():
    assert os.getuid() != 0, 'Run as the image application user.'
    assert references.capability()['available'] and references.cached_model_ready()
    assert capability()['available']
    with tempfile.TemporaryDirectory(dir='/data', prefix='release-smoke-') as temporary:
        root = Path(temporary)
        reference = root / 'reference'
        reference.mkdir()
        rate = 44100
        t = np.arange(rate * 6) / rate
        beat = t % 0.5
        kick = 0.25 * np.sin(2 * np.pi * 60 * t) * np.exp(-beat * 24)
        bass = 0.10 * np.sin(2 * np.pi * 110 * t)
        notes = 0.03 * np.sin(2 * np.pi * 440 * t)
        samples = np.column_stack((kick + bass + notes, kick + bass + notes))
        sf.write(reference / 'source.wav', samples, rate, subtype='PCM_16')
        (reference / 'meta.json').write_text(json.dumps({'source_file': 'source.wav'}))
        analyze(reference)
        report = json.loads((reference / 'report.json').read_text())
        assert report['stem_health']['checks_passed']
        assert len(report['stems']) == 4
        comparison = root / 'comparison'
        comparison.mkdir()
        render_comparison(reference / 'mix.wav', reference / 'source.wav', comparison,
                          ComparisonRequest(recording_id='a' * 32, layer='mix', duration_seconds=2))
        result = json.loads((comparison / 'report.json').read_text())
        assert result['status'] == 'measured'
        for side in ('reference', 'candidate'):
            audio, sr = sf.read(comparison / f'{side}.wav')
            assert sr == rate and len(audio) == rate * 2
            assert np.max(np.abs(audio)) > 0.01
        chat_store.ROOT = root / 'chats'
        session = SimpleNamespace(user_id=123, session_id='smoke',
                                  messages=[{'role': 'user', 'content': 'Inspect only'}],
                                  actions=[], ui_messages=[])
        chat_store.save(session, 'complete')
        assert chat_store.load(123, 'smoke')['messages'] == session.messages
        assert chat_store.load(456, 'smoke') is None
        print(json.dumps({'runtime': 'passed', 'cached_separation': True,
                          'aligned_stems': 4, 'non_silent_comparison_previews': 2,
                          'owner_scoped_chat_storage': True}), flush=True)


if __name__ == '__main__':
    main()
