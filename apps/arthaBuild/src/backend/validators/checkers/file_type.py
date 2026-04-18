"""file.Type.* enum checker (N/file Module Type enum)."""
from __future__ import annotations

import re

from src.backend.validators.checkers.base import Checker
from src.backend.validators.whitelist import FILE_TYPES

_PATTERN = re.compile(r"\bfile\.Type\.([A-Za-z_][A-Za-z0-9_]*)")


class FileTypeChecker(Checker):
    category = "file_type"

    def extract(self, code: str) -> list[tuple[str, int]]:
        out: list[tuple[str, int]] = []
        for line_no, line in enumerate(code.splitlines(), 1):
            for m in _PATTERN.finditer(line):
                out.append((m.group(1), line_no))
        return out

    def whitelist(self) -> set[str]:
        return FILE_TYPES
