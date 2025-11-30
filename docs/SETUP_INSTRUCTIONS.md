# 🚀 Automated Firestore Setup

## Prerequisites

1. **Node.js** installed (v16 or higher)
2. **Firebase CLI** (will install automatically)

## Step 1: Login to Firebase

```bash
npx firebase login
```

This will open your browser to authenticate with your Google account.

## Step 2: Install Dependencies

```bash
cd /Users/jeet/StudioProjects/eatfair-ios
npm install
```

This will install:
- `firebase-admin` - Firebase Admin SDK
- `firebase-tools` - Firebase CLI

## Step 3: Run Setup Script

```bash
npm run setup
```

This script will:
- ✅ Create `ratings` collection with test data
- ✅ Create `driver_sessions` collection
- ✅ Create `promotions` collection
- ✅ Create `tips` collection
- ✅ Create `promotion_usage` collection
- ✅ Update existing drivers with stats object
- ✅ Update existing orders with new fields

## Step 4: Update Restaurant ID

After running the script, you need to manually update the promotion:

1. Open **Firebase Console** → **Firestore**
2. Go to `promotions` collection
3. Open document `promo_save20`
4. Update `restaurantId` field with a real restaurant ID from your `restaurants` collection

## Step 5: Deploy Security Rules

```bash
firebase deploy --only firestore:rules
```

Or use npm script:
```bash
npm run deploy-rules
```

## Step 6: Deploy Indexes

```bash
firebase deploy --only firestore:indexes
```

Or use npm script:
```bash
npm run deploy-indexes
```

Wait 5-10 minutes for indexes to build.

## Step 7: Verify Setup

Check Firebase Console to confirm:
- [ ] 5 new collections created
- [ ] Test documents exist in each collection
- [ ] Existing drivers have `stats` object
- [ ] Existing orders have new fields
- [ ] Security rules deployed
- [ ] All indexes are building/built

## Alternative: Manual Firebase Console Setup

If you prefer not to use the script, follow the manual steps in `DEPLOYMENT_SUMMARY.md`.

## Troubleshooting

### Error: "Cannot find module 'firebase-admin'"
**Fix:** Run `npm install` first

### Error: "Permission denied"
**Fix:** Ensure `serviceAccountKey.json` is valid and has admin permissions

### Error: "Collection already exists"
**Fix:** Script will update existing documents, this is normal

### Error: "restaurantId not found"
**Fix:** Update the `restaurantId` in the script or manually in Firebase Console after running

## What Gets Created

### Collections Created:
1. **ratings** - Driver ratings by customers
2. **driver_sessions** - Driver online/offline sessions
3. **promotions** - Restaurant promotional codes
4. **tips** - Customer tips for drivers
5. **promotion_usage** - Tracks promotion code usage

### Documents Updated:
- **drivers** - Added `stats` object with 10 fields
- **orders** - Added 11 new fields for promotions, tips, ratings

## Security Notes

🔒 **Never commit these files:**
- `serviceAccountKey.json` - Contains sensitive credentials
- Add to `.gitignore`:
```
serviceAccountKey.json
node_modules/
```

## Success Output

You should see:
```
🚀 Starting Firestore setup...

📝 Creating ratings collection...
✅ Ratings collection created

📝 Creating driver_sessions collection...
✅ Driver sessions collection created

📝 Creating promotions collection...
✅ Promotions collection created

📝 Creating tips collection...
✅ Tips collection created

📝 Creating promotion_usage collection...
✅ Promotion usage collection created

📝 Updating drivers with stats...
✅ Updated 5 drivers with stats

📝 Updating orders with new fields...
✅ Updated 10 orders with new fields

🎉 Firestore setup complete!

📋 Summary:
   - Created 5 new collections
   - Updated 5 driver documents
   - Updated 10 order documents

⚠️  IMPORTANT: Update the restaurantId in promotions collection manually
```

## Next Steps

After successful setup:
1. Test promotion code "SAVE20" in Customer app
2. Test driver rating in Customer app
3. Test tip addition in Customer app
4. Test session tracking in Delivery app
5. Test promotions tab in Restaurant app

Done! 🎉
