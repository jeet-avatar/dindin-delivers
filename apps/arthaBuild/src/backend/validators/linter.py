"""SuiteScriptLinter orchestrator + code-block extraction + non-ASCII pre-pass."""
from __future__ import annotations

import re
import time
from typing import Optional

from src.backend.validators.checkers.base import LintResult, Violation

FENCE_RE = re.compile(r"```(\w*)\n(.*?)```", re.DOTALL)
VALID_LANGUAGES = {"js", "javascript", ""}
NON_ASCII_RE = re.compile(r"[^\x00-\x7f]")


def extract_first_code_block(text: str) -> tuple[Optional[str], Optional[str]]:
    """Return (code, language) of the first matching fence.

    - No fence: (None, None)
    - js/javascript/unlabeled: (code, lang)
    - Wrong language: (None, "wrong_language")
    - Multiple fences: first js/javascript/unlabeled block
    """
    matches = FENCE_RE.findall(text)
    if not matches:
        return (None, None)
    # First valid-language block wins; if none, flag wrong_language
    for lang, code in matches:
        if lang.lower() in VALID_LANGUAGES:
            if not code.strip():
                return (None, None)
            return (code.strip("\n"), lang.lower())
    return (None, "wrong_language")


class SuiteScriptLinter:
    def __init__(self, checkers: list | None = None):
        if checkers is None:
            from src.backend.validators.checkers.record_type import RecordTypeChecker
            from src.backend.validators.checkers.module import ModuleChecker
            from src.backend.validators.checkers.script_type import ScriptTypeChecker
            from src.backend.validators.checkers.search_api import SearchApiChecker
            checkers = [
                RecordTypeChecker(),
                ModuleChecker(),
                ScriptTypeChecker(),
                SearchApiChecker(),
            ]
        self.checkers = checkers

    def lint(self, code: str) -> LintResult:
        t0 = time.monotonic()
        if not code:
            return LintResult(valid=True, violations=[], elapsed_ms=0)

        # Non-ASCII pre-pass
        m = NON_ASCII_RE.search(code)
        if m:
            line = code[: m.start()].count("\n") + 1
            v = Violation(
                category="non_ascii",
                identifier="<non-ASCII code point>",
                line=line,
                suggestions=[],
                message="Code contains non-ASCII characters; NetSuite identifiers must be ASCII",
            )
            return LintResult(valid=False, violations=[v],
                              elapsed_ms=int((time.monotonic() - t0) * 1000))

        violations: list[Violation] = []
        for checker in self.checkers:
            violations.extend(checker.check(code))

        return LintResult(
            valid=(len(violations) == 0),
            violations=violations,
            elapsed_ms=int((time.monotonic() - t0) * 1000),
        )
