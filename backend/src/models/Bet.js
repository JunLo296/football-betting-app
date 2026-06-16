// backend/src/models/Bet.js
const { initDatabase } = require('../config/database');

class Bet {
  static db = initDatabase();

  static create(betData) {
    return new Promise((resolve, reject) => {
      const { user_id, match_id, outcome, coins_bet, odds_at_bet_time } = betData;

      const query = `
        INSERT INTO bets (user_id, match_id, outcome, coins_bet, odds_at_bet_time)
        VALUES (?, ?, ?, ?, ?)
      `;

      this.db.run(
        query,
        [user_id, match_id, outcome, coins_bet, odds_at_bet_time],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...betData });
        }
      );
    });
  }

  static findById(id) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM bets WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }

  static findByUser(userId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT b.*, m.home_team, m.away_team, m.kickoff_time, m.status as match_status
        FROM bets b
        JOIN matches m ON b.match_id = m.id
        WHERE b.user_id = ?
        ORDER BY b.placed_at DESC
      `;

      this.db.all(query, [userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  static findByMatch(matchId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT b.*, u.username
        FROM bets b
        JOIN users u ON b.user_id = u.id
        WHERE b.match_id = ?
      `;

      this.db.all(query, [matchId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  static updatePayout(betId, payout, isWinner) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE bets
        SET payout = ?, is_winner = ?
        WHERE id = ?
      `;

      this.db.run(query, [payout, isWinner ? 1 : 0, betId], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  static getWinningBets(matchId, outcome) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM bets
        WHERE match_id = ? AND outcome = ?
      `;

      this.db.all(query, [matchId, outcome], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = Bet;
