#!/bin/bash

echo "🔍 Checking system status..."
echo ""

# Check ports
echo "Checking ports:"
echo "  Port 3000 (Backend): $(lsof -ti:3000 > /dev/null 2>&1 && echo 'OCCUPIED' || echo 'FREE')"
echo "  Port 5173 (Frontend): $(lsof -ti:5173 > /dev/null 2>&1 && echo 'OCCUPIED' || echo 'FREE')"
echo ""

# Check PostgreSQL
echo "Checking PostgreSQL:"
if command -v psql &> /dev/null; then
    if pg_isready > /dev/null 2>&1; then
        echo "  ✓ PostgreSQL is running"
    else
        echo "  ✗ PostgreSQL is NOT running"
        echo "  → Starting PostgreSQL..."
        brew services start postgresql
        sleep 3
    fi
else
    echo "  ✗ PostgreSQL is NOT installed"
    echo "  → Installing PostgreSQL..."
    brew install postgresql
    brew services start postgresql
    sleep 3
fi
echo ""

# Check if postgres user exists
echo "Checking postgres user:"
if psql postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='postgres'" 2>/dev/null | grep -q 1; then
    echo "  ✓ postgres user exists"
else
    echo "  → Creating postgres user..."
    createuser -s postgres 2>/dev/null || psql postgres -c "CREATE USER postgres WITH SUPERUSER PASSWORD 'postgres';"
fi
echo ""

# Check database
echo "Checking database:"
if psql -U postgres -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw invoice_db; then
    echo "  ✓ invoice_db exists"
else
    echo "  → Creating invoice_db..."
    psql -U postgres -c "CREATE DATABASE invoice_db;"
fi
echo ""

# Check Python
echo "Checking Python:"
cd /Users/jeet/doordash-p2p/backend
if [ -d "venv" ]; then
    echo "  ✓ Virtual environment exists"
    source venv/bin/activate
    
    # Check if passlib is installed
    if python -c "import passlib" 2>/dev/null; then
        echo "  ✓ Dependencies installed"
    else
        echo "  ✗ Dependencies missing"
        echo "  → Installing dependencies..."
        pip install -q "fastapi==0.104.1" "uvicorn[standard]==0.24.0" "sqlalchemy==2.0.23" "psycopg2-binary==2.9.9" "python-jose[cryptography]==3.3.0" "passlib[bcrypt]==1.7.4" "bcrypt==4.0.1" "python-multipart==0.0.6" "pydantic[email]==2.5.0" "python-dotenv==1.0.0" "email-validator==2.1.0"
    fi
else
    echo "  ✗ Virtual environment missing"
    echo "  → Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    echo "  → Installing dependencies..."
    pip install -q "fastapi==0.104.1" "uvicorn[standard]==0.24.0" "sqlalchemy==2.0.23" "psycopg2-binary==2.9.9" "python-jose[cryptography]==3.3.0" "passlib[bcrypt]==1.7.4" "bcrypt==4.0.1" "python-multipart==0.0.6" "pydantic[email]==2.5.0" "python-dotenv==1.0.0" "email-validator==2.1.0"
fi
echo ""

# Initialize database
echo "Initializing database..."
python init_db.py
echo ""

# Kill existing processes
echo "Cleaning up old processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
sleep 2
echo ""

# Start backend
echo "🚀 Starting backend server..."
cd /Users/jeet/doordash-p2p/backend
source venv/bin/activate
python -m uvicorn main_new:app --reload --port 3000 > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > /tmp/backend.pid
echo "  Backend PID: $BACKEND_PID"

# Wait for backend
echo "  Waiting for backend..."
for i in {1..15}; do
    if curl -s http://localhost:3000/ > /dev/null 2>&1; then
        echo "  ✓ Backend is UP on http://localhost:3000"
        break
    fi
    if [ $i -eq 15 ]; then
        echo "  ✗ Backend failed to start"
        echo ""
        echo "Last 20 lines of backend log:"
        tail -20 /tmp/backend.log
        exit 1
    fi
    sleep 1
done
echo ""

# Start frontend
echo "🚀 Starting frontend server..."
cd /Users/jeet/doordash-p2p/frontend

# Install npm dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "  → Installing npm packages..."
    npm install
fi

npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > /tmp/frontend.pid
echo "  Frontend PID: $FRONTEND_PID"

# Wait for frontend
echo "  Waiting for frontend..."
for i in {1..15}; do
    if curl -s http://localhost:5173/ > /dev/null 2>&1; then
        echo "  ✓ Frontend is UP on http://localhost:5173"
        break
    fi
    if [ $i -eq 15 ]; then
        echo "  ✗ Frontend failed to start"
        echo ""
        echo "Last 20 lines of frontend log:"
        tail -20 /tmp/frontend.log
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    sleep 1
done
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "✅ SUCCESS! Both servers are running"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "🌐 Open: http://localhost:5173"
echo "🔐 Login: admin@invoice.com / [password in .env]"
echo ""
echo "📊 PIDs: Backend=$BACKEND_PID Frontend=$FRONTEND_PID"
echo "📝 Logs: /tmp/backend.log and /tmp/frontend.log"
echo ""
echo "🛑 To stop: kill $BACKEND_PID $FRONTEND_PID"
echo ""

# Open browser
sleep 2
open http://localhost:5173

echo "✨ Ready!"
