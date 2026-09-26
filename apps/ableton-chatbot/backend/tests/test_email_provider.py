import os
import unittest
from email import policy
from email.parser import BytesParser
from html.parser import HTMLParser
from unittest.mock import patch, MagicMock

from main import _send_reset_email
from security import enforce_secrets


class EmailProviderTests(unittest.TestCase):
    def test_reset_link_survives_plain_text_and_html_rendering(self):
        url = 'https://www.beatmind.io/reset-password?token=test&source=email'
        client = MagicMock()
        with patch.dict(os.environ, {"BEATMIND_EMAIL_PROVIDER": "ses"}), \
                patch("boto3.client", return_value=client):
            _send_reset_email("recipient@example.com", url)
        message = BytesParser(policy=policy.default).parsebytes(
            client.send_raw_email.call_args.kwargs["RawMessage"]["Data"])
        parts = list(message.iter_parts())
        self.assertEqual([p.get_content_type() for p in parts], ["text/plain", "text/html"])
        self.assertIn(url, parts[0].get_content())
        links, visible = [], []

        class LinkParser(HTMLParser):
            def handle_starttag(self, tag, attrs):
                if tag == "a":
                    links.append(dict(attrs).get("href"))

            def handle_data(self, data):
                visible.append(data)

        LinkParser().feed(parts[1].get_content())
        self.assertEqual(links, [url, url])
        self.assertIn(url, "".join(visible))

    def test_ses_delivery_uses_verified_sender(self):
        client = MagicMock()
        client.send_raw_email.return_value = {"MessageId": "test-id"}
        with patch.dict(os.environ, {"BEATMIND_EMAIL_PROVIDER": "ses", "SMTP_USER": "support@beatmind.io"}), \
                patch("boto3.client", return_value=client), patch("smtplib.SMTP") as smtp:
            _send_reset_email("recipient@example.com", "https://www.beatmind.io/reset-password?token=test")
        smtp.assert_not_called()
        args = client.send_raw_email.call_args.kwargs
        self.assertEqual(args["Source"], "support@beatmind.io")
        self.assertEqual(args["Destinations"], ["recipient@example.com"])
        self.assertIn(b"Reset your BeatMind password", args["RawMessage"]["Data"])

    def test_ses_errors_do_not_fallback_to_smtp(self):
        with patch.dict(os.environ, {"BEATMIND_EMAIL_PROVIDER": "ses"}), \
                patch("boto3.client", side_effect=RuntimeError("unavailable")), patch("smtplib.SMTP") as smtp:
            with self.assertRaises(RuntimeError):
                _send_reset_email("recipient@example.com", "https://example.com")
        smtp.assert_not_called()

    def test_bedrock_does_not_require_anthropic_key(self):
        with patch.dict(os.environ, {"BEATMIND_AI_PROVIDER": "bedrock", "JWT_SECRET": "test"}, clear=True):
            enforce_secrets()

    def test_anthropic_still_requires_key(self):
        with patch.dict(os.environ, {"BEATMIND_AI_PROVIDER": "anthropic", "JWT_SECRET": "test"}, clear=True):
            with self.assertRaises(RuntimeError):
                enforce_secrets()
