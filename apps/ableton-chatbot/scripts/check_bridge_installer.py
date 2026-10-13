"""Verify the actual macOS updater in a disposable home, without launching apps."""

import argparse
import hashlib
import json
from pathlib import Path
import plistlib
import sys
import tempfile
import types
from unittest.mock import patch

from PyInstaller.archive.readers import CArchiveReader

BRIDGE = Path(__file__).resolve().parents[1] / 'bridge'
sys.path.insert(0, str(BRIDGE))
import updater


def digest(path):
    with path.open('rb') as handle:
        return hashlib.file_digest(handle, 'sha256').hexdigest()


def constants(value):
    if isinstance(value, types.CodeType):
        yield from constants(value.co_consts)
    elif isinstance(value, (tuple, frozenset)):
        for item in value:
            yield from constants(item)
    elif isinstance(value, str):
        yield value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('installer', type=Path)
    parser.add_argument('--version', required=True)
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    installer = args.installer.resolve()
    identity = digest(installer)
    with tempfile.TemporaryDirectory(prefix='beatmind-installer-acceptance-') as temporary:
        home = Path(temporary)
        # Only substitute download transport and the destination; signature checks stay real.
        with patch.object(updater, 'running_app', return_value=Path('/Volumes/BeatMind/BeatMind Bridge.app')), \
                patch.object(updater.Path, 'home', return_value=home), \
                patch.object(updater, 'urlopen', side_effect=lambda *a, **kw: installer.open('rb')):
            installed = updater.install({'url': 'https://www.beatmind.io/bridge/installer-test.dmg',
                                         'sha256': identity}, progress=print)
        assert installed == home / 'Applications/BeatMind Bridge.app'
        info = plistlib.loads((installed / 'Contents/Info.plist').read_bytes())
        assert info['CFBundleShortVersionString'] == args.version
        archive = CArchiveReader(str(installed / 'Contents/MacOS/BeatMind Bridge'))
        pyz = archive.open_embedded_archive(next(name for name in archive.toc if name.endswith('.pyz')))
        assert 'remix_import' in pyz.toc
        bridge_constants = set(constants(pyz.extract('bridge')))
        assert args.version in bridge_constants
        assert 'remix_preview_import_v1' in bridge_constants
        checked = []
        for source in sorted((BRIDGE / 'abletonosc').glob('beatmind_*.py')):
            bundled = installed / 'Contents/Resources/abletonosc' / source.name
            assert digest(source) == digest(bundled), f'Bundled extension differs: {source.name}'
            checked.append(source.name)
        assert 'beatmind_remix.py' in checked
    report = {'version': args.version, 'sha256': identity, 'real_install': 'passed',
              'signature_and_gatekeeper': 'passed', 'bundled_extensions_match_source': checked,
              'frozen_remix_import_capability': True, 'launched_app': False,
              'ableton_acceptance': 'not_tested'}
    args.report.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))


if __name__ == '__main__':
    main()
