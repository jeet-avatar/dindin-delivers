"""Keep the Bridge's sign-in token so it reconnects without asking for the password again.

macOS: the login Keychain. Elsewhere: a file readable only by the user.
"""

import os
import subprocess
import sys
from pathlib import Path

SERVICE = "com.zietra.beatmind-bridge"
ACCOUNT = "bridge-token"
FALLBACK = Path.home() / ".beatmind" / "bridge-token"


def save(token: str) -> None:
    if sys.platform == "darwin":
        subprocess.run(["/usr/bin/security", "add-generic-password", "-U", "-s", SERVICE, "-a", ACCOUNT, "-w", token],
                       check=True, capture_output=True)
        return
    FALLBACK.parent.mkdir(parents=True, exist_ok=True)
    FALLBACK.write_text(token)
    os.chmod(FALLBACK, 0o600)


def load() -> str | None:
    if sys.platform == "darwin":
        result = subprocess.run(["/usr/bin/security", "find-generic-password", "-s", SERVICE, "-a", ACCOUNT, "-w"],
                                capture_output=True, text=True)
        return result.stdout.strip() or None if result.returncode == 0 else None
    try:
        return FALLBACK.read_text().strip() or None
    except OSError:
        return None


def forget() -> None:
    if sys.platform == "darwin":
        subprocess.run(["/usr/bin/security", "delete-generic-password", "-s", SERVICE, "-a", ACCOUNT], capture_output=True)
    else:
        FALLBACK.unlink(missing_ok=True)
