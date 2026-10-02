"""Pinned AbletonOSC runtime bundled at build time; setup needs no network."""
import hashlib
import io
from pathlib import Path, PurePosixPath
import stat
import sys
from urllib.request import urlopen
import zipfile

COMMIT = "0ca68214bd62c9b5cb641ca34006cfd70ba94430"
SHA256 = "3061a2dca3baba24aaf1ac459ca5c4787c1c96a24302cbd3cf6170996c82ad88"
URL = f"https://codeload.github.com/ideoforms/AbletonOSC/zip/{COMMIT}"


def payload(archive):
    data = Path(archive).read_bytes()
    if hashlib.sha256(data).hexdigest() != SHA256:
        raise RuntimeError("Bundled AbletonOSC checksum failed. Reinstall BeatMind Bridge. No files changed.")
    files = {}
    with zipfile.ZipFile(io.BytesIO(data)) as source:
        for info in source.infolist():
            path = PurePosixPath(info.filename)
            if (path.is_absolute() or ".." in path.parts or "\\" in info.filename
                    or path.parts[0] != f"AbletonOSC-{COMMIT}"
                    or stat.S_ISLNK(info.external_attr >> 16)):
                raise RuntimeError("Unsafe AbletonOSC archive. No files changed.")
            relative = PurePosixPath(*path.parts[1:])
            if info.is_dir() or not relative.parts:
                continue
            if relative.parts[0] in {"abletonosc", "pythonosc"} or str(relative) in {
                "__init__.py", "manager.py", "LICENSE.md", "README.md"
            }:
                files[str(relative)] = source.read(info)
    if not {"__init__.py", "manager.py", "abletonosc/handler.py", "pythonosc/osc_server.py", "LICENSE.md"} <= files.keys():
        raise RuntimeError("Bundled AbletonOSC is incomplete. No files changed.")
    return files


def download(destination):
    from bridge_network import tls_context
    with urlopen(URL, timeout=45, context=tls_context()) as response:
        data = response.read(2 * 1024 * 1024)
    if hashlib.sha256(data).hexdigest() != SHA256:
        raise RuntimeError("AbletonOSC download does not match the pinned release")
    Path(destination).write_bytes(data)
    payload(destination)


if __name__ == "__main__":
    download(sys.argv[1])
