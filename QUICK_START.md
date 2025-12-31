# Quick Start Guide - Invoice Management System

## Option 1: Manual Step-by-Step (Recommended)

### 1. Setup Database

```bash
# Create PostgreSQL database
createdb invoice_db

# If you get an error, the database might already exist. Drop it first:
dropdb invoice_db
createdb invoice_db
```

### 2. Setup Backend

```bash
# Navigate to backend folder
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Initialize database with sample data
python init_db.py

# Start backend server (use main_new.py since main.py has old Okta code)
uvicorn main_new:app --reload --port 3000
```

Keep this terminal open. You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:3000 (Press CTRL+C to quit)
```

### 3. Setup Frontend (Open NEW Terminal)

```bash
# Navigate to frontend folder
cd frontend

# Install dependencies (if not already installed)
npm install

# Create .env file
echo "VITE_API_URL=http://localhost:3000" > .env

# Start frontend server
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

### 4. Access Application

Open your browser and go to: **http://localhost:5173**

**Login Credentials:**
- Email: `admin@invoice.com`
- Password: Set via `SAMPLE_ADMIN_PASSWORD` in `.env`

---

## Option 2: Using Setup Script

```bash
# Make script executable
chmod +x setup.sh

# Run setup
./setup.sh

# Then manually start servers as described above
```

---

## Troubleshooting

### "Connection refused" on localhost:3000
- Make sure backend is running: `cd backend && source venv/bin/activate && uvicorn main_new:app --reload --port 3000`

### "Module not found" errors
- Make sure you activated the virtual environment: `source venv/bin/activate`
- Reinstall dependencies: `pip install -r requirements.txt`

### "Database does not exist"
- Create it: `createdb invoice_db`
- Then run: `python init_db.py`

### Frontend shows blank page
- Check browser console (F12) for errors
- Make sure `.env` file exists in frontend folder with: `VITE_API_URL=http://localhost:3000`
- Restart frontend: `npm run dev`

### "Port already in use"
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

---

## What You Get

- ✅ **4 Sample Invoices** (Paid, Sent, Overdue, Draft)
- ✅ **3 Sample Clients** (Acme Corp, TechStart Inc, Global Solutions)
- ✅ **2 Payment Records**
- ✅ **Working Dashboard** with statistics
- ✅ **Full CRUD Operations** for invoices, clients, payments

---

## API Documentation

Once backend is running, visit: **http://localhost:3000/docs**

You can test all API endpoints directly from the Swagger UI.

---

## Sample Data Details

**Admin User:**
- Email: admin@invoice.com
- Password: Set via `SAMPLE_ADMIN_PASSWORD` in `.env`
- Role: Admin

**Invoices:**
1. INV-202411-0001 - $5,425.00 (Paid)
2. INV-202411-0002 - $3,372.00 (Sent - Partially Paid)
3. INV-202411-0003 - $1,627.50 (Overdue)
4. INV-202411-0004 - $2,604.00 (Draft)

**Clients:**
1. Acme Corporation
2. TechStart Inc
3. Global Solutions Ltd

---

## Next Steps

1. **Explore the Dashboard** - View statistics and recent activity
2. **Create New Invoice** - Click "New Invoice" button
3. **Manage Clients** - Add, edit, or view client details
4. **Record Payments** - Track payments against invoices
5. **Generate Reports** - Export invoices as PDF

Enjoy! 🎉
