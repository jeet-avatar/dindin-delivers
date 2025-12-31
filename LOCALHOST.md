# 🚀 LOCALHOST SETUP GUIDE - Invoice Management System

## Complete Local Development Setup

This guide will help you set up and run the Invoice Management System on your local machine.

---

## 📋 Prerequisites

Make sure you have these installed:

- **Python 3.9+** - [Download](https://www.python.org/downloads/)
- **Node.js 16+** - [Download](https://nodejs.org/)
- **PostgreSQL 14+** - [Download](https://www.postgresql.org/download/)
- **Git** - [Download](https://git-scm.com/downloads)

---

## 🗄️ Step 1: Set Up PostgreSQL Database

### Option A: Using PostgreSQL App (Mac/Linux)

```bash
# Start PostgreSQL service
brew services start postgresql@14

# Create database
createdb invoice_db

# Create user (if needed)
psql postgres
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE invoice_db TO postgres;
\q
```

### Option B: Using PostgreSQL (Windows)

1. Install PostgreSQL from official website
2. Open pgAdmin 4
3. Right-click "Databases" → "Create" → "Database"
4. Name it: `invoice_db`
5. Set owner to: `postgres`

### Option C: Using Docker

```bash
docker run --name invoice-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=invoice_db \
  -p 5432:5432 \
  -d postgres:14
```

---

## 🐍 Step 2: Backend Setup

### 1. Navigate to backend directory

```bash
cd backend
```

### 2. Create Python virtual environment

**Mac/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

### 3. Install Python dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Configure environment variables

```bash
# Copy example env file
cp .env.example .env

# Edit .env if your PostgreSQL settings are different
# DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/invoice_db
```

### 5. Initialize database with sample data

```bash
python init_db.py
```

You should see:
```
✓ Database tables created
✓ Created admin user (email: admin@invoice.com)
✓ Created 3 sample clients
✓ Created 4 sample invoices
✓ Created 2 sample payments
✅ Database initialization completed successfully!
```

### 6. Start the backend server

```bash
# Make sure you're still in the backend directory
uvicorn main_new:app --reload --port 3000
```

Or use the main.py file directly:
```bash
# Rename main_new.py to main.py first
mv main.py main_old.py
mv main_new.py main.py
python main.py
```

**Backend will run on:** http://localhost:3000

**API Documentation:** http://localhost:3000/docs

---

## ⚛️ Step 3: Frontend Setup

### 1. Open a new terminal and navigate to frontend

```bash
cd frontend
```

### 2. Install Node dependencies

```bash
npm install
```

### 3. Configure environment variables

Create `frontend/.env`:
```bash
VITE_API_URL=http://localhost:3000
```

### 4. Start the development server

```bash
npm run dev
```

**Frontend will run on:** http://localhost:5173

---

## 🎉 Step 4: Access the Application

Open your browser and go to: **http://localhost:5173**

### Default Login Credentials

```
Email: admin@invoice.com
Password: [set via SAMPLE_ADMIN_PASSWORD in .env]
```

---

## ✅ Verification Checklist

Make sure everything is working:

- [ ] PostgreSQL is running (check with `psql -U postgres -l`)
- [ ] Backend API is running on port 3000
- [ ] API docs accessible at http://localhost:3000/docs
- [ ] Frontend is running on port 5173
- [ ] You can login with admin@invoice.com / [password from .env]
- [ ] Dashboard shows sample data

---

## 🛠️ Common Issues & Solutions

### Issue 1: Database Connection Error

**Error:** `could not connect to server: Connection refused`

**Solution:**
```bash
# Check if PostgreSQL is running
pg_isready

# If not running, start it:
# Mac/Linux
brew services start postgresql@14

# Windows
net start postgresql-x64-14
```

### Issue 2: Port Already in Use

**Error:** `Address already in use` or `Port 3000 is already in use`

**Solution:**
```bash
# Find and kill the process using the port
# Mac/Linux
lsof -ti:3000 | xargs kill -9
lsof -ti:5173 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

### Issue 3: Module Not Found Error

**Error:** `ModuleNotFoundError: No module named 'fastapi'`

**Solution:**
```bash
# Make sure virtual environment is activated
# You should see (venv) in your terminal prompt
source venv/bin/activate  # Mac/Linux
venv\Scripts\activate     # Windows

# Reinstall dependencies
pip install -r requirements.txt
```

### Issue 4: npm Install Fails

**Error:** Various npm errors

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### Issue 5: Login Not Working

**Error:** 401 Unauthorized

**Solution:**
```bash
# Re-initialize the database
cd backend
python init_db.py

# This will recreate the admin user
```

---

## 📊 Sample Data Included

The system comes with pre-loaded sample data:

**Clients:**
- Acme Corporation
- TechStart Inc
- Global Solutions Ltd

**Invoices:**
- 1 Paid invoice ($5,425.00)
- 1 Sent invoice with partial payment ($3,372.00)
- 1 Overdue invoice ($1,627.50)
- 1 Draft invoice ($2,604.00)

---

## 🧪 Testing the API

You can test the API using the built-in Swagger UI:

1. Go to http://localhost:3000/docs
2. Click "Authorize" button
3. Login to get a token:
   - Click `POST /login`
   - Click "Try it out"
   - Enter:
     ```json
     {
       "username": "admin@invoice.com",
       "password": "[your password from .env]"
     }
     ```
   - Click "Execute"
   - Copy the `access_token` from the response
4. Paste the token in the Authorization dialog
5. Now you can test all endpoints!

---

## 🔄 Resetting the Database

If you want to start fresh:

```bash
# Drop and recreate the database
dropdb invoice_db
createdb invoice_db

# Re-run initialization
python init_db.py
```

---

## 📱 Application Features

### Dashboard
- Total invoices count
- Total revenue
- Outstanding balance
- Overdue invoices count
- Monthly revenue chart
- Status breakdown
- Recent activity feed

### Invoices
- Create new invoices with multiple line items
- Edit draft invoices
- Send invoices to clients
- Track payments
- Mark as paid/overdue
- Delete draft invoices
- Search and filter

### Clients
- Add new clients
- Edit client information
- View client invoice history
- Delete clients (if no invoices)
- Search clients

### Payments
- Record payments against invoices
- Multiple payment methods
- Payment history
- Automatic status updates

---

## 🎨 Tech Stack

**Backend:**
- FastAPI (Python web framework)
- SQLAlchemy (ORM)
- PostgreSQL (Database)
- JWT Authentication
- Pydantic (Data validation)

**Frontend:**
- React 18 + TypeScript
- Vite (Build tool)
- TailwindCSS (Styling)
- Ant Design (UI Components)
- Chart.js (Data visualization)
- Axios (API client)

---

## 📝 API Endpoints

### Authentication
- `POST /login` - Login and get JWT token
- `POST /register` - Register new user
- `GET /api/me` - Get current user info

### Clients
- `GET /api/clients` - List all clients
- `POST /api/clients` - Create new client
- `GET /api/clients/{id}` - Get client details
- `PUT /api/clients/{id}` - Update client
- `DELETE /api/clients/{id}` - Delete client

### Invoices
- `GET /api/invoices` - List all invoices
- `POST /api/invoices` - Create new invoice
- `GET /api/invoices/{id}` - Get invoice details
- `PUT /api/invoices/{id}/status` - Update invoice status
- `DELETE /api/invoices/{id}` - Delete draft invoice

### Payments
- `POST /api/invoices/{id}/payments` - Record payment
- `GET /api/invoices/{id}/payments` - Get invoice payments

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/recent-activity` - Get recent activity

---

## 🚀 Next Steps

1. **Create your first invoice:**
   - Go to Invoices tab
   - Click "New Invoice"
   - Select a client
   - Add items
   - Click "Create"

2. **Record a payment:**
   - Click on an invoice
   - Click "Record Payment"
   - Enter payment details
   - Submit

3. **Explore the dashboard:**
   - View revenue trends
   - Check overdue invoices
   - Monitor recent activity

---

## 💡 Development Tips

### Hot Reload
Both servers support hot reload:
- Backend: Changes to Python files automatically restart the server
- Frontend: Changes to React files automatically refresh the browser

### Debugging
- Backend logs appear in the terminal running `uvicorn`
- Frontend logs appear in browser console (F12)
- API responses can be inspected in Network tab

### Database GUI Tools
Recommend these tools for database management:
- pgAdmin 4 (free)
- DBeaver (free)
- Postico (Mac, paid)
- TablePlus (paid)

---

## 📞 Need Help?

If you encounter any issues:

1. Check the console/terminal for error messages
2. Verify all services are running
3. Check the Common Issues section above
4. Ensure database connection is working
5. Try resetting the database

---

## 🎯 Quick Start Summary

```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
python init_db.py
uvicorn main_new:app --reload --port 3000

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev

# Browser
# Open http://localhost:5173
# Login: admin@invoice.com / [password from .env]
```

---

## ✨ Features Roadmap

- [ ] PDF Invoice Generation
- [ ] Email Invoice to Client
- [ ] Recurring Invoices
- [ ] Multi-currency Support
- [ ] Payment Gateway Integration
- [ ] Expense Tracking
- [ ] Reports & Analytics
- [ ] Mobile App

---

**Happy Invoicing! 🎉**
