from src.backend.validators.linter import SuiteScriptLinter, extract_first_code_block


def test_linter_empty_code_valid():
    r = SuiteScriptLinter(checkers=[]).lint("")
    assert r.valid is True


def test_linter_non_ascii_pre_pass_fails():
    # Cyrillic А (U+0410) in identifier
    code = "record.Type.SАLES_ORDER"
    r = SuiteScriptLinter(checkers=[]).lint(code)
    assert r.valid is False
    assert r.violations[0].category == "non_ascii"


def test_linter_non_ascii_line_reported():
    # Non-ASCII on line 3 — line counting sanity
    code = "var a = 1;\nvar b = 2;\nrecord.Type.SАLES_ORDER\n"
    r = SuiteScriptLinter(checkers=[]).lint(code)
    assert r.valid is False
    assert r.violations[0].category == "non_ascii"
    assert r.violations[0].line == 3


def test_extract_first_code_block_js_fence():
    text = "Here is the code:\n```js\nvar x = 1;\n```\n"
    code, lang = extract_first_code_block(text)
    assert code == "var x = 1;"
    assert lang == "js"


def test_extract_first_code_block_unlabeled_fence():
    text = "```\nvar x = 1;\n```"
    code, lang = extract_first_code_block(text)
    assert code == "var x = 1;"
    assert lang == ""


def test_extract_first_code_block_no_fence():
    assert extract_first_code_block("just prose") == (None, None)


def test_extract_first_code_block_wrong_language():
    text = "```python\nprint('hi')\n```"
    code, lang = extract_first_code_block(text)
    assert code is None
    assert lang == "wrong_language"


def test_extract_first_code_block_multiple_fences_picks_first_js():
    text = "```python\nx = 1\n```\n```js\nvar y = 2;\n```"
    code, lang = extract_first_code_block(text)
    assert code == "var y = 2;"
    assert lang == "js"


def test_linter_default_constructor_end_to_end():
    linter = SuiteScriptLinter()  # no args → default 4 checkers
    bad = """
    /** @NApiVersion 2.1 * @NScriptType Scheduled */
    define(['N/record'], function(record) {
        var r = record.load({type: record.Type.RECEIVING, id: 1});
        return { execute: function() {} };
    });
    """
    r = linter.lint(bad)
    assert r.valid is False
    # Two violations expected: Scheduled (bad @NScriptType, canon is
    # ScheduledScript) + RECEIVING (bad record.Type).
    idents = {v.identifier for v in r.violations}
    assert "RECEIVING" in idents
    assert "Scheduled" in idents
    assert {v.category for v in r.violations} == {"record_type", "script_type"}


def test_linter_clean_code_passes():
    linter = SuiteScriptLinter()
    good = """
    /** @NApiVersion 2.1 * @NScriptType ScheduledScript */
    define(['N/record'], function(record) {
        var r = record.load({type: record.Type.SALES_ORDER, id: 1});
        return { execute: function() {} };
    });
    """
    r = linter.lint(good)
    assert r.valid is True
