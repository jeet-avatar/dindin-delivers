import tempfile
import unittest
from pathlib import Path

import numpy as np
import soundfile as sf

import remix_render as remix


class RemixRenderTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / 'source'
        self.source.mkdir()
        self.output = self.root / 'output'
        self.output.mkdir()
        rate = remix.RATE
        t = np.arange(rate * 8) / rate
        tone = np.round(.08 * np.sin(2 * np.pi * 220 * t) * 2 ** 23) / 2 ** 23
        for name, audio in [('bass', tone), ('other', -tone), ('drums', .1 * np.sin(2 * np.pi * 60 * t) * np.exp(-(t % .5) * 20))]:
            sf.write(self.source / f'{name}.wav', np.column_stack([audio, audio]), rate, subtype='PCM_24')
        self.timing = {'analysis_id': 'a' * 64, 'revision': 1, 'status': 'confirmed', 'bpm': 120,
                       'sections': [{'name': 'A', 'start_seconds': 0, 'end_seconds': 4},
                                    {'name': 'B', 'start_seconds': 4, 'end_seconds': 8}]}
        self.names = ['bass', 'other', 'drums']

    def recipe(self, bpm=120, segments=None):
        return remix.Recipe(analysis_id='a' * 64, timing_revision=1, target_bpm=bpm,
            segments=segments or [{'section': index, 'levels': {name: 0 for name in self.names}} for index in [1, 0]])

    def test_same_tempo_stems_sum_to_preview_and_sources_are_unchanged(self):
        before = {name: remix.digest(self.source / f'{name}.wav') for name in self.names}
        plan = remix.compile_recipe(self.recipe(), self.timing, self.names)
        result = remix.render(self.source, self.output, plan)
        self.assertEqual(result['source_sha256'], before)
        self.assertEqual(result['frames'], remix.RATE * 8)
        self.assertLessEqual(result['true_peak_dbtp'], -1)
        mix, rate = sf.read(self.output / 'mix.wav')
        self.assertEqual(rate, remix.RATE)
        stems = [sf.read(self.output / f'{name}.wav')[0] for name in self.names]
        np.testing.assert_allclose(sum(stems), mix, atol=5e-7)
        np.testing.assert_allclose(stems[0] + stems[1], 0, atol=5e-7)
        self.assertGreater(np.max(np.abs(mix)), .01)
        self.assertEqual(before, {name: remix.digest(self.source / f'{name}.wav') for name in self.names})

    def test_changed_tempo_shares_frame_map_and_preserves_correlated_stems(self):
        plan = remix.compile_recipe(self.recipe(bpm=150), self.timing, self.names)
        result = remix.render(self.source, self.output, plan)
        self.assertEqual(result['frames'], round(8 / 1.25 * remix.RATE))
        self.assertTrue(all(f['frames'] == result['frames'] for f in result['files'].values()))
        a = sf.read(self.output / 'bass.wav')[0]
        b = sf.read(self.output / 'other.wav')[0]
        np.testing.assert_allclose(a + b, 0, atol=5e-7)
        frequency = np.fft.rfftfreq(len(a), 1 / remix.RATE)[np.abs(np.fft.rfft(a[:, 0])).argmax()]
        self.assertAlmostEqual(frequency, 220, delta=2)

    def test_slower_tempo_and_48khz_source_preserve_pitch_and_exact_duration(self):
        t = np.arange(48000 * 8) / 48000
        sound = .1 * np.sin(2 * np.pi * 220 * t)
        sf.write(self.source / 'bass.wav', np.column_stack([sound, sound]), 48000, subtype='PCM_24')
        recipe = self.recipe(bpm=96, segments=[{'section': i, 'levels': {'bass': 0}} for i in [0, 1]])
        plan = remix.compile_recipe(recipe, self.timing, ['bass'])
        result = remix.render(self.source, self.output, plan)
        self.assertEqual(result['frames'], 10 * remix.RATE)
        audio, rate = sf.read(self.output / 'mix.wav')
        frequency = np.fft.rfftfreq(len(audio), 1 / rate)[np.abs(np.fft.rfft(audio[:, 0])).argmax()]
        self.assertAlmostEqual(frequency, 220, delta=2)

    def test_all_seven_detailed_stems_share_the_output_frame_map(self):
        names = ['kick', 'snare', 'toms', 'cymbals', 'bass', 'vocals', 'other']
        t = np.arange(remix.RATE * 8) / remix.RATE
        for index, name in enumerate(names):
            audio = .02 * np.sin(2 * np.pi * (110 + index * 40) * t)
            sf.write(self.source / f'{name}.wav', np.column_stack([audio, audio]), remix.RATE, subtype='PCM_24')
        recipe = self.recipe(bpm=132, segments=[{'section': i, 'levels': {name: 0 for name in names}} for i in [1, 0]])
        plan = remix.compile_recipe(recipe, self.timing, names)
        result = remix.render(self.source, self.output, plan)
        audio = [sf.read(self.output / f'{name}.wav')[0] for name in names]
        self.assertTrue(all(len(stem) == result['frames'] for stem in audio))
        np.testing.assert_allclose(sum(audio), sf.read(self.output / 'mix.wav')[0], atol=1e-6)

    def test_recipe_rejects_stale_timing_unknown_stems_invalid_levels_and_duration(self):
        for recipe in [self.recipe().model_copy(update={'timing_revision': 2}), self.recipe(bpm=180),
                       self.recipe(segments=[{'section': 4, 'levels': {'bass': 0}}]),
                       self.recipe(segments=[{'section': 0, 'repeats': 2, 'levels': {'missing': 0}}]),
                       self.recipe(segments=[{'section': 0, 'repeats': 2, 'levels': {'bass': float('nan')}}]),
                       self.recipe(segments=[{'section': 0, 'levels': {'bass': 0}}])]:
            with self.assertRaises(ValueError):
                remix.compile_recipe(recipe, self.timing, self.names)

    def test_misaligned_sources_and_silent_sections_are_not_published(self):
        plan = remix.compile_recipe(self.recipe(), self.timing, self.names)
        sf.write(self.source / 'bass.wav', np.zeros((remix.RATE * 7, 2)), remix.RATE)
        with self.assertRaisesRegex(ValueError, 'identical'):
            remix.render(self.source, self.output, plan)
        for name in self.names:
            sf.write(self.source / f'{name}.wav', np.zeros((remix.RATE * 8, 2)), remix.RATE)
        with self.assertRaisesRegex(ValueError, 'silent'):
            remix.render(self.source, self.output, plan)

    def test_section_mutes_remain_silent_in_aligned_stem(self):
        recipe = self.recipe(segments=[{'section': 0, 'levels': {'bass': -6, 'drums': 0}},
                                       {'section': 1, 'levels': {'drums': 0}}])
        result = remix.render(self.source, self.output, remix.compile_recipe(recipe, self.timing, self.names))
        self.assertEqual(result['stems'], ['bass', 'drums'])
        bass = sf.read(self.output / 'bass.wav')[0]
        self.assertGreater(np.max(np.abs(bass[:remix.RATE * 4])), 0)
        self.assertEqual(np.max(np.abs(bass[remix.RATE * 4:])), 0)
