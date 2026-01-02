#!/usr/bin/env node

// Setup Firestore Configuration using Firebase CLI authentication
// Run with: node setup-config-cli.js

const { execSync } = require('child_process');
const https = require('https');

const PROJECT_ID = 'eatfair-app';

// App configuration
const appConfig = {
    taxRate: 0.1,
    baseDeliveryFee: 5,
    extraStopFee: 2,
    platformFeePerRestaurant: 1,
    maxRestaurantsPerOrder: 3,
    serviceFeeRate: 0.0,              // DEPRECATED: Dollor.ai uses flat $1 fees
    smallOrderThreshold: 10,
    smallOrderFee: 2,
    defaultTipRate: 0.15,
    nearbyDistanceMeters: 3218.69,
    maxDeliveryDistanceMiles: 10,
    restaurantCommissionRate: 0.0,    // DEPRECATED: Dollor.ai uses flat $1 fees
    defaultPrepTimeMinutes: 20,
    maxPrepTimeMinutes: 60,
    additionalPrepTimePerOrder: 3,
    busyLevelThresholds: {
        slow: 2,
        normal: 5,
        busy: 8
    },
    supportUrl: "https://support.eatfair.com",
    supportPhone: "+1-800-EATFAIR",
    supportEmail: "support@eatfair.com",
    isDummyPaymentMode: true,
    isAIFeaturesEnabled: true,
    isDynamicPricingEnabled: false,
    version: "1.0.0"
};

const promoCodes = {
    WELCOME10: {
        code: "WELCOME10",
        type: "percentage",
        value: 10,
        description: "10% off your first order",
        minOrderAmount: 15,
        maxDiscount: 20,
        usageLimit: 1,
        isActive: true
    },
    SAVE5: {
        code: "SAVE5",
        type: "fixed",
        value: 5,
        description: "$5 off orders over $25",
        minOrderAmount: 25,
        maxDiscount: 5,
        isActive: true
    },
    FREESHIP: {
        code: "FREESHIP",
        type: "delivery",
        value: 0,
        description: "Free delivery on orders over $30",
        minOrderAmount: 30,
        maxDiscount: 10,
        isActive: true
    }
};

// Convert JS object to Firestore REST API format
function toFirestoreValue(value) {
    if (value === null || value === undefined) {
        return { nullValue: null };
    }
    if (typeof value === 'boolean') {
        return { booleanValue: value };
    }
    if (typeof value === 'number') {
        if (Number.isInteger(value)) {
            return { integerValue: String(value) };
        }
        return { doubleValue: value };
    }
    if (typeof value === 'string') {
        return { stringValue: value };
    }
    if (Array.isArray(value)) {
        return {
            arrayValue: {
                values: value.map(toFirestoreValue)
            }
        };
    }
    if (typeof value === 'object') {
        const fields = {};
        for (const [k, v] of Object.entries(value)) {
            fields[k] = toFirestoreValue(v);
        }
        return { mapValue: { fields } };
    }
    return { stringValue: String(value) };
}

function toFirestoreDocument(obj) {
    const fields = {};
    for (const [key, value] of Object.entries(obj)) {
        fields[key] = toFirestoreValue(value);
    }
    return { fields };
}

// Get access token from Firebase CLI
function getAccessToken() {
    try {
        // Firebase CLI stores tokens that we can use
        const result = execSync('firebase login:ci --no-localhost 2>&1 || true', {
            encoding: 'utf-8',
            timeout: 5000
        });

        // Try another approach - use gcloud if available
        try {
            const token = execSync('gcloud auth print-access-token 2>/dev/null', {
                encoding: 'utf-8'
            }).trim();
            if (token && token.length > 20) {
                return token;
            }
        } catch (e) {}

        return null;
    } catch (e) {
        return null;
    }
}

// Make REST API request to Firestore
function createDocument(collection, docId, data) {
    return new Promise((resolve, reject) => {
        const accessToken = getAccessToken();

        if (!accessToken) {
            console.log('\nNo access token available. Using alternative method...\n');
            reject(new Error('No access token'));
            return;
        }

        const document = toFirestoreDocument(data);
        const postData = JSON.stringify(document);

        const options = {
            hostname: 'firestore.googleapis.com',
            port: 443,
            path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}?documentId=${docId}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(body));
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${body}`));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

async function setupWithREST() {
    console.log('Setting up Firestore via REST API...\n');

    try {
        // Create config/app document
        console.log('Creating config/app document...');
        await createDocument('config', 'app', appConfig);
        console.log('✓ config/app created successfully!\n');

        // Create promo codes
        for (const [code, data] of Object.entries(promoCodes)) {
            console.log(`Creating promotions/${code} document...`);
            await createDocument('promotions', code, data);
            console.log(`✓ promotions/${code} created successfully!`);
        }

        console.log('\n========================================');
        console.log('Setup complete! All documents created.');
        console.log('========================================\n');
    } catch (error) {
        throw error;
    }
}

// Alternative: Generate curl commands
function generateCurlCommands() {
    console.log('========================================');
    console.log('CURL COMMANDS FOR MANUAL SETUP');
    console.log('========================================\n');

    console.log('First, get your access token by running:');
    console.log('  gcloud auth print-access-token\n');
    console.log('Or install gcloud: brew install google-cloud-sdk && gcloud auth login\n');

    console.log('Then run these curl commands:\n');
    console.log('--- Create config/app ---');

    const configDoc = toFirestoreDocument(appConfig);
    console.log(`curl -X POST \\
  'https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/config?documentId=app' \\
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '${JSON.stringify(configDoc)}'`);

    console.log('\n--- Create promotions ---');
    for (const [code, data] of Object.entries(promoCodes)) {
        const promoDoc = toFirestoreDocument(data);
        console.log(`\ncurl -X POST \\
  'https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/promotions?documentId=${code}' \\
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '${JSON.stringify(promoDoc)}'`);
    }
}

// Main execution
async function main() {
    console.log('========================================');
    console.log('EatFair Firestore Configuration Setup');
    console.log(`Project: ${PROJECT_ID}`);
    console.log('========================================\n');

    try {
        await setupWithREST();
    } catch (error) {
        console.log('REST API method failed. Generating alternative methods...\n');
        generateCurlCommands();

        console.log('\n========================================');
        console.log('EASIEST METHOD: Use Firebase Console');
        console.log('========================================\n');
        console.log(`1. Go to: https://console.firebase.google.com/project/${PROJECT_ID}/firestore/data`);
        console.log('2. Click "+ Start collection"');
        console.log('3. Collection ID: config');
        console.log('4. Document ID: app');
        console.log('5. Add the fields from the JSON below:\n');
        console.log(JSON.stringify(appConfig, null, 2));
        console.log('\n6. Then create "promotions" collection with these documents:');
        console.log(JSON.stringify(promoCodes, null, 2));
    }
}

main();
