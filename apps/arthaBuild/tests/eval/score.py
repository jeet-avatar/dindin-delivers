"""Deterministic + LLM-judge scoring for the NetSuite eval harness.

Spec: apps/arthaBuild/docs/superpowers/specs/2026-04-17-netsuite-eval-harness-design.md § 3
"""
from __future__ import annotations
import re
from typing import Optional

import esprima

JS_BLOCK_RE = re.compile(r"```(?:js|javascript)\n(.*?)\n```", re.DOTALL)


def extract_js_blocks(text: str) -> list[str]:
    return JS_BLOCK_RE.findall(text)


def score_must_include(response: str, tokens: list[str]) -> float:
    if not tokens:
        return 15.0
    matched = sum(1 for t in tokens if t in response)
    return round(15.0 * matched / len(tokens), 2)


def score_must_not_include(response: str, tokens: list[str]) -> float:
    if any(t in response for t in tokens):
        return 0.0
    return 10.0


def score_js_parses(blocks: list[str], requires_code: bool) -> Optional[float]:
    if not requires_code:
        return None  # Caller reweights to 40 max instead of 55
    if not blocks:
        return 0.0
    for block in blocks:
        try:
            esprima.parseScript(block, tolerant=True)
        except Exception:
            return 0.0
    return 15.0


def score_record_types(response: str, types: list[str]) -> float:
    if not types:
        return 10.0
    matched = sum(1 for t in types if t in response)
    return round(10.0 * matched / len(types), 2)


def score_sanity(response: str, elapsed_s: float) -> float:
    if response and len(response) > 100 and elapsed_s <= 120:
        return 5.0
    return 0.0


def score_deterministic(case: dict, response: str, elapsed_s: float) -> dict:
    """Return per-component + total deterministic score.

    Max is 55 normally; 40 when requires_code=False (JS-parse 15-pt check skipped).
    """
    blocks = extract_js_blocks(response)
    must_inc = score_must_include(response, case.get("must_include", []))
    must_not = score_must_not_include(response, case.get("must_not_include", []))
    js_parse = score_js_parses(blocks, case.get("requires_code", True))
    rec_types = score_record_types(response, case.get("expected_record_types", []))
    sanity = score_sanity(response, elapsed_s)

    components = {
        "must_include": must_inc,
        "must_not_include": must_not,
        "expected_record_types": rec_types,
        "sanity": sanity,
    }
    if js_parse is not None:
        components["js_parses"] = js_parse
        max_pts = 55
    else:
        max_pts = 40

    return {
        "components": components,
        "total": sum(components.values()),
        "max": max_pts,
    }


import json as _json
import os
from pathlib import Path
import anthropic

_JUDGE_PROMPT_PATH = Path(__file__).parent / "judge_prompt.md"
_RESPONSE_TRUNCATE = 8000

# Lazy-loaded
_anthropic_client = None
_judge_system_text = None

# Cumulative Anthropic cost (per process). Read by run_eval.py after the loop.
_judge_cost_accumulator = {"usd": 0.0}


def _get_anthropic_client() -> anthropic.Anthropic:
    global _anthropic_client
    if _anthropic_client is None:
        _anthropic_client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY
    return _anthropic_client


def _get_judge_system() -> str:
    global _judge_system_text
    if _judge_system_text is None:
        _judge_system_text = _JUDGE_PROMPT_PATH.read_text()
    return _judge_system_text


def score_with_judge(case: dict, response: str, model: str = "claude-opus-4-7") -> dict:
    """Call Claude judge on the case+response. Returns scores + reasoning.

    Uses prompt caching on the system block so the per-case incremental cost
    is just the user message + judge output (~$0.03/case).
    """
    truncated = response[:_RESPONSE_TRUNCATE]
    if len(response) > _RESPONSE_TRUNCATE:
        truncated += "\n\n[...truncated]"

    user_msg = (
        f"## Case\n"
        f"- ID: {case['id']}\n"
        f"- Dimension: {case['dimension']}\n"
        f"- Prompt sent to assistant: {case['prompt']}\n"
        f"- Rubric (case-specific guidance): {case['rubric']}\n\n"
        f"## Response to score\n{truncated}\n\n"
        f"Return JSON only."
    )

    client = _get_anthropic_client()
    msg = client.messages.create(
        model=model,
        max_tokens=600,
        system=[
            {
                "type": "text",
                "text": _get_judge_system(),
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": user_msg}],
    )

    # Track Anthropic cost (Opus 4.7: $15/MTok input, $75/MTok output, cache read $1.50/MTok)
    usage = msg.usage
    input_tokens = getattr(usage, "input_tokens", 0) or 0
    cache_read_tokens = getattr(usage, "cache_read_input_tokens", 0) or 0
    cache_creation_tokens = getattr(usage, "cache_creation_input_tokens", 0) or 0
    output_tokens = getattr(usage, "output_tokens", 0) or 0
    input_cost = input_tokens * 15.0 / 1_000_000
    cache_read_cost = cache_read_tokens * 1.50 / 1_000_000
    cache_creation_cost = cache_creation_tokens * 18.75 / 1_000_000  # 1.25x input for ephemeral
    output_cost = output_tokens * 75.0 / 1_000_000
    call_cost = input_cost + cache_read_cost + cache_creation_cost + output_cost
    _judge_cost_accumulator["usd"] += call_cost

    raw = msg.content[0].text.strip()
    # Strip ```json fences if judge added them despite instructions
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
    parsed = _json.loads(raw)

    return {
        "technical_correctness": int(parsed.get("technical_correctness", 0)),
        "production_readiness": int(parsed.get("production_readiness", 0)),
        "hallucination_risk": int(parsed.get("hallucination_risk", 0)),
        "completeness": int(parsed.get("completeness", 0)),
        "reasoning": parsed.get("reasoning", ""),
        "total": (
            int(parsed.get("technical_correctness", 0))
            + int(parsed.get("production_readiness", 0))
            + int(parsed.get("hallucination_risk", 0))
            + int(parsed.get("completeness", 0))
        ),
        "max": 45,
        "raw": raw,
        "cost_usd": round(call_cost, 6),
    }
