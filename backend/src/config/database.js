// backend/src/config/database.js
const { BetterSqlite3, SqliteWrapper } = require('./sqlite-wrapper');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || './data/betting.db';

function initDatabase(dbPath = null) {
  const finalDbPath = dbPath || DB_PATH;

  // Only create directory for file-based databases
  if (finalDbPath !== ':memory:') {
    const dbDir = path.dirname(finalDbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }

  return new Promise((resolve, reject) => {
    try {
      const betterDb = new BetterSqlite3(finalDbPath);
      const db = new SqliteWrapper(betterDb);

      console.log('Connected to SQLite database');

      // Enable foreign keys
      db.pragma('foreign_keys = ON');
      console.log('Foreign keys enabled');

      resolve(db);
    } catch (err) {
      console.error('Error opening database:', err);
      reject(err);
    }
  });
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
