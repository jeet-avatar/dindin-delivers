# Populate Sample Data for iOS Apps

This script creates realistic sample data in Firebase Firestore so all iOS apps display properly with rich content.

## What Gets Created

### 🍽️ **Restaurants (3)**
- Golden Dragon (Chinese)
- La Taqueria (Mexican)  
- House of Prime Rib (Steakhouse)

### 📦 **Available Orders (3)**
- Ready for driver pickup
- Different price ranges ($32 - $165)
- Various locations in San Francisco

### 🎁 **Promotions (3)**
- SAVE20 - 20% off orders over $25
- FREESHIP - Free delivery over $20
- LUXURY15 - $15 off orders over $100

### 🚗 **Driver Sessions (2)**
- Today's session: 8 deliveries, $125.50 earnings
- Yesterday's session: 5 deliveries, $87.25 earnings

### 💰 **Tips (3)**
- $5.50, $8.00, $12.00
- Different tip types (percentage/fixed)

### ⭐ **Ratings (2)**
- 5-star and 4-star reviews with comments
- Includes driver performance metrics

## How to Run

### Option 1: Using Node.js (Recommended)

```bash
cd /Users/jeet/StudioProjects/eatfair-ios

# Install Firebase Admin if not already installed
npm install firebase-admin

# Run the script
node populate-sample-data.js
```

### Option 2: Using Firebase Console

If you prefer to add data manually:

1. Open Firebase Console → Firestore Database
2. Create each collection and document as shown in the script
3. Copy the data structure from `populate-sample-data.js`

## After Running

1. **Clean Build iOS Apps**
   - Product → Clean Build Folder (Shift + Cmd + K)
   - Delete app from device/simulator
   - Product → Run (Cmd + R)

2. **What You'll See:**

   **Delivery App:**
   - Dashboard shows earnings, online status
   - 3 premium order cards with Accept buttons
   - Recent tips displayed
   - Driver stats updated

   **Restaurant App:**
   - 3 active promotions in list
   - Usage statistics for each promo
   - Menu items organized by category

   **Customer App:**
   - 3 restaurants to browse
   - Menu items with prices
   - Active promotions available

## Verify Data

Check Firebase Console:
- `orders` collection should have 3 documents with status "Ready"
- `promotions` collection should have 3 documents  
- `restaurants` collection should have 3 documents
- `tips` collection should have 3 documents
- `driver_sessions` collection should have 2 documents
- `ratings` collection should have 2 documents

## Troubleshooting

**Error: Cannot find module 'firebase-admin'**
```bash
npm install firebase-admin
```

**Error: Service account not found**
- Make sure `google-services.json` exists in `eatfaircustomer/` folder
- Check the path in `populate-sample-data.js` line 9

**Data not showing in app**
- Clean build and reinstall app
- Check Firebase Console to verify data exists
- Check app console logs for any errors

## Clean Up Test Data

To remove all sample data later:

```javascript
// Run in Firebase Console
const collections = ['orders', 'promotions', 'restaurants', 'tips', 'driver_sessions', 'ratings'];
collections.forEach(col => {
  db.collection(col).get().then(snap => {
    snap.docs.forEach(doc => doc.ref.delete());
  });
});
```
