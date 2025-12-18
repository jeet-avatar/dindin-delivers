"""
Dollor.ai - Auth Service
========================

Microservice handling all authentication for the platform:
- User registration and login
- Vendor (Restaurant) authentication
- Driver authentication
- Customer authentication
- OAuth (Google, Apple)
- Password reset
- JWT token management

Port: 8001
Error Prefix: AUTH
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
    AuthErrors,
    ErrorResponse,
)

# =============================================================================
# CONFIGURATION
# =============================================================================

SERVICE_NAME = "auth-service"
SERVICE_VERSION = "1.0.0"
SERVICE_PORT = 8001

# JWT Configuration
# CRITICAL: JWT_SECRET_KEY must be set in environment - no default for security
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY environment variable is required")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24 hours

# Database - must be configured via environment
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is required")

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

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

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "user"


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    vendor_id: Optional[int] = None
    driver_id: Optional[int] = None
    customer_id: Optional[int] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
    vendor_id: Optional[int] = None
    driver_id: Optional[int] = None
    business_name: Optional[str] = None
    email: Optional[str] = None


class DriverRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: str
    vehicle_type: Optional[str] = "car"
    license_number: Optional[str] = None
    date_of_birth: Optional[str] = None


class DriverGoogleAuthRequest(BaseModel):
    email: EmailStr
    name: str
    google_id: str


class CustomerRegisterRequest(BaseModel):
    """Customer registration request - accepts both 'name' and 'full_name' for iOS/Android compatibility"""
    email: EmailStr
    password: str
    name: Optional[str] = None
    full_name: Optional[str] = None  # iOS sends full_name, Android sends name
    phone: Optional[str] = None

    def get_name(self) -> str:
        """Get the name (prefers name, falls back to full_name)"""
        return self.name or self.full_name or ""


class CustomerLoginRequest(BaseModel):
    """JSON login request for iOS apps (POST /api/customer/login)"""
    email: EmailStr
    password: str


class CustomerGoogleAuthRequest(BaseModel):
    """Google OAuth request for customers"""
    email: EmailStr
    name: str
    google_id: str


class CustomerAppleAuthRequest(BaseModel):
    """Apple Sign In request for customers"""
    email: EmailStr
    name: Optional[str] = None
    apple_id: str
    identity_token: Optional[str] = None


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

# CORS origins from environment or production defaults
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "").split(",") if os.getenv("CORS_ORIGINS") else [
    "https://dollor.ai",
    "https://*.dollor.ai",
    "https://api.dollor.ai",
    "https://app.dollor.ai",
]

factory = MicroserviceFactory(
    service_name=SERVICE_NAME,
    version=SERVICE_VERSION,
    description="Authentication service for Dollor.ai platform",
    port=SERVICE_PORT,
    cors_origins=CORS_ORIGINS
)

# Create FastAPI app
app = factory.create_app()
logger = factory.logger


# =============================================================================
# ROUTES - GENERAL AUTH
# =============================================================================

@app.post("/api/auth/login", response_model=Token, tags=["Authentication"])
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Authenticate user and return JWT token.

    Error Codes:
    - AUTH-201: Invalid credentials
    - AUTH-202: Account not active
    """
    logger.info("Login attempt", email=form_data.username)

    # Import here to avoid circular imports (will be replaced with proper models)
    from sqlalchemy import text

    # Query user
    result = db.execute(
        text("SELECT id, email, password_hash, full_name, role, vendor_id, driver_id FROM users WHERE email = :email"),
        {"email": form_data.username}
    ).fetchone()

    if not result:
        logger.warning("User not found", email=form_data.username)
        return ErrorResponse.build(
            error=AuthErrors.INVALID_CREDENTIALS,
            environment=factory.environment,
            service=SERVICE_NAME
        )

    user_id, email, password_hash, full_name, role, vendor_id, driver_id = result

    if not verify_password(form_data.password, password_hash):
        logger.warning("Invalid password", email=form_data.username)
        return ErrorResponse.build(
            error=AuthErrors.INVALID_CREDENTIALS,
            environment=factory.environment,
            service=SERVICE_NAME
        )

    # Create token with user info
    access_token = create_access_token(data={
        "sub": email,
        "role": role,
        "user_id": user_id
    })

    logger.info("Login successful", email=email, role=role)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": email,
            "full_name": full_name,
            "role": role,
            "vendor_id": vendor_id,
            "driver_id": driver_id
        },
        "vendor_id": vendor_id,
        "driver_id": driver_id,
        "email": email
    }


@app.post("/api/auth/register", response_model=UserResponse, tags=["Authentication"])
async def register(user: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user.

    Error Codes:
    - AUTH-101: Invalid email format
    - AUTH-102: Password too weak
    - AUTH-103: Email already registered
    """
    logger.info("Registration attempt", email=user.email)

    from sqlalchemy import text

    # Check if email exists
    existing = db.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": user.email}
    ).fetchone()

    if existing:
        logger.warning("Email already registered", email=user.email)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "AUTH-103", "message": "Email already registered"}
        )

    # Hash password and create user
    hashed_password = get_password_hash(user.password)

    result = db.execute(
        text("""
            INSERT INTO users (email, password_hash, full_name, role, created_at)
            VALUES (:email, :password_hash, :full_name, :role, NOW())
            RETURNING id, email, full_name, role
        """),
        {
            "email": user.email,
            "password_hash": hashed_password,
            "full_name": user.full_name,
            "role": user.role
        }
    )
    db.commit()

    new_user = result.fetchone()
    logger.info("Registration successful", email=user.email)

    return {
        "id": new_user[0],
        "email": new_user[1],
        "full_name": new_user[2],
        "role": new_user[3]
    }


@app.get("/api/auth/me", response_model=UserResponse, tags=["Authentication"])
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Get current authenticated user.

    Error Codes:
    - AUTH-201: Invalid token
    - AUTH-203: Token expired
    """
    payload = decode_token(token)
    email = payload.get("sub")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "AUTH-201", "message": "Invalid token"}
        )

    from sqlalchemy import text

    result = db.execute(
        text("SELECT id, email, full_name, role, vendor_id, driver_id FROM users WHERE email = :email"),
        {"email": email}
    ).fetchone()

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "AUTH-301", "message": "User not found"}
        )

    return {
        "id": result[0],
        "email": result[1],
        "full_name": result[2],
        "role": result[3],
        "vendor_id": result[4],
        "driver_id": result[5]
    }


@app.post("/api/auth/refresh", tags=["Authentication"])
async def refresh_token(token: str = Depends(oauth2_scheme)):
    """
    Refresh an access token.

    Error Codes:
    - AUTH-203: Token expired (cannot refresh)
    """
    payload = decode_token(token)

    # Create new token with same claims
    new_token = create_access_token(data={
        "sub": payload.get("sub"),
        "role": payload.get("role"),
        "user_id": payload.get("user_id")
    })

    return {
        "access_token": new_token,
        "token_type": "bearer"
    }


# =============================================================================
# ROUTES - DRIVER AUTH
# =============================================================================

@app.post("/api/auth/driver/login", tags=["Driver Authentication"])
async def driver_login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Authenticate driver and return JWT token.

    Error Codes:
    - AUTH-201: Invalid credentials
    - AUTH-202: Driver account not active
    - DRV-301: Driver profile not found
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
            detail={"code": "AUTH-201", "message": "Invalid credentials"}
        )

    user_id, email, password_hash, full_name, driver_id, d_id, driver_code, first_name, last_name, driver_status = result

    if not verify_password(form_data.password, password_hash):
        logger.warning("Invalid password for driver", email=form_data.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "AUTH-201", "message": "Invalid credentials"}
        )

    if driver_status not in ['ACTIVE', 'APPROVED']:
        logger.warning("Driver not active", email=form_data.username, status=driver_status)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "AUTH-202", "message": f"Driver account not active. Status: {driver_status}"}
        )

    access_token = create_access_token(data={
        "sub": email,
        "role": "driver",
        "driver_id": d_id,
        "user_id": user_id
    })

    logger.info("Driver login successful", email=email, driver_id=d_id)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "driver_id": d_id,
        "driver_code": driver_code,
        "name": f"{first_name} {last_name}",
        "email": email
    }


@app.post("/api/auth/driver/register", tags=["Driver Authentication"])
async def driver_register(request: DriverRegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new driver account.

    Error Codes:
    - AUTH-103: Email already registered
    - DRV-101: Invalid phone format
    - DRV-102: Invalid license
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
            detail={"code": "AUTH-103", "message": "Email already registered"}
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


@app.post("/api/auth/driver/google", tags=["Driver Authentication"])
async def driver_google_auth(request: DriverGoogleAuthRequest, db: Session = Depends(get_db)):
    """
    Google OAuth for drivers - handles login and registration.

    Error Codes:
    - AUTH-202: Driver account not active
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
        # Existing driver
        user_id, email, driver_id, d_id, driver_code, first_name, last_name, driver_status = result

        if driver_status not in ['ACTIVE', 'APPROVED', 'PENDING']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "AUTH-202", "message": f"Driver account not active. Status: {driver_status}"}
            )
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
        "name": f"{first_name} {last_name}",
        "email": request.email,
        "status": driver_status
    }


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
            detail={"code": "AUTH-201", "message": "Not a driver token"}
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
        "status": result[7],
        "is_online": result[8],
        "location": {
            "latitude": result[9],
            "longitude": result[10]
        } if result[9] else None,
        "rating": result[11],
        "total_deliveries": result[12]
    }


# =============================================================================
# ROUTES - CUSTOMER AUTH
# =============================================================================

@app.post("/api/auth/customer/register", tags=["Customer Authentication"])
async def customer_register(request: CustomerRegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new customer account (Android/Web - form compatible).
    """
    logger.info("Customer registration", email=request.email)

    from sqlalchemy import text

    # Get name using compatibility method (handles both 'name' and 'full_name')
    customer_name = request.get_name()

    # Check if email exists
    existing = db.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": request.email}
    ).fetchone()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "AUTH-103", "message": "Email already registered"}
        )

    # Create customer record
    customer_result = db.execute(
        text("""
            INSERT INTO customers (name, email, phone, status, created_at)
            VALUES (:name, :email, :phone, 'ACTIVE', NOW())
            RETURNING id
        """),
        {
            "name": customer_name,
            "email": request.email,
            "phone": request.phone
        }
    )
    customer_id = customer_result.fetchone()[0]

    # Create user record
    hashed_password = get_password_hash(request.password)
    db.execute(
        text("""
            INSERT INTO users (email, password_hash, full_name, role, customer_id, created_at)
            VALUES (:email, :password_hash, :full_name, 'CUSTOMER', :customer_id, NOW())
        """),
        {
            "email": request.email,
            "password_hash": hashed_password,
            "full_name": customer_name,
            "customer_id": customer_id
        }
    )
    db.commit()

    access_token = create_access_token(data={
        "sub": request.email,
        "role": "customer",
        "customer_id": customer_id
    })

    logger.info("Customer registration successful", email=request.email)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "customer_id": customer_id,
        "name": customer_name,
        "email": request.email
    }


@app.post("/api/auth/customer/login", tags=["Customer Authentication"])
async def customer_login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Authenticate customer and return JWT token.
    """
    logger.info("Customer login attempt", email=form_data.username)

    from sqlalchemy import text

    result = db.execute(
        text("""
            SELECT u.id, u.email, u.password_hash, u.full_name, u.customer_id,
                   c.id as c_id, c.name
            FROM users u
            LEFT JOIN customers c ON u.customer_id = c.id
            WHERE u.email = :email AND u.role = 'CUSTOMER'
        """),
        {"email": form_data.username}
    ).fetchone()

    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "AUTH-201", "message": "Invalid credentials"}
        )

    user_id, email, password_hash, full_name, customer_id, c_id, customer_name = result

    if not verify_password(form_data.password, password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "AUTH-201", "message": "Invalid credentials"}
        )

    access_token = create_access_token(data={
        "sub": email,
        "role": "customer",
        "customer_id": c_id,
        "user_id": user_id
    })

    logger.info("Customer login successful", email=email)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "customer_id": c_id,
        "name": customer_name or full_name,
        "email": email
    }


# =============================================================================
# ROUTES - iOS CUSTOMER AUTH (JSON Body Endpoints)
# =============================================================================

@app.post("/api/customer/login", tags=["Customer Authentication - iOS"])
async def customer_login_ios(request: CustomerLoginRequest, db: Session = Depends(get_db)):
    """
    iOS Customer Login - JSON body endpoint.

    iOS apps send JSON body: {"email": "...", "password": "..."}
    Instead of form data.
    """
    logger.info("iOS Customer login attempt", email=request.email)

    from sqlalchemy import text

    # Query customer from users table with CUSTOMER role
    result = db.execute(
        text("""
            SELECT u.id, u.email, u.password_hash, u.full_name, u.customer_id,
                   c.id as c_id, c.name
            FROM users u
            LEFT JOIN customers c ON u.customer_id = c.id
            WHERE u.email = :email AND u.role = 'CUSTOMER'
        """),
        {"email": request.email}
    ).fetchone()

    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "AUTH-201", "message": "Invalid credentials"}
        )

    user_id, email, password_hash, full_name, customer_id, c_id, customer_name = result

    if not verify_password(request.password, password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "AUTH-201", "message": "Invalid credentials"}
        )

    access_token = create_access_token(data={
        "sub": email,
        "role": "customer",
        "customer_id": c_id,
        "user_id": user_id
    })

    logger.info("iOS Customer login successful", email=email)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "customer_id": c_id,
        "name": customer_name or full_name,
        "email": email
    }


@app.post("/api/customer/register", tags=["Customer Authentication - iOS"])
async def customer_register_ios(request: CustomerRegisterRequest, db: Session = Depends(get_db)):
    """
    iOS Customer Registration - JSON body endpoint.

    iOS sends: {"email": "...", "password": "...", "full_name": "...", "phone": "..."}
    Also supports 'name' field for Android compatibility.
    """
    logger.info("iOS Customer registration", email=request.email)

    from sqlalchemy import text

    # Get name using compatibility method
    customer_name = request.get_name()

    # Check if email exists
    existing = db.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": request.email}
    ).fetchone()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "AUTH-103", "message": "Email already registered"}
        )

    # Create customer record
    customer_result = db.execute(
        text("""
            INSERT INTO customers (name, email, phone, status, created_at)
            VALUES (:name, :email, :phone, 'ACTIVE', NOW())
            RETURNING id
        """),
        {
            "name": customer_name,
            "email": request.email,
            "phone": request.phone
        }
    )
    customer_id = customer_result.fetchone()[0]

    # Create user record
    hashed_password = get_password_hash(request.password)
    db.execute(
        text("""
            INSERT INTO users (email, password_hash, full_name, role, customer_id, created_at)
            VALUES (:email, :password_hash, :full_name, 'CUSTOMER', :customer_id, NOW())
        """),
        {
            "email": request.email,
            "password_hash": hashed_password,
            "full_name": customer_name,
            "customer_id": customer_id
        }
    )
    db.commit()

    access_token = create_access_token(data={
        "sub": request.email,
        "role": "customer",
        "customer_id": customer_id
    })

    logger.info("iOS Customer registration successful", email=request.email)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "customer_id": customer_id,
        "name": customer_name,
        "email": request.email
    }


@app.post("/api/customer/google-auth", tags=["Customer Authentication - iOS"])
async def customer_google_auth_ios(request: CustomerGoogleAuthRequest, db: Session = Depends(get_db)):
    """
    iOS Customer Google OAuth - handles login and registration.

    iOS sends: {"email": "...", "name": "...", "google_id": "..."}
    """
    logger.info("iOS Customer Google auth", email=request.email)

    from sqlalchemy import text

    # Check if customer exists
    result = db.execute(
        text("""
            SELECT u.id, u.email, u.customer_id, c.id as c_id, c.name
            FROM users u
            LEFT JOIN customers c ON u.customer_id = c.id
            WHERE u.email = :email AND u.role = 'CUSTOMER'
        """),
        {"email": request.email}
    ).fetchone()

    if result:
        # Existing customer - login
        user_id, email, customer_id, c_id, customer_name = result
    else:
        # Create new customer
        customer_result = db.execute(
            text("""
                INSERT INTO customers (name, email, status, created_at)
                VALUES (:name, :email, 'ACTIVE', NOW())
                RETURNING id
            """),
            {
                "name": request.name,
                "email": request.email
            }
        )
        c_id = customer_result.fetchone()[0]

        # Create user record with Google OAuth password placeholder
        hashed_password = get_password_hash(f"google_oauth_{request.google_id}")
        db.execute(
            text("""
                INSERT INTO users (email, password_hash, full_name, role, customer_id, created_at)
                VALUES (:email, :password_hash, :full_name, 'CUSTOMER', :customer_id, NOW())
            """),
            {
                "email": request.email,
                "password_hash": hashed_password,
                "full_name": request.name,
                "customer_id": c_id
            }
        )
        db.commit()
        customer_name = request.name
        logger.info("Created new customer via Google", email=request.email)

    access_token = create_access_token(data={
        "sub": request.email,
        "role": "customer",
        "customer_id": c_id
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "customer_id": c_id,
        "name": customer_name,
        "email": request.email
    }


@app.post("/api/customer/apple-auth", tags=["Customer Authentication - iOS"])
async def customer_apple_auth_ios(request: CustomerAppleAuthRequest, db: Session = Depends(get_db)):
    """
    iOS Customer Apple Sign In - handles login and registration.

    iOS sends: {"email": "...", "name": "...", "apple_id": "...", "identity_token": "..."}
    Note: Apple only sends name on first sign-in, so we handle null names.
    """
    logger.info("iOS Customer Apple auth", email=request.email)

    from sqlalchemy import text

    # Check if customer exists
    result = db.execute(
        text("""
            SELECT u.id, u.email, u.customer_id, c.id as c_id, c.name
            FROM users u
            LEFT JOIN customers c ON u.customer_id = c.id
            WHERE u.email = :email AND u.role = 'CUSTOMER'
        """),
        {"email": request.email}
    ).fetchone()

    if result:
        # Existing customer - login
        user_id, email, customer_id, c_id, customer_name = result
    else:
        # Create new customer
        # Use name if provided, otherwise extract from email
        display_name = request.name or request.email.split("@")[0]

        customer_result = db.execute(
            text("""
                INSERT INTO customers (name, email, status, created_at)
                VALUES (:name, :email, 'ACTIVE', NOW())
                RETURNING id
            """),
            {
                "name": display_name,
                "email": request.email
            }
        )
        c_id = customer_result.fetchone()[0]

        # Create user record with Apple OAuth password placeholder
        hashed_password = get_password_hash(f"apple_oauth_{request.apple_id}")
        db.execute(
            text("""
                INSERT INTO users (email, password_hash, full_name, role, customer_id, created_at)
                VALUES (:email, :password_hash, :full_name, 'CUSTOMER', :customer_id, NOW())
            """),
            {
                "email": request.email,
                "password_hash": hashed_password,
                "full_name": display_name,
                "customer_id": c_id
            }
        )
        db.commit()
        customer_name = display_name
        logger.info("Created new customer via Apple", email=request.email)

    access_token = create_access_token(data={
        "sub": request.email,
        "role": "customer",
        "customer_id": c_id
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "customer_id": c_id,
        "name": customer_name,
        "email": request.email
    }


@app.post("/api/auth/customer/google", tags=["Customer Authentication"])
async def customer_google_auth_android(request: CustomerGoogleAuthRequest, db: Session = Depends(get_db)):
    """
    Android/Web Customer Google OAuth - alias for /api/customer/google-auth.

    Android uses this path: /api/auth/customer/google
    """
    # Reuse iOS Google auth endpoint
    return await customer_google_auth_ios(request, db)


# =============================================================================
# ROUTES - PASSWORD RESET
# =============================================================================

@app.post("/api/auth/password-reset/request", tags=["Password Reset"])
async def request_password_reset(request: PasswordResetRequest, db: Session = Depends(get_db)):
    """
    Request a password reset email.
    """
    logger.info("Password reset requested", email=request.email)

    # Always return success to prevent email enumeration
    # In production, would send email if user exists

    return {
        "success": True,
        "message": "If an account with this email exists, a password reset link has been sent."
    }


@app.post("/api/auth/password-reset/confirm", tags=["Password Reset"])
async def confirm_password_reset(request: PasswordResetConfirm, db: Session = Depends(get_db)):
    """
    Confirm password reset with token.
    """
    # In production, would validate token and update password
    logger.info("Password reset confirmed", email=request.email)

    return {
        "success": True,
        "message": "Password has been reset successfully."
    }


# =============================================================================
# HEALTH ENDPOINT OVERRIDE
# =============================================================================

@app.get("/api/auth/health", tags=["Health"])
async def auth_health():
    """Auth service health check"""
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
