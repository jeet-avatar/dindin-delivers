#!/bin/bash

# Fix Login Issue Script
echo "🔧 Fixing login issue..."

cd /Users/jeet/doordash-p2p/backend

# Activate virtual environment
source venv/bin/activate

echo ""
echo "1️⃣ Resetting admin password..."
python reset_admin.py

echo ""
echo "2️⃣ Testing login endpoint..."
python test_login.py

echo ""
echo "✅ Done! Now try logging in at http://localhost:5173"
echo "   Email: admin@invoice.com"
echo "   Password: [set in .env]"
