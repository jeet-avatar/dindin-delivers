#!/bin/bash

echo "🚀 DoorDash P2P - Stripe Integration Setup"
echo "=========================================="

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found!"
    echo "Run: python3 -m venv venv"
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

# Install Stripe SDK
echo ""
echo "📦 Installing Stripe SDK..."
pip install stripe==7.8.0

# Check if .env exists
if [ ! -f ".env" ]; then
    echo ""
    echo "⚠️  No .env file found!"
    echo "Copying .env.example to .env..."
    cp .env.example .env
    echo ""
    echo "🔧 IMPORTANT: Edit .env and add your Stripe keys:"
    echo "   1. Go to https://dashboard.stripe.com/test/apikeys"
    echo "   2. Copy your test API keys"
    echo "   3. Update STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY in .env"
    echo "   4. Set up webhook at https://dashboard.stripe.com/test/webhooks"
    echo "   5. Copy webhook secret to STRIPE_WEBHOOK_SECRET in .env"
else
    echo ""
    echo "✅ .env file found"
fi

# Update database
echo ""
echo "🗄️  Updating database with payment tables..."
python update_db_stripe.py

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Edit .env with your Stripe test keys"
echo "   2. Start backend: python main_new.py"
echo "   3. Test order creation: curl -X POST http://localhost:3000/api/orders -H 'Content-Type: application/json' -d @test_order.json"
echo ""
echo "📚 Documentation: See STRIPE_PAYMENT_INTEGRATION.md"
