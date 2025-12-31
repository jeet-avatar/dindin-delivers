# Firebase Setup Instructions

## 🔥 Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Click "Add project"
3. Project name: **EatFair-Delivery**
4. Enable Google Analytics (recommended)
5. Click "Create project"

## 📱 Step 2: Add Android Apps to Firebase

You need to add **3 separate Android apps** to your Firebase project:

### App 1: Customer App
- **Android package name**: `com.eatfair.app`
- **App nickname**: EatFair Customer
- **Debug signing certificate SHA-1**: (Get from Android Studio or run command below)

### App 2: Partner App
- **Android package name**: `com.eatfair.partner`
- **App nickname**: EatFair Partner
- **Debug signing certificate SHA-1**: (Same as above)

### App 3: Delivery App
- **Android package name**: `com.eatfair.orderapp`
- **App nickname**: EatFair Delivery
- **Debug signing certificate SHA-1**: (Same as above)

## 🔑 Get SHA-1 Certificate

Run this command in your project directory:

```bash
cd android
./gradlew signingReport
```

Or use keytool:
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

## 📥 Step 3: Download Configuration Files

After adding each app, download the `google-services.json` file:

1. **For Customer App**: Download and place at:
   ```
   app/google-services.json
   ```

2. **For Partner App**: Download and place at:
   ```
   partner/google-services.json
   ```

3. **For Delivery App**: Download and place at:
   ```
   orderapp/google-services.json
   ```

## ⚙️ Step 4: Enable Firebase Services

In Firebase Console, enable these services:

### 1. Authentication
- Go to **Authentication** → **Sign-in method**
- Enable:
  - ✅ Email/Password
  - ✅ Google
  - ✅ Phone (optional, for OTP)

### 2. Firestore Database
- Go to **Firestore Database**
- Click **Create database**
- Start in **Test mode** (for development)
- Choose location: **us-central** (or closest to your users)

### 3. Cloud Storage
- Go to **Storage**
- Click **Get started**
- Start in **Test mode**

### 4. Cloud Messaging (FCM)
- Already enabled by default
- Note down the **Server Key** from Project Settings → Cloud Messaging

## 🔐 Step 5: Set Up Firestore Security Rules

In Firestore Database → Rules, paste this:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isSignedIn();
      allow write: if isOwner(userId);
    }
    
    // Restaurants collection
    match /restaurants/{restaurantId} {
      allow read: if true; // Public read
      allow write: if isSignedIn() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'partner';
    }
    
    // Menu items
    match /menu_items/{itemId} {
      allow read: if true; // Public read
      allow write: if isSignedIn() && 
        get(/databases/$(database)/documents/restaurants/$(resource.data.restaurantId)).data.ownerId == request.auth.uid;
    }
    
    // Orders
    match /orders/{orderId} {
      allow read: if isSignedIn() && (
        resource.data.customerId == request.auth.uid ||
        resource.data.partnerId == request.auth.uid ||
        resource.data.driverId == request.auth.uid
      );
      allow create: if isSignedIn();
      allow update: if isSignedIn() && (
        resource.data.partnerId == request.auth.uid ||
        resource.data.driverId == request.auth.uid
      );
    }
    
    // Addresses
    match /addresses/{addressId} {
      allow read, write: if isOwner(resource.data.userId);
    }
    
    // Notifications
    match /notifications/{notificationId} {
      allow read, write: if isOwner(resource.data.userId);
    }
  }
}
```

## 📦 Step 6: I'll Add Dependencies

I'll now update your project files to include Firebase dependencies.

## ✅ Checklist

- [ ] Created Firebase project
- [ ] Added 3 Android apps
- [ ] Downloaded 3 google-services.json files
- [ ] Placed files in correct locations
- [ ] Enabled Authentication
- [ ] Created Firestore Database
- [ ] Enabled Cloud Storage
- [ ] Set up Firestore Security Rules

Once you complete these steps, I'll proceed with the code integration!
