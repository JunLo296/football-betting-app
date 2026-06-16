// backend/src/services/payoutService.js
const Bet = require('../models/Bet');
const User = require('../models/User');
const Match = require('../models/Match');

class PayoutService {
  /**
   * Process payout for a confirmed match
   * @param {number} matchId - Match ID
   * @param {string} result - Match result ('home_win', 'draw', 'away_win')
   * @returns {Promise<Object>} Payout summary
   */
  async processPayout(matchId, result) {
    // Validate match exists and is confirmed
    const match = await Match.findById(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    if (match.status !== 'confirmed') {
      throw new Error('Match is not confirmed');
    }

    // Get all bets for this match
    const allBets = await Bet.findByMatch(matchId);

    // Get winning bets
    const winningBets = await Bet.getWinningBets(matchId, result);

    let totalPayout = 0;
    let totalWinners = 0;

    // Process winning bets
    for (const bet of winningBets) {
      const payout = this.calculatePayout(bet.coins_bet, bet.odds_at_bet_time);

      // Update bet with payout
      await Bet.updatePayout(bet.id, payout, true);

      // Credit user with payout
      await User.updateCoins(bet.user_id, payout);

      totalPayout += payout;
      totalWinners++;
    }

    // Mark losing bets
    const losingBets = allBets.filter(bet => bet.outcome !== result);
    for (const bet of losingBets) {
      await Bet.updatePayout(bet.id, 0, false);
    }

    return {
      match_id: matchId,
      result,
      total_winners: totalWinners,
      total_losers: losingBets.length,
      total_payout: totalPayout
    };
  }

  /**
   * Calculate payout amount
   * @param {number} coinsBet - Amount of coins bet
   * @param {number} odds - Odds at bet time
   * @returns {number} Payout amount
   */
  calculatePayout(coinsBet, odds) {
    return Math.round(coinsBet * odds * 100) / 100; // Round to 2 decimal places
  }
}

module.exports = new PayoutService();
