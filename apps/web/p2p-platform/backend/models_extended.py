"""
EatFair P2P - Extended Models for Full Automation
New tables for: Promotions, Auto-Onboarding, Real-time Events, Communications
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from models import Base


# ==================== PROMOTION ENUMS ====================

class PromotionType(enum.Enum):
    PERCENTAGE = "percentage"           # 20% off
    FLAT_AMOUNT = "flat_amount"         # $5 off
    BOGO = "bogo"                       # Buy one get one
    FREE_DELIVERY = "free_delivery"     # Free delivery
    FREE_ITEM = "free_item"             # Free item with order
    BUNDLE = "bundle"                   # Combo deal


class PromotionStatus(enum.Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    PAUSED = "paused"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class PromotionTargetAudience(enum.Enum):
    ALL = "all"
    NEW_CUSTOMERS = "new_customers"
    RETURNING = "returning"
    LOYALTY_MEMBERS = "loyalty_members"
    DORMANT = "dormant"  # Haven't ordered in 30+ days


# ==================== ONBOARDING ENUMS ====================

class InvitationStatus(enum.Enum):
    PENDING = "pending"
    CLICKED = "clicked"
    ACCEPTED = "accepted"
    COMPLETED = "completed"
    EXPIRED = "expired"
    DECLINED = "declined"


class OnboardingDataSource(enum.Enum):
    MANUAL = "manual"
    GOOGLE_BUSINESS = "google_business"
    YELP = "yelp"
    WEBSITE_SCRAPE = "website_scrape"
    PDF_OCR = "pdf_ocr"
    MENU_PHOTO = "menu_photo"
    API_IMPORT = "api_import"


# ==================== COMMUNICATION ENUMS ====================

class CommunicationChannel(enum.Enum):
    PUSH = "push"
    EMAIL = "email"
    SMS = "sms"
    IN_APP = "in_app"


class CommunicationStatus(enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"


class RecipientType(enum.Enum):
    CUSTOMER = "customer"
    VENDOR = "vendor"
    DRIVER = "driver"
    ADMIN = "admin"


# ==================== PROMOTION MODELS ====================

class Promotion(Base):
    """Partner promotions and marketing campaigns"""
    __tablename__ = "promotions"

    id = Column(Integer, primary_key=True, index=True)
    promotion_code = Column(String(50), unique=True, nullable=False, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)

    # Basic Info
    name = Column(String(255), nullable=False)
    description = Column(Text)
    type = Column(SQLEnum(PromotionType), nullable=False)

    # Discount Value
    value = Column(Float, nullable=False)  # Percentage or flat amount
    max_discount = Column(Float)  # Cap for percentage discounts
    min_order_amount = Column(Float, default=0)  # Minimum order to qualify

    # Targeting
    target_audience = Column(SQLEnum(PromotionTargetAudience), default=PromotionTargetAudience.ALL)
    applies_to = Column(JSON)  # {"type": "all"|"category"|"items", "ids": [...]}

    # Schedule
    schedule = Column(JSON)  # {"days": [1,2,3], "start_time": "11:00", "end_time": "14:00"}
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    is_recurring = Column(Boolean, default=False)

    # Limits
    usage_limit = Column(Integer)  # Total redemptions allowed
    per_customer_limit = Column(Integer, default=1)  # Per customer
    budget_limit = Column(Float)  # Max total discount amount

    # Tracking
    usage_count = Column(Integer, default=0)
    total_discount_given = Column(Float, default=0.0)

    # Status
    status = Column(SQLEnum(PromotionStatus), default=PromotionStatus.DRAFT)

    # AI Generated
    ai_suggested = Column(Boolean, default=False)
    ai_suggestion_reason = Column(Text)  # Why AI suggested this promotion
    created_by_ai = Column(String(50))
    created_by_ai_name = Column(String(100))

    # Push to App
    pushed_to_app = Column(Boolean, default=False)
    pushed_at = Column(DateTime)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    vendor = relationship("Vendor")
    redemptions = relationship("PromotionRedemption", back_populates="promotion")


class PromotionRedemption(Base):
    """Track every promotion usage"""
    __tablename__ = "promotion_redemptions"

    id = Column(Integer, primary_key=True, index=True)
    promotion_id = Column(Integer, ForeignKey("promotions.id"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    customer_id = Column(Integer)

    # Discount Applied
    discount_amount = Column(Float, nullable=False)
    original_total = Column(Float)
    final_total = Column(Float)

    # Timestamps
    redeemed_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    promotion = relationship("Promotion", back_populates="redemptions")


# ==================== AUTO-ONBOARDING MODELS ====================

class RestaurantInvitation(Base):
    """Invitations sent to restaurants to join the platform"""
    __tablename__ = "restaurant_invitations"

    id = Column(Integer, primary_key=True, index=True)
    invitation_code = Column(String(100), unique=True, nullable=False, index=True)

    # Restaurant Info (pre-filled from research)
    restaurant_name = Column(String(255), nullable=False)
    website_url = Column(String(500))
    google_place_id = Column(String(255))
    yelp_business_id = Column(String(255))

    # Contact
    contact_email = Column(String(255), nullable=False)
    contact_phone = Column(String(50))
    contact_name = Column(String(255))

    # Location
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    zip_code = Column(String(20))
    latitude = Column(Float)
    longitude = Column(Float)

    # Status
    status = Column(SQLEnum(InvitationStatus), default=InvitationStatus.PENDING)

    # Tracking
    sent_at = Column(DateTime)
    clicked_at = Column(DateTime)
    accepted_at = Column(DateTime)
    completed_at = Column(DateTime)

    # Result
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)  # Created vendor

    # AI Employee
    created_by_ai = Column(String(50))
    created_by_ai_name = Column(String(100))

    # Expiry
    expires_at = Column(DateTime)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class OnboardingLog(Base):
    """Detailed log of auto-onboarding process"""
    __tablename__ = "onboarding_logs"

    id = Column(Integer, primary_key=True, index=True)
    invitation_id = Column(Integer, ForeignKey("restaurant_invitations.id"), nullable=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)

    # Step Information
    step = Column(String(100), nullable=False)  # e.g., "menu_scrape", "google_verify"
    step_number = Column(Integer)

    # Status
    status = Column(String(50))  # success, failed, partial, skipped

    # Data Source
    data_source = Column(SQLEnum(OnboardingDataSource))
    source_url = Column(String(500))

    # Extracted Data
    extracted_data = Column(JSON)  # The actual data extracted
    items_extracted = Column(Integer, default=0)

    # AI Details
    ai_employee = Column(String(50))
    ai_employee_name = Column(String(100))
    ai_confidence_score = Column(Float)  # 0-1 confidence in extraction

    # Errors/Notes
    error_message = Column(Text)
    notes = Column(Text)

    # Processing Time
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    duration_ms = Column(Integer)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)


class ScrapedMenuItem(Base):
    """Temporary storage for scraped menu items before vendor confirmation"""
    __tablename__ = "scraped_menu_items"

    id = Column(Integer, primary_key=True, index=True)
    invitation_id = Column(Integer, ForeignKey("restaurant_invitations.id"), nullable=False)

    # Menu Item Data
    item_name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100))
    price = Column(Float)

    # Dietary Info (AI detected)
    is_vegetarian = Column(Boolean, default=False)
    is_vegan = Column(Boolean, default=False)
    is_gluten_free = Column(Boolean, default=False)
    is_spicy = Column(Boolean, default=False)

    # Image
    image_url = Column(String(500))

    # Source
    data_source = Column(SQLEnum(OnboardingDataSource))
    source_url = Column(String(500))

    # AI Confidence
    confidence_score = Column(Float)  # How confident AI is about this item
    needs_review = Column(Boolean, default=False)  # Flag for manual review

    # Vendor Confirmation
    confirmed = Column(Boolean, default=False)
    confirmed_at = Column(DateTime)
    rejected = Column(Boolean, default=False)
    rejection_reason = Column(String(255))

    # Mapped to actual menu item after confirmation
    vendor_menu_item_id = Column(Integer, ForeignKey("vendor_menu_items.id"), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)


# ==================== REAL-TIME EVENT MODELS ====================

class RealTimeEvent(Base):
    """Events for real-time sync to mobile apps"""
    __tablename__ = "realtime_events"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(100), unique=True, nullable=False, index=True)

    # Event Type
    event_type = Column(String(100), nullable=False)  # menu:updated, promo:created, etc.

    # Target
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    target_type = Column(String(50))  # all_customers, vendor_customers, specific_user
    target_ids = Column(JSON)  # List of specific user IDs if targeted

    # Payload
    payload = Column(JSON, nullable=False)

    # Processing
    processed = Column(Boolean, default=False)
    processed_at = Column(DateTime)

    # Push Notification
    send_push = Column(Boolean, default=False)
    push_title = Column(String(255))
    push_body = Column(Text)
    push_sent = Column(Boolean, default=False)
    push_sent_at = Column(DateTime)

    # FCM/APNS Results
    push_success_count = Column(Integer, default=0)
    push_failure_count = Column(Integer, default=0)

    # AI Employee
    created_by_ai = Column(String(50))
    created_by_ai_name = Column(String(100))

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)  # Events can expire


# ==================== COMMUNICATION MODELS ====================

class Communication(Base):
    """All communications sent to users (push, email, SMS)"""
    __tablename__ = "communications"

    id = Column(Integer, primary_key=True, index=True)
    communication_id = Column(String(100), unique=True, nullable=False, index=True)

    # Recipient
    recipient_type = Column(SQLEnum(RecipientType), nullable=False)
    recipient_id = Column(Integer, nullable=False)  # customer_id, vendor_id, or driver_id
    recipient_email = Column(String(255))
    recipient_phone = Column(String(50))
    recipient_push_token = Column(String(500))

    # Channel & Template
    channel = Column(SQLEnum(CommunicationChannel), nullable=False)
    template_name = Column(String(100))

    # Content
    subject = Column(String(255))  # For email
    title = Column(String(255))  # For push
    body = Column(Text, nullable=False)
    data = Column(JSON)  # Additional data payload

    # Related Entities
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    promotion_id = Column(Integer, ForeignKey("promotions.id"), nullable=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)

    # Status
    status = Column(SQLEnum(CommunicationStatus), default=CommunicationStatus.PENDING)

    # Delivery Tracking
    sent_at = Column(DateTime)
    delivered_at = Column(DateTime)
    read_at = Column(DateTime)
    failed_at = Column(DateTime)
    failure_reason = Column(Text)

    # Provider Response
    provider_message_id = Column(String(255))  # FCM message ID, Twilio SID, etc.
    provider_response = Column(JSON)

    # AI Employee
    created_by_ai = Column(String(50))
    created_by_ai_name = Column(String(100))

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    scheduled_for = Column(DateTime)  # For scheduled messages


# ==================== CUSTOMER MODELS ====================
# NOTE: Customer class is defined in models.py - import from there to avoid mapper conflicts
# from models import Customer


class CustomerFavorite(Base):
    """Customer favorite restaurants and items"""
    __tablename__ = "customer_favorites"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)

    # What is favorited
    favorite_type = Column(String(50))  # restaurant, menu_item
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    menu_item_id = Column(Integer, ForeignKey("vendor_menu_items.id"), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)


# ==================== ANALYTICS MODELS ====================

class VendorAnalytics(Base):
    """Daily analytics snapshot for vendors"""
    __tablename__ = "vendor_analytics"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    date = Column(DateTime, nullable=False)

    # Order Stats
    total_orders = Column(Integer, default=0)
    completed_orders = Column(Integer, default=0)
    cancelled_orders = Column(Integer, default=0)

    # Revenue
    gross_revenue = Column(Float, default=0.0)
    net_revenue = Column(Float, default=0.0)
    average_order_value = Column(Float, default=0.0)

    # Performance
    average_prep_time = Column(Integer)  # minutes
    on_time_rate = Column(Float)  # percentage
    customer_rating = Column(Float)

    # Popular Items
    top_items = Column(JSON)  # [{"item_id": 1, "name": "...", "quantity": 50}]

    # Peak Hours
    orders_by_hour = Column(JSON)  # {"10": 5, "11": 12, "12": 25, ...}

    # Promotions
    promo_redemptions = Column(Integer, default=0)
    promo_discount_total = Column(Float, default=0.0)

    # New vs Returning
    new_customers = Column(Integer, default=0)
    returning_customers = Column(Integer, default=0)

    # AI Generated Insights
    ai_insights = Column(JSON)  # {"recommendation": "...", "opportunity": "..."}

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)


# ==================== EMAIL TEMPLATE ENUMS ====================

class EmailTemplateType(enum.Enum):
    TRANSACTIONAL = "transactional"  # Order confirmations, password reset
    MARKETING = "marketing"          # Promotions, newsletters
    SYSTEM = "system"                # Account notifications
    ONBOARDING = "onboarding"        # Welcome, registration confirmation


class EmailTemplateStatus(enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class EmailScheduleStatus(enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SENT = "sent"
    FAILED = "failed"
    CANCELLED = "cancelled"


# ==================== EMAIL TEMPLATE MODELS ====================

class EmailTemplate(Base):
    """
    Email templates stored in database for easy updates without code deployment.
    Supports A/B testing with variant support.
    """
    __tablename__ = "email_templates"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(String(100), unique=True, nullable=False, index=True)  # e.g., "order_confirmation"

    # Template Info
    name = Column(String(255), nullable=False)
    description = Column(Text)
    type = Column(SQLEnum(EmailTemplateType), default=EmailTemplateType.TRANSACTIONAL)
    status = Column(SQLEnum(EmailTemplateStatus), default=EmailTemplateStatus.DRAFT)

    # Email Content
    subject = Column(String(500), nullable=False)
    html_body = Column(Text, nullable=False)
    text_body = Column(Text)  # Plain text fallback

    # Template Variables (for documentation)
    variables = Column(JSON)  # ["customer_name", "order_id", "restaurant_name"]

    # A/B Testing Support
    is_variant = Column(Boolean, default=False)
    parent_template_id = Column(Integer, ForeignKey("email_templates.id"), nullable=True)
    variant_name = Column(String(50))  # "A", "B", "C" or descriptive name
    variant_weight = Column(Integer, default=50)  # Percentage weight for A/B split (0-100)

    # A/B Testing Metrics
    times_sent = Column(Integer, default=0)
    times_opened = Column(Integer, default=0)
    times_clicked = Column(Integer, default=0)
    open_rate = Column(Float, default=0.0)
    click_rate = Column(Float, default=0.0)

    # Targeting
    recipient_types = Column(JSON)  # ["customer", "vendor", "driver"]

    # Metadata
    created_by = Column(String(100))
    updated_by = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship for variants
    variants = relationship("EmailTemplate", backref="parent_template", remote_side=[id])


class EmailSchedule(Base):
    """
    Scheduled emails for delayed sending.
    Supports one-time and recurring schedules.
    """
    __tablename__ = "email_schedules"

    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(String(100), unique=True, nullable=False, index=True)

    # Template Reference
    template_id = Column(Integer, ForeignKey("email_templates.id"), nullable=True)
    template_name = Column(String(100))  # Fallback if not using DB template

    # Recipient
    recipient_type = Column(SQLEnum(RecipientType), nullable=False)
    recipient_id = Column(Integer, nullable=False)
    recipient_email = Column(String(255), nullable=False)

    # Email Content (can override template)
    subject = Column(String(500))
    html_body = Column(Text)
    text_body = Column(Text)

    # Template Variables
    template_variables = Column(JSON)  # {"customer_name": "John", "order_id": "123"}

    # Scheduling
    scheduled_for = Column(DateTime, nullable=False, index=True)
    timezone = Column(String(50), default="UTC")

    # Recurring Schedule (optional)
    is_recurring = Column(Boolean, default=False)
    recurrence_rule = Column(String(255))  # iCal RRULE format: "FREQ=WEEKLY;BYDAY=MO"
    recurrence_end = Column(DateTime)
    last_sent_at = Column(DateTime)
    next_run_at = Column(DateTime)

    # Status
    status = Column(SQLEnum(EmailScheduleStatus), default=EmailScheduleStatus.PENDING)
    attempts = Column(Integer, default=0)
    max_attempts = Column(Integer, default=3)

    # Result
    sent_at = Column(DateTime)
    failed_at = Column(DateTime)
    failure_reason = Column(Text)
    communication_id = Column(String(100))  # Links to Communication record

    # Related Entities
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    promotion_id = Column(Integer, ForeignKey("promotions.id"), nullable=True)

    # Metadata
    created_by = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EmailABTest(Base):
    """
    A/B test campaigns for email optimization.
    Tracks performance across template variants.
    """
    __tablename__ = "email_ab_tests"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(String(100), unique=True, nullable=False, index=True)

    # Test Configuration
    name = Column(String(255), nullable=False)
    description = Column(Text)
    base_template_id = Column(Integer, ForeignKey("email_templates.id"), nullable=False)

    # Variants (references to EmailTemplate with is_variant=True)
    variant_ids = Column(JSON)  # [template_id_1, template_id_2]

    # Test Parameters
    sample_size = Column(Integer)  # Number of recipients per variant
    confidence_level = Column(Float, default=0.95)  # 95% confidence
    minimum_sample = Column(Integer, default=100)  # Min sends before declaring winner

    # Status
    status = Column(String(50), default="draft")  # draft, running, completed, cancelled
    started_at = Column(DateTime)
    ended_at = Column(DateTime)
    auto_select_winner = Column(Boolean, default=True)

    # Results
    winning_variant_id = Column(Integer, ForeignKey("email_templates.id"), nullable=True)
    winning_metric = Column(String(50))  # "open_rate", "click_rate", "conversion"
    statistical_significance = Column(Float)  # p-value

    # Metadata
    created_by = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
