#!/bin/bash

echo "🚀 Invoice Management System - Complete Setup & Start"
echo "======================================================"
echo ""

cd "$(dirname "$0")/backend"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Step 1: Setting up Python environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo -e "${GREEN}✓${NC} Virtual environment created"
else
    echo -e "${GREEN}✓${NC} Virtual environment exists"
fi

echo ""
echo "Step 2: Activating virtual environment..."
source venv/bin/activate
echo -e "${GREEN}✓${NC} Activated"

echo ""
echo "Step 3: Installing Python packages..."
pip install -q --upgrade pip
pip install -q -r requirements.txt
echo -e "${GREEN}✓${NC} Packages installed"

echo ""
echo "Step 4: Setting up database..."

# Check if database exists
if psql -lqt | cut -d \| -f 1 | grep -qw invoice_db; then
    echo -e "${GREEN}✓${NC} Database 'invoice_db' exists"
else
    echo "Creating database..."
    createdb invoice_db
    echo -e "${GREEN}✓${NC} Database created"
fi

echo ""
echo "Step 5: Initializing database with sample data..."
python init_db.py
echo -e "${GREEN}✓${NC} Database initialized"

echo ""
echo "======================================================"
echo "✅ Setup Complete!"
echo "======================================================"
echo ""
echo "Starting backend server on http://localhost:3000 ..."
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""

# Start the server
uvicorn main_new:app --reload --port 3000
