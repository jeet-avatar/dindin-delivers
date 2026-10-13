"""Verify the exact public model download used by a fresh Bridge installation."""

import hashlib
from pathlib import Path
import sys
from urllib.request import urlopen

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'bridge'))
from bridge_network import tls_context
from local_separation import DRUMSEP_SHA256, DRUMSEP_URL


def main():
    digest = hashlib.sha256()
    size = 0
    with urlopen(DRUMSEP_URL, timeout=60, context=tls_context()) as response:
        if 'text/html' in response.headers.get('Content-Type', '').lower():
            raise RuntimeError('Bridge model URL returned an HTML fallback, not a model.')
        while chunk := response.read(1024 * 1024):
            size += len(chunk)
            if size > 256 * 1024 * 1024:
                raise RuntimeError('Bridge model exceeded its download size limit.')
            digest.update(chunk)
    if digest.hexdigest() != DRUMSEP_SHA256:
        raise RuntimeError('Public Bridge model failed its SHA-256 integrity check.')
    print(f'Public Bridge model verified: {size} bytes, expected SHA-256.')


if __name__ == '__main__':
    main()
