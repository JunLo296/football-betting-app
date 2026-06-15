// backend/src/models/User.js
const { initDatabase } = require('../config/database');

class User {
  // Lazy initialization of database
  static dbPromise = null;

  /**
   * Get database instance with lazy initialization
   * @returns {Promise<Database>} SQLite database instance
   */
  static async getDb() {
    if (!this.dbPromise) {
      this.dbPromise = initDatabase();
    }
    return await this.dbPromise;
  }

  /**
   * Set database instance (for testing purposes)
   * @param {Database} db - Database instance
   */
  static setDb(db) {
    this.dbPromise = Promise.resolve(db);
  }

  /**
   * Reset database promise (for testing purposes)
   */
  static resetDb() {
    this.dbPromise = null;
  }

  /**
   * Create a new user
   * @param {Object} userData - User data
   * @param {string} userData.username - Username (unique)
   * @param {string} userData.password_hash - Hashed password
   * @param {string} userData.email - Email address (optional)
   * @param {boolean} userData.is_admin - Admin flag (optional, defaults to false)
   * @returns {Promise<Object>} Created user object with id, username, email, is_admin, total_coins
   */
  static async create({ username, password_hash, email, is_admin = false }) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const sql = 'INSERT INTO users (username, password_hash, email, is_admin, total_coins) VALUES (?, ?, ?, ?, 0)';

      db.run(sql, [username, password_hash, email, is_admin ? 1 : 0], function(err) {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT') {
            reject(new Error('Username already exists'));
          } else {
            reject(err);
          }
          return;
        }
        resolve({
          id: this.lastID,
          username,
          email,
          is_admin,
          total_coins: 0
        });
      });
    });
  }

  /**
   * Find user by username
   * @param {string} username - Username to search for
   * @returns {Promise<Object|null>} User object or null if not found
   */
  static async findByUsername(username) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE username = ?';

      db.get(sql, [username], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row || null);
      });
    });
  }

  /**
   * Find user by ID
   * @param {number} id - User ID to search for
   * @returns {Promise<Object|null>} User object or null if not found
   */
  static async findById(id) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE id = ?';

      db.get(sql, [id], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row || null);
      });
    });
  }

  /**
   * Update user's coin balance
   * @param {number} userId - User ID
   * @param {number} amount - Amount to add (can be negative)
   * @returns {Promise<Object>} Object with changes count
   */
  static async updateCoins(userId, amount) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const sql = 'UPDATE users SET total_coins = total_coins + ? WHERE id = ?';

      db.run(sql, [amount, userId], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ changes: this.changes });
      });
    });
  }

  /**
   * Get all users
   * @returns {Promise<Array>} Array of user objects (without password_hash)
   */
  static async getAll() {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const sql = 'SELECT id, username, email, is_admin, total_coins, created_at FROM users';

      db.all(sql, [], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }
}

module.exports = User;
