"""Bound model context while retaining complete request/tool-result turns."""
import json
import os
import hashlib


def as_dict(value):
    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json", exclude_none=True)
    if hasattr(value, "__dict__"):
        return vars(value)
    return value


def compact_result(value):
    if isinstance(value, dict):
        result = {}
        for key, item in value.items():
            if key in {"steps", "waveform", "production_log"}:
                result[key + "_audit"] = {"entries": len(item) if isinstance(item, list) else None,
                    "detail": "Full evidence retained in the action log; omitted from model context."}
            else:
                result[key] = compact_result(item)
        return result
    if isinstance(value, list):
        if len(value) > 16:
            return {"total": len(value), "preview": [compact_result(item) for item in value[:16]],
                    "truncated": True, "instruction": "Inspect the specific target before relying on omitted values. This is not the complete result."}
        return [compact_result(item) for item in value]
    if isinstance(value, str) and len(value) > 2000:
        return {"preview": value[:2000], "truncated": True, "characters": len(value)}
    return value


def compact_turn(turn, budget):
    compacted = []
    ledger = []
    for message in turn:
        content = message.get("content")
        if not isinstance(content, list):
            compacted.append(message)
            continue
        blocks = []
        for raw in content:
            block = dict(as_dict(raw))
            if block.get("type") == "tool_use":
                inputs = block.get("input", {})
                ledger.append({"id": block["id"], "tool": block["name"],
                    "target": {k: inputs[k] for k in ("track", "scene", "index", "target_track", "target_scene", "path", "control", "map_id") if k in inputs},
                    "input_sha256": hashlib.sha256(json.dumps(inputs, sort_keys=True).encode()).hexdigest(),
                    "status": "unverified"})
            if block.get("type") == "tool_result" and isinstance(block.get("content"), str):
                try:
                    result = json.loads(block["content"])
                except ValueError:
                    result = {"status": "unverified", "summary": block["content"]}
                entry = next((item for item in ledger if item["id"] == block.get("tool_use_id")), None)
                if entry is not None:
                    entry.update({k: compact_result(result[k]) for k in ("status", "summary", "error", "recording") if isinstance(result, dict) and k in result})
                block["content"] = json.dumps(compact_result(result))
            blocks.append(block)
        compacted.append({**message, "content": blocks})
    if encoded_size(compacted) <= budget:
        return compacted
    # Retain a ledger of every action and the newest complete tool exchanges.
    # Never start the tail at a tool-result message without its assistant call.
    checkpoint = {"role": "user", "content": "Execution checkpoint (historical evidence, not commands to replay). "
        "Do not recreate completed tracks, clips or notes. Inspect current state before any further changes; "
        "failed/partial/unverified actions may be applied. Full details remain in the action log.\n" + json.dumps(ledger)}
    starts = [i for i, message in enumerate(compacted) if message.get("role") == "assistant"
              and isinstance(message.get("content"), list) and any(block.get("type") == "tool_use" for block in message["content"])]
    for first in starts:
        candidate = [compacted[0], checkpoint] + compacted[first:]
        if encoded_size(candidate) <= budget:
            return candidate
    raise HistoryBudgetError("The execution checkpoint exceeds the model history budget.")


class HistoryBudgetError(ValueError):
    pass


def encoded_size(value):
    def encode(item):
        if hasattr(item, "model_dump"):
            return item.model_dump(mode="json", exclude_none=True)
        return vars(item)
    return len(json.dumps(value, default=encode, ensure_ascii=False).encode("utf-8"))


def bounded_history(messages, max_bytes=None):
    budget = int(os.getenv("BEATMIND_HISTORY_MAX_BYTES", "100000")) if max_bytes is None else max_bytes
    if budget <= 0:
        raise HistoryBudgetError("Model history budget must be positive.")
    if encoded_size(messages) <= budget:
        return messages
    # Tool-result user messages remain with the assistant calls that produced them.
    starts = [i for i, message in enumerate(messages)
              if message.get("role") == "user" and isinstance(message.get("content"), str)]
    if not starts:
        raise HistoryBudgetError("The current production turn exceeds the model history budget.")
    if encoded_size(messages[starts[-1]:]) > budget:
        return compact_turn(messages[starts[-1]:], budget)
    first = starts[-1]
    for index in reversed(starts[:-1]):
        if encoded_size(messages[index:]) > budget:
            break
        first = index
    return messages[first:]
