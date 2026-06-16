// backend/src/models/Match.js
const { initDatabase } = require('../config/database');

class Match {
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
   * Create a new match
   * @param {Object} matchData - Match data
   * @param {string} matchData.api_match_id - External API match ID (optional)
   * @param {string} matchData.home_team - Home team name
   * @param {string} matchData.away_team - Away team name
   * @param {string} matchData.kickoff_time - Match kickoff time (ISO 8601)
   * @param {string} matchData.match_date - Match date (YYYY-MM-DD)
   * @param {string} matchData.stage - Match stage (e.g., Group, Quarter-Final)
   * @param {string} matchData.group_name - Group name (optional)
   * @param {number} matchData.home_odds - Home win odds (optional)
   * @param {number} matchData.draw_odds - Draw odds (optional)
   * @param {number} matchData.away_odds - Away win odds (optional)
   * @returns {Promise<Object>} Created match object
   */
  static async create({
    api_match_id,
    home_team,
    away_team,
    kickoff_time,
    match_date,
    stage,
    group_name = null,
    home_odds = null,
    draw_odds = null,
    away_odds = null
  }) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO matches (
          api_match_id, home_team, away_team, kickoff_time, match_date,
          stage, group_name, home_odds, draw_odds, away_odds, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'upcoming')
      `;

      db.run(
        sql,
        [api_match_id, home_team, away_team, kickoff_time, match_date, stage, group_name, home_odds, draw_odds, away_odds],
        function(err) {
          if (err) {
            if (err.code === 'SQLITE_CONSTRAINT') {
              reject(new Error('Match with this API ID already exists'));
            } else {
              reject(err);
            }
            return;
          }
          resolve({
            id: this.lastID,
            api_match_id,
            home_team,
            away_team,
            kickoff_time,
            match_date,
            stage,
            group_name,
            home_odds,
            draw_odds,
            away_odds,
            home_score: null,
            away_score: null,
            result: null,
            status: 'upcoming',
            confirmed_by_admin_at: null
          });
        }
      );
    });
  }

  /**
   * Find match by ID
   * @param {number} id - Match ID
   * @returns {Promise<Object|null>} Match object or null if not found
   */
  static async findById(id) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM matches WHERE id = ?';

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
   * Get all matches
   * @returns {Promise<Array>} Array of all match objects
   */
  static async getAll() {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM matches ORDER BY kickoff_time ASC';

      db.all(sql, [], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  /**
   * Update match status
   * @param {number} id - Match ID
   * @param {string} status - New status (upcoming, live, pending_confirmation, confirmed)
   * @returns {Promise<Object>} Object with changes count
   */
  static async updateStatus(id, status) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const sql = 'UPDATE matches SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';

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
   * Update match scores and result
   * @param {number} id - Match ID
   * @param {number} homeScore - Home team score
   * @param {number} awayScore - Away team score
   * @param {string} result - Match result (home, draw, away)
   * @returns {Promise<Object>} Object with changes count
   */
  static async updateScores(id, homeScore, awayScore, result) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE matches
        SET home_score = ?, away_score = ?, result = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      db.run(sql, [homeScore, awayScore, result, id], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ changes: this.changes });
      });
    });
  }

  /**
   * Confirm match result by admin
   * @param {number} id - Match ID
   * @param {Object} resultData - Result data
   * @param {number} resultData.home_score - Home team score
   * @param {number} resultData.away_score - Away team score
   * @param {string} resultData.result - Match result (home_win, draw, away_win)
   * @returns {Promise<Object>} Object with changes count
   */
  static async confirmResult(id, resultData) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const { home_score, away_score, result } = resultData || {};

      const sql = `
        UPDATE matches
        SET home_score = ?, away_score = ?, result = ?, status = 'confirmed',
            confirmed_by_admin_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      db.run(sql, [home_score, away_score, result, id], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ changes: this.changes });
      });
    });
  }

  /**
   * Update match odds
   * @param {number} id - Match ID
   * @param {number} homeOdds - Home win odds
   * @param {number} drawOdds - Draw odds
   * @param {number} awayOdds - Away win odds
   * @returns {Promise<Object>} Object with changes count
   */
  static async updateOdds(id, homeOdds, drawOdds, awayOdds) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE matches
        SET home_odds = ?, draw_odds = ?, away_odds = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      db.run(sql, [homeOdds, drawOdds, awayOdds, id], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ changes: this.changes });
      });
    });
  }

  /**
   * Get all live matches
   * @returns {Promise<Array>} Array of live match objects
   */
  static async getLiveMatches() {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const sql = "SELECT * FROM matches WHERE status = 'live' ORDER BY kickoff_time ASC";

      db.all(sql, [], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  /**
   * Get matches by date
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<Array>} Array of match objects for the specified date
   */
  static async getMatchesByDate(date) {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM matches WHERE match_date = ? ORDER BY kickoff_time ASC';

      db.all(sql, [date], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }
}

module.exports = Match;
