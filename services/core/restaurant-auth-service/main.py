"""
Dollor.ai - Restaurant Auth Service
====================================

Microservice handling restaurant/vendor authentication:
- Restaurant owner registration and login
- OAuth (Google) for restaurants
- Password reset for vendors
- JWT token management for restaurant apps

Port: 8010
Error Prefix: VENDOR
"""

import os
import sys
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add shared library to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))

from common import (
    MicroserviceFactory,
    create_logger,
    ErrorResponse,
)

# =============================================================================
# CONFIGURATION
# =============================================================================

SERVICE_NAME = "restaurant-auth-service"
SERVICE_VERSION = "1.0.0"
SERVICE_PORT = 8010

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24 hours

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/dollor")

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/vendor/login")

# =============================================================================
# DATABASE SETUP
# =============================================================================

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Database session dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class VendorRegisterRequest(BaseModel):
    """Vendor/Restaurant registration request"""
    email: EmailStr
    password: str
    full_name: Optional[str] = None  # Restaurant owner name
    restaurant_name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None

    def get_owner_name(self) -> str:
        """Get owner name (defaults to restaurant name if not provided)"""
        return self.full_name or self.restaurant_name


class VendorLoginRequest(BaseModel):
    """JSON login request for vendor apps"""
    email: EmailStr
    password: str


class VendorGoogleAuthRequest(BaseModel):
    """Google OAuth request for vendors"""
    email: EmailStr
    name: str
    google_id: str
    restaurant_name: Optional[str] = None


class VendorResponse(BaseModel):
    """Vendor profile response"""
    id: int
    email: str
    restaurant_name: str
    owner_name: Optional[str] = None
    status: str


class Token(BaseModel):
    """Authentication token response"""
    access_token: str
    token_type: str
    vendor_id: Optional[int] = None
    business_name: Optional[str] = None
    email: Optional[str] = None


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    email: EmailStr
    token: str
    new_password: str


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


# =============================================================================
# CREATE SERVICE
# =============================================================================

factory = MicroserviceFactory(
    service_name=SERVICE_NAME,
    version=SERVICE_VERSION,
    description="Restaurant/Vendor authentication service for Dollor.ai platform",
    port=SERVICE_PORT,
    cors_origins=[
        "http://localhost:*",
        "https://dollor.ai",
        "https://*.dollor.ai",
        "https://api.dollor.ai",
    ]
)

# Create FastAPI app
app = factory.create_app()
logger = factory.logger


# =============================================================================
# ROUTES - VENDOR/RESTAURANT AUTH (Form-based - Android/Web)
# =============================================================================

@app.post("/api/auth/vendor/login", tags=["Vendor Authentication"])
async def vendor_login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Authenticate vendor (restaurant owner) and return JWT token.
    Uses form data for Android/Web compatibility.

    Error Codes:
    - VENDOR-201: Invalid credentials
    - VENDOR-202: Vendor account not approved
    """
    logger.info("Vendor login attempt", email=form_data.username)

    from sqlalchemy import text

    # Query user with VENDOR role
    result = db.execute(
        text("""
            SELECT u.id, u.email, u.password_hash, u.full_name, u.vendor_id,
                   v.id as v_id, v.restaurant_name, v.company_name, v.onboarding_status
            FROM users u
            LEFT JOIN vendors v ON u.vendor_id = v.id
            WHERE u.email = :email AND u.role = 'VENDOR'
        """),
        {"email": form_data.username}
    ).fetchone()

    if not result:
        logger.warning("Vendor not found", email=form_data.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "VENDOR-201", "message": "Invalid credentials"}
        )

    user_id, email, password_hash, full_name, vendor_id, v_id, restaurant_name, company_name, onboarding_status = result

    if not verify_password(form_data.password, password_hash):
        logger.warning("Invalid password for vendor", email=form_data.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "VENDOR-201", "message": "Invalid credentials"}
        )

    # Check vendor approval status
    status_str = str(onboarding_status).upper() if onboarding_status else ""
    if status_str not in ['APPROVED', 'VENDORSTATUS.APPROVED', 'ACTIVE']:
        logger.warning("Vendor not approved", email=form_data.username, status=onboarding_status)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "VENDOR-202", "message": f"Vendor account not approved. Status: {onboarding_status}"}
        )

    access_token = create_access_token(data={
        "sub": email,
        "role": "vendor",
        "vendor_id": v_id,
        "user_id": user_id
    })

    business_name = restaurant_name or company_name or full_name
    logger.info("Vendor login successful", email=email, vendor_id=v_id)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "vendor_id": v_id,
        "business_name": business_name,
        "email": email,
        "user": {
            "id": user_id,
            "email": email,
            "full_name": full_name,
            "role": "vendor",
            "vendor_id": v_id
        }
    }


@app.post("/api/auth/vendor/register", tags=["Vendor Authentication"])
async def vendor_register(request: VendorRegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new vendor/restaurant account.

    Error Codes:
    - VENDOR-103: Email already registered
    - VENDOR-104: Restaurant name required
    """
    logger.info("Vendor registration attempt", email=request.email, restaurant=request.restaurant_name)

    from sqlalchemy import text

    # Check if email exists
    existing = db.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": request.email}
    ).fetchone()

    if existing:
        logger.warning("Email already registered", email=request.email)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "VENDOR-103", "message": "Email already registered"}
        )

    # Generate vendor ID
    count_result = db.execute(text("SELECT COUNT(*) FROM vendors")).fetchone()
    vendor_count = count_result[0] if count_result else 0
    vendor_code = f"VND-{vendor_count + 1:05d}"

    # Create vendor record
    owner_name = request.get_owner_name()
    vendor_result = db.execute(
        text("""
            INSERT INTO vendors (vendor_id, restaurant_name, company_name, email, phone,
                                 address, city, state, zip_code, onboarding_status, created_at)
            VALUES (:vendor_id, :restaurant_name, :company_name, :email, :phone,
                    :address, :city, :state, :zip_code, 'PENDING', NOW())
            RETURNING id
        """),
        {
            "vendor_id": vendor_code,
            "restaurant_name": request.restaurant_name,
            "company_name": owner_name,
            "email": request.email,
            "phone": request.phone,
            "address": request.address,
            "city": request.city,
            "state": request.state,
            "zip_code": request.zip_code
        }
    )
    new_vendor_id = vendor_result.fetchone()[0]

    # Create user record
    hashed_password = get_password_hash(request.password)
    db.execute(
        text("""
            INSERT INTO users (email, password_hash, full_name, role, vendor_id, created_at)
            VALUES (:email, :password_hash, :full_name, 'VENDOR', :vendor_id, NOW())
        """),
        {
            "email": request.email,
            "password_hash": hashed_password,
            "full_name": owner_name,
            "vendor_id": new_vendor_id
        }
    )
    db.commit()

    access_token = create_access_token(data={
        "sub": request.email,
        "role": "vendor",
        "vendor_id": new_vendor_id
    })

    logger.info("Vendor registration successful", email=request.email, vendor_id=new_vendor_id)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "vendor_id": new_vendor_id,
        "vendor_code": vendor_code,
        "business_name": request.restaurant_name,
        "email": request.email,
        "status": "PENDING",
        "message": "Registration successful. Your account is pending approval.",
        "user": {
            "id": new_vendor_id,
            "email": request.email,
            "full_name": owner_name,
            "role": "vendor",
            "vendor_id": new_vendor_id
        }
    }


# =============================================================================
# ROUTES - VENDOR/RESTAURANT AUTH (JSON body - iOS)
# =============================================================================

@app.post("/api/vendor/login", tags=["Vendor Authentication - iOS"])
async def vendor_login_ios(request: VendorLoginRequest, db: Session = Depends(get_db)):
    """
    iOS Vendor Login - JSON body endpoint.

    iOS apps send JSON body: {"email": "...", "password": "..."}
    """
    logger.info("iOS Vendor login attempt", email=request.email)

    from sqlalchemy import text

    # Query user with VENDOR role
    result = db.execute(
        text("""
            SELECT u.id, u.email, u.password_hash, u.full_name, u.vendor_id,
                   v.id as v_id, v.restaurant_name, v.company_name, v.onboarding_status
            FROM users u
            LEFT JOIN vendors v ON u.vendor_id = v.id
            WHERE u.email = :email AND u.role = 'VENDOR'
        """),
        {"email": request.email}
    ).fetchone()

    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "VENDOR-201", "message": "Invalid credentials"}
        )

    user_id, email, password_hash, full_name, vendor_id, v_id, restaurant_name, company_name, onboarding_status = result

    if not verify_password(request.password, password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "VENDOR-201", "message": "Invalid credentials"}
        )

    # Check vendor approval status
    status_str = str(onboarding_status).upper() if onboarding_status else ""
    if status_str not in ['APPROVED', 'VENDORSTATUS.APPROVED', 'ACTIVE']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "VENDOR-202", "message": f"Vendor account not approved. Status: {onboarding_status}"}
        )

    access_token = create_access_token(data={
        "sub": email,
        "role": "vendor",
        "vendor_id": v_id,
        "user_id": user_id
    })

    business_name = restaurant_name or company_name or full_name
    logger.info("iOS Vendor login successful", email=email, vendor_id=v_id)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "vendor_id": v_id,
        "business_name": business_name,
        "email": email
    }


@app.post("/api/vendor/register", tags=["Vendor Authentication - iOS"])
async def vendor_register_ios(request: VendorRegisterRequest, db: Session = Depends(get_db)):
    """
    iOS Vendor Registration - JSON body endpoint.
    Alias for /api/auth/vendor/register.
    """
    return await vendor_register(request, db)


@app.post("/api/auth/vendor/google", tags=["Vendor Authentication"])
async def vendor_google_auth(request: VendorGoogleAuthRequest, db: Session = Depends(get_db)):
    """
    Vendor Google OAuth - handles login and registration.
    """
    logger.info("Vendor Google auth", email=request.email)

    from sqlalchemy import text

    # Check if vendor exists
    result = db.execute(
        text("""
            SELECT u.id, u.email, u.vendor_id, v.id as v_id, v.restaurant_name,
                   v.company_name, v.onboarding_status
            FROM users u
            LEFT JOIN vendors v ON u.vendor_id = v.id
            WHERE u.email = :email AND u.role = 'VENDOR'
        """),
        {"email": request.email}
    ).fetchone()

    if result:
        # Existing vendor - login
        user_id, email, vendor_id, v_id, restaurant_name, company_name, onboarding_status = result

        status_str = str(onboarding_status).upper() if onboarding_status else ""
        if status_str not in ['APPROVED', 'VENDORSTATUS.APPROVED', 'ACTIVE', 'PENDING']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "VENDOR-202", "message": f"Vendor account not approved. Status: {onboarding_status}"}
            )
        business_name = restaurant_name or company_name
    else:
        # Create new vendor
        count_result = db.execute(text("SELECT COUNT(*) FROM vendors")).fetchone()
        vendor_count = count_result[0] if count_result else 0
        vendor_code = f"VND-{vendor_count + 1:05d}"

        restaurant_name = request.restaurant_name or f"{request.name}'s Restaurant"

        vendor_result = db.execute(
            text("""
                INSERT INTO vendors (vendor_id, restaurant_name, company_name, email, onboarding_status, created_at)
                VALUES (:vendor_id, :restaurant_name, :company_name, :email, 'PENDING', NOW())
                RETURNING id
            """),
            {
                "vendor_id": vendor_code,
                "restaurant_name": restaurant_name,
                "company_name": request.name,
                "email": request.email
            }
        )
        v_id = vendor_result.fetchone()[0]

        hashed_password = get_password_hash(f"google_oauth_{request.google_id}")
        db.execute(
            text("""
                INSERT INTO users (email, password_hash, full_name, role, vendor_id, created_at)
                VALUES (:email, :password_hash, :full_name, 'VENDOR', :vendor_id, NOW())
            """),
            {
                "email": request.email,
                "password_hash": hashed_password,
                "full_name": request.name,
                "vendor_id": v_id
            }
        )
        db.commit()

        business_name = restaurant_name
        onboarding_status = "PENDING"
        logger.info("Created new vendor via Google", email=request.email)

    access_token = create_access_token(data={
        "sub": request.email,
        "role": "vendor",
        "vendor_id": v_id
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "vendor_id": v_id,
        "business_name": business_name,
        "email": request.email,
        "status": str(onboarding_status) if onboarding_status else "PENDING"
    }


# =============================================================================
# ROUTES - VENDOR PROFILE
# =============================================================================

@app.get("/api/auth/vendor/me", tags=["Vendor Authentication"])
async def get_current_vendor(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Get current authenticated vendor profile.
    """
    payload = decode_token(token)
    vendor_id = payload.get("vendor_id")

    if not vendor_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "VENDOR-201", "message": "Not a vendor token"}
        )

    from sqlalchemy import text

    result = db.execute(
        text("""
            SELECT v.id, v.vendor_id, v.restaurant_name, v.company_name, v.email,
                   v.phone, v.address, v.city, v.state, v.zip_code,
                   v.onboarding_status, v.rating, v.is_active
            FROM vendors v
            WHERE v.id = :vendor_id
        """),
        {"vendor_id": vendor_id}
    ).fetchone()

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "VENDOR-301", "message": "Vendor not found"}
        )

    return {
        "id": result[0],
        "vendor_code": result[1],
        "restaurant_name": result[2],
        "company_name": result[3],
        "email": result[4],
        "phone": result[5],
        "address": result[6],
        "city": result[7],
        "state": result[8],
        "zip_code": result[9],
        "status": str(result[10]) if result[10] else "PENDING",
        "rating": result[11],
        "is_active": result[12]
    }


# =============================================================================
# ROUTES - PASSWORD RESET
# =============================================================================

@app.post("/api/auth/vendor/password-reset/request", tags=["Vendor Password Reset"])
async def request_password_reset(request: PasswordResetRequest, db: Session = Depends(get_db)):
    """
    Request a password reset email for vendor account.
    """
    logger.info("Vendor password reset requested", email=request.email)

    # Always return success to prevent email enumeration
    return {
        "success": True,
        "message": "If an account with this email exists, a password reset link has been sent."
    }


@app.post("/api/auth/vendor/password-reset/confirm", tags=["Vendor Password Reset"])
async def confirm_password_reset(request: PasswordResetConfirm, db: Session = Depends(get_db)):
    """
    Confirm password reset with token.
    """
    logger.info("Vendor password reset confirmed", email=request.email)

    return {
        "success": True,
        "message": "Password has been reset successfully."
    }


# =============================================================================
# HEALTH ENDPOINT
# =============================================================================

@app.get("/api/vendor/health", tags=["Health"])
@app.get("/health", tags=["Health"])
async def vendor_health():
    """Restaurant auth service health check"""
    return {
        "service": SERVICE_NAME,
        "version": SERVICE_VERSION,
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=SERVICE_PORT,
        reload=os.getenv("ENVIRONMENT", "development") == "development"
    )
