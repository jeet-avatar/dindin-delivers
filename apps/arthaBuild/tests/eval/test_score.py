"""Unit tests for tests/eval/score.py — deterministic scorer.

Each test isolates one scoring component.
"""
import pytest
from score import (
    score_must_include,
    score_must_not_include,
    score_js_parses,
    score_record_types,
    score_sanity,
    score_deterministic,
    extract_js_blocks,
)


def test_must_include_all_present():
    assert score_must_include("foo bar baz", ["foo", "bar"]) == 15.0


def test_must_include_partial():
    assert score_must_include("foo only", ["foo", "bar"]) == 7.5


def test_must_include_none():
    assert score_must_include("nothing", ["foo", "bar"]) == 0.0


def test_must_include_empty_list():
    # No requirements -> full credit
    assert score_must_include("anything", []) == 15.0


def test_must_not_include_all_absent():
    assert score_must_not_include("clean text", ["TODO", "placeholder"]) == 10.0


def test_must_not_include_one_present():
    assert score_must_not_include("has TODO here", ["TODO"]) == 0.0


def test_extract_js_blocks_javascript_fence():
    text = "Some text\n```javascript\nconst x = 1;\n```\nMore text"
    assert extract_js_blocks(text) == ["const x = 1;"]


def test_extract_js_blocks_js_fence():
    text = "```js\nvar x = 1;\n```"
    assert extract_js_blocks(text) == ["var x = 1;"]


def test_extract_js_blocks_multiple():
    text = "```js\nvar a;\n```\n```javascript\nvar b;\n```"
    assert extract_js_blocks(text) == ["var a;", "var b;"]


def test_extract_js_blocks_none():
    assert extract_js_blocks("plain text no code") == []


def test_js_parses_valid():
    blocks = ["const x = 1;"]
    assert score_js_parses(blocks, requires_code=True) == 15.0


def test_js_parses_invalid():
    blocks = ["const x = ;;;invalid"]
    assert score_js_parses(blocks, requires_code=True) == 0.0


def test_js_parses_no_blocks_requires_code():
    # Requires code but none present -> 0
    assert score_js_parses([], requires_code=True) == 0.0


def test_js_parses_no_blocks_not_requires_code():
    # When code not required, this check is skipped (returns None — caller reweights)
    assert score_js_parses([], requires_code=False) is None


def test_record_types_all_mentioned():
    text = "use the salesorder and customer records"
    assert score_record_types(text, ["salesorder", "customer"]) == 10.0


def test_record_types_partial():
    text = "salesorder only here"
    assert score_record_types(text, ["salesorder", "customer"]) == 5.0


def test_record_types_empty_list():
    assert score_record_types("any", []) == 10.0


def test_sanity_pass():
    assert score_sanity("x" * 200, elapsed_s=10) == 5.0


def test_sanity_fail_too_short():
    assert score_sanity("short", elapsed_s=10) == 0.0


def test_sanity_fail_timeout():
    assert score_sanity("x" * 200, elapsed_s=121) == 0.0


def test_full_deterministic_requires_code_true():
    case = {
        "must_include": ["foo", "bar"],
        "must_not_include": ["TODO"],
        "expected_record_types": ["salesorder"],
        "requires_code": True,
    }
    response = "foo bar\n```js\nconst x = 1;\n```\nuse salesorder"
    result = score_deterministic(case, response, elapsed_s=5)
    # 15 + 10 + 15 + 10 + 5 = 55
    assert result["total"] == 55.0
    assert result["max"] == 55


def test_full_deterministic_requires_code_false_reweights():
    # When requires_code=False, JS-parse 15 pts is dropped, total max = 40
    case = {
        "must_include": ["foo"],
        "must_not_include": ["TODO"],
        "expected_record_types": ["salesorder"],
        "requires_code": False,
    }
    response = "foo here, salesorder mentioned"
    result = score_deterministic(case, response, elapsed_s=5)
    # 15 + 10 + 10 + 5 = 40
    assert result["total"] == 40.0
    assert result["max"] == 40
