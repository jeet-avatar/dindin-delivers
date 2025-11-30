#!/bin/bash

# Setup Firestore Configuration for EatFair
# This script uses Firebase CLI to add documents to Firestore

PROJECT_ID="eatfair-app"

echo "========================================"
echo "EatFair Firestore Configuration Setup"
echo "========================================"
echo ""
echo "Project: $PROJECT_ID"
echo ""

# Check if firebase CLI is available
if ! command -v firebase &> /dev/null; then
    echo "Error: Firebase CLI not found. Install with: npm install -g firebase-tools"
    exit 1
fi

# Set the project
firebase use $PROJECT_ID

echo ""
echo "Adding config/app document..."
echo ""

# Use firebase firestore:delete to clear existing and then import
# First, let's try using the REST API through a Node.js script

cat << 'NODESCRIPT' > /tmp/firestore-setup.js
const { execSync } = require('child_process');

const projectId = 'eatfair-app';

// Get access token from firebase
let accessToken;
try {
    accessToken = execSync('firebase login:ci --no-localhost 2>/dev/null || echo ""').toString().trim();
} catch (e) {
    // Try to get token another way
}

// Configuration data
const appConfig = {
    fields: {
        taxRate: { doubleValue: 0.1 },
        baseDeliveryFee: { doubleValue: 5 },
        extraStopFee: { doubleValue: 2 },
        platformFeePerRestaurant: { doubleValue: 1 },
        maxRestaurantsPerOrder: { integerValue: "3" },
        serviceFeeRate: { doubleValue: 0.05 },
        smallOrderThreshold: { doubleValue: 10 },
        smallOrderFee: { doubleValue: 2 },
        defaultTipRate: { doubleValue: 0.15 },
        nearbyDistanceMeters: { doubleValue: 3218.69 },
        maxDeliveryDistanceMiles: { doubleValue: 10 },
        restaurantCommissionRate: { doubleValue: 0.15 },
        defaultPrepTimeMinutes: { integerValue: "20" },
        maxPrepTimeMinutes: { integerValue: "60" },
        additionalPrepTimePerOrder: { integerValue: "3" },
        busyLevelThresholds: {
            mapValue: {
                fields: {
                    slow: { integerValue: "2" },
                    normal: { integerValue: "5" },
                    busy: { integerValue: "8" }
                }
            }
        },
        supportUrl: { stringValue: "https://support.eatfair.com" },
        supportPhone: { stringValue: "+1-800-EATFAIR" },
        supportEmail: { stringValue: "support@eatfair.com" },
        isDummyPaymentMode: { booleanValue: true },
        isAIFeaturesEnabled: { booleanValue: true },
        isDynamicPricingEnabled: { booleanValue: false },
        version: { stringValue: "1.0.0" }
    }
};

console.log('Configuration prepared. Use Firebase Console to import or run with Admin SDK.');
console.log(JSON.stringify(appConfig, null, 2));
NODESCRIPT

node /tmp/firestore-setup.js

echo ""
echo "========================================"
echo "MANUAL STEPS REQUIRED:"
echo "========================================"
echo ""
echo "Since Firebase CLI doesn't have a direct document create command,"
echo "please use one of these methods:"
echo ""
echo "METHOD 1: Firebase Console (Easiest)"
echo "  1. Go to: https://console.firebase.google.com/project/$PROJECT_ID/firestore"
echo "  2. Create collection 'config' with document 'app'"
echo "  3. Add the fields shown above"
echo ""
echo "METHOD 2: Use Firebase Admin SDK"
echo "  1. Download service account key from Firebase Console"
echo "  2. Save as 'firebase-service-account.json' in this directory"
echo "  3. Run: node setup-app-config.js"
echo ""
