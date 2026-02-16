#!/bin/bash

# DoorDash P2P - Complete Startup Script
# This script checks and starts all required services

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 DoorDash P2P - Startup Script"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "backend/main_new.py" ]; then
    echo -e "${RED}❌ Error: Please run this script from the project root directory${NC}"
    echo "   cd to the p2p-platform directory"
    exit 1
fi

echo "✓ Project directory verified"
echo ""

# Check PostgreSQL
echo "1️⃣  Checking PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL is not installed${NC}"
    echo "   Install with: brew install postgresql"
    exit 1
fi

# Try to connect to PostgreSQL
if ! psql -U postgres -d postgres -c "SELECT 1" &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL is not running. Starting it...${NC}"
    brew services start postgresql
    sleep 3
fi

# Check if database exists
DB_EXISTS=$(psql -U postgres -lqt | cut -d \| -f 1 | grep -w invoice_db | wc -l)
if [ $DB_EXISTS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Database 'invoice_db' does not exist. Creating...${NC}"
    createdb -U postgres invoice_db
fi

echo -e "${GREEN}✓ PostgreSQL is ready${NC}"
echo ""

# Initialize database
echo "2️⃣  Initializing database tables..."
cd backend
python init_db.py
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Database initialization failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Database initialized${NC}"
echo ""

# Run migration for vendor authentication
echo "3️⃣  Running vendor authentication migration..."
if [ -f "migrate_vendor_auth.py" ]; then
    python migrate_vendor_auth.py
    echo -e "${GREEN}✓ Migration completed${NC}"
else
    echo -e "${YELLOW}⚠️  Migration script not found (this is okay if already migrated)${NC}"
fi
echo ""

# Add sample vendor data for ZIP dashboard
echo "4️⃣  Adding sample vendor data..."
if [ -f "add_zip_sample_data.py" ]; then
    python add_zip_sample_data.py
    echo -e "${GREEN}✓ Sample data added${NC}"
else
    echo -e "${YELLOW}⚠️  Sample data script not found${NC}"
fi
echo ""

# Check if port 3000 is in use
echo "5️⃣  Checking if port 3000 is available..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠️  Port 3000 is already in use${NC}"
    echo "   Killing existing process..."
    lsof -ti:3000 | xargs kill -9
    sleep 1
fi
echo -e "${GREEN}✓ Port 3000 is available${NC}"
echo ""

cd ..

# Summary
echo "================================"
echo -e "${GREEN}✅ All checks passed!${NC}"
echo ""
echo "📋 Quick Start Commands:"
echo ""
echo "Backend (Terminal 1):"
echo "  cd backend"
echo "  uvicorn main_new:app --reload --port 3000"
echo ""
echo "Frontend (Terminal 2):"
echo "  cd frontend"
echo "  npm run dev"
echo ""
echo "🌐 Access URLs:"
echo "  Admin Portal:     http://localhost:5173/login"
echo "  Vendor Portal:    http://localhost:5173/vendor/login"
echo "  Backend API:      http://localhost:3000/docs"
echo "  Restaurant Apply: http://localhost:5173/restaurant/apply"
echo ""
echo "🔑 Login Credentials:"
echo "  Admin:  admin@invoice.com / admin123"
echo "  Vendor: (created after approval)"
echo ""
echo "================================"
echo ""
echo "Would you like to start the servers now? (y/n)"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo ""
    echo "Starting backend server..."
    cd backend
    
    # Start backend in background
    uvicorn main_new:app --reload --port 3000 &
    BACKEND_PID=$!
    
    echo "Backend started with PID: $BACKEND_PID"
    echo ""
    echo "Wait 3 seconds for backend to initialize..."
    sleep 3
    
    # Test backend
    if curl -s http://localhost:3000/ > /dev/null; then
        echo -e "${GREEN}✓ Backend is running!${NC}"
    else
        echo -e "${RED}❌ Backend failed to start${NC}"
        kill $BACKEND_PID
        exit 1
    fi
    
    echo ""
    echo "Backend is running in the background"
    echo "To stop it: kill $BACKEND_PID"
    echo ""
    echo "Now start the frontend manually:"
    echo "  cd ../frontend"
    echo "  npm run dev"
else
    echo "Skipping server start. Use the commands above to start manually."
fi
