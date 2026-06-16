@echo off
REM Transfer Football Betting App to WD MyCloud NAS
REM Run this from Windows

echo ==========================================
echo Football Betting App - Transfer to NAS
echo ==========================================
echo.

REM Check if we're in the right directory
if not exist "docker-compose.yml" (
    echo ERROR: docker-compose.yml not found
    echo Please run this script from the FBAPP directory
    pause
    exit /b 1
)

echo This script will help you transfer the app to your NAS.
echo.
echo Please enter your NAS details:
echo.

set /p NAS_IP="Enter your NAS IP address (e.g., 192.168.1.100): "
set /p NAS_USER="Enter SSH username (usually 'sshd' or 'admin'): "

if "%NAS_IP%"=="" (
    echo ERROR: NAS IP is required
    pause
    exit /b 1
)

if "%NAS_USER%"=="" (
    set NAS_USER=sshd
)

echo.
echo ==========================================
echo Creating deployment package...
echo ==========================================
echo.

REM Create a temporary directory for clean files
if exist "temp_deploy" rmdir /s /q temp_deploy
mkdir temp_deploy

REM Copy necessary files (excluding node_modules and other build artifacts)
echo Copying files...
copy Dockerfile temp_deploy\ >nul 2>&1
copy docker-compose.yml temp_deploy\ >nul 2>&1
copy .dockerignore temp_deploy\ >nul 2>&1
copy .env.example temp_deploy\ >nul 2>&1
copy README.md temp_deploy\ >nul 2>&1
copy MYCLOUD_SETUP.md temp_deploy\ >nul 2>&1
copy setup-nas.sh temp_deploy\ >nul 2>&1

echo Copying backend...
mkdir temp_deploy\backend >nul 2>&1
mkdir temp_deploy\backend\src >nul 2>&1
xcopy /E /I /Y backend\src\* temp_deploy\backend\src\ >nul 2>&1
copy backend\package.json temp_deploy\backend\ >nul 2>&1
copy backend\package-lock.json temp_deploy\backend\ >nul 2>&1
if exist "backend\.env.example" copy backend\.env.example temp_deploy\backend\ >nul 2>&1

echo Copying frontend...
mkdir temp_deploy\frontend >nul 2>&1
mkdir temp_deploy\frontend\src >nul 2>&1
mkdir temp_deploy\frontend\public >nul 2>&1
xcopy /E /I /Y frontend\src\* temp_deploy\frontend\src\ >nul 2>&1
if exist "frontend\public" xcopy /E /I /Y frontend\public\* temp_deploy\frontend\public\ >nul 2>&1
copy frontend\index.html temp_deploy\frontend\ >nul 2>&1
copy frontend\package.json temp_deploy\frontend\ >nul 2>&1
copy frontend\package-lock.json temp_deploy\frontend\ >nul 2>&1
copy frontend\vite.config.js temp_deploy\frontend\ >nul 2>&1

echo.
echo ==========================================
echo Transferring to NAS...
echo ==========================================
echo.
echo Connecting to %NAS_USER%@%NAS_IP%...
echo You will be prompted for your NAS password.
echo.

REM Using SCP to transfer (requires Git Bash or similar)
where scp >nul 2>nul
if errorlevel 1 (
    echo.
    echo ERROR: SCP command not found.
    echo.
    echo Please install Git for Windows or use manual transfer:
    echo 1. Open your MyCloud dashboard in a browser
    echo 2. Navigate to the Public share
    echo 3. Create a folder called 'FBAPP'
    echo 4. Upload the contents of 'temp_deploy' folder
    echo.
    echo The files are ready in: %CD%\temp_deploy
    echo.
    pause
    exit /b 1
)

REM Create archive for transfer
echo Creating archive...
cd temp_deploy
tar -czf ..\FBAPP.tar.gz *
cd ..

echo.
echo Uploading to NAS (this may take a few minutes)...
scp FBAPP.tar.gz %NAS_USER%@%NAS_IP%:/shares/Public/

if errorlevel 1 (
    echo.
    echo ERROR: Failed to transfer files.
    echo Please check:
    echo 1. Your NAS IP address is correct
    echo 2. SSH is enabled on your NAS
    echo 3. Your username and password are correct
    echo.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo Files transferred successfully!
echo ==========================================
echo.
echo Next steps:
echo.
echo 1. Connect to your NAS via SSH:
echo    ssh %NAS_USER%@%NAS_IP%
echo.
echo 2. Extract and set up:
echo    cd /shares/Public
echo    tar -xzf FBAPP.tar.gz -C FBAPP
echo    cd FBAPP
echo    chmod +x setup-nas.sh
echo    ./setup-nas.sh
echo.
echo OR follow the detailed instructions in MYCLOUD_SETUP.md
echo.

REM Cleanup
del FBAPP.tar.gz
rmdir /s /q temp_deploy

echo Press any key to exit...
pause >nul
