"""Explicit provider selection; never silently change the billing provider."""

import os

import anthropic
from model_history import HistoryBudgetError, as_dict


def provider_name():
    provider = os.getenv("BEATMIND_AI_PROVIDER", "anthropic").lower()
    if provider not in {"anthropic", "bedrock"}:
        raise ValueError("BEATMIND_AI_PROVIDER must be anthropic or bedrock")
    return provider


def model_name():
    if provider_name() == "bedrock":
        return os.getenv("BEATMIND_MODEL", "us.anthropic.claude-haiku-4-5-20251001-v1:0")
    return os.getenv("CLAUDE_MODEL", "claude-haiku-4-5-20251001")


def create_client():
    if provider_name() == "bedrock":
        # Bedrock returns transient 503s under load; the SDK retries them with exponential backoff.
        return anthropic.AsyncAnthropicBedrock(aws_region=os.getenv("AWS_REGION", "us-east-1"),
                                               max_retries=int(os.getenv("BEATMIND_AI_MAX_RETRIES", "2" if os.getenv("BEATMIND_FALLBACK_MODEL") else "6")))
    key = os.getenv("ANTHROPIC_API_KEY")
    return anthropic.AsyncAnthropic(api_key=key) if key else None


def request_history(messages):
    # Live context and tool results can change between requests. Signed reasoning
    # is prefix-bound; retain all conversation/tool evidence, not stale signatures.
    result = []
    for message in messages:
        content = message.get('content')
        if message.get('role') == 'assistant' and isinstance(content, list):
            blocks = [block for block in content
                      if as_dict(block).get('type') not in {'thinking', 'redacted_thinking'}]
            if not blocks:
                continue
            result.append({**message, 'content': blocks})
        else:
            result.append(message)
    return result


async def request_message(client, *, model, emit=None, **kwargs):
    """Retry only an unexecuted model request, using the same provider and history."""
    kwargs = {**kwargs, 'messages': request_history(kwargs['messages'])}
    try:
        return await client.messages.create(model=model, **kwargs), model
    except anthropic.APIStatusError as error:
        fallback = os.getenv("BEATMIND_FALLBACK_MODEL", "").strip()
        if (error.status_code not in {500, 502, 503, 504, 529}
                or not fallback or fallback == model):
            raise
        if emit:
            await emit({"type": "narration", "text":
                "The primary AI model is temporarily unavailable. Continuing with the configured "
                f"backup model ({fallback}) on the same provider. Completed Ableton actions are not being repeated."})
        return await client.messages.create(model=fallback, **kwargs), fallback


def failure_message(error, actions_started):
    body = getattr(error, "body", None)
    detail = body.get("error", body) if isinstance(body, dict) else {}
    message = str(detail.get("message", "")).lower() if isinstance(detail, dict) else ""
    if isinstance(error, HistoryBudgetError) or "prompt is too long" in message or "maximum context" in message:
        reason = "The model context limit was reached. Saved recordings and action logs are unchanged. Start a new chat and inspect the current Live Set before continuing; do not recreate existing parts."
    elif "credit balance" in message:
        reason = "The Anthropic API account has insufficient credits. Add credits or configure an available AI provider."
    elif getattr(error, "status_code", None) in {401, 403}:
        reason = "The AI provider rejected its credentials or permissions. Check the backend's provider configuration."
    elif getattr(error, "status_code", None) == 429:
        reason = "The AI provider is rate limited. Wait briefly before trying again."
    elif getattr(error, "status_code", None) in {500, 502, 503, 504, 529}:
        reason = "The AI provider is temporarily unavailable after retries. Wait briefly before trying again."
    elif isinstance(error, anthropic.APIConnectionError):
        reason = "The backend could not reach the AI provider."
    elif isinstance(error, anthropic.APIStatusError):
        reason = "The AI provider rejected the request. Check the backend's model configuration and provider logs."
    else:
        reason = "The production request could not finish. Check the backend logs for the cause."
    state = ("Some actions may already have run; inspect the action log and Ableton before continuing."
             if actions_started else "No Ableton actions were started.")
    return f"{reason} {state}"
