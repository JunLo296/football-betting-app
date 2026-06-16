// backend/src/services/betService.js
const Bet = require('../models/Bet');
const Match = require('../models/Match');
const User = require('../models/User');

class BetService {
  async placeBet(betData) {
    const { user_id, match_id, outcome, coins_bet } = betData;

    await this.validateBet(user_id, match_id, outcome, coins_bet);

    const user = await User.findById(user_id);
    const match = await Match.findById(match_id);

    const odds = this.getOddsForOutcome(match, outcome);

    await User.updateCoins(user_id, -coins_bet);

    const bet = await Bet.create({
      user_id,
      match_id,
      outcome,
      coins_bet,
      odds_at_bet_time: odds
    });

    return {
      bet_id: bet.id,
      new_balance: user.total_coins - coins_bet,
      potential_payout: coins_bet * odds
    };
  }

  async validateBet(userId, matchId, outcome, coinsBet) {
    if (coinsBet <= 0 || isNaN(coinsBet)) {
      throw new Error('Coins must be greater than 0');
    }

    if (!['home_win', 'draw', 'away_win'].includes(outcome)) {
      throw new Error('Invalid outcome');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.total_coins < coinsBet) {
      throw new Error('Insufficient coins');
    }

    const match = await Match.findById(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    const kickoffTime = new Date(match.kickoff_time);
    if (Date.now() >= kickoffTime.getTime()) {
      throw new Error('Match is locked');
    }
  }

  getOddsForOutcome(match, outcome) {
    switch (outcome) {
      case 'home_win':
        return match.home_odds;
      case 'draw':
        return match.draw_odds;
      case 'away_win':
        return match.away_odds;
      default:
        throw new Error('Invalid outcome');
    }
  }

  async getUserBets(userId) {
    const bets = await Bet.findByUser(userId);

    return bets.map(bet => ({
      id: bet.id,
      match: {
        home_team: bet.home_team,
        away_team: bet.away_team,
        kickoff_time: bet.kickoff_time
      },
      outcome: bet.outcome,
      coins_bet: bet.coins_bet,
      odds_at_bet_time: bet.odds_at_bet_time,
      potential_payout: bet.coins_bet * bet.odds_at_bet_time,
      is_winner: bet.is_winner,
      status: bet.is_winner === null ? 'pending' : (bet.is_winner ? 'won' : 'lost')
    }));
  }
}

module.exports = new BetService();
