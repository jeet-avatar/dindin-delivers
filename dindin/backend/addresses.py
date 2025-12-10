"""
Dollor.ai Address Management API
Backend endpoints for customer delivery addresses
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

from database import get_db, Base

# ==================== ADDRESS MODEL ====================

class CustomerAddress(Base):
    """Customer delivery addresses stored in database"""
    __tablename__ = "customer_addresses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)

    # Address details
    location_name = Column(String(100))  # "Home", "Work", etc.
    street = Column(String(255), nullable=False)
    unit = Column(String(50))
    city = Column(String(100), nullable=False)
    state = Column(String(50), nullable=False)
    zip_code = Column(String(20), nullable=False)
    instructions = Column(String(500))
    address_type = Column(String(20), default="Home")  # Home, Work, Other

    # Coordinates
    latitude = Column(Float, default=0.0)
    longitude = Column(Float, default=0.0)

    # Contact
    phone_number = Column(String(20))

    # Flags
    is_default = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ==================== PYDANTIC SCHEMAS ====================

class AddressCreate(BaseModel):
    location_name: Optional[str] = ""
    street: str
    unit: Optional[str] = ""
    city: str
    state: str
    zip_code: str
    instructions: Optional[str] = ""
    address_type: Optional[str] = "Home"
    latitude: Optional[float] = 0.0
    longitude: Optional[float] = 0.0
    phone_number: Optional[str] = ""
    is_default: Optional[bool] = False


class AddressUpdate(BaseModel):
    location_name: Optional[str] = None
    street: Optional[str] = None
    unit: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    instructions: Optional[str] = None
    address_type: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone_number: Optional[str] = None
    is_default: Optional[bool] = None


class AddressResponse(BaseModel):
    id: int
    user_id: int
    location_name: str
    street: str
    unit: str
    city: str
    state: str
    zip_code: str
    instructions: str
    address_type: str
    latitude: float
    longitude: float
    phone_number: str
    is_default: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== ROUTER ====================

router = APIRouter(prefix="/api/addresses", tags=["Customer Addresses"])


@router.get("/{user_id}", response_model=List[AddressResponse])
def get_user_addresses(user_id: int, db: Session = Depends(get_db)):
    """Get all addresses for a user"""
    addresses = db.query(CustomerAddress).filter(
        CustomerAddress.user_id == user_id
    ).order_by(CustomerAddress.is_default.desc(), CustomerAddress.created_at.desc()).all()

    return addresses


@router.get("/{user_id}/default", response_model=Optional[AddressResponse])
def get_default_address(user_id: int, db: Session = Depends(get_db)):
    """Get user's default address"""
    address = db.query(CustomerAddress).filter(
        CustomerAddress.user_id == user_id,
        CustomerAddress.is_default == True
    ).first()

    if not address:
        # Return first address if no default set
        address = db.query(CustomerAddress).filter(
            CustomerAddress.user_id == user_id
        ).first()

    if not address:
        raise HTTPException(status_code=404, detail="No addresses found")

    return address


@router.post("/{user_id}", response_model=AddressResponse)
def create_address(user_id: int, address: AddressCreate, db: Session = Depends(get_db)):
    """Create a new address for a user"""

    # If this is marked as default, unmark all others
    if address.is_default:
        db.query(CustomerAddress).filter(
            CustomerAddress.user_id == user_id
        ).update({"is_default": False})

    # Check if this is first address - auto-set as default
    existing_count = db.query(CustomerAddress).filter(
        CustomerAddress.user_id == user_id
    ).count()

    new_address = CustomerAddress(
        user_id=user_id,
        location_name=address.location_name or "",
        street=address.street,
        unit=address.unit or "",
        city=address.city,
        state=address.state,
        zip_code=address.zip_code,
        instructions=address.instructions or "",
        address_type=address.address_type or "Home",
        latitude=address.latitude or 0.0,
        longitude=address.longitude or 0.0,
        phone_number=address.phone_number or "",
        is_default=address.is_default or (existing_count == 0)  # First address is default
    )

    db.add(new_address)
    db.commit()
    db.refresh(new_address)

    print(f"[ADDRESSES] Created address for user {user_id}: {new_address.street}, {new_address.city}")

    return new_address


@router.put("/{user_id}/{address_id}", response_model=AddressResponse)
def update_address(
    user_id: int,
    address_id: int,
    address_update: AddressUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing address"""

    address = db.query(CustomerAddress).filter(
        CustomerAddress.id == address_id,
        CustomerAddress.user_id == user_id
    ).first()

    if not address:
        raise HTTPException(status_code=404, detail="Address not found")

    # If marking as default, unmark others
    if address_update.is_default:
        db.query(CustomerAddress).filter(
            CustomerAddress.user_id == user_id,
            CustomerAddress.id != address_id
        ).update({"is_default": False})

    # Update fields
    update_data = address_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(address, field, value)

    address.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(address)

    print(f"[ADDRESSES] Updated address {address_id} for user {user_id}")

    return address


@router.delete("/{user_id}/{address_id}")
def delete_address(user_id: int, address_id: int, db: Session = Depends(get_db)):
    """Delete an address"""

    address = db.query(CustomerAddress).filter(
        CustomerAddress.id == address_id,
        CustomerAddress.user_id == user_id
    ).first()

    if not address:
        raise HTTPException(status_code=404, detail="Address not found")

    was_default = address.is_default

    db.delete(address)
    db.commit()

    # If deleted address was default, set another as default
    if was_default:
        next_address = db.query(CustomerAddress).filter(
            CustomerAddress.user_id == user_id
        ).first()
        if next_address:
            next_address.is_default = True
            db.commit()

    print(f"[ADDRESSES] Deleted address {address_id} for user {user_id}")

    return {"message": "Address deleted successfully", "id": address_id}


@router.post("/{user_id}/{address_id}/set-default", response_model=AddressResponse)
def set_default_address(user_id: int, address_id: int, db: Session = Depends(get_db)):
    """Set an address as default"""

    address = db.query(CustomerAddress).filter(
        CustomerAddress.id == address_id,
        CustomerAddress.user_id == user_id
    ).first()

    if not address:
        raise HTTPException(status_code=404, detail="Address not found")

    # Unmark all others
    db.query(CustomerAddress).filter(
        CustomerAddress.user_id == user_id
    ).update({"is_default": False})

    # Mark this as default
    address.is_default = True
    db.commit()
    db.refresh(address)

    print(f"[ADDRESSES] Set address {address_id} as default for user {user_id}")

    return address
