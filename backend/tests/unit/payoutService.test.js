// backend/tests/unit/payoutService.test.js
const payoutService = require('../../src/services/payoutService');
const Bet = require('../../src/models/Bet');
const User = require('../../src/models/User');
const Match = require('../../src/models/Match');

jest.mock('../../src/models/Bet');
jest.mock('../../src/models/User');
jest.mock('../../src/models/Match');

describe('PayoutService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processPayout', () => {
    it('should calculate and pay out winning bets', async () => {
      const matchId = 1;
      const result = 'home_win';

      Match.findById.mockResolvedValue({
        id: matchId,
        home_team: 'Germany',
        away_team: 'Spain',
        result: 'home_win',
        status: 'confirmed'
      });

      Bet.getWinningBets.mockResolvedValue([
        { id: 1, user_id: 1, coins_bet: 10, odds_at_bet_time: 1.8 },
        { id: 2, user_id: 2, coins_bet: 20, odds_at_bet_time: 1.8 }
      ]);

      Bet.findByMatch.mockResolvedValue([
        { id: 1, user_id: 1, outcome: 'home_win', coins_bet: 10, odds_at_bet_time: 1.8 },
        { id: 2, user_id: 2, outcome: 'home_win', coins_bet: 20, odds_at_bet_time: 1.8 },
        { id: 3, user_id: 3, outcome: 'away_win', coins_bet: 15, odds_at_bet_time: 4.5 }
      ]);

      Bet.updatePayout.mockResolvedValue({ changes: 1 });
      User.updateCoins.mockResolvedValue({ changes: 1 });

      const summary = await payoutService.processPayout(matchId, result);

      expect(Bet.updatePayout).toHaveBeenCalledTimes(3);
      expect(User.updateCoins).toHaveBeenCalledTimes(2);
      expect(User.updateCoins).toHaveBeenCalledWith(1, 18); // 10 * 1.8
      expect(User.updateCoins).toHaveBeenCalledWith(2, 36); // 20 * 1.8
      expect(summary.total_winners).toBe(2);
      expect(summary.total_payout).toBe(54); // 18 + 36
    });

    it('should handle matches with no bets', async () => {
      Match.findById.mockResolvedValue({
        id: 1,
        result: 'home_win',
        status: 'confirmed'
      });

      Bet.findByMatch.mockResolvedValue([]);
      Bet.getWinningBets.mockResolvedValue([]);

      const summary = await payoutService.processPayout(1, 'home_win');

      expect(summary.total_winners).toBe(0);
      expect(summary.total_payout).toBe(0);
    });

    it('should throw error if match not found', async () => {
      Match.findById.mockResolvedValue(null);

      await expect(
        payoutService.processPayout(999, 'home_win')
      ).rejects.toThrow('Match not found');
    });

    it('should throw error if match not confirmed', async () => {
      Match.findById.mockResolvedValue({
        id: 1,
        status: 'upcoming'
      });

      await expect(
        payoutService.processPayout(1, 'home_win')
      ).rejects.toThrow('Match is not confirmed');
    });
  });

  describe('calculatePayout', () => {
    it('should calculate correct payout', () => {
      const payout = payoutService.calculatePayout(10, 1.8);
      expect(payout).toBe(18);
    });

    it('should handle decimal values correctly', () => {
      const payout = payoutService.calculatePayout(15.5, 2.3);
      expect(payout).toBe(35.65);
    });
  });
});
