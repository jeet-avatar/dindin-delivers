"""AWS Batch GPU job: separate one uploaded reference at the highest quality and write results to S3.

Usage: python cloud_job.py <bucket> <reference_id> <source_key>
Quality settings come from the job definition environment (htdemucs_ft, CUDA, shifts, drumsep).
"""

import json
from pathlib import Path
import sys
import tempfile

import boto3

import reference_worker


def run(bucket, reference_id, source_key, s3=None):
    s3 = s3 or boto3.client('s3')
    prefix = f'{reference_id}/'

    def put_status(status, **details):
        s3.put_object(Bucket=bucket, Key=prefix + 'status.json', Body=json.dumps({'status': status, **details}),
                      ContentType='application/json')

    with tempfile.TemporaryDirectory() as folder:
        directory = Path(folder)
        source = 'source' + Path(source_key).suffix.lower()
        s3.download_file(bucket, source_key, str(directory / source))
        (directory / 'meta.json').write_text(json.dumps({'id': reference_id, 'source_file': source}))
        try:
            reference_worker.analyze(directory)
        except (ValueError, RuntimeError) as error:
            put_status('failed', error=str(error)[:300])
            raise
        except Exception:
            put_status('failed', error='Separation failed on the BeatMind GPU.')
            raise
        names = json.loads((directory / 'separation.json').read_text())['stems']
        for name in ('mix', *names):
            s3.upload_file(str(directory / f'{name}.wav'), bucket, f'{prefix}out/{name}.wav',
                           ExtraArgs={'ContentType': 'audio/wav'})
        for name in ('report.json', 'separation.json'):
            s3.upload_file(str(directory / name), bucket, f'{prefix}out/{name}', ExtraArgs={'ContentType': 'application/json'})
        put_status('ready', stems=names)


if __name__ == '__main__':
    run(*sys.argv[1:4])
