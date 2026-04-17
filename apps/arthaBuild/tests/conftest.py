"""Pytest bootstrap: ensure `apps/arthaBuild/` is on sys.path so tests can
import `src.backend.validators.whitelist` as a namespace package."""
from __future__ import annotations

import sys
from pathlib import Path

ARTHA_ROOT = Path(__file__).parent.parent
if str(ARTHA_ROOT) not in sys.path:
    sys.path.insert(0, str(ARTHA_ROOT))
