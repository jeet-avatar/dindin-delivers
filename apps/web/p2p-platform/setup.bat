@echo off
setlocal enabledelayedexpansion

echo ======================================================
echo  Invoice Management System - Complete Setup Script
echo ======================================================
echo.

REM Colors not supported in Windows CMD, but we can use symbols
set "SUCCESS=[OK]"
set "ERROR=[ERROR]"
set "INFO=[INFO]"

REM Check Python
echo Checking prerequisites...
echo.

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %ERROR% Python is not installed. Please install Python 3.9+
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
    echo %SUCCESS% Python installed: !PYTHON_VERSION!
)

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %ERROR% Node.js is not installed. Please install Node.js 16+
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo %SUCCESS% Node.js installed: !NODE_VERSION!
)

REM Check PostgreSQL
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %ERROR% PostgreSQL is not installed. Please install PostgreSQL 14+
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('psql --version') do set PG_VERSION=%%i
    echo %SUCCESS% PostgreSQL installed: !PG_VERSION!
)

echo.
echo ================================
echo  Database Setup
echo ================================
echo.

REM Create database
echo %INFO% Creating database 'invoice_db'...
createdb -U postgres invoice_db 2>nul
if %errorlevel% equ 0 (
    echo %SUCCESS% Database created
) else (
    echo %INFO% Database might already exist
)

echo.
echo ================================
echo  Backend Setup
echo ================================
echo.

cd backend

REM Create virtual environment
if not exist "venv" (
    echo %INFO% Creating Python virtual environment...
    python -m venv venv
    echo %SUCCESS% Virtual environment created
) else (
    echo %INFO% Virtual environment already exists
)

REM Activate virtual environment
echo %INFO% Activating virtual environment...
call venv\Scripts\activate

REM Install dependencies
echo %INFO% Installing Python dependencies...
python -m pip install --upgrade pip -q
pip install -r requirements.txt -q
echo %SUCCESS% Dependencies installed

REM Setup environment file
if not exist ".env" (
    echo %INFO% Creating .env file...
    copy .env.example .env
    echo %SUCCESS% .env file created
) else (
    echo %INFO% .env file already exists
)

REM Initialize database
echo %INFO% Initializing database with sample data...
python init_db.py

REM Move main_new.py to main.py if needed
if exist "main_new.py" (
    if exist "main.py" (
        move /y main.py main_old.py >nul
        echo %INFO% Backed up old main.py to main_old.py
    )
    move /y main_new.py main.py >nul
    echo %SUCCESS% Updated main.py
)

cd ..

echo.
echo ================================
echo  Frontend Setup
echo ================================
echo.

cd frontend

REM Install Node dependencies
if not exist "node_modules" (
    echo %INFO% Installing Node.js dependencies...
    call npm install
    echo %SUCCESS% Dependencies installed
) else (
    echo %INFO% Node modules already installed
)

REM Create .env file
if not exist ".env" (
    echo %INFO% Creating frontend .env file...
    echo VITE_API_URL=http://localhost:3000 > .env
    echo %SUCCESS% Frontend .env created
) else (
    echo %INFO% Frontend .env already exists
)

cd ..

echo.
echo ================================
echo  Setup Complete!
echo ================================
echo.
echo %SUCCESS% All setup steps completed successfully!
echo.
echo Next steps:
echo.
echo 1. Start the backend server (in this terminal):
echo    cd backend
echo    venv\Scripts\activate
echo    uvicorn main:app --reload --port 3000
echo.
echo 2. In a new terminal, start the frontend:
echo    cd frontend
echo    npm run dev
echo.
echo 3. Open your browser:
echo    http://localhost:5173
echo.
echo Login credentials:
echo    Email: admin@invoice.com
echo    Password: admin123
echo.
echo API Documentation:
echo    http://localhost:3000/docs
echo.
echo Happy invoicing!
echo.
pause
