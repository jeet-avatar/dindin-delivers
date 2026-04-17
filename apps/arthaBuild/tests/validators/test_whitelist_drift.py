"""Drift test: regenerated whitelist must match the committed whitelist."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).parent.parent.parent
BUILD_SCRIPT = REPO_ROOT / "scripts" / "build_whitelist.py"
COMMITTED = REPO_ROOT / "src" / "backend" / "validators" / "whitelist.py"

FLOORS = {
    "RECORD_TYPES": 100,
    "MODULES": 30,
    "SCRIPT_TYPES": 10,
    "SEARCH_TYPES": 100,
    "SEARCH_APIS": 10,
}


def test_whitelist_not_drifted(tmp_path: Path) -> None:
    """Regenerate the whitelist into a tmp file via `--out` and diff against the committed file."""
    out = tmp_path / "whitelist.py"
    result = subprocess.run(
        [sys.executable, str(BUILD_SCRIPT), "--out", str(out)],
        capture_output=True,
        text=True,
        cwd=REPO_ROOT,
    )
    assert result.returncode == 0, (
        f"build_whitelist failed (exit {result.returncode}):\nstdout:{result.stdout}\nstderr:{result.stderr}"
    )
    regenerated = out.read_text()
    committed = COMMITTED.read_text()
    assert regenerated == committed, (
        "whitelist.py is stale. Re-run `python apps/arthaBuild/scripts/build_whitelist.py` and commit."
    )


@pytest.mark.parametrize("name,floor", FLOORS.items())
def test_committed_whitelist_meets_floor(name: str, floor: int) -> None:
    from src.backend.validators import whitelist
    s = getattr(whitelist, name)
    assert len(s) >= floor, f"{name} has {len(s)} entries, floor is {floor}"
