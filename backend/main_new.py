from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_, or_
from datetime import datetime, timedelta, date
from typing import Optional, List
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import jwt, JWTError
import os
import secrets
from dotenv import load_dotenv

from database import get_db, init_db
from models import User, Client, Invoice, InvoiceItem, Payment, UserRole, InvoiceStatus, PaymentStatus, Vendor

load_dotenv()

app = FastAPI(title="Invoice Management System")

# CORS - Production origins + localhost for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://dollor.ai",
        "https://api.dollor.ai",
        "https://app.dollor.ai",
        "http://localhost:5173",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("CRITICAL: JWT_SECRET_KEY environment variable is not set. Server cannot start without a secure secret key.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

# Pydantic Models
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
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class ClientCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    notes: Optional[str] = None

class ClientResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str]
    company: Optional[str]
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    zip_code: Optional[str]
    country: Optional[str]
    notes: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

class InvoiceItemCreate(BaseModel):
    description: str
    quantity: float
    unit_price: float

class InvoiceItemResponse(BaseModel):
    id: int
    description: str
    quantity: float
    unit_price: float
    amount: float
    
    class Config:
        from_attributes = True

class InvoiceCreate(BaseModel):
    client_id: int
    issue_date: datetime
    due_date: datetime
    items: List[InvoiceItemCreate]
    tax_rate: float = 0.0
    discount_amount: float = 0.0
    notes: Optional[str] = None
    terms: Optional[str] = None

class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    client_id: int
    client_name: str
    issue_date: datetime
    due_date: datetime
    subtotal: float
    tax_rate: float
    tax_amount: float
    discount_amount: float
    total_amount: float
    status: str
    notes: Optional[str]
    terms: Optional[str]
    created_at: datetime
    items: List[InvoiceItemResponse]
    
    class Config:
        from_attributes = True

class PaymentCreate(BaseModel):
    amount: float
    payment_date: datetime
    payment_method: Optional[str] = None
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class PaymentResponse(BaseModel):
    id: int
    invoice_id: int
    amount: float
    payment_date: datetime
    payment_method: Optional[str]
    reference_number: Optional[str]
    status: str
    notes: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

def generate_invoice_number(db: Session) -> str:
    """Generate unique invoice number"""
    today = datetime.now()
    prefix = f"INV-{today.year}{today.month:02d}"
    
    last_invoice = db.query(Invoice).filter(
        Invoice.invoice_number.like(f"{prefix}%")
    ).order_by(Invoice.invoice_number.desc()).first()
    
    if last_invoice:
        last_num = int(last_invoice.invoice_number.split("-")[-1])
        new_num = last_num + 1
    else:
        new_num = 1
    
    return f"{prefix}-{new_num:04d}"

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()

# Routes
@app.get("/")
def read_root():
    return {"message": "Invoice Management System API", "version": "1.0.0"}

@app.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        password_hash=hashed_password,
        full_name=user.full_name,
        role=UserRole.ADMIN if user.role == "admin" else UserRole.USER
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/api/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    print(f"Login attempt for: {form_data.username}")  # Debug log
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user:
        print(f"User not found: {form_data.username}")  # Debug log
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    print(f"User found, verifying password...")  # Debug log
    if not verify_password(form_data.password, user.password_hash):
        print(f"Password verification failed")  # Debug log
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    print(f"Login successful for: {user.email}")  # Debug log
    access_token = create_access_token(data={"sub": user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

# Vendor Login
@app.post("/api/auth/vendor/login", response_model=Token)
def vendor_login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    print(f"Vendor login attempt for: {form_data.username}")
    
    # Find user with VENDOR role
    user = db.query(User).filter(
        User.email == form_data.username,
        User.role == UserRole.VENDOR
    ).first()
    
    if not user:
        print(f"Vendor user not found: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not verify_password(form_data.password, user.password_hash):
        print(f"Password verification failed for vendor")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if vendor account is active
    if user.vendor_id:
        vendor = db.query(Vendor).filter(Vendor.id == user.vendor_id).first()
        if vendor and vendor.onboarding_status != "approved":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Vendor account is not approved. Status: {vendor.onboarding_status}"
            )
    
    print(f"Vendor login successful for: {user.email}")
    access_token = create_access_token(data={"sub": user.email, "role": "vendor"})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

# Helper function to get current vendor user
def get_current_vendor_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.VENDOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to vendors only"
        )
    if not current_user.vendor_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account not linked to a vendor"
        )
    return current_user

@app.get("/api/auth/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

# Client endpoints
@app.post("/api/clients", response_model=ClientResponse)
def create_client(client: ClientCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_client = Client(**client.dict())
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client

@app.get("/api/clients", response_model=List[ClientResponse])
def get_clients(skip: int = 0, limit: int = 100, search: Optional[str] = None, 
                db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Client)
    
    if search:
        query = query.filter(
            or_(
                Client.name.ilike(f"%{search}%"),
                Client.email.ilike(f"%{search}%"),
                Client.company.ilike(f"%{search}%")
            )
        )
    
    clients = query.offset(skip).limit(limit).all()
    return clients

@app.get("/api/clients/{client_id}", response_model=ClientResponse)
def get_client(client_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@app.put("/api/clients/{client_id}", response_model=ClientResponse)
def update_client(client_id: int, client_update: ClientCreate, 
                 db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_client = db.query(Client).filter(Client.id == client_id).first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    for key, value in client_update.dict().items():
        setattr(db_client, key, value)
    
    db_client.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_client)
    return db_client

@app.delete("/api/clients/{client_id}")
def delete_client(client_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_client = db.query(Client).filter(Client.id == client_id).first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Check if client has invoices
    invoice_count = db.query(Invoice).filter(Invoice.client_id == client_id).count()
    if invoice_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete client with existing invoices")
    
    db.delete(db_client)
    db.commit()
    return {"message": "Client deleted successfully"}

# Invoice endpoints
@app.post("/api/invoices", response_model=InvoiceResponse)
def create_invoice(invoice_data: InvoiceCreate, db: Session = Depends(get_db), 
                  current_user: User = Depends(get_current_user)):
    # Calculate amounts
    subtotal = sum(item.quantity * item.unit_price for item in invoice_data.items)
    tax_amount = subtotal * (invoice_data.tax_rate / 100)
    total_amount = subtotal + tax_amount - invoice_data.discount_amount
    
    # Create invoice
    db_invoice = Invoice(
        invoice_number=generate_invoice_number(db),
        user_id=current_user.id,
        client_id=invoice_data.client_id,
        issue_date=invoice_data.issue_date,
        due_date=invoice_data.due_date,
        subtotal=subtotal,
        tax_rate=invoice_data.tax_rate,
        tax_amount=tax_amount,
        discount_amount=invoice_data.discount_amount,
        total_amount=total_amount,
        status=InvoiceStatus.DRAFT,
        notes=invoice_data.notes,
        terms=invoice_data.terms
    )
    db.add(db_invoice)
    db.flush()
    
    # Create invoice items
    for item in invoice_data.items:
        db_item = InvoiceItem(
            invoice_id=db_invoice.id,
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unit_price,
            amount=item.quantity * item.unit_price
        )
        db.add(db_item)
    
    db.commit()
    db.refresh(db_invoice)
    
    # Format response
    client = db.query(Client).filter(Client.id == db_invoice.client_id).first()
    return {
        **db_invoice.__dict__,
        "client_name": client.name,
        "items": db_invoice.items
    }

@app.get("/api/invoices")
def get_invoices(
    skip: int = 0, 
    limit: int = 100, 
    status: Optional[str] = None,
    client_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    query = db.query(Invoice).join(Client)
    
    if status:
        query = query.filter(Invoice.status == InvoiceStatus[status.upper()])
    
    if client_id:
        query = query.filter(Invoice.client_id == client_id)
    
    if search:
        query = query.filter(
            or_(
                Invoice.invoice_number.ilike(f"%{search}%"),
                Client.name.ilike(f"%{search}%")
            )
        )
    
    total = query.count()
    invoices = query.order_by(Invoice.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for invoice in invoices:
        client = db.query(Client).filter(Client.id == invoice.client_id).first()
        paid_amount = sum(p.amount for p in invoice.payments if p.status == PaymentStatus.COMPLETED)
        
        result.append({
            "id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "client_id": invoice.client_id,
            "client_name": client.name,
            "issue_date": invoice.issue_date,
            "due_date": invoice.due_date,
            "subtotal": invoice.subtotal,
            "tax_amount": invoice.tax_amount,
            "discount_amount": invoice.discount_amount,
            "total_amount": invoice.total_amount,
            "paid_amount": paid_amount,
            "balance": invoice.total_amount - paid_amount,
            "status": invoice.status.value,
            "created_at": invoice.created_at
        })
    
    return {"data": result, "total": total}

@app.get("/api/invoices/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(invoice_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    client = db.query(Client).filter(Client.id == invoice.client_id).first()
    return {
        **invoice.__dict__,
        "client_name": client.name,
        "items": invoice.items
    }

@app.put("/api/invoices/{invoice_id}/status")
def update_invoice_status(invoice_id: int, status: str, db: Session = Depends(get_db), 
                         current_user: User = Depends(get_current_user)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    try:
        invoice.status = InvoiceStatus[status.upper()]
    except KeyError:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    db.commit()
    return {"message": "Status updated successfully"}

@app.delete("/api/invoices/{invoice_id}")
def delete_invoice(invoice_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice.status != InvoiceStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Can only delete draft invoices")
    
    db.delete(invoice)
    db.commit()
    return {"message": "Invoice deleted successfully"}

# Payment endpoints
@app.post("/api/invoices/{invoice_id}/payments", response_model=PaymentResponse)
def create_payment(invoice_id: int, payment_data: PaymentCreate, 
                  db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    db_payment = Payment(
        invoice_id=invoice_id,
        **payment_data.dict()
    )
    db.add(db_payment)
    
    # Update invoice status based on payments
    total_paid = sum(p.amount for p in invoice.payments if p.status == PaymentStatus.COMPLETED) + payment_data.amount
    
    if total_paid >= invoice.total_amount:
        invoice.status = InvoiceStatus.PAID
    elif invoice.status == InvoiceStatus.DRAFT:
        invoice.status = InvoiceStatus.SENT
    
    db.commit()
    db.refresh(db_payment)
    return db_payment

@app.get("/api/invoices/{invoice_id}/payments", response_model=List[PaymentResponse])
def get_invoice_payments(invoice_id: int, db: Session = Depends(get_db), 
                        current_user: User = Depends(get_current_user)):
    payments = db.query(Payment).filter(Payment.invoice_id == invoice_id).all()
    return payments

# Dashboard endpoints
@app.get("/api/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Total invoices
    total_invoices = db.query(Invoice).count()
    
    # Total revenue
    total_revenue = db.query(func.sum(Invoice.total_amount)).scalar() or 0
    
    # Outstanding balance
    paid_amount = db.query(func.sum(Payment.amount)).filter(
        Payment.status == PaymentStatus.COMPLETED
    ).scalar() or 0
    outstanding = total_revenue - paid_amount
    
    # Overdue invoices
    overdue_count = db.query(Invoice).filter(
        and_(
            Invoice.due_date < datetime.now(),
            Invoice.status != InvoiceStatus.PAID,
            Invoice.status != InvoiceStatus.CANCELLED
        )
    ).count()
    
    # Status breakdown
    status_breakdown = {}
    for status in InvoiceStatus:
        count = db.query(Invoice).filter(Invoice.status == status).count()
        status_breakdown[status.value] = count
    
    # Monthly revenue (last 12 months)
    monthly_data = []
    for i in range(11, -1, -1):
        target_date = datetime.now() - timedelta(days=30*i)
        month_start = target_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        if i == 0:
            month_end = datetime.now()
        else:
            next_month = month_start + timedelta(days=32)
            month_end = next_month.replace(day=1) - timedelta(seconds=1)
        
        month_revenue = db.query(func.sum(Invoice.total_amount)).filter(
            and_(
                Invoice.created_at >= month_start,
                Invoice.created_at <= month_end
            )
        ).scalar() or 0
        
        monthly_data.append({
            "month": month_start.strftime("%b %Y"),
            "revenue": float(month_revenue)
        })
    
    # Recent invoices
    recent_invoices = db.query(Invoice).join(Client).order_by(
        Invoice.created_at.desc()
    ).limit(5).all()
    
    recent_list = []
    for inv in recent_invoices:
        client = db.query(Client).filter(Client.id == inv.client_id).first()
        recent_list.append({
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "client_name": client.name,
            "amount": inv.total_amount,
            "status": inv.status.value,
            "due_date": inv.due_date
        })
    
    return {
        "total_invoices": total_invoices,
        "total_revenue": float(total_revenue),
        "outstanding": float(outstanding),
        "overdue_count": overdue_count,
        "status_breakdown": status_breakdown,
        "monthly_revenue": monthly_data,
        "recent_invoices": recent_list
    }

@app.get("/api/dashboard/recent-activity")
def get_recent_activity(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Recent invoices
    recent_invoices = db.query(Invoice).order_by(Invoice.created_at.desc()).limit(5).all()
    
    # Recent payments
    recent_payments = db.query(Payment).order_by(Payment.created_at.desc()).limit(5).all()
    
    activity = []
    
    for inv in recent_invoices:
        client = db.query(Client).filter(Client.id == inv.client_id).first()
        activity.append({
            "id": f"inv-{inv.id}",
            "type": "invoice",
            "action": f"Invoice {inv.invoice_number} created",
            "client": client.name,
            "amount": inv.total_amount,
            "date": inv.created_at
        })
    
    for pay in recent_payments:
        invoice = db.query(Invoice).filter(Invoice.id == pay.invoice_id).first()
        client = db.query(Client).filter(Client.id == invoice.client_id).first()
        activity.append({
            "id": f"pay-{pay.id}",
            "type": "payment",
            "action": f"Payment received for {invoice.invoice_number}",
            "client": client.name,
            "amount": pay.amount,
            "date": pay.created_at
        })
    
    activity.sort(key=lambda x: x["date"], reverse=True)
    return activity[:10]

# ============================================================================
# VENDOR MANAGEMENT ENDPOINTS (ZIP Integration)
# ============================================================================

class VendorCreate(BaseModel):
    company_name: str
    tax_id: Optional[str] = None
    business_type: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    # Restaurant specific
    restaurant_name: Optional[str] = None
    cuisine_type: Optional[str] = None
    operating_hours: Optional[str] = None
    seating_capacity: Optional[int] = None
    delivery_available: Optional[bool] = True
    pickup_available: Optional[bool] = True
    average_prep_time: Optional[int] = None
    # Contact
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_title: Optional[str] = None
    # Address
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    # Mobile app
    platform: Optional[str] = None
    mobile_device_id: Optional[str] = None
    push_token: Optional[str] = None
    notes: Optional[str] = None

class VendorResponse(BaseModel):
    id: int
    vendor_id: str
    company_name: str
    tax_id: Optional[str]
    business_type: Optional[str]
    industry: Optional[str]
    website: Optional[str]
    contact_name: Optional[str]
    contact_email: Optional[str]
    contact_phone: Optional[str]
    contact_title: Optional[str]
    street: Optional[str]
    city: Optional[str]
    state: Optional[str]
    zip_code: Optional[str]
    country: Optional[str]
    onboarding_status: str
    onboarding_phase: str
    risk_rating: str
    performance_score: int
    contract_status: Optional[str]
    zip_status: Optional[str]
    w9_form: bool
    insurance: bool
    financial_statements: bool
    compliance_certs: bool
    security_policy: bool
    notes: Optional[str]
    created_at: datetime
    approved_at: Optional[datetime]
    last_activity: Optional[datetime]
    
    class Config:
        from_attributes = True

@app.post("/api/vendors/public", response_model=VendorResponse)
def create_vendor_public(vendor: VendorCreate, db: Session = Depends(get_db)):
    """Public endpoint for restaurant applications - no auth required"""
    from models import Vendor
    
    print("=" * 60)
    print("🍽️  RESTAURANT APPLICATION RECEIVED")
    print(f"Restaurant: {vendor.restaurant_name}")
    print(f"Contact: {vendor.contact_email}")
    print("=" * 60)
    
    try:
        # Generate vendor ID
        count = db.query(Vendor).count()
        vendor_id = f"VEN-{datetime.now().year}{datetime.now().month:02d}-{count + 1:04d}"
        
        print(f"Generated vendor_id: {vendor_id}")
        
        db_vendor = Vendor(
            vendor_id=vendor_id,
            **vendor.dict()
        )
        db.add(db_vendor)
        db.commit()
        db.refresh(db_vendor)
        
        print(f"✅ Vendor created successfully! ID: {db_vendor.id}")
        print("=" * 60)
        
        return db_vendor
        
    except Exception as e:
        print(f"❌ ERROR creating vendor: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        print("=" * 60)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create vendor: {str(e)}")

@app.post("/api/vendors", response_model=VendorResponse)
def create_vendor(vendor: VendorCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Vendor
    
    # Generate vendor ID
    count = db.query(Vendor).count()
    vendor_id = f"VEN-{datetime.now().year}{datetime.now().month:02d}-{count + 1:04d}"
    
    db_vendor = Vendor(
        vendor_id=vendor_id,
        **vendor.dict()
    )
    db.add(db_vendor)
    db.commit()
    db.refresh(db_vendor)
    return db_vendor

@app.get("/api/vendors", response_model=List[VendorResponse])
def get_vendors(
    status: Optional[str] = None,
    risk_rating: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from models import Vendor, VendorStatus, RiskRating
    
    query = db.query(Vendor)
    
    if status:
        query = query.filter(Vendor.onboarding_status == VendorStatus[status.upper()])
    
    if risk_rating:
        query = query.filter(Vendor.risk_rating == RiskRating[risk_rating.upper()])
    
    return query.order_by(Vendor.created_at.desc()).all()

@app.get("/api/vendors/{vendor_id}", response_model=VendorResponse)
def get_vendor(vendor_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Vendor
    
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor

@app.put("/api/vendors/{vendor_id}", response_model=VendorResponse)
def update_vendor(
    vendor_id: int,
    vendor: VendorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from models import Vendor
    
    db_vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not db_vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    for key, value in vendor.dict(exclude_unset=True).items():
        setattr(db_vendor, key, value)
    
    db_vendor.last_activity = datetime.now()
    db.commit()
    db.refresh(db_vendor)
    return db_vendor

@app.patch("/api/vendors/{vendor_id}/status")
def update_vendor_status(
    vendor_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from models import Vendor, VendorStatus
    
    db_vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not db_vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Update vendor status
    db_vendor.onboarding_status = VendorStatus[status.upper()]
    
    # If vendor is being approved, create user account
    if status.upper() == "APPROVED" and db_vendor.approved_at is None:
        db_vendor.approved_at = datetime.now()
        
        # Check if user account already exists
        existing_user = db.query(User).filter(User.email == db_vendor.contact_email).first()
        if not existing_user:
            # Create vendor user account with secure random password
            temp_password = secrets.token_urlsafe(16)  # Secure random password
            hashed_password = get_password_hash(temp_password)

            vendor_user = User(
                email=db_vendor.contact_email,
                password_hash=hashed_password,
                full_name=db_vendor.contact_name or db_vendor.restaurant_name,
                role=UserRole.VENDOR,
                vendor_id=db_vendor.id
            )
            db.add(vendor_user)

            # TODO: Send email with login credentials (password should be sent via secure email)
            print(f"Vendor user created: {db_vendor.contact_email} - temporary password generated (check email service)")
    
    db.commit()
    db.refresh(db_vendor)
    return db_vendor

# Publish Vendor to Mobile Apps (iOS, Android, Web)
class PublishVendorRequest(BaseModel):
    platforms: List[str] = ["ios", "android", "web"]

@app.patch("/api/vendors/{vendor_id}/publish")
def publish_vendor(
    vendor_id: int,
    request: PublishVendorRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Publish a vendor to mobile apps (iOS, Android, Web)"""
    from models import Vendor
    import json

    db_vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not db_vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    # Validate platforms
    valid_platforms = ["ios", "android", "web"]
    for platform in request.platforms:
        if platform.lower() not in valid_platforms:
            raise HTTPException(status_code=400, detail=f"Invalid platform: {platform}. Must be one of: {valid_platforms}")

    # Update publish status
    db_vendor.is_published = True
    db_vendor.published_at = datetime.now()
    db_vendor.published_platforms = json.dumps([p.lower() for p in request.platforms])
    db_vendor.last_activity = datetime.now()

    db.commit()
    db.refresh(db_vendor)

    return {
        "message": f"Vendor '{db_vendor.restaurant_name or db_vendor.company_name}' published successfully",
        "vendor_id": db_vendor.id,
        "is_published": db_vendor.is_published,
        "published_at": db_vendor.published_at.isoformat() if db_vendor.published_at else None,
        "published_platforms": request.platforms
    }

@app.patch("/api/vendors/{vendor_id}/unpublish")
def unpublish_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Unpublish a vendor from all mobile apps"""
    from models import Vendor

    db_vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not db_vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    db_vendor.is_published = False
    db_vendor.published_platforms = None
    db_vendor.last_activity = datetime.now()

    db.commit()
    db.refresh(db_vendor)

    return {
        "message": f"Vendor '{db_vendor.restaurant_name or db_vendor.company_name}' unpublished",
        "vendor_id": db_vendor.id,
        "is_published": db_vendor.is_published
    }

# Get Published Vendors (Public endpoint for mobile apps)
@app.get("/api/vendors/published")
def get_published_vendors(
    platform: str = Query("android", description="Platform filter: ios, android, web"),
    city: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get list of published vendors for mobile apps - NO AUTH REQUIRED"""
    from models import Vendor
    import json

    query = db.query(Vendor).filter(Vendor.is_published == True)

    if city:
        query = query.filter(Vendor.city.ilike(f"%{city}%"))

    vendors = query.all()

    # Filter by platform
    result = []
    for vendor in vendors:
        if vendor.published_platforms:
            try:
                platforms = json.loads(vendor.published_platforms) if isinstance(vendor.published_platforms, str) else vendor.published_platforms
                if platform.lower() in [p.lower() for p in platforms]:
                    result.append(vendor)
            except:
                # If platforms is comma-separated string
                if platform.lower() in vendor.published_platforms.lower():
                    result.append(vendor)

    return result

# Create Vendor User Account (Admin endpoint)
@app.post("/api/vendors/{vendor_id}/create-account")
def create_vendor_account(
    vendor_id: int,
    password: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admin endpoint to create a vendor user account"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == vendor.contact_email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User account already exists for this email")
    
    # Create vendor user
    hashed_password = get_password_hash(password)
    vendor_user = User(
        email=vendor.contact_email,
        password_hash=hashed_password,
        full_name=vendor.contact_name or vendor.restaurant_name,
        role=UserRole.VENDOR,
        vendor_id=vendor.id
    )
    db.add(vendor_user)
    db.commit()
    db.refresh(vendor_user)
    
    return {"message": "Vendor account created", "user_id": vendor_user.id, "email": vendor_user.email}
    
    try:
        db_vendor.onboarding_status = VendorStatus[status.upper()]
        if status.upper() == "APPROVED":
            db_vendor.approved_at = datetime.now()
        db_vendor.last_activity = datetime.now()
        db.commit()
        return {"message": "Status updated successfully", "status": status}
    except KeyError:
        raise HTTPException(status_code=400, detail="Invalid status")

@app.patch("/api/vendors/{vendor_id}/documents")
def update_vendor_documents(
    vendor_id: int,
    documents: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from models import Vendor
    
    db_vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not db_vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Update document flags
    for doc_type, status in documents.items():
        if hasattr(db_vendor, doc_type):
            setattr(db_vendor, doc_type, status)
    
    db_vendor.last_activity = datetime.now()
    db.commit()
    return {"message": "Documents updated successfully"}

@app.delete("/api/vendors/{vendor_id}")
def delete_vendor(vendor_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Vendor
    
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    db.delete(vendor)
    db.commit()
    return {"message": "Vendor deleted successfully"}

# ============================================================================
# RESTAURANT MENU ENDPOINTS (For Mobile App)
# ============================================================================

class MenuItemCreate(BaseModel):
    item_name: str
    description: Optional[str] = None
    category: str
    price: float
    is_available: bool = True
    is_vegetarian: bool = False
    is_vegan: bool = False
    is_gluten_free: bool = False
    is_spicy: bool = False
    spice_level: int = 0
    prep_time: Optional[int] = None
    calories: Optional[int] = None
    image_url: Optional[str] = None
    in_stock: bool = True
    daily_limit: Optional[int] = None

class MenuItemResponse(BaseModel):
    id: int
    vendor_id: int
    item_name: str
    description: Optional[str]
    category: str
    price: float
    is_available: bool
    is_vegetarian: bool
    is_vegan: bool
    is_gluten_free: bool
    is_spicy: bool
    spice_level: int
    prep_time: Optional[int]
    calories: Optional[int]
    image_url: Optional[str]
    in_stock: bool
    daily_limit: Optional[int]
    items_sold_today: int
    created_at: datetime
    
    class Config:
        from_attributes = True

@app.post("/api/vendors/{vendor_id}/menu", response_model=MenuItemResponse)
def create_menu_item(
    vendor_id: int,
    menu_item: MenuItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from models import Vendor, VendorMenuItem
    
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    db_menu_item = VendorMenuItem(
        vendor_id=vendor_id,
        **menu_item.dict()
    )
    db.add(db_menu_item)
    db.commit()
    db.refresh(db_menu_item)
    return db_menu_item

@app.get("/api/vendors/{vendor_id}/menu", response_model=List[MenuItemResponse])
def get_vendor_menu(
    vendor_id: int,
    category: Optional[str] = None,
    available_only: bool = False,
    db: Session = Depends(get_db)
):
    from models import VendorMenuItem
    
    query = db.query(VendorMenuItem).filter(VendorMenuItem.vendor_id == vendor_id)
    
    if category:
        query = query.filter(VendorMenuItem.category == category)
    
    if available_only:
        query = query.filter(VendorMenuItem.is_available == True, VendorMenuItem.in_stock == True)
    
    return query.all()

@app.put("/api/vendors/{vendor_id}/menu/{item_id}", response_model=MenuItemResponse)
def update_menu_item(
    vendor_id: int,
    item_id: int,
    menu_item: MenuItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from models import VendorMenuItem
    
    db_menu_item = db.query(VendorMenuItem).filter(
        VendorMenuItem.id == item_id,
        VendorMenuItem.vendor_id == vendor_id
    ).first()
    
    if not db_menu_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    for key, value in menu_item.dict(exclude_unset=True).items():
        setattr(db_menu_item, key, value)
    
    db.commit()
    db.refresh(db_menu_item)
    return db_menu_item

@app.delete("/api/vendors/{vendor_id}/menu/{item_id}")
def delete_menu_item(
    vendor_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from models import VendorMenuItem
    
    menu_item = db.query(VendorMenuItem).filter(
        VendorMenuItem.id == item_id,
        VendorMenuItem.vendor_id == vendor_id
    ).first()
    
    if not menu_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    db.delete(menu_item)
    db.commit()
    return {"message": "Menu item deleted successfully"}

@app.get("/api/vendors/{vendor_id}/menu/categories")
def get_menu_categories(vendor_id: int, db: Session = Depends(get_db)):
    from models import VendorMenuItem
    
    categories = db.query(VendorMenuItem.category).filter(
        VendorMenuItem.vendor_id == vendor_id
    ).distinct().all()
    
    return [cat[0] for cat in categories if cat[0]]

# Mobile App Registration
@app.post("/api/vendors/{vendor_id}/register-app")
def register_mobile_app(
    vendor_id: int,
    app_data: dict,
    db: Session = Depends(get_db)
):
    from models import Vendor
    
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    vendor.app_registered = True
    vendor.platform = app_data.get("platform")
    vendor.mobile_device_id = app_data.get("device_id")
    vendor.push_token = app_data.get("push_token")
    vendor.last_activity = datetime.now()
    
    db.commit()
    return {"message": "App registered successfully", "vendor_id": vendor.vendor_id}

# Include Stripe payment routes
from stripe_integration import router as stripe_router
app.include_router(stripe_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)
