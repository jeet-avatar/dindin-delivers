"""
Dollor.ai - Centralized Error Codes
===================================

ERROR CODE FORMAT: {SERVICE_PREFIX}-{CATEGORY}{NUMBER}

SERVICE_PREFIX:
    AUTH = Authentication Service
    USR  = User Service
    DRV  = Driver Service
    RST  = Restaurant Service
    ORD  = Order Service
    PAY  = Payment Service
    LOC  = Location Service
    MNU  = Menu Service
    NTF  = Notification Service
    EML  = Email Service
    DOC  = Document Service
    ANL  = Analytics Service
    RTG  = Rating Service
    GW   = API Gateway
    SYS  = System/Infrastructure

CATEGORY (first digit):
    0xx = Success/Info
    1xx = Validation errors
    2xx = Authentication/Authorization errors
    3xx = Resource not found
    4xx = Business logic errors
    5xx = External service errors
    6xx = Database errors
    7xx = Cache errors
    8xx = Queue errors
    9xx = System errors
"""

from enum import Enum
from dataclasses import dataclass
from typing import Optional, Dict, Any


@dataclass
class ErrorDetail:
    """Error detail with code, message, and HTTP status."""
    code: str
    message: str
    http_status: int
    category: str


class ServicePrefix(str, Enum):
    """Service prefixes for error codes."""
    AUTH = "AUTH"
    USR = "USR"
    DRV = "DRV"
    RST = "RST"
    ORD = "ORD"
    PAY = "PAY"
    LOC = "LOC"
    MNU = "MNU"
    NTF = "NTF"
    EML = "EML"
    DOC = "DOC"
    ANL = "ANL"
    RTG = "RTG"
    GW = "GW"
    SYS = "SYS"


# =============================================================================
# AUTH SERVICE ERRORS (AUTH-xxx)
# =============================================================================
class AuthErrors:
    """Authentication service error codes."""

    # Validation errors (1xx)
    INVALID_EMAIL = ErrorDetail("AUTH-101", "Invalid email format", 400, "validation")
    WEAK_PASSWORD = ErrorDetail("AUTH-102", "Password too weak - minimum 8 characters, 1 uppercase, 1 number", 400, "validation")
    EMAIL_EXISTS = ErrorDetail("AUTH-103", "Email already registered", 409, "validation")
    INVALID_PHONE = ErrorDetail("AUTH-104", "Invalid phone number format", 400, "validation")

    # Authentication errors (2xx)
    INVALID_CREDENTIALS = ErrorDetail("AUTH-201", "Invalid credentials", 401, "authentication")
    ACCOUNT_NOT_VERIFIED = ErrorDetail("AUTH-202", "Account not verified", 403, "authentication")
    ACCOUNT_SUSPENDED = ErrorDetail("AUTH-203", "Account suspended", 403, "authentication")
    TOKEN_EXPIRED = ErrorDetail("AUTH-204", "Token expired", 401, "authentication")
    INVALID_REFRESH_TOKEN = ErrorDetail("AUTH-205", "Invalid refresh token", 401, "authentication")
    INSUFFICIENT_PERMISSIONS = ErrorDetail("AUTH-206", "Insufficient permissions", 403, "authorization")
    SESSION_EXPIRED = ErrorDetail("AUTH-207", "Session expired", 401, "authentication")
    MFA_REQUIRED = ErrorDetail("AUTH-208", "Multi-factor authentication required", 403, "authentication")

    # Not found errors (3xx)
    USER_NOT_FOUND = ErrorDetail("AUTH-301", "User not found", 404, "not_found")

    # External service errors (5xx)
    OAUTH_PROVIDER_ERROR = ErrorDetail("AUTH-501", "OAuth provider unavailable", 502, "external")
    OAUTH_INVALID_TOKEN = ErrorDetail("AUTH-502", "Invalid OAuth token", 401, "external")

    # Database errors (6xx)
    DB_CONNECTION_FAILED = ErrorDetail("AUTH-601", "Database connection failed", 503, "database")


# =============================================================================
# USER SERVICE ERRORS (USR-xxx)
# =============================================================================
class UserErrors:
    """User service error codes."""

    # Validation errors (1xx)
    INVALID_ADDRESS = ErrorDetail("USR-101", "Invalid address format", 400, "validation")
    INVALID_NAME = ErrorDetail("USR-102", "Invalid name - must be 2-100 characters", 400, "validation")

    # Not found errors (3xx)
    USER_NOT_FOUND = ErrorDetail("USR-301", "User not found", 404, "not_found")
    ADDRESS_NOT_FOUND = ErrorDetail("USR-302", "Address not found", 404, "not_found")

    # Business logic errors (4xx)
    MAX_ADDRESSES_REACHED = ErrorDetail("USR-401", "Maximum addresses limit reached", 400, "business")


# =============================================================================
# DRIVER SERVICE ERRORS (DRV-xxx)
# =============================================================================
class DriverErrors:
    """Driver service error codes."""

    # Validation errors (1xx)
    INVALID_LICENSE = ErrorDetail("DRV-101", "Invalid license number", 400, "validation")
    INVALID_VEHICLE_REG = ErrorDetail("DRV-102", "Invalid vehicle registration", 400, "validation")
    INVALID_INSURANCE = ErrorDetail("DRV-103", "Invalid insurance document", 400, "validation")
    LICENSE_EXPIRED = ErrorDetail("DRV-104", "Driver license expired", 400, "validation")
    INSURANCE_EXPIRED = ErrorDetail("DRV-105", "Insurance expired", 400, "validation")

    # Authentication errors (2xx)
    DRIVER_NOT_VERIFIED = ErrorDetail("DRV-201", "Driver not verified", 403, "authentication")
    DRIVER_SUSPENDED = ErrorDetail("DRV-202", "Driver suspended", 403, "authentication")
    DRIVER_PENDING_REVIEW = ErrorDetail("DRV-203", "Driver pending review", 403, "authentication")

    # Not found errors (3xx)
    DRIVER_NOT_FOUND = ErrorDetail("DRV-301", "Driver not found", 404, "not_found")
    VEHICLE_NOT_FOUND = ErrorDetail("DRV-302", "Vehicle not found", 404, "not_found")
    DOCUMENT_NOT_FOUND = ErrorDetail("DRV-303", "Document not found", 404, "not_found")

    # Business logic errors (4xx)
    ALREADY_ON_DELIVERY = ErrorDetail("DRV-401", "Already on active delivery", 400, "business")
    CANNOT_GO_OFFLINE = ErrorDetail("DRV-402", "Cannot go offline with active orders", 400, "business")
    DUPLICATE_DOCUMENT = ErrorDetail("DRV-403", "Document type already uploaded", 409, "business")

    # External service errors (5xx)
    DOC_VERIFICATION_ERROR = ErrorDetail("DRV-501", "Document verification service unavailable", 502, "external")
    BACKGROUND_CHECK_ERROR = ErrorDetail("DRV-502", "Background check service unavailable", 502, "external")


# =============================================================================
# RESTAURANT SERVICE ERRORS (RST-xxx)
# =============================================================================
class RestaurantErrors:
    """Restaurant service error codes."""

    # Validation errors (1xx)
    INVALID_HOURS = ErrorDetail("RST-101", "Invalid business hours format", 400, "validation")
    INVALID_ADDRESS = ErrorDetail("RST-102", "Invalid restaurant address", 400, "validation")

    # Not found errors (3xx)
    RESTAURANT_NOT_FOUND = ErrorDetail("RST-301", "Restaurant not found", 404, "not_found")

    # Business logic errors (4xx)
    RESTAURANT_CLOSED = ErrorDetail("RST-401", "Restaurant is currently closed", 400, "business")
    RESTAURANT_SUSPENDED = ErrorDetail("RST-402", "Restaurant is suspended", 403, "business")
    OUT_OF_DELIVERY_RANGE = ErrorDetail("RST-403", "Location out of delivery range", 400, "business")


# =============================================================================
# ORDER SERVICE ERRORS (ORD-xxx)
# =============================================================================
class OrderErrors:
    """Order service error codes."""

    # Validation errors (1xx)
    INVALID_ITEMS = ErrorDetail("ORD-101", "Invalid order items", 400, "validation")
    RESTAURANT_CLOSED = ErrorDetail("ORD-102", "Restaurant closed", 400, "validation")
    ITEM_UNAVAILABLE = ErrorDetail("ORD-103", "Item unavailable", 400, "validation")
    ADDRESS_OUT_OF_RANGE = ErrorDetail("ORD-104", "Delivery address out of range", 400, "validation")
    MIN_ORDER_NOT_MET = ErrorDetail("ORD-105", "Minimum order amount not met", 400, "validation")
    INVALID_TIP = ErrorDetail("ORD-106", "Invalid tip amount", 400, "validation")

    # Authorization errors (2xx)
    NOT_AUTHORIZED = ErrorDetail("ORD-201", "User not authorized to view this order", 403, "authorization")

    # Not found errors (3xx)
    ORDER_NOT_FOUND = ErrorDetail("ORD-301", "Order not found", 404, "not_found")

    # Business logic errors (4xx)
    CANNOT_CANCEL_PICKED_UP = ErrorDetail("ORD-401", "Cannot cancel - order already picked up", 400, "business")
    CANNOT_MODIFY_CONFIRMED = ErrorDetail("ORD-402", "Cannot modify - order already confirmed", 400, "business")
    NO_DRIVERS_AVAILABLE = ErrorDetail("ORD-403", "No drivers available", 400, "business")
    ORDER_ALREADY_ASSIGNED = ErrorDetail("ORD-404", "Order already assigned to a driver", 400, "business")
    INVALID_STATUS_TRANSITION = ErrorDetail("ORD-405", "Invalid order status transition", 400, "business")

    # External service errors (5xx)
    PAYMENT_FAILED = ErrorDetail("ORD-501", "Payment processing failed", 502, "external")
    RESTAURANT_SERVICE_ERROR = ErrorDetail("ORD-502", "Restaurant service unavailable", 502, "external")
    DRIVER_SERVICE_ERROR = ErrorDetail("ORD-503", "Driver service unavailable", 502, "external")

    # Database errors (6xx)
    ORDER_SAVE_FAILED = ErrorDetail("ORD-601", "Failed to save order", 503, "database")


# =============================================================================
# PAYMENT SERVICE ERRORS (PAY-xxx)
# =============================================================================
class PaymentErrors:
    """Payment service error codes."""

    # Validation errors (1xx)
    INVALID_CARD = ErrorDetail("PAY-101", "Invalid card number", 400, "validation")
    CARD_EXPIRED = ErrorDetail("PAY-102", "Card expired", 400, "validation")
    INVALID_CVV = ErrorDetail("PAY-103", "Invalid CVV", 400, "validation")
    INVALID_BILLING = ErrorDetail("PAY-104", "Invalid billing address", 400, "validation")
    INVALID_AMOUNT = ErrorDetail("PAY-105", "Invalid payment amount", 400, "validation")

    # Authentication errors (2xx)
    CARD_DECLINED = ErrorDetail("PAY-201", "Card declined", 402, "authentication")
    INSUFFICIENT_FUNDS = ErrorDetail("PAY-202", "Insufficient funds", 402, "authentication")
    CARD_BLOCKED = ErrorDetail("PAY-203", "Card blocked", 402, "authentication")

    # Not found errors (3xx)
    PAYMENT_NOT_FOUND = ErrorDetail("PAY-301", "Payment not found", 404, "not_found")
    PAYMENT_METHOD_NOT_FOUND = ErrorDetail("PAY-302", "Payment method not found", 404, "not_found")

    # Business logic errors (4xx)
    REFUND_EXCEEDS_ORIGINAL = ErrorDetail("PAY-401", "Refund amount exceeds original payment", 400, "business")
    REFUND_WINDOW_EXPIRED = ErrorDetail("PAY-402", "Refund window expired", 400, "business")
    ALREADY_REFUNDED = ErrorDetail("PAY-403", "Payment already refunded", 400, "business")

    # External service errors (5xx)
    STRIPE_ERROR = ErrorDetail("PAY-501", "Stripe API error", 502, "external")
    GATEWAY_TIMEOUT = ErrorDetail("PAY-502", "Payment gateway timeout", 504, "external")


# =============================================================================
# LOCATION SERVICE ERRORS (LOC-xxx)
# =============================================================================
class LocationErrors:
    """Location service error codes."""

    # Validation errors (1xx)
    INVALID_COORDINATES = ErrorDetail("LOC-101", "Invalid coordinates", 400, "validation")
    OUTSIDE_SERVICE_AREA = ErrorDetail("LOC-102", "Location outside service area", 400, "validation")

    # Not found errors (3xx)
    DRIVER_LOCATION_NOT_FOUND = ErrorDetail("LOC-301", "Driver location not found", 404, "not_found")

    # Business logic errors (4xx)
    CANNOT_CALCULATE_ROUTE = ErrorDetail("LOC-401", "Cannot calculate route", 400, "business")

    # External service errors (5xx)
    MAPS_API_ERROR = ErrorDetail("LOC-501", "Maps API unavailable", 502, "external")


# =============================================================================
# MENU SERVICE ERRORS (MNU-xxx)
# =============================================================================
class MenuErrors:
    """Menu service error codes."""

    # Validation errors (1xx)
    INVALID_PRICE = ErrorDetail("MNU-101", "Invalid price", 400, "validation")
    INVALID_CATEGORY = ErrorDetail("MNU-102", "Invalid category", 400, "validation")

    # Not found errors (3xx)
    MENU_NOT_FOUND = ErrorDetail("MNU-301", "Menu not found", 404, "not_found")
    ITEM_NOT_FOUND = ErrorDetail("MNU-302", "Menu item not found", 404, "not_found")
    CATEGORY_NOT_FOUND = ErrorDetail("MNU-303", "Category not found", 404, "not_found")

    # Business logic errors (4xx)
    ITEM_ALREADY_EXISTS = ErrorDetail("MNU-401", "Menu item already exists", 409, "business")


# =============================================================================
# NOTIFICATION SERVICE ERRORS (NTF-xxx)
# =============================================================================
class NotificationErrors:
    """Notification service error codes."""

    # Validation errors (1xx)
    INVALID_DEVICE_TOKEN = ErrorDetail("NTF-101", "Invalid device token", 400, "validation")
    INVALID_PHONE = ErrorDetail("NTF-102", "Invalid phone number for SMS", 400, "validation")

    # Not found errors (3xx)
    NOTIFICATION_NOT_FOUND = ErrorDetail("NTF-301", "Notification not found", 404, "not_found")

    # External service errors (5xx)
    APNS_ERROR = ErrorDetail("NTF-501", "Apple Push Notification service error", 502, "external")
    FCM_ERROR = ErrorDetail("NTF-502", "Firebase Cloud Messaging error", 502, "external")
    TWILIO_ERROR = ErrorDetail("NTF-503", "Twilio SMS service error", 502, "external")


# =============================================================================
# EMAIL SERVICE ERRORS (EML-xxx)
# =============================================================================
class EmailErrors:
    """Email service error codes."""

    # Validation errors (1xx)
    INVALID_EMAIL = ErrorDetail("EML-101", "Invalid email address", 400, "validation")
    INVALID_TEMPLATE = ErrorDetail("EML-102", "Invalid email template", 400, "validation")

    # Not found errors (3xx)
    TEMPLATE_NOT_FOUND = ErrorDetail("EML-301", "Email template not found", 404, "not_found")

    # External service errors (5xx)
    SES_ERROR = ErrorDetail("EML-501", "AWS SES error", 502, "external")
    SENDGRID_ERROR = ErrorDetail("EML-502", "SendGrid error", 502, "external")


# =============================================================================
# DOCUMENT SERVICE ERRORS (DOC-xxx)
# =============================================================================
class DocumentErrors:
    """Document service error codes."""

    # Validation errors (1xx)
    INVALID_FILE_TYPE = ErrorDetail("DOC-101", "Invalid file type", 400, "validation")
    FILE_TOO_LARGE = ErrorDetail("DOC-102", "File too large - max 10MB", 400, "validation")
    INVALID_DOCUMENT_TYPE = ErrorDetail("DOC-103", "Invalid document type", 400, "validation")

    # Not found errors (3xx)
    DOCUMENT_NOT_FOUND = ErrorDetail("DOC-301", "Document not found", 404, "not_found")

    # External service errors (5xx)
    S3_UPLOAD_ERROR = ErrorDetail("DOC-501", "S3 upload failed", 502, "external")
    OCR_ERROR = ErrorDetail("DOC-502", "OCR processing failed", 502, "external")
    VERIFICATION_ERROR = ErrorDetail("DOC-503", "Document verification failed", 502, "external")


# =============================================================================
# SYSTEM ERRORS (SYS-xxx)
# =============================================================================
class SystemErrors:
    """System and infrastructure error codes."""

    SERVICE_UNAVAILABLE = ErrorDetail("SYS-901", "Service temporarily unavailable", 503, "system")
    RATE_LIMIT_EXCEEDED = ErrorDetail("SYS-902", "Rate limit exceeded", 429, "system")
    REQUEST_TIMEOUT = ErrorDetail("SYS-903", "Request timeout", 504, "system")
    CIRCUIT_BREAKER_OPEN = ErrorDetail("SYS-904", "Circuit breaker open", 503, "system")
    DB_FAILOVER = ErrorDetail("SYS-905", "Database failover in progress", 503, "system")
    MAINTENANCE_MODE = ErrorDetail("SYS-906", "System under maintenance", 503, "system")
    UNKNOWN_ERROR = ErrorDetail("SYS-999", "An unexpected error occurred", 500, "system")


# =============================================================================
# ERROR RESPONSE BUILDER
# =============================================================================
class ErrorResponse:
    """Build standardized error responses."""

    @staticmethod
    def build(
        error: ErrorDetail,
        trace_id: str = None,
        correlation_id: str = None,
        details: Dict[str, Any] = None,
        environment: str = "production",
        service: str = "unknown"
    ) -> Dict[str, Any]:
        """
        Build a standardized error response.

        Args:
            error: ErrorDetail object with code, message, http_status
            trace_id: OpenTelemetry trace ID
            correlation_id: Request correlation ID
            details: Additional error details
            environment: Current environment (dev, staging, production)
            service: Service name

        Returns:
            Dict with standardized error response format
        """
        from datetime import datetime

        response = {
            "success": False,
            "error": {
                "code": error.code,
                "message": error.message,
                "category": error.category,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "environment": environment,
                "service": service
            }
        }

        if trace_id:
            response["error"]["trace_id"] = trace_id

        if correlation_id:
            response["error"]["correlation_id"] = correlation_id

        if details and environment != "production":
            # Only include details in non-production environments
            response["error"]["details"] = details

        return response

    @staticmethod
    def from_exception(
        exception: Exception,
        default_error: ErrorDetail = SystemErrors.UNKNOWN_ERROR,
        trace_id: str = None,
        correlation_id: str = None,
        environment: str = "production",
        service: str = "unknown"
    ) -> Dict[str, Any]:
        """
        Build error response from an exception.

        Args:
            exception: The caught exception
            default_error: Default error if exception type unknown
            trace_id: OpenTelemetry trace ID
            correlation_id: Request correlation ID
            environment: Current environment
            service: Service name

        Returns:
            Dict with standardized error response format
        """
        details = None
        if environment != "production":
            details = {
                "exception_type": type(exception).__name__,
                "exception_message": str(exception)
            }

        return ErrorResponse.build(
            error=default_error,
            trace_id=trace_id,
            correlation_id=correlation_id,
            details=details,
            environment=environment,
            service=service
        )
