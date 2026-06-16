#!/bin/bash
# Quick Setup Script for WD MyCloud Ultra EX2
# Run this script on your NAS after transferring the files

set -e  # Exit on error

echo "=========================================="
echo "Football Betting App - NAS Setup"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found"
    echo "Please run this script from the FBAPP directory"
    exit 1
fi

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed or not in PATH"
    echo "Please install Docker on your MyCloud NAS first"
    exit 1
fi

echo "✓ Docker found"
echo ""

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."

    # Generate JWT secret
    JWT_SECRET=$(openssl rand -base64 32)

    cat > .env << EOF
# ========================================
# Family Football Betting App
# Docker Deployment Configuration
# ========================================

# REQUIRED: Security Configuration
JWT_SECRET=$JWT_SECRET

# JWT Token Expiration Time
JWT_EXPIRES_IN=7d

# OPTIONAL: External API Keys
# API_FOOTBALL_KEY=
# ODDS_API_KEY=
EOF

    echo "✓ .env file created with secure JWT secret"
    echo ""
    echo "⚠️  IMPORTANT: Save this JWT secret somewhere safe:"
    echo "   $JWT_SECRET"
    echo ""
else
    echo "✓ .env file already exists"
    echo ""
fi

# Build and start the application
echo "🐳 Building and starting Docker container..."
echo "This may take a few minutes on first run..."
echo ""

docker compose down 2>/dev/null || true
docker compose up -d --build

# Wait for container to be ready
echo ""
echo "⏳ Waiting for container to be ready..."
sleep 10

# Check if container is running
if docker compose ps | grep -q "running"; then
    echo "✓ Container is running"
else
    echo "❌ Container failed to start. Check logs with: docker compose logs"
    exit 1
fi

echo ""
echo "📊 Initializing database with sample data..."
echo ""

# Run seed script
docker compose exec football-betting-app npm run seed

echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "Your app is now running at:"
echo "  http://$(hostname -I | awk '{print $1}'):3000"
echo "  or"
echo "  http://$(hostname):3000"
echo ""
echo "Login credentials:"
echo "  Admin:    username=admin, password=admin123"
echo "  Family:   dad/dad123, mom/mom123, son/son123, daughter/daughter123"
echo ""
echo "⚠️  Remember to change the admin password after first login!"
echo ""
echo "Useful commands:"
echo "  View logs:        docker compose logs -f"
echo "  Stop app:         docker compose down"
echo "  Restart app:      docker compose restart"
echo "  Update app:       docker compose down && docker compose up -d --build"
echo ""
echo "=========================================="
