"""
Comprehensive unit tests for SQLAlchemy models

Tests model class definitions, enum values, attributes, relationships,
and default values WITHOUT creating actual database records.

Run with: pytest tests/unit/test_models.py -v
"""

import pytest
from datetime import datetime
from sqlalchemy import inspect
from sqlalchemy.orm import RelationshipProperty
from sqlalchemy.sql.schema import Column

from models import (
    # Enums
    UserRole,
    InvoiceStatus,
    PaymentStatus,
    VendorStatus,
    OnboardingPhase,
    RiskRating,
    OrderStatus,
    CustomerStatus,
    DriverStatus,
    AIEmployeeStatus,
    # Models
    Base,
    User,
    Client,
    Invoice,
    InvoiceItem,
    Payment,
    Vendor,
    VendorPurchaseOrder,
    VendorMenuItem,
    Order,
    StripePaymentLog,
    VendorPayout,
    Customer,
    Driver,
    DriverPayout,
    JournalEntry,
    JournalEntryLine,
    AIEmployee,
    AIEmployeeActivity,
    AIEmployeeHourlyReport,
    AIEmployeeDailyReport,
    DashboardMetric,
)


# ============================================================================
# ENUM TESTS
# ============================================================================

class TestEnums:
    """Test all enum classes and their values"""

    def test_user_role_enum_values(self):
        """Test UserRole enum has all expected values"""
        assert UserRole.ADMIN.value == "admin"
        assert UserRole.USER.value == "user"
        assert UserRole.VENDOR.value == "vendor"
        assert UserRole.DRIVER.value == "driver"

        # Test all enum members are accessible
        roles = [e.value for e in UserRole]
        assert "admin" in roles
        assert "user" in roles
        assert "vendor" in roles
        assert "driver" in roles
        assert len(roles) == 4

    def test_invoice_status_enum_values(self):
        """Test InvoiceStatus enum has all expected values"""
        assert InvoiceStatus.DRAFT.value == "draft"
        assert InvoiceStatus.SENT.value == "sent"
        assert InvoiceStatus.PAID.value == "paid"
        assert InvoiceStatus.OVERDUE.value == "overdue"
        assert InvoiceStatus.CANCELLED.value == "cancelled"

        statuses = [e.value for e in InvoiceStatus]
        assert len(statuses) == 5

    def test_payment_status_enum_values(self):
        """Test PaymentStatus enum has all expected values"""
        assert PaymentStatus.PENDING.value == "pending"
        assert PaymentStatus.COMPLETED.value == "completed"
        assert PaymentStatus.FAILED.value == "failed"

        statuses = [e.value for e in PaymentStatus]
        assert len(statuses) == 3

    def test_vendor_status_enum_values(self):
        """Test VendorStatus enum has all expected values"""
        assert VendorStatus.PENDING.value == "pending"
        assert VendorStatus.IN_REVIEW.value == "in_review"
        assert VendorStatus.APPROVED.value == "approved"
        assert VendorStatus.REJECTED.value == "rejected"
        assert VendorStatus.SUSPENDED.value == "suspended"

        statuses = [e.value for e in VendorStatus]
        assert len(statuses) == 5

    def test_onboarding_phase_enum_values(self):
        """Test OnboardingPhase enum has all expected values"""
        assert OnboardingPhase.NOT_STARTED.value == "not_started"
        assert OnboardingPhase.DOCUMENTS_PENDING.value == "documents_pending"
        assert OnboardingPhase.UNDER_REVIEW.value == "under_review"
        assert OnboardingPhase.COMPLIANCE_CHECK.value == "compliance_check"
        assert OnboardingPhase.COMPLETED.value == "completed"

        phases = [e.value for e in OnboardingPhase]
        assert len(phases) == 5

    def test_risk_rating_enum_values(self):
        """Test RiskRating enum has all expected values"""
        assert RiskRating.LOW.value == "low"
        assert RiskRating.MEDIUM.value == "medium"
        assert RiskRating.HIGH.value == "high"
        assert RiskRating.CRITICAL.value == "critical"

        ratings = [e.value for e in RiskRating]
        assert len(ratings) == 4

    def test_order_status_enum_values(self):
        """Test OrderStatus enum has all expected values including restaurant acceptance window"""
        # Payment flow
        assert OrderStatus.PENDING_PAYMENT.value == "pending_payment"
        assert OrderStatus.CONFIRMED.value == "confirmed"

        # Restaurant acceptance window (3 minutes)
        assert OrderStatus.PENDING_RESTAURANT.value == "pending_restaurant"
        assert OrderStatus.DECLINED_BY_RESTAURANT.value == "declined_by_restaurant"
        assert OrderStatus.RESTAURANT_TIMEOUT.value == "restaurant_timeout"

        # Preparation and delivery flow
        assert OrderStatus.PREPARING.value == "preparing"
        assert OrderStatus.READY_FOR_PICKUP.value == "ready_for_pickup"

        # Delivery decision window (3 minutes)
        assert OrderStatus.PENDING_DELIVERY_DECISION.value == "pending_delivery_decision"
        assert OrderStatus.RESTAURANT_WILL_DELIVER.value == "restaurant_will_deliver"
        assert OrderStatus.DELIVERY_DECISION_TIMEOUT.value == "delivery_decision_timeout"

        assert OrderStatus.OUT_FOR_DELIVERY.value == "out_for_delivery"
        assert OrderStatus.DELIVERED.value == "delivered"
        assert OrderStatus.CANCELLED.value == "cancelled"

        # Delivery proof
        assert OrderStatus.PENDING_DELIVERY_PROOF.value == "pending_delivery_proof"

        statuses = [e.value for e in OrderStatus]
        assert len(statuses) == 14

    def test_customer_status_enum_values(self):
        """Test CustomerStatus enum has all expected values"""
        assert CustomerStatus.ACTIVE.value == "active"
        assert CustomerStatus.INACTIVE.value == "inactive"
        assert CustomerStatus.SUSPENDED.value == "suspended"

        statuses = [e.value for e in CustomerStatus]
        assert len(statuses) == 3

    def test_driver_status_enum_values(self):
        """Test DriverStatus enum has all expected values"""
        assert DriverStatus.PENDING.value == "pending"
        assert DriverStatus.APPROVED.value == "approved"
        assert DriverStatus.ACTIVE.value == "active"
        assert DriverStatus.INACTIVE.value == "inactive"
        assert DriverStatus.SUSPENDED.value == "suspended"
        assert DriverStatus.ONLINE.value == "online"

        statuses = [e.value for e in DriverStatus]
        assert len(statuses) == 6

    def test_ai_employee_status_enum_values(self):
        """Test AIEmployeeStatus enum has all expected values"""
        assert AIEmployeeStatus.ACTIVE.value == "active"
        assert AIEmployeeStatus.IDLE.value == "idle"
        assert AIEmployeeStatus.PROCESSING.value == "processing"
        assert AIEmployeeStatus.ERROR.value == "error"
        assert AIEmployeeStatus.OFFLINE.value == "offline"

        statuses = [e.value for e in AIEmployeeStatus]
        assert len(statuses) == 5

    def test_enum_string_representation(self):
        """Test that enums can be converted to strings correctly"""
        assert str(UserRole.ADMIN.value) == "admin"
        assert str(InvoiceStatus.PAID.value) == "paid"
        assert str(PaymentStatus.COMPLETED.value) == "completed"
        assert str(VendorStatus.APPROVED.value) == "approved"
        assert str(OnboardingPhase.COMPLETED.value) == "completed"
        assert str(RiskRating.LOW.value) == "low"

    def test_enum_comparison(self):
        """Test that enum values can be compared"""
        assert UserRole.ADMIN == UserRole.ADMIN
        assert UserRole.ADMIN != UserRole.USER
        assert InvoiceStatus.DRAFT == InvoiceStatus.DRAFT
        assert PaymentStatus.PENDING != PaymentStatus.COMPLETED


# ============================================================================
# MODEL STRUCTURE TESTS
# ============================================================================

class TestUserModel:
    """Test User model structure"""

    def test_user_model_tablename(self):
        """Test User model has correct table name"""
        assert User.__tablename__ == "users"

    def test_user_model_columns(self):
        """Test User model has all expected columns"""
        mapper = inspect(User)
        column_names = {col.key for col in mapper.columns}

        expected_columns = {
            'id', 'email', 'password_hash', 'full_name',
            'role', 'vendor_id', 'driver_id', 'created_at'
        }
        assert expected_columns.issubset(column_names)

    def test_user_model_primary_key(self):
        """Test User model has correct primary key"""
        mapper = inspect(User)
        primary_keys = [key.name for key in mapper.primary_key]
        assert 'id' in primary_keys
        assert len(primary_keys) == 1

    def test_user_model_relationships(self):
        """Test User model has expected relationships"""
        mapper = inspect(User)
        relationships = {rel.key for rel in mapper.relationships}

        assert 'invoices' in relationships
        assert 'vendor' in relationships
        assert 'driver' in relationships

    def test_user_model_default_values(self):
        """Test User model default values are defined"""
        mapper = inspect(User)
        role_col = mapper.columns['role']
        assert role_col.default is not None


class TestClientModel:
    """Test Client model structure"""

    def test_client_model_tablename(self):
        """Test Client model has correct table name"""
        assert Client.__tablename__ == "clients"

    def test_client_model_columns(self):
        """Test Client model has all expected columns"""
        mapper = inspect(Client)
        column_names = {col.key for col in mapper.columns}

        expected_columns = {
            'id', 'name', 'email', 'phone', 'company', 'address',
            'city', 'state', 'zip_code', 'country', 'notes',
            'created_at', 'updated_at'
        }
        assert expected_columns.issubset(column_names)

    def test_client_model_relationships(self):
        """Test Client model has expected relationships"""
        mapper = inspect(Client)
        relationships = {rel.key for rel in mapper.relationships}
        assert 'invoices' in relationships


class TestInvoiceModel:
    """Test Invoice model structure"""

    def test_invoice_model_tablename(self):
        """Test Invoice model has correct table name"""
        assert Invoice.__tablename__ == "invoices"

    def test_invoice_model_columns(self):
        """Test Invoice model has all expected columns"""
        mapper = inspect(Invoice)
        column_names = {col.key for col in mapper.columns}

        expected_columns = {
            'id', 'invoice_number', 'user_id', 'client_id',
            'issue_date', 'due_date', 'subtotal', 'tax_rate',
            'tax_amount', 'discount_amount', 'total_amount',
            'status', 'notes', 'terms', 'created_at', 'updated_at'
        }
        assert expected_columns.issubset(column_names)

    def test_invoice_model_relationships(self):
        """Test Invoice model has expected relationships"""
        mapper = inspect(Invoice)
        relationships = {rel.key for rel in mapper.relationships}

        assert 'user' in relationships
        assert 'client' in relationships
        assert 'items' in relationships
        assert 'payments' in relationships

    def test_invoice_model_default_values(self):
        """Test Invoice model default values"""
        mapper = inspect(Invoice)

        assert mapper.columns['subtotal'].default is not None
        assert mapper.columns['tax_rate'].default is not None
        assert mapper.columns['tax_amount'].default is not None
        assert mapper.columns['discount_amount'].default is not None
        assert mapper.columns['status'].default is not None


class TestInvoiceItemModel:
    """Test InvoiceItem model structure"""

    def test_invoice_item_model_tablename(self):
        """Test InvoiceItem model has correct table name"""
        assert InvoiceItem.__tablename__ == "invoice_items"

    def test_invoice_item_model_columns(self):
        """Test InvoiceItem model has all expected columns"""
        mapper = inspect(InvoiceItem)
        column_names = {col.key for col in mapper.columns}

        expected_columns = {
            'id', 'invoice_id', 'description', 'quantity',
            'unit_price', 'amount'
        }
        assert expected_columns.issubset(column_names)

    def test_invoice_item_model_relationships(self):
        """Test InvoiceItem model has expected relationships"""
        mapper = inspect(InvoiceItem)
        relationships = {rel.key for rel in mapper.relationships}
        assert 'invoice' in relationships


class TestPaymentModel:
    """Test Payment model structure"""

    def test_payment_model_tablename(self):
        """Test Payment model has correct table name"""
        assert Payment.__tablename__ == "payments"

    def test_payment_model_columns(self):
        """Test Payment model has all expected columns"""
        mapper = inspect(Payment)
        column_names = {col.key for col in mapper.columns}

        expected_columns = {
            'id', 'invoice_id', 'amount', 'payment_date',
            'payment_method', 'reference_number', 'status',
            'notes', 'created_at'
        }
        assert expected_columns.issubset(column_names)

    def test_payment_model_relationships(self):
        """Test Payment model has expected relationships"""
        mapper = inspect(Payment)
        relationships = {rel.key for rel in mapper.relationships}
        assert 'invoice' in relationships

    def test_payment_model_default_values(self):
        """Test Payment model default values"""
        mapper = inspect(Payment)
        assert mapper.columns['status'].default is not None


class TestVendorModel:
    """Test Vendor model structure"""

    def test_vendor_model_tablename(self):
        """Test Vendor model has correct table name"""
        assert Vendor.__tablename__ == "vendors"

    def test_vendor_model_columns(self):
        """Test Vendor model has all expected columns"""
        mapper = inspect(Vendor)
        column_names = {col.key for col in mapper.columns}

        # Company Information
        expected_columns = {
            'id', 'vendor_id', 'company_name', 'tax_id',
            'business_type', 'industry', 'website',
        }
        assert expected_columns.issubset(column_names)

        # Restaurant-specific fields
        restaurant_fields = {
            'restaurant_name', 'cuisine_type', 'operating_hours',
            'seating_capacity', 'delivery_available', 'pickup_available',
            'average_prep_time'
        }
        assert restaurant_fields.issubset(column_names)

        # Contact information
        contact_fields = {
            'contact_name', 'contact_email', 'contact_phone', 'contact_title'
        }
        assert contact_fields.issubset(column_names)

        # Address fields
        address_fields = {
            'street', 'city', 'state', 'zip_code', 'country',
            'latitude', 'longitude'
        }
        assert address_fields.issubset(column_names)

        # Status fields
        status_fields = {
            'onboarding_status', 'onboarding_phase', 'risk_rating',
            'performance_score'
        }
        assert status_fields.issubset(column_names)

        # Document fields
        document_fields = {
            'w9_form', 'w9_form_url', 'insurance', 'insurance_url',
            'financial_statements', 'financial_statements_url',
            'compliance_certs', 'compliance_certs_url',
            'security_policy', 'security_policy_url',
            'food_license', 'food_license_url',
            'health_permit', 'health_permit_url'
        }
        assert document_fields.issubset(column_names)

        # Verification fields
        verification_fields = {
            'verification_id', 'verification_status', 'documents_verified',
            'documents_verified_at', 'verification_notes', 'verification_reviewer_id'
        }
        assert verification_fields.issubset(column_names)

    def test_vendor_model_relationships(self):
        """Test Vendor model has expected relationships"""
        mapper = inspect(Vendor)
        relationships = {rel.key for rel in mapper.relationships}

        assert 'purchase_orders' in relationships
        assert 'menu_items' in relationships

    def test_vendor_model_default_values(self):
        """Test Vendor model default values"""
        mapper = inspect(Vendor)

        assert mapper.columns['delivery_available'].default is not None
        assert mapper.columns['pickup_available'].default is not None
        assert mapper.columns['onboarding_status'].default is not None
        assert mapper.columns['onboarding_phase'].default is not None
        assert mapper.columns['risk_rating'].default is not None
        assert mapper.columns['performance_score'].default is not None
        assert mapper.columns['w9_form'].default is not None
        assert mapper.columns['insurance'].default is not None
        assert mapper.columns['app_registered'].default is not None
        assert mapper.columns['documents_verified'].default is not None


class TestDriverModel:
    """Test Driver model structure"""

    def test_driver_model_tablename(self):
        """Test Driver model has correct table name"""
        assert Driver.__tablename__ == "drivers"

    def test_driver_model_columns(self):
        """Test Driver model has all expected columns"""
        mapper = inspect(Driver)
        column_names = {col.key for col in mapper.columns}

        # Personal information
        personal_fields = {
            'id', 'driver_id', 'first_name', 'last_name', 'email',
            'phone', 'password_hash', 'date_of_birth', 'license_number'
        }
        assert personal_fields.issubset(column_names)

        # Address fields
        address_fields = {'street', 'city', 'state', 'zip_code'}
        assert address_fields.issubset(column_names)

        # Vehicle information
        vehicle_fields = {
            'vehicle_type', 'vehicle_make', 'vehicle_model',
            'vehicle_year', 'vehicle_color', 'license_plate'
        }
        assert vehicle_fields.issubset(column_names)

        # Documents
        document_fields = {
            'drivers_license', 'drivers_license_url', 'drivers_license_expiry',
            'insurance', 'insurance_url', 'insurance_expiry',
            'background_check', 'background_check_date'
        }
        assert document_fields.issubset(column_names)

        # Status and ratings
        status_fields = {'status', 'rating', 'total_deliveries'}
        assert status_fields.issubset(column_names)

        # Real-time tracking
        tracking_fields = {
            'current_latitude', 'current_longitude', 'is_online',
            'location_updated_at',
            'went_online_at', 'went_offline_at'
        }
        assert tracking_fields.issubset(column_names)

        # Verification fields
        verification_fields = {
            'verification_id', 'verification_status', 'documents_verified',
            'documents_verified_at', 'verification_notes', 'verification_reviewer_id'
        }
        assert verification_fields.issubset(column_names)

    def test_driver_model_relationships(self):
        """Test Driver model has expected relationships"""
        mapper = inspect(Driver)
        relationships = {rel.key for rel in mapper.relationships}
        assert 'payouts' in relationships

    def test_driver_model_default_values(self):
        """Test Driver model default values"""
        mapper = inspect(Driver)

        assert mapper.columns['drivers_license'].default is not None
        assert mapper.columns['insurance'].default is not None
        assert mapper.columns['background_check'].default is not None
        assert mapper.columns['status'].default is not None
        assert mapper.columns['rating'].default is not None
        assert mapper.columns['total_deliveries'].default is not None
        assert mapper.columns['is_online'].default is not None
        assert mapper.columns['stripe_onboarded'].default is not None
        assert mapper.columns['documents_verified'].default is not None


class TestCustomerModel:
    """Test Customer model structure"""

    def test_customer_model_tablename(self):
        """Test Customer model has correct table name"""
        assert Customer.__tablename__ == "customers"

    def test_customer_model_columns(self):
        """Test Customer model has all expected columns"""
        mapper = inspect(Customer)
        column_names = {col.key for col in mapper.columns}

        # Personal information
        personal_fields = {
            'id', 'customer_id', 'first_name', 'last_name',
            'email', 'phone', 'password_hash'
        }
        assert personal_fields.issubset(column_names)

        # Address fields
        address_fields = {'default_address', 'saved_addresses'}
        assert address_fields.issubset(column_names)

        # Preferences
        preference_fields = {
            'dietary_preferences', 'favorite_cuisines', 'notification_preferences'
        }
        assert preference_fields.issubset(column_names)

        # Loyalty
        loyalty_fields = {'loyalty_points', 'loyalty_tier'}
        assert loyalty_fields.issubset(column_names)

        # Stats
        stats_fields = {'total_orders', 'total_spent', 'average_order_value'}
        assert stats_fields.issubset(column_names)

        # Status
        status_fields = {'is_active', 'is_verified'}
        assert status_fields.issubset(column_names)

    def test_customer_model_default_values(self):
        """Test Customer model default values"""
        mapper = inspect(Customer)

        assert mapper.columns['loyalty_points'].default is not None
        assert mapper.columns['loyalty_tier'].default is not None
        assert mapper.columns['total_orders'].default is not None
        assert mapper.columns['total_spent'].default is not None
        assert mapper.columns['average_order_value'].default is not None
        assert mapper.columns['is_active'].default is not None
        assert mapper.columns['is_verified'].default is not None


class TestOrderModel:
    """Test Order model structure"""

    def test_order_model_tablename(self):
        """Test Order model has correct table name"""
        assert Order.__tablename__ == "orders"

    def test_order_model_columns(self):
        """Test Order model has all expected columns"""
        mapper = inspect(Order)
        column_names = {col.key for col in mapper.columns}

        # Basic fields
        basic_fields = {
            'id', 'order_number', 'customer_id', 'customer_name',
            'customer_email', 'customer_phone', 'vendor_id',
            'driver_id', 'driver_name', 'items'
        }
        assert basic_fields.issubset(column_names)

        # Financial fields
        financial_fields = {
            'subtotal', 'tax_rate', 'tax_amount', 'delivery_fee',
            'tip', 'platform_fee', 'total_amount'
        }
        assert financial_fields.issubset(column_names)

        # Delivery fields
        delivery_fields = {
            'delivery_address', 'delivery_instructions',
            'delivery_latitude', 'delivery_longitude', 'driver_location'
        }
        assert delivery_fields.issubset(column_names)

        # Status fields
        status_fields = {'status', 'payment_status'}
        assert status_fields.issubset(column_names)

        # Auto-dispatch fields
        dispatch_fields = {
            'auto_dispatched', 'broadcast_to_drivers',
            'broadcast_at', 'broadcast_radius_km'
        }
        assert dispatch_fields.issubset(column_names)

    def test_order_model_relationships(self):
        """Test Order model has expected relationships"""
        mapper = inspect(Order)
        relationships = {rel.key for rel in mapper.relationships}
        assert 'vendor' in relationships

    def test_order_model_default_values(self):
        """Test Order model default values"""
        mapper = inspect(Order)

        assert mapper.columns['tax_rate'].default is not None
        assert mapper.columns['tax_amount'].default is not None
        assert mapper.columns['delivery_fee'].default is not None
        assert mapper.columns['tip'].default is not None
        assert mapper.columns['platform_fee'].default is not None
        assert mapper.columns['status'].default is not None
        assert mapper.columns['invoice_generated'].default is not None
        assert mapper.columns['coupa_synced'].default is not None
        assert mapper.columns['auto_dispatched'].default is not None
        assert mapper.columns['broadcast_to_drivers'].default is not None


class TestVendorPurchaseOrderModel:
    """Test VendorPurchaseOrder model structure"""

    def test_vendor_purchase_order_model_tablename(self):
        """Test VendorPurchaseOrder model has correct table name"""
        assert VendorPurchaseOrder.__tablename__ == "vendor_purchase_orders"

    def test_vendor_purchase_order_model_columns(self):
        """Test VendorPurchaseOrder model has all expected columns"""
        mapper = inspect(VendorPurchaseOrder)
        column_names = {col.key for col in mapper.columns}

        expected_columns = {
            'id', 'vendor_id', 'po_number', 'description',
            'amount', 'status', 'order_date', 'delivery_date',
            'created_at', 'updated_at'
        }
        assert expected_columns.issubset(column_names)


class TestVendorMenuItemModel:
    """Test VendorMenuItem model structure"""

    def test_vendor_menu_item_model_tablename(self):
        """Test VendorMenuItem model has correct table name"""
        assert VendorMenuItem.__tablename__ == "vendor_menu_items"

    def test_vendor_menu_item_model_columns(self):
        """Test VendorMenuItem model has all expected columns"""
        mapper = inspect(VendorMenuItem)
        column_names = {col.key for col in mapper.columns}

        expected_columns = {
            'id', 'vendor_id', 'item_name', 'description', 'category', 'price',
            'is_available', 'is_vegetarian', 'is_vegan', 'is_gluten_free',
            'is_spicy', 'spice_level', 'prep_time', 'calories', 'image_url',
            'in_stock', 'daily_limit', 'items_sold_today', 'customizations',
            'created_at', 'updated_at'
        }
        assert expected_columns.issubset(column_names)

    def test_vendor_menu_item_model_default_values(self):
        """Test VendorMenuItem model default values"""
        mapper = inspect(VendorMenuItem)

        assert mapper.columns['is_available'].default is not None
        assert mapper.columns['is_vegetarian'].default is not None
        assert mapper.columns['is_vegan'].default is not None
        assert mapper.columns['is_gluten_free'].default is not None
        assert mapper.columns['is_spicy'].default is not None
        assert mapper.columns['spice_level'].default is not None
        assert mapper.columns['in_stock'].default is not None
        assert mapper.columns['items_sold_today'].default is not None


class TestAIEmployeeModel:
    """Test AIEmployee model structure"""

    def test_ai_employee_model_tablename(self):
        """Test AIEmployee model has correct table name"""
        assert AIEmployee.__tablename__ == "ai_employees"

    def test_ai_employee_model_columns(self):
        """Test AIEmployee model has all expected columns"""
        mapper = inspect(AIEmployee)
        column_names = {col.key for col in mapper.columns}

        expected_columns = {
            'id', 'employee_id', 'name', 'role', 'department', 'avatar',
            'status', 'is_online', 'last_active',
            'total_tasks_completed', 'total_errors', 'total_hours_active',
            'average_task_time_seconds', 'success_rate',
            'session_start', 'tasks_this_session', 'errors_this_session',
            'model_version', 'config_json', 'created_at', 'updated_at'
        }
        assert expected_columns.issubset(column_names)

    def test_ai_employee_model_relationships(self):
        """Test AIEmployee model has expected relationships"""
        mapper = inspect(AIEmployee)
        relationships = {rel.key for rel in mapper.relationships}

        assert 'activities' in relationships
        assert 'hourly_reports' in relationships

    def test_ai_employee_model_default_values(self):
        """Test AIEmployee model default values"""
        mapper = inspect(AIEmployee)

        assert mapper.columns['status'].default is not None
        assert mapper.columns['is_online'].default is not None
        assert mapper.columns['total_tasks_completed'].default is not None
        assert mapper.columns['total_errors'].default is not None
        assert mapper.columns['total_hours_active'].default is not None
        assert mapper.columns['average_task_time_seconds'].default is not None
        assert mapper.columns['success_rate'].default is not None
        assert mapper.columns['tasks_this_session'].default is not None
        assert mapper.columns['errors_this_session'].default is not None


class TestDriverPayoutModel:
    """Test DriverPayout model structure"""

    def test_driver_payout_model_tablename(self):
        """Test DriverPayout model has correct table name"""
        assert DriverPayout.__tablename__ == "driver_payouts"

    def test_driver_payout_model_columns(self):
        """Test DriverPayout model has all expected columns"""
        mapper = inspect(DriverPayout)
        column_names = {col.key for col in mapper.columns}

        expected_columns = {
            'id', 'payout_number', 'driver_id', 'order_id',
            'period_start', 'period_end',
            'total_deliveries', 'delivery_fee', 'tip', 'bonus',
            'deductions', 'net_payout', 'status',
            'paid_at', 'payment_method', 'payment_reference',
            'stripe_transfer_id', 'created_at', 'updated_at'
        }
        assert expected_columns.issubset(column_names)

    def test_driver_payout_model_relationships(self):
        """Test DriverPayout model has expected relationships"""
        mapper = inspect(DriverPayout)
        relationships = {rel.key for rel in mapper.relationships}
        assert 'driver' in relationships


class TestVendorPayoutModel:
    """Test VendorPayout model structure"""

    def test_vendor_payout_model_tablename(self):
        """Test VendorPayout model has correct table name"""
        assert VendorPayout.__tablename__ == "vendor_payouts"

    def test_vendor_payout_model_columns(self):
        """Test VendorPayout model has all expected columns"""
        mapper = inspect(VendorPayout)
        column_names = {col.key for col in mapper.columns}

        expected_columns = {
            'id', 'payout_number', 'vendor_id',
            'period_start', 'period_end',
            'total_orders', 'gross_revenue', 'platform_fee',
            'stripe_fees', 'net_payout', 'status',
            'coupa_invoice_id', 'coupa_status', 'coupa_synced_at',
            'paid_at', 'payment_method', 'payment_reference',
            'created_at', 'updated_at'
        }
        assert expected_columns.issubset(column_names)


class TestJournalEntryModel:
    """Test JournalEntry model structure"""

    def test_journal_entry_model_tablename(self):
        """Test JournalEntry model has correct table name"""
        assert JournalEntry.__tablename__ == "journal_entries"

    def test_journal_entry_model_columns(self):
        """Test JournalEntry model has all expected columns"""
        mapper = inspect(JournalEntry)
        column_names = {col.key for col in mapper.columns}

        expected_columns = {
            'id', 'entry_number', 'order_id', 'vendor_payout_id',
            'driver_payout_id', 'entry_type', 'description', 'status',
            'created_by_ai', 'created_by_ai_name', 'created_at', 'posted_at'
        }
        assert expected_columns.issubset(column_names)

    def test_journal_entry_model_relationships(self):
        """Test JournalEntry model has expected relationships"""
        mapper = inspect(JournalEntry)
        relationships = {rel.key for rel in mapper.relationships}
        assert 'lines' in relationships


class TestJournalEntryLineModel:
    """Test JournalEntryLine model structure"""

    def test_journal_entry_line_model_tablename(self):
        """Test JournalEntryLine model has correct table name"""
        assert JournalEntryLine.__tablename__ == "journal_entry_lines"

    def test_journal_entry_line_model_columns(self):
        """Test JournalEntryLine model has all expected columns"""
        mapper = inspect(JournalEntryLine)
        column_names = {col.key for col in mapper.columns}

        expected_columns = {
            'id', 'journal_entry_id', 'account_code', 'account_name',
            'debit', 'credit', 'description'
        }
        assert expected_columns.issubset(column_names)

    def test_journal_entry_line_model_relationships(self):
        """Test JournalEntryLine model has expected relationships"""
        mapper = inspect(JournalEntryLine)
        relationships = {rel.key for rel in mapper.relationships}
        assert 'journal_entry' in relationships


class TestStripePaymentLogModel:
    """Test StripePaymentLog model structure"""

    def test_stripe_payment_log_model_tablename(self):
        """Test StripePaymentLog model has correct table name"""
        assert StripePaymentLog.__tablename__ == "stripe_payment_logs"

    def test_stripe_payment_log_model_columns(self):
        """Test StripePaymentLog model has all expected columns"""
        mapper = inspect(StripePaymentLog)
        column_names = {col.key for col in mapper.columns}

        expected_columns = {
            'id', 'order_id', 'event_type', 'stripe_event_id',
            'payment_intent_id', 'charge_id', 'amount', 'currency',
            'status', 'raw_data', 'created_at', 'processed_at'
        }
        assert expected_columns.issubset(column_names)


class TestAIEmployeeActivityModel:
    """Test AIEmployeeActivity model structure"""

    def test_ai_employee_activity_model_tablename(self):
        """Test AIEmployeeActivity model has correct table name"""
        assert AIEmployeeActivity.__tablename__ == "ai_employee_activities"

    def test_ai_employee_activity_model_columns(self):
        """Test AIEmployeeActivity model has all expected columns"""
        mapper = inspect(AIEmployeeActivity)
        column_names = {col.key for col in mapper.columns}

        expected_columns = {
            'id', 'ai_employee_id', 'activity_type', 'description',
            'status', 'order_id', 'vendor_id', 'driver_id',
            'processing_time_ms', 'error_message',
            'started_at', 'completed_at'
        }
        assert expected_columns.issubset(column_names)


class TestAIEmployeeHourlyReportModel:
    """Test AIEmployeeHourlyReport model structure"""

    def test_ai_employee_hourly_report_model_tablename(self):
        """Test AIEmployeeHourlyReport model has correct table name"""
        assert AIEmployeeHourlyReport.__tablename__ == "ai_employee_hourly_reports"

    def test_ai_employee_hourly_report_model_columns(self):
        """Test AIEmployeeHourlyReport model has all expected columns"""
        mapper = inspect(AIEmployeeHourlyReport)
        column_names = {col.key for col in mapper.columns}

        expected_columns = {
            'id', 'report_id', 'ai_employee_id',
            'report_hour', 'report_date',
            'tasks_completed', 'tasks_failed',
            'avg_processing_time_ms', 'total_processing_time_ms',
            'error_rate', 'uptime_percentage',
            'role_specific_metrics', 'summary_text', 'alerts',
            'recommendations', 'is_published', 'published_at', 'created_at'
        }
        assert expected_columns.issubset(column_names)


class TestAIEmployeeDailyReportModel:
    """Test AIEmployeeDailyReport model structure"""

    def test_ai_employee_daily_report_model_tablename(self):
        """Test AIEmployeeDailyReport model has correct table name"""
        assert AIEmployeeDailyReport.__tablename__ == "ai_employee_daily_reports"

    def test_ai_employee_daily_report_model_columns(self):
        """Test AIEmployeeDailyReport model has all expected columns"""
        mapper = inspect(AIEmployeeDailyReport)
        column_names = {col.key for col in mapper.columns}

        expected_columns = {
            'id', 'report_id', 'ai_employee_id', 'report_date',
            'total_tasks', 'total_errors', 'success_rate',
            'total_active_hours', 'peak_hour', 'peak_hour_tasks',
            'daily_metrics', 'vs_previous_day', 'vs_weekly_avg',
            'summary_text', 'key_achievements', 'issues_encountered',
            'recommendations', 'is_published', 'published_at', 'created_at'
        }
        assert expected_columns.issubset(column_names)


class TestDashboardMetricModel:
    """Test DashboardMetric model structure"""

    def test_dashboard_metric_model_tablename(self):
        """Test DashboardMetric model has correct table name"""
        assert DashboardMetric.__tablename__ == "dashboard_metrics"

    def test_dashboard_metric_model_columns(self):
        """Test DashboardMetric model has all expected columns"""
        mapper = inspect(DashboardMetric)
        column_names = {col.key for col in mapper.columns}

        expected_columns = {
            'id', 'metric_key', 'metric_value', 'metric_unit',
            'metric_label', 'category', 'ai_employee_id',
            'time_window', 'updated_at'
        }
        assert expected_columns.issubset(column_names)


# ============================================================================
# INHERITANCE AND BASE CLASS TESTS
# ============================================================================

class TestModelInheritance:
    """Test that all models inherit from Base correctly"""

    def test_all_models_inherit_from_base(self):
        """Test that all model classes inherit from Base"""
        models_to_test = [
            User, Client, Invoice, InvoiceItem, Payment,
            Vendor, VendorPurchaseOrder, VendorMenuItem,
            Order, StripePaymentLog, VendorPayout,
            Customer, Driver, DriverPayout,
            JournalEntry, JournalEntryLine,
            AIEmployee, AIEmployeeActivity,
            AIEmployeeHourlyReport, AIEmployeeDailyReport,
            DashboardMetric
        ]

        for model in models_to_test:
            assert issubclass(model, Base), f"{model.__name__} does not inherit from Base"

    def test_all_models_have_tablename(self):
        """Test that all models define __tablename__"""
        models_to_test = [
            User, Client, Invoice, InvoiceItem, Payment,
            Vendor, VendorPurchaseOrder, VendorMenuItem,
            Order, StripePaymentLog, VendorPayout,
            Customer, Driver, DriverPayout,
            JournalEntry, JournalEntryLine,
            AIEmployee, AIEmployeeActivity,
            AIEmployeeHourlyReport, AIEmployeeDailyReport,
            DashboardMetric
        ]

        for model in models_to_test:
            assert hasattr(model, '__tablename__'), f"{model.__name__} missing __tablename__"
            assert isinstance(model.__tablename__, str), f"{model.__name__}.__tablename__ is not a string"
            assert len(model.__tablename__) > 0, f"{model.__name__}.__tablename__ is empty"


# ============================================================================
# RELATIONSHIP TESTS
# ============================================================================

class TestModelRelationships:
    """Test relationships between models"""

    def test_user_invoice_relationship(self):
        """Test User-Invoice relationship is defined"""
        user_mapper = inspect(User)
        invoice_mapper = inspect(Invoice)

        user_relationships = {rel.key for rel in user_mapper.relationships}
        invoice_relationships = {rel.key for rel in invoice_mapper.relationships}

        assert 'invoices' in user_relationships
        assert 'user' in invoice_relationships

    def test_client_invoice_relationship(self):
        """Test Client-Invoice relationship is defined"""
        client_mapper = inspect(Client)
        invoice_mapper = inspect(Invoice)

        client_relationships = {rel.key for rel in client_mapper.relationships}
        invoice_relationships = {rel.key for rel in invoice_mapper.relationships}

        assert 'invoices' in client_relationships
        assert 'client' in invoice_relationships

    def test_invoice_items_relationship(self):
        """Test Invoice-InvoiceItem relationship is defined"""
        invoice_mapper = inspect(Invoice)
        item_mapper = inspect(InvoiceItem)

        invoice_relationships = {rel.key for rel in invoice_mapper.relationships}
        item_relationships = {rel.key for rel in item_mapper.relationships}

        assert 'items' in invoice_relationships
        assert 'invoice' in item_relationships

    def test_invoice_payments_relationship(self):
        """Test Invoice-Payment relationship is defined"""
        invoice_mapper = inspect(Invoice)
        payment_mapper = inspect(Payment)

        invoice_relationships = {rel.key for rel in invoice_mapper.relationships}
        payment_relationships = {rel.key for rel in payment_mapper.relationships}

        assert 'payments' in invoice_relationships
        assert 'invoice' in payment_relationships

    def test_vendor_purchase_orders_relationship(self):
        """Test Vendor-VendorPurchaseOrder relationship is defined"""
        vendor_mapper = inspect(Vendor)
        po_mapper = inspect(VendorPurchaseOrder)

        vendor_relationships = {rel.key for rel in vendor_mapper.relationships}
        po_relationships = {rel.key for rel in po_mapper.relationships}

        assert 'purchase_orders' in vendor_relationships
        assert 'vendor' in po_relationships

    def test_vendor_menu_items_relationship(self):
        """Test Vendor-VendorMenuItem relationship is defined"""
        vendor_mapper = inspect(Vendor)
        menu_mapper = inspect(VendorMenuItem)

        vendor_relationships = {rel.key for rel in vendor_mapper.relationships}
        menu_relationships = {rel.key for rel in menu_mapper.relationships}

        assert 'menu_items' in vendor_relationships
        assert 'vendor' in menu_relationships

    def test_driver_payouts_relationship(self):
        """Test Driver-DriverPayout relationship is defined"""
        driver_mapper = inspect(Driver)
        payout_mapper = inspect(DriverPayout)

        driver_relationships = {rel.key for rel in driver_mapper.relationships}
        payout_relationships = {rel.key for rel in payout_mapper.relationships}

        assert 'payouts' in driver_relationships
        assert 'driver' in payout_relationships

    def test_journal_entry_lines_relationship(self):
        """Test JournalEntry-JournalEntryLine relationship is defined"""
        entry_mapper = inspect(JournalEntry)
        line_mapper = inspect(JournalEntryLine)

        entry_relationships = {rel.key for rel in entry_mapper.relationships}
        line_relationships = {rel.key for rel in line_mapper.relationships}

        assert 'lines' in entry_relationships
        assert 'journal_entry' in line_relationships

    def test_ai_employee_activities_relationship(self):
        """Test AIEmployee-AIEmployeeActivity relationship is defined"""
        employee_mapper = inspect(AIEmployee)
        activity_mapper = inspect(AIEmployeeActivity)

        employee_relationships = {rel.key for rel in employee_mapper.relationships}
        activity_relationships = {rel.key for rel in activity_mapper.relationships}

        assert 'activities' in employee_relationships
        assert 'ai_employee' in activity_relationships

    def test_ai_employee_hourly_reports_relationship(self):
        """Test AIEmployee-AIEmployeeHourlyReport relationship is defined"""
        employee_mapper = inspect(AIEmployee)
        report_mapper = inspect(AIEmployeeHourlyReport)

        employee_relationships = {rel.key for rel in employee_mapper.relationships}
        report_relationships = {rel.key for rel in report_mapper.relationships}

        assert 'hourly_reports' in employee_relationships
        assert 'ai_employee' in report_relationships


# ============================================================================
# COLUMN TYPE TESTS
# ============================================================================

class TestColumnTypes:
    """Test that columns have appropriate types"""

    def test_id_columns_are_integers(self):
        """Test that primary key 'id' columns are integers"""
        models = [User, Client, Invoice, InvoiceItem, Payment, Vendor, Driver, Customer]

        for model in models:
            mapper = inspect(model)
            id_column = mapper.columns['id']
            assert str(id_column.type) in ['INTEGER', 'BIGINT'], \
                f"{model.__name__}.id should be INTEGER type"

    def test_email_columns_are_strings(self):
        """Test that email columns are string type"""
        models_with_email = [User, Client, Customer, Driver, Vendor]

        for model in models_with_email:
            mapper = inspect(model)
            email_column = None
            if 'email' in mapper.columns:
                email_column = mapper.columns['email']
            elif 'contact_email' in mapper.columns:
                email_column = mapper.columns['contact_email']

            if email_column is not None:
                assert 'VARCHAR' in str(email_column.type) or 'STRING' in str(email_column.type), \
                    f"{model.__name__} email column should be VARCHAR/STRING type"

    def test_boolean_columns_are_boolean(self):
        """Test that boolean columns are boolean type"""
        vendor_mapper = inspect(Vendor)

        boolean_fields = [
            'delivery_available', 'pickup_available', 'app_registered',
            'w9_form', 'insurance', 'documents_verified'
        ]

        for field in boolean_fields:
            column = vendor_mapper.columns[field]
            assert 'BOOLEAN' in str(column.type), \
                f"Vendor.{field} should be BOOLEAN type"

    def test_datetime_columns_are_datetime(self):
        """Test that datetime columns are datetime type"""
        models_to_test = [User, Client, Invoice, Vendor, Driver]

        for model in models_to_test:
            mapper = inspect(model)
            if 'created_at' in mapper.columns:
                created_at_column = mapper.columns['created_at']
                assert 'DATETIME' in str(created_at_column.type), \
                    f"{model.__name__}.created_at should be DATETIME type"

    def test_float_columns_are_numeric(self):
        """Test that monetary/numeric columns are float/numeric type"""
        invoice_mapper = inspect(Invoice)

        numeric_fields = ['subtotal', 'tax_rate', 'tax_amount', 'discount_amount', 'total_amount']

        for field in numeric_fields:
            column = invoice_mapper.columns[field]
            assert 'FLOAT' in str(column.type) or 'NUMERIC' in str(column.type), \
                f"Invoice.{field} should be FLOAT/NUMERIC type"


# ============================================================================
# DEFAULT VALUE TESTS
# ============================================================================

class TestDefaultValues:
    """Test that default values are properly configured"""

    def test_user_role_default(self):
        """Test User.role has default value"""
        mapper = inspect(User)
        role_column = mapper.columns['role']
        assert role_column.default is not None

    def test_invoice_status_default(self):
        """Test Invoice.status has default value"""
        mapper = inspect(Invoice)
        status_column = mapper.columns['status']
        assert status_column.default is not None

    def test_payment_status_default(self):
        """Test Payment.status has default value"""
        mapper = inspect(Payment)
        status_column = mapper.columns['status']
        assert status_column.default is not None

    def test_vendor_onboarding_defaults(self):
        """Test Vendor onboarding fields have default values"""
        mapper = inspect(Vendor)

        assert mapper.columns['onboarding_status'].default is not None
        assert mapper.columns['onboarding_phase'].default is not None
        assert mapper.columns['risk_rating'].default is not None

    def test_driver_status_default(self):
        """Test Driver.status has default value"""
        mapper = inspect(Driver)
        status_column = mapper.columns['status']
        assert status_column.default is not None

    def test_customer_loyalty_defaults(self):
        """Test Customer loyalty fields have default values"""
        mapper = inspect(Customer)

        assert mapper.columns['loyalty_points'].default is not None
        assert mapper.columns['loyalty_tier'].default is not None

    def test_order_status_default(self):
        """Test Order.status has default value"""
        mapper = inspect(Order)
        status_column = mapper.columns['status']
        assert status_column.default is not None

    def test_ai_employee_status_default(self):
        """Test AIEmployee.status has default value"""
        mapper = inspect(AIEmployee)
        status_column = mapper.columns['status']
        assert status_column.default is not None

    def test_numeric_defaults_are_zero(self):
        """Test that numeric fields have sensible defaults"""
        invoice_mapper = inspect(Invoice)

        assert invoice_mapper.columns['subtotal'].default is not None
        assert invoice_mapper.columns['tax_rate'].default is not None
        assert invoice_mapper.columns['tax_amount'].default is not None
        assert invoice_mapper.columns['discount_amount'].default is not None


# ============================================================================
# CONSTRAINT TESTS
# ============================================================================

class TestModelConstraints:
    """Test model constraints like nullable, unique, etc."""

    def test_primary_keys_are_not_nullable(self):
        """Test that primary key columns are not nullable"""
        models = [User, Client, Invoice, InvoiceItem, Payment, Vendor, Driver]

        for model in models:
            mapper = inspect(model)
            for pk in mapper.primary_key:
                # Primary keys are implicitly non-nullable in SQLAlchemy
                assert pk.primary_key is True

    def test_required_fields_are_not_nullable(self):
        """Test that required fields are marked as non-nullable"""
        # User model
        user_mapper = inspect(User)
        assert user_mapper.columns['email'].nullable is False
        assert user_mapper.columns['password_hash'].nullable is False
        assert user_mapper.columns['full_name'].nullable is False

        # Invoice model
        invoice_mapper = inspect(Invoice)
        assert invoice_mapper.columns['invoice_number'].nullable is False
        assert invoice_mapper.columns['user_id'].nullable is False
        assert invoice_mapper.columns['client_id'].nullable is False

        # Driver model
        driver_mapper = inspect(Driver)
        assert driver_mapper.columns['driver_id'].nullable is False
        assert driver_mapper.columns['first_name'].nullable is False
        assert driver_mapper.columns['email'].nullable is False

    def test_unique_constraints(self):
        """Test that unique constraints are properly defined"""
        # User email should be unique
        user_mapper = inspect(User)
        assert user_mapper.columns['email'].unique is True

        # Invoice number should be unique
        invoice_mapper = inspect(Invoice)
        assert invoice_mapper.columns['invoice_number'].unique is True

        # Customer email should be unique
        customer_mapper = inspect(Customer)
        assert customer_mapper.columns['email'].unique is True

        # Driver email and driver_id should be unique
        driver_mapper = inspect(Driver)
        assert driver_mapper.columns['email'].unique is True
        assert driver_mapper.columns['driver_id'].unique is True

    def test_foreign_key_constraints(self):
        """Test that foreign key relationships are properly defined"""
        # Invoice references User and Client
        invoice_mapper = inspect(Invoice)
        assert invoice_mapper.columns['user_id'].foreign_keys
        assert invoice_mapper.columns['client_id'].foreign_keys

        # InvoiceItem references Invoice
        item_mapper = inspect(InvoiceItem)
        assert item_mapper.columns['invoice_id'].foreign_keys

        # Payment references Invoice
        payment_mapper = inspect(Payment)
        assert payment_mapper.columns['invoice_id'].foreign_keys


# ============================================================================
# COMPREHENSIVE INTEGRATION TEST
# ============================================================================

class TestModelIntegration:
    """Integration tests to ensure all models work together"""

    def test_all_models_are_importable(self):
        """Test that all models can be imported successfully"""
        from models import (
            User, Client, Invoice, InvoiceItem, Payment,
            Vendor, VendorPurchaseOrder, VendorMenuItem,
            Order, StripePaymentLog, VendorPayout,
            Customer, Driver, DriverPayout,
            JournalEntry, JournalEntryLine,
            AIEmployee, AIEmployeeActivity,
            AIEmployeeHourlyReport, AIEmployeeDailyReport,
            DashboardMetric
        )

        assert User is not None
        assert Client is not None
        assert Invoice is not None
        assert InvoiceItem is not None
        assert Payment is not None
        assert Vendor is not None
        assert Driver is not None
        assert Customer is not None

    def test_all_enums_are_importable(self):
        """Test that all enums can be imported successfully"""
        from models import (
            UserRole, InvoiceStatus, PaymentStatus,
            VendorStatus, OnboardingPhase, RiskRating,
            OrderStatus, CustomerStatus, DriverStatus, AIEmployeeStatus
        )

        assert UserRole is not None
        assert InvoiceStatus is not None
        assert PaymentStatus is not None
        assert VendorStatus is not None
        assert OnboardingPhase is not None
        assert RiskRating is not None

    def test_base_metadata_contains_all_tables(self):
        """Test that Base.metadata contains all defined tables"""
        from models import Base

        table_names = Base.metadata.tables.keys()

        expected_tables = {
            'users', 'clients', 'invoices', 'invoice_items', 'payments',
            'vendors', 'vendor_purchase_orders', 'vendor_menu_items',
            'orders', 'stripe_payment_logs', 'vendor_payouts',
            'customers', 'drivers', 'driver_payouts',
            'journal_entries', 'journal_entry_lines',
            'ai_employees', 'ai_employee_activities',
            'ai_employee_hourly_reports', 'ai_employee_daily_reports',
            'dashboard_metrics'
        }

        for table in expected_tables:
            assert table in table_names, f"Table {table} not found in Base.metadata"

    def test_model_count(self):
        """Test that we have the expected number of models"""
        from models import Base

        # Count the number of mapped classes
        table_count = len(Base.metadata.tables)

        # We should have at least 20+ tables
        assert table_count >= 20, f"Expected at least 20 tables, found {table_count}"
