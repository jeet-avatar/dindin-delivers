"""End-to-end via run_validation_loop — the exact function rawapi.py invokes."""
import time
import pytest

from src.backend.validators.reprompt import run_validation_loop


def _wrap_as_fence(code: str) -> str:
    return f"```js\n{code}\n```"


@pytest.mark.asyncio
async def test_clean_initial_response_is_passthrough():
    pipeline_calls = {"n": 0}

    def pipeline(prompt: str) -> str:
        pipeline_calls["n"] += 1
        return _wrap_as_fence("var x = record.Type.SALES_ORDER;")

    response, metrics = await run_validation_loop(
        user_input="create SO",
        initial_response=_wrap_as_fence("var x = record.Type.SALES_ORDER;"),
        pipeline=pipeline,
        pipeline_t0=time.monotonic(),
    )
    assert metrics["outcome"] == "clean"
    assert metrics["violations_initial"] == 0
    assert pipeline_calls["n"] == 0  # no re-prompt needed
    assert "SALES_ORDER" in response


@pytest.mark.asyncio
async def test_recovery_after_one_reprompt():
    """Initial response hallucinated; re-prompt #1 returns valid code."""
    pipeline_calls = {"n": 0}

    def pipeline(prompt: str) -> str:
        pipeline_calls["n"] += 1
        return _wrap_as_fence("var x = record.Type.SALES_ORDER;")

    bad_initial = _wrap_as_fence("var x = record.Type.RECEIVING;")
    response, metrics = await run_validation_loop(
        user_input="create item receipt",
        initial_response=bad_initial,
        pipeline=pipeline,
        pipeline_t0=time.monotonic(),
    )
    assert metrics["outcome"] == "recovered"
    assert metrics["violations_initial"] >= 1
    assert metrics["violations_reprompt_1"] == 0
    assert pipeline_calls["n"] == 1
    assert "RECEIVING" not in response  # bad identifier gone
    assert "SALES_ORDER" in response


@pytest.mark.asyncio
async def test_hard_block_after_max_attempts():
    """All 3 LLM calls (initial + 2 re-prompts) return bad code → refusal message."""
    pipeline_calls = {"n": 0}

    def always_bad(prompt: str) -> str:
        pipeline_calls["n"] += 1
        return _wrap_as_fence("var x = record.Type.RECEIVING;")

    bad_initial = always_bad("initial")
    response, metrics = await run_validation_loop(
        user_input="create item receipt",
        initial_response=bad_initial,
        pipeline=always_bad,
        pipeline_t0=time.monotonic(),
    )
    assert metrics["outcome"] == "hard_blocked"
    assert metrics["violations_initial"] >= 1
    assert metrics["violations_reprompt_1"] is not None
    assert metrics["violations_reprompt_2"] is not None
    assert pipeline_calls["n"] == 3  # 1 initial (above) + 2 re-prompts
    # Refusal message, not any code
    assert "```" not in response
    assert "couldn't verify" in response.lower() or "hold" in response.lower()


@pytest.mark.asyncio
async def test_budget_exit_stops_reprompting():
    """Simulate an already-exhausted budget; loop should not re-prompt."""
    def pipeline(prompt: str) -> str:
        raise AssertionError("pipeline should not be called — budget exceeded")

    bad_initial = _wrap_as_fence("var x = record.Type.RECEIVING;")
    response, metrics = await run_validation_loop(
        user_input="x",
        initial_response=bad_initial,
        pipeline=pipeline,
        pipeline_t0=time.monotonic() - 999,  # already past budget
    )
    assert metrics["outcome"] == "hard_blocked"
    assert metrics["violations_reprompt_1"] is None  # never attempted
