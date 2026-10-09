import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('release_manifest', Path(__file__).parents[2] / 'scripts/write_release_manifest.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ReleaseManifestTests(unittest.TestCase):
    def test_preserves_bridge_and_marks_both_deployed_components(self):
        old = {'release': 'previous', 'bridge_version': '1.3.6', 'bridge_commit': 'bridge-sha'}
        result = module.manifest(old, 'a' * 40, 'arn:aws:ecs:us-east-1:123:task-definition/beatmind-api:77')
        self.assertEqual(result['bridge_version'], old['bridge_version'])
        self.assertEqual(result['bridge_commit'], old['bridge_commit'])
        self.assertEqual(result['frontend_commit'], result['backend_commit'])
        self.assertEqual(result['backend_task'], 'beatmind-api:77')
        self.assertEqual(old['release'], 'previous')

    def test_rejects_wrong_service_and_incomplete_commit(self):
        for sha, task in [('short', 'beatmind-api:77'), ('a' * 40, 'other-api:77')]:
            with self.assertRaises(ValueError):
                module.manifest({}, sha, task)
