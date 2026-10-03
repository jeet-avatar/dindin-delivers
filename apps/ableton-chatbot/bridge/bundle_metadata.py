"""Stamp the macOS bundle from the same version advertised by the Bridge."""

import ast
from pathlib import Path
import plistlib
import re

from launch_link import URL_TYPES


def source_version(source):
    values = [ast.literal_eval(node.value) for node in ast.parse(source).body
              if isinstance(node, ast.Assign)
              and any(isinstance(t, ast.Name) and t.id == "BRIDGE_VERSION" for t in node.targets)]
    if len(values) != 1 or not isinstance(values[0], str) or not re.fullmatch(r"[1-9]\d*\.\d+\.\d+", values[0]):
        raise ValueError("One non-placeholder numeric BRIDGE_VERSION is required.")
    return values[0]


def configure(path, source):
    version = source_version(source)
    with path.open("rb") as handle:
        info = plistlib.load(handle)
    info.update(CFBundleShortVersionString=version, CFBundleVersion=version,
                CFBundleURLTypes=URL_TYPES, LSMinimumSystemVersion="14.0")
    with path.open("wb") as handle:
        plistlib.dump(info, handle)
    return version


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("plist", type=Path)
    args = parser.parse_args()
    print("Bundle version:", configure(args.plist, Path(__file__).with_name("bridge.py").read_text()))
