"""Gated MixMind installer download.

The DMG lives in a private S3 bucket the site never links to directly (no CloudFront origin,
no public read). This hands out a short-lived, single-object presigned URL only after verifying
the caller is signed in and on a plan that includes MixMind, so a copied or bookmarked link stops
working once it expires and can never be used to enumerate or reach anything else in the bucket.
"""

import os

import boto3

BUCKET = os.getenv("MIXMIND_DOWNLOAD_BUCKET", "beatmind-private-downloads")
KEY = os.getenv("MIXMIND_DOWNLOAD_KEY", "MixMind-mac.dmg")
EXPIRES_IN_SECONDS = 300

_s3 = boto3.client("s3")


def presigned_url() -> str:
    return _s3.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": BUCKET,
            "Key": KEY,
            "ResponseContentDisposition": 'attachment; filename="MixMind-mac.dmg"',
            "ResponseContentType": "application/octet-stream",
        },
        ExpiresIn=EXPIRES_IN_SECONDS,
    )
