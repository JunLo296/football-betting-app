// backend/src/models/SpecialBetPrediction.js
const { initDatabase } = require('../config/database');

class SpecialBetPrediction {
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
   * Create a new prediction
   * @param {Object} predictionData - Prediction data
   * @param {number} predictionData.user_id - User ID
   * @param {number} predictionData.special_bet_option_id - Option ID
   * @param {number} predictionData.coins_bet - Coins wagered
   * @param {number} predictionData.odds_at_bet_time - Odds at the time of bet
   * @returns {Promise<Object>} Created prediction object
   */
  static async create({ user_id, special_bet_option_id, coins_bet, odds_at_bet_time }) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO special_bet_predictions (user_id, special_bet_option_id, coins_bet, odds_at_bet_time)
        VALUES (?, ?, ?, ?)
      `;

      db.run(sql, [user_id, special_bet_option_id, coins_bet, odds_at_bet_time], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({
          id: this.lastID,
          user_id,
          special_bet_option_id,
          coins_bet,
          odds_at_bet_time,
          payout: null,
          is_winner: null
        });
      });
    });
  }

  /**
   * Find prediction by ID
   * @param {number} id - Prediction ID
   * @returns {Promise<Object|null>} Prediction object or null if not found
   */
  static async findById(id) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM special_bet_predictions WHERE id = ?';

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
   * Find all predictions for a user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Array of prediction objects with bet and option details
   */
  static async findByUser(userId) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          p.*,
          sb.title as special_bet_title,
          sb.type as special_bet_type,
          sb.status as special_bet_status,
          sb.lock_time as special_bet_lock_time,
          sbo.option_text,
          sbo.odds
        FROM special_bet_predictions p
        JOIN special_bet_options sbo ON p.special_bet_option_id = sbo.id
        JOIN special_bets sb ON sbo.special_bet_id = sb.id
        WHERE p.user_id = ?
        ORDER BY p.placed_at DESC
      `;

      db.all(sql, [userId], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  /**
   * Find all predictions for a special bet
   * @param {number} specialBetId - Special bet ID
   * @returns {Promise<Array>} Array of predictions with user details
   */
  static async findBySpecialBet(specialBetId) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          p.*,
          u.username,
          sbo.option_text
        FROM special_bet_predictions p
        JOIN users u ON p.user_id = u.id
        JOIN special_bet_options sbo ON p.special_bet_option_id = sbo.id
        WHERE sbo.special_bet_id = ?
        ORDER BY p.placed_at DESC
      `;

      db.all(sql, [specialBetId], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  /**
   * Find all predictions for a specific option
   * @param {number} optionId - Option ID
   * @returns {Promise<Array>} Array of predictions
   */
  static async findByOption(optionId) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT p.*, u.username
        FROM special_bet_predictions p
        JOIN users u ON p.user_id = u.id
        WHERE p.special_bet_option_id = ?
      `;

      db.all(sql, [optionId], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  /**
   * Update prediction with payout
   * @param {number} id - Prediction ID
   * @param {number} payout - Payout amount
   * @param {boolean} isWinner - Whether the prediction won
   * @returns {Promise<Object>} Object with changes count
   */
  static async updatePayout(id, payout, isWinner) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE special_bet_predictions
        SET payout = ?, is_winner = ?
        WHERE id = ?
      `;

      db.run(sql, [payout, isWinner ? 1 : 0, id], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ changes: this.changes });
      });
    });
  }

  /**
   * Get all winning predictions for an option
   * @param {number} optionId - Option ID that won
   * @returns {Promise<Array>} Array of predictions for the winning option
   */
  static async getWinningPredictions(optionId) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT p.*, u.username
        FROM special_bet_predictions p
        JOIN users u ON p.user_id = u.id
        WHERE p.special_bet_option_id = ?
      `;

      db.all(sql, [optionId], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  /**
   * Check if user has already bet on a special bet
   * @param {number} userId - User ID
   * @param {number} specialBetId - Special bet ID
   * @returns {Promise<boolean>} True if user has already bet
   */
  static async hasUserBetOnSpecialBet(userId, specialBetId) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT COUNT(*) as count
        FROM special_bet_predictions p
        JOIN special_bet_options sbo ON p.special_bet_option_id = sbo.id
        WHERE p.user_id = ? AND sbo.special_bet_id = ?
      `;

      db.get(sql, [userId, specialBetId], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row.count > 0);
      });
    });
  }
}

module.exports = SpecialBetPrediction;
