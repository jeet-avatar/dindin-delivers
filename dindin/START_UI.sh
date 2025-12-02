#!/bin/bash

echo "🚀 Starting DoorDash P2P Frontend..."
echo ""

cd /Users/jeet/doordash-p2p/frontend

# Kill existing process on port 5173
if lsof -ti:5173 > /dev/null 2>&1; then
    echo "→ Stopping existing frontend..."
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "→ Installing dependencies..."
    npm install
fi

echo "→ Starting frontend server..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Frontend starting on http://localhost:5173"
echo "   PID: $FRONTEND_PID"
echo ""
echo "⏳ Waiting for server..."

# Wait for frontend to start
for i in {1..20}; do
    if curl -s http://localhost:5173/ > /dev/null 2>&1; then
        echo ""
        echo "════════════════════════════════════════════════════════════════"
        echo "✨ DoorDash P2P UI is ready!"
        echo "════════════════════════════════════════════════════════════════"
        echo ""
        echo "🌐 URL: http://localhost:5173"
        echo "📊 All dashboards restored:"
        echo "   • Consolidated Dashboard"
        echo "   • Coupa Dashboard"
        echo "   • NetSuite Dashboard"
        echo "   • JIRA Dashboard"
        echo "   • ZIP Dashboard"
        echo "   • Vendor Management"
        echo "   • Transactions"
        echo "   • Invoices"
        echo "   • Clients"
        echo ""
        echo "🛑 To stop: kill $FRONTEND_PID"
        echo ""
        
        # Open browser
        sleep 2
        open http://localhost:5173
        
        echo "✅ Browser opened!"
        break
    fi
    if [ $i -eq 20 ]; then
        echo ""
        echo "❌ Frontend failed to start"
        echo "Check for errors above"
        exit 1
    fi
    sleep 1
done

# Keep script running
wait $FRONTEND_PID
