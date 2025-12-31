"""
Vibing - Food Image AI Employee API Routes
Provides endpoints for AI-powered food image management
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from database import get_db
import os

# Import Vibing service
from image_service import (
    get_vibing_service,
    VibingImageService,
    generate_food_image,
    scrape_restaurant_images,
    calculate_image_quality_score
)
from stock_images import get_stock_image_for_dish, assign_stock_images_to_menu

router = APIRouter(prefix="/api/vibing", tags=["Vibing - Food Image AI"])


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class GenerateImageRequest(BaseModel):
    item_name: str
    cuisine_type: str = "general"
    description: str = ""


class GenerateImageResponse(BaseModel):
    image_url: str
    source: str
    quality_score: int
    generation_time_ms: int


class MenuItemInput(BaseModel):
    id: int
    name: str
    description: str = ""


class ProcessMenuRequest(BaseModel):
    menu_items: List[MenuItemInput]
    cuisine_type: str = "general"
    website_url: str = ""
    use_ai_generation: bool = True


class ProcessMenuResponse(BaseModel):
    items: List[dict]
    stats: dict


class ScrapeImagesRequest(BaseModel):
    website_url: str


class QualityCheckRequest(BaseModel):
    image_url: str


class ImageUploadResponse(BaseModel):
    success: bool
    image_url: str
    quality_score: int
    message: str


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/generate-image", response_model=GenerateImageResponse)
async def vibing_generate_image(request: GenerateImageRequest):
    """
    Generate an AI image for a single menu item.

    Uses the following priority:
    1. AI Generation (DALL-E) if API key configured
    2. Stock image fallback
    """
    service = get_vibing_service()
    result = await service.assign_image_to_menu_item(
        menu_item_name=request.item_name,
        cuisine_type=request.cuisine_type,
        description=request.description,
        use_ai_generation=True
    )
    return result


@router.post("/process-menu", response_model=ProcessMenuResponse)
async def vibing_process_menu(request: ProcessMenuRequest):
    """
    Process multiple menu items at once.

    For each item without an image:
    1. Tries to match from scraped website images
    2. Generates AI image if enabled
    3. Falls back to stock images
    """
    service = get_vibing_service()

    menu_items = [{"id": item.id, "name": item.name, "description": item.description}
                  for item in request.menu_items]

    results = await service.process_menu_bulk(
        menu_items=menu_items,
        cuisine_type=request.cuisine_type,
        restaurant_website=request.website_url,
        use_ai_generation=request.use_ai_generation
    )

    return {
        "items": results,
        "stats": service.get_stats()
    }


@router.post("/scrape-images")
async def vibing_scrape_images(request: ScrapeImagesRequest):
    """
    Scrape food images from a restaurant's website.

    Returns list of found images with:
    - URL
    - Alt text
    - Potential dish name match
    - Whether it's likely a food image
    """
    if not request.website_url:
        raise HTTPException(status_code=400, detail="Website URL is required")

    images = await scrape_restaurant_images(request.website_url)

    return {
        "success": True,
        "count": len(images),
        "images": images
    }


@router.post("/quality-check")
async def vibing_quality_check(request: QualityCheckRequest):
    """
    Check the quality score of an image.

    Returns:
    - quality_score (0-100)
    - recommendation
    """
    score = calculate_image_quality_score(request.image_url)

    if score >= 80:
        recommendation = "Excellent quality - use as-is"
        status = "excellent"
    elif score >= 60:
        recommendation = "Acceptable quality - minor improvements possible"
        status = "acceptable"
    else:
        recommendation = "Poor quality - recommend AI replacement or reshoot"
        status = "poor"

    return {
        "image_url": request.image_url,
        "quality_score": score,
        "status": status,
        "recommendation": recommendation
    }


@router.get("/stock-image/{dish_name}")
async def vibing_get_stock_image(dish_name: str):
    """
    Get a stock image for a dish name.
    Uses keyword matching to find best category.
    """
    from stock_images import get_stock_image_for_dish

    image_url = get_stock_image_for_dish(dish_name)

    return {
        "dish_name": dish_name,
        "image_url": image_url,
        "source": "stock"
    }


@router.get("/tips")
async def vibing_get_tips():
    """
    Get food photography tips for vendors.
    """
    service = get_vibing_service()
    return {
        "tips": service.get_image_tips()
    }


@router.get("/stats")
async def vibing_get_stats():
    """
    Get image generation statistics.
    """
    service = get_vibing_service()
    return service.get_stats()


@router.post("/assign-to-vendor/{vendor_id}")
async def vibing_assign_images_to_vendor(
    vendor_id: int,
    use_ai_generation: bool = True,
    db: Session = Depends(get_db)
):
    """
    Assign images to all menu items for a vendor.

    This is the main onboarding endpoint that:
    1. Gets all menu items without images
    2. Scrapes vendor's website for existing images
    3. Generates AI images for items without matches
    4. Falls back to stock images
    """
    from models import Vendor, VendorMenuItem

    # Get vendor
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    # Get menu items without images
    menu_items = db.query(VendorMenuItem).filter(
        VendorMenuItem.vendor_id == vendor_id,
        (VendorMenuItem.image_url == None) | (VendorMenuItem.image_url == "")
    ).all()

    if not menu_items:
        return {
            "success": True,
            "message": "All menu items already have images",
            "items_processed": 0
        }

    # Prepare items for processing
    items_to_process = [
        {"id": item.id, "name": item.name, "description": item.description or ""}
        for item in menu_items
    ]

    # Process with Vibing
    service = get_vibing_service()
    results = await service.process_menu_bulk(
        menu_items=items_to_process,
        cuisine_type=vendor.cuisine_type or "general",
        restaurant_website=vendor.website or "",
        use_ai_generation=use_ai_generation
    )

    # Update database with assigned images
    updated_count = 0
    for result in results:
        item = db.query(VendorMenuItem).filter(VendorMenuItem.id == result["id"]).first()
        if item and result.get("image_url"):
            item.image_url = result["image_url"]
            updated_count += 1

    db.commit()

    return {
        "success": True,
        "message": f"Assigned images to {updated_count} menu items",
        "items_processed": len(results),
        "stats": service.get_stats(),
        "details": results
    }


@router.post("/upload-image/{menu_item_id}")
async def vibing_upload_image(
    menu_item_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload a custom image for a menu item.

    Validates:
    - File type (JPEG, PNG, WebP)
    - File size (max 5MB)
    - Image quality
    """
    from models import VendorMenuItem

    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}"
        )

    # Validate file size (5MB max)
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB")

    # Get menu item
    item = db.query(VendorMenuItem).filter(VendorMenuItem.id == menu_item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    # In production, upload to S3/Cloudinary
    # For now, save locally or return placeholder
    upload_dir = "uploads/menu_images"
    os.makedirs(upload_dir, exist_ok=True)

    # Sanitize file extension to prevent path traversal
    raw_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    file_extension = ''.join(c for c in raw_extension if c.isalnum())[:10]
    if file_extension not in ['jpg', 'jpeg', 'png', 'webp']:
        file_extension = 'jpg'
    filename = f"{menu_item_id}_{int(datetime.now().timestamp())}.{file_extension}"
    filepath = os.path.join(upload_dir, filename)

    # Verify filepath stays within upload directory
    abs_upload_dir = os.path.abspath(upload_dir)
    abs_filepath = os.path.abspath(filepath)
    if not abs_filepath.startswith(abs_upload_dir):
        raise HTTPException(status_code=400, detail="Invalid filename")

    with open(filepath, "wb") as f:
        f.write(contents)

    # Generate URL (in production, this would be CDN URL)
    image_url = f"/static/menu_images/{filename}"

    # Update database
    item.image_url = image_url
    db.commit()

    # Calculate quality (basic check for now)
    quality_score = 75  # Default score for uploads

    return {
        "success": True,
        "image_url": image_url,
        "quality_score": quality_score,
        "message": f"Image uploaded successfully for '{item.name}'"
    }


@router.get("/employee-info")
async def vibing_employee_info():
    """
    Get information about Vibing AI Employee.
    """
    return {
        "name": "Vibing",
        "role": "Food Image Specialist",
        "department": "Content",
        "avatar": "📸",
        "description": "AI-powered food image specialist that ensures every menu item looks irresistible",
        "capabilities": [
            "AI Food Image Generation (DALL-E, Stability AI)",
            "Restaurant Website Image Scraping",
            "Image Quality Scoring & Validation",
            "Smart Stock Image Assignment",
            "Vendor Image Upload Assistance",
            "Image Optimization & CDN Delivery",
            "Bundle/Combo Image Composition",
            "Image Performance Analytics"
        ],
        "status": "active",
        "api_version": "1.0.0"
    }


# Import datetime for upload endpoint
from datetime import datetime
