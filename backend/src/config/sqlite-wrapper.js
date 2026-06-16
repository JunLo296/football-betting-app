// Compatibility wrapper for better-sqlite3 to work with sqlite3-style callbacks
const BetterSqlite3 = require('better-sqlite3');

class SqliteWrapper {
  constructor(db) {
    this.db = db;
  }

  run(sql, params, callback) {
    try {
      const info = this.db.prepare(sql).run(...params);
      if (callback) {
        callback.call({ lastID: info.lastInsertRowid, changes: info.changes }, null);
      }
    } catch (err) {
      if (callback) callback(err);
    }
  }

  get(sql, params, callback) {
    try {
      const row = this.db.prepare(sql).get(...params);
      if (callback) callback(null, row);
    } catch (err) {
      if (callback) callback(err);
    }
  }

  all(sql, params, callback) {
    try {
      const rows = this.db.prepare(sql).all(...params);
      if (callback) callback(null, rows);
    } catch (err) {
      if (callback) callback(err);
    }
  }

  exec(sql, callback) {
    try {
      this.db.exec(sql);
      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
    }
  }

  close(callback) {
    try {
      this.db.close();
      if (callback) callback();
    } catch (err) {
      if (callback) callback(err);
    }
  }

  configure(option, value) {
    // better-sqlite3 doesn't have configure, just ignore
  }

  pragma(sql) {
    this.db.pragma(sql);
  }
}

module.exports = { BetterSqlite3, SqliteWrapper };
