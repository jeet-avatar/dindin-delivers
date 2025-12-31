#!/bin/bash

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Invoice Management System - Complete Auto Setup       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "${BLUE}📍 Working directory: $SCRIPT_DIR${NC}"
echo ""

# Function to check command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Checking prerequisites..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check Python
if command_exists python3; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✓${NC} Python: $PYTHON_VERSION"
else
    echo -e "${RED}✗${NC} Python 3 not found. Install: brew install python3"
    exit 1
fi

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} Node.js: $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Node.js not found. Install: brew install node"
    exit 1
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓${NC} npm: $NPM_VERSION"
else
    echo -e "${RED}✗${NC} npm not found"
    exit 1
fi

# Check PostgreSQL
if command_exists psql; then
    PG_VERSION=$(psql --version)
    echo -e "${GREEN}✓${NC} PostgreSQL: $PG_VERSION"
else
    echo -e "${RED}✗${NC} PostgreSQL not found"
    echo ""
    echo "Installing PostgreSQL..."
    brew install postgresql@14
    brew services start postgresql@14
    sleep 3
fi

# Start PostgreSQL if not running
if ! brew services list | grep postgresql | grep started >/dev/null 2>&1; then
    echo ""
    echo -e "${YELLOW}⚠${NC} Starting PostgreSQL..."
    brew services start postgresql@14
    sleep 3
    echo -e "${GREEN}✓${NC} PostgreSQL started"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Setting up database..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Drop and recreate database
echo "Dropping old database (if exists)..."
dropdb invoice_db 2>/dev/null || true

echo "Creating database 'invoice_db'..."
createdb invoice_db

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Database created successfully"
else
    echo -e "${RED}✗${NC} Failed to create database"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Setting up Python backend..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$SCRIPT_DIR/backend"

# Create virtual environment
if [ -d "venv" ]; then
    echo "Removing old virtual environment..."
    rm -rf venv
fi

echo "Creating virtual environment..."
python3 -m venv venv
echo -e "${GREEN}✓${NC} Virtual environment created"

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip -q

# Install dependencies
echo "Installing Python dependencies (this may take a minute)..."
pip install -q -r requirements.txt

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} All Python packages installed"
else
    echo -e "${RED}✗${NC} Failed to install Python packages"
    exit 1
fi

# Initialize database
echo "Initializing database with sample data..."
python init_db.py

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Database initialized with sample data"
else
    echo -e "${RED}✗${NC} Failed to initialize database"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Setting up React frontend..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$SCRIPT_DIR/frontend"

# Install Node dependencies
echo "Installing Node.js dependencies (this may take 2-3 minutes)..."
npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} All Node packages installed"
else
    echo -e "${RED}✗${NC} Failed to install Node packages"
    exit 1
fi

# Create .env file
echo "Creating frontend .env file..."
echo "VITE_API_URL=http://localhost:3000" > .env
echo -e "${GREEN}✓${NC} Frontend configured"

cd "$SCRIPT_DIR"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                   ✅ SETUP COMPLETE!                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}All dependencies installed and configured!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Starting servers..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start backend in background
echo -e "${BLUE}🚀 Starting backend server...${NC}"
cd "$SCRIPT_DIR/backend"
source venv/bin/activate
uvicorn main_new:app --reload --port 3000 > /tmp/invoice-backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓${NC} Backend starting (PID: $BACKEND_PID)"
echo "   Logs: tail -f /tmp/invoice-backend.log"

# Wait for backend to start
echo ""
echo "Waiting for backend to start..."
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Backend is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗${NC} Backend failed to start. Check logs: tail -f /tmp/invoice-backend.log"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    sleep 1
    echo -n "."
done

echo ""
echo ""
echo -e "${BLUE}🚀 Starting frontend server...${NC}"
cd "$SCRIPT_DIR/frontend"
npm run dev > /tmp/invoice-frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✓${NC} Frontend starting (PID: $FRONTEND_PID)"
echo "   Logs: tail -f /tmp/invoice-frontend.log"

# Wait for frontend to start
echo ""
echo "Waiting for frontend to start..."
for i in {1..30}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Frontend is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗${NC} Frontend failed to start. Check logs: tail -f /tmp/invoice-frontend.log"
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        exit 1
    fi
    sleep 1
    echo -n "."
done

echo ""
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              🎉 APPLICATION IS NOW RUNNING! 🎉            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Frontend:${NC}     ${BLUE}http://localhost:5173${NC}"
echo -e "${GREEN}Backend API:${NC}  ${BLUE}http://localhost:3000${NC}"
echo -e "${GREEN}API Docs:${NC}     ${BLUE}http://localhost:3000/docs${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔑 Login Credentials"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Email:    admin@invoice.com"
echo "Password: admin123"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Sample Data Included"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "• 4 Sample Invoices (Paid, Sent, Overdue, Draft)"
echo "• 3 Sample Clients"
echo "• 2 Payment Records"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🛠️  Useful Commands"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Stop servers:     kill $BACKEND_PID $FRONTEND_PID"
echo "View backend log: tail -f /tmp/invoice-backend.log"
echo "View frontend log: tail -f /tmp/invoice-frontend.log"
echo ""
echo -e "${YELLOW}Opening browser...${NC}"
sleep 2

# Try to open browser
if command_exists open; then
    open http://localhost:5173
elif command_exists xdg-open; then
    xdg-open http://localhost:5173
fi

echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for interrupt
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT
wait
