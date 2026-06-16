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

CREATE INDEX IF NOT EXISTS idx_bets_user ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_match ON bets(match_id);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_special_predictions_user ON special_bet_predictions(user_id);
