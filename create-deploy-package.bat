@echo off
REM Create deployment package for manual upload to NAS
REM This creates a ZIP file you can upload via MyCloud web interface

echo ==========================================
echo Creating Deployment Package
echo ==========================================
echo.

REM Check if we're in the right directory
if not exist "docker-compose.yml" (
    echo ERROR: docker-compose.yml not found
    echo Please run this script from the FBAPP directory
    pause
    exit /b 1
)

echo Cleaning up old package...
if exist "FBAPP-deploy.zip" del FBAPP-deploy.zip
if exist "temp_deploy" rmdir /s /q temp_deploy

echo.
echo Creating deployment package...
mkdir temp_deploy

echo Copying files...
copy Dockerfile temp_deploy\ >nul 2>&1
copy docker-compose.yml temp_deploy\ >nul 2>&1
copy .dockerignore temp_deploy\ >nul 2>&1
copy .env.example temp_deploy\ >nul 2>&1
copy README.md temp_deploy\ >nul 2>&1
copy MYCLOUD_SETUP.md temp_deploy\ >nul 2>&1
copy setup-nas.sh temp_deploy\ >nul 2>&1

echo Copying backend...
mkdir temp_deploy\backend
mkdir temp_deploy\backend\src
xcopy /E /I /Q backend\src temp_deploy\backend\src\ >nul 2>&1
copy backend\package.json temp_deploy\backend\ >nul 2>&1
if exist "backend\package-lock.json" copy backend\package-lock.json temp_deploy\backend\ >nul 2>&1
if exist "backend\.env.example" copy backend\.env.example temp_deploy\backend\ >nul 2>&1

echo Copying frontend...
mkdir temp_deploy\frontend
mkdir temp_deploy\frontend\src
mkdir temp_deploy\frontend\public
xcopy /E /I /Q frontend\src temp_deploy\frontend\src\ >nul 2>&1
if exist "frontend\public" xcopy /E /I /Q frontend\public temp_deploy\frontend\public\ >nul 2>&1
copy frontend\index.html temp_deploy\frontend\ >nul 2>&1
copy frontend\package.json temp_deploy\frontend\ >nul 2>&1
if exist "frontend\package-lock.json" copy frontend\package-lock.json temp_deploy\frontend\ >nul 2>&1
copy frontend\vite.config.js temp_deploy\frontend\ >nul 2>&1

echo.
echo Creating ZIP archive...
powershell -command "Compress-Archive -Path temp_deploy\* -DestinationPath FBAPP-deploy.zip -Force"

if exist "FBAPP-deploy.zip" (
    echo.
    echo ==========================================
    echo SUCCESS! Package created.
    echo ==========================================
    echo.
    echo File: FBAPP-deploy.zip
    echo Location: %CD%
    echo.
    echo Next steps:
    echo 1. Open your MyCloud web interface at http://192.168.178.1
    echo 2. Navigate to Public share or any shared folder
    echo 3. Create a folder called "FBAPP"
    echo 4. Upload and extract FBAPP-deploy.zip into that folder
    echo 5. Connect via SSH (if available) or use Docker from MyCloud UI
    echo.
    echo See MYCLOUD_SETUP.md for detailed deployment instructions.
    echo.
) else (
    echo.
    echo ERROR: Failed to create ZIP file
    echo.
)

REM Cleanup
rmdir /s /q temp_deploy

echo Press any key to exit...
pause >nul
