#!/bin/bash

echo "🚀 Starting DoorDash P2P with Stripe Integration"
echo "================================================"

cd backend

# Check virtual environment
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found! Creating one..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies including Stripe
echo ""
echo "📦 Installing dependencies..."
pip install -q stripe==7.8.0 email-validator==2.1.0

# Update database with new tables
echo ""
echo "🗄️  Updating database with payment tables..."
python update_db_stripe.py

# Start backend
echo ""
echo "✅ Setup complete! Starting backend on port 3000..."
echo ""
echo "📍 API Documentation: http://localhost:3000/docs"
echo "📍 Test Order Endpoint: http://localhost:3000/api/orders"
echo ""
echo "💳 Stripe Test Cards:"
echo "   Success: 4242 4242 4242 4242"
echo "   Decline: 4000 0000 0000 0002"
echo ""
echo "⚡ Webhook Setup:"
echo "   1. Install Stripe CLI: brew install stripe/stripe-cli/stripe"
echo "   2. Login: stripe login"
echo "   3. Forward webhooks: stripe listen --forward-to localhost:3000/api/webhooks/stripe"
echo "   4. Copy webhook secret to .env"
echo ""

python main_new.py
