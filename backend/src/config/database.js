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

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');

      db.configure('busyTimeout', 3000);

      db.run('PRAGMA foreign_keys = ON', (err) => {
        if (err) {
          console.error('Error enabling foreign keys:', err);
          reject(err);
          return;
        }
        console.log('Foreign keys enabled');
        resolve(db);
      });
    });
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
