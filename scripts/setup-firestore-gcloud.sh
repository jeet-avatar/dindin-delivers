#!/bin/bash

# Setup Firestore using gcloud CLI
# Run: bash setup-firestore-gcloud.sh

GCLOUD="$HOME/google-cloud-sdk/bin/gcloud"
PROJECT_ID="eatfair-app"

echo "========================================"
echo "EatFair Firestore Setup with gcloud"
echo "========================================"
echo ""

# Check if gcloud is installed
if [ ! -f "$GCLOUD" ]; then
    echo "Error: gcloud not found at $GCLOUD"
    echo "Please run: curl https://sdk.cloud.google.com | bash"
    exit 1
fi

# Check if authenticated
AUTH_STATUS=$($GCLOUD auth list --format="value(account)" 2>/dev/null | head -1)
if [ -z "$AUTH_STATUS" ]; then
    echo "Not authenticated. Running gcloud auth login..."
    $GCLOUD auth login
fi

# Set project
$GCLOUD config set project $PROJECT_ID

# Get access token
ACCESS_TOKEN=$($GCLOUD auth print-access-token)

if [ -z "$ACCESS_TOKEN" ]; then
    echo "Error: Could not get access token"
    exit 1
fi

echo ""
echo "Authenticated successfully!"
echo "Creating Firestore documents..."
echo ""

# Create config/app document
echo "Creating config/app..."
curl -s -X PATCH \
  "https://firestore.googleapis.com/v1/projects/$PROJECT_ID/databases/(default)/documents/config/app?updateMask.fieldPaths=taxRate&updateMask.fieldPaths=baseDeliveryFee&updateMask.fieldPaths=extraStopFee&updateMask.fieldPaths=platformFeePerRestaurant&updateMask.fieldPaths=maxRestaurantsPerOrder&updateMask.fieldPaths=serviceFeeRate&updateMask.fieldPaths=smallOrderThreshold&updateMask.fieldPaths=smallOrderFee&updateMask.fieldPaths=defaultTipRate&updateMask.fieldPaths=nearbyDistanceMeters&updateMask.fieldPaths=maxDeliveryDistanceMiles&updateMask.fieldPaths=restaurantCommissionRate&updateMask.fieldPaths=defaultPrepTimeMinutes&updateMask.fieldPaths=maxPrepTimeMinutes&updateMask.fieldPaths=additionalPrepTimePerOrder&updateMask.fieldPaths=busyLevelThresholds&updateMask.fieldPaths=supportUrl&updateMask.fieldPaths=supportPhone&updateMask.fieldPaths=supportEmail&updateMask.fieldPaths=isDummyPaymentMode&updateMask.fieldPaths=isAIFeaturesEnabled&updateMask.fieldPaths=isDynamicPricingEnabled&updateMask.fieldPaths=version" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fields": {
      "taxRate": {"doubleValue": 0.1},
      "baseDeliveryFee": {"doubleValue": 5},
      "extraStopFee": {"doubleValue": 2},
      "platformFeePerRestaurant": {"doubleValue": 1},
      "maxRestaurantsPerOrder": {"integerValue": "3"},
      "serviceFeeRate": {"doubleValue": 0},
      "smallOrderThreshold": {"doubleValue": 10},
      "smallOrderFee": {"doubleValue": 2},
      "defaultTipRate": {"doubleValue": 0.15},
      "nearbyDistanceMeters": {"doubleValue": 3218.69},
      "maxDeliveryDistanceMiles": {"doubleValue": 10},
      "restaurantCommissionRate": {"doubleValue": 0},
      "defaultPrepTimeMinutes": {"integerValue": "20"},
      "maxPrepTimeMinutes": {"integerValue": "60"},
      "additionalPrepTimePerOrder": {"integerValue": "3"},
      "busyLevelThresholds": {
        "mapValue": {
          "fields": {
            "slow": {"integerValue": "2"},
            "normal": {"integerValue": "5"},
            "busy": {"integerValue": "8"}
          }
        }
      },
      "supportUrl": {"stringValue": "https://support.eatfair.com"},
      "supportPhone": {"stringValue": "+1-800-EATFAIR"},
      "supportEmail": {"stringValue": "support@eatfair.com"},
      "isDummyPaymentMode": {"booleanValue": true},
      "isAIFeaturesEnabled": {"booleanValue": true},
      "isDynamicPricingEnabled": {"booleanValue": false},
      "version": {"stringValue": "1.0.0"}
    }
  }' > /dev/null && echo "✓ config/app created"

# Create WELCOME10 promo
echo "Creating promotions/WELCOME10..."
curl -s -X PATCH \
  "https://firestore.googleapis.com/v1/projects/$PROJECT_ID/databases/(default)/documents/promotions/WELCOME10?updateMask.fieldPaths=code&updateMask.fieldPaths=type&updateMask.fieldPaths=value&updateMask.fieldPaths=description&updateMask.fieldPaths=minOrderAmount&updateMask.fieldPaths=maxDiscount&updateMask.fieldPaths=usageLimit&updateMask.fieldPaths=isActive" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fields": {
      "code": {"stringValue": "WELCOME10"},
      "type": {"stringValue": "percentage"},
      "value": {"integerValue": "10"},
      "description": {"stringValue": "10% off your first order"},
      "minOrderAmount": {"doubleValue": 15},
      "maxDiscount": {"doubleValue": 20},
      "usageLimit": {"integerValue": "1"},
      "isActive": {"booleanValue": true}
    }
  }' > /dev/null && echo "✓ promotions/WELCOME10 created"

# Create SAVE5 promo
echo "Creating promotions/SAVE5..."
curl -s -X PATCH \
  "https://firestore.googleapis.com/v1/projects/$PROJECT_ID/databases/(default)/documents/promotions/SAVE5?updateMask.fieldPaths=code&updateMask.fieldPaths=type&updateMask.fieldPaths=value&updateMask.fieldPaths=description&updateMask.fieldPaths=minOrderAmount&updateMask.fieldPaths=maxDiscount&updateMask.fieldPaths=isActive" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fields": {
      "code": {"stringValue": "SAVE5"},
      "type": {"stringValue": "fixed"},
      "value": {"integerValue": "5"},
      "description": {"stringValue": "$5 off orders over $25"},
      "minOrderAmount": {"doubleValue": 25},
      "maxDiscount": {"doubleValue": 5},
      "isActive": {"booleanValue": true}
    }
  }' > /dev/null && echo "✓ promotions/SAVE5 created"

# Create FREESHIP promo
echo "Creating promotions/FREESHIP..."
curl -s -X PATCH \
  "https://firestore.googleapis.com/v1/projects/$PROJECT_ID/databases/(default)/documents/promotions/FREESHIP?updateMask.fieldPaths=code&updateMask.fieldPaths=type&updateMask.fieldPaths=value&updateMask.fieldPaths=description&updateMask.fieldPaths=minOrderAmount&updateMask.fieldPaths=maxDiscount&updateMask.fieldPaths=isActive" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fields": {
      "code": {"stringValue": "FREESHIP"},
      "type": {"stringValue": "delivery"},
      "value": {"integerValue": "0"},
      "description": {"stringValue": "Free delivery on orders over $30"},
      "minOrderAmount": {"doubleValue": 30},
      "maxDiscount": {"doubleValue": 10},
      "isActive": {"booleanValue": true}
    }
  }' > /dev/null && echo "✓ promotions/FREESHIP created"

echo ""
echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo "Your apps will now load configuration from Firebase."
echo "View in console: https://console.firebase.google.com/project/$PROJECT_ID/firestore/data"
