"""Checker ABC + dataclasses."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Violation:
    category: str
    identifier: str
    line: int
    suggestions: list[str] = field(default_factory=list)
    message: str = ""


@dataclass
class LintResult:
    valid: bool
    violations: list[Violation] = field(default_factory=list)
    elapsed_ms: int = 0


class Checker(ABC):
    category: str

    @abstractmethod
    def extract(self, code: str) -> list[tuple[str, int]]:
        """Return (identifier, line_number) pairs found in code."""

    @abstractmethod
    def whitelist(self) -> set[str]:
        """Valid identifiers for this category."""

    def check(self, code: str) -> list[Violation]:
        from validators.ast_utils import nearest
        wl = self.whitelist()
        out: list[Violation] = []
        for ident, line in self.extract(code):
            if ident not in wl:
                out.append(Violation(
                    category=self.category,
                    identifier=ident,
                    line=line,
                    suggestions=nearest(ident, wl, k=3),
                    message=f"{ident!r} is not a valid {self.category}",
                ))
        return out
