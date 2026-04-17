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
    if response and len(response) > 10 and elapsed_s <= 120:
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
