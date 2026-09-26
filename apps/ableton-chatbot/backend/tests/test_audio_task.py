import copy
import importlib.util
import unittest
from pathlib import Path


spec = importlib.util.spec_from_file_location(
    'prepare_audio_task', Path(__file__).resolve().parents[2] / 'scripts' / 'prepare_audio_task.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class AudioTaskTests(unittest.TestCase):
    ARN = ('arn:aws:secretsmanager:us-east-1:134607809447:secret:'
           'beatmind/production/audio-provider-Ab1234')

    def setUp(self):
        self.task = {
            'family': 'beatmind-api', 'revision': 19, 'taskDefinitionArn': 'old',
            'executionRoleArn': 'unchanged', 'volumes': [{'name': 'data'}],
            'placementConstraints': [],
            'containerDefinitions': [
                {'name': 'sidecar', 'image': 'unchanged'},
                {'name': 'beatmind-api', 'image': 'old', 'environment': [
                    {'name': 'SMTP_PASSWORD', 'value': 'fixture-password'},
                    {'name': 'DB_PATH', 'value': '/data/beatmind.db'},
                    {'name': 'OPENAI_API_KEY', 'value': 'fixture-old'},
                    {'name': 'BEATMIND_AUDIO_API_KEY', 'value': 'fixture-old'},
                ], 'secrets': [{'name': 'OTHER_SECRET', 'valueFrom': 'unchanged'}]},
            ],
        }

    def test_reference_only_preserves_other_settings_and_input(self):
        before = copy.deepcopy(self.task)
        result = module.prepare_task(self.task, 'registry/release:tested', self.ARN,
                                     {'SMTP_PASSWORD': ''})
        self.assertEqual(self.task, before)
        container = result['containerDefinitions'][1]
        env = {e['name']: e['value'] for e in container['environment']}
        secrets = {e['name']: e['valueFrom'] for e in container['secrets']}
        self.assertNotIn('OPENAI_API_KEY', env)
        self.assertNotIn('BEATMIND_AUDIO_API_KEY', env)
        self.assertEqual(secrets['BEATMIND_AUDIO_API_KEY'], self.ARN + ':BEATMIND_AUDIO_API_KEY::')
        self.assertEqual(secrets['OTHER_SECRET'], 'unchanged')
        self.assertEqual(env['SMTP_PASSWORD'], 'fixture-password')
        self.assertEqual(env['DB_PATH'], '/data/beatmind.db')
        self.assertEqual(env['BEATMIND_AUDIO_LISTENING_ENABLED'], '0')
        self.assertEqual(env['BEATMIND_AUDIO_KEY_ROTATION_CONFIRMED'], '1')
        self.assertEqual(result['volumes'], before['volumes'])
        self.assertEqual(result['containerDefinitions'][0], before['containerDefinitions'][0])
        self.assertNotIn('revision', result)
        self.assertNotIn('taskDefinitionArn', result)

    def test_explicit_smtp_replacement_has_no_duplicate_secret(self):
        self.task['containerDefinitions'][1]['secrets'].append(
            {'name': 'SMTP_PASSWORD', 'valueFrom': 'old-reference'})
        result = module.prepare_task(self.task, 'new-image', self.ARN,
                                     {'SMTP_PASSWORD': 'new-fixture-password'})
        container = result['containerDefinitions'][1]
        self.assertNotIn('SMTP_PASSWORD', [s['name'] for s in container['secrets']])
        self.assertIn({'name': 'SMTP_PASSWORD', 'value': 'new-fixture-password'}, container['environment'])

    def test_rejects_value_or_wrong_secret(self):
        for bad in ('sk-not-a-real-key', self.ARN.replace('production', 'staging'),
                    self.ARN.replace('134607809447', '000000000000')):
            with self.subTest(arn=bad), self.assertRaises(ValueError):
                module.prepare_task(self.task, 'new-image', bad)

    def test_rejects_other_task_family(self):
        self.task['family'] = 'another-service'
        with self.assertRaises(ValueError):
            module.prepare_task(self.task, 'new-image', self.ARN)

    def test_rejects_missing_target_container(self):
        self.task['containerDefinitions'].pop()
        with self.assertRaises(ValueError):
            module.prepare_task(self.task, 'new-image', self.ARN)

    def test_repeated_preparation_is_idempotent(self):
        once = module.prepare_task(self.task, 'new-image', self.ARN)
        self.assertEqual(once, module.prepare_task(once, 'new-image', self.ARN))
