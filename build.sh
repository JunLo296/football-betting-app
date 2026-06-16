#!/bin/bash
# Build script for Render deployment
set -e  # Exit on any error

echo "========================================"
echo "Building Football Betting App"
echo "========================================"

# Build frontend
echo ""
echo "Step 1: Building frontend..."
cd frontend
npm install
npm run build

# Verify frontend build succeeded
if [ ! -d "dist" ]; then
  echo "ERROR: Frontend build failed - dist directory not found"
  exit 1
fi

echo "✓ Frontend build completed"
echo "  Build output:"
ls -la dist/
cd ..

# Install backend dependencies
echo ""
echo "Step 2: Installing backend dependencies..."
cd backend
npm install
echo "✓ Backend dependencies installed"
cd ..

# Copy frontend build to backend public folder
echo ""
echo "Step 3: Copying frontend build to backend/public..."
mkdir -p backend/public
cp -rv frontend/dist/* backend/public/

# Verify files were copied
if [ ! -f "backend/public/index.html" ]; then
  echo "ERROR: index.html not found in backend/public"
  exit 1
fi

echo "✓ Frontend files copied successfully"
echo "  Files in backend/public:"
ls -la backend/public/

echo ""
echo "========================================"
echo "Build completed successfully!"
echo "========================================"
