"""Write-ahead import receipts. An interrupted music write is never retried blindly."""

from datetime import datetime, timezone
import json
import os
import uuid

from file_lock import Busy, Lease


INSPECT = ('Stem placement was interrupted and may be partially applied. '
           'Inspect the current Live Set before another import; no automatic retry was sent.')


def lease(directory):
    # Outside the reference directory so deletion cannot replace a held lock inode.
    return Lease(directory.parent / '.import-locks' / (directory.name + '.lock'))


def read(directory):
    path = directory / 'import.json'
    if not path.exists():
        return {'status': 'idle'}
    try:
        value = json.loads(path.read_text())
        if not isinstance(value, dict) or value.get('status') not in {
                'importing', 'verified', 'failed', 'needs_inspection'}:
            raise ValueError('Invalid import state')
        return value
    except (ValueError, OSError):
        return {'status': 'needs_inspection', 'error': INSPECT}


def save(directory, state):
    state = {**state, 'updated_at': datetime.now(timezone.utc).isoformat()}
    targets = [directory / 'import.json']
    if state.get('operation_id'):
        history = directory / 'imports'
        history.mkdir(exist_ok=True, mode=0o700)
        targets.insert(0, history / (state['operation_id'] + '.json'))
    for path in targets:
        temporary = path.with_name(path.name + '.' + uuid.uuid4().hex + '.tmp')
        try:
            with temporary.open('x') as handle:
                os.chmod(temporary, 0o600)
                json.dump(state, handle, allow_nan=False)
                handle.flush()
                os.fsync(handle.fileno())
            temporary.replace(path)
            fd = os.open(path.parent, os.O_RDONLY)
            try:
                os.fsync(fd)
            finally:
                os.close(fd)
        finally:
            temporary.unlink(missing_ok=True)
    return state


def previous(directory, operation_id):
    path = directory / 'imports' / (operation_id + '.json')
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text())
    except (ValueError, OSError):
        return {'status': 'needs_inspection', 'error': INSPECT}


def recover(directory):
    """Called under the lease: an importing receipt without its worker is ambiguous."""
    state = read(directory)
    if state['status'] == 'importing':
        state = save(directory, {**state, 'status': 'needs_inspection', 'error': INSPECT})
    return state


def status(directory):
    try:
        with lease(directory):
            return recover(directory)
    except Busy:
        return read(directory)
