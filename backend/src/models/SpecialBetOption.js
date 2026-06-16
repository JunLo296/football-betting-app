// backend/src/models/SpecialBetOption.js
const { initDatabase } = require('../config/database');

class SpecialBetOption {
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
   * Create a new special bet option
   * @param {Object} optionData - Option data
   * @param {number} optionData.special_bet_id - ID of the special bet
   * @param {string} optionData.option_text - Text of the option (e.g., team name, player name)
   * @param {number} optionData.odds - Odds for this option
   * @returns {Promise<Object>} Created option object
   */
  static async create({ special_bet_id, option_text, odds }) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO special_bet_options (special_bet_id, option_text, odds)
        VALUES (?, ?, ?)
      `;

      db.run(sql, [special_bet_id, option_text, odds], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({
          id: this.lastID,
          special_bet_id,
          option_text,
          odds,
          is_correct: null
        });
      });
    });
  }

  /**
   * Find option by ID
   * @param {number} id - Option ID
   * @returns {Promise<Object|null>} Option object or null if not found
   */
  static async findById(id) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM special_bet_options WHERE id = ?';

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
   * Find all options for a special bet
   * @param {number} specialBetId - Special bet ID
   * @returns {Promise<Array>} Array of option objects
   */
  static async findBySpecialBetId(specialBetId) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM special_bet_options WHERE special_bet_id = ? ORDER BY id ASC';

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
   * Update option odds
   * @param {number} id - Option ID
   * @param {number} odds - New odds value
   * @returns {Promise<Object>} Object with changes count
   */
  static async updateOdds(id, odds) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const sql = 'UPDATE special_bet_options SET odds = ? WHERE id = ?';

      db.run(sql, [odds, id], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ changes: this.changes });
      });
    });
  }

  /**
   * Mark option as correct or incorrect
   * @param {number} id - Option ID
   * @param {boolean} isCorrect - True if correct, false if incorrect
   * @returns {Promise<Object>} Object with changes count
   */
  static async markCorrect(id, isCorrect = true) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const sql = 'UPDATE special_bet_options SET is_correct = ? WHERE id = ?';

      db.run(sql, [isCorrect ? 1 : 0, id], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ changes: this.changes });
      });
    });
  }

  /**
   * Get the correct option for a special bet
   * @param {number} specialBetId - Special bet ID
   * @returns {Promise<Object|null>} Correct option or null if not set
   */
  static async getCorrectOption(specialBetId) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM special_bet_options WHERE special_bet_id = ? AND is_correct = 1';

      db.get(sql, [specialBetId], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row || null);
      });
    });
  }
}

module.exports = SpecialBetOption;
