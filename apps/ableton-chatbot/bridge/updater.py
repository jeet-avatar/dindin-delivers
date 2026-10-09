"""Check for and install Bridge updates, only when the user chooses to.

The download must match the published SHA-256 and carry Zietra's notarized Developer ID signature.
Installing replaces the app bundle and relaunches it; Ableton and its open set are never touched.
"""

import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.request import Request, urlopen

from bridge_network import tls_context

LATEST_URL = os.getenv("BEATMIND_BRIDGE_LATEST", "https://www.beatmind.io/bridge/latest.json")
TEAM_ID = "PRKZ4UVCD7"
APP_NAME = "BeatMind Bridge.app"


def version_tuple(text):
    return tuple(int(part) for part in re.findall(r"\d+", str(text))[:3]) or (0,)


def check(current_version):
    """The published release if it is newer than current_version, else None."""
    request = Request(LATEST_URL, headers={"User-Agent": f"BeatMind-Bridge/{current_version}"})
    with urlopen(request, timeout=10, context=tls_context()) as response:
        latest = json.loads(response.read())
    required = {"version", "url", "sha256"}
    if not required <= latest.keys() or not re.fullmatch(r"[0-9a-f]{64}", latest["sha256"]):
        raise ValueError("The update description is incomplete.")
    if not latest["url"].startswith("https://www.beatmind.io/"):
        raise ValueError("Updates are only accepted from www.beatmind.io.")
    return latest if version_tuple(latest["version"]) > version_tuple(current_version) else None


def running_app():
    """The installed .app bundle this process runs from, or None when not a packaged app."""
    if not getattr(sys, "frozen", False):
        return None
    for parent in Path(sys.executable).resolve().parents:
        if parent.suffix == ".app":
            return parent
    return None


def _verify(app):
    subprocess.run(["/usr/bin/codesign", "--verify", "--deep", "--strict", str(app)], check=True, capture_output=True)
    details = subprocess.run(["/usr/bin/codesign", "-dv", str(app)], capture_output=True, text=True).stderr
    if f"TeamIdentifier={TEAM_ID}" not in details:
        raise RuntimeError("The update is not signed by Zietra Technologies. Nothing was installed.")
    subprocess.run(["/usr/sbin/spctl", "-a", "-t", "exec", str(app)], check=True, capture_output=True)


def install(latest, progress=lambda text: None):
    """Download, verify and swap in the new app. Returns the app path to relaunch."""
    target = running_app()
    if target is None:
        raise RuntimeError("Download the new Bridge from beatmind.io; this copy cannot update itself.")
    work = Path(tempfile.mkdtemp(prefix="beatmind-update-"))
    mount = work / "mount"
    try:
        progress("Downloading update...")
        dmg = work / "BeatMind-Bridge.dmg"
        digest = hashlib.sha256()
        with urlopen(Request(latest["url"], headers={"User-Agent": "BeatMind-Bridge"}), timeout=60,
                     context=tls_context()) as response, dmg.open("wb") as out:
            for chunk in iter(lambda: response.read(1024 * 1024), b""):
                digest.update(chunk)
                out.write(chunk)
        if digest.hexdigest() != latest["sha256"]:
            raise RuntimeError("The download did not match the published checksum. Nothing was installed.")
        progress("Verifying the signature...")
        subprocess.run(["/usr/bin/hdiutil", "attach", "-nobrowse", "-readonly", "-mountpoint", str(mount), str(dmg)],
                       check=True, capture_output=True)
        source = mount / APP_NAME
        _verify(source)
        progress("Installing...")
        staged = target.with_name(target.name + ".new")
        shutil.rmtree(staged, ignore_errors=True)
        subprocess.run(["/usr/bin/ditto", str(source), str(staged)], check=True, capture_output=True)
        _verify(staged)
        previous = target.with_name(target.name + ".old")
        shutil.rmtree(previous, ignore_errors=True)
        target.rename(previous)
        staged.rename(target)
        return target
    finally:
        if mount.exists():
            subprocess.run(["/usr/bin/hdiutil", "detach", str(mount), "-force"], capture_output=True)
        shutil.rmtree(work, ignore_errors=True)


def relaunch(app):
    """Start the updated app once this process has exited."""
    subprocess.Popen(["/bin/sh", "-c", f'sleep 2; /usr/bin/open -n "{app}"'], start_new_session=True)


def clean_previous():
    app = running_app()
    if app:
        shutil.rmtree(app.with_name(app.name + ".old"), ignore_errors=True)
