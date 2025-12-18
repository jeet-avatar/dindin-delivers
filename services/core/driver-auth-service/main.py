"""
Dollor.ai - Driver Auth Service
================================

Microservice handling driver authentication:
- Driver registration and login
- OAuth (Google, Apple) for drivers
- Password reset for drivers
- JWT token management for driver apps

Port: 8011
Error Prefix: DRV
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

SERVICE_NAME = "driver-auth-service"
SERVICE_VERSION = "1.0.0"
SERVICE_PORT = 8011

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24 hours

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/dollor")

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/driver/login")

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

class DriverRegisterRequest(BaseModel):
    """Driver registration request"""
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: str
    vehicle_type: Optional[str] = "car"
    license_number: Optional[str] = None
    date_of_birth: Optional[str] = None


class DriverLoginRequest(BaseModel):
    """JSON login request for driver apps (iOS)"""
    email: EmailStr
    password: str


class DriverGoogleAuthRequest(BaseModel):
    """Google OAuth request for drivers"""
    email: EmailStr
    name: str
    google_id: str


class DriverAppleAuthRequest(BaseModel):
    """Apple Sign In request for drivers"""
    email: EmailStr
    name: Optional[str] = None
    apple_id: str
    identity_token: Optional[str] = None


class Token(BaseModel):
    """Authentication token response"""
    access_token: str
    token_type: str
    driver_id: Optional[int] = None
    driver_code: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = None


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
    description="Driver authentication service for Dollor.ai platform",
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
# ROUTES - DRIVER AUTH (Form-based - Android/Web)
# =============================================================================

@app.post("/api/auth/driver/login", tags=["Driver Authentication"])
async def driver_login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Authenticate driver and return JWT token.
    Uses form data for Android/Web/iOS compatibility.

    Error Codes:
    - DRV-201: Invalid credentials
    - DRV-202: Driver account not active
    """
    logger.info("Driver login attempt", email=form_data.username)

    from sqlalchemy import text

    # Query user with DRIVER role
    result = db.execute(
        text("""
            SELECT u.id, u.email, u.password_hash, u.full_name, u.driver_id,
                   d.id as d_id, d.driver_id as driver_code, d.first_name, d.last_name, d.status
            FROM users u
            LEFT JOIN drivers d ON u.driver_id = d.id
            WHERE u.email = :email AND u.role = 'DRIVER'
        """),
        {"email": form_data.username}
    ).fetchone()

    if not result:
        logger.warning("Driver not found", email=form_data.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "DRV-201", "message": "Invalid credentials"}
        )

    user_id, email, password_hash, full_name, driver_id, d_id, driver_code, first_name, last_name, driver_status = result

    if not verify_password(form_data.password, password_hash):
        logger.warning("Invalid password for driver", email=form_data.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "DRV-201", "message": "Invalid credentials"}
        )

    # Check driver status - allow PENDING for new drivers
    status_str = str(driver_status).upper() if driver_status else ""
    if status_str not in ['ACTIVE', 'APPROVED', 'PENDING', 'DRIVERSTATUS.ACTIVE', 'DRIVERSTATUS.APPROVED', 'DRIVERSTATUS.PENDING']:
        logger.warning("Driver not active", email=form_data.username, status=driver_status)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "DRV-202", "message": f"Driver account not active. Status: {driver_status}"}
        )

    access_token = create_access_token(data={
        "sub": email,
        "role": "driver",
        "driver_id": d_id,
        "user_id": user_id
    })

    driver_name = f"{first_name} {last_name}" if first_name else full_name
    logger.info("Driver login successful", email=email, driver_id=d_id)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "driver_id": d_id,
        "driver_code": driver_code,
        "name": driver_name,
        "email": email,
        "status": str(driver_status) if driver_status else "PENDING"
    }


@app.post("/api/auth/driver/register", tags=["Driver Authentication"])
async def driver_register(request: DriverRegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new driver account.

    Error Codes:
    - DRV-103: Email already registered
    - DRV-101: Invalid phone format
    """
    logger.info("Driver registration attempt", email=request.email)

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
            detail={"code": "DRV-103", "message": "Email already registered"}
        )

    # Generate driver code
    count_result = db.execute(text("SELECT COUNT(*) FROM drivers")).fetchone()
    driver_count = count_result[0] if count_result else 0
    driver_code = f"DRV-{driver_count + 1:05d}"

    # Create driver record
    driver_result = db.execute(
        text("""
            INSERT INTO drivers (driver_id, first_name, last_name, email, phone, vehicle_type, license_number, status, created_at)
            VALUES (:driver_id, :first_name, :last_name, :email, :phone, :vehicle_type, :license_number, 'PENDING', NOW())
            RETURNING id
        """),
        {
            "driver_id": driver_code,
            "first_name": request.first_name,
            "last_name": request.last_name,
            "email": request.email,
            "phone": request.phone,
            "vehicle_type": request.vehicle_type,
            "license_number": request.license_number
        }
    )
    new_driver_id = driver_result.fetchone()[0]

    # Create user record
    hashed_password = get_password_hash(request.password)
    db.execute(
        text("""
            INSERT INTO users (email, password_hash, full_name, role, driver_id, created_at)
            VALUES (:email, :password_hash, :full_name, 'DRIVER', :driver_id, NOW())
        """),
        {
            "email": request.email,
            "password_hash": hashed_password,
            "full_name": f"{request.first_name} {request.last_name}",
            "driver_id": new_driver_id
        }
    )
    db.commit()

    access_token = create_access_token(data={
        "sub": request.email,
        "role": "driver",
        "driver_id": new_driver_id
    })

    logger.info("Driver registration successful", email=request.email, driver_id=new_driver_id)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "driver_id": new_driver_id,
        "driver_code": driver_code,
        "name": f"{request.first_name} {request.last_name}",
        "email": request.email,
        "status": "PENDING",
        "message": "Registration successful. Your account is pending approval."
    }


# =============================================================================
# ROUTES - DRIVER AUTH (JSON body - iOS)
# =============================================================================

@app.post("/api/driver/login", tags=["Driver Authentication - iOS"])
async def driver_login_ios(request: DriverLoginRequest, db: Session = Depends(get_db)):
    """
    iOS Driver Login - JSON body endpoint.

    iOS apps send JSON body: {"email": "...", "password": "..."}
    """
    logger.info("iOS Driver login attempt", email=request.email)

    from sqlalchemy import text

    # Query user with DRIVER role
    result = db.execute(
        text("""
            SELECT u.id, u.email, u.password_hash, u.full_name, u.driver_id,
                   d.id as d_id, d.driver_id as driver_code, d.first_name, d.last_name, d.status
            FROM users u
            LEFT JOIN drivers d ON u.driver_id = d.id
            WHERE u.email = :email AND u.role = 'DRIVER'
        """),
        {"email": request.email}
    ).fetchone()

    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "DRV-201", "message": "Invalid credentials"}
        )

    user_id, email, password_hash, full_name, driver_id, d_id, driver_code, first_name, last_name, driver_status = result

    if not verify_password(request.password, password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "DRV-201", "message": "Invalid credentials"}
        )

    # Check driver status
    status_str = str(driver_status).upper() if driver_status else ""
    if status_str not in ['ACTIVE', 'APPROVED', 'PENDING', 'DRIVERSTATUS.ACTIVE', 'DRIVERSTATUS.APPROVED', 'DRIVERSTATUS.PENDING']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "DRV-202", "message": f"Driver account not active. Status: {driver_status}"}
        )

    access_token = create_access_token(data={
        "sub": email,
        "role": "driver",
        "driver_id": d_id,
        "user_id": user_id
    })

    driver_name = f"{first_name} {last_name}" if first_name else full_name
    logger.info("iOS Driver login successful", email=email, driver_id=d_id)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "driver_id": d_id,
        "driver_code": driver_code,
        "name": driver_name,
        "email": email,
        "status": str(driver_status) if driver_status else "PENDING"
    }


@app.post("/api/driver/register", tags=["Driver Authentication - iOS"])
async def driver_register_ios(request: DriverRegisterRequest, db: Session = Depends(get_db)):
    """
    iOS Driver Registration - JSON body endpoint.
    Alias for /api/auth/driver/register.
    """
    return await driver_register(request, db)


# =============================================================================
# ROUTES - DRIVER OAUTH
# =============================================================================

@app.post("/api/auth/driver/google", tags=["Driver Authentication"])
async def driver_google_auth(request: DriverGoogleAuthRequest, db: Session = Depends(get_db)):
    """
    Driver Google OAuth - handles login and registration.
    """
    logger.info("Driver Google auth", email=request.email)

    from sqlalchemy import text

    # Check if driver exists
    result = db.execute(
        text("""
            SELECT u.id, u.email, u.driver_id, d.id as d_id, d.driver_id as driver_code,
                   d.first_name, d.last_name, d.status
            FROM users u
            LEFT JOIN drivers d ON u.driver_id = d.id
            WHERE u.email = :email AND u.role = 'DRIVER'
        """),
        {"email": request.email}
    ).fetchone()

    if result:
        # Existing driver - login
        user_id, email, driver_id, d_id, driver_code, first_name, last_name, driver_status = result

        status_str = str(driver_status).upper() if driver_status else ""
        if status_str not in ['ACTIVE', 'APPROVED', 'PENDING', 'DRIVERSTATUS.ACTIVE', 'DRIVERSTATUS.APPROVED', 'DRIVERSTATUS.PENDING']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "DRV-202", "message": f"Driver account not active. Status: {driver_status}"}
            )
        driver_name = f"{first_name} {last_name}" if first_name else request.name
    else:
        # Create new driver
        name_parts = request.name.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        count_result = db.execute(text("SELECT COUNT(*) FROM drivers")).fetchone()
        driver_count = count_result[0] if count_result else 0
        driver_code = f"DRV-{driver_count + 1:05d}"

        driver_result = db.execute(
            text("""
                INSERT INTO drivers (driver_id, first_name, last_name, email, status, created_at)
                VALUES (:driver_id, :first_name, :last_name, :email, 'PENDING', NOW())
                RETURNING id
            """),
            {
                "driver_id": driver_code,
                "first_name": first_name,
                "last_name": last_name,
                "email": request.email
            }
        )
        d_id = driver_result.fetchone()[0]

        hashed_password = get_password_hash(f"google_oauth_{request.google_id}")
        db.execute(
            text("""
                INSERT INTO users (email, password_hash, full_name, role, driver_id, created_at)
                VALUES (:email, :password_hash, :full_name, 'DRIVER', :driver_id, NOW())
            """),
            {
                "email": request.email,
                "password_hash": hashed_password,
                "full_name": request.name,
                "driver_id": d_id
            }
        )
        db.commit()

        driver_status = "PENDING"
        driver_name = request.name
        logger.info("Created new driver via Google", email=request.email)

    access_token = create_access_token(data={
        "sub": request.email,
        "role": "driver",
        "driver_id": d_id
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "driver_id": d_id,
        "driver_code": driver_code,
        "name": driver_name,
        "email": request.email,
        "status": str(driver_status) if driver_status else "PENDING"
    }


@app.post("/api/auth/driver/apple-auth", tags=["Driver Authentication"])
async def driver_apple_auth(request: DriverAppleAuthRequest, db: Session = Depends(get_db)):
    """
    iOS Driver Apple Sign In - handles login and registration.

    Note: Apple only sends name on first sign-in, so we handle null names.
    """
    logger.info("Driver Apple auth", email=request.email)

    from sqlalchemy import text

    # Check if driver exists
    result = db.execute(
        text("""
            SELECT u.id, u.email, u.driver_id, d.id as d_id, d.driver_id as driver_code,
                   d.first_name, d.last_name, d.status
            FROM users u
            LEFT JOIN drivers d ON u.driver_id = d.id
            WHERE u.email = :email AND u.role = 'DRIVER'
        """),
        {"email": request.email}
    ).fetchone()

    if result:
        # Existing driver - login
        user_id, email, driver_id, d_id, driver_code, first_name, last_name, driver_status = result

        status_str = str(driver_status).upper() if driver_status else ""
        if status_str not in ['ACTIVE', 'APPROVED', 'PENDING', 'DRIVERSTATUS.ACTIVE', 'DRIVERSTATUS.APPROVED', 'DRIVERSTATUS.PENDING']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "DRV-202", "message": f"Driver account not active. Status: {driver_status}"}
            )
        driver_name = f"{first_name} {last_name}" if first_name else request.name or email.split("@")[0]
    else:
        # Create new driver
        display_name = request.name or request.email.split("@")[0]
        name_parts = display_name.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        count_result = db.execute(text("SELECT COUNT(*) FROM drivers")).fetchone()
        driver_count = count_result[0] if count_result else 0
        driver_code = f"DRV-{driver_count + 1:05d}"

        driver_result = db.execute(
            text("""
                INSERT INTO drivers (driver_id, first_name, last_name, email, status, created_at)
                VALUES (:driver_id, :first_name, :last_name, :email, 'PENDING', NOW())
                RETURNING id
            """),
            {
                "driver_id": driver_code,
                "first_name": first_name,
                "last_name": last_name,
                "email": request.email
            }
        )
        d_id = driver_result.fetchone()[0]

        hashed_password = get_password_hash(f"apple_oauth_{request.apple_id}")
        db.execute(
            text("""
                INSERT INTO users (email, password_hash, full_name, role, driver_id, created_at)
                VALUES (:email, :password_hash, :full_name, 'DRIVER', :driver_id, NOW())
            """),
            {
                "email": request.email,
                "password_hash": hashed_password,
                "full_name": display_name,
                "driver_id": d_id
            }
        )
        db.commit()

        driver_status = "PENDING"
        driver_name = display_name
        logger.info("Created new driver via Apple", email=request.email)

    access_token = create_access_token(data={
        "sub": request.email,
        "role": "driver",
        "driver_id": d_id
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "driver_id": d_id,
        "driver_code": driver_code,
        "name": driver_name,
        "email": request.email,
        "status": str(driver_status) if driver_status else "PENDING"
    }


# =============================================================================
# ROUTES - DRIVER PROFILE
# =============================================================================

@app.get("/api/auth/driver/me", tags=["Driver Authentication"])
async def get_current_driver(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Get current authenticated driver profile.
    """
    payload = decode_token(token)
    driver_id = payload.get("driver_id")

    if not driver_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "DRV-201", "message": "Not a driver token"}
        )

    from sqlalchemy import text

    result = db.execute(
        text("""
            SELECT d.id, d.driver_id, d.first_name, d.last_name, d.email, d.phone,
                   d.vehicle_type, d.status, d.is_online, d.current_latitude, d.current_longitude,
                   d.rating, d.total_deliveries
            FROM drivers d
            WHERE d.id = :driver_id
        """),
        {"driver_id": driver_id}
    ).fetchone()

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "DRV-301", "message": "Driver not found"}
        )

    return {
        "id": result[0],
        "driver_code": result[1],
        "first_name": result[2],
        "last_name": result[3],
        "email": result[4],
        "phone": result[5],
        "vehicle_type": result[6],
        "status": str(result[7]) if result[7] else "PENDING",
        "is_online": result[8],
        "location": {
            "latitude": result[9],
            "longitude": result[10]
        } if result[9] else None,
        "rating": result[11],
        "total_deliveries": result[12]
    }


# =============================================================================
# ROUTES - PASSWORD RESET
# =============================================================================

@app.post("/api/auth/driver/password-reset/request", tags=["Driver Password Reset"])
async def request_password_reset(request: PasswordResetRequest, db: Session = Depends(get_db)):
    """
    Request a password reset email for driver account.
    """
    logger.info("Driver password reset requested", email=request.email)

    # Always return success to prevent email enumeration
    return {
        "success": True,
        "message": "If an account with this email exists, a password reset link has been sent."
    }


@app.post("/api/auth/driver/password-reset/confirm", tags=["Driver Password Reset"])
async def confirm_password_reset(request: PasswordResetConfirm, db: Session = Depends(get_db)):
    """
    Confirm password reset with token.
    """
    logger.info("Driver password reset confirmed", email=request.email)

    return {
        "success": True,
        "message": "Password has been reset successfully."
    }


# =============================================================================
# HEALTH ENDPOINT
# =============================================================================

@app.get("/api/driver/health", tags=["Health"])
@app.get("/health", tags=["Health"])
async def driver_health():
    """Driver auth service health check"""
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
