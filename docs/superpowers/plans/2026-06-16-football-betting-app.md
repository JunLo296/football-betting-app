# Family Football Betting App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a family betting app for World Cup 2026 with coin-based economy, running on NAS via Docker with mobile-first Vue.js frontend.

**Architecture:** Node.js/Express backend with SQLite database, JWT auth, external APIs for match data/odds, Vue.js 3 frontend with tabbed navigation, Docker containerized deployment.

**Tech Stack:** Node.js v18+, Express, SQLite3, JWT, bcrypt, node-cron, axios, Vue.js 3, Docker

---

## File Structure

This plan will create the following structure:

```
FBAPP/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js          # SQLite connection & initialization
│   │   ├── middleware/
│   │   │   ├── auth.js              # JWT verification middleware
│   │   │   └── admin.js             # Admin-only middleware
│   │   ├── models/
│   │   │   ├── User.js              # User database operations
│   │   │   ├── Match.js             # Match database operations
│   │   │   ├── Bet.js               # Bet database operations
│   │   │   ├── SpecialBet.js        # Special bet database operations
│   │   │   └── CoinTransaction.js   # Coin history operations
│   │   ├── services/
│   │   │   ├── authService.js       # Authentication logic (bcrypt, JWT)
│   │   │   ├── betService.js        # Bet validation & placement
│   │   │   ├── payoutService.js     # Payout calculation logic
│   │   │   ├── apiFootballService.js # API-Football integration
│   │   │   ├── oddsApiService.js    # The Odds API integration
│   │   │   └── cronService.js       # Scheduled tasks
│   │   ├── routes/
│   │   │   ├── auth.js              # Auth endpoints
│   │   │   ├── matches.js           # Match endpoints
│   │   │   ├── bets.js              # Bet endpoints
│   │   │   ├── specialBets.js       # Special bet endpoints
│   │   │   ├── coins.js             # Coin endpoints
│   │   │   ├── leaderboard.js       # Leaderboard endpoints
│   │   │   └── admin.js             # Admin endpoints
│   │   ├── migrations/
│   │   │   └── 001_initial_schema.sql # Database schema
│   │   ├── app.js                   # Express app setup
│   │   └── server.js                # Server entry point
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── payoutService.test.js
│   │   │   ├── betService.test.js
│   │   │   └── authService.test.js
│   │   └── integration/
│   │       ├── auth.test.js
│   │       ├── bets.test.js
│   │       └── matches.test.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── MatchCard.vue        # Match display card
│   │   │   ├── BettingModal.vue     # Bet placement modal
│   │   │   ├── BetCard.vue          # My bets display
│   │   │   ├── LeaderboardTable.vue # Leaderboard display
│   │   │   └── TabNavigation.vue    # Bottom tab nav
│   │   ├── views/
│   │   │   ├── Login.vue            # Login screen
│   │   │   ├── Matches.vue          # Matches tab
│   │   │   ├── MyBets.vue           # My Bets tab
│   │   │   ├── Ranking.vue          # Ranking tab
│   │   │   └── Admin.vue            # Admin panel
│   │   ├── services/
│   │   │   ├── api.js               # Axios instance with interceptors
│   │   │   └── auth.js              # Auth helpers (token storage)
│   │   ├── router/
│   │   │   └── index.js             # Vue Router config
│   │   ├── App.vue                  # Root component
│   │   └── main.js                  # Vue app entry
│   ├── package.json
│   └── vite.config.js
├── docker-compose.yml
├── Dockerfile
├── .dockerignore
├── .gitignore
└── README.md
```

---

## Phase 1: Backend Foundation

### Task 1: Project Setup & Database Schema

**Files:**
- Create: `backend/package.json`
- Create: `backend/.env.example`
- Create: `backend/src/config/database.js`
- Create: `backend/src/migrations/001_initial_schema.sql`
- Create: `backend/.gitignore`

- [ ] **Step 1: Initialize backend project**

```bash
mkdir -p backend/src/{config,middleware,models,services,routes,migrations}
mkdir -p backend/tests/{unit,integration}
cd backend
npm init -y
```

- [ ] **Step 2: Install dependencies**

```bash
npm install express sqlite3 bcryptjs jsonwebtoken dotenv cors express-rate-limit node-cron axios
npm install --save-dev jest supertest nodemon
```

- [ ] **Step 3: Create .env.example**

```env
# backend/.env.example
PORT=3000
JWT_SECRET=your-secret-key-min-256-bits
JWT_EXPIRES_IN=7d
DATABASE_PATH=./data/betting.db
API_FOOTBALL_KEY=your-api-football-key
ODDS_API_KEY=your-odds-api-key
NODE_ENV=development
```

- [ ] **Step 4: Create .gitignore**

```
# backend/.gitignore
node_modules/
.env
data/
*.log
coverage/
```

- [ ] **Step 5: Write database schema migration**

```sql
-- backend/src/migrations/001_initial_schema.sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT,
  is_admin BOOLEAN DEFAULT 0,
  total_coins REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_match_id TEXT UNIQUE,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  kickoff_time DATETIME NOT NULL,
  match_date DATE NOT NULL,
  stage TEXT NOT NULL,
  group_name TEXT,
  home_odds REAL,
  draw_odds REAL,
  away_odds REAL,
  home_score INTEGER,
  away_score INTEGER,
  result TEXT,
  status TEXT DEFAULT 'upcoming',
  confirmed_by_admin_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  match_id INTEGER NOT NULL,
  outcome TEXT NOT NULL,
  coins_bet REAL NOT NULL,
  odds_at_bet_time REAL NOT NULL,
  payout REAL,
  is_winner BOOLEAN,
  placed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (match_id) REFERENCES matches(id)
);

CREATE TABLE IF NOT EXISTS special_bets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  lock_time DATETIME NOT NULL,
  status TEXT DEFAULT 'open',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS special_bet_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  special_bet_id INTEGER NOT NULL,
  option_text TEXT NOT NULL,
  odds REAL NOT NULL,
  is_correct BOOLEAN,
  FOREIGN KEY (special_bet_id) REFERENCES special_bets(id)
);

CREATE TABLE IF NOT EXISTS special_bet_predictions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  special_bet_option_id INTEGER NOT NULL,
  coins_bet REAL NOT NULL,
  odds_at_bet_time REAL NOT NULL,
  payout REAL,
  is_winner BOOLEAN,
  placed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (special_bet_option_id) REFERENCES special_bet_options(id)
);

CREATE TABLE IF NOT EXISTS daily_coin_grants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  grant_date DATE NOT NULL,
  coins_granted REAL DEFAULT 10,
  granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, grant_date)
);

CREATE INDEX idx_bets_user ON bets(user_id);
CREATE INDEX idx_bets_match ON bets(match_id);
CREATE INDEX idx_matches_date ON matches(match_date);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_special_predictions_user ON special_bet_predictions(user_id);
```

- [ ] **Step 6: Create database config module**

```javascript
// backend/src/config/database.js
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || './data/betting.db';

function initDatabase() {
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('Error opening database:', err);
      throw err;
    }
    console.log('Connected to SQLite database');
  });

  db.configure('busyTimeout', 3000);
  db.run('PRAGMA foreign_keys = ON');

  return db;
}

function runMigrations(db) {
  const migrationPath = path.join(__dirname, '../migrations/001_initial_schema.sql');
  const migration = fs.readFileSync(migrationPath, 'utf8');
  
  return new Promise((resolve, reject) => {
    db.exec(migration, (err) => {
      if (err) {
        console.error('Migration failed:', err);
        reject(err);
      } else {
        console.log('Migrations completed successfully');
        resolve();
      }
    });
  });
}

module.exports = { initDatabase, runMigrations };
```

- [ ] **Step 7: Update package.json scripts**

```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest --coverage",
    "test:watch": "jest --watch"
  },
  "jest": {
    "testEnvironment": "node",
    "coveragePathIgnorePatterns": ["/node_modules/"],
    "testMatch": ["**/tests/**/*.test.js"]
  }
}
```

- [ ] **Step 8: Commit**

```bash
git add backend/
git commit -m "feat: initialize backend project with database schema"
```

---

### Task 2: User Model & Authentication Service (TDD)

**Files:**
- Create: `backend/tests/unit/authService.test.js`
- Create: `backend/src/models/User.js`
- Create: `backend/src/services/authService.js`

- [ ] **Step 1: Write failing test for user registration**

```javascript
// backend/tests/unit/authService.test.js
const authService = require('../../src/services/authService');
const User = require('../../src/models/User');

jest.mock('../../src/models/User');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should hash password and create user', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com'
      };

      User.create.mockResolvedValue({ id: 1, username: 'testuser', email: 'test@example.com' });

      const user = await authService.register(userData);

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'testuser',
          email: 'test@example.com',
          password_hash: expect.any(String)
        })
      );
      expect(user.password_hash).toBeUndefined();
    });

    it('should throw error if username exists', async () => {
      User.create.mockRejectedValue({ code: 'SQLITE_CONSTRAINT' });

      await expect(
        authService.register({ username: 'existing', password: 'pass' })
      ).rejects.toThrow('Username already exists');
    });
  });

  describe('login', () => {
    it('should return token and user for valid credentials', async () => {
      const hashedPassword = await require('bcryptjs').hash('password123', 10);
      User.findByUsername.mockResolvedValue({
        id: 1,
        username: 'testuser',
        password_hash: hashedPassword,
        is_admin: false,
        total_coins: 50
      });

      const result = await authService.login('testuser', 'password123');

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user.password_hash).toBeUndefined();
    });

    it('should throw error for invalid password', async () => {
      User.findByUsername.mockResolvedValue({
        id: 1,
        username: 'testuser',
        password_hash: await require('bcryptjs').hash('correctpass', 10)
      });

      await expect(
        authService.login('testuser', 'wrongpass')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for non-existent user', async () => {
      User.findByUsername.mockResolvedValue(null);

      await expect(
        authService.login('nonexistent', 'pass')
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('verifyToken', () => {
    it('should return user data for valid token', async () => {
      const token = await authService.generateToken({ id: 1, username: 'test', is_admin: false });
      
      const decoded = await authService.verifyToken(token);

      expect(decoded).toMatchObject({
        id: 1,
        username: 'test',
        is_admin: false
      });
    });

    it('should throw error for invalid token', async () => {
      await expect(
        authService.verifyToken('invalid.token.here')
      ).rejects.toThrow();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend
npm test -- authService.test.js
```

Expected: FAIL with "authService module not found" or similar

- [ ] **Step 3: Create User model**

```javascript
// backend/src/models/User.js
const { initDatabase } = require('../config/database');

class User {
  static db = initDatabase();

  static create(userData) {
    return new Promise((resolve, reject) => {
      const { username, password_hash, email, is_admin = false } = userData;
      
      const query = `
        INSERT INTO users (username, password_hash, email, is_admin, total_coins)
        VALUES (?, ?, ?, ?, 0)
      `;

      this.db.run(query, [username, password_hash, email, is_admin ? 1 : 0], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, username, email, is_admin, total_coins: 0 });
        }
      });
    });
  }

  static findByUsername(username) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM users WHERE username = ?';
      
      this.db.get(query, [username], (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }

  static findById(id) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM users WHERE id = ?';
      
      this.db.get(query, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }

  static updateCoins(userId, amount) {
    return new Promise((resolve, reject) => {
      const query = 'UPDATE users SET total_coins = total_coins + ? WHERE id = ?';
      
      this.db.run(query, [amount, userId], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  static getAll() {
    return new Promise((resolve, reject) => {
      const query = 'SELECT id, username, email, is_admin, total_coins, created_at FROM users';
      
      this.db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = User;
```

- [ ] **Step 4: Create auth service**

```javascript
// backend/src/services/authService.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

class AuthService {
  async register(userData) {
    const { username, password, email, is_admin = false } = userData;

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const user = await User.create({
        username,
        password_hash: hashedPassword,
        email,
        is_admin
      });

      delete user.password_hash;
      return user;
    } catch (err) {
      if (err.code === 'SQLITE_CONSTRAINT') {
        throw new Error('Username already exists');
      }
      throw err;
    }
  }

  async login(username, password) {
    const user = await User.findByUsername(username);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    const token = await this.generateToken({
      id: user.id,
      username: user.username,
      is_admin: user.is_admin
    });

    delete user.password_hash;

    return { token, user };
  }

  async generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  async verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (err) {
      throw new Error('Invalid or expired token');
    }
  }
}

module.exports = new AuthService();
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- authService.test.js
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/models/User.js backend/src/services/authService.js backend/tests/unit/authService.test.js
git commit -m "feat: add user model and authentication service with tests"
```

---

### Task 3: Authentication Middleware & Routes

**Files:**
- Create: `backend/src/middleware/auth.js`
- Create: `backend/src/middleware/admin.js`
- Create: `backend/tests/integration/auth.test.js`
- Create: `backend/src/routes/auth.js`
- Create: `backend/src/app.js`
- Create: `backend/src/server.js`

- [ ] **Step 1: Write failing integration test for auth endpoints**

```javascript
// backend/tests/integration/auth.test.js
const request = require('supertest');
const app = require('../../src/app');
const { initDatabase, runMigrations } = require('../../src/config/database');

describe('Auth Endpoints', () => {
  let db;

  beforeAll(async () => {
    process.env.DATABASE_PATH = ':memory:';
    db = initDatabase();
    await runMigrations(db);
  });

  afterAll((done) => {
    db.close(done);
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user (admin only)', async () => {
      // First create admin user directly
      const adminToken = await createAdminUser();

      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'newuser',
          password: 'password123',
          email: 'new@example.com'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.username).toBe('newuser');
      expect(res.body.user.password_hash).toBeUndefined();
    });

    it('should reject registration without admin token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'unauthorized',
          password: 'pass'
        });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.username).toBe('admin');
    });

    it('should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin123' });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginRes.body.token}`);

      expect(res.status).toBe(200);
      expect(res.body.username).toBe('admin');
    });

    it('should reject request without token', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
    });
  });
});

async function createAdminUser() {
  const authService = require('../../src/services/authService');
  const user = await authService.register({
    username: 'admin',
    password: 'admin123',
    email: 'admin@example.com',
    is_admin: true
  });
  return await authService.generateToken({
    id: user.id,
    username: user.username,
    is_admin: true
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- auth.test.js
```

Expected: FAIL with "app module not found"

- [ ] **Step 3: Create auth middleware**

```javascript
// backend/src/middleware/auth.js
const authService = require('../services/authService');
const User = require('../models/User');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = await authService.verifyToken(token);

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      is_admin: user.is_admin,
      total_coins: user.total_coins
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = authenticate;
```

```javascript
// backend/src/middleware/admin.js
function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = requireAdmin;
```

- [ ] **Step 4: Create auth routes**

```javascript
// backend/src/routes/auth.js
const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const authenticate = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');

router.post('/register', authenticate, requireAdmin, async (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await authService.register({ username, password, email });

    res.status(201).json({ user });
  } catch (err) {
    if (err.message === 'Username already exists') {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await authService.login(username, password);

    res.json(result);
  } catch (err) {
    if (err.message === 'Invalid credentials') {
      return res.status(401).json({ error: err.message });
    }
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  res.json(req.user);
});

module.exports = router;
```

- [ ] **Step 5: Create Express app**

```javascript
// backend/src/app.js
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;
```

```javascript
// backend/src/server.js
require('dotenv').config();
const app = require('./app');
const { initDatabase, runMigrations } = require('./config/database');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    const db = initDatabase();
    await runMigrations(db);

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm test -- auth.test.js
```

Expected: PASS

- [ ] **Step 7: Manually test server**

```bash
# Create .env file
echo "PORT=3000
JWT_SECRET=test-secret-key-for-development-only
DATABASE_PATH=./data/betting.db" > .env

# Start server
npm run dev
```

Test in another terminal:
```bash
# Should fail (no admin yet)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

- [ ] **Step 8: Commit**

```bash
git add backend/src/middleware/ backend/src/routes/auth.js backend/src/app.js backend/src/server.js backend/tests/integration/auth.test.js
git commit -m "feat: add authentication middleware and routes"
```

---

### Task 4: Match Model & Basic CRUD (TDD)

**Files:**
- Create: `backend/src/models/Match.js`
- Create: `backend/tests/unit/Match.test.js`
- Create: `backend/src/routes/matches.js`

- [ ] **Step 1: Write failing test for Match model**

```javascript
// backend/tests/unit/Match.test.js
const Match = require('../../src/models/Match');
const { initDatabase, runMigrations } = require('../../src/config/database');

describe('Match Model', () => {
  let db;

  beforeAll(async () => {
    process.env.DATABASE_PATH = ':memory:';
    db = initDatabase();
    await runMigrations(db);
  });

  afterAll((done) => {
    db.close(done);
  });

  describe('create', () => {
    it('should create a match', async () => {
      const matchData = {
        api_match_id: 'api_123',
        home_team: 'Germany',
        away_team: 'Spain',
        kickoff_time: '2026-06-20T18:00:00Z',
        match_date: '2026-06-20',
        stage: 'group_stage',
        group_name: 'A',
        home_odds: 1.8,
        draw_odds: 3.2,
        away_odds: 4.5
      };

      const match = await Match.create(matchData);

      expect(match.id).toBeDefined();
      expect(match.home_team).toBe('Germany');
      expect(match.status).toBe('upcoming');
    });
  });

  describe('findById', () => {
    it('should find match by id', async () => {
      const created = await Match.create({
        api_match_id: 'api_456',
        home_team: 'Brazil',
        away_team: 'Argentina',
        kickoff_time: '2026-06-21T21:00:00Z',
        match_date: '2026-06-21',
        stage: 'group_stage',
        group_name: 'B',
        home_odds: 2.1,
        draw_odds: 3.0,
        away_odds: 3.5
      });

      const match = await Match.findById(created.id);

      expect(match.home_team).toBe('Brazil');
    });
  });

  describe('getAll', () => {
    it('should return all matches with filters', async () => {
      const matches = await Match.getAll({ status: 'upcoming' });

      expect(Array.isArray(matches)).toBe(true);
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  describe('updateStatus', () => {
    it('should update match status', async () => {
      const match = await Match.create({
        api_match_id: 'api_789',
        home_team: 'France',
        away_team: 'England',
        kickoff_time: '2026-06-22T15:00:00Z',
        match_date: '2026-06-22',
        stage: 'group_stage',
        group_name: 'C',
        home_odds: 1.9,
        draw_odds: 3.1,
        away_odds: 4.2
      });

      await Match.updateStatus(match.id, 'live');

      const updated = await Match.findById(match.id);
      expect(updated.status).toBe('live');
    });
  });

  describe('confirmResult', () => {
    it('should confirm match result', async () => {
      const match = await Match.create({
        api_match_id: 'api_999',
        home_team: 'Italy',
        away_team: 'Netherlands',
        kickoff_time: '2026-06-23T18:00:00Z',
        match_date: '2026-06-23',
        stage: 'group_stage',
        group_name: 'D',
        home_odds: 2.0,
        draw_odds: 3.0,
        away_odds: 3.8
      });

      await Match.confirmResult(match.id, {
        home_score: 2,
        away_score: 1,
        result: 'home_win'
      });

      const updated = await Match.findById(match.id);
      expect(updated.home_score).toBe(2);
      expect(updated.away_score).toBe(1);
      expect(updated.result).toBe('home_win');
      expect(updated.status).toBe('confirmed');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- Match.test.js
```

Expected: FAIL

- [ ] **Step 3: Implement Match model**

```javascript
// backend/src/models/Match.js
const { initDatabase } = require('../config/database');

class Match {
  static db = initDatabase();

  static create(matchData) {
    return new Promise((resolve, reject) => {
      const {
        api_match_id,
        home_team,
        away_team,
        kickoff_time,
        match_date,
        stage,
        group_name,
        home_odds,
        draw_odds,
        away_odds
      } = matchData;

      const query = `
        INSERT INTO matches (
          api_match_id, home_team, away_team, kickoff_time, match_date,
          stage, group_name, home_odds, draw_odds, away_odds
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      this.db.run(
        query,
        [api_match_id, home_team, away_team, kickoff_time, match_date, stage, group_name, home_odds, draw_odds, away_odds],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...matchData, status: 'upcoming' });
        }
      );
    });
  }

  static findById(id) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM matches WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }

  static getAll(filters = {}) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM matches WHERE 1=1';
      const params = [];

      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }

      if (filters.group) {
        query += ' AND group_name = ?';
        params.push(filters.group);
      }

      if (filters.stage) {
        query += ' AND stage = ?';
        params.push(filters.stage);
      }

      if (filters.date) {
        query += ' AND match_date = ?';
        params.push(filters.date);
      }

      query += ' ORDER BY kickoff_time ASC';

      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  static updateStatus(id, status) {
    return new Promise((resolve, reject) => {
      const query = 'UPDATE matches SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      
      this.db.run(query, [status, id], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  static updateScores(id, homeScore, awayScore) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE matches 
        SET home_score = ?, away_score = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;
      
      this.db.run(query, [homeScore, awayScore, id], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  static confirmResult(id, resultData) {
    return new Promise((resolve, reject) => {
      const { home_score, away_score, result } = resultData;
      
      const query = `
        UPDATE matches 
        SET home_score = ?, away_score = ?, result = ?, status = 'confirmed',
            confirmed_by_admin_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      this.db.run(query, [home_score, away_score, result, id], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  static getLiveMatches() {
    return new Promise((resolve, reject) => {
      this.db.all("SELECT * FROM matches WHERE status = 'live'", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  static getMatchesByDate(date) {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM matches WHERE match_date = ?', [date], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = Match;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- Match.test.js
```

Expected: PASS

- [ ] **Step 5: Create match routes**

```javascript
// backend/src/routes/matches.js
const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const authenticate = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');

router.get('/', authenticate, async (req, res) => {
  try {
    const { status, group, stage, date } = req.query;
    const matches = await Match.getAll({ status, group, stage, date });
    res.json({ matches });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    res.json(match);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch match' });
  }
});

router.post('/:id/confirm', authenticate, requireAdmin, async (req, res) => {
  try {
    const { home_score, away_score, result } = req.body;

    if (home_score == null || away_score == null || !result) {
      return res.status(400).json({ error: 'home_score, away_score, and result are required' });
    }

    if (!['home_win', 'draw', 'away_win'].includes(result)) {
      return res.status(400).json({ error: 'Invalid result value' });
    }

    await Match.confirmResult(req.params.id, { home_score, away_score, result });

    res.json({ message: 'Match result confirmed', match_id: parseInt(req.params.id) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to confirm match' });
  }
});

module.exports = router;
```

- [ ] **Step 6: Register match routes in app**

```javascript
// backend/src/app.js (add after authRoutes)
const matchRoutes = require('./routes/matches');
app.use('/api/matches', matchRoutes);
```

- [ ] **Step 7: Commit**

```bash
git add backend/src/models/Match.js backend/tests/unit/Match.test.js backend/src/routes/matches.js backend/src/app.js
git commit -m "feat: add match model and routes"
```

---

### Task 5: Bet Model & Service (TDD)

**Files:**
- Create: `backend/src/models/Bet.js`
- Create: `backend/tests/unit/betService.test.js`
- Create: `backend/src/services/betService.js`

- [ ] **Step 1: Write failing test for bet service**

```javascript
// backend/tests/unit/betService.test.js
const betService = require('../../src/services/betService');
const Bet = require('../../src/models/Bet');
const Match = require('../../src/models/Match');
const User = require('../../src/models/User');

jest.mock('../../src/models/Bet');
jest.mock('../../src/models/Match');
jest.mock('../../src/models/User');

describe('BetService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('placeBet', () => {
    it('should place a valid bet', async () => {
      const betData = {
        user_id: 1,
        match_id: 1,
        outcome: 'home_win',
        coins_bet: 10
      };

      User.findById.mockResolvedValue({ id: 1, total_coins: 50 });
      Match.findById.mockResolvedValue({
        id: 1,
        kickoff_time: new Date(Date.now() + 3600000).toISOString(),
        home_odds: 1.8,
        draw_odds: 3.2,
        away_odds: 4.5
      });
      Bet.create.mockResolvedValue({ id: 1, ...betData, odds_at_bet_time: 1.8 });
      User.updateCoins.mockResolvedValue({ changes: 1 });

      const result = await betService.placeBet(betData);

      expect(Bet.create).toHaveBeenCalled();
      expect(User.updateCoins).toHaveBeenCalledWith(1, -10);
      expect(result.potential_payout).toBe(18);
    });

    it('should reject bet with insufficient coins', async () => {
      User.findById.mockResolvedValue({ id: 1, total_coins: 5 });
      Match.findById.mockResolvedValue({
        id: 1,
        kickoff_time: new Date(Date.now() + 3600000).toISOString()
      });

      await expect(
        betService.placeBet({ user_id: 1, match_id: 1, outcome: 'home_win', coins_bet: 10 })
      ).rejects.toThrow('Insufficient coins');
    });

    it('should reject bet on locked match', async () => {
      User.findById.mockResolvedValue({ id: 1, total_coins: 50 });
      Match.findById.mockResolvedValue({
        id: 1,
        kickoff_time: new Date(Date.now() - 3600000).toISOString()
      });

      await expect(
        betService.placeBet({ user_id: 1, match_id: 1, outcome: 'home_win', coins_bet: 10 })
      ).rejects.toThrow('Match is locked');
    });

    it('should reject invalid outcome', async () => {
      User.findById.mockResolvedValue({ id: 1, total_coins: 50 });
      Match.findById.mockResolvedValue({
        id: 1,
        kickoff_time: new Date(Date.now() + 3600000).toISOString()
      });

      await expect(
        betService.placeBet({ user_id: 1, match_id: 1, outcome: 'invalid', coins_bet: 10 })
      ).rejects.toThrow('Invalid outcome');
    });

    it('should reject bet with invalid coin amount', async () => {
      User.findById.mockResolvedValue({ id: 1, total_coins: 50 });

      await expect(
        betService.placeBet({ user_id: 1, match_id: 1, outcome: 'home_win', coins_bet: 0 })
      ).rejects.toThrow('Coins must be greater than 0');
    });
  });

  describe('validateBet', () => {
    it('should validate correct bet data', async () => {
      User.findById.mockResolvedValue({ id: 1, total_coins: 50 });
      Match.findById.mockResolvedValue({
        id: 1,
        kickoff_time: new Date(Date.now() + 3600000).toISOString()
      });

      await expect(
        betService.validateBet(1, 1, 'home_win', 10)
      ).resolves.not.toThrow();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- betService.test.js
```

Expected: FAIL

- [ ] **Step 3: Create Bet model**

```javascript
// backend/src/models/Bet.js
const { initDatabase } = require('../config/database');

class Bet {
  static db = initDatabase();

  static create(betData) {
    return new Promise((resolve, reject) => {
      const { user_id, match_id, outcome, coins_bet, odds_at_bet_time } = betData;

      const query = `
        INSERT INTO bets (user_id, match_id, outcome, coins_bet, odds_at_bet_time)
        VALUES (?, ?, ?, ?, ?)
      `;

      this.db.run(
        query,
        [user_id, match_id, outcome, coins_bet, odds_at_bet_time],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...betData });
        }
      );
    });
  }

  static findById(id) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM bets WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }

  static findByUser(userId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT b.*, m.home_team, m.away_team, m.kickoff_time, m.status as match_status
        FROM bets b
        JOIN matches m ON b.match_id = m.id
        WHERE b.user_id = ?
        ORDER BY b.placed_at DESC
      `;

      this.db.all(query, [userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  static findByMatch(matchId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT b.*, u.username
        FROM bets b
        JOIN users u ON b.user_id = u.id
        WHERE b.match_id = ?
      `;

      this.db.all(query, [matchId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  static updatePayout(betId, payout, isWinner) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE bets 
        SET payout = ?, is_winner = ?
        WHERE id = ?
      `;

      this.db.run(query, [payout, isWinner ? 1 : 0, betId], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  static getWinningBets(matchId, outcome) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM bets 
        WHERE match_id = ? AND outcome = ?
      `;

      this.db.all(query, [matchId, outcome], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = Bet;
```

- [ ] **Step 4: Create bet service**

```javascript
// backend/src/services/betService.js
const Bet = require('../models/Bet');
const Match = require('../models/Match');
const User = require('../models/User');

class BetService {
  async placeBet(betData) {
    const { user_id, match_id, outcome, coins_bet } = betData;

    await this.validateBet(user_id, match_id, outcome, coins_bet);

    const user = await User.findById(user_id);
    const match = await Match.findById(match_id);

    const odds = this.getOddsForOutcome(match, outcome);

    await User.updateCoins(user_id, -coins_bet);

    const bet = await Bet.create({
      user_id,
      match_id,
      outcome,
      coins_bet,
      odds_at_bet_time: odds
    });

    return {
      bet_id: bet.id,
      new_balance: user.total_coins - coins_bet,
      potential_payout: coins_bet * odds
    };
  }

  async validateBet(userId, matchId, outcome, coinsBet) {
    if (coinsBet <= 0 || isNaN(coinsBet)) {
      throw new Error('Coins must be greater than 0');
    }

    if (!['home_win', 'draw', 'away_win'].includes(outcome)) {
      throw new Error('Invalid outcome');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.total_coins < coinsBet) {
      throw new Error('Insufficient coins');
    }

    const match = await Match.findById(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    const kickoffTime = new Date(match.kickoff_time);
    if (Date.now() >= kickoffTime.getTime()) {
      throw new Error('Match is locked');
    }
  }

  getOddsForOutcome(match, outcome) {
    switch (outcome) {
      case 'home_win':
        return match.home_odds;
      case 'draw':
        return match.draw_odds;
      case 'away_win':
        return match.away_odds;
      default:
        throw new Error('Invalid outcome');
    }
  }

  async getUserBets(userId) {
    const bets = await Bet.findByUser(userId);

    return bets.map(bet => ({
      id: bet.id,
      match: {
        home_team: bet.home_team,
        away_team: bet.away_team,
        kickoff_time: bet.kickoff_time
      },
      outcome: bet.outcome,
      coins_bet: bet.coins_bet,
      odds_at_bet_time: bet.odds_at_bet_time,
      potential_payout: bet.coins_bet * bet.odds_at_bet_time,
      is_winner: bet.is_winner,
      status: bet.is_winner === null ? 'pending' : (bet.is_winner ? 'won' : 'lost')
    }));
  }
}

module.exports = new BetService();
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- betService.test.js
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/models/Bet.js backend/src/services/betService.js backend/tests/unit/betService.test.js
git commit -m "feat: add bet model and service with validation"
```

---

Due to the length limit, I'll continue with a summary of remaining tasks. The full plan would continue with:

### Task 6: Bet Routes & Integration Tests
### Task 7: Payout Service (TDD)
### Task 8: External API Services (API-Football & Odds API)
### Task 9: Cron Jobs (Daily Coins, Odds Update, Live Scores)
### Task 10: Special Bets Model & Routes
### Task 11: Coins & Leaderboard Routes
### Task 12: Admin Routes

## Phase 2: Frontend Development

### Task 13: Vue.js Project Setup
### Task 14: API Service & Auth Store
### Task 15: Login View
### Task 16: Matches Tab & Match Card Component
### Task 17: Betting Modal Component
### Task 18: My Bets Tab
### Task 19: Ranking/Leaderboard Tab
### Task 20: Admin Panel View
### Task 21: Mobile Responsive Polish

## Phase 3: Docker & Deployment

### Task 22: Dockerfile & Docker Compose
### Task 23: NAS Deployment Documentation
### Task 24: E2E Testing
### Task 25: Final Polish & Seed Data

---

**Would you like me to:**
1. Continue writing the complete detailed plan (will be very long)?
2. Proceed with this abbreviated version and start implementation?
3. Focus on specific phases only?
