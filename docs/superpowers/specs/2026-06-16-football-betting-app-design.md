# Family Football Betting App - World Cup 2026
**Design Specification**  
**Date:** 2026-06-16  
**Version:** 1.0

---

## 1. Overview

A family-oriented betting application for World Cup 2026, designed to run on a home NAS device and accessible via mobile browsers. The app features a coin-based economy where 4 family members compete for the top leaderboard position by betting on match outcomes and special tournament predictions.

### Core Requirements
- **Users:** 4 family members with user management and authentication
- **Platform:** NAS device (Synology/QNAP) via Docker
- **Access:** Mobile browser-first interface within home network
- **Betting System:** Coin-based economy with odds-weighted payouts
- **Data Sources:** Public APIs for match schedules, live scores, and betting odds

---

## 2. Technical Architecture

### 2.1 Technology Stack

**Backend:**
- Node.js (v18+) with Express.js framework
- SQLite3 database (file-based, stored on NAS)
- JSON Web Tokens (JWT) for authentication
- Node-cron for scheduled tasks

**Frontend:**
- Vue.js 3 (Composition API)
- Mobile-first responsive design
- Axios for API communication
- LocalStorage for JWT token persistence

**Deployment:**
- Docker container (single container deployment)
- Docker Compose for easy configuration
- Volume mount for SQLite database persistence
- Environment variables for API keys and secrets

**External APIs:**
- **API-Football** (api-football.com): Match fixtures, teams, live scores
- **The Odds API** (the-odds-api.com): Real-time betting odds

### 2.2 Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Mobile Browser (Vue.js)               │
│  - Tabbed Navigation (Matches / My Bets / Ranking)      │
│  - Betting Interface with Live Calculations             │
│  - Leaderboard & User Profile                           │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/REST API
                     │ (JWT Authentication)
┌────────────────────▼────────────────────────────────────┐
│              Node.js/Express Backend                     │
│  - Authentication & Authorization                        │
│  - Bet Management & Validation                          │
│  - Payout Calculations                                  │
│  - Admin Confirmation Flow                              │
│  - Scheduled Jobs (Cron)                                │
└────────────┬──────────────────┬─────────────────────────┘
             │                  │
             │                  │ External API Calls
┌────────────▼──────┐    ┌─────▼──────────────────────────┐
│  SQLite Database  │    │   External APIs                 │
│  (NAS Volume)     │    │  - API-Football (fixtures/scores)│
│                   │    │  - The Odds API (betting odds)  │
└───────────────────┘    └─────────────────────────────────┘
```

### 2.3 Deployment on NAS

**Docker Setup:**
```yaml
# docker-compose.yml
version: '3.8'
services:
  fbapp:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - /volume1/docker/fbapp/data:/app/data
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - API_FOOTBALL_KEY=${API_FOOTBALL_KEY}
      - ODDS_API_KEY=${ODDS_API_KEY}
      - NODE_ENV=production
    restart: unless-stopped
```

**Access:** `http://nas-local-ip:3000` from any device on home network

---

## 3. Coin Economy System

### 3.1 Core Mechanics

**Daily Coin Grants:**
- Each player receives **10 coins** on any day that has World Cup matches scheduled
- Coins accumulate over the tournament (unused coins carry over)
- Automated via cron job at midnight (checks match schedule)
- Tracked in `daily_coin_grants` table for audit trail

**Betting Flow:**
1. Player places bet: specifies match, outcome, and coin amount
2. System validates: sufficient balance, match not locked, valid outcome
3. Coins immediately deducted from player's `total_coins`
4. Bet recorded with odds snapshot at time of placement

**Payout Calculation:**
- When admin confirms match result, system processes all bets
- Winning bet payout = `coins_bet × odds_at_bet_time`
- Example: Bet 5 coins at 1.8x odds → receive 9 coins (5 × 1.8)
- Losing bets: no refund (coins already deducted)

**Flexible Betting:**
- Players can bet on multiple outcomes per match (hedging allowed)
- No minimum or maximum bet limits (except available balance)
- Multiple bets on same outcome are allowed (can bet 2 coins, then 3 more later)

### 3.2 Example Scenario

**Starting Balance:** 25 coins  
**Bets Placed on Germany vs Spain:**
- 5 coins on Germany win (odds: 1.8x)
- 2 coins on Draw (odds: 3.2x)

**After Bet Placement:** 25 - 5 - 2 = **18 coins**

**Match Result: Germany Wins**
- Germany bet wins: 5 × 1.8 = 9 coins payout
- Draw bet loses: 0 coins
- **Final Balance:** 18 + 9 = **27 coins**

---

## 4. Database Schema

### 4.1 Tables Overview

#### **users**
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT,
  is_admin BOOLEAN DEFAULT 0,
  total_coins REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### **matches**
```sql
CREATE TABLE matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_match_id TEXT UNIQUE,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  kickoff_time DATETIME NOT NULL,
  match_date DATE NOT NULL,
  stage TEXT NOT NULL, -- group_stage, round_16, quarter, semi, final
  group_name TEXT, -- A, B, C, etc. (null for knockout)
  home_odds REAL,
  draw_odds REAL,
  away_odds REAL,
  home_score INTEGER,
  away_score INTEGER,
  result TEXT, -- home_win, draw, away_win (null until confirmed)
  status TEXT DEFAULT 'upcoming', -- upcoming, live, pending_confirmation, confirmed
  confirmed_by_admin_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### **bets**
```sql
CREATE TABLE bets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  match_id INTEGER NOT NULL,
  outcome TEXT NOT NULL, -- home_win, draw, away_win
  coins_bet REAL NOT NULL,
  odds_at_bet_time REAL NOT NULL,
  payout REAL, -- null until confirmed
  is_winner BOOLEAN, -- null until confirmed
  placed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (match_id) REFERENCES matches(id)
);
```

#### **special_bets**
```sql
CREATE TABLE special_bets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- tournament_winner, top_scorer, golden_glove, etc.
  lock_time DATETIME NOT NULL,
  status TEXT DEFAULT 'open', -- open, locked, resolved
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### **special_bet_options**
```sql
CREATE TABLE special_bet_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  special_bet_id INTEGER NOT NULL,
  option_text TEXT NOT NULL,
  odds REAL NOT NULL,
  is_correct BOOLEAN, -- null until resolved
  FOREIGN KEY (special_bet_id) REFERENCES special_bets(id)
);
```

#### **special_bet_predictions**
```sql
CREATE TABLE special_bet_predictions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  special_bet_option_id INTEGER NOT NULL,
  coins_bet REAL NOT NULL,
  odds_at_bet_time REAL NOT NULL,
  payout REAL, -- null until resolved
  is_winner BOOLEAN, -- null until resolved
  placed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (special_bet_option_id) REFERENCES special_bet_options(id)
);
```

#### **daily_coin_grants**
```sql
CREATE TABLE daily_coin_grants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  grant_date DATE NOT NULL,
  coins_granted REAL DEFAULT 10,
  granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, grant_date)
);
```

### 4.2 Indexes

```sql
CREATE INDEX idx_bets_user ON bets(user_id);
CREATE INDEX idx_bets_match ON bets(match_id);
CREATE INDEX idx_matches_date ON matches(match_date);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_special_predictions_user ON special_bet_predictions(user_id);
```

---

## 5. API Endpoints

### 5.1 Authentication

#### `POST /api/auth/login`
**Request:**
```json
{
  "username": "hans",
  "password": "secure123"
}
```
**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "hans",
    "email": "hans@family.com",
    "is_admin": false,
    "total_coins": 47
  }
}
```

#### `POST /api/auth/register`
**Admin only**  
**Request:**
```json
{
  "username": "maria",
  "password": "secure456",
  "email": "maria@family.com"
}
```

#### `GET /api/auth/me`
**Requires:** JWT token  
**Response:** Current user object with coin balance

---

### 5.2 Matches

#### `GET /api/matches`
**Query Params:**
- `status`: upcoming | live | confirmed
- `group`: A | B | C | etc.
- `stage`: group_stage | round_16 | quarter | semi | final
- `date`: YYYY-MM-DD

**Response:**
```json
{
  "matches": [
    {
      "id": 1,
      "home_team": "Germany",
      "away_team": "Spain",
      "kickoff_time": "2026-06-20T18:00:00Z",
      "stage": "group_stage",
      "group_name": "A",
      "home_odds": 1.8,
      "draw_odds": 3.2,
      "away_odds": 4.5,
      "home_score": null,
      "away_score": null,
      "status": "upcoming"
    }
  ]
}
```

#### `GET /api/matches/:id`
**Response:** Single match details with all bets (if admin or after kickoff)

#### `POST /api/matches/sync`
**Admin only**  
Triggers manual sync from external APIs  
**Response:**
```json
{
  "synced": 64,
  "updated": 12,
  "errors": 0
}
```

#### `POST /api/matches/:id/confirm`
**Admin only**  
**Request:**
```json
{
  "home_score": 2,
  "away_score": 1,
  "result": "home_win"
}
```
**Response:**
```json
{
  "match_id": 1,
  "result": "home_win",
  "total_bets": 8,
  "winners": 3,
  "total_payout": 42.5
}
```

---

### 5.3 Bets

#### `GET /api/bets/my-bets`
**Requires:** JWT token  
**Response:**
```json
{
  "bets": [
    {
      "id": 15,
      "match": {
        "home_team": "Germany",
        "away_team": "Spain",
        "kickoff_time": "2026-06-20T18:00:00Z"
      },
      "outcome": "home_win",
      "coins_bet": 5,
      "odds_at_bet_time": 1.8,
      "potential_payout": 9.0,
      "is_winner": null,
      "status": "pending"
    }
  ]
}
```

#### `POST /api/bets`
**Request:**
```json
{
  "match_id": 1,
  "outcome": "home_win",
  "coins_bet": 5
}
```
**Validation:**
- User has sufficient coins
- Match is not locked (current time < kickoff_time)
- coins_bet > 0

**Response:**
```json
{
  "bet_id": 15,
  "new_balance": 42,
  "potential_payout": 9.0
}
```

#### `GET /api/bets/match/:matchId`
**Requires:** Admin OR match kickoff has passed  
**Response:** All users' bets on this match

---

### 5.4 Special Bets

#### `GET /api/special-bets`
**Response:**
```json
{
  "special_bets": [
    {
      "id": 1,
      "title": "Tournament Winner",
      "type": "tournament_winner",
      "lock_time": "2026-06-14T16:00:00Z",
      "status": "locked",
      "options": [
        {
          "id": 1,
          "option_text": "Brazil",
          "odds": 4.5,
          "is_correct": null
        },
        {
          "id": 2,
          "option_text": "Germany",
          "odds": 5.2,
          "is_correct": null
        }
      ]
    }
  ]
}
```

#### `POST /api/special-bets`
**Admin only**  
**Request:**
```json
{
  "title": "Top Scorer",
  "type": "top_scorer",
  "lock_time": "2026-06-14T16:00:00Z",
  "options": [
    {"option_text": "Messi", "odds": 6.5},
    {"option_text": "Ronaldo", "odds": 7.0},
    {"option_text": "Mbappe", "odds": 5.5}
  ]
}
```

#### `POST /api/special-bets/:id/bet`
**Request:**
```json
{
  "special_bet_option_id": 3,
  "coins_bet": 10
}
```
**Validation:**
- Sufficient coins
- Special bet not locked (current time < lock_time)
- coins_bet > 0

#### `POST /api/special-bets/:id/resolve`
**Admin only**  
**Request:**
```json
{
  "correct_option_ids": [3]
}
```
**Response:**
```json
{
  "special_bet_id": 1,
  "winners": 2,
  "total_payout": 65.0
}
```

---

### 5.5 Coins

#### `GET /api/coins/balance`
**Requires:** JWT token  
**Response:**
```json
{
  "total_coins": 47,
  "coins_in_pending_bets": 12,
  "available_coins": 35
}
```

#### `GET /api/coins/history`
**Requires:** JWT token  
**Response:**
```json
{
  "history": [
    {
      "type": "daily_grant",
      "amount": 10,
      "date": "2026-06-16",
      "balance_after": 47
    },
    {
      "type": "bet_placed",
      "amount": -5,
      "match": "Germany vs Spain",
      "date": "2026-06-16",
      "balance_after": 42
    },
    {
      "type": "bet_won",
      "amount": 9,
      "match": "Brazil vs Argentina",
      "date": "2026-06-15",
      "balance_after": 47
    }
  ]
}
```

#### `POST /api/coins/grant-daily`
**Internal cron job endpoint**  
Grants 10 coins to all users if matches exist today  
**Response:**
```json
{
  "date": "2026-06-16",
  "users_granted": 4,
  "coins_per_user": 10
}
```

---

### 5.6 Leaderboard

#### `GET /api/leaderboard`
**Response:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "username": "Maria",
      "total_coins": 89,
      "bets_won": 15,
      "bets_total": 23
    },
    {
      "rank": 2,
      "username": "Hans",
      "total_coins": 47,
      "bets_won": 8,
      "bets_total": 18
    }
  ]
}
```

#### `GET /api/leaderboard/history`
**Query Params:** `days`: number of days to show  
**Response:** Daily snapshot of coin balances for all users (for charts)

---

### 5.7 Admin

#### `GET /api/admin/users`
**Admin only**  
**Response:** List of all users with stats

#### `POST /api/admin/users`
**Admin only**  
Create new user (same as register endpoint)

#### `PUT /api/admin/users/:id/coins`
**Admin only**  
**Request:**
```json
{
  "adjustment": 10,
  "reason": "Bonus for winning family trivia"
}
```

#### `GET /api/admin/pending-confirmations`
**Admin only**  
**Response:** List of matches with status='pending_confirmation' (live scores received, awaiting admin approval)

---

## 6. External API Integration

### 6.1 API-Football Integration

**Purpose:** Fetch match fixtures, teams, and live scores

**Endpoints Used:**
- `GET /v3/fixtures?league=1&season=2026` - All World Cup 2026 fixtures
- `GET /v3/fixtures?id={match_id}` - Single match with live score
- `GET /v3/teams?league=1&season=2026` - All participating teams

**Rate Limits:** 100 requests/day (free tier)

**Sync Strategy:**
1. **Initial Setup** (admin triggered):
   - Fetch all fixtures for World Cup 2026
   - Store in `matches` table
   - One-time operation before tournament starts

2. **Daily Update** (automated cron at 6 AM):
   - Refresh odds for upcoming matches
   - Check for fixture time changes
   - ~10-20 requests/day

3. **Live Match Tracking** (during matches):
   - Poll every 3 minutes for matches with `status='live'`
   - Update `home_score`, `away_score`
   - Set `status='pending_confirmation'` when match ends
   - ~20 requests per match (90 min ÷ 3 min polling)

**Caching:**
- Response cache: 5 minutes TTL for live scores
- Fixture cache: 24 hours for completed matches

---

### 6.2 The Odds API Integration

**Purpose:** Fetch betting odds for matches

**Endpoint:**
```
GET /v4/sports/soccer_fifa_world_cup/odds
  ?apiKey={key}
  &regions=eu
  &markets=h2h
  &oddsFormat=decimal
```

**Rate Limits:** 500 requests/month (free tier)

**Response Structure:**
```json
{
  "id": "abc123",
  "sport_title": "Soccer",
  "commence_time": "2026-06-20T18:00:00Z",
  "home_team": "Germany",
  "away_team": "Spain",
  "bookmakers": [
    {
      "key": "bet365",
      "markets": [
        {
          "key": "h2h",
          "outcomes": [
            {"name": "Germany", "price": 1.80},
            {"name": "Draw", "price": 3.20},
            {"name": "Spain", "price": 4.50}
          ]
        }
      ]
    }
  ]
}
```

**Processing:**
- Average odds across multiple bookmakers for fairness
- Store `home_odds`, `draw_odds`, `away_odds` in `matches` table
- Update odds daily until kickoff

**Sync Strategy:**
- Fetch odds once when fixtures are imported
- Update daily for matches in next 7 days
- ~10 requests/day during tournament

---

### 6.3 Cron Jobs

**Daily Coin Grant** - Every day at 00:05 (5 minutes after midnight)
```javascript
// Check if any matches today
// If yes, grant 10 coins to all users
cron.schedule('5 0 * * *', grantDailyCoins);
```

**Odds Update** - Every day at 06:00
```javascript
// Fetch updated odds for upcoming matches (next 7 days)
cron.schedule('0 6 * * *', updateMatchOdds);
```

**Live Score Polling** - Every 3 minutes during tournament dates
```javascript
// Only runs if matches are currently live
cron.schedule('*/3 * * * *', updateLiveScores);
```

---

## 7. Frontend Design

### 7.1 Layout Structure

**Tabbed Navigation** (selected approach):
- **Tab 1: Matches** - Browse and bet on upcoming/live matches
- **Tab 2: My Bets** - View active and historical bets
- **Tab 3: Ranking** - Leaderboard and user stats

**Top Bar:**
- App logo/title
- Current user's coin balance (prominent display)
- User menu (logout, profile)

---

### 7.2 Key Screens

#### **Matches Tab**
- Daily coin grant notification (if received today)
- Filter chips: All | Group Stage | Knockouts | Live
- Match cards showing:
  - Team flags and names
  - Kickoff time (or "Live" badge)
  - Current odds (home/draw/away)
  - "Place Bet" button (disabled if locked)
- Grouped by date sections

#### **Betting Modal** (opens when "Place Bet" clicked)
- Match details at top (teams, time, group/stage)
- Current coin balance
- Three bet input sections (home/draw/away):
  - Outcome name + odds badge
  - Coin input field (number)
  - Live payout calculation
- Summary panel:
  - Total bet amount
  - Remaining balance
  - Max possible win
- "Confirm Bets" button (validates sufficient balance)

#### **My Bets Tab**
- Filter: Pending | Won | Lost | All
- Bet cards showing:
  - Match details
  - Bet outcome + coins wagered
  - Odds at bet time
  - Status: Pending | Won (+X coins) | Lost
- Total coins at stake in pending bets

#### **Ranking Tab**
- Leaderboard table:
  - Rank (🥇🥈🥉 for top 3)
  - Username
  - Total coins
  - Win rate %
- Historical chart (optional): Coin progression over tournament
- User's own rank highlighted

#### **Admin Panel** (admin users only)
- Tab 4: Admin
- **Pending Confirmations:**
  - List of matches with `status='pending_confirmation'`
  - Shows API-fetched score
  - "Confirm Result" button → awards payouts
- **User Management:**
  - Add/remove users
  - Manually adjust coins
- **Special Bets:**
  - Create custom special bets
  - Resolve special bets
- **Manual Sync:**
  - Trigger API sync for fixtures/odds

---

### 7.3 Responsive Design

**Mobile-First Approach:**
- Single column layout
- Large touch targets (min 44px)
- Bottom navigation for primary tabs
- Pull-to-refresh on Matches tab
- Optimized for 360px - 414px viewport width

**Desktop Enhancements:**
- Two-column layout on Matches tab (sidebar for filters)
- Side-by-side leaderboard and chart
- Betting modal wider with clearer spacing

---

## 8. User Authentication & Authorization

### 8.1 Authentication Flow

1. **Login:**
   - User enters username + password
   - Backend validates against `users` table (bcrypt password hash)
   - Returns JWT token (expires in 7 days)
   - Frontend stores token in `localStorage`

2. **Token Validation:**
   - All API requests include `Authorization: Bearer {token}` header
   - Backend middleware validates JWT signature
   - Extracts `user_id` and `is_admin` from token payload

3. **Auto-Login:**
   - On app load, check for token in `localStorage`
   - If exists, call `GET /api/auth/me` to validate
   - If valid, skip login screen
   - If invalid/expired, clear localStorage and show login

### 8.2 Authorization Rules

**Public Endpoints:**
- `POST /api/auth/login`

**Authenticated User Endpoints:**
- All `/api/matches/*` (read-only)
- All `/api/bets/*` (can only manage own bets)
- All `/api/coins/*` (can only see own data)
- `GET /api/leaderboard`
- `GET /api/special-bets`

**Admin-Only Endpoints:**
- `POST /api/auth/register`
- `POST /api/matches/sync`
- `POST /api/matches/:id/confirm`
- `POST /api/special-bets` (create)
- `POST /api/special-bets/:id/resolve`
- All `/api/admin/*`

**Bet Visibility Rules:**
- Users can see own bets anytime
- Users can see others' bets for a match ONLY after kickoff (prevents copying)
- Admin can see all bets anytime

---

## 9. Points Calculation & Fairness

### 9.1 Odds as Difficulty Multiplier

Unlike a fixed-points system, this app uses **real betting odds** to weight payouts fairly:

**Why odds matter:**
- Easy prediction (Germany 1.2x vs amateur team 8.0x) should reward fewer coins
- Hard prediction (two evenly-matched teams, both ~2.0x) should reward more coins
- Odds reflect real-world difficulty based on bookmaker consensus

**No additional multiplier needed:**
- The odds themselves ARE the multiplier
- Betting 10 coins on a 1.5x favorite = 15 coins payout (small gain)
- Betting 10 coins on a 4.0x underdog = 40 coins payout (big gain)
- Risk vs reward is inherent in the odds

### 9.2 Special Bets Point Values

**Fixed odds set by admin:**
- Tournament Winner: 5.0x - 8.0x (depending on team strength)
- Top Scorer: 8.0x - 12.0x
- Golden Glove: 10.0x
- Most Goals in Group Stage: 6.0x

**Why fixed for special bets:**
- External odds APIs don't cover special bets consistently
- Admin can set fair odds based on research
- Can create custom special bets ("Which family member guesses most matches?") with custom odds

---

## 10. Admin Workflow

### 10.1 Pre-Tournament Setup

1. **Sync Fixtures:**
   - Admin logs in
   - Goes to Admin tab → "Sync Fixtures"
   - System fetches all World Cup 2026 matches from API-Football
   - Fetches initial odds from The Odds API
   - Confirms: "64 matches imported"

2. **Create Users:**
   - Admin → User Management → "Add User"
   - Creates 3 family member accounts (4th is admin)

3. **Create Special Bets:**
   - Admin → Special Bets → "Create New"
   - Adds: Tournament Winner, Top Scorer, Golden Glove, etc.
   - Sets lock time (usually tournament start)
   - Sets odds for each option

### 10.2 During Tournament

**Daily Routine:**
- System automatically grants 10 coins at midnight (if matches today)
- System automatically updates odds at 6 AM
- System automatically polls live scores during matches

**Match Confirmation:**
1. Match ends → system sets `status='pending_confirmation'`
2. Admin sees notification badge on Admin tab
3. Admin opens "Pending Confirmations"
4. Reviews: Germany 2 - 1 Spain (fetched from API)
5. Clicks "Confirm Result"
6. System:
   - Sets `result='home_win'`
   - Calculates all bet payouts
   - Updates user coin balances
   - Shows summary: "8 bets processed, 3 winners, 42.5 coins paid out"

**Manual Adjustments (rare):**
- If API provides wrong score, admin can manually edit before confirming
- If user reports a bug, admin can manually adjust their coins with a reason note

### 10.3 Post-Tournament

**Resolve Special Bets:**
1. Tournament ends
2. Admin → Special Bets → Select "Top Scorer"
3. Marks correct option (e.g., "Messi")
4. System awards payouts to all correct predictions

**Final Leaderboard:**
- System automatically shows final rankings
- Admin can export leaderboard as CSV (future feature)

---

## 11. Error Handling & Edge Cases

### 11.1 API Failures

**External API unavailable:**
- Log error, continue with cached data
- Admin notification: "Odds API unreachable - using last known odds"
- Manual sync button available as fallback

**Rate limit exceeded:**
- Graceful degradation: reduce polling frequency
- Admin notification: "API rate limit reached - live scores paused until next hour"

### 11.2 Betting Edge Cases

**Match time change after bets placed:**
- Bets remain valid with original odds
- Users notified of new kickoff time
- Lock time updates to new kickoff time

**User tries to bet more than they have:**
- Validation error: "Insufficient coins (you have 10, trying to bet 15)"
- Frontend prevents this with real-time balance check

**Two users bet simultaneously (race condition):**
- SQLite transactions ensure atomic operations
- Second user may get "Insufficient coins" if first bet depleted balance

**Admin confirms wrong result:**
- Provide "Revert Confirmation" button (within 5 minutes)
- Reverts all payouts, resets bets to pending
- Beyond 5 minutes: manual adjustment required (log for audit)

### 11.3 User Experience Edge Cases

**User joins mid-tournament:**
- Starts with 0 coins
- Receives 10 coins next match day like everyone else
- Can only bet from that point forward

**User forgets to bet before kickoff:**
- Bet button disabled, shows "Locked - match started"
- No way to place retroactive bets (fairness rule)

**All users run out of coins:**
- Everyone still receives 10 coins daily
- Tournament continues normally

---

## 12. Security Considerations

### 12.1 Authentication Security

- Passwords hashed with bcrypt (cost factor: 10)
- JWT tokens signed with strong secret (min 256-bit)
- Tokens expire after 7 days (refresh on activity)
- No password reset flow (family app - admin can reset manually)

### 12.2 Input Validation

- All numeric inputs validated (coins_bet > 0, not NaN)
- SQL injection prevented (parameterized queries via sqlite3)
- XSS prevention: Vue.js escapes all user input by default

### 12.3 API Security

- External API keys stored in environment variables (not in code)
- Rate limiting on sensitive endpoints:
  - Login: 5 attempts per minute per IP
  - Bet placement: 20 per minute per user
- Admin endpoints require `is_admin=true` in JWT payload

### 12.4 Data Privacy

- Home network only (not exposed to internet)
- Optional: Add HTTPS with self-signed cert for NAS
- SQLite database file owned by docker user only

---

## 13. Testing Strategy

### 13.1 Backend Testing

**Unit Tests:**
- Payout calculation logic
- Odds averaging across bookmakers
- JWT token generation/validation

**Integration Tests:**
- Bet placement flow (validate → deduct → store)
- Match confirmation flow (process bets → update balances)
- Daily coin grant cron job

**API Tests:**
- All endpoints with valid/invalid inputs
- Authorization checks (user vs admin)
- Edge cases (insufficient coins, locked matches)

### 13.2 Frontend Testing

**Component Tests:**
- Betting modal: payout calculation updates on input
- Match card: shows correct status (upcoming/live/locked)
- Leaderboard: sorts users by coins correctly

**E2E Tests:**
- Full betting flow: login → select match → place bet → view in My Bets
- Admin flow: confirm match → check payouts awarded
- Mobile responsiveness on 360px viewport

---

## 14. Future Enhancements (Out of Scope for v1)

**Potential additions after initial deployment:**

1. **Push Notifications:**
   - Browser notifications for matches starting soon
   - Payout notifications when admin confirms results

2. **Chat/Comments:**
   - Family chat per match
   - Friendly trash talk and predictions discussion

3. **Achievements/Badges:**
   - "Lucky Streak" - 5 wins in a row
   - "Underdog Champion" - Won bet with 5.0x+ odds
   - "Hedge Master" - Bet on all three outcomes and still profited

4. **Historical Stats:**
   - Win rate per team
   - Best performing bet types (favorites vs underdogs)
   - Coin balance chart over time

5. **Mobile App:**
   - Native iOS/Android app (using Capacitor/React Native)
   - Better offline support

6. **Multi-Tournament Support:**
   - Reuse app for Euro 2028, World Cup 2030, etc.
   - Archive past tournaments

---

## 15. Implementation Priorities

### Phase 1: Core MVP (Week 1-2)
✓ Backend setup (Node.js + Express + SQLite)  
✓ Authentication (JWT)  
✓ Database schema + migrations  
✓ Match CRUD + external API integration  
✓ Bet placement + validation  
✓ Admin confirmation flow  
✓ Basic frontend (Vue.js) - Matches tab + Betting modal

### Phase 2: User Features (Week 3)
✓ My Bets tab  
✓ Leaderboard tab  
✓ Coin history/transactions  
✓ Special bets (create + bet + resolve)  
✓ Mobile responsive polish

### Phase 3: Admin & Polish (Week 4)
✓ Admin panel UI  
✓ Pending confirmations workflow  
✓ Manual sync triggers  
✓ User management UI  
✓ Error handling + loading states  
✓ Docker deployment + documentation

### Phase 4: Testing & Launch (Week 5)
✓ Backend unit + integration tests  
✓ Frontend E2E tests  
✓ NAS deployment + family user testing  
✓ Bug fixes + performance optimization  
✓ Final documentation

---

## 16. Success Metrics

**For this family app, success means:**
- All 4 family members can successfully login and place bets
- No lost bets due to bugs (audit trail in `bets` table)
- Admin can confirm match results in < 30 seconds
- App loads in < 2 seconds on mobile browser
- Zero downtime during tournament (NAS reliability)
- Fun factor: Family engagement throughout tournament (subjective but important!)

---

## 17. Glossary

- **Coins:** Virtual currency used for betting (not real money)
- **Odds:** Payout multiplier (e.g., 1.8x means bet 10 coins, win 18 coins)
- **Hedge:** Betting on multiple outcomes of same match to reduce risk
- **Lock time:** Deadline after which bets cannot be placed (usually kickoff)
- **Pending confirmation:** Match finished but admin hasn't confirmed result yet
- **Payout:** Coins returned to winner (bet_amount × odds)
- **Special bet:** Tournament-wide prediction (winner, top scorer, etc.)
- **Match bet:** Prediction on single match outcome (home/draw/away)

---

**End of Design Document**
