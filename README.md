# Family Football Betting App

A fun, family-friendly football betting application designed for the 2026 World Cup. Features a coin-based economy where family members can place bets on matches, compete on leaderboards, and enjoy special betting events - all without real money!

## Features

### Core Functionality
- **User Authentication**: Secure JWT-based authentication system with admin and regular user roles
- **Match Betting**: Bet on match outcomes (home win, draw, away win) with real-time odds
- **Coin Economy**: Daily coin grants, bet payouts, and transaction history
- **Leaderboard**: Track family rankings by total coins earned
- **Live Match Updates**: Real-time score updates and match status tracking
- **Special Bets**: Admin-created special betting opportunities (e.g., "Who will win the Golden Boot?")
- **Admin Panel**: Match management, result confirmation, user administration, and special bet creation

### User Experience
- Mobile-first responsive design
- Bottom tab navigation for easy access
- Real-time betting validation
- Bet history with win/loss tracking
- Match filtering by date, status, and stage

## Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: SQLite3 (file-based, perfect for NAS deployment)
- **Authentication**: JWT with bcrypt password hashing
- **External APIs**:
  - API-Football for match data
  - The Odds API for betting odds
- **Scheduled Jobs**: node-cron for daily tasks
- **Testing**: Jest with Supertest

### Frontend
- **Framework**: Vue.js 3 (Composition API)
- **Build Tool**: Vite
- **Routing**: Vue Router
- **HTTP Client**: Axios
- **Styling**: Native CSS (mobile-first)

### Deployment
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose
- **Database Persistence**: Docker volumes
- **Health Checks**: Built-in health monitoring

## Prerequisites

### For Docker Deployment (Recommended)
- Docker Engine 20.10+
- Docker Compose 2.0+
- 500MB available disk space

### For Local Development
- Node.js 18+
- npm 9+
- Git

### External API Keys (Optional)
- [API-Football](https://www.api-football.com/) API key (for live match data)
- [The Odds API](https://the-odds-api.com/) API key (for real-time odds)

## Quick Start with Docker (NAS Deployment)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd FBAPP
```

### 2. Configure Environment Variables
Create a `.env` file in the project root:

```bash
# Required
JWT_SECRET=your-super-secure-secret-key-min-256-bits-change-this
PORT=3000

# Optional - for live data (can run without these)
API_FOOTBALL_KEY=your-api-football-key
ODDS_API_KEY=your-odds-api-key

# Default values (can be overridden)
JWT_EXPIRES_IN=7d
NODE_ENV=production
```

**Important**: Generate a strong JWT_SECRET:
```bash
# On Linux/Mac/Git Bash
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Build and Start the Application
```bash
# Build and start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Check container status
docker-compose ps
```

### 4. Access the Application
Open your browser to `http://localhost:3000` or `http://<your-nas-ip>:3000`

### 5. Create Admin User
On first run, you'll need to create an admin user. Use the seed script:

```bash
# Run seed script to create admin and sample data
docker-compose exec football-betting-app npm run seed
```

**Default Admin Credentials** (created by seed script):
- Username: `admin`
- Password: `admin123`

**Security Warning**: Change the admin password immediately after first login!

### 6. Stop the Application
```bash
# Stop containers
docker-compose down

# Stop and remove volumes (deletes database!)
docker-compose down -v
```

## Local Development Setup

### 1. Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Backend Environment
Create `backend/.env`:
```bash
PORT=3000
JWT_SECRET=dev-secret-key-not-for-production
JWT_EXPIRES_IN=7d
DATABASE_PATH=./data/betting.db
API_FOOTBALL_KEY=your-key-here
ODDS_API_KEY=your-key-here
NODE_ENV=development
```

### 3. Start Backend Server
```bash
cd backend
npm run dev  # Starts with nodemon for auto-reload
```

### 4. Start Frontend Dev Server
In a new terminal:
```bash
cd frontend
npm run dev  # Starts Vite dev server on port 5173
```

### 5. Create Admin User
```bash
cd backend
npm run seed
```

### 6. Access Development Application
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | Server port |
| `JWT_SECRET` | **Yes** | - | Secret key for JWT signing (min 32 chars) |
| `JWT_EXPIRES_IN` | No | `7d` | JWT token expiration time |
| `DATABASE_PATH` | No | `./data/betting.db` | SQLite database file path |
| `API_FOOTBALL_KEY` | No | - | API-Football API key for live match data |
| `ODDS_API_KEY` | No | - | The Odds API key for live odds |
| `NODE_ENV` | No | `development` | Environment (`development` or `production`) |

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

#### POST `/auth/login`
Login with username and password.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "is_admin": true,
    "total_coins": 100
  }
}
```

#### POST `/auth/register` (Admin only)
Register a new user.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "username": "newuser",
  "password": "password123",
  "email": "user@example.com"
}
```

#### GET `/auth/me`
Get current user info.

**Headers:** `Authorization: Bearer <token>`

### Match Endpoints

#### GET `/matches`
Get all matches with optional filters.

**Query Parameters:**
- `status` - Filter by status (`upcoming`, `live`, `finished`, `confirmed`)
- `date` - Filter by date (YYYY-MM-DD)
- `group` - Filter by group name
- `stage` - Filter by stage

**Headers:** `Authorization: Bearer <token>`

#### GET `/matches/:id`
Get specific match details.

#### POST `/matches/:id/confirm` (Admin only)
Confirm match result and trigger payouts.

**Request:**
```json
{
  "home_score": 2,
  "away_score": 1,
  "result": "home_win"
}
```

### Bet Endpoints

#### POST `/bets`
Place a bet on a match.

**Request:**
```json
{
  "match_id": 1,
  "outcome": "home_win",
  "coins_bet": 10
}
```

**Response:**
```json
{
  "bet_id": 1,
  "new_balance": 90,
  "potential_payout": 18
}
```

#### GET `/bets`
Get current user's bet history.

#### GET `/bets/match/:matchId`
Get all bets for a specific match.

### Leaderboard Endpoints

#### GET `/leaderboard`
Get the leaderboard (top users by coins).

### Admin Endpoints

#### GET `/admin/matches`
Get all matches (admin view).

#### POST `/admin/matches`
Create a new match manually.

#### PUT `/admin/matches/:id`
Update match details.

#### GET `/admin/users`
Get all users.

#### PUT `/admin/users/:id`
Update user (e.g., adjust coins).

### Special Bets Endpoints

#### GET `/special-bets`
Get all special bets.

#### POST `/special-bets` (Admin only)
Create a new special bet.

#### POST `/special-bets/:id/predict`
Place a prediction on a special bet.

## Database Schema

### Tables
- **users** - User accounts with authentication
- **matches** - Football match data
- **bets** - User bets on matches
- **special_bets** - Special betting opportunities
- **special_bet_options** - Options for special bets
- **special_bet_predictions** - User predictions on special bets
- **daily_coin_grants** - Daily coin distribution tracking

See `backend/src/migrations/001_initial_schema.sql` for full schema.

## Testing

### Backend Tests
```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

### Manual Testing Checklist
See the seed data script for pre-populated test scenarios:
- Admin can create matches
- Users can place bets before kickoff
- Bets are locked at kickoff time
- Admin can confirm results
- Payouts are calculated correctly
- Leaderboard updates accurately
- Daily coins are granted

## Troubleshooting

### Docker Issues

**Problem**: Container fails to start
```bash
# Check logs
docker-compose logs football-betting-app

# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

**Problem**: Database permission errors
```bash
# Ensure data directory exists and has correct permissions
mkdir -p data logs
chmod 755 data logs
```

**Problem**: Port 3000 already in use
```bash
# Change port in docker-compose.yml
ports:
  - "3001:3000"  # Changed from 3000:3000
```

### Application Issues

**Problem**: Cannot login
- Ensure you've run the seed script to create admin user
- Check that JWT_SECRET is set
- Verify database file exists in `data/betting.db`

**Problem**: External API errors
- API keys are optional - app works without them
- Check API key validity and rate limits
- View logs for specific error messages

**Problem**: Frontend not loading
- Ensure frontend was built correctly (check Docker logs)
- Try rebuilding: `docker-compose build --no-cache`
- Access backend directly at `http://localhost:3000/api/health`

### Performance Issues

**Problem**: Slow database queries
- SQLite works well for small to medium family use
- Database is indexed on key fields
- Consider limiting query results if dataset grows very large

## Maintenance

### Backup Database
```bash
# Copy database file
cp data/betting.db data/betting.db.backup

# Or using Docker
docker-compose exec football-betting-app cp /app/data/betting.db /app/data/betting.db.backup
```

### Update Application
```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d
```

### View Logs
```bash
# Container logs
docker-compose logs -f

# Application logs (if file-based logging is implemented)
docker-compose exec football-betting-app cat /app/logs/app.log
```

### Database Maintenance
```bash
# Access SQLite database
docker-compose exec football-betting-app sqlite3 /app/data/betting.db

# Run VACUUM to optimize
sqlite> VACUUM;

# Check integrity
sqlite> PRAGMA integrity_check;
```

## Security Considerations

1. **JWT Secret**: Use a strong, random secret key (minimum 32 characters)
2. **Admin Password**: Change default admin password immediately
3. **HTTPS**: Use a reverse proxy (nginx, Traefik) for HTTPS in production
4. **Network**: Consider restricting access to local network only
5. **Backups**: Regularly backup the database file
6. **Updates**: Keep dependencies updated for security patches

## Project Structure

```
FBAPP/
├── backend/
│   ├── src/
│   │   ├── config/          # Database configuration
│   │   ├── middleware/      # Auth & admin middleware
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── migrations/      # Database schema
│   │   ├── app.js           # Express app setup
│   │   ├── server.js        # Server entry point
│   │   └── seed.js          # Seed data script
│   ├── tests/               # Backend tests
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Vue components
│   │   ├── views/           # Page views
│   │   ├── services/        # API & auth services
│   │   ├── router/          # Vue Router config
│   │   ├── App.vue          # Root component
│   │   └── main.js          # Vue entry point
│   └── package.json
├── Dockerfile               # Multi-stage build
├── docker-compose.yml       # Docker orchestration
├── .dockerignore           # Docker build context exclusions
└── README.md               # This file
```

## Credits

- **API-Football**: Match data and live scores
- **The Odds API**: Betting odds data
- Built with Vue.js, Express, and SQLite
- Designed for World Cup 2026 family fun!

## License

MIT License - Free for personal and family use.

---

**Enjoy the 2026 World Cup with your family!** 🏆⚽
