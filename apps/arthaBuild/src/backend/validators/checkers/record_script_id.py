"""record-as-string-literal checker.

Catches `record.load({type: 'salesorder'})`-style calls where a hallucinated
scriptId is passed instead of `record.Type.SALES_ORDER`. The canonical
whitelist is derived from `RECORD_TYPES` (lowercase, underscores stripped),
plus any `customrecord_*`, `customlist_*`, or `customtransaction_*` prefix
which NetSuite allows for user-defined records.
"""
from __future__ import annotations

import re

from validators.checkers.base import Checker
from validators.whitelist import RECORD_SCRIPT_IDS

# record.{load|create|copy|delete|transform}({ ... type: 'foo' ... })
# DOTALL so the options-object body can span lines. The type field may appear
# before or after other keys, so we match the nearest type:'...' inside the
# options-object braces.
_CALL_RE = re.compile(
    r"record\.(?:load|create|copy|delete|transform)\s*\(\s*\{([^{}]*?)\}",
    re.DOTALL,
)
_TYPE_RE = re.compile(r"\btype\s*:\s*['\"]([^'\"]+)['\"]")

_CUSTOM_PREFIX_RE = re.compile(r"^(?:customrecord|customlist|customtransaction)_")


class RecordScriptIdChecker(Checker):
    category = "record_script_id"

    def extract(self, code: str) -> list[tuple[str, int]]:
        out: list[tuple[str, int]] = []
        for m in _CALL_RE.finditer(code):
            body = m.group(1)
            tm = _TYPE_RE.search(body)
            if not tm:
                continue
            ident = tm.group(1)
            # Compute line number of the literal (not the outer call).
            line_no = code.count("\n", 0, m.start() + tm.start()) + 1
            out.append((ident, line_no))
        return out

    def whitelist(self) -> set[str]:
        return RECORD_SCRIPT_IDS

    def check(self, code: str):
        # Override base.check to allow custom* prefixes without false-flagging.
        from validators.ast_utils import nearest
        from validators.checkers.base import Violation

        wl = self.whitelist()
        out: list[Violation] = []
        for ident, line in self.extract(code):
            if ident in wl:
                continue
            if _CUSTOM_PREFIX_RE.match(ident):
                continue
            out.append(Violation(
                category=self.category,
                identifier=ident,
                line=line,
                suggestions=nearest(ident, wl, k=3),
                message=f"{ident!r} is not a valid record scriptId",
            ))
        return out
