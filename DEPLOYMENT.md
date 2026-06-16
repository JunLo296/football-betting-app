# Quick Deployment Guide

This is a condensed deployment checklist for getting the Family Football Betting App running on your NAS.

## Prerequisites Checklist

- [ ] Docker Engine installed on NAS
- [ ] Docker Compose installed on NAS
- [ ] 500MB free disk space
- [ ] Network access to NAS
- [ ] Git installed (optional, for cloning)

## Deployment Steps

### 1. Get the Code

```bash
# Clone the repository
git clone <repository-url>
cd FBAPP

# OR download and extract ZIP file
```

### 2. Configure Environment

```bash
# Copy the example env file
cp .env.example .env

# Edit .env file with your settings
nano .env
```

**Required Changes:**
```bash
# Generate a secure JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Or manually set a strong password (32+ characters)
JWT_SECRET=your-super-secure-random-secret-key-here
```

**Optional:**
```bash
API_FOOTBALL_KEY=your-api-key-here
ODDS_API_KEY=your-odds-key-here
```

### 3. Build and Start

```bash
# Build and start in detached mode
docker-compose up -d

# Check if container is running
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Initialize Database

```bash
# Run seed script to create admin user and sample data
docker-compose exec football-betting-app npm run seed
```

### 5. Access the Application

Open your browser to:
- **Application**: `http://<nas-ip>:3000`
- **Health Check**: `http://<nas-ip>:3000/api/health`

### 6. Login

**Default Admin Credentials:**
- Username: `admin`
- Password: `admin123`

**Default User Credentials:**
- dad / dad123
- mom / mom123
- son / son123
- daughter / daughter123

**⚠️ IMPORTANT: Change the admin password immediately after first login!**

## Post-Deployment

### Verify Everything Works

1. Login as admin
2. Check the Matches tab
3. Create a test match (if no matches exist)
4. Login as a regular user
5. Place a test bet
6. Return to admin and confirm match result
7. Check leaderboard updates

### Backup Database

```bash
# Create backup
cp data/betting.db data/betting.db.backup

# OR using Docker
docker-compose exec football-betting-app cp /app/data/betting.db /app/data/betting.db.$(date +%Y%m%d)
```

### View Logs

```bash
# View container logs
docker-compose logs -f

# View last 100 lines
docker-compose logs --tail=100
```

### Update Application

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Stop Application

```bash
# Stop containers (keeps data)
docker-compose down

# Stop and remove everything including volumes (DELETES DATABASE!)
docker-compose down -v
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs football-betting-app

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Port Already in Use

Edit `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Changed from 3000:3000
```

### Database Permission Errors

```bash
# Fix permissions
chmod 755 data logs
```

### Cannot Login

1. Check JWT_SECRET is set in .env
2. Run seed script: `docker-compose exec football-betting-app npm run seed`
3. Check logs: `docker-compose logs -f`

### Frontend Not Loading

```bash
# Rebuild with no cache
docker-compose build --no-cache football-betting-app
docker-compose up -d

# Check if backend is accessible
curl http://localhost:3000/api/health
```

## Maintenance

### Regular Backups

```bash
# Add to crontab for daily backups
0 2 * * * cp /path/to/FBAPP/data/betting.db /path/to/backups/betting.db.$(date +\%Y\%m\%d)
```

### Monitor Disk Space

```bash
# Check database size
docker-compose exec football-betting-app ls -lh /app/data/betting.db

# Check container size
docker-compose exec football-betting-app df -h
```

### Database Maintenance

```bash
# Optimize database
docker-compose exec football-betting-app sqlite3 /app/data/betting.db "VACUUM;"
```

## Security Recommendations

1. **Change Default Passwords**: Immediately change admin password
2. **Secure JWT_SECRET**: Use a strong, random 32+ character secret
3. **Use HTTPS**: Set up reverse proxy (nginx/Traefik) for HTTPS
4. **Network Isolation**: Consider restricting to local network only
5. **Regular Backups**: Automate daily database backups
6. **Update Regularly**: Keep Docker images and dependencies updated

## Quick Commands Reference

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Restart
docker-compose restart

# Logs
docker-compose logs -f

# Rebuild
docker-compose build --no-cache

# Seed database
docker-compose exec football-betting-app npm run seed

# Backup database
cp data/betting.db data/betting.db.backup

# Access database
docker-compose exec football-betting-app sqlite3 /app/data/betting.db

# Check container status
docker-compose ps

# View resource usage
docker stats football-betting-app
```

## Support

For detailed documentation, see [README.md](README.md)

For issues, check:
1. Container logs: `docker-compose logs -f`
2. Health endpoint: `http://localhost:3000/api/health`
3. Database file exists: `ls -l data/betting.db`
4. Environment variables: `docker-compose config`

---

**Happy Betting for World Cup 2026!** 🏆⚽
