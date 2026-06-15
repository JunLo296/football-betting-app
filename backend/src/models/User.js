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
   * @returns {Promise<number>} User ID of created user
   */
  static async create({ username, password_hash, email }) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const sql = 'INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)';

      db.run(sql, [username, password_hash, email], function(err) {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT') {
            reject(new Error('Username already exists'));
          } else {
            reject(err);
          }
          return;
        }
        resolve(this.lastID);
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
}

module.exports = User;
