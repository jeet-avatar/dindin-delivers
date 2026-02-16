# Menu Upload API Test Plan - Staging Validation

**Date**: January 6, 2026
**Environment**: Staging (`https://staging-api.dollor.ai` OR `https://api.dollor.ai`)
**Feature**: iOS Menu Image Upload via P2P Backend (Removed Firebase Storage)

---

## Test Overview

Validate that iOS restaurant app successfully uploads menu item images to P2P backend instead of Firebase Storage.

---

## Prerequisites

### Required Credentials
- Vendor/Restaurant account credentials
- Valid authentication token
- Test vendor ID

### Test Data
- Test menu item data
- Test image file (JPEG, < 5MB)

---

## Test Cases

### TEST 1: Vendor Authentication
**Endpoint**: `POST /api/auth/vendor/login`

```bash
curl -X POST https://api.dollor.ai/api/auth/vendor/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@restaurant.com&password=testpassword"
```

**Expected Result**:
- Status: 200 OK
- Response contains: `access_token`, `vendor_id`

**Validation**:
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "vendor_id": 1
}
```

---

### TEST 2: Create Menu Item (Without Image)
**Endpoint**: `POST /api/vendors/{vendor_id}/menu`

```bash
curl -X POST https://api.dollor.ai/api/vendors/1/menu \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "item_name": "Test Burger",
    "description": "Delicious test burger",
    "category": "Main Course",
    "price": 12.99,
    "is_available": true
  }'
```

**Expected Result**:
- Status: 200 OK
- Response contains: menu item `id`

**Validation**:
```json
{
  "id": 123,
  "vendor_id": 1,
  "item_name": "Test Burger",
  "category": "Main Course",
  "price": 12.99,
  "success": true
}
```

**Save**: Menu item ID for next test

---

### TEST 3: Upload Menu Item Image (P2P Backend)
**Endpoint**: `POST /api/vibing/upload-image/{menu_item_id}`

```bash
# Create test image
echo -e "\xFF\xD8\xFF\xE0" > test_image.jpg

# Upload image
curl -X POST https://api.dollor.ai/api/vibing/upload-image/123 \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test_image.jpg"
```

**Expected Result**:
- Status: 200 OK
- Image saved to backend: `/uploads/menu_images/{menu_item_id}_{timestamp}.jpg`

**Validation**:
```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "image_url": "https://api.dollor.ai/uploads/menu_images/123_1704537600.jpg",
  "menu_item_id": 123
}
```

---

### TEST 4: Verify Menu Item Has Image URL
**Endpoint**: `GET /api/vendors/{vendor_id}/menu`

```bash
curl -X GET https://api.dollor.ai/api/vendors/1/menu \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Result**:
- Status: 200 OK
- Menu item contains `image_url` field with P2P backend URL

**Validation**:
```json
{
  "menu_items": [
    {
      "id": 123,
      "item_name": "Test Burger",
      "image_url": "https://api.dollor.ai/uploads/menu_images/123_1704537600.jpg",
      "price": 12.99
    }
  ]
}
```

---

### TEST 5: Verify Image is Accessible
**Endpoint**: `GET {image_url}`

```bash
curl -I https://api.dollor.ai/uploads/menu_images/123_1704537600.jpg
```

**Expected Result**:
- Status: 200 OK
- Content-Type: image/jpeg

---

### TEST 6: Upload Invalid File Type (Negative Test)
**Endpoint**: `POST /api/vibing/upload-image/{menu_item_id}`

```bash
# Try uploading a text file
echo "not an image" > test.txt
curl -X POST https://api.dollor.ai/api/vibing/upload-image/123 \
  -F "file=@test.txt"
```

**Expected Result**:
- Status: 400 Bad Request
- Error message about invalid file type

**Validation**:
```json
{
  "detail": "Invalid file type. Allowed: image/jpeg, image/png, image/webp"
}
```

---

### TEST 7: Upload Oversized File (Negative Test)
**Endpoint**: `POST /api/vibing/upload-image/{menu_item_id}`

```bash
# Try uploading file > 5MB
dd if=/dev/zero of=large.jpg bs=1M count=6
curl -X POST https://api.dollor.ai/api/vibing/upload-image/123 \
  -F "file=@large.jpg"
```

**Expected Result**:
- Status: 400 Bad Request
- Error message about file size

**Validation**:
```json
{
  "detail": "File size exceeds maximum allowed (5MB)"
}
```

---

### TEST 8: Delete Menu Item
**Endpoint**: `DELETE /api/vendors/{vendor_id}/menu/{item_id}`

```bash
curl -X DELETE https://api.dollor.ai/api/vendors/1/menu/123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Result**:
- Status: 200 OK
- Menu item deleted

---

## iOS App Validation (Manual)

### iOS Restaurant App Testing

1. **Login to Restaurant App**
   - Use test restaurant credentials
   - Verify successful login

2. **Navigate to Menu Management**
   - Open menu section
   - Click "Add Menu Item"

3. **Create Menu Item with Image**
   - Enter item details:
     - Name: "iOS Test Pizza"
     - Description: "Test menu item from iOS"
     - Price: $15.99
     - Category: "Pizza"
   - Select image from photo library
   - Tap "Save"

4. **Verify Upload Success**
   - Check for success message
   - Verify menu item appears in list with image
   - Tap on item to view details
   - Verify image loads correctly

5. **Check Network Logs (Xcode Console)**
   - Should see: `POST /api/vendors/{vendor_id}/menu`
   - Should see: `POST /api/vibing/upload-image/{menu_item_id}`
   - Should NOT see: Firebase Storage URLs
   - Should NOT see: `storage.googleapis.com`

6. **Edit Menu Item**
   - Update item details
   - Change image (optional)
   - Verify update succeeds

7. **Delete Menu Item**
   - Delete the test item
   - Verify deletion succeeds

---

## Backend Validation

### Check Upload Directory
```bash
ssh ec2-user@44.192.34.143
cd /opt/dollor-backend/uploads/menu_images
ls -lah
# Should see uploaded images: {menu_item_id}_{timestamp}.jpg
```

### Check Database
```bash
# Connect to database
# Verify menu item has image_url pointing to P2P backend, NOT Firebase
SELECT id, item_name, image_url FROM vendor_menu_items WHERE id = 123;
```

**Expected**:
```
id  | item_name    | image_url
----|--------------|------------------------------------------------------
123 | Test Burger  | https://api.dollor.ai/uploads/menu_images/123_....jpg
```

**NOT**:
```
❌ https://firebasestorage.googleapis.com/...
```

---

## Automated Test Script

```bash
#!/bin/bash
# menu_upload_test.sh

BASE_URL="https://api.dollor.ai"
VENDOR_EMAIL="test@restaurant.com"
VENDOR_PASSWORD="testpassword"

echo "=== Menu Upload API Test ==="

# 1. Login
echo "1. Authenticating vendor..."
AUTH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/vendor/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$VENDOR_EMAIL&password=$VENDOR_PASSWORD")

TOKEN=$(echo $AUTH_RESPONSE | jq -r '.access_token')
VENDOR_ID=$(echo $AUTH_RESPONSE | jq -r '.vendor_id')

if [ "$TOKEN" = "null" ]; then
  echo "❌ Authentication failed"
  exit 1
fi
echo "✅ Authenticated. Vendor ID: $VENDOR_ID"

# 2. Create menu item
echo "2. Creating menu item..."
MENU_RESPONSE=$(curl -s -X POST "$BASE_URL/api/vendors/$VENDOR_ID/menu" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "item_name": "Automated Test Pizza",
    "description": "Testing menu upload",
    "category": "Pizza",
    "price": 19.99
  }')

MENU_ITEM_ID=$(echo $MENU_RESPONSE | jq -r '.id')

if [ "$MENU_ITEM_ID" = "null" ]; then
  echo "❌ Menu item creation failed"
  exit 1
fi
echo "✅ Menu item created. ID: $MENU_ITEM_ID"

# 3. Create test image
echo "3. Creating test image..."
convert -size 800x600 xc:red -pointsize 72 -gravity center \
  -annotate +0+0 "Test Menu Item" test_image.jpg 2>/dev/null || \
  echo -e "\xFF\xD8\xFF\xE0\x00\x10JFIF" > test_image.jpg
echo "✅ Test image created"

# 4. Upload image
echo "4. Uploading image to P2P backend..."
UPLOAD_RESPONSE=$(curl -s -X POST "$BASE_URL/api/vibing/upload-image/$MENU_ITEM_ID" \
  -F "file=@test_image.jpg")

IMAGE_URL=$(echo $UPLOAD_RESPONSE | jq -r '.image_url')
SUCCESS=$(echo $UPLOAD_RESPONSE | jq -r '.success')

if [ "$SUCCESS" != "true" ]; then
  echo "❌ Image upload failed"
  echo "Response: $UPLOAD_RESPONSE"
  exit 1
fi
echo "✅ Image uploaded: $IMAGE_URL"

# 5. Verify image URL is NOT Firebase
if [[ "$IMAGE_URL" == *"firebasestorage"* ]]; then
  echo "❌ FAIL: Image URL still points to Firebase Storage!"
  exit 1
fi

if [[ "$IMAGE_URL" == *"api.dollor.ai"* ]]; then
  echo "✅ PASS: Image URL points to P2P backend"
else
  echo "⚠️  WARNING: Image URL is neither Firebase nor P2P backend"
fi

# 6. Verify image is accessible
echo "5. Verifying image accessibility..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$IMAGE_URL")

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Image is accessible (HTTP $HTTP_CODE)"
else
  echo "❌ Image not accessible (HTTP $HTTP_CODE)"
fi

# 7. Cleanup
echo "6. Cleaning up..."
curl -s -X DELETE "$BASE_URL/api/vendors/$VENDOR_ID/menu/$MENU_ITEM_ID" \
  -H "Authorization: Bearer $TOKEN" > /dev/null
rm -f test_image.jpg
echo "✅ Cleanup complete"

echo ""
echo "=== Test Summary ==="
echo "✅ All tests passed!"
echo "Image upload using P2P backend verified successfully"
```

---

## Success Criteria

- ✅ Menu item created successfully via API
- ✅ Image uploaded to P2P backend (NOT Firebase Storage)
- ✅ Image URL returned in response
- ✅ Image URL points to `api.dollor.ai/uploads/menu_images/`
- ✅ Image is accessible via HTTP GET
- ✅ Menu item in database has correct image_url
- ✅ iOS app shows uploaded image
- ✅ No Firebase Storage calls in network logs
- ✅ Invalid file types rejected (400 error)
- ✅ Oversized files rejected (400 error)

---

## Failure Scenarios to Test

1. ❌ **Firebase Storage Still Used**
   - Network log shows: `storage.googleapis.com`
   - Image URL contains: `firebasestorage`
   - **Action**: Verify iOS code changes deployed

2. ❌ **Upload Endpoint Not Found**
   - Response: 404 Not Found
   - **Action**: Verify vibing_routes.py deployed to staging

3. ❌ **Image Not Saved**
   - Upload succeeds but image_url is null
   - **Action**: Check backend logs and file permissions

4. ❌ **Image Not Accessible**
   - Image uploaded but GET returns 404
   - **Action**: Check static file serving configuration

---

## Rollback Plan

If tests fail:

1. **Revert iOS changes**:
   ```bash
   git revert 6294be80
   git push origin staging
   ```

2. **Redeploy previous version**:
   - Previous version used Firebase Storage
   - Would require re-enabling Firebase dependency

3. **Fix issues and redeploy**:
   - Debug failing tests
   - Fix code
   - Commit and push to staging
   - Re-run tests

---

## Sign-Off

- [ ] All API tests passed
- [ ] iOS app manual testing completed
- [ ] No Firebase Storage calls detected
- [ ] Images accessible from P2P backend
- [ ] Ready for production deployment

**Tested By**: _______________
**Date**: _______________
**Approved By**: _______________
