"""Re-prompt template, refusal message, metrics helper, and validation loop.

The loop is extracted as a pure function so the rawapi.py integration stays
≤20 lines and the integration test can exercise the real code path.
"""
from __future__ import annotations

import inspect
import time
from typing import Any, Awaitable, Callable, Union

from src.backend.validators.checkers.base import LintResult
from src.backend.validators.linter import SuiteScriptLinter, extract_first_code_block
from src.backend.validators.whitelist import (
    RECORD_TYPES, MODULES, SCRIPT_TYPES, SEARCH_TYPES, SEARCH_APIS,
)

REPROMPT_MAX_ATTEMPTS = 2
PIPELINE_BUDGET_SECONDS = 90  # nginx prod timeout (120s) minus 30s safety margin

_CATEGORY_HUMAN = {
    "record_type": "record type",
    "module": "module path",
    "script_type": "script type annotation",
    "search_type": "search type",
    "search_api": "search API method",
    "non_ascii": "ASCII identifier",
}

_CATEGORY_WHITELIST = {
    "record_type": ("Valid record types", RECORD_TYPES),
    "module": ("Valid modules", MODULES),
    "script_type": ("Valid @NScriptType values", SCRIPT_TYPES),
    "search_type": ("Valid search.Type values", SEARCH_TYPES),
    "search_api": ("Valid search.* methods", SEARCH_APIS),
}


def build_refusal_message(result: LintResult) -> str:
    lines = [
        "I couldn't verify every NetSuite identifier in the script I was about to return,",
        "so I'm holding it back rather than risk sending you something that won't run.",
        "",
        "What I flagged:",
    ]
    for v in result.violations:
        hum = _CATEGORY_HUMAN.get(v.category, v.category)
        sug = ", ".join(v.suggestions[:3]) if v.suggestions else "no close match"
        lines.append(f"  • Line {v.line}: {v.identifier} — not a valid {hum}")
        lines.append(f"    Closest known values: {sug}")
    lines.extend([
        "",
        "You can:",
        "  • Rephrase the request with more specific record names, or",
        "  • Check the NetSuite 2024.2 Records Browser for the exact identifier,",
        "    then try again.",
    ])
    out = "\n".join(lines)
    # Invariant: a refusal must never leak the unverified code back to the user.
    # If this fires, a violation identifier contains a fenced-code marker and
    # must be sanitized before the message is built.
    assert "```" not in out, "refusal message must not contain a fenced code block"
    return out


def build_reprompt_payload(user_input: str, result: LintResult) -> str:
    """Re-prompt message injecting only the relevant category slices."""
    categories_hit = {v.category for v in result.violations}
    lines = [
        "Your previous response contained invalid NetSuite identifiers:",
        "",
    ]
    for v in result.violations:
        hum = _CATEGORY_HUMAN.get(v.category, v.category)
        sug = ", ".join(v.suggestions[:3]) if v.suggestions else "(none)"
        lines.append(f"- Line {v.line}: {v.identifier!r} is not a valid {hum}. "
                     f"Did you mean: {sug}?")
    lines.append("")
    for cat in categories_hit:
        if cat in _CATEGORY_WHITELIST:
            label, wl = _CATEGORY_WHITELIST[cat]
            lines.append(f"{label}:")
            lines.append(", ".join(sorted(wl)))
            lines.append("")
    lines.append(f"Original request: {user_input}")
    lines.append("Regenerate the complete script using only valid identifiers.")
    return "\n".join(lines)


def new_metrics() -> dict[str, Any]:
    """Fresh metrics dict for a generate_suitescript call."""
    return {
        "validator_elapsed_ms": 0,
        "violations_initial": None,
        "violations_reprompt_1": None,
        "violations_reprompt_2": None,
        "outcome": "clean",
        "categories_hit": [],
    }


PipelineFn = Callable[[str], Union[str, Awaitable[str]]]


async def run_validation_loop(
    user_input: str,
    initial_response: str,
    pipeline: PipelineFn,
    pipeline_t0: float,
    linter: SuiteScriptLinter | None = None,
) -> tuple[str, dict[str, Any]]:
    """Run validator + bounded re-prompt loop.

    Returns `(final_response_text, metrics)`.
    - If no code block is present, returns the initial response untouched.
    - If the initial code is valid, returns it as-is (metrics.outcome='clean').
    - Re-prompts up to REPROMPT_MAX_ATTEMPTS times, breaking early if the
      wall-clock budget (PIPELINE_BUDGET_SECONDS from pipeline_t0) is exceeded.
    - On final failure, returns build_refusal_message(result) (metrics.outcome='hard_blocked').

    The `pipeline` callable may be sync or async; both are awaited safely.
    """
    linter = linter or SuiteScriptLinter()
    metrics = new_metrics()
    response_text = initial_response
    code, _ = extract_first_code_block(response_text)
    if code is None:
        return response_text, metrics

    result = linter.lint(code)
    metrics["validator_elapsed_ms"] = result.elapsed_ms
    metrics["violations_initial"] = len(result.violations)
    metrics["categories_hit"] = sorted({v.category for v in result.violations})

    attempts = 0
    while not result.valid and attempts < REPROMPT_MAX_ATTEMPTS:
        if time.monotonic() - pipeline_t0 > PIPELINE_BUDGET_SECONDS:
            break
        attempts += 1
        reprompt = build_reprompt_payload(user_input, result)
        raw = pipeline(reprompt)
        response_text = await raw if inspect.isawaitable(raw) else raw
        code, _ = extract_first_code_block(response_text)
        if code is None:
            break
        result = linter.lint(code)
        metrics[f"violations_reprompt_{attempts}"] = len(result.violations)

    if result.valid:
        metrics["outcome"] = "clean" if attempts == 0 else "recovered"
        return response_text, metrics

    metrics["outcome"] = "hard_blocked"
    return build_refusal_message(result), metrics
