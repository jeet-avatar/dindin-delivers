# ZIP Vendor Management - Database Documentation

## Overview
The vendor management system is designed for ZIP application integration, allowing vendors to be onboarded, tracked, and managed through the procurement process.

## Database Tables

### 1. **vendors** (Main Vendor Table)
Stores all vendor company information and onboarding status.

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer | Primary key |
| `vendor_id` | String(50) | Unique vendor identifier (e.g., VEN-202411-0001) |
| `company_name` | String(255) | Vendor company name |
| `tax_id` | String(50) | Tax ID / EIN |
| `business_type` | String(100) | Corporation, LLC, Partnership, etc. |
| `industry` | String(100) | Industry category |
| `website` | String(255) | Company website URL |
| `contact_name` | String(255) | Primary contact person |
| `contact_email` | String(255) | Primary contact email |
| `contact_phone` | String(50) | Primary contact phone |
| `contact_title` | String(100) | Contact's job title |
| `street` | Text | Street address |
| `city` | String(100) | City |
| `state` | String(100) | State/Province |
| `zip_code` | String(20) | Postal code |
| `country` | String(100) | Country |
| `onboarding_status` | Enum | PENDING, IN_REVIEW, APPROVED, REJECTED, SUSPENDED |
| `onboarding_phase` | Enum | NOT_STARTED, DOCUMENTS_PENDING, UNDER_REVIEW, COMPLIANCE_CHECK, COMPLETED |
| `risk_rating` | Enum | LOW, MEDIUM, HIGH, CRITICAL |
| `performance_score` | Integer | 0-100 performance rating |
| `contract_status` | String(50) | active, pending, expired, etc. |
| `contract_start_date` | DateTime | Contract start date |
| `contract_end_date` | DateTime | Contract expiration date |
| `zip_status` | String(50) | ZIP platform specific status |
| `zip_vendor_id` | String(100) | External ZIP vendor ID |
| `w9_form` | Boolean | W-9 form uploaded |
| `insurance` | Boolean | Insurance certificate uploaded |
| `financial_statements` | Boolean | Financial statements uploaded |
| `compliance_certs` | Boolean | Compliance certificates uploaded |
| `security_policy` | Boolean | Security policy uploaded |
| `notes` | Text | Internal notes |
| `created_at` | DateTime | Record creation timestamp |
| `updated_at` | DateTime | Last update timestamp |
| `approved_at` | DateTime | Approval timestamp |
| `last_activity` | DateTime | Last activity timestamp |

### 2. **vendor_purchase_orders**
Tracks purchase orders associated with vendors.

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer | Primary key |
| `vendor_id` | Integer | Foreign key to vendors table |
| `po_number` | String(50) | Unique PO number |
| `description` | Text | PO description |
| `amount` | Float | PO amount |
| `status` | String(50) | open, fulfilled, cancelled, etc. |
| `order_date` | DateTime | Order placed date |
| `delivery_date` | DateTime | Expected/actual delivery date |
| `created_at` | DateTime | Record creation timestamp |
| `updated_at` | DateTime | Last update timestamp |

## API Endpoints

### Vendor Management

#### Create Vendor
```http
POST /api/vendors
Authorization: Bearer {token}
Content-Type: application/json

{
  "company_name": "Tech Solutions Inc.",
  "tax_id": "12-3456789",
  "business_type": "Corporation",
  "industry": "Technology",
  "website": "https://techsolutions.com",
  "contact_name": "John Smith",
  "contact_email": "john.smith@techsolutions.com",
  "contact_phone": "(555) 123-4567",
  "contact_title": "VP of Sales",
  "street": "123 Tech Street",
  "city": "San Francisco",
  "state": "CA",
  "zip_code": "94105",
  "country": "US",
  "notes": "New vendor onboarding"
}
```

#### Get All Vendors
```http
GET /api/vendors?status=approved&risk_rating=low
Authorization: Bearer {token}
```

Query Parameters:
- `status`: Filter by onboarding status (pending, in_review, approved, rejected, suspended)
- `risk_rating`: Filter by risk rating (low, medium, high, critical)

#### Get Single Vendor
```http
GET /api/vendors/{vendor_id}
Authorization: Bearer {token}
```

#### Update Vendor
```http
PUT /api/vendors/{vendor_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "company_name": "Updated Company Name",
  "performance_score": 95,
  ...
}
```

#### Update Vendor Status
```http
PATCH /api/vendors/{vendor_id}/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "approved"
}
```

#### Update Vendor Documents
```http
PATCH /api/vendors/{vendor_id}/documents
Authorization: Bearer {token}
Content-Type: application/json

{
  "w9_form": true,
  "insurance": true,
  "financial_statements": true,
  "compliance_certs": true,
  "security_policy": true
}
```

#### Delete Vendor
```http
DELETE /api/vendors/{vendor_id}
Authorization: Bearer {token}
```

## Vendor Onboarding Workflow

### Phase 1: Initial Submission (NOT_STARTED → DOCUMENTS_PENDING)
- Vendor submits basic company information
- Status: `PENDING`
- Phase: `DOCUMENTS_PENDING`

### Phase 2: Document Upload (DOCUMENTS_PENDING → UNDER_REVIEW)
- Vendor uploads required documents:
  - W-9 Form
  - Insurance Certificate
  - Financial Statements
  - Compliance Certificates
  - Security Policy
- Status: `IN_REVIEW`
- Phase: `UNDER_REVIEW`

### Phase 3: Internal Review (UNDER_REVIEW → COMPLIANCE_CHECK)
- Internal team reviews documents
- Risk assessment performed
- Phase: `COMPLIANCE_CHECK`

### Phase 4: Compliance Verification (COMPLIANCE_CHECK → COMPLETED)
- Compliance team verifies all requirements
- Decision made: APPROVED or REJECTED
- Phase: `COMPLETED`

### Phase 5: Active Vendor
- Status: `APPROVED`
- Can now receive purchase orders
- Performance tracked via `performance_score`

## ZIP Integration Fields

- `zip_status`: Syncs with ZIP platform status
- `zip_vendor_id`: External vendor ID in ZIP system
- Used for bidirectional synchronization

## Risk Rating System

| Rating | Criteria |
|--------|----------|
| **LOW** | All documents verified, good performance history (>85 score) |
| **MEDIUM** | Some documents pending, average performance (60-85 score) |
| **HIGH** | Missing critical documents, below average performance (<60 score) |
| **CRITICAL** | Multiple compliance issues, suspended vendors |

## Database Initialization

To initialize the vendor database with sample data:

```bash
cd /Users/jeet/doordash-p2p/backend
source venv/bin/activate
python init_vendors.py
```

This creates 5 sample vendors with varying statuses for testing.

## Frontend Integration

The vendor data can be accessed in the ZIP Dashboard and Vendor Management screens:
- `/zip-dashboard` - Overview of vendor metrics
- `/vendor-management` - Full CRUD interface for vendor management

## Next Steps

1. **Vendor Portal**: Create a separate interface where vendors can:
   - Submit their information
   - Upload documents
   - Track onboarding progress
   - View purchase orders

2. **Notifications**: Add email notifications for:
   - New vendor submissions
   - Document uploads
   - Status changes
   - PO assignments

3. **Analytics**: Track vendor performance metrics:
   - On-time delivery rate
   - Quality scores
   - Spend analysis
   - Risk trends
