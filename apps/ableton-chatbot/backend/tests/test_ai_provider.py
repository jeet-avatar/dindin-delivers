import os
import unittest
from unittest.mock import patch

import anthropic
import httpx

from ai_provider import create_client, failure_message, model_name


class ProviderTests(unittest.TestCase):
    @patch.dict(os.environ, {}, clear=True)
    def test_default_provider_requires_key(self):
        self.assertIsNone(create_client())
        self.assertEqual(model_name(), "claude-haiku-4-5-20251001")

    @patch.dict(os.environ, {"BEATMIND_AI_PROVIDER": "bedrock", "AWS_REGION": "us-east-1"}, clear=True)
    def test_explicit_bedrock_uses_aws_client_and_profile(self):
        with patch("ai_provider.anthropic.AsyncAnthropicBedrock") as client:
            self.assertIs(create_client(), client.return_value)
            client.assert_called_once_with(aws_region="us-east-1", max_retries=6)
        self.assertEqual(model_name(), "us.anthropic.claude-haiku-4-5-20251001-v1:0")

    @patch.dict(os.environ, {"BEATMIND_AI_PROVIDER": "unknown"}, clear=True)
    def test_invalid_provider_fails_early(self):
        with self.assertRaises(ValueError):
            create_client()

    def test_credit_failure_before_actions_is_explicit(self):
        error = anthropic.BadRequestError("failed", response=httpx.Response(400, request=httpx.Request("POST", "https://example.com")),
                                          body={"error": {"message": "Your credit balance is too low"}})
        message = failure_message(error, False)
        self.assertIn("insufficient credits", message)
        self.assertIn("No Ableton actions were started", message)
        self.assertNotIn("Some actions", message)

    def test_error_after_actions_retains_uncertainty(self):
        self.assertIn("Some actions may already have run", failure_message(RuntimeError("private data"), True))
        self.assertNotIn("private data", failure_message(RuntimeError("private data"), True))


if __name__ == "__main__":
    unittest.main()


class BedrockRetryTests(unittest.TestCase):
    def test_bedrock_client_retries_transient_errors(self):
        import os
        from unittest.mock import patch
        import ai_provider
        with patch.dict(os.environ, {"BEATMIND_AI_PROVIDER": "bedrock"}):
            self.assertEqual(ai_provider.create_client().max_retries, 6)
