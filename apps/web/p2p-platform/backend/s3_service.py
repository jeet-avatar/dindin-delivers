"""
S3 Upload Service for Dollor.ai
Handles file uploads to AWS S3 for cloud storage.
Works in both local development (local fallback) and production (S3).
"""

import os
import boto3
from botocore.exceptions import ClientError
from datetime import datetime
import uuid
from typing import Optional, Tuple
import io


class S3Service:
    """
    S3 service for file uploads.
    Falls back to local storage if S3 is not configured.
    """

    def __init__(self):
        self.s3_client = None
        self.bucket_name = os.getenv("S3_BUCKET_NAME", "dollor-uploads")
        self.region = os.getenv("AWS_REGION", "us-east-1")
        self.use_s3 = os.getenv("USE_S3", "false").lower() == "true"

        # Initialize S3 client if configured
        if self.use_s3:
            try:
                self.s3_client = boto3.client(
                    's3',
                    region_name=self.region,
                    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
                    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
                )
                # Verify bucket access
                self.s3_client.head_bucket(Bucket=self.bucket_name)
                print(f"[S3] Connected to bucket: {self.bucket_name}")
            except Exception as e:
                print(f"[S3] Failed to connect to S3: {e}. Falling back to local storage.")
                self.use_s3 = False
                self.s3_client = None

    def _generate_unique_filename(self, original_filename: str, prefix: str = "") -> str:
        """Generate a unique filename with timestamp and UUID."""
        ext = original_filename.rsplit('.', 1)[-1].lower() if '.' in original_filename else 'bin'
        # Sanitize extension
        ext = ''.join(c for c in ext if c.isalnum())[:10]
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        return f"{prefix}{timestamp}_{unique_id}.{ext}"

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
            folder: Folder/prefix to store the file in
            content_type: MIME type of the file

        Returns:
            Tuple of (success, url, message)
        """
        unique_filename = self._generate_unique_filename(original_filename)
        s3_key = f"{folder}/{unique_filename}"

        if self.use_s3 and self.s3_client:
            return await self._upload_to_s3(file_content, s3_key, content_type)
        else:
            return await self._upload_to_local(file_content, folder, unique_filename)

    async def _upload_to_s3(
        self,
        file_content: bytes,
        s3_key: str,
        content_type: Optional[str] = None
    ) -> Tuple[bool, str, str]:
        """Upload file to S3."""
        try:
            extra_args = {}
            if content_type:
                extra_args['ContentType'] = content_type

            self.s3_client.upload_fileobj(
                io.BytesIO(file_content),
                self.bucket_name,
                s3_key,
                ExtraArgs=extra_args
            )

            # Generate URL
            url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{s3_key}"
            return True, url, "File uploaded successfully to S3"

        except ClientError as e:
            error_msg = str(e)
            print(f"[S3] Upload error: {error_msg}")
            return False, "", f"S3 upload failed: {error_msg}"
        except Exception as e:
            print(f"[S3] Unexpected error: {e}")
            return False, "", f"Upload failed: {str(e)}"

    async def _upload_to_local(
        self,
        file_content: bytes,
        folder: str,
        filename: str
    ) -> Tuple[bool, str, str]:
        """Upload file to local storage (fallback for development)."""
        try:
            upload_dir = f"uploads/{folder}"
            os.makedirs(upload_dir, exist_ok=True)

            file_path = os.path.join(upload_dir, filename)

            # Security check - ensure we're not writing outside upload dir
            abs_upload_dir = os.path.abspath(upload_dir)
            abs_file_path = os.path.abspath(file_path)
            if not abs_file_path.startswith(abs_upload_dir + os.sep):
                return False, "", "Invalid filename"

            with open(file_path, 'wb') as f:
                f.write(file_content)

            url = f"/uploads/{folder}/{filename}"
            return True, url, "File uploaded successfully (local storage)"

        except Exception as e:
            print(f"[Local] Upload error: {e}")
            return False, "", f"Local upload failed: {str(e)}"

    async def delete_file(self, url: str) -> Tuple[bool, str]:
        """
        Delete a file from S3 or local storage.

        Args:
            url: The URL of the file to delete

        Returns:
            Tuple of (success, message)
        """
        if self.use_s3 and self.s3_client:
            # Extract S3 key from URL
            try:
                s3_key = url.split(f"{self.bucket_name}.s3.{self.region}.amazonaws.com/")[1]
                self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
                return True, "File deleted from S3"
            except Exception as e:
                return False, f"S3 delete failed: {str(e)}"
        else:
            # Local file deletion
            try:
                if url.startswith("/uploads/"):
                    file_path = url[1:]  # Remove leading slash
                    if os.path.exists(file_path):
                        os.remove(file_path)
                        return True, "File deleted (local)"
                return False, "File not found"
            except Exception as e:
                return False, f"Local delete failed: {str(e)}"

    def get_presigned_url(self, url: str, expires_in: int = 3600) -> str:
        """
        Generate a presigned URL for secure access to S3 files.

        Args:
            url: The S3 URL
            expires_in: URL expiration time in seconds (default 1 hour)

        Returns:
            Presigned URL or original URL if not using S3
        """
        if not self.use_s3 or not self.s3_client:
            return url

        try:
            s3_key = url.split(f"{self.bucket_name}.s3.{self.region}.amazonaws.com/")[1]
            presigned_url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': s3_key},
                ExpiresIn=expires_in
            )
            return presigned_url
        except Exception:
            return url


# Global S3 service instance
s3_service = S3Service()


def get_s3_service() -> S3Service:
    """Dependency injection for S3 service."""
    return s3_service
