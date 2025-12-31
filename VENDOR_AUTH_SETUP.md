# Vendor Authentication Setup Guide

## Overview

The vendor authentication system allows restaurant owners to log in to a separate vendor portal where they can manage their restaurant independently from the admin platform.

## Architecture

### User Roles
- **ADMIN**: Platform administrators who manage the entire system
- **USER**: Regular users (legacy, for invoices)
- **VENDOR**: Restaurant owners who manage their own restaurants

### Database Changes
- Added `vendor_id` foreign key to `users` table linking to `vendors` table
- Added `VENDOR` role to `UserRole` enum

## Setup Instructions

### 1. Run Database Migration

```bash
cd backend
python migrate_vendor_auth.py
```

This will:
- Add `vendor_id` column to users table
- Create vendor user accounts for any existing approved vendors

### 2. Start Backend Server

```bash
cd backend
uvicorn main_new:app --reload --port 3000
```

### 3. Start Frontend

```bash
cd frontend
npm run dev
```

## Workflow

### For Restaurant Owners (Vendors)

1. **Application**: Restaurant applies at `/restaurant/apply`
2. **Admin Approval**: Admin reviews and approves vendor in Vendor Management
3. **Account Creation**: When admin approves vendor (status = "APPROVED"), a user account is automatically created:
   - Email: Vendor's contact email
   - Password: `vendor{vendor_id}temp` (temporary, should be changed)
   - Role: VENDOR
   - Linked to vendor via `vendor_id`
4. **Login**: Vendor logs in at `/vendor/login`
5. **Portal Access**: Vendor can access their portal with 5 screens:
   - Dashboard (order management)
   - Menu Management (CRUD operations)
   - Earnings (financial analytics)
   - Documents (compliance uploads)
   - Settings (restaurant configuration)

### For Admins

**Manual Account Creation** (if auto-creation fails):
```bash
POST /api/vendors/{vendor_id}/create-account
{
  "password": "securepassword123"
}
```

**Check Vendor Status**:
```bash
GET /api/vendors/{vendor_id}
```

## API Endpoints

### Authentication

```bash
# Vendor Login
POST /api/auth/vendor/login
Content-Type: application/x-www-form-urlencoded
username=vendor@email.com&password=vendor123

# Regular Login (Admin/User)
POST /api/auth/login
Content-Type: application/x-www-form-urlencoded
username=admin@invoice.com&password=[YOUR_PASSWORD]
```

### Vendor Management

```bash
# Create vendor user account (Admin only)
POST /api/vendors/{vendor_id}/create-account
{
  "password": "newpassword"
}

# Update vendor status (Auto-creates account on APPROVED)
PATCH /api/vendors/{vendor_id}/status?status=approved
```

## Frontend Routes

### Public Routes
- `/login` - Admin login
- `/vendor/login` - Vendor login
- `/restaurant/apply` - Restaurant application form

### Admin Routes (requires ADMIN role)
- `/` - Admin dashboard
- `/orders` - All orders across platform
- `/vendor-management` - Manage vendors
- `/accounting/vendor-payouts` - Payout management
- All other admin screens

### Vendor Routes (requires VENDOR role)
- `/vendor/dashboard` - Vendor's orders
- `/vendor/menu` - Menu management
- `/vendor/earnings` - Earnings and payouts
- `/vendor/documents` - Document uploads
- `/vendor/settings` - Restaurant settings

## Security Notes

1. **Token-based authentication**: JWT tokens stored in localStorage
2. **Role-based access control**: Endpoints check user role
3. **Vendor data scoping**: Vendors only see their own data via `vendor_id` filtering
4. **Temporary passwords**: Auto-generated passwords should be changed on first login
5. **Account approval**: Vendor accounts only work if vendor status is "APPROVED"

## Testing

### Create Test Vendor

```bash
# 1. Apply as restaurant
POST http://localhost:3000/api/vendors/public
{
  "restaurant_name": "Test Restaurant",
  "contact_email": "test@restaurant.com",
  "contact_name": "John Doe",
  ...
}

# 2. Approve vendor (creates user account)
PATCH http://localhost:3000/api/vendors/1/status?status=approved

# 3. Login as vendor
POST http://localhost:3000/api/auth/vendor/login
username=test@restaurant.com&password=vendor1temp
```

### Access Vendor Portal

1. Navigate to http://localhost:5173/vendor/login
2. Login with vendor credentials
3. Access dashboard, menu, earnings, documents, settings

## Troubleshooting

**"Vendor account is not approved"**
- Check vendor status in database: `SELECT onboarding_status FROM vendors WHERE id = X`
- Update status: `UPDATE vendors SET onboarding_status = 'approved' WHERE id = X`

**"User account not linked to a vendor"**
- Check user's vendor_id: `SELECT vendor_id FROM users WHERE email = 'vendor@email.com'`
- Link manually: `UPDATE users SET vendor_id = X WHERE email = 'vendor@email.com'`

**Can't login**
- Verify user exists: `SELECT * FROM users WHERE email = 'vendor@email.com'`
- Verify role: `SELECT role FROM users WHERE email = 'vendor@email.com'` (should be 'vendor')
- Reset password: Use bcrypt to hash new password and update `password_hash`

## Future Enhancements

- Email notifications with login credentials
- Password reset functionality
- First-time login password change requirement
- Multi-factor authentication
- Vendor invite system
- Role permissions management UI
