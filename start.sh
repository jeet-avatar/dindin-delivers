#!/bin/bash

# Quick start script for Invoice Management System

echo "🚀 Starting Invoice Management System..."
echo ""

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Kill processes on ports if they exist
if check_port 3000; then
    echo "⚠️  Port 3000 is in use. Stopping existing process..."
    kill -9 $(lsof -ti:3000) 2>/dev/null
fi

if check_port 5173; then
    echo "⚠️  Port 5173 is in use. Stopping existing process..."
    kill -9 $(lsof -ti:5173) 2>/dev/null
fi

echo ""
echo "Starting backend server on http://localhost:3000 ..."

# Start backend in background
cd backend
source venv/bin/activate 2>/dev/null || . venv/bin/activate
uvicorn main:app --reload --port 3000 &
BACKEND_PID=$!
cd ..

echo "✓ Backend started (PID: $BACKEND_PID)"
echo ""
echo "Starting frontend server on http://localhost:5173 ..."

# Start frontend in background
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "✓ Frontend started (PID: $FRONTEND_PID)"
echo ""
echo "================================"
echo "✅ All services started!"
echo "================================"
echo ""
echo "🌐 Frontend: http://localhost:5173"
echo "🔧 Backend API: http://localhost:3000"
echo "📚 API Docs: http://localhost:3000/docs"
echo ""
echo "🔑 Login:"
echo "   Email: admin@invoice.com"
echo "   Password: [set via SAMPLE_ADMIN_PASSWORD in .env]"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for Ctrl+C
trap "echo ''; echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
