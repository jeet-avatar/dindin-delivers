"""exportLibrary.db writer — CDJ-3000X OneLibrary format (DEFERRED).

DISCOVERY: The reference ``/Volumes/Untitled/PIONEER/rekordbox/exportLibrary.db``
is **SQLCipher-encrypted** (first 16 bytes: ``0d5ad2b9304f87684993...``),
NOT plain SQLite as the original plan claimed. The ``master.db`` key that
pyrekordbox uses does NOT unlock OneLibrary — it fails with
"file is not a database" under every attempted passphrase
(empty, master key, ``pioneer``, ``onelibrary``, zeros).

SCOPE DECISION for Phase 21 (Rule 4 — architectural deviation from plan):

* **Target device is CDJ-3000**, which reads ``export.pdb`` — not
  ``exportLibrary.db`` (per the plan's own Task 4 narrative).
* CDJ-3000X (forward-compat target) reads ``exportLibrary.db`` when
  present; if the file is missing it falls back to ``export.pdb``.
* Reverse-engineering the OneLibrary SQLCipher key is out of Phase 21
  scope and requires firmware image analysis.

Therefore this module does NOT write a ``exportLibrary.db`` file —
CDJ-3000X will fall back to ``export.pdb`` (our primary output). A
follow-up plan can populate OneLibrary once the encryption key is
known; the public API here is defined so callers can be switched
over atomically at that time.

License: MIT. No rbox.
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional


def write(
    out_path: Path,
    tracks: Optional[list] = None,
    playlists: Optional[list] = None,
) -> dict:
    """DEFERRED — does NOT write a file.

    Returns a sentinel dict so callers can branch on
    ``result["status"] == "deferred"`` without raising.
    """
    return {
        "status": "deferred",
        "reason": (
            "OneLibrary is SQLCipher-encrypted; key not available. "
            "CDJ-3000X falls back to export.pdb when this file is missing."
        ),
        "path": str(out_path),
    }
