from pathlib import Path
import ssl
import sys
import unittest
from urllib.error import HTTPError, URLError

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'bridge'))
from bridge_network import tls_context, connection_error


class BridgeNetworkTests(unittest.TestCase):
    def test_packaged_ca_keeps_hostname_and_chain_verification(self):
        context = tls_context()
        self.assertTrue(context.check_hostname)
        self.assertEqual(context.verify_mode, ssl.CERT_REQUIRED)
        self.assertGreater(context.cert_store_stats()['x509_ca'], 0)

    def test_auth_failures_are_not_reported_as_connectivity(self):
        for code, text in [(401, 'password'), (403, 'access denied'), (429, 'Too many'), (503, 'temporarily')]:
            with self.subTest(code=code):
                error = HTTPError('https://api.beatmind.io', code, 'private fixture', {}, None)
                self.assertIn(text, connection_error(error))
                self.assertNotIn('private fixture', connection_error(error))

    def test_tls_network_and_invalid_responses_are_distinct(self):
        self.assertIn('Secure connection', connection_error(URLError(ssl.SSLCertVerificationError())))
        self.assertIn('internet', connection_error(URLError(OSError('private fixture'))))
        self.assertIn('Unexpected', connection_error(ValueError('private fixture')))
