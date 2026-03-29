# apps/hospital-pricing/backend/tests/test_s3.py
import os
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-at-least-32-chars-long")
os.environ.setdefault("OPENAI_API_KEY", "sk-test-placeholder")

import pytest
from unittest.mock import patch, MagicMock


def test_generate_presigned_url_returns_string(tmp_path):
    """S3 presigned URL generation returns a string URL."""
    with patch("boto3.client") as mock_boto:
        mock_s3 = MagicMock()
        mock_s3.generate_presigned_url.return_value = "https://s3.amazonaws.com/test-bucket/doc.pdf?signature=abc"
        mock_boto.return_value = mock_s3

        from services.s3 import generate_presigned_upload_url
        url = generate_presigned_upload_url("test-key.pdf")
        assert url.startswith("https://")
        assert "test-key" in url or "s3" in url.lower()


def test_celery_parse_document_task_exists():
    """parse_document Celery task is registered."""
    from workers.tasks import parse_document
    assert callable(parse_document)
