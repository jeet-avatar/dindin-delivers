import os
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

import anthropic
import httpx

from ai_provider import create_client, failure_message, model_name, request_message


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

    def test_transient_provider_failure_is_not_configuration_rejection(self):
        for status in (500, 502, 503, 504, 529):
            with self.subTest(status=status):
                error = anthropic.APIStatusError("private upstream details",
                    response=httpx.Response(status, request=httpx.Request("POST", "https://example.com")),
                    body={"message": "private upstream details"})
                message = failure_message(error, False)
                self.assertIn("temporarily unavailable after retries", message)
                self.assertIn("No Ableton actions were started", message)
                self.assertNotIn("configuration", message)
                self.assertNotIn("private upstream details", message)
                self.assertIn("Some actions may already have run", failure_message(error, True))


if __name__ == "__main__":
    unittest.main()


class BedrockRetryTests(unittest.TestCase):
    def test_bedrock_client_retries_transient_errors(self):
        import os
        from unittest.mock import patch
        import ai_provider
        with patch.dict(os.environ, {"BEATMIND_AI_PROVIDER": "bedrock"}):
            self.assertEqual(ai_provider.create_client().max_retries, 6)


class ModelFallbackTests(unittest.IsolatedAsyncioTestCase):
    def error(self, status):
        return anthropic.APIStatusError('unavailable', response=httpx.Response(
            status, request=httpx.Request('POST', 'https://example.com')), body={})

    @patch.dict(os.environ, {'BEATMIND_FALLBACK_MODEL': 'backup'}, clear=True)
    async def test_primary_success_does_not_call_backup(self):
        client = MagicMock()
        client.messages.create = AsyncMock(return_value='response')
        self.assertEqual(await request_message(client, model='primary', messages=[]), ('response', 'primary'))
        client.messages.create.assert_awaited_once_with(model='primary', messages=[])

    @patch.dict(os.environ, {'BEATMIND_FALLBACK_MODEL': 'backup'}, clear=True)
    async def test_transient_failure_reuses_only_model_request_and_reports_actual_model(self):
        for status in (500, 502, 503, 504, 529):
            client, emit = MagicMock(), AsyncMock()
            client.messages.create = AsyncMock(side_effect=[self.error(status), 'response'])
            history = [{'role': 'user', 'content': 'continue'}]
            result = await request_message(client, model='primary', emit=emit, messages=history, tools=[])
            self.assertEqual(result, ('response', 'backup'))
            self.assertEqual(client.messages.create.await_count, 2)
            client.messages.create.assert_awaited_with(model='backup', messages=history, tools=[])
            emit.assert_awaited_once()

    @patch.dict(os.environ, {'BEATMIND_FALLBACK_MODEL': 'backup'}, clear=True)
    async def test_auth_bad_request_and_rate_limit_do_not_fallback(self):
        for status in (400, 401, 403, 429):
            client = MagicMock()
            client.messages.create = AsyncMock(side_effect=self.error(status))
            with self.assertRaises(anthropic.APIStatusError):
                await request_message(client, model='primary', messages=[])
            self.assertEqual(client.messages.create.await_count, 1)

    async def test_missing_or_already_active_fallback_does_not_repeat(self):
        for fallback in ('', 'primary'):
            with patch.dict(os.environ, {'BEATMIND_FALLBACK_MODEL': fallback}, clear=True):
                client = MagicMock()
                client.messages.create = AsyncMock(side_effect=self.error(503))
                with self.assertRaises(anthropic.APIStatusError):
                    await request_message(client, model='primary', messages=[])
                self.assertEqual(client.messages.create.await_count, 1)

    @patch.dict(os.environ, {'BEATMIND_AI_PROVIDER': 'bedrock', 'BEATMIND_FALLBACK_MODEL': 'backup'}, clear=True)
    async def test_fallback_has_bounded_primary_retries(self):
        with patch('ai_provider.anthropic.AsyncAnthropicBedrock') as client:
            create_client()
        client.assert_called_once_with(aws_region='us-east-1', max_retries=2)

    @patch.dict(os.environ, {'BEATMIND_FALLBACK_MODEL': 'backup'}, clear=True)
    async def test_backup_failure_propagates_without_more_attempts(self):
        client = MagicMock()
        client.messages.create = AsyncMock(side_effect=self.error(503))
        with self.assertRaises(anthropic.APIStatusError):
            await request_message(client, model='primary', messages=[])
        self.assertEqual(client.messages.create.await_count, 2)
