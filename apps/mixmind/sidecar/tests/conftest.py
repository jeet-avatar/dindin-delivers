import pytest
from pathlib import Path
from httpx import AsyncClient, ASGITransport
from main import app


# ---------------------------------------------------------------------------
# Reference USB read-only sentinel (Phase 21 plan 21-03 invariant)
#
# /Volumes/Untitled/PIONEER/USBANLZ/ holds 91 real Rekordbox-exported tracks
# that the byte-level oracle compares against. No test in this suite may
# mutate those files. This session-scoped fixture hashes the tree before and
# after the test session and raises a loud error on any change.
# ---------------------------------------------------------------------------

_REF_USB = Path("/Volumes/Untitled")


def _snapshot_ref_usb() -> list[tuple[str, int]]:
    """Snapshot sorted list of (path, mtime_ns) for every file under ref USB.

    Returns empty list if the USB isn't mounted — fixture then becomes a no-op.
    """
    if not _REF_USB.exists():
        return []
    snap: list[tuple[str, int]] = []
    for p in _REF_USB.rglob("*"):
        try:
            if p.is_file():
                snap.append((str(p), p.stat().st_mtime_ns))
        except (PermissionError, OSError):
            # macOS system files under /Volumes/.Trashes etc. may be unreadable.
            continue
    snap.sort()
    return snap


@pytest.fixture(scope="session", autouse=True)
def _ref_usb_readonly_sentinel():
    """Fail the test session if any file under /Volumes/Untitled mutates."""
    before = _snapshot_ref_usb()
    yield
    if not before:
        return   # USB wasn't mounted — nothing to check
    after = _snapshot_ref_usb()
    if before != after:
        # Find the first divergence for diagnostics.
        before_set = dict(before)
        after_set = dict(after)
        mutated = [p for p, m in after if before_set.get(p) != m]
        added = sorted(set(after_set) - set(before_set))
        removed = sorted(set(before_set) - set(after_set))
        raise RuntimeError(
            "Reference USB at /Volumes/Untitled was mutated during tests — "
            "Phase 21 invariant violated. "
            f"mutated={mutated[:5]}, added={added[:5]}, removed={removed[:5]}"
        )


@pytest.fixture(scope="function")
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
