"""
TechCloudPro License Server — deployed in TechCloudPro AWS, NOT in customer VPCs.
Receives only: {license_key, instance_id, version} — no customer data.
"""
import os
import secrets
import sqlite3
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

app = FastAPI(title="ArthaBuild License Server", docs_url=None, redoc_url=None)

DB_PATH = os.getenv("LICENSE_DB_PATH", "./licenses.db")
ADMIN_KEY = os.getenv("ADMIN_API_KEY", "")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS licenses (
                id INTEGER PRIMARY KEY,
                license_key TEXT UNIQUE NOT NULL,
                customer_name TEXT,
                plan TEXT DEFAULT 'starter',
                expires_at TEXT NOT NULL,
                active INTEGER DEFAULT 1,
                registered_instance_id TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS validation_log (
                id INTEGER PRIMARY KEY,
                license_key TEXT, instance_id TEXT, version TEXT,
                valid INTEGER, checked_at TEXT DEFAULT (datetime('now'))
            )
        """)
    print("License DB ready")


init_db()


class ValidateRequest(BaseModel):
    license_key: str
    instance_id: str
    version: str


class LicenseCreate(BaseModel):
    license_key: str
    customer_name: str
    plan: str = "starter"
    expires_days: int = 365


security = HTTPBearer()


def verify_admin(creds: HTTPAuthorizationCredentials = Depends(security)):
    if not ADMIN_KEY or creds.credentials != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")


@app.post("/api/validate")
def validate_license(req: ValidateRequest, db=Depends(get_db)):
    """Called by customer ArthaBuild instances. Only receives non-PII identifiers."""
    row = db.execute(
        "SELECT * FROM licenses WHERE license_key = ?", (req.license_key,)
    ).fetchone()

    db.execute(
        "INSERT INTO validation_log (license_key, instance_id, version, valid) VALUES (?,?,?,?)",
        (req.license_key, req.instance_id, req.version, 0)
    )

    if not row:
        db.commit()
        return {"valid": False, "message": "License key not found"}

    # One instance per key — reject different instance_id
    if row["registered_instance_id"] is None:
        db.execute(
            "UPDATE licenses SET registered_instance_id = ? WHERE license_key = ?",
            (req.instance_id, req.license_key)
        )
    elif row["registered_instance_id"] != req.instance_id:
        db.commit()
        return {"valid": False, "message": "License already registered to a different instance. Contact sales@techcloudpro.com"}

    expires_at = datetime.fromisoformat(row["expires_at"])
    now = datetime.now(timezone.utc)
    is_valid = bool(row["active"]) and expires_at.replace(tzinfo=timezone.utc) > now

    db.execute(
        "UPDATE validation_log SET valid = ? WHERE rowid = last_insert_rowid()",
        (1 if is_valid else 0,)
    )
    db.commit()

    if not is_valid:
        return {"valid": False, "message": "License expired or deactivated"}

    return {
        "valid": True,
        "plan": row["plan"],
        "expires_at": expires_at.isoformat(),
        "customer_name": row["customer_name"]
    }


@app.post("/admin/licenses", dependencies=[Depends(verify_admin)])
def create_license(req: LicenseCreate, db=Depends(get_db)):
    """Admin: create a new license key for a customer."""
    expires_at = (datetime.now(timezone.utc) + timedelta(days=req.expires_days)).isoformat()
    db.execute(
        "INSERT INTO licenses (license_key, customer_name, plan, expires_at) VALUES (?,?,?,?)",
        (req.license_key, req.customer_name, req.plan, expires_at)
    )
    db.commit()
    return {"created": True, "license_key": req.license_key, "expires_at": expires_at}


@app.get("/admin/licenses/{license_key}", dependencies=[Depends(verify_admin)])
def get_license(license_key: str, db=Depends(get_db)):
    """Admin: get license details by key."""
    row = db.execute("SELECT * FROM licenses WHERE license_key = ?", (license_key,)).fetchone()
    if not row:
        raise HTTPException(status_code=404)
    return dict(row)


@app.get("/health")
def health():
    return {"status": "ok"}
