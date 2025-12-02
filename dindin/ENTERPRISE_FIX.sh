#!/bin/bash

# Enterprise-Level Invoice Management System Fix & Start Script
# This script performs comprehensive checks and fixes before starting the application

set -e  # Exit on error

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   INVOICE MANAGEMENT SYSTEM - ENTERPRISE STARTUP${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}\n"

# Change to project directory
cd /Users/jeet/doordash-p2p

# ============================================================================
# STEP 1: KILL EXISTING PROCESSES
# ============================================================================
echo -e "${YELLOW}[1/10] Killing existing processes...${NC}"

# Kill backend (port 3000)
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "  → Killing processes on port 3000..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# Kill frontend (port 5173)
if lsof -ti:5173 > /dev/null 2>&1; then
    echo "  → Killing processes on port 5173..."
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
    sleep 1
fi

echo -e "${GREEN}  ✓ All existing processes terminated${NC}\n"

# ============================================================================
# STEP 2: CHECK POSTGRESQL
# ============================================================================
echo -e "${YELLOW}[2/10] Checking PostgreSQL...${NC}"

if ! command -v psql &> /dev/null; then
    echo -e "${RED}  ✗ PostgreSQL not found. Installing...${NC}"
    brew install postgresql
fi

# Check if PostgreSQL is running
if ! pg_isready > /dev/null 2>&1; then
    echo "  → Starting PostgreSQL..."
    brew services start postgresql
    sleep 3
fi

# Check if postgres user exists
if ! psql postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='postgres'" | grep -q 1; then
    echo "  → Creating postgres user..."
    createuser -s postgres 2>/dev/null || true
    psql postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';" 2>/dev/null || true
fi

echo -e "${GREEN}  ✓ PostgreSQL is ready${NC}\n"

# ============================================================================
# STEP 3: CHECK AND CREATE DATABASE
# ============================================================================
echo -e "${YELLOW}[3/10] Setting up database...${NC}"

# Check if database exists
if ! psql -U postgres -lqt | cut -d \| -f 1 | grep -qw invoice_db; then
    echo "  → Creating invoice_db database..."
    psql -U postgres -c "CREATE DATABASE invoice_db;" 2>/dev/null || true
fi

echo -e "${GREEN}  ✓ Database is ready${NC}\n"

# ============================================================================
# STEP 4: SETUP BACKEND VIRTUAL ENVIRONMENT
# ============================================================================
echo -e "${YELLOW}[4/10] Setting up backend virtual environment...${NC}"

cd backend

# Remove old venv if exists
if [ -d "venv" ]; then
    echo "  → Removing old virtual environment..."
    rm -rf venv
fi

# Create new venv
echo "  → Creating new virtual environment..."
python3 -m venv venv

# Activate venv
source venv/bin/activate

echo -e "${GREEN}  ✓ Virtual environment created${NC}\n"

# ============================================================================
# STEP 5: INSTALL BACKEND DEPENDENCIES
# ============================================================================
echo -e "${YELLOW}[5/10] Installing backend dependencies...${NC}"

pip install --upgrade pip > /dev/null 2>&1
pip install --no-cache-dir \
    "fastapi==0.104.1" \
    "uvicorn[standard]==0.24.0" \
    "sqlalchemy==2.0.23" \
    "psycopg2-binary==2.9.9" \
    "python-jose[cryptography]==3.3.0" \
    "passlib[bcrypt]==1.7.4" \
    "bcrypt==4.0.1" \
    "python-multipart==0.0.6" \
    "pydantic[email]==2.5.0" \
    "python-dotenv==1.0.0" \
    "email-validator==2.1.0" > /dev/null 2>&1

echo -e "${GREEN}  ✓ Backend dependencies installed${NC}\n"

# ============================================================================
# STEP 6: VERIFY BACKEND FILES
# ============================================================================
echo -e "${YELLOW}[6/10] Verifying backend files...${NC}"

required_files=("main_new.py" "models.py" "database.py" "init_db.py" ".env")
missing_files=()

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -eq 0 ]; then
    echo -e "${GREEN}  ✓ All backend files present${NC}\n"
else
    echo -e "${RED}  ✗ Missing files: ${missing_files[*]}${NC}\n"
    exit 1
fi

# ============================================================================
# STEP 7: RESET ADMIN PASSWORD
# ============================================================================
echo -e "${YELLOW}[7/10] Resetting admin password...${NC}"

python << 'PYEOF'
import sys
from dotenv import load_dotenv
from database import SessionLocal, init_db
from models import User
from passlib.context import CryptContext

load_dotenv()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

try:
    # Initialize database tables
    init_db()
    
    db = SessionLocal()
    admin = db.query(User).filter(User.email == "admin@invoice.com").first()
    
    if admin:
        # Reset password
        admin.password_hash = pwd_context.hash("admin123")
        db.commit()
        print("  → Admin password reset successfully")
    else:
        print("  → Admin user not found, will be created by init_db")
    
    db.close()
except Exception as e:
    print(f"  → Error: {e}")
    sys.exit(1)
PYEOF

echo -e "${GREEN}  ✓ Password reset complete${NC}\n"

# ============================================================================
# STEP 8: INITIALIZE DATABASE WITH SAMPLE DATA
# ============================================================================
echo -e "${YELLOW}[8/10] Initializing database with sample data...${NC}"

python init_db.py > /dev/null 2>&1

echo -e "${GREEN}  ✓ Database initialized${NC}\n"

# ============================================================================
# STEP 9: START BACKEND SERVER
# ============================================================================
echo -e "${YELLOW}[9/10] Starting backend server...${NC}"

# Start backend in background
nohup python -m uvicorn main_new:app --reload --port 3000 > /tmp/invoice_backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > /tmp/invoice_backend.pid

echo "  → Backend PID: $BACKEND_PID"
echo "  → Logs: /tmp/invoice_backend.log"

# Wait for backend to start
echo "  → Waiting for backend to start..."
for i in {1..30}; do
    if curl -s http://localhost:3000/ > /dev/null 2>&1; then
        echo -e "${GREEN}  ✓ Backend server is running${NC}\n"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}  ✗ Backend failed to start. Check /tmp/invoice_backend.log${NC}\n"
        exit 1
    fi
    sleep 1
done

# ============================================================================
# STEP 10: START FRONTEND SERVER
# ============================================================================
echo -e "${YELLOW}[10/10] Starting frontend server...${NC}"

cd ../frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "  → Installing frontend dependencies..."
    npm install > /dev/null 2>&1
fi

# Start frontend in background
nohup npm run dev > /tmp/invoice_frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > /tmp/invoice_frontend.pid

echo "  → Frontend PID: $FRONTEND_PID"
echo "  → Logs: /tmp/invoice_frontend.log"

# Wait for frontend to start
echo "  → Waiting for frontend to start..."
for i in {1..30}; do
    if curl -s http://localhost:5173/ > /dev/null 2>&1; then
        echo -e "${GREEN}  ✓ Frontend server is running${NC}\n"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}  ✗ Frontend failed to start. Check /tmp/invoice_frontend.log${NC}\n"
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    sleep 1
done

# ============================================================================
# SUCCESS SUMMARY
# ============================================================================
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ INVOICE MANAGEMENT SYSTEM STARTED SUCCESSFULLY${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}\n"

echo -e "${GREEN}🌐 Application URLs:${NC}"
echo -e "   Frontend:  ${BLUE}http://localhost:5173${NC}"
echo -e "   Backend:   ${BLUE}http://localhost:3000${NC}"
echo -e "   API Docs:  ${BLUE}http://localhost:3000/docs${NC}\n"

echo -e "${GREEN}🔐 Login Credentials:${NC}"
echo -e "   Email:     ${BLUE}admin@invoice.com${NC}"
echo -e "   Password:  ${BLUE}admin123${NC}\n"

echo -e "${GREEN}📊 Process Information:${NC}"
echo -e "   Backend PID:  $BACKEND_PID"
echo -e "   Frontend PID: $FRONTEND_PID\n"

echo -e "${GREEN}📝 Logs:${NC}"
echo -e "   Backend:  /tmp/invoice_backend.log"
echo -e "   Frontend: /tmp/invoice_frontend.log\n"

echo -e "${GREEN}🛑 To stop servers:${NC}"
echo -e "   kill $BACKEND_PID $FRONTEND_PID\n"

# Open browser
echo -e "${YELLOW}Opening browser...${NC}\n"
sleep 2
open http://localhost:5173

echo -e "${GREEN}✨ Ready to use!${NC}\n"
