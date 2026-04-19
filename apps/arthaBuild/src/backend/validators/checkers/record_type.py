"""record.Type.* enum checker."""
from __future__ import annotations

import re

from validators.checkers.base import Checker
from validators.whitelist import RECORD_TYPES

_PATTERN = re.compile(r"record\.Type\.([A-Z_]+)")


class RecordTypeChecker(Checker):
    category = "record_type"

    def extract(self, code: str) -> list[tuple[str, int]]:
        out: list[tuple[str, int]] = []
        for line_no, line in enumerate(code.splitlines(), 1):
            for m in _PATTERN.finditer(line):
                out.append((m.group(1), line_no))
        return out

    def whitelist(self) -> set[str]:
        return RECORD_TYPES
