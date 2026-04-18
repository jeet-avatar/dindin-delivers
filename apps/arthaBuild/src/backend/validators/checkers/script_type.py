"""@NScriptType + search.Type.* checker (spec category 4)."""
from __future__ import annotations

import re

from src.backend.validators.checkers.base import Checker, Violation
from src.backend.validators.whitelist import SCRIPT_TYPES, SEARCH_TYPES

_SCRIPT_TYPE_RE = re.compile(r"@NScriptType\s+(\w+)")
_SEARCH_TYPE_RE = re.compile(r"search\.Type\.([A-Z_]+)")


class ScriptTypeChecker(Checker):
    category = "script_type"

    def extract(self, code: str) -> list[tuple[str, int]]:
        return []  # check() is overridden

    def whitelist(self) -> set[str]:
        return SCRIPT_TYPES | SEARCH_TYPES

    def check(self, code: str) -> list[Violation]:
        from src.backend.validators.ast_utils import nearest
        out: list[Violation] = []
        for line_no, line in enumerate(code.splitlines(), 1):
            for m in _SCRIPT_TYPE_RE.finditer(line):
                ident = m.group(1)
                if ident not in SCRIPT_TYPES:
                    out.append(Violation(
                        category="script_type",
                        identifier=ident,
                        line=line_no,
                        suggestions=nearest(ident, SCRIPT_TYPES, k=3),
                        message=f"{ident!r} is not a valid @NScriptType",
                    ))
            for m in _SEARCH_TYPE_RE.finditer(line):
                ident = m.group(1)
                if ident not in SEARCH_TYPES:
                    out.append(Violation(
                        category="search_type",
                        identifier=ident,
                        line=line_no,
                        suggestions=nearest(ident, SEARCH_TYPES, k=3),
                        message=f"{ident!r} is not a valid search.Type",
                    ))
        return out
