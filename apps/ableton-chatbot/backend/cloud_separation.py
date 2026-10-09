"""BeatMind Cloud HQ: browser uploads straight to S3, an AWS Batch GPU job separates, the API imports results.

Enabled only when the bucket, job queue and job definition are configured.
"""

import json
import os
from pathlib import Path

REGION = os.getenv('AWS_REGION', 'us-east-1')
UPLOAD_SECONDS = 900
OUT_FILES = ('report.json', 'separation.json')


def settings():
    return {'bucket': os.getenv('BEATMIND_CLOUD_BUCKET', ''), 'queue': os.getenv('BEATMIND_CLOUD_JOB_QUEUE', ''),
            'definition': os.getenv('BEATMIND_CLOUD_JOB_DEFINITION', '')}


def available():
    return all(settings().values())


def _client(name):
    import boto3
    return boto3.client(name, region_name=REGION)


def source_key(reference_id, suffix):
    return f'{reference_id}/source{suffix}'


def upload_form(reference_id, suffix, max_bytes):
    """A presigned POST: the file goes straight to S3 and S3 enforces the size limit."""
    form = _client('s3').generate_presigned_post(
        settings()['bucket'], source_key(reference_id, suffix),
        Conditions=[['content-length-range', 1, max_bytes]], ExpiresIn=UPLOAD_SECONDS)
    return {'url': form['url'], 'fields': form['fields']}


def uploaded_bytes(reference_id, suffix):
    try:
        return _client('s3').head_object(Bucket=settings()['bucket'], Key=source_key(reference_id, suffix))['ContentLength']
    except Exception:
        return None


def submit(reference_id, suffix):
    config = settings()
    job = _client('batch').submit_job(
        jobName=f'beatmind-{reference_id}', jobQueue=config['queue'], jobDefinition=config['definition'],
        containerOverrides={'command': ['python', 'cloud_job.py', config['bucket'], reference_id,
                                        source_key(reference_id, suffix)]})
    return job['jobId']


def job_state(job_id):
    """(Batch status, reason). Unknown jobs report FAILED so a reference never waits forever."""
    jobs = _client('batch').describe_jobs(jobs=[job_id])['jobs']
    if not jobs:
        return 'FAILED', 'The GPU job is no longer known to AWS Batch.'
    return jobs[0]['status'], jobs[0].get('statusReason', '')


def failure_message(reference_id, reason):
    try:
        body = _client('s3').get_object(Bucket=settings()['bucket'], Key=f'{reference_id}/status.json')['Body'].read()
        error = json.loads(body).get('error')
        if error:
            return str(error)[:300]
    except Exception:
        pass
    return 'Separation failed on the BeatMind GPU.' + (f' ({reason[:120]})' if reason else '')


def import_results(reference_id, directory):
    """Copy the job's stems and report next to the reference, then delete them from S3. Returns stem names."""
    s3, bucket = _client('s3'), settings()['bucket']
    prefix = f'{reference_id}/out/'
    for name in OUT_FILES:
        s3.download_file(bucket, prefix + name, str(Path(directory) / name))
    names = json.loads((Path(directory) / 'separation.json').read_text())['stems']
    for name in ('mix', *names):
        s3.download_file(bucket, f'{prefix}{name}.wav', str(Path(directory) / f'{name}.wav'))
    delete_objects(reference_id)
    return names


def delete_objects(reference_id):
    s3, bucket = _client('s3'), settings()['bucket']
    keys = [item['Key'] for page in s3.get_paginator('list_objects_v2').paginate(Bucket=bucket, Prefix=f'{reference_id}/')
            for item in page.get('Contents', [])]
    for start in range(0, len(keys), 1000):
        s3.delete_objects(Bucket=bucket, Delete={'Objects': [{'Key': k} for k in keys[start:start + 1000]], 'Quiet': True})


def cancel(job_id):
    try:
        _client('batch').terminate_job(jobId=job_id, reason='Reference deleted by its owner.')
    except Exception:
        pass
