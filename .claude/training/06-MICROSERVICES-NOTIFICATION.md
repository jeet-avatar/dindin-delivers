# Notification Service (Port 8009)

> **Source:** `services/core/notification-service/main.py`
> **Error Prefix:** NTF

---

## Email Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/notifications/email/send` | Send templated email |
| POST | `/api/notifications/email/vendor-approval` | Send vendor approval email |
| POST | `/api/notifications/email/vendor-registration` | Send vendor registration email |
| POST | `/api/notifications/email/driver-approval` | Send driver approval email |
| POST | `/api/notifications/email/driver-registration` | Send driver registration email |

---

## Push Notification Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/notifications/push/send` | Send push notification |
| POST | `/api/notifications/push/topic` | Send push to topic |

---

## SMS Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/notifications/sms/send` | Send SMS notification |

---

## Order Notification Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/notifications/order` | Send order-related notification |

---

## Health Endpoint

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications/health` | Service health check |

---

## Enums

### NotificationType
```python
class NotificationType(str, Enum):
    EMAIL = "email"
    PUSH = "push"
    SMS = "sms"
    IN_APP = "in_app"
```

### NotificationStatus
```python
class NotificationStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    READ = "read"
```

### NotificationChannel
```python
class NotificationChannel(str, Enum):
    EMAIL = "email"
    PUSH = "push"
    SMS = "sms"
    IN_APP = "in_app"
    ALL = "all"
```

### NotificationPriority
```python
class NotificationPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"
```

---

## Request Models

### EmailRequest
```python
class EmailRequest(BaseModel):
    to_email: EmailStr
    subject: str
    template: str                   # Template name
    data: Dict[str, Any]            # Template variables
    priority: NotificationPriority = NotificationPriority.NORMAL
```

### PushRequest
```python
class PushRequest(BaseModel):
    user_id: Optional[int]
    driver_id: Optional[int]
    fcm_token: Optional[str]
    title: str
    body: str
    data: Optional[Dict[str, Any]]
    priority: NotificationPriority = NotificationPriority.NORMAL
```

### SMSRequest
```python
class SMSRequest(BaseModel):
    phone_number: str
    message: str
    priority: NotificationPriority = NotificationPriority.NORMAL
```

### OrderNotification
```python
class OrderNotification(BaseModel):
    order_id: int
    notification_type: str   # new_order, order_ready, order_picked_up, order_delivered
    recipient_type: str      # customer, driver, restaurant
```

### VendorApprovalEmail
```python
class VendorApprovalEmail(BaseModel):
    to_email: EmailStr
    restaurant_name: str
    contact_name: str
```

### DriverApprovalEmail
```python
class DriverApprovalEmail(BaseModel):
    to_email: EmailStr
    driver_name: str
    driver_code: str
```

---

## Email Templates

| Template Name | Subject |
|---------------|---------|
| `vendor_approval` | "Congratulations! {restaurant_name} is Now Live on Dollor.ai" |
| `vendor_registration` | "Application Received - {restaurant_name} | Dollor.ai" |
| `driver_approval` | "You're Approved! Start Delivering with Dollor.ai" |
| `driver_registration` | "Application Received - Driver {driver_code} | Dollor.ai" |
| `order_confirmation` | "Order #{order_id} Confirmed" |
| `order_ready` | "Your Order is Ready for Pickup!" |
| `order_delivered` | "Order #{order_id} Delivered - Rate Your Experience" |
| `password_reset` | "Reset Your Dollor.ai Password" |

---

## Configuration (Environment Variables)

| Variable | Default | Description |
|----------|---------|-------------|
| `SMTP_HOST` | smtp.gmail.com | SMTP server host |
| `SMTP_PORT` | 587 | SMTP server port |
| `SMTP_USER` | - | SMTP username |
| `SMTP_PASSWORD` | - | SMTP password |
| `FROM_EMAIL` | noreply@dollor.ai | Sender email |
| `FROM_NAME` | Dollor.ai | Sender name |
| `FIREBASE_CREDENTIALS_PATH` | - | Path to Firebase credentials |
| `TWILIO_ACCOUNT_SID` | - | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | - | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | - | Twilio phone number |

---

## Error Codes

| Code | Message |
|------|---------|
| NTF-101 | Invalid email address |
| NTF-102 | Unknown template |
| NTF-201 | User not found |
| NTF-202 | No FCM token registered |
| NTF-301 | Invalid phone number |
| NTF-401 | Order not found |
| NTF-501 | Email service error |
| NTF-502 | Push service error |
| NTF-503 | SMS service error |

---

*Last Updated: December 26, 2025*
