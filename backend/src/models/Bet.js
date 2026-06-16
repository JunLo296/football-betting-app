// backend/src/models/Bet.js
const { initDatabase } = require('../config/database');

class Bet {
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

  static async create(betData) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const { user_id, match_id, outcome, coins_bet, odds_at_bet_time } = betData;

      const query = `
        INSERT INTO bets (user_id, match_id, outcome, coins_bet, odds_at_bet_time)
        VALUES (?, ?, ?, ?, ?)
      `;

      db.run(
        query,
        [user_id, match_id, outcome, coins_bet, odds_at_bet_time],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...betData });
        }
      );
    });
  }

  static async findById(id) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM bets WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }

  static async findByUser(userId) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const query = `
        SELECT b.*, m.home_team, m.away_team, m.kickoff_time, m.status as match_status
        FROM bets b
        JOIN matches m ON b.match_id = m.id
        WHERE b.user_id = ?
        ORDER BY b.placed_at DESC
      `;

      db.all(query, [userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  static async findByMatch(matchId) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const query = `
        SELECT b.*, u.username
        FROM bets b
        JOIN users u ON b.user_id = u.id
        WHERE b.match_id = ?
      `;

      db.all(query, [matchId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  static async updatePayout(betId, payout, isWinner) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const query = `
        UPDATE bets
        SET payout = ?, is_winner = ?
        WHERE id = ?
      `;

      db.run(query, [payout, isWinner ? 1 : 0, betId], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  static async getWinningBets(matchId, outcome) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM bets
        WHERE match_id = ? AND outcome = ?
      `;

      db.all(query, [matchId, outcome], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = Bet;
