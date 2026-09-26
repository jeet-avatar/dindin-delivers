"""Prepare an ECS definition with an audio secret reference, never its value."""

import copy
import json
import os
import re
from pathlib import Path


def prepare_task(task, image, secret_arn, smtp=None):
    if not re.fullmatch(r'arn:aws:secretsmanager:us-east-1:134607809447:secret:'
                        r'beatmind/production/audio-provider-[A-Za-z0-9]{6}', secret_arn):
        raise ValueError('Expected the BeatMind production audio secret ARN.')
    if not image or any(char.isspace() for char in image):
        raise ValueError('A release image is required.')
    result = copy.deepcopy(task)
    if result.get('family') != 'beatmind-api':
        raise ValueError('Only the beatmind-api task family can be prepared.')
    containers = [c for c in result['containerDefinitions'] if c['name'] == 'beatmind-api']
    if len(containers) != 1:
        raise ValueError('Expected exactly one beatmind-api container.')
    for name in ('taskDefinitionArn', 'revision', 'status', 'requiresAttributes',
                 'compatibilities', 'registeredAt', 'registeredBy', 'deregisteredAt'):
        result.pop(name, None)
    container = containers[0]
    container['image'] = image
    environment = {e['name']: e['value'] for e in container.get('environment', [])}
    secrets = {s['name']: s['valueFrom'] for s in container.get('secrets', [])}
    # Never leave an old plaintext audio key or fallback in the registered task.
    for name in ('BEATMIND_AUDIO_API_KEY', 'OPENAI_API_KEY'):
        environment.pop(name, None)
        secrets.pop(name, None)
    secrets['BEATMIND_AUDIO_API_KEY'] = secret_arn + ':BEATMIND_AUDIO_API_KEY::'
    environment['BEATMIND_AUDIO_KEY_ROTATION_CONFIRMED'] = '1'
    environment.setdefault('BEATMIND_AUDIO_LISTENING_ENABLED', '0')
    for name, value in (smtp or {}).items():
        if name not in ('SMTP_USER', 'SMTP_PASSWORD'):
            raise ValueError('Unexpected SMTP setting.')
        if value:
            environment[name] = value
            secrets.pop(name, None)
    container['environment'] = [{'name': k, 'value': v} for k, v in environment.items()]
    container['secrets'] = [{'name': k, 'valueFrom': v} for k, v in secrets.items()]
    return result


def main():
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('destination', type=Path)
    args = parser.parse_args()
    result = prepare_task(json.loads(args.source.read_text()), os.environ['RELEASE_IMAGE'],
                          os.environ['AUDIO_SECRET_ARN'],
                          {k: os.environ.get(k, '') for k in ('SMTP_USER', 'SMTP_PASSWORD')})
    # Existing task settings may include legacy credentials; do not print them.
    fd = os.open(args.destination, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w') as target:
        os.fchmod(target.fileno(), 0o600)
        json.dump(result, target)


if __name__ == '__main__':
    main()
