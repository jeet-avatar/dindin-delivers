import asyncio
import json
import os
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

import anthropic
import httpx
from fastapi.testclient import TestClient

import ai_usage
import mixmind_ai
import security
from beatmind_auth import create_token
from database import db
from test_billing import new_user, subscriber

PATH = "/api/mixmind/ai/v1/messages"
MESSAGE = {"id": "msg_bdrk_1", "type": "message", "role": "assistant", "model": "claude-haiku-4-5-20251001",
           "content": [{"type": "text", "text": "{\"genre\":\"techno\"}"}], "stop_reason": "end_turn",
           "stop_sequence": None, "usage": {"input_tokens": 100, "output_tokens": 20,
                                            "cache_read_input_tokens": 1000, "cache_creation_input_tokens": 0}}
STREAM = [
    {"type": "message_start", "message": {"id": "msg_bdrk_2", "type": "message", "role": "assistant", "content": [],
                                          "model": "anthropic.claude-opus-5", "stop_reason": None, "stop_sequence": None,
                                          "usage": {"input_tokens": 50, "output_tokens": 1, "cache_read_input_tokens": 0,
                                                    "cache_creation_input_tokens": 200}}},
    {"type": "content_block_start", "index": 0, "content_block": {"type": "thinking", "thinking": "", "signature": ""}},
    {"type": "content_block_delta", "index": 0, "delta": {"type": "signature_delta", "signature": "sig"}},
    {"type": "content_block_stop", "index": 0},
    {"type": "content_block_start", "index": 1, "content_block": {"type": "text", "text": ""}},
    {"type": "content_block_delta", "index": 1, "delta": {"type": "text_delta", "text": "{\"ok\":"}},
    {"type": "content_block_delta", "index": 1, "delta": {"type": "text_delta", "text": "true}"}},
    {"type": "content_block_stop", "index": 1},
    {"type": "message_delta", "delta": {"stop_reason": "end_turn", "stop_sequence": None}, "usage": {"output_tokens": 40}},
    {"type": "message_stop", "amazon-bedrock-invocationMetrics": {"inputTokenCount": 50}},
]


class Event:
    def __init__(self, data):
        self.data = data

    def to_dict(self):
        return json.loads(json.dumps(self.data))


class FakeStream:
    """Bedrock's AsyncStream: iterates events, optionally pausing; records whether it was closed."""

    def __init__(self, events, pause=0.0, fail=None):
        self.events, self.pause, self.fail, self.closed = events, pause, fail, False

    def __aiter__(self):
        return self._iterate()

    async def _iterate(self):
        for data in self.events:
            if self.pause:
                await asyncio.sleep(self.pause)
            yield Event(data)
        if self.fail:
            raise self.fail

    async def close(self):
        self.closed = True


def body(**overrides):
    return {"model": "claude-haiku-4-5-20251001", "max_tokens": 2048, "system": "You pick tracks.",
            "messages": [{"role": "user", "content": "hi"}], **overrides}


def bedrock_error(status, message):
    response = httpx.Response(status, request=httpx.Request("POST", "https://bedrock"), json={"message": message})
    return anthropic.APIStatusError(message, response=response, body={"message": message})


def usage_rows(user_id):
    with db() as conn:
        return [dict(row) for row in conn.execute(
            "SELECT * FROM ai_usage WHERE user_id=? AND feature='mixmind' ORDER BY id", (user_id,))]


class MixMindTokenTests(unittest.TestCase):
    def setUp(self):
        import main
        security._rate_store.clear()
        self.client = TestClient(main.app)

    def issue(self, user):
        response = self.client.post("/api/auth/mixmind-token",
                                    headers={"Authorization": "Bearer " + create_token(user["id"], user["email"])})
        self.assertEqual(response.status_code, 200)
        return response.json()["mixmind_token"]

    def test_any_signed_in_user_gets_a_token_and_verify_accepts_it(self):
        plain = new_user()  # No plan at all: the token is still issued.
        token = self.issue(plain)
        claims = __import__("beatmind_auth").decode_token(token)
        self.assertEqual(claims["typ"], "mixmind")
        self.assertAlmostEqual((claims["exp"] - claims["iat"]) / 86400, 365, delta=0.01)
        verify = self.client.get("/api/auth/verify", headers={"Authorization": "Bearer " + token}).json()
        self.assertEqual(verify, {"user_id": str(plain["id"]), "email": plain["email"], "subscriptions": []})

        member = subscriber("studio")
        verify = self.client.get("/api/auth/verify", headers={"Authorization": "Bearer " + self.issue(member)}).json()
        self.assertEqual(verify["subscriptions"], ["beatmind", "mixmind"])
        me = self.client.get("/api/auth/me", headers={"Authorization": "Bearer " + self.issue(member)})
        self.assertEqual(me.status_code, 200)
        self.assertTrue(me.json()["mixmind_access"])

    def test_login_jwts_still_verify(self):
        member = subscriber("mixmind")
        web = create_token(member["id"], member["email"])
        verify = self.client.get("/api/auth/verify", headers={"Authorization": "Bearer " + web})
        self.assertEqual(verify.json()["subscriptions"], ["mixmind"])

    def test_issuing_needs_a_login_jwt(self):
        member = subscriber("studio")
        self.assertEqual(self.client.post("/api/auth/mixmind-token").status_code, 401)
        for other in (self.issue(member), security.create_bridge_token(member["id"])):
            response = self.client.post("/api/auth/mixmind-token", headers={"Authorization": "Bearer " + other})
            self.assertEqual(response.status_code, 401)

    def test_revoked_token_is_rejected_and_survives_restart_until_then(self):
        member = subscriber("studio")
        token = self.issue(member)
        security._token_tables_ready.clear()  # A new process: nothing lives in memory.
        self.assertEqual(security.mixmind_token_owner(token), member["id"])
        revoked = self.client.post("/api/auth/mixmind-token/revoke", json={"mixmind_token": token})
        self.assertEqual(revoked.json(), {"revoked": True})
        self.assertIsNone(security.mixmind_token_owner(token))
        self.assertEqual(self.client.get("/api/auth/verify", headers={"Authorization": "Bearer " + token}).status_code, 401)

    def test_token_kinds_never_cross(self):
        member = subscriber("studio")
        mixmind, bridge = self.issue(member), security.create_bridge_token(member["id"])
        self.assertIsNone(security.bridge_token_owner(mixmind))
        self.assertFalse(security.validate_bridge_token(mixmind))
        self.assertIsNone(security.mixmind_token_owner(bridge))
        self.assertEqual(self.client.get("/api/auth/verify", headers={"Authorization": "Bearer " + bridge}).status_code, 401)
        # MixMind tokens open only /me, /verify and the AI proxy: not the web API or billing.
        for path in ("/api/chats", "/api/stripe/usage", "/api/bridge/status"):
            response = self.client.get(path, headers={"Authorization": "Bearer " + mixmind})
            self.assertEqual(response.status_code, 401, path)
        with self.assertRaises(Exception):
            with self.client.websocket_connect(f"/ws/bridge?token={mixmind}"):
                pass

    def test_tampered_token_is_rejected(self):
        token = self.issue(subscriber("studio"))
        self.assertIsNone(security.mixmind_token_owner(token[:-4] + "AAAA"))


class MixMindDownloadTests(unittest.TestCase):
    """The installer has no public URL: only a signed-in, MixMind-entitled user gets a link, and it expires."""

    def setUp(self):
        import main
        security._rate_store.clear()
        self.client = TestClient(main.app)

    def get(self, user=None):
        headers = {"Authorization": "Bearer " + create_token(user["id"], user["email"])} if user else {}
        return self.client.get("/api/mixmind/download", headers=headers)

    def test_signed_out_is_rejected(self):
        self.assertEqual(self.get().status_code, 401)

    def test_no_mixmind_access_is_rejected(self):
        for user in (new_user(), subscriber("starter"), subscriber("pro")):
            self.assertEqual(self.get(user).status_code, 402, user.get("plan"))

    def test_mixmind_entitled_users_get_a_short_lived_presigned_url(self):
        import mixmind_download
        with patch.object(mixmind_download, "presigned_url", return_value="https://s3.example/signed") as presign:
            for user in (subscriber("studio"), subscriber("mixmind"), subscriber("starter_mixmind")):
                response = self.get(user)
                self.assertEqual(response.status_code, 200, user.get("plan"))
                body = response.json()
                self.assertEqual(body["url"], "https://s3.example/signed")
                self.assertEqual(body["expires_in"], mixmind_download.EXPIRES_IN_SECONDS)
        self.assertEqual(presign.call_count, 3)

    def test_comp_email_without_a_plan_still_gets_a_link(self):
        import mixmind_download
        user = new_user(email="tester@beatmind.io")
        with patch.dict(os.environ, {"MIXMIND_COMP_EMAILS": "tester@beatmind.io"}), \
             patch.object(mixmind_download, "presigned_url", return_value="https://s3.example/signed"):
            self.assertEqual(self.get(user).status_code, 200)


class ProxyCase(unittest.TestCase):
    """A studio subscriber with a MixMind token, and a mocked Bedrock client."""

    def setUp(self):
        import main
        security._rate_store.clear()
        self.client = TestClient(main.app)
        self.member = subscriber("studio")
        self.token = security.create_mixmind_token(self.member["id"])
        self.bedrock = MagicMock()
        self.bedrock.messages.create = AsyncMock(return_value=anthropic.types.Message.model_validate(MESSAGE))
        patcher = patch.object(mixmind_ai, "client", return_value=self.bedrock)
        patcher.start()
        self.addCleanup(patcher.stop)

    def post(self, payload, token=None, header="x-api-key"):
        headers = {}
        token = self.token if token is None else token
        if token:
            headers = {"x-api-key": token} if header == "x-api-key" else {"Authorization": "Bearer " + token}
        return self.client.post(PATH, json=payload, headers=headers)

    def stream_events(self, response):
        events = []
        for block in response.text.strip().split("\n\n"):
            name, data = block.split("\n", 1)
            events.append((name.removeprefix("event: "), json.loads(data.removeprefix("data: "))))
        return events


class MixMindProxyTests(ProxyCase):
    def test_authentication(self):
        missing = self.post(body(), token="")
        self.assertEqual(missing.status_code, 401)
        self.assertEqual(missing.json()["error"]["type"], "authentication_error")
        self.assertEqual(missing.json()["type"], "error")
        self.assertEqual(self.post(body(), token="not-a-token").status_code, 401)
        bridge = security.create_bridge_token(self.member["id"])
        self.assertEqual(self.post(body(), token=bridge).status_code, 401)
        revoked = security.create_mixmind_token(self.member["id"])
        security.revoke_mixmind_token(revoked)
        self.assertEqual(self.post(body(), token=revoked).status_code, 401)
        self.assertEqual(self.post(body(), header="bearer").status_code, 200)
        web = create_token(self.member["id"], self.member["email"])
        self.assertEqual(self.post(body(), token=web).status_code, 200)
        self.assertEqual(self.post(body()).status_code, 200)

    def test_plan_is_required(self):
        for user in (new_user(trial_days=5), subscriber("pro"), subscriber("studio", status="canceled")):
            response = self.post(body(), token=security.create_mixmind_token(user["id"]))
            self.assertEqual(response.status_code, 403)
            self.assertEqual(response.json(), {"type": "error", "error": {"type": "permission_error",
                                                                          "message": "MixMind plan required"}})
        self.bedrock.messages.create.assert_not_called()

    def test_model_allowlist_and_limits(self):
        for payload in (body(model="claude-opus-4-1"), body(model="us.anthropic.claude-opus-5"), body(max_tokens=32001),
                        body(max_tokens=0), body(max_tokens="10"), body(messages=[]), body(stream="yes")):
            response = self.post(payload)
            self.assertEqual(response.status_code, 400, payload)
            self.assertEqual(response.json()["error"]["type"], "invalid_request_error")
        bad_json = self.client.post(PATH, content=b"{", headers={"x-api-key": self.token})
        self.assertEqual(bad_json.status_code, 400)
        self.bedrock.messages.create.assert_not_called()
        huge = self.client.post(PATH, content=b"x" * (2 * 1024 * 1024 + 1), headers={"x-api-key": self.token})
        self.assertEqual(huge.status_code, 413)

    def test_models_map_to_bedrock_profiles(self):
        for public, profile in (("claude-opus-5", "us.anthropic.claude-opus-5"),
                                ("claude-sonnet-4-6", "us.anthropic.claude-sonnet-4-6"),
                                ("claude-haiku-4-5", "us.anthropic.claude-haiku-4-5-20251001-v1:0"),
                                ("claude-haiku-4-5-20251001", "us.anthropic.claude-haiku-4-5-20251001-v1:0")):
            self.assertEqual(self.post(body(model=public, max_tokens=32000)).json()["model"], public)
            self.assertEqual(self.bedrock.messages.create.call_args.kwargs["model"], profile)

    def test_non_stream_passthrough_and_usage(self):
        schema = {"type": "object", "properties": {"genre": {"type": "string"}}, "required": ["genre"]}
        tools = [{"name": "search_tracks", "description": "Find tracks", "input_schema": {"type": "object"}}]
        payload = body(tools=tools, tool_choice={"type": "auto"}, temperature=0.3, metadata={"user_id": "app-user"},
                       service_tier="auto", output_config={"format": {"type": "json_schema", "schema": schema}})
        response = self.client.post(PATH, json=payload, headers={"x-api-key": self.token, "anthropic-beta": "a-beta,b-beta"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {**MESSAGE, "model": "claude-haiku-4-5-20251001"})
        call = self.bedrock.messages.create.call_args.kwargs
        self.assertEqual((call["max_tokens"], call["messages"], call["stream"]), (2048, payload["messages"], False))
        self.assertEqual(call["extra_body"], {"system": "You pick tracks.", "tools": tools, "tool_choice": {"type": "auto"},
                                              "temperature": 0.3, "output_config": payload["output_config"]})
        self.assertEqual(call["extra_headers"], {"anthropic-beta": "a-beta,b-beta"})
        [row] = usage_rows(self.member["id"])
        self.assertEqual((row["provider"], row["model"], row["input_tokens"], row["output_tokens"], row["cache_read_tokens"]),
                         ("bedrock", "us.anthropic.claude-haiku-4-5-20251001-v1:0", 100, 20, 1000))
        self.assertAlmostEqual(row["estimated_usd"], (100 * 1 + 20 * 5 + 1000 * 0.1) / 1e6)
        self.assertEqual(row["rate_basis"], "published")

    def test_bedrock_errors_come_back_anthropic_shaped(self):
        cases = ((bedrock_error(400, "output_config: bad schema"), 400, "invalid_request_error", "output_config: bad schema"),
                 (bedrock_error(429, "Too many tokens"), 429, "rate_limit_error", None),
                 (bedrock_error(403, "AccessDenied for role"), 502, "api_error", "The AI provider rejected the request"))
        for error, status, kind, message in cases:
            self.bedrock.messages.create.side_effect = error
            response = self.post(body())
            self.assertEqual(response.status_code, status)
            self.assertEqual(response.json()["error"]["type"], kind)
            if message:
                self.assertEqual(response.json()["error"]["message"], message)
        self.assertEqual(usage_rows(self.member["id"]), [])

    def test_stream_passthrough_order_model_and_usage(self):
        stream = FakeStream(STREAM)
        self.bedrock.messages.create = AsyncMock(return_value=stream)
        response = self.post(body(model="claude-opus-5", stream=True, thinking={"type": "adaptive"}))
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.headers["content-type"].startswith("text/event-stream"))
        events = self.stream_events(response)
        self.assertEqual([name for name, _ in events], [event["type"] for event in STREAM])
        self.assertEqual(events[0][1]["message"]["model"], "claude-opus-5")
        self.assertEqual(events[1][1], STREAM[1])  # Thinking blocks pass through unchanged.
        self.assertEqual(events[-1][1], {"type": "message_stop"})
        self.assertTrue(stream.closed)
        self.assertTrue(self.bedrock.messages.create.call_args.kwargs["stream"])
        [row] = usage_rows(self.member["id"])
        self.assertEqual((row["model"], row["input_tokens"], row["output_tokens"], row["cache_write_tokens"]),
                         ("us.anthropic.claude-opus-5", 50, 40, 200))
        self.assertAlmostEqual(row["estimated_usd"], (50 * 5 + 40 * 25 + 200 * 6.25) / 1e6)

    def test_stream_sends_pings_while_bedrock_is_quiet(self):
        self.bedrock.messages.create = AsyncMock(return_value=FakeStream(STREAM[:1] + STREAM[-2:], pause=0.12))
        with patch.object(mixmind_ai, "PING_SECONDS", 0.05):
            events = self.stream_events(self.post(body(stream=True)))
        names = [name for name, _ in events]
        self.assertIn("ping", names)
        self.assertEqual([name for name in names if name != "ping"], ["message_start", "message_delta", "message_stop"])

    def test_stream_failure_becomes_an_error_event_and_keeps_usage(self):
        stream = FakeStream(STREAM[:3], fail=ValueError("modelStreamErrorException"))
        self.bedrock.messages.create = AsyncMock(return_value=stream)
        events = self.stream_events(self.post(body(stream=True)))
        self.assertEqual(events[-1], ("error", {"type": "error", "error": {
            "type": "api_error", "message": "The AI provider could not complete the request"}}))
        self.assertTrue(stream.closed)
        self.assertEqual(usage_rows(self.member["id"])[0]["input_tokens"], 50)

    def test_the_anthropic_sdk_works_against_the_proxy(self):
        """The MixMind app's exact usage: base_url + api_key, messages.create and messages.stream()."""
        sdk = anthropic.Anthropic(base_url="http://testserver/api/mixmind/ai", api_key=self.token,
                                  http_client=self.client, max_retries=0)
        message = sdk.messages.create(model="claude-haiku-4-5-20251001", max_tokens=100,
                                      messages=[{"role": "user", "content": "hi"}])
        self.assertEqual(message.content[0].text, "{\"genre\":\"techno\"}")
        self.bedrock.messages.create = AsyncMock(return_value=FakeStream(STREAM))
        with sdk.messages.stream(model="claude-opus-5", max_tokens=300,
                                 messages=[{"role": "user", "content": "hi"}]) as stream:
            final = stream.get_final_message()
        self.assertEqual((final.model, final.stop_reason, final.usage.output_tokens), ("claude-opus-5", "end_turn", 40))
        self.assertEqual([block.type for block in final.content], ["thinking", "text"])
        self.assertEqual(final.content[1].text, "{\"ok\":true}")
        with self.assertRaises(anthropic.PermissionDeniedError):
            anthropic.Anthropic(base_url="http://testserver/api/mixmind/ai", http_client=self.client, max_retries=0,
                                api_key=security.create_mixmind_token(subscriber("pro")["id"])).messages.create(
                model="claude-haiku-4-5", max_tokens=10, messages=[{"role": "user", "content": "hi"}])

    def test_rate_limit(self):
        for _ in range(mixmind_ai.RATE_LIMIT_REQUESTS):
            self.assertEqual(self.post(body()).status_code, 200)
        limited = self.post(body())
        self.assertEqual(limited.status_code, 429)
        self.assertEqual(limited.json()["error"]["type"], "rate_limit_error")
        other = security.create_mixmind_token(subscriber("mixmind")["id"])
        self.assertEqual(self.post(body(), token=other).status_code, 200)  # Per user, not global.

    def test_fair_use_cap_logs_until_enforced(self):
        ai_usage.record(self.member["id"], "mixmind", "bedrock", "us.anthropic.claude-opus-5",
                        {"input_tokens": 0, "output_tokens": 400_000})  # $10 at $25/MTok.
        ai_usage.record(self.member["id"], "chat", "bedrock", "us.anthropic.claude-opus-5",
                        {"output_tokens": 4_000_000})  # BeatMind chat does not count toward MixMind's cap.
        with patch.dict(os.environ, {"MIXMIND_AI_FAIR_USE_ENFORCED": "false"}):
            self.assertEqual(self.post(body()).status_code, 200)
        with patch.dict(os.environ, {"MIXMIND_AI_FAIR_USE_ENFORCED": "true"}):
            capped = self.post(body())
            self.assertEqual(capped.status_code, 429)
            self.assertEqual(capped.json(), {"type": "error", "error": {
                "type": "rate_limit_error", "message": "Monthly MixMind AI allowance reached"}})
            with patch.dict(os.environ, {"MIXMIND_AI_CAP_USD": "50"}):
                self.assertEqual(self.post(body()).status_code, 200)


SCHEMA = {"type": "object", "properties": {"order": {"type": "array", "items": {"type": "integer"}}},
          "required": ["order"], "additionalProperties": False}
FORMAT = {"effort": "low", "format": {"type": "json_schema", "schema": SCHEMA}}
TOOL_STREAM = [
    STREAM[0], STREAM[1], STREAM[2], STREAM[3],
    {"type": "content_block_start", "index": 1, "content_block": {"type": "text", "text": ""}},
    {"type": "content_block_delta", "index": 1, "delta": {"type": "text_delta", "text": "Here is the order."}},
    {"type": "content_block_stop", "index": 1},
    {"type": "content_block_start", "index": 2, "content_block": {"type": "tool_use", "id": "toolu_1",
                                                                   "name": "structured_output", "input": {}}},
    {"type": "content_block_delta", "index": 2, "delta": {"type": "input_json_delta", "partial_json": "{\"order\": [3,"}},
    {"type": "content_block_delta", "index": 2, "delta": {"type": "input_json_delta", "partial_json": " 1, 2]}"}},
    {"type": "content_block_stop", "index": 2},
    {"type": "message_delta", "delta": {"stop_reason": "tool_use", "stop_sequence": None}, "usage": {"output_tokens": 90}},
    {"type": "message_stop"},
]


class StructuredOutputFallbackTests(ProxyCase):
    """Bedrock rejects output_config.format on Opus 5; the proxy turns it into a tool and back."""

    def test_opus_request_is_rewritten_to_a_tool(self):
        tool_message = {**MESSAGE, "model": "claude-opus-5", "stop_reason": "tool_use", "content": [
            {"type": "thinking", "thinking": "", "signature": "sig"},
            {"type": "text", "text": "Here is the order."},
            {"type": "tool_use", "id": "toolu_1", "name": "structured_output", "input": {"order": [3, 1, 2]}}]}
        self.bedrock.messages.create.return_value = anthropic.types.Message.model_validate(tool_message)
        response = self.post(body(model="claude-opus-5", system="Curate.", thinking={"type": "adaptive"}, output_config=FORMAT))
        call = self.bedrock.messages.create.call_args.kwargs["extra_body"]
        self.assertEqual(call["output_config"], {"effort": "low"})
        self.assertEqual(call["tools"][0]["input_schema"], SCHEMA)
        self.assertEqual(call["tool_choice"], {"type": "auto"})  # Forcing the tool would switch thinking off.
        self.assertTrue(call["system"].startswith("Curate.\n\n") and "structured_output" in call["system"])
        self.assertEqual(call["thinking"], {"type": "adaptive"})
        result = response.json()
        self.assertEqual(result["stop_reason"], "end_turn")
        self.assertEqual(result["content"], [{"type": "thinking", "thinking": "", "signature": "sig"},
                                             {"type": "text", "text": "{\"order\":[3,1,2]}"}])

    def test_tool_is_forced_only_without_thinking(self):
        self.post(body(model="claude-opus-5", thinking={"type": "disabled"}, output_config={"format": FORMAT["format"]},
                       system=[{"type": "text", "text": "Curate."}]))
        call = self.bedrock.messages.create.call_args.kwargs["extra_body"]
        self.assertEqual(call["tool_choice"], {"type": "tool", "name": "structured_output"})
        self.assertNotIn("output_config", call)
        self.assertEqual(call["system"][0], {"type": "text", "text": "Curate."})
        self.assertIn("structured_output", call["system"][1]["text"])

    def test_formats_other_models_accept_pass_through(self):
        for model in ("claude-haiku-4-5-20251001", "claude-sonnet-4-6"):
            self.post(body(model=model, output_config=FORMAT))
            call = self.bedrock.messages.create.call_args.kwargs["extra_body"]
            self.assertEqual(call["output_config"], FORMAT)
            self.assertNotIn("tools", call)

    def test_unexpressible_opus_formats_are_rejected(self):
        tools = [{"name": "search", "input_schema": {"type": "object"}}]
        array = {"format": {"type": "json_schema", "schema": {"type": "array"}}}
        for payload in (body(model="claude-opus-5", tools=tools, output_config=FORMAT),
                        body(model="claude-opus-5", output_config=array)):
            response = self.post(payload)
            self.assertEqual(response.status_code, 400)
            self.assertEqual(response.json()["error"]["type"], "invalid_request_error")
        self.bedrock.messages.create.assert_not_called()

    def test_stream_turns_the_tool_call_into_text(self):
        self.bedrock.messages.create = AsyncMock(return_value=FakeStream(TOOL_STREAM))
        events = self.stream_events(self.post(body(model="claude-opus-5", stream=True, output_config=FORMAT)))
        blocks = [data for name, data in events if name == "content_block_start"]
        self.assertEqual([(b["index"], b["content_block"]["type"]) for b in blocks], [(0, "thinking"), (1, "text")])
        text = "".join(data["delta"]["text"] for name, data in events
                       if name == "content_block_delta" and data["delta"]["type"] == "text_delta")
        self.assertEqual(json.loads(text), {"order": [3, 1, 2]})
        delta = next(data for name, data in events if name == "message_delta")
        self.assertEqual(delta["delta"]["stop_reason"], "end_turn")

        sdk = anthropic.Anthropic(base_url="http://testserver/api/mixmind/ai", api_key=self.token,
                                  http_client=self.client, max_retries=0)
        self.bedrock.messages.create = AsyncMock(return_value=FakeStream(TOOL_STREAM))
        with sdk.messages.stream(model="claude-opus-5", max_tokens=32000, thinking={"type": "adaptive"},
                                 output_config=FORMAT, messages=[{"role": "user", "content": "order"}]) as stream:
            final = stream.get_final_message()
        self.assertEqual([block.type for block in final.content], ["thinking", "text"])
        self.assertEqual(json.loads(final.content[1].text), {"order": [3, 1, 2]})

    def test_stream_without_a_tool_call_keeps_the_text(self):
        self.bedrock.messages.create = AsyncMock(return_value=FakeStream(STREAM))
        events = self.stream_events(self.post(body(model="claude-opus-5", stream=True, output_config=FORMAT)))
        text = "".join(data["delta"]["text"] for name, data in events
                       if name == "content_block_delta" and data["delta"].get("type") == "text_delta")
        self.assertEqual(text, "{\"ok\":true}")
        names = [name for name, _ in events]
        self.assertLess(names.index("content_block_stop", 4), names.index("message_delta"))


class MixMindRateTests(unittest.TestCase):
    def test_estimates_use_each_models_list_rates(self):
        tokens = {"input_tokens": 1_000_000, "output_tokens": 1_000_000, "cache_read_tokens": 1_000_000,
                  "cache_write_tokens": 1_000_000}
        for model, (inp, out) in (("us.anthropic.claude-opus-5", (5, 25)), ("us.anthropic.claude-opus-5-5", (4, 20)),
                                  ("us.anthropic.claude-sonnet-4-6", (3, 15)),
                                  ("us.anthropic.claude-haiku-4-5-20251001-v1:0", (1, 5))):
            usd, basis = ai_usage.estimate("bedrock", model, tokens)
            self.assertAlmostEqual(usd, inp + out + inp * 0.1 + inp * 1.25, msg=model)
            self.assertEqual(basis, "published")
        self.assertEqual(ai_usage.estimate("bedrock", "us.anthropic.claude-fable-5", tokens)[1], "placeholder")


if __name__ == "__main__":
    unittest.main()


class MixMindCompTests(unittest.TestCase):
    def test_comp_emails_get_mixmind_without_a_plan(self):
        from database import mixmind_access
        with patch.dict(os.environ, {"MIXMIND_COMP_EMAILS": " Tester@BeatMind.io , other@x.com"}):
            self.assertTrue(mixmind_access({"email": "tester@beatmind.io", "subscription_status": "inactive"}))
            self.assertFalse(mixmind_access({"email": "nobody@x.com", "subscription_status": "inactive"}))
        with patch.dict(os.environ, {"MIXMIND_COMP_EMAILS": ""}):
            self.assertFalse(mixmind_access({"email": "tester@beatmind.io", "subscription_status": "inactive"}))
