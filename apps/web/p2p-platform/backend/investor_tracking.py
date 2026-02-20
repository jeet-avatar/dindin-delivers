"""
Investor Deck Access Tracking
Handles email-gated access and view logging for the investor deck
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from auth_utils import require_any_auth
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from typing import Optional
import hashlib
import secrets
import json
from pathlib import Path

router = APIRouter(prefix="/api/investor", tags=["investor"])

# Simple file-based storage for MVP (replace with database later)
TRACKING_FILE = Path(__file__).parent / "investor_views.json"
ACCESS_TOKENS_FILE = Path(__file__).parent / "investor_tokens.json"

class AccessRequest(BaseModel):
    email: EmailStr

class AccessVerification(BaseModel):
    email: EmailStr
    access_token: str
    user_agent: Optional[str] = None
    timestamp: str

def load_json_file(file_path: Path) -> dict:
    """Load JSON file or return empty dict"""
    if file_path.exists():
        with open(file_path, 'r') as f:
            return json.load(f)
    return {}

def save_json_file(file_path: Path, data: dict):
    """Save data to JSON file"""
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=2)

def generate_access_token(email: str) -> str:
    """Generate unique access token for email"""
    # Create token with email + timestamp + random salt
    salt = secrets.token_hex(16)
    token_input = f"{email}{datetime.utcnow().isoformat()}{salt}"
    return hashlib.sha256(token_input.encode()).hexdigest()[:32]

@router.post("/request-access")
async def request_access(request: AccessRequest):
    """
    Generate and return access token for investor deck
    In production, this would also send an email with the link
    """
    try:
        # Load existing tokens
        tokens = load_json_file(ACCESS_TOKENS_FILE)

        # Generate new access token
        access_token = generate_access_token(request.email)

        # Store token with email and expiry (24 hours)
        tokens[access_token] = {
            "email": request.email,
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": (datetime.utcnow() + timedelta(hours=24)).isoformat(),
            "used": False
        }

        save_json_file(ACCESS_TOKENS_FILE, tokens)

        # In production: Send email with access link
        # access_link = f"https://dollor.ai/investor?email={request.email}&access={access_token}"
        # send_email(request.email, "Your Dollor.ai Investor Deck Access", access_link)

        return {
            "success": True,
            "access_token": access_token,
            "message": "Access granted. You will be redirected shortly."
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/verify-access")
async def verify_access(verification: AccessVerification, request: Request):
    """
    Verify access token and log the view
    """
    try:
        # Load tokens
        tokens = load_json_file(ACCESS_TOKENS_FILE)

        # Verify token exists
        if verification.access_token not in tokens:
            raise HTTPException(status_code=403, detail="Invalid access token")

        token_data = tokens[verification.access_token]

        # Verify email matches
        if token_data["email"] != verification.email:
            raise HTTPException(status_code=403, detail="Email does not match token")

        # Check expiry
        expires_at = datetime.fromisoformat(token_data["expires_at"])
        if datetime.utcnow() > expires_at:
            raise HTTPException(status_code=403, detail="Access token has expired")

        # Mark token as used
        token_data["used"] = True
        token_data["used_at"] = datetime.utcnow().isoformat()
        tokens[verification.access_token] = token_data
        save_json_file(ACCESS_TOKENS_FILE, tokens)

        # Log the view
        views = load_json_file(TRACKING_FILE)
        view_id = f"view_{datetime.utcnow().timestamp()}"

        views[view_id] = {
            "email": verification.email,
            "timestamp": verification.timestamp,
            "ip_address": request.client.host if request.client else "unknown",
            "user_agent": verification.user_agent,
            "access_token": verification.access_token
        }

        save_json_file(TRACKING_FILE, views)

        # In production: Send notification to admin
        # notify_admin_of_view(verification.email, request.client.host)

        return {
            "success": True,
            "email": verification.email,
            "message": "Access verified"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/log-view")
async def log_view(request: Request):
    """
    Simple view logging for investor deck 2026
    Logs email, timestamp, user agent without complex token flow
    """
    try:
        data = await request.json()
        email = data.get('email')
        timestamp = data.get('timestamp')
        user_agent = data.get('user_agent')
        deck_version = data.get('deck_version', '2026')

        if not email:
            raise HTTPException(status_code=400, detail="Email is required")

        # Load existing views
        views = load_json_file(TRACKING_FILE)
        view_id = f"view_{datetime.utcnow().timestamp()}"

        # Log the view
        views[view_id] = {
            "email": email,
            "timestamp": timestamp,
            "ip_address": request.client.host if request.client else "unknown",
            "user_agent": user_agent,
            "deck_version": deck_version
        }

        save_json_file(TRACKING_FILE, views)

        return {
            "success": True,
            "message": "View logged successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/views")
async def get_views(_auth: dict = Depends(require_any_auth)):
    """
    Get all investor deck views (admin only - should add auth)
    """
    try:
        views = load_json_file(TRACKING_FILE)
        return {
            "total_views": len(views),
            "views": list(views.values())
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
