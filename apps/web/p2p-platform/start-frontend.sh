#!/bin/bash

echo "⚛️  Starting Frontend Development Server"
echo "========================================"
echo ""

cd "$(dirname "$0")/frontend"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Step 1: Installing dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✓${NC} Dependencies installed"
else
    echo -e "${GREEN}✓${NC} Dependencies already installed"
fi

echo ""
echo "Step 2: Setting up environment..."
if [ ! -f ".env" ]; then
    echo "VITE_API_URL=http://localhost:3000" > .env
    echo -e "${GREEN}✓${NC} .env file created"
else
    echo -e "${GREEN}✓${NC} .env file exists"
fi

echo ""
echo "========================================"
echo "✅ Starting development server..."
echo "========================================"
echo ""
echo "Frontend will be available at: http://localhost:5173"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""

npm run dev
