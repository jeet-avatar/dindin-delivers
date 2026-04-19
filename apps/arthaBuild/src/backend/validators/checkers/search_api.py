"""search.* method checker (anchored to avoid member-expression false positives)."""
from __future__ import annotations

import re

from validators.checkers.base import Checker
from validators.whitelist import SEARCH_APIS

_PATTERN = re.compile(r"(?:^|[\s=;,(])search\.([a-z][A-Za-z_]*)\s*\(")


class SearchApiChecker(Checker):
    category = "search_api"

    def extract(self, code: str) -> list[tuple[str, int]]:
        out: list[tuple[str, int]] = []
        for line_no, line in enumerate(code.splitlines(), 1):
            for m in _PATTERN.finditer(line):
                out.append((m.group(1), line_no))
        return out

    def whitelist(self) -> set[str]:
        return SEARCH_APIS
