#!/bin/bash
# Build script for Render deployment

echo "Building Football Betting App..."

# Build frontend
echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install --omit=dev
cd ..

# Copy frontend build to backend public folder
echo "Copying frontend build..."
mkdir -p backend/public
cp -r frontend/dist/* backend/public/

echo "Build completed successfully!"
