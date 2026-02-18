"""
S3 Service for EatFair P2P Platform
Handles file uploads to AWS S3 with local fallback

Uses S3 when AWS credentials are configured, otherwise falls back to local storage.
"""

import os
import uuid
import aiofiles
from datetime import datetime
from pathlib import Path
from typing import Tuple, Optional
import logging

logger = logging.getLogger(__name__)

# Configuration from environment
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
S3_BUCKET = os.environ.get("S3_BUCKET", "dollor-ai-uploads")

# Environment detection for CDN URL defaults
_ENVIRONMENT = os.environ.get("ENVIRONMENT", "production").lower()
_IS_PRODUCTION = _ENVIRONMENT in ("production", "prod")

# CDN URL - defaults to production in production, empty in development (uses local)
CDN_BASE_URL = os.environ.get("CDN_BASE_URL", "https://cdn.dollor.ai" if _IS_PRODUCTION else "")

# Local storage path (fallback when S3 not configured) - configurable via environment
LOCAL_UPLOAD_DIR = Path(os.environ.get("LOCAL_UPLOAD_DIR", "/tmp/dollor_uploads"))


class S3Service:
    """S3 file upload service with local fallback"""

    def __init__(self):
        self.use_s3 = bool(AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY)
        self.s3_client = None

        if self.use_s3:
            try:
                import boto3
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
                    region_name=AWS_REGION
                )
                logger.info("S3 service initialized with AWS credentials")
            except ImportError:
                logger.warning("boto3 not installed, falling back to local storage")
                self.use_s3 = False
            except Exception as e:
                logger.warning(f"Failed to initialize S3 client: {e}, falling back to local storage")
                self.use_s3 = False
        else:
            logger.info("S3 credentials not configured, using local storage")

        # Ensure local upload directory exists
        LOCAL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    async def upload_file(
        self,
        file_content: bytes,
        original_filename: str,
        folder: str = "uploads",
        content_type: Optional[str] = None
    ) -> Tuple[bool, str, str]:
        """
        Upload a file to S3 or local storage.

        Args:
            file_content: The file content as bytes
            original_filename: Original filename for extension detection
            folder: Folder path within bucket/local storage
            content_type: MIME type of the file

        Returns:
            Tuple of (success, url_or_path, message)
        """
        # Generate unique filename
        ext = Path(original_filename).suffix.lower() if original_filename else ".bin"
        unique_filename = f"{uuid.uuid4().hex[:12]}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}{ext}"

        # Clean folder path
        folder = folder.strip("/")
        key = f"{folder}/{unique_filename}"

        if self.use_s3:
            return await self._upload_to_s3(file_content, key, content_type)
        else:
            return await self._upload_to_local(file_content, key)

    async def _upload_to_s3(
        self,
        file_content: bytes,
        key: str,
        content_type: Optional[str]
    ) -> Tuple[bool, str, str]:
        """Upload file to S3 with private ACL"""
        try:
            extra_args = {}
            if content_type:
                extra_args['ContentType'] = content_type
            extra_args['ACL'] = 'private'

            # Use put_object for bytes content
            self.s3_client.put_object(
                Bucket=S3_BUCKET,
                Key=key,
                Body=file_content,
                **extra_args
            )

            # Store the S3 key for presigned URL generation later
            url = f"s3://{S3_BUCKET}/{key}"
            logger.info(f"File uploaded to S3 (private): {key}")

            return True, url, "File uploaded successfully to S3"

        except Exception as e:
            logger.error(f"S3 upload failed: {e}")
            # Fall back to local storage
            return await self._upload_to_local(file_content, key)

    async def _upload_to_local(
        self,
        file_content: bytes,
        key: str
    ) -> Tuple[bool, str, str]:
        """Upload file to local storage"""
        try:
            # Create full path
            file_path = LOCAL_UPLOAD_DIR / key
            file_path.parent.mkdir(parents=True, exist_ok=True)

            # Write file
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(file_content)

            # Return local path as URL (for development)
            url = f"/uploads/{key}"
            logger.info(f"File uploaded locally: {file_path}")

            return True, url, "File uploaded successfully to local storage"

        except Exception as e:
            logger.error(f"Local upload failed: {e}")
            return False, "", f"Upload failed: {str(e)}"

    async def delete_file(self, key: str) -> Tuple[bool, str]:
        """
        Delete a file from S3 or local storage.

        Args:
            key: File key/path

        Returns:
            Tuple of (success, message)
        """
        if self.use_s3:
            try:
                self.s3_client.delete_object(Bucket=S3_BUCKET, Key=key)
                return True, "File deleted from S3"
            except Exception as e:
                logger.error(f"S3 delete failed: {e}")
                return False, f"Delete failed: {str(e)}"
        else:
            try:
                file_path = LOCAL_UPLOAD_DIR / key
                if file_path.exists():
                    file_path.unlink()
                return True, "File deleted from local storage"
            except Exception as e:
                logger.error(f"Local delete failed: {e}")
                return False, f"Delete failed: {str(e)}"

    def get_file_url(self, key: str, expires_in: int = 3600) -> str:
        """Get a presigned URL for a file (expires in 1 hour by default)"""
        if self.use_s3:
            # Strip s3:// prefix if present
            if key.startswith(f"s3://{S3_BUCKET}/"):
                key = key[len(f"s3://{S3_BUCKET}/"):]
            try:
                return self.s3_client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': S3_BUCKET, 'Key': key},
                    ExpiresIn=expires_in
                )
            except Exception as e:
                logger.error(f"Failed to generate presigned URL: {e}")
                return f"{CDN_BASE_URL}/{key}"
        else:
            return f"/uploads/{key}"


# Singleton instance
_s3_service: Optional[S3Service] = None


def get_s3_service() -> S3Service:
    """Get or create the S3 service singleton"""
    global _s3_service
    if _s3_service is None:
        _s3_service = S3Service()
    return _s3_service
