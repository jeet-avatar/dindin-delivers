// Setup App Configuration in Firestore
//
// OPTION 1: Using Firebase Admin SDK (requires service account key)
// - Download service account key from Firebase Console:
//   Project Settings > Service accounts > Generate new private key
// - Rename the file to 'firebase-service-account.json' and place in this directory
// - Run: node setup-app-config.js
//
// OPTION 2: Manual Setup via Firebase Console
// - Go to Firebase Console > Firestore Database
// - Create collection 'config', document 'app'
// - Copy the configuration values from the console output below

const fs = require('fs');
const path = require('path');

// Check if service account file exists
const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');
const hasServiceAccount = fs.existsSync(serviceAccountPath);

// Configuration data
const appConfig = {
    // Fee Configuration
    taxRate: 0.10,                      // 10% tax
    baseDeliveryFee: 5.0,               // Base delivery fee
    extraStopFee: 2.0,                  // Fee per additional restaurant
    platformFeePerRestaurant: 1.0,      // Platform fee per restaurant
    maxRestaurantsPerOrder: 3,          // Max restaurants in one order
    serviceFeeRate: 0.05,               // 5% service fee
    smallOrderThreshold: 10.0,          // Orders under this get small order fee
    smallOrderFee: 2.0,                 // Small order fee

    // Delivery Configuration
    defaultTipRate: 0.15,               // 15% default tip suggestion
    nearbyDistanceMeters: 3218.69,      // 2 miles in meters
    maxDeliveryDistanceMiles: 10.0,     // Max delivery distance

    // Restaurant Configuration
    restaurantCommissionRate: 0.15,     // 15% commission

    // Prep Time Configuration
    defaultPrepTimeMinutes: 20,
    maxPrepTimeMinutes: 60,
    additionalPrepTimePerOrder: 3,      // Additional minutes per active order

    // Busy Level Thresholds
    busyLevelThresholds: {
        slow: 2,                        // 0-2 orders = slow
        normal: 5,                      // 3-5 orders = normal
        busy: 8                         // 6-8 orders = busy, >8 = very busy
    },

    // Support Information
    supportUrl: "https://support.eatfair.com",
    supportPhone: "+1-800-EATFAIR",
    supportEmail: "support@eatfair.com",

    // Feature Flags
    isDummyPaymentMode: true,           // Set to false for production
    isAIFeaturesEnabled: true,
    isDynamicPricingEnabled: false,

    // Metadata
    version: "1.0.0"
};

const promoCodes = [
    {
        code: "WELCOME10",
        type: "percentage",
        value: 10,
        description: "10% off your first order",
        minOrderAmount: 15.0,
        maxDiscount: 20.0,
        usageLimit: 1,
        isActive: true
    },
    {
        code: "SAVE5",
        type: "fixed",
        value: 5,
        description: "$5 off orders over $25",
        minOrderAmount: 25.0,
        maxDiscount: 5.0,
        usageLimit: null,
        isActive: true
    },
    {
        code: "FREESHIP",
        type: "delivery",
        value: 0,
        description: "Free delivery on orders over $30",
        minOrderAmount: 30.0,
        maxDiscount: 10.0,
        usageLimit: null,
        isActive: true
    }
];

async function setupWithAdminSDK() {
    const admin = require('firebase-admin');
    const serviceAccount = require(serviceAccountPath);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    const db = admin.firestore();

    console.log('Setting up EatFair App Configuration via Admin SDK...\n');

    // Add server timestamp
    const configWithTimestamp = {
        ...appConfig,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('config').doc('app').set(configWithTimestamp);
        console.log('App configuration created successfully!');

        for (const promo of promoCodes) {
            const promoWithTimestamp = {
                ...promo,
                validFrom: admin.firestore.Timestamp.now(),
                validUntil: admin.firestore.Timestamp.fromDate(new Date('2025-12-31')),
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };
            await db.collection('promotions').doc(promo.code).set(promoWithTimestamp);
            console.log(`Created promo code: ${promo.code}`);
        }

        console.log('\nSetup complete!');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

function showManualInstructions() {
    console.log('='.repeat(70));
    console.log('FIREBASE SERVICE ACCOUNT NOT FOUND');
    console.log('='.repeat(70));
    console.log('\nTo use the Admin SDK, download your service account key:');
    console.log('1. Go to Firebase Console > Project Settings > Service accounts');
    console.log('2. Click "Generate new private key"');
    console.log('3. Save as "firebase-service-account.json" in this directory');
    console.log('4. Run this script again\n');

    console.log('='.repeat(70));
    console.log('MANUAL SETUP INSTRUCTIONS');
    console.log('='.repeat(70));
    console.log('\nAlternatively, manually add this data to Firebase Console:\n');

    console.log('1. Go to Firebase Console > Firestore Database');
    console.log('2. Create collection: "config"');
    console.log('3. Create document with ID: "app"');
    console.log('4. Add the following fields:\n');

    console.log('--- APP CONFIGURATION (config/app) ---');
    console.log(JSON.stringify(appConfig, null, 2));

    console.log('\n5. Create collection: "promotions"');
    console.log('6. Create documents for each promo code:\n');

    console.log('--- PROMO CODES (promotions/*) ---');
    promoCodes.forEach(promo => {
        console.log(`\nDocument ID: "${promo.code}"`);
        console.log(JSON.stringify(promo, null, 2));
    });

    console.log('\n' + '='.repeat(70));
    console.log('After adding the configuration, your apps will load it on startup.');
    console.log('='.repeat(70));
}

// Main
if (hasServiceAccount) {
    setupWithAdminSDK();
} else {
    showManualInstructions();
}
