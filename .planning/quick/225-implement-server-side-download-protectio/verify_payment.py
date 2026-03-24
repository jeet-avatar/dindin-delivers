"""
Verify Stripe checkout session payment for offerletter.ai.
Caches verified session_ids in DynamoDB with 24h TTL.
Returns pre-signed S3 URLs (15 min) for both Mac and Windows downloads.
"""
import json
import os
import time
import boto3
import stripe

REGION = os.environ.get("AWS_REGION", "us-east-1")
TABLE_NAME = "offerletter-verified-sessions"
STRIPE_SECRET_NAME = "offerletter/production/stripe-secret"
S3_BUCKET = "offerletter.ai"
S3_KEY_MAC = "downloads/Interview Assistant.dmg"
S3_KEY_WIN = "downloads/Interview Assistant.exe"
PRESIGN_EXPIRY = 900  # 15 minutes

CORS = {
    "Access-Control-Allow-Origin": "https://www.offerletter.ai",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
}

_stripe_key = None


def get_stripe_key():
    global _stripe_key
    if _stripe_key:
        return _stripe_key
    sm = boto3.client("secretsmanager", region_name=REGION)
    resp = sm.get_secret_value(SecretId=STRIPE_SECRET_NAME)
    _stripe_key = json.loads(resp["SecretString"])["key"]
    return _stripe_key


def generate_download_urls():
    s3 = boto3.client("s3", region_name=REGION)
    mac_url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": S3_BUCKET, "Key": S3_KEY_MAC},
        ExpiresIn=PRESIGN_EXPIRY,
    )
    win_url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": S3_BUCKET, "Key": S3_KEY_WIN},
        ExpiresIn=PRESIGN_EXPIRY,
    )
    return mac_url, win_url


def handler(event, context):
    method = (event.get("requestContext") or {}).get("http", {}).get("method", "")
    if method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    try:
        raw = event.get("body") or "{}"
        if event.get("isBase64Encoded"):
            import base64
            raw = base64.b64decode(raw).decode("utf-8")
        body = json.loads(raw)

        session_id = (body.get("session_id") or "").strip()
        if not session_id or len(session_id) > 200:
            return {
                "statusCode": 400,
                "headers": CORS,
                "body": json.dumps({"verified": False, "error": "Invalid session_id"}),
            }

        ddb = boto3.resource("dynamodb", region_name=REGION)
        table = ddb.Table(TABLE_NAME)

        # Fast-path: check DynamoDB cache first
        resp = table.get_item(Key={"session_id": session_id})
        if "Item" in resp:
            mac_url, win_url = generate_download_urls()
            return {
                "statusCode": 200,
                "headers": CORS,
                "body": json.dumps({"verified": True, "mac_url": mac_url, "win_url": win_url}),
            }

        # Verify via Stripe API
        stripe.api_key = get_stripe_key()
        try:
            session = stripe.checkout.Session.retrieve(session_id)
        except stripe.error.InvalidRequestError:
            return {
                "statusCode": 200,
                "headers": CORS,
                "body": json.dumps({"verified": False, "error": "Session not found"}),
            }

        if session.get("payment_status") != "paid":
            return {
                "statusCode": 200,
                "headers": CORS,
                "body": json.dumps({"verified": False, "error": "Payment not completed"}),
            }

        # Cache verified session (TTL: 24h)
        table.put_item(Item={
            "session_id": session_id,
            "verified_at": int(time.time()),
            "expires_at": int(time.time()) + 86400,
        })

        mac_url, win_url = generate_download_urls()
        return {
            "statusCode": 200,
            "headers": CORS,
            "body": json.dumps({"verified": True, "mac_url": mac_url, "win_url": win_url}),
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "headers": CORS,
            "body": json.dumps({"verified": False, "error": str(e)}),
        }
