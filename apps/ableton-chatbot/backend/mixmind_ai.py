"""MixMind AI: an Anthropic-Messages-compatible proxy to Claude on Amazon Bedrock for the MixMind desktop app.

The app points the Anthropic SDK here (`base_url=<api>/api/mixmind/ai`, `api_key=<mixmind_token>`), so its
requests arrive as POST /v1/messages bodies. We check the caller, map the public model id to a Bedrock
inference profile, forward the rest of the body to Bedrock (us-east-1, the task role's IAM) and return
Anthropic's message JSON, or its server-sent events when `"stream": true`.

- Removed before forwarding: `metadata` (client-supplied identifiers stay here), and `service_tier`,
  `inference_geo`, `speed`, which Bedrock rejects with a 400. Everything else passes through unchanged,
  including `output_config`, `thinking`, `tools`, `tool_choice`.
- Structured outputs: Bedrock accepts `output_config.format` for Haiku 4.5 and Sonnet 4.6 but rejects it for
  Opus 5 ("output_config.format: Extra inputs are not permitted"; `output_format` and `strict` tools are
  rejected too). For Opus 5 the format becomes a `structured_output` tool (see StructuredOutput) and its call
  comes back as the text block the caller asked for, so the caller cannot tell the difference.
- Responses report the requested public model id, not the Bedrock profile.
- Streams send a `ping` event whenever Bedrock is quiet for PING_SECONDS, so long thinking never trips the
  load balancer's 60 s idle timeout. Non-streaming calls time out at MIXMIND_AI_READ_TIMEOUT (default 180 s).
- Every call is logged in ai_usage (provider 'bedrock', feature 'mixmind') with an estimated cost.
"""

import asyncio
import json
import logging
import os
from contextlib import suppress

import anthropic
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse

import ai_usage
from database import mixmind_access
from security import MIXMIND_AI_MAX_BODY_BYTES, rate_limit

log = logging.getLogger("beatmind.mixmind_ai")

REGION = "us-east-1"
MODELS = {
    "claude-opus-5": "us.anthropic.claude-opus-5",
    "claude-sonnet-4-6": "us.anthropic.claude-sonnet-4-6",
    "claude-haiku-4-5": "us.anthropic.claude-haiku-4-5-20251001-v1:0",
    "claude-haiku-4-5-20251001": "us.anthropic.claude-haiku-4-5-20251001-v1:0",
}
MAX_TOKENS = 32000
STRIPPED_FIELDS = ("metadata", "service_tier", "inference_geo", "speed")
RATE_LIMIT_REQUESTS = 60  # A 10-round tool loop is 10 requests.
RATE_LIMIT_WINDOW_SECONDS = 600
PING_SECONDS = 15.0

# Models whose Bedrock deployment rejects output_config.format (verified 2026-09-28); see StructuredOutput.
FORMAT_AS_TOOL = {"claude-opus-5"}
STRUCTURED_TOOL = "structured_output"
STRUCTURED_INSTRUCTION = (f"When you have the final answer, call the {STRUCTURED_TOOL} tool exactly once with it. "
                          "Do not write the answer as text.")

_client: anthropic.AsyncAnthropicBedrock | None = None


class ProxyError(Exception):
    def __init__(self, status: int, kind: str, message: str):
        super().__init__(message)
        self.status, self.kind, self.message = status, kind, message


def error_body(kind: str, message: str) -> dict:
    return {"type": "error", "error": {"type": kind, "message": message}}


def error_response(error: ProxyError) -> JSONResponse:
    return JSONResponse(error_body(error.kind, error.message), status_code=error.status)


def client() -> anthropic.AsyncAnthropicBedrock:
    """One Bedrock client for the process. Read timeout covers a long non-streaming answer or a quiet stream."""
    global _client
    if _client is None:
        read_timeout = float(os.getenv("MIXMIND_AI_READ_TIMEOUT", "180"))
        _client = anthropic.AsyncAnthropicBedrock(aws_region=REGION, max_retries=2,
                                                  timeout=anthropic.Timeout(read_timeout, connect=10.0))
    return _client


async def read_body(request: Request) -> bytes:
    """The request body, refusing more than MIXMIND_AI_MAX_BODY_BYTES even without a Content-Length."""
    chunks, size = [], 0
    async for chunk in request.stream():
        size += len(chunk)
        if size > MIXMIND_AI_MAX_BODY_BYTES:
            raise ProxyError(413, "request_too_large", "Request exceeds the 2 MB limit")
        chunks.append(chunk)
    return b"".join(chunks)


def prepare(body: object) -> tuple[str, str, bool, dict]:
    """(public model, Bedrock profile, stream, forwarded params) for a Messages request body."""
    if not isinstance(body, dict):
        raise ProxyError(400, "invalid_request_error", "Request body must be a JSON object")
    model = body.get("model")
    if model not in MODELS:
        raise ProxyError(400, "invalid_request_error",
                         f"model: {model!r} is not available; use one of {', '.join(MODELS)}")
    max_tokens = body.get("max_tokens")
    if isinstance(max_tokens, bool) or not isinstance(max_tokens, int) or not 1 <= max_tokens <= MAX_TOKENS:
        raise ProxyError(400, "invalid_request_error", f"max_tokens: must be an integer from 1 to {MAX_TOKENS}")
    messages = body.get("messages")
    if not isinstance(messages, list) or not messages:
        raise ProxyError(400, "invalid_request_error", "messages: must be a non-empty list")
    stream = body.get("stream", False)
    if not isinstance(stream, bool):
        raise ProxyError(400, "invalid_request_error", "stream: must be a boolean")
    params = {key: value for key, value in body.items() if key not in ("model", "stream", *STRIPPED_FIELDS)}
    return model, MODELS[model], stream, params


class StructuredOutput:
    """Structured outputs for a model whose Bedrock deployment rejects output_config.format.

    The request's JSON schema becomes the input schema of one `structured_output` tool. tool_choice stays `auto`
    with a system instruction to call it, because a forced tool_choice makes Bedrock's Opus 5 skip thinking
    (verified: forced = no thinking block, auto = thinking + call); it is forced only when thinking is disabled.
    In the answer the tool call becomes a text block holding its JSON input, the model's other text blocks are
    dropped, and stop_reason tool_use becomes end_turn. If the model never calls the tool, its text passes
    through unchanged. Stream events are rewritten the same way, with block indexes kept contiguous."""

    def __init__(self):
        self.called = False
        self.indexes: dict[int, int] = {}  # Upstream block index to the index the caller sees.
        self.kinds: dict[int, str] = {}  # Upstream block index to 'text' (held back), 'tool' or 'other'.
        self.held: dict[int, list[dict]] = {}  # Text blocks, sent only if the tool is never called.

    @staticmethod
    def applies(model: str, params: dict) -> bool:
        fmt = (params.get("output_config") or {}).get("format")
        return model in FORMAT_AS_TOOL and isinstance(fmt, dict) and fmt.get("type") == "json_schema"

    @staticmethod
    def rewrite(params: dict) -> dict:
        """The request with its format moved into a tool; raises ProxyError when that cannot be expressed."""
        config = dict(params["output_config"])
        schema = config.pop("format").get("schema")
        if params.get("tools"):
            raise ProxyError(400, "invalid_request_error",
                             "output_config.format together with tools is not available for claude-opus-5")
        if not isinstance(schema, dict) or schema.get("type") != "object":
            raise ProxyError(400, "invalid_request_error",
                             "output_config.format.schema must be a JSON object schema for claude-opus-5")
        system = params.get("system")
        if isinstance(system, list):
            system = [*system, {"type": "text", "text": STRUCTURED_INSTRUCTION}]
        else:
            system = f"{system}\n\n{STRUCTURED_INSTRUCTION}" if system else STRUCTURED_INSTRUCTION
        thinking_off = (params.get("thinking") or {}).get("type") == "disabled"
        rewritten = {**params, "system": system,
                     "tools": [{"name": STRUCTURED_TOOL, "input_schema": schema,
                                "description": "Return the final answer in the required JSON format."}],
                     "tool_choice": {"type": "tool", "name": STRUCTURED_TOOL} if thinking_off else {"type": "auto"}}
        if config:
            rewritten["output_config"] = config
        else:
            rewritten.pop("output_config")
        return rewritten

    @staticmethod
    def message(message: dict) -> dict:
        blocks = message.get("content") or []
        if not any(block.get("type") == "tool_use" and block.get("name") == STRUCTURED_TOOL for block in blocks):
            return message
        content = []
        for block in blocks:
            if block.get("type") == "tool_use" and block.get("name") == STRUCTURED_TOOL:
                content.append({"type": "text", "text": json.dumps(block.get("input"), separators=(",", ":"))})
            elif block.get("type") != "text":
                content.append(block)
        stop = "end_turn" if message.get("stop_reason") == "tool_use" else message.get("stop_reason")
        return {**message, "content": content, "stop_reason": stop}

    def _index(self, upstream: int) -> int:
        if upstream not in self.indexes:
            self.indexes[upstream] = len(self.indexes)
        return self.indexes[upstream]

    def _reindexed(self, event: dict) -> dict:
        return {**event, "index": self._index(event["index"])}

    def event(self, event: dict) -> list[dict]:
        """The events the caller receives for one upstream event."""
        kind = event.get("type")
        if kind == "content_block_start":
            block, index = event["content_block"], event["index"]
            if block.get("type") == "text":
                self.kinds[index] = "text"
                self.held[index] = [event]
                return []
            if block.get("type") == "tool_use" and block.get("name") == STRUCTURED_TOOL:
                self.kinds[index], self.called = "tool", True
                self.held.clear()
                return [{"type": "content_block_start", "index": self._index(index),
                         "content_block": {"type": "text", "text": ""}}]
            self.kinds[index] = "other"
            return [self._reindexed(event)]
        if kind in ("content_block_delta", "content_block_stop"):
            index = event["index"]
            if self.kinds.get(index) == "text":
                if index in self.held:
                    self.held[index].append(event)
                return []
            if self.kinds.get(index) == "tool" and kind == "content_block_delta":
                return [{"type": "content_block_delta", "index": self._index(index),
                         "delta": {"type": "text_delta", "text": event["delta"].get("partial_json", "")}}]
            return [self._reindexed(event)]
        if kind == "message_delta":
            released = []
            if not self.called:  # No tool call: the model's text is the answer after all.
                for events in self.held.values():
                    released += [self._reindexed(held) for held in events]
            elif (event.get("delta") or {}).get("stop_reason") == "tool_use":
                event = {**event, "delta": {**event["delta"], "stop_reason": "end_turn"}}
            self.held.clear()
            return [*released, event]
        return [event]


def upstream_error(error: Exception) -> ProxyError:
    """An Anthropic-style error for a Bedrock failure. Bedrock's own credential errors are ours, not the caller's."""
    if isinstance(error, anthropic.APIStatusError):
        body = error.body if isinstance(error.body, dict) else {}
        message = str(body.get("message") or error.message)
        if error.status_code in (400, 413, 422):
            return ProxyError(error.status_code, "invalid_request_error", message)
        if error.status_code == 429:
            return ProxyError(429, "rate_limit_error", "The AI provider is rate limiting requests; retry shortly")
        if error.status_code in (503, 529):
            return ProxyError(529, "overloaded_error", "The AI provider is overloaded; retry shortly")
        log.error("Bedrock rejected a MixMind AI call: %s %s", error.status_code, message)
        return ProxyError(502, "api_error", "The AI provider rejected the request")
    if isinstance(error, anthropic.APITimeoutError):
        return ProxyError(504, "api_error", "The AI provider timed out")
    log.error("MixMind AI upstream failure: %r", error)
    return ProxyError(502, "api_error", "The AI provider could not complete the request")


def _usage_tokens(usage: dict, tokens: dict) -> None:
    """Fold one usage object (message_start, message_delta or a whole message) into running token counts."""
    fields = {"input_tokens": "input_tokens", "output_tokens": "output_tokens",
              "cache_read_input_tokens": "cache_read_tokens", "cache_creation_input_tokens": "cache_write_tokens"}
    for source, target in fields.items():
        value = (usage or {}).get(source)
        if isinstance(value, int):
            tokens[target] = value


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, separators=(',', ':'))}\n\n"


async def relay(stream, user_id: int, public_model: str, bedrock_model: str,
                structured: StructuredOutput | None = None):
    """Bedrock's stream events as Anthropic SSE, with pings through quiet spells. Closing the generator (the
    caller disconnected) closes the upstream stream; usage seen so far is recorded either way."""
    queue: asyncio.Queue = asyncio.Queue(maxsize=256)
    done = object()
    tokens: dict = {}

    async def pump():
        try:
            async for event in stream:
                await queue.put(event)
        except Exception as error:  # Surfaced to the caller as an SSE error event.
            await queue.put(error)
        else:
            await queue.put(done)

    task = asyncio.create_task(pump())
    try:
        while True:
            try:
                item = await asyncio.wait_for(queue.get(), PING_SECONDS)
            except asyncio.TimeoutError:
                yield _sse("ping", {"type": "ping"})
                continue
            if item is done:
                break
            if isinstance(item, Exception):
                failure = upstream_error(item)
                yield _sse("error", error_body(failure.kind, failure.message))
                break
            data = item.to_dict()
            data.pop("amazon-bedrock-invocationMetrics", None)
            kind = data.get("type")
            if kind == "message_start":
                data["message"]["model"] = public_model
                _usage_tokens(data["message"].get("usage"), tokens)
            elif kind == "message_delta":
                _usage_tokens(data.get("usage"), tokens)
            for event in structured.event(data) if structured else [data]:
                yield _sse(event["type"], event)
    finally:
        task.cancel()
        with suppress(asyncio.CancelledError, Exception):
            await task
        with suppress(Exception):
            await stream.close()
        if tokens:
            ai_usage.record(user_id, "mixmind", "bedrock", bedrock_model, tokens)


async def handle(request: Request, user: dict | None):
    """POST /api/mixmind/ai/v1/messages for a caller already resolved from its token (None: not signed in)."""
    try:
        if not user:
            raise ProxyError(401, "authentication_error", "Invalid or missing MixMind token")
        raw = await read_body(request)
        if not mixmind_access(user):
            raise ProxyError(403, "permission_error", "MixMind plan required")
        try:
            rate_limit(f"mixmind_ai:{user['id']}", RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_SECONDS)
        except HTTPException:
            raise ProxyError(429, "rate_limit_error", "Too many MixMind AI requests; try again in a few minutes")
        if ai_usage.mixmind_over_cap(user["id"]):
            raise ProxyError(429, "rate_limit_error", ai_usage.MIXMIND_CAP_MESSAGE)
        try:
            body = json.loads(raw)
        except ValueError:
            raise ProxyError(400, "invalid_request_error", "Request body is not valid JSON")
        public_model, bedrock_model, stream, params = prepare(body)
        structured = StructuredOutput() if StructuredOutput.applies(public_model, params) else None
        if structured:
            params = StructuredOutput.rewrite(params)
        betas = request.headers.get("anthropic-beta")
        try:
            response = await client().messages.create(
                model=bedrock_model, max_tokens=params.pop("max_tokens"), messages=params.pop("messages"),
                stream=stream, extra_body=params, extra_headers={"anthropic-beta": betas} if betas else None)
        except (anthropic.APIError, ValueError) as error:
            raise upstream_error(error)
    except ProxyError as error:
        return error_response(error)

    if stream:
        return StreamingResponse(relay(response, user["id"], public_model, bedrock_model, structured),
                                 media_type="text/event-stream",
                                 headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
    message = response.to_dict()
    message["model"] = public_model
    if structured:
        message = StructuredOutput.message(message)
    tokens: dict = {}
    _usage_tokens(message.get("usage"), tokens)
    ai_usage.record(user["id"], "mixmind", "bedrock", bedrock_model, tokens)
    return JSONResponse(message)
