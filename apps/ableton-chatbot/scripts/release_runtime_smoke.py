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
import remix_render
import remix_assets
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
        remix = root / 'remix'
        remix.mkdir()
        timing = {'status': 'confirmed', 'analysis_id': 'a' * 64, 'revision': 1, 'bpm': 120,
                  'sections': [{'name': 'Fixture', 'start_seconds': 0, 'end_seconds': 6}]}
        recipe = remix_render.Recipe(analysis_id='a' * 64, timing_revision=1, target_bpm=125,
                                    segments=[{'section': 0, 'levels': {'drums': 0, 'bass': -3, 'other': -6}}])
        plan = remix_render.compile_recipe(recipe, timing, ['drums', 'bass', 'other'])
        rendered = remix_render.render(reference, remix, plan)
        mixed, sr = sf.read(remix / 'mix.wav')
        summed = sum(sf.read(remix / f'{name}.wav')[0] for name in rendered['stems'])
        assert sr == 44100 and len(mixed) == plan['frames']
        assert np.max(np.abs(mixed - summed)) < 1e-6
        assert rendered['true_peak_dbtp'] <= -1
        sample_id = 'b' * 32
        asset = reference / 'remix-samples' / sample_id
        asset.mkdir(parents=True)
        sf.write(asset / 'audio.wav', np.column_stack((bass[:rate], bass[:rate])), rate, subtype='FLOAT')
        references.write_json(asset / 'sample.json', {'id': sample_id, 'name': 'Synthetic bass.wav',
            'sha256': remix_assets.sha256(asset / 'audio.wav')})
        creative = root / 'creative-remix'
        creative.mkdir()
        edited = recipe.model_dump()
        edited['segments'][0]['parts'] = [{'id': 'part_bass', 'name': 'Sampled bass', 'sample_id': sample_id,
            'root_note': 45, 'gain_db': -6, 'loop_beats': 4, 'replaces': 'bass',
            'notes': [{'beat': beat, 'duration_beats': .5, 'note': 57, 'velocity': 100} for beat in range(4)],
            'effects': [{'kind': 'delay', 'beats': .75, 'mix': .15}, {'kind': 'reverb', 'mix': .1}]}]
        edited['segments'][0]['effects'] = {'drums': [{'kind': 'highpass', 'frequency_hz': 30},
            {'kind': 'eq', 'frequency_hz': 200, 'gain_db': -3}, {'kind': 'compressor'},
            {'kind': 'lowpass', 'frequency_hz': 16000}]}
        creative_plan = remix_render.compile_recipe(remix_render.Recipe(**edited), timing,
            ['drums', 'bass', 'other'], remix_assets.catalog(reference))
        creative_result = remix_render.render(reference, creative, creative_plan)
        creative_mix, _ = sf.read(creative / 'mix.wav')
        assert len(creative_mix) == plan['frames'] and creative_result['true_peak_dbtp'] <= -1
        assert np.max(np.abs(sf.read(creative / 'part_bass.wav')[0])) > .01
        assert np.max(np.abs(sf.read(creative / 'bass.wav')[0])) == 0
        np.testing.assert_allclose(sum(sf.read(creative / f'{name}.wav')[0] for name in creative_result['stems']),
                                   creative_mix, atol=1e-6)
        chat_store.ROOT = root / 'chats'
        session = SimpleNamespace(user_id=123, session_id='smoke',
                                  messages=[{'role': 'user', 'content': 'Inspect only'}],
                                  actions=[], ui_messages=[])
        chat_store.save(session, 'complete')
        assert chat_store.load(123, 'smoke')['messages'] == session.messages
        assert chat_store.load(456, 'smoke') is None
        print(json.dumps({'runtime': 'passed', 'cached_separation': True,
                          'aligned_stems': 4, 'non_silent_comparison_previews': 2,
                          'automatic_remix_tempo_and_alignment': True,
                          'sampled_instrument_replacement_and_six_effects': True,
                          'owner_scoped_chat_storage': True}), flush=True)


if __name__ == '__main__':
    main()
