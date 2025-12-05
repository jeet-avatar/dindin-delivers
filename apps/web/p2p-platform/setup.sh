#!/bin/bash

echo "🚀 Invoice Management System - Complete Setup Script"
echo "======================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Check prerequisites
echo "📋 Checking prerequisites..."
echo ""

# Check Python
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    print_success "Python installed: $PYTHON_VERSION"
else
    print_error "Python 3 is not installed. Please install Python 3.9+"
    exit 1
fi

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js installed: $NODE_VERSION"
else
    print_error "Node.js is not installed. Please install Node.js 16+"
    exit 1
fi

# Check PostgreSQL
if command -v psql &> /dev/null; then
    PG_VERSION=$(psql --version)
    print_success "PostgreSQL installed: $PG_VERSION"
else
    print_error "PostgreSQL is not installed. Please install PostgreSQL 14+"
    exit 1
fi

echo ""
echo "================================"
echo "🗄️  Database Setup"
echo "================================"
echo ""

# Check if database exists
if psql -U postgres -lqt | cut -d \| -f 1 | grep -qw invoice_db; then
    print_info "Database 'invoice_db' already exists"
    read -p "Do you want to recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Dropping existing database..."
        dropdb invoice_db 2>/dev/null || true
        createdb invoice_db
        print_success "Database recreated"
    fi
else
    print_info "Creating database 'invoice_db'..."
    createdb invoice_db
    print_success "Database created"
fi

echo ""
echo "================================"
echo "🐍 Backend Setup"
echo "================================"
echo ""

cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    print_info "Creating Python virtual environment..."
    python3 -m venv venv
    print_success "Virtual environment created"
else
    print_info "Virtual environment already exists"
fi

# Activate virtual environment
print_info "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
print_info "Installing Python dependencies..."
pip install --upgrade pip -q
pip install -r requirements.txt -q
print_success "Dependencies installed"

# Setup environment file
if [ ! -f ".env" ]; then
    print_info "Creating .env file..."
    cp .env.example .env
    print_success ".env file created"
else
    print_info ".env file already exists"
fi

# Initialize database
print_info "Initializing database with sample data..."
python init_db.py

# Move main_new.py to main.py if needed
if [ -f "main_new.py" ]; then
    if [ -f "main.py" ]; then
        mv main.py main_old.py
        print_info "Backed up old main.py to main_old.py"
    fi
    mv main_new.py main.py
    print_success "Updated main.py"
fi

cd ..

echo ""
echo "================================"
echo "⚛️  Frontend Setup"
echo "================================"
echo ""

cd frontend

# Install Node dependencies
if [ ! -d "node_modules" ]; then
    print_info "Installing Node.js dependencies..."
    npm install
    print_success "Dependencies installed"
else
    print_info "Node modules already installed"
fi

# Create .env file
if [ ! -f ".env" ]; then
    print_info "Creating frontend .env file..."
    echo "VITE_API_URL=http://localhost:3000" > .env
    print_success "Frontend .env created"
else
    print_info "Frontend .env already exists"
fi

cd ..

echo ""
echo "================================"
echo "✅ Setup Complete!"
echo "================================"
echo ""
print_success "All setup steps completed successfully!"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Start the backend server:"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   uvicorn main:app --reload --port 3000"
echo ""
echo "2. In a new terminal, start the frontend:"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "3. Open your browser:"
echo "   http://localhost:5173"
echo ""
echo "🔑 Login credentials:"
echo "   Email: admin@invoice.com"
echo "   Password: admin123"
echo ""
echo "📚 API Documentation:"
echo "   http://localhost:3000/docs"
echo ""
echo "Happy invoicing! 🎉"
