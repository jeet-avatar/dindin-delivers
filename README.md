# Invoice Management System

A modern invoice management application with real-time tracking, payment processing, and client management.

## Features

- 🧾 Create, edit, and manage invoices
- 💰 Track payments and outstanding balances
- 👥 Client management
- 📊 Dashboard with real-time metrics
- 📄 Invoice PDF generation
- 🔍 Advanced search and filtering
- 📈 Financial reporting

## Tech Stack

**Backend:**
- FastAPI (Python)
- PostgreSQL (Database)
- SQLAlchemy (ORM)

**Frontend:**
- React 18 with TypeScript
- Vite
- TailwindCSS
- Ant Design
- Chart.js

## Quick Start

### Prerequisites
- Python 3.9+
- Node.js 16+
- PostgreSQL 14+

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up database
python init_db.py

# Run the server
uvicorn main:app --reload --port 3000
```

Backend will run on: http://localhost:3000

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend will run on: http://localhost:5173

## Default Login

**Admin Portal:**
- Email: admin@invoice.com
- Password: Set via `SAMPLE_ADMIN_PASSWORD` in `.env`
- URL: http://localhost:5173/login

**Vendor Portal:**
- Vendors receive login credentials after approval
- URL: http://localhost:5173/vendor/login
- Apply: http://localhost:5173/restaurant/apply

## Environment Variables

Copy `.env.example` to `.env` and update:

**Backend (.env):**
```
DATABASE_URL=postgresql://user:password@localhost:5432/invoice_db
JWT_SECRET_KEY=your-secret-key-change-in-production
```

**Frontend (.env):**
```
VITE_API_URL=http://localhost:3000
```

## Project Structure

```
├── backend/
│   ├── main.py           # FastAPI application
│   ├── models.py         # Database models
│   ├── database.py       # Database connection
│   ├── init_db.py        # Database initialization
│   └── requirements.txt  # Python dependencies
│
└── frontend/
    ├── src/
    │   ├── components/   # React components
    │   ├── screens/      # Page components
    │   ├── context/      # State management
    │   └── App.tsx       # Main app component
    └── package.json      # Node dependencies
```

## API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:3000/docs
- ReDoc: http://localhost:3000/redoc

## License

MIT
