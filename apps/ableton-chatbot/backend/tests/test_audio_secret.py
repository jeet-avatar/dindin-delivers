import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

import httpx

spec = importlib.util.spec_from_file_location('store_audio_secret',
    Path(__file__).resolve().parents[2] / 'scripts' / 'store_audio_secret.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SecretEntryTests(unittest.TestCase):
    def test_invalid_key_is_rejected_without_echo(self):
        with patch.object(module.httpx, 'get', return_value=httpx.Response(401)):
            with self.assertRaises(SystemExit) as error:
                module.validate_key('fixture-private-value')
        self.assertIn('Nothing stored', str(error.exception))
        self.assertNotIn('fixture-private-value', str(error.exception))

    def test_only_successful_authentication_passes(self):
        with patch.object(module.httpx, 'get', return_value=httpx.Response(200)) as request:
            module.validate_key('fixture-private-value')
            self.assertEqual(request.call_args.args[0], 'https://api.openai.com/v1/models')
        for status in (403, 429, 500, 302):
            with self.subTest(status=status), patch.object(module.httpx, 'get', return_value=httpx.Response(status)):
                with self.assertRaises(SystemExit):
                    module.validate_key('fixture-private-value')

    def test_network_failure_does_not_include_request_details(self):
        with patch.object(module.httpx, 'get', side_effect=httpx.ConnectError('fixture-private-value')):
            with self.assertRaises(SystemExit) as error:
                module.validate_key('fixture-private-value')
        self.assertNotIn('fixture-private-value', str(error.exception))
