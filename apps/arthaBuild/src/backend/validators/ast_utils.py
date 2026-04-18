"""Shared helpers for checkers."""
from __future__ import annotations

import difflib


def nearest(ident: str, whitelist: set[str], k: int = 3) -> list[str]:
    """Return up to k closest-matching entries from whitelist (cutoff 0.6).

    Case-sensitive. Empty list if nothing meets cutoff.
    """
    return difflib.get_close_matches(ident, whitelist, n=k, cutoff=0.6)
