"""Publish one release identity without changing the separately released Bridge."""
import argparse
import json
from pathlib import Path
import re


def manifest(previous, commit, task):
    if not re.fullmatch(r'[a-f0-9]{40}', commit):
        raise ValueError('A full Git commit is required')
    task = task.rsplit('/', 1)[-1]
    if not re.fullmatch(r'beatmind-api:\d+', task):
        raise ValueError('Expected a BeatMind task revision')
    preserved = {key: value for key, value in previous.items() if key != 'backend_image'}
    return {**preserved, 'previous_release': previous.get('release'),
            'release': 'beatmind-' + commit[:12], 'commit': commit,
            'frontend_commit': commit, 'backend_commit': commit, 'backend_task': task}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('previous', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--commit', required=True)
    parser.add_argument('--task', required=True)
    args = parser.parse_args()
    result = manifest(json.loads(args.previous.read_text()), args.commit, args.task)
    args.output.write_text(json.dumps(result, indent=2) + '\n')
