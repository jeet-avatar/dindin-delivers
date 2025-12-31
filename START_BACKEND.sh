#!/bin/bash

echo "🚀 Starting Backend Server..."
echo ""

cd "$(dirname "$0")/backend"

# Kill any existing process on port 3000
echo "Checking for existing processes on port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "⚠️  Virtual environment not found. Creating..."
    python3 -m venv venv
fi

# Activate venv
source venv/bin/activate

# Install all required packages
echo "📦 Installing dependencies..."
pip install -q --upgrade pip
pip install -q fastapi "uvicorn[standard]" sqlalchemy psycopg2-binary python-jose python-dotenv pydantic python-multipart "passlib[bcrypt]==1.7.4" "bcrypt==4.0.1" "pydantic[email]"

# Initialize database
echo "🗄️  Initializing database..."
python init_db.py

echo ""
echo "✅ Starting backend on http://localhost:3000"
echo ""
echo "Login credentials:"
echo "  Email: admin@invoice.com"
echo "  Password: [set in .env]"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start the server
python -m uvicorn main_new:app --reload --port 3000
