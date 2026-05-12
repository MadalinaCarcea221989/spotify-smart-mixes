@echo off
echo 🎵 Music API Quick Setup
echo ========================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python from python.org
    pause
    exit /b 1
)

echo ✅ Python is installed

:: Install dependencies if needed
echo.
echo 📦 Installing Python packages...
pip install -r ../requirements.txt

if errorlevel 1 (
    echo ❌ Failed to install packages
    pause
    exit /b 1
)

echo ✅ Packages installed

:: Run the setup script
echo.
echo 🚀 Running API setup...
python ../src/backend/setup_apis.py

echo.
echo 🎯 Setup complete! Check the output above.
echo.
pause