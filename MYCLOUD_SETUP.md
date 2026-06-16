# WD MyCloud Ultra EX2 Deployment Guide

## Quick Setup for Your Family

This guide will help you deploy the Football Betting App on your WD MyCloud Ultra EX2 NAS so your family can access it on your local network.

---

## 📋 Prerequisites

1. WD MyCloud Ultra EX2 NAS with Docker support
2. SSH access enabled on your NAS
3. Network access to your NAS (same local network as your family)

---

## 🚀 Deployment Steps

### Step 1: Enable SSH on MyCloud

1. Access your MyCloud dashboard (usually `http://wdmycloud.local` or your NAS IP)
2. Go to **Settings** → **Network** → **Network Services**
3. Enable **SSH**
4. Note your NAS IP address (e.g., `192.168.1.100`)

### Step 2: Connect to Your NAS via SSH

On your Windows machine, open Git Bash or PowerShell and connect:

```bash
ssh sshd@YOUR_NAS_IP
# Default password is usually the admin password you set up
```

### Step 3: Install Docker (if not already installed)

Check if Docker is available:
```bash
docker --version
```

If Docker is not available, you may need to:
1. Update your MyCloud firmware to the latest version
2. Or install Docker manually (MyCloud OS5 supports Docker)

### Step 4: Transfer Files to NAS

**Option A: Using SCP (Secure Copy)**

From your Windows machine (Git Bash):

```bash
# Create a tar archive of the project (excluding unnecessary files)
cd "c:\Users\D056477\OneDrive - SAP SE\Documents\Private"
tar --exclude='FBAPP/node_modules' \
    --exclude='FBAPP/backend/node_modules' \
    --exclude='FBAPP/frontend/node_modules' \
    --exclude='FBAPP/backend/data' \
    --exclude='FBAPP/.git' \
    -czf FBAPP.tar.gz FBAPP/

# Copy to NAS
scp FBAPP.tar.gz sshd@YOUR_NAS_IP:/shares/Public/
```

**Option B: Using MyCloud Web Interface**

1. Access MyCloud dashboard
2. Navigate to **Public** share
3. Create a folder called `FBAPP`
4. Upload these files manually:
   - `Dockerfile`
   - `docker-compose.yml`
   - `.dockerignore`
   - `.env.example`
   - Entire `backend` folder (without `node_modules` or `data` folders)
   - Entire `frontend` folder (without `node_modules` or `dist` folders)
   - `README.md`

### Step 5: Extract and Set Up on NAS

SSH into your NAS and run:

```bash
# Navigate to your public share
cd /shares/Public

# Extract the archive (if using Option A)
tar -xzf FBAPP.tar.gz
cd FBAPP

# Or if you uploaded manually:
cd /shares/Public/FBAPP

# Create environment file
cp .env.example .env

# Generate a secure JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Update .env file with the JWT secret
echo "JWT_SECRET=$JWT_SECRET" > .env
echo "JWT_EXPIRES_IN=7d" >> .env

# Display your JWT secret (save this somewhere secure)
echo "Your JWT Secret: $JWT_SECRET"
```

### Step 6: Build and Start the Application

```bash
# Make sure you're in the FBAPP directory
cd /shares/Public/FBAPP

# Build and start the Docker container
docker compose up -d

# Or if using older docker-compose:
docker-compose up -d

# Check if container is running
docker compose ps
```

### Step 7: Initialize the Database

```bash
# Run the seed script to create admin user and sample data
docker compose exec football-betting-app npm run seed

# You should see output showing:
# ✓ Admin user created
# ✓ Sample users created (dad, mom, son, daughter)
# ✓ Sample matches created
# ✓ 100 coins granted to each user
```

### Step 8: Access the Application

The app is now running! Your family can access it using:

**On the same local network:**
```
http://YOUR_NAS_IP:3000
```

Examples:
- `http://192.168.1.100:3000`
- `http://wdmycloud.local:3000`

**Login Credentials:**
- Admin: `admin` / `admin123`
- Family members: `dad`/`dad123`, `mom`/`mom123`, `son`/`son123`, `daughter`/`daughter123`

**⚠️ Important:** Change the admin password after first login!

---

## 📱 Making it Easy for Family

### Create User Accounts

After logging in as admin, you can:
1. Go to **Admin Panel** (4th tab)
2. Create accounts for each family member with their own passwords
3. Grant initial coins to each member

### Share the Link

Send your family members:
- The local URL: `http://YOUR_NAS_IP:3000`
- Their username and password
- Instructions: "Login and start betting on World Cup matches!"

---

## 🔧 Management Commands

### View Logs
```bash
docker compose logs -f
```

### Stop the App
```bash
docker compose down
```

### Restart the App
```bash
docker compose restart
```

### Backup Database
```bash
# Create a backup
docker compose exec football-betting-app cp /app/data/betting.db /app/data/betting.db.backup

# Copy backup to NAS share
docker cp $(docker compose ps -q football-betting-app):/app/data/betting.db.backup /shares/Public/FBAPP/betting.db.backup
```

### Update the App (when you make changes)
```bash
cd /shares/Public/FBAPP
docker compose down
docker compose build --no-cache
docker compose up -d
```

---

## 🌐 Optional: Access from Outside Your Home Network

If you want family members to access the app from outside your home network:

### Option 1: Port Forwarding (Advanced)
1. Log into your router
2. Forward port 3000 to your NAS IP
3. Access via: `http://YOUR_PUBLIC_IP:3000`
4. **Security Warning:** Only do this if you:
   - Use strong passwords
   - Keep the app updated
   - Understand the security implications

### Option 2: VPN (Recommended)
1. Set up VPN on your router or NAS
2. Family members connect via VPN
3. Access the app as if on local network
4. Much more secure than port forwarding

### Option 3: MyCloud Remote Access
1. Use WD MyCloud's built-in remote access
2. Access via MyCloud web interface
3. Limited to file access (won't work for the app directly)

---

## 🐛 Troubleshooting

### Can't Access the App

**Check if Docker container is running:**
```bash
docker compose ps
```

**Check app logs:**
```bash
docker compose logs football-betting-app
```

**Check port 3000 is accessible:**
```bash
# On NAS
netstat -tuln | grep 3000
```

### Docker Not Found

Your MyCloud may need firmware update or Docker installation:
1. Update to MyCloud OS5 or later
2. Enable Docker via MyCloud dashboard
3. Or use manual Node.js deployment (see alternative below)

### Database Issues

**Reset database:**
```bash
docker compose down -v
docker compose up -d
docker compose exec football-betting-app npm run seed
```

---

## 🔄 Alternative: Deploy Without Docker

If Docker is not available on your MyCloud, you can deploy manually:

### 1. Install Node.js on MyCloud

```bash
# Check if Node.js is available
node --version

# If not, you may need to install it via Entware or compile from source
# This is more complex - Docker is strongly recommended
```

### 2. Run App Directly

```bash
cd /shares/Public/FBAPP/backend
npm install
npm run seed
NODE_ENV=production npm start
```

This is less ideal because:
- App won't auto-start on reboot
- No automatic restarts if it crashes
- Manual process management required

---

## 📞 Support

If you encounter issues:
1. Check the main README.md for detailed documentation
2. Review Docker logs: `docker compose logs`
3. Ensure your NAS firmware is up to date
4. Verify port 3000 is not blocked by firewall

---

## 🎉 Success!

Once deployed, your family can:
- Place bets on World Cup 2026 matches
- Track their predictions
- Compete on the leaderboard
- Manage everything from their phones/tablets/computers

Enjoy the World Cup 2026 with your family! ⚽🏆
