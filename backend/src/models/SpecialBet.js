// backend/src/models/SpecialBet.js
const { initDatabase } = require('../config/database');

class SpecialBet {
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
   * Create a new special bet
   * @param {Object} betData - Special bet data
   * @param {string} betData.title - Title of the special bet
   * @param {string} betData.type - Type of special bet (e.g., 'tournament_winner', 'top_scorer')
   * @param {string} betData.lock_time - Datetime when betting locks
   * @param {string} betData.status - Status (optional, defaults to 'open')
   * @returns {Promise<Object>} Created special bet object
   */
  static async create({ title, type, lock_time, status = 'open' }) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO special_bets (title, type, lock_time, status)
        VALUES (?, ?, ?, ?)
      `;

      db.run(sql, [title, type, lock_time, status], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({
          id: this.lastID,
          title,
          type,
          lock_time,
          status
        });
      });
    });
  }

  /**
   * Find special bet by ID
   * @param {number} id - Special bet ID
   * @returns {Promise<Object|null>} Special bet object or null if not found
   */
  static async findById(id) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM special_bets WHERE id = ?';

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
   * Get all special bets
   * @param {Object} filters - Optional filters
   * @param {string} filters.status - Filter by status
   * @returns {Promise<Array>} Array of special bet objects
   */
  static async getAll(filters = {}) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM special_bets WHERE 1=1';
      const params = [];

      if (filters.status) {
        sql += ' AND status = ?';
        params.push(filters.status);
      }

      sql += ' ORDER BY created_at DESC';

      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  /**
   * Update special bet status
   * @param {number} id - Special bet ID
   * @param {string} status - New status ('open', 'locked', 'closed', 'resolved')
   * @returns {Promise<Object>} Object with changes count
   */
  static async updateStatus(id, status) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const sql = 'UPDATE special_bets SET status = ? WHERE id = ?';

      db.run(sql, [status, id], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ changes: this.changes });
      });
    });
  }

  /**
   * Get special bet with its options
   * @param {number} id - Special bet ID
   * @returns {Promise<Object|null>} Special bet with options array
   */
  static async getWithOptions(id) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const sqlBet = 'SELECT * FROM special_bets WHERE id = ?';
      const sqlOptions = 'SELECT * FROM special_bet_options WHERE special_bet_id = ?';

      db.get(sqlBet, [id], (err, bet) => {
        if (err) {
          reject(err);
          return;
        }

        if (!bet) {
          resolve(null);
          return;
        }

        db.all(sqlOptions, [id], (err, options) => {
          if (err) {
            reject(err);
            return;
          }

          resolve({
            ...bet,
            options: options || []
          });
        });
      });
    });
  }

  /**
   * Get all special bets with their options
   * @param {Object} filters - Optional filters
   * @param {string} filters.status - Filter by status
   * @returns {Promise<Array>} Array of special bets with options
   */
  static async getAllWithOptions(filters = {}) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      let sqlBets = 'SELECT * FROM special_bets WHERE 1=1';
      const params = [];

      if (filters.status) {
        sqlBets += ' AND status = ?';
        params.push(filters.status);
      }

      sqlBets += ' ORDER BY created_at DESC';

      db.all(sqlBets, params, (err, bets) => {
        if (err) {
          reject(err);
          return;
        }

        if (bets.length === 0) {
          resolve([]);
          return;
        }

        // Get options for all bets
        const betIds = bets.map(b => b.id).join(',');
        const sqlOptions = `SELECT * FROM special_bet_options WHERE special_bet_id IN (${betIds})`;

        db.all(sqlOptions, [], (err, options) => {
          if (err) {
            reject(err);
            return;
          }

          // Group options by special_bet_id
          const optionsByBetId = {};
          options.forEach(option => {
            if (!optionsByBetId[option.special_bet_id]) {
              optionsByBetId[option.special_bet_id] = [];
            }
            optionsByBetId[option.special_bet_id].push(option);
          });

          // Attach options to each bet
          const betsWithOptions = bets.map(bet => ({
            ...bet,
            options: optionsByBetId[bet.id] || []
          }));

          resolve(betsWithOptions);
        });
      });
    });
  }
}

module.exports = SpecialBet;
