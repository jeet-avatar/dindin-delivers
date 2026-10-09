"""Advisory file leases on shared storage; closing a process releases its lease."""

import fcntl
from pathlib import Path


class Busy(Exception):
    pass


class Lease:
    def __init__(self, path):
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.handle = path.open('a+b')
        self.transferred = False
        try:
            fcntl.flock(self.handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            self.handle.close()
            raise Busy('Another worker owns this operation.')

    def close(self):
        if not self.handle.closed:
            fcntl.flock(self.handle, fcntl.LOCK_UN)
            self.handle.close()

    def transfer(self, task):
        self.transferred = True
        task.add_done_callback(lambda _: self.close())

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()
