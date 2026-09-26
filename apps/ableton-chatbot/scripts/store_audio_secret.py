"""Interactive secret entry: key is never an argument, environment value or file."""

import getpass
import json
import sys

import boto3
import httpx
from botocore.exceptions import ClientError


def validate_key(key):
    try:
        response = httpx.get('https://api.openai.com/v1/models',
                             headers={'Authorization': 'Bearer ' + key}, timeout=20)
    except httpx.HTTPError:
        raise SystemExit('Could not reach OpenAI to verify the key. Nothing stored.')
    if response.status_code == 401:
        raise SystemExit('OpenAI rejected this key. Copy an active key from the correct OpenAI project. Nothing stored.')
    if response.status_code != 200:
        raise SystemExit(f'OpenAI key verification returned HTTP {response.status_code}. Check project permissions or try again later. Nothing stored.')


def main():
    if not sys.stdin.isatty():
        raise SystemExit('Run this command in your own interactive terminal.')
    session = boto3.Session(region_name='us-east-1')
    account = session.client('sts').get_caller_identity()['Account']
    if account != '134607809447':
        raise SystemExit('Wrong AWS account. Select the BeatMind production AWS profile first.')
    client = session.client('secretsmanager')
    name = 'beatmind/production/audio-provider'
    exists = True
    try:
        client.describe_secret(SecretId=name)
    except client.exceptions.ResourceNotFoundException:
        exists = False
    print(f'AWS account: {account}; region: us-east-1; secret: {name}')
    if exists and input('Replace the stored audio key? Type REPLACE: ').strip() != 'REPLACE':
        raise SystemExit('Unchanged.')
    if input('Revoke the previously exposed key first. Type ROTATED when done: ').strip() != 'ROTATED':
        raise SystemExit('No secret stored. Revoke the old key and run again.')
    key = getpass.getpass('Paste the NEW OpenAI API key (hidden): ').strip()
    if not key.startswith('sk-') or len(key) < 30 or any(c.isspace() for c in key):
        raise SystemExit('The input does not look like an API key. Nothing stored.')
    print('Checking key authentication with OpenAI (no audio is uploaded)...')
    validate_key(key)
    value = json.dumps({'BEATMIND_AUDIO_API_KEY': key})
    if exists:
        result = client.put_secret_value(SecretId=name, SecretString=value)
    else:
        result = client.create_secret(Name=name, Description='BeatMind production audio provider', SecretString=value)
    del key, value
    print('OpenAI authentication passed. Secret stored. Value was not printed or written to disk.')
    print('Secret ARN:', result['ARN'])
    print('This does not deploy or enable the audio provider. Return to Codex and say: secret stored.')


if __name__ == '__main__':
    try:
        main()
    except ClientError as error:
        raise SystemExit('AWS rejected the operation: ' + error.response.get('Error', {}).get('Code', 'Unknown'))
