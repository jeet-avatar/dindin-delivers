"""
Dollor.ai - Menu Service
========================

Microservice handling menu item management:
- Menu item CRUD operations
- Category management
- Item availability toggle
- Price updates
- Item customizations (size, toppings, etc.)
- Dietary filters (vegetarian, vegan, gluten-free)
- Menu search
- Daily limits and inventory
- Bulk menu import

Port: 8008
Error Prefix: MENU
"""

import os
import sys
from datetime import datetime
from typing import Optional, List, Dict, Any
import json

from fastapi import Depends, HTTPException, status, Query, UploadFile, File
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON, Text, ForeignKey, create_engine, and_, or_
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.ext.declarative import declarative_base
import enum

# Add shared library to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))

from common import (
    MicroserviceFactory,
    create_logger,
    MenuErrors,
    ErrorResponse,
)

# =============================================================================
# CONFIGURATION
# =============================================================================

SERVICE_NAME = "menu-service"
SERVICE_VERSION = "1.0.0"
SERVICE_PORT = 8008

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/dollor")

# =============================================================================
# DATABASE SETUP
# =============================================================================

Base = declarative_base()
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
# DATABASE MODELS
# =============================================================================

class VendorMenuItem(Base):
    """Menu items for vendors/restaurants"""
    __tablename__ = "vendor_menu_items"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, nullable=False, index=True)

    # Menu Item Details
    item_name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100), index=True)  # Appetizers, Main Course, Desserts, Beverages, etc.
    price = Column(Float, nullable=False)

    # Availability
    is_available = Column(Boolean, default=True, index=True)
    is_vegetarian = Column(Boolean, default=False, index=True)
    is_vegan = Column(Boolean, default=False, index=True)
    is_gluten_free = Column(Boolean, default=False, index=True)
    is_spicy = Column(Boolean, default=False)
    spice_level = Column(Integer, default=0)  # 0-5 scale

    # Additional Info
    prep_time = Column(Integer)  # in minutes
    calories = Column(Integer)
    image_url = Column(String(500))

    # Inventory
    in_stock = Column(Boolean, default=True)
    daily_limit = Column(Integer)
    items_sold_today = Column(Integer, default=0)

    # Customizations (stored as JSON for flexibility)
    # Format: [{"name": "Spice Level", "type": "single", "required": true, "options": [{"name": "Mild", "price": 0}, ...]}]
    customizations = Column(JSON, default=list)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# =============================================================================
# ENUMS
# =============================================================================

class MenuItemStatus(enum.Enum):
    """
    Menu item availability status
    Note: Restaurant partners are responsible for ensuring their menu items
    comply with local food safety regulations and accurate allergen labeling.
    """
    ACTIVE = "active"
    INACTIVE = "inactive"
    SOLD_OUT = "sold_out"
    SEASONAL = "seasonal"
    DISCONTINUED = "discontinued"


class CategoryType(enum.Enum):
    """
    Menu category types
    Partners are responsible for accurate categorization of their items,
    especially for dietary and allergen information.
    """
    APPETIZERS = "appetizers"
    MAIN_COURSE = "main_course"
    SIDES = "sides"
    DESSERTS = "desserts"
    BEVERAGES = "beverages"
    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"
    SPECIALS = "specials"
    KIDS_MENU = "kids_menu"


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class CustomizationOption(BaseModel):
    """Customization option (e.g., Mild, Medium, Hot)"""
    name: str
    price: float = 0.0


class Customization(BaseModel):
    """Menu item customization (e.g., Spice Level, Size, Toppings)"""
    name: str
    type: str = "single"  # single or multiple
    required: bool = False
    options: List[CustomizationOption]


class MenuItemCreate(BaseModel):
    """Create menu item request"""
    vendor_id: int
    item_name: str
    description: Optional[str] = None
    category: str
    price: float = Field(..., gt=0)
    is_available: bool = True
    is_vegetarian: bool = False
    is_vegan: bool = False
    is_gluten_free: bool = False
    is_spicy: bool = False
    spice_level: int = Field(default=0, ge=0, le=5)
    prep_time: Optional[int] = Field(default=None, ge=0)
    calories: Optional[int] = Field(default=None, ge=0)
    image_url: Optional[str] = None
    in_stock: bool = True
    daily_limit: Optional[int] = Field(default=None, ge=0)
    customizations: List[Customization] = []


class MenuItemUpdate(BaseModel):
    """Update menu item request"""
    item_name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = Field(default=None, gt=0)
    is_available: Optional[bool] = None
    is_vegetarian: Optional[bool] = None
    is_vegan: Optional[bool] = None
    is_gluten_free: Optional[bool] = None
    is_spicy: Optional[bool] = None
    spice_level: Optional[int] = Field(default=None, ge=0, le=5)
    prep_time: Optional[int] = Field(default=None, ge=0)
    calories: Optional[int] = Field(default=None, ge=0)
    image_url: Optional[str] = None
    in_stock: Optional[bool] = None
    daily_limit: Optional[int] = Field(default=None, ge=0)
    customizations: Optional[List[Customization]] = None


class MenuItemResponse(BaseModel):
    """Menu item response"""
    id: int
    vendor_id: int
    item_name: str
    description: Optional[str] = None
    category: str
    price: float
    is_available: bool
    is_vegetarian: bool
    is_vegan: bool
    is_gluten_free: bool
    is_spicy: bool
    spice_level: int
    prep_time: Optional[int] = None
    calories: Optional[int] = None
    image_url: Optional[str] = None
    in_stock: bool
    daily_limit: Optional[int] = None
    items_sold_today: int
    customizations: List[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BulkMenuImport(BaseModel):
    """Bulk import menu items"""
    vendor_id: int
    items: List[MenuItemCreate]


class CategorySummary(BaseModel):
    """Category summary with item count"""
    category: str
    item_count: int
    available_count: int


class MenuStats(BaseModel):
    """Menu statistics for a vendor"""
    total_items: int
    available_items: int
    out_of_stock_items: int
    categories: List[CategorySummary]


class CategoryCreate(BaseModel):
    """
    Create menu category request

    Note: Restaurant partners are responsible for ensuring menu categories
    and item classifications comply with local food labeling regulations.
    Allergen information must be accurately disclosed.
    """
    name: str
    description: Optional[str] = None
    category_type: str = "main_course"  # CategoryType value
    display_order: int = 0
    is_active: bool = True
    image_url: Optional[str] = None


class CategoryUpdate(BaseModel):
    """Update menu category request"""
    name: Optional[str] = None
    description: Optional[str] = None
    category_type: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None
    image_url: Optional[str] = None


class CategoryResponse(BaseModel):
    """Menu category response"""
    id: int
    vendor_id: int
    name: str
    description: Optional[str] = None
    category_type: str
    display_order: int
    is_active: bool
    image_url: Optional[str] = None
    item_count: int = 0


# =============================================================================
# CREATE MICROSERVICE
# =============================================================================

logger = create_logger(SERVICE_NAME)

app = MicroserviceFactory.create(
    name=SERVICE_NAME,
    version=SERVICE_VERSION,
    description="Menu item management service"
)


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def check_daily_limit(item: VendorMenuItem) -> bool:
    """Check if item has reached daily limit"""
    if item.daily_limit is None:
        return True  # No limit set
    return item.items_sold_today < item.daily_limit


def reset_daily_counts(db: Session):
    """Reset daily sold counts (should be called daily via cron)"""
    db.query(VendorMenuItem).update({"items_sold_today": 0})
    db.commit()
    logger.info("Reset daily item counts")


# =============================================================================
# MENU ITEM ENDPOINTS
# =============================================================================

@app.post("/api/menu-items", response_model=MenuItemResponse, status_code=status.HTTP_201_CREATED)
async def create_menu_item(item: MenuItemCreate, db: Session = Depends(get_db)):
    """Create a new menu item"""
    # Convert customizations to dict format
    customizations_dict = [c.model_dump() for c in item.customizations]

    db_item = VendorMenuItem(
        vendor_id=item.vendor_id,
        item_name=item.item_name,
        description=item.description,
        category=item.category,
        price=item.price,
        is_available=item.is_available,
        is_vegetarian=item.is_vegetarian,
        is_vegan=item.is_vegan,
        is_gluten_free=item.is_gluten_free,
        is_spicy=item.is_spicy,
        spice_level=item.spice_level,
        prep_time=item.prep_time,
        calories=item.calories,
        image_url=item.image_url,
        in_stock=item.in_stock,
        daily_limit=item.daily_limit,
        customizations=customizations_dict
    )

    db.add(db_item)
    db.commit()
    db.refresh(db_item)

    logger.info(f"Created menu item: {db_item.item_name} for vendor {db_item.vendor_id}")
    return db_item


@app.get("/api/menu-items/{item_id}", response_model=MenuItemResponse)
async def get_menu_item(item_id: int, db: Session = Depends(get_db)):
    """Get menu item by ID"""
    item = db.query(VendorMenuItem).filter(VendorMenuItem.id == item_id).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="MENU-301",
                message="Menu item not found",
                details={"item_id": item_id}
            ).model_dump()
        )

    return item


@app.put("/api/menu-items/{item_id}", response_model=MenuItemResponse)
async def update_menu_item(item_id: int, update: MenuItemUpdate, db: Session = Depends(get_db)):
    """Update menu item"""
    item = db.query(VendorMenuItem).filter(VendorMenuItem.id == item_id).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="MENU-301",
                message="Menu item not found",
                details={"item_id": item_id}
            ).model_dump()
        )

    update_data = update.model_dump(exclude_unset=True)

    # Convert customizations if provided
    if "customizations" in update_data and update_data["customizations"] is not None:
        update_data["customizations"] = [c if isinstance(c, dict) else c.model_dump() for c in update_data["customizations"]]

    for key, value in update_data.items():
        setattr(item, key, value)

    item.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(item)

    logger.info(f"Updated menu item: {item.item_name} (ID: {item_id})")
    return item


@app.delete("/api/menu-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_menu_item(item_id: int, db: Session = Depends(get_db)):
    """Delete menu item"""
    item = db.query(VendorMenuItem).filter(VendorMenuItem.id == item_id).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="MENU-301",
                message="Menu item not found",
                details={"item_id": item_id}
            ).model_dump()
        )

    db.delete(item)
    db.commit()

    logger.info(f"Deleted menu item: {item.item_name} (ID: {item_id})")


# =============================================================================
# VENDOR MENU ENDPOINTS
# =============================================================================

@app.get("/api/vendors/{vendor_id}/menu", response_model=List[MenuItemResponse])
async def get_vendor_menu(
    vendor_id: int,
    category: Optional[str] = None,
    available_only: bool = False,
    in_stock_only: bool = False,
    vegetarian: Optional[bool] = None,
    vegan: Optional[bool] = None,
    gluten_free: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all menu items for a vendor with optional filters"""
    query = db.query(VendorMenuItem).filter(VendorMenuItem.vendor_id == vendor_id)

    if category:
        query = query.filter(VendorMenuItem.category == category)

    if available_only:
        query = query.filter(VendorMenuItem.is_available == True)

    if in_stock_only:
        query = query.filter(VendorMenuItem.in_stock == True)

    if vegetarian is not None:
        query = query.filter(VendorMenuItem.is_vegetarian == vegetarian)

    if vegan is not None:
        query = query.filter(VendorMenuItem.is_vegan == vegan)

    if gluten_free is not None:
        query = query.filter(VendorMenuItem.is_gluten_free == gluten_free)

    items = query.order_by(VendorMenuItem.category, VendorMenuItem.item_name).all()
    return items


@app.get("/api/vendors/{vendor_id}/menu/stats", response_model=MenuStats)
async def get_vendor_menu_stats(vendor_id: int, db: Session = Depends(get_db)):
    """Get menu statistics for a vendor"""
    items = db.query(VendorMenuItem).filter(VendorMenuItem.vendor_id == vendor_id).all()

    if not items:
        return MenuStats(
            total_items=0,
            available_items=0,
            out_of_stock_items=0,
            categories=[]
        )

    total_items = len(items)
    available_items = sum(1 for item in items if item.is_available)
    out_of_stock_items = sum(1 for item in items if not item.in_stock)

    # Group by category
    categories_dict = {}
    for item in items:
        if item.category not in categories_dict:
            categories_dict[item.category] = {"total": 0, "available": 0}
        categories_dict[item.category]["total"] += 1
        if item.is_available:
            categories_dict[item.category]["available"] += 1

    categories = [
        CategorySummary(
            category=cat,
            item_count=stats["total"],
            available_count=stats["available"]
        )
        for cat, stats in categories_dict.items()
    ]

    return MenuStats(
        total_items=total_items,
        available_items=available_items,
        out_of_stock_items=out_of_stock_items,
        categories=categories
    )


# =============================================================================
# AVAILABILITY & INVENTORY ENDPOINTS
# =============================================================================

@app.patch("/api/menu-items/{item_id}/availability")
async def toggle_availability(item_id: int, is_available: bool, db: Session = Depends(get_db)):
    """Toggle menu item availability"""
    item = db.query(VendorMenuItem).filter(VendorMenuItem.id == item_id).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="MENU-301",
                message="Menu item not found",
                details={"item_id": item_id}
            ).model_dump()
        )

    item.is_available = is_available
    item.updated_at = datetime.utcnow()
    db.commit()

    logger.info(f"Set availability for {item.item_name} (ID: {item_id}) to {is_available}")

    return {
        "item_id": item_id,
        "item_name": item.item_name,
        "is_available": is_available
    }


@app.patch("/api/menu-items/{item_id}/stock")
async def toggle_stock(item_id: int, in_stock: bool, db: Session = Depends(get_db)):
    """Toggle menu item stock status"""
    item = db.query(VendorMenuItem).filter(VendorMenuItem.id == item_id).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="MENU-301",
                message="Menu item not found",
                details={"item_id": item_id}
            ).model_dump()
        )

    item.in_stock = in_stock
    item.updated_at = datetime.utcnow()
    db.commit()

    logger.info(f"Set stock for {item.item_name} (ID: {item_id}) to {in_stock}")

    return {
        "item_id": item_id,
        "item_name": item.item_name,
        "in_stock": in_stock
    }


@app.post("/api/menu-items/{item_id}/sold")
async def record_item_sold(item_id: int, quantity: int = 1, db: Session = Depends(get_db)):
    """Record item(s) sold and update daily count"""
    item = db.query(VendorMenuItem).filter(VendorMenuItem.id == item_id).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="MENU-301",
                message="Menu item not found",
                details={"item_id": item_id}
            ).model_dump()
        )

    # Check if within daily limit
    if item.daily_limit and (item.items_sold_today + quantity) > item.daily_limit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                code="MENU-401",
                message="Daily limit exceeded",
                details={
                    "item_id": item_id,
                    "daily_limit": item.daily_limit,
                    "sold_today": item.items_sold_today,
                    "requested": quantity
                }
            ).model_dump()
        )

    item.items_sold_today += quantity
    item.updated_at = datetime.utcnow()

    # Auto mark unavailable if limit reached
    if item.daily_limit and item.items_sold_today >= item.daily_limit:
        item.is_available = False
        logger.info(f"Item {item.item_name} (ID: {item_id}) reached daily limit, marked unavailable")

    db.commit()

    return {
        "item_id": item_id,
        "item_name": item.item_name,
        "items_sold_today": item.items_sold_today,
        "daily_limit": item.daily_limit,
        "is_available": item.is_available
    }


# =============================================================================
# PRICE UPDATE ENDPOINTS
# =============================================================================

@app.patch("/api/menu-items/{item_id}/price")
async def update_price(item_id: int, new_price: float = Query(..., gt=0), db: Session = Depends(get_db)):
    """Update menu item price"""
    item = db.query(VendorMenuItem).filter(VendorMenuItem.id == item_id).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="MENU-301",
                message="Menu item not found",
                details={"item_id": item_id}
            ).model_dump()
        )

    old_price = item.price
    item.price = new_price
    item.updated_at = datetime.utcnow()
    db.commit()

    logger.info(f"Updated price for {item.item_name} (ID: {item_id}) from ${old_price} to ${new_price}")

    return {
        "item_id": item_id,
        "item_name": item.item_name,
        "old_price": old_price,
        "new_price": new_price
    }


@app.post("/api/vendors/{vendor_id}/menu/bulk-price-update")
async def bulk_price_update(
    vendor_id: int,
    category: Optional[str] = None,
    percentage_change: float = Query(..., ge=-100, le=100),
    db: Session = Depends(get_db)
):
    """Bulk update prices for menu items (by percentage)"""
    query = db.query(VendorMenuItem).filter(VendorMenuItem.vendor_id == vendor_id)

    if category:
        query = query.filter(VendorMenuItem.category == category)

    items = query.all()

    if not items:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="MENU-302",
                message="No menu items found for update",
                details={"vendor_id": vendor_id, "category": category}
            ).model_dump()
        )

    updated_count = 0
    for item in items:
        old_price = item.price
        new_price = round(old_price * (1 + percentage_change / 100), 2)
        if new_price > 0:  # Ensure price stays positive
            item.price = new_price
            item.updated_at = datetime.utcnow()
            updated_count += 1

    db.commit()

    logger.info(f"Bulk updated prices for {updated_count} items (vendor: {vendor_id}, category: {category}, change: {percentage_change}%)")

    return {
        "vendor_id": vendor_id,
        "category": category,
        "percentage_change": percentage_change,
        "items_updated": updated_count
    }


# =============================================================================
# SEARCH ENDPOINTS
# =============================================================================

@app.get("/api/menu-items/search", response_model=List[MenuItemResponse])
async def search_menu_items(
    search: str,
    vendor_id: Optional[int] = None,
    category: Optional[str] = None,
    available_only: bool = False,
    vegetarian: Optional[bool] = None,
    vegan: Optional[bool] = None,
    gluten_free: Optional[bool] = None,
    max_price: Optional[float] = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db)
):
    """Search menu items by name or description"""
    query = db.query(VendorMenuItem)

    # Search in name and description
    search_term = f"%{search}%"
    query = query.filter(
        or_(
            VendorMenuItem.item_name.ilike(search_term),
            VendorMenuItem.description.ilike(search_term)
        )
    )

    if vendor_id:
        query = query.filter(VendorMenuItem.vendor_id == vendor_id)

    if category:
        query = query.filter(VendorMenuItem.category == category)

    if available_only:
        query = query.filter(VendorMenuItem.is_available == True)

    if vegetarian is not None:
        query = query.filter(VendorMenuItem.is_vegetarian == vegetarian)

    if vegan is not None:
        query = query.filter(VendorMenuItem.is_vegan == vegan)

    if gluten_free is not None:
        query = query.filter(VendorMenuItem.is_gluten_free == gluten_free)

    if max_price is not None:
        query = query.filter(VendorMenuItem.price <= max_price)

    items = query.offset(offset).limit(limit).all()
    return items


@app.get("/api/menu-items/categories", response_model=List[str])
async def get_all_categories(vendor_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Get all unique categories"""
    query = db.query(VendorMenuItem.category).distinct()

    if vendor_id:
        query = query.filter(VendorMenuItem.vendor_id == vendor_id)

    categories = [row[0] for row in query.all() if row[0]]
    return sorted(categories)


# =============================================================================
# BULK OPERATIONS
# =============================================================================

@app.post("/api/menu-items/bulk-import")
async def bulk_import_menu(import_data: BulkMenuImport, db: Session = Depends(get_db)):
    """Bulk import menu items for a vendor"""
    created_items = []
    errors = []

    for idx, item_data in enumerate(import_data.items):
        try:
            # Override vendor_id with the one from bulk import
            customizations_dict = [c.model_dump() for c in item_data.customizations]

            db_item = VendorMenuItem(
                vendor_id=import_data.vendor_id,
                item_name=item_data.item_name,
                description=item_data.description,
                category=item_data.category,
                price=item_data.price,
                is_available=item_data.is_available,
                is_vegetarian=item_data.is_vegetarian,
                is_vegan=item_data.is_vegan,
                is_gluten_free=item_data.is_gluten_free,
                is_spicy=item_data.is_spicy,
                spice_level=item_data.spice_level,
                prep_time=item_data.prep_time,
                calories=item_data.calories,
                image_url=item_data.image_url,
                in_stock=item_data.in_stock,
                daily_limit=item_data.daily_limit,
                customizations=customizations_dict
            )

            db.add(db_item)
            db.commit()
            db.refresh(db_item)
            created_items.append(db_item.id)

        except Exception as e:
            db.rollback()
            errors.append({
                "index": idx,
                "item_name": item_data.item_name,
                "error": str(e)
            })

    logger.info(f"Bulk imported {len(created_items)} items for vendor {import_data.vendor_id}, {len(errors)} errors")

    return {
        "vendor_id": import_data.vendor_id,
        "total_items": len(import_data.items),
        "created": len(created_items),
        "failed": len(errors),
        "created_item_ids": created_items,
        "errors": errors
    }


@app.delete("/api/vendors/{vendor_id}/menu")
async def delete_vendor_menu(vendor_id: int, category: Optional[str] = None, db: Session = Depends(get_db)):
    """Delete all menu items for a vendor (or specific category)"""
    query = db.query(VendorMenuItem).filter(VendorMenuItem.vendor_id == vendor_id)

    if category:
        query = query.filter(VendorMenuItem.category == category)

    deleted_count = query.delete(synchronize_session=False)
    db.commit()

    logger.info(f"Deleted {deleted_count} menu items for vendor {vendor_id}" + (f" in category {category}" if category else ""))

    return {
        "vendor_id": vendor_id,
        "category": category,
        "deleted_count": deleted_count
    }


# =============================================================================
# ADMIN ENDPOINTS
# =============================================================================

@app.post("/api/menu-items/reset-daily-counts")
async def reset_daily_counts_endpoint(db: Session = Depends(get_db)):
    """Reset all daily sold counts (admin endpoint, should be called via cron)"""
    reset_daily_counts(db)
    return {"status": "success", "message": "Daily counts reset"}


# =============================================================================
# STARTUP
# =============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize database tables on startup"""
    Base.metadata.create_all(bind=engine)
    logger.info(f"{SERVICE_NAME} v{SERVICE_VERSION} started on port {SERVICE_PORT}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=SERVICE_PORT)
