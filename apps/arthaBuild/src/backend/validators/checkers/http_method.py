"""http.Method.* enum checker (N/http Module Method enum)."""
from __future__ import annotations

import re

from validators.checkers.base import Checker
from validators.whitelist import HTTP_METHODS

_PATTERN = re.compile(r"\bhttp\.Method\.([A-Za-z_][A-Za-z0-9_]*)")


class HttpMethodChecker(Checker):
    category = "http_method"

    def extract(self, code: str) -> list[tuple[str, int]]:
        out: list[tuple[str, int]] = []
        for line_no, line in enumerate(code.splitlines(), 1):
            for m in _PATTERN.finditer(line):
                out.append((m.group(1), line_no))
        return out

    def whitelist(self) -> set[str]:
        return HTTP_METHODS
