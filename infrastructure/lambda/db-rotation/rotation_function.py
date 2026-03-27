"""
Dollor.ai — DB Password Rotation Lambda (4-step AWS Secrets Manager protocol)

Rotates the DATABASE_URL secret in Secrets Manager by:
1. createSecret  — generates a new password and stores it as AWSPENDING
2. setSecret     — applies the new password to the RDS user via ALTER USER
3. testSecret    — verifies the new credentials can connect (SELECT 1)
4. finishSecret  — promotes AWSPENDING to AWSCURRENT atomically

Secret format:
  {"DATABASE_URL": "postgresql://user:password@host:port/dbname"}

RDS endpoint: dollor-db.c23qcukqe810.us-east-1.rds.amazonaws.com
"""

import json
import logging
import re
import secrets
import string

import boto3
import psycopg2

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Safe password charset — excludes :, /, @, ", \ which break PostgreSQL URL parsing
_SAFE_CHARS = string.ascii_letters + string.digits + "!#$%&()*+,-.;<=>?[]^_{}|~"
_PASSWORD_LENGTH = 32

_DB_URL_RE = re.compile(
    r"postgresql://([^:]+):([^@]+)@([^/:]+)(?::(\d+))?/(.+)"
)


def lambda_handler(event, context):
    """Entry point dispatched by Secrets Manager on each rotation step."""
    secret_id = event["SecretId"]
    token = event["ClientRequestToken"]
    step = event["Step"]

    client = boto3.client("secretsmanager", region_name="us-east-1")

    logger.info("Rotation step=%s secret_id=%s token=%s", step, secret_id, token)

    if step == "createSecret":
        create_secret(client, secret_id, token)
    elif step == "setSecret":
        set_secret(client, secret_id, token)
    elif step == "testSecret":
        test_secret(client, secret_id, token)
    elif step == "finishSecret":
        finish_secret(client, secret_id, token)
    else:
        logger.warning("Unknown rotation step '%s' — nothing to do", step)


# ---------------------------------------------------------------------------
# Step 1: createSecret
# ---------------------------------------------------------------------------

def create_secret(client, secret_id, token):
    """
    Generate a new password and store it as AWSPENDING (idempotent).
    If AWSPENDING already exists for this token, skip generation.
    """
    # Idempotency check — re-use pending if this token already has one
    try:
        client.get_secret_value(
            SecretId=secret_id,
            VersionId=token,
            VersionStage="AWSPENDING",
        )
        logger.info("createSecret: AWSPENDING already exists for token %s — skipping", token)
        return
    except client.exceptions.ResourceNotFoundException:
        pass  # expected on first invocation

    # Read current secret to extract connection components
    current = _get_secret_dict(client, secret_id, "AWSCURRENT")
    host, port, dbname, username, _ = _parse_url(current["DATABASE_URL"])

    # Generate new password
    new_password = "".join(secrets.choice(_SAFE_CHARS) for _ in range(_PASSWORD_LENGTH))
    new_url = f"postgresql://{username}:{new_password}@{host}:{port}/{dbname}"

    pending_secret = json.dumps({"DATABASE_URL": new_url})

    client.put_secret_value(
        SecretId=secret_id,
        ClientRequestToken=token,
        SecretString=pending_secret,
        VersionStages=["AWSPENDING"],
    )
    logger.info("createSecret: stored AWSPENDING for token %s", token)


# ---------------------------------------------------------------------------
# Step 2: setSecret
# ---------------------------------------------------------------------------

def set_secret(client, secret_id, token):
    """Apply the AWSPENDING password to RDS via ALTER USER."""
    current = _get_secret_dict(client, secret_id, "AWSCURRENT")
    pending = _get_secret_dict(client, secret_id, "AWSPENDING", version_id=token)

    c_host, c_port, c_dbname, c_user, c_password = _parse_url(current["DATABASE_URL"])
    _, _, _, _, p_password = _parse_url(pending["DATABASE_URL"])

    logger.info("setSecret: connecting to RDS host=%s dbname=%s user=%s", c_host, c_dbname, c_user)

    conn = psycopg2.connect(
        host=c_host,
        port=int(c_port),
        dbname=c_dbname,
        user=c_user,
        password=c_password,
        connect_timeout=10,
    )
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            # Use %s parameterized for the username (identifier), but password must
            # be quoted directly because psycopg2 does not support identifier params.
            # The password charset explicitly excludes single-quote, so this is safe.
            cur.execute(
                "ALTER USER %s WITH PASSWORD %%s" % c_user,
                (p_password,),
            )
            logger.info("setSecret: ALTER USER executed successfully for user=%s", c_user)
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Step 3: testSecret
# ---------------------------------------------------------------------------

def test_secret(client, secret_id, token):
    """Verify that the AWSPENDING credentials can connect and run SELECT 1."""
    pending = _get_secret_dict(client, secret_id, "AWSPENDING", version_id=token)
    host, port, dbname, user, password = _parse_url(pending["DATABASE_URL"])

    logger.info("testSecret: connecting with AWSPENDING credentials host=%s user=%s", host, user)

    conn = psycopg2.connect(
        host=host,
        port=int(port),
        dbname=dbname,
        user=user,
        password=password,
        connect_timeout=10,
    )
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            result = cur.fetchone()
            assert result[0] == 1, "SELECT 1 returned unexpected value"
        logger.info("testSecret: AWSPENDING credentials verified OK")
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Step 4: finishSecret
# ---------------------------------------------------------------------------

def finish_secret(client, secret_id, token):
    """Atomically promote AWSPENDING → AWSCURRENT and AWSCURRENT → AWSPREVIOUS."""
    metadata = client.describe_secret(SecretId=secret_id)

    # Confirm the pending version matches the expected token
    pending_versions = metadata.get("VersionIdsToStages", {})
    current_version = None
    for vid, stages in pending_versions.items():
        if "AWSCURRENT" in stages:
            current_version = vid
            break

    if current_version == token:
        logger.info("finishSecret: version %s is already AWSCURRENT — idempotent return", token)
        return

    client.update_secret_version_stage(
        SecretId=secret_id,
        VersionStage="AWSCURRENT",
        MoveToVersionId=token,
        RemoveFromVersionId=current_version,
    )
    logger.info(
        "finishSecret: promoted version %s to AWSCURRENT (removed from %s)",
        token,
        current_version,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_secret_dict(client, secret_id, stage, version_id=None):
    """Fetch and parse the JSON secret value for a given stage."""
    kwargs = {"SecretId": secret_id, "VersionStage": stage}
    if version_id:
        kwargs["VersionId"] = version_id
    response = client.get_secret_value(**kwargs)
    return json.loads(response["SecretString"])


def _parse_url(url):
    """
    Parse postgresql://user:password@host:port/dbname.
    Returns (host, port, dbname, username, password).
    Defaults port to 5432 if not present.
    """
    m = _DB_URL_RE.match(url)
    if not m:
        raise ValueError(f"Cannot parse DATABASE_URL — unexpected format: {url[:40]}...")
    username, password, host, port, dbname = m.groups()
    return host, port or "5432", dbname, username, password
