#!/bin/bash

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     FINAL SETUP - Invoice Management System               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

cd "$(dirname "$0")"

# Kill existing processes
echo "Stopping any existing processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Backend setup
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Setting up backend..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd backend

# Create/recreate venv
rm -rf venv
python3 -m venv venv
source venv/bin/activate

# Install all packages
pip install --upgrade pip -q
pip install -q fastapi "uvicorn[standard]" sqlalchemy psycopg2-binary python-jose python-dotenv pydantic python-multipart "passlib[bcrypt]==1.7.4" "bcrypt==4.0.1" "pydantic[email]"

# Setup database
createdb invoice_db 2>/dev/null || true
python init_db.py

# Start backend in background
echo "Starting backend server..."
python -m uvicorn main_new:app --reload --port 3000 > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

cd ..

# Frontend setup
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Setting up frontend..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd frontend

npm install -q
echo "VITE_API_URL=http://localhost:3000" > .env

# Start frontend in background
echo "Starting frontend server..."
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

cd ..

# Wait for servers to start
echo ""
echo "Waiting for servers to start..."
sleep 5

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                  ✅ SETUP COMPLETE!                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Frontend: http://localhost:5173"
echo "🔧 Backend:  http://localhost:3000"
echo ""
echo "🔑 Login:"
echo "   Email:    admin@invoice.com"
echo "   Password: [set in .env]"
echo ""
echo "📝 Logs:"
echo "   Backend:  tail -f /tmp/backend.log"
echo "   Frontend: tail -f /tmp/frontend.log"
echo ""
echo "🛑 To stop:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "Opening browser..."
sleep 2
open http://localhost:5173 2>/dev/null || xdg-open http://localhost:5173 2>/dev/null || echo "Please open http://localhost:5173 manually"

# Save PIDs
echo "$BACKEND_PID" > /tmp/invoice_backend.pid
echo "$FRONTEND_PID" > /tmp/invoice_frontend.pid

echo ""
echo "Servers are running in the background."
echo "Press Ctrl+C to exit (servers will keep running)"
echo ""

# Keep script alive
trap "echo 'Script exited, servers still running'; exit 0" INT
tail -f /tmp/backend.log &
tail -f /tmp/frontend.log &
wait
