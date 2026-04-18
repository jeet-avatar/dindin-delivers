import pytest
from src.backend.validators.checkers.search_api import SearchApiChecker

CHECKER = SearchApiChecker()


@pytest.mark.parametrize("bad", [
    "columns",  # B-4 — is a key, not a method
    "lookup",   # near-miss of lookupFields
    "query",    # plausible
    "find",
    "fetch",
    "update",
    "execute",
    "select",
])
def test_bad_search_api(bad):
    code = f"var x = search.{bad}({{type: 'customer'}});"
    violations = CHECKER.check(code)
    assert len(violations) == 1
    assert violations[0].identifier == bad


# NOTE: plan listed `save` as a valid module-level method, but `save()` is
# a method on Search *objects* (the return of search.load/create), not on
# the `search` module. Calling `search.save(...)` is a runtime error in
# NetSuite. Fixture swapped for `createSetting`, a real N/search module
# method per the canonical docs.
@pytest.mark.parametrize("good", [
    "create", "load", "lookupFields", "duplicates",
    "global", "delete", "run", "createSetting",
])
def test_good_search_api(good):
    code = f"var x = search.{good}({{type: 'customer'}});"
    violations = CHECKER.check(code)
    assert violations == []


def test_member_expression_not_flagged():
    """result.search.getValue(...) should not trigger — 'search' here is a property."""
    code = "var v = result.search.getValue({name: 'foo'});"
    violations = CHECKER.check(code)
    assert violations == []


@pytest.mark.parametrize("bad", [
    "create_search",     # snake_case invention with underscore
    "run_paged",         # near-miss of runPaged
    "lookup_fields",     # near-miss of lookupFields
])
def test_underscore_hallucinations_flagged(bad):
    """Regex must capture underscore-containing method names so hallucinated
    snake_case methods like `search.run_paged()` are flagged rather than
    silently skipped."""
    code = f"var x = search.{bad}({{type: 'customer'}});"
    violations = CHECKER.check(code)
    assert len(violations) == 1
    assert violations[0].identifier == bad
