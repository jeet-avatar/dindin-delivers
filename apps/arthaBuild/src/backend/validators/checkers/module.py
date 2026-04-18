"""N/* module checker."""
from __future__ import annotations

import re

from src.backend.validators.checkers.base import Checker
from src.backend.validators.whitelist import MODULES

_PATTERNS = [
    re.compile(r"""define\(\s*\[\s*['"]([^'"]+)['"]"""),
    re.compile(r"""require\(\s*\[\s*['"]([^'"]+)['"]"""),
]


class ModuleChecker(Checker):
    category = "module"

    def extract(self, code: str) -> list[tuple[str, int]]:
        out: list[tuple[str, int]] = []
        for line_no, line in enumerate(code.splitlines(), 1):
            for pat in _PATTERNS:
                for m in pat.finditer(line):
                    out.append((m.group(1), line_no))
        return out

    def whitelist(self) -> set[str]:
        return MODULES
