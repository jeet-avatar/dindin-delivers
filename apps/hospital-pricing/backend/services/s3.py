# apps/hospital-pricing/backend/services/s3.py
import boto3
from botocore.exceptions import ClientError
from config import settings


def _get_client():
    return boto3.client("s3", region_name=settings.aws_region)


def generate_presigned_upload_url(s3_key: str, expires_in: int = 3600) -> str:
    """Generate a presigned PUT URL for direct client upload to S3."""
    client = _get_client()
    return client.generate_presigned_url(
        "put_object",
        Params={"Bucket": settings.s3_bucket, "Key": s3_key},
        ExpiresIn=expires_in,
    )


def generate_presigned_download_url(s3_key: str, expires_in: int = 3600) -> str:
    """Generate a presigned GET URL for downloading from S3."""
    client = _get_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket, "Key": s3_key},
        ExpiresIn=expires_in,
    )


def download_bytes(s3_key: str) -> bytes:
    """Download object from S3 and return raw bytes."""
    client = _get_client()
    response = client.get_object(Bucket=settings.s3_bucket, Key=s3_key)
    return response["Body"].read()


def upload_bytes(s3_key: str, data: bytes, content_type: str = "application/pdf") -> str:
    """Upload bytes to S3, return the s3_key."""
    client = _get_client()
    client.put_object(
        Bucket=settings.s3_bucket,
        Key=s3_key,
        Body=data,
        ContentType=content_type,
    )
    return s3_key
